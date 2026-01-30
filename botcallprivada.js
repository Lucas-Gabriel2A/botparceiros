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
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');
require('dotenv').config();

// --- CONFIGURAÇÕES VIA VARIÁVEIS DE AMBIENTE ---
const TOKEN = process.env.DISCORD_TOKEN_CALLS;
const ID_CARGO_VIP = process.env.CALLS_CARGO_VIP_ID;
const ID_CATEGORIA_CALLS = process.env.CALLS_CATEGORIA_ID;

// 🎨 PALETA DE CORES NEXSTAR (baseada no banner espacial)
const CORES = {
    DOURADO_VIP: '#D4A84B',      // Estrelas douradas do banner
    AZUL_GALAXIA: '#1a1a4e',     // Fundo espacial profundo
    ROXO_ESPACIAL: '#6b5b95',    // Nebulosa roxa
    SUCESSO: '#2ecc71',          // Verde sucesso
    ERRO: '#e74c3c',             // Vermelho erro
    AVISO: '#f39c12',            // Amarelo/laranja aviso
    INFO: '#3498db',             // Azul informação
    PREMIUM: '#FFD700',          // Dourado brilhante premium
    ROXO_CONVITE: '#9b59b6'      // Roxo para convites
};

// 🖼️ BANNER E ÍCONES NEXSTAR
const NEXSTAR_BANNER = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';
const NEXSTAR_ICON = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';

// ✨ EMOJIS PERSONALIZADOS
const EMOJIS = {
    ESTRELA: '⭐',
    COROA: '👑',
    TELEFONE: '📞',
    CADEADO: '🔒',
    CADEADO_ABERTO: '🔓',
    CONVITE: '📲',
    EXPULSAR: '🚪',
    LIMITE: '👥',
    RENOMEAR: '✏️',
    TRANSFERIR: '🔄',
    PAINEL: '🎛️',
    SUCESSO: '✅',
    ERRO: '❌',
    AVISO: '⚠️',
    VIP: '💎',
    FOGUETE: '🚀'
};

// Validação das variáveis de ambiente
if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN_CALLS não configurado no arquivo .env");
    process.exit(1);
} 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel],
    sweepers: {
        messages: {
            interval: 300,
            lifetime: 1800,
        },
        users: {
            interval: 3600,
            filter: () => user => user.bot,
        }
    }
});

// 📊 Estrutura de dados aprimorada para calls
// Map<channelId, CallData>
const privateCallOwners = new Map();

// CallData structure:
// {
//   ownerId: string,
//   createdAt: Date,
//   isOpen: boolean,       // true = aceita convites, false = fechada
//   memberLimit: number    // limite de membros (null = sem limite)
// }

// 🧹 Sistema de limpeza automática
const cleanupInterval = setInterval(() => {
    let cleanedCount = 0;
    
    for (const [channelId] of privateCallOwners) {
        const guild = client.guilds.cache.first();
        if (guild && !guild.channels.cache.has(channelId)) {
            privateCallOwners.delete(channelId);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`🧹 Limpeza: ${cleanedCount} canais órfãos removidos da memória`);
    }
}, 600000);

// 💾 Monitor de memória
function logMemoryUsage() {
    const used = process.memoryUsage();
    const memMB = Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    console.log(`💾 Memória: ${memMB}MB | Calls ativas: ${privateCallOwners.size}`);
    
    if (memMB > 70) {
        console.warn(`⚠️ Uso de memória alto: ${memMB}MB`);
    }
}

// 🔧 Função helper para criar embeds padronizados
function criarEmbedNexstar(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.cor || CORES.DOURADO_VIP)
        .setTimestamp()
        .setFooter({ 
            text: options.footer || `${EMOJIS.ESTRELA} Nexstar VIP`, 
            iconURL: NEXSTAR_ICON 
        });

    if (options.titulo) embed.setTitle(options.titulo);
    if (options.descricao) embed.setDescription(options.descricao);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.imagem) embed.setImage(options.imagem);
    if (options.autor) embed.setAuthor(options.autor);
    if (options.campos) embed.addFields(options.campos);

    return embed;
}

// 🔍 Função para encontrar a call do usuário
function encontrarCallDoUsuario(userId) {
    for (const [channelId, data] of privateCallOwners) {
        if (data.ownerId === userId) {
            return { channelId, data };
        }
    }
    return null;
}

