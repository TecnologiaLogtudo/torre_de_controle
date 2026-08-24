import pytest
from datetime import date, timedelta
from fastapi import status
from app.core.datetime_utils import agora_local

def obter_headers_autenticados(client):
    res_user = client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin Agendamentos",
            "email": "agendamentos_admin@logtudo.com",
            "senha": "senha_segura_123",
            "ativo": True,
        },
    )
    email = "agendamentos_admin@logtudo.com"
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

def criar_empresa_teste(client, headers):
    res = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Agendamento Teste", "identificacao": "99.999.999/0001-99"},
        headers=headers,
    )
    return res.json()["id"]

def test_criacao_e_janelas_de_agendamento(client):
    headers = obter_headers_autenticados(client)
    empresa_id = criar_empresa_teste(client, headers)

    hoje = agora_local().date()
    amanha = hoje + timedelta(days=1)
    ontem = hoje - timedelta(days=1)
    futuro_distante = hoje + timedelta(days=2)

    # 1. Agendamento para o dia seguinte (deve passar sempre)
    res_amanha = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_amanha.status_code == status.HTTP_201_CREATED
    dados_ag = res_amanha.json()
    assert dados_ag["status"] == "PROGRAMADO"
    agendamento_id = dados_ag["id"]

    # 2. Agendamento para data retroativa (deve falhar)
    res_ontem = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(ontem), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ontem.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Agendamento para mais de 1 dia no futuro (deve falhar no MVP)
    res_futuro = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(futuro_distante), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_futuro.status_code == status.HTTP_400_BAD_REQUEST

    # 4. Cancelamento de agendamento
    res_cancelar = client.post(f"/api/v1/agendamentos/{agendamento_id}/cancelar", headers=headers)
    assert res_cancelar.status_code == status.HTTP_200_OK
    assert res_cancelar.json()["status"] == "CANCELADO"

    # 5. Tentativa de alterar agendamento cancelado (deve falhar)
    res_alterar = client.put(
        f"/api/v1/agendamentos/{agendamento_id}",
        json={"horario_inicio": "09:00:00"},
        headers=headers,
    )
    assert res_alterar.status_code == status.HTTP_400_BAD_REQUEST


def test_bloqueio_agendamento_duplicado_mesma_empresa_e_data(client):
    headers = obter_headers_autenticados(client)
    empresa_id = criar_empresa_teste(client, headers)
    amanha = agora_local().date() + timedelta(days=1)

    # 1. Primeiro agendamento ativo (deve ter sucesso)
    res_1 = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_1.status_code == status.HTTP_201_CREATED

    # 2. Segundo agendamento para a mesma empresa na mesma data (deve falhar com 400 Bad Request)
    res_2 = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(amanha), "horario_inicio": "10:00:00"},
        headers=headers,
    )
    assert res_2.status_code == status.HTTP_400_BAD_REQUEST
    assert "Já existe um agendamento ativo registrado para esta empresa" in res_2.json()["detail"]


def test_bloqueio_motorista_indisponivel_e_exclusividade_dedicada(client):
    headers = obter_headers_autenticados(client)

    # 1. Cadastra 2 empresas
    res_emp1 = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Alfa", "identificacao": "11.111.111/0001-11"},
        headers=headers,
    )
    empresa_1_id = res_emp1.json()["id"]

    res_emp2 = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Beta", "identificacao": "22.222.222/0001-22"},
        headers=headers,
    )
    empresa_2_id = res_emp2.json()["id"]

    # 2. Cadastra Motorista Dedicado na Empresa Alfa
    res_mot_ded = client.post("/api/v1/motoristas", json={"nome": "Joao Dedicado Alfa"}, headers=headers)
    mot_ded_id = res_mot_ded.json()["id"]

    res_veic_ded = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "ALF-001", "placa": "ALF1A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic_ded_id = res_veic_ded.json()["id"]

    client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json={
            "empresa_id": empresa_1_id,
            "motorista_id": mot_ded_id,
            "veiculo_id": veic_ded_id,
            "tipo_veiculo": "HR",
            "categoria_operacional": "DEDICADO",
        },
        headers=headers,
    )

    # 3. Cria agendamento para Empresa Beta e tenta alocar o motorista DEDICADO da Empresa Alfa (deve falhar)
    amanha = agora_local().date() + timedelta(days=1)
    res_ag_beta = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_2_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    ag_beta_id = res_ag_beta.json()["id"]

    res_spot_err = client.post(
        f"/api/v1/agendamentos/{ag_beta_id}/spots",
        json={"motorista_id": mot_ded_id, "veiculo_id": veic_ded_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_spot_err.status_code == status.HTTP_400_BAD_REQUEST
    assert "DEDICADO exclusivo de outra empresa" in res_spot_err.json()["detail"]

    # 4. Testa indisponibilidade com recurso SPOT
    res_ag_alfa = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_1_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    ag_alfa_id = res_ag_alfa.json()["id"]

    res_mot_spot = client.post("/api/v1/motoristas", json={"nome": "Motorista SPOT Indisponivel"}, headers=headers)
    mot_spot_id = res_mot_spot.json()["id"]

    res_veic_spot = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "SPO-001", "placa": "SPO1A11", "tipo_veiculo": "Fiorino", "especialidade": "SECO"},
        headers=headers,
    )
    veic_spot_id = res_veic_spot.json()["id"]

    res_add = client.post(
        f"/api/v1/agendamentos/{ag_alfa_id}/spots",
        json={"motorista_id": mot_spot_id, "veiculo_id": veic_spot_id, "categoria": "SPOT"},
        headers=headers,
    )
    aloc_spot_id = res_add.json()["id"]

    # Busca um motivo de indisponibilidade
    res_motivos = client.get("/api/v1/operacao/motivos-indisponibilidade", headers=headers)
    motivo_id = res_motivos.json()[0]["id"]

    client.put(
        f"/api/v1/agendamentos/alocacoes/{aloc_spot_id}/status",
        json={"novo_status": "INDISPONIVEL", "motivo_indisponibilidade_id": motivo_id},
        headers=headers,
    )

    # Tenta realocar o motorista SPOT em outra operação na mesma data (deve falhar por estar INDISPONIVEL)
    res_indisp_err = client.post(
        f"/api/v1/agendamentos/{ag_beta_id}/spots",
        json={"motorista_id": mot_spot_id, "veiculo_id": veic_spot_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_indisp_err.status_code == status.HTTP_400_BAD_REQUEST
    assert "INDISPONÍVEL" in res_indisp_err.json()["detail"]


