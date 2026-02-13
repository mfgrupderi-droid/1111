const mongoose = require('mongoose');

const odemeSchema = new mongoose.Schema({
  fasoncuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fasoncu',
    required: true
  },
  
  odemeNo: {
    type: String,
    unique: true,
    required: true
  },
  
  tutar: {
    type: Number,
    required: true,
    min: 0
  },
  
  odemeTarihi: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  odemeYontemi: {
    type: String,
    enum: ['Nakit', 'Havale', 'EFT', 'Kredi Kartı', 'Çek', 'Diğer'],
    default: 'Nakit'
  },
  
  not: {
    type: String,
    default: ''
  },
  
  olusturanKullanici: {
    type: String,
    default: 'Sistem'
  },
  
  durum: {
    type: String,
    enum: ['Onaylı', 'Beklemede', 'İptal'],
    default: 'Onaylı'
  },
  
  makbuzNo: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});
odemeSchema.pre('validate', async function (next) {
  if (!this.odemeNo) {
    const count = await mongoose.model('Odeme').countDocuments();
    this.odemeNo = `OD-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Odeme', odemeSchema);