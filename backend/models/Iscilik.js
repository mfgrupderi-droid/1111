const mongoose = require('mongoose');

const iscilikSchema = new mongoose.Schema({
  fasoncuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fasoncu',
    required: true
  },
  fasoncuAdi: {
    type: String,
    required: true
  },
  iscilikNo: {
    type: Number,
    unique: true
  },
  iscilikTarihi: {
    type: Date,
    default: Date.now
  },
  urunler: [{
    model: { type: String, required: true },
    adet: { type: Number, required: true },
    birimFiyat: { type: Number, required: true },
    toplamTutar: { type: Number, required: true },
    not: { type: String, default: '' }
  }],
  toplamTutar: {
    type: Number,
    required: true
  },
  toplamAdet: {
    type: Number,
    required: true
  },
  paraBirimi: {
    type: String,
    enum: ['TL', 'USD', 'EUR'],
    required: true
  },
  odemeDurumu: {
    type: String,
    enum: ['Bekliyor', 'Kısmi', 'Tamamlandı'],
    default: 'Bekliyor'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// İşçilik numarası otomatik artırma
iscilikSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const lastIscilik = await this.constructor.findOne().sort({ iscilikNo: -1 });
      this.iscilikNo = lastIscilik ? lastIscilik.iscilikNo + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Iscilik', iscilikSchema);