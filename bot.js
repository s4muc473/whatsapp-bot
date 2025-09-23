const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const math = require('mathjs');
const express = require('express');

// Configuração do Express para health checks
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint para o Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Bot está online!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Status do bot
app.get('/status', (req, res) => {
  const status = {
    botStatus: client.info ? 'connected' : 'disconnected',
    qrCode: client.qr ? 'pending' : 'none',
    timestamp: new Date().toISOString(),
    historicoSize: historico.size
  };
  res.json(status);
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`🔄 Servidor health check rodando na porta ${PORT}`);
});

// Configuração do WhatsApp Bot
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './sessions' // Pasta para salvar sessões
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
      '--disable-gpu',
      '--single-process',
      '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

const historico = new Map();

// ==================== EVENTOS DO BOT ====================

client.on('ready', () => {
  console.log('✅ Bot está online no Render!');
  console.log('📱 Conectado ao WhatsApp Web com sucesso');
  console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
});

client.on('qr', (qr) => {
  console.log('📱 QR Code recebido, escaneie no WhatsApp:');
  qrcode.generate(qr, { small: true });
  
  // Também salva o QR code em texto para facilitar
  console.log('🔗 QR Code string:', qr);
});

client.on('authenticated', () => {
  console.log('✅ Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
  console.log('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
  console.log('❌ Cliente desconectado:', reason);
  console.log('🔄 Tentando reconectar em 10 segundos...');
  
  // Tentar reconectar após 10 segundos
  setTimeout(() => {
    client.initialize();
  }, 10000);
});

client.on('loading_screen', (percent, message) => {
  console.log(`🔄 Carregando: ${percent}% - ${message}`);
});

// ==================== COMANDOS DO BOT ====================

client.on('message_create', async (message) => {
  // Ignorar mensagens de grupos e status
  if (message.from.includes('@g.us') || message.from.includes('status')) return;
  
  const texto = message.body.trim();
  const usuario = message.from;
  const nomeUsuario = message._data.notifyName || 'Usuário';

  console.log(`📨 Mensagem de ${nomeUsuario}: ${texto}`);

  // Comando de ajuda
  if (texto === '!ajuda' || texto === '!help' || texto === '!comandos') {
    const ajudaMsg = `
🧮 *CALCULADORA BOT* 🤖
*Hospedado no Render.com*

💡 *Comandos disponíveis:*
!calc [expressão] - Calcula expressão matemática
!historico - Mostra seus últimos 10 cálculos
!limpar - Limpa seu histórico
!status - Ver status do bot
!ajuda - Mostra esta mensagem

📝 *Exemplos de uso:*
!calc 2 + 3 * 4
!calc (10 + 5) / 3
!calc sqrt(16) + 5^2
!calc sin(45 deg) + cos(30 deg)

🔢 *Operações suportadas:*
+ - * / ^ ( ) 
sqrt(), sin(), cos(), tan(), log(), ln()
abs(), round(), ceil(), floor()

🌐 *Servidor:* Render.com (24/7)
    `;
    
    await message.reply(ajudaMsg);
    console.log(`✅ Ajuda enviada para ${nomeUsuario}`);
    return;
  }

  // Comando de cálculo
  if (texto.startsWith('!calc ')) {
    try {
      const expressao = texto.replace('!calc ', '').trim();
      
      if (!expressao) {
        await message.reply('❌ *Digite uma expressão!*\nEx: !calc 2 + 2');
        return;
      }

      console.log(`🧮 Calculando: ${expressao} para ${nomeUsuario}`);
      
      // Avaliar a expressão matemática
      const resultado = math.evaluate(expressao);
      const resultadoFormatado = math.format(resultado, { precision: 12 });
      
      // Salvar no histórico do usuário
      if (!historico.has(usuario)) {
        historico.set(usuario, []);
      }

      const calculo = {
        expressao,
        resultado: resultadoFormatado,
        data: new Date().toLocaleString('pt-BR'),
        nome: nomeUsuario
      };

      historico.get(usuario).push(calculo);
      
      // Manter apenas os últimos 10 cálculos
      if (historico.get(usuario).length > 10) {
        historico.get(usuario).shift();
      }

      // Enviar resultado
      const resposta = `🧮 *Calculadora*\n\n👤 *Usuário:* ${nomeUsuario}\n📝 *Expressão:* ${expressao}\n✅ *Resultado:* ${resultadoFormatado}\n📅 *Data:* ${calculo.data}`;
      
      await message.reply(resposta);
      console.log(`✅ Resultado enviado para ${nomeUsuario}: ${expressao} = ${resultadoFormatado}`);

    } catch (error) {
      console.error(`❌ Erro no cálculo para ${nomeUsuario}:`, error);
      
      const errorMsg = `❌ *Erro na expressão!*\n\nExpressão: "${texto.replace('!calc ', '')}"\n\n💡 *Dicas:*\n• Use apenas números e operadores válidos\n• Verifique os parênteses\n• Exemplo: !calc (2 + 3) * 4\n\nDigite !ajuda para ver todos os comandos.`;
      
      await message.reply(errorMsg);
    }
    return;
  }

  // Ver histórico
  if (texto === '!historico' || texto === '!history') {
    const calculos = historico.get(usuario) || [];
    
    if (calculos.length === 0) {
      await message.reply('📊 *Histórico vazio*\n\nVocê ainda não fez nenhum cálculo. Use !calc [expressão] para começar!');
      return;
    }

    let historicoMsg = `📊 *HISTÓRICO DE CÁLCULOS*\n👤 *Usuário:* ${nomeUsuario}\n📅 *Total:* ${calculos.length} cálculos\n\n`;
    
    calculos.slice(-10).reverse().forEach((calc, index) => {
      historicoMsg += `*${calculos.length - index}.* ${calc.expressao} = *${calc.resultado}*\n   📅 ${calc.data}\n\n`;
    });

    historicoMsg += `💡 Use !limpar para apagar o histórico.`;
    
    await message.reply(historicoMsg);
    console.log(`📊 Histórico enviado para ${nomeUsuario}`);
    return;
  }

  // Limpar histórico
  if (texto === '!limpar' || texto === '!clear') {
    historico.set(usuario, []);
    await message.reply('🗑️ *Histórico limpo!*\n\nSeus cálculos anteriores foram apagados com sucesso!');
    console.log(`🗑️ Histórico limpo para ${nomeUsuario}`);
    return;
  }

  // Status do bot
  if (texto === '!status' || texto === '!info') {
    const totalUsuarios = historico.size;
    const totalCalculos = Array.from(historico.values()).reduce((acc, calc) => acc + calc.length, 0);
    
    const statusMsg = `🤖 *STATUS DO BOT*\n\n✅ *Status:* Online e funcionando\n🌐 *Host:* Render.com\n⏰ *Uptime:* ${Math.round(process.uptime() / 60)} minutos\n👥 *Usuários ativos:* ${totalUsuarios}\n🧮 *Cálculos realizados:* ${totalCalculos}\n📅 *Servidor:* ${new Date().toLocaleString('pt-BR')}\n\n💡 Use !ajuda para ver os comandos.`;
    
    await message.reply(statusMsg);
    return;
  }

  // Resposta para mensagens não reconhecidas
  if (texto.startsWith('!')) {
    await message.reply('❌ *Comando não reconhecido!*\n\n💡 Comandos disponíveis: !ajuda, !calc, !historico, !limpar, !status');
    return;
  }
});

// ==================== INICIALIZAÇÃO ====================

console.log('🚀 Iniciando WhatsApp Calculator Bot no Render...');
console.log('⏰', new Date().toLocaleString('pt-BR'));
console.log('🔧 Configuração:', {
  headless: true,
  session: 'local-auth',
  host: 'Render.com'
});

// Inicializar o bot
client.initialize();

// Process handlers para desligamento gracioso
process.on('SIGINT', () => {
  console.log('🔄 Recebido SIGINT. Desligando graciosamente...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Recebido SIGTERM. Desligando graciosamente...');
  client.destroy();
  process.exit(0);
});

// Handler de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});