// 🎫 Função para verificar se é VIP
function ehVIP(member) {
    return member.roles.cache.has(ID_CARGO_VIP);
}

client.once('ready', () => {
    console.log(`${EMOJIS.FOGUETE} Bot Nexstar Calls ${client.user.tag} está online!`);
    logMemoryUsage();
    setInterval(logMemoryUsage, 300000);

    const guild = client.guilds.cache.first();
    if (guild) {
        const botMember = guild.members.cache.get(client.user.id);
        const category = guild.channels.cache.get(ID_CATEGORIA_CALLS);
        
        console.log(`🔍 Diagnóstico: ${guild.name}`);
        console.log(`📁 Categoria: ${category ? '✅' : '❌'} (${ID_CATEGORIA_CALLS})`);
        
        if (category && botMember) {
            const perms = category.permissionsFor(botMember);
            console.log(`🔒 Permissões: Gerenciar=${perms.has('ManageChannels') ? '✅' : '❌'}, Ver=${perms.has('ViewChannel') ? '✅' : '❌'}`);
        }
    }

    // 📝 Definição de todos os Slash Commands
    const commands = [
        new SlashCommandBuilder()
            .setName('criar-call')
            .setDescription(`${EMOJIS.VIP} Cria uma sala de voz privada VIP exclusiva`),
        
        new SlashCommandBuilder()
            .setName('convidar')
            .setDescription(`${EMOJIS.CONVITE} Convida um membro para sua sala privada`)
            .addUserOption(option =>
                option.setName('membro')
                    .setDescription('O membro que você deseja convidar')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('expulsar')
            .setDescription(`${EMOJIS.EXPULSAR} Remove um membro da sua sala privada`)
            .addUserOption(option =>
                option.setName('membro')
                    .setDescription('O membro que você deseja remover')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('limite')
            .setDescription(`${EMOJIS.LIMITE} Define o limite de membros da sua sala`)
            .addIntegerOption(option =>
                option.setName('quantidade')
                    .setDescription('Número máximo de membros (0 = sem limite)')
                    .setRequired(true)
                    .setMinValue(0)
                    .setMaxValue(99)),
        
        new SlashCommandBuilder()
            .setName('renomear')
            .setDescription(`${EMOJIS.RENOMEAR} Renomeia sua sala privada`)
            .addStringOption(option =>
                option.setName('nome')
                    .setDescription('Novo nome para a sala')
                    .setRequired(true)
                    .setMaxLength(50)),
        
        new SlashCommandBuilder()
            .setName('fechar')
            .setDescription(`${EMOJIS.CADEADO} Fecha sua sala para novos convites`),
        
        new SlashCommandBuilder()
            .setName('abrir')
            .setDescription(`${EMOJIS.CADEADO_ABERTO} Reabre sua sala para convites`),
        
        new SlashCommandBuilder()
            .setName('transferir')
            .setDescription(`${EMOJIS.TRANSFERIR} Transfere a propriedade da sala`)
            .addUserOption(option =>
                option.setName('membro')
                    .setDescription('O novo dono da sala')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('painel')
            .setDescription(`${EMOJIS.PAINEL} Abre o painel de controle da sua sala`),
    ];
    
    const commandsAsJson = commands.map(command => command.toJSON());
    client.application.commands.set(commandsAsJson);
    console.log(`${EMOJIS.SUCESSO} ${commands.length} comandos registrados!`);
});

// 🎮 Handler principal de interações
client.on('interactionCreate', async interaction => {
    // Handler de comandos
    if (interaction.isCommand()) {
        await handleCommand(interaction);
    }
    // Handler de botões
    else if (interaction.isButton()) {
        await handleButton(interaction);
    }
    // Handler de modais
    else if (interaction.isModalSubmit()) {
        await handleModal(interaction);
    }
});

// 📝 Handler de comandos
async function handleCommand(interaction) {
    if (!interaction.guild || !interaction.member) return;

    const { commandName } = interaction;

    // ═══════════════════════════════════════════════════════════════
    // 📞 COMANDO: /criar-call
    // ═══════════════════════════════════════════════════════════════
    if (commandName === 'criar-call') {
        if (!ehVIP(interaction.member)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Acesso Negado`,
                descricao: `Apenas membros **VIP** ${EMOJIS.VIP} podem criar salas privadas.\n\n> Adquira o VIP para desbloquear este recurso exclusivo!`,
                thumbnail: interaction.user.displayAvatarURL({ size: 128 })
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callExistente = encontrarCallDoUsuario(interaction.user.id);
        if (callExistente) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Sala já existe`,
                descricao: `Você já possui uma sala privada ativa!\n\n> Use \`/painel\` para gerenciá-la ou aguarde ela ser deletada.`,
                thumbnail: interaction.user.displayAvatarURL({ size: 128 })
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // Defer imediatamente para evitar timeout
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guild = interaction.guild;
            const category = guild.channels.cache.get(ID_CATEGORIA_CALLS);
            
            if (!category) {
                const embed = criarEmbedNexstar({
                    cor: CORES.ERRO,
                    titulo: `${EMOJIS.ERRO} Configuração Inválida`,
                    descricao: `Categoria de calls não encontrada.\n\n> Contate um administrador para verificar a configuração.`
                });
                return interaction.editReply({ embeds: [embed] });
            }

            const channelName = `${EMOJIS.TELEFONE} ${interaction.user.displayName}`;
            
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: ID_CATEGORIA_CALLS,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel, 
                            PermissionFlagsBits.Connect, 
                            PermissionFlagsBits.ManageChannels, 
                            PermissionFlagsBits.MuteMembers, 
                            PermissionFlagsBits.DeafenMembers, 
                            PermissionFlagsBits.MoveMembers
                        ],
                    },
                ],
            });

            // Armazena com estrutura aprimorada
            privateCallOwners.set(channel.id, {
                ownerId: interaction.user.id,
                createdAt: new Date(),
                isOpen: true,
                memberLimit: null
            });

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.SUCESSO} Sala VIP Criada com Sucesso!`,
                    iconURL: interaction.user.displayAvatarURL()
                },
                descricao: `Sua sala de voz exclusiva está pronta!\n\n` +
                    `>>> ${EMOJIS.TELEFONE} **Canal:** ${channel}\n` +
                    `${EMOJIS.COROA} **Proprietário:** ${interaction.user}\n` +
                    `${EMOJIS.CADEADO_ABERTO} **Status:** Aberta para convites`,
                thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
                imagem: NEXSTAR_BANNER,
                campos: [
                    { 
                        name: `${EMOJIS.PAINEL} Comandos Disponíveis`, 
                        value: '`/convidar` `/painel` `/limite`\n`/renomear` `/fechar` `/transferir`',
                        inline: false 
                    }
                ],
                footer: `${EMOJIS.ESTRELA} Nexstar VIP • A sala será deletada quando você sair`
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_abrir_painel')
                        .setLabel('Abrir Painel')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(EMOJIS.PAINEL),
                    new ButtonBuilder()
                        .setCustomId('btn_convidar_rapido')
                        .setLabel('Convidar')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(EMOJIS.CONVITE)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error("Erro ao criar call:", error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Criar Sala`,
                descricao: `Ocorreu um erro inesperado.\n\n> \`${error.message}\``
            });
            try {
                await interaction.editReply({ embeds: [embed] });
            } catch (e) {
                console.error("Erro ao enviar mensagem de erro:", e);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 📲 COMANDO: /convidar
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'convidar') {
        const memberToInvite = interaction.options.getMember('membro');
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada para convidar membros.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode convidar pessoas para sua **própria** sala privada.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (!callData.isOpen) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.CADEADO} Sala Fechada`,
                descricao: `Sua sala está fechada para convites.\n\n> Use \`/abrir\` para permitir novos convites.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        
        if (!memberToInvite) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Membro não encontrado`,
                descricao: `Não foi possível encontrar o membro mencionado.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        
        if (memberToInvite.id === interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Ação Inválida`,
                descricao: `Você não pode se convidar!`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            await userVoiceChannel.permissionOverwrites.edit(memberToInvite.id, {
                ViewChannel: true,
                Connect: true,
            });

            const invite = await userVoiceChannel.createInvite({
                maxAge: 300,
                maxUses: 1,
                reason: `Convite VIP de ${interaction.user.tag} para ${memberToInvite.user.tag}`
            });

            // DM para o convidado - Embed premium
            const dmEmbed = criarEmbedNexstar({
                cor: CORES.ROXO_CONVITE,
                autor: {
                    name: `${EMOJIS.CONVITE} Convite VIP Recebido!`,
                    iconURL: interaction.user.displayAvatarURL()
                },
                descricao: `**${interaction.user.displayName}** está te convidando para uma sala privada exclusiva!\n\n` +
                    `>>> ${EMOJIS.TELEFONE} **Sala:** ${userVoiceChannel.name}\n` +
                    `${EMOJIS.ESTRELA} **Servidor:** ${interaction.guild.name}`,
                thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
                imagem: NEXSTAR_BANNER,
                footer: `${EMOJIS.AVISO} Este convite expira em 5 minutos`
            });

            const dmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Entrar na Sala')
                        .setStyle(ButtonStyle.Link)
                        .setURL(invite.url)
                        .setEmoji(EMOJIS.FOGUETE)
                );

            let dmSent = true;
            try {
                await memberToInvite.send({ embeds: [dmEmbed], components: [dmRow] });
            } catch {
                dmSent = false;
            }

            // Confirmação para o dono
            const confirmEmbed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.SUCESSO} Convite Enviado!`,
                    iconURL: memberToInvite.user.displayAvatarURL()
                },
                descricao: `${memberToInvite} foi convidado para ${userVoiceChannel}.\n\n` +
                    (dmSent 
                        ? `> ${EMOJIS.SUCESSO} DM enviada com sucesso!` 
                        : `> ${EMOJIS.AVISO} Não foi possível enviar DM. Avise o membro manualmente!`),
                thumbnail: memberToInvite.user.displayAvatarURL({ size: 128 })
            });

            await interaction.reply({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error("Erro ao convidar:", error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Convidar`,
                descricao: `Ocorreu um erro ao processar o convite.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🚪 COMANDO: /expulsar
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'expulsar') {
        const memberToKick = interaction.options.getMember('membro');
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode expulsar pessoas da sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (!memberToKick) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Membro não encontrado`,
                descricao: `Não foi possível encontrar o membro mencionado.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (memberToKick.id === interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Ação Inválida`,
                descricao: `Você não pode se expulsar da própria sala!`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            // Remove permissões
            await userVoiceChannel.permissionOverwrites.delete(memberToKick.id);
            
            // Desconecta se estiver na call
            if (memberToKick.voice?.channel?.id === userVoiceChannel.id) {
                await memberToKick.voice.disconnect('Expulso da sala privada');
            }

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.EXPULSAR} Membro Removido`,
                    iconURL: memberToKick.user.displayAvatarURL()
                },
                descricao: `${memberToKick} foi removido da sua sala.\n\n> O acesso foi revogado e ele não poderá mais entrar.`,
                thumbnail: memberToKick.user.displayAvatarURL({ size: 128 })
            });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error("Erro ao expulsar:", error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Expulsar`,
                descricao: `Ocorreu um erro ao remover o membro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 👥 COMANDO: /limite
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'limite') {
        const limite = interaction.options.getInteger('quantidade');
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode alterar o limite da sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            await userVoiceChannel.setUserLimit(limite);
            callData.memberLimit = limite === 0 ? null : limite;

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.LIMITE} Limite Atualizado`,
                descricao: limite === 0 
                    ? `Sua sala agora **não tem limite** de membros.`
                    : `Sua sala agora suporta no máximo **${limite} membros**.`,
                campos: [
                    { name: 'Canal', value: `${userVoiceChannel}`, inline: true },
                    { name: 'Limite', value: limite === 0 ? '∞ Ilimitado' : `${limite} membros`, inline: true }
                ]
            });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error("Erro ao definir limite:", error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Definir Limite`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✏️ COMANDO: /renomear
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'renomear') {
        const novoNome = interaction.options.getString('nome');
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode renomear sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            const nomeFormatado = `${EMOJIS.TELEFONE} ${novoNome}`;
            await userVoiceChannel.setName(nomeFormatado);

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.RENOMEAR} Sala Renomeada`,
                descricao: `Sua sala agora se chama **${nomeFormatado}**`
            });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error("Erro ao renomear:", error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Renomear`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔒 COMANDO: /fechar
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'fechar') {
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode fechar sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (!callData.isOpen) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Sala já está fechada`,
                descricao: `Sua sala já está fechada para novos convites.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        callData.isOpen = false;

        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.CADEADO} Sala Fechada`,
            descricao: `Sua sala agora está **fechada** para novos convites.\n\n> Use \`/abrir\` quando quiser permitir convites novamente.`
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔓 COMANDO: /abrir
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'abrir') {
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode abrir sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (callData.isOpen) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Sala já está aberta`,
                descricao: `Sua sala já está aberta para convites.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        callData.isOpen = true;

        const embed = criarEmbedNexstar({
            cor: CORES.SUCESSO,
            titulo: `${EMOJIS.CADEADO_ABERTO} Sala Aberta`,
            descricao: `Sua sala agora está **aberta** para novos convites.\n\n> Use \`/convidar @membro\` para chamar seus amigos!`
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔄 COMANDO: /transferir
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'transferir') {
        const newOwner = interaction.options.getMember('membro');
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode transferir sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (!newOwner) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Membro não encontrado`,
                descricao: `Não foi possível encontrar o membro mencionado.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (newOwner.id === interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Ação Inválida`,
                descricao: `Você já é o dono desta sala!`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        if (!ehVIP(newOwner)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Membro não é VIP`,
                descricao: `Você só pode transferir a sala para membros **VIP** ${EMOJIS.VIP}.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            // Remove permissões do antigo dono
            await userVoiceChannel.permissionOverwrites.edit(interaction.user.id, {
                ViewChannel: true,
                Connect: true,
                ManageChannels: false,
                MuteMembers: false,
                DeafenMembers: false,
                MoveMembers: false
            });

            // Adiciona permissões ao novo dono
            await userVoiceChannel.permissionOverwrites.edit(newOwner.id, {
                ViewChannel: true,
                Connect: true,
                ManageChannels: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true
            });

            // Atualiza dados
            callData.ownerId = newOwner.id;

            // Renomeia canal
            const nomeFormatado = `${EMOJIS.TELEFONE} ${newOwner.displayName}`;
            await userVoiceChannel.setName(nomeFormatado);

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.TRANSFERIR} Propriedade Transferida`,
                    iconURL: newOwner.user.displayAvatarURL()
                },
                descricao: `${newOwner} agora é o **novo proprietário** da sala.\n\n> Você ainda tem acesso, mas não pode mais gerenciar a sala.`,
                thumbnail: newOwner.user.displayAvatarURL({ size: 128 })
            });

            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error("Erro ao transferir:", error);
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Transferir`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎛️ COMANDO: /painel
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'painel') {
        const userVoiceChannel = interaction.member.voice?.channel;

        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada para acessar o painel.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode abrir o painel da sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const membrosNaSala = userVoiceChannel.members.size;
        const limite = callData.memberLimit ? callData.memberLimit : '∞';
        const status = callData.isOpen ? `${EMOJIS.CADEADO_ABERTO} Aberta` : `${EMOJIS.CADEADO} Fechada`;
        const tempoAtiva = Math.floor((Date.now() - callData.createdAt.getTime()) / 60000);

        const embed = criarEmbedNexstar({
            cor: CORES.DOURADO_VIP,
            autor: {
                name: `${EMOJIS.PAINEL} Painel de Controle`,
                iconURL: interaction.user.displayAvatarURL()
            },
            descricao: `Gerencie sua sala privada VIP usando os botões abaixo.`,
            thumbnail: interaction.user.displayAvatarURL({ size: 256 }),
            campos: [
                { name: `${EMOJIS.TELEFONE} Canal`, value: `${userVoiceChannel.name}`, inline: true },
                { name: `${EMOJIS.LIMITE} Membros`, value: `${membrosNaSala}/${limite}`, inline: true },
                { name: `${EMOJIS.CADEADO} Status`, value: status, inline: true },
                { name: `${EMOJIS.COROA} Proprietário`, value: `${interaction.user}`, inline: true },
                { name: `⏱️ Tempo Ativa`, value: `${tempoAtiva} min`, inline: true },
            ],
            imagem: NEXSTAR_BANNER
        });

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('painel_toggle_status')
                    .setLabel(callData.isOpen ? 'Fechar' : 'Abrir')
                    .setStyle(callData.isOpen ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setEmoji(callData.isOpen ? EMOJIS.CADEADO : EMOJIS.CADEADO_ABERTO),
                new ButtonBuilder()
                    .setCustomId('painel_limite')
                    .setLabel('Limite')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(EMOJIS.LIMITE),
                new ButtonBuilder()
                    .setCustomId('painel_renomear')
                    .setLabel('Renomear')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(EMOJIS.RENOMEAR)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('painel_ver_membros')
                    .setLabel('Ver Membros')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(EMOJIS.LIMITE),
                new ButtonBuilder()
                    .setCustomId('painel_encerrar')
                    .setLabel('Encerrar Sala')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(EMOJIS.EXPULSAR)
            );

        await interaction.reply({ embeds: [embed], components: [row1, row2], flags: MessageFlags.Ephemeral });
    }
}

// 🔘 Handler de botões
async function handleButton(interaction) {
    const customId = interaction.customId;
    const userVoiceChannel = interaction.member.voice?.channel;

    // Verifica se usuário está em sua call para botões do painel
    if (customId.startsWith('painel_')) {
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode controlar sua **própria** sala.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // Toggle status (abrir/fechar)
        if (customId === 'painel_toggle_status') {
            callData.isOpen = !callData.isOpen;
            const embed = criarEmbedNexstar({
                cor: callData.isOpen ? CORES.SUCESSO : CORES.INFO,
                titulo: callData.isOpen ? `${EMOJIS.CADEADO_ABERTO} Sala Aberta` : `${EMOJIS.CADEADO} Sala Fechada`,
                descricao: callData.isOpen 
                    ? `Sua sala agora aceita novos convites.`
                    : `Sua sala não aceita mais convites até você abrir novamente.`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // Modal para definir limite
        else if (customId === 'painel_limite') {
            const modal = new ModalBuilder()
                .setCustomId('modal_limite')
                .setTitle('Definir Limite de Membros');

            const limiteInput = new TextInputBuilder()
                .setCustomId('limite_input')
                .setLabel('Quantidade máxima (0 = sem limite)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: 5')
                .setRequired(true)
                .setMaxLength(2);

            const row = new ActionRowBuilder().addComponents(limiteInput);
            modal.addComponents(row);
            await interaction.showModal(modal);
        }

        // Modal para renomear
        else if (customId === 'painel_renomear') {
            const modal = new ModalBuilder()
                .setCustomId('modal_renomear')
                .setTitle('Renomear Sala');

            const nomeInput = new TextInputBuilder()
                .setCustomId('nome_input')
                .setLabel('Novo nome da sala')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Sala do João')
                .setRequired(true)
                .setMaxLength(50);

            const row = new ActionRowBuilder().addComponents(nomeInput);
            modal.addComponents(row);
            await interaction.showModal(modal);
        }

        // Ver membros
        else if (customId === 'painel_ver_membros') {
            const membros = userVoiceChannel.members
                .map(m => `${m.id === callData.ownerId ? EMOJIS.COROA : '•'} ${m.displayName}`)
                .join('\n') || 'Ninguém na sala';

            const embed = criarEmbedNexstar({
                cor: CORES.INFO,
                titulo: `${EMOJIS.LIMITE} Membros na Sala`,
                descricao: `**${userVoiceChannel.name}**\n\n${membros}`,
                campos: [
                    { name: 'Total', value: `${userVoiceChannel.members.size} membros`, inline: true }
                ]
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // Encerrar sala
        else if (customId === 'painel_encerrar') {
            try {
                const channelName = userVoiceChannel.name;
                await userVoiceChannel.delete('Encerrada pelo proprietário');
                privateCallOwners.delete(userVoiceChannel.id);

                const embed = criarEmbedNexstar({
                    cor: CORES.SUCESSO,
                    titulo: `${EMOJIS.SUCESSO} Sala Encerrada`,
                    descricao: `A sala **${channelName}** foi deletada com sucesso.`
                });
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } catch (error) {
                const embed = criarEmbedNexstar({
                    cor: CORES.ERRO,
                    titulo: `${EMOJIS.ERRO} Erro`,
                    descricao: `Não foi possível encerrar a sala.\n\n> \`${error.message}\``
                });
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        }
    }

    // Botão abrir painel (da mensagem de criação)
    else if (customId === 'btn_abrir_painel') {
        // Simula comando /painel
        await handleCommand({ ...interaction, isCommand: () => true, commandName: 'painel', options: { getMember: () => null, getInteger: () => null, getString: () => null } });
    }

    // Botão convidar rápido
    else if (customId === 'btn_convidar_rapido') {
        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.CONVITE} Como Convidar`,
            descricao: `Use o comando:\n\n\`/convidar @membro\`\n\nPara enviar um convite privado para a sua sala.`
        });
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

