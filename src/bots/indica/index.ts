/**
 * 🎬 BOT INDICA - Recomendações de Animes & Filmes + Sessões Privadas
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Migrado de botindica.js
 * APIs: OMDb (Filmes) + Jikan/MyAnimeList (Animes)
 */

import { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    TextChannel,
    VoiceChannel,
    ButtonInteraction,
    ModalSubmitInteraction,
    Message,
    VoiceState
} from 'discord.js';

import axios from 'axios';
import cron from 'node-cron';
import { translate } from '@vitalets/google-translate-api';

import { 
    config, 
    logger, 
    testConnection, 
    initializeSchema,
    logAudit,
    closePool
} from '../../shared/services';

let dbConnected = false;

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate(['DISCORD_TOKEN_INDICA', 'CANAL_INDICA']);

const TOKEN = config.get('DISCORD_TOKEN_INDICA');
const CATEGORIA_ANIME_FILME = config.getOptional('CATEGORIA_ANIME_FILME');
const CANAL_INDICA = config.get('CANAL_INDICA');
const ANIME_SESSAO = config.getOptional('ANIME_SESSAO');
const FILME_SESSAO = config.getOptional('FILME_SESSAO');
const OMDB_API_KEY = config.getOptional('OMDB_API_KEY') || '55cefe61';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const CORES = {
    ANIME: '#E91E63',
    FILME: '#9C27B0',
    SESSAO: '#FF9800',
    SUCESSO: '#4CAF50',
    ERRO: '#F44336',
    INFO: '#2196F3',
    DOURADO: '#FFD700',
    ROXO_ESPACIAL: '#6B5B95'
} as const;

const COREIA_ICON = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';

const EMOJIS = {
    ANIME: '🎌',
    FILME: '🎬',
    PIPOCA: '🍿',
    ESTRELA: '⭐',
    FOGO: '🔥',
    CORACAO: '💖',
    NOTA: '📝',
    GENERO: '🎭',
    DURACAO: '⏱️',
    ANO: '📅',
    CALL: '📞',
    PRIVADO: '🔒',
    PESSOAS: '👥',
    SUCESSO: '✅',
    ERRO: '❌',
    FOGUETE: '🚀',
    TV: '📺',
    CLAPPERBOARD: '🎞️',
    SCORE: '🏆',
    EPISODIOS: '📺',
    STATUS: '📡'
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface AnimeData {
    titulo: string;
    tituloJapones?: string;
    sinopse: string;
    generos: string[];
    nota: number | string;
    episodios: number | string;
    status: string;
    ano: number | string;
    poster?: string;
    banner?: string;
    url?: string;
    tipo: string;
    estudio?: string;
    fonte?: string;
}

interface FilmeData {
    titulo: string;
    tituloOriginal?: string;
    sinopse: string;
    generos: string[];
    nota: string;
    votos?: string;
    duracao: string;
    ano: string | number;
    poster?: string;
    banner?: string;
    ondeAssistir?: string;
    diretor?: string;
    atores?: string;
    premios?: string;
    imdbId?: string;
}

interface SessaoData {
    ownerId: string;
    nomeConteudo: string;
    tipo: 'anime' | 'filme';
    createdAt: Date;
}

interface EmbedOptions {
    cor?: string;
    titulo?: string;
    descricao?: string;
    thumbnail?: string;
    imagem?: string;
    autor?: { name: string; iconURL?: string };
    campos?: Array<{ name: string; value: string; inline?: boolean }>;
    footer?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENT E ESTADO
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.User, Partials.GuildMember]
});

const sessoesPrivadas = new Map<string, SessaoData>();

const ultimasRecomendacoes = {
    animeIds: [] as number[],
    filmeIds: [] as string[]
};

// ═══════════════════════════════════════════════════════════════════════════
// 🌐 TRADUÇÃO
// ═══════════════════════════════════════════════════════════════════════════

async function traduzirParaPortugues(texto: string): Promise<string> {
    if (!texto || texto === 'N/A') return texto;
    
    try {
        const resultado = await translate(texto, { to: 'pt' });
        return resultado.text;
    } catch (error) {
        logger.warn('Erro ao traduzir texto');
        return texto;
    }
}

