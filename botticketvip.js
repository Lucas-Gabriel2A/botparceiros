// Importa as classes necessárias da biblioteca discord.js
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
    TextInputStyle,
    UserSelectMenuBuilder
} = require('discord.js');
require('dotenv').config();

// --- CONFIGURAÇÕES VIA VARIÁVEIS DE AMBIENTE ---
const TOKEN = process.env.DISCORD_TOKEN_VIP;
const ID_CARGO_STAFF = process.env.VIP_STAFF_ROLE_ID;
const ID_CARGO_VIP = process.env.VIP_CARGO_VIP_ID;
const ID_CATEGORIA_TICKETS = process.env.VIP_CATEGORIA_TICKETS_ID;
const ID_CANAL_COMPRAS = process.env.VIP_CANAL_COMPRAS_ID;
const ID_CANAL_LOGS = process.env.VIP_CANAL_LOGS_ID; // Novo: canal de logs

// 🎨 PALETA DE CORES NEXSTAR
const CORES = {
    AZUL_ESCURO: '#020940',      // Fundo principal
    AZUL_PROFUNDO: '#080F26',    // Fundo secundário
    DOURADO: '#F2B445',          // Destaques
    CREME: '#F2EFD0',            // Texto claro
    LARANJA: '#D98E32',          // Accent
    SUCESSO: '#2ecc71',          // Verde - Sucesso
    ERRO: '#e74c3c',             // Vermelho - Erro
    AVISO: '#f39c12',            // Amarelo - Aviso
    INFO: '#3498db'              // Azul - Info
};

// 🖼️ BANNER E ÍCONES NEXSTAR
const NEXSTAR_BANNER = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';

// ✨ EMOJIS
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
};

// 💳 CHAVE PIX
const CHAVE_PIX = 'd065a8bb-e382-45b9-91bd-d25a6c4aa8f9';
const VALOR_VIP = 'R$ 10,00';

// Validação das variáveis de ambiente
if (!TOKEN) {
    console.error(`${EMOJIS.ERRO} DISCORD_TOKEN_VIP não configurado no arquivo .env`);
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// 📊 Armazena informações dos tickets
// Map<channelId, TicketData>
const ticketOwners = new Map();
// TicketData = { 
//   ownerId: string, 
//   createdAt: Date, 
//   status: 'aberto' | 'aguardando_pagamento' | 'fechado'
// }

// 🔧 Função helper para criar embeds padronizados
function criarEmbedNexstar(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.cor || CORES.DOURADO)
        .setTimestamp()
        .setFooter({ 
            text: options.footer || `${EMOJIS.ESTRELA} Nexstar VIP`, 
            iconURL: options.footerIcon || null
        });

    if (options.titulo) embed.setTitle(options.titulo);
    if (options.descricao) embed.setDescription(options.descricao);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.imagem) embed.setImage(options.imagem);
    if (options.autor) embed.setAuthor(options.autor);
    if (options.campos) embed.addFields(options.campos);

    return embed;
}

// 📝 Função para enviar log
async function enviarLog(guild, embed) {
    if (!ID_CANAL_LOGS) return;
    
    try {
        const canalLogs = guild.channels.cache.get(ID_CANAL_LOGS);
        if (canalLogs) {
            await canalLogs.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Erro ao enviar log:', error);
    }
}

// 📋 Função para gerar transcript simples
async function gerarTranscript(channel, limite = 100) {
    try {
        const messages = await channel.messages.fetch({ limit: limite });
        const transcript = messages
            .reverse()
            .map(m => `[${m.createdAt.toLocaleString('pt-BR')}] ${m.author.tag}: ${m.content || '[Embed/Arquivo]'}`)
            .join('\n');
        return transcript;
    } catch (error) {
        console.error('Erro ao gerar transcript:', error);
        return 'Erro ao gerar transcript';
    }
}

client.once('ready', () => {
    console.log(`${EMOJIS.FOGUETE} Bot ${client.user.tag} está online!`);

    const commands = [
        {
            name: 'painel-ticket',
            description: `${EMOJIS.TICKET} Envia o painel para abrir um ticket de compra VIP.`,
        },
    ];
    
    client.application.commands.set(commands);
    console.log(`${EMOJIS.SUCESSO} Comando /painel-ticket registrado!`);
});

// 🎮 Listener principal para todas as interações
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) await handleCommand(interaction);
        if (interaction.isButton()) await handleButton(interaction);
        if (interaction.isModalSubmit()) await handleModal(interaction);
        if (interaction.isUserSelectMenu()) await handleUserSelect(interaction);
    } catch (error) {
        console.error('Erro na interação:', error);
    }
});

