/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         BOT WELCOME - COREBOT                             ║
 * ║                     Sistema de Boas-vindas Premium                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Funcionalidades:
 * - Banners personalizados com canvas
 * - Avatares hexagonais com efeito neon
 * - Backgrounds customizáveis
 * - Mensagens de entrada/saída
 * - Slash commands para configuração
 */

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder,
    MessageFlags,
    TextChannel,
    GuildMember,
    Interaction,
    Message,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';

import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { URL } from 'url';

import {
    config,
    logger,
    testConnection,
    initializeSchema,
    upsertGuildConfig,
    closePool
} from '../../shared/services';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 VALIDAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

config.validate(['DISCORD_TOKENS', 'CLIENT_ID']);

const TOKEN = config.get('DISCORD_TOKENS');
const CLIENT_ID = config.get('CLIENT_ID');

import { getUserPlan, hasPlanAccess } from '../../shared/services/plan-features';

function hasAdminPermission(member: any, _ownerRoleId?: string, _semiOwnerRoleId?: string): boolean {
    return member.permissions.has('Administrator');
}
const OWNER_ROLE_ID = config.getOptional('OWNER_ROLE_ID');
const SEMI_OWNER_ROLE_ID = config.getOptional('SEMI_OWNER_ROLE_ID');
const CATEGORY_ID = config.getOptional('CATEGORY_ID');
const WELCOME_CHANNEL_ID = config.getOptional('WELCOME_CHANNEL_ID');
const LEAVE_CHANNEL_ID = config.getOptional('LEAVE_CHANNEL_ID');

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface GuildConfig {
    welcomeChannel: string | null;
    leaveChannel: string | null;
    welcomeText: string;
    leaveText: string;
    background: string | null;
    semiDonoRole: string | null;
}

interface Configs {
    [guildId: string]: GuildConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

// Paths
const backgroundsPath = path.join(process.cwd(), 'backgrounds');
const dbPath = path.join(process.cwd(), 'data', 'guild_configs.json');

// Garantir diretórios
fs.ensureDirSync(backgroundsPath);
fs.ensureDirSync(path.dirname(dbPath));

// ═══════════════════════════════════════════════════════════════════════════
// 💾 CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════

let configs: Configs = {};
let PREFERRED_FONT = 'sans-serif';
let dbConnected = false;

// Carrega do JSON
try {
    if (fs.existsSync(dbPath)) {
        configs = fs.readJsonSync(dbPath);
        logger.info('Configs carregadas do arquivo JSON');
    } else {
        configs = {};
        fs.writeJsonSync(dbPath, configs);
        logger.info('Arquivo de configs JSON criado');
    }
} catch (error) {
    logger.error('Erro ao carregar configs JSON');
    configs = {};
}

// Sincroniza com banco em background
async function syncConfigToDb(guildId: string, guildConfig: GuildConfig): Promise<void> {
    if (!dbConnected) return;
    try {
        await upsertGuildConfig(guildId, {
            welcome_channel_id: guildConfig.welcomeChannel,
            leave_channel_id: guildConfig.leaveChannel,
            staff_role_id: guildConfig.semiDonoRole
        });
    } catch (error) {
        logger.warn('Erro ao sincronizar config com DB');
    }
}

function getConfig(guildId: string): GuildConfig {
    if (!configs[guildId]) {
        configs[guildId] = {
            welcomeChannel: null,
            leaveChannel: null,
            welcomeText: 'BOAS-VINDAS [username]!',
            leaveText: 'Adeus [username]! Esperamos que volte.',
            background: null,
            semiDonoRole: null,
        };
    }
    return configs[guildId];
}

function saveConfigToDB(guildId: string, guildConfig: GuildConfig): void {
    try {
        configs[guildId] = guildConfig;
        fs.writeJsonSync(dbPath, configs, { spaces: 2 });
        logger.info(`Config salva para guild ${guildId}`);

        // Sync com banco em background (não bloqueia)
        syncConfigToDb(guildId, guildConfig).catch(() => { });
    } catch (error) {
        logger.error('Erro ao salvar config');
    }
}

function getWelcomeChannelId(guildId: string): string | null {
    const guildConfig = getConfig(guildId);
    return guildConfig.welcomeChannel || WELCOME_CHANNEL_ID || null;
}

function getLeaveChannelId(guildId: string): string | null {
    const guildConfig = getConfig(guildId);
    return guildConfig.leaveChannel || LEAVE_CHANNEL_ID || null;
}

function hasPermission(member: GuildMember): boolean {
    return hasAdminPermission(member, OWNER_ROLE_ID, SEMI_OWNER_ROLE_ID);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🖼️ UTILITÁRIOS DE IMAGEM
// ═══════════════════════════════════════════════════════════════════════════

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'DiscordBot/1.0' }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function getImageTypeFromBuffer(buffer: Buffer): string {
    const firstBytes = buffer.slice(0, 12);

    if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        return 'image/png';
    }
    if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF) {
        return 'image/jpeg';
    }
    if (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46 &&
        firstBytes[8] === 0x57 && firstBytes[9] === 0x45 && firstBytes[10] === 0x42 && firstBytes[11] === 0x50) {
        return 'image/webp';
    }
    if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x38) {
        return 'image/gif';
    }

    return 'unknown';
}