function traduzirStatus(status: string): string {
    const traducoes: Record<string, string> = {
        'Finished Airing': 'Finalizado',
        'Currently Airing': 'Em exibição',
        'Not yet aired': 'Não lançado',
        'Cancelled': 'Cancelado',
        'Hiatus': 'Em hiato'
    };
    return traducoes[status] || status || 'Desconhecido';
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎌 API: JIKAN (MyAnimeList)
// ═══════════════════════════════════════════════════════════════════════════

async function buscarAnimeAleatorio(): Promise<AnimeData> {
    try {
        const pagina = Math.floor(Math.random() * 10) + 1;
        const response = await axios.get('https://api.jikan.moe/v4/top/anime', {
            params: { page: pagina, limit: 25, filter: 'bypopularity' },
            timeout: 10000
        });

        if (!response.data?.data?.length) {
            throw new Error('Nenhum anime encontrado');
        }

        let animesDisponiveis = response.data.data.filter(
            (a: { mal_id: number }) => !ultimasRecomendacoes.animeIds.includes(a.mal_id)
        );

        if (animesDisponiveis.length === 0) {
            ultimasRecomendacoes.animeIds = [];
            animesDisponiveis = response.data.data;
        }

        const anime = animesDisponiveis[Math.floor(Math.random() * animesDisponiveis.length)];
        
        ultimasRecomendacoes.animeIds.push(anime.mal_id);
        if (ultimasRecomendacoes.animeIds.length > 20) {
            ultimasRecomendacoes.animeIds.shift();
        }

        let sinopse = anime.synopsis || 'Sinopse não disponível.';
        if (sinopse.length > 400) {
            sinopse = sinopse.substring(0, 400) + '...';
        }

        const generosIngles = anime.genres?.map((g: { name: string }) => g.name).join(', ') || '';
        const [sinopseTraduzida, generosTraduzidos] = await Promise.all([
            traduzirParaPortugues(sinopse),
            traduzirParaPortugues(generosIngles)
        ]);

        return {
            titulo: anime.title,
            tituloJapones: anime.title_japanese || '',
            sinopse: sinopseTraduzida,
            generos: generosTraduzidos ? generosTraduzidos.split(', ') : ['Não informado'],
            nota: anime.score || 'N/A',
            episodios: anime.episodes || '?',
            status: anime.status || 'Desconhecido',
            ano: anime.year || (anime.aired?.prop?.from?.year) || '?',
            poster: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
            banner: anime.trailer?.images?.maximum_image_url || anime.images?.jpg?.large_image_url,
            url: anime.url,
            tipo: anime.type || 'TV',
            estudio: anime.studios?.[0]?.name || 'Desconhecido',
            fonte: anime.source || 'Original'
        };
    } catch (error) {
        logger.error('Erro ao buscar anime');
        return {
            titulo: 'Demon Slayer',
            sinopse: 'Tanjiro busca vingança após sua família ser massacrada por demônios.',
            generos: ['Ação', 'Fantasia'],
            nota: 8.9,
            episodios: 26,
            status: 'Finalizado',
            ano: 2019,
            tipo: 'TV'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 API: OMDb (Filmes)
// ═══════════════════════════════════════════════════════════════════════════

const IMDB_IDS_POPULARES = [
    'tt0468569', 'tt1345836', 'tt0816692', 'tt4154756', 'tt4154796',
    'tt10872600', 'tt9362722', 'tt1375666', 'tt2395427', 'tt3498820',
    'tt3501632', 'tt4633694', 'tt6320628', 'tt9376612', 'tt10648342',
    'tt9362930', 'tt1431045', 'tt5463162', 'tt2015381', 'tt14998742',
    'tt0800369', 'tt0458339', 'tt1228705', 'tt4154664', 'tt9114286',
    'tt10366206', 'tt2911666', 'tt4425200', 'tt6146586', 'tt1745960',
    'tt0499549', 'tt1630029', 'tt9603212', 'tt1160419', 'tt15239678',
    'tt6723592', 'tt3659388', 'tt0910970', 'tt1049413', 'tt2380307',
    'tt2948356', 'tt0435761', 'tt1979376', 'tt2096673', 'tt22022452',
    'tt6718170', 'tt11304740', 'tt0892769', 'tt2386490', 'tt15398776',
    'tt1130884', 'tt0993846', 'tt7286456', 'tt6751668', 'tt11245972',
    'tt7131622', 'tt1853728', 'tt2267998', 'tt2024544', 'tt2084970'
];

async function buscarFilmeAleatorio(): Promise<FilmeData> {
    try {
        let idsDisponiveis = IMDB_IDS_POPULARES.filter(
            id => !ultimasRecomendacoes.filmeIds.includes(id)
        );

        if (idsDisponiveis.length === 0) {
            ultimasRecomendacoes.filmeIds = [];
            idsDisponiveis = IMDB_IDS_POPULARES;
        }

        const imdbId = idsDisponiveis[Math.floor(Math.random() * idsDisponiveis.length)];
        
        const response = await axios.get('https://www.omdbapi.com/', {
            params: { apikey: OMDB_API_KEY, i: imdbId, plot: 'full' },
            timeout: 10000
        });

        if (response.data.Response === 'False') {
            throw new Error(response.data.Error || 'Filme não encontrado');
        }

        const filme = response.data;
        
        ultimasRecomendacoes.filmeIds.push(imdbId);
        if (ultimasRecomendacoes.filmeIds.length > 30) {
            ultimasRecomendacoes.filmeIds.shift();
        }

        let sinopse = filme.Plot || 'Sinopse não disponível.';
        if (sinopse.length > 400) {
            sinopse = sinopse.substring(0, 400) + '...';
        }

        const [sinopseTraduzida, generosTraduzidos] = await Promise.all([
            traduzirParaPortugues(sinopse),
            traduzirParaPortugues(filme.Genre || '')
        ]);

        return {
            titulo: filme.Title,
            tituloOriginal: filme.Title,
            sinopse: sinopseTraduzida,
            generos: generosTraduzidos ? generosTraduzidos.split(', ') : ['Não informado'],
            nota: filme.imdbRating || 'N/A',
            votos: filme.imdbVotes || '0',
            duracao: filme.Runtime || 'N/A',
            ano: filme.Year || '?',
            poster: filme.Poster !== 'N/A' ? filme.Poster : undefined,
            banner: filme.Poster !== 'N/A' ? filme.Poster : undefined,
            ondeAssistir: 'Verifique streamings disponíveis',
            diretor: filme.Director || 'Desconhecido',
            atores: filme.Actors || 'N/A',
            premios: filme.Awards || 'N/A',
            imdbId: filme.imdbID
        };
    } catch (error) {
        logger.error('Erro ao buscar filme');
        return {
            titulo: 'Interestelar',
            sinopse: 'Em um futuro onde a Terra está morrendo, astronautas viajam através de um buraco de minhoca.',
            generos: ['Ficção Científica', 'Drama'],
            nota: '8.7',
            ano: 2014,
            duracao: '169 min',
            diretor: 'Christopher Nolan'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function criarEmbedCoreIA(options: EmbedOptions = {}): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(parseInt((options.cor || CORES.ROXO_ESPACIAL).replace('#', ''), 16))
        .setTimestamp()
        .setFooter({ 
            text: options.footer || `${EMOJIS.ESTRELA} CoreIA Indica`, 
            iconURL: COREIA_ICON 
        });

    if (options.titulo) embed.setTitle(options.titulo);
    if (options.descricao) embed.setDescription(options.descricao);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.imagem) embed.setImage(options.imagem);
    if (options.autor) embed.setAuthor(options.autor);
    if (options.campos) embed.addFields(options.campos);

    return embed;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📺 RECOMENDAÇÃO DE ANIME
// ═══════════════════════════════════════════════════════════════════════════

async function enviarRecomendacaoAnime(canal: TextChannel): Promise<void> {
    try {
        const anime = await buscarAnimeAleatorio();
        
        const embed = new EmbedBuilder()
            .setColor(parseInt(CORES.ANIME.replace('#', ''), 16))
            .setAuthor({ name: `${EMOJIS.ANIME} RECOMENDAÇÃO DE ANIME`, iconURL: COREIA_ICON })
            .setTitle(`${EMOJIS.FOGO} ${anime.titulo}`)
            .setURL(anime.url || null as unknown as string)
            .setDescription(`>>> ${anime.sinopse}`)
            .addFields([
                { name: `${EMOJIS.GENERO} Gêneros`, value: anime.generos.slice(0, 4).map(g => `\`${g}\``).join(' • ') || 'N/A', inline: true },
                { name: `${EMOJIS.SCORE} Nota`, value: `**${anime.nota}/10** ${'⭐'.repeat(Math.min(5, Math.round((Number(anime.nota) || 0)/2)))}`, inline: true },
                { name: `${EMOJIS.EPISODIOS} Episódios`, value: `${anime.episodios}`, inline: true },
                { name: `${EMOJIS.STATUS} Status`, value: traduzirStatus(anime.status), inline: true },
                { name: `${EMOJIS.ANO} Ano`, value: `${anime.ano}`, inline: true },
                { name: `${EMOJIS.TV} Tipo`, value: anime.tipo || 'TV', inline: true }
            ])
            .setFooter({ text: `${EMOJIS.ESTRELA} CoreIA Indica • Fonte: MyAnimeList`, iconURL: COREIA_ICON })
            .setTimestamp();

        if (anime.poster) embed.setThumbnail(anime.poster);
        if (anime.banner) embed.setImage(anime.banner);
        else if (anime.poster) embed.setImage(anime.poster);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`criar_sessao_anime_${(anime.titulo || 'anime').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}`)
                .setLabel('Criar Sessão')
                .setStyle(ButtonStyle.Success)
                .setEmoji(EMOJIS.CALL)
        );

        if (anime.url) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Ver no MyAnimeList')
                    .setStyle(ButtonStyle.Link)
                    .setURL(anime.url)
                    .setEmoji('🔗')
            );
        }

        await canal.send({ 
            content: `${EMOJIS.ANIME} **Nova recomendação de anime!** ${EMOJIS.FOGO}`,
            embeds: [embed], 
            components: [row] 
        });
        logger.info(`Recomendação de anime enviada: ${anime.titulo}`);
    } catch (error) {
        logger.error('Erro ao enviar recomendação de anime');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 RECOMENDAÇÃO DE FILME
// ═══════════════════════════════════════════════════════════════════════════

async function enviarRecomendacaoFilme(canal: TextChannel): Promise<void> {
    try {
        const filme = await buscarFilmeAleatorio();
        
        const embed = new EmbedBuilder()
            .setColor(parseInt(CORES.FILME.replace('#', ''), 16))
            .setAuthor({ name: `${EMOJIS.FILME} RECOMENDAÇÃO DE FILME`, iconURL: COREIA_ICON })
            .setTitle(`${EMOJIS.CLAPPERBOARD} ${filme.titulo}`)
            .setDescription(`>>> ${filme.sinopse}`)
            .addFields([
                { name: `${EMOJIS.GENERO} Gêneros`, value: filme.generos.slice(0, 4).map(g => `\`${g}\``).join(' • ') || 'N/A', inline: true },
                { name: `${EMOJIS.SCORE} Nota IMDB`, value: `**${filme.nota}/10** ${'⭐'.repeat(Math.min(5, Math.round((parseFloat(filme.nota) || 0)/2)))}`, inline: true },
                { name: `${EMOJIS.DURACAO} Duração`, value: filme.duracao || 'N/A', inline: true },
                { name: `${EMOJIS.ANO} Ano`, value: `${filme.ano}`, inline: true },
                { name: `🎬 Diretor`, value: filme.diretor || 'N/A', inline: true },
                { name: `🎭 Elenco`, value: filme.atores ? filme.atores.substring(0, 50) : 'N/A', inline: true }
            ])
            .setFooter({ text: `${EMOJIS.ESTRELA} CoreIA Indica • Fonte: IMDB/OMDb`, iconURL: COREIA_ICON })
            .setTimestamp();

        if (filme.poster) {
            embed.setThumbnail(filme.poster);
            embed.setImage(filme.poster);
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`criar_sessao_filme_${(filme.titulo || 'filme').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}`)
                .setLabel('Criar Sessão')
                .setStyle(ButtonStyle.Success)
                .setEmoji(EMOJIS.CALL)
        );

        if (filme.imdbId) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Ver no IMDB')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.imdb.com/title/${filme.imdbId}`)
                    .setEmoji('🔗')
            );
        }

        await canal.send({ 
            content: `${EMOJIS.FILME} **Nova recomendação de filme!** ${EMOJIS.PIPOCA}`,
            embeds: [embed], 
            components: [row] 
        });
        logger.info(`Recomendação de filme enviada: ${filme.titulo}`);
    } catch (error) {
        logger.error('Erro ao enviar recomendação de filme');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', async () => {
    logger.info(`${EMOJIS.FOGUETE} Bot Indica ${client.user?.tag} está online!`);
    logger.info(`Canal Indicações: ${CANAL_INDICA}`);

    let canalIndica: TextChannel | null = null;
    
    try {
        canalIndica = await client.channels.fetch(CANAL_INDICA) as TextChannel;
    } catch {
        for (const [, guild] of client.guilds.cache) {
            await guild.channels.fetch().catch(() => {});
            const canal = guild.channels.cache.get(CANAL_INDICA) as TextChannel | undefined;
            if (canal) {
                canalIndica = canal;
                break;
            }
        }
    }
    
    if (canalIndica) {
        logger.info(`Canal de indicações conectado: ${canalIndica.name}`);
        
        // 09:00 - Anime
        cron.schedule('0 9 * * *', async () => {
            await enviarRecomendacaoAnime(canalIndica!);
        }, { timezone: 'America/Sao_Paulo' });

        // 13:00 - Filme
        cron.schedule('0 13 * * *', async () => {
            await enviarRecomendacaoFilme(canalIndica!);
        }, { timezone: 'America/Sao_Paulo' });

        // 18:00 - Anime
        cron.schedule('0 18 * * *', async () => {
            await enviarRecomendacaoAnime(canalIndica!);
        }, { timezone: 'America/Sao_Paulo' });

        // 22:00 - Filme
        cron.schedule('0 22 * * *', async () => {
            await enviarRecomendacaoFilme(canalIndica!);
        }, { timezone: 'America/Sao_Paulo' });

        logger.info('Agendamentos configurados (09h, 13h, 18h, 22h)');
        
        // Recomendação inicial
        setTimeout(async () => {
            if (Math.random() > 0.5) {
                await enviarRecomendacaoAnime(canalIndica!);
            } else {
                await enviarRecomendacaoFilme(canalIndica!);
            }
        }, 3000);
    } else {
        logger.error(`Canal de indicações não encontrado: ${CANAL_INDICA}`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📨 MENSAGENS (Sessão)
// ═══════════════════════════════════════════════════════════════════════════

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    const canalId = message.channel.id;
    
    if (canalId === ANIME_SESSAO || canalId === FILME_SESSAO) {
        const tipo = canalId === ANIME_SESSAO ? 'anime' : 'filme';
        const emoji = tipo === 'anime' ? EMOJIS.ANIME : EMOJIS.FILME;
        const cor = tipo === 'anime' ? CORES.ANIME : CORES.FILME;
        const tipoTexto = tipo === 'anime' ? 'Anime' : 'Filme';

        const embed = new EmbedBuilder()
            .setColor(parseInt(cor.replace('#', ''), 16))
            .setAuthor({ name: `${emoji} Criar Sessão de ${tipoTexto}`, iconURL: COREIA_ICON })
            .setDescription(
                `${message.author}, clique no botão abaixo para criar sua **call privada**! ${EMOJIS.PIPOCA}\n\n` +
                `> ${EMOJIS.CALL} Configure o nome do ${tipo} e o limite de pessoas.`
            )
            .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
            .setFooter({ text: `${EMOJIS.ESTRELA} CoreIA Sessões`, iconURL: COREIA_ICON });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`iniciar_sessao_${tipo}`)
                .setLabel(`Criar Sessão de ${tipoTexto}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji(EMOJIS.CALL)
        );

        try {
            await message.delete().catch(() => {});
            const resposta = await (message.channel as TextChannel).send({ embeds: [embed], components: [row] });
            setTimeout(async () => { try { await resposta.delete(); } catch {} }, 30000);
        } catch (error) {
            logger.error('Erro ao enviar convite de sessão');
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔘 INTERAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
        await handleModal(interaction);
    }
});

async function handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;

    if (customId === 'cancelar_sessao') {
        try {
            await interaction.message.delete();
        } catch {
            await interaction.reply({ 
                content: `${EMOJIS.SUCESSO} Tudo bem! Quando quiser criar uma sessão, é só enviar uma mensagem aqui.`,
                flags: MessageFlags.Ephemeral 
            });
        }
        return;
    }

    if (customId.startsWith('iniciar_sessao_') || customId.startsWith('criar_sessao_anime_') || customId.startsWith('criar_sessao_filme_')) {
        let tipo: 'anime' | 'filme';
        let nomePreenchido = '';

        if (customId.startsWith('iniciar_sessao_')) {
            tipo = customId.replace('iniciar_sessao_', '') as 'anime' | 'filme';
        } else {
            tipo = customId.startsWith('criar_sessao_anime_') ? 'anime' : 'filme';
            nomePreenchido = customId.replace(`criar_sessao_${tipo}_`, '').replace(/_/g, ' ');
        }
        
        const modal = new ModalBuilder()
            .setCustomId(`modal_sessao_${tipo}`)
            .setTitle(`${tipo === 'anime' ? EMOJIS.ANIME : EMOJIS.FILME} Configurar Sessão`);

        const inputNome = new TextInputBuilder()
            .setCustomId('nome_conteudo')
            .setLabel(`Nome do ${tipo === 'anime' ? 'Anime' : 'Filme'}`)
            .setPlaceholder(`Ex: ${tipo === 'anime' ? 'Demon Slayer' : 'Interestelar'}`)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);

        if (nomePreenchido) {
            inputNome.setValue(nomePreenchido.substring(0, 50));
        }

        const inputLimite = new TextInputBuilder()
            .setCustomId('limite_pessoas')
            .setLabel('Quantas pessoas podem entrar? (1-99)')
            .setPlaceholder('Ex: 5')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(2);

        modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(inputNome),
            new ActionRowBuilder<TextInputBuilder>().addComponents(inputLimite)
        );

        await interaction.showModal(modal);
        
        if (customId.startsWith('iniciar_sessao_')) {
            try { await interaction.message.delete(); } catch {}
        }
    }
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
    const customId = interaction.customId;

    if (customId.startsWith('modal_sessao_')) {
        const tipo = customId.includes('anime') ? 'anime' : 'filme';
        const nomeConteudo = interaction.fields.getTextInputValue('nome_conteudo');
        const limitePessoas = parseInt(interaction.fields.getTextInputValue('limite_pessoas'));

        if (isNaN(limitePessoas) || limitePessoas < 1 || limitePessoas > 99) {
            await interaction.reply({
                content: `${EMOJIS.ERRO} O limite de pessoas deve ser um número entre 1 e 99!`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guild = interaction.guild!;
            const emoji = tipo === 'anime' ? EMOJIS.ANIME : EMOJIS.FILME;
            const channelName = `${emoji} ${nomeConteudo}`;

            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: CATEGORIA_ANIME_FILME,
                userLimit: limitePessoas,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
                    { id: interaction.user.id, allow: [
                        PermissionFlagsBits.ViewChannel, 
                        PermissionFlagsBits.Connect, 
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.DeafenMembers,
                        PermissionFlagsBits.MoveMembers
                    ]}
                ]
            });

            sessoesPrivadas.set(channel.id, {
                ownerId: interaction.user.id,
                nomeConteudo: nomeConteudo,
                tipo: tipo as 'anime' | 'filme',
                createdAt: new Date()
            });

            // Logar no banco
            if (dbConnected) {
                try {
                    await logAudit(interaction.guild!.id, interaction.user.id, 'SESSAO_CRIADA', channel.id, {
                        conteudo: nomeConteudo,
                        tipo: tipo,
                        limite: limitePessoas
                    });
                } catch (error) {
                    logger.warn('Erro ao logar sessão no DB');
                }
            }

            const cor = tipo === 'anime' ? CORES.ANIME : CORES.FILME;

            const embed = criarEmbedCoreIA({
                cor: cor,
                autor: { name: `${EMOJIS.SUCESSO} Sessão Criada com Sucesso!`, iconURL: interaction.user.displayAvatarURL() },
                descricao: `Sua sessão privada está pronta! ${EMOJIS.PIPOCA}\n\n` +
                    `>>> ${EMOJIS.CALL} **Canal:** ${channel}\n` +
                    `${emoji} **Conteúdo:** ${nomeConteudo}\n` +
                    `${EMOJIS.PESSOAS} **Limite:** ${limitePessoas} pessoas\n` +
                    `${EMOJIS.PRIVADO} **Status:** Privado`,
                thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
                campos: [{ name: `${EMOJIS.NOTA} Como convidar amigos`, value: '>>> Clique com o botão direito no canal e selecione "Convidar para Canal".', inline: false }],
                footer: `${EMOJIS.ESTRELA} CoreIA Sessões • A call será deletada quando você sair`
            });

            await interaction.editReply({ embeds: [embed] });
            logger.info(`Sessão criada: "${nomeConteudo}" por ${interaction.user.tag}`);

        } catch (error) {
            logger.error('Erro ao criar sessão');
            const embedErro = criarEmbedCoreIA({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Criar Sessão`,
                descricao: 'Ocorreu um erro ao criar sua sessão.'
            });
            await interaction.editReply({ embeds: [embedErro] });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔊 VOZ (Limpa sessões)
// ═══════════════════════════════════════════════════════════════════════════

client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const sessao = sessoesPrivadas.get(oldState.channelId);
        
        if (sessao && sessao.ownerId === oldState.member?.id) {
            try {
                const canal = await client.channels.fetch(oldState.channelId).catch(() => null) as VoiceChannel | null;
                
                if (canal) {
                    await canal.delete('Dono da sessão saiu');
                    sessoesPrivadas.delete(oldState.channelId);
                    logger.info(`Sessão "${sessao.nomeConteudo}" deletada (dono saiu)`);
                }
            } catch (error) {
                logger.error('Erro ao deletar sessão');
            }
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 LIMPEZA
// ═══════════════════════════════════════════════════════════════════════════

setInterval(async () => {
    let cleanedCount = 0;
    
    for (const [channelId] of sessoesPrivadas) {
        const guild = client.guilds.cache.first();
        if (guild && !guild.channels.cache.has(channelId)) {
            sessoesPrivadas.delete(channelId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        logger.info(`Limpeza: ${cleanedCount} sessões órfãs removidas`);
    }
}, 600000);

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', async () => {
    logger.info(`🎬 Bot Indica ${client.user?.tag} está online!`);
    
    // Iniciar cron de indicações automáticas (9:00, 15:00, 21:00)
    cron.schedule('0 9,15,21 * * *', async () => {
        logger.info('⏰ Executando indicação automática...');
        const canal = client.channels.cache.get(CANAL_INDICA) as TextChannel;
        if (canal) {
            await enviarRecomendacaoAnime(canal);
        }
    });

    try {
        const connected = await testConnection();
        if (connected) {
            await initializeSchema();
            dbConnected = true;
            logger.info('💾 Database PostgreSQL conectado!');
        }
    } catch (error) {
        logger.warn('⚠️ Database não disponível, usando apenas memória');
    }
});

client.login(TOKEN).catch(error => {
    logger.error('Falha ao conectar:', { error });
    process.exit(1);
});

process.on('SIGINT', async () => {
    logger.info('Desligando Bot Indica...');
    await closePool();
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Erro não tratado:', { error });
});
