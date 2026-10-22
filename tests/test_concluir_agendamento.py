import pytest
from datetime import timedelta
from fastapi import status
from app.core.datetime_utils import agora_local
from tests.test_agendamentos import obter_headers_autenticados


def test_concluir_agendamento_e_liberar_recursos(client):
    headers = obter_headers_autenticados(client)

    # 1. Criar empresa com contrato
    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Concluir Teste", "identificacao": "EMP-CNC-01"},
        headers=headers,
    )
    assert res_emp.status_code == status.HTTP_201_CREATED
    emp_id = res_emp.json()["id"]

    from datetime import datetime, timezone
    client.post(
        f"/api/v1/contratos/empresas/{emp_id}/configuracoes",
        json={
            "data_inicio": datetime.now(timezone.utc).isoformat(),
            "capacidades": [{"tipo_veiculo": "HR", "especialidade": "SECO", "quantidade": 2}],
        },
        headers=headers,
    )

    # 2. Criar 2 motoristas e 2 veículos
    mot_ids = []
    veic_ids = []
    for i in range(1, 3):
        res_m = client.post("/api/v1/motoristas", json={"nome": f"Motorista Concluir {i}"}, headers=headers)
        mot_ids.append(res_m.json()["id"])
        res_v = client.post(
            "/api/v1/veiculos",
            json={"placa": f"CNC{i}A99", "tipo_veiculo": "HR", "especialidade": "SECO"},
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

    # 3. Criar agendamento para hoje
    hoje = agora_local().date().isoformat()
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={
            "empresa_id": emp_id,
            "data": hoje,
            "horario_inicio": "08:00:00",
            "alocacoes": [
                {"motorista_id": mot_ids[0], "veiculo_id": veic_ids[0], "categoria": "DEDICADO"},
                {"motorista_id": mot_ids[1], "veiculo_id": veic_ids[1], "categoria": "DEDICADO"},
            ],
        },
        headers=headers,
    )
    assert res_ag.status_code == status.HTTP_201_CREATED
    ag_data = res_ag.json()
    ag_id = ag_data["id"]

    # 4. Tentar concluir sem salvar versão (versao == 0) -> deve falhar com 400
    res_cnc_sem_versao = client.post(f"/api/v1/agendamentos/{ag_id}/concluir", headers=headers)
    assert res_cnc_sem_versao.status_code == status.HTTP_400_BAD_REQUEST

    # 5. Salvar versão v1
    res_salvar = client.post(f"/api/v1/agendamentos/{ag_id}/salvar-versao", headers=headers)
    assert res_salvar.status_code == status.HTTP_200_OK

    # 6. Colocar um motorista EM_ROTA
    aloc_1_id = ag_data["alocacoes"][0]["id"]
    res_status = client.patch(
        f"/api/v1/operacao/alocacoes/{aloc_1_id}/status",
        json={"novo_status": "EM_ROTA"},
        headers=headers,
    )
    assert res_status.status_code == status.HTTP_200_OK

    # 7. Concluir agendamento com sucesso
    res_cnc = client.post(f"/api/v1/agendamentos/{ag_id}/concluir", headers=headers)
    assert res_cnc.status_code == status.HTTP_200_OK
    concluido = res_cnc.json()
    assert concluido["status"] == "CONCLUIDO"

    # 8. Verificar que as alocações retornaram para DISPONIVEL
    for aloc in concluido["alocacoes"]:
        assert aloc["status_operacional"] == "DISPONIVEL"


def test_nao_permitir_concluir_agendamento_data_futura(client):
    headers = obter_headers_autenticados(client)

    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Futura Teste", "identificacao": "EMP-FUT-01"},
        headers=headers,
    )
    emp_id = res_emp.json()["id"]

    from datetime import datetime, timezone
    client.post(
        f"/api/v1/contratos/empresas/{emp_id}/configuracoes",
        json={
            "data_inicio": datetime.now(timezone.utc).isoformat(),
            "capacidades": [{"tipo_veiculo": "HR", "especialidade": "SECO", "quantidade": 1}],
        },
        headers=headers,
    )

    res_m = client.post("/api/v1/motoristas", json={"nome": "Motorista Futuro"}, headers=headers)
    res_v = client.post(
        "/api/v1/veiculos",
        json={"placa": "FUT1A99", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json={
            "empresa_id": emp_id,
            "motorista_id": res_m.json()["id"],
            "veiculo_id": res_v.json()["id"],
            "tipo_veiculo": "HR",
            "categoria_operacional": "DEDICADO",
        },
        headers=headers,
    )

    amanha = (agora_local().date() + timedelta(days=1)).isoformat()
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={
            "empresa_id": emp_id,
            "data": amanha,
            "horario_inicio": "08:00:00",
            "alocacoes": [
                {"motorista_id": res_m.json()["id"], "veiculo_id": res_v.json()["id"], "categoria": "DEDICADO"}
            ],
        },
        headers=headers,
    )
    ag_id = res_ag.json()["id"]
    client.post(f"/api/v1/agendamentos/{ag_id}/salvar-versao", headers=headers)

    res_cnc = client.post(f"/api/v1/agendamentos/{ag_id}/concluir", headers=headers)
    assert res_cnc.status_code == status.HTTP_400_BAD_REQUEST
    assert "futuras" in res_cnc.json()["detail"].lower()
