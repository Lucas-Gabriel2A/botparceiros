// Importa as classes necessárias da biblioteca discord.js
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');

// --- CONFIGURAÇÕES ---
// !! ALERTA DE SEGURANÇA !!
// NUNCA exponha seu token. Se você expôs o anterior, RESETE-O no Portal de Desenvolvedores.
// Cole seu NOVO token aqui APENAS para teste local.
const TOKEN = "MTE4NzcwMzI0NTczMzM4MDE4Nw.G1qJIg.iQozNUyV2iRYLTukxAz4fUFmlgBzPv5CnP_1Ws";

// !! VERIFIQUE OS IDs !!
// Certifique-se de que estes IDs estão corretos.
const ID_CARGO_STAFF = "1408499692261609644";
const ID_CARGO_VIP = "1408499708455948459";
const ID_CATEGORIA_TICKETS = "1408499726390792447";
const ID_CANAL_COMPRAS = "1408499775682252840"; // NOVO: ID do canal onde o painel pode ser criado

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// Armazena o ID do usuário que abriu cada ticket para referência futura.
const ticketOwners = new Map();

client.once('ready', () => {
    console.log(`Bot ${client.user.tag} está online!`);

    // Define a estrutura do comando de barra (slash command)
    const commands = [
        {
            name: 'painel-ticket',
            description: 'Envia o painel para abrir um ticket de compra VIP.',
        },
    ];
    // Registra o comando globalmente para o bot
    client.application.commands.set(commands);
    console.log('Comando /painel-ticket registrado com sucesso!');
    
    // Mantém o bot ativo no Replit
    const express = require('express');
    const app = express();
    app.get('/', (req, res) => res.send('Bot está rodando!'));
    app.listen(3000, () => console.log('Servidor web ativo na porta 3000'));
});

// Listener principal para todas as interações
client.on('interactionCreate', async interaction => {
    // Roteador de interações para manter o código organizado
    if (interaction.isCommand()) handleCommand(interaction);
    if (interaction.isButton()) handleButton(interaction);
});

