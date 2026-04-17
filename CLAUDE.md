# Manual Definitivo de Boas Práticas, Qualidade e Segurança — CoreIA

Este manual foi concebido para ser o pilar norteador de todos os desenvolvedores e agentes IA atuando no repositório do **CoreIA**. Seguir estas premissas orgânicas e técnicas garante um ecossistema seguro, robusto, performático e à prova de falhas na arquitetura Fullstack (Next.js + Discord.js).

---

## 🛡️ 1. Pilar de Segurança (Prevenção OWASP)

O aspecto mais importante para uma plataforma que gerencia milhares de comunidades é fechar suas portas.

### 1.1 IDOR (Insecure Direct Object Reference)
Sempre suspeite dos IDs enviados pelo cliente (`formData`, params de API, etc.).
- **Regra de Ouro:** Nunca atualize uma configuração (Ex: `updateGuild(guildId)`) sem antes atestar que a `Session` (usuário que fez a requisição) possui os privilégios exatos sobre aquele `guildId`.
- **Implementação:** Use utilitários como `verifyUserGuildAccess(guildId)` no ápice da rota antes de encostar no banco de dados.

### 1.2 Injeção de Dados e Tipagens Fracas
- **Evite o `any`**: Ao modelar schemas (especialmente com Supabase/Postgres), não passe estruturas polimórficas.
- **Validação com Bibliotecas:** Substitua o velho `try { JSON.parse() }` por um validador de schema real. Recomendamos a adoção do **Zod**:
  ```typescript
  import { z } from "zod";
  
  const RoleArraySchema = z.array(z.string()).default([]);
  
  // Na Action
  const bypassRoles = RoleArraySchema.parse(JSON.parse(formData.get("bypassRoles") || "[]"));
  ```

### 1.3 Vazamento de Informações Sensíveis (Data Leakage)
- Códigos de erro quebram o fluxo? Mostre linhas amigáveis como `"Erro ao salvar configuração"`.
- **Nunca devolva Stack Traces** de bibliotecas internas, SQL Errors ou diretórios do File System para o `NextResponse` ou para mensagens no chat do Discord. Guarde a stack original nos Logs (ex: `logger.error(...)`).

---

## 🧼 2. Pilar de Qualidade de Código (Clean Code e TypeScript)

### 2.1 Separação de Responsabilidades (SRP)
- **Ações vs Casos de Uso:** O Next.js deve apenas orquestrar formulários e invocar Lógicas de Negócios. Não faça Queries complexas de 200 linhas dentro de uma Server Action (`route.ts`).
- **Arquitetura Service:** Crie arquivos `.service.ts` para cuidar das regras ricas e reusáveis. (Exemplo: o código de IA ou de auto-moderação devem viver na pasta `services`, independentes de serem invocados via Cron, via Webhook ou por Mensagem do Bot).

### 2.2 Tratamento Previsível de Erros (Graceful Degradation)
Trate os fluxos para nunca derrubarem a aplicação global. No bot do Discord, um erro ao mandar uma `DM` para o usuário que tem mensagens diretas bloqueadas não deveria causar _crash_ no evento de mensagem inteiro.
```typescript
// Certo
try {
  await member.timeout(10000);
} catch (error) {
  logger.warn('Usuário intocável via Discord Role Hierarchy', { id: member.id });
}
```

### 2.3 Constants e Magic Strings
Extraia valores soltos do seu código que controlem limite, tempo ou status:
```typescript
// Evite
if (mensagens > 5)

// Recomendado
const SPAM_MAX_MESSAGES = 5;
if (mensagens > SPAM_MAX_MESSAGES)
```

---

## 🤖 3. Pilar de Infraestrutura para Bot Discord (Discord.js)

### 3.1 Proteção contra "Event Leak" Rate Limit (Discord 429)
Bots de alto volume são banidos diariamente da API caso percam o controle.
- **Cache Local:** Use estruturas de memórias voláteis nativas da linguagem (ex: classes Javascript `Map`) caso o dado do processamento tenha utilidade microscópica curta, como rastrear os últimos 5 segundos de Anti-Spam por usuário. 
- **Limpeza do Cache:** Estruturas de memórias como Sets ou Maps *DEVEM* ser limpadas ativamente ou associadas a políticas TTL (`setTimeout` cleanups) para evitar Memory Leaks mortais que reiniciam o cluster da Node.js do bot.

### 3.2 Otimização de Eventos
- Listeners de Discord como `messageCreate` rodam **literalmente milhões de vezes em horários de pico**. Funções atreladas a ele devem ser estritas, enxutas e de curto circuito rápido.
- **Descarte Rápido (Early Return):**
  ```typescript
  client.on('messageCreate', (message) => {
      // 1. Descartar bots instantaneamente (Custo 0 CPU)
      if (message.author.bot) return;
      
      // 2. Descartar se for DM
      if (!message.guild) return;

      // 3. Só aqui fará lógica pesada.
  })
  ```
- Cubra edições de mensagem. Regras criadas para `messageCreate` precisam refletir proteção nativa em `messageUpdate`, para mitigar fraudes por atraso de edição.

---

## 📋 4. Pilar de Check-in (Revisão Contínua)

Antes de aprovar um PR ou injetar uma nova funcionalidade no ecossistema, responda às 4 perguntas de ouro:
1. **Confiança:** Esta rota/comando valida *quem* está solicitando a ação?
2. **Resiliência:** Se o servidor do Mercado Pago, OpenAI ou Stripe falhar agora, a plataforma avisa suavemente o cliente ou a página quebra?
3. **Escala:** Esse fluxo aguenta 10 mil usuários clicando ao mesmo tempo? Há buscas redundantes no Banco de Dados que podem ir para cache?
4. **Clean Code:** Os meus arquivos TypeScript continuam pequenos e focados em apenas uma coisa?

> **Este arquivo deve ser vivo!** À medida em que o CoreIA cresce e descobre novas complexidades de arquitetura (e.g. microsserviços, Kafka, Sharding de Bot), este manual deverá ser incrementado.
