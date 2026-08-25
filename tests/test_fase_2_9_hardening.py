import pytest
import uuid
from datetime import date, datetime, time, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import text
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from app.core.database import Base
from tests.conftest import SessionTesting as SessionLocal, engine_test as engine
from app.core.datetime_utils import TZ_BAHIA, para_utc, inicio_do_dia_utc, fim_do_dia_utc
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.usuarios.models import Usuario
from app.contratos.models import MotoristaDedicadoVinculo, ContratoConfiguracao
from app.contratos.schemas import (
    MotoristaDedicadoVinculoCreate,
    ContratoConfiguracaoCreate,
    CapacidadeItemSchema,
)
from app.contratos.services import criar_vinculo_motorista, desativar_vinculo_motorista, criar_contrato_configuracao
from app.agendamentos.models import Agendamento, AlocacaoOperacional, HistoricoAgendamento
from app.agendamentos.schemas import (
    AgendamentoCreate,
    AlocacaoOperacionalCreate,
    StatusOperacionalUpdate,
)
from app.agendamentos.services import AgendamentoService
from app.operacao.models import MotivoIndisponibilidade, EventoOperacional
from app.operacao.services import OperacaoService
from app.core.security import obter_senha_hash


def setup_dados_base(db: Session):
    """Cria instâncias base de empresa, motorista, veículo e usuário para os testes."""
    sfx = uuid.uuid4().hex[:6]
    empresa_a = Empresa(nome=f"Empresa A {sfx}", identificacao=f"11.{sfx[:4]}.111/0001", ativo=True)
    empresa_b = Empresa(nome=f"Empresa B {sfx}", identificacao=f"22.{sfx[:4]}.222/0002", ativo=True)
    db.add_all([empresa_a, empresa_b])
    db.flush()

    motorista_1 = Motorista(nome=f"Motorista João {sfx}", ativo=True)
    motorista_2 = Motorista(nome=f"Motorista Pedro {sfx}", ativo=True)
    db.add_all([motorista_1, motorista_2])
    db.flush()

    veiculo_1 = Veiculo(identificacao=f"V1_{sfx}", placa=f"A{sfx[:5].upper()}", tipo_veiculo="HR", especialidade="SECO", ativo=True)
    veiculo_2 = Veiculo(identificacao=f"V2_{sfx}", placa=f"B{sfx[:5].upper()}", tipo_veiculo="HR", especialidade="SECO", ativo=True)
    db.add_all([veiculo_1, veiculo_2])
    db.flush()

    usuario = Usuario(nome=f"Admin {sfx}", email=f"admin_{sfx}@logtudo.com", senha_hash=obter_senha_hash("123456"), ativo=True)
    db.add(usuario)
    db.flush()

    motivo = db.query(MotivoIndisponibilidade).filter(MotivoIndisponibilidade.nome == "Avaria").first()
    if not motivo:
        motivo = MotivoIndisponibilidade(nome="Avaria", ativo=True)
        db.add(motivo)
        db.flush()

    criar_contrato_configuracao(
        db,
        empresa_a.id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=5)
            ],
        ),
        autor_id=usuario.id,
    )
    criar_contrato_configuracao(
        db,
        empresa_b.id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=5)
            ],
        ),
        autor_id=usuario.id,
    )

    return {
        "empresa_a": empresa_a,
        "empresa_b": empresa_b,
        "motorista_1": motorista_1,
        "motorista_2": motorista_2,
        "veiculo_1": veiculo_1,
        "veiculo_2": veiculo_2,
        "usuario": usuario,
        "motivo": motivo,
    }