// Função para lidar com comandos de barra
async function handleCommand(interaction) {
    if (interaction.commandName === 'painel-ticket') {
        // Apenas administradores podem enviar o painel
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Você não tem permissão para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        // VALIDAÇÃO: Verifica se o comando está sendo usado no canal correto
        if (interaction.channel.id !== ID_CANAL_COMPRAS) {
            return interaction.reply({ content: `❌ Este comando só pode ser usado no canal <#${ID_CANAL_COMPRAS}>.`, flags: MessageFlags.Ephemeral });
        }

        // NOVO: Texto com as vantagens do VIP
        const vantagensVIP = `
**Vantagens Exclusivas do VIP:**
> 📞 Crie salas de voz privadas para você e seus amigos.
> 👑 Ganhe cargos exclusivos no servidor.
> 🚀 Tenha prioridade no atendimento via ticket.

Clique no botão abaixo para iniciar o processo de compra por **R$ 10,00**.
        `;

        // Embed principal para abrir o ticket
        const embed = new EmbedBuilder()
            .setColor('#5865F2') // Cor "Blurple" do Discord
            .setTitle('⭐ Central de Aquisição VIP ⭐')
            .setDescription(vantagensVIP)
            .setImage('https://www.cartolamilgrau.com/wp-content/uploads/2024/12/GRUPO-VIP-CARTOLA-FC-PLANO-DE-SOCIOS-PARA-MITAR.jpg') 
            .setFooter({ text: `${interaction.guild.name} | Sistema de Tickets | by metecomsono`, iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        // Botão para abrir o ticket
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('abrir_ticket')
                    .setLabel('Adquirir VIP')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⭐')
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Painel de tickets enviado com sucesso!', flags: MessageFlags.Ephemeral });
    }
}

// Função para lidar com interações de botão
async function handleButton(interaction) {
    const customId = interaction.customId;
    const guild = interaction.guild;
    const user = interaction.user;

    // Lógica para ABRIR o ticket
    if (customId === 'abrir_ticket') {
        const ticketName = `ticket-${user.username}`;

        if (guild.channels.cache.find(channel => channel.name.toLowerCase() === ticketName.toLowerCase())) {
            return interaction.reply({ content: '⚠️ Você já possui um ticket aberto.', flags: MessageFlags.Ephemeral });
        }

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

        ticketOwners.set(channel.id, user.id);
        await interaction.reply({ content: `✅ Seu ticket foi criado em ${channel}!`, flags: MessageFlags.Ephemeral });

        const embedTicket = new EmbedBuilder()
            .setColor('#f1c40f')
            .setAuthor({ name: `Ticket de ${user.username}`, iconURL: user.displayAvatarURL() })
            .setDescription('Olá! Siga as instruções abaixo para concluir sua compra.')
            .addFields(
                { name: '📦 Produto', value: 'Acesso VIP', inline: true },
                { name: '💰 Valor', value: 'R$ 10,00', inline: true },
                // NOVO: Campo com as vantagens
                { name: '⭐ Vantagens Inclusas', value: 'Calls privadas, Cargos exclusivos e Prioridade nos tickets.' },
                { name: '🔑 Chave PIX (Copia e Cola)', value: '`d065a8bb-e382-45b9-91bd-d25a6c4aa8f9`' },
                { name: '⚠️ Instruções', value: 'Após realizar o pagamento, envie o comprovante nesta conversa para que um Staff possa validar sua compra.' }
            )
            .setFooter({ text: `ID do Usuário: ${user.id}` })
            .setTimestamp();

        // Dois botões para a Staff
        const rowTicket = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirmar_pagamento')
                .setLabel('Confirmar Pagamento')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('cancelar_ticket')
                .setLabel('Cancelar Ticket')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );

        await channel.send({
            content: `||<@&${ID_CARGO_STAFF}>, novo ticket de ${user}.||`,
            embeds: [embedTicket],
            components: [rowTicket]
        });
    }
    // Lógica para CONFIRMAR PAGAMENTO
    else if (customId === 'confirmar_pagamento') {
        if (!interaction.member.roles.cache.has(ID_CARGO_STAFF)) {
            return interaction.reply({ content: '❌ Apenas membros da Staff podem usar este botão.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.channel;
        const userId = ticketOwners.get(channel.id);
        
        if (!userId) {
            return interaction.reply({ content: '❌ Erro: Não foi possível encontrar o dono do ticket.', flags: MessageFlags.Ephemeral });
        }

        const memberToReceiveRole = await guild.members.fetch(userId);

        try {
            await memberToReceiveRole.roles.add(ID_CARGO_VIP);

            const embedFechamento = new EmbedBuilder()
                .setColor('#2ecc71') // Verde
                .setTitle('✅ Compra Aprovada!')
                .setDescription(`O cargo **VIP** foi atribuído a ${memberToReceiveRole.user.tag} com sucesso!\n\nEste canal será deletado em 10 segundos.`)
                .setFooter({ text: `Ticket fechado por: ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embedFechamento] });
            
            ticketOwners.delete(channel.id);
            setTimeout(() => channel.delete(), 10000);

        } catch (error) {
            console.error("Erro ao atribuir cargo ou deletar canal:", error);
            await interaction.reply({ content: '❌ Ocorreu um erro. Verifique se meu cargo está acima do cargo VIP.', flags: MessageFlags.Ephemeral });
        }
    }
    // Lógica para CANCELAR TICKET
    else if (customId === 'cancelar_ticket') {
        if (!interaction.member.roles.cache.has(ID_CARGO_STAFF)) {
            return interaction.reply({ content: '❌ Apenas membros da Staff podem usar este botão.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.channel;
        const embedCancelamento = new EmbedBuilder()
            .setColor('#e74c3c') // Vermelho
            .setTitle('🗑️ Ticket Cancelado')
            .setDescription(`Este ticket foi fechado por ${interaction.user.tag} sem a atribuição de cargos.\n\nO canal será deletado em 10 segundos.`);

        await interaction.reply({ embeds: [embedCancelamento] });

        ticketOwners.delete(channel.id);
        setTimeout(() => channel.delete(), 10000);
    }
}

client.login(TOKEN);