async function loadAvatarSafe(urlToLoad: string): Promise<ReturnType<typeof loadImage> | null> {
    try {
        const resp = await fetchWithTimeout(urlToLoad, 3000);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const arrayBuffer = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        return await loadImage(buf);
    } catch (error) {
        logger.warn('Falha ao carregar avatar via fetch');
    }

    // Fallback: https.get
    try {
        const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
            const urlObj = new URL(urlToLoad);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout: 2000,
                headers: { 'User-Agent': 'DiscordBot/1.0' }
            };

            const req = https.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const chunks: Buffer[] = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });

            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            req.on('error', (e) => reject(e));
            req.end();
        });

        return await loadImage(imageBuffer);
    } catch (error) {
        logger.warn('Fallback https.get também falhou');
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CANVAS: DESENHO
// ═══════════════════════════════════════════════════════════════════════════

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

function renderTextCentered(
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight = 70,
    maxLines = 3
): number {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let i = 0; i < words.length; i++) {
        const testLine = line ? line + ' ' + words[i] : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
            lines.push(line);
            line = words[i];
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    const finalLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
        const last = finalLines[maxLines - 1];
        finalLines[maxLines - 1] = last.substring(0, Math.max(0, Math.floor(maxWidth / 10) - 3)) + '...';
    }

    ctx.textAlign = 'center';
    for (let i = 0; i < finalLines.length; i++) {
        const lineY = startY + (i * lineHeight);
        ctx.strokeText(finalLines[i], centerX, lineY);
        ctx.fillText(finalLines[i], centerX, lineY);
    }

    return finalLines.length;
}

function drawCosmicBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Base gradient escuro
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0a0015');
    bgGradient.addColorStop(0.3, '#1a0033');
    bgGradient.addColorStop(0.6, '#0d001a');
    bgGradient.addColorStop(1, '#05000a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Nebulosas
    const nebulas = [
        { x: 150, y: 100, r: 200, color1: 'rgba(138, 43, 226, 0.15)', color2: 'rgba(138, 43, 226, 0)' },
        { x: 650, y: 450, r: 250, color1: 'rgba(0, 191, 255, 0.12)', color2: 'rgba(0, 191, 255, 0)' },
        { x: 400, y: 300, r: 300, color1: 'rgba(255, 0, 128, 0.08)', color2: 'rgba(255, 0, 128, 0)' },
    ];

    nebulas.forEach(neb => {
        const nebGrad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.r);
        nebGrad.addColorStop(0, neb.color1);
        nebGrad.addColorStop(1, neb.color2);
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, width, height);
    });

    // Estrelas
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 2 + 0.5;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grid futurístico sutil
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🖼️ GERADOR DE BANNER
// ═══════════════════════════════════════════════════════════════════════════

