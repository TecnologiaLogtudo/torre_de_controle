import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.orm import Session
from app.contratos.models import MotoristaDedicadoVinculo, ContratoConfiguracao
from app.contratos.schemas import (
    MotoristaDedicadoVinculoCreate,
    ContratoConfiguracaoCreate,
    CapacidadeItemSchema,
)
from app.contratos.services import (
    criar_vinculo_motorista,
    criar_contrato_configuracao,
)
from app.empresas.models import Empresa
from app.motoristas.models import Motorista
from app.veiculos.models import Veiculo
from app.usuarios.models import Usuario


def setup_contratos_data(db: Session):
    empresa = Empresa(nome="Empresa Teste Regras", identificacao="EMP-REG-01", ativo=True)
    motorista1 = Motorista(nome="Motorista 1", ativo=True)
    motorista2 = Motorista(nome="Motorista 2", ativo=True)
    motorista3 = Motorista(nome="Motorista 3", ativo=True)

    veiculo_hr_seco = Veiculo(
        identificacao="HR-SECO-01",
        placa="HR01A01",
        tipo_veiculo="HR",
        especialidade="SECO",
        ativo=True,
    )
    veiculo_hr_refrig = Veiculo(
        identificacao="HR-REF-01",
        placa="HR01B02",
        tipo_veiculo="HR",
        especialidade="REFRIGERADO",
        ativo=True,
    )
    veiculo_toco_seco = Veiculo(
        identificacao="TOCO-SECO-01",
        placa="TOC0C03",
        tipo_veiculo="TOCO",
        especialidade="SECO",
        ativo=True,
    )
    usuario = Usuario(
        nome="Admin Regras",
        email=f"admin_regras_{uuid.uuid4().hex[:6]}@logtudo.com",
        senha_hash="hash",
        ativo=True,
    )
    db.add_all([empresa, motorista1, motorista2, motorista3, veiculo_hr_seco, veiculo_hr_refrig, veiculo_toco_seco, usuario])
    db.commit()
    db.refresh(empresa)
    db.refresh(motorista1)
    db.refresh(motorista2)
    db.refresh(motorista3)
    db.refresh(veiculo_hr_seco)
    db.refresh(veiculo_hr_refrig)
    db.refresh(veiculo_toco_seco)
    db.refresh(usuario)
    return {
        "empresa": empresa,
        "m1": motorista1,
        "m2": motorista2,
        "m3": motorista3,
        "v_hr_seco": veiculo_hr_seco,
        "v_hr_ref": veiculo_hr_refrig,
        "v_toco": veiculo_toco_seco,
        "usuario": usuario,
    }


def test_regra_4_bloqueio_sem_capacidade_ativa(db: Session):
    """Regra 4: Deve impedir vínculo DEDICADO se empresa não tiver configuração contratual de capacidade vigente."""
    base = setup_contratos_data(db)

    with pytest.raises(ValueError, match="não possui uma configuração de capacidade contratual vigente ativa"):
        criar_vinculo_motorista(
            db,
            MotoristaDedicadoVinculoCreate(
                empresa_id=base["empresa"].id,
                motorista_id=base["m1"].id,
                veiculo_id=base["v_hr_seco"].id,
                tipo_veiculo="HR",
                categoria_operacional="DEDICADO",
            ),
            autor_id=base["usuario"].id,
        )


def test_regra_5_bloqueio_tipo_veiculo_nao_contratado(db: Session):
    """Regra 5: Deve rejeitar vínculo com tipo de veículo não contratado na capacidade ativa."""
    base = setup_contratos_data(db)

    # Cadastra capacidade: apenas 1 HR
    criar_contrato_configuracao(
        db,
        base["empresa"].id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime.now(timezone.utc),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=1)
            ],
        ),
        autor_id=base["usuario"].id,
    )

    # Tenta vincular TOCO (não contratado)
    with pytest.raises(ValueError, match="não faz parte da configuração de capacidade contratada"):
        criar_vinculo_motorista(
            db,
            MotoristaDedicadoVinculoCreate(
                empresa_id=base["empresa"].id,
                motorista_id=base["m1"].id,
                veiculo_id=base["v_toco"].id,
                tipo_veiculo="TOCO",
                categoria_operacional="DEDICADO",
            ),
            autor_id=base["usuario"].id,
        )


