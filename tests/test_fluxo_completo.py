from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.usuarios.models import Usuario
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.contratos.models import ContratoConfiguracao, MotoristaDedicadoVinculo
from app.auditoria.models import Auditoria
from app.core.datetime_utils import TZ_BAHIA, para_local

# ==========================================
# TESTES DE BOOTSTRAP E AUTENTICAÇÃO
# ==========================================


def test_fluxo_bootstrap_e_autenticacao(client: TestClient, db: Session):
    # 1. Criação do primeiro usuário (Bootstrap - Sem Token)
    payload_admin = {
        "nome": "Administrador Logtudo",
        "email": "admin@logtudo.com",
        "senha": "senha_segura_123",
        "ativo": True,
    }
    response = client.post("/api/v1/usuarios", json=payload_admin)
    assert response.status_code == 201
    dados_admin = response.json()
    assert dados_admin["nome"] == payload_admin["nome"]
    assert dados_admin["email"] == payload_admin["email"]
    assert dados_admin["ativo"] is True
    assert "id" in dados_admin

    # 2. Tentativa de criar outro usuário sem token (deve retornar 401 agora que o banco não está vazio)
    payload_comum = {
        "nome": "Operador Comercial",
        "email": "operador@logtudo.com",
        "senha": "outrasenhaboa",
        "ativo": True,
    }
    response = client.post("/api/v1/usuarios", json=payload_comum)
    assert response.status_code == 401

    # 3. Login com o usuário admin recém-criado
    payload_login = {
        "email": "admin@logtudo.com",
        "senha": "senha_segura_123",
    }
    response = client.post("/api/v1/auth/login", json=payload_login)
    assert response.status_code == 200
    dados_token = response.json()
    assert "token_acesso" in dados_token
    assert dados_token["tipo_token"] == "bearer"
    token = dados_token["token_acesso"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Criar o segundo usuário informando o token JWT
    response = client.post(
        "/api/v1/usuarios", json=payload_comum, headers=headers
    )
    assert response.status_code == 201
    dados_comum = response.json()
    assert dados_comum["email"] == payload_comum["email"]

    # 5. Listar usuários cadastrados (requer login)
    response = client.get("/api/v1/usuarios", headers=headers)
    assert response.status_code == 200
    lista = response.json()
    assert len(lista) == 2


# ==========================================
# TESTES DE EMPRESAS, MOTORISTAS E VEÍCULOS
# ==========================================


def test_cadastro_entidades_basicas(client: TestClient, db: Session):
    # Cadastra o usuário e obtém o token
    client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin",
            "email": "admin@logtudo.com",
            "senha": "senha",
            "ativo": True,
        },
    )
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@logtudo.com", "senha": "senha"},
    )
    headers = {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

    # 1. Cadastra Empresa
    payload_empresa = {
        "nome": "LATAM Cargo",
        "identificacao": "02.000.000/0001-99",
    }
    res_emp = client.post(
        "/api/v1/empresas", json=payload_empresa, headers=headers
    )
    assert res_emp.status_code == 201
    emp_data = res_emp.json()
    assert emp_data["nome"] == payload_empresa["nome"]
    empresa_id = emp_data["id"]

    # 2. Cadastra Motorista
    payload_moto = {"nome": "José da Silva"}
    res_mot = client.post(
        "/api/v1/motoristas", json=payload_moto, headers=headers
    )
    assert res_mot.status_code == 201
    mot_data = res_mot.json()
    assert mot_data["nome"] == payload_moto["nome"]
    motorista_id = mot_data["id"]

    # 3. Cadastra Veículos
    # Placa válida e especialidade SECO
    payload_veiculo_seco = {
        "identificacao": "LATAM-001",
        "placa": "ABC1D23",
        "tipo_veiculo": "Fiorino",
        "especialidade": "SECO",
    }
    res_veic = client.post(
        "/api/v1/veiculos", json=payload_veiculo_seco, headers=headers
    )
    assert res_veic.status_code == 201

    # Especialidade inválida (Validação de Literals no Pydantic)
    payload_veiculo_invalido = {
        "identificacao": "LATAM-002",
        "placa": "XYZ9A87",
        "tipo_veiculo": "Truck",
        "especialidade": "CONGELADO",  # Apenas SECO ou REFRIGERADO permitidos
    }
    res_veic_err = client.post(
        "/api/v1/veiculos", json=payload_veiculo_invalido, headers=headers
    )
    assert res_veic_err.status_code == 422  # Unprocessable Entity (Pydantic)


# ==========================================
# TESTES DE VIGÊNCIA DE CONFIGURAÇÕES DE EMPRESAS
# ==========================================


def test_regras_de_vigencia_contratual(client: TestClient, db: Session):
    # Setup de autenticação
    client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin",
            "email": "admin@logtudo.com",
            "senha": "senha",
            "ativo": True,
        },
    )
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@logtudo.com", "senha": "senha"},
    )
    headers = {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

    # Setup de empresa
    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "LATAM Cargo", "identificacao": "02.000.000/0001-99"},
        headers=headers,
    )
    empresa_id = res_emp.json()["id"]

    # 1. Cria Configuração A (vigência a partir de 01/01/2026)
    # 2026-01-01T00:00:00-03:00 (America/Bahia)
    payload_config_a = {
        "data_inicio": "2026-01-01T00:00:00-03:00",
        "regras": {"HR": 4, "Fiorino": 4, "Truck": 2},
    }
    res_a = client.post(
        f"/api/v1/empresas/{empresa_id}/configuracoes",
        json=payload_config_a,
        headers=headers,
    )
    assert res_a.status_code == 201
    config_a_data = res_a.json()
    assert config_a_data["data_fim"] is None

    # 2. Cria Configuração B (vigência a partir de 01/09/2026)
    # 2026-09-01T00:00:00-03:00 (America/Bahia)
    payload_config_b = {
        "data_inicio": "2026-09-01T00:00:00-03:00",
        "regras": {"HR": 2, "Fiorino": 6, "Truck": 3},
    }
    res_b = client.post(
        f"/api/v1/empresas/{empresa_id}/configuracoes",
        json=payload_config_b,
        headers=headers,
    )
    assert res_b.status_code == 201
    config_b_data = res_b.json()
    assert config_b_data["data_fim"] is None

    # 3. Verifica se a Configuração A foi atualizada contiguamente definindo data_fim como 01/09/2026
    # Buscamos a configuração A do banco de teste
    config_a_db = (
        db.query(ContratoConfiguracao)
        .filter(ContratoConfiguracao.id == config_a_data["id"])
        .first()
    )
    # A data de fim no banco deve bater com a data de início da B em UTC
    assert config_a_db.data_fim is not None
    # Converter para local para garantir fuso
    data_fim_local = para_local(config_a_db.data_fim)
    assert data_fim_local.isoformat() == "2026-09-01T00:00:00-03:00"

    # 4. Testa busca de vigência histórica (em 15/06/2026 - deve retornar a Configuração A)
    res_vig_passada = client.get(
        f"/api/v1/empresas/{empresa_id}/configuracoes/vigente?data=2026-06-15T12:00:00-03:00",
        headers=headers,
    )
    assert res_vig_passada.status_code == 200
    assert res_vig_passada.json()["id"] == config_a_data["id"]
    assert res_vig_passada.json()["regras"]["HR"] == 4

    # 5. Testa busca de vigência em data futura (em 15/10/2026 - deve retornar a Configuração B)
    res_vig_futura = client.get(
        f"/api/v1/empresas/{empresa_id}/configuracoes/vigente?data=2026-10-15T12:00:00-03:00",
        headers=headers,
    )
    assert res_vig_futura.status_code == 200
    assert res_vig_futura.json()["id"] == config_b_data["id"]
    assert res_vig_futura.json()["regras"]["HR"] == 2

    # 6. Tentar criar nova configuração retroativa (ex: início em 15/05/2026)
    # Isso deve violar a regra de não sobrepor vigência mais recente já cadastrada
    payload_config_erro = {
        "data_inicio": "2026-05-15T00:00:00-03:00",
        "regras": {"HR": 5},
    }
    res_erro = client.post(
        f"/api/v1/empresas/{empresa_id}/configuracoes",
        json=payload_config_erro,
        headers=headers,
    )
    assert res_erro.status_code == 400
    assert "não pode ser anterior" in res_erro.json()["detail"]


