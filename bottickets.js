// Polyfill para ReadableStream (compatibilidade com Node.js < 16.5.0)


// Importa as classes necessárias da biblioteca discord.js
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

// Carrega variáveis de ambiente
require("dotenv").config();

// --- CONFIGURAÇÕES ---
const TOKEN = process.env.DISCORD_TOKEN;
const ID_CARGO_STAFF = process.env.STAFF_ROLE_ID;
const ID_CATEGORIA_TICKETS = process.env.TICKETS_CATEGORY_ID;
const ID_CANAL_TICKETS = process.env.TICKETS_CHANNEL_ID;
const ID_CANAL_ANUNCIOS = process.env.ANNOUNCEMENTS_CHANNEL_ID;
const ID_CARGO_MEMBROS = process.env.MEMBERS_ROLE_ID;

// Validação das variáveis de ambiente
if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN não configurado no arquivo .env");
  process.exit(1);
}

if (!ID_CARGO_STAFF) {
  console.error("❌ STAFF_ROLE_ID não configurado no arquivo .env");
  process.exit(1);
}

if (!ID_CATEGORIA_TICKETS) {
  console.error("❌ TICKETS_CATEGORY_ID não configurado no arquivo .env");
  process.exit(1);
}

if (!ID_CANAL_TICKETS) {
  console.warn(
    "⚠️ TICKETS_CHANNEL_ID não configurado. Use /setup-tickets manualmente."
  );
}

if (!ID_CANAL_ANUNCIOS) {
  console.warn(
    "⚠️ ANNOUNCEMENTS_CHANNEL_ID não configurado. Anúncios de parceria desabilitados."
  );
}

