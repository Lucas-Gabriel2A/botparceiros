# 🚀 Guia Completo: Deploy no Railway

## 📋 Pré-requisitos
- ✅ Conta no GitHub (já tem)
- ✅ Repositório com os bots (já feito!)
- ✅ Conta no Railway (vamos criar)

## 🎯 Step-by-Step Deploy

### 1. 🌐 Criar Conta no Railway
1. Acesse: https://railway.app
2. Clique em **"Login"**
3. Escolha **"Login with GitHub"**
4. Autorize o Railway no GitHub

### 2. 📦 Criar Novo Projeto
1. No painel Railway, clique **"New Project"**
2. Escolha **"Deploy from GitHub repo"**
3. Selecione o repositório: **"Lucas-Gabriel2A/botparceiros"**
4. Railway detectará automaticamente que é Node.js

### 3. ⚙️ Configurar Bot de Tickets

#### 3.1 Configurar Serviço
1. Clique no serviço criado
2. Vá em **"Settings"**
3. Em **"Environment"**, configure:
   - **Start Command**: `node bottickets.js`
   - **Root Directory**: `/` (deixe em branco)

#### 3.2 Configurar Variáveis de Ambiente
No painel **"Variables"**, adicione:

```env
DISCORD_TOKEN=MTQwOTY5MDU0OTUwOTk0NzQ2Mg.G5ehZq.vkdBJ7OWFVDOMyxx1mqNyehutbvFGmH-HRQCZQ
STAFF_ROLE_ID=1408499692261609644
TICKETS_CATEGORY_ID=1408499729066885372
TICKETS_CHANNEL_ID=1408499781185306776
ANNOUNCEMENTS_CHANNEL_ID=1408499800051896391
MEMBERS_ROLE_ID=1408499644123205753
```

### 4. 🎵 Adicionar Bot de Calls (Segundo Serviço)
1. No mesmo projeto, clique **"+ New Service"**
2. Escolha **"GitHub Repo"**
3. Selecione o mesmo repositório
4. Configure:
   - **Start Command**: `node botcallprivada.js`

#### 4.1 Variáveis para Bot de Calls
```env
DISCORD_TOKEN=MTQwNjE5MTAyMjI2NjEyMjM0Mw.GeHvoQ.Lep5m0qKE6pnDqG2ZqkeCSdCzU39xqXeculZ_M
VIP_ROLE_ID=1408499708455948459
CALLS_CATEGORY_ID=1408499733970026516
```

### 5. 📊 Monitoramento

#### 5.1 Verificar Logs
1. Clique em cada serviço
2. Vá na aba **"Logs"**
3. Verifique se aparecem:
   ```
   Sistema de Tickets BotName#1234 está online!
   Bot de Calls Privadas BotName#5678 está online!
   ```

#### 5.2 Métricas
- **CPU**: Deve ficar baixo (<10%)
- **RAM**: Deve usar ~20-50MB por bot
- **Network**: Minimal

### 6. 🔧 Configurações Adicionais

#### 6.1 Auto-Deploy
- ✅ **Habilitado por padrão**
- Todo push no GitHub = deploy automático
- Builds levam ~1-2 minutos

#### 6.2 Domínios (Opcional)
- Railway gera URLs automáticas
- Não necessário para Discord bots
- Útil se quiser webhook/API futura

### 7. 💰 Custos

#### Plano Hobby:
- **$5/mês** por projeto
- **2 serviços** (ambos os bots)
- **512MB RAM** cada
- **100GB bandwidth**
- **24/7 uptime**

#### Trial Gratuito:
- **$5 créditos** grátis
- **~1 mês** de teste
- Depois precisa upgrade

### 8. 🛠️ Troubleshooting

#### ❌ Se bots não iniciarem:
1. Verifique **Start Command** correto
2. Confirme **variáveis de ambiente**
3. Check **package.json** existe
4. Veja **logs de build**

#### ⚠️ Se faltarem dependências:
Crie `package.json` na raiz:
```json
{
  "name": "nexstar-bots",
  "version": "1.0.0",
  "scripts": {
    "start": "node bottickets.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1"
  }
}
```

#### 🔄 Redeploy Manual:
1. Settings > Deploy
2. Clique **"Deploy Latest"**

### 9. 🎯 Checklist Final

Antes de ir live:
- [ ] Ambos os bots online nos logs
- [ ] Comandos funcionando no Discord
- [ ] Tickets sendo criados corretamente
- [ ] Calls privadas funcionando
- [ ] Anúncios de parceria configurados
- [ ] Staff consegue aprovar/rejeitar
- [ ] Variáveis todas configuradas

### 10. 📱 Suporte

#### Railway:
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app
- Status: https://status.railway.app

#### Se precisar de ajuda:
- Check logs primeiro
- Teste comandos no Discord
- Verifique permissões dos bots
- Confirme IDs de canais/roles

## 🎉 Pronto!

Seus bots estarão rodando 24/7 no Railway!

**Benefícios:**
- ✅ **Zero downtime**
- ✅ **Auto-deploy** com GitHub
- ✅ **Logs em tempo real**
- ✅ **Escalabilidade automática**
- ✅ **Backup e recovery**

**Próximos passos:**
1. Monitore por alguns dias
2. Teste todas as funcionalidades
3. Configure alertas se necessário
4. Enjoy your bots! 🤖
