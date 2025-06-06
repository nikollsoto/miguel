let messages = [];

exports.getMessages = () => messages;

exports.addMessage = (message) => {
  messages.push(message);
};

exports.clearMessages = () => {
  messages = [];
};

exports.deleteMessage = (messageId) => {
  messages = messages.filter(msg => msg._id !== messageId);
};

exports.updateMessage = (messageId, text) => {
  const messageIndex = messages.findIndex(msg => msg._id === messageId);
  if (messageIndex !== -1) {
    messages[messageIndex].text = text;
  }
};