if (!ID_CARGO_MEMBROS) {
  console.warn(
    "⚠️ MEMBERS_ROLE_ID não configurado. Anúncios não marcarão membros."
  );
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Armazena os tickets ativos: Map<channelId, {userId, type, created}>
const activeTickets = new Map();

// Tipos de tickets disponíveis
const ticketTypes = {
  denuncia: {
    name: "🚨 Denúncia",
    description: "Reportar usuários ou conteúdo inadequado",
    emoji: "🚨",
  },
  suporte_canal: {
    name: "📺 Suporte para Canal",
    description: "Ajuda com configurações de canal",
    emoji: "📺",
  },
  comprar_vip: {
    name: "💎 Comprar VIP",
    description: "Informações sobre VIP e pagamento",
    emoji: "💎",
  },
  suporte_geral: {
    name: "🛠️ Suporte Geral",
    description: "Outros tipos de suporte",
    emoji: "🛠️",
  },
  parceria: {
    name: "🤝 Parceria",
    description: "Propostas de parceria e colaboração",
    emoji: "🤝",
  },
};

client.once("ready", async () => {
  console.log(`Sistema de Tickets ${client.user.tag} está online!`);

  // Registra os comandos fdfdddfdfdfdf
  const commands = [
    new SlashCommandBuilder()
      .setName("setup-tickets")
      .setDescription("[STAFF] Configura o painel de tickets no canal atual"),
    new SlashCommandBuilder()
      .setName("fechar-ticket")
      .setDescription("[STAFF] Fecha o ticket atual"),
    new SlashCommandBuilder()
      .setName("adicionar")
      .setDescription("[STAFF] Adiciona um usuário ao ticket")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription("Usuário para adicionar ao ticket")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("remover")
      .setDescription("[STAFF] Remove um usuário do ticket")
      .addUserOption((option) =>
        option
          .setName("usuario")
          .setDescription("Usuário para remover do ticket")
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName("info-parceria")
      .setDescription(
        "[STAFF] Mostra informações detalhadas sobre a parceria atual (use no ticket)"
      ),
  ];

  const commandsAsJson = commands.map((command) => command.toJSON());
  client.application.commands.set(commandsAsJson);
  console.log("Comandos do sistema de tickets registrados!");

  // Configura o painel de tickets automaticamente no canal especificado
  if (ID_CANAL_TICKETS) {
    try {
      const ticketChannel = client.channels.cache.get(ID_CANAL_TICKETS);
      if (ticketChannel) {
        // Verifica se já existe um painel (evita spam)
        const messages = await ticketChannel.messages.fetch({ limit: 10 });
        const existingPanel = messages.find(
          (msg) =>
            msg.author.id === client.user.id &&
            msg.embeds.length > 0 &&
            msg.embeds[0].title === "🎫 Sistema de Tickets"
        );

        if (!existingPanel) {
          const embed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("🎫 Sistema de Tickets")
            .setDescription(
              'Clique no botão abaixo para abrir um ticket e receber suporte da nossa equipe.\n\n**Como funciona:**\n• Clique em "Abrir Ticket"\n• Escolha o tipo do seu ticket\n• Aguarde o atendimento da staff\n\n*Utilize apenas para assuntos importantes.*'
            )
            .setFooter({ text: "Sistema de Tickets • Nexstar" })
            .setTimestamp();

          const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("open_ticket")
              .setLabel("Abrir Ticket")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🎫")
          );

          await ticketChannel.send({ embeds: [embed], components: [button] });
          console.log(
            `✅ Painel de tickets configurado no canal: ${ticketChannel.name}`
          );
        } else {
          console.log(
            `ℹ️ Painel de tickets já existe no canal: ${ticketChannel.name}`
          );
        }
      } else {
        console.log(
          `❌ Canal de tickets não encontrado (ID: ${ID_CANAL_TICKETS})`
        );
      }
    } catch (error) {
      console.error("❌ Erro ao configurar painel de tickets:", error);
    }
  } else {
    console.log(
      "ℹ️ ID_CANAL_TICKETS não configurado. Use /setup-tickets manualmente."
    );
  }
});

// Listener para slash commands
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const { commandName } = interaction;

    // Verifica se o usuário é staff para comandos administrativos
    const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);

    if (commandName === "setup-tickets") {
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem usar este comando.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🎫 Sistema de Tickets")
        .setDescription(
          'Clique no botão abaixo para abrir um ticket e receber suporte da nossa equipe.\n\n**Como funciona:**\n• Clique em "Abrir Ticket"\n• Escolha o tipo do seu ticket\n• Aguarde o atendimento da staff\n\n*Utilize apenas para assuntos importantes.*'
        )
        .setFooter({ text: "Sistema de Tickets • Nexstar" })
        .setTimestamp();

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("open_ticket")
          .setLabel("Abrir Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫")
      );

      await interaction.reply({ embeds: [embed], components: [button] });
    } else if (commandName === "fechar-ticket") {
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem fechar tickets.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      if (!activeTickets.has(channel.id)) {
        return interaction.reply({
          content: "❌ Este não é um canal de ticket.",
          ephemeral: true,
        });
      }

      const ticketData = activeTickets.get(channel.id);

      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🔒 Fechando Ticket")
        .setDescription("Este ticket será fechado em 5 segundos...")
        .setFooter({ text: `Fechado por: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      setTimeout(async () => {
        try {
          activeTickets.delete(channel.id);
          await channel.delete();
        } catch (error) {
          console.error("Erro ao fechar ticket:", error);
        }
      }, 5000);
    } else if (commandName === "adicionar") {
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem adicionar usuários.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      if (!activeTickets.has(channel.id)) {
        return interaction.reply({
          content: "❌ Este não é um canal de ticket.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("usuario");

      try {
        await channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        await interaction.reply({
          content: `✅ ${user} foi adicionado ao ticket.`,
        });
      } catch (error) {
        console.error("Erro ao adicionar usuário:", error);
        await interaction.reply({
          content: "❌ Erro ao adicionar usuário ao ticket.",
          ephemeral: true,
        });
      }
    } else if (commandName === "remover") {
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem remover usuários.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      if (!activeTickets.has(channel.id)) {
        return interaction.reply({
          content: "❌ Este não é um canal de ticket.",
          ephemeral: true,
        });
      }

      const user = interaction.options.getUser("usuario");
      const ticketData = activeTickets.get(channel.id);

      if (user.id === ticketData.userId) {
        return interaction.reply({
          content: "❌ Não é possível remover o criador do ticket.",
          ephemeral: true,
        });
      }

      try {
        await channel.permissionOverwrites.delete(user.id);
        await interaction.reply({
          content: `✅ ${user} foi removido do ticket.`,
        });
      } catch (error) {
        console.error("Erro ao remover usuário:", error);
        await interaction.reply({
          content: "❌ Erro ao remover usuário do ticket.",
          ephemeral: true,
        });
      }
    } else if (commandName === "info-parceria") {
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem usar este comando.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      if (!activeTickets.has(channel.id)) {
        return interaction.reply({
          content: "❌ Este não é um canal de ticket.",
          ephemeral: true,
        });
      }

      const ticketData = activeTickets.get(channel.id);
      if (ticketData.type !== "parceria") {
        return interaction.reply({
          content: "❌ Este não é um ticket de parceria.",
          ephemeral: true,
        });
      }

      if (!ticketData.formCompleted) {
        return interaction.reply({
          content: "⚠️ O formulário de parceria ainda não foi completado.",
          ephemeral: true,
        });
      }

      const user = await client.users.fetch(ticketData.userId);

      const infoEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("📊 Informações Detalhadas da Parceria")
        .setDescription(
          `**Solicitante:** ${user} (${user.tag})\n**ID:** ${
            user.id
          }\n**Conta criada:** <t:${Math.floor(
            user.createdTimestamp / 1000
          )}:F>\n**Ticket criado:** <t:${Math.floor(
            ticketData.created.getTime() / 1000
          )}:F>`
        )
        .addFields(
          ...ticketData.responses.map((resp, index) => ({
            name: `${index + 1}. ${resp.question}`,
            value:
              resp.answer.length > 1024
                ? resp.answer.substring(0, 1021) + "..."
                : resp.answer,
            inline: false,
          }))
        );

      if (ticketData.memberCount) {
        infoEmbed.addFields({
          name: "✅ Verificação Automática",
          value: `**Membros verificados:** ${ticketData.memberCount.toLocaleString()}`,
          inline: false,
        });
      }

      infoEmbed
        .setFooter({ text: "Informações para análise da staff" })
        .setTimestamp();

      await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
    }
  }

  // Listener para botões e select menus
  else if (interaction.isButton() || interaction.isStringSelectMenu()) {
    if (interaction.customId === "open_ticket") {
      // Verifica se o usuário já tem um ticket aberto
      const existingTicket = Array.from(activeTickets.values()).find(
        (ticket) => ticket.userId === interaction.user.id
      );
      if (existingTicket) {
        const ticketChannel = interaction.guild.channels.cache.find(
          (channel) =>
            activeTickets.has(channel.id) &&
            activeTickets.get(channel.id).userId === interaction.user.id
        );
        return interaction.reply({
          content: `❌ Você já possui um ticket aberto: ${ticketChannel}`,
          ephemeral: true,
        });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket_type_select")
        .setPlaceholder("Selecione o tipo do seu ticket")
        .addOptions(
          Object.entries(ticketTypes).map(([key, type]) => ({
            label: type.name,
            description: type.description,
            value: key,
            emoji: type.emoji,
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({
        content: "🎫 **Selecione o tipo do seu ticket:**",
        components: [row],
        ephemeral: true,
      });
    } else if (interaction.customId === "ticket_type_select") {
      const ticketType = interaction.values[0];
      const typeInfo = ticketTypes[ticketType];

      await interaction.deferReply({ ephemeral: true });

      try {
        const guild = interaction.guild;
        const channelName = `ticket-${typeInfo.emoji.replace(/[^\w]/g, "")}-${
          interaction.user.username
        }`.toLowerCase();

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: ID_CATEGORIA_TICKETS,
          permissionOverwrites: [
            {
              id: guild.id, // @everyone
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: interaction.user.id, // Criador do ticket
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
            {
              id: ID_CARGO_STAFF, // Staff
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
              ],
            },
          ],
        });

        // Registra o ticket
        activeTickets.set(ticketChannel.id, {
          userId: interaction.user.id,
          type: ticketType,
          created: new Date(),
        });

        let welcomeEmbed, components;

        // Se for ticket de parceria, cria formulário específico
        if (ticketType === "parceria") {
          welcomeEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle(`${typeInfo.emoji} ${typeInfo.name}`)
            .setDescription(
              `Olá ${
                interaction.user
              }!\n\n**Bem-vindo ao sistema de parcerias!**\n\nPara analisarmos sua proposta de parceria, precisamos de algumas informações sobre seu servidor. Por favor, clique no botão abaixo para preencher o formulário.\n\n**Criado em:** <t:${Math.floor(
                Date.now() / 1000
              )}:F>`
            )
            .setFooter({ text: "Preencha o formulário para continuar" })
            .setTimestamp();

          components = [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("partnership_form")
                .setLabel("Preencher Formulário")
                .setStyle(ButtonStyle.Success)
                .setEmoji("📝"),
              new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Fechar Ticket")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒")
            ),
          ];
        } else {
          // Ticket normal
          welcomeEmbed = new EmbedBuilder()
            .setColor("#00ff00")
            .setTitle(`${typeInfo.emoji} ${typeInfo.name}`)
            .setDescription(
              `Olá ${
                interaction.user
              }!\n\nSeu ticket foi criado com sucesso. Nossa equipe será notificada e em breve alguém irá te atender.\n\n**Tipo do ticket:** ${
                typeInfo.description
              }\n**Criado em:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setFooter({ text: "Aguarde o atendimento da staff" })
            .setTimestamp();

          components = [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Fechar Ticket")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒")
            ),
          ];
        }

        await ticketChannel.send({
          content: `${interaction.user} <@&${ID_CARGO_STAFF}>`,
          embeds: [welcomeEmbed],
          components: components,
        });

        await interaction.editReply({
          content: `✅ Seu ticket foi criado! ${ticketChannel}`,
        });
      } catch (error) {
        console.error("Erro ao criar ticket:", error);
        await interaction.editReply({
          content:
            "❌ Erro ao criar o ticket. Verifique as configurações do bot.",
        });
      }
    } else if (interaction.customId === "close_ticket") {
      const channel = interaction.channel;
      if (!activeTickets.has(channel.id)) {
        return interaction.reply({
          content: "❌ Este não é um canal de ticket válido.",
          ephemeral: true,
        });
      }

      const ticketData = activeTickets.get(channel.id);
      const isOwner = ticketData.userId === interaction.user.id;
      const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);

      if (!isOwner && !isStaff) {
        return interaction.reply({
          content:
            "❌ Apenas o criador do ticket ou a staff podem fechar este ticket.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("🔒 Fechando Ticket")
        .setDescription("Este ticket será fechado em 5 segundos...")
        .setFooter({ text: `Fechado por: ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      setTimeout(async () => {
        try {
          activeTickets.delete(channel.id);
          await channel.delete();
        } catch (error) {
          console.error("Erro ao fechar ticket:", error);
        }
      }, 5000);
    } else if (interaction.customId === "partnership_form") {
      const channel = interaction.channel;
      if (!activeTickets.has(channel.id)) {
        return interaction.reply({
          content: "❌ Este não é um canal de ticket válido.",
          ephemeral: true,
        });
      }

      const ticketData = activeTickets.get(channel.id);
      if (ticketData.userId !== interaction.user.id) {
        return interaction.reply({
          content: "❌ Apenas o criador do ticket pode preencher o formulário.",
          ephemeral: true,
        });
      }

      const formEmbed = new EmbedBuilder()
        .setColor("#ffa500")
        .setTitle("📝 Formulário de Parceria")
        .setDescription(
          `${interaction.user}, por favor responda às seguintes perguntas **em mensagens separadas** na ordem indicada:\n\n**1.** Qual o nome do seu servidor?\n**2.** Quantos membros seu servidor possui?\n**3.** Qual a temática/foco do servidor?\n**4.** Seus membros são ativos? (Sim/Não e explique)\n**5.** Cole aqui o link de convite do seu servidor\n**6.** Por que deseja fazer parceria conosco?\n**7.** Cole aqui o texto personalizado/descritivo do seu servidor (será exibido no anúncio)\n**8.** Cole aqui o link do banner/imagem do seu servidor OU anexe uma imagem diretamente (opcional - deixe em branco se não tiver)\n\n*Aguarde nossa verificação após responder todas as perguntas.*`
        )
        .setFooter({ text: "Responda uma pergunta por mensagem" })
        .setTimestamp();

      await interaction.reply({ embeds: [formEmbed] });

      // Armazena que o formulário foi iniciado
      activeTickets.set(channel.id, {
        ...ticketData,
        formStarted: true,
        responses: [],
        awaitingResponse: 1,
      });
    } else if (interaction.customId === "approve_partnership") {
      const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem aprovar parcerias.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      const ticketData = activeTickets.get(channel.id);

      // Embed com aviso sobre divulgação obrigatória
      const disclosureWarningEmbed = new EmbedBuilder()
        .setColor("#ff6b35")
        .setTitle("⚠️ DIVULGAÇÃO OBRIGATÓRIA")
        .setDescription(
          `**Antes de aprovar esta parceria, é obrigatório que o servidor parceiro divulgue o nosso servidor primeiro.**\n\n**📋 Instruções para o parceiro:**\n• O parceiro deve divulgar nosso servidor em um canal público\n• Deve enviar um print comprovando a divulgação\n• Só então a parceria poderá ser aprovada\n\n**🌟 Texto para divulgação:**\n\`\`\`\n# ꧁ঔৣ☬ ✦ Nexstar ✦ ☬ঔৣ꧂\n*✧･ﾟ: Um novo universo esperando por você... :･ﾟ✧*\n\n## ✦•.¸¸.•⭐ Quem somos nós? ⭐•.¸¸.•✦\n\nSomos a **Nexstar**! Criamos este espaço para quem busca novas amizades, diversão e energia positiva. Nossa comunidade é um refúgio acolhedor onde cada pessoa se sente genuinamente bem-vinda.\n\n## ･ﾟ✧*:･ﾟ O que oferecemos ･ﾟ: *✧･ﾟ\n\n**☆ Parcerias incríveis** - Conectamos pessoas que compartilham os mesmos valores\n**✦ Bots úteis** - Ferramentas interativas que melhoram sua experiência  \n**✧ Eventos e sorteios** - Atividades divertidas e entretenimento de qualidade\n**⋆ Suporte sempre** - Nossa equipe está pronta para ajudar\n\n## ☆ﾟ.*･｡ﾟ Nossa missão ☆ﾟ.*･｡ﾟ\n\nQueremos criar um cantinho na internet onde você possa ser autenticamente você mesmo. Um lugar onde o respeito é o coração de tudo que fazemos, onde cada opinião importa e cada pessoa tem valor.\n\n## ゜･｡｡･ﾟ･｡ Nossa regra essencial ･｡･ﾟ･｡｡･ﾟ\n\n**Respeito em primeiro lugar, sempre.**\n\nQuando nos tratamos com gentileza, criamos algo maior que uma comunidade - criamos uma família.\n\n## ✦•┈┈•⋅⋆⋅ Vamos nos conectar? ⋅⋆⋅•┈┈•✦\n\n**Entre na nossa galáxia:** https://discord.gg/fbBEGWfVEQ\n\n*꧁ঔৣ☬ ✧ Nexstar — Venha brilhar conosco! ✧ ☬ঔৣ꧂*\n\`\`\`\n\n**📸 Após a divulgação, solicite que envie um print como comprovante.**`
        )
        .setFooter({ text: "Aguardando print comprovante da divulgação" })
        .setTimestamp();

      const confirmButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_approval_waiting_proof")
          .setLabel("Enviar Instruções ao Parceiro")
          .setStyle(ButtonStyle.Success)
          .setEmoji("📤"),
        new ButtonBuilder()
          .setCustomId("cancel_approval")
          .setLabel("Cancelar Aprovação")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❌")
      );

      await interaction.reply({
        embeds: [disclosureWarningEmbed],
        components: [confirmButtons],
        ephemeral: true,
      });
    } else if (interaction.customId === "reject_partnership") {
      const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem rejeitar parcerias.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;

      const rejectionEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Parceria Rejeitada")
        .setDescription(
          `Infelizmente, sua proposta de parceria não foi aprovada neste momento.\n\n**Rejeitado por:** ${
            interaction.user
          }\n**Data:** <t:${Math.floor(
            Date.now() / 1000
          )}:F>\n\n**Possíveis motivos:**\n• Servidor não atende aos critérios mínimos\n• Pouca atividade dos membros\n• Temática incompatível\n• Já temos parcerias similares\n\n**Você pode:**\n• Trabalhar no crescimento do seu servidor\n• Tentar novamente no futuro\n• Entrar em contato para feedback específico\n\n*Este ticket será fechado automaticamente em 60 segundos.*`
        )
        .setFooter({ text: "Obrigado pelo interesse!" })
        .setTimestamp();

      await interaction.reply({ embeds: [rejectionEmbed] });

      // Fecha o ticket após 60 segundos
      setTimeout(async () => {
        try {
          activeTickets.delete(channel.id);
          await channel.delete();
        } catch (error) {
          console.error("Erro ao fechar ticket rejeitado:", error);
        }
      }, 60000);
    } else if (interaction.customId === "confirm_approval_waiting_proof") {
      const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem executar esta ação.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      const ticketData = activeTickets.get(channel.id);

      // Envia instruções para o parceiro
      const instructionsEmbed = new EmbedBuilder()
        .setColor("#ff6b35")
        .setTitle("� DIVULGAÇÃO OBRIGATÓRIA")
        .setDescription(
          `**Olá! Antes de aprovarmos sua parceria, precisamos que você divulgue nosso servidor primeiro.**\n\n**📋 O que você precisa fazer:**\n\n1. **Divulgue nosso servidor** em um canal público do seu servidor\n2. **Use exatamente este texto** para a divulgação:\n\n\`\`\`\n# ꧁ঔৣ☬ ✦ Nexstar ✦ ☬ঔৣ꧂\n*✧･ﾟ: Um novo universo esperando por você... :･ﾟ✧*\n\n## ✦•.¸¸.•⭐ Quem somos nós? ⭐•.¸¸.•✦\n\nSomos a **Nexstar**! Criamos este espaço para quem busca novas amizades, diversão e energia positiva. Nossa comunidade é um refúgio acolhedor onde cada pessoa se sente genuinamente bem-vinda.\n\n## ･ﾟ✧*:･ﾟ O que oferecemos ･ﾟ: *✧･ﾟ\n\n**☆ Parcerias incríveis** - Conectamos pessoas que compartilham os mesmos valores\n**✦ Bots úteis** - Ferramentas interativas que melhoram sua experiência  \n**✧ Eventos e sorteios** - Atividades divertidas e entretenimento de qualidade\n**⋆ Suporte sempre** - Nossa equipe está pronta para ajudar\n\n## ☆ﾟ.*･｡ﾟ Nossa missão ☆ﾟ.*･｡ﾟ\n\nQueremos criar um cantinho na internet onde você possa ser autenticamente você mesmo. Um lugar onde o respeito é o coração de tudo que fazemos, onde cada opinião importa e cada pessoa tem valor.\n\n## ゜･｡｡･ﾟ･｡ Nossa regra essencial ･｡･ﾟ･｡｡･ﾟ\n\n**Respeito em primeiro lugar, sempre.**\n\nQuando nos tratamos com gentileza, criamos algo maior que uma comunidade - criamos uma família.\n\n## ✦•┈┈•⋅⋆⋅ Vamos nos conectar? ⋅⋆⋅•┈┈•✦\n\n**Entre na nossa galáxia:** https://discord.gg/fbBEGWfVEQ\n\n*꧁ঔৣ☬ ✧ Nexstar — Venha brilhar conosco! ✧ ☬ঔৣ꧂*\n\`\`\`\n\n3. **Envie um print** comprovando que a divulgação foi feita\n4. **Aguardamos seu print** para aprovar a parceria!\n\n**⚠️ Importante:** A parceria só será aprovada após o envio do print comprovante.`
        )
        .setFooter({ text: "Aguardando print comprovante da divulgação" })
        .setTimestamp();

      await channel.send({ embeds: [instructionsEmbed] });

      // Atualiza o status do ticket para aguardar print
      activeTickets.set(channel.id, {
        ...ticketData,
        waitingForProof: true,
      });

      await interaction.reply({
        content:
          "✅ Instruções enviadas ao parceiro. Aguardando print comprovante.",
        ephemeral: true,
      });
    } else if (interaction.customId === "cancel_approval") {
      await interaction.reply({
        content: "❌ Aprovação cancelada.",
        ephemeral: true,
      });
    } else if (interaction.customId === "final_approve_partnership") {
      const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem aprovar parcerias.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      const ticketData = activeTickets.get(channel.id);

      if (!ticketData.proofReceived) {
        return interaction.reply({
          content: "❌ Print comprovante ainda não foi recebido.",
          ephemeral: true,
        });
      }

      // Busca informações do servidor parceiro
      let partnerGuild = null;
      let serverLink = null;

      // Procura o link do servidor nas respostas (pergunta 5)
      if (ticketData.responses && ticketData.responses.length >= 5) {
        const linkResponse = ticketData.responses[4]; // Índice 4 = pergunta 5
        const discordInviteRegex =
          /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/([a-z0-9]+)/i;
        const match = linkResponse.answer.match(discordInviteRegex);

        if (match) {
          try {
            const inviteCode = match[5];
            const invite = await client.fetchInvite(inviteCode);
            partnerGuild = invite.guild;
            serverLink = `https://discord.gg/${inviteCode}`;
          } catch (error) {
            console.error("Erro ao buscar informações do servidor:", error);
          }
        }
      }

      const approvalEmbed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("✅ Parceria Aprovada!")
        .setDescription(
          `**Parabéns!** Sua proposta de parceria foi **aprovada** pela nossa staff.\n\n**Aprovado por:** ${
            interaction.user
          }\n**Data da aprovação:** <t:${Math.floor(
            Date.now() / 1000
          )}:F>\n\n**Próximos passos:**\n• Nossa equipe entrará em contato em breve\n• Definiremos os detalhes da parceria\n• Enviaremos as diretrizes de parceria\n• **Sua parceria será anunciada publicamente!**\n\n*Este ticket será fechado automaticamente em 30 segundos.*`
        )
        .setFooter({ text: "Bem-vindo como parceiro!" })
        .setTimestamp();

      await interaction.reply({ embeds: [approvalEmbed] });

      // Anuncia a nova parceria no canal de anúncios
      if (ID_CANAL_ANUNCIOS) {
        try {
          const announcementChannel =
            client.channels.cache.get(ID_CANAL_ANUNCIOS);
          if (announcementChannel) {
            const partnerUser = await client.users.fetch(ticketData.userId);
            const serverName = ticketData.responses
              ? ticketData.responses[0]?.answer || "Servidor Desconhecido"
              : "Servidor Desconhecido";
            const serverTheme =
              ticketData.responses && ticketData.responses.length >= 3
                ? ticketData.responses[2]?.answer || "Não informado"
                : "Não informado";
            const memberActivity =
              ticketData.responses && ticketData.responses.length >= 4
                ? ticketData.responses[3]?.answer || "Não informado"
                : "Não informado";
            const customText =
              ticketData.responses && ticketData.responses.length >= 7
                ? ticketData.responses[6]?.answer || ""
                : "";
            const customBanner =
              ticketData.responses && ticketData.responses.length >= 8
                ? ticketData.responses[7]?.answer || ""
                : "";

            // Anúncio simplificado: apenas texto personalizado + banner
            const mentions = `${ID_CARGO_MEMBROS ? `<@&${ID_CARGO_MEMBROS}> ` : ""}${ID_CARGO_STAFF ? `<@&${ID_CARGO_STAFF}>` : ""}`.trim();
            let announcementContent = mentions + "\n\n";

            // Título decorativo da nova parceria
            announcementContent += "┌─────────────────────────────────────┐\n";
            announcementContent += "│        🎉 NOVA PARCERIA OFICIAL 🎉        │\n";
            announcementContent += "└─────────────────────────────────────┘\n\n";

            if (customText && customText.trim() !== "") {
              announcementContent += customText.length > 2000
                ? customText.substring(0, 1997) + "..."
                : customText;
            } else {
              announcementContent += "🎉 Nova parceria oficial! 🎉";
            }

            // Cria embed apenas se houver banner customizado
            const announcementEmbeds = [];
            if (customBanner && customBanner.trim() !== "") {
              const bannerEmbed = new EmbedBuilder()
                .setImage(customBanner)
                .setColor("#2F3136");
              announcementEmbeds.push(bannerEmbed);
            } else if (partnerGuild && partnerGuild.bannerURL()) {
              const bannerEmbed = new EmbedBuilder()
                .setImage(partnerGuild.bannerURL({ size: 1024, extension: "png" }))
                .setColor("#2F3136");
              announcementEmbeds.push(bannerEmbed);
            }
            await announcementChannel.send({
              content: announcementContent,
              embeds: announcementEmbeds,
            });

            console.log(`✅ Anúncio de parceria publicado para: ${serverName}`);
          } else {
            console.error("❌ Canal de anúncios não encontrado");
          }
        } catch (error) {
          console.error("❌ Erro ao publicar anúncio de parceria:", error);
        }
      }

      // Fecha o ticket após 30 segundos
      setTimeout(async () => {
        try {
          activeTickets.delete(channel.id);
          await channel.delete();
        } catch (error) {
          console.error("Erro ao fechar ticket aprovado:", error);
        }
      }, 30000);
    } else if (interaction.customId === "reject_proof") {
      const isStaff = interaction.member.roles.cache.has(ID_CARGO_STAFF);
      if (!isStaff) {
        return interaction.reply({
          content: "❌ Apenas membros da staff podem rejeitar prints.",
          ephemeral: true,
        });
      }

      const channel = interaction.channel;
      const ticketData = activeTickets.get(channel.id);

      const rejectProofEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Print Insuficiente")
        .setDescription(
          `O print enviado não foi considerado suficiente para comprovar a divulgação.\n\n**Possíveis motivos:**\n• Print não mostra claramente a divulgação\n• Divulgação não foi feita corretamente\n• Print está cortado ou ilegível\n\n**Por favor, envie um novo print** que mostre claramente a divulgação do nosso servidor no seu servidor.`
        )
        .setFooter({ text: "Aguardando novo print comprovante" })
        .setTimestamp();

      await interaction.reply({ embeds: [rejectProofEmbed] });

      // Mantém o status de aguardar print
      activeTickets.set(channel.id, {
        ...ticketData,
        proofReceived: false,
        proofImageUrl: null,
      });
    }
  }
});

