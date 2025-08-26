# Railway Configuration for Nexstar Discord Bots

## 🎯 Quick Deploy Links

### Bot de Tickets:
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/github.com/Lucas-Gabriel2A/botparceiros)

### Manual Deploy Steps:
1. Fork this repository
2. Connect Railway to your GitHub
3. Deploy from your forked repo
4. Configure environment variables

## 🔧 Environment Variables Required

### For Bot de Tickets (Service 1):
```
DISCORD_TOKEN=your_tickets_bot_token
STAFF_ROLE_ID=your_staff_role_id
TICKETS_CATEGORY_ID=your_tickets_category_id
TICKETS_CHANNEL_ID=your_tickets_channel_id
ANNOUNCEMENTS_CHANNEL_ID=your_announcements_channel_id
MEMBERS_ROLE_ID=your_members_role_id
```

### For Bot de Calls (Service 2):
```
DISCORD_TOKEN=your_calls_bot_token
VIP_ROLE_ID=your_vip_role_id
CALLS_CATEGORY_ID=your_calls_category_id
```

## 🚀 Deployment Configuration

### Service 1 (Tickets Bot):
- **Start Command**: `npm run start:tickets`
- **Root Directory**: `/`
- **Port**: Not required (Discord bot)

### Service 2 (Calls Bot):
- **Start Command**: `npm run start:calls`
- **Root Directory**: `/`
- **Port**: Not required (Discord bot)

## 📊 Resource Requirements

### Recommended:
- **RAM**: 512MB per service
- **CPU**: 0.5 vCPU per service
- **Storage**: 1GB (minimal)

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
