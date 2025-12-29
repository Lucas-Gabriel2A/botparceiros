// Script de debug para testar automoderação
const fs = require('fs-extra');
const path = require('path');

// Simular dados
const automodDataPath = path.join(__dirname, 'data', 'automod_data.json');

console.log('🔍 DEBUG - Verificando configuração da automoderação\n');

// Verificar se arquivo existe
if (fs.existsSync(automodDataPath)) {
    const data = fs.readJsonSync(automodDataPath);
    console.log('📁 Arquivo encontrado:', automodDataPath);
    console.log('📊 Dados atuais:', JSON.stringify(data, null, 2));
} else {
    console.log('❌ Arquivo não encontrado:', automodDataPath);
}

// Simular verificação de palavra
console.log('\n🧪 TESTE - Simulando moderação:');
const testMessage = 'essa mensagem tem uma palavra proibida';
const prohibitedWords = ['proibida', 'spam'];

console.log(`💬 Mensagem: "${testMessage}"`);
console.log(`🚫 Palavras proibidas: ${prohibitedWords.join(', ')}`);

const messageLower = testMessage.toLowerCase();
let found = false;

for (const word of prohibitedWords) {
    if (messageLower.includes(word.toLowerCase())) {
        console.log(`🚨 PALAVRA ENCONTRADA: "${word}"`);
        found = true;
        break;
    }
}

if (!found) {
    console.log('✅ Nenhuma palavra proibida encontrada');
}

console.log('\n💡 DICAS:');
console.log('1. Configure o canal com /set-moderation-channel');
console.log('2. Adicione palavras com /add-prohibited-word');
console.log('3. Verifique se o bot tem permissão para deletar mensagens');
console.log('4. Teste em um canal onde o bot tenha acesso');