// 📝 Handler de comandos
async function handleCommand(interaction) {
    if (interaction.commandName === 'painel-ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Acesso Negado`,
                descricao: 'Você não tem permissão para usar este comando.'
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (interaction.channel.id !== ID_CANAL_COMPRAS) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Canal Incorreto`,
                descricao: `Este comando só pode ser usado no canal <#${ID_CANAL_COMPRAS}>.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // Embed principal premium
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
            footer: `${interaction.guild.name} | Sistema de Tickets VIP`,
            footerIcon: interaction.guild.iconURL()
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket')
                    .setLabel('Adquirir VIP')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(EMOJIS.ESTRELA)
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        const confirmEmbed = criarEmbedNexstar({
            cor: CORES.SUCESSO,
            titulo: `${EMOJIS.SUCESSO} Painel Enviado`,
            descricao: 'O painel de tickets foi enviado com sucesso!'
        });
        await interaction.reply({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });
    }
}

// 🔘 Handler de botões
async function handleButton(interaction) {
    const customId = interaction.customId;
    const guild = interaction.guild;
    const user = interaction.user;

    // ═══════════════════════════════════════════════════════════════
    // 🎫 ABRIR TICKET
    // ═══════════════════════════════════════════════════════════════
    if (customId === 'abrir_ticket') {
        const ticketName = `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        // Verifica se já tem ticket aberto
        const ticketExistente = guild.channels.cache.find(
            channel => channel.name === ticketName
        );
        
        if (ticketExistente) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Ticket Existente`,
                descricao: `Você já possui um ticket aberto!\n\n> Acesse: ${ticketExistente}`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

            // Armazena dados do ticket
            ticketOwners.set(channel.id, {
                ownerId: user.id,
                createdAt: new Date(),
                status: 'aguardando_pagamento'
            });

            // Embed do ticket
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
                    { 
                        name: `${EMOJIS.ESTRELA} Vantagens Inclusas`, 
                        value: '> Calls privadas, Cargos exclusivos e Prioridade nos tickets.' 
                    },
                    { 
                        name: `${EMOJIS.CHAVE} Chave PIX (Copia e Cola)`, 
                        value: `\`\`\`${CHAVE_PIX}\`\`\`` 
                    },
                    { 
                        name: `${EMOJIS.AVISO} Instruções`, 
                        value: '> Após realizar o pagamento, envie o **comprovante** neste canal.\n> Use o botão abaixo para copiar o PIX facilmente!' 
                    }
                ],
                imagem: NEXSTAR_BANNER,
                footer: `ID: ${user.id}`
            });

            // Botões para USUÁRIO
            const rowUsuario = new ActionRowBuilder().addComponents(
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

            // Botões para STAFF
            const rowStaff = new ActionRowBuilder().addComponents(
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

            // Resposta ao usuário
            const embedConfirm = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Ticket Criado!`,
                descricao: `Seu ticket foi criado com sucesso!\n\n> Acesse: ${channel}`
            });
            await interaction.editReply({ embeds: [embedConfirm] });

            // Log de abertura
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
            console.error('Erro ao criar ticket:', error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível criar o ticket.\n\n> \`${error.message}\``
            });
            await interaction.editReply({ embeds: [embed] });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 📋 COPIAR PIX (Usuário)
    // ═══════════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════════
    // ❓ PRECISO DE AJUDA (Usuário)
    // ═══════════════════════════════════════════════════════════════
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
        
        // Notifica a staff que usuário pediu ajuda
        await interaction.channel.send({
            content: `<@&${ID_CARGO_STAFF}>, ${interaction.user} precisa de ajuda!`
        });
        
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ CONFIRMAR PAGAMENTO (Staff)
    // ═══════════════════════════════════════════════════════════════
    else if (customId === 'confirmar_pagamento') {
        if (!interaction.member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode confirmar pagamentos.'
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.channel;
        const ticketData = ticketOwners.get(channel.id);
        
        if (!ticketData) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: 'Não foi possível encontrar os dados do ticket.'
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            const member = await guild.members.fetch(ticketData.ownerId);
            await member.roles.add(ID_CARGO_VIP);

            // Gerar transcript
            const transcript = await gerarTranscript(channel);

            const embedFechamento = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Compra Aprovada!`,
                descricao: `O cargo **VIP** foi atribuído a ${member} com sucesso!\n\n` +
                    `> ${EMOJIS.RELOGIO} Este canal será deletado em **10 segundos**.`,
                campos: [
                    { name: 'Cliente', value: `${member}`, inline: true },
                    { name: 'Aprovado por', value: `${interaction.user}`, inline: true }
                ]
            });

            await interaction.reply({ embeds: [embedFechamento] });

            // Log de aprovação
            const logEmbed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.SUCESSO} Pagamento Confirmado`,
                campos: [
                    { name: 'Cliente', value: `${member} (\`${member.id}\`)`, inline: true },
                    { name: 'Staff', value: `${interaction.user}`, inline: true },
                    { name: 'Valor', value: VALOR_VIP, inline: true },
                    { name: 'Transcript', value: `\`\`\`${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}\`\`\``, inline: false }
                ]
            });
            await enviarLog(guild, logEmbed);

            ticketOwners.delete(channel.id);
            setTimeout(() => channel.delete().catch(console.error), 10000);

        } catch (error) {
            console.error('Erro ao confirmar pagamento:', error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível atribuir o cargo.\n\n> Verifique se o cargo do bot está acima do VIP.`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🗑️ CANCELAR TICKET (Staff)
    // ═══════════════════════════════════════════════════════════════
    else if (customId === 'cancelar_ticket') {
        if (!interaction.member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode cancelar tickets.'
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.channel;
        const ticketData = ticketOwners.get(channel.id);

        // Gerar transcript antes de deletar
        const transcript = await gerarTranscript(channel);

        const embedCancelamento = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.LIXO} Ticket Cancelado`,
            descricao: `Este ticket foi cancelado por ${interaction.user}.\n\n` +
                `> ${EMOJIS.RELOGIO} O canal será deletado em **10 segundos**.`
        });

        await interaction.reply({ embeds: [embedCancelamento] });

        // Log de cancelamento
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
        setTimeout(() => channel.delete().catch(console.error), 10000);
    }

    // ═══════════════════════════════════════════════════════════════
    // ➕ ADICIONAR MEMBRO (Staff)
    // ═══════════════════════════════════════════════════════════════
    else if (customId === 'adicionar_membro') {
        if (!interaction.member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode adicionar membros.'
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const row = new ActionRowBuilder()
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

    // ═══════════════════════════════════════════════════════════════
    // ➖ REMOVER MEMBRO (Staff)
    // ═══════════════════════════════════════════════════════════════
    else if (customId === 'remover_membro') {
        if (!interaction.member.roles.cache.has(ID_CARGO_STAFF)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: 'Apenas a **Staff** pode remover membros.'
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const row = new ActionRowBuilder()
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

// 👤 Handler de seleção de usuário
async function handleUserSelect(interaction) {
    const customId = interaction.customId;
    const selectedUserId = interaction.values[0];
    const channel = interaction.channel;
    const ticketData = ticketOwners.get(channel.id);

    // Adicionar membro
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
            console.error('Erro ao adicionar membro:', error);
            await interaction.update({ content: `${EMOJIS.ERRO} Erro ao adicionar membro.`, embeds: [], components: [] });
        }
    }

    // Remover membro
    else if (customId === 'select_remover_membro') {
        // Não permite remover o dono do ticket
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
            console.error('Erro ao remover membro:', error);
            await interaction.update({ content: `${EMOJIS.ERRO} Erro ao remover membro.`, embeds: [], components: [] });
        }
    }
}

// 📝 Handler de modais (para uso futuro)
async function handleModal(interaction) {
    // Implementar se necessário
}

// 🔌 Login
client.login(TOKEN);

// 🧹 Handler de erros não tratados
process.on('unhandledRejection', error => {
    console.error('Erro não tratado:', error);
});
