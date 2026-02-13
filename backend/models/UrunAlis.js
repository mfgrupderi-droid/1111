const mongoose = require('mongoose');
const urunAlisSchema = new mongoose.Schema({
  
  alisNo: {
    type: String,
    unique: true,
    sparse: true
  },
  
  
  sirketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sirket',
    required: [true, 'Satıcı şirket seçimi gereklidir'],
    validate: {
      validator: async function(sirketId) {
        const sirket = await mongoose.model('Sirket').findById(sirketId);
        return sirket && sirket.tip === 'satici';
      },
      message: 'Seçilen şirket satıcı değil'
    }
  },
  
  
  sirketAdi: {
    type: String,
    required: true
  },
  
  sirketCariBirimi: {
    type: String,
    default: 'TL',
    enum: ['TL', 'USD', 'EUR', "TRY"]
  },
  
  
  sirketEmailler: [{
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    emailTipi: {
      type: String,
      enum: ['genel', 'muhasebe', 'satin_alma', 'yonetim'],
      default: 'genel'
    }
  }],
  
  
  alisTarihi: {
    type: Date,
    required: [true, 'Alış tarihi gereklidir'],
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Alış tarihi bugünden ileri olamaz'
    }
  },
  
  
  urunler: [{
    urunAdi: {
      type: String,
      required: [true, 'Ürün adı gereklidir'],
      trim: true,
      maxlength: [200, 'Ürün adı 200 karakterden uzun olamaz']
    },
    
    aciklama: {
      type: String,
      trim: true,
      maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
    },
    
    adet: {
      type: Number,
      required: [true, 'Ürün adedi gereklidir'],
      min: [0.01, 'Ürün adedi 0\'dan büyük olmalıdır'],
      max: [999999.99, 'Ürün adedi çok büyük']
    },
    
    birimFiyat: {
      type: Number,
      required: [true, 'Birim fiyat gereklidir'],
      min: [0.01, 'Birim fiyat 0\'dan büyük olmalıdır'],
      max: [999999999.99, 'Birim fiyat çok büyük']
    },
    
    
    toplamFiyat: {
      type: Number,
      default: 0
    },
    
    
    kategori: {
      type: String,
      trim: true,
      maxlength: [100, 'Kategori 100 karakterden uzun olamaz']
    },
    
    
    birimTuru: {
      type: String,
      default: 'adet',
      trim: true,
      maxlength: [20, 'Birim türü 20 karakterden uzun olamaz']
    }
  }],
  
  
  toplamTutar: {
    type: Number,
    required: true,
    min: [0.01, 'Toplam tutar 0\'dan büyük olmalıdır']
  },
  
  
  kdvOrani: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  
  kdvTutari: {
    type: Number,
    default: 0,
    min: 0
  },
  
  genelToplam: {
    type: Number,
    default: 0,
    min: 0
  },
  
  
  notlar: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notlar 1000 karakterden uzun olamaz']
  },
  
  
  durum: {
    type: String,
    enum: ['beklemede', 'onaylandi', 'teslim_alindi', 'iptal_edildi'],
    default: 'beklemede'
  },
  
  
  teslimTarihi: Date,
  teslimAdresi: {
    type: String,
    trim: true,
    maxlength: [500, 'Teslim adresi 500 karakterden uzun olamaz']
  },
  
  
  emailGonderildi: {
    type: Boolean,
    default: false
  },
  
  emailGonderimTarihi: Date,
  
  emailGonderimDetayi: {
    gonderenEmail: String,
    alicilar: [String],
    konu: String,
    durum: {
      type: String,
      enum: ['gonderildi', 'basarisiz', 'beklemede'],
      default: 'beklemede'
    },
    hataMesaji: String,
    denemeeSayisi: {
      type: Number,
      default: 0
    }
  },
  
  
  faturaNo: {
    type: String,
    trim: true,
    maxlength: [50, 'Fatura numarası 50 karakterden uzun olamaz']
  },
  
  faturaTarihi: Date,
  
  irsaliyeNo: {
    type: String,
    trim: true,
    maxlength: [50, 'İrsaliye numarası 50 karakterden uzun olamaz']
  },
  
  
  odemeDurumu: {
    type: String,
    enum: ['odenmedi', 'kismen_odendi', 'tamamen_odendi'],
    default: 'odenmedi'
  },
  
  odemeVadesi: Date,
  
  odenenTutar: {
    type: Number,
    default: 0,
    min: 0
  },
  
  kalanBorc: {
    type: Number,
    default: 0,
    min: 0
  },
  
  
  onaylayanKisi: {
    type: String,
    trim: true
  },
  
  onayTarihi: Date,
  
  onayNotu: {
    type: String,
    trim: true,
    maxlength: [500, 'Onay notu 500 karakterden uzun olamaz']
  },
  
  
  year: {
    type: Number,
    default: 2026,
    index: true
  },
  olusturanKullanici: {
    type: String,
    required: true,
    default: 'sistem'
  },
  
  guncelleyenKullanici: String,
  
  sonGuncelleme: {
    type: Date,
    default: Date.now
  },
  
  
  versiyon: {
    type: Number,
    default: 1
  },
  
  
  silinmisMi: {
    type: Boolean,
    default: false
  },
  
  silinmeTarihi: Date,
  
  silenKullanici: String
  
}, {
  
  timestamps: true, 
  
  
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  
  
  collection: 'urunalislar'
});
urunAlisSchema.index({ sirketId: 1, alisTarihi: -1 });
urunAlisSchema.index({ alisNo: 1 }, { unique: true, sparse: true });
urunAlisSchema.index({ alisTarihi: -1 });
urunAlisSchema.index({ durum: 1 });
urunAlisSchema.index({ odemeDurumu: 1 });
urunAlisSchema.index({ emailGonderildi: 1 });
urunAlisSchema.index({ silinmisMi: 1 });
urunAlisSchema.index({
  sirketAdi: 'text',
  'urunler.urunAdi': 'text',
  notlar: 'text',
  faturaNo: 'text',
  irsaliyeNo: 'text'
});
urunAlisSchema.virtual('formattedToplam').get(function() {
  const symbol = this.sirketCariBirimi === 'USD' ? '$' :
                 this.sirketCariBirimi === 'EUR' ? '€' : '₺';
  return `${this.toplamTutar.toFixed(2)} ${symbol}`;
});

