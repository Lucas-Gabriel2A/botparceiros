-- ═══════════════════════════════════════════════════════════════════════════
-- 🗄️ COREIA DISCORD BOTS - DATABASE SCHEMA
-- PostgreSQL (Railway)
-- ═══════════════════════════════════════════════════════════════════════════

-- Guild Configs Table - Configurações por servidor
CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(20) PRIMARY KEY,
    automod_channel VARCHAR(20),
    prohibited_words TEXT[] DEFAULT '{}',
    vip_category_id VARCHAR(20),
    vip_role_id VARCHAR(20),
    welcome_channel_id VARCHAR(20),
    leave_channel_id VARCHAR(20),
    logs_channel_id VARCHAR(20),
    staff_role_id VARCHAR(20),

    -- Configurações Welcome/Leave
    welcome_message TEXT DEFAULT 'Bem-vindo ao servidor {user}!',
    leave_message TEXT DEFAULT '{user} saiu do servidor.',
    autorole_id VARCHAR(20),

    -- Configurações AutoMod
    automod_links_enabled BOOLEAN DEFAULT false,
    automod_caps_enabled BOOLEAN DEFAULT false,
    automod_spam_enabled BOOLEAN DEFAULT false,
    
    -- Configurações CoreIA (SaaS)
    ia_enabled BOOLEAN DEFAULT true,
    ia_channel_id VARCHAR(20),
    ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreIA. Personalidade Única.',
    ia_admin_roles TEXT[] DEFAULT '{}',
    ia_voice_enabled BOOLEAN DEFAULT true,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log Table - Registro de ações de moderação
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id VARCHAR(20),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Private Calls Table - Salas VIP ativas (opcional, para recuperação)
CREATE TABLE IF NOT EXISTS private_calls (
    channel_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    owner_id VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    member_limit INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tickets Table - Tickets ativos
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) UNIQUE,
    user_id VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_audit_log_guild ON audit_log(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_private_calls_guild ON private_calls(guild_id);
CREATE INDEX IF NOT EXISTS idx_private_calls_owner ON private_calls(owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- 🔧 VIEWS (Consultas úteis)
-- ═══════════════════════════════════════════════════════════════════════════

-- Estatísticas de moderação por servidor
CREATE OR REPLACE VIEW moderation_stats AS
SELECT 
    guild_id,
    action,
    COUNT(*) as total,
    DATE_TRUNC('day', created_at) as date
FROM audit_log
GROUP BY guild_id, action, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Tickets abertos por servidor
CREATE OR REPLACE VIEW open_tickets AS
SELECT * FROM tickets WHERE status = 'open';
