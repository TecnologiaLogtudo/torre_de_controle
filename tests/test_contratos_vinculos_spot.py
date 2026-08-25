import uuid
import pytest
from sqlalchemy.orm import Session
from app.contratos.models import MotoristaDedicadoVinculo
from app.contratos.schemas import MotoristaDedicadoVinculoCreate
from app.contratos.services import (
    criar_vinculo_motorista,
    desativar_vinculo_motorista,
    obter_vinculo_ativo_motorista,
)
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.usuarios.models import Usuario


def setup_base(db: Session):
    empresa = Empresa(nome="Empresa Teste Spot", identificacao="EMP-SPOT-01", ativo=True)
    motorista = Motorista(nome="Motorista Spot Teste", ativo=True)
    veiculo = Veiculo(
        identificacao="VEC-SPOT-01",
        placa="SPT1A23",
        tipo_veiculo="HR",
        especialidade="SECO",
        ativo=True,
    )
    usuario = Usuario(
        nome="Admin Spot",
        email=f"admin_spot_{uuid.uuid4().hex[:6]}@logtudo.com",
        senha_hash="hash",
        ativo=True,
    )
    db.add_all([empresa, motorista, veiculo, usuario])
    db.commit()
    db.refresh(empresa)
    db.refresh(motorista)
    db.refresh(veiculo)
    db.refresh(usuario)
    return {
        "empresa": empresa,
        "motorista": motorista,
        "veiculo": veiculo,
        "usuario": usuario,
    }


def test_criar_vinculo_spot_sem_empresa(db: Session):
    base = setup_base(db)
    
    # 1. Cria vínculo SPOT sem empresa
    vinculo = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=None,
            motorista_id=base["motorista"].id,
            veiculo_id=base["veiculo"].id,
            tipo_veiculo="HR",
            categoria_operacional="SPOT",
        ),
        autor_id=base["usuario"].id,
    )

    assert vinculo.id is not None
    assert vinculo.empresa_id is None
    assert vinculo.motorista_id == base["motorista"].id
    assert vinculo.veiculo_id == base["veiculo"].id
    assert vinculo.categoria_operacional == "SPOT"
    assert vinculo.ativo is True


def test_transicao_vinculo_spot_para_dedicado(db: Session):
    base = setup_base(db)

    # 1. Cria vínculo SPOT inicial sem empresa
    v_spot = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=None,
            motorista_id=base["motorista"].id,
            veiculo_id=base["veiculo"].id,
            tipo_veiculo="HR",
            categoria_operacional="SPOT",
        ),
        autor_id=base["usuario"].id,
    )
    assert v_spot.empresa_id is None
    assert v_spot.categoria_operacional == "SPOT"

    # 2. Cadastra capacidade contratual para a Empresa
    from datetime import datetime, timezone
    from app.contratos.schemas import ContratoConfiguracaoCreate, CapacidadeItemSchema
    from app.contratos.services import criar_contrato_configuracao

    criar_contrato_configuracao(
        db,
        base["empresa"].id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime.now(timezone.utc),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=2)
            ],
        ),
        autor_id=base["usuario"].id,
    )

    # 3. Ao vincular com a Empresa, transiciona automaticamente para DEDICADO
    v_dedic = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa"].id,
            motorista_id=base["motorista"].id,
            veiculo_id=base["veiculo"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )

    assert v_dedic.id == v_spot.id
    assert v_dedic.empresa_id == base["empresa"].id
    assert v_dedic.categoria_operacional == "DEDICADO"
    assert v_dedic.ativo is True


def test_desativar_vinculo_spot(db: Session):
    base = setup_base(db)

    v_spot = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=None,
            motorista_id=base["motorista"].id,
            veiculo_id=base["veiculo"].id,
            tipo_veiculo="HR",
            categoria_operacional="SPOT",
        ),
        autor_id=base["usuario"].id,
    )
    assert v_spot.ativo is True

    desativado = desativar_vinculo_motorista(db, v_spot, autor_id=base["usuario"].id)
    assert desativado.ativo is False
    assert obter_vinculo_ativo_motorista(db, base["motorista"].id) is None
