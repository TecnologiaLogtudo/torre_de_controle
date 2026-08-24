# Torre de Controle Logtudo

Sistema Operacional de Gestão Logística para Motoristas, Veículos, Contratos, Agendamentos, SPOTs, Status Operacionais e Auditoria.

---

## 🏛️ Arquitetura Geral

O projeto é estruturado em duas partes principais:

1. **Backend** (`/`):

   - **Tecnologias**: Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pydantic, JWT.
   - **Timezone Oficial**: `America/Bahia` (UTC-3). Timestamps persistidos em UTC e convertidos na aplicação.
   - **API Versionada**: `/api/v1`
   - **Testes Backend**: 32 testes automatizados cobrindo Fases 1, 2, 2.9 e 3.
2. **Frontend** (`/frontend`):

   - **Tecnologias**: React 18, TypeScript, Vite, React Router v6, Axios, Tailwind CSS, Vitest.
   - **Arquitetura**: Modular por domínio (`auth`, `torre`, `operacao`, `agendamentos`, `motoristas`, `veiculos`, `empresas`, `contratos`, `usuarios`, `auditoria`).
   - **Testes Frontend**: 15 testes automatizados cobrindo a Fundação (Fase 4.1).

---

## 🚀 Como Executar o Projeto Localmente

### 1. Backend (FastAPI + PostgreSQL)

```bash
# Ativar ambiente virtual
.venv\Scripts\activate

# Executar backend FastAPI
uvicorn app.main:app --reload --port 8000
```

Swagger UI disponível em `http://localhost:8000/docs`.

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Aplicação disponível em `http://localhost:5173`.

---

## 🧪 Suítes de Testes

- **Backend Pytest (32 testes)**:

  ```bash
  .venv\Scripts\pytest.exe
  ```
- **Frontend Vitest (15 testes)**:

  ```bash
  cd frontend
  npm test
  ```
