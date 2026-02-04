"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverBuilder = exports.ServerBuilderService = void 0;
const discord_js_1 = require("discord.js");
const llm_service_1 = require("./llm.service");
const index_1 = require("./index");
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 PROMPTS PREMIUM PARA LLM
// ═══════════════════════════════════════════════════════════════════════════
const SERVER_BUILDER_PROMPT = `
Você é um DESIGNER de Servidores Discord PREMIUM.

REGRAS OBRIGATÓRIAS DE NOMEAÇÃO:

1. CATEGORIAS devem ter decoração nos DOIS lados:
   CORRETO: "━━━ 📌 INFORMAÇÕES ━━━"
   CORRETO: "✦ Centro de Ajuda ✦"  
   CORRETO: "╔═══ 🎭 SOCIAL ═══╗"
   ERRADO: "Informações" (sem decoração)
   ERRADO: "📌 Informações" (só um lado)

2. CANAIS DE TEXTO devem ter: emoji + ┃ + nome
   CORRETO: "📜┃regras"
   CORRETO: "�┃chat-geral"
   CORRETO: "🎫┃abrir-ticket"
   ERRADO: "📜-regras" (hífen no lugar de ┃)
   ERRADO: "regras" (sem emoji)

3. CANAIS DE VOZ devem ter: emoji + ┃ + nome
   CORRETO: "🔊┃lounge-geral"
   CORRETO: "🎵┃sala-de-musica"
   ERRADO: "🔊-lounge" (hífen no lugar de ┃)

4. Use user_limit em canais de voz:
   - 0 = sem limite
   - 2 = duo
   - 5-10 = grupos
   - 99 = eventos

EXEMPLO DE JSON PERFEITO:
{
  "roles": [
    { "name": "👑 Fundador", "color": "#FFD700", "permissions": ["Administrator"], "hoist": true },
    { "name": "⚔️ Staff", "color": "#00D4FF", "permissions": ["ManageMessages", "KickMembers"], "hoist": true },
    { "name": "💎 VIP", "color": "#9B59B6", "permissions": ["SendMessages"], "hoist": true },
    { "name": "🌟 Membro", "color": "#2ECC71", "permissions": ["SendMessages"] }
  ],
  "categories": [
    {
      "name": "━━━ 📌 INFORMAÇÕES ━━━",
      "channels": [
        { "name": "📜┃regras", "type": "text", "description": "Regras do servidor" },
        { "name": "📢┃avisos", "type": "announcement", "description": "Avisos oficiais" },
        { "name": "🚀┃portal", "type": "text", "description": "Bem-vindo ao servidor" }
      ]
    },
    {
      "name": "✦ COMUNIDADE ✦",
      "channels": [
        { "name": "💬┃chat-geral", "type": "text" },
        { "name": "🎮┃gaming", "type": "text" },
        { "name": "�┃midias", "type": "text" },
        { "name": "🎭┃off-topic", "type": "text" }
      ]
    },
    {
      "name": "╔═══ 🎫 SUPORTE ═══╗",
      "channels": [
        { "name": "🎫┃abrir-ticket", "type": "text" },
        { "name": "❓┃faq", "type": "text" },
        { "name": "�┃sugestoes", "type": "text" }
      ]
    },
    {
      "name": "》🔊 LOUNGE《",
      "channels": [
        { "name": "🔊┃conversa-geral", "type": "voice", "user_limit": 0 },
        { "name": "🎵┃musica", "type": "voice", "user_limit": 8 },
        { "name": "🎮┃gaming-duo", "type": "voice", "user_limit": 2 },
        { "name": "💎┃vip-lounge", "type": "voice", "user_limit": 5, "is_private": true }
      ]
    }
  ]
}

REGRAS TÉCNICAS:
- Responda APENAS com JSON válido
- "type": "text", "voice", "stage", "forum", ou "announcement"
- "color": formato hex (#RRGGBB)
- "permissions": Administrator, KickMembers, BanMembers, ManageMessages, SendMessages
- Use o caractere ┃ (não | nem - nem :)
`;
const SERVER_ADJUSTER_PROMPT = `
Você é um ADMINISTRADOR de Servidores Discord.
Analise o pedido e gere AÇÕES para modificar o servidor.

REGRAS DE NOMEAÇÃO:
- Categorias: "━━━ 📌 NOME ━━━" ou "✦ NOME ✦"
- Canais: "📢┃nome-do-canal" (emoji + ┃ + nome)

AÇÕES DISPONÍVEIS:
- create_category: criar categoria decorada
- create_channel: criar canal com emoji┃nome
- rename_category/rename_channel: renomear
- delete_category/delete_channel: deletar
- create_role: criar cargo colorido
- set_user_limit: definir limite de voz

EXEMPLO JSON:
{
  "actions": [
    { "type": "create_category", "name": "━━━ 🎮 GAMING ━━━" },
    { "type": "create_channel", "category_name": "GAMING", "name": "🎮┃valorant", "channel_type": "text" },
    { "type": "create_channel", "category_name": "GAMING", "name": "🔊┃sala-valorant", "channel_type": "voice", "user_limit": 5 }
  ],
  "message": "Criada categoria Gaming com canais de texto e voz"
}

Responda APENAS com JSON válido.
`;
// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ SERVER BUILDER SERVICE
// ═══════════════════════════════════════════════════════════════════════════
class ServerBuilderService {
    /**
     * Mapeia tipo de canal do schema para ChannelType do Discord.js
     */
    getChannelType(type) {
        switch (type) {
            case 'voice': return discord_js_1.ChannelType.GuildVoice;
            case 'stage': return discord_js_1.ChannelType.GuildStageVoice;
            case 'forum': return discord_js_1.ChannelType.GuildForum;
            case 'announcement': return discord_js_1.ChannelType.GuildAnnouncement;
            default: return discord_js_1.ChannelType.GuildText;
        }
    }
    /**
     * Pós-processador: Garante que todos os nomes sigam o padrão decorativo
     */
    postProcessSchema(schema) {
        // Emojis para cada tipo de canal
        const channelEmojis = {
            'regra': ['📜', '📋', '⚖️'],
            'aviso': ['📢', '🔔', '📣'],
            'portal': ['🚀', '🌟', '✨'],
            'chat': ['💬', '🗣️', '💭'],
            'geral': ['💬', '🌐', '🏠'],
            'off': ['🎭', '🎲', '🎪'],
            'midia': ['📷', '🖼️', '📸'],
            'gaming': ['🎮', '🕹️', '👾'],
            'ticket': ['🎫', '📩', '✉️'],
            'suporte': ['🛠️', '💡', '❓'],
            'faq': ['❓', '💡', '📚'],
            'sugestao': ['📝', '💡', '✍️'],
            'voz': ['🔊', '🎙️', '🔉'],
            'lounge': ['🔊', '☕', '🛋️'],
            'musica': ['🎵', '🎶', '🎸'],
            'duo': ['🎮', '👥', '🤝'],
            'palco': ['🎤', '🎭', '🌟'],
            'vip': ['💎', '👑', '⭐'],
            'boas': ['👋', '🙌', '✋'],
            'bem': ['👋', '🏠', '🌟'],
            'default': ['📌', '💠', '🔹']
        };
        // Decorações para categorias
        const categoryDecorations = [
            (name) => `━━━ ${name} ━━━`,
            (name) => `✦ ${name} ✦`,
            (name) => `╔═══ ${name} ═══╗`,
            (name) => `》${name}《`,
            (name) => `── ✧ ${name} ✧ ──`
        ];
        // Função para encontrar emoji apropriado
        const findEmoji = (name) => {
            const nameLower = name.toLowerCase();
            for (const [key, emojis] of Object.entries(channelEmojis)) {
                if (nameLower.includes(key)) {
                    return emojis[0];
                }
            }
            return channelEmojis['default'][0];
        };
        // Função para formatar nome de canal
        const formatChannelName = (name) => {
            // Remove emojis existentes para garantir padrão
            let cleanName = name.replace(/^[\p{Emoji}\p{Emoji_Component}\u200d]+[\s\-:┃|・]*/gu, '').trim();
            // Remove caracteres especiais iniciais como - ou |
            cleanName = cleanName.replace(/^[\s\-:┃|・]+/, '').trim();
            // Se ficou vazio, usa fallback
            if (!cleanName)
                cleanName = 'canal';
            // Encontra emoji apropriado (se não tiver)
            const emoji = findEmoji(cleanName);
            // Formata forçando a barra vertical: emoji┃nome-com-hifens
            // Substitui espaços por hifens no nome
            const finalName = cleanName.toLowerCase().replace(/\s+/g, '-');
            return `${emoji}┃${finalName}`;
        };
        // Função para formatar nome de categoria
        const formatCategoryName = (name, index) => {
            // Verifica se JÁ ESTÁ PERFEITO (exatamente como queremos)
            if (/^━━━ .* ━━━$/.test(name) || /^✦ .* ✦$/.test(name) || /^╔═══ .* ═══╗$/.test(name)) {
                return name;
            }
            // Limpa decorações parciais ou erradas
            let cleanName = name
                .replace(/^[━✦╔》──\s\p{Emoji}]+/gu, '') // Remove prefixos
                .replace(/[━✦╗《──\s\p{Emoji}]+$/gu, '') // Remove sufixos
                .trim()
                .toUpperCase();
            if (!cleanName)
                cleanName = name.toUpperCase();
            // Escolhe a decoração baseada no índice
            const decoration = categoryDecorations[index % categoryDecorations.length];
            return decoration(cleanName);
        };
        // Aplica formatação nas categorias e canais
        if (schema.categories && Array.isArray(schema.categories)) {
            schema.categories = schema.categories.map((cat, catIndex) => ({
                ...cat,
                name: formatCategoryName(cat.name, catIndex),
                channels: cat.channels?.map(chan => ({
                    ...chan,
                    name: formatChannelName(chan.name)
                })) || []
            }));
        }
        // Garante que cargos tenham emojis
        if (schema.roles && Array.isArray(schema.roles)) {
            const roleEmojis = ['👑', '⚔️', '💎', '🌟', '🔰', '🎭'];
            schema.roles = schema.roles.map((role, index) => {
                let roleName = role.name;
                if (!/^[\p{Emoji}]/u.test(role.name)) {
                    const emoji = roleEmojis[index % roleEmojis.length];
                    roleName = `${emoji} ${role.name}`;
                }
                return { ...role, name: roleName };
            });
        }
        return schema;
    }
    /**
     * Passo 1: Gerar o plano JSON com a LLM
     */
    async generateServerPlan(theme) {
        index_1.logger.info(`🏗️ Gerando plano de servidor PREMIUM para tema: ${theme}`);
        const enhancedPrompt = `
${SERVER_BUILDER_PROMPT}

═══════════════════════════════════════════════════════════════════════════════
🎯 TEMA DO SERVIDOR: ${theme}
═══════════════════════════════════════════════════════════════════════════════

Crie uma estrutura COMPLETA e PREMIUM para este tema.
Use emojis RELEVANTES ao tema.
Crie nomes CRIATIVOS e DECORADOS.
Inclua canais de voz com limites apropriados.
`;
        const rawSchema = await llm_service_1.llmService.generateJson(enhancedPrompt, `Crie o servidor com tema: "${theme}". Seja criativo e profissional!`);
        // Aplica pós-processamento para garantir formatação correta
        if (rawSchema) {
            index_1.logger.info('🔧 Aplicando pós-processamento de formatação...');
            return this.postProcessSchema(rawSchema);
        }
        return null;
    }
    /**
     * Passo 2: Construir o servidor com todas as features
     */
    async buildServer(guild, schema, progressCallback) {
        const notify = (msg) => {
            index_1.logger.info(`[ServerBuilder] ${guild.id}: ${msg}`);
            if (progressCallback)
                progressCallback(msg);
        };
        const roleCount = schema.roles?.length || 0;
        const categoryCount = schema.categories?.length || 0;
        const channelCount = schema.categories?.reduce((acc, cat) => acc + (cat.channels?.length || 0), 0) || 0;
        notify(`🚀 Iniciando construção PREMIUM: ${roleCount} cargos, ${categoryCount} categorias, ${channelCount} canais.`);
        // 1. Criar Cargos
        const roleMap = new Map();
        if (schema.roles && Array.isArray(schema.roles)) {
            for (const roleDef of schema.roles) {
                try {
                    const permissions = (roleDef.permissions || []).map(p => {
                        const perm = discord_js_1.PermissionFlagsBits[p];
                        return perm || discord_js_1.PermissionFlagsBits.SendMessages;
                    });
                    const role = await guild.roles.create({
                        name: roleDef.name,
                        color: (roleDef.color || '#99AAB5'),
                        permissions: permissions,
                        hoist: roleDef.hoist || false,
                        mentionable: roleDef.mentionable || false,
                        reason: 'Server Builder AI Premium'
                    });
                    roleMap.set(roleDef.name, role);
                    notify(`✅ Cargo criado: ${role.name}`);
                }
                catch (error) {
                    index_1.logger.error(`Erro ao criar cargo ${roleDef.name}:`, { error: error });
                }
            }
        }
        // 2. Criar Estrutura de Canais
        if (schema.categories && Array.isArray(schema.categories)) {
            for (const catDef of schema.categories) {
                try {
                    const category = await guild.channels.create({
                        name: catDef.name,
                        type: discord_js_1.ChannelType.GuildCategory,
                        reason: 'Server Builder AI Premium'
                    });
                    if (catDef.channels && Array.isArray(catDef.channels)) {
                        for (const chanDef of catDef.channels) {
                            try {
                                const permissionOverwrites = [];
                                // Configurar privacidade
                                if (chanDef.is_private) {
                                    permissionOverwrites.push({
                                        id: guild.id,
                                        deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
                                    });
                                }
                                // Adicionar permissões de cargos
                                if (chanDef.allowed_roles) {
                                    for (const roleName of chanDef.allowed_roles) {
                                        const role = roleMap.get(roleName);
                                        if (role) {
                                            permissionOverwrites.push({
                                                id: role.id,
                                                allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages],
                                            });
                                        }
                                    }
                                }
                                const channelType = this.getChannelType(chanDef.type);
                                const isVoiceType = [discord_js_1.ChannelType.GuildVoice, discord_js_1.ChannelType.GuildStageVoice].includes(channelType);
                                const channelOptions = {
                                    name: chanDef.name,
                                    type: channelType,
                                    parent: category.id,
                                    permissionOverwrites,
                                    reason: 'Server Builder AI Premium'
                                };
                                // Configurações específicas por tipo
                                if (channelType === discord_js_1.ChannelType.GuildText || channelType === discord_js_1.ChannelType.GuildAnnouncement) {
                                    if (chanDef.description)
                                        channelOptions.topic = chanDef.description;
                                    if (chanDef.slowmode)
                                        channelOptions.rateLimitPerUser = chanDef.slowmode;
                                    if (chanDef.nsfw)
                                        channelOptions.nsfw = chanDef.nsfw;
                                }
                                if (isVoiceType && chanDef.user_limit !== undefined) {
                                    channelOptions.userLimit = chanDef.user_limit;
                                }
                                await guild.channels.create(channelOptions);
                                const limitInfo = isVoiceType && chanDef.user_limit ? ` (limite: ${chanDef.user_limit})` : '';
                                index_1.logger.info(`📢 Canal criado: ${chanDef.name} [${chanDef.type}]${limitInfo}`);
                            }
                            catch (err) {
                                index_1.logger.error(`Erro ao criar canal ${chanDef.name}`, { error: err });
                            }
                        }
                    }
                    notify(`📂 Categoria criada: ${catDef.name} (${catDef.channels?.length || 0} canais)`);
                }
                catch (error) {
                    index_1.logger.error(`Erro ao criar categoria ${catDef.name}`, { error: error });
                }
            }
        }
        notify(`✨ Construção PREMIUM concluída! ${categoryCount} categorias, ${channelCount} canais criados.`);
    }
    /**
     * Gerar plano de ajustes
     */
    async generateAdjustmentPlan(userRequest) {
        index_1.logger.info(`🔧 Gerando plano de ajuste: ${userRequest}`);
        return await llm_service_1.llmService.generateJson(SERVER_ADJUSTER_PROMPT, `PEDIDO DO USUÁRIO: ${userRequest}`);
    }
    /**
     * Aplicar ajustes no servidor
     */
    async applyAdjustments(guild, schema, progressCallback) {
        const notify = (msg) => {
            index_1.logger.info(`[ServerAdjuster] ${guild.id}: ${msg}`);
            if (progressCallback)
                progressCallback(msg);
        };
        notify(`🔧 Aplicando ${schema.actions.length} ajustes...`);
        for (const action of schema.actions) {
            try {
                switch (action.type) {
                    case 'create_category': {
                        await guild.channels.create({
                            name: action.name,
                            type: discord_js_1.ChannelType.GuildCategory,
                            reason: 'Server Adjuster AI'
                        });
                        notify(`📂 Categoria criada: ${action.name}`);
                        break;
                    }
                    case 'create_channel': {
                        const category = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory &&
                            c.name.toLowerCase().includes(action.category_name?.toLowerCase() || ''));
                        const channelType = this.getChannelType(action.channel_type || 'text');
                        const isVoiceType = [discord_js_1.ChannelType.GuildVoice, discord_js_1.ChannelType.GuildStageVoice].includes(channelType);
                        const options = {
                            name: action.name,
                            type: channelType,
                            parent: category?.id,
                            reason: 'Server Adjuster AI'
                        };
                        if (isVoiceType && action.user_limit !== undefined) {
                            options.userLimit = action.user_limit;
                        }
                        await guild.channels.create(options);
                        notify(`📢 Canal criado: ${action.name}`);
                        break;
                    }
                    case 'set_user_limit': {
                        const voiceChannel = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildVoice &&
                            c.name.toLowerCase().includes(action.name?.toLowerCase() || ''));
                        if (voiceChannel && 'setUserLimit' in voiceChannel) {
                            await voiceChannel.setUserLimit(action.user_limit || 0);
                            notify(`👥 Limite definido: ${action.name} → ${action.user_limit} usuários`);
                        }
                        break;
                    }
                    case 'rename_category': {
                        const cat = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory &&
                            c.name.toLowerCase().includes(action.old_name?.toLowerCase() || ''));
                        if (cat) {
                            await cat.setName(action.new_name);
                            notify(`✏️ Categoria renomeada: ${action.old_name} → ${action.new_name}`);
                        }
                        break;
                    }
                    case 'rename_channel': {
                        const chan = guild.channels.cache.find(c => c.name.toLowerCase().includes(action.old_name?.toLowerCase() || ''));
                        if (chan && 'setName' in chan) {
                            await chan.setName(action.new_name);
                            notify(`✏️ Canal renomeado: ${action.old_name} → ${action.new_name}`);
                        }
                        break;
                    }
                    case 'delete_category': {
                        const catToDel = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory &&
                            c.name.toLowerCase().includes(action.name?.toLowerCase() || ''));
                        if (catToDel) {
                            // Deletar canais filhos primeiro
                            const children = guild.channels.cache.filter(c => 'parentId' in c && c.parentId === catToDel.id);
                            for (const child of children.values()) {
                                await child.delete('Server Adjuster AI - Deletando categoria pai');
                            }
                            await catToDel.delete('Server Adjuster AI');
                            notify(`🗑️ Categoria deletada: ${action.name}`);
                        }
                        break;
                    }
                    case 'delete_channel': {
                        const chanToDel = guild.channels.cache.find(c => c.name.toLowerCase().includes(action.name?.toLowerCase() || ''));
                        if (chanToDel) {
                            await chanToDel.delete('Server Adjuster AI');
                            notify(`🗑️ Canal deletado: ${action.name}`);
                        }
                        break;
                    }
                    case 'create_role': {
                        await guild.roles.create({
                            name: action.name,
                            color: (action.color || '#99AAB5'),
                            reason: 'Server Adjuster AI'
                        });
                        notify(`🎭 Cargo criado: ${action.name}`);
                        break;
                    }
                }
            }
            catch (error) {
                index_1.logger.error(`Erro na ação ${action.type}:`, { error: error });
            }
        }
        notify('✅ Ajustes concluídos!');
    }
}
exports.ServerBuilderService = ServerBuilderService;
exports.serverBuilder = new ServerBuilderService();
//# sourceMappingURL=server-builder.service.js.map