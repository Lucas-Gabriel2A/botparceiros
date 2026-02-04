/**
 * 💎 BOT TICKET VIP - Sistema de Tickets VIP TypeScript
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Migrado de botticketvip.js - Sistema completo de compra VIP
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
    UserSelectMenuBuilder,
    TextChannel,
    GuildMember,
    ButtonInteraction,
    ChatInputCommandInteraction,
    UserSelectMenuInteraction,
    ModalSubmitInteraction,
    Guild
} from 'discord.js';

import { 
    config, 
    logger, 
    testConnection, 
    initializeSchema, 
    createTicket as createDbTicket,
    closeTicket as closeDbTicket,
    logAudit,
    closePool
} from '../../shared/services';

let dbConnected = false;

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate([
    'DISCORD_TOKEN_VIP', 
    'VIP_STAFF_ROLE_ID', 
    'VIP_CARGO_VIP_ID',
    'VIP_CATEGORIA_TICKETS_ID'
]);

const TOKEN = config.get('DISCORD_TOKEN_VIP');
const ID_CARGO_STAFF = config.get('VIP_STAFF_ROLE_ID');
const ID_CARGO_VIP = config.get('VIP_CARGO_VIP_ID');
const ID_CATEGORIA_TICKETS = config.get('VIP_CATEGORIA_TICKETS_ID');
const ID_CANAL_COMPRAS = config.getOptional('VIP_CANAL_COMPRAS_ID');
const ID_CANAL_LOGS = config.getOptional('VIP_CANAL_LOGS_ID');

if (!config.isValidDiscordToken(TOKEN)) {
    logger.error('Token Discord inválido!');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const CORES = {
    AZUL_ESCURO: '#020940',
    AZUL_PROFUNDO: '#080F26',
    DOURADO: '#F2B445',
    CREME: '#F2EFD0',
    LARANJA: '#D98E32',
    SUCESSO: '#2ecc71',
    ERRO: '#e74c3c',
    AVISO: '#f39c12',
    INFO: '#3498db'
} as const;

const NEXSTAR_BANNER = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';

const EMOJIS = {
    ESTRELA: '⭐',
    COROA: '👑',
    TICKET: '🎫',
    PIX: '💳',
    COPIAR: '📋',
    AJUDA: '❓',
    SUCESSO: '✅',
    ERRO: '❌',
    AVISO: '⚠️',
    LIXO: '🗑️',
    ADICIONAR: '➕',
    REMOVER: '➖',
    FOGUETE: '🚀',
    DINHEIRO: '💰',
    PACOTE: '📦',
    CHAVE: '🔑',
    RELOGIO: '⏰',
    CADEADO: '🔒',
    LOG: '📝'
} as const;

const CHAVE_PIX = config.getOptional('VIP_CHAVE_PIX') || 'd065a8bb-e382-45b9-91bd-d25a6c4aa8f9';
const VALOR_VIP = config.getOptional('VIP_VALOR') || 'R$ 10,00';

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS E ESTADO
// ═══════════════════════════════════════════════════════════════════════════

interface TicketData {
    ownerId: string;
    createdAt: Date;
    status: 'aberto' | 'aguardando_pagamento' | 'fechado';
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
    footerIcon?: string;
}

const ticketOwners = new Map<string, TicketData>();

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FUNÇÕES HELPER
// ═══════════════════════════════════════════════════════════════════════════

function criarEmbedNexstar(options: EmbedOptions = {}): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(parseInt((options.cor || CORES.DOURADO).replace('#', ''), 16))
        .setTimestamp()
        .setFooter({ 
            text: options.footer || `${EMOJIS.ESTRELA} Nexstar VIP`
        });

    if (options.titulo) embed.setTitle(options.titulo);
    if (options.descricao) embed.setDescription(options.descricao);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.imagem) embed.setImage(options.imagem);
    if (options.autor) embed.setAuthor(options.autor);
    if (options.campos) embed.addFields(options.campos);

    return embed;
}

async function enviarLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
    if (!ID_CANAL_LOGS) return;
    
    try {
        const canalLogs = guild.channels.cache.get(ID_CANAL_LOGS) as TextChannel | undefined;
        if (canalLogs) {
            await canalLogs.send({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Erro ao enviar log');
    }
}

async function gerarTranscript(channel: TextChannel, limite = 100): Promise<string> {
    try {
        const messages = await channel.messages.fetch({ limit: limite });
        const transcript = [...messages.values()]
            .reverse()
            .map(m => `[${m.createdAt.toLocaleString('pt-BR')}] ${m.author.tag}: ${m.content || '[Embed/Arquivo]'}`)
            .join('\n');
        return transcript;
    } catch (error) {
        logger.error('Erro ao gerar transcript');
        return 'Erro ao gerar transcript';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', () => {
    logger.info(`${EMOJIS.FOGUETE} Bot ${client.user?.tag} está online!`);

    const commands = [
        {
            name: 'painel-ticket',
            description: `${EMOJIS.TICKET} Envia o painel para abrir um ticket de compra VIP.`,
        },
    ];
    
    client.application?.commands.set(commands);
    logger.info(`${EMOJIS.SUCESSO} Comando /painel-ticket registrado!`);
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) await handleCommand(interaction);
        if (interaction.isButton()) await handleButton(interaction);
        if (interaction.isModalSubmit()) await handleModal(interaction);
        if (interaction.isUserSelectMenu()) await handleUserSelect(interaction);
    } catch (error) {
        logger.error('Erro na interação');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📝 HANDLER DE COMANDOS
// ═══════════════════════════════════════════════════════════════════════════

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.commandName === 'painel-ticket') {
        const member = interaction.member as GuildMember;
        
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Acesso Negado`,
                descricao: 'Você não tem permissão para usar este comando.'
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        if (ID_CANAL_COMPRAS && interaction.channelId !== ID_CANAL_COMPRAS) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Canal Incorreto`,
                descricao: `Este comando só pode ser usado no canal <#${ID_CANAL_COMPRAS}>.`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = criarEmbedNexstar({
            cor: CORES.DOURADO,
            titulo: `${EMOJIS.COROA} Central de Aquisição VIP ${EMOJIS.COROA}`,
            descricao: `Torne-se um membro **VIP** e desbloqueie benefícios exclusivos!\n\n` +
                `**${EMOJIS.ESTRELA} Vantagens Exclusivas:**\n` +
                `>>> ${EMOJIS.TICKET} Crie salas de voz privadas\n` +
                `${EMOJIS.COROA} Cargos exclusivos no servidor\n` +
                `${EMOJIS.FOGUETE} Prioridade no atendimento\n` +
                `${EMOJIS.ESTRELA} Acesso a canais VIP\n\n` +
                `**${EMOJIS.DINHEIRO} Investimento:** \`${VALOR_VIP}\`\n\n` +
                `Clique no botão abaixo para iniciar sua jornada VIP!`,
            imagem: NEXSTAR_BANNER,
            footer: `${interaction.guild?.name} | Sistema de Tickets VIP`
        });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket')
                    .setLabel('Adquirir VIP')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJIS.ESTRELA)
            );

        const channel = interaction.channel as TextChannel;
        await channel.send({ embeds: [embed], components: [row] });
        
        const confirmEmbed = criarEmbedNexstar({
            cor: CORES.SUCESSO,
            titulo: `${EMOJIS.SUCESSO} Painel Enviado`,
            descricao: 'O painel de tickets foi enviado com sucesso!'
        });
        await interaction.reply({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔘 HANDLER DE BOTÕES
// ═══════════════════════════════════════════════════════════════════════════

async function handleButton(interaction: ButtonInteraction): Promise<void> {
    const customId = interaction.customId;
    const guild = interaction.guild!;
    const user = interaction.user;
    const member = interaction.member as GuildMember;

    // 🎫 ABRIR TICKET
    if (customId === 'abrir_ticket') {
        const ticketName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        const ticketExistente = guild.channels.cache.find(
            channel => channel.name === ticketName
        );
        
        if (ticketExistente) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Ticket Existente`,
                descricao: `Você já possui um ticket aberto!\n\n> Acesse: ${ticketExistente}`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const channel = await guild.channels.create({
                name: ticketName,
                type: ChannelType.GuildText,
                parent: ID_CATEGORIA_TICKETS,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
                    { id: ID_CARGO_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory] },
                ],
            });

            ticketOwners.set(channel.id, {
                ownerId: user.id,
                createdAt: new Date(),
                status: 'aguardando_pagamento'
            });

            // Registrar ticket VIP no banco
            if (dbConnected) {
                try {
                    await createDbTicket(guild.id, channel.id, user.id, 'VIP');
                    await logAudit(guild.id, user.id, 'VIP_TICKET_CREATED', channel.id, {
                        channel_name: channel.name
                    });
                } catch (error) {
                    logger.warn('Erro ao registrar ticket VIP no DB');
                }
            }

            const embedTicket = criarEmbedNexstar({
                cor: CORES.DOURADO,
                autor: {
                    name: `${EMOJIS.TICKET} Ticket de ${user.displayName}`,
                    iconURL: user.displayAvatarURL()
                },
                descricao: `Olá ${user}! Siga as instruções para concluir sua compra VIP.`,
                campos: [
                    { name: `${EMOJIS.PACOTE} Produto`, value: '`Acesso VIP Nexstar`', inline: true },
                    { name: `${EMOJIS.DINHEIRO} Valor`, value: `\`${VALOR_VIP}\``, inline: true },
                    { name: `${EMOJIS.RELOGIO} Abertura`, value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: `${EMOJIS.ESTRELA} Vantagens Inclusas`, value: '> Calls privadas, Cargos exclusivos e Prioridade nos tickets.' },
                    { name: `${EMOJIS.CHAVE} Chave PIX (Copia e Cola)`, value: `\`\`\`${CHAVE_PIX}\`\`\`` },
                    { name: `${EMOJIS.AVISO} Instruções`, value: '> Após realizar o pagamento, envie o **comprovante** neste canal.\n> Use o botão abaixo para copiar o PIX facilmente!' }
                ],
                imagem: NEXSTAR_BANNER,
                footer: `ID: ${user.id}`
            });

            const rowUsuario = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('copiar_pix')
                    .setLabel('Copiar PIX')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(EMOJIS.COPIAR),
                new ButtonBuilder()
                    .setCustomId('preciso_ajuda')
                    .setLabel('Preciso de Ajuda')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EMOJIS.AJUDA)
            );

            const rowStaff = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirmar_pagamento')
                    .setLabel('Confirmar Pagamento')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJIS.SUCESSO),
                new ButtonBuilder()
                    .setCustomId('cancelar_ticket')
                    .setLabel('Cancelar')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(EMOJIS.LIXO),
                new ButtonBuilder()
                    .setCustomId('adicionar_membro')
                    .setLabel('Adicionar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EMOJIS.ADICIONAR),
                new ButtonBuilder()
                    .setCustomId('remover_membro')
                    .setLabel('Remover')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EMOJIS.REMOVER)
            );

            await channel.send({
                content: `||<@&${ID_CARGO_STAFF}>, novo ticket de ${user}!||`,
                embeds: [embedTicket],
                components: [rowUsuario, rowStaff]
            });

            const embedConfirm = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Ticket Criado!`,
                descricao: `Seu ticket foi criado com sucesso!\n\n> Acesse: ${channel}`
            });
            await interaction.editReply({ embeds: [embedConfirm] });

            const logEmbed = criarEmbedNexstar({
                cor: CORES.INFO,
                titulo: `${EMOJIS.TICKET} Novo Ticket Aberto`,
                campos: [
                    { name: 'Usuário', value: `${user} (\`${user.id}\`)`, inline: true },
                    { name: 'Canal', value: `${channel}`, inline: true },
                    { name: 'Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                ]
            });
            await enviarLog(guild, logEmbed);

        } catch (error) {
            logger.error('Erro ao criar ticket');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível criar o ticket.`
            });
            await interaction.editReply({ embeds: [embed] });
        }
    }

    // 📋 COPIAR PIX
    else if (customId === 'copiar_pix') {
        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.PIX} Chave PIX`,
            descricao: `Copie a chave abaixo e cole no seu aplicativo de banco:\n\n\`\`\`${CHAVE_PIX}\`\`\`\n` +
                `**${EMOJIS.DINHEIRO} Valor:** \`${VALOR_VIP}\`\n\n` +
                `> ${EMOJIS.AVISO} Após o pagamento, envie o comprovante aqui!`
        });
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ❓ PRECISO DE AJUDA
    else if (customId === 'preciso_ajuda') {
        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.AJUDA} Central de Ajuda`,
            descricao: `**Como realizar o pagamento:**\n\n` +
                `**1.** Copie a chave PIX usando o botão "Copiar PIX"\n` +
                `**2.** Abra seu aplicativo de banco\n` +
                `**3.** Vá em "Pagar com PIX" > "Copia e Cola"\n` +
                `**4.** Cole a chave e confirme o valor de \`${VALOR_VIP}\`\n` +
                `**5.** Finalize o pagamento\n` +
                `**6.** Envie o comprovante aqui neste canal\n\n` +
                `> ${EMOJIS.AVISO} Um membro da Staff irá validar seu pagamento!`
        });
        
        const channel = interaction.channel as TextChannel;
        await channel.send({
            content: `<@&${ID_CARGO_STAFF}>, ${interaction.user} precisa de ajuda!`
        });
        
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ✅ CONFIRMAR PAGAMENTO
    else if (customId === 'confirmar_pagamento') {
        if (!member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode confirmar pagamentos.'
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = interaction.channel as TextChannel;
        const ticketData = ticketOwners.get(channel.id);
        
        if (!ticketData) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: 'Não foi possível encontrar os dados do ticket.'
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            const targetMember = await guild.members.fetch(ticketData.ownerId);
            await targetMember.roles.add(ID_CARGO_VIP);

            const transcript = await gerarTranscript(channel);

            const embedFechamento = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Compra Aprovada!`,
                descricao: `O cargo **VIP** foi atribuído a ${targetMember} com sucesso!\n\n` +
                    `> ${EMOJIS.RELOGIO} Este canal será deletado em **10 segundos**.`,
                campos: [
                    { name: 'Cliente', value: `${targetMember}`, inline: true },
                    { name: 'Aprovado por', value: `${interaction.user}`, inline: true }
                ]
            });

            await interaction.reply({ embeds: [embedFechamento] });

            const logEmbed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Pagamento Confirmado`,
                campos: [
                    { name: 'Cliente', value: `${targetMember} (\`${targetMember.id}\`)`, inline: true },
                    { name: 'Staff', value: `${interaction.user}`, inline: true },
                    { name: 'Valor', value: VALOR_VIP, inline: true },
                    { name: 'Transcript', value: `\`\`\`${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}\`\`\``, inline: false }
                ]
            });
            await enviarLog(guild, logEmbed);

            ticketOwners.delete(channel.id);
            
            // Fechar ticket no banco
            if (dbConnected) {
                await closeDbTicket(channel.id);
                await logAudit(guild.id, interaction.user.id, 'VIP_TICKET_CLOSED', channel.id, {
                    client_id: targetMember.id,
                    status: 'aprovado'
                });
            }
            
            setTimeout(() => channel.delete().catch(() => {}), 10000);

        } catch (error) {
            logger.error('Erro ao confirmar pagamento');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível atribuir o cargo.\n\n> Verifique se o cargo do bot está acima do VIP.`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // 🗑️ CANCELAR TICKET
    else if (customId === 'cancelar_ticket') {
        if (!member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode cancelar tickets.'
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = interaction.channel as TextChannel;
        const ticketData = ticketOwners.get(channel.id);
        const transcript = await gerarTranscript(channel);

        const embedCancelamento = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.LIXO} Ticket Cancelado`,
            descricao: `Este ticket foi cancelado por ${interaction.user}.\n\n` +
                `> ${EMOJIS.RELOGIO} O canal será deletado em **10 segundos**.`
        });

        await interaction.reply({ embeds: [embedCancelamento] });

        const logEmbed = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.LIXO} Ticket Cancelado`,
            campos: [
                { name: 'Canal', value: channel.name, inline: true },
                { name: 'Staff', value: `${interaction.user}`, inline: true },
                { name: 'Cliente', value: ticketData ? `<@${ticketData.ownerId}>` : 'Desconhecido', inline: true },
                { name: 'Transcript', value: `\`\`\`${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}\`\`\``, inline: false }
            ]
        });
        await enviarLog(guild, logEmbed);

        ticketOwners.delete(channel.id);
        setTimeout(() => channel.delete().catch(() => {}), 10000);
    }

    // ➕ ADICIONAR MEMBRO
    else if (customId === 'adicionar_membro') {
        if (!member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode adicionar membros.'
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const row = new ActionRowBuilder<UserSelectMenuBuilder>()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('select_adicionar_membro')
                    .setPlaceholder('Selecione o membro para adicionar')
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.ADICIONAR} Adicionar Membro`,
            descricao: 'Selecione o membro que deseja adicionar ao ticket:'
        });

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }

    // ➖ REMOVER MEMBRO
    else if (customId === 'remover_membro') {
        if (!member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode remover membros.'
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            return;
        }

        const row = new ActionRowBuilder<UserSelectMenuBuilder>()
            .addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId('select_remover_membro')
                    .setPlaceholder('Selecione o membro para remover')
                    .setMinValues(1)
                    .setMaxValues(1)
            );

        const embed = criarEmbedNexstar({
            cor: CORES.AVISO,
            titulo: `${EMOJIS.REMOVER} Remover Membro`,
            descricao: 'Selecione o membro que deseja remover do ticket:'
        });

        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 👤 HANDLER DE SELEÇÃO DE USUÁRIO
// ═══════════════════════════════════════════════════════════════════════════

async function handleUserSelect(interaction: UserSelectMenuInteraction): Promise<void> {
    const customId = interaction.customId;
    const selectedUserId = interaction.values[0];
    const channel = interaction.channel as TextChannel;
    const ticketData = ticketOwners.get(channel.id);

    if (customId === 'select_adicionar_membro') {
        try {
            await channel.permissionOverwrites.edit(selectedUserId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Membro Adicionado`,
                descricao: `<@${selectedUserId}> foi adicionado ao ticket!`
            });

            await channel.send({ embeds: [embed] });
            await interaction.update({ content: 'Membro adicionado!', embeds: [], components: [] });

        } catch (error) {
            logger.error('Erro ao adicionar membro');
            await interaction.update({ content: `${EMOJIS.ERRO} Erro ao adicionar membro.`, embeds: [], components: [] });
        }
    }

    else if (customId === 'select_remover_membro') {
        if (ticketData && selectedUserId === ticketData.ownerId) {
            await interaction.update({ 
                content: `${EMOJIS.ERRO} Você não pode remover o dono do ticket!`, 
                embeds: [], 
                components: [] 
            });
            return;
        }

        try {
            await channel.permissionOverwrites.delete(selectedUserId);

            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.REMOVER} Membro Removido`,
                descricao: `<@${selectedUserId}> foi removido do ticket.`
            });

            await channel.send({ embeds: [embed] });
            await interaction.update({ content: 'Membro removido!', embeds: [], components: [] });

        } catch (error) {
            logger.error('Erro ao remover membro');
            await interaction.update({ content: `${EMOJIS.ERRO} Erro ao remover membro.`, embeds: [], components: [] });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 HANDLER DE MODAIS
// ═══════════════════════════════════════════════════════════════════════════

async function handleModal(_interaction: ModalSubmitInteraction): Promise<void> {
    // Implementar se necessário
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', async () => {
    logger.info(`💎 Bot TicketVIP ${client.user?.tag} está online!`);
    
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
    logger.info('Desligando Bot Ticket VIP...');
    await closePool();
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Erro não tratado:', { error });
});
