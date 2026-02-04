"use strict";
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      NEXSTAR CALLS - SALAS VIP PRIVADAS                   ║
 * ║                   Criação e Gerenciamento de Calls VIP                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Features:
 * - Criação de salas de voz VIP exclusivas
 * - Painel de controle interativo
 * - Convites privados via DM
 * - Gerenciamento completo (renomear, limite, fechar, transferir)
 * - Deleção automática quando vazia
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.privateCallOwners = void 0;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
services_1.config.validate(['DISCORD_TOKEN_CALLS']);
const TOKEN = services_1.config.get('DISCORD_TOKEN_CALLS');
const ID_CARGO_VIP = services_1.config.getOptional('CALLS_CARGO_VIP_ID') || '';
const ID_CATEGORIA_CALLS = services_1.config.getOptional('CALLS_CATEGORIA_ID') || '';
const CORES = {
    DOURADO_VIP: '#D4A84B',
    AZUL_GALAXIA: '#1a1a4e',
    ROXO_ESPACIAL: '#6b5b95',
    SUCESSO: '#2ecc71',
    ERRO: '#e74c3c',
    AVISO: '#f39c12',
    INFO: '#3498db',
    PREMIUM: '#FFD700',
    ROXO_CONVITE: '#9b59b6'
};
const NEXSTAR_BANNER = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';
const NEXSTAR_ICON = 'https://i.ibb.co/TDRDH2kq/nexstar.jpg';
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
// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENTE DISCORD
// ═══════════════════════════════════════════════════════════════════════════
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildVoiceStates
    ],
    partials: [discord_js_1.Partials.Channel],
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
// ═══════════════════════════════════════════════════════════════════════════
// 📊 DADOS DE CALLS ATIVAS
// ═══════════════════════════════════════════════════════════════════════════
const privateCallOwners = new Map();
exports.privateCallOwners = privateCallOwners;
let dbConnected = false;
// Sincroniza cache local com banco de dados
async function syncCallToDatabase(channelId, data, guildId) {
    if (!dbConnected)
        return;
    try {
        await (0, services_1.createPrivateCall)(channelId, guildId, data.ownerId, data.isOpen, data.memberLimit || undefined);
    }
    catch (error) {
        services_1.logger.warn('Erro ao sincronizar call com DB');
    }
}
async function removeCallFromDatabase(channelId) {
    if (!dbConnected)
        return;
    try {
        await (0, services_1.deletePrivateCall)(channelId);
    }
    catch (error) {
        services_1.logger.warn('Erro ao remover call do DB');
    }
}
async function loadCallsFromDatabase(guildId) {
    if (!dbConnected)
        return;
    try {
        const calls = await (0, services_1.getAllPrivateCalls)(guildId);
        for (const call of calls) {
            privateCallOwners.set(call.channel_id, {
                ownerId: call.owner_id,
                createdAt: call.created_at,
                isOpen: call.is_open,
                memberLimit: call.member_limit
            });
        }
        services_1.logger.info(`💾 ${calls.length} calls carregadas do banco de dados`);
    }
    catch (error) {
        services_1.logger.warn('Erro ao carregar calls do DB');
    }
}
// Limpeza automática de canais órfãos
const cleanupInterval = setInterval(async () => {
    let cleanedCount = 0;
    for (const [channelId] of privateCallOwners) {
        const guild = client.guilds.cache.first();
        if (guild && !guild.channels.cache.has(channelId)) {
            privateCallOwners.delete(channelId);
            await removeCallFromDatabase(channelId);
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        services_1.logger.info(`🧹 Limpeza: ${cleanedCount} canais órfãos removidos`);
    }
}, 600000);
// Monitor de memória
function logMemoryUsage() {
    const used = process.memoryUsage();
    const memMB = Math.round(used.heapUsed / 1024 / 1024 * 100) / 100;
    services_1.logger.info(`💾 Memória: ${memMB}MB | Calls: ${privateCallOwners.size}`);
    if (memMB > 70) {
        services_1.logger.warn(`⚠️ Uso de memória alto: ${memMB}MB`);
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════
function criarEmbedNexstar(options) {
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(options.cor || CORES.DOURADO_VIP)
        .setTimestamp()
        .setFooter({
        text: options.footer || `${EMOJIS.ESTRELA} Nexstar VIP`,
        iconURL: NEXSTAR_ICON
    });
    if (options.titulo)
        embed.setTitle(options.titulo);
    if (options.descricao)
        embed.setDescription(options.descricao);
    if (options.thumbnail)
        embed.setThumbnail(options.thumbnail);
    if (options.imagem)
        embed.setImage(options.imagem);
    if (options.autor)
        embed.setAuthor(options.autor);
    if (options.campos)
        embed.addFields(options.campos);
    return embed;
}
function encontrarCallDoUsuario(userId) {
    for (const [channelId, data] of privateCallOwners) {
        if (data.ownerId === userId) {
            return { channelId, data };
        }
    }
    return null;
}
function ehVIP(member) {
    if (!ID_CARGO_VIP)
        return true; // Se não configurado, permitir todos
    return member.roles.cache.has(ID_CARGO_VIP);
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 HANDLER DE COMANDOS
// ═══════════════════════════════════════════════════════════════════════════
async function handleCommand(interaction) {
    if (!interaction.guild || !interaction.member)
        return;
    const { commandName } = interaction;
    const member = interaction.member;
    // ═══════════════════════════════════════════════════════════════
    // 📞 COMANDO: /criar-call
    // ═══════════════════════════════════════════════════════════════
    if (commandName === 'criar-call') {
        if (!ehVIP(member)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Acesso Negado`,
                descricao: `Apenas membros **VIP** ${EMOJIS.VIP} podem criar salas privadas.`,
                thumbnail: interaction.user.displayAvatarURL({ size: 128 })
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callExistente = encontrarCallDoUsuario(interaction.user.id);
        if (callExistente) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Sala já existe`,
                descricao: `Você já possui uma sala privada ativa!\n\n> Use \`/painel\` para gerenciá-la.`,
                thumbnail: interaction.user.displayAvatarURL({ size: 128 })
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        try {
            const guild = interaction.guild;
            const category = guild.channels.cache.get(ID_CATEGORIA_CALLS);
            if (!category) {
                const embed = criarEmbedNexstar({
                    cor: CORES.ERRO,
                    titulo: `${EMOJIS.ERRO} Configuração Inválida`,
                    descricao: `Categoria de calls não encontrada.`
                });
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            const channelName = `${EMOJIS.TELEFONE} ${interaction.user.displayName}`;
            const channel = await guild.channels.create({
                name: channelName,
                type: discord_js_1.ChannelType.GuildVoice,
                parent: ID_CATEGORIA_CALLS,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.Connect],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            discord_js_1.PermissionFlagsBits.ViewChannel,
                            discord_js_1.PermissionFlagsBits.Connect,
                            discord_js_1.PermissionFlagsBits.ManageChannels,
                            discord_js_1.PermissionFlagsBits.MuteMembers,
                            discord_js_1.PermissionFlagsBits.DeafenMembers,
                            discord_js_1.PermissionFlagsBits.MoveMembers
                        ],
                    },
                ],
            });
            privateCallOwners.set(channel.id, {
                ownerId: interaction.user.id,
                createdAt: new Date(),
                isOpen: true,
                memberLimit: null
            });
            // Sync com banco de dados
            await syncCallToDatabase(channel.id, {
                ownerId: interaction.user.id,
                createdAt: new Date(),
                isOpen: true,
                memberLimit: null
            }, interaction.guild.id);
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
            const row = new discord_js_1.ActionRowBuilder()
                .addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId('btn_abrir_painel')
                .setLabel('Abrir Painel')
                .setStyle(discord_js_1.ButtonStyle.Primary)
                .setEmoji(EMOJIS.PAINEL), new discord_js_1.ButtonBuilder()
                .setCustomId('btn_convidar_rapido')
                .setLabel('Convidar')
                .setStyle(discord_js_1.ButtonStyle.Success)
                .setEmoji(EMOJIS.CONVITE));
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
        catch (error) {
            services_1.logger.error('Erro ao criar call');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Criar Sala`,
                descricao: `Ocorreu um erro inesperado.\n\n> \`${error.message}\``
            });
            try {
                await interaction.editReply({ embeds: [embed] });
            }
            catch { }
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // 📲 COMANDO: /convidar
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'convidar') {
        const memberToInvite = interaction.options.get('membro')?.member;
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada para convidar membros.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode convidar pessoas para sua **própria** sala privada.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!callData.isOpen) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.CADEADO} Sala Fechada`,
                descricao: `Sua sala está fechada para convites.\n\n> Use \`/abrir\` para permitir novos convites.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!memberToInvite) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Membro não encontrado`,
                descricao: `Não foi possível encontrar o membro mencionado.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (memberToInvite.id === interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Ação Inválida`,
                descricao: `Você não pode se convidar!`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
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
            const dmRow = new discord_js_1.ActionRowBuilder()
                .addComponents(new discord_js_1.ButtonBuilder()
                .setLabel('Entrar na Sala')
                .setStyle(discord_js_1.ButtonStyle.Link)
                .setURL(invite.url)
                .setEmoji(EMOJIS.FOGUETE));
            let dmSent = true;
            try {
                await memberToInvite.send({ embeds: [dmEmbed], components: [dmRow] });
            }
            catch {
                dmSent = false;
            }
            const confirmEmbed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.SUCESSO} Convite Enviado!`,
                    iconURL: memberToInvite.user.displayAvatarURL()
                },
                descricao: `${memberToInvite} foi convidado para ${userVoiceChannel}.\n\n` +
                    (dmSent
                        ? `> ${EMOJIS.SUCESSO} DM enviada com sucesso!`
                        : `> ${EMOJIS.AVISO} Não foi possível enviar DM.`),
                thumbnail: memberToInvite.user.displayAvatarURL({ size: 128 })
            });
            await interaction.reply({ embeds: [confirmEmbed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            services_1.logger.error('Erro ao convidar');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Convidar`,
                descricao: `Ocorreu um erro ao processar o convite.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // 🚪 COMANDO: /expulsar
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'expulsar') {
        const memberToKick = interaction.options.get('membro')?.member;
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode expulsar pessoas da sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!memberToKick || memberToKick.id === interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Ação Inválida`,
                descricao: `Membro não encontrado ou você não pode se expulsar.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        try {
            await userVoiceChannel.permissionOverwrites.delete(memberToKick.id);
            if (memberToKick.voice?.channel?.id === userVoiceChannel.id) {
                await memberToKick.voice.disconnect('Expulso da sala privada');
            }
            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.EXPULSAR} Membro Removido`,
                    iconURL: memberToKick.user.displayAvatarURL()
                },
                descricao: `${memberToKick} foi removido da sua sala.`,
                thumbnail: memberToKick.user.displayAvatarURL({ size: 128 })
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            services_1.logger.error('Erro ao expulsar');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Expulsar`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // 👥 COMANDO: /limite
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'limite') {
        const limite = interaction.options.get('quantidade')?.value;
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode alterar o limite da sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
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
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            services_1.logger.error('Erro ao definir limite');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Definir Limite`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // ✏️ COMANDO: /renomear
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'renomear') {
        const novoNome = interaction.options.get('nome')?.value;
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode renomear sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        try {
            const nomeFormatado = `${EMOJIS.TELEFONE} ${novoNome}`;
            await userVoiceChannel.setName(nomeFormatado);
            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                titulo: `${EMOJIS.RENOMEAR} Sala Renomeada`,
                descricao: `Sua sala agora se chama **${nomeFormatado}**`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            services_1.logger.error('Erro ao renomear');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Renomear`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // 🔒 COMANDO: /fechar
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'fechar') {
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode fechar sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!callData.isOpen) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Sala já está fechada`,
                descricao: `Sua sala já está fechada para novos convites.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        callData.isOpen = false;
        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.CADEADO} Sala Fechada`,
            descricao: `Sua sala agora está **fechada** para novos convites.\n\n> Use \`/abrir\` quando quiser.`
        });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
    }
    // ═══════════════════════════════════════════════════════════════
    // 🔓 COMANDO: /abrir
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'abrir') {
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode abrir sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (callData.isOpen) {
            const embed = criarEmbedNexstar({
                cor: CORES.AVISO,
                titulo: `${EMOJIS.AVISO} Sala já está aberta`,
                descricao: `Sua sala já está aberta para convites.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        callData.isOpen = true;
        const embed = criarEmbedNexstar({
            cor: CORES.SUCESSO,
            titulo: `${EMOJIS.CADEADO_ABERTO} Sala Aberta`,
            descricao: `Sua sala agora está **aberta** para novos convites.`
        });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
    }
    // ═══════════════════════════════════════════════════════════════
    // 🔄 COMANDO: /transferir
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'transferir') {
        const newOwner = interaction.options.get('membro')?.member;
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode transferir sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!newOwner || newOwner.id === interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Ação Inválida`,
                descricao: `Membro não encontrado ou você já é o dono.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (!ehVIP(newOwner)) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Membro não é VIP`,
                descricao: `Você só pode transferir para membros **VIP** ${EMOJIS.VIP}.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        try {
            await userVoiceChannel.permissionOverwrites.edit(interaction.user.id, {
                ViewChannel: true,
                Connect: true,
                ManageChannels: false,
                MuteMembers: false,
                DeafenMembers: false,
                MoveMembers: false
            });
            await userVoiceChannel.permissionOverwrites.edit(newOwner.id, {
                ViewChannel: true,
                Connect: true,
                ManageChannels: true,
                MuteMembers: true,
                DeafenMembers: true,
                MoveMembers: true
            });
            callData.ownerId = newOwner.id;
            const nomeFormatado = `${EMOJIS.TELEFONE} ${newOwner.displayName}`;
            await userVoiceChannel.setName(nomeFormatado);
            const embed = criarEmbedNexstar({
                cor: CORES.SUCESSO,
                autor: {
                    name: `${EMOJIS.TRANSFERIR} Propriedade Transferida`,
                    iconURL: newOwner.user.displayAvatarURL()
                },
                descricao: `${newOwner} agora é o **novo proprietário** da sala.`,
                thumbnail: newOwner.user.displayAvatarURL({ size: 128 })
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            services_1.logger.error('Erro ao transferir');
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro ao Transferir`,
                descricao: `Ocorreu um erro.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
    // ═══════════════════════════════════════════════════════════════
    // 🎛️ COMANDO: /painel
    // ═══════════════════════════════════════════════════════════════
    else if (commandName === 'painel') {
        const userVoiceChannel = member.voice?.channel;
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada para acessar o painel.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode abrir o painel da sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
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
        const row1 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('painel_toggle_status')
            .setLabel(callData.isOpen ? 'Fechar' : 'Abrir')
            .setStyle(callData.isOpen ? discord_js_1.ButtonStyle.Secondary : discord_js_1.ButtonStyle.Success)
            .setEmoji(callData.isOpen ? EMOJIS.CADEADO : EMOJIS.CADEADO_ABERTO), new discord_js_1.ButtonBuilder()
            .setCustomId('painel_limite')
            .setLabel('Limite')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji(EMOJIS.LIMITE), new discord_js_1.ButtonBuilder()
            .setCustomId('painel_renomear')
            .setLabel('Renomear')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji(EMOJIS.RENOMEAR));
        const row2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('painel_ver_membros')
            .setLabel('Ver Membros')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji(EMOJIS.LIMITE), new discord_js_1.ButtonBuilder()
            .setCustomId('painel_encerrar')
            .setLabel('Encerrar Sala')
            .setStyle(discord_js_1.ButtonStyle.Danger)
            .setEmoji(EMOJIS.EXPULSAR));
        await interaction.reply({ embeds: [embed], components: [row1, row2], flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔘 HANDLER DE BOTÕES
// ═══════════════════════════════════════════════════════════════════════════
async function handleButton(interaction) {
    const customId = interaction.customId;
    const member = interaction.member;
    const userVoiceChannel = member.voice?.channel;
    if (customId.startsWith('painel_')) {
        if (!userVoiceChannel) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
                descricao: `Entre na sua sala de voz privada primeiro.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const callData = privateCallOwners.get(userVoiceChannel.id);
        if (!callData || callData.ownerId !== interaction.user.id) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Sem Permissão`,
                descricao: `Você só pode controlar sua **própria** sala.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (customId === 'painel_toggle_status') {
            callData.isOpen = !callData.isOpen;
            const embed = criarEmbedNexstar({
                cor: callData.isOpen ? CORES.SUCESSO : CORES.INFO,
                titulo: callData.isOpen ? `${EMOJIS.CADEADO_ABERTO} Sala Aberta` : `${EMOJIS.CADEADO} Sala Fechada`,
                descricao: callData.isOpen
                    ? `Sua sala agora aceita novos convites.`
                    : `Sua sala não aceita mais convites.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        else if (customId === 'painel_limite') {
            const modal = new discord_js_1.ModalBuilder()
                .setCustomId('modal_limite')
                .setTitle('Definir Limite de Membros');
            const limiteInput = new discord_js_1.TextInputBuilder()
                .setCustomId('limite_input')
                .setLabel('Quantidade máxima (0 = sem limite)')
                .setStyle(discord_js_1.TextInputStyle.Short)
                .setPlaceholder('Ex: 5')
                .setRequired(true)
                .setMaxLength(2);
            const row = new discord_js_1.ActionRowBuilder().addComponents(limiteInput);
            modal.addComponents(row);
            await interaction.showModal(modal);
        }
        else if (customId === 'painel_renomear') {
            const modal = new discord_js_1.ModalBuilder()
                .setCustomId('modal_renomear')
                .setTitle('Renomear Sala');
            const nomeInput = new discord_js_1.TextInputBuilder()
                .setCustomId('nome_input')
                .setLabel('Novo nome da sala')
                .setStyle(discord_js_1.TextInputStyle.Short)
                .setPlaceholder('Ex: Sala do João')
                .setRequired(true)
                .setMaxLength(50);
            const row = new discord_js_1.ActionRowBuilder().addComponents(nomeInput);
            modal.addComponents(row);
            await interaction.showModal(modal);
        }
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
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
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
                await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            }
            catch (error) {
                const embed = criarEmbedNexstar({
                    cor: CORES.ERRO,
                    titulo: `${EMOJIS.ERRO} Erro`,
                    descricao: `Não foi possível encerrar a sala.\n\n> \`${error.message}\``
                });
                await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            }
        }
    }
    else if (customId === 'btn_abrir_painel') {
        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.PAINEL} Abrir Painel`,
            descricao: `Use o comando \`/painel\` para acessar o painel de controle.`
        });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
    }
    else if (customId === 'btn_convidar_rapido') {
        const embed = criarEmbedNexstar({
            cor: CORES.INFO,
            titulo: `${EMOJIS.CONVITE} Como Convidar`,
            descricao: `Use o comando:\n\n\`/convidar @membro\`\n\nPara enviar um convite privado.`
        });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 📝 HANDLER DE MODAIS
// ═══════════════════════════════════════════════════════════════════════════
async function handleModal(interaction) {
    const customId = interaction.customId;
    const member = interaction.member;
    const userVoiceChannel = member.voice?.channel;
    if (!userVoiceChannel) {
        const embed = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.ERRO} Você não está em uma sala`,
            descricao: `Entre na sua sala de voz privada primeiro.`
        });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const callData = privateCallOwners.get(userVoiceChannel.id);
    if (!callData || callData.ownerId !== interaction.user.id) {
        const embed = criarEmbedNexstar({
            cor: CORES.ERRO,
            titulo: `${EMOJIS.ERRO} Sem Permissão`,
            descricao: `Você só pode controlar sua **própria** sala.`
        });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (customId === 'modal_limite') {
        const limiteStr = interaction.fields.getTextInputValue('limite_input');
        const limite = parseInt(limiteStr);
        if (isNaN(limite) || limite < 0 || limite > 99) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Valor Inválido`,
                descricao: `Digite um número entre 0 e 99.`
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
            return;
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
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível definir o limite.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
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
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch (error) {
            const embed = criarEmbedNexstar({
                cor: CORES.ERRO,
                titulo: `${EMOJIS.ERRO} Erro`,
                descricao: `Não foi possível renomear a sala.\n\n> \`${error.message}\``
            });
            await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔊 VOICE STATE UPDATE - DELEÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════════
client.on('voiceStateUpdate', (oldState, _newState) => {
    const channelLeft = oldState.channel;
    const userWhoLeft = oldState.member;
    if (channelLeft && privateCallOwners.has(channelLeft.id)) {
        const callData = privateCallOwners.get(channelLeft.id);
        // CASO 1: O criador saiu
        if (userWhoLeft && userWhoLeft.id === callData.ownerId) {
            channelLeft.delete('Proprietário da sala saiu.')
                .then(() => {
                privateCallOwners.delete(channelLeft.id);
                services_1.logger.info(`${EMOJIS.EXPULSAR} Call deletada: ${channelLeft.name} - Proprietário saiu`);
            })
                .catch(err => {
                if (err.code === 10003) {
                    privateCallOwners.delete(channelLeft.id);
                }
                else {
                    services_1.logger.error('Erro ao deletar canal');
                }
            });
        }
        // CASO 2: Sala ficou vazia
        else if (channelLeft.members.size === 0) {
            channelLeft.delete('Sala privada ficou vazia.')
                .then(() => {
                privateCallOwners.delete(channelLeft.id);
                services_1.logger.info(`${EMOJIS.EXPULSAR} Call deletada: ${channelLeft.name} - Sala vazia`);
            })
                .catch(err => {
                if (err.code === 10003) {
                    privateCallOwners.delete(channelLeft.id);
                }
                else {
                    services_1.logger.error('Erro ao deletar canal');
                }
            });
        }
    }
});
// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
client.once('ready', async () => {
    services_1.logger.info(`${EMOJIS.FOGUETE} Bot Nexstar Calls ${client.user?.tag} está online!`);
    logMemoryUsage();
    setInterval(logMemoryUsage, 300000);
    // Inicializar banco de dados
    try {
        const connected = await (0, services_1.testConnection)();
        if (connected) {
            await (0, services_1.initializeSchema)();
            dbConnected = true;
            services_1.logger.info('💾 Database PostgreSQL conectado!');
            // Carregar calls existentes do banco
            const guild = client.guilds.cache.first();
            if (guild) {
                await loadCallsFromDatabase(guild.id);
            }
        }
    }
    catch (error) {
        services_1.logger.warn('⚠️ Database não disponível, usando apenas memória');
    }
    const guild = client.guilds.cache.first();
    if (guild) {
        const category = guild.channels.cache.get(ID_CATEGORIA_CALLS);
        services_1.logger.info(`🔍 Diagnóstico: ${guild.name}`);
        services_1.logger.info(`📁 Categoria: ${category ? '✅' : '❌'}`);
    }
    // Registrar comandos
    const commands = [
        new discord_js_1.SlashCommandBuilder()
            .setName('criar-call')
            .setDescription(`${EMOJIS.VIP} Cria uma sala de voz privada VIP exclusiva`),
        new discord_js_1.SlashCommandBuilder()
            .setName('convidar')
            .setDescription(`${EMOJIS.CONVITE} Convida um membro para sua sala privada`)
            .addUserOption(option => option.setName('membro')
            .setDescription('O membro que você deseja convidar')
            .setRequired(true)),
        new discord_js_1.SlashCommandBuilder()
            .setName('expulsar')
            .setDescription(`${EMOJIS.EXPULSAR} Remove um membro da sua sala privada`)
            .addUserOption(option => option.setName('membro')
            .setDescription('O membro que você deseja remover')
            .setRequired(true)),
        new discord_js_1.SlashCommandBuilder()
            .setName('limite')
            .setDescription(`${EMOJIS.LIMITE} Define o limite de membros da sua sala`)
            .addIntegerOption(option => option.setName('quantidade')
            .setDescription('Número máximo de membros (0 = sem limite)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99)),
        new discord_js_1.SlashCommandBuilder()
            .setName('renomear')
            .setDescription(`${EMOJIS.RENOMEAR} Renomeia sua sala privada`)
            .addStringOption(option => option.setName('nome')
            .setDescription('Novo nome para a sala')
            .setRequired(true)
            .setMaxLength(50)),
        new discord_js_1.SlashCommandBuilder()
            .setName('fechar')
            .setDescription(`${EMOJIS.CADEADO} Fecha sua sala para novos convites`),
        new discord_js_1.SlashCommandBuilder()
            .setName('abrir')
            .setDescription(`${EMOJIS.CADEADO_ABERTO} Reabre sua sala para convites`),
        new discord_js_1.SlashCommandBuilder()
            .setName('transferir')
            .setDescription(`${EMOJIS.TRANSFERIR} Transfere a propriedade da sala`)
            .addUserOption(option => option.setName('membro')
            .setDescription('O novo dono da sala')
            .setRequired(true)),
        new discord_js_1.SlashCommandBuilder()
            .setName('painel')
            .setDescription(`${EMOJIS.PAINEL} Abre o painel de controle da sua sala`),
    ];
    const commandsAsJson = commands.map(command => command.toJSON());
    client.application?.commands.set(commandsAsJson);
    services_1.logger.info(`${EMOJIS.SUCESSO} ${commands.length} comandos registrados!`);
});
// Handler de interações
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
    }
    else if (interaction.isButton()) {
        await handleButton(interaction);
    }
    else if (interaction.isModalSubmit()) {
        await handleModal(interaction);
    }
});
client.login(TOKEN);
// Limpeza ao encerrar
process.on('SIGINT', async () => {
    services_1.logger.info('🔄 Encerrando bot...');
    clearInterval(cleanupInterval);
    await (0, services_1.closePool)();
    privateCallOwners.clear();
    client.destroy();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    services_1.logger.info('🔄 Encerrando bot...');
    clearInterval(cleanupInterval);
    await (0, services_1.closePool)();
    privateCallOwners.clear();
    client.destroy();
    process.exit(0);
});
process.on('unhandledRejection', (error) => {
    services_1.logger.error('Erro não tratado:', { error });
});
//# sourceMappingURL=index.js.map