async function generateBanner(member: GuildMember, text: string, _isWelcome = true): Promise<Buffer> {
    const username = member.user?.username || member.displayName || 'Usuário';
    logger.info(`Gerando banner para ${username}`);

    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Fundo
    const guildConfig = getConfig(member.guild.id);
    let backgroundImage = null;

    // Check if user has plan for custom background (welcome feature also includes background?)
    // Actually typically custom background might be a separate perk or part of welcome_custom
    // Let's assume it's part of the welcome_custom feature package
    const ownerId = member.guild.ownerId;
    const canUseCustomBackground = await hasPlanAccess(await getUserPlan(ownerId), 'welcome');

    if (canUseCustomBackground && guildConfig.background && fs.existsSync(guildConfig.background)) {
        try {
            backgroundImage = await loadImage(guildConfig.background);
        } catch (error) {
            logger.warn('Erro ao carregar background customizado');
        }
    }

    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    } else {
        drawCosmicBackground(ctx, 800, 600);
    }

    // Avatar
    const avatarCenterX = 400;
    const avatarCenterY = 170;
    const avatarRadius = 90;

    let avatarURL = member.user?.displayAvatarURL({ extension: 'png', size: 128 }) || '';
    if (avatarURL.includes('.webp')) {
        avatarURL = avatarURL.replace('.webp', '.png');
    }

    let avatar = await loadAvatarSafe(avatarURL);

    if (avatar) {
        // Glow layers
        const glowLayers = [
            { size: avatarRadius + 25, color: 'rgba(0, 255, 255, 0.15)', blur: 30 },
            { size: avatarRadius + 18, color: 'rgba(255, 0, 255, 0.2)', blur: 20 },
            { size: avatarRadius + 12, color: 'rgba(0, 255, 255, 0.3)', blur: 15 },
        ];

        glowLayers.forEach(layer => {
            ctx.save();
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = layer.blur;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = 3;
            drawHexagon(ctx, avatarCenterX, avatarCenterY, layer.size);
            ctx.stroke();
            ctx.restore();
        });

        // Borda hexagonal principal
        ctx.save();
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        drawHexagon(ctx, avatarCenterX, avatarCenterY, avatarRadius + 5);
        ctx.stroke();
        ctx.restore();

        // Clip e desenha avatar
        ctx.save();
        drawHexagon(ctx, avatarCenterX, avatarCenterY, avatarRadius);
        ctx.clip();
        ctx.drawImage(avatar, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();
    } else {
        // Placeholder
        ctx.save();
        const placeholderGradient = ctx.createRadialGradient(avatarCenterX, avatarCenterY, 0, avatarCenterX, avatarCenterY, avatarRadius);
        placeholderGradient.addColorStop(0, '#ffdd44');
        placeholderGradient.addColorStop(0.7, '#ffaa00');
        placeholderGradient.addColorStop(1, '#cc6600');

        ctx.fillStyle = placeholderGradient;
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 48px ${PREFERRED_FONT}, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
        ctx.restore();
    }

    // Texto principal
    const displayText = text.replace('[username]', username);
    const mainY = 330;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtítulo
    ctx.save();
    ctx.font = `bold 18px ${PREFERRED_FONT}, sans-serif`;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00ffff';
    ctx.fillText('★ BEM-VINDO À GALÁXIA ★', 400, mainY - 60);
    ctx.restore();

    // Nome com neon
    ctx.save();
    ctx.font = `bold 52px ${PREFERRED_FONT}, sans-serif`;

    const textGrad = ctx.createLinearGradient(100, mainY - 30, 700, mainY + 30);
    textGrad.addColorStop(0, '#00ffff');
    textGrad.addColorStop(0.3, '#ffffff');
    textGrad.addColorStop(0.5, '#ff00ff');
    textGrad.addColorStop(0.7, '#ffffff');
    textGrad.addColorStop(1, '#00ffff');

    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = textGrad;
    ctx.fillText(displayText.toUpperCase(), 400, mainY);
    ctx.restore();

    // Contador de membros
    const memberCount = member.guild?.memberCount || 0;
    ctx.save();

    const counterY = mainY + 70;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.font = `bold 20px ${PREFERRED_FONT}, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`⭐ MEMBRO #${memberCount} ⭐`, 400, counterY);
    ctx.restore();

    // Rodapé
    ctx.save();
    ctx.font = `16px ${PREFERRED_FONT}, sans-serif`;
    ctx.fillStyle = 'rgba(200, 200, 255, 0.7)';
    ctx.fillText('━━━━━━━━━━ ✦ COREBOT ✦ ━━━━━━━━━━', 400, 550);
    ctx.restore();

    logger.info('Banner gerado com sucesso');
    return canvas.toBuffer();
}

