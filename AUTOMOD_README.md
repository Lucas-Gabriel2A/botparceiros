# 🤖 Bot de AutoModeração

Sistema avançado de moderação automática para Discord com configuração dinâmica.

## ✨ Funcionalidades

- 🚫 **Detecção de palavras proibidas** em tempo real
- 📝 **Configuração dinâmica** de canais e palavras
- 📊 **Logs detalhados** de ações de moderação
- 💾 **Persistência completa** com SQLite
- ⚡ **Moderação instantânea** com remoção automática

## 🔧 Comandos Disponíveis

### Configuração de Canal
```
/set-moderation-channel canal:#canal
```
Define o canal onde a automoderação irá atuar.

### Gerenciamento de Palavras Proibidas
```
/add-prohibited-word palavra:palavrão
```
Adiciona uma palavra à lista de proibidas.

```
/remove-prohibited-word palavra:palavrão
```
Remove uma palavra da lista de proibidas.

```
/list-prohibited-words
```
Lista todas as palavras proibidas configuradas.

```
/clear-prohibited-words
```
Remove todas as palavras proibidas (reset total).

## ⚙️ Como Funciona

1. **Configure o canal**: Use `/set-moderation-channel` para definir onde o bot irá moderar
2. **Adicione palavras**: Use `/add-prohibited-word` para cada palavra proibida
3. **Pronto!**: O bot monitora automaticamente todas as mensagens no canal configurado

## 🚨 Ações de Moderação

Quando uma palavra proibida é detectada:
- ❌ **Mensagem deletada** automaticamente
- 📩 **DM enviado** ao usuário avisando sobre a violação
- 📝 **Log registrado** no banco de dados
- 📊 **Log no console** para monitoramento

## 🔄 **Atualização de Comandos**

Se comandos antigos ainda aparecem (`/remover`, `/setup-tickets`, etc.):
1. Execute o bot uma vez para limpar comandos antigos
2. Aguarde 1-2 minutos
3. Reinicie o Discord (Ctrl + R)
4. Os comandos corretos aparecerão:
   - `/set-moderation-channel`
   - `/add-prohibited-word`
   - `/remove-prohibited-word`
   - `/list-prohibited-words`
   - `/clear-prohibited-words`

## 🔒 Permissões Necessárias

O bot precisa das seguintes permissões:
- ✅ Ler mensagens
- ✅ Deletar mensagens
- ✅ Enviar mensagens
- ✅ Usar comandos slash

## 📊 Logs e Monitoramento

Todas as ações são registradas em:
- **Console**: Logs em tempo real
- **Banco de dados**: Histórico completo de moderações
- **DMs**: Avisos aos usuários

## 🛠️ Configuração Técnica

### Variáveis de Ambiente
```env
DISCORD_TOKEN_AUTOMOD=SEU_TOKEN_AQUI
CLIENT_ID_AUTOMOD=SEU_CLIENT_ID_AQUI
```

### Banco de Dados
- **Arquivo**: `data/automod_data.json`
- **Estrutura**:
  ```json
  {
    "channels": {
      "guildId": "channelId"
    },
    "words": {
      "guildId": ["word1", "word2"]
    },
    "logs": [
      {
        "guildId": "string",
        "userId": "string",
        "channelId": "string",
        "messageContent": "string",
        "violationType": "prohibited_word",
        "actionTaken": "message_deleted",
        "timestamp": "ISO string"
      }
    ]
  }
  ```

## 🚀 Deploy

### Railway
1. Crie um novo serviço
2. Start Command: `node botautomod.js`
3. Configure as variáveis de ambiente
4. O volume persistente já está configurado

### Local
```bash
npm install
npm run start:automod
```

## 📋 Exemplo de Uso

1. Configure o canal:
   ```
   /set-moderation-channel canal:#chat-geral
   ```

2. Adicione palavras proibidas:
   ```
   /add-prohibited-word palavra:palavrão1
   /add-prohibited-word palavra:palavrão2
   ```

3. Verifique a lista:
   ```
   /list-prohibited-words
   ```

4. O bot começará a moderar automaticamente!

## ⚠️ Notas Importantes

- Use um **bot separado** para automoderação
- Configure as permissões corretamente
- Teste em um canal de teste primeiro
- Monitore os logs regularmente
- Palavras são verificadas em **minúsculas** (case-insensitive)

## 🔧 Manutenção

### Limpeza de Logs
```sql
DELETE FROM moderation_logs WHERE timestamp < datetime('now', '-30 days');
```

### Backup do Banco
O volume da Railway já faz backup automático.

## 🔧 Troubleshooting

### Comandos Antigos Ainda Aparecem
```bash
# Execute o bot para limpar comandos antigos
npm run start:automod

# Aguarde 1-2 minutos
# Reinicie o Discord (Ctrl + R)
```

### Bot Não Responde
- ✅ Verifique se o TOKEN está correto
- ✅ Verifique se o bot tem permissões no servidor
- ✅ Verifique se o canal de moderação está configurado

### Palavras Não São Detectadas
- ✅ Use `/list-prohibited-words` para verificar
- ✅ Palavras são verificadas em minúsculas
- ✅ Configure o canal com `/set-moderation-channel`

### Erro de Permissões
- ✅ Bot precisa de permissões para deletar mensagens
- ✅ Usuário precisa de permissões de gerenciamento</content>
<parameter name="filePath">c:\Users\lucas\OneDrive\Documentos\Nexstar\AUTOMOD_README.md