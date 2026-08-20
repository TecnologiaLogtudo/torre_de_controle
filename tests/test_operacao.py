import pytest
from fastapi import status
from app.operacao.services import (
    MOTIVOS_PADRAO_INICIAIS,
    HORARIO_LIMITE_AGENDAMENTO_CHAVE,
    HORARIO_LIMITE_AGENDAMENTO_PADRAO,
)

def obter_headers_autenticados(client):
    # Tenta criar o primeiro usuário (bootstrap)
    res_user = client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin Operacao",
            "email": "operacao_admin@logtudo.com",
            "senha": "senha_segura_123",
            "ativo": True,
        },
    )
    email = "operacao_admin@logtudo.com"
    senha = "senha_segura_123"
    
    if res_user.status_code != status.HTTP_201_CREATED:
        # Se falhou porque o banco já tem usuários, faz login com admin padrão se existir ou tenta logar
        res_login = client.post(
            "/api/v1/auth/login",
            json={"email": email, "senha": senha},
        )
        if res_login.status_code != status.HTTP_200_OK:
            # Tenta com o admin comum dos outros testes
            res_login = client.post(
                "/api/v1/auth/login",
                json={"email": "admin@logtudo.com", "senha": "senha_segura_123"},
            )
            if res_login.status_code != status.HTTP_200_OK:
                res_login = client.post(
                    "/api/v1/auth/login",
                    json={"email": "admin@logtudo.com", "senha": "senha"},
                )
        return {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "senha": senha},
    )
    return {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

def test_inicializacao_e_listagem_motivos_e_configuracoes(client):
    headers = obter_headers_autenticados(client)

    # Listar motivos
    res_motivos = client.get("/api/v1/operacao/motivos-indisponibilidade", headers=headers)
    assert res_motivos.status_code == status.HTTP_200_OK
    motivos = res_motivos.json()
    nomes_motivos = [m["nome"] for m in motivos]
    for motivo_padrao in MOTIVOS_PADRAO_INICIAIS:
        assert motivo_padrao in nomes_motivos

    # Listar configurações
    res_config = client.get("/api/v1/operacao/configuracoes", headers=headers)
    assert res_config.status_code == status.HTTP_200_OK
    configs = res_config.json()
    chaves = [c["chave"] for c in configs]
    assert HORARIO_LIMITE_AGENDAMENTO_CHAVE in chaves

    # Obter configuração específica
    res_horario = client.get(f"/api/v1/operacao/configuracoes/{HORARIO_LIMITE_AGENDAMENTO_CHAVE}", headers=headers)
    assert res_horario.status_code == status.HTTP_200_OK
    assert res_horario.json()["valor"] == HORARIO_LIMITE_AGENDAMENTO_PADRAO

def test_crud_motivos_indisponibilidade(client):
    headers = obter_headers_autenticados(client)

    # Criar novo motivo
    res_criar = client.post(
        "/api/v1/operacao/motivos-indisponibilidade",
        json={"nome": "Greve de Caminhoneiros", "ativo": True},
        headers=headers,
    )
    assert res_criar.status_code == status.HTTP_201_CREATED
    motivo_id = res_criar.json()["id"]
    assert res_criar.json()["nome"] == "Greve de Caminhoneiros"

    # Atualizar motivo (inativar)
    res_update = client.put(
        f"/api/v1/operacao/motivos-indisponibilidade/{motivo_id}",
        json={"ativo": False},
        headers=headers,
    )
    assert res_update.status_code == status.HTTP_200_OK
    assert res_update.json()["ativo"] is False

def test_atualizar_configuracao_sistema(client):
    headers = obter_headers_autenticados(client)

    res_put = client.put(
        f"/api/v1/operacao/configuracoes/{HORARIO_LIMITE_AGENDAMENTO_CHAVE}",
        json={"valor": "13:30"},
        headers=headers,
    )
    assert res_put.status_code == status.HTTP_200_OK
    assert res_put.json()["valor"] == "13:30"
