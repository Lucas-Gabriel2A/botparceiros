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

// Função para gerar banner
async function generateBanner(member, text, isWelcome = true) {
    const config = getConfig(member.guild.id);
    console.log(`Gerando banner para guild ${member.guild.id}, config:`, config);
    
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
    if (config.background && fs.existsSync(config.background)) {
        try {
            console.log(`Carregando background customizado: ${config.background}`);
            backgroundImage = await loadImage(config.background);
            console.log('Background carregado com sucesso');
        } catch (error) {
            console.log('Erro ao carregar background customizado:', error.message);
            // Remover background inválido
            config.background = null;
            saveConfig();
        }
    } else {
        console.log('Usando fundo padrão - background não encontrado ou não configurado');
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
        // Elementos simples: personagem fofo, etc. (simplificado)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(350, 250, 100, 100); // Placeholder para personagem
    } else {
        ctx.drawImage(backgroundImage, 0, 0, 800, 600);
    }

    // Avatar circular
    try {
        const avatarURL = member.user.displayAvatarURL({ format: 'png', size: 128, dynamic: false });
        console.log(`Carregando avatar: ${avatarURL}`);
        const avatar = await loadImage(avatarURL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(400, 150, 64, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 336, 86, 128, 128);
        ctx.restore();
    } catch (error) {
        console.log('Erro ao carregar avatar, usando placeholder épico:', error.message);
        // Desenhar placeholder épico se avatar falhar
        ctx.save();

        // Gradiente circular para o placeholder
        const placeholderGradient = ctx.createRadialGradient(400, 150, 0, 400, 150, 64);
        placeholderGradient.addColorStop(0, '#ffdd44');
        placeholderGradient.addColorStop(0.7, '#ffaa00');
        placeholderGradient.addColorStop(1, '#cc6600');

        ctx.fillStyle = placeholderGradient;
        ctx.beginPath();
        ctx.arc(400, 150, 64, 0, Math.PI * 2);
        ctx.fill();

        // Contorno dourado
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Letra do usuário com sombra e brilho
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Sombra da letra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(member.user.username.charAt(0).toUpperCase(), 402, 152);

        // Letra principal
        ctx.fillStyle = '#ffffff';
        ctx.fillText(member.user.username.charAt(0).toUpperCase(), 400, 150);

        ctx.restore();
    }

    // Texto principal com fonte épica
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayText = text.replace('[username]', member.user.username);

    // Renderizar texto principal com quebra automática
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
    console.log(`✅ Banner gerado com sucesso. Tamanho: ${buffer.length} bytes`);
    return buffer;
}

// Eventos de Welcome/Leave (SISTEMA AUTOMÁTICO - Categoria Galáxia)
client.on('guildMemberAdd', async (member) => {
    console.log(`🔥 EVENTO guildMemberAdd DISPARADO (WELCOME AUTOMÁTICO):`);
    console.log(`   👤 Usuário: ${member.user.username} (${member.user.id})`);
    console.log(`   🏠 Servidor: ${member.guild.name} (${member.guild.id})`);
    console.log(`   💡 Sistema: WELCOME (categoria Galáxia)`);
    
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
        console.log(`🎨 Gerando banner para ${member.user.username}...`);
        const config = getConfig(member.guild.id);
        const buffer = await generateBanner(member, config.welcomeText, true);
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
        await channel.send({ files: [attachment] });
        console.log(`✅ Welcome enviado com sucesso para ${member.user.username} no canal ${channel.name}`);
    } catch (error) {
        console.error("❌ Erro ao enviar welcome:", error);
        console.error("Stack:", error.stack);
    }
});

// Eventos de Welcome/Leave (SISTEMA AUTOMÁTICO - Categoria Galáxia)
client.on('guildMemberRemove', async (member) => {
    console.log(`👋 EVENTO guildMemberRemove DISPARADO (LEAVE AUTOMÁTICO):`);
    console.log(`   👤 Usuário: ${member.user.username} (${member.user.id})`);
    console.log(`   🏠 Servidor: ${member.guild.name} (${member.guild.id})`);
    console.log(`   💡 Sistema: LEAVE (categoria Galáxia)`);
    
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
        const buffer = await generateBanner(member, config.leaveText, false);
        const attachment = new AttachmentBuilder(buffer, { name: 'leave.png' });
        await channel.send({ files: [attachment] });
        console.log(`✅ Leave enviado para ${member.user.username}`);
    } catch (error) {
        console.error("❌ Erro ao enviar leave:", error);
    }
});