def limpar_dados_especificos(db: Session, ids: dict):
    if ids.get("agendamento_ids"):
        db.query(AlocacaoOperacional).filter(AlocacaoOperacional.agendamento_id.in_(ids["agendamento_ids"])).delete(synchronize_session=False)
        db.query(HistoricoAgendamento).filter(HistoricoAgendamento.agendamento_id.in_(ids["agendamento_ids"])).delete(synchronize_session=False)
        db.query(Agendamento).filter(Agendamento.id.in_(ids["agendamento_ids"])).delete(synchronize_session=False)
    if ids.get("empresa_ids"):
        db.query(MotoristaDedicadoVinculo).filter(MotoristaDedicadoVinculo.empresa_id.in_(ids["empresa_ids"])).delete(synchronize_session=False)
        db.query(ContratoConfiguracao).filter(ContratoConfiguracao.empresa_id.in_(ids["empresa_ids"])).delete(synchronize_session=False)
    if ids.get("veiculo_ids"):
        db.query(Veiculo).filter(Veiculo.id.in_(ids["veiculo_ids"])).delete(synchronize_session=False)
    if ids.get("motorista_ids"):
        db.query(Motorista).filter(Motorista.id.in_(ids["motorista_ids"])).delete(synchronize_session=False)
    if ids.get("empresa_ids"):
        db.query(Empresa).filter(Empresa.id.in_(ids["empresa_ids"])).delete(synchronize_session=False)
    if ids.get("usuario_id"):
        db.query(Usuario).filter(Usuario.id == ids["usuario_id"]).delete(synchronize_session=False)
    db.commit()


# ==========================================
# 1. TESTES DE EXCLUSIVIDADE DE DEDICADOS (BUG-CRIT-01)
# ==========================================

def test_exclusividade_veiculo_dedicado_ativo(db: Session):
    base = setup_dados_base(db)

    # 1. Empresa A vincula Veiculo 1 com Motorista 1
    v1 = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa_a"].id,
            motorista_id=base["motorista_1"].id,
            veiculo_id=base["veiculo_1"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )
    assert v1.ativo is True

    # 2. Empresa B tenta vincular o MESMO Veiculo 1 (com Motorista 2) -> Deve Rejeitar
    with pytest.raises(ValueError, match="já possui um vínculo dedicado ativo"):
        criar_vinculo_motorista(
            db,
            MotoristaDedicadoVinculoCreate(
                empresa_id=base["empresa_b"].id,
                motorista_id=base["motorista_2"].id,
                veiculo_id=base["veiculo_1"].id,
                tipo_veiculo="HR",
                categoria_operacional="DEDICADO",
            ),
            autor_id=base["usuario"].id,
        )


def test_reutilizacao_veiculo_dedicado_apos_desativacao(db: Session):
    base = setup_dados_base(db)

    # 1. Empresa A vincula Veiculo 1
    v1 = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa_a"].id,
            motorista_id=base["motorista_1"].id,
            veiculo_id=base["veiculo_1"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )

    # 2. Desativa o vínculo da Empresa A
    desativar_vinculo_motorista(db, v1, autor_id=base["usuario"].id)

    # 3. Empresa B agora pode vincular o Veiculo 1 -> Permitido
    v2 = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa_b"].id,
            motorista_id=base["motorista_2"].id,
            veiculo_id=base["veiculo_1"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )
    assert v2.ativo is True
    assert v2.empresa_id == base["empresa_b"].id


# ==========================================
# 2. TESTES DE CONCORRÊNCIA EM ALOCAÇÕES OPERACIONAIS (BUG-CRIT-02)
# ==========================================

