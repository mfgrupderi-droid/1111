// models/Fiyat.js

const mongoose = require('mongoose');

const FiyatSchema = new mongoose.Schema({
    fiyat: {
        type: Number,
        required: [true, 'Fiyat zorunludur.']
    },
    // Bu fiyata ait olan tüm modellerin listesi
    modeller: {
        type: [String],
        required: [true, 'En az bir model adı gereklidir.'],
        // Her modelin küçük harfe çevrilip boşluklarının temizlenmesini sağlar
        set: arr => arr.map(m => m.toLowerCase().trim())
    },
    hesapTuru: {
        type: String,
        required: [true, 'Hesap türü zorunludur.'],
        enum: ['Dikim', 'Strober'] // Sadece bu iki değer kabul edilir
    }
}, {
    timestamps: true // createdAt ve updatedAt alanlarını otomatik ekler
});

// Bir modelin, aynı hesap türü için sadece bir fiyat grubunda olmasını garanti eder.
// Bu, veri tutarlılığı için önemlidir.
FiyatSchema.index({ modeller: 1, hesapTuru: 1 }, { unique: true });

module.exports = mongoose.model('Fiyat', FiyatSchema);