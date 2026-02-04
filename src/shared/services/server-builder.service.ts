import { 
    Guild, 
    ChannelType, 
    Role, 
    PermissionFlagsBits, 
    ColorResolvable
} from 'discord.js';
import { llmService } from './llm.service';
import { logger } from './index';

interface ServerSchema {
    roles: {
        name: string;
        color: string;
        permissions: string[];
    }[];
    categories: {
        name: string;
        channels: {
            name: string;
            type: 'text' | 'voice';
            description?: string;
            is_private?: boolean;
            allowed_roles?: string[]; // Names of roles defined above
        }[];
    }[];
}

const SERVER_BUILDER_PROMPT = `
Você é um DESIGNER PROFISSIONAL de Servidores Discord de ALTÍSSIMO nível.
Crie estruturas de servidor PREMIUM como os melhores servidores de comunidades e empresas.

REGRAS DE DESIGN PREMIUM:
1. Use CARACTERES ESPECIAIS nas categorias: ┃ ・ ✦ ✧ ┆ ╔ ═ ╗ ╚ ╝ ┌ ┐ └ ┘ ★ ☆ ◆ ◇ ┊ ─ ⟢ ⟡ ⭑ ⭒
   Exemplos: "┃・Galáxia・┃" ou "✦ Informações ✦" ou "━━━ LOJA ━━━"

2. Use EMOJIS temáticos no INÍCIO dos nomes de canais:
   - 🚀┃portal-de-entrada
   - 📜┃regras-estelares
   - 💎┃loja-premium
   - 🎮┃gaming-zone

3. Crie separadores visuais nos canais: ┊ ┃ ・ 
   Exemplo: "🛡️┃regras-do-servidor" ou "📢・avisos-importantes"

4. Categorias devem ter decoração nos dois lados:
   - "━━━ 📌 INFORMAÇÕES 📌 ━━━"
   - "✧・゚: *✧ COMUNIDADE ✧*:・゚✧"
   - "╔═══ 🎭 SOCIAL ═══╗"

5. Crie pelo menos uma categoria de voz com canais tipo:
   - 🔊┃Lounge Geral
   - 🎵┃Sala de Música
   - 🎮┃Gaming Voice

REGRAS TÉCNICAS:
1. Responda APENAS com JSON válido seguindo o schema abaixo.
2. "permissions" devem ser strings: Administrator, KickMembers, ManageMessages, SendMessages, ViewChannel.
3. "color" deve ser Hex Code (ex: #FF0000).
4. "type" DEVE ser exatamente "text" ou "voice" (minúsculo).

SCHEMA:
{
  "roles": [
    { "name": "Nome do Cargo", "color": "#Hex", "permissions": ["SendMessages"] }
  ],
  "categories": [
    {
      "name": "━━━ 📂 NOME DA CATEGORIA ━━━",
      "channels": [
        { 
          "name": "🔥┃nome-do-canal", 
          "type": "text",
          "description": "Descrição",
          "is_private": false,
          "allowed_roles": [] 
        },
        {
          "name": "🔊┃canal-de-voz",
          "type": "voice",
          "is_private": false
        }
      ]
    }
  ]
}
`;

const SERVER_ADJUSTER_PROMPT = `
Você é um ADMINISTRADOR INTELIGENTE de Servidores Discord.
Analise o pedido do usuário e gere as AÇÕES necessárias para modificar o servidor.

AÇÕES DISPONÍVEIS:
1. "create_category" - Criar nova categoria
2. "create_channel" - Criar canal (texto ou voz) em uma categoria existente
3. "rename_category" - Renomear categoria existente
4. "rename_channel" - Renomear canal existente
5. "delete_category" - Deletar categoria (e seus canais)
6. "delete_channel" - Deletar canal específico
7. "create_role" - Criar novo cargo

REGRAS DE DESIGN:
- Use caracteres especiais: ┃ ・ ✦ ✧ ━━━
- Use emojis temáticos: 🚀┃ 📜┃ 💎┃

SCHEMA DE RESPOSTA:
{
  "actions": [
    {
      "type": "create_category",
      "name": "━━━ 📌 NOVA CATEGORIA ━━━"
    },
    {
      "type": "create_channel",
      "category_name": "Nome da categoria existente",
      "name": "🔥┃novo-canal",
      "channel_type": "text"
    },
    {
      "type": "create_channel",
      "category_name": "Nome da categoria",
      "name": "🔊┃canal-voz",
      "channel_type": "voice"
    },
    {
      "type": "rename_category",
      "old_name": "Nome Atual",
      "new_name": "✨ Novo Nome ✨"
    },
    {
      "type": "rename_channel",
      "old_name": "canal-antigo",
      "new_name": "📢┃canal-novo"
    },
    {
      "type": "delete_channel",
      "name": "nome-do-canal"
    },
    {
      "type": "create_role",
      "name": "Novo Cargo",
      "color": "#FF0000"
    }
  ],
  "message": "Breve descrição do que foi feito"
}

Responda APENAS com JSON válido.
`;

