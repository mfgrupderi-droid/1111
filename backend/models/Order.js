const mongoose = require('mongoose');

// Tüm bedenleri sabit tutuyoruz, böylece her zaman aynı yapıda kaydedilir
const BEDENLER = [
  '3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'ozel'
];

const orderItemSchema = new mongoose.Schema({
  model: { type: String, required: true }, // "2000", "3000" gibi
  renk: { type: String, required: true },
  cins: { type: String, required: true },
  bedenler: {
    // Dinamik olarak tüm bedenleri tanımlıyoruz
    ...BEDENLER.reduce((acc, beden) => {
      acc[beden] = { type: Number, default: 0 };
      return acc;
    }, {})
  },
  birimFiyat: { 
    type: Number, 
    required: true,
    set: v => typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
  },
  satirToplami: { type: Number, required: true }, // adet * birimFiyat
  not: { type: String, default: '' }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Sanal alan: Toplam adet (tüm bedenlerin toplamı)
orderItemSchema.virtual('toplamAdet').get(function() {
  return BEDENLER.reduce((sum, beden) => sum + (this.bedenler[beden] || 0), 0);
});

const orderSchema = new mongoose.Schema({
  siparisId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  },
  firmaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Sirket', 
    required: true 
  },
  firmaAdi: { type: String, required: true },
  toplamAdet: { type: Number, default: 0 },
  toplamTutar: { type: Number, default: 0 },
  siparisTarihi: { type: Date, default: Date.now },
  items: [orderItemSchema],
  durum: { 
    type: String, 
    enum: ['taslak', 'onaylandi', 'sevk_edildi', 'iptal'], 
    default: 'taslak' 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware: Kaydetmeden önce toplamAdet ve toplamTutar hesapla
orderSchema.pre('save', function(next) {
  this.toplamAdet = this.items.reduce((sum, item) => sum + item.toplamAdet, 0);
  this.toplamTutar = this.items.reduce((sum, item) => sum + item.satirToplami, 0);
  next();
});

module.exports = mongoose.model('Order', orderSchema);