// 📝 Handler de modais
async function handleModal(interaction) {
    const customId = interaction.customId;
    const userVoiceChannel = interaction.member.voice?.channel;

    if (!userVoiceChannel) {
        const embed = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
            descricao: `Entre na sua sala de voz privada primeiro.`
        });
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const callData = privateCallOwners.get(userVoiceChannel.id);
    if (!callData || callData.ownerId !== interaction.user.id) {
        const embed = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.ERRO} Sem Permissão`,
            descricao: `Você só pode controlar sua **própria** sala.`
        });
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Modal de limite
    if (customId === 'modal_limite') {
        const limiteStr = interaction.fields.getTextInputValue('limite_input');
        const limite = parseInt(limiteStr);

        if (isNaN(limite) || limite < 0 || limite > 99) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Valor Inválido`,
                descricao: `Digite um número entre 0 e 99.`
            });
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        try {
            await userVoiceChannel.setUserLimit(limite);
            callData.memberLimit = limite === 0 ? null : limite;

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.LIMITE} Limite Atualizado`,
                descricao: limite === 0 
                    ? `Sua sala agora **não tem limite** de membros.`
                    : `Sua sala agora suporta no máximo **${limite} membros**.`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível definir o limite.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }

    // Modal de renomear
    else if (customId === 'modal_renomear') {
        const novoNome = interaction.fields.getTextInputValue('nome_input');

        try {
            const nomeFormatado = `${EMOJIS.TELEFONE} ${novoNome}`;
            await userVoiceChannel.setName(nomeFormatado);

            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.RENOMEAR} Sala Renomeada`,
                descricao: `Sua sala agora se chama **${nomeFormatado}**`
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível renomear a sala.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }
}

