// Polyfill para ReadableStream (compatibilidade com Node.js < 16.5.0)
const { ReadableStream } = require('web-streams-polyfill');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, SelectMenuBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const url = require('url');

// 🔄 IMPLEMENTAR FETCH COM TIMEOUT PARA RAILWAY
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'DiscordBot/1.0',
                ...options.headers
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// Configurações
const TOKEN = process.env.DISCORD_TOKENS;
const CLIENT_ID = process.env.CLIENT_ID;

// IDs fixos
const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
const SEMI_OWNER_ROLE_ID = process.env.SEMI_OWNER_ROLE_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const LEAVE_CHANNEL_ID = process.env.LEAVE_CHANNEL_ID;

// Log das configurações carregadas
console.log('🔧 Configurações carregadas:');
console.log(`TOKEN: ${TOKEN ? '✅ Definido' : '❌ Não definido'}`);
console.log(`CLIENT_ID: ${CLIENT_ID || '❌ Não definido'}`);
console.log(`WELCOME_CHANNEL_ID: ${WELCOME_CHANNEL_ID || '❌ Não definido'}`);
console.log(`LEAVE_CHANNEL_ID: ${LEAVE_CHANNEL_ID || '❌ Não definido'}`);
console.log(`CATEGORY_ID: ${CATEGORY_ID || '❌ Não definido'}`);
console.log(`OWNER_ROLE_ID: ${OWNER_ROLE_ID || '❌ Não definido'}`);
console.log(`SEMI_OWNER_ROLE_ID: ${SEMI_OWNER_ROLE_ID || '❌ Não definido'}`);
console.log('🚀 Iniciando bot welcome...\n');

// Validação das variáveis de ambiente críticas
if (!TOKEN) {
    console.error("❌ DISCORD_TOKENS não configurado no arquivo .env");
    process.exit(1);
}
if (!CLIENT_ID) {
    console.error("❌ CLIENT_ID não configurado no arquivo .env");
    process.exit(1);
}
if (!WELCOME_CHANNEL_ID) {
    console.error("❌ WELCOME_CHANNEL_ID não configurado no arquivo .env");
}
if (!LEAVE_CHANNEL_ID) {
    console.error("❌ LEAVE_CHANNEL_ID não configurado no arquivo .env");
}
if (!CATEGORY_ID) {
    console.error("❌ CATEGORY_ID não configurado no arquivo .env");
}

// Cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Caminhos
const configPath = path.join(__dirname, 'config.json');
const backgroundsPath = path.join(__dirname, 'backgrounds');

// Garantir diretórios
fs.ensureDirSync(backgroundsPath);

// Carregar configs
let configs = {};
if (fs.existsSync(configPath)) {
    configs = fs.readJsonSync(configPath);
    console.log('Configs carregados:', Object.keys(configs));
} else {
    configs = {};
    fs.writeJsonSync(configPath, configs);
    console.log('Arquivo de config criado');
}

// Função para salvar config
function saveConfig() {
    fs.writeJsonSync(configPath, configs);
}

// Função para renderizar texto com quebra automática
function renderText(ctx, text, x, y, maxWidth, lineHeight = 70) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    const maxCharsPerLine = Math.floor(maxWidth / 20); // Aproximadamente 20px por caractere

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && i > 0) {
            lines.push(line.trim());
            line = words[i] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());

    // Limitar a 3 linhas para não sobrecarregar
    if (lines.length > 3) {
        lines = lines.slice(0, 3);
        lines[2] = lines[2].substring(0, maxCharsPerLine - 3) + '...';
    }

    // Renderizar cada linha
    lines.forEach((lineText, index) => {
        const lineY = y + (index * lineHeight);

        // Sombra para efeito épico
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(lineText, x + 2, lineY + 2);

        // Contorno
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(lineText, x, lineY);

        // Texto principal com gradiente
        const gradient = ctx.createLinearGradient(x - 100, lineY - 30, x + 100, lineY + 30);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#ffdd44');
        gradient.addColorStop(1, '#ffffff');

        ctx.fillStyle = gradient;
        ctx.fillText(lineText, x, lineY);
    });

    return lines.length;
}

// Função para detectar tipo real da imagem pelos bytes
function getImageTypeFromBuffer(buffer) {
    const firstBytes = buffer.slice(0, 12);
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        return 'image/png';
    }
    
    // JPEG: FF D8 FF
    if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF) {
        return 'image/jpeg';
    }
    
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46 &&
        firstBytes[8] === 0x57 && firstBytes[9] === 0x45 && firstBytes[10] === 0x42 && firstBytes[11] === 0x50) {
        return 'image/webp';
    }
    
    // GIF: 47 49 46 38
    if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x38) {
        return 'image/gif';
    }
    
    return 'unknown';
}

