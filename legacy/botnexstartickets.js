require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits,
    ChannelType,
    SlashCommandBuilder,
    REST,
    Routes
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════════════
// 🌌 NEXSTAR TICKETS BOT - Sistema de Tickets Galáctico
// ══════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Configurações do .env
const TOKEN = process.env.DISCORD_TOKEN;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const TICKETS_CATEGORY_ID = process.env.TICKETS_CATEGORY_ID;
const TICKETS_CHANNEL_ID = process.env.TICKETS_CHANNEL_ID;
const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
const SEMI_OWNER_ROLE_ID = process.env.SEMI_OWNER_ROLE_ID;
const LOGS_TICKETS = process.env.LOGS_TICKETS;

// Caminho do arquivo de categorias
const CATEGORIES_FILE = path.join(__dirname, 'ticket_categories.json');

// ══════════════════════════════════════════════════════════════
// 🎨 Tema Galáctico - Cores e Emojis
// ══════════════════════════════════════════════════════════════

const THEME = {
    colors: {
        primary: 0x7B68EE,      // Roxo médio (Medium Slate Blue)
        success: 0x00FF7F,      // Verde espacial
        danger: 0xFF4500,       // Laranja avermelhado
        info: 0x1E90FF,         // Azul dodger
        warning: 0xFFD700,      // Dourado
        cosmic: 0x9400D3        // Violeta escuro
    },
    emojis: {
        star: '✨',
        rocket: '🚀',
        planet: '🪐',
        galaxy: '🌌',
        ticket: '🎫',
        close: '🔒',
        delete: '🗑️',
        edit: '✏️',
        add: '➕',
        list: '📋',
        log: '📜',
        user: '👤',
        staff: '👮',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }
};

// ══════════════════════════════════════════════════════════════
// 📁 Gerenciamento de Categorias (JSON)
// ══════════════════════════════════════════════════════════════

