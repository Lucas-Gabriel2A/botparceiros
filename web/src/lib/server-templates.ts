// ═══════════════════════════════════════════════════════════════
// 🏗️ Server Builder Templates
// 6 templates ricos e detalhados para criação de servidores Discord
// ═══════════════════════════════════════════════════════════════

export interface ServerChannel {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    description?: string;
    user_limit?: number;
    is_private?: boolean;
    allowed_roles?: string[]; // Array of Role IDs (View Channel)
    is_readonly?: boolean; // If true, @everyone cannot send messages
    writable_roles?: string[]; // Roles that can send messages if is_readonly is true
    slowmode?: number;
    nsfw?: boolean;
}

export interface ServerCategory {
    id: string;
    name: string;
    channels: ServerChannel[];
}

export interface ServerRole {
    id: string;
    name: string;
    color: string;
    permissions: string[];
    hoist?: boolean;
    mentionable?: boolean;
}

export const DISCORD_PERMISSIONS = {
    General: [
        { key: 'ViewChannel', label: 'Ver Canais' },
        { key: 'ManageChannels', label: 'Gerenciar Canais' },
        { key: 'ManageRoles', label: 'Gerenciar Cargos' },
        { key: 'ManageEmojisAndStickers', label: 'Gerenciar Emojis' },
        { key: 'ViewAuditLog', label: 'Ver Registro de Auditoria' },
        { key: 'ManageWebhooks', label: 'Gerenciar Webhooks' },
        { key: 'ManageGuild', label: 'Gerenciar Servidor' },
    ],
    Membership: [
        { key: 'CreateInstantInvite', label: 'Criar Convite' },
        { key: 'ChangeNickname', label: 'Alterar Apelido' },
        { key: 'ManageNicknames', label: 'Gerenciar Apelidos' },
        { key: 'KickMembers', label: 'Expulsar Membros' },
        { key: 'BanMembers', label: 'Banir Membros' },
        { key: 'ModerateMembers', label: 'Castigar Membros (Timeout)' },
    ],
    Text: [
        { key: 'SendMessages', label: 'Enviar Mensagens' },
        { key: 'SendMessagesInThreads', label: 'Enviar em Tópicos' },
        { key: 'CreatePublicThreads', label: 'Criar Tópicos Públicos' },
        { key: 'CreatePrivateThreads', label: 'Criar Tópicos Privados' },
        { key: 'EmbedLinks', label: 'Enviar Links' },
        { key: 'AttachFiles', label: 'Anexar Arquivos' },
        { key: 'AddReactions', label: 'Adicionar Reações' },
        { key: 'UseExternalEmojis', label: 'Usar Emojis Externos' },
        { key: 'MentionEveryone', label: 'Mencionar @everyone' },
        { key: 'ManageMessages', label: 'Gerenciar Mensagens' },
        { key: 'ManageThreads', label: 'Gerenciar Tópicos' },
        { key: 'ReadMessageHistory', label: 'Ver Histórico' },
    ],
    Voice: [
        { key: 'Connect', label: 'Conectar' },
        { key: 'Speak', label: 'Falar' },
        { key: 'Stream', label: 'Vídeo' },
        { key: 'UseVAD', label: 'Detecção de Voz' },
        { key: 'PrioritySpeaker', label: 'Voz Prioritária' },
        { key: 'MuteMembers', label: 'Silenciar Membros' },
        { key: 'DeafenMembers', label: 'Ensurdecer Membros' },
        { key: 'MoveMembers', label: 'Mover Membros' },
    ],
    Advanced: [
        { key: 'Administrator', label: 'Administrador' },
    ]
};

export interface ServerSchema {
    roles: ServerRole[];
    categories: ServerCategory[];
}

export interface ServerTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    gradient: string;
    tags: string[];
    schema: ServerSchema;
}

let _idCounter = 0;
function uid(): string {
    return `item_${++_idCounter}_${Date.now().toString(36)}`;
}

