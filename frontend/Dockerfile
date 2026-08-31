# ==========================================
# Estágio 1: Builder (Node.js)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package.json package-lock.json ./

RUN npm ci

# Copia o código-fonte do frontend
COPY . .

# Argumento para URL da API no momento do build
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build da aplicação SPA
RUN npm run build

# ==========================================
# Estágio 2: Runtime (Nginx)
# ==========================================
FROM nginx:1.25-alpine AS runtime

# Copia a configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do builder para o diretório do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
