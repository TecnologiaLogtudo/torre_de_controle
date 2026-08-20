from datetime import datetime, date, time, timezone
from zoneinfo import ZoneInfo
from app.core.config import settings

# Fuso horário padrão da operação
TZ_BAHIA = ZoneInfo(settings.TIMEZONE)
TZ_UTC = timezone.utc


def agora_local() -> datetime:
    """Retorna a data e hora atual no timezone America/Bahia (com offset)."""
    return datetime.now(TZ_BAHIA)


def agora_utc() -> datetime:
    """Retorna a data e hora atual em UTC (com offset)."""
    return datetime.now(TZ_UTC)


def inicio_do_dia_utc(d: date) -> datetime:
    """Retorna o início do dia (00:00:00) em America/Bahia convertido para UTC aware datetime."""
    dt_local = datetime.combine(d, time.min, tzinfo=TZ_BAHIA)
    return dt_local.astimezone(TZ_UTC)


def fim_do_dia_utc(d: date) -> datetime:
    """Retorna o fim do dia (23:59:59.999999) em America/Bahia convertido para UTC aware datetime."""
    dt_local = datetime.combine(d, time.max, tzinfo=TZ_BAHIA)
    return dt_local.astimezone(TZ_UTC)


def para_local(dt: datetime) -> datetime:
    """
    Converte um objeto datetime (naive ou aware) para o fuso America/Bahia.
    Se for naive (sem timezone), assume que já estava em UTC antes de converter.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Se for ingênuo, assume UTC e anexa o timezone antes de converter
        dt = dt.replace(tzinfo=TZ_UTC)
    return dt.astimezone(TZ_BAHIA)


def para_utc(dt: datetime) -> datetime:
    """
    Converte um objeto datetime para UTC para gravação segura no banco.
    Se for naive (sem timezone), assume que está no fuso America/Bahia.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Se for ingênuo, assume que veio da API/cliente no fuso local Bahia
        dt = dt.replace(tzinfo=TZ_BAHIA)
    return dt.astimezone(TZ_UTC)


def formatar_iso(dt: datetime) -> str:
    """Formata o datetime no padrão ISO 8601 correspondente ao fuso da Bahia."""
    if dt is None:
        return ""
    return para_local(dt).isoformat()
