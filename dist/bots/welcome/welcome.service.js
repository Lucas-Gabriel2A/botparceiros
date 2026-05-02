"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBanner = generateBanner;
exports.generateBannerFast = generateBannerFast;
const canvas_1 = require("canvas");
const fs_extra_1 = __importDefault(require("fs-extra"));
const https_1 = __importDefault(require("https"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const services_1 = require("../../shared/services");
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES & UTILS
// ═══════════════════════════════════════════════════════════════════════════
const PREFERRED_FONT = 'sans-serif';
async function fetchWithTimeout(url, timeout = 5000, headers = { 'User-Agent': 'DiscordBot/1.0' }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers
        });
        clearTimeout(timeoutId);
        return response;
    }
    catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}
const registeredFonts = new Set();
async function loadAndRegisterGoogleFont(fontFamily) {
    if (registeredFonts.has(fontFamily))
        return fontFamily;
    try {
        const url = `https://fonts.googleapis.com/css?family=${fontFamily.replace(/ /g, '+')}`;
        // Forçar um User-Agent bem antigo faz o Google Fonts API retornar um arquivo .ttf purão em vez de woff2!
        const cssResp = await fetchWithTimeout(url, 4000, { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1' });
        if (!cssResp.ok)
            return PREFERRED_FONT;
        const css = await cssResp.text();
        const match = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
        if (match && match[1]) {
            const fontUrl = match[1];
            const fontResp = await fetchWithTimeout(fontUrl, 5000);
            const arrayBuffer = await fontResp.arrayBuffer();
            const fontPath = path_1.default.join(os_1.default.tmpdir(), `${fontFamily.replace(/ /g, '_')}_coreia.ttf`);
            fs_extra_1.default.writeFileSync(fontPath, Buffer.from(arrayBuffer));
            const { registerFont } = await Promise.resolve().then(() => __importStar(require('canvas')));
            registerFont(fontPath, { family: fontFamily });
            registeredFonts.add(fontFamily);
            services_1.logger.info(`🎨 Fonte ${fontFamily} injetada dinamicamente pelo Google Fonts!`);
            return fontFamily;
        }
        else {
            services_1.logger.warn(`Não foi possível extrair um link TTF para a fonte: ${fontFamily}`);
        }
    }
    catch (e) {
        services_1.logger.error(`Falha no Google Fonts (${fontFamily}):`, e.message);
    }
    return PREFERRED_FONT; // Fallback
}
async function loadAvatarSafe(urlToLoad) {
    try {
        const resp = await fetchWithTimeout(urlToLoad, 3000);
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const arrayBuffer = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        return await (0, canvas_1.loadImage)(buf);
    }
    catch (error) {
        services_1.logger.warn('Falha ao carregar avatar via fetch');
    }
    // Fallback: https.get
    try {
        const imageBuffer = await new Promise((resolve, reject) => {
            const urlObj = new url_1.URL(urlToLoad);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                timeout: 2000,
                headers: { 'User-Agent': 'DiscordBot/1.0' }
            };
            const req = https_1.default.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            req.on('error', (e) => reject(e));
            req.end();
        });
        return await (0, canvas_1.loadImage)(imageBuffer);
    }
    catch (error) {
        services_1.logger.warn('Fallback https.get também falhou');
    }
    return null;
}
function drawHexagon(ctx, cx, cy, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.closePath();
}
function drawCosmicBackground(ctx, width, height) {
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
// 🖼️ GERADOR DE BANNER (Stateless)
// ═══════════════════════════════════════════════════════════════════════════
async function generateBanner(member, text, backgroundPath = null, font = null) {
    const username = member.user?.username || member.displayName || 'Usuário';
    services_1.logger.info(`Gerando banner para ${username}`);
    const canvas = (0, canvas_1.createCanvas)(800, 600);
    const ctx = canvas.getContext('2d');
    const selectedFont = font ? await loadAndRegisterGoogleFont(font) : PREFERRED_FONT;
    // Fundo
    let backgroundImage = null;
    if (backgroundPath) {
        try {
            // loadImage aceita tanto URLs (http/https) quanto caminhos locais
            backgroundImage = await (0, canvas_1.loadImage)(backgroundPath);
        }
        catch (error) {
            services_1.logger.warn(`Erro ao carregar background customizado: ${backgroundPath}`);
        }
    }
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    }
    else {
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
    }
    else {
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
        ctx.font = `bold 48px "${selectedFont}", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
        ctx.restore();
    }
    // Texto principal
    const displayText = text.replace('[username]', username).replace('{user}', username);
    const mainY = 330;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Subtítulo
    ctx.save();
    ctx.font = `bold 18px "${selectedFont}", sans-serif`;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00ffff';
    ctx.fillText('★ BEM-VINDO À GALÁXIA ★', 400, mainY - 60);
    ctx.restore();
    // Nome com neon
    ctx.save();
    ctx.font = `bold 52px "${selectedFont}", sans-serif`;
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
    ctx.font = `bold 20px "${selectedFont}", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`⭐ MEMBRO #${memberCount} ⭐`, 400, counterY);
    ctx.restore();
    // Rodapé
    ctx.save();
    ctx.font = `16px "${selectedFont}", sans-serif`;
    ctx.fillStyle = 'rgba(200, 200, 255, 0.7)';
    ctx.fillText('━━━━━━━━━━ ✦ COREBOT ✦ ━━━━━━━━━━', 400, 550);
    ctx.restore();
    return canvas.toBuffer();
}
async function generateBannerFast(member, text, backgroundPath = null, font = null) {
    const username = member?.user?.username || member?.displayName || 'Usuário';
    const canvas = (0, canvas_1.createCanvas)(800, 600);
    const ctx = canvas.getContext('2d');
    const selectedFont = font ? await loadAndRegisterGoogleFont(font) : PREFERRED_FONT;
    // Fundo simples
    let backgroundImage = null;
    if (backgroundPath && fs_extra_1.default.existsSync(backgroundPath)) {
        try {
            backgroundImage = await (0, canvas_1.loadImage)(backgroundPath);
        }
        catch (error) {
            services_1.logger.warn('Erro ao carregar background');
        }
    }
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    }
    else {
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
    ctx.font = `bold 72px "${selectedFont}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
    ctx.restore();
    // Texto
    const displayText = text.replace('[username]', username).replace('{user}', username);
    const mainYFast = 360;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 56px "${selectedFont}", sans-serif`;
    const gradFast = ctx.createLinearGradient(200, mainYFast - 40, 600, mainYFast + 40);
    gradFast.addColorStop(0, '#ffd54f');
    gradFast.addColorStop(0.4, '#ff8a00');
    gradFast.addColorStop(0.7, '#ff3d00');
    gradFast.addColorStop(1, '#ffeaa7');
    ctx.fillStyle = gradFast;
    ctx.fillText(displayText.toUpperCase(), 400, mainYFast);
    return canvas.toBuffer();
}
//# sourceMappingURL=welcome.service.js.map