// Listener para capturar respostas do formulário de parceria
client.on("messageCreate", async (message) => {
  // Ignora mensagens do bot
  if (message.author.bot) return;

  const channel = message.channel;

  // Verifica se é um ticket de parceria com formulário ativo
  if (!activeTickets.has(channel.id)) return;

  const ticketData = activeTickets.get(channel.id);

  // Verifica se é ticket de parceria
  if (ticketData.type !== "parceria") {
    return;
  }

  // Se está aguardando print comprovante da divulgação
  if (ticketData.waitingForProof) {
    // Verifica se a mensagem tem anexos (imagens)
    if (message.attachments.size > 0) {
      // Verifica se algum anexo é uma imagem
      const imageAttachments = message.attachments.filter(
        (attachment) =>
          attachment.contentType && attachment.contentType.startsWith("image/")
      );

      if (imageAttachments.size > 0) {
        // Print recebido - agora pode aprovar
        await message.react("✅");

        const proofReceivedEmbed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("📸 Print Comprovante Recebido!")
          .setDescription(
            `**Print da divulgação recebido com sucesso!**\n\nAgora a parceria pode ser aprovada. A staff irá revisar o print e proceder com a aprovação final.`
          )
          .setImage(imageAttachments.first().url)
          .setFooter({ text: "Aguardando aprovação final da staff" })
          .setTimestamp();

        // Botões para aprovação final
        const finalApprovalButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("final_approve_partnership")
            .setLabel("Aprovar Parceria Final")
            .setStyle(ButtonStyle.Success)
            .setEmoji("🎉"),
          new ButtonBuilder()
            .setCustomId("reject_proof")
            .setLabel("Print Insuficiente")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("❌")
        );

        await channel.send({
          embeds: [proofReceivedEmbed],
          components: [finalApprovalButtons],
        });

        // Notifica a staff
        const staffNotification = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("🔔 Print Comprovante Recebido")
          .setDescription(
            `<@&${ID_CARGO_STAFF}> Um print comprovante da divulgação foi enviado no ticket de parceria!\n\n**Ticket:** ${channel}\n**Usuário:** ${message.author}\n\nPor favor, revise o print e proceda com a aprovação final.`
          )
          .setTimestamp();

        await channel.send({ embeds: [staffNotification] });

        // Atualiza o status do ticket
        activeTickets.set(channel.id, {
          ...ticketData,
          proofReceived: true,
          proofImageUrl: imageAttachments.first().url,
        });

        return;
      }
    }

    // Se não é imagem, informa que precisa enviar print
    if (
      !message.attachments.size ||
      !message.attachments.some(
        (att) => att.contentType && att.contentType.startsWith("image/")
      )
    ) {
      const reminderEmbed = new EmbedBuilder()
        .setColor("#ffa500")
        .setTitle("📸 Print Necessário")
        .setDescription(
          `Por favor, envie um **print/imagem** comprovando que você divulgou nosso servidor no seu servidor.\n\n**Lembre-se:** A parceria só será aprovada após o envio do print comprovante.`
        )
        .setFooter({ text: "Envie uma imagem anexada à mensagem" })
        .setTimestamp();

      await channel.send({ embeds: [reminderEmbed] });
      return;
    }
  }

  // Verifica se formulário foi iniciado e a mensagem é do criador
  if (!ticketData.formStarted || ticketData.userId !== message.author.id) {
    return;
  }

  // Se já coletou todas as respostas, ignora
  if (ticketData.responses && ticketData.responses.length >= 8) return;

  const questions = [
    "Nome do servidor",
    "Número de membros",
    "Temática/foco",
    "Membros ativos",
    "Link do servidor",
    "Motivo da parceria",
    "Texto personalizado do servidor",
    "Banner/imagem do servidor",
  ];

  const currentQuestion = ticketData.awaitingResponse;

  // Adiciona a resposta
  if (!ticketData.responses) ticketData.responses = [];
  
  // Para a pergunta 8 (banner), verificar se há anexo de imagem
  let answer = message.content;
  if (currentQuestion === 8 && message.attachments.size > 0) {
    const imageAttachments = message.attachments.filter(
      (attachment) =>
        attachment.contentType && attachment.contentType.startsWith("image/")
    );
    if (imageAttachments.size > 0) {
      answer = imageAttachments.first().url;
    }
  }
  
  ticketData.responses.push({
    question: questions[currentQuestion - 1],
    answer: answer,
  });

  // Reage à mensagem para confirmar que foi capturada
  await message.react("✅");

  // Verifica se é um link de Discord (pergunta 5)
  let memberCount = null;
  if (currentQuestion === 5) {
    const discordInviteRegex =
      /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/([a-z0-9]+)/i;
    const match = message.content.match(discordInviteRegex);

    if (match) {
      try {
        const inviteCode = match[5];
        const invite = await client.fetchInvite(inviteCode);
        memberCount = invite.memberCount;

        const verificationEmbed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("✅ Link Verificado")
          .setDescription(
            `**Servidor:** ${
              invite.guild.name
            }\n**Membros verificados:** ${memberCount.toLocaleString()}\n**Boost Level:** ${
              invite.guild.premiumTier || 0
            }`
          )
          .setThumbnail(invite.guild.iconURL())
          .setTimestamp();

        await channel.send({ embeds: [verificationEmbed] });
      } catch (error) {
        console.error("Erro ao verificar convite:", error);
        await channel.send(
          "⚠️ Não foi possível verificar o link automaticamente. Nossa staff verificará manualmente."
        );
      }
    } else {
      await channel.send(
        "⚠️ Link inválido ou não é um convite do Discord. Nossa staff verificará manualmente."
      );
    }
  }

  // Se coletou todas as respostas
  if (ticketData.responses.length >= 8) {
    const summaryEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("📋 Resumo da Proposta de Parceria")
      .setDescription(
        `**Solicitante:** ${message.author}\n**Data:** <t:${Math.floor(
          Date.now() / 1000
        )}:F>\n\n` +
          ticketData.responses
            .map(
              (resp, index) =>
                `**${index + 1}. ${resp.question}:**\n${resp.answer}`
            )
            .join("\n\n") +
          (memberCount
            ? `\n\n**✅ Membros Verificados:** ${memberCount.toLocaleString()}`
            : "")
      )
      .setFooter({ text: "Proposta completa • Aguardando análise da staff" })
      .setTimestamp();

    const staffNotificationEmbed = new EmbedBuilder()
      .setColor("#ff9900")
      .setTitle("🔔 Nova Proposta de Parceria")
      .setDescription(
        `<@&${ID_CARGO_STAFF}> Uma nova proposta de parceria foi enviada e está completa para análise.\n\n**Ações disponíveis para a staff:**`
      )
      .setTimestamp();

    const approvalButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("approve_partnership")
        .setLabel("Aprovar Parceria")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),
      new ButtonBuilder()
        .setCustomId("reject_partnership")
        .setLabel("Rejeitar Parceria")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌"),
      new ButtonBuilder()
        .setCustomId("request_more_info")
        .setLabel("Solicitar Mais Informações")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📝")
    );

    await channel.send({
      embeds: [summaryEmbed, staffNotificationEmbed],
      components: [approvalButtons],
    });

    // Atualiza o ticket para indicar que o formulário foi concluído
    activeTickets.set(channel.id, {
      ...ticketData,
      formCompleted: true,
      memberCount: memberCount,
    });
  } else {
    // Próxima pergunta
    const nextQuestion = currentQuestion + 1;
    activeTickets.set(channel.id, {
      ...ticketData,
      awaitingResponse: nextQuestion,
    });

    await channel.send(
      `✅ Resposta registrada! **Próxima pergunta (${nextQuestion}/8):** ${
        questions[nextQuestion - 1]
      }`
    );
  }
});

client.login(TOKEN);
