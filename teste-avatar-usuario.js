// Teste específico do avatar do usuário
const { createCanvas, loadImage } = require('canvas');
const https = require('https');

console.log('🖼️ TESTANDO AVATAR ESPECÍFICO DO USUÁRIO\n');

// Avatar do usuário lucasg__dev
const userAvatarURL = 'https://cdn.discordapp.com/avatars/590377932141363220/575ac269ba19c957372fdf8b5df3a4a5.png?size=128';

console.log(`🎯 Testando avatar do usuário: ${userAvatarURL}\n`);

// Teste 1: HEAD request
console.log('📡 TESTE 1: HEAD Request');
const headTest = new Promise((resolve, reject) => {
    const req = https.request(new URL(userAvatarURL), { method: 'HEAD', timeout: 10000 }, (res) => {
        console.log(`✅ Status: ${res.statusCode}`);
        console.log(`✅ Content-Type: ${res.headers['content-type']}`);
        console.log(`✅ Content-Length: ${res.headers['content-length']}`);
        resolve(res);
    });

    req.on('error', reject);
    req.on('timeout', () => {
        req.destroy();
        reject(new Error('HEAD Timeout'));
    });
    req.end();
});

// Teste 2: loadImage
console.log('\n🖼️ TESTE 2: loadImage (PNG)');
const loadTest = new Promise(async (resolve, reject) => {
    try {
        console.log('⏳ Carregando avatar PNG...');
        const startTime = Date.now();

        const image = await loadImage(userAvatarURL);

        const endTime = Date.now();
        console.log(`✅ Sucesso! Tempo: ${endTime - startTime}ms`);
        console.log(`📐 Dimensões: ${image.width}x${image.height}`);

        resolve(image);
    } catch (error) {
        console.log(`❌ Falhou: ${error.message}`);
        reject(error);
    }
});

// Teste 3: Comparar com WEBP
console.log('\n🔄 TESTE 3: Comparação com WEBP');
const webpURL = 'https://cdn.discordapp.com/avatars/590377932141363220/575ac269ba19c957372fdf8b5df3a4a5.webp?size=128';
const webpTest = new Promise(async (resolve, reject) => {
    try {
        console.log('⏳ Testando WEBP...');
        const image = await loadImage(webpURL);
        console.log(`❌ WEBP funcionou (inesperado!)`);
        resolve(image);
    } catch (error) {
        console.log(`✅ WEBP falhou como esperado: ${error.message}`);
        resolve(null);
    }
});

// Executar testes
Promise.allSettled([headTest, loadTest, webpTest]).then((results) => {
    console.log('\n📊 RESULTADOS PARA O AVATAR DO USUÁRIO:');
    console.log(`HEAD Request: ${results[0].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`loadImage PNG: ${results[1].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`WEBP falha: ${results[2].status === 'fulfilled' ? '✅ OK' : '❌ INESPERADO'}`);

    console.log('\n🎯 CONCLUSÃO:');
    if (results[1].status === 'fulfilled') {
        console.log('✅ O avatar do usuário CARREGA normalmente!');
        console.log('💡 O preview deve mostrar o avatar real');
    } else {
        console.log('❌ Mesmo o avatar do usuário falha');
        console.log('💡 Deve usar placeholder dourado');
    }
}).catch(console.error);