function loadCategories() {
    try {
        if (fs.existsSync(CATEGORIES_FILE)) {
            const data = fs.readFileSync(CATEGORIES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
    return [];
}

function saveCategories(categories) {
    try {
        fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Erro ao salvar categorias:', error);
        return false;
    }
}

function generateCategoryId() {
    return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ══════════════════════════════════════════════════════════════
// 🔐 Verificação de Permissões
// ══════════════════════════════════════════════════════════════

function hasAdminPermission(member) {
    return member.roles.cache.has(OWNER_ROLE_ID) || 
           member.roles.cache.has(SEMI_OWNER_ROLE_ID);
}

function hasStaffPermission(member) {
    return member.roles.cache.has(STAFF_ROLE_ID) || hasAdminPermission(member);
}

// ══════════════════════════════════════════════════════════════
// 📜 Sistema de Logs/Transcript
// ══════════════════════════════════════════════════════════════

async function createTranscript(channel, closedBy) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = [...messages.values()].reverse();

        let transcript = `╔══════════════════════════════════════════════════════════════╗\n`;
        transcript += `║           🌌 NEXSTAR TICKETS - TRANSCRIPT                    ║\n`;
        transcript += `╚══════════════════════════════════════════════════════════════╝\n\n`;
        transcript += `📋 Canal: ${channel.name}\n`;
        transcript += `📅 Data de Fechamento: ${new Date().toLocaleString('pt-BR')}\n`;
        transcript += `👤 Fechado por: ${closedBy.user.tag}\n`;
        transcript += `💬 Total de Mensagens: ${sortedMessages.length}\n\n`;
        transcript += `═══════════════════════════════════════════════════════════════\n\n`;

        for (const msg of sortedMessages) {
            const timestamp = msg.createdAt.toLocaleString('pt-BR');
            transcript += `[${timestamp}] ${msg.author.tag}:\n`;
            transcript += `${msg.content || '[Embed/Anexo]'}\n\n`;
        }

        transcript += `\n═══════════════════════════════════════════════════════════════\n`;
        transcript += `🚀 Fim do Transcript - Nexstar Tickets System\n`;

        return transcript;
    } catch (error) {
        console.error('Erro ao criar transcript:', error);
        return null;
    }
}

async function sendTranscriptToLogs(guild, transcript, ticketInfo) {
    try {
        const logsChannel = await guild.channels.fetch(LOGS_TICKETS);
        if (!logsChannel) return;

        const buffer = Buffer.from(transcript, 'utf8');
        
        const logEmbed = new EmbedBuilder()
            .setColor(THEME.colors.info)
            .setTitle(`${THEME.emojis.log} Ticket Fechado`)
            .setDescription(`
${THEME.emojis.ticket} **Ticket:** ${ticketInfo.channelName}
${THEME.emojis.user} **Aberto por:** <@${ticketInfo.userId}>
${THEME.emojis.staff} **Fechado por:** <@${ticketInfo.closedById}>
${THEME.emojis.planet} **Categoria:** ${ticketInfo.category}
            `)
            .setTimestamp()
            .setFooter({ text: '🌌 Nexstar Tickets System' });

        await logsChannel.send({
            embeds: [logEmbed],
            files: [{
                attachment: buffer,
                name: `transcript-${ticketInfo.channelName}-${Date.now()}.txt`
            }]
        });
    } catch (error) {
        console.error('Erro ao enviar transcript para logs:', error);
    }
}

// ══════════════════════════════════════════════════════════════
// 🎫 Sistema de Tickets
// ══════════════════════════════════════════════════════════════

async function sendTicketPanel(channel) {
    const categories = loadCategories();
    
    const embed = new EmbedBuilder()
        .setColor(THEME.colors.primary)
        .setTitle(`${THEME.emojis.galaxy} Central de Tickets - Nexstar`)
        .setDescription(`
${THEME.emojis.star} **Bem-vindo ao Sistema de Tickets!**

Selecione uma categoria abaixo para abrir seu ticket.
Nossa equipe galáctica está pronta para te ajudar!

${THEME.emojis.rocket} Escolha a categoria que melhor descreve sua necessidade.
        `)
        .setImage('https://i.ibb.co/TDRDH2kq/nexstar.jpg')
        .setThumbnail('https://i.ibb.co/TDRDH2kq/nexstar.jpg')
        .setFooter({ text: '🌌 Nexstar - Explorando o Universo Juntos' })
        .setTimestamp();

    if (categories.length === 0) {
        embed.addFields({
            name: `${THEME.emojis.warning} Nenhuma Categoria`,
            value: 'Ainda não há categorias configuradas. Um administrador deve criar categorias primeiro.'
        });
        await channel.send({ embeds: [embed] });
        return;
    }

    const options = categories.map(cat => ({
        label: cat.name,
        description: cat.description.substring(0, 100),
        value: cat.id,
        emoji: THEME.emojis.planet
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder(`${THEME.emojis.ticket} Selecione uma categoria...`)
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({ embeds: [embed], components: [row] });
}

async function createTicket(interaction, categoryId) {
    const categories = loadCategories();
    const category = categories.find(c => c.id === categoryId);
    
    if (!category) {
        return interaction.reply({
            content: `${THEME.emojis.error} Categoria não encontrada!`,
            ephemeral: true
        });
    }

    const guild = interaction.guild;
    const member = interaction.member;

    // Verificar se já tem um ticket aberto
    const existingTicket = guild.channels.cache.find(
        ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`
    );

    if (existingTicket) {
        return interaction.reply({
            content: `${THEME.emojis.warning} Você já possui um ticket aberto: ${existingTicket}`,
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const ticketChannel = await guild.channels.create({
            name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: ChannelType.GuildText,
            parent: TICKETS_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                },
                {
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageMessages
                    ]
                }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setColor(parseInt(category.color.replace('#', ''), 16))
            .setTitle(`${THEME.emojis.ticket} Ticket Aberto`)
            .setDescription(`
${THEME.emojis.star} **Olá, ${member.user}!**

Seu ticket foi criado com sucesso na categoria **${category.name}**.

${THEME.emojis.planet} **Descrição da Categoria:**
${category.description}

${THEME.emojis.rocket} Nossa equipe responderá em breve!
            `)
            .addFields(
                { name: `${THEME.emojis.user} Aberto por`, value: `${member.user.tag}`, inline: true },
                { name: `${THEME.emojis.galaxy} Categoria`, value: category.name, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: '🌌 Nexstar Tickets System' });

        const closeButton = new ButtonBuilder()
            .setCustomId(`close_ticket_${member.id}_${category.name}`)
            .setLabel('Fechar Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(THEME.emojis.close);

        const row = new ActionRowBuilder().addComponents(closeButton);

        await ticketChannel.send({
            content: `${member.user} | <@&${STAFF_ROLE_ID}>`,
            embeds: [ticketEmbed],
            components: [row]
        });

        await interaction.editReply({
            content: `${THEME.emojis.success} Seu ticket foi criado: ${ticketChannel}`
        });

    } catch (error) {
        console.error('Erro ao criar ticket:', error);
        await interaction.editReply({
            content: `${THEME.emojis.error} Erro ao criar o ticket. Tente novamente.`
        });
    }
}

async function closeTicket(interaction, userId, categoryName) {
    const channel = interaction.channel;
    const member = interaction.member;

    // Verificar permissões
    if (!hasStaffPermission(member) && member.id !== userId) {
        return interaction.reply({
            content: `${THEME.emojis.error} Você não tem permissão para fechar este ticket!`,
            ephemeral: true
        });
    }

    await interaction.deferReply();

    // Criar transcript
    const transcript = await createTranscript(channel, member);
    
    if (transcript) {
        await sendTranscriptToLogs(interaction.guild, transcript, {
            channelName: channel.name,
            userId: userId,
            closedById: member.id,
            category: categoryName
        });
    }

    const closeEmbed = new EmbedBuilder()
        .setColor(THEME.colors.danger)
        .setTitle(`${THEME.emojis.close} Ticket Fechado`)
        .setDescription(`
Este ticket será deletado em **5 segundos**.

${THEME.emojis.log} O transcript foi salvo no canal de logs.
        `)
        .setTimestamp();

    await interaction.editReply({ embeds: [closeEmbed] });

    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('Erro ao deletar canal:', error);
        }
    }, 5000);
}

// ══════════════════════════════════════════════════════════════
// 📝 Slash Commands
// ══════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('ticket-painel')
        .setDescription('Envia o painel de tickets no canal atual'),
    
    new SlashCommandBuilder()
        .setName('ticket-categoria')
        .setDescription('Gerenciar categorias de tickets')
        .addSubcommand(sub =>
            sub.setName('criar')
                .setDescription('Criar nova categoria de ticket')
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Nome da categoria')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('descricao')
                        .setDescription('Descrição da categoria')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('cor')
                        .setDescription('Cor em hexadecimal (ex: #7B68EE)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('Editar categoria existente')
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('ID da categoria para editar')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(opt =>
                    opt.setName('nome')
                        .setDescription('Novo nome da categoria'))
                .addStringOption(opt =>
                    opt.setName('descricao')
                        .setDescription('Nova descrição'))
                .addStringOption(opt =>
                    opt.setName('cor')
                        .setDescription('Nova cor em hexadecimal')))
        .addSubcommand(sub =>
            sub.setName('excluir')
                .setDescription('Excluir categoria de ticket')
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('ID da categoria para excluir')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('listar')
                .setDescription('Listar todas as categorias'))
];

// ══════════════════════════════════════════════════════════════
// 🎯 Event Handlers
// ══════════════════════════════════════════════════════════════

client.once('ready', async () => {
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  🌌 NEXSTAR TICKETS BOT - ONLINE                            ║`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);
    console.log(`║  Bot: ${client.user.tag.padEnd(45)}║`);
    console.log(`║  Servidores: ${client.guilds.cache.size.toString().padEnd(42)}║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

    // Registrar comandos
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    try {
        console.log('🚀 Registrando comandos slash...');
        
        for (const guild of client.guilds.cache.values()) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands.map(cmd => cmd.toJSON()) }
            );
        }
        
        console.log('✅ Comandos registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }

    // Criar arquivo de categorias se não existir
    if (!fs.existsSync(CATEGORIES_FILE)) {
        saveCategories([]);
        console.log('📁 Arquivo de categorias criado.');
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        // Autocomplete para categorias
        if (interaction.isAutocomplete()) {
            const categories = loadCategories();
            const focused = interaction.options.getFocused().toLowerCase();
            
            const filtered = categories
                .filter(cat => cat.name.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(cat => ({ name: cat.name, value: cat.id }));
            
            await interaction.respond(filtered);
            return;
        }

        // Seleção de categoria para abrir ticket
        if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
            const categoryId = interaction.values[0];
            await createTicket(interaction, categoryId);
            return;
        }

        // Botão de fechar ticket
        if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
            const parts = interaction.customId.split('_');
            const userId = parts[2];
            const categoryName = parts.slice(3).join('_');
            await closeTicket(interaction, userId, categoryName);
            return;
        }

        // Slash Commands
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            // Comando: /ticket-painel
            if (commandName === 'ticket-painel') {
                if (!hasAdminPermission(interaction.member)) {
                    return interaction.reply({
                        content: `${THEME.emojis.error} Apenas o Dono ou Semidono podem usar este comando!`,
                        ephemeral: true
                    });
                }
                await sendTicketPanel(interaction.channel);
                await interaction.reply({
                    content: `${THEME.emojis.success} Painel de tickets enviado!`,
                    ephemeral: true
                });
                return;
            }

            // Comando: /ticket-categoria
            if (commandName === 'ticket-categoria') {
                if (!hasAdminPermission(interaction.member)) {
                    return interaction.reply({
                        content: `${THEME.emojis.error} Apenas o Dono ou Semidono podem gerenciar categorias!`,
                        ephemeral: true
                    });
                }

                const subcommand = interaction.options.getSubcommand();

                // Criar categoria
                if (subcommand === 'criar') {
                    const nome = interaction.options.getString('nome');
                    const descricao = interaction.options.getString('descricao');
                    const cor = interaction.options.getString('cor');

                    // Validar cor hex
                    if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) {
                        return interaction.reply({
                            content: `${THEME.emojis.error} Cor inválida! Use formato hexadecimal (ex: #7B68EE)`,
                            ephemeral: true
                        });
                    }

                    const categories = loadCategories();
                    const newCategory = {
                        id: generateCategoryId(),
                        name: nome,
                        description: descricao,
                        color: cor,
                        createdAt: new Date().toISOString(),
                        createdBy: interaction.user.id
                    };

                    categories.push(newCategory);
                    saveCategories(categories);

                    const embed = new EmbedBuilder()
                        .setColor(parseInt(cor.replace('#', ''), 16))
                        .setTitle(`${THEME.emojis.success} Categoria Criada`)
                        .addFields(
                            { name: `${THEME.emojis.planet} Nome`, value: nome, inline: true },
                            { name: `${THEME.emojis.star} Cor`, value: cor, inline: true },
                            { name: `${THEME.emojis.galaxy} Descrição`, value: descricao }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                // Editar categoria
                if (subcommand === 'editar') {
                    const categoryId = interaction.options.getString('categoria');
                    const nome = interaction.options.getString('nome');
                    const descricao = interaction.options.getString('descricao');
                    const cor = interaction.options.getString('cor');

                    const categories = loadCategories();
                    const categoryIndex = categories.findIndex(c => c.id === categoryId);

                    if (categoryIndex === -1) {
                        return interaction.reply({
                            content: `${THEME.emojis.error} Categoria não encontrada!`,
                            ephemeral: true
                        });
                    }

                    if (cor && !/^#[0-9A-Fa-f]{6}$/.test(cor)) {
                        return interaction.reply({
                            content: `${THEME.emojis.error} Cor inválida! Use formato hexadecimal (ex: #7B68EE)`,
                            ephemeral: true
                        });
                    }

                    if (nome) categories[categoryIndex].name = nome;
                    if (descricao) categories[categoryIndex].description = descricao;
                    if (cor) categories[categoryIndex].color = cor;
                    categories[categoryIndex].updatedAt = new Date().toISOString();
                    categories[categoryIndex].updatedBy = interaction.user.id;

                    saveCategories(categories);

                    const embed = new EmbedBuilder()
                        .setColor(THEME.colors.success)
                        .setTitle(`${THEME.emojis.edit} Categoria Editada`)
                        .addFields(
                            { name: `${THEME.emojis.planet} Nome`, value: categories[categoryIndex].name, inline: true },
                            { name: `${THEME.emojis.star} Cor`, value: categories[categoryIndex].color, inline: true },
                            { name: `${THEME.emojis.galaxy} Descrição`, value: categories[categoryIndex].description }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                // Excluir categoria
                if (subcommand === 'excluir') {
                    const categoryId = interaction.options.getString('categoria');
                    const categories = loadCategories();
                    const categoryIndex = categories.findIndex(c => c.id === categoryId);

                    if (categoryIndex === -1) {
                        return interaction.reply({
                            content: `${THEME.emojis.error} Categoria não encontrada!`,
                            ephemeral: true
                        });
                    }

                    const deletedCategory = categories.splice(categoryIndex, 1)[0];
                    saveCategories(categories);

                    const embed = new EmbedBuilder()
                        .setColor(THEME.colors.danger)
                        .setTitle(`${THEME.emojis.delete} Categoria Excluída`)
                        .setDescription(`A categoria **${deletedCategory.name}** foi excluída com sucesso.`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }

                // Listar categorias
                if (subcommand === 'listar') {
                    const categories = loadCategories();

                    if (categories.length === 0) {
                        return interaction.reply({
                            content: `${THEME.emojis.warning} Nenhuma categoria cadastrada!`,
                            ephemeral: true
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setColor(THEME.colors.primary)
                        .setTitle(`${THEME.emojis.list} Categorias de Tickets`)
                        .setDescription(categories.map((cat, i) => 
                            `**${i + 1}.** ${THEME.emojis.planet} **${cat.name}**\n` +
                            `   ${THEME.emojis.star} Cor: \`${cat.color}\`\n` +
                            `   ${THEME.emojis.galaxy} ${cat.description}\n`
                        ).join('\n'))
                        .setFooter({ text: `Total: ${categories.length} categorias` })
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Erro na interação:', error);
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `${THEME.emojis.error} Ocorreu um erro ao processar sua solicitação.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `${THEME.emojis.error} Ocorreu um erro ao processar sua solicitação.`,
                ephemeral: true
            });
        }
    }
});

// ══════════════════════════════════════════════════════════════
// 🚀 Iniciar Bot
// ══════════════════════════════════════════════════════════════

client.login(TOKEN).catch(error => {
    console.error('❌ Erro ao fazer login:', error);
    process.exit(1);
});
