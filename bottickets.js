// Importa as classes necessárias da biblioteca discord.js
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');

// Carrega variáveis de ambiente
require('dotenv').config();

// --- CONFIGURAÇÕES ---
const TOKEN = process.env.DISCORD_TOKEN;
const ID_CARGO_STAFF = process.env.STAFF_ROLE_ID;
const ID_CATEGORIA_TICKETS = process.env.TICKETS_CATEGORY_ID;
const ID_CANAL_TICKETS = process.env.TICKETS_CHANNEL_ID;
const ID_CANAL_ANUNCIOS = process.env.ANNOUNCEMENTS_CHANNEL_ID;
const ID_CARGO_MEMBROS = process.env.MEMBERS_ROLE_ID;

// Validação das variáveis de ambiente
if (!TOKEN) {
    console.error('❌ DISCORD_TOKEN não configurado no arquivo .env');
    process.exit(1);
}

if (!ID_CARGO_STAFF) {
    console.error('❌ STAFF_ROLE_ID não configurado no arquivo .env');
    process.exit(1);
}

if (!ID_CATEGORIA_TICKETS) {
    console.error('❌ TICKETS_CATEGORY_ID não configurado no arquivo .env');
    process.exit(1);
}

if (!ID_CANAL_TICKETS) {
    console.warn('⚠️ TICKETS_CHANNEL_ID não configurado. Use /setup-tickets manualmente.');
}

if (!ID_CANAL_ANUNCIOS) {
    console.warn('⚠️ ANNOUNCEMENTS_CHANNEL_ID não configurado. Anúncios de parceria desabilitados.');
}

if (!ID_CARGO_MEMBROS) {
    console.warn('⚠️ MEMBERS_ROLE_ID não configurado. Anúncios não marcarão membros.');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Armazena os tickets ativos: Map<channelId, {userId, type, created}>
const activeTickets = new Map();

// Tipos de tickets disponíveis
const ticketTypes = {
    denuncia: {
        name: "🚨 Denúncia",
        description: "Reportar usuários ou conteúdo inadequado",
        emoji: "🚨"
    },
    suporte_canal: {
        name: "📺 Suporte para Canal",
        description: "Ajuda com configurações de canal",
        emoji: "📺"
    },
    comprar_vip: {
        name: "💎 Comprar VIP",
        description: "Informações sobre VIP e pagamento",
        emoji: "💎"
    },
    suporte_geral: {
        name: "🛠️ Suporte Geral",
        description: "Outros tipos de suporte",
        emoji: "🛠️"
    },
    parceria: {
        name: "🤝 Parceria",
        description: "Propostas de parceria e colaboração",
        emoji: "🤝"
    }
};

client.once('ready', async () => {
    console.log(`Sistema de Tickets ${client.user.tag} está online!`);

    // Registra os comandos fdfdddfdfdfdf
    const commands = [
        new SlashCommandBuilder()
            .setName('setup-tickets')
            .setDescription('[STAFF] Configura o painel de tickets no canal atual'),
        new SlashCommandBuilder()
            .setName('fechar-ticket')
            .setDescription('[STAFF] Fecha o ticket atual'),
        new SlashCommandBuilder()
            .setName('adicionar')
            .setDescription('[STAFF] Adiciona um usuário ao ticket')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para adicionar ao ticket')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('remover')
            .setDescription('[STAFF] Remove um usuário do ticket')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para remover do ticket')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('info-parceria')
            .setDescription('[STAFF] Mostra informações detalhadas sobre a parceria atual (use no ticket)')
    ];

    const commandsAsJson = commands.map(command => command.toJSON());
    client.application.commands.set(commandsAsJson);
    console.log('Comandos do sistema de tickets registrados!');

    // Configura o painel de tickets automaticamente no canal especificado
    if (ID_CANAL_TICKETS) {
        try {
            const ticketChannel = client.channels.cache.get(ID_CANAL_TICKETS);
            if (ticketChannel) {
                // Verifica se já existe um painel (evita spam)
                const messages = await ticketChannel.messages.fetch({ limit: 10 });
                const existingPanel = messages.find(msg => 
                    msg.author.id === client.user.id && 
                    msg.embeds.length > 0 && 
                    msg.embeds[0].title === '🎫 Sistema de Tickets'
                );

                if (!existingPanel) {
                    const embed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🎫 Sistema de Tickets')
                        .setDescription('Clique no botão abaixo para abrir um ticket e receber suporte da nossa equipe.\n\n**Como funciona:**\n• Clique em "Abrir Ticket"\n• Escolha o tipo do seu ticket\n• Aguarde o atendimento da staff\n\n*Utilize apenas para assuntos importantes.*')
                        .setFooter({ text: 'Sistema de Tickets • Nexstar' })
                        .setTimestamp();

                    const button = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('open_ticket')
                                .setLabel('Abrir Ticket')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🎫')
                        );

                    await ticketChannel.send({ embeds: [embed], components: [button] });
                    console.log(`✅ Painel de tickets configurado no canal: ${ticketChannel.name}`);
                } else {
                    console.log(`ℹ️ Painel de tickets já existe no canal: ${ticketChannel.name}`);
                }
            } else {
                console.log(`❌ Canal de tickets não encontrado (ID: ${ID_CANAL_TICKETS})`);
            }
        } catch (error) {
            console.error('❌ Erro ao configurar painel de tickets:', error);
        }
    } else {
        console.log('ℹ️ ID_CANAL_TICKETS não configurado. Use /setup-tickets manualmente.');
    }
});

