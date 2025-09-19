// Script de teste para verificar conectividade com CDN do Discord
const https = require('https');

console.log('🧪 TESTANDO CONECTIVIDADE COM CDN DO DISCORD...\n');

// Teste 1: Avatar de exemplo
const testAvatarURL = 'https://cdn.discordapp.com/avatars/359137988027875329/35ffc0974e0f9fae3b9770b712684094.webp?size=128';
console.log(`🖼️ Testando avatar: ${testAvatarURL}`);

const test1 = new Promise((resolve, reject) => {
    const req = https.request(new URL(testAvatarURL), { method: 'HEAD', timeout: 10000 }, (res) => {
        console.log(`✅ Status: ${res.statusCode}`);
        console.log(`✅ Content-Type: ${res.headers['content-type']}`);
        console.log(`✅ Content-Length: ${res.headers['content-length']}`);
        resolve(true);
    });

    req.on('error', (error) => {
        console.log(`❌ Erro: ${error.message}`);
        reject(error);
    });

    req.on('timeout', () => {
        console.log(`⏰ Timeout (10s)`);
        req.destroy();
        reject(new Error('Timeout'));
    });

    req.end();
});

// Teste 2: Avatar padrão
const testDefaultURL = 'https://cdn.discordapp.com/embed/avatars/5.png';
console.log(`\n🖼️ Testando avatar padrão: ${testDefaultURL}`);

const test2 = new Promise((resolve, reject) => {
    const req = https.request(new URL(testDefaultURL), { method: 'HEAD', timeout: 10000 }, (res) => {
        console.log(`✅ Status: ${res.statusCode}`);
        console.log(`✅ Content-Type: ${res.headers['content-type']}`);
        resolve(true);
    });

    req.on('error', (error) => {
        console.log(`❌ Erro: ${error.message}`);
        reject(error);
    });

    req.on('timeout', () => {
        console.log(`⏰ Timeout (10s)`);
        req.destroy();
        reject(new Error('Timeout'));
    });

    req.end();
});

// Executar testes
Promise.allSettled([test1, test2]).then((results) => {
    console.log('\n📊 RESULTADOS DOS TESTES:');
    console.log(`Avatar customizado: ${results[0].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);
    console.log(`Avatar padrão: ${results[1].status === 'fulfilled' ? '✅ OK' : '❌ FALHA'}`);

    if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        console.log('\n🚨 PROBLEMA DE REDE DETECTADO!');
        console.log('💡 Possíveis soluções:');
        console.log('   - Verificar firewall/proxy');
        console.log('   - Testar em outro servidor de hospedagem');
        console.log('   - Verificar limitações do plano atual');
    } else if (results[0].status === 'rejected') {
        console.log('\n⚠️ Apenas avatar customizado falhando');
        console.log('💡 O bot funcionará com avatar padrão ou placeholder');
    } else {
        console.log('\n✅ Conectividade OK!');
    }
});