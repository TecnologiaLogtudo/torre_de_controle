import pytest
from datetime import timedelta
from fastapi import status
from app.core.datetime_utils import agora_local
from tests.test_agendamentos import obter_headers_autenticados


def test_alteracao_status_em_lote(client):
    headers = obter_headers_autenticados(client)

    # 1. Criar empresa com contrato
    res_emp = client.post("/api/v1/empresas", json={"nome": "Empresa Lote Teste", "identificacao": "EMP-LOTE-01"}, headers=headers)
    assert res_emp.status_code == status.HTTP_201_CREATED
    emp_id = res_emp.json()["id"]

    from datetime import datetime, timezone

    client.post(
        f"/api/v1/contratos/empresas/{emp_id}/configuracoes",
        json={
            "data_inicio": datetime.now(timezone.utc).isoformat(),
            "capacidades": [{"tipo_veiculo": "HR", "especialidade": "SECO", "quantidade": 5}],
        },
        headers=headers,
    )

    # 2. Criar 2 motoristas e 2 veículos dedicados
    mot_ids = []
    veic_ids = []
    for i in range(1, 3):
        res_m = client.post("/api/v1/motoristas", json={"nome": f"Motorista Lote {i}"}, headers=headers)
        mot_ids.append(res_m.json()["id"])
        res_v = client.post(
            "/api/v1/veiculos",
            json={"placa": f"LOT{i}A99", "tipo_veiculo": "HR", "especialidade": "SECO"},
            headers=headers,
        )
        veic_ids.append(res_v.json()["id"])
        res_vinc = client.post(
            "/api/v1/motoristas/dedicados/vinculos",
            json={
                "empresa_id": emp_id,
                "motorista_id": mot_ids[-1],
                "veiculo_id": veic_ids[-1],
                "tipo_veiculo": "HR",
                "categoria_operacional": "DEDICADO",
            },
            headers=headers,
        )
        assert res_vinc.status_code == status.HTTP_201_CREATED

    # 3. Criar agendamento (auto-aloca os 2 dedicados)
    amanha_iso = (agora_local() + timedelta(days=1)).date().isoformat()
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": emp_id, "data": amanha_iso, "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ag.status_code == status.HTTP_201_CREATED
    ag_data = res_ag.json()
    assert ag_data["versao"] == 0
    assert len(ag_data["alocacoes"]) == 2
    aloc_ids = [a["id"] for a in ag_data["alocacoes"]]

    # 4. Alterar status em lote para EM_ROTA via alocacao_ids
    res_lote = client.post(
        "/api/v1/operacao/status-lote",
        json={
            "alocacao_ids": aloc_ids,
            "novo_status": "EM_ROTA",
            "origem_alteracao": "teste_lote",
        },
        headers=headers,
    )
    assert res_lote.status_code == status.HTTP_200_OK
    assert res_lote.json()["sucesso"] is True
    assert res_lote.json()["atualizados"] == 2
    assert res_lote.json()["novo_status"] == "EM_ROTA"

    # 5. Verificar que as alocações foram atualizadas
    res_ag_check = client.get(f"/api/v1/agendamentos/{ag_data['id']}", headers=headers)
    for aloc in res_ag_check.json()["alocacoes"]:
        assert aloc["status_operacional"] == "EM_ROTA"

    # 6. Alterar status em lote para INDISPONIVEL (requer motivo)
    res_motivo = client.post("/api/v1/operacao/motivos-indisponibilidade", json={"nome": "Manutenção em Lote"}, headers=headers)
    motivo_id = res_motivo.json()["id"]

    res_lote_indisp = client.post(
        "/api/v1/operacao/status-lote",
        json={
            "alocacao_ids": aloc_ids,
            "novo_status": "INDISPONIVEL",
            "motivo_indisponibilidade_id": motivo_id,
        },
        headers=headers,
    )
    assert res_lote_indisp.status_code == status.HTTP_200_OK
    assert res_lote_indisp.json()["atualizados"] == 2

    # 7. Adicionar um motorista SPOT e alocar na programação - versão DEVE continuar 1
    res_m_spot = client.post("/api/v1/motoristas", json={"nome": "Motorista Spot Teste"}, headers=headers)
    res_v_spot = client.post("/api/v1/veiculos", json={"placa": "SPT9A99", "tipo_veiculo": "HR", "especialidade": "SECO"}, headers=headers)
    res_add_spot = client.post(
        f"/api/v1/agendamentos/{ag_data['id']}/spots",
        json={"motorista_id": res_m_spot.json()["id"], "veiculo_id": res_v_spot.json()["id"], "categoria": "SPOT"},
        headers=headers,
    )
    assert res_add_spot.status_code == status.HTTP_201_CREATED

    # Conferir que a versão oficial NÃO foi incrementada (permanece v0)
    res_ag_spot = client.get(f"/api/v1/agendamentos/{ag_data['id']}", headers=headers)
    assert res_ag_spot.json()["versao"] == 0

    # 8. Salvar agendamento e avançar versão oficial (v0 -> v1)
    res_versao = client.post(f"/api/v1/agendamentos/{ag_data['id']}/salvar-versao", headers=headers)
    assert res_versao.status_code == status.HTTP_200_OK
    assert res_versao.json()["versao"] == 1

    # Salvar novamente avança para v2
    res_versao2 = client.post(f"/api/v1/agendamentos/{ag_data['id']}/salvar-versao", headers=headers)
    assert res_versao2.status_code == status.HTTP_200_OK
    assert res_versao2.json()["versao"] == 2
