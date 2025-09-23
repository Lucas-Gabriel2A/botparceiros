const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const env = require('dotenv').config();
// Configurações
const DISCORD_TOKEN = process.env.Discord_token_news;
const CHANNEL_NEWS_ID = process.env.Channel_news_id;
const NASA_API_KEY = process.env.NASA_API_KEY;

// Configuração do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

class SpaceNewsBot {
    constructor() {
        this.lastPosted = {};
    }

    // Estiliza mensagens no padrão do servidor
    styleMessage(title, content, source = "NEXSTART") {
        const decorations = ["◆◇◆", "◊◈◊", "◉◇◉", "≫◈≪", "◇◉◇"];
        const decoration = decorations[Math.floor(Math.random() * decorations.length)];
        
        const styledTitle = `꧁ঔৣ☬ ✧ ${title.toUpperCase()} ✧ ☬ঔৣ꧂`;
        const border = "◆".repeat(30);
        const timestamp = new Date().toLocaleString('pt-BR', { 
            timeZone: 'UTC',
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `${styledTitle}

${decoration} **TRANSMISSÃO CÓSMICA INTERCEPTADA** ${decoration}

${content}

${border}
◊ **FONTE ESTELAR:** ${source}
◈ **TIMESTAMP GALÁCTICO:** ${timestamp} UTC
◉ **CANAL:** Observatório Nexstart
${border}

*As estrelas revelam seus segredos... permaneçam sintonizados, Exploradores!* ≫━━━◈`;
    }

    // Busca imagem astronômica do dia da NASA
    async getNasaApod() {
        try {
            const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
            const data = response.data;

            const content = `◇ **DESCOBERTA ASTRONÔMICA DO DIA** ◇

◊ **TÍTULO:** ${data.title}
◈ **DATA CÓSMICA:** ${data.date}

◉ **DESCRIÇÃO ESTELAR:**
${data.explanation.length > 500 ? data.explanation.substring(0, 500) + '...' : data.explanation}

◇ **ARQUIVO VISUAL:** ${data.url}`;

            return {
                message: this.styleMessage("OBSERVATÓRIO NASA", content, "NASA GODDARD SPACE CENTER"),
                imageUrl: data.url
            };
        } catch (error) {
            console.log('Erro ao buscar APOD:', error.message);
            return null;
        }
    }

    // Busca próximos lançamentos da SpaceX
    async getSpaceXLaunches() {
        try {
            const response = await axios.get('https://api.spacexdata.com/v4/launches/upcoming');
            const data = response.data;

            if (data.length > 0) {
                const launch = data[0];
                const launchDate = new Date(launch.date_utc);
                const formattedDate = launchDate.toLocaleString('pt-BR', {
                    timeZone: 'UTC',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const content = `◇ **PRÓXIMA MISSÃO INTERGALÁCTICA DETECTADA** ◇

◊ **NOME DA MISSÃO:** ${launch.name}
◈ **DATA DE LANÇAMENTO:** ${formattedDate} UTC
◉ **RAMPA DE LANÇAMENTO:** ${launch.launchpad || 'Classificado'}

◇ **DETALHES DA MISSÃO:**
${launch.details ? 
    (launch.details.length > 400 ? launch.details.substring(0, 400) + '...' : launch.details) : 
    'Informações da missão ainda estão sendo decodificadas pelos nossos sensores...'}

◈ **STATUS:** ${launch.success !== false ? '🟢 CONFIRMADO' : '🟡 EM PREPARAÇÃO'}`;

                return this.styleMessage("ALERTA DE LANÇAMENTO", content, "SPACEX MISSION CONTROL");
            }
        } catch (error) {
            console.log('Erro ao buscar lançamentos SpaceX:', error.message);
            return null;
        }
    }

    // Busca notícias espaciais gerais
    async getSpaceNews() {
        try {
            const response = await axios.get('https://api.spaceflightnewsapi.net/v4/articles?limit=1');
            const data = response.data;

            if (data.results && data.results.length > 0) {
                const article = data.results[0];
                const publishDate = new Date(article.published_at).toLocaleDateString('pt-BR');

                const content = `◇ **TRANSMISSÃO DE NOTÍCIAS INTERCEPTADA** ◇

◊ **TÍTULO:** ${article.title}
◈ **FONTE ORIGINAL:** ${article.news_site}
◉ **DATA DE TRANSMISSÃO:** ${publishDate}

◇ **RESUMO DECODIFICADO:**
${article.summary.length > 450 ? article.summary.substring(0, 450) + '...' : article.summary}

◈ **ACESSO COMPLETO:** ${article.url}`;

                return {
                    message: this.styleMessage("CENTRAL DE INTELIGÊNCIA ESPACIAL", content, article.news_site.toUpperCase()),
                    imageUrl: article.image_url
                };
            }
        } catch (error) {
            console.log('Erro ao buscar notícias espaciais:', error.message);
            return null;
        }
    }

    // Busca localização atual da ISS
    async getISSLocation() {
        try {
            const response = await axios.get('http://api.open-notify.org/iss-now.json');
            const data = response.data;
            const position = data.iss_position;

            const content = `◇ **RASTREAMENTO DE ESTAÇÃO ESPACIAL ATIVA** ◇

◊ **OBJETO RASTREADO:** Estação Espacial Internacional (ISS)
◈ **COORDENADAS ATUAIS:**
   ▸ Latitude: ${position.latitude}°
   ▸ Longitude: ${position.longitude}°

◉ **ALTITUDE ORBITAL:** ~408 km acima da Terra
◇ **VELOCIDADE:** ~27.600 km/h
◈ **PERÍODO ORBITAL:** 93 minutos por volta

*A ISS está voando sobre nosso planeta neste exato momento!*`;

            return this.styleMessage("RADAR ORBITAL ATIVO", content, "MISSION CONTROL HOUSTON");
        } catch (error) {
            console.log('Erro ao buscar localização da ISS:', error.message);
            return null;
        }
    }

    // Envia notícias espaciais
    async sendSpaceNews() {
        const channel = client.channels.cache.get(CHANNEL_NEWS_ID);
        if (!channel) {
            console.log(`Canal ${CHANNEL_NEWS_ID} não encontrado!`);
            return;
        }

        try {
            // Rotaciona entre diferentes tipos de conteúdo
            const contentTypes = ['nasa_apod', 'spacex_launches', 'space_news', 'iss_location'];
            const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];

            let result = null;

            switch (contentType) {
                case 'nasa_apod':
                    result = await this.getNasaApod();
                    break;
                case 'spacex_launches':
                    const spaceXMessage = await this.getSpaceXLaunches();
                    if (spaceXMessage) {
                        result = { message: spaceXMessage, imageUrl: null };
                    }
                    break;
                case 'space_news':
                    result = await this.getSpaceNews();
                    break;
                case 'iss_location':
                    const issMessage = await this.getISSLocation();
                    if (issMessage) {
                        result = { message: issMessage, imageUrl: null };
                    }
                    break;
            }

            if (result && result.message) {
                // Cria embed estilizado
                const embed = new EmbedBuilder()
                    .setDescription(result.message)
                    .setColor(0x7289DA)
                    .setTimestamp()
                    .setFooter({
                        text: '🌌 Observatório Nexstart • Explorando o cosmos para vocês'
                    });

                if (result.imageUrl) {
                    embed.setImage(result.imageUrl);
                }

                await channel.send({ embeds: [embed] });
                console.log(`Notícia espacial enviada: ${contentType}`);
            }
        } catch (error) {
            console.log('Erro ao enviar notícias:', error.message);
        }
    }
}

const spaceBot = new SpaceNewsBot();

// Eventos do bot
client.once('ready', () => {
    console.log(`Bot ${client.user.tag} conectado à galáxia!`);
    console.log(`ID: ${client.user.id}`);
    
    // Agenda para enviar notícias a cada 6 horas
    cron.schedule('0 * * * *', () => {
        console.log('Executando envio automático de notícias espaciais...');
        spaceBot.sendSpaceNews();
    });
    
    // Envia primeira notícia após 30 segundos de inicialização
    setTimeout(() => {
        spaceBot.sendSpaceNews();
    }, 30000);
});

// Comando manual para enviar notícia espacial
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!space_now') {
        if (message.member.permissions.has('ManageMessages')) {
            await spaceBot.sendSpaceNews();
            await message.reply('◆ **Transmissão cósmica enviada!** ◆');
        } else {
            await message.reply('◇ **Acesso negado**: Privilégios de explorador insuficientes! ◇');
        }
    }
});

// Tratamento de erros
client.on('error', (error) => {
    console.error('Erro no cliente Discord:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Erro não tratado:', error);
});

// Iniciar bot
client.login(DISCORD_TOKEN);