def test_concorrencia_alocacao_simultanea_mesmo_motorista():
    db_setup = SessionLocal()
    try:
        base = setup_dados_base(db_setup)
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
        db_setup.commit()

        ag1_id = ag1.id
        ag2_id = ag2.id
        m1_id = base["motorista_1"].id
        v1_id = base["veiculo_1"].id
        v2_id = base["veiculo_2"].id
        usr_id = base["usuario"].id
        ids_criados = {
            "agendamento_ids": [ag1_id, ag2_id],
            "empresa_ids": [base["empresa_a"].id, base["empresa_b"].id],
            "motorista_ids": [m1_id, base["motorista_2"].id],
            "veiculo_ids": [v1_id, v2_id],
            "usuario_id": usr_id,
        }
    finally:
        db_setup.close()

    try:
        def alocar_motorista(agendamento_id, veiculo_id):
            session = SessionLocal()
            try:
                AgendamentoService.adicionar_spot(
                    session,
                    agendamento_id=agendamento_id,
                    dados=AlocacaoOperacionalCreate(
                        motorista_id=m1_id,
                        veiculo_id=veiculo_id,
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

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(alocar_motorista, ag1_id, v1_id)
            f2 = executor.submit(alocar_motorista, ag2_id, v2_id)
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


def test_concorrencia_alocacao_simultanea_mesmo_veiculo():
    db_setup = SessionLocal()
    try:
        base = setup_dados_base(db_setup)
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
        db_setup.commit()

        ag1_id = ag1.id
        ag2_id = ag2.id
        m1_id = base["motorista_1"].id
        m2_id = base["motorista_2"].id
        v1_id = base["veiculo_1"].id
        usr_id = base["usuario"].id

        ids_criados = {
            "agendamento_ids": [ag1_id, ag2_id],
            "empresa_ids": [base["empresa_a"].id, base["empresa_b"].id],
            "motorista_ids": [m1_id, m2_id],
            "veiculo_ids": [v1_id, base["veiculo_2"].id],
            "usuario_id": usr_id,
        }
    finally:
        db_setup.close()

    try:
        def alocar_veiculo(agendamento_id, motorista_id):
            session = SessionLocal()
            try:
                AgendamentoService.adicionar_spot(
                    session,
                    agendamento_id=agendamento_id,
                    dados=AlocacaoOperacionalCreate(
                        motorista_id=motorista_id,
                        veiculo_id=v1_id,
                        categoria="SPOT",
                    ),
                    usuario_id=usr_id,
                )
                return "SUCESSO"
            except Exception as e:
                session.rollback()
                return f"REJEITADO: {str(e)}"
            finally:
                session.rollback()
                session.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(alocar_veiculo, ag1_id, m1_id)
            f2 = executor.submit(alocar_veiculo, ag2_id, m2_id)
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


def test_concorrencia_alocacao_simultanea_sem_conflito():
    db_setup = SessionLocal()
    try:
        base = setup_dados_base(db_setup)
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
        db_setup.commit()

        ag1_id = ag1.id
        ag2_id = ag2.id
        m1_id = base["motorista_1"].id
        m2_id = base["motorista_2"].id
        v1_id = base["veiculo_1"].id
        v2_id = base["veiculo_2"].id
        usr_id = base["usuario"].id

        ids_criados = {
            "agendamento_ids": [ag1_id, ag2_id],
            "empresa_ids": [base["empresa_a"].id, base["empresa_b"].id],
            "motorista_ids": [m1_id, m2_id],
            "veiculo_ids": [v1_id, v2_id],
            "usuario_id": usr_id,
        }
    finally:
        db_setup.close()

    try:
        def alocar_distinto(agendamento_id, motorista_id, veiculo_id):
            session = SessionLocal()
            try:
                AgendamentoService.adicionar_spot(
                    session,
                    agendamento_id=agendamento_id,
                    dados=AlocacaoOperacionalCreate(
                        motorista_id=motorista_id,
                        veiculo_id=veiculo_id,
                        categoria="SPOT",
                    ),
                    usuario_id=usr_id,
                )
                return "SUCESSO"
            except Exception as e:
                session.rollback()
                return f"REJEITADO: {str(e)}"
            finally:
                session.rollback()
                session.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(alocar_distinto, ag1_id, m1_id, v1_id)
            f2 = executor.submit(alocar_distinto, ag2_id, m2_id, v2_id)
            r1 = f1.result()
            r2 = f2.result()

        assert r1 == "SUCESSO"
        assert r2 == "SUCESSO"
    finally:
        engine.dispose()
        db_clean = SessionLocal()
        try:
            limpar_dados_especificos(db_clean, ids_criados)
        finally:
            db_clean.close()
            engine.dispose()


def test_reutilizacao_motorista_apos_encerramento(db: Session):
    base = setup_dados_base(db)
    data_alvo = date.today() + timedelta(days=1)

    ag1 = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )
    aloc1 = AgendamentoService.adicionar_spot(
        db,
        agendamento_id=ag1.id,
        dados=AlocacaoOperacionalCreate(
            motorista_id=base["motorista_1"].id,
            veiculo_id=base["veiculo_1"].id,
            categoria="SPOT",
        ),
        usuario_id=base["usuario"].id,
    )
    # Alocação 1 vai para EM_ROTA e depois encerra (DISPONIVEL)
    AgendamentoService.atualizar_status_operacional(
        db,
        alocacao_id=aloc1.id,
        novo_status="EM_ROTA",
        motivo_indisponibilidade_id=None,
        origem="painel_operacional",
        usuario_id=base["usuario"].id,
    )
    AgendamentoService.atualizar_status_operacional(
        db,
        alocacao_id=aloc1.id,
        novo_status="DISPONIVEL",
        motivo_indisponibilidade_id=None,
        origem="painel_operacional",
        usuario_id=base["usuario"].id,
    )

    # 2. Novo agendamento para o mesmo motorista no mesmo dia
    ag2 = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_b"].id, data=data_alvo, horario_inicio=time(11, 0)),
        usuario_id=base["usuario"].id,
    )
    aloc2 = AgendamentoService.adicionar_spot(
        db,
        agendamento_id=ag2.id,
        dados=AlocacaoOperacionalCreate(
            motorista_id=base["motorista_1"].id,
            veiculo_id=base["veiculo_2"].id,
            categoria="SPOT",
        ),
        usuario_id=base["usuario"].id,
    )
    assert aloc2.status_operacional == "PROGRAMADO"


