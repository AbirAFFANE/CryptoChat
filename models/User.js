const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { // الحقل الجديد
        type: String,
        default: '', // افتراضيًا لا توجد صورة
    },
    isAdmin: { // حقل جديد لتحديد الإداري
        type: Boolean,
        default: false
    }
});

// هذا الكود يتم تنفيذه تلقائيًا قبل الحفظ (register)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// إضافة طريقة للتحقق من كلمة المرور
userSchema.methods.verifyPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);