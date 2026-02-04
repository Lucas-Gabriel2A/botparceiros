import { 
    Guild, 
    ChannelType, 
    Role, 
    PermissionFlagsBits, 
    ColorResolvable
} from 'discord.js';
import { llmService } from './llm.service';
import { logger } from './index';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface ServerChannel {
    name: string;
    type: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    description?: string;
    user_limit?: number;      // Para canais de voz (0-99), 0 = sem limite
    is_private?: boolean;
    slowmode?: number;        // Segundos (0-21600)
    nsfw?: boolean;
    allowed_roles?: string[];
}

interface ServerCategory {
    name: string;
    channels: ServerChannel[];
}

interface ServerRole {
    name: string;
    color: string;
    permissions: string[];
    hoist?: boolean;          // Exibir separadamente
    mentionable?: boolean;
}

interface ServerSchema {
    roles: ServerRole[];
    categories: ServerCategory[];
}

interface AdjustmentAction {
    type: 'create_category' | 'create_channel' | 'rename_category' | 'rename_channel' | 'delete_category' | 'delete_channel' | 'create_role' | 'set_user_limit';
    name?: string;
    category_name?: string;
    channel_type?: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    old_name?: string;
    new_name?: string;
    color?: string;
    user_limit?: number;
}

interface AdjustmentSchema {
    actions: AdjustmentAction[];
    message: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 PROMPTS PREMIUM PARA LLM
// ═══════════════════════════════════════════════════════════════════════════

const SERVER_BUILDER_PROMPT = `
Você é um DESIGNER ELITE de Servidores Discord. Crie estruturas PREMIUM e PROFISSIONAIS.

═══════════════════════════════════════════════════════════════════════════════
🎨 PADRÕES DE DESIGN OBRIGATÓRIOS
═══════════════════════════════════════════════════════════════════════════════

1. CATEGORIAS - Use decoração visual nos dois lados:
   ✦ Centro de Ajuda Cósmica ✦ 💠
   ━━━ 🛒 PRODUTOS ━━━
   ・🌟・COMUNIDADE・🌟・
   ╔═══ 📢 INFORMAÇÕES ═══╗
   ── ✧ SOCIAL ✧ ──
   》Lounge Estelar《

2. CANAIS DE TEXTO - Emoji + separador + nome:
   #┃📜┃regras-do-servidor
   #┃🚀┃portal-de-entrada
   #┃💎┃loja-premium
   #┃📢┃avisos-importantes
   #┃🎫┃abrir-ticket
   #┃⭐┃reviews
   #┃🐛┃bugs-e-sugestões
   #┃💬┃chat-geral
   #┃🎮┃gaming-zone

3. CANAIS DE VOZ - Emoji + separador + nome + (limite):
   🔊┃conversa-geral (limite: 0 = sem limite)
   🎵┃sala-de-música (limite: 8)
   🎮┃gaming-duo (limite: 2)
   🌙┃conversa-noturna (limite: 8)
   💎┃vip-lounge (limite: 5, privado)
   🎤┃palco-estelar (tipo: stage)

4. CANAIS ESPECIAIS:
   - "announcement" para avisos oficiais (📢)
   - "stage" para eventos e apresentações (🎤)
   - "forum" para discussões organizadas (💬)

═══════════════════════════════════════════════════════════════════════════════
📋 ESTRUTURA MÍNIMA OBRIGATÓRIA
═══════════════════════════════════════════════════════════════════════════════

Crie PELO MENOS estas categorias (adapte ao tema):

1. INFORMAÇÕES (3+ canais): regras, avisos, portal
2. COMUNIDADE (4+ canais): chat-geral, off-topic, mídias, apresentações
3. SUPORTE/TICKETS (2+ canais): abrir-ticket, faq
4. VOZ/LOUNGE (3+ canais): conversa-geral, gaming, música

TOTAL MÍNIMO: 4 categorias, 12 canais, 4 cargos

═══════════════════════════════════════════════════════════════════════════════
🎭 CARGOS OBRIGATÓRIOS
═══════════════════════════════════════════════════════════════════════════════

- Cargo de Fundador/Owner (#FFD700 dourado)
- Cargo de Staff/Moderador (#00D4FF ciano)
- Cargo VIP/Premium (#9B59B6 roxo)
- Cargo de Membro (#2ECC71 verde)

═══════════════════════════════════════════════════════════════════════════════
⚙️ REGRAS TÉCNICAS JSON
═══════════════════════════════════════════════════════════════════════════════

- "type" DEVE ser: "text", "voice", "stage", "forum", ou "announcement"
- "user_limit" apenas para voice/stage (0-99, onde 0 = sem limite)
- "color" em formato Hex (#RRGGBB)
- "permissions": Administrator, KickMembers, BanMembers, ManageChannels, ManageMessages, ViewChannel, SendMessages

SCHEMA JSON:
{
  "roles": [
    { "name": "👑 Fundador", "color": "#FFD700", "permissions": ["Administrator"], "hoist": true }
  ],
  "categories": [
    {
      "name": "✦ Centro de Informações ✦",
      "channels": [
        { "name": "📜┃regras", "type": "text", "description": "Regras do servidor" },
        { "name": "📢┃avisos", "type": "announcement", "description": "Avisos oficiais" },
        { "name": "🔊┃lounge-geral", "type": "voice", "user_limit": 0 },
        { "name": "🎮┃gaming-duo", "type": "voice", "user_limit": 2 },
        { "name": "🎤┃palco", "type": "stage", "user_limit": 50 }
      ]
    }
  ]
}

Responda APENAS com JSON válido.
`;

const SERVER_ADJUSTER_PROMPT = `
Você é um ADMINISTRADOR INTELIGENTE de Servidores Discord Premium.
Analise o pedido e gere as AÇÕES necessárias.

AÇÕES DISPONÍVEIS:
1. "create_category" - Criar categoria decorada
2. "create_channel" - Criar canal com emoji e separador
3. "rename_category" - Renomear categoria
4. "rename_channel" - Renomear canal
5. "delete_category" - Deletar categoria
6. "delete_channel" - Deletar canal
7. "create_role" - Criar cargo colorido
8. "set_user_limit" - Definir limite de usuários em canal de voz

PADRÕES DE DESIGN:
- Categorias: "✦ Nome ✦" ou "━━━ 🎯 NOME ━━━"
- Canais: "📢┃nome-do-canal" ou "🔊┃sala-de-voz"
- Cargos: "👑 Nome" com cor hex

SCHEMA JSON:
{
  "actions": [
    { "type": "create_category", "name": "✦ Nova Categoria ✦" },
    { "type": "create_channel", "category_name": "Nome da Categoria", "name": "🚀┃novo-canal", "channel_type": "text" },
    { "type": "create_channel", "category_name": "Voz", "name": "🎮┃gaming", "channel_type": "voice", "user_limit": 4 },
    { "type": "set_user_limit", "name": "nome-do-canal-voz", "user_limit": 8 }
  ],
  "message": "Descrição das mudanças"
}

Responda APENAS com JSON válido.
`;

// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ SERVER BUILDER SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class ServerBuilderService {
    