# ==========================================
# 3. TESTES DE CAPACIDADE CONTRATUAL E TORRE (BUG-ALTO-01)
# ==========================================

def test_indicadores_capacidade_contratual_e_vagas_nao_preenchidas(db: Session):
    base = setup_dados_base(db)
    data_alvo = date.today() + timedelta(days=1)

    # Contrato: 4 HR
    criar_contrato_configuracao(
        db,
        empresa_id=base["empresa_a"].id,
        dados=ContratoConfiguracaoCreate(
            data_inicio=datetime.combine(data_alvo, time(0, 0)),
            regras={"HR": 4},
        ),
        autor_id=base["usuario"].id,
    )

    # Agendamento aloca apenas 2 motoristas
    ag = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )
    AgendamentoService.adicionar_spot(
        db,
        ag.id,
        AlocacaoOperacionalCreate(motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id, categoria="SPOT"),
        base["usuario"].id,
    )
    AgendamentoService.adicionar_spot(
        db,
        ag.id,
        AlocacaoOperacionalCreate(motorista_id=base["motorista_2"].id, veiculo_id=base["veiculo_2"].id, categoria="SPOT"),
        base["usuario"].id,
    )

    resumo = OperacaoService.obter_resumo_por_empresa(db, data_alvo)
    resumo_a = [r for r in resumo if r.empresa_id == base["empresa_a"].id][0]

    assert resumo_a.contratados == 4
    assert resumo_a.total == 2
    assert resumo_a.vagas_nao_preenchidas == 2
    assert resumo_a.contratados == (
        resumo_a.programados
        + resumo_a.em_rota
        + resumo_a.disponiveis
        + resumo_a.indisponiveis
        + resumo_a.vagas_nao_preenchidas
    )