// Listener para slash commands
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        // Verifica se o usuário é staff para comandos administrativos
        const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);

        if (commandName === 'setup-tickets') {
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem usar este comando.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎫 Sistema de Tickets')
                .setDescription('Clique no botão abaixo para abrir um ticket e receber suporte da nossa equipe.\n\n**Como funciona:**\n• Clique em "Abrir Ticket"\n• Escolha o tipo do seu ticket\n• Aguarde o atendimento da staff\n\n*Utilize apenas para assuntos importantes.*')
                .setFooter({ text: 'Sistema de Tickets • Nexstar' })
                .setTimestamp();

            const button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('open_ticket')
                        .setLabel('Abrir Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

            await interaction.reply({ embeds: [embed], components: [button] });
        }

        else if (commandName === 'fechar-ticket') {
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem fechar tickets.', ephemeral: true });
            }

            const channel = interaction.channel;
            if (!activeTickets.has(channel.id)) {
                return interaction.reply({ content: '❌ Este não é um canal de ticket.', ephemeral: true });
            }

            const ticketData = activeTickets.get(channel.id);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 Fechando Ticket')
                .setDescription('Este ticket será fechado em 5 segundos...')
                .setFooter({ text: `Fechado por: ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            setTimeout(async () => {
                try {
                    activeTickets.delete(channel.id);
                    await channel.delete();
                } catch (error) {
                    console.error('Erro ao fechar ticket:', error);
                }
            }, 5000);
        }

        else if (commandName === 'adicionar') {
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem adicionar usuários.', ephemeral: true });
            }

            const channel = interaction.channel;
            if (!activeTickets.has(channel.id)) {
                return interaction.reply({ content: '❌ Este não é um canal de ticket.', ephemeral: true });
            }

            const user = interaction.options.getUser('usuario');
            
            try {
                await channel.permissionOverwrites.edit(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                await interaction.reply({ content: `✅ ${user} foi adicionado ao ticket.` });
            } catch (error) {
                console.error('Erro ao adicionar usuário:', error);
                await interaction.reply({ content: '❌ Erro ao adicionar usuário ao ticket.', ephemeral: true });
            }
        }

        else if (commandName === 'remover') {
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem remover usuários.', ephemeral: true });
            }

            const channel = interaction.channel;
            if (!activeTickets.has(channel.id)) {
                return interaction.reply({ content: '❌ Este não é um canal de ticket.', ephemeral: true });
            }

            const user = interaction.options.getUser('usuario');
            const ticketData = activeTickets.get(channel.id);
            
            if (user.id === ticketData.userId) {
                return interaction.reply({ content: '❌ Não é possível remover o criador do ticket.', ephemeral: true });
            }

            try {
                await channel.permissionOverwrites.delete(user.id);
                await interaction.reply({ content: `✅ ${user} foi removido do ticket.` });
            } catch (error) {
                console.error('Erro ao remover usuário:', error);
                await interaction.reply({ content: '❌ Erro ao remover usuário do ticket.', ephemeral: true });
            }
        }

        else if (commandName === 'info-parceria') {
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem usar este comando.', ephemeral: true });
            }

            const channel = interaction.channel;
            if (!activeTickets.has(channel.id)) {
                return interaction.reply({ content: '❌ Este não é um canal de ticket.', ephemeral: true });
            }

            const ticketData = activeTickets.get(channel.id);
            if (ticketData.type !== 'parceria') {
                return interaction.reply({ content: '❌ Este não é um ticket de parceria.', ephemeral: true });
            }

            if (!ticketData.formCompleted) {
                return interaction.reply({ content: '⚠️ O formulário de parceria ainda não foi completado.', ephemeral: true });
            }

            const user = await client.users.fetch(ticketData.userId);
            
            const infoEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📊 Informações Detalhadas da Parceria')
                .setDescription(`**Solicitante:** ${user} (${user.tag})\n**ID:** ${user.id}\n**Conta criada:** <t:${Math.floor(user.createdTimestamp / 1000)}:F>\n**Ticket criado:** <t:${Math.floor(ticketData.created.getTime() / 1000)}:F>`)
                .addFields(
                    ...ticketData.responses.map((resp, index) => ({
                        name: `${index + 1}. ${resp.question}`,
                        value: resp.answer.length > 1024 ? resp.answer.substring(0, 1021) + '...' : resp.answer,
                        inline: false
                    }))
                );

            if (ticketData.memberCount) {
                infoEmbed.addFields({
                    name: '✅ Verificação Automática',
                    value: `**Membros verificados:** ${ticketData.memberCount.toLocaleString()}`,
                    inline: false
                });
            }

            infoEmbed.setFooter({ text: 'Informações para análise da staff' })
                .setTimestamp();

            await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
        }
    }

    // Listener para botões e select menus
    else if (interaction.isButton() || interaction.isStringSelectMenu()) {
        
        if (interaction.customId === 'open_ticket') {
            // Verifica se o usuário já tem um ticket aberto
            const existingTicket = Array.from(activeTickets.values()).find(ticket => ticket.userId === interaction.user.id);
            if (existingTicket) {
                const ticketChannel = interaction.guild.channels.cache.find(channel => 
                    activeTickets.has(channel.id) && activeTickets.get(channel.id).userId === interaction.user.id
                );
                return interaction.reply({ 
                    content: `❌ Você já possui um ticket aberto: ${ticketChannel}`, 
                    ephemeral: true 
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_type_select')
                .setPlaceholder('Selecione o tipo do seu ticket')
                .addOptions(
                    Object.entries(ticketTypes).map(([key, type]) => ({
                        label: type.name,
                        description: type.description,
                        value: key,
                        emoji: type.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({ 
                content: '🎫 **Selecione o tipo do seu ticket:**', 
                components: [row], 
                ephemeral: true 
            });
        }

        else if (interaction.customId === 'ticket_type_select') {
            const ticketType = interaction.values[0];
            const typeInfo = ticketTypes[ticketType];

            await interaction.deferReply({ ephemeral: true });

            try {
                const guild = interaction.guild;
                const channelName = `ticket-${typeInfo.emoji.replace(/[^\w]/g, '')}-${interaction.user.username}`.toLowerCase();

                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: ID_CATEGORIA_TICKETS,
                    permissionOverwrites: [
                        {
                            id: guild.id, // @everyone
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: interaction.user.id, // Criador do ticket
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory
                            ],
                        },
                        {
                            id: ID_CARGO_STAFF, // Staff
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageMessages
                            ],
                        },
                    ],
                });

                // Registra o ticket
                activeTickets.set(ticketChannel.id, {
                    userId: interaction.user.id,
                    type: ticketType,
                    created: new Date()
                });

                let welcomeEmbed, components;

                // Se for ticket de parceria, cria formulário específico
                if (ticketType === 'parceria') {
                    welcomeEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle(`${typeInfo.emoji} ${typeInfo.name}`)
                        .setDescription(`Olá ${interaction.user}!\n\n**Bem-vindo ao sistema de parcerias!**\n\nPara analisarmos sua proposta de parceria, precisamos de algumas informações sobre seu servidor. Por favor, clique no botão abaixo para preencher o formulário.\n\n**Criado em:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                        .setFooter({ text: 'Preencha o formulário para continuar' })
                        .setTimestamp();

                    components = [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('partnership_form')
                                    .setLabel('Preencher Formulário')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('📝'),
                                new ButtonBuilder()
                                    .setCustomId('close_ticket')
                                    .setLabel('Fechar Ticket')
                                    .setStyle(ButtonStyle.Danger)
                                    .setEmoji('🔒')
                            )
                    ];
                } else {
                    // Ticket normal
                    welcomeEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle(`${typeInfo.emoji} ${typeInfo.name}`)
                        .setDescription(`Olá ${interaction.user}!\n\nSeu ticket foi criado com sucesso. Nossa equipe será notificada e em breve alguém irá te atender.\n\n**Tipo do ticket:** ${typeInfo.description}\n**Criado em:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                        .setFooter({ text: 'Aguarde o atendimento da staff' })
                        .setTimestamp();

                    components = [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('close_ticket')
                                    .setLabel('Fechar Ticket')
                                    .setStyle(ButtonStyle.Danger)
                                    .setEmoji('🔒')
                            )
                    ];
                }

                await ticketChannel.send({ 
                    content: `${interaction.user} <@&${ID_CARGO_STAFF}>`, 
                    embeds: [welcomeEmbed], 
                    components: components 
                });

                await interaction.editReply({ 
                    content: `✅ Seu ticket foi criado! ${ticketChannel}` 
                });

            } catch (error) {
                console.error('Erro ao criar ticket:', error);
                await interaction.editReply({ 
                    content: '❌ Erro ao criar o ticket. Verifique as configurações do bot.' 
                });
            }
        }

        else if (interaction.customId === 'close_ticket') {
            const channel = interaction.channel;
            if (!activeTickets.has(channel.id)) {
                return interaction.reply({ content: '❌ Este não é um canal de ticket válido.', ephemeral: true });
            }

            const ticketData = activeTickets.get(channel.id);
            const isOwner = ticketData.userId === interaction.user.id;
            const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);

            if (!isOwner && !isStaff) {
                return interaction.reply({ content: '❌ Apenas o criador do ticket ou a staff podem fechar este ticket.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔒 Fechando Ticket')
                .setDescription('Este ticket será fechado em 5 segundos...')
                .setFooter({ text: `Fechado por: ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            setTimeout(async () => {
                try {
                    activeTickets.delete(channel.id);
                    await channel.delete();
                } catch (error) {
                    console.error('Erro ao fechar ticket:', error);
                }
            }, 5000);
        }

        else if (interaction.customId === 'partnership_form') {
            const channel = interaction.channel;
            if (!activeTickets.has(channel.id)) {
                return interaction.reply({ content: '❌ Este não é um canal de ticket válido.', ephemeral: true });
            }

            const ticketData = activeTickets.get(channel.id);
            if (ticketData.userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ Apenas o criador do ticket pode preencher o formulário.', ephemeral: true });
            }

            const formEmbed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('📝 Formulário de Parceria')
                .setDescription(`${interaction.user}, por favor responda às seguintes perguntas **em mensagens separadas** na ordem indicada:\n\n**1.** Qual o nome do seu servidor?\n**2.** Quantos membros seu servidor possui?\n**3.** Qual a temática/foco do servidor?\n**4.** Seus membros são ativos? (Sim/Não e explique)\n**5.** Cole aqui o link de convite do seu servidor\n**6.** Por que deseja fazer parceria conosco?\n\n*Aguarde nossa verificação após responder todas as perguntas.*`)
                .setFooter({ text: 'Responda uma pergunta por mensagem' })
                .setTimestamp();

            await interaction.reply({ embeds: [formEmbed] });

            // Armazena que o formulário foi iniciado
            activeTickets.set(channel.id, {
                ...ticketData,
                formStarted: true,
                responses: [],
                awaitingResponse: 1
            });
        }

        else if (interaction.customId === 'approve_partnership') {
            const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem aprovar parcerias.', ephemeral: true });
            }

            const channel = interaction.channel;
            const ticketData = activeTickets.get(channel.id);
            
            // Busca informações do servidor parceiro
            let partnerGuild = null;
            let serverLink = null;
            
            // Procura o link do servidor nas respostas (pergunta 5)
            if (ticketData.responses && ticketData.responses.length >= 5) {
                const linkResponse = ticketData.responses[4]; // Índice 4 = pergunta 5
                const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/([a-z0-9]+)/i;
                const match = linkResponse.answer.match(discordInviteRegex);
                
                if (match) {
                    try {
                        const inviteCode = match[5];
                        const invite = await client.fetchInvite(inviteCode);
                        partnerGuild = invite.guild;
                        serverLink = `https://discord.gg/${inviteCode}`;
                    } catch (error) {
                        console.error('Erro ao buscar informações do servidor:', error);
                    }
                }
            }

            const approvalEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Parceria Aprovada!')
                .setDescription(`**Parabéns!** Sua proposta de parceria foi **aprovada** pela nossa staff.\n\n**Aprovado por:** ${interaction.user}\n**Data da aprovação:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n**Próximos passos:**\n• Nossa equipe entrará em contato em breve\n• Definiremos os detalhes da parceria\n• Enviaremos as diretrizes de parceria\n• **Sua parceria será anunciada publicamente!**\n\n*Este ticket será fechado automaticamente em 30 segundos.*`)
                .setFooter({ text: 'Bem-vindo como parceiro!' })
                .setTimestamp();

            await interaction.reply({ embeds: [approvalEmbed] });

            // Anuncia a nova parceria no canal de anúncios
            if (ID_CANAL_ANUNCIOS) {
                try {
                    const announcementChannel = client.channels.cache.get(ID_CANAL_ANUNCIOS);
                    if (announcementChannel) {
                        const partnerUser = await client.users.fetch(ticketData.userId);
                        const serverName = ticketData.responses ? ticketData.responses[0]?.answer || 'Servidor Desconhecido' : 'Servidor Desconhecido';
                        const serverTheme = ticketData.responses && ticketData.responses.length >= 3 ? ticketData.responses[2]?.answer || 'Não informado' : 'Não informado';
                        const memberActivity = ticketData.responses && ticketData.responses.length >= 4 ? ticketData.responses[3]?.answer || 'Não informado' : 'Não informado';
                        
                        // Embed principal moderno e atrativo
                        const announcementEmbed = new EmbedBuilder()
                            .setColor('#2F3136') // Cor escura moderna
                            .setTitle('🎉 NOVA PARCERIA OFICIAL')
                            .setDescription(`┌─────────────────────────────────────┐\n│        **NEXSTAR PARTNERSHIPS**        │\n└─────────────────────────────────────┘\n\n🌟 **Temos o orgulho de anunciar nossa mais nova parceria oficial!**\n\n✨ Um novo servidor incrível se juntou à nossa família de parceiros!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
                            .addFields(
                                {
                                    name: '🏰 **SERVIDOR PARCEIRO**',
                                    value: `**\`${serverName}\`**\n🎯 **Temática:** ${serverTheme}\n👤 **Responsável:** ${partnerUser}`,
                                    inline: true
                                },
                                {
                                    name: '📊 **ESTATÍSTICAS**',
                                    value: partnerGuild ? 
                                        `👥 **${ticketData.memberCount ? ticketData.memberCount.toLocaleString() : 'N/A'}** membros\n💎 **Level ${partnerGuild.premiumTier || 0}** de boost\n🔗 **[Entrar no servidor](${serverLink})**` :
                                        `👥 **Verificando...** membros\n💎 **Level -** de boost\n🔗 **Link disponível**`,
                                    inline: true
                                },
                                {
                                    name: '🎪 **ATIVIDADE DOS MEMBROS**',
                                    value: `${memberActivity.length > 100 ? memberActivity.substring(0, 97) + '...' : memberActivity}`,
                                    inline: false
                                }
                            )
                            .setFooter({ 
                                text: '✨ Nexstar • Parcerias Oficiais • Crescendo Juntos', 
                                iconURL: client.user.displayAvatarURL() 
                            })
                            .setTimestamp();

                        // Adiciona ícone do servidor como thumbnail
                        if (partnerGuild && partnerGuild.iconURL()) {
                            announcementEmbed.setThumbnail(partnerGuild.iconURL({ size: 512, extension: 'png' }));
                        }

                        // Adiciona banner como imagem principal se houver
                        if (partnerGuild && partnerGuild.bannerURL()) {
                            announcementEmbed.setImage(partnerGuild.bannerURL({ size: 1024, extension: 'png' }));
                        } else {
                            // Se não tem banner, usa uma imagem padrão de celebração
                            announcementEmbed.setImage('https://media.discordapp.net/attachments/123456789/987654321/partnership_banner.gif'); // Você pode substituir por uma imagem sua
                        }

                        // Embed secundário com call-to-action
                        const ctaEmbed = new EmbedBuilder()
                            .setColor('#5865F2') // Cor azul do Discord
                            .setDescription(`🎊 **VENHA CELEBRAR CONOSCO!** 🎊\n\n🤝 Visite nosso novo parceiro e conheça uma comunidade incrível!\n🎉 Mais oportunidades, mais diversão, mais conexões!\n\n> *"Juntos somos mais fortes!"* 💪`)
                            .setFooter({ text: '🌟 Obrigado por fazer parte da nossa comunidade!' });

                        // Monta as menções com estilo
                        let mentions = '';
                        if (ID_CARGO_MEMBROS) {
                            mentions += `<@&${ID_CARGO_MEMBROS}> `;
                        }
                        mentions += `<@&${ID_CARGO_STAFF}>`;

                        const welcomeMessage = `${mentions}\n\n🎊 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🎊\n\n**🎉 CELEBRAÇÃO DE NOVA PARCERIA! 🎉**\n\n🎊 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🎊`;

                        await announcementChannel.send({ 
                            content: welcomeMessage, 
                            embeds: [announcementEmbed, ctaEmbed] 
                        });

                        console.log(`✅ Anúncio de parceria publicado para: ${serverName}`);
                    } else {
                        console.error('❌ Canal de anúncios não encontrado');
                    }
                } catch (error) {
                    console.error('❌ Erro ao publicar anúncio de parceria:', error);
                }
            }

            // Fecha o ticket após 30 segundos
            setTimeout(async () => {
                try {
                    activeTickets.delete(channel.id);
                    await channel.delete();
                } catch (error) {
                    console.error('Erro ao fechar ticket aprovado:', error);
                }
            }, 30000);
        }

        else if (interaction.customId === 'reject_partnership') {
            const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem rejeitar parcerias.', ephemeral: true });
            }

            const channel = interaction.channel;
            
            const rejectionEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Parceria Rejeitada')
                .setDescription(`Infelizmente, sua proposta de parceria não foi aprovada neste momento.\n\n**Rejeitado por:** ${interaction.user}\n**Data:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n**Possíveis motivos:**\n• Servidor não atende aos critérios mínimos\n• Pouca atividade dos membros\n• Temática incompatível\n• Já temos parcerias similares\n\n**Você pode:**\n• Trabalhar no crescimento do seu servidor\n• Tentar novamente no futuro\n• Entrar em contato para feedback específico\n\n*Este ticket será fechado automaticamente em 60 segundos.*`)
                .setFooter({ text: 'Obrigado pelo interesse!' })
                .setTimestamp();

            await interaction.reply({ embeds: [rejectionEmbed] });

            // Fecha o ticket após 60 segundos
            setTimeout(async () => {
                try {
                    activeTickets.delete(channel.id);
                    await channel.delete();
                } catch (error) {
                    console.error('Erro ao fechar ticket rejeitado:', error);
                }
            }, 60000);
        }

        else if (interaction.customId === 'request_more_info') {
            const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
            if (!isStaff) {
                return interaction.reply({ content: '❌ Apenas membros da staff podem solicitar mais informações.', ephemeral: true });
            }

            const moreInfoEmbed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('📝 Informações Adicionais Solicitadas')
                .setDescription(`A staff precisa de mais informações sobre sua proposta de parceria.\n\n**Solicitado por:** ${interaction.user}\n**Data:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n**Por favor, aguarde que um membro da staff irá especificar quais informações adicionais são necessárias.**\n\nApós fornecer as informações solicitadas, a análise da sua proposta continuará.`)
                .setFooter({ text: 'Aguarde instruções da staff' })
                .setTimestamp();

            await interaction.reply({ embeds: [moreInfoEmbed] });
        }
    }
});

