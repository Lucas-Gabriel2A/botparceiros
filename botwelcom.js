// Polyfill para ReadableStream (compatibilidade com Node.js < 16.5.0)
const { ReadableStream } = require('web-streams-polyfill');
global.ReadableStream = ReadableStream;

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, SelectMenuBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs-extra');
const path = require('path');

// Configurações
const TOKEN = process.env.DISCORD_TOKENS || process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// IDs fixos
const OWNER_ROLE_ID = process.env.OWNER_ROLE_ID;
const SEMI_OWNER_ROLE_ID = process.env.SEMI_OWNER_ROLE_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const LEAVE_CHANNEL_ID = process.env.LEAVE_CHANNEL_ID;

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
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

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

    return canvas.toBuffer();
}

// Eventos
client.on('guildMemberAdd', async (member) => {
    console.log(`Novo membro: ${member.user.username} no servidor ${member.guild.id}`);
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel || channel.parentId !== CATEGORY_ID) {
        console.log(`Canal welcome não encontrado ou não está na categoria correta. Canal: ${channel ? channel.id : 'null'}, Parent: ${channel ? channel.parentId : 'null'}`);
        return;
    }

    const config = getConfig(member.guild.id);
    const buffer = await generateBanner(member, config.welcomeText, true);
    const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
    await channel.send({ files: [attachment] });
});

client.on('guildMemberRemove', async (member) => {
    const channel = member.guild.channels.cache.get(LEAVE_CHANNEL_ID);
    if (!channel || channel.parentId !== CATEGORY_ID) return;

    const config = getConfig(member.guild.id);
    const buffer = await generateBanner(member, config.leaveText, false);
    const attachment = new AttachmentBuilder(buffer, { name: 'leave.png' });
    await channel.send({ files: [attachment] });
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

// Interação
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'config-welcome') {
        if (!hasPermission(interaction.member)) {
            return interaction.reply({ content: 'Você não tem permissão para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        // Verificar se está na categoria correta
        if (interaction.channel.parentId !== CATEGORY_ID) {
            return interaction.reply({ content: 'Este comando só pode ser usado na categoria específica.', flags: MessageFlags.Ephemeral });
        }

        const config = getConfig(interaction.guild.id);
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_welcome_text')
                    .setLabel('Editar Texto Welcome')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('edit_leave_text')
                    .setLabel('Editar Texto Leave')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('upload_background')
                    .setLabel('Upload Background')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('preview')
                    .setLabel('Preview')
                    .setStyle(ButtonStyle.Success),
            );

        await interaction.reply({ content: 'Selecione uma opção:', components: [row], flags: MessageFlags.Ephemeral });
    }
});

// Botões
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (!hasPermission(interaction.member)) return;

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
                        .setRequired(true),
                ),
            );

        await interaction.showModal(modal);
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
                        .setRequired(true),
                ),
            );

        await interaction.showModal(modal);
    } else if (interaction.customId === 'upload_background') {
        await interaction.reply({ 
            content: '📸 **Para fazer upload do background:**\n\nEnvie uma mensagem separada neste canal com a imagem anexada (PNG ou JPG, máximo 5MB).\n\nO bot irá detectar automaticamente e salvar como background.', 
            flags: MessageFlags.Ephemeral 
        });
    } else if (interaction.customId === 'preview') {
        const config = getConfig(interaction.guild.id);
        const buffer = await generateBanner(interaction.member, config.welcomeText, true);
        const attachment = new AttachmentBuilder(buffer, { name: 'preview.png' });
        await interaction.reply({ files: [attachment], flags: MessageFlags.Ephemeral });
    }
});

// Modais
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'welcome_text_modal') {
        const config = getConfig(interaction.guild.id);
        config.welcomeText = interaction.fields.getTextInputValue('welcome_text');
        saveConfig();
        await interaction.reply({ content: 'Texto welcome atualizado!', flags: MessageFlags.Ephemeral });
    } else if (interaction.customId === 'leave_text_modal') {
        const config = getConfig(interaction.guild.id);
        config.leaveText = interaction.fields.getTextInputValue('leave_text');
        saveConfig();
        await interaction.reply({ content: 'Texto leave atualizado!', flags: MessageFlags.Ephemeral });
    }
});

// Select Menus
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (!hasPermission(interaction.member)) return;

    // Removido: não há mais select menus configuráveis
});

