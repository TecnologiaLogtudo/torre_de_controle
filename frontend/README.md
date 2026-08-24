# Frontend - Torre de Controle Logtudo (Fase 4.4 — Conclusão e Hardening)

Interface operacional completa, responsiva e de alta densidade desenvolvida em React, TypeScript e Vite para a Torre de Controle Logtudo.

---

## 🛠️ Stack Tecnológica

- **Framework / UI**: React 18 + TypeScript + Vite
- **Roteamento**: React Router DOM v6
- **Cliente HTTP**: Axios com Interceptors centralizados
- **Estilização**: Tailwind CSS com cores e tokens oficiais Logtudo (`#185772`, `#757675`, `#6ca8c2`, `#0F2C3A`, `#13394A`)
- **Design & Prototipagem**: MCP Stitch (`projects/11302205133243501184`)
- **Ícones**: Lucide React
- **Testes**: Vitest + React Testing Library + JSDOM

---

## 🚀 Módulos Implementados e Auditados (Fase 4.4 Final)

1. **Torre de Controle (`/app/torre`)**: Dashboard operacional de alta densidade informacional com indicadores numéricos executivos, resumo por empresa, detalhamento de frota paginado com filtros combináveis (busca debounced) e feed de eventos imutáveis em `America/Bahia`.
2. **Empresas (`/app/empresas`)**: Cadastro, edição, busca por CNPJ/CPF e histórico de configurações de capacidade contratual.
3. **Motoristas (`/app/motoristas`)**: Gestão de motoristas com filtros por categoria (`DEDICADO`/`SPOT`) e especialidade (`SECO`/`REFRIGERADO`).
4. **Veículos (`/app/veiculos`)**: Cadastro da frota física com validação e formatação de placas (Mercosul/tradicional).
5. **Contratos (`/app/contratos`)**: Capacidades vigentes vs histórico e administração do binômio Motorista + Veículo Físico Dedicado.
6. **Motivos de Indisponibilidade (`/app/configuracoes/motivos-indisponibilidade`)**: Gestão de justificativas com preservação histórica.
7. **Usuários (`/app/usuarios`)**: Gestão administrativa de operadores e perfil do sistema.
8. **Agendamentos (`/app/agendamentos` e `/app/agendamentos/:id`)**:
   - Orientação visual da janela de data (Hoje vs Amanhã).
   - Composição de dedicados mantendo ocupadas as vagas com recursos indisponíveis.
   - Adição, remoção e substituição de SPOT com lock pessimista.
   - Trilha de histórico auditável formatada em `America/Bahia`.

---

## 📁 Arquitetura de Pastas

```text
frontend/
├── src/
│   ├── app/
│   │   ├── router/          # Roteador (AppRouter, ProtectedRoute, PublicOnlyRoute)
│   │   ├── providers/       # AuthProvider e Contextos Globais
│   │   └── layouts/        # Layout principal com Header, Sidebar e Main Area
│   │
│   ├── modules/             # Módulos operacionais isolados por domínio
│   │   ├── auth/            # Login e autenticação
│   │   ├── torre/           # Dashboard da Torre de Controle (Fase 4.3)
│   │   ├── empresas/        # Empresas parceiras e contratantes
│   │   ├── motoristas/      # Gestão de motoristas (Dedicados e SPOT)
│   │   ├── veiculos/        # Frota física de veículos
│   │   ├── contratos/       # Capacidade contratual e vínculos dedicados
│   │   ├── operacao/        # Motivos de indisponibilidade
│   │   ├── usuarios/        # Gestão de operadores do sistema
│   │   └── agendamentos/    # Programação diária, alocações SPOT e histórico
│   │
│   ├── components/          # Design System e Componentes Reutilizáveis
│   │   ├── ui/              # StatusBadge, SearchInput, FilterBar, Pagination, Drawer, ConfirmDialog, Skeleton, Table, Modal, Button, Input, Select
│   │   ├── feedback/        # LoadingOverlay, ErrorAlert
│   │   └── navigation/      # Sidebar (Marca Logtudo), Header
│   │
│   ├── services/            # Comunicação HTTP desacoplada por domínio
│   ├── hooks/               # Hooks customizados (useAuth)
│   ├── types/               # Tipagem estrita TypeScript (sem 'any')
│   ├── utils/               # Utilitários (date.ts fuso America/Bahia, storage.ts)
│   ├── styles/              # CSS global e tokens de design
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz da pasta `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Como Executar Localmente

1. **Instalar dependências**:
   ```bash
   cd frontend
   npm install
   ```

2. **Iniciar servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse em `http://localhost:5173`.

3. **Compilação de Produção**:
   ```bash
   npm run build
   ```

---

## 🧪 Execução de Testes

```bash
# Executar suíte de testes (27 testes verdes no Vitest)
npm test -- --run
```

---

## ⏰ Timezone Oficial (America/Bahia)

Todas as datas e timestamps armazenados no backend em UTC são convertidos e exibidos no fuso `America/Bahia` (UTC-3) via `src/utils/date.ts`.