# ==========================================
# TESTES DE VÍNCULO DE MOTORISTA DEDICADO
# ==========================================


def test_vinculo_de_motoristas_dedicados(client: TestClient, db: Session):
    # Setup de autenticação
    client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin",
            "email": "admin@logtudo.com",
            "senha": "senha",
            "ativo": True,
        },
    )
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@logtudo.com", "senha": "senha"},
    )
    headers = {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

    # Setup de Empresas (Empresa A e Empresa B)
    res_emp_a = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa A", "identificacao": "11.111.111/0001-11"},
        headers=headers,
    )
    res_emp_b = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa B", "identificacao": "22.222.222/0002-22"},
        headers=headers,
    )
    emp_a_id = res_emp_a.json()["id"]
    emp_b_id = res_emp_b.json()["id"]

    # Setup de Configurações de Contrato para as Empresas
    from datetime import datetime, timezone, timedelta
    client.post(
        f"/api/v1/contratos/empresas/{emp_a_id}/configuracoes",
        json={
            "data_inicio": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "capacidades": [{"tipo_veiculo": "HR", "especialidade": "SECO", "quantidade": 5}],
        },
        headers=headers,
    )
    client.post(
        f"/api/v1/contratos/empresas/{emp_b_id}/configuracoes",
        json={
            "data_inicio": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "capacidades": [{"tipo_veiculo": "Fiorino", "especialidade": "SECO", "quantidade": 5}],
        },
        headers=headers,
    )

    # Setup de Motorista
    res_mot = client.post(
        "/api/v1/motoristas", json={"nome": "João Dedicado"}, headers=headers
    )
    motorista_id = res_mot.json()["id"]

    # 1. Cria Vínculo do Motorista com a Empresa A
    payload_vinc_a = {
        "empresa_id": emp_a_id,
        "motorista_id": motorista_id,
        "tipo_veiculo": "HR",
        "categoria_operacional": "DEDICADO",
    }
    res_vinc = client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json=payload_vinc_a,
        headers=headers,
    )
    assert res_vinc.status_code == 201
    vinculo_data = res_vinc.json()
    assert vinculo_data["ativo"] is True

    # 2. Tentar vincular o mesmo motorista à Empresa B de forma ativa
    # Deve falhar pois o motorista já possui um vínculo ativo (Regra de Exclusividade)
    payload_vinc_b = {
        "empresa_id": emp_b_id,
        "motorista_id": motorista_id,
        "tipo_veiculo": "Fiorino",
        "categoria_operacional": "DEDICADO",
    }
    res_vinc_erro = client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json=payload_vinc_b,
        headers=headers,
    )
    assert res_vinc_erro.status_code == 400
    assert "já possui um vínculo ativo" in res_vinc_erro.json()["detail"]

    # 3. Desativa o vínculo ativo da Empresa A
    res_desativar = client.post(
        f"/api/v1/motoristas/dedicados/vinculos/{vinculo_data['id']}/desativar",
        headers=headers,
    )
    assert res_desativar.status_code == 200
    assert res_desativar.json()["ativo"] is False

    # 4. Tenta criar o vínculo com a Empresa B novamente (agora deve passar pois o anterior foi desativado)
    res_vinc_b_sucesso = client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json=payload_vinc_b,
        headers=headers,
    )
    assert res_vinc_b_sucesso.status_code == 201
    assert res_vinc_b_sucesso.json()["ativo"] is True