function getConfig(guildId) {
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

// Função para verificar permissões
function hasPermission(member) {
    if (member.id === member.guild.ownerId) return true;
    if (member.roles.cache.has(OWNER_ROLE_ID) || member.roles.cache.has(SEMI_OWNER_ROLE_ID)) return true;
    return false;
}

// Função para gerar banner (completo com avatar)
async function generateBanner(member, text, isWelcome = true) {
    console.log(`\n🎨 === GERANDO BANNER ===`);
    console.log(`Texto: "${text}"`);
    console.log(`É Welcome: ${isWelcome}`);

    // 🔍 LOGS DETALHADOS DO MEMBER RECEBIDO
    console.log(`\n🔍 === MEMBER RECEBIDO NA FUNÇÃO ===`);
    console.log(`Member ID: ${member?.id}`);
    console.log(`Member Display Name: ${member?.displayName}`);
    console.log(`Member Nickname: ${member?.nickname}`);

    console.log(`\n🔍 === USER RECEBIDO NA FUNÇÃO ===`);
    console.log(`User ID: ${member?.user?.id}`);
    console.log(`User Username: ${member?.user?.username}`);
    console.log(`User Discriminator: ${member?.user?.discriminator}`);
    console.log(`User Global Name: ${member?.user?.globalName}`);
    console.log(`User Display Name: ${member?.user?.displayName}`);
    console.log(`User Bot: ${member?.user?.bot}`);

    // 🔍 EXTRAÇÃO DO USERNAME
    const username = member.user?.username || member.displayName || 'Usuário Desconhecido';
    console.log(`\n🔍 === EXTRAÇÃO DO USERNAME ===`);
    console.log(`member.user?.username: ${member.user?.username}`);
    console.log(`member.displayName: ${member.displayName}`);
    console.log(`Username final usado: "${username}"`);

    console.log(`🎨 generateBanner iniciada para ${username}`);

    let canvas, ctx;
    try {
        canvas = createCanvas(800, 600);
        ctx = canvas.getContext('2d');
        console.log('✅ Canvas criado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao criar canvas:', error);
        throw new Error('Falha ao criar canvas para o banner');
    }

    // Fundo padrão ou customizado
    let backgroundImage;
    if (getConfig(member.guild.id).background && fs.existsSync(getConfig(member.guild.id).background)) {
        try {
            console.log(`Carregando background customizado: ${getConfig(member.guild.id).background}`);
            backgroundImage = await loadImage(getConfig(member.guild.id).background);
            console.log('Background carregado com sucesso');
        } catch (error) {
            console.log('Erro ao carregar background customizado:', error.message);
        }
    }

    if (!backgroundImage) {
        // Fundo padrão cósmico
        ctx.fillStyle = '#1a0033';
        ctx.fillRect(0, 0, 800, 600);
        // Estrelas
        ctx.fillStyle = '#00ffff';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    }

    // Avatar circular
    try {
        console.log(`\n🖼️ === CARREGAMENTO DO AVATAR ===`);

        // 🔍 LOGS DETALHADOS DO AVATAR
        console.log(`member.user existe: ${!!member.user}`);
        console.log(`member.user.displayAvatarURL existe: ${!!member.user?.displayAvatarURL}`);

        const avatarURL = member.user?.displayAvatarURL({
            format: 'png',
            size: 128,
            dynamic: false
        }) || 'path/to/placeholder.png';

        // 🔧 FORÇAR PNG MANUALMENTE SE AINDA FOR WEBP
        let finalAvatarURL = avatarURL;
        if (avatarURL && avatarURL.includes('.webp')) {
            finalAvatarURL = avatarURL.replace('.webp', '.png');
            console.log(`🔧 URL convertida de WEBP para PNG: ${finalAvatarURL}`);
        }

        console.log(`Avatar URL gerado: ${avatarURL}`);
        console.log(`Avatar URL final: ${finalAvatarURL}`);
        console.log(`URL é placeholder: ${avatarURL === 'path/to/placeholder.png'}`);

        // 🔍 TESTE DE CONECTIVIDADE COM CDN
        if (finalAvatarURL !== 'path/to/placeholder.png') {
            console.log(`🌐 Testando conectividade com CDN do Discord (forçando PNG)...`);
            try {
                const testURL = new URL(finalAvatarURL);

                const connectivityTest = new Promise((resolve, reject) => {
                    const req = https.request({
                        hostname: testURL.hostname,
                        path: testURL.pathname + testURL.search,
                        method: 'HEAD', // Apenas testa se o servidor responde
                        timeout: 5000
                    }, (res) => {
                        console.log(`🌐 Status da resposta: ${res.statusCode}`);
                        console.log(`🌐 Content-Type: ${res.headers['content-type']}`);
                        console.log(`🌐 Content-Length: ${res.headers['content-length']}`);
                        console.log(`🌐 Formato forçado: PNG (Canvas-compatible)`);
                        resolve(res.statusCode === 200);
                    });

                    req.on('error', (error) => {
                        console.log(`🌐 ❌ Erro de conectividade: ${error.message}`);
                        reject(error);
                    });

                    req.on('timeout', () => {
                        console.log(`🌐 ❌ Timeout na conexão (5s)`);
                        req.destroy();
                        reject(new Error('Timeout de conectividade'));
                    });

                    req.end();
                });

                const isReachable = await connectivityTest;
                console.log(`🌐 ✅ Servidor CDN acessível: ${isReachable}`);

            } catch (connectivityError) {
                console.log(`🌐 ❌ Problema de conectividade detectado: ${connectivityError.message}`);
                console.log(`🌐 💡 Isso explica por que o avatar não carrega!`);
                console.log(`🌐 🔧 Possíveis causas:`);
                console.log(`🌐   - Firewall bloqueando conexões externas`);
                console.log(`🌐   - Rede lenta no servidor de hospedagem`);
                console.log(`🌐   - Limitação do plano (Railway/Discloud)`);
                console.log(`🌐   - CDN do Discord temporariamente indisponível`);
            }
        }

        // Testar diferentes formatos
        if (member.user?.displayAvatarURL) {
            let logPngURL = member.user.displayAvatarURL({ format: 'png', size: 128 });
            if (logPngURL && logPngURL.includes('.webp')) {
                logPngURL = logPngURL.replace('.webp', '.png');
            }
            console.log(`Avatar PNG: ${logPngURL}`);
            console.log(`Avatar WEBP: ${member.user.displayAvatarURL({ format: 'webp', size: 128 })}`);
            console.log(`Avatar JPEG: ${member.user.displayAvatarURL({ format: 'jpeg', size: 128 })}`);
        }

        console.log(`🖼️ Tentando carregar avatar: ${finalAvatarURL}`);

        // 🔍 DEBUG EXTRA PARA loadImage
        console.log(`🔍 DEBUG loadImage: URL final = ${finalAvatarURL}`);
        console.log(`🔍 DEBUG loadImage: URL includes .png = ${finalAvatarURL.includes('.png')}`);

        // Tentar múltiplos formatos se disponível
        let avatar;
        try {
            // 🔄 MÉTODO ALTERNATIVO: Usar https.get se loadImage falhar
            console.log(`🔄 Tentando método alternativo com https.get...`);
            console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
            console.log(`🌐 Plataforma: ${process.platform}`);
            console.log(`🌐 Node version: ${process.version}`);

            try {
                console.log(`⏳ Ambiente Railway detectado - pulando loadImage problem�tico`);
                const response = await fetchWithTimeout(finalAvatarURL, {}, 3000);
                console.log('✅ Avatar carregado com sucesso via loadImage');
            } catch (loadImageError) {
                console.log(`⚠️ loadImage falhou: ${loadImageError.message}, tentando fetch...`);

                // 🔥 MÉTODO OTIMIZADO PARA RAILWAY: Usar fetch nativo
                console.log(`� Tentando fetch nativo (otimizado para Railway)...`);
                try {
                    const response = await fetchWithTimeout(finalAvatarURL, {}, 3000); // 3s timeout

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    console.log(`📡 Fetch response: ${response.status} ${response.statusText}`);
                    console.log(`📡 Content-Type: ${response.headers.get('content-type')}`);

                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    console.log(`📦 Buffer baixado via fetch: ${buffer.length} bytes`);

                    avatar = await loadImage(buffer);
                    console.log('✅ Avatar carregado com sucesso via fetch + buffer');

                } catch (fetchError) {
                    console.log(`⚠️ Fetch também falhou: ${fetchError.message}, tentando https.get como fallback...`);

                    // Método alternativo final: https.get simplificado
                    console.log(`� Último recurso: https.get simplificado...`);
                    const imageBuffer = await new Promise((resolve, reject) => {
                        const urlObj = new URL(finalAvatarURL);
                        const options = {
                            hostname: urlObj.hostname,
                            path: urlObj.pathname + urlObj.search,
                            method: 'GET',
                            timeout: 2000, // Timeout bem curto
                            headers: {
                                'User-Agent': 'DiscordBot/1.0'
                            }
                        };

                        const req = https.request(options, (res) => {
                            if (res.statusCode !== 200) {
                                reject(new Error(`HTTP ${res.statusCode}`));
                                return;
                            }

                            const chunks = [];
                            res.on('data', (chunk) => chunks.push(chunk));
                            res.on('end', () => {
                                const buffer = Buffer.concat(chunks);
                                resolve(buffer);
                            });
                        });

                        req.on('timeout', () => {
                            req.destroy();
                            reject(new Error('Timeout final'));
                        });

                        req.on('error', (err) => reject(err));
                        req.end();
                    });

                    avatar = await loadImage(imageBuffer);
                    console.log('✅ Avatar carregado via https.get final');
                }
            }
        } catch (firstError) {
            console.log(`⚠️ Primeiro formato falhou (${firstError.message}), tentando formatos alternativos...`);

            // Tentar outros formatos
            const formats = ['webp', 'png', 'jpeg'];
            for (const format of formats) {
                try {
                    let altURL = member.user.displayAvatarURL({ format: format, size: 128, dynamic: false });
                    // 🔧 APENAS PARA FORMATO PNG: forçar conversão se necessário
                    if (format === 'png' && altURL && altURL.includes('.webp')) {
                        altURL = altURL.replace('.webp', '.png');
                    }
                    console.log(`🔄 Tentando formato ${format}: ${altURL}`);

                    try {
                        avatar = await loadImage(altURL);
                        console.log(`✅ Avatar carregado via loadImage (${format})`);
                        break;
                    } catch (altLoadImageError) {
                        console.log(`⚠️ loadImage falhou para ${format}, tentando fetch...`);

                        try {
                            const response = await fetchWithTimeout(altURL, {}, 2000);
                            if (response.ok) {
                                const arrayBuffer = await response.arrayBuffer();
                                const buffer = Buffer.from(arrayBuffer);
                                avatar = await loadImage(buffer);
                                console.log(`✅ Avatar carregado via fetch (${format})`);
                                break;
                            }
                        } catch (fetchError) {
                            console.log(`⚠️ Fetch falhou para ${format}: ${fetchError.message}`);
                        }
                    }
                } catch (altError) {
                    console.log(`❌ Formato ${format} falhou completamente: ${altError.message}`);
                }
            }

            if (!avatar) {
                console.log(`❌ Todos os métodos falharam, usando placeholder`);
                console.log(`💡 Possíveis causas:`);
                console.log(`   - Ambiente hospedado com restrições de rede (Railway/Discloud)`);
                console.log(`   - Firewall bloqueando conexões externas`);
                console.log(`   - Plano gratuito com limitações`);
                console.log(`   - Para desenvolvimento local: funciona normalmente`);
                throw new Error('Todos os formatos de avatar falharam');
            }
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(400, 150, 64, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 336, 86, 128, 128);
        ctx.restore();
    } catch (error) {
        console.log(`\n❌ === ERRO NO AVATAR ===`);
        console.log(`Erro: ${error.message}`);
        console.log(`Tipo do erro: ${error.constructor.name}`);
        console.log(`Stack: ${error.stack}`);
        console.log(`member.user existe: ${!!member.user}`);
        console.log(`member.user.displayAvatarURL existe: ${!!member.user?.displayAvatarURL}`);

        if (member.user?.displayAvatarURL) {
            let retryURL = member.user.displayAvatarURL({ format: 'png', size: 128 });
            if (retryURL && retryURL.includes('.webp')) {
                retryURL = retryURL.replace('.webp', '.png');
            }
            console.log(`Tentando gerar URL novamente: ${retryURL}`);
        }

        console.log('❌ Erro ao carregar avatar, usando placeholder épico:', error.message);
        
        // Criar placeholder usando canvas (gradiente dourado com inicial do usuário)
        ctx.save();
        const placeholderGradient = ctx.createRadialGradient(400, 150, 0, 400, 150, 64);
        placeholderGradient.addColorStop(0, '#ffdd44');
        placeholderGradient.addColorStop(0.7, '#ffaa00');
        placeholderGradient.addColorStop(1, '#cc6600');

        ctx.fillStyle = placeholderGradient;
        ctx.beginPath();
        ctx.arc(400, 150, 64, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Sombra da inicial
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(username.charAt(0).toUpperCase(), 402, 152);

        // Inicial principal
        ctx.fillStyle = '#ffffff';
        ctx.fillText(username.charAt(0).toUpperCase(), 400, 150);

        ctx.restore();
    }

    // Substituir texto
    const displayText = text.replace('[username]', username);
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.fillText(displayText, 400, 300);

    console.log('✅ Banner gerado com sucesso');
    return canvas.toBuffer();
}

// Função para gerar banner rápido (sempre usa placeholder)
async function generateBannerFast(member, text, isWelcome = true) {
    console.log(`🎨 generateBannerFast iniciada para ${member?.user?.username || member?.displayName || 'Unknown'}`);

    // 🔍 LOGS DETALHADOS DO MEMBER RECEBIDO NO PREVIEW
    console.log(`\n🔍 === DEBUG FAST BANNER: MEMBER ===`);
    console.log(`Member ID: ${member?.id}`);
    console.log(`Member Display Name: ${member?.displayName}`);
    console.log(`Member Nickname: ${member?.nickname}`);
    console.log(`Member User ID: ${member?.user?.id}`);
    console.log(`Member User Username: ${member?.user?.username}`);
    console.log(`Member User Global Name: ${member?.user?.globalName}`);
    console.log(`Member User Display Name: ${member?.user?.displayName}`);
    console.log(`Member User Bot: ${member?.user?.bot}`);

    // 🔍 EXTRAÇÃO DO USERNAME
    const username = member?.user?.username || member?.displayName || 'Usuário Desconhecido';
    console.log(`\n🔍 === EXTRAÇÃO DO USERNAME (FAST) ===`);
    console.log(`member?.user?.username: ${member?.user?.username}`);
    console.log(`member?.displayName: ${member?.displayName}`);
    console.log(`Username final usado: "${username}"`);

    let canvas, ctx;
    try {
        canvas = createCanvas(800, 600);
        ctx = canvas.getContext('2d');
    } catch (error) {
        throw new Error('Falha ao criar canvas para o banner');
    }

    // Fundo padrão ou customizado
    let backgroundImage;
    if (getConfig(member.guild.id).background && fs.existsSync(getConfig(member.guild.id).background)) {
        try {
            backgroundImage = await loadImage(getConfig(member.guild.id).background);
        } catch (error) {
            console.log('Erro ao carregar background:', error.message);
        }
    }

    if (!backgroundImage) {
        // Fundo padrão cósmico
        ctx.fillStyle = '#1a0033';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#00ffff';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    }

    // Avatar: sempre usar placeholder rápido
    ctx.save();
    const placeholderGradient = ctx.createRadialGradient(400, 150, 0, 400, 150, 64);
    placeholderGradient.addColorStop(0, '#ffdd44');
    placeholderGradient.addColorStop(0.7, '#ffaa00');
    placeholderGradient.addColorStop(1, '#cc6600');

    ctx.fillStyle = placeholderGradient;
    ctx.beginPath();
    ctx.arc(400, 150, 64, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(username.charAt(0).toUpperCase(), 402, 152);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(username.charAt(0).toUpperCase(), 400, 150);

    ctx.restore();

    // Texto principal
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayText = text.replace('[username]', username);
    const linesUsed = renderText(ctx, displayText, 400, 280, 700, 60);

    // Texto secundário (número do membro) com fonte menor
    if (isWelcome) {
        const memberCount = member.guild.memberCount;
        const memberText = `Você é o ${memberCount}º Membro!`;

        ctx.font = 'bold 32px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

        // Posicionar baseado no número de linhas do texto principal
        const memberY = 280 + (linesUsed * 60) + 40;

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(memberText, 402, memberY + 2);

        // Contorno
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(memberText, 400, memberY);

        // Texto com gradiente dourado
        const memberGradient = ctx.createLinearGradient(300, memberY - 15, 500, memberY + 15);
        memberGradient.addColorStop(0, '#ffaa00');
        memberGradient.addColorStop(0.5, '#ffdd44');
        memberGradient.addColorStop(1, '#ffaa00');

        ctx.fillStyle = memberGradient;
        ctx.fillText(memberText, 400, memberY);
    }

    const buffer = canvas.toBuffer();
    console.log(`✅ Banner rápido gerado. Tamanho: ${buffer.length} bytes`);
    return buffer;
}

// Eventos de Welcome/Leave (SISTEMA AUTOMÁTICO - Categoria Galáxia)
client.on('guildMemberAdd', async (member) => {
    console.log(`🔥 EVENTO guildMemberAdd DISPARADO (WELCOME AUTOMÁTICO):`);
    console.log(`   👤 Usuário: ${member.user.username} (${member.user.id})`);
    console.log(`   🏠 Servidor: ${member.guild.name} (${member.guild.id})`);
    console.log(`   💡 Sistema: WELCOME (categoria Galáxia)`);

    // 🔍 LOGS DETALHADOS PARA DEBUG
    console.log(`\n🔍 === DEBUG: Propriedades do MEMBER ===`);
    console.log(`Member ID: ${member.id}`);
    console.log(`Member Display Name: ${member.displayName}`);
    console.log(`Member Nickname: ${member.nickname}`);
    console.log(`Member Joined At: ${member.joinedAt}`);
    console.log(`Member Roles: ${member.roles.cache.map(r => r.name).join(', ')}`);

    console.log(`\n🔍 === DEBUG: Propriedades do USER ===`);
    console.log(`User ID: ${member.user?.id}`);
    console.log(`User Username: ${member.user?.username}`);
    console.log(`User Discriminator: ${member.user?.discriminator}`);
    console.log(`User Global Name: ${member.user?.globalName}`);
    console.log(`User Display Name: ${member.user?.displayName}`);
    console.log(`User Bot: ${member.user?.bot}`);
    console.log(`User System: ${member.user?.system}`);
    console.log(`User Created At: ${member.user?.createdAt}`);

    console.log(`\n🔍 === DEBUG: AVATAR INFO ===`);
    let fastPngURL = member.user?.displayAvatarURL({ format: 'png', size: 128 });
    if (fastPngURL && fastPngURL.includes('.webp')) {
        fastPngURL = fastPngURL.replace('.webp', '.png');
    }
    console.log(`Avatar URL (PNG): ${fastPngURL}`);
    console.log(`Avatar URL (WEBP): ${member.user?.displayAvatarURL({ format: 'webp', size: 128 })}`);
    console.log(`Avatar URL (JPEG): ${member.user?.displayAvatarURL({ format: 'jpeg', size: 128 })}`);
    console.log(`Default Avatar URL: ${member.user?.defaultAvatarURL}`);
    console.log(`Avatar Hash: ${member.user?.avatar}`);
    console.log(`=====================================\n`);

    if (!WELCOME_CHANNEL_ID) {
        console.error("❌ WELCOME_CHANNEL_ID não configurado - pulando welcome");
        return;
    }
    
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) {
        console.error(`❌ Canal de welcome não encontrado. ID: ${WELCOME_CHANNEL_ID}`);
        console.log(`📋 Canais disponíveis no servidor:`, member.guild.channels.cache.map(c => `${c.name} (${c.id})`).join(', '));
        return;
    }
    
    // Nota: Canais de welcome/leave podem estar em qualquer categoria
    console.log(`📍 Canal welcome encontrado: ${channel.name} (Categoria: ${channel.parentId || 'Nenhuma'})`);
    
    // Verificar permissões do bot
    const botPermissions = channel.permissionsFor(member.guild.members.me);
    if (!botPermissions.has('SendMessages')) {
        console.error(`❌ Bot não tem permissão para enviar mensagens no canal ${channel.name}`);
        return;
    }
    if (!botPermissions.has('AttachFiles')) {
        console.error(`❌ Bot não tem permissão para anexar arquivos no canal ${channel.name}`);
        return;
    }

    try {
        console.log(`🎨 Gerando banner para ${member.user?.username || member.displayName || 'Unknown'}...`);
        const config = getConfig(member.guild.id);
        let buffer;

        try {
            // Primeiro tentar gerar banner completo com avatar
            buffer = await generateBanner(member, config.welcomeText, true);
            console.log('✅ Banner completo gerado com sucesso');
        } catch (bannerError) {
            console.log(`⚠️ Banner completo falhou (${bannerError.message}), usando versão rápida...`);

            // Fallback para banner rápido (sempre funciona, mais rápido)
            buffer = await generateBannerFast(member, config.welcomeText, true);
            console.log('✅ Banner rápido gerado como fallback');
        }

        const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
        await channel.send({ files: [attachment] });
        console.log(`✅ Welcome enviado com sucesso para ${member.user?.username || member.displayName || 'Unknown'} no canal ${channel.name}`);
    } catch (error) {
        console.error("❌ Erro ao enviar welcome:", error);
        console.error("Stack:", error.stack);
    }
});

// Eventos de Welcome/Leave (SISTEMA AUTOMÁTICO - Categoria Galáxia)
client.on('guildMemberRemove', async (member) => {
    console.log(`👋 EVENTO guildMemberRemove DISPARADO (LEAVE AUTOMÁTICO):`);
    console.log(`   👤 Usuário: ${member.user?.username || member.displayName || 'Unknown'} (${member.user?.id || member.id})`);
    console.log(`   🏠 Servidor: ${member.guild.name} (${member.guild.id})`);
    console.log(`   💡 Sistema: LEAVE (categoria Galáxia)`);

    // 🔍 LOGS DETALHADOS PARA DEBUG (LEAVE)
    console.log(`\n🔍 === DEBUG LEAVE: Propriedades do MEMBER ===`);
    console.log(`Member ID: ${member.id}`);
    console.log(`Member Display Name: ${member.displayName}`);
    console.log(`Member Nickname: ${member.nickname}`);
    console.log(`Member Joined At: ${member.joinedAt}`);
    console.log(`Member Roles: ${member.roles?.cache ? member.roles.cache.map(r => r.name).join(', ') : 'N/A'}`);

    console.log(`\n🔍 === DEBUG LEAVE: Propriedades do USER ===`);
    console.log(`User ID: ${member.user?.id}`);
    console.log(`User Username: ${member.user?.username}`);
    console.log(`User Discriminator: ${member.user?.discriminator}`);
    console.log(`User Global Name: ${member.user?.globalName}`);
    console.log(`User Display Name: ${member.user?.displayName}`);
    console.log(`User Bot: ${member.user?.bot}`);
    console.log(`User System: ${member.user?.system}`);
    console.log(`User Created At: ${member.user?.createdAt}`);

    console.log(`\n🔍 === DEBUG LEAVE: AVATAR INFO ===`);
    let leavePngURL = member.user?.displayAvatarURL?.({ format: 'png', size: 128 });
    if (leavePngURL && leavePngURL.includes('.webp')) {
        leavePngURL = leavePngURL.replace('.webp', '.png');
    }
    console.log(`Avatar URL (PNG): ${leavePngURL}`);
    console.log(`Avatar URL (WEBP): ${member.user?.displayAvatarURL?.({ format: 'webp', size: 128 })}`);
    console.log(`Avatar URL (JPEG): ${member.user?.displayAvatarURL?.({ format: 'jpeg', size: 128 })}`);
    console.log(`Default Avatar URL: ${member.user?.defaultAvatarURL}`);
    console.log(`Avatar Hash: ${member.user?.avatar}`);
    console.log(`=====================================\n`);

    if (!LEAVE_CHANNEL_ID) {
        console.error("❌ LEAVE_CHANNEL_ID não configurado - pulando leave");
        return;
    }
    
    const channel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);
    if (!channel) {
        console.error(`❌ Canal de leave não encontrado. ID: ${LEAVE_CHANNEL_ID}`);
        return;
    }
    
    // Nota: Canais de welcome/leave podem estar em qualquer categoria
    console.log(`📍 Canal leave encontrado: ${channel.name} (Categoria: ${channel.parentId || 'Nenhuma'})`);
    
    // Verificar permissões do bot
    const botPermissions = channel.permissionsFor(member.guild.members.me);
    if (!botPermissions.has('SendMessages')) {
        console.error(`❌ Bot não tem permissão para enviar mensagens no canal ${channel.name}`);
        return;
    }
    if (!botPermissions.has('AttachFiles')) {
        console.error(`❌ Bot não tem permissão para anexar arquivos no canal ${channel.name}`);
        return;
    }

    try {
        const config = getConfig(member.guild.id);
        let buffer;

        try {
            // Primeiro tentar gerar banner completo com avatar
            buffer = await generateBanner(member, config.leaveText, false);
            console.log('✅ Banner completo gerado com sucesso');
        } catch (bannerError) {
            console.log(`⚠️ Banner completo falhou (${bannerError.message}), usando versão rápida...`);

            // Fallback para banner rápido (sempre funciona, mais rápido)
            buffer = await generateBannerFast(member, config.leaveText, false);
            console.log('✅ Banner rápido gerado como fallback');
        }

        const attachment = new AttachmentBuilder(buffer, { name: 'leave.png' });
        await channel.send({ files: [attachment] });
        console.log(`✅ Leave enviado para ${member.user?.username || member.displayName || 'Unknown'}`);
    } catch (error) {
        console.error("❌ Erro ao enviar leave:", error);
    }
});

// Comandos Slash
const commands = [
    new SlashCommandBuilder()
        .setName('config-welcome')
        .setDescription('Configure welcome and leave messages'),
    new SlashCommandBuilder()
        .setName('clear-background')
        .setDescription('Remove o background personalizado e volta ao padrão'),
];

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    } catch (error) {
        console.error(error);
    }
})();

