const mongoose = require('mongoose');

const alinanCekSenetSchema = new mongoose.Schema({
    firma: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sirket',
        required: true,
    },
    banka: {
        type: String,
        required: true,
        trim: true,
    },
    borclu: { 
        type: String,
        required: true,
        trim: true,
    },
    verilmeTarihi: {
        type: Date,
        required: true,
    },
    vadeTarihi: { 
        type: Date,
        required: true,
    },
    tutar: {
        type: Number,
        required: true,
        min: 0,
    },
    paraBirimi: {
        type: String,
        required: true,
        enum: ['TL', 'USD', 'EUR'],
    },
    durum: {
        type: String,
        required: true,
        enum: ['Kasa', 'Ciro Edildi', 'Bankaya Verildi', 'Ödendi'],
        default: 'Kasa',
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('AlinanCekSenet', alinanCekSenetSchema);