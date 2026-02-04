/**
 * 📰 BOT NEWS - Notícias NASA/Espaço TypeScript
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Migrado de botnews.js - Sistema completo de notícias espaciais
 */

import { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    SlashCommandBuilder,
    REST,
    Routes,
    TextChannel,
    Message
} from 'discord.js';
import axios from 'axios';
import cron from 'node-cron';
import { translate } from 'google-translate-api-x';

import { config, logger } from '../../shared/services';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate(['Discord_token_news', 'NASA_API_KEY', 'Channel_news_id']);

const DISCORD_TOKEN = config.get('Discord_token_news');
const CHANNEL_NEWS_ID = config.get('Channel_news_id');
const NASA_API_KEY = config.get('NASA_API_KEY');
const CLIENT_ID = config.getOptional('NEWS_CLIENT_ID') || '1418346794357883021';

if (!config.isValidDiscordToken(DISCORD_TOKEN)) {
    logger.error('Token Discord inválido!');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
    NASA: 0x0B3D91,
    SPACEX: 0xFF6B35,
    ISS: 0x7B2CBF,
    MARS: 0xE63946,
    CURIOSITY: 0xFFD700,
    NEWS: 0x00D4AA,
    EVENT: 0xFF00FF
} as const;

const EMOJIS = {
    rocket: '🚀',
    star: '⭐',
    galaxy: '🌌',
    planet: '🪐',
    satellite: '🛰️',
    telescope: '🔭',
    meteor: '☄️',
    moon: '🌙',
    sun: '☀️',
    mars: '🔴',
    earth: '🌍',
    astronaut: '👨‍🚀'
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ═══════════════════════════════════════════════════════════════════════════
// 📰 CLASSE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

interface EmbedOptions {
    title: string;
    description: string;
    color?: number;
    thumbnail?: string;
    image?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: string;
    category?: string;
}

interface NewsResult {
    embed: EmbedBuilder;
    buttons: ActionRowBuilder<ButtonBuilder> | null;
}

class SpaceNewsBot {
    private translationCache: Map<string, string> = new Map();
    private spaceFacts: string[] = [
        "Um dia em Vênus é mais longo que um ano em Vênus! 🪐",
        "Estrelas de nêutrons podem girar 600 vezes por segundo! ⭐",
        "Há mais estrelas no universo do que grãos de areia na Terra! 🌌",
        "O Sol representa 99.86% da massa do Sistema Solar! ☀️",
        "A Grande Mancha Vermelha de Júpiter existe há pelo menos 400 anos! 🔴",
        "Pegadas na Lua podem durar 100 milhões de anos! 🌙",
        "Uma colher de chá de estrela de nêutrons pesa 6 bilhões de toneladas! 💫",
        "O espaço é completamente silencioso! 🔇",
        "Há um planeta feito de diamante chamado 55 Cancri e! 💎",
        "A Voyager 1 está a mais de 23 bilhões de km da Terra! 🛸",
        "Buracos negros podem distorcer o tempo! ⏰",
        "Existem mais de 200 bilhões de galáxias no universo observável! 🌀"
    ];

    // ════════════════════════════════════════════════════════════
    // 🌐 TRADUÇÃO
    // ════════════════════════════════════════════════════════════

    async translateToPT(text: string): Promise<string> {
        if (!text || text.length === 0) return text;
        
        const cacheKey = text.substring(0, 100);
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey)!;
        }

        try {
            const result = await translate(text, { to: 'pt' });
            const translated = result.text;
            
            if (this.translationCache.size > 100) {
                const firstKey = this.translationCache.keys().next().value;
                if (firstKey) this.translationCache.delete(firstKey);
            }
            this.translationCache.set(cacheKey, translated);
            
            logger.debug('Texto traduzido para PT-BR');
            return translated;
        } catch (error) {
            logger.warn('Erro na tradução, usando original');
            return text;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 🎨 CRIADOR DE EMBEDS
    // ════════════════════════════════════════════════════════════

    createPremiumEmbed(options: EmbedOptions): EmbedBuilder {
        const {
            title,
            description,
            color = COLORS.NEWS,
            thumbnail,
            image,
            fields = [],
            footer,
            category = 'TRANSMISSÃO CÓSMICA'
        } = options;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${EMOJIS.galaxy} ${title}`)
            .setDescription(`\`\`\`ansi\n\u001b[0;35m╔══════════════════════════════════════╗\n\u001b[0;36m   ${category}\n\u001b[0;35m╚══════════════════════════════════════╝\n\`\`\`\n${description}`)
            .setTimestamp()
            .setFooter({
                text: footer || '🌌 Observatório Nexstar • Explorando o cosmos'
            });

        if (thumbnail) embed.setThumbnail(thumbnail);
        if (image) embed.setImage(image);
        if (fields.length > 0) embed.addFields(fields);

        return embed;
    }

    // ════════════════════════════════════════════════════════════
    // 🛰️ NASA APOD
    // ════════════════════════════════════════════════════════════

    async getNasaApod(): Promise<NewsResult | null> {
        try {
            const response = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
            const data = response.data;

            const translatedTitle = await this.translateToPT(data.title);
            const explanationText = data.explanation.length > 600 
                ? data.explanation.substring(0, 600) + '...' 
                : data.explanation;
            const translatedExplanation = await this.translateToPT(explanationText);

            const embed = this.createPremiumEmbed({
                title: '🔭 DESCOBERTA ASTRONÔMICA DO DIA',
                description: `### ${EMOJIS.star} ${translatedTitle}\n\n${translatedExplanation}`,
                color: COLORS.NASA,
                image: data.media_type === 'image' ? data.url : undefined,
                category: 'NASA GODDARD SPACE CENTER',
                fields: [
                    { name: `${EMOJIS.telescope} Data Cósmica`, value: `\`${data.date}\``, inline: true },
                    { name: `${EMOJIS.astronaut} Copyright`, value: `\`${data.copyright || 'NASA/Public Domain'}\``, inline: true }
                ],
                footer: '🛸 NASA Astronomy Picture of the Day • Traduzido para PT-BR'
            });

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('Ver em Alta Resolução')
                    .setStyle(ButtonStyle.Link)
                    .setURL(data.hdurl || data.url)
                    .setEmoji('🖼️'),
                new ButtonBuilder()
                    .setLabel('Site da NASA')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://apod.nasa.gov/')
                    .setEmoji('🚀')
            );

            return { embed, buttons };
        } catch (error) {
            logger.error('Erro ao buscar APOD');
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 🚀 SPACEX LAUNCHES
    // ════════════════════════════════════════════════════════════

    async getSpaceXLaunches(): Promise<NewsResult | null> {
        try {
            const response = await axios.get('https://api.spacexdata.com/v4/launches/upcoming');
            const launches = response.data;

            if (launches.length === 0) return null;

            const launch = launches[0];
            const launchDate = new Date(launch.date_utc);
            const now = new Date();
            const timeDiff = launchDate.getTime() - now.getTime();
            const daysUntil = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hoursUntil = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            const countdown = timeDiff > 0 
                ? `⏱️ **T-${daysUntil}d ${hoursUntil}h**` 
                : '🔴 **LANÇAMENTO IMINENTE**';

            const embed = this.createPremiumEmbed({
                title: '🚀 ALERTA DE LANÇAMENTO SPACEX',
                description: `### ${EMOJIS.rocket} Missão: ${launch.name}\n\n${launch.details || '*Detalhes da missão sendo carregados dos servidores da SpaceX...*'}\n\n${countdown}`,
                color: COLORS.SPACEX,
                category: 'SPACEX MISSION CONTROL',
                thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/SpaceX-Logo.svg/1200px-SpaceX-Logo.svg.png',
                fields: [
                    { 
                        name: `${EMOJIS.rocket} Data de Lançamento`, 
                        value: `\`${launchDate.toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC\``, 
                        inline: true 
                    },
                    { 
                        name: `${EMOJIS.satellite} Status`, 
                        value: launch.upcoming ? '🟢 `CONFIRMADO`' : '🟡 `PENDENTE`', 
                        inline: true 
                    },
                    {
                        name: `${EMOJIS.star} Flight Number`,
                        value: `\`#${launch.flight_number}\``,
                        inline: true
                    }
                ],
                footer: '🛸 SpaceX Launch Tracker'
            });

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('SpaceX Website')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.spacex.com/')
                    .setEmoji('🚀'),
                new ButtonBuilder()
                    .setLabel('YouTube Launch')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.youtube.com/spacex')
                    .setEmoji('📺')
            );

            return { embed, buttons };
        } catch (error) {
            logger.error('Erro ao buscar lançamentos SpaceX');
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 🛰️ ISS LOCATION
    // ════════════════════════════════════════════════════════════

    async getISSLocation(): Promise<NewsResult | null> {
        try {
            const [issResponse, crewResponse] = await Promise.all([
                axios.get('http://api.open-notify.org/iss-now.json'),
                axios.get('http://api.open-notify.org/astros.json').catch(() => null)
            ]);

            const position = issResponse.data.iss_position;
            const crewCount = crewResponse?.data?.people?.filter((p: {craft: string}) => p.craft === 'ISS').length || '?';

            const embed = this.createPremiumEmbed({
                title: '🛰️ RASTREAMENTO ISS AO VIVO',
                description: `### ${EMOJIS.satellite} Estação Espacial Internacional\n\nA ISS está orbitando a Terra a **27.600 km/h** neste exato momento!\n\n*Ela completa uma volta ao redor da Terra a cada 93 minutos.*`,
                color: COLORS.ISS,
                category: 'MISSION CONTROL HOUSTON',
                thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/International_Space_Station.svg/1200px-International_Space_Station.svg.png',
                fields: [
                    { name: `${EMOJIS.earth} Latitude`, value: `\`${parseFloat(position.latitude).toFixed(4)}°\``, inline: true },
                    { name: `${EMOJIS.planet} Longitude`, value: `\`${parseFloat(position.longitude).toFixed(4)}°\``, inline: true },
                    { name: `${EMOJIS.astronaut} Tripulação`, value: `\`${crewCount} astronautas\``, inline: true },
                    { name: `${EMOJIS.rocket} Altitude`, value: '`~408 km`', inline: true },
                    { name: `${EMOJIS.star} Velocidade`, value: '`27.600 km/h`', inline: true },
                    { name: `${EMOJIS.moon} Órbitas/Dia`, value: '`~15.5`', inline: true }
                ],
                footer: '🌍 ISS Live Tracker'
            });

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('Rastrear ao Vivo')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://spotthestation.nasa.gov/')
                    .setEmoji('📍'),
                new ButtonBuilder()
                    .setLabel('ISS Live Stream')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://www.nasa.gov/nasalive')
                    .setEmoji('📺')
            );

            return { embed, buttons };
        } catch (error) {
            logger.error('Erro ao buscar localização da ISS');
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 🔴 MARS ROVER
    // ════════════════════════════════════════════════════════════

    async getMarsRoverPhotos(): Promise<NewsResult | null> {
        try {
            const response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=${NASA_API_KEY}`);
            const photos = response.data.latest_photos;

            if (!photos || photos.length === 0) return null;

            const photo = photos[Math.floor(Math.random() * Math.min(photos.length, 10))];

            const embed = this.createPremiumEmbed({
                title: '🔴 TRANSMISSÃO DE MARTE',
                description: `### ${EMOJIS.mars} Foto do Rover ${photo.rover.name}\n\nImagem capturada diretamente da superfície marciana!\n\n*O rover ${photo.rover.name} está explorando Marte desde ${new Date(photo.rover.landing_date).getFullYear()}.*`,
                color: COLORS.MARS,
                category: 'MARS EXPLORATION PROGRAM',
                image: photo.img_src,
                fields: [
                    { name: `${EMOJIS.telescope} Câmera`, value: `\`${photo.camera.full_name}\``, inline: true },
                    { name: `${EMOJIS.planet} Sol Marciano`, value: `\`Sol ${photo.sol}\``, inline: true },
                    { name: `${EMOJIS.star} Data Terrestre`, value: `\`${photo.earth_date}\``, inline: true }
                ],
                footer: `🛸 NASA Mars Rover - ${photo.rover.name}`
            });

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('Ver Galeria Completa')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://mars.nasa.gov/msl/multimedia/raw-images/')
                    .setEmoji('🖼️'),
                new ButtonBuilder()
                    .setLabel('Mars Exploration')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://mars.nasa.gov/')
                    .setEmoji('🔴')
            );

            return { embed, buttons };
        } catch (error) {
            logger.error('Erro ao buscar fotos de Marte');
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 📰 SPACE NEWS
    // ════════════════════════════════════════════════════════════

    async getSpaceNews(): Promise<NewsResult | null> {
        try {
            const response = await axios.get('https://api.spaceflightnewsapi.net/v4/articles?limit=5');
            const articles = response.data.results;

            if (!articles || articles.length === 0) return null;

            const article = articles[Math.floor(Math.random() * articles.length)];

            const translatedTitle = await this.translateToPT(article.title);
            const summaryText = article.summary.length > 500 
                ? article.summary.substring(0, 500) + '...' 
                : article.summary;
            const translatedSummary = await this.translateToPT(summaryText);

            const embed = this.createPremiumEmbed({
                title: '📰 NOTÍCIAS DO COSMOS',
                description: `### ${EMOJIS.star} ${translatedTitle}\n\n${translatedSummary}`,
                color: COLORS.NEWS,
                category: article.news_site.toUpperCase(),
                image: article.image_url,
                fields: [
                    { name: `${EMOJIS.telescope} Fonte`, value: `\`${article.news_site}\``, inline: true },
                    { name: `${EMOJIS.planet} Publicado`, value: `\`${new Date(article.published_at).toLocaleDateString('pt-BR')}\``, inline: true }
                ],
                footer: '📡 Space News Network'
            });

            const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setLabel('Ler Artigo Completo')
                    .setStyle(ButtonStyle.Link)
                    .setURL(article.url)
                    .setEmoji('📖')
            );

            return { embed, buttons };
        } catch (error) {
            logger.error('Erro ao buscar notícias');
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 💫 SPACE FACT
    // ════════════════════════════════════════════════════════════

    getSpaceFact(): NewsResult {
        const fact = this.spaceFacts[Math.floor(Math.random() * this.spaceFacts.length)];

        const embed = this.createPremiumEmbed({
            title: '💫 CURIOSIDADE CÓSMICA',
            description: `### ${EMOJIS.galaxy} Você Sabia?\n\n> ${fact}\n\n*O universo está cheio de mistérios esperando para serem descobertos!*`,
            color: COLORS.CURIOSITY,
            category: 'NEXSTAR KNOWLEDGE BASE',
            footer: '🌟 Fatos Espaciais Incríveis'
        });

        return { embed, buttons: null };
    }

    // ════════════════════════════════════════════════════════════
    // 📤 SEND NEWS
    // ════════════════════════════════════════════════════════════

    async sendSpaceNews(specificType: string | null = null): Promise<void> {
        const channel = client.channels.cache.get(CHANNEL_NEWS_ID) as TextChannel | undefined;
        if (!channel) {
            logger.error(`Canal ${CHANNEL_NEWS_ID} não encontrado!`);
            return;
        }

        try {
            const contentTypes = ['nasa_apod', 'spacex_launches', 'space_news', 'iss_location', 'mars_rover', 'space_fact'];
            const contentType = specificType || contentTypes[Math.floor(Math.random() * contentTypes.length)];

            let result: NewsResult | null = null;

            switch (contentType) {
                case 'nasa_apod':
                    result = await this.getNasaApod();
                    break;
                case 'spacex_launches':
                    result = await this.getSpaceXLaunches();
                    break;
                case 'space_news':
                    result = await this.getSpaceNews();
                    break;
                case 'iss_location':
                    result = await this.getISSLocation();
                    break;
                case 'mars_rover':
                    result = await this.getMarsRoverPhotos();
                    break;
                case 'space_fact':
                    result = this.getSpaceFact();
                    break;
            }

            if (result?.embed) {
                const messageOptions: { embeds: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] } = { 
                    embeds: [result.embed] 
                };
                if (result.buttons) {
                    messageOptions.components = [result.buttons];
                }
                
                await channel.send(messageOptions);
                logger.info(`Notícia espacial enviada: ${contentType}`);
            }
        } catch (error) {
            logger.error('Erro ao enviar notícias');
        }
    }
}

const spaceBot = new SpaceNewsBot();

// ═══════════════════════════════════════════════════════════════════════════
// 📋 SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder().setName('apod').setDescription('🔭 Mostra a Imagem Astronômica do Dia da NASA'),
    new SlashCommandBuilder().setName('spacex').setDescription('🚀 Mostra o próximo lançamento da SpaceX'),
    new SlashCommandBuilder().setName('iss').setDescription('🛰️ Mostra a localização atual da ISS'),
    new SlashCommandBuilder().setName('mars').setDescription('🔴 Mostra uma foto recente do rover em Marte'),
    new SlashCommandBuilder().setName('spacenews').setDescription('📰 Mostra uma notícia espacial recente'),
    new SlashCommandBuilder().setName('spacefact').setDescription('💫 Mostra uma curiosidade sobre o espaço')
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands(): Promise<void> {
    try {
        logger.info('Registrando slash commands...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        logger.info('Slash commands registrados com sucesso!');
    } catch (error) {
        logger.error('Erro ao registrar comandos');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', () => {
    logger.info(`✅ ${client.user?.tag} conectado à galáxia!`);
    logger.info(`📡 Canal de notícias: ${CHANNEL_NEWS_ID}`);
    
    registerCommands();
    
    // Agenda notícias a cada hora
    cron.schedule('0 * * * *', () => {
        logger.info('Executando envio automático de notícias espaciais...');
        spaceBot.sendSpaceNews();
    });
    
    // Primeira notícia após 30 segundos
    setTimeout(() => {
        spaceBot.sendSpaceNews();
    }, 30000);
});

// Handler de slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    try {
        await interaction.deferReply();
        
        let result: NewsResult | null = null;
        
        switch (interaction.commandName) {
            case 'apod':
                result = await spaceBot.getNasaApod();
                break;
            case 'spacex':
                result = await spaceBot.getSpaceXLaunches();
                break;
            case 'iss':
                result = await spaceBot.getISSLocation();
                break;
            case 'mars':
                result = await spaceBot.getMarsRoverPhotos();
                break;
            case 'spacenews':
                result = await spaceBot.getSpaceNews();
                break;
            case 'spacefact':
                result = spaceBot.getSpaceFact();
                break;
        }

        if (result?.embed) {
            const messageOptions: { embeds: EmbedBuilder[]; components?: ActionRowBuilder<ButtonBuilder>[] } = { 
                embeds: [result.embed] 
            };
            if (result.buttons) {
                messageOptions.components = [result.buttons];
            }
            await interaction.editReply(messageOptions);
        } else {
            await interaction.editReply({ 
                content: '❌ Não foi possível obter os dados. Tente novamente em alguns segundos!'
            });
        }
    } catch (error) {
        logger.error('Erro no comando');
        await interaction.editReply({ 
            content: '❌ Ocorreu um erro ao processar o comando.'
        });
    }
});

// Comando legado
client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    
    if (message.content === '!space_now') {
        if (message.member?.permissions.has('ManageMessages')) {
            await spaceBot.sendSpaceNews();
            await message.reply(`${EMOJIS.rocket} **Transmissão cósmica enviada!** ${EMOJIS.galaxy}`);
        } else {
            await message.reply(`${EMOJIS.star} **Acesso negado**: Privilégios insuficientes! ${EMOJIS.star}`);
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════════════════════════════════════════

client.login(DISCORD_TOKEN).catch(error => {
    logger.error('Falha ao conectar:', { error });
    process.exit(1);
});

process.on('SIGINT', () => {
    logger.info('Desligando Bot News...');
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Erro não tratado:', { error });
});