    /**
     * Mapeia tipo de canal do schema para ChannelType do Discord.js
     */
    private getChannelType(type: string): ChannelType {
        switch (type) {
            case 'voice': return ChannelType.GuildVoice;
            case 'stage': return ChannelType.GuildStageVoice;
            case 'forum': return ChannelType.GuildForum;
            case 'announcement': return ChannelType.GuildAnnouncement;
            default: return ChannelType.GuildText;
        }
    }

    /**
     * Passo 1: Gerar o plano JSON com a LLM
     */
    async generateServerPlan(theme: string): Promise<ServerSchema | null> {
        logger.info(`🏗️ Gerando plano de servidor PREMIUM para tema: ${theme}`);
        
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

        return await llmService.generateJson<ServerSchema>(
            enhancedPrompt,
            `Crie o servidor com tema: "${theme}". Seja criativo e profissional!`
        );
    }

    /**
     * Passo 2: Construir o servidor com todas as features
     */
    async buildServer(guild: Guild, schema: ServerSchema, progressCallback?: (msg: string) => void): Promise<void> {
        const notify = (msg: string) => {
            logger.info(`[ServerBuilder] ${guild.id}: ${msg}`);
            if (progressCallback) progressCallback(msg);
        };

        const roleCount = schema.roles?.length || 0;
        const categoryCount = schema.categories?.length || 0;
        const channelCount = schema.categories?.reduce((acc, cat) => acc + (cat.channels?.length || 0), 0) || 0;

        notify(`🚀 Iniciando construção PREMIUM: ${roleCount} cargos, ${categoryCount} categorias, ${channelCount} canais.`);

        // 1. Criar Cargos
        const roleMap = new Map<string, Role>();
        
        if (schema.roles && Array.isArray(schema.roles)) {
            for (const roleDef of schema.roles) {
                try {
                    const permissions = (roleDef.permissions || []).map(p => {
                        const perm = PermissionFlagsBits[p as keyof typeof PermissionFlagsBits];
                        return perm || PermissionFlagsBits.SendMessages;
                    });

                    const role = await guild.roles.create({
                        name: roleDef.name,
                        color: (roleDef.color || '#99AAB5') as ColorResolvable,
                        permissions: permissions,
                        hoist: roleDef.hoist || false,
                        mentionable: roleDef.mentionable || false,
                        reason: 'Server Builder AI Premium'
                    });
                    
                    roleMap.set(roleDef.name, role);
                    notify(`✅ Cargo criado: ${role.name}`);
                } catch (error) {
                    logger.error(`Erro ao criar cargo ${roleDef.name}:`, { error: error as any });
                }
            }
        }

        // 2. Criar Estrutura de Canais
        if (schema.categories && Array.isArray(schema.categories)) {
            for (const catDef of schema.categories) {
                try {
                    const category = await guild.channels.create({
                        name: catDef.name,
                        type: ChannelType.GuildCategory,
                        reason: 'Server Builder AI Premium'
                    });

                    if (catDef.channels && Array.isArray(catDef.channels)) {
                        for (const chanDef of catDef.channels) {
                            try {
                                const permissionOverwrites: any[] = [];
                                
                                // Configurar privacidade
                                if (chanDef.is_private) {
                                    permissionOverwrites.push({
                                        id: guild.id,
                                        deny: [PermissionFlagsBits.ViewChannel],
                                    });
                                }

                                // Adicionar permissões de cargos
                                if (chanDef.allowed_roles) {
                                    for (const roleName of chanDef.allowed_roles) {
                                        const role = roleMap.get(roleName);
                                        if (role) {
                                            permissionOverwrites.push({
                                                id: role.id,
                                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                                            });
                                        }
                                    }
                                }

                                const channelType = this.getChannelType(chanDef.type);
                                const isVoiceType = [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channelType);

                                const channelOptions: any = {
                                    name: chanDef.name,
                                    type: channelType,
                                    parent: category.id,
                                    permissionOverwrites,
                                    reason: 'Server Builder AI Premium'
                                };

                                // Configurações específicas por tipo
                                if (channelType === ChannelType.GuildText || channelType === ChannelType.GuildAnnouncement) {
                                    if (chanDef.description) channelOptions.topic = chanDef.description;
                                    if (chanDef.slowmode) channelOptions.rateLimitPerUser = chanDef.slowmode;
                                    if (chanDef.nsfw) channelOptions.nsfw = chanDef.nsfw;
                                }

                                if (isVoiceType && chanDef.user_limit !== undefined) {
                                    channelOptions.userLimit = chanDef.user_limit;
                                }

                                await guild.channels.create(channelOptions);
                                
                                const limitInfo = isVoiceType && chanDef.user_limit ? ` (limite: ${chanDef.user_limit})` : '';
                                logger.info(`📢 Canal criado: ${chanDef.name} [${chanDef.type}]${limitInfo}`);

                            } catch (err) {
                                logger.error(`Erro ao criar canal ${chanDef.name}`, { error: err as any });
                            }
                        }
                    }
                    notify(`📂 Categoria criada: ${catDef.name} (${catDef.channels?.length || 0} canais)`);
                } catch (error) {
                    logger.error(`Erro ao criar categoria ${catDef.name}`, { error: error as any });
                }
            }
        }
        
        notify(`✨ Construção PREMIUM concluída! ${categoryCount} categorias, ${channelCount} canais criados.`);
    }