// Função helper para responder interações com tratamento de erro SIMPLIFICADO
// ─────────────── Função segura para comandos rápidos ───────────────
async function safeReply(interaction, options) {
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(options);
        } else {
            await interaction.reply(options);
        }
    } catch (err) {
        console.error("⚠️ Erro em safeReply (ignorado):", err.message);
    }
}

// Handler consolidado para todas as interações
client.on('interactionCreate', async (interaction) => {
    // Handler de comandos slash
    if (interaction.isChatInputCommand()) {
        console.log(`⚡ Comando: ${interaction.commandName} por ${interaction.user.username}`);

        // Verificações básicas
        if (!hasPermission(interaction.member)) {
            await safeReply(interaction, {
                content: '❌ Sem permissão.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (interaction.channel.parentId !== CATEGORY_ID) {
            await safeReply(interaction, {
                content: '❌ Canal incorreto.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        try {
            if (interaction.commandName === 'config-welcome') {
                const row = new ActionRowBuilder()
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

                await safeReply(interaction, {
                    content: '⚙️ **Configuração Welcome/Leave:**',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });

            } else if (interaction.commandName === 'clear-background') {
                const config = getConfig(interaction.guild.id);
                const bgPath = path.join(backgroundsPath, `background_${interaction.guild.id}.png`);

                if (fs.existsSync(bgPath)) {
                    fs.unlinkSync(bgPath);
                }

                config.background = null;
                saveConfig();

                await safeReply(interaction, {
                    content: '✅ Background removido.',
                    flags: MessageFlags.Ephemeral
                });
            }

        } catch (error) {
            console.error(`❌ Erro no comando ${interaction.commandName}:`, error.message);
        }
        return;
    }

    // Handler de botões
    if (interaction.isButton()) {
        console.log(`🔘 Botão: ${interaction.customId} por ${interaction.user.username}`);

        // Verificações básicas
        if (!hasPermission(interaction.member)) {
            await safeReply(interaction, {
                content: '❌ Sem permissão.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (interaction.channel.parentId !== CATEGORY_ID) {
            await safeReply(interaction, {
                content: '❌ Canal incorreto.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Processar cada botão separadamente
        try {
            if (interaction.customId === 'edit_welcome_text') {
                const config = getConfig(interaction.guild.id);
                const modal = new ModalBuilder()
                    .setCustomId('welcome_text_modal')
                    .setTitle('Editar Texto Welcome')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('welcome_text')
                                .setLabel('Texto Welcome')
                                .setStyle(TextInputStyle.Short)
                                .setValue(config.welcomeText)
                                .setRequired(true)
                    ));

                await interaction.showModal(modal);
                console.log('✅ Modal welcome mostrado');

            } else if (interaction.customId === 'edit_leave_text') {
                const config = getConfig(interaction.guild.id);
                const modal = new ModalBuilder()
                    .setCustomId('leave_text_modal')
                    .setTitle('Editar Texto Leave')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('leave_text')
                                .setLabel('Texto Leave')
                                .setStyle(TextInputStyle.Short)
                                .setValue(config.leaveText)
                                .setRequired(true)
                    ));

                await interaction.showModal(modal);
                console.log('✅ Modal leave mostrado');

            } else if (interaction.customId === 'upload_background') {
                await safeReply(interaction, {
                    content: '📸 **Upload de Background:**\n\nEnvie uma imagem PNG ou JPEG (máx 5MB) neste canal.\nO bot detectará automaticamente.',
                    flags: MessageFlags.Ephemeral
                });

            } else if (interaction.customId === 'preview') {
                console.log('🔍 Iniciando preview...');
                console.log(`   Replied: ${interaction.replied}, Deferred: ${interaction.deferred}`);

                // 🔍 LOGS DETALHADOS DO USUÁRIO QUE EXECUTOU O PREVIEW
                console.log(`\n🔍 === DEBUG PREVIEW: INTERACTION ===`);
                console.log(`Interaction User: ${interaction.user?.username} (${interaction.user?.id})`);
                console.log(`Interaction Member: ${interaction.member?.displayName} (${interaction.member?.id})`);

                console.log(`\n🔍 === DEBUG PREVIEW: MEMBER OBJECT ===`);
                console.log(`Member ID: ${interaction.member?.id}`);
                console.log(`Member Display Name: ${interaction.member?.displayName}`);
                console.log(`Member Nickname: ${interaction.member?.nickname}`);
                console.log(`Member User Username: ${interaction.member?.user?.username}`);
                console.log(`Member User Global Name: ${interaction.member?.user?.globalName}`);
                console.log(`Member User Display Name: ${interaction.member?.user?.displayName}`);

                console.log(`\n🔍 === DEBUG PREVIEW: AVATAR INFO ===`);
                let previewPngURL = interaction.member?.user?.displayAvatarURL?.({ format: 'png', size: 128 });
                if (previewPngURL && previewPngURL.includes('.webp')) {
                    previewPngURL = previewPngURL.replace('.webp', '.png');
                }
                console.log(`Avatar URL (PNG): ${previewPngURL}`);
                console.log(`Avatar URL (WEBP): ${interaction.member?.user?.displayAvatarURL?.({ format: 'webp', size: 128 })}`);
                console.log(`Default Avatar URL: ${interaction.member?.user?.defaultAvatarURL}`);
                console.log(`Avatar Hash: ${interaction.member?.user?.avatar}`);
                console.log(`=====================================\n`);

                // Para preview, defer primeiro pois pode demorar
                console.log('🔍 Fazendo deferReply...');
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                console.log('✅ DeferReply feito com sucesso');

                try {
                    const config = getConfig(interaction.guild.id);
                    console.log('🔍 Gerando banner...');

                    // 🔄 TENTAR AVATAR REAL NO PREVIEW
                    let buffer;
                    try {
                        console.log('🎨 Tentando gerar banner com avatar real...');
                        buffer = await generateBanner(interaction.member, config.welcomeText, true);
                        console.log('✅ Preview com avatar real gerado!');
                    } catch (avatarError) {
                        console.log(`⚠️ Avatar real falhou (${avatarError.message}), usando placeholder...`);
                        buffer = await generateBannerFast(interaction.member, config.welcomeText, true);
                        console.log('✅ Preview com placeholder gerado!');
                    }
                    console.log('🔍 Banner gerado, enviando...');
                    const attachment = new AttachmentBuilder(buffer, { name: 'preview.png' });

                    await interaction.editReply({
                        content: '🔍 **Preview:**',
                        files: [attachment]
                    });
                    console.log('✅ Preview enviado');

                } catch (previewError) {
                    console.error('❌ Erro no preview:', previewError);
                    await interaction.editReply({
                        content: '❌ Erro ao gerar preview.'
                    });
                }

            } else if (interaction.customId === 'preview_fast') {
                console.log('🔍 Iniciando preview rápido (sempre placeholder)...');
                console.log(`   Replied: ${interaction.replied}, Deferred: ${interaction.deferred}`);

                // Para preview rápido, defer primeiro
                console.log('🔍 Fazendo deferReply...');
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                console.log('✅ DeferReply feito com sucesso');

                try {
                    const config = getConfig(interaction.guild.id);
                    console.log('🔍 Gerando banner rápido...');
                    const buffer = await generateBannerFast(interaction.member, config.welcomeText, true);
                    console.log('🔍 Banner rápido gerado, enviando...');
                    const attachment = new AttachmentBuilder(buffer, { name: 'preview-fast.png' });

                    await interaction.editReply({
                        content: '⚡ **Preview Rápido (Placeholder):**',
                        files: [attachment]
                    });
                    console.log('✅ Preview rápido enviado');

                } catch (previewError) {
                    console.error('❌ Erro no preview rápido:', previewError);
                    await interaction.editReply({
                        content: '❌ Erro ao gerar preview rápido.'
                    });
                }
            }

        } catch (error) {
            console.error(`❌ Erro no botão ${interaction.customId}:`, error.message);
        }
        return;
    }

    // Handler de modais
    if (interaction.isModalSubmit()) {
        try {
            if (interaction.customId === 'welcome_text_modal') {
                const config = getConfig(interaction.guild.id);
                config.welcomeText = interaction.fields.getTextInputValue('welcome_text');
                saveConfig();
                await safeReply(interaction, {
                    content: '✅ Texto welcome atualizado!',
                    flags: MessageFlags.Ephemeral
                });

            } else if (interaction.customId === 'leave_text_modal') {
                const config = getConfig(interaction.guild.id);
                config.leaveText = interaction.fields.getTextInputValue('leave_text');
                saveConfig();
                await safeReply(interaction, {
                    content: '✅ Texto leave atualizado!',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (error) {
            console.error('❌ Erro no modal:', error.message);
        }
        return;
    }

    // Handler de select menus (se necessário no futuro)
    if (interaction.isStringSelectMenu()) {
        // Por enquanto vazio, mas estrutura mantida para futuras expansões
        return;
    }
});

// Mensagens para configuração (upload de backgrounds nos canais de entrada/saída)
client.on('messageCreate', async (message) => {
    console.log(`📝 NOVA MENSAGEM DETECTADA (CONFIGURAÇÃO):`);
    console.log(`   👤 Usuário: ${message.author.username} (${message.author.id})`);
    console.log(`   📍 Canal: ${message.channel.name} (${message.channel.id})`);
    console.log(`   📁 Parent ID: ${message.channel.parentId}`);
    console.log(`   🎯 Categoria esperada: ${CATEGORY_ID}`);
    console.log(`   📎 Anexos: ${message.attachments.size}`);
    
    if (message.author.bot) {
        console.log('   🤖 É bot - IGNORANDO');
        return;
    }
    
    if (!message.guild) {
        console.log('   💬 É DM - IGNORANDO');
        return;
    }
    
    // Verificar se está na categoria Galáxia E é um dos canais de entrada/saída
    const isWelcomeChannel = message.channel.id === WELCOME_CHANNEL_ID;
    const isLeaveChannel = message.channel.id === LEAVE_CHANNEL_ID;
    
    if (message.channel.parentId !== CATEGORY_ID || (!isWelcomeChannel && !isLeaveChannel)) {
        console.log(`   📁 Canal não é Portal de Entrada/Saída na categoria Galáxia - IGNORANDO`);
        return;
    }
    
    console.log(`   📁 Canal válido para configuração - CONTINUANDO`);
    
    const hasPerm = hasPermission(message.member);
    console.log(`   🔐 Permissão: ${hasPerm ? 'SIM' : 'NÃO'}`);
    
    if (!hasPerm) {
        console.log('   🚫 Sem permissão - IGNORANDO');
        return;
    }

    if (message.attachments.size === 0) {
        console.log('   📝 Sem anexos - IGNORANDO');
        return;
    }
    
    console.log('   🖼️ INICIANDO PROCESSAMENTO DO ANEXO...');
    
    // Processar cada anexo
    for (const attachment of message.attachments.values()) {
        console.log(`📎 Processando anexo: ${attachment.name} (${attachment.contentType})`);
        
        // Verificar tamanho primeiro (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (attachment.size > maxSize) {
            await message.reply('❌ A imagem deve ter no máximo 5MB!');
            continue;
        }

        const filePath = path.join(backgroundsPath, `background_${message.guild.id}.png`);
        
        try {
            console.log(`📥 Baixando arquivo: ${attachment.url} (${attachment.size} bytes)`);
            
            // Download melhorado
            const https = require('https');
            const url = require('url');
            
            const downloadImage = () => {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout de 60 segundos'));
                    }, 60000);
                    
                    const parsedUrl = url.parse(attachment.url);
                    const options = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || 443,
                        path: parsedUrl.path,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'image/*,*/*;q=0.8'
                        },
                        timeout: 30000
                    };
                    
                    const req = https.request(options, (res) => {
                        if (res.statusCode !== 200) {
                            clearTimeout(timeout);
                            return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        }
                        
                        const chunks = [];
                        let totalLength = 0;
                        
                        res.on('data', (chunk) => {
                            chunks.push(chunk);
                            totalLength += chunk.length;
                            if (totalLength % 100000 === 0) { // Log a cada 100KB
                                console.log(`📥 Baixado: ${totalLength}/${attachment.size} bytes`);
                            }
                        });
                        
                        res.on('end', () => {
                            clearTimeout(timeout);
                            const buffer = Buffer.concat(chunks);
                            console.log(`✅ Download concluído: ${buffer.length} bytes`);
                            resolve(buffer);
                        });
                        
                        res.on('error', (err) => {
                            clearTimeout(timeout);
                            reject(err);
                        });
                    });
                    
                    req.on('error', (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                    
                    req.on('timeout', () => {
                        req.destroy();
                        clearTimeout(timeout);
                        reject(new Error('Request timeout'));
                    });
                    
                    req.end();
                });
            };

            const imageBuffer = await downloadImage();
            
            // Detectar tipo real da imagem
            const realImageType = getImageTypeFromBuffer(imageBuffer);
            console.log(`� Tipo detectado pelo Discord: ${attachment.contentType}`);
            console.log(`🔍 Tipo real da imagem: ${realImageType}`);
            
            // Verificar se é formato suportado
            if (realImageType === 'image/webp') {
                await message.reply('❌ **WebP detectado!** \n\nO Discord às vezes converte PNGs automaticamente. Tente:\n• Salvar a imagem como PNG novamente\n• Usar um editor de imagem para converter\n• Fazer upload direto do arquivo original');
                continue;
            }
            
            if (realImageType === 'image/gif') {
                await message.reply('❌ **GIF não suportado!** \n\nUse PNG ou JPEG estático.');
                continue;
            }
            
            if (!['image/png', 'image/jpeg'].includes(realImageType)) {
                await message.reply(`❌ **Formato não suportado!** \n\nTipo detectado: \`${realImageType}\`\nUse apenas PNG ou JPEG.`);
                continue;
            }
            
            // Tentar carregar a imagem para validar
            try {
                console.log('🖼️ Validando imagem com canvas...');
                await loadImage(imageBuffer);
                console.log('✅ Imagem validada com sucesso');
            } catch (imageError) {
                console.error('❌ Erro na validação da imagem:', imageError.message);
                
                // Verificar se é erro de WebP
                if (imageError.message.includes('webp') || imageError.message.includes('WebP')) {
                    await message.reply('❌ **WebP não suportado pelo canvas!** \n\nConverta para PNG ou JPEG antes de fazer upload.');
                    continue;
                }
                
                await message.reply(`❌ **Arquivo corrompido ou inválido!** \n\nErro: \`${imageError.message}\`\n\nTente:\n• Reabrir e salvar a imagem novamente\n• Converter para PNG\n• Usar outra imagem`);
                continue;
            }

            // Salvar arquivo
            console.log(`💾 Salvando background em: ${filePath}`);
            fs.writeFileSync(filePath, imageBuffer);
            
            // Atualizar config
            const config = getConfig(message.guild.id);
            config.background = filePath;
            saveConfig();
            
            console.log(`📊 Config atualizado para guild ${message.guild.id}`);
            
            // Verificar se arquivo foi salvo
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`✅ Arquivo salvo: ${stats.size} bytes`);
                
                await message.reply(`✅ **Background atualizado com sucesso!** \n\n📊 **Detalhes:**\n• Tipo: ${realImageType}\n• Tamanho: ${Math.round(stats.size / 1024)}KB\n• Resolução detectada automaticamente\n\n🔍 Use \`/config-welcome\` → Preview para ver o resultado!`);
            } else {
                console.log('❌ ERRO: Arquivo não foi criado!');
                await message.reply('❌ Erro interno ao salvar arquivo. Contate o desenvolvedor.');
            }
            
        } catch (error) {
            console.error('❌ Erro ao processar background:', error);
            
            let errorMessage = '❌ Erro ao processar o background.';
            
            if (error.message.includes('Timeout') || error.message.includes('timeout')) {
                errorMessage = '❌ **Timeout no download!** \n\nTente:\n• Uma imagem menor\n• Verificar sua conexão\n• Tentar novamente em alguns minutos';
            } else if (error.message.includes('HTTP')) {
                errorMessage = '❌ **Erro no download!** \n\nO link pode ter expirado. Faça upload novamente.';
            }
            
            await message.reply(errorMessage);
        }
    }
});

// ADICIONAR HANDLER DE ERRO GLOBAL (adicione no final do arquivo, antes do login)
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // Não fazer process.exit() para manter o bot rodando
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    // Não fazer process.exit() para manter o bot rodando
});

