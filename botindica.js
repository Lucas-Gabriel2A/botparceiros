// ═══════════════════════════════════════════════════════════════════════════
// 🎬 BOT INDICA - Recomendações de Animes & Filmes + Sessões Privadas
// Usando APIs: TMDB (Filmes) e Jikan/MyAnimeList (Animes)
// ═══════════════════════════════════════════════════════════════════════════

const { 
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
    TextInputStyle
} = require('discord.js');
require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const { translate } = require('@vitalets/google-translate-api');

// ═══════════════════════════════════════════════════════════════════════════
// 📋 CONFIGURAÇÕES VIA VARIÁVEIS DE AMBIENTE
// ═══════════════════════════════════════════════════════════════════════════
const TOKEN = process.env.DISCORD_TOKEN_INDICA;
const CATEGORIA_ANIME_FILME = process.env.CATEGORIA_ANIME_FILME;
const CANAL_INDICA = process.env.CANAL_INDICA;
const ANIME_SESSAO = process.env.ANIME_SESSAO;
const FILME_SESSAO = process.env.FILME_SESSAO;
const OMDB_API_KEY = process.env.OMDB_API_KEY || '55cefe61'; // OMDb API Key

// 🎨 PALETA DE CORES NEXSTAR
const CORES = {
    ANIME: '#E91E63',           // Rosa vibrante para anime
    FILME: '#9C27B0',           // Roxo para filmes
    SESSAO: '#FF9800',          // Laranja para sessões
    SUCESSO: '#4CAF50',         // Verde sucesso
    ERRO: '#F44336',            // Vermelho erro
    INFO: '#2196F3',            // Azul info
    DOURADO: '#FFD700',         // Dourado premium
    ROXO_ESPACIAL: '#6B5B95'    // Roxo espacial Nexstar
};

// 🖼️ ÍCONE NEXSTAR (apenas para footer)
const NEXSTAR_ICON = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';

// ✨ EMOJIS
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
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 VALIDAÇÃO DE CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN_INDICA não configurado no arquivo .env");
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CRIAÇÃO DO CLIENTE
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

// 📊 Armazena sessões privadas criadas
const sessoesPrivadas = new Map();