# ==========================================
# TESTES DE TRILHA DE AUDITORIA
# ==========================================


def test_geracao_de_trilha_de_auditoria(client: TestClient, db: Session):
    # Setup de autenticação
    client.post(
        "/api/v1/usuarios",
        json={
            "nome": "Admin",
            "email": "admin@logtudo.com",
            "senha": "senha",
            "ativo": True,
        },
    )
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@logtudo.com", "senha": "senha"},
    )
    headers = {"Authorization": f"Bearer {res_login.json()['token_acesso']}"}

    # Executa criação de empresa
    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Auditoria Corp", "identificacao": "33.333.333/0003-33"},
        headers=headers,
    )
    empresa_id = res_emp.json()["id"]

    # Executa atualização de empresa
    client.put(
        f"/api/v1/empresas/{empresa_id}",
        json={"nome": "Auditoria Corp Atualizada", "ativo": False},
        headers=headers,
    )

    # Consulta a tabela de auditoria diretamente no banco de dados do teste
    auditorias = (
        db.query(Auditoria)
        .filter(Auditoria.entidade_afetada == "empresas")
        .order_by(Auditoria.criado_em.asc())
        .all()
    )

    # Devem existir pelo menos dois registros de auditoria (CRIAR e ATUALIZAR)
    assert len(auditorias) == 2
    assert auditorias[0].acao == "CRIAR"
    assert auditorias[0].estado_posterior["nome"] == "Auditoria Corp"

    assert auditorias[1].acao == "ATUALIZAR"
    assert auditorias[1].estado_anterior["nome"] == "Auditoria Corp"
    assert auditorias[1].estado_posterior["nome"] == "Auditoria Corp Atualizada"
    assert auditorias[1].estado_posterior["ativo"] is False
