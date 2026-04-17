# Railway Configuration for CoreIA Discord Bots

## 🎯 Quick Deploy Links

### Opção 1: Todos os Bots em Um Serviço (Recomendado)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/github.com/Lucas-Gabriel2A/botparceiros)

### Opção 2: Serviços Separados (Avançado)
Crie serviços separados no Railway para cada bot:

#### Serviço 1: Bot de Tickets
- **Start Command**: `npm run start:tickets`
- **Environment Variables**: `DISCORD_TOKEN`, `STAFF_ROLE_ID`, etc.

#### Serviço 2: Bot de Welcome
- **Start Command**: `npm run start:welcome`
- **Environment Variables**: `DISCORD_TOKEN`, `CLIENT_ID`, etc.

## 🔧 Environment Variables Required

### Para Todos os Bots:
```
DISCORD_TOKEN=your_tickets_bot_token
DISCORD_TOKENS=your_welcome_bot_token
CLIENT_ID=your_welcome_bot_client_id
```

### Bot de Tickets (bottickets.js):
```
STAFF_ROLE_ID=your_staff_role_id
TICKETS_CATEGORY_ID=your_tickets_category_id
TICKETS_CHANNEL_ID=your_tickets_channel_id
ANNOUNCEMENTS_CHANNEL_ID=your_announcements_channel_id
MEMBERS_ROLE_ID=your_members_role_id
```

### Bot de Calls (botcallprivada.js):
```
VIP_ROLE_ID=your_vip_role_id
CALLS_CATEGORY_ID=your_calls_category_id
```

### Bot de Welcome (botwelcom.js):
```
CLIENT_ID=your_bot_client_id
OWNER_ROLE_ID=your_owner_role_id
SEMI_OWNER_ROLE_ID=your_semi_owner_role_id
CATEGORY_ID=your_category_id
WELCOME_CHANNEL_ID=your_welcome_channel_id
LEAVE_CHANNEL_ID=your_leave_channel_id
```

## 🚀 Deployment Configuration

### Configuração Atual (Todos os Bots):
- **Start Command**: `npm start` (executa todos os bots)
- **Root Directory**: `/`
- **Port**: Automática (para healthcheck)

### Recursos Recomendados:
- **RAM**: 1GB (para todos os bots)
- **CPU**: 1 vCPU
- **Storage**: 2GB

## 📊 Status dos Bots

Após o deploy, você verá logs de ambos os bots:
- 🤖 **Bot Tickets**: Sistema de tickets e parcerias
- 🎉 **Bot Welcome**: Sistema de boas-vindas com canvas

## 🔍 Troubleshooting

### Healthcheck Falhando:
- Verifique se todos os tokens estão corretos
- Confirme que os bots têm permissões adequadas no Discord

### Bot Não Conectando:
- Verifique o `DISCORD_TOKEN` no Railway
- Confirme que o bot está convidado para o servidor

### Erro de Dependências:
- Railway usa Node.js 18.17.0
- Todas as dependências estão no package.json

### Expected Usage:
- **Memory**: ~30-50MB per bot
- **CPU**: <5% most of the time
- **Network**: Minimal (Discord API only)

## 🔍 Health Checks

The bots will log when ready:
```
Sistema de Tickets BotName#1234 está online!
Bot de Calls Privadas BotName#5678 está online!
```

## 🛠️ Troubleshooting

### Common Issues:
1. **Bot not starting**: Check environment variables
2. **Permission errors**: Verify bot permissions in Discord
3. **Connection issues**: Check token validity

### Logs to Monitor:
- Bot login success/failure
- Command registration
- Error messages
- Memory usage warnings

## 💰 Cost Estimation

### Monthly Cost (Hobby Plan):
- **Base**: $5/month per project
- **Both bots**: Same project = $5/month total
- **Additional**: No overages expected

### Free Trial:
- **$5 credit** included
- **~30 days** of testing
- No credit card for trial