const express = require('express');
const app = express();
const PORT =  8081; // Alterei para 8081

// Servidor Express para healthcheck da Railway
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        bot: 'Welcome Bot',
        uptime: process.uptime(),
        guilds: client.guilds.cache.size,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor HTTP rodando na porta ${PORT} para healthcheck`);
});

// Login
client.login(TOKEN);

// Evento clientReady
client.on('clientReady', () => {
    console.log(`🤖 Bot ${client.user.tag} está online!`);
    console.log(`📊 Servidores conectados: ${client.guilds.cache.size}`);
    console.log(`🎯 Intents ativos: ${client.options.intents}`);
    
    console.log('\n� Lista de servidores:');
    client.guilds.cache.forEach(guild => {
        console.log(`   • ${guild.name} (${guild.id}) - ${guild.memberCount} membros`);
    });
    
    // Verificar servidor específico
    const targetGuild = client.guilds.cache.get('1408499417945866430');
    if (targetGuild) {
        console.log(`\n✅ Conectado ao servidor alvo: ${targetGuild.name}`);
        console.log(`👥 Membros: ${targetGuild.memberCount}`);
        
        // Verificar categoria Galáxia
        const galaxiaCategory = targetGuild.channels.cache.get(CATEGORY_ID);
        console.log(`🌌 Categoria Galáxia: ${galaxiaCategory ? galaxiaCategory.name : 'NÃO ENCONTRADA'}`);
    }
});