// Comandos Slash
const commands = [
    new SlashCommandBuilder()
        .setName('config-welcome')
        .setDescription('Configure welcome and leave messages'),
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

// Função helper para responder interações com tratamento de erro CORRIGIDA
async function safeReply(interaction, options) {
    try {
        // Verificar se a interação já foi respondida ou está expirada
        if (interaction.replied) {
            console.log('Interação já foi respondida, usando followUp...');
            return await interaction.followUp(options);
        }
        
        if (interaction.deferred) {
            console.log('Interação foi deferida, usando editReply...');
            return await interaction.editReply(options);
        }
        
        // Verificar se a interação não expirou (3 segundos de margem)
        const now = Date.now();
        const interactionTime = interaction.createdTimestamp;
        const timeElapsed = now - interactionTime;
        
        if (timeElapsed > 2700000) { // 45 minutos em ms (margem de segurança)
            console.log(`Interação expirada (${timeElapsed}ms), não respondendo`);
            return null;
        }
        
        console.log('Respondendo interação normalmente...');
        return await interaction.reply(options);
        
    } catch (error) {
        if (error.code === 10062) {
            console.log('Interação expirou durante a resposta, ignorando...');
            return null;
        }
        if (error.code === 40060) {
            console.log('Interação já foi reconhecida, tentando followUp...');
            try {
                return await interaction.followUp(options);
            } catch (followUpError) {
                console.log('Erro no followUp também, ignorando...', followUpError.message);
                return null;
            }
        }
        console.error('Erro não tratado em safeReply:', error);
        throw error;
    }
}

// COMANDO SLASH CORRIGIDO - Substitua o handler do comando /config-welcome
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config-welcome') {
        console.log(`⚡ Comando /config-welcome usado por ${interaction.user.username}`);
        
        // Verificar permissões
        if (!hasPermission(interaction.member)) {
            return await safeReply(interaction, { 
                content: '❌ Você não tem permissão para usar este comando.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Verificar se está na categoria correta
        if (interaction.channel.parentId !== CATEGORY_ID) {
            return await safeReply(interaction, { 
                content: '❌ Este comando só pode ser usado na categoria específica.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        try {
            const config = getConfig(interaction.guild.id);
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('edit_welcome_text')
                        .setLabel('Editar Texto Welcome')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝'),
                    new ButtonBuilder()
                        .setCustomId('edit_leave_text')
                        .setLabel('Editar Texto Leave')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👋'),
                    new ButtonBuilder()
                        .setCustomId('upload_background')
                        .setLabel('Upload Background')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📸'),
                    new ButtonBuilder()
                        .setCustomId('preview')
                        .setLabel('Preview')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔍'),
                );

            await safeReply(interaction, { 
                content: '⚙️ **Configuração de Welcome/Leave**\n\nSelecione uma opção abaixo:', 
                components: [row], 
                flags: MessageFlags.Ephemeral 
            });
            
            console.log('✅ Menu de configuração enviado');
            
        } catch (error) {
            console.error('❌ Erro no comando config-welcome:', error);
            await safeReply(interaction, { 
                content: '❌ Erro ao exibir menu de configuração.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
});

// HANDLER DE BOTÕES CORRIGIDO - Substitua o handler de botões existente
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    console.log(`🔘 Botão pressionado: ${interaction.customId} por ${interaction.user.username}`);

    // Verificar permissões
    if (!hasPermission(interaction.member)) {
        console.log('❌ Usuário sem permissão');
        return await safeReply(interaction, { 
            content: '❌ Você não tem permissão para usar este comando.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    // Verificar se está na categoria correta
    if (interaction.channel.parentId !== CATEGORY_ID) {
        console.log('❌ Canal incorreto');
        return await safeReply(interaction, { 
            content: '❌ Este comando só pode ser usado na categoria específica.', 
            flags: MessageFlags.Ephemeral 
        });
    }

    try {
        if (interaction.customId === 'edit_welcome_text') {
            console.log('📝 Abrindo modal de welcome text...');
            
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
                            .setRequired(true),
                ),
            );

            await interaction.showModal(modal);
            console.log('✅ Modal de welcome exibido');
            
        } else if (interaction.customId === 'edit_leave_text') {
            console.log('📝 Abrindo modal de leave text...');
            
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
                            .setRequired(true),
                ),
            );

            await interaction.showModal(modal);
            console.log('✅ Modal de leave exibido');
            
        } else if (interaction.customId === 'upload_background') {
            console.log('📸 Exibindo instruções de upload...');
            
            await safeReply(interaction, { 
                content: '📸 **Para fazer upload do background:**\n\nEnvie uma mensagem separada neste canal com a imagem anexada (PNG ou JPG, máximo 5MB).\n\nO bot irá detectar automaticamente e salvar como background.\n\n✨ **Dicas:**\n• Use imagens em alta resolução (recomendado: 800x600 ou maior)\n• Formatos aceitos: PNG, JPG, JPEG\n• Evite GIFs animados ou WebP', 
                flags: MessageFlags.Ephemeral 
            });
            console.log('✅ Instruções de upload enviadas');
            
        } else if (interaction.customId === 'preview') {
            console.log('🔍 Gerando preview...');
            
            // Defer a resposta para ter mais tempo
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            
            try {
                const config = getConfig(interaction.guild.id);
                console.log('📊 Config atual:', config);
                
                const buffer = await generateBanner(interaction.member, config.welcomeText, true);
                const attachment = new AttachmentBuilder(buffer, { name: 'preview.png' });
                
                await interaction.editReply({ 
                    content: '🔍 **Preview do banner atual:**', 
                    files: [attachment] 
                });
                console.log('✅ Preview enviado com sucesso');
                
            } catch (previewError) {
                console.error('❌ Erro ao gerar preview:', previewError);
                await interaction.editReply({ 
                    content: '❌ Erro ao gerar preview. Verifique os logs para mais detalhes.' 
                });
            }
        }
        
    } catch (error) {
        console.error(`❌ Erro no handler de botão ${interaction.customId}:`, error);
        
        // Tentar responder com erro se ainda não respondeu
        if (!interaction.replied && !interaction.deferred) {
            try {
                await safeReply(interaction, { 
                    content: '❌ Ocorreu um erro interno. Tente novamente.', 
                    flags: MessageFlags.Ephemeral 
                });
            } catch (replyError) {
                console.error('❌ Erro ao enviar mensagem de erro:', replyError);
            }
        }
    }
});// Modais
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'welcome_text_modal') {
        const config = getConfig(interaction.guild.id);
        config.welcomeText = interaction.fields.getTextInputValue('welcome_text');
        saveConfig();
        await safeReply(interaction, { content: 'Texto welcome atualizado!', flags: MessageFlags.Ephemeral });
    } else if (interaction.customId === 'leave_text_modal') {
        const config = getConfig(interaction.guild.id);
        config.leaveText = interaction.fields.getTextInputValue('leave_text');
        saveConfig();
        await safeReply(interaction, { content: 'Texto leave atualizado!', flags: MessageFlags.Ephemeral });
    }
});