    /**
     * Gerar plano de ajustes
     */
    async generateAdjustmentPlan(userRequest: string): Promise<AdjustmentSchema | null> {
        logger.info(`🔧 Gerando plano de ajuste: ${userRequest}`);
        return await llmService.generateJson<AdjustmentSchema>(
            SERVER_ADJUSTER_PROMPT,
            `PEDIDO DO USUÁRIO: ${userRequest}`
        );
    }

    /**
     * Aplicar ajustes no servidor
     */
    async applyAdjustments(guild: Guild, schema: AdjustmentSchema, progressCallback?: (msg: string) => void): Promise<void> {
        const notify = (msg: string) => {
            logger.info(`[ServerAdjuster] ${guild.id}: ${msg}`);
            if (progressCallback) progressCallback(msg);
        };

        notify(`🔧 Aplicando ${schema.actions.length} ajustes...`);

        for (const action of schema.actions) {
            try {
                switch (action.type) {
                    case 'create_category': {
                        await guild.channels.create({
                            name: action.name!,
                            type: ChannelType.GuildCategory,
                            reason: 'Server Adjuster AI'
                        });
                        notify(`📂 Categoria criada: ${action.name}`);
                        break;
                    }

                    case 'create_channel': {
                        const category = guild.channels.cache.find(
                            c => c.type === ChannelType.GuildCategory && 
                                 c.name.toLowerCase().includes(action.category_name?.toLowerCase() || '')
                        );
                        
                        const channelType = this.getChannelType(action.channel_type || 'text');
                        const isVoiceType = [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channelType);

                        const options: any = {
                            name: action.name!,
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
                        const voiceChannel = guild.channels.cache.find(
                            c => c.type === ChannelType.GuildVoice && 
                                 c.name.toLowerCase().includes(action.name?.toLowerCase() || '')
                        );
                        if (voiceChannel && 'setUserLimit' in voiceChannel) {
                            await (voiceChannel as any).setUserLimit(action.user_limit || 0);
                            notify(`👥 Limite definido: ${action.name} → ${action.user_limit} usuários`);
                        }
                        break;
                    }

                    case 'rename_category': {
                        const cat = guild.channels.cache.find(
                            c => c.type === ChannelType.GuildCategory && 
                                 c.name.toLowerCase().includes(action.old_name?.toLowerCase() || '')
                        );
                        if (cat) {
                            await cat.setName(action.new_name!);
                            notify(`✏️ Categoria renomeada: ${action.old_name} → ${action.new_name}`);
                        }
                        break;
                    }

                    case 'rename_channel': {
                        const chan = guild.channels.cache.find(
                            c => c.name.toLowerCase().includes(action.old_name?.toLowerCase() || '')
                        );
                        if (chan && 'setName' in chan) {
                            await (chan as any).setName(action.new_name!);
                            notify(`✏️ Canal renomeado: ${action.old_name} → ${action.new_name}`);
                        }
                        break;
                    }

                    case 'delete_category': {
                        const catToDel = guild.channels.cache.find(
                            c => c.type === ChannelType.GuildCategory && 
                                 c.name.toLowerCase().includes(action.name?.toLowerCase() || '')
                        );
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
                        const chanToDel = guild.channels.cache.find(
                            c => c.name.toLowerCase().includes(action.name?.toLowerCase() || '')
                        );
                        if (chanToDel) {
                            await chanToDel.delete('Server Adjuster AI');
                            notify(`🗑️ Canal deletado: ${action.name}`);
                        }
                        break;
                    }

                    case 'create_role': {
                        await guild.roles.create({
                            name: action.name!,
                            color: (action.color || '#99AAB5') as ColorResolvable,
                            reason: 'Server Adjuster AI'
                        });
                        notify(`🎭 Cargo criado: ${action.name}`);
                        break;
                    }
                }
            } catch (error) {
                logger.error(`Erro na ação ${action.type}:`, { error: error as any });
            }
        }

        notify('✅ Ajustes concluídos!');
    }
}

export const serverBuilder = new ServerBuilderService();
