/**
 * 🔐 Validador de Variáveis de Ambiente
 * 
 * Importar no início de cada bot para garantir que todas as
 * variáveis necessárias estão configuradas antes de iniciar.
 * 
 * Uso:
 *   const { validateEnv } = require('./src/utils/validateEnv');
 *   validateEnv(['DISCORD_TOKEN', 'OPENAI_API_KEY']);
 */

require('dotenv').config();

/**
 * Valida se as variáveis de ambiente obrigatórias estão definidas
 * @param {string[]} required - Array de nomes de variáveis obrigatórias
 * @param {Object} options - Opções adicionais
 * @param {boolean} options.exitOnError - Se deve encerrar o processo em caso de erro (default: true)
 * @returns {boolean} - True se todas as variáveis estão definidas
 */
function validateEnv(required, options = { exitOnError: true }) {
    const missing = [];
    const warnings = [];
    
    for (const key of required) {
        const value = process.env[key];
        
        if (!value) {
            missing.push(key);
        } else if (value.includes('seu_') || value.includes('_aqui')) {
            warnings.push(`⚠️  ${key} parece ser um placeholder (${value.substring(0, 20)}...)`);
        }
    }
    
    // Mostrar warnings
    if (warnings.length > 0) {
        console.log('\n⚠️  AVISOS DE CONFIGURAÇÃO:');
        warnings.forEach(w => console.log(`   ${w}`));
        console.log('');
    }
    
    // Erros fatais
    if (missing.length > 0) {
        console.error('\n❌ ERRO FATAL: Variáveis de ambiente obrigatórias não definidas:\n');
        missing.forEach(key => {
            console.error(`   • ${key}`);
        });
        console.error('\n📋 Copie .env.example para .env e preencha os valores.\n');
        
        if (options.exitOnError) {
            process.exit(1);
        }
        return false;
    }
    
    return true;
}

/**
 * Valida formato de token Discord
 * @param {string} token - Token a validar
 * @returns {boolean}
 */
function isValidDiscordToken(token) {
    if (!token) return false;
    // Tokens Discord têm 3 partes separadas por ponto
    const parts = token.split('.');
    return parts.length === 3 && parts[0].length > 10;
}

/**
 * Valida e sanitiza URL
 * @param {string} url - URL a validar
 * @returns {boolean}
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Obtém variável com fallback
 * @param {string} key - Nome da variável
 * @param {*} defaultValue - Valor padrão
 * @returns {*}
 */
function getEnv(key, defaultValue = null) {
    return process.env[key] || defaultValue;
}

/**
 * Obtém variável obrigatória (lança erro se não existir)
 * @param {string} key - Nome da variável
 * @returns {string}
 */
function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
    }
    return value;
}

module.exports = {
    validateEnv,
    isValidDiscordToken,
    isValidUrl,
    getEnv,
    requireEnv
};
