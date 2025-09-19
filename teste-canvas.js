// Teste avançado com Canvas para diagnosticar problema do loadImage
const { createCanvas, loadImage } = require('canvas');
const https = require('https');

console.log('🧪 TESTE AVANÇADO COM CANVAS\n');

// URL do avatar que estava falhando
const avatarURL = 'https://cdn.discordapp.com/avatars/359137988027875329/35ffc0974e0f9fae3b9770b712684094.webp?size=128';

console.log(`🎯 Testando URL: ${avatarURL}\n`);

// Teste 1: Verificar se conseguimos fazer HEAD request
console.log('📡 TESTE 1: HEAD Request');
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
console.log('\n🖼️ TESTE 2: loadImage do Canvas');
const loadTest = new Promise(async (resolve, reject) => {
    try {
        console.log('⏳ Iniciando loadImage...');
        const startTime = Date.now();

        const image = await loadImage(avatarURL);

        const endTime = Date.now();
        console.log(`✅ loadImage sucesso!`);
        console.log(`⏱️ Tempo: ${endTime - startTime}ms`);
        console.log(`📐 Dimensões: ${image.width}x${image.height}`);

        resolve(image);
    } catch (error) {
        console.log(`❌ loadImage falhou: ${error.message}`);
        console.log(`📋 Tipo do erro: ${error.constructor.name}`);
        reject(error);
    }
});

// Teste 3: Tentar baixar manualmente e depois carregar
console.log('\n📥 TESTE 3: Download manual + loadImage');
const manualTest = new Promise((resolve, reject) => {
    https.get(avatarURL, { timeout: 15000 }, (res) => {
        if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                console.log(`📦 Buffer baixado: ${buffer.length} bytes`);

                // Tentar criar imagem do buffer
                const startTime = Date.now();
                const image = await loadImage(buffer);
                const endTime = Date.now();

                console.log(`✅ loadImage do buffer sucesso!`);
                console.log(`⏱️ Tempo: ${endTime - startTime}ms`);
                console.log(`📐 Dimensões: ${image.width}x${image.height}`);

                resolve(image);
            } catch (error) {
                console.log(`❌ loadImage do buffer falhou: ${error.message}`);
                reject(error);
            }
        });
    }).on('error', reject).on('timeout', () => {
        reject(new Error('Download timeout'));
    });
});

// Executar todos os testes
Promise.allSettled([headTest, loadTest, manualTest]).then((results) => {
    console.log('\n📊 RESULTADOS FINAIS:');
    console.log(`HEAD Request: ${results[0].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`loadImage direto: ${results[1].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`Download + loadImage: ${results[2].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);

    console.log('\n🔍 DIAGNÓSTICO:');

    if (results[0].status === 'rejected') {
        console.log('🚨 Problema de conectividade básica');
    } else if (results[1].status === 'rejected' && results[2].status === 'fulfilled') {
        console.log('⚠️ Problema específico com loadImage de URL');
        console.log('💡 Solução: Usar download manual + buffer');
    } else if (results[1].status === 'rejected' && results[2].status === 'rejected') {
        console.log('🚨 Problema geral de conectividade');
    } else {
        console.log('✅ Tudo funcionando normalmente');
    }
}).catch(console.error);