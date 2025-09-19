// // Teste para verificar informações do usuário em interações
// const { Client, GatewayIntentBits } = require('discord.js');
// require('dotenv').config();

// const client = new Client({
//     intents: [
//         GatewayIntentBits.Guilds,
//         GatewayIntentBits.GuildMembers,
//         GatewayIntentBits.GuildMessages,
//         GatewayIntentBits.MessageContent,
//     ],
// });

// client.once('ready', () => {
//     console.log('🤖 Bot de teste conectado!');
//     console.log('💡 Use o comando /test-preview no Discord para testar');
// });

// client.on('interactionCreate', async (interaction) => {
//     if (!interaction.isChatInputCommand()) return;

//     if (interaction.commandName === 'test-preview') {
//         console.log('\n🧪 === TESTE DE INTERACTION ===');
//         console.log(`Comando executado por: ${interaction.user.username}`);
//         console.log(`ID do usuário: ${interaction.user.id}`);

//         console.log('\n👤 === INTERACTION.USER ===');
//         console.log(`Username: ${interaction.user.username}`);
//         console.log(`Global Name: ${interaction.user.globalName}`);
//         console.log(`Display Name: ${interaction.user.displayName}`);
//         console.log(`ID: ${interaction.user.id}`);
//         console.log(`Bot: ${interaction.user.bot}`);
//         console.log(`Avatar URL: ${interaction.user.displayAvatarURL({ format: 'png', size: 128 })}`);

//         console.log('\n👥 === INTERACTION.MEMBER ===');
//         console.log(`Display Name: ${interaction.member?.displayName}`);
//         console.log(`Nickname: ${interaction.member?.nickname}`);
//         console.log(`ID: ${interaction.member?.id}`);
//         console.log(`Roles: ${interaction.member?.roles?.cache?.map(r => r.name).join(', ')}`);

//         console.log('\n👤 === INTERACTION.MEMBER.USER ===');
//         console.log(`Username: ${interaction.member?.user?.username}`);
//         console.log(`Global Name: ${interaction.member?.user?.globalName}`);
//         console.log(`Display Name: ${interaction.member?.user?.displayName}`);
//         console.log(`ID: ${interaction.member?.user?.id}`);
//         console.log(`Avatar URL: ${interaction.member?.user?.displayAvatarURL?.({ format: 'png', size: 128 })}`);

//         await interaction.reply({
//             content: '✅ Teste concluído! Verifique o console do bot.',
//             ephemeral: true
//         });
//     }
// });

// // Registrar comando de teste
// const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// const commands = [
//     new SlashCommandBuilder()
//         .setName('test-preview')
//         .setDescription('Testa como o bot vê as informações do usuário')
// ];

// const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKENS);

// (async () => {
//     try {
//         await rest.put(
//             Routes.applicationCommands(process.env.CLIENT_ID),
//             { body: commands }
//         );
//         console.log('✅ Comando /test-preview registrado!');
//     } catch (error) {
//         console.error('❌ Erro ao registrar comando:', error);
//     }
// })();

// client.login(process.env.DISCORD_TOKENS);