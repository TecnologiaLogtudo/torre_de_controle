import uuid
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.auditoria.models import Auditoria
from app.core.datetime_utils import agora_local


def registrar_auditoria(
    db: Session,
    usuario_id: Optional[uuid.UUID],
    entidade_afetada: str,
    entidade_id: uuid.UUID,
    acao: str,  # CRIAR, ATUALIZAR, DELETAR
    estado_anterior: Optional[Dict[str, Any]] = None,
    estado_posterior: Optional[Dict[str, Any]] = None,
) -> Auditoria:
    """
    Grava um registro de auditoria no banco de dados contendo o estado anterior
    e posterior do recurso alterado.
    """
    # Garante que data_hora seja registrada no fuso horário America/Bahia
    auditoria = Auditoria(
        usuario_id=usuario_id,
        data_hora=agora_local(),
        entidade_afetada=entidade_afetada,
        entidade_id=entidade_id,
        acao=acao,
        estado_anterior=estado_anterior,
        estado_posterior=estado_posterior,
    )
    db.add(auditoria)
    db.commit()
    db.refresh(auditoria)
    return auditoria
