# 🤖 Nexstar Discord Bots

Bem-vindo ao repositório do projeto **Nexstar**. Este guia explica como iniciar todos os componentes do sistema em seu ambiente local.

## 📋 Pré-requisitos

1.  **Node.js** (versão 18 ou superior)
2.  **PostgreSQL 17** (instalado localmente)

## 🚀 Como Iniciar

### 1. Banco de Dados (PostgreSQL)

Antes de tudo, inicie o servidor do banco de dados local.

```bash
# Na pasta raiz do projeto:
npm run db:start
```

> **Nota:** Para parar o banco de dados, você pode rodar `npm run db:stop`.

### 2. Bot do Discord

Em um **novo terminal**, inicie o bot.

```bash
# Na pasta raiz do projeto:
npm run dev
```

O bot iniciará e conectará ao banco de dados local automaticamente.

### 3. Website (Dashboard)

Em um **terceiro terminal**, inicie o website (Next.js).

```bash
# Entre na pasta web:
cd web

# Instale as dependências (se ainda não fez):
npm install

# Inicie o servidor de desenvolvimento:
npm run dev
```

O site estará acessível em [http://localhost:3000](http://localhost:3000).

## 🗄️ Gerenciamento do Banco de Dados

-   **Inicializar/Resetar Tabelas**: Se precisar recriar as tabelas do banco, rode:
    ```bash
    npx ts-node src/scripts/init-database.ts
    ```

## 📝 Resumo dos Terminais

Você precisará de 3 terminais rodando simultaneamente:

1.  **Terminal 1**: `npm run db:start` (Banco de Dados)
2.  **Terminal 2**: `npm run dev` (Bot)
3.  **Terminal 3**: `cd web && npm run dev` (Site)
