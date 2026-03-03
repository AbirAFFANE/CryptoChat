const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation',
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  text: { 
    type: String, 
    required: false // اختياري، لأن الرسالة قد تحتوي على صورة أو ملف أو صوت فقط
  },
  image: { 
    type: String, 
    required: false 
  },
  file: { 
    type: String, 
    required: false 
  },
  voice: { // حقل جديد لتخزين رابط الملف الصوتي
    type: String, 
    required: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// إضافة طريقة لتحديث النص المشفر
messageSchema.methods.updateEncryptedText = function(text, encryptionKey) {
    this.text = encrypt(text, encryptionKey); // يفترض وجود دالة encrypt
};

module.exports = mongoose.model('Message', messageSchema);