// Listener para capturar respostas do formulário de parceria
client.on('messageCreate', async (message) => {
    // Ignora mensagens do bot
    if (message.author.bot) return;

    const channel = message.channel;
    
    // Verifica se é um ticket de parceria com formulário ativo
    if (!activeTickets.has(channel.id)) return;
    
    const ticketData = activeTickets.get(channel.id);
    
    // Verifica se é ticket de parceria, formulário foi iniciado e a mensagem é do criador
    if (ticketData.type !== 'parceria' || !ticketData.formStarted || ticketData.userId !== message.author.id) {
        return;
    }

    // Se já coletou todas as respostas, ignora
    if (ticketData.responses && ticketData.responses.length >= 6) return;

    const questions = [
        "Nome do servidor",
        "Número de membros", 
        "Temática/foco",
        "Membros ativos",
        "Link do servidor",
        "Motivo da parceria"
    ];

    const currentQuestion = ticketData.awaitingResponse;
    
    // Adiciona a resposta
    if (!ticketData.responses) ticketData.responses = [];
    ticketData.responses.push({
        question: questions[currentQuestion - 1],
        answer: message.content
    });

    // Reage à mensagem para confirmar que foi capturada
    await message.react('✅');

    // Verifica se é um link de Discord (pergunta 5)
    let memberCount = null;
    if (currentQuestion === 5) {
        const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/([a-z0-9]+)/i;
        const match = message.content.match(discordInviteRegex);
        
        if (match) {
            try {
                const inviteCode = match[5];
                const invite = await client.fetchInvite(inviteCode);
                memberCount = invite.memberCount;
                
                const verificationEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Link Verificado')
                    .setDescription(`**Servidor:** ${invite.guild.name}\n**Membros verificados:** ${memberCount.toLocaleString()}\n**Boost Level:** ${invite.guild.premiumTier || 0}`)
                    .setThumbnail(invite.guild.iconURL())
                    .setTimestamp();

                await channel.send({ embeds: [verificationEmbed] });
            } catch (error) {
                console.error('Erro ao verificar convite:', error);
                await channel.send('⚠️ Não foi possível verificar o link automaticamente. Nossa staff verificará manualmente.');
            }
        } else {
            await channel.send('⚠️ Link inválido ou não é um convite do Discord. Nossa staff verificará manualmente.');
        }
    }

    // Se coletou todas as respostas
    if (ticketData.responses.length >= 6) {
        const summaryEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 Resumo da Proposta de Parceria')
            .setDescription(`**Solicitante:** ${message.author}\n**Data:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                ticketData.responses.map((resp, index) => 
                    `**${index + 1}. ${resp.question}:**\n${resp.answer}`
                ).join('\n\n') +
                (memberCount ? `\n\n**✅ Membros Verificados:** ${memberCount.toLocaleString()}` : '')
            )
            .setFooter({ text: 'Proposta completa • Aguardando análise da staff' })
            .setTimestamp();

        const staffNotificationEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🔔 Nova Proposta de Parceria')
            .setDescription(`<@&${ID_CARGO_STAFF}> Uma nova proposta de parceria foi enviada e está completa para análise.\n\n**Ações disponíveis para a staff:**`)
            .setTimestamp();

        const approvalButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('approve_partnership')
                    .setLabel('Aprovar Parceria')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('reject_partnership')
                    .setLabel('Rejeitar Parceria')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('request_more_info')
                    .setLabel('Solicitar Mais Informações')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝')
            );

        await channel.send({ embeds: [summaryEmbed, staffNotificationEmbed], components: [approvalButtons] });

        // Atualiza o ticket para indicar que o formulário foi concluído
        activeTickets.set(channel.id, {
            ...ticketData,
            formCompleted: true,
            memberCount: memberCount
        });
    } else {
        // Próxima pergunta
        const nextQuestion = currentQuestion + 1;
        activeTickets.set(channel.id, {
            ...ticketData,
            awaitingResponse: nextQuestion
        });

        await channel.send(`✅ Resposta registrada! **Próxima pergunta (${nextQuestion}/6):** ${questions[nextQuestion - 1]}`);
    }
});

client.login(TOKEN);
