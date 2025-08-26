# 🎉 Sistema de Anúncios de Parceria

## ⚙️ Configuração Necessária

### 1. Variáveis no .env
```env
# Canal onde serão publicados os anúncios de novas parcerias
ANNOUNCEMENTS_CHANNEL_ID=ID_DO_SEU_CANAL_DE_ANUNCIOS

# Cargo que será mencionado nos anúncios (ex: @Membros, @everyone)
MEMBERS_ROLE_ID=ID_DO_CARGO_MEMBROS
```

### 2. Como obter os IDs

#### ID do Canal de Anúncios:
1. Ative o Modo Desenvolvedor no Discord
2. Clique com botão direito no canal de anúncios
3. Clique em "Copiar ID"
4. Cole no .env

#### ID do Cargo Membros:
1. No Discord, digite `\@NomeDoCargoMembros`
2. Copie os números que aparecem
3. Cole no .env

## 🎊 O que acontece quando uma parceria é aprovada:

### ✅ Anúncio Automático inclui:
- 🎉 **Título celebrativo**
- 📋 **Nome do servidor parceiro**
- 🎯 **Temática do servidor**
- 👤 **Responsável pela parceria**
- 📊 **Estatísticas verificadas** (membros, boost level)
- 🖼️ **Ícone do servidor** (se disponível)
- 🌟 **Banner do servidor** (se disponível)
- 🔗 **Link do servidor**

### 🔔 Menções automáticas:
- **@Membros** (se configurado)
- **@Staff** (sempre)

### 📱 Exemplo de anúncio:
```
@Membros @Staff

🎊 Celebremos nossa nova parceria! 🎊

[EMBED]
🎉 Nova Parceria Oficial!

Temos o prazer de anunciar nossa nova parceria oficial!
🤝 Bem-vindos ao nosso novo servidor parceiro!

📋 Informações do Servidor
Nome: Gaming Paradise
Temática: Jogos e Entretenimento
Responsável: @usuario

📊 Estatísticas Verificadas
Membros: 2,847
Boost Level: 2
Link: https://discord.gg/exemplo

[Ícone do servidor]
[Banner do servidor se houver]
```

## 🛠️ Troubleshooting

### ❌ Se anúncios não aparecem:
1. Verifique se ANNOUNCEMENTS_CHANNEL_ID está correto
2. Confirme que o bot tem permissão no canal
3. Verifique os logs do console para erros

### ⚠️ Se menções não funcionam:
1. Confirme MEMBERS_ROLE_ID está correto
2. Verifique se o bot pode mencionar o cargo
3. Teste com outro cargo se necessário

## 📋 Permissões necessárias para o bot:
- ✅ Ver Canal (anúncios)
- ✅ Enviar Mensagens
- ✅ Incorporar Links
- ✅ Mencionar @everyone, @here e Todos os Cargos
- ✅ Ler Histórico de Mensagens
