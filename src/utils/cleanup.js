/**
 * 🧹 Script de Limpeza de Arquivos Temporários
 * 
 * Remove arquivos .pcm, .tmp e outros temporários antigos.
 * Pode ser executado manualmente ou via cron.
 * 
 * Uso:
 *   node src/utils/cleanup.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const MAX_AGE_HOURS = 1; // Arquivos mais velhos que isso serão deletados

const PATTERNS = [
    /^temp_audio_.*\.pcm$/,
    /.*\.tmp$/,
    /.*\.temp$/
];

function cleanup() {
    console.log('🧹 Iniciando limpeza de arquivos temporários...\n');
    
    const now = Date.now();
    const maxAge = MAX_AGE_HOURS * 60 * 60 * 1000;
    let deletedCount = 0;
    let freedBytes = 0;
    
    try {
        const files = fs.readdirSync(ROOT_DIR);
        
        for (const file of files) {
            // Verifica se o arquivo corresponde a algum padrão
            const matchesPattern = PATTERNS.some(pattern => pattern.test(file));
            
            if (matchesPattern) {
                const filePath = path.join(ROOT_DIR, file);
                
                try {
                    const stats = fs.statSync(filePath);
                    const age = now - stats.mtimeMs;
                    
                    if (age > maxAge) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        freedBytes += stats.size;
                        console.log(`   ✓ Deletado: ${file} (${formatBytes(stats.size)})`);
                    }
                } catch (err) {
                    console.error(`   ✗ Erro ao processar ${file}:`, err.message);
                }
            }
        }
        
    } catch (err) {
        console.error('❌ Erro ao ler diretório:', err.message);
        process.exit(1);
    }
    
    console.log(`\n✅ Limpeza concluída!`);
    console.log(`   Arquivos deletados: ${deletedCount}`);
    console.log(`   Espaço liberado: ${formatBytes(freedBytes)}\n`);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Executar se chamado diretamente
if (require.main === module) {
    cleanup();
}

module.exports = { cleanup };
