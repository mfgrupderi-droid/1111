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
        required: false
    },
    sahisAdi: {
        type: String,
        required: false
    },
    ciroFirmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sirket',
        default: null
    },
    banka: {
        type: String,
        required: function() {
            return this.evrakTipi === 'cek';
        }
    },
    borclu: {                    
        type: String,
        required: true           
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
            if (this.tip === 'alinan' && this.evrakTipi === 'cek') {
                return 'Kasa';
            }
            return 'Aktif';
        }
    },
    cariIslensin: {
        type: Boolean,
        default: true
    },
    durumTarihi: {
        type: Date,
        default: Date.now
    },
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
CekSenetSchema.pre('validate', function (next) {
    if (!this.firmaId && !this.sahisAdi) {
        next(new Error('Firma veya şahıs adı alanlarından biri zorunludur'));
    }
    
    if (this.durum === 'Ciro' && !this.ciroFirmaId) {
        next(new Error('Ciro durumunda ciro firması seçilmelidir'));
    }
    
    next();
});

CekSenetSchema.pre('save', function(next) {
    if (this.isModified('durum')) {
        this.durumTarihi = new Date();
    }
    next();
});
CekSenetSchema.index({ firmaId: 1 });
CekSenetSchema.index({ ciroFirmaId: 1 });
CekSenetSchema.index({ vadeTarihi: 1 });
CekSenetSchema.index({ evrakTipi: 1, tip: 1 });
CekSenetSchema.index({ durum: 1 });
CekSenetSchema.index({ sahisAdi: 1 });
CekSenetSchema.index({ borclu: 1 });      
CekSenetSchema.index({ durumTarihi: 1 });

module.exports = mongoose.model('CekSenet', CekSenetSchema);