def test_indisponivel_ocupando_vaga_contratual(db: Session):
    base = setup_dados_base(db)
    data_alvo = date.today() + timedelta(days=1)

    criar_contrato_configuracao(
        db,
        empresa_id=base["empresa_a"].id,
        dados=ContratoConfiguracaoCreate(
            data_inicio=datetime.combine(data_alvo, time(0, 0)),
            regras={"HR": 4},
        ),
        autor_id=base["usuario"].id,
    )

    ag = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_alvo, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )
    aloc = AgendamentoService.adicionar_spot(
        db,
        ag.id,
        AlocacaoOperacionalCreate(motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id, categoria="SPOT"),
        base["usuario"].id,
    )
    AgendamentoService.atualizar_status_operacional(
        db,
        alocacao_id=aloc.id,
        novo_status="INDISPONIVEL",
        motivo_indisponibilidade_id=base["motivo"].id,
        origem="painel_operacional",
        usuario_id=base["usuario"].id,
    )

    resumo = OperacaoService.obter_resumo_por_empresa(db, data_alvo)
    resumo_a = [r for r in resumo if r.empresa_id == base["empresa_a"].id][0]

    assert resumo_a.contratados == 4
    assert resumo_a.indisponiveis == 1
    assert resumo_a.vagas_nao_preenchidas == 3


def test_mudanca_contratual_por_data(db: Session):
    base = setup_dados_base(db)
    data_agosto = date(2026, 8, 15)
    data_setembro = date(2026, 9, 15)

    # Config Agosto: 4 HR
    criar_contrato_configuracao(
        db,
        empresa_id=base["empresa_a"].id,
        dados=ContratoConfiguracaoCreate(
            data_inicio=datetime(2026, 8, 1, 0, 0, tzinfo=TZ_BAHIA),
            regras={"HR": 4},
        ),
        autor_id=base["usuario"].id,
    )

    # Config Setembro: 6 HR
    criar_contrato_configuracao(
        db,
        empresa_id=base["empresa_a"].id,
        dados=ContratoConfiguracaoCreate(
            data_inicio=datetime(2026, 9, 1, 0, 0, tzinfo=TZ_BAHIA),
            regras={"HR": 6},
        ),
        autor_id=base["usuario"].id,
    )

    resumo_agosto = OperacaoService.obter_resumo_por_empresa(db, data_agosto)
    r_agosto = [r for r in resumo_agosto if r.empresa_id == base["empresa_a"].id][0]
    assert r_agosto.contratados == 4

    resumo_setembro = OperacaoService.obter_resumo_por_empresa(db, data_setembro)
    r_setembro = [r for r in resumo_setembro if r.empresa_id == base["empresa_a"].id][0]
    assert r_setembro.contratados == 6


# ==========================================
# 4. TESTES DE AGENDAMENTO E SNAPSHOT CONTRATUAL (BUG-ALTO-02)
# ==========================================

def test_agendamento_captura_e_preserva_contrato_historico(db: Session):
    base = setup_dados_base(db)
    data_amanha = date.today() + timedelta(days=1)

    # Contrato A (Hoje)
    config_a = criar_contrato_configuracao(
        db,
        empresa_id=base["empresa_a"].id,
        dados=ContratoConfiguracaoCreate(
            data_inicio=datetime.combine(date.today(), time(0, 0)),
            regras={"HR": 4},
        ),
        autor_id=base["usuario"].id,
    )

    # Agendamento criado
    ag = AgendamentoService.criar_agendamento(
        db,
        AgendamentoCreate(empresa_id=base["empresa_a"].id, data=data_amanha, horario_inicio=time(8, 0)),
        usuario_id=base["usuario"].id,
    )
    assert ag.contrato_configuracao_id == config_a.id

    # No futuro entra Contrato B
    config_b = criar_contrato_configuracao(
        db,
        empresa_id=base["empresa_a"].id,
        dados=ContratoConfiguracaoCreate(
            data_inicio=datetime.combine(date.today() + timedelta(days=30), time(0, 0)),
            regras={"HR": 6},
        ),
        autor_id=base["usuario"].id,
    )
    assert config_b.id != config_a.id

    # Recarrega o agendamento do banco e garante que ele CONTINUA apontando para o Contrato A original
    db.refresh(ag)
    assert ag.contrato_configuracao_id == config_a.id


