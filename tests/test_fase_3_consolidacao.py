import pytest
from datetime import date, time, datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.conftest import SessionTesting as SessionLocal, engine_test as engine
from app.agendamentos.services import AgendamentoService
from app.agendamentos.schemas import AgendamentoCreate, AlocacaoOperacionalCreate
from app.contratos.services import criar_contrato_configuracao
from app.contratos.schemas import ContratoConfiguracaoCreate, MotoristaDedicadoVinculoCreate
from app.empresas.services import criar_empresa
from app.empresas.schemas import EmpresaCreate
from app.motoristas.services import criar_motorista
from app.motoristas.schemas import MotoristaCreate
from app.veiculos.services import criar_veiculo
from app.veiculos.schemas import VeiculoCreate
from app.usuarios.services import criar_usuario
from app.usuarios.schemas import UsuarioCreate
from app.core.security import criar_token_acesso


def setup_dados_fase_3(db: Session):
    timestamp_str = str(int(date.today().strftime("%Y%m%d")))
    
    usr = criar_usuario(
        db,
        UsuarioCreate(
            nome="Admin Fase3",
            email=f"admin_fase3_{timestamp_str}@logtudo.com",
            senha="SenhaSegura123!",
            ativo=True,
        ),
    )

    emp_a = criar_empresa(
        db,
        EmpresaCreate(
            nome="Empresa Fase3 A",
            identificacao=f"998877660001{timestamp_str[-2:]}",
            ativo=True,
        ),
        autor_id=usr.id,
    )

    emp_b = criar_empresa(
        db,
        EmpresaCreate(
            nome="Empresa Fase3 B",
            identificacao=f"887766550001{timestamp_str[-2:]}",
            ativo=True,
        ),
        autor_id=usr.id,
    )

    mot_1 = criar_motorista(
        db,
        MotoristaCreate(nome="Motorista Fase3 One"),
        autor_id=usr.id,
    )

    mot_2 = criar_motorista(
        db,
        MotoristaCreate(nome="Motorista Fase3 Two"),
        autor_id=usr.id,
    )

    mot_spot_1 = criar_motorista(
        db,
        MotoristaCreate(nome="Motorista Spot One"),
        autor_id=usr.id,
    )

    mot_spot_2 = criar_motorista(
        db,
        MotoristaCreate(nome="Motorista Spot Two"),
        autor_id=usr.id,
    )

    vei_1 = criar_veiculo(
        db,
        VeiculoCreate(
            placa=f"F3A{timestamp_str[-4:]}",
            identificacao="VEI-F3-01",
            tipo_veiculo="HR",
            especialidade="SECO",
        ),
        autor_id=usr.id,
    )

    vei_2 = criar_veiculo(
        db,
        VeiculoCreate(
            placa=f"F3B{timestamp_str[-4:]}",
            identificacao="VEI-F3-02",
            tipo_veiculo="Fiorino",
            especialidade="REFRIGERADO",
        ),
        autor_id=usr.id,
    )

    vei_spot_1 = criar_veiculo(
        db,
        VeiculoCreate(
            placa=f"S1A{timestamp_str[-4:]}",
            identificacao="VEI-SPOT-01",
            tipo_veiculo="HR",
            especialidade="SECO",
        ),
        autor_id=usr.id,
    )

    vei_spot_2 = criar_veiculo(
        db,
        VeiculoCreate(
            placa=f"S2B{timestamp_str[-4:]}",
            identificacao="VEI-SPOT-02",
            tipo_veiculo="Truck",
            especialidade="SECO",
        ),
        autor_id=usr.id,
    )

    return {
        "usuario": usr,
        "empresa_a": emp_a,
        "empresa_b": emp_b,
        "motorista_1": mot_1,
        "motorista_2": mot_2,
        "motorista_spot_1": mot_spot_1,
        "motorista_spot_2": mot_spot_2,
        "veiculo_1": vei_1,
        "veiculo_2": vei_2,
        "veiculo_spot_1": vei_spot_1,
        "veiculo_spot_2": vei_spot_2,
    }


def obter_headers_auth(usuario):
    token = criar_token_acesso(sub=str(usuario.id))
    return {"Authorization": f"Bearer {token}"}


# --- 1. Testes de Autenticação (/auth/me) ---

def test_auth_me_sucesso(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])

    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(base["usuario"].id)
    assert data["email"] == base["usuario"].email