// ═══════════════════════════════════════════════════════════════
// 1. COMUNIDADE
// ═══════════════════════════════════════════════════════════════
const comunidade: ServerTemplate = {
    id: 'comunidade',
    name: 'Comunidade',
    description: 'Servidor social com fóruns, eventos e mídia. Ideal para criadores de conteúdo e comunidades.',
    icon: 'Users',
    color: '#5865F2',
    gradient: 'from-indigo-600 to-purple-600',
    tags: ['Social', 'Eventos', 'Mídia'],
    schema: {
        roles: [
            { id: uid(), name: '👑 Fundador', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '⚔️ Moderador', color: '#00D4FF', permissions: ['ManageMessages', 'KickMembers'], hoist: true },
            { id: uid(), name: '💎 VIP', color: '#9B59B6', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '🎨 Criador', color: '#E91E63', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '🌟 Membro', color: '#2ECC71', permissions: ['SendMessages'] },
        ],
        categories: [
            {
                id: uid(), name: '━━━ 📌 INFORMAÇÕES ━━━', channels: [
                    { id: uid(), name: '📜┃regras', type: 'text', description: 'Regras e diretrizes da comunidade' },
                    { id: uid(), name: '📢┃anúncios', type: 'announcement', description: 'Novidades e comunicados oficiais' },
                    { id: uid(), name: '📋┃cargos', type: 'text', description: 'Como obter cargos especiais' },
                    { id: uid(), name: '👋┃apresente-se', type: 'text', description: 'Apresente-se para a comunidade' },
                ]
            },
            {
                id: uid(), name: '━━━ 💬 BATE-PAPO ━━━', channels: [
                    { id: uid(), name: '💬┃chat-geral', type: 'text', description: 'Conversa livre' },
                    { id: uid(), name: '🎮┃games', type: 'text', description: 'Discussões sobre jogos' },
                    { id: uid(), name: '🎵┃música', type: 'text', description: 'Compartilhe músicas e playlists' },
                    { id: uid(), name: '📸┃mídia', type: 'text', description: 'Fotos, vídeos e memes' },
                    { id: uid(), name: '🤖┃bot-commands', type: 'text', description: 'Use comandos de bots aqui' },
                ]
            },
            {
                id: uid(), name: '━━━ 📰 FÓRUM ━━━', channels: [
                    { id: uid(), name: '💡┃sugestões', type: 'forum', description: 'Sugira melhorias para o servidor' },
                    { id: uid(), name: '🐛┃bugs', type: 'forum', description: 'Reporte problemas e bugs' },
                    { id: uid(), name: '📝┃discussões', type: 'forum', description: 'Tópicos abertos para debate' },
                ]
            },
            {
                id: uid(), name: '━━━ 🎉 EVENTOS ━━━', channels: [
                    { id: uid(), name: '📅┃agenda', type: 'text', description: 'Calendário de eventos' },
                    { id: uid(), name: '🏆┃sorteios', type: 'text', description: 'Participe de sorteios' },
                    { id: uid(), name: '🎤┃palco-eventos', type: 'stage', description: 'Eventos ao vivo' },
                ]
            },
            {
                id: uid(), name: '━━━ 💎 VIP ━━━', channels: [
                    { id: uid(), name: '💎┃chat-vip', type: 'text', description: 'Chat exclusivo para VIPs', is_private: true },
                    { id: uid(), name: '🎁┃benefícios', type: 'text', description: 'Benefícios exclusivos', is_private: true },
                ]
            },
            {
                id: uid(), name: '━━━ 🔊 VOZ ━━━', channels: [
                    { id: uid(), name: '🔊┃lounge-geral', type: 'voice', user_limit: 0 },
                    { id: uid(), name: '🎮┃gaming', type: 'voice', user_limit: 5 },
                    { id: uid(), name: '🎵┃música', type: 'voice', user_limit: 3 },
                    { id: uid(), name: '💎┃vip-lounge', type: 'voice', user_limit: 10, is_private: true },
                ]
            },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// 2. GAMING
// ═══════════════════════════════════════════════════════════════
const gaming: ServerTemplate = {
    id: 'gaming',
    name: 'Gaming',
    description: 'Servidor gamer completo com salas por jogo, ranking, torneios e squads.',
    icon: 'Gamepad2',
    color: '#E74C3C',
    gradient: 'from-red-600 to-orange-600',
    tags: ['Jogos', 'Competitivo', 'Squads'],
    schema: {
        roles: [
            { id: uid(), name: '🏆 Líder', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '⚔️ Admin', color: '#E74C3C', permissions: ['ManageMessages', 'KickMembers', 'BanMembers'], hoist: true },
            { id: uid(), name: '🛡️ Moderador', color: '#3498DB', permissions: ['ManageMessages', 'KickMembers'], hoist: true },
            { id: uid(), name: '🎖️ Veterano', color: '#9B59B6', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '💀 Tryhard', color: '#E91E63', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '🎮 Jogador', color: '#2ECC71', permissions: ['SendMessages'] },
        ],
        categories: [
            {
                id: uid(), name: '━━━ 📌 HUB ━━━', channels: [
                    { id: uid(), name: '📜┃regras', type: 'text', description: 'Regras do servidor' },
                    { id: uid(), name: '📢┃anúncios', type: 'announcement', description: 'Novidades e updates' },
                    { id: uid(), name: '🏆┃ranking', type: 'text', description: 'Ranking de jogadores' },
                    { id: uid(), name: '📋┃lfg-procurando-grupo', type: 'text', description: 'Procure jogadores para jogar' },
                ]
            },
            {
                id: uid(), name: '━━━ 💬 GERAL ━━━', channels: [
                    { id: uid(), name: '💬┃chat-geral', type: 'text', description: 'Conversa livre' },
                    { id: uid(), name: '📸┃clips-plays', type: 'text', description: 'Compartilhe suas melhores jogadas' },
                    { id: uid(), name: '🎭┃memes-gaming', type: 'text', description: 'Memes de jogos' },
                    { id: uid(), name: '🤖┃bot-commands', type: 'text', description: 'Comandos de bots' },
                ]
            },
            {
                id: uid(), name: '━━━ 🎯 VALORANT ━━━', channels: [
                    { id: uid(), name: '💬┃valorant-chat', type: 'text', description: 'Discussões sobre Valorant' },
                    { id: uid(), name: '📊┃valorant-stats', type: 'text', description: 'Estatísticas e ranks' },
                    { id: uid(), name: '🔊┃valorant-duo', type: 'voice', user_limit: 2 },
                    { id: uid(), name: '🔊┃valorant-squad', type: 'voice', user_limit: 5 },
                ]
            },
            {
                id: uid(), name: '━━━ ⚽ FORTNITE ━━━', channels: [
                    { id: uid(), name: '💬┃fortnite-chat', type: 'text', description: 'Tudo sobre Fortnite' },
                    { id: uid(), name: '🗺️┃fortnite-maps', type: 'text', description: 'Mapas criativos e códigos' },
                    { id: uid(), name: '🔊┃fortnite-duo', type: 'voice', user_limit: 2 },
                    { id: uid(), name: '🔊┃fortnite-squad', type: 'voice', user_limit: 4 },
                ]
            },
            {
                id: uid(), name: '━━━ 🏗️ MINECRAFT ━━━', channels: [
                    { id: uid(), name: '💬┃minecraft-chat', type: 'text', description: 'Discussões sobre Minecraft' },
                    { id: uid(), name: '🏠┃builds', type: 'text', description: 'Mostre suas construções' },
                    { id: uid(), name: '🔊┃minecraft-coop', type: 'voice', user_limit: 10 },
                ]
            },
            {
                id: uid(), name: '━━━ 🏆 TORNEIOS ━━━', channels: [
                    { id: uid(), name: '📢┃torneios-info', type: 'announcement', description: 'Informações de torneios' },
                    { id: uid(), name: '📝┃inscrições', type: 'text', description: 'Inscreva-se nos torneios' },
                    { id: uid(), name: '🎤┃palco-finais', type: 'stage', description: 'Transmissão das finais' },
                ]
            },
            {
                id: uid(), name: '━━━ 🔊 SALAS GERAIS ━━━', channels: [
                    { id: uid(), name: '🔊┃lounge', type: 'voice', user_limit: 0 },
                    { id: uid(), name: '🎵┃música', type: 'voice', user_limit: 5 },
                    { id: uid(), name: '💤┃afk', type: 'voice', user_limit: 0 },
                ]
            },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// 3. E-COMMERCE / LOJA
// ═══════════════════════════════════════════════════════════════
const ecommerce: ServerTemplate = {
    id: 'ecommerce',
    name: 'E-commerce / Loja',
    description: 'Servidor para lojas online com catálogo, suporte ao cliente e promoções.',
    icon: 'ShoppingCart',
    color: '#2ECC71',
    gradient: 'from-emerald-600 to-teal-600',
    tags: ['Vendas', 'Produtos', 'Suporte'],
    schema: {
        roles: [
            { id: uid(), name: '👑 Dono', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '📦 Equipe', color: '#3498DB', permissions: ['ManageMessages'], hoist: true },
            { id: uid(), name: '💳 Cliente VIP', color: '#E91E63', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '🛒 Cliente', color: '#2ECC71', permissions: ['SendMessages'] },
        ],
        categories: [
            {
                id: uid(), name: '━━━ 🏪 LOJA ━━━', channels: [
                    { id: uid(), name: '📜┃regras-de-compra', type: 'text', description: 'Termos e condições de compra' },
                    { id: uid(), name: '📢┃novidades', type: 'announcement', description: 'Novos produtos e lançamentos' },
                    { id: uid(), name: '⭐┃depoimentos', type: 'text', description: 'Avaliações de clientes' },
                    { id: uid(), name: '📸┃comprovantes', type: 'text', description: 'Comprovantes de entrega' },
                ]
            },
            {
                id: uid(), name: '━━━ 🛍️ CATÁLOGO ━━━', channels: [
                    { id: uid(), name: '👕┃roupas', type: 'text', description: 'Catálogo de roupas' },
                    { id: uid(), name: '👟┃calçados', type: 'text', description: 'Catálogo de calçados' },
                    { id: uid(), name: '📱┃eletrônicos', type: 'text', description: 'Eletrônicos e acessórios' },
                    { id: uid(), name: '🔥┃promoções', type: 'text', description: 'Ofertas e descontos especiais' },
                ]
            },
            {
                id: uid(), name: '━━━ 💬 COMUNIDADE ━━━', channels: [
                    { id: uid(), name: '💬┃chat-geral', type: 'text', description: 'Conversa livre entre clientes' },
                    { id: uid(), name: '📸┃unboxing', type: 'text', description: 'Mostre seu unboxing' },
                    { id: uid(), name: '💡┃sugestões', type: 'forum', description: 'Sugira novos produtos' },
                ]
            },
            {
                id: uid(), name: '━━━ 🎧 SUPORTE ━━━', channels: [
                    { id: uid(), name: '❓┃dúvidas', type: 'text', description: 'Perguntas frequentes' },
                    { id: uid(), name: '🎫┃abrir-ticket', type: 'text', description: 'Abra um ticket de suporte' },
                    { id: uid(), name: '📦┃rastreamento', type: 'text', description: 'Rastreie sua encomenda' },
                    { id: uid(), name: '🔊┃atendimento', type: 'voice', user_limit: 2 },
                ]
            },
            {
                id: uid(), name: '━━━ 💎 VIP ━━━', channels: [
                    { id: uid(), name: '💎┃ofertas-exclusivas', type: 'text', description: 'Ofertas só para VIPs', is_private: true },
                    { id: uid(), name: '🎁┃brindes', type: 'text', description: 'Brindes e recompensas', is_private: true },
                ]
            },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// 4. SUPORTE / HELPDESK
// ═══════════════════════════════════════════════════════════════
const suporte: ServerTemplate = {
    id: 'suporte',
    name: 'Suporte / Helpdesk',
    description: 'Servidor de atendimento com tickets, FAQ e base de conhecimento.',
    icon: 'Headphones',
    color: '#3498DB',
    gradient: 'from-blue-600 to-cyan-600',
    tags: ['Atendimento', 'Tickets', 'FAQ'],
    schema: {
        roles: [
            { id: uid(), name: '👑 Gerente', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '🎧 Suporte Sênior', color: '#E74C3C', permissions: ['ManageMessages', 'KickMembers'], hoist: true },
            { id: uid(), name: '💬 Suporte', color: '#3498DB', permissions: ['ManageMessages'], hoist: true },
            { id: uid(), name: '🛡️ Moderador', color: '#2ECC71', permissions: ['ManageMessages'], hoist: true },
            { id: uid(), name: '👤 Usuário', color: '#95A5A6', permissions: ['SendMessages'] },
        ],
        categories: [
            {
                id: uid(), name: '━━━ 📌 CENTRAL ━━━', channels: [
                    { id: uid(), name: '📜┃regras', type: 'text', description: 'Regras do servidor de suporte' },
                    { id: uid(), name: '📢┃avisos', type: 'announcement', description: 'Manutenções e avisos importantes' },
                    { id: uid(), name: '📊┃status-serviço', type: 'text', description: 'Status atual dos serviços' },
                ]
            },
            {
                id: uid(), name: '━━━ 📚 BASE DE CONHECIMENTO ━━━', channels: [
                    { id: uid(), name: '❓┃faq', type: 'text', description: 'Perguntas frequentes' },
                    { id: uid(), name: '📖┃tutoriais', type: 'text', description: 'Guias e tutoriais passo a passo' },
                    { id: uid(), name: '🔧┃solução-problemas', type: 'forum', description: 'Soluções para problemas comuns' },
                    { id: uid(), name: '📝┃documentação', type: 'text', description: 'Documentação técnica' },
                ]
            },
            {
                id: uid(), name: '━━━ 🎫 TICKETS ━━━', channels: [
                    { id: uid(), name: '🎫┃abrir-ticket', type: 'text', description: 'Abra um novo ticket de suporte' },
                    { id: uid(), name: '📋┃tickets-abertos', type: 'text', description: 'Tickets em andamento' },
                    { id: uid(), name: '✅┃tickets-resolvidos', type: 'text', description: 'Histórico de tickets resolvidos' },
                ]
            },
            {
                id: uid(), name: '━━━ 💬 COMUNIDADE ━━━', channels: [
                    { id: uid(), name: '💬┃chat-geral', type: 'text', description: 'Chat livre entre usuários' },
                    { id: uid(), name: '💡┃sugestões', type: 'forum', description: 'Sugira melhorias' },
                    { id: uid(), name: '🐛┃bugs', type: 'forum', description: 'Reporte bugs e problemas' },
                ]
            },
            {
                id: uid(), name: '━━━ 🔊 ATENDIMENTO ━━━', channels: [
                    { id: uid(), name: '🔊┃sala-de-espera', type: 'voice', user_limit: 0 },
                    { id: uid(), name: '🎧┃atendimento-1', type: 'voice', user_limit: 2 },
                    { id: uid(), name: '🎧┃atendimento-2', type: 'voice', user_limit: 2 },
                    { id: uid(), name: '🎧┃atendimento-vip', type: 'voice', user_limit: 2, is_private: true },
                ]
            },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// 5. ESCOLA / EDUCAÇÃO
// ═══════════════════════════════════════════════════════════════
const escola: ServerTemplate = {
    id: 'escola',
    name: 'Escola / Educação',
    description: 'Ambiente educacional com salas por matéria, fóruns de dúvidas e aulas ao vivo.',
    icon: 'GraduationCap',
    color: '#F39C12',
    gradient: 'from-amber-600 to-yellow-500',
    tags: ['Ensino', 'Aulas', 'Estudos'],
    schema: {
        roles: [
            { id: uid(), name: '🎓 Diretor', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '📚 Professor', color: '#E74C3C', permissions: ['ManageMessages'], hoist: true },
            { id: uid(), name: '📝 Monitor', color: '#3498DB', permissions: ['ManageMessages'], hoist: true },
            { id: uid(), name: '🏅 Destaque', color: '#9B59B6', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '📖 Aluno', color: '#2ECC71', permissions: ['SendMessages'] },
        ],
        categories: [
            {
                id: uid(), name: '━━━ 🏫 ESCOLA ━━━', channels: [
                    { id: uid(), name: '📜┃regras-da-escola', type: 'text', description: 'Regras e normas' },
                    { id: uid(), name: '📢┃avisos', type: 'announcement', description: 'Comunicados oficiais' },
                    { id: uid(), name: '📅┃calendário', type: 'text', description: 'Calendário de aulas e provas' },
                    { id: uid(), name: '🏆┃quadro-de-honra', type: 'text', description: 'Melhores alunos' },
                ]
            },
            {
                id: uid(), name: '━━━ 📐 EXATAS ━━━', channels: [
                    { id: uid(), name: '➗┃matemática', type: 'text', description: 'Discussões de matemática' },
                    { id: uid(), name: '⚡┃física', type: 'text', description: 'Discussões de física' },
                    { id: uid(), name: '🧪┃química', type: 'text', description: 'Discussões de química' },
                    { id: uid(), name: '💻┃programação', type: 'text', description: 'Lógica e programação' },
                ]
            },
            {
                id: uid(), name: '━━━ 📖 HUMANAS ━━━', channels: [
                    { id: uid(), name: '📜┃história', type: 'text', description: 'Discussões de história' },
                    { id: uid(), name: '🌍┃geografia', type: 'text', description: 'Discussões de geografia' },
                    { id: uid(), name: '📚┃português', type: 'text', description: 'Português e redação' },
                    { id: uid(), name: '🇬🇧┃inglês', type: 'text', description: 'Aulas e prática de inglês' },
                    { id: uid(), name: '🧠┃filosofia', type: 'text', description: 'Debates filosóficos' },
                ]
            },
            {
                id: uid(), name: '━━━ ❓ DÚVIDAS ━━━', channels: [
                    { id: uid(), name: '❓┃dúvidas-gerais', type: 'forum', description: 'Pergunte suas dúvidas' },
                    { id: uid(), name: '📝┃exercícios', type: 'forum', description: 'Ajuda com exercícios' },
                    { id: uid(), name: '📄┃materiais', type: 'text', description: 'PDFs, apostilas e recursos' },
                ]
            },
            {
                id: uid(), name: '━━━ 💬 INTERVALO ━━━', channels: [
                    { id: uid(), name: '💬┃chat-geral', type: 'text', description: 'Conversa no intervalo' },
                    { id: uid(), name: '🎮┃games', type: 'text', description: 'Jogos e diversão' },
                    { id: uid(), name: '📸┃memes', type: 'text', description: 'Memes e entretenimento' },
                ]
            },
            {
                id: uid(), name: '━━━ 🎓 SALAS DE AULA ━━━', channels: [
                    { id: uid(), name: '🎤┃auditório', type: 'stage', description: 'Aulas e palestras ao vivo' },
                    { id: uid(), name: '🔊┃sala-de-aula-1', type: 'voice', user_limit: 30 },
                    { id: uid(), name: '🔊┃sala-de-aula-2', type: 'voice', user_limit: 30 },
                    { id: uid(), name: '📖┃sala-de-estudos', type: 'voice', user_limit: 10 },
                    { id: uid(), name: '🤝┃grupo-de-trabalho', type: 'voice', user_limit: 5 },
                ]
            },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// 6. STARTUP / EMPRESA
// ═══════════════════════════════════════════════════════════════
const startup: ServerTemplate = {
    id: 'startup',
    name: 'Startup / Empresa',
    description: 'Workspace corporativo com departamentos, daily standups, OKRs e canais por equipe.',
    icon: 'Rocket',
    color: '#9B59B6',
    gradient: 'from-purple-600 to-pink-600',
    tags: ['Trabalho', 'Equipes', 'Produtividade'],
    schema: {
        roles: [
            { id: uid(), name: '👑 CEO', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '🏗️ CTO', color: '#E74C3C', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '📊 Gerente', color: '#3498DB', permissions: ['ManageMessages', 'KickMembers'], hoist: true },
            { id: uid(), name: '💻 Desenvolvedor', color: '#2ECC71', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '🎨 Designer', color: '#E91E63', permissions: ['SendMessages'], hoist: true },
            { id: uid(), name: '📞 Comercial', color: '#F39C12', permissions: ['SendMessages'], hoist: true },
        ],
        categories: [
            {
                id: uid(), name: '━━━ 🏢 EMPRESA ━━━', channels: [
                    { id: uid(), name: '📢┃comunicados', type: 'announcement', description: 'Comunicados oficiais da empresa' },
                    { id: uid(), name: '📋┃handbook', type: 'text', description: 'Manual do colaborador' },
                    { id: uid(), name: '🎯┃okrs-metas', type: 'text', description: 'Objetivos e metas do trimestre' },
                    { id: uid(), name: '🏆┃conquistas', type: 'text', description: 'Celebre as vitórias da equipe' },
                ]
            },
            {
                id: uid(), name: '━━━ 💻 DESENVOLVIMENTO ━━━', channels: [
                    { id: uid(), name: '💻┃dev-geral', type: 'text', description: 'Discussões de desenvolvimento' },
                    { id: uid(), name: '🔀┃pull-requests', type: 'text', description: 'PRs e code reviews' },
                    { id: uid(), name: '🐛┃bugs-tracking', type: 'forum', description: 'Rastreamento de bugs' },
                    { id: uid(), name: '🚀┃deploy-logs', type: 'text', description: 'Logs de deploy e CI/CD' },
                ]
            },
            {
                id: uid(), name: '━━━ 🎨 DESIGN ━━━', channels: [
                    { id: uid(), name: '🎨┃design-geral', type: 'text', description: 'Discussões de design' },
                    { id: uid(), name: '📐┃wireframes', type: 'text', description: 'Wireframes e mockups' },
                    { id: uid(), name: '🎭┃feedback-design', type: 'forum', description: 'Feedback sobre designs' },
                ]
            },
            {
                id: uid(), name: '━━━ 📊 COMERCIAL ━━━', channels: [
                    { id: uid(), name: '📊┃vendas', type: 'text', description: 'Pipeline de vendas' },
                    { id: uid(), name: '🤝┃leads', type: 'text', description: 'Novos leads e oportunidades' },
                    { id: uid(), name: '📈┃métricas', type: 'text', description: 'KPIs e métricas de vendas' },
                ]
            },
            {
                id: uid(), name: '━━━ 💬 SOCIAL ━━━', channels: [
                    { id: uid(), name: '💬┃água-do-galão', type: 'text', description: 'Papo informal, como o cafezinho' },
                    { id: uid(), name: '🎮┃games-hora-livre', type: 'text', description: 'Jogos e diversão' },
                    { id: uid(), name: '🎉┃aniversários', type: 'text', description: 'Celebre os aniversários da equipe' },
                ]
            },
            {
                id: uid(), name: '━━━ 🔊 REUNIÕES ━━━', channels: [
                    { id: uid(), name: '☀️┃daily-standup', type: 'voice', user_limit: 15 },
                    { id: uid(), name: '📋┃planning', type: 'voice', user_limit: 10 },
                    { id: uid(), name: '🔊┃sala-reunião-1', type: 'voice', user_limit: 5 },
                    { id: uid(), name: '🔊┃sala-reunião-2', type: 'voice', user_limit: 5 },
                    { id: uid(), name: '🎤┃all-hands', type: 'stage', description: 'Reuniões gerais da empresa' },
                ]
            },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════
export const SERVER_TEMPLATES: ServerTemplate[] = [
    comunidade,
    gaming,
    ecommerce,
    suporte,
    escola,
    startup,
];

/** Creates a deep clone of a template schema with fresh IDs */
export function cloneSchemaWithNewIds(schema: ServerSchema): ServerSchema {
    return {
        roles: schema.roles.map(r => ({
            ...r,
            id: uid(),
        })),
        categories: schema.categories.map(cat => ({
            ...cat,
            id: uid(),
            channels: cat.channels.map(ch => ({
                ...ch,
                id: uid(),
            })),
        })),
    };
}

/** Creates an empty schema for "from scratch" mode */
export function createEmptySchema(): ServerSchema {
    return {
        roles: [
            { id: uid(), name: '👑 Admin', color: '#FFD700', permissions: ['Administrator'], hoist: true },
            { id: uid(), name: '🌟 Membro', color: '#2ECC71', permissions: ['SendMessages'] },
        ],
        categories: [
            {
                id: uid(),
                name: '━━━ 📌 GERAL ━━━',
                channels: [
                    { id: uid(), name: '💬┃chat-geral', type: 'text', description: 'Chat geral do servidor' },
                    { id: uid(), name: '🔊┃voz-geral', type: 'voice', user_limit: 0 },
                ],
            },
        ],
    };
}
