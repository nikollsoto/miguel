const express = require('express');
const router = express.Router();
const controller = require('./conversationController');

// Rutas API
router.get('/current', controller.getCurrentConversation);
router.post('/generate/:expert', controller.generateExpertResponse);
router.post('/clear', controller.clearConversation);
router.get('/export', controller.exportToPDF);
router.delete('/messages/:messageId', controller.deleteMessage);
router.put('/messages/:messageId', controller.updateMessage);

module.exports = router;