const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Date Bot'
  });
});

// Página principal
app.get('/', async (req, res) => {
  try {
    let qrCodeHtml = '<div style="color: red; font-weight: bold;">Aguardando QR Code...</div>';
    
    if (global.currentQR) {
      qrCodeHtml = `
        <img src="${global.currentQR}" alt="QR Code WhatsApp" 
             style="max-width: 300px; border: 2px solid #333; padding: 10px; background: white;">
      `;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>WhatsApp Date Bot</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
            }
            .container { 
                background: rgba(255,255,255,0.95); 
                padding: 30px; 
                border-radius: 15px; 
                color: #333;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .qrcode-container { 
                text-align: center; 
                margin: 20px 0; 
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            .instructions { 
                background: #e9ecef; 
                padding: 20px; 
                border-radius: 10px; 
                margin: 20px 0;
            }
            .status { 
                padding: 10px; 
                border-radius: 5px; 
                font-weight: bold;
                text-align: center;
            }
            .online { background: #d4edda; color: #155724; }
            .offline { background: #f8d7da; color: #721c24; }
            .code { 
                background: #2d3748; 
                color: #e2e8f0; 
                padding: 15px; 
                border-radius: 5px; 
                font-family: monospace;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📅 WhatsApp Date Bot</h1>
            <p><strong>Status:</strong> <span class="status ${global.clientReady ? 'online' : 'offline'}">
                ${global.clientReady ? '✅ CONECTADO' : '⏳ AGUARDANDO QR CODE'}
            </span></p>
            
            <div class="qrcode-container">
                <h3>📱 QR Code para Conectar</h3>
                ${qrCodeHtml}
                <p><small>Atualize a página se o QR Code não aparecer</small></p>
            </div>

            <div class="instructions">
                <h3>📋 Como Conectar:</h3>
                <ol>
                    <li>Abra o WhatsApp no celular</li>
                    <li>Toque em ⋮ (Android) ou ⚙️ (iOS)</li>
                    <li>Vá em "Dispositivos conectados"</li>
                    <li>Toque em "Conectar um dispositivo"</li>
                    <li>Escaneie o QR Code acima</li>
                </ol>
            </div>

            <div class="instructions">
                <h3>📅 Comandos do Bot:</h3>
                <div class="code">
!date - Mostra a data e hora atual
!ajuda - Mostra esta ajuda
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <a href="/health" style="color: #667eea; text-decoration: none;">🔍 Ver Status Técnico</a>
            </div>
        </div>

        <script>
            // Auto-atualizar a cada 10 segundos
            setTimeout(() => {
                location.reload();
            }, 10000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    res.status(500).send('Erro ao carregar página');
  }
});

// Sistema de logs
global.appLogs = [];
const addLog = (message, type = 'info') => {
  const timestamp = new Date().toLocaleString('pt-BR');
  const logEntry = `[${timestamp}] ${message}`;
  global.appLogs.push(logEntry);
  
  // Manter apenas últimos 100 logs
  if (global.appLogs.length > 100) {
    global.appLogs.shift();
  }
  
  console.log(logEntry);
};

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
  addLog('✅ BOT CONECTADO AO WHATSAPP!', 'success');
  global.clientReady = true;
});

client.on('qr', async (qr) => {
  addLog('📱 QR Code gerado - Aguardando escaneamento...', 'warning');
  
  try {
    const qrcode = require('qrcode');
    const qrImage = await qrcode.toDataURL(qr);
    global.currentQR = qrImage;
    addLog('🖼️ QR Code convertido para imagem web', 'success');
  } catch (error) {
    addLog('❌ Erro ao gerar QR Code: ' + error.message, 'error');
  }
});

client.on('authenticated', () => {
  addLog('✅ Autenticado com sucesso!', 'success');
});

client.on('auth_failure', (msg) => {
  addLog('❌ Falha na autenticação: ' + msg, 'error');
});

client.on('disconnected', (reason) => {
  addLog('❌ Desconectado: ' + reason, 'error');
  global.clientReady = false;
  
  setTimeout(() => {
    addLog('🔄 Tentando reconectar...', 'warning');
    client.initialize();
  }, 10000);
});

// ==================== COMANDOS DO BOT ====================

client.on('message_create', async (message) => {
  // Ignorar mensagens do próprio bot
  if (message.fromMe) {
    return;
  }
  
  // Ignorar grupos e status
  if (message.from.includes('@g.us') || message.from.includes('status')) {
    return;
  }

  const texto = message.body ? message.body.trim() : '';
  const nomeUsuario = message._data.notifyName || 'Usuário';

  addLog(`📨 Mensagem de ${nomeUsuario}: "${texto}"`);

  // Comando de ajuda
  if (texto === '!ajuda' || texto === '!help') {
    const ajudaMsg = `📅 *BOT DE DATA E HORA* 🤖

*Comandos Disponíveis:*
• !date - Mostra a data e hora atual
• !ajuda - Mostra esta mensagem

*Exemplo:* 
Envie "!date" para ver a data e hora atual`;

    await message.reply(ajudaMsg);
    addLog(`✅ Ajuda enviada para ${nomeUsuario}`);
    return;
  }

  // Comando de data
  if (texto === '!date') {
    try {
      const agora = new Date();
      
      // Formatando a data em português brasileiro
      const opcoes = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
      };
      
      const dataFormatada = agora.toLocaleDateString('pt-BR', opcoes);
      const horaFormatada = agora.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const dataResposta = `📅 *DATA E HORA ATUAL*

🌍 *Data:* ${dataFormatada}
⏰ *Hora:* ${horaFormatada}
📍 *Fuso Horário:* America/Sao_Paulo (BRT)

*Informações Técnicas:*
• *Timestamp:* ${agora.getTime()}
• *ISO:* ${agora.toISOString()}
• *UTC:* ${agora.toUTCString()}`;

      await message.reply(dataResposta);
      addLog(`✅ Data enviada para ${nomeUsuario}: ${dataFormatada} ${horaFormatada}`);
      
    } catch (error) {
      addLog(`❌ Erro ao processar data: ${error.message}`);
      await message.reply('❌ *Erro ao obter data atual!*');
    }
    return;
  }

  // Responder a outras mensagens
  if (texto) {
    try {
      await message.reply(`🤖 Olá ${nomeUsuario}! Eu sou um bot de data e hora.\n\n💡 Digite *!date* para ver a data e hora atual ou *!ajuda* para ajuda.`);
      addLog(`✅ Resposta geral enviada para ${nomeUsuario}`);
    } catch (error) {
      addLog(`❌ Erro ao responder: ${error.message}`, 'error');
    }
    return;
  }
});

// ==================== INICIALIZAÇÃO ====================

addLog('🚀 INICIANDO WHATSAPP DATE BOT...');
addLog(`🌐 Servidor iniciando na porta ${PORT}`);
addLog(`⏰ Início: ${new Date().toLocaleString('pt-BR')}`);

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Inicializar cliente WhatsApp
client.initialize();

// Handlers de processo
process.on('SIGINT', () => {
  addLog('🔄 Desligando graciosamente...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  addLog('🔄 Recebido SIGTERM, desligando...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  addLog(`❌ Promise rejeitada não tratada: ${reason}`, 'error');
});

process.on('uncaughtException', (error) => {
  addLog(`💥 Erro crítico: ${error.message}`, 'error');
  process.exit(1);
});
