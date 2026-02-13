const mongoose = require('mongoose');

const BedenDetaySchema = new mongoose.Schema({
    beden: { type: String, required: true },
    adet: { type: Number, required: true, default: 0 }
});

const SiparisDetaySchema = new mongoose.Schema({
    model: { type: String, required: true },
    cins: { type: String, required: true },
    renk: { type: String, required: true },
    bedenler: [BedenDetaySchema],
    fiyat: { type: Number, required: true },
    not: { type: String, default: '' }
});

const siparisSchema = new mongoose.Schema({
    verenFirma: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sirket',
        required: true
    },
    siparisDetaylari: [SiparisDetaySchema],
    toplamTutar: { type: Number, required: true },
    olusturmaTarihi: { type: Date, default: Date.now }
}, {
    timestamps: true
});

module.exports = mongoose.model('Siparis', siparisSchema);