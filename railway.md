# Guia Definitivo de Deploy na Railway 🚀

Este guia passo a passo vai te mostrar como colocar o projeto (Bot + Painel Web Next.js) no ar utilizando a Railway.

## 1️⃣ Preparando o Repositório
Certifique-se de que todas as suas alterações estejam com *commit* e enviadas para o seu repositório no **GitHub**.

## 2️⃣ Criando o Banco de Dados (PostgreSQL)
1. Acesse o painel da [Railway](https://railway.app/).
2. Clique em **New Project** -> **Provision PostgreSQL**.
3. Aguarde o banco de dados ser criado.

## 3️⃣ Criando a Aplicação
1. No mesmo projeto, clique em **Create** (ou no botão `+` no canto superior direito).
2. Selecione **GitHub Repo** e escolha o repositório `Lucas-Gabriel2A/botparceiros` (ou o repositório correspondente).
3. A Railway vai ler o arquivo `railway.toml` na raiz do seu projeto e iniciar o *build* automaticamente.

## 4️⃣ Configurando as Variáveis de Ambiente
Sua aplicação vai falhar na primeira vez porque faltam as variáveis de ambiente. Siga estes passos:

1. Clique no card do **Repositório** (a sua aplicação) no projeto.
2. Vá até a aba **Variables**.
3. Adicione todas as variáveis necessárias (baseadas no seu `.env.local` e `.env`):

### Banco de Dados
A Railway facilita muito essa parte. Para adicionar a `DATABASE_URL`:
- Clique em **New Variable** -> **Add Reference** e selecione o banco de dados criado (geralmente será algo como `${{Postgres.DATABASE_URL}}`).

### Autenticação Discord (NextAuth)
```env
DISCORD_CLIENT_ID=seu_client_id_aqui
DISCORD_CLIENT_SECRET=seu_client_secret_aqui
NEXTAUTH_URL=https://sua-url-da-railway.up.railway.app # (Atualize isso após o passo 5)
NEXTAUTH_SECRET=um_segredo_gerado_aqui
```

### Serviços do Bot & IA
```env
DISCORD_TOKEN=seu_token_do_bot
DISCORD_TOKEN_AGENTE_IA=seu_token_do_agente_ia
OPENAI_API_KEY=sua_chave_groq_ou_openai
LLM_BASE_URL=https://api.groq.com/openai/v1
MODELO_IA=llama-3.3-70b-versatile
```

### Outros Serviços (Mercado Pago, Cloudinary, etc.)
```env
MERCADOPAGO_PUBLIC_KEY=sua_chave_publica
MERCADOPAGO_ACCESS_TOKEN=seu_access_token
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

## 5️⃣ Gerando o Domínio Público
1. Ainda nas configurações da sua aplicação, vá na aba **Settings**.
2. Desça até a seção **Networking** -> **Public Networking**.
3. Clique em **Generate Domain**.
4. Copie o domínio gerado (ex: `botparceiros-production.up.railway.app`).
5. **ATENÇÃO:** Volte na aba **Variables** e atualize a variável `NEXTAUTH_URL` para colocar `https://` + esse domínio que você copiou!
6. **ATENÇÃO 2:** Vá até o portal do *Discord Developer* da sua aplicação e atualize o **Redirect URI** do OAuth2 para ser `https://seu-dominio.up.railway.app/api/auth/callback/discord`.

## 6️⃣ Inicializando o Banco de Dados (Tabelas)
Como é a primeira vez que você roda no banco de produção, você precisará criar as tabelas do banco de dados (schema).

O projeto já possui um script para isso: `npm run db:setup`.
Para rodar na Railway:
1. Clique no card do seu aplicativo.
2. Acesse a aba **Deployments** ou diretamente o atalho na Command Palette (Cmd/Ctrl + K).
3. Busque por **Execute Command** ou algo similar para abrir um terminal no container ativo.
4. Digite:
```bash
npm run db:setup
```
*Isso vai rodar o arquivo `scripts/init-db.ts` e criar todas as tabelas e índices necessários no PostgreSQL da Railway.*

## 7️⃣ Acompanhando os Logs
- A aplicação será reiniciada automaticamente após as variáveis serem colocadas.
- Vá na aba **Deployments** e clique no *build* mais recente.
- Em **View Logs**, você deverá ver os logs do Next.js subindo (`Ready in x ms`) e os logs da IA conectando no Discord!

✅ **Tudo Pronto!** A sua aplicação Web e o seu Bot estarão rodando juntos (graças ao script de *start* configurado) em um único serviço de hospedagem.
