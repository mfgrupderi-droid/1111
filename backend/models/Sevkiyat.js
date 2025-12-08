const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BedenDetaySchema = new Schema({
    beden: { type: String, required: true },
    adet: { type: Number, required: true, default: 0 }
}, { _id: false });

const SevkiyatUrunSchema = new Schema({
    urunAdi: { type: String, required: true },
    model: { type: String, required: true },
    cins: { type: String, required: true },
    renk: { type: String, required: true },
    bedenler: [BedenDetaySchema],
    adet: { type: Number, required: true }, // Toplam adet
    birimFiyat: { type: Number, required: true },
    sevkiyatTarihi: { type: Date, default: Date.now },
    not: { type: String, default: '' }
}, { _id: false });

const SevkiyatSchema = new Schema({
    sirketId: {
        type: Schema.Types.ObjectId,
        ref: 'Sirket',
        required: true
    },
    sevkiyatTarihi: {
        type: Date,
        default: Date.now
    },
    urunler: [SevkiyatUrunSchema],
    toplamTutar: {
        type: Number,
        required: true
    },
    sevkiyatNo: {
        type: Number,
        unique: true,
        required: true
    },
    // Populate için şirket adını saklayabilirsiniz
    sirketAdi: { type: String }
}, { timestamps: true });

// Sevkiyat numarasını otomatik artır
SevkiyatSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const lastSevkiyat = await this.constructor.findOne({}, {}, { sort: { sevkiyatNo: -1 } });
            this.sevkiyatNo = lastSevkiyat ? lastSevkiyat.sevkiyatNo + 1 : 1;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Sevkiyat', SevkiyatSchema);