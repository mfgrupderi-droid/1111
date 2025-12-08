const mongoose = require('mongoose');

const CekSenetSchema = new mongoose.Schema({
    evrakTipi: {
        type: String,
        enum: ['cek', 'senet'],
        required: true
    },
    tip: {
        type: String,
        enum: ['alinan', 'verilen'],
        required: true
    },
    firmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sirket',
        required: false // Şahıs işlemleri için opsiyonel
    },
    sahisAdi: {
        type: String,
        required: false // Firma yoksa şahıs adı
    },
    // Ciro işlemleri için
    ciroFirmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sirket',
        default: null // Çek ciro edildiyse hangi firmaya
    },
    banka: {
        type: String,
        required: function() {
            return this.evrakTipi === 'cek'; // Sadece çekler için zorunlu
        }
    },
    tutar: {
        type: Number,
        required: true,
        min: 0
    },
    paraBirimi: {
        type: String,
        enum: ['TRY', 'USD', 'EUR'],
        default: 'TRY'
    },
    vadeTarihi: {
        type: Date,
        required: true
    },
    aciklama: {
        type: String,
        default: ''
    },
    durum: {
        type: String,
        enum: ['Kasa', 'Ciro', 'Aktif', 'Ödendi', 'İade'],
        default: function () {
            // Alınan çekler için varsayılan "Kasa"
            if (this.tip === 'alinan' && this.evrakTipi === 'cek') {
                return 'Kasa';
            }
            // Verilen çekler ve tüm senetler için "Aktif"
            return 'Aktif';
        }
    },
    cariIslensin: {
        type: Boolean,
        default: true
    },
    // Durum değişiklik tarihi
    durumTarihi: {
        type: Date,
        default: Date.now
    },
    // Ödemeler
    odemeler: [{
        tarih: {
            type: Date,
            default: Date.now
        },
        tutar: {
            type: Number,
            required: true,
            min: 0
        },
        aciklama: {
            type: String,
            default: ''
        }
    }]
}, {
    timestamps: true
});

// Validation: firmaId veya sahisAdi'ndan biri mutlaka olmalı
CekSenetSchema.pre('validate', function (next) {
    if (!this.firmaId && !this.sahisAdi) {
        next(new Error('Firma veya şahıs adı alanlarından biri zorunludur'));
    }
    
    // Ciro durumundaysa ciroFirmaId zorunlu
    if (this.durum === 'Ciro' && !this.ciroFirmaId) {
        next(new Error('Ciro durumunda ciro firması seçilmelidir'));
    }
    
    next();
});

// Durum değişikliği takibi
CekSenetSchema.pre('save', function(next) {
    if (this.isModified('durum')) {
        this.durumTarihi = new Date();
    }
    next();
});

// Index'ler
CekSenetSchema.index({ firmaId: 1 });
CekSenetSchema.index({ ciroFirmaId: 1 });
CekSenetSchema.index({ vadeTarihi: 1 });
CekSenetSchema.index({ evrakTipi: 1, tip: 1 });
CekSenetSchema.index({ durum: 1 });
CekSenetSchema.index({ sahisAdi: 1 });
CekSenetSchema.index({ durumTarihi: 1 });

module.exports = mongoose.model('CekSenet', CekSenetSchema);