def test_regra_6_bloqueio_teto_de_vagas_atingido(db: Session):
    """Regra 6: Deve rejeitar novo vínculo caso as vagas daquele tipo já tenham sido atingidas."""
    base = setup_contratos_data(db)

    # Cadastra capacidade: exatamente 1 HR
    criar_contrato_configuracao(
        db,
        base["empresa"].id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime.now(timezone.utc),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="SECO", quantidade=1)
            ],
        ),
        autor_id=base["usuario"].id,
    )

    # 1º Vínculo: deve suceder
    v1 = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa"].id,
            motorista_id=base["m1"].id,
            veiculo_id=base["v_hr_seco"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )
    assert v1.ativo is True

    # 2º Vínculo HR: deve ser rejeitado por estourar o limite (1/1)
    with pytest.raises(ValueError, match="já foi totalmente preenchida"):
        criar_vinculo_motorista(
            db,
            MotoristaDedicadoVinculoCreate(
                empresa_id=base["empresa"].id,
                motorista_id=base["m2"].id,
                veiculo_id=base["v_hr_ref"].id,
                tipo_veiculo="HR",
                categoria_operacional="DEDICADO",
            ),
            autor_id=base["usuario"].id,
        )


def test_regra_7_incompatibilidade_especialidade(db: Session):
    """Regra 7: Rejeita veículo SECO quando a capacidade exige REFRIGERADO."""
    base = setup_contratos_data(db)

    # Cadastra capacidade exigindo REFRIGERADO
    criar_contrato_configuracao(
        db,
        base["empresa"].id,
        ContratoConfiguracaoCreate(
            data_inicio=datetime.now(timezone.utc),
            capacidades=[
                CapacidadeItemSchema(tipo_veiculo="HR", especialidade="REFRIGERADO", quantidade=1)
            ],
        ),
        autor_id=base["usuario"].id,
    )

    # Tenta vincular veículo SECO
    with pytest.raises(ValueError, match="exige especialidade"):
        criar_vinculo_motorista(
            db,
            MotoristaDedicadoVinculoCreate(
                empresa_id=base["empresa"].id,
                motorista_id=base["m1"].id,
                veiculo_id=base["v_hr_seco"].id,
                tipo_veiculo="HR",
                categoria_operacional="DEDICADO",
            ),
            autor_id=base["usuario"].id,
        )


def test_regra_10_desativacao_em_cascata_ao_inativar_motorista_ou_veiculo(db: Session):
    """Regra 10: Ao inativar motorista ou veículo no cadastro geral, encerra em cascata os vínculos dedicados ativos."""
    from app.motoristas.schemas import MotoristaUpdate
    from app.motoristas.services import atualizar_motorista
    from app.veiculos.schemas import VeiculoUpdate
    from app.veiculos.services import atualizar_veiculo

    base = setup_contratos_data(db)

    # 1. Cria contrato e vínculo ativo
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

    v1 = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa"].id,
            motorista_id=base["m1"].id,
            veiculo_id=base["v_hr_seco"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )
    assert v1.ativo is True

    # 2. Inativa o motorista no cadastro geral
    atualizar_motorista(
        db=db,
        motorista=base["m1"],
        dados=MotoristaUpdate(nome=base["m1"].nome, ativo=False),
        autor_id=base["usuario"].id,
    )

    # Verifica que o vínculo foi encerrado automaticamente
    db.refresh(v1)
    assert v1.ativo is False

    # 3. Cria outro vínculo com m2 e v_hr_ref
    v2 = criar_vinculo_motorista(
        db,
        MotoristaDedicadoVinculoCreate(
            empresa_id=base["empresa"].id,
            motorista_id=base["m2"].id,
            veiculo_id=base["v_hr_ref"].id,
            tipo_veiculo="HR",
            categoria_operacional="DEDICADO",
        ),
        autor_id=base["usuario"].id,
    )
    assert v2.ativo is True

    # Inativa o veículo no cadastro geral
    atualizar_veiculo(
        db=db,
        veiculo=base["v_hr_ref"],
        dados=VeiculoUpdate(
            identificacao=base["v_hr_ref"].identificacao,
            placa=base["v_hr_ref"].placa,
            tipo_veiculo=base["v_hr_ref"].tipo_veiculo,
            especialidade=base["v_hr_ref"].especialidade,
            ativo=False,
        ),
        autor_id=base["usuario"].id,
    )

    db.refresh(v2)
    assert v2.ativo is False
