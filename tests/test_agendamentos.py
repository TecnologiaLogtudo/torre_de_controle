import pytest
from datetime import date, datetime, timedelta, timezone
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
        f"/api/v1/contratos/empresas/{empresa_1_id}/configuracoes",
        json={
            "data_inicio": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "capacidades": [{"tipo_veiculo": "HR", "especialidade": "SECO", "quantidade": 5}],
        },
        headers=headers,
    )

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




def test_trava_duplicidade_spot_mesmo_agendamento(client):
    """Regra: motorista ou veículo já alocado no MESMO agendamento não pode ser alocado novamente."""
    headers = obter_headers_autenticados(client)

    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Dup Spot", "identificacao": "33.333.333/0001-33"},
        headers=headers,
    )
    empresa_id = res_emp.json()["id"]

    res_mot = client.post("/api/v1/motoristas", json={"nome": "Motorista Dup Teste"}, headers=headers)
    mot_id = res_mot.json()["id"]

    res_veic = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "DUP-001", "placa": "DUP1A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic_id = res_veic.json()["id"]

    amanha = agora_local().date() + timedelta(days=1)
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": str(amanha), "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ag.status_code == status.HTTP_201_CREATED
    ag_id = res_ag.json()["id"]

    # 1. Adiciona o primeiro SPOT com o par (motorista, veículo)
    res_add1 = client.post(
        f"/api/v1/agendamentos/{ag_id}/spots",
        json={"motorista_id": mot_id, "veiculo_id": veic_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_add1.status_code == status.HTTP_201_CREATED

    # Cria segundo motorista e veículo livres
    res_mot2 = client.post("/api/v1/motoristas", json={"nome": "Motorista Dup Teste 2"}, headers=headers)
    mot2_id = res_mot2.json()["id"]
    res_veic2 = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "DUP-002", "placa": "DUP2A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic2_id = res_veic2.json()["id"]

    # 2. Motorista duplicado (com veículo diferente) deve falhar
    res_dup_mot = client.post(
        f"/api/v1/agendamentos/{ag_id}/spots",
        json={"motorista_id": mot_id, "veiculo_id": veic2_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_dup_mot.status_code == status.HTTP_400_BAD_REQUEST
    assert "mesma programação" in res_dup_mot.json()["detail"]

    # 3. Veículo duplicado (com motorista diferente) deve falhar
    res_dup_veic = client.post(
        f"/api/v1/agendamentos/{ag_id}/spots",
        json={"motorista_id": mot2_id, "veiculo_id": veic_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_dup_veic.status_code == status.HTTP_400_BAD_REQUEST
    assert "mesma programação" in res_dup_veic.json()["detail"]

    # 4. Remoção do SPOT em agendamento CONCLUÍDO deve falhar
    res_concluir = client.put(
        f"/api/v1/agendamentos/{ag_id}",
        json={"status": "EM_EXECUCAO"},
        headers=headers,
    )
    assert res_concluir.status_code == status.HTTP_200_OK
    res_concluir = client.put(
        f"/api/v1/agendamentos/{ag_id}",
        json={"status": "CONCLUIDO"},
        headers=headers,
    )
    assert res_concluir.status_code == status.HTTP_200_OK

    res_rm = client.delete(
        f"/api/v1/agendamentos/alocacoes/{res_add1.json()['id']}",
        headers=headers,
    )
    assert res_rm.status_code == status.HTTP_400_BAD_REQUEST
    assert "CONCLUIDO" in res_rm.json()["detail"]


def test_versionamento_consecutivo_agendamento(client):
    """Regra: Cada alteração no agendamento deve incrementar a versão consecutivamente (v1, v2, v3...)."""
    headers = obter_headers_autenticados(client)

    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Versao Teste", "identificacao": "44.444.444/0001-44"},
        headers=headers,
    )
    empresa_id = res_emp.json()["id"]

    res_mot1 = client.post("/api/v1/motoristas", json={"nome": "Mot Versao 1"}, headers=headers)
    mot1_id = res_mot1.json()["id"]
    res_veic1 = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "VRS-001", "placa": "VRS1A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic1_id = res_veic1.json()["id"]

    # Cria vínculo dedicado
    client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json={
            "empresa_id": empresa_id,
            "motorista_id": mot1_id,
            "veiculo_id": veic1_id,
            "tipo_veiculo": "HR",
            "categoria_operacional": "DEDICADO",
        },
        headers=headers,
    )

    data_ag = (agora_local() + timedelta(days=2)).date().isoformat()
    res_ag = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": data_ag, "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ag.status_code == status.HTTP_201_CREATED
    ag_id = res_ag.json()["id"]
    assert res_ag.json().get("versao") == 1
    aloc_dedicada_id = res_ag.json()["alocacoes"][0]["id"]

    # 1. Adicionar SPOT -> versão 2
    res_mot2 = client.post("/api/v1/motoristas", json={"nome": "Mot Versao 2"}, headers=headers)
    mot2_id = res_mot2.json()["id"]
    res_veic2 = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "VRS-002", "placa": "VRS2A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic2_id = res_veic2.json()["id"]

    res_spot = client.post(
        f"/api/v1/agendamentos/{ag_id}/spots",
        json={"motorista_id": mot2_id, "veiculo_id": veic2_id, "categoria": "SPOT"},
        headers=headers,
    )
    assert res_spot.status_code == status.HTTP_201_CREATED
    aloc_spot_id = res_spot.json()["id"]

    res_ag_v2 = client.get(f"/api/v1/agendamentos/{ag_id}", headers=headers)
    assert res_ag_v2.json()["versao"] == 2

    # 2. Trocar veículo do dedicado -> versão 3
    res_veic3 = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "VRS-003", "placa": "VRS3A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic3_id = res_veic3.json()["id"]

    res_troca = client.put(
        f"/api/v1/agendamentos/alocacoes/{aloc_dedicada_id}/trocar-veiculo",
        json={"veiculo_id": veic3_id, "motivo": "Veículo original em manutenção preventiva"},
        headers=headers,
    )
    assert res_troca.status_code == status.HTTP_200_OK
    assert res_troca.json()["veiculo_id"] == veic3_id
    assert res_troca.json()["categoria"] == "DEDICADO"

    res_ag_v3 = client.get(f"/api/v1/agendamentos/{ag_id}", headers=headers)
    assert res_ag_v3.json()["versao"] == 3

    # 3. Atualizar status operacional -> versão 4
    res_status = client.put(
        f"/api/v1/agendamentos/alocacoes/{aloc_dedicada_id}/status",
        json={"novo_status": "EM_ROTA"},
        headers=headers,
    )
    assert res_status.status_code == status.HTTP_200_OK

    res_ag_v4 = client.get(f"/api/v1/agendamentos/{ag_id}", headers=headers)
    assert res_ag_v4.json()["versao"] == 4

    # 4. Remover SPOT -> versão 5
    res_del = client.delete(f"/api/v1/agendamentos/alocacoes/{aloc_spot_id}", headers=headers)
    assert res_del.status_code == status.HTTP_204_NO_CONTENT

    res_ag_v5 = client.get(f"/api/v1/agendamentos/{ag_id}", headers=headers)
    assert res_ag_v5.json()["versao"] == 5


def test_auto_alocacao_dedicado_indisponivel_com_alerta(client):
    """Regra Q2: Motorista dedicado indisponível é auto-alocado com status INDISPONIVEL e flag de alerta sem bloquear criação."""
    headers = obter_headers_autenticados(client)

    res_emp = client.post(
        "/api/v1/empresas",
        json={"nome": "Empresa Indisp Dedicado", "identificacao": "55.555.555/0001-55"},
        headers=headers,
    )
    empresa_id = res_emp.json()["id"]

    res_mot = client.post("/api/v1/motoristas", json={"nome": "Mot Indisp Auto"}, headers=headers)
    mot_id = res_mot.json()["id"]
    res_veic = client.post(
        "/api/v1/veiculos",
        json={"identificacao": "IND-001", "placa": "IND1A11", "tipo_veiculo": "HR", "especialidade": "SECO"},
        headers=headers,
    )
    veic_id = res_veic.json()["id"]

    # Cria vínculo dedicado
    client.post(
        "/api/v1/motoristas/dedicados/vinculos",
        json={
            "empresa_id": empresa_id,
            "motorista_id": mot_id,
            "veiculo_id": veic_id,
            "tipo_veiculo": "HR",
            "categoria_operacional": "DEDICADO",
        },
        headers=headers,
    )

    # Cria agendamento D+1 e marca o motorista como INDISPONIVEL
    data_d1 = (agora_local() + timedelta(days=1)).date().isoformat()
    res_ag1 = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": data_d1, "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ag1.status_code == status.HTTP_201_CREATED
    aloc1_id = res_ag1.json()["alocacoes"][0]["id"]

    res_motivos = client.get("/api/v1/operacao/motivos-indisponibilidade", headers=headers)
    motivo_id = res_motivos.json()[0]["id"]

    client.put(
        f"/api/v1/agendamentos/alocacoes/{aloc1_id}/status",
        json={"novo_status": "INDISPONIVEL", "motivo_indisponibilidade_id": motivo_id},
        headers=headers,
    )

    # Cria agendamento para D+2 (dia seguinte da indisponibilidade)
    # Anteriormente isso falhava com HTTP 400. Agora deve auto-alocar com status INDISPONIVEL
    data_d2 = (agora_local() + timedelta(days=2)).date().isoformat()
    res_ag2 = client.post(
        "/api/v1/agendamentos",
        json={"empresa_id": empresa_id, "data": data_d2, "horario_inicio": "08:00:00"},
        headers=headers,
    )
    assert res_ag2.status_code == status.HTTP_201_CREATED
    dados_ag2 = res_ag2.json()
    assert len(dados_ag2["alocacoes"]) == 1
    assert dados_ag2["alocacoes"][0]["status_operacional"] == "INDISPONIVEL"
    assert dados_ag2["alocacoes"][0]["categoria"] == "DEDICADO"

