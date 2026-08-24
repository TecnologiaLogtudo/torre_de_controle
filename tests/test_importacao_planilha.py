import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.usuarios.models import Usuario

def obter_headers(client: TestClient) -> dict:
    res_user = client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin Import",
            "email": "admin_import@logtudo.com",
            "senha": "senha_segura_123",
            "ativo": True,
        },
    )
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin_import@logtudo.com", "senha": "senha_segura_123"},
    )
    if res_login.status_code != 200:
        res_login = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@logtudo.com", "senha": "senha_segura_123"},
        )
    return {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}


def test_importar_planilha_real_xlsx(client: TestClient):
    headers = obter_headers(client)
    caminho_xlsx = os.path.join(os.getcwd(), "motoristas_3c_lactalis.xlsx")
    assert os.path.exists(caminho_xlsx), "O arquivo motoristas_3c_lactalis.xlsx deve existir."

    with open(caminho_xlsx, "rb") as f:
        files = {"file": ("motoristas_3c_lactalis.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        res = client.post("/api/v1/operacao/importar-planilha", headers=headers, files=files)

    assert res.status_code == 200, f"Erro na importação: {res.text}"
    dados = res.json()
    assert dados["total_linhas"] > 0
    assert dados["criados_veiculos"] > 0
    assert dados["criados_motoristas"] > 0

    # Segunda importação do mesmo arquivo: deve ignorar placas existentes
    with open(caminho_xlsx, "rb") as f:
        files = {"file": ("motoristas_3c_lactalis.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        res2 = client.post("/api/v1/operacao/importar-planilha", headers=headers, files=files)

    assert res2.status_code == 200
    dados2 = res2.json()
    assert dados2["criados_veiculos"] == 0
    assert dados2["ignorados_placa_existente"] > 0
