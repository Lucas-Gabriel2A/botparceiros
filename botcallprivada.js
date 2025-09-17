// Importa as classes necessárias da biblioteca discord.js
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags, SlashCommandBuilder } = require('discord.js');


const TOKEN = "MTQwNjE5MTAyMjI2NjEyMjM0Mw.GeHvoQ.Lep5m0qKE6pnDqG2ZqkeCSdCzU39xqXeculZ_M";


const ID_CARGO_VIP = "1408499708455948459";
const ID_CATEGORIA_CALLS = "1408499733970026516"; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates // Necessário para monitorar quem entra/sai de calls
        // Removido GuildMembers que precisa ser habilitado manualmente
    ],
    partials: [Partials.Channel],
    sweepers: {
        // Limpa cache de mensagens antigas
        messages: {
            interval: 300, // 5 minutos
            lifetime: 1800, // 30 minutos
        },
        // Limpa membros inativos
        users: {
            interval: 3600, // 1 hora
            filter: () => user => user.bot,
        }
    }
});

// Armazena as calls privadas ativas: Map<channelId, ownerId>
const privateCallOwners = new Map();

// Sistema de limpeza automática para evitar vazamentos de memória
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Remove entradas órfãs (canais que não existem mais)
    for (const [channelId, data] of privateCallOwners) {
        const guild = client.guilds.cache.first();
        if (guild && !guild.channels.cache.has(channelId)) {
            privateCallOwners.delete(channelId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Limpeza: ${cleanedCount} canais órfãos removidos da memória`);
    }
}, 600000); // 10 minutos

// Função para monitorar uso de memória
function logMemoryUsage() {
    const used = process.memoryUsage();
    const memMB = Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    console.log(`💾 Memória: ${memMB}MB | Calls ativas: ${privateCallOwners.size}`);
    
    // Alerta se passar de 70MB
    if (memMB > 70) {
        console.warn(`⚠️ Uso de memória alto: ${memMB}MB`);
    }
}

client.once('ready', () => {
    console.log(`Bot de Calls Privadas ${client.user.tag} está online!`);
    
    // Log inicial de memória
    logMemoryUsage();
    
    // Monitoramento de memória a cada 5 minutos
    setInterval(logMemoryUsage, 300000);

    // Diagnóstico de permissões
    const guild = client.guilds.cache.first();
    if (guild) {
        const botMember = guild.members.cache.get(client.user.id);
        const category = guild.channels.cache.get(ID_CATEGORIA_CALLS);
        
        console.log(`🔍 Diagnóstico do servidor: ${guild.name}`);
        console.log(`📁 Categoria encontrada: ${category ? '✅ Sim' : '❌ Não'} (${ID_CATEGORIA_CALLS})`);
        console.log(`🤖 Permissões do bot: ${botMember ? botMember.permissions.toArray().join(', ') : 'Não encontrado'}`);
        
        if (category && botMember) {
            const perms = category.permissionsFor(botMember);
            console.log(`🔒 Permissões na categoria: Gerenciar Canais: ${perms.has('ManageChannels') ? '✅' : '❌'}, Ver Canal: ${perms.has('ViewChannel') ? '✅' : '❌'}`);
        }
    }

    // Define a estrutura dos comandos de barra (slash commands)
    const commands = [
        new SlashCommandBuilder()
            .setName('criar-call')
            .setDescription('✨ [VIP] Cria uma sala de voz privada temporária para você.'),
        new SlashCommandBuilder()
            .setName('convidar')
            .setDescription('📲 [VIP] Convida um amigo para a sua sala de voz privada.')
            .addUserOption(option =>
                option.setName('membro')
                    .setDescription('O membro que você deseja convidar.')
                    .setRequired(true)),
    ];
    
    // Converte os comandos para o formato JSON e registra no Discord
    const commandsAsJson = commands.map(command => command.toJSON());
    client.application.commands.set(commandsAsJson);
    console.log('Comandos /criar-call e /convidar registrados com sucesso!');
});

// Listener principal para todas as interações
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    // Protege contra interações inválidas
    if (!interaction.guild || !interaction.member) {
        console.error('Interação sem guild ou member:', interaction);
        return;
    }

    const { commandName } = interaction;

    // --- Comando para CRIAR a call ---
    if (commandName === 'criar-call') {
        // Verifica se o usuário tem o cargo VIP
        if (!interaction.member.roles.cache.has(ID_CARGO_VIP)) {
            return interaction.reply({ content: '❌ Apenas membros VIP podem usar este comando.', flags: MessageFlags.Ephemeral });
        }

        // Verifica se o usuário já tem uma call criada
        if (Array.from(privateCallOwners.values()).includes(interaction.user.id)) {
            return interaction.reply({ content: '⚠️ Você já possui uma sala privada ativa. Use-a ou espere ela ser deletada.', flags: MessageFlags.Ephemeral });
        }

        try {
            const channelName = `📞 ${interaction.user.username}`;
            const guild = interaction.guild;

            // Cria o canal de voz
            let channel;
            try {
                // Verifica se a categoria existe
                const category = guild.channels.cache.get(ID_CATEGORIA_CALLS);
                if (!category) {
                    console.error(`Categoria ${ID_CATEGORIA_CALLS} não encontrada no servidor ${guild.name}`);
                    await interaction.reply({ content: `❌ Categoria de calls não encontrada. Verifique o ID: \`${ID_CATEGORIA_CALLS}\``, flags: MessageFlags.Ephemeral });
                    return;
                }

                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: ID_CATEGORIA_CALLS,
                    permissionOverwrites: [
                        {
                            id: guild.id, // @everyone
                            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        },
                        {
                            id: interaction.user.id, // Dono da call
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers],
                        },
                    ],
                });
            } catch (err) {
                console.error('Erro detalhado ao criar canal:', {
                    error: err.message,
                    code: err.code,
                    status: err.status,
                    guild: guild.name,
                    category: ID_CATEGORIA_CALLS,
                    user: interaction.user.tag
                });
                
                let errorMessage = '❌ Não foi possível criar a sala. ';
                if (err.code === 50013) {
                    errorMessage += 'O bot não tem permissões suficientes.';
                } else if (err.code === 50001) {
                    errorMessage += 'Acesso negado à categoria de calls.';
                } else if (err.code === 10003) {
                    errorMessage += 'Categoria de calls não encontrada.';
                } else {
                    errorMessage += `Erro: ${err.message}`;
                }
                
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
                return;
            }

            // Armazena a informação da call
            privateCallOwners.set(channel.id, interaction.user.id);

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Sala Privada Criada!')
                .setDescription(`Sua sala de voz ${channel ? channel.name : 'desconhecida'} foi criada com sucesso.\n\n> Use o comando \`/convidar @membro\` para chamar seus amigos.\n> A sala será **deletada automaticamente** quando ficar vazia.`)
                .setTimestamp();

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            console.error("Erro ao criar call privada:", error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao criar sua sala. Verifique se a categoria de calls está configurada corretamente.', flags: MessageFlags.Ephemeral });
            }
        }
    }

    // --- Comando para CONVIDAR para a call ---
    if (commandName === 'convidar') {
    const memberToInvite = interaction.options.getMember('membro');
    const userVoiceChannel = interaction.member.voice ? interaction.member.voice.channel : undefined;

        // Verifica se o usuário está em uma call
        if (!userVoiceChannel) {
            return interaction.reply({ content: '❌ Você precisa estar em uma sala de voz para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        // Verifica se o usuário é o dono da call em que está
        if (privateCallOwners.get(userVoiceChannel.id) !== interaction.user.id) {
            return interaction.reply({ content: '❌ Você só pode convidar pessoas para a sua própria sala privada.', flags: MessageFlags.Ephemeral });
        }
        
        if (!memberToInvite) {
            return interaction.reply({ content: '❌ Não foi possível encontrar o membro mencionado.', flags: MessageFlags.Ephemeral });
        }
        
        if (memberToInvite.id === interaction.user.id) {
            return interaction.reply({ content: '❌ Você não pode convidar a si mesmo!', flags: MessageFlags.Ephemeral });
        }

        try {
            // Edita as permissões do canal para o membro convidado
            if (!userVoiceChannel) {
                return interaction.reply({ content: '❌ Sala de voz não encontrada.', flags: MessageFlags.Ephemeral });
            }
            try {
                await userVoiceChannel.permissionOverwrites.edit(memberToInvite.id, {
                    ViewChannel: true,
                    Connect: true,
                });
            } catch (err) {
                console.error('Erro ao editar permissões:', err);
                return interaction.reply({ content: '❌ Não foi possível editar permissões da sala.', flags: MessageFlags.Ephemeral });
            }

            // Cria um convite para a call
            let invite;
            try {
                invite = await userVoiceChannel.createInvite({
                    maxAge: 300, // 5 minutos
                    maxUses: 1, // Apenas 1 uso
                    reason: `Convite para ${memberToInvite.user.tag} entrar na sala de ${interaction.user.tag}`
                });
            } catch (err) {
                console.error('Erro ao criar convite:', err);
                return interaction.reply({ content: '❌ Não foi possível criar o convite para a sala.', flags: MessageFlags.Ephemeral });
            }

            // Cria o embed para a DM do convidado
            const dmEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`📲 Você foi convidado!`)
                .setDescription(`${interaction.user} convidou você para a sala de voz privada **${userVoiceChannel.name}**.\n\nClique no botão abaixo para se conectar!`)
                .setFooter({ text: `Servidor: ${interaction.guild.name}` })
                .setTimestamp();

            // Cria o botão com o link do convite
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Conectar-se à Sala')
                        .setStyle(ButtonStyle.Link)
                        .setURL(invite.url)
                        .setEmoji('🔗')
                );

            let dmSent = true;
          
            try {
                await memberToInvite.send({ embeds: [dmEmbed], components: [row] });
            } catch (error) {
                console.log(`Não foi possível enviar DM para ${memberToInvite.user.tag}.`);
                dmSent = false;
            }

            // Cria o embed de confirmação para o dono da call
            const confirmationEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📲 Convite Enviado!')
                .setDescription(`${memberToInvite} foi convidado para a sua sala ${userVoiceChannel}.`);

            if (!dmSent) {
                confirmationEmbed.setFooter({ text: '⚠️ Não foi possível enviar uma DM para o usuário. Avise-o manualmente!' });
            }

            await interaction.reply({ embeds: [confirmationEmbed] });

        } catch (error) {
            console.error("Erro ao convidar membro:", error);
            await interaction.reply({ content: '❌ Ocorreu um erro ao convidar o membro.', flags: MessageFlags.Ephemeral });
        }
    }
});

