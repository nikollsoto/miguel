const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');
require('dotenv').config();

// Base de datos en memoria
let messages = [];

// Función para llamar a Gemini
async function generateWithGemini(prompt) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]) {
      throw new Error('Formato de respuesta inválido de Gemini');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error en Gemini API:', error.message);
    throw error;
  }
}

// Controladores

// Obtener conversación actual
exports.getCurrentConversation = (req, res) => {
  res.json({ success: true, messages });
};

// Generar respuesta del experto y seguir con respuestas fijas
exports.generateExpertResponse = async (req, res) => {
  const { expert } = req.params;
  const { tema } = req.body;

  console.log('Datos recibidos:', { expert, tema });

  try {
    let rolePrompt = '';
    if (expert === 'filosofo') {
      rolePrompt = 'Como filósofo existencialista, responde brevemente (2-3 frases) en español:';
    } else if (expert === 'budista') {
      rolePrompt = 'Como monje budista zen, responde brevemente (2-3 frases) en español:';
    } else {
      throw new Error('Experto no reconocido');
    }

    // Si es la primera vez, borra mensajes anteriores
    if (messages.length === 0 && tema) {
      messages = [];
    }

    // Primera respuesta
    const firstPrompt = `${rolePrompt} ${tema}`;
    let responseText = await generateWithGemini(firstPrompt);

    messages.push({
      _id: Date.now().toString(),
      expert,
      text: responseText,
      timestamp: new Date()
    });

    // Luego generar respuestas alternas automáticas
    for (let i = 0; i < 3; i++) {
      const lastMessage = messages[messages.length - 1];

      const responder = lastMessage.expert === 'filosofo' ? 'budista' : 'filosofo';
      const responderPrompt = responder === 'filosofo'
        ? 'Como filósofo existencialista, responde brevemente (2-3 frases) en español al siguiente mensaje:'
        : 'Como monje budista zen, responde brevemente (2-3 frases) en español al siguiente mensaje:';

      const nextPrompt = `${responderPrompt}\n"${lastMessage.text}"\nMantén tu postura firme.\nSolo usa 2-3 frases.`;
      responseText = await generateWithGemini(nextPrompt);

      messages.push({
        _id: Date.now().toString(),
        expert: responder,
        text: responseText,
        timestamp: new Date()
      });
    }

    res.json({ success: true, messages });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al generar respuesta',
      details: error.message
    });
  }
};

// Limpiar conversación
exports.clearConversation = (req, res) => {
  messages = [];
  res.json({ success: true, messages });
};

// Exportar a PDF
exports.exportToPDF = (req, res) => {
  try {
    if (!messages || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay mensajes para exportar'
      });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="dialogo_expertos.pdf"');
    doc.pipe(res);

    doc.text('Diálogo entre Expertos\n\n', { align: 'center' });

    messages.forEach(msg => {
      const role = msg.expert === 'filosofo' ? 'Filósofo' : 'Monje';
      doc.text(`${role}: ${msg.text}`);
    });

    doc.end();

  } catch (error) {
    console.error('Error al exportar:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error al generar PDF',
      details: error.message
    });
  }
};

// Eliminar mensaje
exports.deleteMessage = (req, res) => {
  const { messageId } = req.params;
  messages = messages.filter(msg => msg._id !== messageId);
  res.json({ success: true, messages });
};

// Editar mensaje
exports.updateMessage = (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;

  messages = messages.map(msg =>
    msg._id === messageId ? { ...msg, text } : msg
  );

  res.json({ success: true, messages });
};