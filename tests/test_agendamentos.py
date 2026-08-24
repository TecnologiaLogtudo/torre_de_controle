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

