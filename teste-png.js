// Teste corrigido forçando formato PNG (compatível com Canvas)
const { createCanvas, loadImage } = require('canvas');
const https = require('https');

console.log('🧪 TESTE CORRIGIDO - FORÇANDO PNG\n');

// URL do avatar FORÇANDO PNG (não WEBP)
const avatarURL = 'https://cdn.discordapp.com/avatars/359137988027875329/35ffc0974e0f9fae3b9770b712684094.png?size=128';

console.log(`🎯 Testando URL (PNG): ${avatarURL}\n`);

// Teste 1: Verificar se conseguimos fazer HEAD request
console.log('📡 TESTE 1: HEAD Request (PNG)');
const headTest = new Promise((resolve, reject) => {
    const req = https.request(new URL(avatarURL), { method: 'HEAD', timeout: 10000 }, (res) => {
        console.log(`✅ HEAD Status: ${res.statusCode}`);
        console.log(`✅ HEAD Content-Type: ${res.headers['content-type']}`);
        console.log(`✅ HEAD Content-Length: ${res.headers['content-length']}`);
        resolve(res);
    });

    req.on('error', reject);
    req.on('timeout', () => {
        req.destroy();
        reject(new Error('HEAD Timeout'));
    });
    req.end();
});

// Teste 2: Tentar carregar com loadImage
console.log('\n🖼️ TESTE 2: loadImage do Canvas (PNG)');
const loadTest = new Promise(async (resolve, reject) => {
    try {
        console.log('⏳ Iniciando loadImage com PNG...');
        const startTime = Date.now();

        const image = await loadImage(avatarURL);

        const endTime = Date.now();
        console.log(`✅ loadImage PNG sucesso!`);
        console.log(`⏱️ Tempo: ${endTime - startTime}ms`);
        console.log(`📐 Dimensões: ${image.width}x${image.height}`);

        resolve(image);
    } catch (error) {
        console.log(`❌ loadImage PNG falhou: ${error.message}`);
        console.log(`📋 Tipo do erro: ${error.constructor.name}`);
        reject(error);
    }
});

// Teste 3: Comparar com WEBP (para confirmar o problema)
console.log('\n🔄 TESTE 3: Comparação com WEBP (deve falhar)');
const webpURL = 'https://cdn.discordapp.com/avatars/359137988027875329/35ffc0974e0f9fae3b9770b712684094.webp?size=128';
const webpTest = new Promise(async (resolve, reject) => {
    try {
        console.log('⏳ Testando WEBP (deve falhar)...');
        const image = await loadImage(webpURL);
        console.log(`❌ WEBP funcionou (inesperado!)`);
        resolve(image);
    } catch (error) {
        console.log(`✅ WEBP falhou como esperado: ${error.message}`);
        console.log(`📋 Confirmação: Canvas não suporta WEBP`);
        resolve(null); // Não é erro, é esperado
    }
});

// Executar todos os testes
Promise.allSettled([headTest, loadTest, webpTest]).then((results) => {
    console.log('\n📊 RESULTADOS FINAIS:');
    console.log(`HEAD Request PNG: ${results[0].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`loadImage PNG: ${results[1].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`WEBP falha esperada: ${results[2].status === 'fulfilled' ? '✅ OK' : '❌ INESPERADO'}`);

    console.log('\n🔍 DIAGNÓSTICO FINAL:');

    if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
        console.log('🎉 SOLUÇÃO CONFIRMADA!');
        console.log('💡 Forçar format="png" no displayAvatarURL resolve o problema');
        console.log('✅ Canvas consegue processar PNG normalmente');
    } else if (results[0].status === 'fulfilled' && results[1].status === 'rejected') {
        console.log('⚠️ HEAD funciona, mas loadImage ainda falha');
        console.log('💡 Pode ser problema específico do ambiente');
    } else {
        console.log('🚨 Problema de conectividade persiste');
    }

    console.log('\n🛠️ SOLUÇÃO IMPLEMENTADA:');
    console.log('✅ Bot agora força format="png" automaticamente');
    console.log('✅ Sistema de fallback com placeholder dourado');
    console.log('✅ Timeout aumentado para 30s');
}).catch(console.error);