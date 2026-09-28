import pytest
from datetime import timedelta
from fastapi import status
from app.core.datetime_utils import agora_local
from tests.test_torre_e_operacao_completa import obter_headers_autenticados


def test_status_motoristas_sem_alocacao(client):
    """Motorista ativo sem alocação no dia deve aparecer como SEM_ALOCACAO."""
    headers = obter_headers_autenticados(client)

    res_mot = client.post(
        "/api/v1/motoristas", json={"nome": "Sem Alocacao Status Teste"}, headers=headers
    )
    assert res_mot.status_code == status.HTTP_201_CREATED
    motorista_id = res_mot.json()["id"]

    res = client.get("/api/v1/operacao/motoristas-status", headers=headers)
    assert res.status_code == status.HTTP_200_OK
    dados = res.json()

    assert "data" in dados and "motoristas" in dados
    assert dados["total"] >= 1

    alvo = next(m for m in dados["motoristas"] if m["motorista_id"] == motorista_id)
    assert alvo["status_operacional"] == "SEM_ALOCACAO"
    assert alvo["motorista_nome"] == "Sem Alocacao Status Teste"


def test_status_motoristas_reflete_alocacao_do_dia(client):
    """Motorista alocado num agendamento do dia deve refletir o status da alocação."""
    headers = obter_headers_autenticados(client)

    # Empresa + capacidade contratual
    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Status Motoristas", "identificacao": "77.777.777/0001-77"},
        headers=headers,
    )
    assert res_emp.status_code == status.HTTP_201_CREATED
    empresa_id = res_emp.json()["id"]

    from datetime import datetime, timezone, timedelta
    client.post(
        f"/api/v1/contratos/empresas/{empresa_id}/configuracoes",
        json={
            "data_inicio": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "capacidades": [{"tipo_veiculo": "HR", "especialidade": "SECO", "quantidade": 2}],
        },
        headers=headers,
    )

    # Motorista + veículo
    res_mot = client.post(
        "/api/v1/motoristas", json={"nome": "Em Rota Status Teste"}, headers=headers
    )
    motorista_id = res_mot.json()["id"]
    res_veic = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "HR-ST1", "placa": "STA1A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veiculo_id = res_veic.json()["id"]

    # Vínculo dedicado motorista↔veículo↔empresa (base da auto-alocação)
    res_vinc = client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json={
            "empresa_id": empresa_id,
            "motorista_id": motorista_id,
            "veiculo_id": veiculo_id,
            "tipo_veiculo": "HR",
            "categoria_operacional": "DEDICADO",
        },
        headers=headers,
    )
    assert res_vinc.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK), res_vinc.text

    # Agendamento do dia seguinte com alocação (regra: bloqueado criar para o dia atual após 12:00)
    data_ag = (agora_local() + timedelta(days=1)).date().isoformat()
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={
            "empresa_id": empresa_id,
            "data": data_ag,
            "horario_inicio": "08:00:00",
            "alocacoes": [
                {"motorista_id": motorista_id, "veiculo_id": veiculo_id, "categoria": "DEDICADO"}
            ],
        },
        headers=headers,
    )
    assert res_ag.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK), res_ag.text
    alocacao_id = res_ag.json()["alocacoes"][0]["id"]

    # Transição para EM_ROTA
    res_transicao = client.put(
        f"/api/v1/agendamentos/alocacoes/{alocacao_id}/status",
        json={"novo_status": "EM_ROTA"},
        headers=headers,
    )
    assert res_transicao.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED), res_transicao.text

    res = client.get(
        "/api/v1/operacao/motoristas-status",
        params={"empresa_id": empresa_id, "data": data_ag},
        headers=headers,
    )
    assert res.status_code == status.HTTP_200_OK
    dados = res.json()

    alvo = next(m for m in dados["motoristas"] if m["motorista_id"] == motorista_id)
    assert alvo["status_operacional"] == "EM_ROTA"
    assert alvo["empresa_id"] == empresa_id
    assert alvo["veiculo_placa"] == "STA1A11"
    assert alvo["categoria"] == "DEDICADO"
    assert dados["em_rota"] >= 1

    # Filtro por nome
    res_nome = client.get(
        "/api/v1/operacao/motoristas-status",
        params={"motorista_nome": "Em Rota Status"},
        headers=headers,
    )
    assert res_nome.status_code == status.HTTP_200_OK
    nomes = [m["motorista_nome"] for m in res_nome.json()["motoristas"]]
    assert nomes and all("Em Rota Status" in n for n in nomes)


def test_status_motoristas_requer_autenticacao(client):
    res = client.get("/api/v1/operacao/motoristas-status")
    assert res.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
