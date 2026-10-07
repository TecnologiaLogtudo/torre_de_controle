import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

# Importa as rotas de cada módulo
from app.auth.routers import router as auth_router
from app.usuarios.routers import router as usuarios_router
from app.empresas.routers import router as empresas_router
from app.motoristas.routers import router as motoristas_router
from app.veiculos.routers import router as veiculos_router
from app.contratos.routers import router as contratos_router
from app.operacao.routers import router as operacao_router
from app.agendamentos.routers import router as agendamentos_router
from app.operacao.services import OperacaoService
from app.core.database import SessionLocal

ROOT_PATH = os.getenv("ROOT_PATH", "")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    root_path=ROOT_PATH,
)

@app.on_event("startup")
def startup_event():
    from sqlalchemy import text
    from app.core.database import engine, Base
    # Importa explicitamente todos os modelos para garantir registro completo no Base.metadata
    from app.usuarios.models import Usuario
    from app.empresas.models import Empresa
    from app.motoristas.models import Motorista
    from app.veiculos.models import Veiculo
    from app.contratos.models import ContratoConfiguracao, MotoristaDedicadoVinculo
    from app.auditoria.models import Auditoria
    from app.agendamentos.models import Agendamento, AlocacaoOperacional, HistoricoAgendamento
    from app.operacao.models import (
        MotivoIndisponibilidade,
        EventoOperacional,
        ConfiguracaoSistema,
        StatusOperacionalMotorista,
    )

    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE eventos_operacionais ALTER COLUMN empresa_id DROP NOT NULL;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE eventos_operacionais ALTER COLUMN veiculo_id DROP NOT NULL;"))
        except Exception:
            pass
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS status_operacional_motoristas (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    motorista_id UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
                    data DATE NOT NULL,
                    status_operacional VARCHAR(50) NOT NULL DEFAULT 'DISPONIVEL',
                    motivo_indisponibilidade_id UUID REFERENCES motivos_indisponibilidade(id) ON DELETE SET NULL,
                    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
                );
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_status_motorista_data ON status_operacional_motoristas (motorista_id, data);
            """))
        except Exception:
            pass
    db = SessionLocal()
    try:
        OperacaoService.inicializar_dados_padrao(db)
    finally:
        db.close()

# Configura o Middleware de CORS (Suporte a preflight OPTIONS do frontend)
origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui os roteadores
def registrar_rotas(prefixo: str, include_in_schema: bool = True):
    app.include_router(
        auth_router, prefix=f"{prefixo}/auth", tags=["Autenticação"], include_in_schema=include_in_schema
    )
    app.include_router(
        usuarios_router,
        prefix=f"{prefixo}/usuarios",
        tags=["Usuários"],
        include_in_schema=include_in_schema,
    )
    app.include_router(
        empresas_router,
        prefix=f"{prefixo}/empresas",
        tags=["Empresas"],
        include_in_schema=include_in_schema,
    )
    app.include_router(
        motoristas_router,
        prefix=f"{prefixo}/motoristas",
        tags=["Motoristas"],
        include_in_schema=include_in_schema,
    )
    app.include_router(
        veiculos_router,
        prefix=f"{prefixo}/veiculos",
        tags=["Veículos"],
        include_in_schema=include_in_schema,
    )
    app.include_router(contratos_router, prefix=prefixo, include_in_schema=include_in_schema)
    app.include_router(operacao_router, prefix=prefixo, include_in_schema=include_in_schema)
    app.include_router(agendamentos_router, prefix=prefixo, include_in_schema=include_in_schema)

# 1. Registra no prefixo padrão (ex: /api/v1)
registrar_rotas(settings.API_V1_STR, include_in_schema=True)

# 2. Se o prefixo padrão contiver /api, registra também a versão sem /api (ex: /v1)
# para compatibilidade com proxies reversos que realizam stripprefix (como Traefik no Coolify quando mapeado em /api)
if settings.API_V1_STR.startswith("/api"):
    prefixo_compat = settings.API_V1_STR[len("/api"):] or "/"
    if prefixo_compat != settings.API_V1_STR:
        registrar_rotas(prefixo_compat.rstrip("/"), include_in_schema=False)

        @app.get(f"{prefixo_compat}/openapi.json", include_in_schema=False)
        def openapi_compat():
            return app.openapi()


@app.get("/health", tags=["Healthcheck"])
def health_check():
    """Endpoint básico para verificação de integridade da API e banco de dados."""
    return {
        "status": "ok",
        "projeto": settings.PROJECT_NAME,
        "ambiente": settings.ENVIRONMENT,
        "timezone": settings.TIMEZONE,
    }


@app.get("/")
def read_root():
    return {
        "mensagem": "Bem-vindo à API da Torre de Controle Logtudo backend foundation.",
        "documentacao": "/docs",
    }