def test_auth_me_sem_autenticacao(client: TestClient):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


# --- 2. Testes de Gestão de Usuários ---

def test_gestao_usuarios_obter_e_atualizar(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    usr_id = str(base["usuario"].id)

    # Obter detalhes por ID
    res_get = client.get(f"/api/v1/usuarios/{usr_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == usr_id

    # Atualizar nome e status
    novo_nome = "Admin Fase 3 Atualizado"
    res_put = client.put(
        f"/api/v1/usuarios/{usr_id}",
        json={"nome": novo_nome, "ativo": True},
        headers=headers,
    )
    assert res_put.status_code == 200
    assert res_put.json()["nome"] == novo_nome


def test_gestao_usuarios_inexistente(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    fake_id = "00000000-0000-0000-0000-000000000000"

    res = client.get(f"/api/v1/usuarios/{fake_id}", headers=headers)
    assert res.status_code == 404


# --- 3. Testes de Histórico Contratual ---

def test_historico_contratos_empresa(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    emp_id = base["empresa_a"].id
    agora = datetime.combine(date.today(), time(0, 0))

    # Configuração 1
    criar_contrato_configuracao(
        db,
        emp_id,
        ContratoConfiguracaoCreate(
            data_inicio=agora,
            regras={"HR": 2},
        ),
        autor_id=base["usuario"].id,
    )

    # Configuração 2 (Futura)
    criar_contrato_configuracao(
        db,
        emp_id,
        ContratoConfiguracaoCreate(
            data_inicio=agora + timedelta(days=10),
            regras={"HR": 4},
        ),
        autor_id=base["usuario"].id,
    )

    res = client.get(f"/api/v1/contratos/empresas/{emp_id}/configuracoes", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    # Deve estar ordenado por data_inicio decrescente
    assert data[0]["regras"]["HR"] == 4
    assert data[1]["regras"]["HR"] == 2


# --- 4. Testes de Substituição de SPOT ---

def test_substituicao_spot_sucesso(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    data_alvo = date.today() + timedelta(days=1)

    ag = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )

    spot_1 = AgendamentoService.adicionar_spot(
        db,
        agendamento_id=ag.id,
        dados=AlocacaoOperacionalCreate(
            motorista_id=base["motorista_spot_1"].id,
            veiculo_id=base["veiculo_spot_1"].id,
            categoria="SPOT",
        ),
        usuario_id=base["usuario"].id,
    )

    # Substituir spot_1 pelo motorista_spot_2 e veiculo_spot_2
    res_sub = client.post(
        f"/api/v1/agendamentos/alocacoes/{spot_1.id}/substituir",
        json={
            "motorista_id": str(base["motorista_spot_2"].id),
            "veiculo_id": str(base["veiculo_spot_2"].id),
            "categoria": "SPOT",
        },
        headers=headers,
    )
    assert res_sub.status_code == 200
    data_res = res_sub.json()
    assert data_res["motorista_id"] == str(base["motorista_spot_2"].id)
    assert data_res["veiculo_id"] == str(base["veiculo_spot_2"].id)

    # Verificar histórico do agendamento
    res_hist = client.get(f"/api/v1/agendamentos/{ag.id}/historico", headers=headers)
    assert res_hist.status_code == 200
    hist = res_hist.json()
    tipos = [h["tipo_alteracao"] for h in hist]
    assert "SUBSTITUICAO_SPOT" in tipos


def test_substituicao_spot_alocacao_inexistente(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    fake_id = "00000000-0000-0000-0000-000000000000"

    res = client.post(
        f"/api/v1/agendamentos/alocacoes/{fake_id}/substituir",
        json={
            "motorista_id": str(base["motorista_spot_1"].id),
            "veiculo_id": str(base["veiculo_spot_1"].id),
            "categoria": "SPOT",
        },
        headers=headers,
    )
    assert res.status_code == 404


def test_substituicao_spot_conflito_dupla_alocacao(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    data_alvo = date.today() + timedelta(days=1)

    # Agendamento 1
    ag1 = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )
    spot_ag1 = AgendamentoService.adicionar_spot(
        db,
        agendamento_id=ag1.id,
        dados=AlocacaoOperacionalCreate(
            motorista_id=base["motorista_spot_1"].id,
            veiculo_id=base["veiculo_spot_1"].id,
            categoria="SPOT",
        ),
        usuario_id=base["usuario"].id,
    )

    # Agendamento 2
    ag2 = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_b"].id, data=data_alvo, horario_inicio=time(9, 0)),
        usuario_id=base["usuario"].id,
    )
    spot_ag2 = AgendamentoService.adicionar_spot(
        db,
        agendamento_id=ag2.id,
        dados=AlocacaoOperacionalCreate(
            motorista_id=base["motorista_spot_2"].id,
            veiculo_id=base["veiculo_spot_2"].id,
            categoria="SPOT",
        ),
        usuario_id=base["usuario"].id,
    )

    # Tentar substituir spot_ag2 para usar motorista_spot_1 (já ativo no ag1)
    res_sub = client.post(
        f"/api/v1/agendamentos/alocacoes/{spot_ag2.id}/substituir",
        json={
            "motorista_id": str(base["motorista_spot_1"].id),
            "veiculo_id": str(base["veiculo_spot_2"].id),
            "categoria": "SPOT",
        },
        headers=headers,
    )
    assert res_sub.status_code == 400
    assert "já está alocado" in res_sub.json()["detail"]


# --- 5. Testes de Paginação e Filtros de Agendamentos ---

def test_agendamentos_paginacao_e_filtros(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    data_alvo = date.today() + timedelta(days=1)

    ag1 = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )

    # Teste consulta padrão list
    res_list = client.get(f"/api/v1/agendamentos?data={data_alvo.isoformat()}", headers=headers)
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)

    # Teste consulta paginada estruturada
    res_pag = client.get(
        f"/api/v1/agendamentos?data={data_alvo.isoformat()}&paginado=true&limite=10&offset=0",
        headers=headers,
    )
    assert res_pag.status_code == 200
    data_pag = res_pag.json()
    assert "items" in data_pag
    assert data_pag["total"] >= 1
    assert data_pag["limite"] == 10
    assert data_pag["offset"] == 0


# --- 6. Testes de Torre de Controle com Filtros Adicionais ---

def test_torre_detalhamento_filtros_combinados(client: TestClient, db: Session):
    base = setup_dados_fase_3(db)
    headers = obter_headers_auth(base["usuario"])
    data_alvo = date.today() + timedelta(days=1)

    ag = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )
    AgendamentoService.adicionar_spot(
        db,
        agendamento_id=ag.id,
        dados=AlocacaoOperacionalCreate(
            motorista_id=base["motorista_spot_1"].id,
            veiculo_id=base["veiculo_spot_1"].id,
            categoria="SPOT",
        ),
        usuario_id=base["usuario"].id,
    )

    placa = base["veiculo_spot_1"].placa
    mot_nome = "Spot One"

    res = client.get(
        f"/api/v1/operacao/torre/detalhamento?data={data_alvo.isoformat()}&placa={placa}&motorista_nome={mot_nome}",
        headers=headers,
    )
    assert res.status_code == 200
    detalhes = res.json()
    assert len(detalhes) == 1
    assert detalhes[0]["placa"] == placa


def limpar_dados_especificos(db: Session, ids_criados: dict):
    if not ids_criados:
        return
    try:
        from app.agendamentos.models import Agendamento, AlocacaoOperacional, HistoricoAgendamento
        from app.empresas.models import Empresa
        from app.motoristas.models import Motorista
        from app.veiculos.models import Veiculo
        from app.usuarios.models import Usuario
        from app.auditoria.models import Auditoria
        from app.contratos.models import ContratoConfiguracao

        ag_ids = ids_criados.get("agendamento_ids", [])
        emp_ids = ids_criados.get("empresa_ids", [])
        mot_ids = ids_criados.get("motorista_ids", [])
        vei_ids = ids_criados.get("veiculo_ids", [])
        usr_ids = ids_criados.get("usuario_ids", [])

        if ag_ids:
            db.query(HistoricoAgendamento).filter(HistoricoAgendamento.agendamento_id.in_(ag_ids)).delete(synchronize_session=False)
            db.query(AlocacaoOperacional).filter(AlocacaoOperacional.agendamento_id.in_(ag_ids)).delete(synchronize_session=False)
            db.query(Agendamento).filter(Agendamento.id.in_(ag_ids)).delete(synchronize_session=False)

        all_entidade_ids = emp_ids + mot_ids + vei_ids + usr_ids
        if all_entidade_ids or usr_ids:
            db.query(Auditoria).filter(
                (Auditoria.entidade_id.in_(all_entidade_ids)) | (Auditoria.usuario_id.in_(usr_ids))
            ).delete(synchronize_session=False)

        if emp_ids:
            db.query(ContratoConfiguracao).filter(ContratoConfiguracao.empresa_id.in_(emp_ids)).delete(synchronize_session=False)
            db.query(Empresa).filter(Empresa.id.in_(emp_ids)).delete(synchronize_session=False)
        if mot_ids:
            db.query(Motorista).filter(Motorista.id.in_(mot_ids)).delete(synchronize_session=False)
        if vei_ids:
            db.query(Veiculo).filter(Veiculo.id.in_(vei_ids)).delete(synchronize_session=False)
        if usr_ids:
            db.query(Usuario).filter(Usuario.id.in_(usr_ids)).delete(synchronize_session=False)

        db.commit()
    except Exception:
        db.rollback()


# --- 7. Teste de Concorrência na Substituição de SPOT ---

def test_concorrencia_substituicao_spot_simultanea():
    db_setup = SessionLocal()
    try:
        base = setup_dados_fase_3(db_setup)
        data_alvo = date.today() + timedelta(days=1)

        ag1 = AgendamentoService.criar_agendamento(
            db_setup,
            AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
            usuario_id=base["usuario"].id,
        )
        ag2 = AgendamentoService.criar_agendamento(
            db_setup,
            AgendamentoCreate(empresa_id=base["empresa_b"].id, data=data_alvo, horario_inicio=time(9, 0)),
            usuario_id=base["usuario"].id,
        )

        spot_ag1 = AgendamentoService.adicionar_spot(
            db_setup,
            agendamento_id=ag1.id,
            dados=AlocacaoOperacionalCreate(
                motorista_id=base["motorista_1"].id,
                veiculo_id=base["veiculo_1"].id,
                categoria="SPOT",
            ),
            usuario_id=base["usuario"].id,
        )
        spot_ag2 = AgendamentoService.adicionar_spot(
            db_setup,
            agendamento_id=ag2.id,
            dados=AlocacaoOperacionalCreate(
                motorista_id=base["motorista_2"].id,
                veiculo_id=base["veiculo_2"].id,
                categoria="SPOT",
            ),
            usuario_id=base["usuario"].id,
        )
        db_setup.commit()

        spot_ag1_id = spot_ag1.id
        spot_ag2_id = spot_ag2.id
        mot_alvo_id = base["motorista_spot_1"].id
        vei_alvo_id = base["veiculo_spot_1"].id
        usr_id = base["usuario"].id
        ids_criados = {
            "agendamento_ids": [ag1.id, ag2.id],
            "empresa_ids": [base["empresa_a"].id, base["empresa_b"].id],
            "motorista_ids": [base["motorista_1"].id, base["motorista_2"].id, base["motorista_spot_1"].id, base["motorista_spot_2"].id],
            "veiculo_ids": [base["veiculo_1"].id, base["veiculo_2"].id, base["veiculo_spot_1"].id, base["veiculo_spot_2"].id],
            "usuario_ids": [base["usuario"].id],
        }
    finally:
        db_setup.close()

    # Tenta substituir simultaneamente spot_ag1 e spot_ag2 para usar o MESMO motorista_spot_1 e veiculo_spot_1
    def tentar_substituir(alocacao_id):
        session = SessionLocal()
        try:
            AgendamentoService.substituir_spot(
                session,
                alocacao_id=alocacao_id,
                dados=AlocacaoOperacionalCreate(
                    motorista_id=mot_alvo_id,
                    veiculo_id=vei_alvo_id,
                    categoria="SPOT",
                ),
                usuario_id=usr_id,
            )
            return "SUCESSO"
        except Exception as e:
            session.rollback()
            return f"REJEITADO: {type(e).__name__}: {str(e)}"
        finally:
            session.rollback()
            session.close()

    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(tentar_substituir, spot_ag1_id)
            f2 = executor.submit(tentar_substituir, spot_ag2_id)
            r1 = f1.result()
            r2 = f2.result()

        resultados = [r1, r2]
        sucessos = [r for r in resultados if r == "SUCESSO"]
        rejeicoes = [r for r in resultados if "REJEITADO" in r]

        assert len(sucessos) == 1
        assert len(rejeicoes) == 1
    finally:
        engine.dispose()
        db_clean = SessionLocal()
        try:
            limpar_dados_especificos(db_clean, ids_criados)
        finally:
            db_clean.close()
            engine.dispose()
