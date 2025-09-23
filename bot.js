const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const math = require('mathjs');
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
    service: 'WhatsApp Calculator Bot'
  });
});

// Página principal com QR Code
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
        <title>WhatsApp Calculator Bot</title>
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
            <h1>🤖 WhatsApp Calculator Bot</h1>
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
                <h3>🧮 Comandos do Bot:</h3>
                <div class="code">
!ajuda - Mostra esta ajuda<br>
!calc 2 + 3 * 4 - Calculadora<br>
!historico - Seus cálculos<br>
!status - Status do bot
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <a href="/health" style="color: #667eea; text-decoration: none;">🔍 Ver Status Técnico</a> | 
                <a href="/logs" style="color: #667eea; text-decoration: none;">📊 Ver Logs</a>
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

// Endpoint para logs
app.get('/logs', (req, res) => {
  const logs = global.appLogs || ['Sistema iniciado...'];
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Logs do Bot</title>
      <style>
          body { font-family: monospace; background: #1a202c; color: #e2e8f0; padding: 20px; }
          .log { margin: 5px 0; padding: 5px; border-left: 3px solid #4299e1; }
          .error { border-left-color: #f56565; }
          .success { border-left-color: #48bb78; }
          .warning { border-left-color: #ed8936; }
      </style>
  </head>
  <body>
      <h2>📊 Logs do Sistema</h2>
      <div id="logs">${logs.map(log => `<div class="log">${log}</div>`).join('')}</div>
      <script>setTimeout(() => location.reload(), 5000);</script>
  </body>
  </html>
  `;
  res.send(html);
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: https://whatsapp-bot-jh2c.onrender.com`);
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

const historico = new Map();

// ==================== EVENTOS DO BOT ====================

client.on('ready', () => {
  addLog('✅ BOT CONECTADO AO WHATSAPP!', 'success');
  global.clientReady = true;
});

client.on('qr', async (qr) => {
  addLog('📱 QR Code gerado - Aguardando escaneamento...', 'warning');
  
  try {
    // Gerar QR Code como imagem base64
    const qrImage = await qrcode.toDataURL(qr);
    global.currentQR = qrImage;
    
    addLog('🖼️ QR Code convertido para imagem web', 'success');
  } catch (error) {
    addLog('❌ Erro ao gerar QR Code: ' + error.message, 'error');
    
    // Fallback: mostrar QR code como texto simples
    addLog('🔡 QR Code (texto): ' + qr.substring(0, 100) + '...', 'warning');
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
  // 🔥🔥🔥 CORREÇÃO CRÍTICA: IGNORAR MENSAGENS DO PRÓPRIO BOT
  if (message.fromMe) {
    addLog('🔇 Ignorando mensagem do próprio bot', 'warning');
    return;
  }
  
  // Ignorar grupos e status
  if (message.from.includes('@g.us') || message.from.includes('status')) return;
  
  const texto = message.body.trim();
  const usuario = message.from;
  const nomeUsuario = message._data.notifyName || 'Usuário';

  addLog(`📨 Mensagem de ${nomeUsuario}: "${texto}"`);

  // Comando de ajuda
  if (texto === '!ajuda' || texto === '!help') {
    const ajudaMsg = `🧮 *CALCULADORA BOT* 🤖

*Comandos Disponíveis:*
• !calc [expressão] - Calculadora matemática
• !historico - Seus últimos cálculos
• !limpar - Limpa seu histórico
• !status - Status do sistema

*Exemplos:*
!calc 2 + 3 * 4
!calc (10 + 5) / 3
!calc sqrt(16) + 5^2

*Operações:*
+ - * / ^ ( ) sqrt() sin() cos() tan()`;

    await message.reply(ajudaMsg);
    addLog(`✅ Ajuda enviada para ${nomeUsuario}`);
    return;
  }

  // Calculadora
  if (texto.startsWith('!calc ')) {
    try {
      const expressao = texto.replace('!calc ', '').trim();
      addLog(`🧮 Calculando: ${expressao} para ${nomeUsuario}`);
      
      const resultado = math.evaluate(expressao);
      const resultadoFormatado = math.format(resultado, { precision: 10 });
      
      // Salvar no histórico
      if (!historico.has(usuario)) {
        historico.set(usuario, []);
      }
      historico.get(usuario).push({
        expressao,
        resultado: resultadoFormatado,
        data: new Date().toLocaleString('pt-BR')
      });
      
      // Manter apenas últimos 10
      if (historico.get(usuario).length > 10) {
        historico.get(usuario).shift();
      }

      const resposta = `🧮 *Calculadora*\n\n📝 *Expressão:* ${expressao}\n✅ *Resultado:* ${resultadoFormatado}`;
      await message.reply(resposta);
      
      addLog(`✅ Resultado enviado para ${nomeUsuario}: ${expressao} = ${resultadoFormatado}`);
      
    } catch (error) {
      addLog(`❌ Erro no cálculo de ${nomeUsuario}: ${error.message}`);
      await message.reply('❌ *Expressão inválida!*\nUse: !calc 2 + 3 * 4');
    }
    return;
  }

  // Histórico
  if (texto === '!historico') {
    const calculos = historico.get(usuario) || [];
    
    if (calculos.length === 0) {
      await message.reply('📊 *Histórico vazio*\nUse !calc para fazer alguns cálculos!');
      return;
    }
    
    let historicoMsg = '📊 *SEU HISTÓRICO*\n\n';
    calculos.slice(-10).forEach((calc, index) => {
      historicoMsg += `${index + 1}. ${calc.expressao} = *${calc.resultado}*\n`;
    });
    
    await message.reply(historicoMsg);
    addLog(`📊 Histórico enviado para ${nomeUsuario}`);
    return;
  }

  // Limpar histórico
  if (texto === '!limpar') {
    historico.set(usuario, []);
    await message.reply('🗑️ *Histórico limpo com sucesso!*');
    addLog(`🗑️ Histórico limpo para ${nomeUsuario}`);
    return;
  }

  // Status
  if (texto === '!status') {
    const totalUsuarios = historico.size;
    const totalCalculos = Array.from(historico.values()).reduce((acc, calc) => acc + calc.length, 0);
    
    const statusMsg = `🤖 *STATUS DO BOT*\n\n✅ *Online no Render.com*\n👥 *Usuários:* ${totalUsuarios}\n🧮 *Cálculos:* ${totalCalculos}\n⏰ *Uptime:* ${Math.round(process.uptime() / 60)}min`;
    
    await message.reply(statusMsg);
    addLog(`📊 Status enviado para ${nomeUsuario}`);
    return;
  }
});

// ==================== INICIALIZAÇÃO ====================

addLog('🚀 INICIANDO WHATSAPP BOT NO RENDER...');
addLog(`🌐 URL: https://whatsapp-bot-jh2c.onrender.com`);
addLog(`⏰ Início: ${new Date().toLocaleString('pt-BR')}`);

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
