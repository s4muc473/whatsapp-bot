const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Sistema de logs simples
const log = (message) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`[${timestamp}] ${message}`);
};

log('🚀 INICIANDO WHATSAPP DATE BOT NO TERMINAL...');

// Configuração do WhatsApp Bot
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './sessions'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// ==================== EVENTOS DO BOT ====================

client.on('ready', () => {
    log('✅ BOT CONECTADO AO WHATSAPP!');
});

client.on('qr', (qr) => {
    log('📱 QR CODE GERADO - ESCANEIE COM O WHATSAPP');
    console.log('\n' + '═'.repeat(60));
    
    // Método 1: QR Code compacto (melhor para terminal)
    console.log('\n🔹 QR Code Compacto:');
    qrcode.generate(qr, { small: true });
    
    console.log('\n' + '─'.repeat(60));
    
    // Método 2: Apenas o código para copiar (fallback)
    console.log('\n🔹 Código QR (texto):');
    console.log('Código: ' + qr.substring(0, 50) + '...');
    console.log('(Use este código se o QR visual não funcionar)');
    
    console.log('\n' + '─'.repeat(60));
    
    // Método 3: Instruções claras
    console.log('\n📋 INSTRUÇÕES:');
    console.log('1. Abra o WhatsApp no celular');
    console.log('2. Toque em ⋮ (Android) ou ⚙️ (iOS)');
    console.log('3. Vá em "Dispositivos conectados"');
    console.log('4. Toque em "Conectar um dispositivo"');
    console.log('5. Escaneie o QR Code acima');
    
    console.log('\n' + '═'.repeat(60));
    console.log('⏳ Aguardando escaneamento...\n');
});

client.on('authenticated', () => {
    log('✅ Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
    log('❌ Falha na autenticação: ' + msg);
});

client.on('disconnected', (reason) => {
    log('❌ Desconectado: ' + reason);
    log('🔄 Tentando reconectar em 10 segundos...');
    setTimeout(() => {
        client.initialize();
    }, 10000);
});

// ==================== COMANDOS DO BOT ====================

client.on('message_create', async (message) => {
    // Ignorar mensagens do próprio bot
    if (message.fromMe) return;
    
    // Ignorar grupos e status
    if (message.from.includes('@g.us') || message.from.includes('status')) return;

    const texto = message.body ? message.body.trim() : '';
    const nomeUsuario = message._data.notifyName || 'Usuário';

    log(`📨 Mensagem de ${nomeUsuario}: "${texto}"`);

    // Comando de ajuda
    if (texto === '!ajuda' || texto === '!help') {
        const ajudaMsg = `📅 *BOT DE DATA E HORA* 🤖

*Comandos Disponíveis:*
• !date - Mostra a data e hora atual
• !ajuda - Mostra esta mensagem`;

        await message.reply(ajudaMsg);
        log(`✅ Ajuda enviada para ${nomeUsuario}`);
        return;
    }

    // Comando de data
    if (texto === '!date') {
        try {
            const agora = new Date();
            
            const dataFormatada = agora.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            const horaFormatada = agora.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dataResposta = `📅 *DATA E HORA ATUAL*

🌍 *Data:* ${dataFormatada}
⏰ *Hora:* ${horaFormatada}
📍 *Fuso Horário:* Brasil/Brasília

_Enviado via WhatsApp Date Bot_`;

            await message.reply(dataResposta);
            log(`✅ Data enviada para ${nomeUsuario}: ${dataFormatada} ${horaFormatada}`);
            
        } catch (error) {
            log(`❌ Erro ao processar data: ${error.message}`);
            await message.reply('❌ *Erro ao obter data atual!*');
        }
        return;
    }

    // Responder a outras mensagens
    if (texto) {
        try {
            await message.reply(`🤖 Olá ${nomeUsuario}! Eu sou um bot de data e hora.\n\n💡 Digite *!date* para ver a data e hora atual ou *!ajuda* para ajuda.`);
            log(`✅ Resposta geral enviada para ${nomeUsuario}`);
        } catch (error) {
            log(`❌ Erro ao responder: ${error.message}`);
        }
        return;
    }
});

// ==================== INICIALIZAÇÃO ====================

console.clear();
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║               📅 WHATSAPP DATE BOT TERMINAL              ║');
console.log('║                  Versão 1.0 - Terminal                   ║');
console.log('╚══════════════════════════════════════════════════════════╝');
log('📋 INICIANDO BOT...');
log('💡 Comandos disponíveis: !date, !ajuda');
log('⏰ Aguardando conexão...\n');

client.initialize();