// Listener para deletar a call quando ficar vazia OU quando o criador sair
client.on('voiceStateUpdate', (oldState, newState) => {
    const channelLeft = oldState.channel;
    const userWhoLeft = oldState.member;

    // Verifica se alguém saiu de um canal e se é uma call privada
    if (channelLeft && privateCallOwners.has(channelLeft.id)) {
        const channelOwnerId = privateCallOwners.get(channelLeft.id);
        
        // CASO 1: O criador da call saiu (deleta imediatamente)
        if (userWhoLeft && userWhoLeft.id === channelOwnerId) {
            channelLeft.delete('Criador da sala privada saiu.')
                .then(() => {
                    privateCallOwners.delete(channelLeft.id);
                    console.log(`🚪 Call deletada: ${channelLeft.name} - Criador ${userWhoLeft.user.tag} saiu`);
                })
                .catch(err => {
                    if (err.code === 10003) {
                        privateCallOwners.delete(channelLeft.id);
                        console.log(`Canal já deletado: ${channelLeft.id}`);
                    } else {
                        console.error('Erro ao deletar canal (criador saiu):', err);
                    }
                });
        }
        // CASO 2: Canal ficou vazio (deleta só se não foi deletado no caso 1)
        else if (channelLeft.members.size === 0) {
            channelLeft.delete('Sala privada ficou vazia.')
                .then(() => {
                    privateCallOwners.delete(channelLeft.id);
                    console.log(`🏠 Call deletada: ${channelLeft.name} - Sala ficou vazia`);
                })
                .catch(err => {
                    if (err.code === 10003) {
                        privateCallOwners.delete(channelLeft.id);
                        console.log(`Canal já deletado: ${channelLeft.id}`);
                    } else {
                        console.error('Erro ao deletar canal (vazia):', err);
                    }
                });
        }
    }
});

// Servidor HTTP básico para healthcheck do Railway
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    bot: 'Nexstar Calls Bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Healthcheck server running on port ${PORT}`);
});

client.login(TOKEN);

// Limpeza ao encerrar o processo
process.on('SIGINT', () => {
    console.log('🔄 Encerrando bot e limpando recursos...');
    clearInterval(cleanupInterval);
    privateCallOwners.clear();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🔄 Encerrando bot e limpando recursos...');
    clearInterval(cleanupInterval);
    privateCallOwners.clear();
    client.destroy();
    process.exit(0);
});
