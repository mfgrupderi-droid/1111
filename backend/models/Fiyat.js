const mongoose = require('mongoose');

const FiyatSchema = new mongoose.Schema({
    fiyat: {
        type: Number,
        required: [true, 'Fiyat zorunludur.']
    },
    
    modeller: {
        type: [String],
        required: [true, 'En az bir model adı gereklidir.'],
        
        set: arr => arr.map(m => m.toLowerCase().trim())
    },
    hesapTuru: {
        type: String,
        required: [true, 'Hesap türü zorunludur.'],
        enum: ['Dikim', 'Strober'] 
    }
}, {
    timestamps: true 
});
FiyatSchema.index({ modeller: 1, hesapTuru: 1 }, { unique: true });

module.exports = mongoose.model('Fiyat', FiyatSchema);