// 🔊 Listener para voiceStateUpdate - deleção automática
client.on('voiceStateUpdate', (oldState, newState) => {
    const channelLeft = oldState.channel;
    const userWhoLeft = oldState.member;

    if (channelLeft && privateCallOwners.has(channelLeft.id)) {
        const callData = privateCallOwners.get(channelLeft.id);
        
        // CASO 1: O criador saiu
        if (userWhoLeft && userWhoLeft.id === callData.ownerId) {
            channelLeft.delete('Proprietário da sala saiu.')
                .then(() => {
                    privateCallOwners.delete(channelLeft.id);
                    console.log(`${EMOJIS.EXPULSAR} Call deletada: ${channelLeft.name} - Proprietário saiu`);
                })
                .catch(err => {
                    if (err.code === 10003) {
                        privateCallOwners.delete(channelLeft.id);
                    } else {
                        console.error('Erro ao deletar canal:', err);
                    }
                });
        }
        // CASO 2: Sala ficou vazia
        else if (channelLeft.members.size === 0) {
            channelLeft.delete('Sala privada ficou vazia.')
                .then(() => {
                    privateCallOwners.delete(channelLeft.id);
                    console.log(`${EMOJIS.EXPULSAR} Call deletada: ${channelLeft.name} - Sala vazia`);
                })
                .catch(err => {
                    if (err.code === 10003) {
                        privateCallOwners.delete(channelLeft.id);
                    } else {
                        console.error('Erro ao deletar canal:', err);
                    }
                });
        }
    }
});

// 🌐 Servidor HTTP para healthcheck
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        bot: 'Nexstar Calls Bot',
        version: '2.0.0',
        activeCalls: privateCallOwners.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`${EMOJIS.FOGUETE} Healthcheck server running on port ${PORT}`);
});

client.login(TOKEN);

// 🧹 Limpeza ao encerrar
process.on('SIGINT', () => {
    console.log('🔄 Encerrando bot...');
    clearInterval(cleanupInterval);
    privateCallOwners.clear();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🔄 Encerrando bot...');
    clearInterval(cleanupInterval);
    privateCallOwners.clear();
    client.destroy();
    process.exit(0);
});
