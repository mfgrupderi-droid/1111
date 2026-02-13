
const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    aciklama: { type: String, default: '' }, 
    birincil: { type: Boolean, default: false } 
});

const islemSchema = new mongoose.Schema({
    islemTarihi: { type: Date, default: Date.now },
    islemAciklamasi: String,
    tutar: {
  type: Number,
  set: v => typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
}
});

const sirketSchema = new mongoose.Schema({
    sirketAdi: { type: String, required: true },
    sirketBolgesi: String,
    sirketCarisi: { type: Number, default: 0 }, 
    sirketCariBirimi: { type: String, default: 'TRY' },
    sirketKodu: { type: String, required: true, unique: true },
    tip: { type: String, enum: ['alici', 'satici'], required: true },
    emailler: [emailSchema], 
    islemler: [islemSchema]
}, { timestamps: true    });
sirketSchema.path('emailler').validate(function(emails) {
    
    if (emails.length > 3) {
        return false;
    }
    
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let emailObj of emails) {
        if (!emailRegex.test(emailObj.email)) {
            return false;
        }
    }
    
    
    const emailAddresses = emails.map(e => e.email);
    const uniqueEmails = [...new Set(emailAddresses)];
    if (emailAddresses.length !== uniqueEmails.length) {
        return false;
    }
    
    
    const primaryEmails = emails.filter(e => e.birincil);
    if (primaryEmails.length > 1) {
        return false;
    }
    
    return true;
}, 'Email validasyon hatası: En fazla 3 benzersiz email, geçerli format ve tek birincil email olmalı');
sirketSchema.pre('save', function(next) {
    if (this.emailler && this.emailler.length === 1 && !this.emailler[0].birincil) {
        this.emailler[0].birincil = true;
    }
    next();
});

module.exports = mongoose.model('Sirket', sirketSchema);
