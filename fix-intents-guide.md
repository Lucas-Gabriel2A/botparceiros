# 🔧 Configuração de Intents no Discord Developer Portal

## ❌ Erro Encontrado:
```
Error: Used disallowed intents
```

Este erro acontece quando o bot tenta usar intents que não foram habilitados no Discord Developer Portal.

## ✅ Solução Passo-a-Passo:

### 1. 🌐 Acessar Discord Developer Portal
👉 https://discord.com/developers/applications

### 2. 📱 Selecionar Aplicação
1. Clique na aplicação do seu **Bot de Tickets**
2. Vá para a aba **"Bot"** no menu lateral

### 3. 🔓 Habilitar Intents Necessários

#### Para o Bot de Tickets:
Marque as seguintes opções em **"Privileged Gateway Intents"**:

✅ **PRESENCE INTENT** - Não necessário (deixe desmarcado)
✅ **SERVER MEMBERS INTENT** - ⚠️ **HABILITAR ESTE**
✅ **MESSAGE CONTENT INTENT** - ⚠️ **HABILITAR ESTE**

### 4. 💾 Salvar Configurações
1. Clique em **"Save Changes"**
2. ⚠️ **IMPORTANTE**: Reinicie o bot após salvar

### 5. 🔄 Repetir para Bot de Calls
1. Acesse a aplicação do **Bot de Calls**
2. Vá para aba **"Bot"**
3. Habilite os mesmos intents:
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **MESSAGE CONTENT INTENT**

## 🎯 Intents Explicados:

### **SERVER MEMBERS INTENT**
- **Necessário para**: Verificar cargos (VIP, Staff)
- **Usado em**: Validação de permissões
- **Comandos afetados**: Todos que verificam cargo

### **MESSAGE CONTENT INTENT**
- **Necessário para**: Ler conteúdo das mensagens
- **Usado em**: Formulário de parceria
- **Funcionalidade**: Capturar respostas do usuário

### **GUILDS** (sempre habilitado)
- **Automático**: Não precisa habilitar
- **Função**: Acesso básico aos servidores

## ⚠️ Avisos Importantes:

### 🔐 Verificação Discord
- Bots com **75+ servidores** precisam de verificação
- **MESSAGE CONTENT** tem restrições em bots grandes
- Para desenvolvimento: sem problemas

### 🚀 Após Habilitar:
1. ✅ **Salve** as configurações
2. 🔄 **Reinicie** o bot no Railway
3. 📋 **Verifique** os logs
4. 🧪 **Teste** os comandos

## 🛠️ Se Ainda Não Funcionar:

### Opção 1: Intents Mínimos
Modifique o código para usar apenas intents básicos:

```javascript
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});
```

### Opção 2: Verificar Token
- Token pode estar inválido
- Regenere no Developer Portal
- Atualize no Railway

### Opção 3: Verificar Permissões
- Bot precisa estar no servidor
- Permissões corretas no servidor
- Não conflito com outros bots

## 📊 Checklist Rápido:

- [ ] SERVER MEMBERS INTENT habilitado
- [ ] MESSAGE CONTENT INTENT habilitado  
- [ ] Configurações salvas no Discord
- [ ] Bot reiniciado no Railway
- [ ] Token válido e atualizado
- [ ] Bot presente no servidor
- [ ] Permissões corretas no servidor

## 🎉 Resultado Esperado:

Após configurar corretamente, você deve ver nos logs:
```
Sistema de Tickets BotName#1234 está online!
Comandos do sistema de tickets registrados!
✅ Painel de tickets configurado no canal: #tickets
```

## 🆘 Se Precisar de Ajuda:

1. **Verifique logs** no Railway primeiro
2. **Teste comandos** no Discord
3. **Confirme intents** estão habilitados
4. **Regenere token** se necessário

---

**💡 Dica**: Sempre reinicie o bot após alterar intents no Discord Developer Portal!
