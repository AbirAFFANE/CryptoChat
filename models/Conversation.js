const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  encryptionKey: { type: String, required: true },
  groupName: { type: String, required: false }, // اسم المجموعة (اختياري للمحادثات الجماعية)
  groupPicture: { type: String, required: false }, // مسار صورة ملف شخصي للمجموعة
  createdAt: { type: Date, default: Date.now }
});

// إضافة طريقة للحصول على المفتاح التشفيري
conversationSchema.methods.getEncryptionKey = function() {
    return this.encryptionKey;
};

module.exports = mongoose.model('Conversation', conversationSchema);