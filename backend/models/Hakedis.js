// models/Hakedis.js

const mongoose = require('mongoose');

// Bir hakediş kaydındaki her bir model/iş satırının şeması
const IslemSchema = new mongoose.Schema({
    model: { type: String, trim: true },
    adet: { type: Number, default: 0 },
    fiyat: { type: Number, default: 0 },
    toplam: { type: Number, default: 0 }
}, { _id: false }); // Her işleme ayrı bir ID oluşturma

const HakedisSchema = new mongoose.Schema({
    personelAdi: {
        type: String,
        required: [true, 'Personel adı zorunludur.'],
        trim: true
    },
    hesapTuru: {
        type: String,
        required: [true, 'Hesap türü zorunludur.'],
        enum: ['Dikim', 'Strober']
    },
    yil: {
        type: Number,
        required: true,
        index: true // Yıla göre hızlı arama için
    },
    hafta: {
        type: Number,
        required: true,
        min: 1,
        max: 53,
        index: true // Haftaya göre hızlı arama için
    },
    islemler: [IslemSchema],
    toplamAdet: {
        type: Number,
        default: 0
    },
    toplamHakedis: {
        type: Number,
        default: 0
    },
    kayitTarihi: {
        type: Date,
        default: Date.now
    },
    guncellenmeTarihi: {
        type: Date
    }
}, {
    timestamps: { createdAt: 'kayitTarihi', updatedAt: 'guncellenmeTarihi' }
});

// Bir personel için aynı hafta ve aynı hesap türünde sadece bir kayıt olmasını sağlar
HakedisSchema.index({ personelAdi: 1, hesapTuru: 1, yil: 1, hafta: 1 }, { unique: true });

module.exports = mongoose.model('Hakedis', HakedisSchema);