// Mensagens para upload
client.on('messageCreate', async (message) => {
    console.log(`� NOVA MENSAGEM DETECTADA:`);
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
    
    // Verificar se está na categoria correta
    if (message.channel.parentId !== CATEGORY_ID) {
        console.log(`   📁 Canal NÃO está na categoria correta (${message.channel.parentId} !== ${CATEGORY_ID}) - IGNORANDO`);
        return;
    }
    
    console.log(`   📁 Canal está na categoria correta - CONTINUANDO`);
    
    console.log(`   🔐 Verificando permissões para ${message.member.displayName}...`);
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
        // Verificar tamanho (5MB = 5 * 1024 * 1024 bytes)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (attachment.size > maxSize) {
            await message.reply('❌ A imagem deve ter no máximo 5MB!');
            continue;
        }

        const filePath = path.join(backgroundsPath, `background_${message.guild.id}.png`);
        try {
            console.log(`Baixando background: ${attachment.url} (${attachment.size} bytes)`);
            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(buffer);

            // Verificar se é uma imagem válida tentando carregar
            try {
                await loadImage(imageBuffer);
                console.log('✅ Imagem validada com sucesso');
            } catch (imageError) {
                console.error('❌ Imagem inválida:', imageError.message);
                
                // Dar feedback específico sobre o tipo de imagem
                const contentType = attachment.contentType.toLowerCase();
                if (contentType.includes('webp')) {
                    return await message.reply('❌ WebP não é suportado. Converta para PNG, JPG ou JPEG.');
                } else if (contentType.includes('gif')) {
                    return await message.reply('❌ GIF animado não é suportado. Use PNG ou JPG.');
                } else {
                    return await message.reply(`❌ Formato não suportado (${attachment.contentType}). Use PNG, JPG ou JPEG.`);
                }
            }

            fs.writeFileSync(filePath, imageBuffer);
            const config = getConfig(message.guild.id);
            config.background = filePath;
            saveConfig();
            console.log(`Config atualizado para guild ${message.guild.id}:`, config);
            await message.reply('✅ Background atualizado com sucesso!');
            console.log(`Background salvo em: ${filePath}`);
            
            // Verificar se arquivo foi criado
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.log(`Arquivo criado: ${stats.size} bytes`);
            } else {
                console.log('ERRO: Arquivo não foi criado!');
            }
        } catch (error) {
            console.error('Erro ao salvar background:', error);
            await message.reply('❌ Erro ao salvar o background. Tente novamente.');
        }
    }
});

// Login
client.login(TOKEN);

// Evento ready
client.on('ready', () => {
    console.log(`🤖 Bot ${client.user.tag} está online!`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log(`🎯 Intents: ${client.options.intents}`);
    console.log(`🔧 Comandos registrados: ${client.application.commands.cache.size}`);
    
    // Verificar servidor específico
    const targetGuild = client.guilds.cache.get('1408499417945866430');
    if (targetGuild) {
        console.log(`✅ Conectado ao servidor alvo: ${targetGuild.name}`);
        console.log(`👥 Membros: ${targetGuild.memberCount}`);
        
        // Verificar canais
        const welcomeChannel = targetGuild.channels.cache.get(WELCOME_CHANNEL_ID);
        const leaveChannel = targetGuild.channels.cache.get(LEAVE_CHANNEL_ID);
        const category = targetGuild.channels.cache.get(CATEGORY_ID);
        
        console.log(`📺 Canal welcome: ${welcomeChannel ? welcomeChannel.name : 'NÃO ENCONTRADO'}`);
        console.log(`👋 Canal leave: ${leaveChannel ? leaveChannel.name : 'NÃO ENCONTRADO'}`);
        console.log(`📁 Categoria: ${category ? category.name : 'NÃO ENCONTRADA'}`);
        
        // Verificar roles
        const ownerRole = targetGuild.roles.cache.get(OWNER_ROLE_ID);
        const semiOwnerRole = targetGuild.roles.cache.get(SEMI_OWNER_ROLE_ID);
        
        console.log(`👑 Role dono: ${ownerRole ? ownerRole.name : 'NÃO ENCONTRADO'}`);
        console.log(`👨‍💼 Role semi-dono: ${semiOwnerRole ? semiOwnerRole.name : 'NÃO ENCONTRADO'}`);
    } else {
        console.log(`❌ NÃO CONECTADO ao servidor alvo (ID: 1408499417945866430)`);
        console.log('Servidores disponíveis:', client.guilds.cache.map(g => `${g.name} (${g.id})`).join(', '));
    }
});