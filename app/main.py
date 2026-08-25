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
    from app.core.database import engine, Base
    Base.metadata.create_all(bind=engine)
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
app.include_router(
    auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Autenticação"]
)
app.include_router(
    usuarios_router,
    prefix=f"{settings.API_V1_STR}/usuarios",
    tags=["Usuários"],
)
app.include_router(
    empresas_router,
    prefix=f"{settings.API_V1_STR}/empresas",
    tags=["Empresas"],
)
app.include_router(
    motoristas_router,
    prefix=f"{settings.API_V1_STR}/motoristas",
    tags=["Motoristas"],
)
app.include_router(
    veiculos_router,
    prefix=f"{settings.API_V1_STR}/veiculos",
    tags=["Veículos"],
)
app.include_router(contratos_router, prefix=settings.API_V1_STR)
app.include_router(operacao_router, prefix=settings.API_V1_STR)
app.include_router(agendamentos_router, prefix=settings.API_V1_STR)


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
