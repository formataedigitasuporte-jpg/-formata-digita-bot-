require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// ============================================
// CONFIGURAÇÕES
// ============================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

// ============================================
// MENSAGENS DO BOT
// ============================================
const MESSAGES = {
    welcome: `🎓 *Bem-vindo à Formata e Digita!*

Olá! Sou o assistente virtual da equipe de Orientação Acadêmica.

*Como posso ajudar você hoje?*

📝 Formatação de trabalhos
✍️ Digitação de documentos
📚 Orientação acadêmica
💼 Trabalhos personalizados

Digite *MENU* para ver todas as opções!`,

    menu: `📋 *MENU PRINCIPAL*

Digite o número da opção:

*1* - Serviços e Preços
*2* - Solicitar Orçamento
*3* - Enviar Arquivo
*4* - Acompanhar Pedido
*5* - Formas de Pagamento
*6* - Falar com Atendente

Digite o número ou descreva sua necessidade.`,

    services: `📚 *NOSSOS SERVIÇOS*

*Formatação ABNT* 📝
• TCC, Monografias, Dissertações
• Artigos científicos
• Normalização completa

*Digitação* ⌨️
• Trabalhos manuscritos
• Transcrição de documentos

*Trabalhos Completos* 📖
• Desenvolvimento integral
• 100% original e humanizado

Digite *MENU* para voltar ou *2* para orçamento.`,

    budget: `💰 *SOLICITAR ORÇAMENTO*

Para um orçamento preciso, informe:

1️⃣ Tipo de trabalho
2️⃣ Número de páginas
3️⃣ Prazo desejado
4️⃣ Requisitos específicos

Descreva seu trabalho ou envie o arquivo!`,

    payment: `💳 *FORMAS DE PAGAMENTO*

✅ PIX (desconto de 5%)
✅ Cartão de crédito (até 3x)
✅ Transferência bancária
✅ Boleto bancário

Digite *MENU* para voltar.`,

    contact: `📞 *ATENDIMENTO HUMANO*

Transferindo para nosso especialista...

*Horário:*
🕐 Seg-Sex: 8h às 18h
🕐 Sábado: 9h às 13h

Aguarde, em breve você será atendido!`
};

// ============================================
// FUNÇÃO: ENVIAR MENSAGEM
// ============================================
async function sendWhatsAppMessage(to, message) {
    try {
        const response = await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: message }
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Mensagem enviada:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
        throw error;
    }
}

// ============================================
// FUNÇÃO: PROCESSAR MENSAGEM RECEBIDA
// ============================================
function processMessage(message) {
    const text = message.toLowerCase().trim();
    
    // Comandos do menu
    if (text === 'menu' || text === 'início' || text === 'inicio') {
        return MESSAGES.menu;
    }
    
    if (text === '1') {
        return MESSAGES.services;
    }
    
    if (text === '2') {
        return MESSAGES.budget;
    }
    
    if (text === '5') {
        return MESSAGES.payment;
    }
    
    if (text === '6' || text === 'atendente') {
        return MESSAGES.contact;
    }
    
    // Palavras-chave
    if (text.includes('orçamento') || text.includes('orcamento') || text.includes('preço') || text.includes('preco')) {
        return MESSAGES.budget;
    }
    
    if (text.includes('serviço') || text.includes('servico') || text.includes('formatação') || text.includes('formatacao')) {
        return MESSAGES.services;
    }
    
    if (text.includes('pagamento') || text.includes('pagar') || text.includes('pix')) {
        return MESSAGES.payment;
    }
    
    if (text.includes('atendente') || text.includes('humano') || text.includes('pessoa')) {
        return MESSAGES.contact;
    }
    
    // Saudações
    if (text.includes('oi') || text.includes('olá') || text.includes('ola') || text.includes('bom dia') || text.includes('boa tarde') || text.includes('boa noite')) {
        return MESSAGES.welcome;
    }
    
    // Mensagem padrão
    return `Recebi sua mensagem: "${message}"

Um momento! Vou encaminhar para nossa equipe.

Enquanto isso, digite *MENU* para ver nossas opções ou *ATENDENTE* para falar com um especialista.`;
}

// ============================================
// ROTA: VERIFICAÇÃO DO WEBHOOK
// ============================================
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('📞 Verificação do webhook recebida');
    
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook verificado com sucesso!');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Falha na verificação do webhook');
        res.sendStatus(403);
    }
});

// ============================================
// ROTA: RECEBER MENSAGENS
// ============================================
app.post('/webhook', async (req, res) => {
    try {
        console.log('📨 Webhook recebido:', JSON.stringify(req.body, null, 2));
        
        const entry = req.body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;
        
        if (messages && messages[0]) {
            const message = messages[0];
            const from = message.from;
            const messageBody = message.text?.body;
            
            console.log(`💬 Mensagem de ${from}: ${messageBody}`);
            
            if (messageBody) {
                const responseMessage = processMessage(messageBody);
                await sendWhatsAppMessage(from, responseMessage);
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.sendStatus(500);
    }
});

// ============================================
// ROTA: HEALTH CHECK
// ============================================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Formata e Digita Bot',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log('🚀 Bot Formata e Digita iniciado!');
    console.log(`📱 WhatsApp: +55 24 99828-2207`);
    console.log(`🌐 Servidor rodando na porta ${PORT}`);
});