# ==========================================
# 5. TESTES DE TIMEZONE AMERICA/BAHIA NOS FILTROS (BUG-ALTO-03)
# ==========================================

def test_filtro_eventos_operacionais_timezone_bahia(db: Session):
    base = setup_dados_base(db)

    # Data de teste: 2026-08-20
    data_filtro = date(2026, 8, 20)

    # Eventos com timestamps conhecidos no fuso America/Bahia (-03:00)
    # Evento 1: 19/08 20:59 (Antes do dia 20 na Bahia)
    dt1 = datetime(2026, 8, 19, 20, 59, tzinfo=TZ_BAHIA)
    # Evento 2: 19/08 21:01 (Seria dia 20 em UTC 00:01, mas na Bahia AINDA É DIA 19!)
    dt2 = datetime(2026, 8, 19, 21, 1, tzinfo=TZ_BAHIA)
    # Evento 3: 20/08 00:01 (Dia 20 na Bahia)
    dt3 = datetime(2026, 8, 20, 0, 1, tzinfo=TZ_BAHIA)
    # Evento 4: 20/08 23:59 (Fim do dia 20 na Bahia)
    dt4 = datetime(2026, 8, 20, 23, 59, tzinfo=TZ_BAHIA)
    # Evento 5: 21/08 00:01 (Dia 21 na Bahia)
    dt5 = datetime(2026, 8, 21, 0, 1, tzinfo=TZ_BAHIA)

    ev1 = EventoOperacional(
        empresa_id=base["empresa_a"].id, motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id,
        categoria="DEDICADO", status_anterior="DISPONIVEL", novo_status="PROGRAMADO", usuario_id=base["usuario"].id,
        criado_em=para_utc(dt1)
    )
    ev2 = EventoOperacional(
        empresa_id=base["empresa_a"].id, motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id,
        categoria="DEDICADO", status_anterior="PROGRAMADO", novo_status="EM_ROTA", usuario_id=base["usuario"].id,
        criado_em=para_utc(dt2)
    )
    ev3 = EventoOperacional(
        empresa_id=base["empresa_a"].id, motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id,
        categoria="DEDICADO", status_anterior="EM_ROTA", novo_status="DISPONIVEL", usuario_id=base["usuario"].id,
        criado_em=para_utc(dt3)
    )
    ev4 = EventoOperacional(
        empresa_id=base["empresa_a"].id, motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id,
        categoria="DEDICADO", status_anterior="DISPONIVEL", novo_status="PROGRAMADO", usuario_id=base["usuario"].id,
        criado_em=para_utc(dt4)
    )
    ev5 = EventoOperacional(
        empresa_id=base["empresa_a"].id, motorista_id=base["motorista_1"].id, veiculo_id=base["veiculo_1"].id,
        categoria="DEDICADO", status_anterior="PROGRAMADO", novo_status="EM_ROTA", usuario_id=base["usuario"].id,
        criado_em=para_utc(dt5)
    )
    db.add_all([ev1, ev2, ev3, ev4, ev5])
    db.commit()

    # Consulta filtrando exatamente o dia 20/08/2026
    eventos = OperacaoService.listar_eventos_operacionais(
        db, data_inicio=data_filtro, data_fim=data_filtro
    )

    ids_encontrados = [e.id for e in eventos]

    # Deve conter EXATAMENTE ev3 e ev4 (os eventos que ocorreram dentro do dia 20 no fuso da Bahia)
    assert ev3.id in ids_encontrados
    assert ev4.id in ids_encontrados
    assert ev1.id not in ids_encontrados
    assert ev2.id not in ids_encontrados
    assert ev5.id not in ids_encontrados
