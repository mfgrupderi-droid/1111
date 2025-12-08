const mongoose = require('mongoose');

const modelFiyatiSchema = new mongoose.Schema({
    firmaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sirket',
        required: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    birimFiyat: {
        type: Number,
        required: true
    },
    paraBirimi: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Aynı firma + model kombinasyonu için unique index
modelFiyatiSchema.index({ firmaId: 1, model: 1 }, { unique: true });

module.exports = mongoose.model('ModelFiyati', modelFiyatiSchema);