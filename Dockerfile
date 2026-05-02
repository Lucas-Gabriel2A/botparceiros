FROM node:20-bookworm-slim

# Instala bibliotecas do sistema necessárias (muito importante para o pacote 'canvas' do bot Welcome)
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de manifesto do npm primeiro (o * permite que o package-lock.json seja opcional)
COPY package.json package-lock.json* ./
COPY web/package.json ./web/

# Instala as dependências de todo o projeto usando npm install (mais flexível se não houver lockfile no repo)
RUN npm install

# Copia todo o resto do código da sua máquina para o container
COPY . .

# Faz o build do painel Next.js e compila o código Typescript
RUN npm run build

# A Railway vai injetar a variável PORT, mas deixamos exposto a 3000 como padrão
EXPOSE 3000

# Inicia o projeto através do comando principal que levanta o painel e os bots
CMD ["npm", "start"]