// Select Menus
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (!hasPermission(interaction.member)) return;

    // Removido: não há mais select menus configuráveis
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
    
    console.log(`   🔐 Verificando permissões do USUÁRIO para ${message.member.displayName}...`);
    console.log(`   💡 Sistema: CONFIGURAÇÃO (upload de backgrounds)`);
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
    // Processar cada anexo (pode haver múltiplos)
    for (const attachment of message.attachments.values()) {
        // Verificar se é imagem
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
            await message.reply('❌ Apenas imagens são aceitas como background!');
            continue;
        }

        // Verificar formato suportado
        const supportedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!supportedFormats.includes(attachment.contentType.toLowerCase())) {
            await message.reply(`❌ Formato não suportado (${attachment.contentType}). Use PNG ou JPEG.`);
            continue;
        }

        // Verificar tamanho (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (attachment.size > maxSize) {
            await message.reply('❌ A imagem deve ter no máximo 5MB!');
            continue;
        }

        const filePath = path.join(backgroundsPath, `background_${message.guild.id}.png`);
        
        try {
            console.log(`Baixando background: ${attachment.url} (${attachment.size} bytes)`);
            
            // MÉTODO HTTPS: Substitui fetch problemático
            const downloadWithHttps = () => {
                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Timeout de 60 segundos'));
                    }, 60000); // 60 segundos
                    
                    const parsedUrl = url.parse(attachment.url);
                    const options = {
                        hostname: parsedUrl.hostname,
                        port: parsedUrl.port || 443,
                        path: parsedUrl.path,
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'image/*,*/*;q=0.8',
                            'Accept-Encoding': 'identity'
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
                            console.log(`📥 Baixado: ${totalLength}/${attachment.size} bytes (${Math.round(totalLength/attachment.size*100)}%)`);
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

            console.log('📥 Iniciando download com método HTTPS...');
            const imageBuffer = await downloadWithHttps();
            
            // Verificar se é uma imagem válida tentando carregar
            try {
                await loadImage(imageBuffer);
                console.log('✅ Imagem validada com sucesso');
            } catch (imageError) {
                console.error('❌ Imagem inválida:', imageError.message);
                await message.reply('❌ Arquivo corrompido ou formato inválido. Tente novamente.');
                continue;
            }

            // Salvar arquivo
            fs.writeFileSync(filePath, imageBuffer);
            
            // Atualizar config
            const config = getConfig(message.guild.id);
            config.background = filePath;
            saveConfig();
            
            console.log(`Config atualizado para guild ${message.guild.id}:`, config);
            await message.reply('✅ Background atualizado com sucesso!');
            console.log(`Background salvo em: ${filePath}`);
            
            // Verificar se arquivo foi criado
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`✅ Arquivo criado: ${stats.size} bytes`);
            } else {
                console.log('❌ ERRO: Arquivo não foi criado!');
            }
            
        } catch (error) {
            console.error('❌ Erro ao salvar background:', error);
            
            let errorMessage = '❌ Erro ao salvar o background. Tente novamente.';
            
            if (error.message.includes('Timeout') || error.message.includes('timeout')) {
                errorMessage = '❌ Timeout: Download demorou muito. Tente uma imagem menor ou verifique sua conexão.';
                console.error('⏰ Timeout no download da imagem');
            } else if (error.message.includes('HTTP')) {
                errorMessage = '❌ Erro no download da imagem. Verifique se o arquivo ainda existe.';
                console.error('🌐 Erro HTTP no download:', error.message);
            } else if (error.message.includes('loadImage')) {
                errorMessage = '❌ Formato de imagem não suportado. Use PNG ou JPEG válidos.';
                console.error('🖼️ Erro na validação da imagem:', error.message);
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

// Login
client.login(TOKEN);

// Evento ready
client.on('ready', () => {
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
        
        // Verificar canais
        const welcomeChannel = targetGuild.channels.cache.get(WELCOME_CHANNEL_ID);
        const leaveChannel = targetGuild.channels.cache.get(LEAVE_CHANNEL_ID);
        
        console.log(`📺 Portal de Entrada: ${welcomeChannel ? welcomeChannel.name : 'NÃO ENCONTRADO'}`);
        console.log(`👋 Portal de Saída: ${leaveChannel ? leaveChannel.name : 'NÃO ENCONTRADO'}`);
        
        // Verificar roles
        const ownerRole = targetGuild.roles.cache.get(OWNER_ROLE_ID);
        const semiOwnerRole = targetGuild.roles.cache.get(SEMI_OWNER_ROLE_ID);
        
        console.log(`👑 Role dono: ${ownerRole ? ownerRole.name : 'NÃO ENCONTRADO'}`);
        console.log(`👨‍💼 Role semi-dono: ${semiOwnerRole ? semiOwnerRole.name : 'NÃO ENCONTRADO'}`);
    } else {
        console.log(`\n❌ NÃO CONECTADO ao servidor alvo (ID: 1408499417945866430)`);
        console.log('Servidores disponíveis:', client.guilds.cache.map(g => `${g.name} (${g.id})`).join(', '));
    }
});