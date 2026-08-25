import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.agendamentos.models import Agendamento, AlocacaoOperacional
from app.agendamentos.schemas import (
    AgendamentoCreate,
    AgendamentoUpdate,
    AlocacaoOperacionalCreate,
)
from app.agendamentos.services import AgendamentoService
from app.contratos.schemas import ContratoConfiguracaoCreate, CapacidadeItemSchema
from app.contratos.services import criar_contrato_configuracao
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.usuarios.models import Usuario


def setup_operacao_data(db: Session):
    empresa = Empresa(nome="Empresa Teste Operacao", identificacao="EMP-OP-01", ativo=True)
    empresa2 = Empresa(nome="Empresa Teste Operacao 2", identificacao="EMP-OP-02", ativo=True)
    motorista1 = Motorista(nome="Motorista Operacional 1", ativo=True)
    motorista2 = Motorista(nome="Motorista Operacional 2", ativo=True)

    veiculo1 = Veiculo(
        identificacao="HR-OP-01",
        placa="HRO1A01",
        tipo_veiculo="HR",
        especialidade="SECO",
        ativo=True,
    )
    veiculo2 = Veiculo(
        identificacao="HR-OP-02",
        placa="HRO1B02",
        tipo_veiculo="HR",
        especialidade="SECO",
        ativo=True,
    )
    usuario = Usuario(
        nome="Admin Operacao",
        email=f"admin_op_{uuid.uuid4().hex[:6]}@logtudo.com",
        senha_hash="hash",
        ativo=True,
    )
    db.add_all([empresa, empresa2, motorista1, motorista2, veiculo1, veiculo2, usuario])
    db.commit()
    db.refresh(empresa)
    db.refresh(empresa2)
    db.refresh(motorista1)
    db.refresh(motorista2)
    db.refresh(veiculo1)
    db.refresh(veiculo2)
    db.refresh(usuario)

    # Cadastra capacidade
    criar_contrato_configuracao(
        db,
        empresa.id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime.now(timezone.utc) - timedelta(days=10),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=5)
            ],
        ),
        autor_id=usuario.id,
    )
    criar_contrato_configuracao(
        db,
        empresa2.id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime.now(timezone.utc) - timedelta(days=10),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=5)
            ],
        ),
        autor_id=usuario.id,
    )

    return {
        "empresa": empresa,
        "empresa2": empresa2,
        "m1": motorista1,
        "m2": motorista2,
        "v1": veiculo1,
        "v2": veiculo2,
        "usuario": usuario,
    }


def test_regra_1_bloqueio_indisponivel_data_ou_dia_anterior(db: Session):
    """Regra 1: Motorista ou veículo marcado como INDISPONÍVEL não pode ser agendado."""
    base = setup_operacao_data(db)
    hoje = date.today()
    amanha = hoje + timedelta(days=1)

    # 1. Cria agendamento para hoje
    ag_hoje = Agendamento(
        empresa_id=base["empresa"].id,
        data=hoje,
        horario_inicio="08:00",
        status="PROGRAMADO",
        criado_por_id=base["usuario"].id,
    )
    db.add(ag_hoje)
    db.commit()
    db.refresh(ag_hoje)

    # Adiciona alocação marcada como INDISPONIVEL hoje
    aloc_indisp = AlocacaoOperacional(
        agendamento_id=ag_hoje.id,
        motorista_id=base["m1"].id,
        veiculo_id=base["v1"].id,
        categoria="SPOT",
        status_operacional="INDISPONIVEL",
    )
    db.add(aloc_indisp)
    db.commit()

    # 2. Cria agendamento para amanhã e tenta alocar o mesmo motorista/veículo
    ag_amanha = Agendamento(
        empresa_id=base["empresa2"].id,
        data=amanha,
        horario_inicio="09:00",
        status="PROGRAMADO",
        criado_por_id=base["usuario"].id,
    )
    db.add(ag_amanha)
    db.commit()
    db.refresh(ag_amanha)

    # Deve bloquear alocação com erro 400
    with pytest.raises(HTTPException) as exc_info:
        AgendamentoService.adicionar_spot(
            db=db,
            agendamento_id=ag_amanha.id,
            dados=AlocacaoOperacionalCreate(
                motorista_id=base["m1"].id,
                veiculo_id=base["v1"].id,
                categoria="SPOT",
            ),
            usuario_id=base["usuario"].id,
        )
    assert exc_info.value.status_code == 400
    assert "INDISPONÍVEL" in exc_info.value.detail


def test_regra_3_bloqueio_em_rota_ativa(db: Session):
    """Regra 3: Motorista ou veículo com viagem EM_ROTA não pode ser agendado."""
    base = setup_operacao_data(db)
    hoje = date.today()

    # Cria agendamento em execução com alocação EM_ROTA
    ag_rota = Agendamento(
        empresa_id=base["empresa"].id,
        data=hoje,
        horario_inicio="07:00",
        status="EM_EXECUCAO",
        criado_por_id=base["usuario"].id,
    )
    db.add(ag_rota)
    db.commit()
    db.refresh(ag_rota)

    aloc_rota = AlocacaoOperacional(
        agendamento_id=ag_rota.id,
        motorista_id=base["m2"].id,
        veiculo_id=base["v2"].id,
        categoria="SPOT",
        status_operacional="EM_ROTA",
    )
    db.add(aloc_rota)
    db.commit()

    # Tenta alocar em outro agendamento
    ag_outro = Agendamento(
        empresa_id=base["empresa2"].id,
        data=hoje,
        horario_inicio="11:00",
        status="PROGRAMADO",
        criado_por_id=base["usuario"].id,
    )
    db.add(ag_outro)
    db.commit()
    db.refresh(ag_outro)

    with pytest.raises(HTTPException) as exc_info:
        AgendamentoService.adicionar_spot(
            db=db,
            agendamento_id=ag_outro.id,
            dados=AlocacaoOperacionalCreate(
                motorista_id=base["m2"].id,
                veiculo_id=base["v2"].id,
                categoria="SPOT",
            ),
            usuario_id=base["usuario"].id,
        )
    assert exc_info.value.status_code == 400
    assert "status diferente de DISPONÍVEL" in exc_info.value.detail


def test_regra_9_liberacao_em_cascata_ao_cancelar_agendamento(db: Session):
    """Regra 9: Ao cancelar agendamento, alocações PROGRAMADO retornam automaticamente para DISPONIVEL."""
    base = setup_operacao_data(db)
    hoje = date.today()

    ag = Agendamento(
        empresa_id=base["empresa"].id,
        data=hoje,
        horario_inicio="08:00",
        status="PROGRAMADO",
        criado_por_id=base["usuario"].id,
    )
    db.add(ag)
    db.commit()
    db.refresh(ag)

    aloc = AlocacaoOperacional(
        agendamento_id=ag.id,
        motorista_id=base["m1"].id,
        veiculo_id=base["v1"].id,
        categoria="SPOT",
        status_operacional="PROGRAMADO",
    )
    db.add(aloc)
    db.commit()
    db.refresh(aloc)

    assert aloc.status_operacional == "PROGRAMADO"

    # Cancela o agendamento
    AgendamentoService.cancelar_agendamento(
        db=db,
        agendamento_id=ag.id,
        usuario_id=base["usuario"].id,
    )

    db.refresh(ag)
    db.refresh(aloc)

    assert ag.status == "CANCELADO"
    assert aloc.status_operacional == "DISPONIVEL"
