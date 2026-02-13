const mongoose = require('mongoose');
const IslemSchema = new mongoose.Schema({
    model: { type: String, trim: true },
    adet: { type: Number, default: 0 },
    fiyat: { type: Number, default: 0 },
    toplam: { type: Number, default: 0 }
}, { _id: false }); 

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
        index: true 
    },
    hafta: {
        type: Number,
        required: true,
        min: 1,
        max: 53,
        index: true 
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
HakedisSchema.index({ personelAdi: 1, hesapTuru: 1, yil: 1, hafta: 1 }, { unique: true });

module.exports = mongoose.model('Hakedis', HakedisSchema);