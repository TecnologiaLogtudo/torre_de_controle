import pytest
from datetime import date, timedelta
from fastapi import status
from app.core.datetime_utils import agora_local

def obter_headers_autenticados(client):
    res_user = client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin Torre Completa",
            "email": "torre_completa_admin@logtudo.com",
            "senha": "senha_segura_123",
            "ativo": True,
        },
    )
    email = "torre_completa_admin@logtudo.com"
    senha = "senha_segura_123"
    
    if res_user.status_code != status.HTTP_201_CREATED:
        res_login = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
        if res_login.status_code != status.HTTP_200_OK:
            res_login = client.post("/api/v1/auth/login", json={"email": "admin@logtudo.com", "senha": "senha_segura_123"})
            if res_login.status_code != status.HTTP_200_OK:
                res_login = client.post("/api/v1/auth/login", json={"email": "admin@logtudo.com", "senha": "senha"})
        return {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

    res_login = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    return {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

def test_fluxo_operacional_completo_torre_de_controle(client):
    headers = obter_headers_autenticados(client)

    # 1. Cadastra Empresa
    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "LATAM Torre Teste", "identificacao": "88.888.888/0001-88"},
        headers=headers,
    )
    assert res_emp.status_code == status.HTTP_201_CREATED
    empresa_id = res_emp.json()["id"]

    # 2. Cadastra Motorista e Veículo Físico
    res_mot = client.post("/api/v1/motoristas", json={"nome": "Carlos Dedicado"}, headers=headers)
    motorista_id = res_mot.json()["id"]

    res_veic = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "HR-001", "placa": "DED1A23", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veiculo_id = res_veic.json()["id"]

    # 3. Cria vínculo dedicado entre Empresa, Motorista e Veículo Físico
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
    assert res_vinc.status_code == status.HTTP_201_CREATED

    # 4. Cria Agendamento para o dia seguinte (deve preencher a alocação do DEDICADO automaticamente)
    amanha = agora_local().date() + timedelta(days=1)
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ag.status_code == status.HTTP_201_CREATED
    agendamento = res_ag.json()
    agendamento_id = agendamento["id"]

    assert len(agendamento["alocacoes"]) == 1
    alocacao = agendamento["alocacoes"][0]
    alocacao_id = alocacao["id"]
    assert alocacao["categoria"] == "DEDICADO"
    assert alocacao["status_operacional"] == "PROGRAMADO"

    # 5. Alterar status para INDISPONIVEL sem informar motivo (deve falhar com HTTP 400)
    res_ind_err = client.put(
        f"/api/v1/agendamentos/alocacoes/{alocacao_id}/status",
        json={"novo_status": "INDISPONIVEL"},
        headers=headers,
    )
    assert res_ind_err.status_code == status.HTTP_400_BAD_REQUEST

    # Obter motivo de indisponibilidade "Avaria"
    res_motivos = client.get("/api/v1/operacao/motivos-indisponibilidade", headers=headers)
    motivo_avaria = next(m for m in res_motivos.json() if m["nome"] == "Avaria")

    # Alterar status para INDISPONIVEL informando o motivo "Avaria"
    res_ind_ok = client.put(
        f"/api/v1/agendamentos/alocacoes/{alocacao_id}/status",
        json={"novo_status": "INDISPONIVEL", "motivo_indisponibilidade_id": motivo_avaria["id"]},
        headers=headers,
    )
    assert res_ind_ok.status_code == status.HTTP_200_OK
    assert res_ind_ok.json()["status_operacional"] == "INDISPONIVEL"

    # 6. Adicionar SPOT ao agendamento
    res_mot_spot = client.post("/api/v1/motoristas", json={"nome": "Marcos SPOT"}, headers=headers)
    motorista_spot_id = res_mot_spot.json()["id"]

    res_veic_spot = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "Fio-002", "placa": "SPO9B87", "tipo_veiculo": "Fiorino", "especialidade": "SECO"},
        headers=headers,
    )
    veiculo_spot_id = res_veic_spot.json()["id"]

    res_add_spot = client.post(
        f"/api/v1/agendamentos/{agendamento_id}/spots",
        json={"motorista_id": motorista_spot_id, "veiculo_id": veiculo_spot_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_add_spot.status_code == status.HTTP_201_CREATED
    alocacao_spot_id = res_add_spot.json()["id"]

    # 7. Consultar a Torre de Controle (Painel Operacional)
    res_torre_resumo = client.get(f"/api/v1/operacao/torre/resumo?data={amanha}", headers=headers)
    assert res_torre_resumo.status_code == status.HTTP_200_OK
    resumo = res_torre_resumo.json()
    assert resumo["total"] == 2
    assert resumo["indisponiveis"] == 1
    assert resumo["programados"] == 1

    # 8. Consultar Histórico de Eventos Operacionais
    res_eventos = client.get(f"/api/v1/operacao/historico-eventos?empresa_id={empresa_id}", headers=headers)
    assert res_eventos.status_code == status.HTTP_200_OK
    eventos = res_eventos.json()
    assert len(eventos) >= 1
    assert eventos[0]["novo_status"] == "INDISPONIVEL"
    assert eventos[0]["motivo_indisponibilidade"] == "Avaria"


def test_agendamento_cancelado_nao_entra_nos_kpis_da_torre(client):
    headers = obter_headers_autenticados(client)

    # 1. Cadastra Empresa
    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Cancelamento Teste", "identificacao": "77.777.777/0001-77"},
        headers=headers,
    )
    empresa_id = res_emp.json()["id"]

    amanha = agora_local().date() + timedelta(days=1)
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    agendamento_id = res_ag.json()["id"]

    # 2. Adiciona SPOT
    res_mot_spot = client.post("/api/v1/motoristas", json={"nome": "Motorista Temp Cancelado"}, headers=headers)
    res_veic_spot = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "Fio-Cancel", "placa": "CNC9999", "tipo_veiculo": "Fiorino", "especialidade": "SECO"},
        headers=headers,
    )
    client.post(
        f"/api/v1/agendamentos/{agendamento_id}/spots",
        json={"motorista_id": res_mot_spot.json()["id"], "veiculo_id": res_veic_spot.json()["id"], "categoria": "SPOT"},
        headers=headers,
    )

    # Verifica que antes de cancelar, a alocação consta no detalhamento da Torre
    res_det_antes = client.get(f"/api/v1/operacao/torre/detalhamento?data={amanha}&empresa_id={empresa_id}", headers=headers)
    assert len(res_det_antes.json()) == 1

    # 3. Cancela o agendamento
    res_canc = client.post(f"/api/v1/agendamentos/{agendamento_id}/cancelar", headers=headers)
    assert res_canc.status_code == status.HTTP_200_OK

    # 4. Verifica que após o cancelamento, a alocação NÃO entra mais no detalhamento nem afeta os KPIs
    res_det_depois = client.get(f"/api/v1/operacao/torre/detalhamento?data={amanha}&empresa_id={empresa_id}", headers=headers)
    assert len(res_det_depois.json()) == 0

    res_resumo_depois = client.get(f"/api/v1/operacao/torre/empresas-resumo?data={amanha}", headers=headers)
    resumo_emp = next(e for e in res_resumo_depois.json() if e["empresa_id"] == empresa_id)
    assert resumo_emp["total"] == 0