async function generateBannerFast(member: GuildMember, text: string, _isWelcome = true): Promise<Buffer> {
    const username = member?.user?.username || member?.displayName || 'Usuário';

    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Fundo simples
    const guildConfig = getConfig(member.guild.id);
    let backgroundImage = null;

    // Check plan for fast generator too
    const ownerId = member.guild.ownerId;
    const canUseCustomBackground = await hasPlanAccess(await getUserPlan(ownerId), 'welcome');

    if (canUseCustomBackground && guildConfig.background && fs.existsSync(guildConfig.background)) {
        try {
            backgroundImage = await loadImage(guildConfig.background);
        } catch (error) {
            logger.warn('Erro ao carregar background');
        }
    }

    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    } else {
        ctx.fillStyle = '#1a0033';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#00ffff';
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 800, Math.random() * 600, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Avatar placeholder
    const avatarCenterX = 400;
    const avatarCenterY = 180;
    const avatarRadius = 100;

    ctx.save();
    const placeholderGradient = ctx.createRadialGradient(avatarCenterX, avatarCenterY, 0, avatarCenterX, avatarCenterY, avatarRadius);
    placeholderGradient.addColorStop(0, '#ffdd44');
    placeholderGradient.addColorStop(0.7, '#ffaa00');
    placeholderGradient.addColorStop(1, '#cc6600');

    ctx.fillStyle = placeholderGradient;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 72px ${PREFERRED_FONT}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
    ctx.restore();

    // Texto
    const displayText = text.replace('[username]', username);
    const mainYFast = 360;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 56px ${PREFERRED_FONT}, sans-serif`;

    const gradFast = ctx.createLinearGradient(200, mainYFast - 40, 600, mainYFast + 40);
    gradFast.addColorStop(0, '#ffd54f');
    gradFast.addColorStop(0.4, '#ff8a00');
    gradFast.addColorStop(0.7, '#ff3d00');
    gradFast.addColorStop(1, '#ffeaa7');

    ctx.fillStyle = gradFast;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    renderTextCentered(ctx, displayText, 400, mainYFast - 24, 700, 72, 3);

    return canvas.toBuffer();
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CLIENT
// ═══════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ═══════════════════════════════════════════════════════════════════════════
// 📋 COMANDOS SLASH
// ═══════════════════════════════════════════════════════════════════════════

const commands = [
    new SlashCommandBuilder()
        .setName('config-welcome')
        .setDescription('Configure welcome and leave messages'),
    new SlashCommandBuilder()
        .setName('set-welcome-channel')
        .setDescription('Define o canal para mensagens de boas-vindas')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal onde as boas-vindas serão enviadas')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),
    new SlashCommandBuilder()
        .setName('set-leave-channel')
        .setDescription('Define o canal para mensagens de despedida')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal onde as despedidas serão enviadas')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),
    new SlashCommandBuilder()
        .setName('clear-background')
        .setDescription('Remove o background personalizado e volta ao padrão'),
];

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        logger.info('Registrando comandos slash...');
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        logger.info('Comandos registrados com sucesso!');
    } catch (error) {
        logger.error('Erro ao registrar comandos');
    }
})();

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function safeReply(interaction: Interaction, content: string, ephemeral = true): Promise<void> {
    try {
        if (!interaction.isRepliable()) return;
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content, ephemeral });
        } else {
            await interaction.reply({ content, ephemeral });
        }
    } catch (err) {
        logger.warn('Erro em safeReply (ignorado)');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎮 EVENTOS
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', () => {
    logger.info(`🚀 Bot Welcome ${client.user?.tag} está online!`);
    logger.info(`Servidores conectados: ${client.guilds.cache.size}`);
});

// Welcome
client.on('guildMemberAdd', async (member: GuildMember) => {
    logger.info(`🎉 Novo membro: ${member.user.username} em ${member.guild.name}`);

    const welcomeChannelId = getWelcomeChannelId(member.guild.id);
    if (!welcomeChannelId) {
        logger.warn('WELCOME_CHANNEL_ID não configurado');
        return;
    }

    const channel = member.guild.channels.cache.get(welcomeChannelId) as TextChannel | undefined;
    if (!channel) {
        logger.error(`Canal de welcome não encontrado: ${welcomeChannelId}`);
        return;
    }

    const botPermissions = channel.permissionsFor(member.guild.members.me!);
    if (!botPermissions?.has(PermissionFlagsBits.SendMessages) || !botPermissions?.has(PermissionFlagsBits.AttachFiles)) {
        logger.error('Bot sem permissão no canal de welcome');
        return;
    }

    try {
        const guildConfig = getConfig(member.guild.id);
        const ownerId = member.guild.ownerId;
        const plan = await getUserPlan(ownerId);

        // Enforce Free Plan Limit
        // If plan is free, force default message
        const isFree = plan === 'free';
        const finalMessage = isFree ? 'Bem-vindo {user} ao servidor!' : guildConfig.welcomeText;

        let buffer: Buffer;

        try {
            buffer = await generateBanner(member, finalMessage, true);
        } catch (bannerError) {
            logger.warn('Banner completo falhou, usando versão rápida');
            buffer = await generateBannerFast(member, finalMessage, true);
        }

        const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
        await channel.send({ files: [attachment] });
        logger.info(`Welcome enviado para ${member.user.username}`);
    } catch (error) {
        logger.error('Erro ao enviar welcome');
    }
});

// Leave
client.on('guildMemberRemove', async (member) => {
    const guildMember = member as GuildMember;
    logger.info(`👋 Membro saiu: ${guildMember.user?.username || 'Unknown'} de ${guildMember.guild.name}`);

    const leaveChannelId = getLeaveChannelId(guildMember.guild.id);
    if (!leaveChannelId) {
        logger.warn('LEAVE_CHANNEL_ID não configurado');
        return;
    }

    const channel = guildMember.guild.channels.cache.get(leaveChannelId) as TextChannel | undefined;
    if (!channel) {
        logger.error(`Canal de leave não encontrado: ${leaveChannelId}`);
        return;
    }

    const botPermissions = channel.permissionsFor(guildMember.guild.members.me!);
    if (!botPermissions?.has(PermissionFlagsBits.SendMessages) || !botPermissions?.has(PermissionFlagsBits.AttachFiles)) {
        logger.error('Bot sem permissão no canal de leave');
        return;
    }

    try {
        const guildConfig = getConfig(guildMember.guild.id);
        const ownerId = guildMember.guild.ownerId;
        const plan = await getUserPlan(ownerId);

        // Enforce Free Plan Limit
        const isFree = plan === 'free';
        const finalMessage = isFree ? '{user} saiu do servidor.' : guildConfig.leaveText;

        let buffer: Buffer;

        try {
            buffer = await generateBanner(guildMember, finalMessage, false);
        } catch (bannerError) {
            logger.warn('Banner completo falhou, usando versão rápida');
            buffer = await generateBannerFast(guildMember, finalMessage, false);
        }

        const attachment = new AttachmentBuilder(buffer, { name: 'leave.png' });
        await channel.send({ files: [attachment] });
        logger.info(`Leave enviado para ${guildMember.user?.username || 'Unknown'}`);
    } catch (error) {
        logger.error('Erro ao enviar leave');
    }
});

// Interações
client.on('interactionCreate', async (interaction: Interaction) => {
    // Comandos
    if (interaction.isChatInputCommand()) {
        const member = interaction.member as GuildMember;

        if (!hasPermission(member)) {
            await safeReply(interaction, '❌ Sem permissão.');
            return;
        }

        if (CATEGORY_ID && interaction.channel && 'parentId' in interaction.channel && interaction.channel.parentId !== CATEGORY_ID) {
            await safeReply(interaction, '❌ Canal incorreto.');
            return;
        }

        try {
            if (interaction.commandName === 'config-welcome') {
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('edit_welcome_text')
                            .setLabel('Texto Welcome')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('edit_leave_text')
                            .setLabel('Texto Leave')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('upload_background')
                            .setLabel('Upload Background')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('preview')
                            .setLabel('Preview')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('preview_fast')
                            .setLabel('Preview (Rápido)')
                            .setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({
                    content: '🌌 **Configuração Welcome/Leave:**',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });

            } else if (interaction.commandName === 'clear-background') {
                const guildConfig = getConfig(interaction.guildId!);
                const bgPath = path.join(backgroundsPath, `background_${interaction.guildId}.png`);

                if (fs.existsSync(bgPath)) {
                    fs.unlinkSync(bgPath);
                }

                guildConfig.background = null;
                saveConfigToDB(interaction.guildId!, guildConfig);

                await interaction.reply({ content: '✅ Background removido.', flags: MessageFlags.Ephemeral });

            } else if (interaction.commandName === 'set-welcome-channel') {
                const channel = interaction.options.getChannel('canal');
                const guildConfig = getConfig(interaction.guildId!);
                guildConfig.welcomeChannel = channel!.id;
                saveConfigToDB(interaction.guildId!, guildConfig);

                await interaction.reply({ content: `✅ Canal de boas-vindas definido para ${channel}.`, flags: MessageFlags.Ephemeral });

            } else if (interaction.commandName === 'set-leave-channel') {
                const channel = interaction.options.getChannel('canal');
                const guildConfig = getConfig(interaction.guildId!);
                guildConfig.leaveChannel = channel!.id;
                saveConfigToDB(interaction.guildId!, guildConfig);

                await interaction.reply({ content: `✅ Canal de despedidas definido para ${channel}.`, flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            logger.error(`Erro no comando ${interaction.commandName}`);
        }
        return;
    }

    // Botões
    if (interaction.isButton()) {
        const member = interaction.member as GuildMember;

        if (!hasPermission(member)) {
            await safeReply(interaction, '❌ Sem permissão.');
            return;
        }

        try {
            if (interaction.customId === 'edit_welcome_text') {
                const guildConfig = getConfig(interaction.guildId!);
                const modal = new ModalBuilder()
                    .setCustomId('welcome_text_modal')
                    .setTitle('Editar Texto Welcome')
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId('welcome_text')
                                .setLabel('Texto Welcome')
                                .setStyle(TextInputStyle.Short)
                                .setValue(guildConfig.welcomeText)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);

            } else if (interaction.customId === 'edit_leave_text') {
                const guildConfig = getConfig(interaction.guildId!);
                const modal = new ModalBuilder()
                    .setCustomId('leave_text_modal')
                    .setTitle('Editar Texto Leave')
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId('leave_text')
                                .setLabel('Texto Leave')
                                .setStyle(TextInputStyle.Short)
                                .setValue(guildConfig.leaveText)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);

            } else if (interaction.customId === 'upload_background') {
                await interaction.reply({
                    content: '📤 **Upload de Background:**\n\nEnvie uma imagem PNG ou JPEG (máx 5MB) neste canal.\nO bot detectará automaticamente.',
                    flags: MessageFlags.Ephemeral
                });

            } else if (interaction.customId === 'preview') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const guildConfig = getConfig(interaction.guildId!);
                    let buffer: Buffer;

                    try {
                        buffer = await generateBanner(member, guildConfig.welcomeText, true);
                    } catch (avatarError) {
                        buffer = await generateBannerFast(member, guildConfig.welcomeText, true);
                    }

                    const attachment = new AttachmentBuilder(buffer, { name: 'preview.png' });
                    await interaction.editReply({ content: '🌌 **Preview:**', files: [attachment] });
                } catch (previewError) {
                    await interaction.editReply({ content: '❌ Erro ao gerar preview.' });
                }

            } else if (interaction.customId === 'preview_fast') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const guildConfig = getConfig(interaction.guildId!);
                    const buffer = await generateBannerFast(member, guildConfig.welcomeText, true);
                    const attachment = new AttachmentBuilder(buffer, { name: 'preview-fast.png' });
                    await interaction.editReply({ content: '⚡ **Preview Rápido (Placeholder):**', files: [attachment] });
                } catch (previewError) {
                    await interaction.editReply({ content: '❌ Erro ao gerar preview rápido.' });
                }
            }

        } catch (error) {
            logger.error(`Erro no botão ${interaction.customId}`);
        }
        return;
    }

    // Modais
    if (interaction.isModalSubmit()) {
        try {
            if (interaction.customId === 'welcome_text_modal') {
                const guildConfig = getConfig(interaction.guildId!);
                guildConfig.welcomeText = interaction.fields.getTextInputValue('welcome_text');
                saveConfigToDB(interaction.guildId!, guildConfig);
                await interaction.reply({ content: '✅ Texto welcome atualizado!', flags: MessageFlags.Ephemeral });

            } else if (interaction.customId === 'leave_text_modal') {
                const guildConfig = getConfig(interaction.guildId!);
                guildConfig.leaveText = interaction.fields.getTextInputValue('leave_text');
                saveConfigToDB(interaction.guildId!, guildConfig);
                await interaction.reply({ content: '✅ Texto leave atualizado!', flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            logger.error('Erro no modal');
        }
        return;
    }
});

// Upload de backgrounds via mensagem
client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;
    if (message.attachments.size === 0) return;

    const isWelcomeChannel = message.channel.id === getWelcomeChannelId(message.guild.id);
    const isLeaveChannel = message.channel.id === getLeaveChannelId(message.guild.id);

    if (!isWelcomeChannel && !isLeaveChannel) return;

    const member = message.member;
    if (!member || !hasPermission(member)) return;

    for (const attachment of message.attachments.values()) {
        logger.info(`Processando anexo: ${attachment.name}`);

        const maxSize = 5 * 1024 * 1024;
        if (attachment.size > maxSize) {
            await message.reply('❌ A imagem deve ter no máximo 5MB!');
            continue;
        }

        const filePath = path.join(backgroundsPath, `background_${message.guild.id}.png`);

        try {
            const response = await fetchWithTimeout(attachment.url, 30000);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            const realImageType = getImageTypeFromBuffer(imageBuffer);

            if (!['image/png', 'image/jpeg'].includes(realImageType)) {
                await message.reply(`❌ **Formato não suportado!**\n\nTipo detectado: \`${realImageType}\`\nUse apenas PNG ou JPEG.`);
                continue;
            }

            // Validar imagem
            try {
                await loadImage(imageBuffer);
            } catch (imageError) {
                await message.reply('❌ **Arquivo corrompido ou inválido!**\n\nTente outra imagem.');
                continue;
            }

            fs.writeFileSync(filePath, imageBuffer);

            const guildConfig = getConfig(message.guild.id);
            guildConfig.background = filePath;
            saveConfigToDB(message.guild.id, guildConfig);

            const stats = fs.statSync(filePath);
            await message.reply(`✅ **Background atualizado com sucesso!**\n\n📊 **Detalhes:**\n• Tipo: ${realImageType}\n• Tamanho: ${Math.round(stats.size / 1024)}KB\n\n🌌 Use \`/config-welcome\` → Preview para ver o resultado!`);

        } catch (error) {
            logger.error('Erro ao processar background');
            await message.reply('❌ Erro ao processar o background.');
        }
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 START
// ═══════════════════════════════════════════════════════════════════════════

client.once('ready', async () => {
    logger.info(`✅ Bot Welcome ${client.user?.tag} está online!`);

    // Inicializar banco de dados
    try {
        const connected = await testConnection();
        if (connected) {
            await initializeSchema();
            dbConnected = true;
            logger.info('💾 Database PostgreSQL conectado!');
        }
    } catch (error) {
        logger.warn('⚠️ Database não disponível, usando apenas JSON local');
    }
});

client.login(TOKEN).catch(error => {
    logger.error('Falha ao conectar:', { error });
    process.exit(1);
});

process.on('SIGINT', async () => {
    logger.info('Desligando Bot Welcome...');
    await closePool();
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Erro não tratado:', { error });
});

// Export para testes
export { generateBanner, generateBannerFast };