// 🎲 Armazena IDs já recomendados (evita repetições)
let ultimasRecomendacoes = {
    animeIds: [],
    filmeIds: []
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎌 API: JIKAN (MyAnimeList) - ANIMES (100+ animes disponíveis em Crunchyroll, Netflix, Prime)
// ═══════════════════════════════════════════════════════════════════════════
async function buscarAnimeAleatorio() {
    try {
        // Busca animes populares/top rated - páginas 1-10 = 250 animes
        const pagina = Math.floor(Math.random() * 10) + 1;
        const response = await axios.get(`https://api.jikan.moe/v4/top/anime`, {
            params: {
                page: pagina,
                limit: 25,
                filter: 'bypopularity'
            },
            timeout: 10000
        });

        if (!response.data?.data?.length) {
            throw new Error('Nenhum anime encontrado');
        }

        // Filtra animes já recomendados recentemente
        let animesDisponiveis = response.data.data.filter(
            a => !ultimasRecomendacoes.animeIds.includes(a.mal_id)
        );

        // Se todos já foram recomendados, limpa o histórico
        if (animesDisponiveis.length === 0) {
            ultimasRecomendacoes.animeIds = [];
            animesDisponiveis = response.data.data;
        }

        // Seleciona um aleatório
        const anime = animesDisponiveis[Math.floor(Math.random() * animesDisponiveis.length)];
        
        // Adiciona ao histórico
        ultimasRecomendacoes.animeIds.push(anime.mal_id);
        if (ultimasRecomendacoes.animeIds.length > 20) {
            ultimasRecomendacoes.animeIds.shift();
        }

        // Processa sinopse
        let sinopse = anime.synopsis || 'Sinopse não disponível.';
        if (sinopse.length > 400) {
            sinopse = sinopse.substring(0, 400) + '...';
        }

        // Traduz sinopse e gêneros para português
        console.log(`🌐 Traduzindo informações do anime...`);
        const generosIngles = anime.genres?.map(g => g.name).join(', ') || '';
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
        console.error('Erro ao buscar anime da API:', error.message);
        
        // Fallback: animes populares fixos
        const fallbackAnimes = [
            { titulo: 'Demon Slayer', sinopse: 'Tanjiro busca vingança após sua família ser massacrada por demônios.', generos: ['Ação', 'Fantasia'], nota: 8.9 },
            { titulo: 'Attack on Titan', sinopse: 'A humanidade luta contra titãs gigantes para sobreviver.', generos: ['Ação', 'Drama'], nota: 9.0 },
            { titulo: 'Jujutsu Kaisen', sinopse: 'Yuji Itadori luta contra maldições sobrenaturais.', generos: ['Ação', 'Horror'], nota: 8.7 }
        ];
        return fallbackAnimes[Math.floor(Math.random() * fallbackAnimes.length)];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// � FUNÇÃO: TRADUZIR TEXTO PARA PORTUGUÊS
// ═══════════════════════════════════════════════════════════════════════════
async function traduzirParaPortugues(texto) {
    if (!texto || texto === 'N/A') return texto;
    
    try {
        const resultado = await translate(texto, { to: 'pt' });
        return resultado.text;
    } catch (error) {
        console.log(`⚠️ Erro ao traduzir: ${error.message}`);
        return texto; // Retorna texto original se falhar
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 API: OMDb (Open Movie Database) - FILMES
// ═══════════════════════════════════════════════════════════════════════════

// Lista de 120+ filmes populares disponíveis em streaming (2007-2026)
// Netflix, Prime Video, Disney+, Max, Paramount+, Star+
const IMDB_IDS_POPULARES = [
    // ═══ AÇÃO & AVENTURA ═══
    'tt0468569', // The Dark Knight (2008) - Max
    'tt1345836', // The Dark Knight Rises (2012) - Max
    'tt0816692', // Interstellar (2014) - Prime/Netflix
    'tt4154756', // Avengers: Infinity War (2018) - Disney+
    'tt4154796', // Avengers: Endgame (2019) - Disney+
    'tt10872600', // Spider-Man: No Way Home (2021) - Netflix
    'tt9362722', // Spider-Man: Across the Spider-Verse (2023) - Netflix
    'tt1375666', // Inception (2010) - Netflix
    'tt2395427', // Avengers: Age of Ultron (2015) - Disney+
    'tt3498820', // Captain America: Civil War (2016) - Disney+
    'tt3501632', // Thor: Ragnarok (2017) - Disney+
    'tt4633694', // Spider-Man: Homecoming (2017) - Netflix
    'tt6320628', // Spider-Man: Far From Home (2019) - Netflix
    'tt9376612', // Shang-Chi (2021) - Disney+
    'tt10648342', // Thor: Love and Thunder (2022) - Disney+
    'tt9362930', // Deadpool & Wolverine (2024) - Disney+
    'tt1431045', // Deadpool (2016) - Disney+
    'tt5463162', // Deadpool 2 (2018) - Disney+
    'tt2015381', // Guardians of the Galaxy (2014) - Disney+
    'tt14998742', // Guardians of the Galaxy Vol. 3 (2023) - Disney+
    'tt0800369', // Thor (2011) - Disney+
    'tt0458339', // Captain America (2011) - Disney+
    'tt1228705', // Iron Man 2 (2010) - Disney+
    'tt4154664', // Captain Marvel (2019) - Disney+
    'tt9114286', // Black Widow (2021) - Disney+
    'tt10366206', // John Wick 4 (2023) - Prime
    'tt2911666', // John Wick (2014) - Prime/Netflix
    'tt4425200', // John Wick 2 (2017) - Prime
    'tt6146586', // John Wick 3 (2019) - Prime
    'tt1745960', // Top Gun: Maverick (2022) - Paramount+
    'tt0499549', // Avatar (2009) - Disney+
    'tt1630029', // Avatar 2 (2022) - Disney+
    'tt9603212', // Mission: Impossible - Dead Reckoning (2023) - Paramount+
    
    // ═══ FICÇÃO CIENTÍFICA ═══
    'tt1160419', // Dune (2021) - Max
    'tt15239678', // Dune: Part Two (2024) - Max
    'tt6723592', // Tenet (2020) - Prime
    'tt3659388', // The Martian (2015) - Disney+
    'tt0910970', // WALL·E (2008) - Disney+
    'tt1049413', // Up (2009) - Disney+
    'tt2380307', // Coco (2017) - Disney+
    'tt2948356', // Zootopia (2016) - Disney+
    'tt0435761', // Toy Story 3 (2010) - Disney+
    'tt1979376', // Toy Story 4 (2019) - Disney+
    'tt2096673', // Inside Out (2015) - Disney+
    'tt22022452', // Inside Out 2 (2024) - Disney+
    'tt6718170', // Super Mario Bros Movie (2023) - Netflix
    'tt11304740', // Kung Fu Panda 4 (2024) - Netflix
    'tt0892769', // How to Train Your Dragon (2010) - Netflix
    'tt2386490', // How to Train Your Dragon 2 (2014) - Netflix
    
    // ═══ DRAMA & THRILLER ═══
    'tt15398776', // Oppenheimer (2023) - Prime
    'tt1130884', // Shutter Island (2010) - Netflix
    'tt0993846', // The Wolf of Wall Street (2013) - Prime
    'tt7286456', // Joker (2019) - Max
    'tt6751668', // Parasite (2019) - Prime
    'tt11245972', // Everything Everywhere All at Once (2022) - Prime
    'tt7131622', // Once Upon a Time in Hollywood (2019) - Netflix
    'tt1853728', // Django Unchained (2012) - Netflix
    'tt2267998', // Gone Girl (2014) - Prime
    'tt2024544', // 12 Years a Slave (2013) - Prime
    'tt2084970', // The Imitation Game (2014) - Netflix
    'tt5090568', // Killers of the Flower Moon (2023) - Apple TV+
    'tt1024648', // Argo (2012) - Prime
    'tt1950186', // Ford v Ferrari (2019) - Disney+
    'tt3170832', // Room (2015) - Netflix
    'tt1454468', // Gravity (2013) - Max
    'tt8946378', // Knives Out (2019) - Prime
    'tt11564570', // Glass Onion (2022) - Netflix
    'tt9764362', // The Menu (2022) - Disney+
    'tt6139732', // Bohemian Rhapsody (2018) - Disney+
    'tt5580390', // The Shape of Water (2017) - Disney+
    
    // ═══ TERROR & SUSPENSE ═══
    'tt1457767', // The Conjuring (2013) - Max
    'tt3065204', // The Conjuring 2 (2016) - Max
    'tt7069210', // The Conjuring 3 (2021) - Max
    'tt5052448', // Get Out (2017) - Netflix
    'tt6857112', // Us (2019) - Prime
    'tt5052572', // It (2017) - Max
    'tt7349950', // It Chapter Two (2019) - Max
    'tt1396484', // It Follows (2014) - Prime
    'tt5073642', // A Quiet Place (2018) - Paramount+
    'tt8332922', // A Quiet Place Part II (2020) - Paramount+
    'tt1502712', // Hereditary (2018) - Prime
    'tt7784604', // Midsommar (2019) - Prime
    'tt10954984', // Nope (2022) - Prime
    
    // ═══ COMÉDIA & ANIMAÇÃO ═══
    'tt3783958', // La La Land (2016) - Netflix
    'tt3228774', // Cruella (2021) - Disney+
    'tt0848228', // The Avengers (2012) - Disney+
    'tt1517268', // Barbie (2023) - Max
    'tt1014759', // Alice in Wonderland (2010) - Disney+
    'tt6263850', // The Fall Guy (2024) - Prime
    'tt12037194', // Furiosa (2024) - Max
    'tt2488496', // Star Wars: The Force Awakens (2015) - Disney+
    'tt2527336', // Star Wars: The Last Jedi (2017) - Disney+
    'tt2527338', // Star Wars: The Rise of Skywalker (2019) - Disney+
    'tt3748528', // Rogue One (2016) - Disney+
    'tt1877830', // The Batman (2022) - Max
    'tt7126948', // Wonder Woman 1984 (2020) - Max
    'tt0451279', // Wonder Woman (2017) - Max
    'tt1386697', // Suicide Squad (2016) - Max
    'tt6334354', // The Suicide Squad (2021) - Max
    
    // ═══ SÉRIES DE FILMES POPULARES ═══
    'tt0241527', // Harry Potter 1 (2001) - Max
    'tt0295297', // Harry Potter 2 (2002) - Max
    'tt0304141', // Harry Potter 3 (2004) - Max
    'tt0330373', // Harry Potter 4 (2005) - Max
    'tt0373889', // Harry Potter 5 (2007) - Max
    'tt0417741', // Harry Potter 6 (2009) - Max
    'tt0926084', // Harry Potter 7 Part 1 (2010) - Max
    'tt1201607', // Harry Potter 7 Part 2 (2011) - Max
    'tt0120737', // Lord of the Rings 1 (2001) - Max
    'tt0167261', // Lord of the Rings 2 (2002) - Max
    'tt0167260', // Lord of the Rings 3 (2003) - Max
    
    // ═══ RECENTES & LANÇAMENTOS ═══
    'tt11866324', // Paddington in Peru (2025)
    'tt13623136', // A Minecraft Movie (2025)
    'tt6791350', // Sonic the Hedgehog 2 (2022) - Paramount+
    'tt18259086', // Sonic the Hedgehog 3 (2024) - Paramount+
    'tt10545296', // The Batman 2 (2025)
    'tt10676048', // M3GAN (2022) - Prime
    'tt14208870', // The Holdovers (2023) - Prime
    'tt8041270', // Past Lives (2023) - Prime
    'tt14539740', // Saltburn (2023) - Prime
];

async function buscarFilmeAleatorio() {
    try {
        // Filtra filmes já recomendados
        let idsDisponiveis = IMDB_IDS_POPULARES.filter(
            id => !ultimasRecomendacoes.filmeIds.includes(id)
        );

        if (idsDisponiveis.length === 0) {
            ultimasRecomendacoes.filmeIds = [];
            idsDisponiveis = IMDB_IDS_POPULARES;
        }

        // Seleciona um ID aleatório
        const imdbId = idsDisponiveis[Math.floor(Math.random() * idsDisponiveis.length)];
        
        // Busca detalhes do filme na OMDb API
        const response = await axios.get('https://www.omdbapi.com/', {
            params: {
                apikey: OMDB_API_KEY,
                i: imdbId,
                plot: 'full'
            },
            timeout: 10000
        });

        if (response.data.Response === 'False') {
            throw new Error(response.data.Error || 'Filme não encontrado');
        }

        const filme = response.data;
        
        // Adiciona ao histórico
        ultimasRecomendacoes.filmeIds.push(imdbId);
        if (ultimasRecomendacoes.filmeIds.length > 30) {
            ultimasRecomendacoes.filmeIds.shift();
        }

        // Processa a sinopse (limita tamanho)
        let sinopse = filme.Plot || 'Sinopse não disponível.';
        if (sinopse.length > 400) {
            sinopse = sinopse.substring(0, 400) + '...';
        }

        // Traduz sinopse e gêneros para português
        console.log(`🌐 Traduzindo informações do filme...`);
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
            poster: filme.Poster !== 'N/A' ? filme.Poster : null,
            banner: filme.Poster !== 'N/A' ? filme.Poster : null, // OMDb não tem banner separado
            ondeAssistir: 'Verifique streamings disponíveis',
            diretor: filme.Director || 'Desconhecido',
            atores: filme.Actors || 'N/A',
            premios: filme.Awards || 'N/A',
            imdbId: filme.imdbID
        };
    } catch (error) {
        console.error('Erro ao buscar filme da OMDb API:', error.message);
        return buscarFilmeFallback();
    }
}

// Fallback com filmes populares e imagens do TMDB
function buscarFilmeFallback() {
    const fallbackFilmes = [
        { 
            titulo: 'Interestelar', 
            sinopse: 'Em um futuro onde a Terra está morrendo, um grupo de astronautas viaja através de um buraco de minhoca em busca de um novo lar para a humanidade.', 
            generos: ['Ficção Científica', 'Drama', 'Aventura'], 
            nota: '8.7',
            ano: 2014,
            duracao: '169 min',
            diretor: 'Christopher Nolan',
            ondeAssistir: 'Netflix, Prime Video',
            poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg'
        },
        { 
            titulo: 'O Poderoso Chefão', 
            sinopse: 'A saga da família Corleone mostra a ascensão e queda de Don Vito Corleone e seu filho Michael no mundo da máfia italiana.', 
            generos: ['Crime', 'Drama'], 
            nota: '9.2',
            ano: 1972,
            duracao: '175 min',
            diretor: 'Francis Ford Coppola',
            ondeAssistir: 'Paramount+',
            poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/tmU7GeKVybMWFButWEGl2M4GeiP.jpg'
        },
        { 
            titulo: 'Parasita', 
            sinopse: 'Uma família pobre se infiltra na vida de uma família rica através de empregos, revelando as tensões de classe na sociedade coreana.', 
            generos: ['Drama', 'Thriller', 'Comédia'], 
            nota: '8.6',
            ano: 2019,
            duracao: '132 min',
            diretor: 'Bong Joon-ho',
            ondeAssistir: 'Prime Video',
            poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg'
        },
        { 
            titulo: 'O Cavaleiro das Trevas', 
            sinopse: 'Batman enfrenta o Coringa em uma batalha psicológica que definirá o destino de Gotham City em uma das melhores trilogias de super-heróis.', 
            generos: ['Ação', 'Crime', 'Drama'], 
            nota: '9.0',
            ano: 2008,
            duracao: '152 min',
            diretor: 'Christopher Nolan',
            ondeAssistir: 'Max',
            poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5ber.jpg'
        },
        { 
            titulo: 'Matrix', 
            sinopse: 'Um hacker descobre que a realidade é uma simulação controlada por máquinas e deve liderar a rebelião humana como O Escolhido.', 
            generos: ['Ficção Científica', 'Ação'], 
            nota: '8.7',
            ano: 1999,
            duracao: '136 min',
            diretor: 'Lana e Lilly Wachowski',
            ondeAssistir: 'Max',
            poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg'
        },
        { 
            titulo: 'Vingadores: Ultimato', 
            sinopse: 'Os Vingadores restantes devem se reunir uma última vez para reverter as ações de Thanos e restaurar o equilíbrio do universo.', 
            generos: ['Ação', 'Aventura', 'Ficção Científica'], 
            nota: '8.4',
            ano: 2019,
            duracao: '181 min',
            diretor: 'Anthony e Joe Russo',
            ondeAssistir: 'Disney+',
            poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg'
        },
        { 
            titulo: 'Oppenheimer', 
            sinopse: 'A história de J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica durante a Segunda Guerra Mundial.', 
            generos: ['Drama', 'Biografia', 'História'], 
            nota: '8.4',
            ano: 2023,
            duracao: '180 min',
            diretor: 'Christopher Nolan',
            ondeAssistir: 'Prime Video',
            poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg'
        },
        { 
            titulo: 'Duna', 
            sinopse: 'Paul Atreides deve enfrentar seu destino no planeta desértico Arrakis, lar da especiaria mais valiosa do universo.', 
            generos: ['Ficção Científica', 'Aventura'], 
            nota: '8.0',
            ano: 2021,
            duracao: '155 min',
            diretor: 'Denis Villeneuve',
            ondeAssistir: 'Max',
            poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
            banner: 'https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg'
        }
    ];
    
    // Filtra filmes já recomendados
    let disponiveis = fallbackFilmes.filter(f => !ultimasRecomendacoes.filmeIds.includes(f.titulo));
    if (disponiveis.length === 0) {
        ultimasRecomendacoes.filmeIds = [];
        disponiveis = fallbackFilmes;
    }
    
    const filme = disponiveis[Math.floor(Math.random() * disponiveis.length)];
    ultimasRecomendacoes.filmeIds.push(filme.titulo);
    
    return filme;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📺 FUNÇÃO: ENVIAR RECOMENDAÇÃO DE ANIME
// ═══════════════════════════════════════════════════════════════════════════
async function enviarRecomendacaoAnime(canal) {
    try {
        const anime = await buscarAnimeAleatorio();
        
        const embed = new EmbedBuilder()
            .setColor(CORES.ANIME)
            .setAuthor({
                name: `${EMOJIS.ANIME} RECOMENDAÇÃO DE ANIME`,
                iconURL: NEXSTAR_ICON
            })
            .setTitle(`${EMOJIS.FOGO} ${anime.titulo}`)
            .setURL(anime.url || null)
            .setDescription(`>>> ${anime.sinopse}`)
            .addFields([
                {
                    name: `${EMOJIS.GENERO} Gêneros`,
                    value: anime.generos.slice(0, 4).map(g => `\`${g}\``).join(' • ') || 'N/A',
                    inline: true
                },
                {
                    name: `${EMOJIS.SCORE} Nota`,
                    value: `**${anime.nota}/10** ${'⭐'.repeat(Math.min(5, Math.round((anime.nota || 0)/2)))}`,
                    inline: true
                },
                {
                    name: `${EMOJIS.EPISODIOS} Episódios`,
                    value: `${anime.episodios}`,
                    inline: true
                },
                {
                    name: `${EMOJIS.STATUS} Status`,
                    value: traduzirStatus(anime.status),
                    inline: true
                },
                {
                    name: `${EMOJIS.ANO} Ano`,
                    value: `${anime.ano}`,
                    inline: true
                },
                {
                    name: `${EMOJIS.TV} Tipo`,
                    value: anime.tipo || 'TV',
                    inline: true
                }
            ])
            .setFooter({
                text: `${EMOJIS.ESTRELA} Nexstar Indica • Fonte: MyAnimeList`,
                iconURL: NEXSTAR_ICON
            })
            .setTimestamp();

        // Usa o poster do anime como thumbnail e o banner como imagem principal
        if (anime.poster) {
            embed.setThumbnail(anime.poster);
        }
        if (anime.banner) {
            embed.setImage(anime.banner);
        } else if (anime.poster) {
            embed.setImage(anime.poster);
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`criar_sessao_anime_${(anime.titulo || 'anime').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}`)
                    .setLabel('Criar Sessão')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJIS.CALL)
            );

        // Adiciona botão de link se tiver URL
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
        console.log(`${EMOJIS.SUCESSO} Recomendação de anime enviada: ${anime.titulo}`);
    } catch (error) {
        console.error('Erro ao enviar recomendação de anime:', error);
    }
}

// Função auxiliar para traduzir status
function traduzirStatus(status) {
    const traducoes = {
        'Finished Airing': 'Finalizado',
        'Currently Airing': 'Em exibição',
        'Not yet aired': 'Não lançado',
        'Cancelled': 'Cancelado',
        'Hiatus': 'Em hiato'
    };
    return traducoes[status] || status || 'Desconhecido';
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎬 FUNÇÃO: ENVIAR RECOMENDAÇÃO DE FILME
// ═══════════════════════════════════════════════════════════════════════════
async function enviarRecomendacaoFilme(canal) {
    try {
        const filme = await buscarFilmeAleatorio();
        
        const embed = new EmbedBuilder()
            .setColor(CORES.FILME)
            .setAuthor({
                name: `${EMOJIS.FILME} RECOMENDAÇÃO DE FILME`,
                iconURL: NEXSTAR_ICON
            })
            .setTitle(`${EMOJIS.CLAPPERBOARD} ${filme.titulo}`)
            .setDescription(`>>> ${filme.sinopse}`)
            .addFields([
                {
                    name: `${EMOJIS.GENERO} Gêneros`,
                    value: filme.generos.slice(0, 4).map(g => `\`${g}\``).join(' • ') || 'N/A',
                    inline: true
                },
                {
                    name: `${EMOJIS.SCORE} Nota IMDB`,
                    value: `**${filme.nota}/10** ${'⭐'.repeat(Math.min(5, Math.round((parseFloat(filme.nota) || 0)/2)))}`,
                    inline: true
                },
                {
                    name: `${EMOJIS.DURACAO} Duração`,
                    value: filme.duracao || 'N/A',
                    inline: true
                },
                {
                    name: `${EMOJIS.ANO} Ano`,
                    value: `${filme.ano}`,
                    inline: true
                },
                {
                    name: `🎬 Diretor`,
                    value: filme.diretor || 'N/A',
                    inline: true
                },
                {
                    name: `🎭 Elenco`,
                    value: filme.atores ? filme.atores.substring(0, 50) : 'N/A',
                    inline: true
                }
            ])
            .setFooter({
                text: `${EMOJIS.ESTRELA} Nexstar Indica • Fonte: IMDB/OMDb`,
                iconURL: NEXSTAR_ICON
            })
            .setTimestamp();

        // Usa o poster do filme
        if (filme.poster) {
            embed.setThumbnail(filme.poster);
            embed.setImage(filme.poster);
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`criar_sessao_filme_${(filme.titulo || 'filme').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}`)
                    .setLabel('Criar Sessão')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJIS.CALL)
            );

        // Adiciona botão de link para o IMDB se tiver ID
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
        console.log(`${EMOJIS.SUCESSO} Recomendação de filme enviada: ${filme.titulo}`);
    } catch (error) {
        console.error('Erro ao enviar recomendação de filme:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════
function criarEmbedNexstar(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.cor || CORES.ROXO_ESPACIAL)
        .setTimestamp()
        .setFooter({ 
            text: options.footer || `${EMOJIS.ESTRELA} Nexstar Indica`, 
            iconURL: NEXSTAR_ICON 
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
// 🔔 BOT READY
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    console.log(`${EMOJIS.FOGUETE} Bot Indica ${client.user.tag} está online!`);
    console.log(`📋 Canais configurados:`);
    console.log(`   - Canal Indicações: ${CANAL_INDICA}`);
    console.log(`   - Anime Sessão: ${ANIME_SESSAO}`);
    console.log(`   - Filme Sessão: ${FILME_SESSAO}`);
    console.log(`   - Categoria: ${CATEGORIA_ANIME_FILME}`);

    // 🔍 DIAGNÓSTICO
    console.log(`\n🔍 Diagnóstico de acesso:`);
    console.log(`   Servidores conectados: ${client.guilds.cache.size}`);
    
    for (const [guildId, guild] of client.guilds.cache) {
        console.log(`   📁 Servidor: ${guild.name} (ID: ${guildId})`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⏰ AGENDAMENTO DE RECOMENDAÇÕES (4x ao dia)
    // ═══════════════════════════════════════════════════════════════════════
    
    let canalIndica = null;
    
    // Tenta buscar o canal
    canalIndica = await client.channels.fetch(CANAL_INDICA).catch((err) => {
        console.log(`   ⚠️ Fetch direto falhou: ${err.message}`);
        return null;
    });
    
    // Fallback: buscar no cache
    if (!canalIndica) {
        for (const [, guild] of client.guilds.cache) {
            await guild.channels.fetch().catch(() => {});
            const canal = guild.channels.cache.get(CANAL_INDICA);
            if (canal) {
                canalIndica = canal;
                console.log(`   ✅ Canal encontrado via cache: ${canal.name}`);
                break;
            }
        }
    }
    
    if (canalIndica) {
        console.log(`\n${EMOJIS.SUCESSO} Canal de indicações conectado: ${canalIndica.name}`);
        
        // 09:00 - Recomendação de Anime (manhã)
        cron.schedule('0 9 * * *', async () => {
            console.log(`⏰ [09:00] Enviando recomendação de anime...`);
            await enviarRecomendacaoAnime(canalIndica);
        }, { timezone: 'America/Sao_Paulo' });

        // 13:00 - Recomendação de Filme (almoço)
        cron.schedule('0 13 * * *', async () => {
            console.log(`⏰ [13:00] Enviando recomendação de filme...`);
            await enviarRecomendacaoFilme(canalIndica);
        }, { timezone: 'America/Sao_Paulo' });

        // 18:00 - Recomendação de Anime (tarde)
        cron.schedule('0 18 * * *', async () => {
            console.log(`⏰ [18:00] Enviando recomendação de anime...`);
            await enviarRecomendacaoAnime(canalIndica);
        }, { timezone: 'America/Sao_Paulo' });

        // 22:00 - Recomendação de Filme (noite)
        cron.schedule('0 22 * * *', async () => {
            console.log(`⏰ [22:00] Enviando recomendação de filme...`);
            await enviarRecomendacaoFilme(canalIndica);
        }, { timezone: 'America/Sao_Paulo' });

        console.log(`${EMOJIS.SUCESSO} Agendamentos configurados (09h, 13h, 18h, 22h)`);
        console.log(`${EMOJIS.SUCESSO} APIs configuradas: Jikan (Animes) + TMDB (Filmes)`);
        
        // Envia recomendação inicial após 3 segundos (alternando)
        setTimeout(async () => {
            console.log(`${EMOJIS.FOGUETE} Enviando recomendação inicial...`);
            // Alterna aleatoriamente entre anime e filme
            if (Math.random() > 0.5) {
                await enviarRecomendacaoAnime(canalIndica);
            } else {
                await enviarRecomendacaoFilme(canalIndica);
            }
        }, 3000);
    } else {
        console.error(`\n${EMOJIS.ERRO} Canal de indicações não encontrado: ${CANAL_INDICA}`);
        console.log(`💡 Verifique se o bot tem permissão para ver o canal`);
    }

    // Monitor de memória
    setInterval(() => {
        const used = process.memoryUsage();
        const memMB = Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
        console.log(`💾 Memória: ${memMB}MB | Sessões ativas: ${sessoesPrivadas.size}`);
    }, 300000);
});

// ═══════════════════════════════════════════════════════════════════════════
// 📨 HANDLER: ENTRADA EM CANAIS DE TEXTO (anime-sessao / filme-sessao)
// ═══════════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const canalId = message.channel.id;
    
    if (canalId === ANIME_SESSAO || canalId === FILME_SESSAO) {
        const tipo = canalId === ANIME_SESSAO ? 'anime' : 'filme';
        const emoji = tipo === 'anime' ? EMOJIS.ANIME : EMOJIS.FILME;
        const cor = tipo === 'anime' ? CORES.ANIME : CORES.FILME;
        const tipoTexto = tipo === 'anime' ? 'Anime' : 'Filme';

        const embed = new EmbedBuilder()
            .setColor(cor)
            .setAuthor({
                name: `${emoji} Criar Sessão de ${tipoTexto}`,
                iconURL: NEXSTAR_ICON
            })
            .setDescription(
                `${message.author}, clique no botão abaixo para criar sua **call privada**! ${EMOJIS.PIPOCA}\n\n` +
                `> ${EMOJIS.CALL} Configure o nome do ${tipo} e o limite de pessoas.`
            )
            .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
            .setFooter({
                text: `${EMOJIS.ESTRELA} Nexstar Sessões`,
                iconURL: NEXSTAR_ICON
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`iniciar_sessao_${tipo}`)
                    .setLabel(`Criar Sessão de ${tipoTexto}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJIS.CALL)
            );

        try {
            // Deleta a mensagem do usuário
            await message.delete().catch(() => {});
            
            // Envia a mensagem com botão
            const resposta = await message.channel.send({ 
                embeds: [embed], 
                components: [row]
            });

            // Auto-delete após 30 segundos
            setTimeout(async () => {
                try {
                    await resposta.delete();
                } catch (e) {}
            }, 30000);
        } catch (error) {
            console.error('Erro ao enviar convite de sessão:', error);
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 HANDLER: INTERAÇÕES (Botões e Modais)
// ═══════════════════════════════════════════════════════════════════════════
client.on('interactionCreate', async (interaction) => {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔘 HANDLER DE BOTÕES
    // ═══════════════════════════════════════════════════════════════════════
    if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId === 'cancelar_sessao') {
            try {
                await interaction.message.delete();
            } catch (e) {
                await interaction.reply({ 
                    content: `${EMOJIS.SUCESSO} Tudo bem! Quando quiser criar uma sessão, é só enviar uma mensagem aqui.`,
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        if (customId.startsWith('iniciar_sessao_')) {
            const tipo = customId.replace('iniciar_sessao_', '');
            
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

            const inputLimite = new TextInputBuilder()
                .setCustomId('limite_pessoas')
                .setLabel('Quantas pessoas podem entrar? (1-99)')
                .setPlaceholder('Ex: 5')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNome),
                new ActionRowBuilder().addComponents(inputLimite)
            );

            await interaction.showModal(modal);
            
            try {
                await interaction.message.delete();
            } catch (e) {}
            return;
        }

        if (customId.startsWith('criar_sessao_anime_') || customId.startsWith('criar_sessao_filme_')) {
            const tipo = customId.startsWith('criar_sessao_anime_') ? 'anime' : 'filme';
            const nomeConteudo = customId.replace(`criar_sessao_${tipo}_`, '').replace(/_/g, ' ');

            const modal = new ModalBuilder()
                .setCustomId(`modal_sessao_rapida_${tipo}`)
                .setTitle(`${tipo === 'anime' ? EMOJIS.ANIME : EMOJIS.FILME} Criar Sessão`);

            const inputNome = new TextInputBuilder()
                .setCustomId('nome_conteudo')
                .setLabel(`Nome do ${tipo === 'anime' ? 'Anime' : 'Filme'}`)
                .setValue(nomeConteudo.substring(0, 50))
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const inputLimite = new TextInputBuilder()
                .setCustomId('limite_pessoas')
                .setLabel('Quantas pessoas podem entrar? (1-99)')
                .setPlaceholder('Ex: 5')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNome),
                new ActionRowBuilder().addComponents(inputLimite)
            );

            await interaction.showModal(modal);
            return;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 HANDLER DE MODAIS
    // ═══════════════════════════════════════════════════════════════════════
    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        if (customId.startsWith('modal_sessao_')) {
            const tipo = customId.includes('anime') ? 'anime' : 'filme';
            const nomeConteudo = interaction.fields.getTextInputValue('nome_conteudo');
            const limitePessoas = parseInt(interaction.fields.getTextInputValue('limite_pessoas'));

            if (isNaN(limitePessoas) || limitePessoas < 1 || limitePessoas > 99) {
                return interaction.reply({
                    content: `${EMOJIS.ERRO} O limite de pessoas deve ser um número entre 1 e 99!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const guild = interaction.guild;
                const emoji = tipo === 'anime' ? EMOJIS.ANIME : EMOJIS.FILME;
                const channelName = `${emoji} ${nomeConteudo}`;

                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: CATEGORIA_ANIME_FILME,
                    userLimit: limitePessoas,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        },
                        {
                            id: interaction.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel, 
                                PermissionFlagsBits.Connect, 
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers
                            ],
                        },
                    ],
                });

                sessoesPrivadas.set(channel.id, {
                    ownerId: interaction.user.id,
                    nomeConteudo: nomeConteudo,
                    tipo: tipo,
                    createdAt: new Date()
                });

                const cor = tipo === 'anime' ? CORES.ANIME : CORES.FILME;

                const embed = criarEmbedNexstar({
                    cor: cor,
                    autor: {
                        name: `${EMOJIS.SUCESSO} Sessão Criada com Sucesso!`,
                        iconURL: interaction.user.displayAvatarURL()
                    },
                    descricao: `Sua sessão privada está pronta! ${EMOJIS.PIPOCA}\n\n` +
                        `>>> ${EMOJIS.CALL} **Canal:** ${channel}\n` +
                        `${emoji} **Conteúdo:** ${nomeConteudo}\n` +
                        `${EMOJIS.PESSOAS} **Limite:** ${limitePessoas} pessoas\n` +
                        `${EMOJIS.PRIVADO} **Status:** Privado`,
                    thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
                    campos: [
                        {
                            name: `${EMOJIS.NOTA} Como convidar amigos`,
                            value: '>>> Clique com o botão direito no canal e selecione "Convidar para Canal".',
                            inline: false
                        }
                    ],
                    footer: `${EMOJIS.ESTRELA} Nexstar Sessões • A call será deletada quando você sair`
                });

                await interaction.editReply({ embeds: [embed] });
                console.log(`${EMOJIS.SUCESSO} Sessão criada: "${nomeConteudo}" por ${interaction.user.tag}`);

            } catch (error) {
                console.error('Erro ao criar sessão:', error);
                
                const embedErro = criarEmbedNexstar({
                    cor: CORES.ERRO,
                    titulo: `${EMOJIS.ERRO} Erro ao Criar Sessão`,
                    descricao: `Ocorreu um erro ao criar sua sessão.\n\n> \`${error.message}\``
                });

                await interaction.editReply({ embeds: [embedErro] });
            }
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔊 HANDLER: VOZ (Limpa sessões quando dono sai)
// ═══════════════════════════════════════════════════════════════════════════
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const sessao = sessoesPrivadas.get(oldState.channelId);
        
        if (sessao && sessao.ownerId === oldState.member.id) {
            try {
                const canal = await client.channels.fetch(oldState.channelId).catch(() => null);
                
                if (canal) {
                    await canal.delete('Dono da sessão saiu');
                    sessoesPrivadas.delete(oldState.channelId);
                    console.log(`🗑️ Sessão "${sessao.nomeConteudo}" deletada (dono saiu)`);
                }
            } catch (error) {
                console.error('Erro ao deletar sessão:', error);
            }
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 LIMPEZA AUTOMÁTICA
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
        console.log(`🧹 Limpeza: ${cleanedCount} sessões órfãs removidas`);
    }
}, 600000);

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
client.login(TOKEN);

console.log(`${EMOJIS.FOGUETE} Iniciando Bot Indica com APIs...`);
console.log(`📡 APIs: Jikan (MyAnimeList) + TMDB (The Movie Database)`);
