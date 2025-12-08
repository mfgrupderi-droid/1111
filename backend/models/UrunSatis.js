const mongoose = require('mongoose');

// Ürün alt şeması
const urunSchema = new mongoose.Schema({
  urunAdi: {
    type: String,
    required: [true, 'Ürün adı gereklidir'],
    trim: true,
    maxlength: [200, 'Ürün adı 200 karakterden uzun olamaz']
  },
  aciklama: {
    type: String,
    trim: true,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz'],
    default: ''
  },
  adet: {
    type: Number,
    required: [true, 'Ürün adedi gereklidir'],
    min: [0.01, 'Ürün adedi 0\'dan büyük olmalıdır'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Ürün adedi pozitif bir sayı olmalıdır'
    }
  },
  birimFiyat: {
    type: Number,
    required: [true, 'Birim fiyat gereklidir'],
    min: [0.01, 'Birim fiyat 0\'dan büyük olmalıdır'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Birim fiyat pozitif bir sayı olmalıdır'
    }
  },
  toplamFiyat: {
    type: Number,
    default: function() {
      return this.adet * this.birimFiyat;
    }
  }
}, {
  _id: false // Alt dokümanlarda _id oluşturmayı engelle
});

// Ana ürün satış şeması
const urunSatisSchema = new mongoose.Schema({
  satisNo: {
    type: String,
    unique: true,
    index: true
  },
  sirketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sirket',
    required: [true, 'Şirket seçimi gereklidir'],
    validate: {
      validator: async function(value) {
        // Şirketin var olup olmadığını kontrol et
        const Sirket = mongoose.model('Sirket');
        const sirket = await Sirket.findById(value);
        return !!sirket;
      },
      message: 'Seçilen şirket bulunamadı'
    }
  },
  sirketAdi: {
    type: String,
    required: true
  },
  sirketCariBirimi: {
    type: String,
    required: true,
    enum: ['TL', 'USD', 'EUR'],
    default: 'TL'
  },
  sirketEmailler: [{
    email: {
      type: String,
      required: true
    },
    tip: {
      type: String,
      enum: ['muhasebe', 'genel', 'satis'],
      default: 'genel'
    }
  }],
  satisTarihi: {
    type: Date,
    required: [true, 'Satış tarihi gereklidir'],
    validate: {
      validator: function(value) {
        // Satış tarihi bugünden ileri olamaz
        return value <= new Date();
      },
      message: 'Satış tarihi bugünden ileri olamaz'
    }
  },
  urunler: {
    type: [urunSchema],
    required: [true, 'En az bir ürün gereklidir'],
    validate: {
      validator: function(array) {
        return array && array.length > 0;
      },
      message: 'En az bir ürün eklenmelidir'
    }
  },
  toplamTutar: {
    type: Number,
    required: true,
    min: [0, 'Toplam tutar negatif olamaz']
  },
  emailGonderildi: {
    type: Boolean,
    default: false
  },
  emailGonderimTarihi: {
    type: Date,
    default: null
  },
  emailGonderimDetayi: {
    gonderenEmail: String,
    alicilar: [String],
    konu: String,
    durum: {
      type: String,
      enum: ['bekliyor', 'gonderildi', 'basarisiz'],
      default: 'bekliyor'
    },
    hataMesaji: String
  },
  notlar: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notlar 1000 karakterden uzun olamaz']
  },
  olusturanKullanici: {
    type: String,
    default: 'sistem'
  },
  guncelleyenKullanici: {
    type: String,
    default: 'sistem'
  }
}, {
  timestamps: true, // createdAt ve updatedAt alanlarını otomatik oluştur
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware: Satış numarası otomatik oluştur
// Pre-save middleware: Satış numarası otomatik oluştur
urunSatisSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.satisNo) {
      // Yeni kayıt için satış numarası oluştur
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // Bu ay için kaç satış yapılmış bul
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: new Date(year, now.getMonth(), 1),
          $lt: new Date(year, now.getMonth() + 1, 1)
        }
      });
      
      // Satış numarasını oluştur: YYYY-MM-XXXX formatında
      const sequence = String(count + 1).padStart(4, '0');
      this.satisNo = `${year}-${month}-${sequence}`;
    }
    
    // Şirket bilgilerini güncelle - SADECE şirketAdi ve cariBirimi boş ise
    if (this.sirketId && (this.isNew || this.isModified('sirketId'))) {
      const Sirket = mongoose.model('Sirket');
      const sirket = await Sirket.findById(this.sirketId);
      
      if (sirket) {
        // Sadece eğer sirketAdi henüz set edilmemişse set et
        if (!this.sirketAdi) {
          this.sirketAdi = sirket.sirketAdi;
        }
        // Sadece eğer sirketCariBirimi henüz set edilmemişse set et
        if (!this.sirketCariBirimi) {
          this.sirketCariBirimi = sirket.sirketCariBirimi || 'TL';
        }
        // Sadece eğer sirketEmailler henüz set edilmemişse set et
        if (!this.sirketEmailler || this.sirketEmailler.length === 0) {
          this.sirketEmailler = sirket.emailler || [];
        }
      }
    }
    
    // Ürün toplamlarını hesapla - SADECE toplamTutar boş ise
    if (this.urunler && this.urunler.length > 0) {
      this.urunler.forEach(urun => {
        urun.toplamFiyat = urun.adet * urun.birimFiyat;
      });
      
      // Genel toplam hesapla - SADECE eğer henüz set edilmemişse
      if (!this.toplamTutar && this.toplamTutar !== 0) {
        this.toplamTutar = this.urunler.reduce((toplam, urun) => {
          return toplam + (urun.adet * urun.birimFiyat);
        }, 0);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-update middleware
urunSatisSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  try {
    const update = this.getUpdate();
    
    // Güncelleyen kullanıcı bilgisi ekle
    update.guncelleyenKullanici = 'sistem'; // Gerçek uygulamada token'dan alınacak
    update.updatedAt = new Date();
    
    // Eğer ürünler güncelleniyor ise toplam tutarı yeniden hesapla
    if (update.urunler) {
      update.urunler.forEach(urun => {
        urun.toplamFiyat = urun.adet * urun.birimFiyat;
      });
      
      update.toplamTutar = update.urunler.reduce((toplam, urun) => {
        return toplam + (urun.adet * urun.birimFiyat);
      }, 0);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual alanlar
urunSatisSchema.virtual('formattedSatisTarihi').get(function() {
  return this.satisTarihi ? this.satisTarihi.toLocaleDateString('tr-TR') : null;
});

urunSatisSchema.virtual('formattedToplamTutar').get(function() {
  const currency = this.sirketCariBirimi === 'USD' ? '$' : 
                  this.sirketCariBirimi === 'EUR' ? '€' : '₺';
  
  const formattedAmount = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(this.toplamTutar || 0);
  
  return `${formattedAmount} ${currency}`;
});

urunSatisSchema.virtual('urunSayisi').get(function() {
  return this.urunler ? this.urunler.length : 0;
});

urunSatisSchema.virtual('toplamUrunAdedi').get(function() {
  return this.urunler ? this.urunler.reduce((total, urun) => total + urun.adet, 0) : 0;
});

// Index'ler - performans için
urunSatisSchema.index({ satisNo: 1 });
urunSatisSchema.index({ sirketId: 1 });
urunSatisSchema.index({ satisTarihi: -1 });
urunSatisSchema.index({ sirketAdi: 1 });
urunSatisSchema.index({ emailGonderildi: 1 });
urunSatisSchema.index({ createdAt: -1 });

// Compound index'ler
urunSatisSchema.index({ sirketId: 1, satisTarihi: -1 });
urunSatisSchema.index({ satisTarihi: -1, toplamTutar: -1 });

// Static metodlar
urunSatisSchema.statics.findBySirket = function(sirketId) {
  return this.find({ sirketId }).sort({ satisTarihi: -1 });
};

urunSatisSchema.statics.findByDateRange = function(baslangic, bitis) {
  return this.find({
    satisTarihi: {
      $gte: new Date(baslangic),
      $lte: new Date(bitis)
    }
  }).sort({ satisTarihi: -1 });
};

urunSatisSchema.statics.getToplamSatisRaporu = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        toplamSatisSayisi: { $sum: 1 },
        toplamTutar: { $sum: '$toplamTutar' },
        ortalamaSatisTutari: { $avg: '$toplamTutar' },
        toplamUrunSayisi: { $sum: { $size: '$urunler' } }
      }
    }
  ]);
};

urunSatisSchema.statics.getSirketBazliRapor = async function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          sirketId: '$sirketId',
          sirketAdi: '$sirketAdi'
        },
        satisSayisi: { $sum: 1 },
        toplamTutar: { $sum: '$toplamTutar' },
        ortalamaTutar: { $avg: '$toplamTutar' },
        sonSatisTarihi: { $max: '$satisTarihi' }
      }
    },
    {
      $sort: { toplamTutar: -1 }
    }
  ]);
};
urunSatisSchema.methods.emailGonder = function() {
  this.emailGonderildi = true;
  this.emailGonderimTarihi = new Date();
  return this.save();
};

urunSatisSchema.methods.getOzet = function() {
  return {
    satisNo: this.satisNo,
    sirketAdi: this.sirketAdi,
    satisTarihi: this.formattedSatisTarihi,
    urunSayisi: this.urunSayisi,
    toplamTutar: this.formattedToplamTutar,
    emailDurumu: this.emailGonderildi ? 'Gönderildi' : 'Bekliyor'
  };
};

module.exports = mongoose.model('UrunSatis', urunSatisSchema);