interface AdjustmentAction {
    type: 'create_category' | 'create_channel' | 'rename_category' | 'rename_channel' | 'delete_category' | 'delete_channel' | 'create_role';
    name?: string;
    category_name?: string;
    channel_type?: 'text' | 'voice';
    old_name?: string;
    new_name?: string;
    color?: string;
}

interface AdjustmentSchema {
    actions: AdjustmentAction[];
    message: string;
}


export class ServerBuilderService {
    
    /**
     * Passo 1: Gerar o plano JSON com a IA
     */
    async generateServerPlan(theme: string): Promise<ServerSchema | null> {
        logger.info(`🏗️ Gerando plano de servidor para tema: ${theme}`);
        return await llmService.generateJson<ServerSchema>(
            SERVER_BUILDER_PROMPT,
            `TEMA DO SERVIDOR: ${theme}`
        );
    }

    /**
     * Passo 2: Aplicar o plano no servidor
     */
    async buildServer(guild: Guild, schema: ServerSchema, progressCallback?: (msg: string) => void): Promise<void> {
        const notify = (msg: string) => {
            logger.info(`[ServerBuilder] ${guild.id}: ${msg}`);
            if (progressCallback) progressCallback(msg);
        };

        notify(`🚀 Iniciando construção: ${schema.roles.length} cargos, ${schema.categories.length} categorias.`);

        // 1. Criar Cargos
        const roleMap = new Map<string, Role>(); // Name -> Rule Object
        
        for (const roleDef of schema.roles) {
            try {
                // Tenta achar permissions válidas
                const permissions = roleDef.permissions.map(p => {
                    const perm = PermissionFlagsBits[p as keyof typeof PermissionFlagsBits];
                    return perm || PermissionFlagsBits.SendMessages; 
                });

                const role = await guild.roles.create({
                    name: roleDef.name,
                    color: roleDef.color as ColorResolvable,
                    permissions: permissions, // Use calculated permissions
                    reason: 'Server Builder AI'
                });
                
                // Set permissions separately to be safe or use above
                // Note: For simplicity using basic setup. Advanced perms logic can be added.
                // Re-setting specific permissions bitfield if needed, but create accepts it.
                
                roleMap.set(roleDef.name, role);
                notify(`✅ Cargo criado: ${role.name}`);
            } catch (error) {
                logger.error(`Erro ao criar cargo ${roleDef.name}:`, { error: error as any });
            }
        }

        // 2. Criar Estrutura
        for (const catDef of schema.categories) {
            try {
                const category = await guild.channels.create({
                    name: catDef.name,
                    type: ChannelType.GuildCategory,
                    reason: 'Server Builder AI'
                });

                for (const chanDef of catDef.channels) {
                    try {
                        const permissionOverwrites = [];
                        
                        // Deny content for @everyone if private
                        if (chanDef.is_private) {
                            permissionOverwrites.push({
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            });
                        }

                        // Add role specific overwrites
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

                        const channelType = chanDef.type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
                        logger.info(`📢 Criando canal: ${chanDef.name} (tipo: ${chanDef.type} -> ${channelType})`);
                        
                        await guild.channels.create({
                            name: chanDef.name,
                            type: channelType,
                            parent: category.id,
                            topic: chanDef.type === 'text' ? chanDef.description : undefined,
                            permissionOverwrites,
                            reason: 'Server Builder AI'
                        });
                    } catch (err) {
                        logger.error(`Erro ao criar canal ${chanDef.name}`, { error: err as any });
                    }
                }
                notify(`📂 Categoria criada: ${catDef.name}`);
            } catch (error) {
                logger.error(`Erro ao criar categoria ${catDef.name}`, { error: error as any });
            }
        }
        
        notify('✨ Construção concluída com sucesso!');
    }

    /**
     * Passo 3: Ajustar servidor existente via linguagem natural
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
                        // Encontra a categoria
                        const category = guild.channels.cache.find(
                            c => c.type === ChannelType.GuildCategory && 
                                 c.name.toLowerCase().includes(action.category_name?.toLowerCase() || '')
                        );
                        
                        const channelType = action.channel_type === 'voice' 
                            ? ChannelType.GuildVoice 
                            : ChannelType.GuildText;

                        await guild.channels.create({
                            name: action.name!,
                            type: channelType,
                            parent: category?.id,
                            reason: 'Server Adjuster AI'
                        });
                        notify(`📢 Canal criado: ${action.name}`);
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