urunAlisSchema.virtual('formattedAlisTarihi').get(function() {
  return this.alisTarihi ? this.alisTarihi.toLocaleDateString('tr-TR') : '';
});

urunAlisSchema.virtual('gunSayisi').get(function() {
  if (!this.alisTarihi) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.alisTarihi);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});
urunAlisSchema.pre('save', async function(next) {
  try {
    
    if (this.isNew && !this.alisNo) {
      const count = await this.constructor.countDocuments();
      const year = new Date().getFullYear();
      this.alisNo = `AL-${year}-${String(count + 6).padStart(6, '0')}`;
    }
    
    
    if (this.urunler && Array.isArray(this.urunler)) {
      this.urunler.forEach(urun => {
        urun.toplamFiyat = urun.adet * urun.birimFiyat;
      });
      
      
      this.toplamTutar = this.urunler.reduce((toplam, urun) => {
        return toplam + (urun.adet * urun.birimFiyat);
      }, 0);
    }
    
    
    this.kdvTutari = (this.toplamTutar * this.kdvOrani) / 100;
    this.genelToplam = this.toplamTutar + this.kdvTutari;
    
    
    this.kalanBorc = this.genelToplam - this.odenenTutar;
    
    
    if (this.odenenTutar <= 0) {
      this.odemeDurumu = 'odenmedi';
    } else if (this.odenenTutar >= this.genelToplam) {
      this.odemeDurumu = 'tamamen_odendi';
    } else {
      this.odemeDurumu = 'kismen_odendi';
    }
    
    
    this.sonGuncelleme = new Date();
    
    
    if (!this.isNew) {
      this.versiyon += 1;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});
urunAlisSchema.pre('findOneAndUpdate', function(next) {
  this.set({ sonGuncelleme: new Date() });
  next();
});
urunAlisSchema.post('save', function(doc, next) {
  console.log(`✅ Alış kaydedildi: ${doc.alisNo} - ${doc.sirketAdi} - ${doc.toplamTutar} ${doc.sirketCariBirimi}`);
  next();
});
urunAlisSchema.statics.findBySirket = function(sirketId) {
  return this.find({ 
    sirketId: sirketId, 
    silinmisMi: false 
  }).sort({ alisTarihi: -1 });
};

urunAlisSchema.statics.findByDateRange = function(baslangic, bitis) {
  return this.find({
    alisTarihi: {
      $gte: new Date(baslangic),
      $lte: new Date(bitis)
    },
    silinmisMi: false
  }).sort({ alisTarihi: -1 });
};

urunAlisSchema.statics.getTotalByMonth = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.aggregate([
    {
      $match: {
        alisTarihi: { $gte: startDate, $lte: endDate },
        silinmisMi: false
      }
    },
    {
      $group: {
        _id: '$sirketCariBirimi',
        toplam: { $sum: '$toplamTutar' },
        adet: { $sum: 1 }
      }
    }
  ]);
};

urunAlisSchema.statics.getPopularProducts = function(limit = 10) {
  return this.aggregate([
    { $match: { silinmisMi: false } },
    { $unwind: '$urunler' },
    {
      $group: {
        _id: '$urunler.urunAdi',
        toplamAdet: { $sum: '$urunler.adet' },
        toplamTutar: { $sum: '$urunler.toplamFiyat' },
        alisAdedi: { $sum: 1 }
      }
    },
    { $sort: { toplamAdet: -1 } },
    { $limit: limit }
  ]);
};
urunAlisSchema.methods.softDelete = function() {
  this.silinmisMi = true;
  this.silinmeTarihi = new Date();
  this.silenKullanici = 'sistem';
  return this.save();
};

urunAlisSchema.methods.restore = function() {
  this.silinmisMi = false;
  this.silinmeTarihi = undefined;
  this.silenKullanici = undefined;
  return this.save();
};

urunAlisSchema.methods.addPayment = function(tutar, aciklama = '') {
  if (tutar <= 0 || tutar > this.kalanBorc) {
    throw new Error('Geçersiz ödeme tutarı');
  }
  
  this.odenenTutar += tutar;
  
  if (!this.odemeBilgileri) {
    this.odemeBilgileri = [];
  }
  
  this.odemeBilgileri.push({
    tutar: tutar,
    tarih: new Date(),
    aciklama: aciklama,
    kullanici: 'sistem'
  });
  
  return this.save();
};

urunAlisSchema.methods.canBeDeleted = function() {
  
  return this.odenenTutar === 0 && this.durum !== 'teslim_alindi';
};
urunAlisSchema.path('urunler').validate(function(urunler) {
  return urunler && urunler.length > 0;
}, 'En az bir ürün eklenmelidir');
urunAlisSchema.path('toplamTutar').validate(function(tutar) {
  
  if (!this.urunler || !Array.isArray(this.urunler) || this.urunler.length === 0) {
    
    
    return true;
  }
  
  const hesaplananTutar = this.urunler.reduce((toplam, urun) => {
    return toplam + (urun.adet * urun.birimFiyat);
  }, 0);
  
  
  return Math.abs(tutar - hesaplananTutar) < 0.01;
}, 'Toplam tutar ürün tutarları ile uyuşmuyor');
const UrunAlis = mongoose.model('UrunAlis', urunAlisSchema);

module.exports = UrunAlis;