const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const UrunSatis = require('../models/UrunSatis');
const Sirket = require('../models/Şirketler');

const router = express.Router();

// Email transporter konfigürasyonu
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Cari işlem ekleme fonksiyonu
const addCariIslem = async (sirketId, tutar, aciklama) => {
  try {
    const sirket = await Sirket.findById(sirketId);
    if (!sirket) {
      throw new Error('Şirket bulunamadı');
    }

    // Yeni işlemi ekle
    sirket.islemler.push({
      islemTarihi: new Date(),
      islemAciklamasi: aciklama,
      tutar: tutar // Pozitif: Borç artar
    });

    // Cari bakiyeyi güncelle
    sirket.sirketCarisi += tutar;

    await sirket.save();
    console.log(`Cari işlem eklendi: ${sirket.sirketAdi} - ${tutar} ${sirket.sirketCariBirimi}`);
    
    return sirket;
  } catch (error) {
    console.error('Cari işlem ekleme hatası:', error);
    throw error;
  }
};

// Cari işlem düzeltme fonksiyonu (güncelleme ve silme için)
const updateCariIslem = async (sirketId, eskiTutar, yeniTutar, aciklama) => {
  try {
    const sirket = await Sirket.findById(sirketId);
    if (!sirket) {
      throw new Error('Şirket bulunamadı');
    }

    // Farkı hesapla
    const fark = yeniTutar - eskiTutar;
    
    if (fark !== 0) {
      // Yeni işlemi ekle
      sirket.islemler.push({
        islemTarihi: new Date(),
        islemAciklamasi: aciklama,
        tutar: fark
      });

      // Cari bakiyeyi güncelle
      sirket.sirketCarisi += fark;

      await sirket.save();
      console.log(`Cari düzeltme yapıldı: ${sirket.sirketAdi} - ${fark} ${sirket.sirketCariBirimi}`);
    }
    
    return sirket;
  } catch (error) {
    console.error('Cari düzeltme hatası:', error);
    throw error;
  }
};

// Cari işlem silme fonksiyonu
const removeCariIslem = async (sirketId, tutar, aciklama) => {
  try {
    const sirket = await Sirket.findById(sirketId);
    if (!sirket) {
      throw new Error('Şirket bulunamadı');
    }

    // Negatif tutar ile işlem ekle (borcu azalt)
    sirket.islemler.push({
      islemTarihi: new Date(),
      islemAciklamasi: aciklama,
      tutar: -tutar // Negatif: Borç azalır
    });

    // Cari bakiyeyi güncelle
    sirket.sirketCarisi -= tutar;

    await sirket.save();
    console.log(`Cari silme işlemi: ${sirket.sirketAdi} - (-${tutar}) ${sirket.sirketCariBirimi}`);
    
    return sirket;
  } catch (error) {
    console.error('Cari silme hatası:', error);
    throw error;
  }
};

// Validation middleware
const validateUrunSatis = (req, res, next) => {
  const { sirketId, satisTarihi, urunler } = req.body;
  
  // Temel validasyonlar
  if (!sirketId) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Şirket seçimi gereklidir' 
    });
  }
  
  if (!mongoose.Types.ObjectId.isValid(sirketId)) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Geçersiz şirket ID formatı' 
    });
  }
  
  if (!satisTarihi) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Satış tarihi gereklidir' 
    });
  }
  
  // Tarih kontrolü
  const satisDate = new Date(satisTarihi);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (satisDate > today) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Satış tarihi bugünden ileri olamaz' 
    });
  }
  
  // Ürün validasyonu
  if (!urunler || !Array.isArray(urunler) || urunler.length === 0) {
    return res.status(400).json({ 
      success: false, 
      msg: 'En az bir ürün eklenmelidir' 
    });
  }
  
  // Her ürün için validasyon
  for (let i = 0; i < urunler.length; i++) {
    const urun = urunler[i];
    
    if (!urun.urunAdi || urun.urunAdi.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        msg: `${i + 1}. ürünün adı gereklidir` 
      });
    }
    
    if (!urun.adet || parseFloat(urun.adet) <= 0) {
      return res.status(400).json({ 
        success: false, 
        msg: `${i + 1}. ürünün adedi geçerli bir sayı olmalıdır` 
      });
    }
    
    if (!urun.birimFiyat || parseFloat(urun.birimFiyat) <= 0) {
      return res.status(400).json({ 
        success: false, 
        msg: `${i + 1}. ürünün birim fiyatı geçerli bir sayı olmalıdır` 
      });
    }
  }
  
  next();
};

// 1. Tüm satışları listele - GET /api/urun-satis
router.get('/', async (req, res) => {
  try {
    const { 
      sirketId, 
      baslangicTarihi, 
      bitisTarihi, 
      emailDurumu,
      page = 1, 
      limit = 50,
      sort = '-createdAt' 
    } = req.query;
    
    let filter = {};
    
    if (sirketId && mongoose.Types.ObjectId.isValid(sirketId)) {
      filter.sirketId = sirketId;
    }
    
    if (baslangicTarihi || bitisTarihi) {
      filter.satisTarihi = {};
      if (baslangicTarihi) {
        filter.satisTarihi.$gte = new Date(baslangicTarihi);
      }
      if (bitisTarihi) {
        filter.satisTarihi.$lte = new Date(bitisTarihi);
      }
    }
    
    if (emailDurumu !== undefined) {
      filter.emailGonderildi = emailDurumu === 'true';
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Populate field'larını düzelt
    const [satislar, totalCount] = await Promise.all([
      UrunSatis.find(filter)
        .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UrunSatis.countDocuments(filter)
    ]);
    
    res.json(satislar);
    
  } catch (error) {
    console.error('Satış listesi çekme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Satış kayıtları getirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. Tekil satış detayı - GET /api/urun-satis/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz satış ID formatı' 
      });
    }
    
    const satis = await UrunSatis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler adres telefon')
      .lean();
    
    if (!satis) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Satış kaydı bulunamadı' 
      });
    }
    
    res.json({
      success: true,
      data: satis
    });
    
  } catch (error) {
    console.error('Satış detayı çekme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Satış detayı getirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 3. Yeni satış oluştur - POST /api/urun-satis
router.post('/', validateUrunSatis, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { sirketId, satisTarihi, urunler, notlar } = req.body;
    
    console.log('POST isteği alındı:', { sirketId, satisTarihi, urunler: urunler?.length });
    
    // Şirketin varlığını kontrol et
    const sirket = await Sirket.findById(sirketId).session(session);
    if (!sirket) {
      console.log('Şirket bulunamadı:', sirketId);
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Seçilen şirket bulunamadı' 
      });
    }
    
    console.log('Şirket bulundu:', sirket.sirketAdi);
    
    // Ürünleri işle ve toplam tutarı hesapla
    const processedUrunler = urunler.map(urun => ({
      urunAdi: urun.urunAdi.trim(),
      aciklama: urun.aciklama ? urun.aciklama.trim() : '',
      adet: parseFloat(urun.adet),
      birimFiyat: parseFloat(urun.birimFiyat)
    }));
    
    const toplamTutar = processedUrunler.reduce((toplam, urun) => {
      return toplam + (urun.adet * urun.birimFiyat);
    }, 0);
    
    console.log('Toplam tutar hesaplandı:', toplamTutar);
    
    // Yeni satış oluştur
    const yeniSatis = new UrunSatis({
      sirketId,
      sirketAdi: sirket.sirketAdi,
      sirketCariBirimi: sirket.sirketCariBirimi || 'TL',
      sirketEmailler: sirket.emailler || ["bzkmuhasebe@gmail.com"],
      satisTarihi: new Date(satisTarihi),
      urunler: processedUrunler,
      toplamTutar: toplamTutar,
      notlar: notlar ? notlar.trim() : '',
      olusturanKullanici: 'sistem'
    });
    
    console.log('Yeni satış objesi oluşturuldu');
    
    // Veritabanına kaydet
    const kaydedilenSatis = await yeniSatis.save({ session });
    console.log('Satış kaydedildi:', kaydedilenSatis._id);
    
    // Cari hesaba işle
    await addCariIslem(
      sirketId, 
      toplamTutar, 
      `Satış No: ${kaydedilenSatis.satisNo || kaydedilenSatis._id} - ${kaydedilenSatis.satisTarihi.toLocaleDateString('tr-TR')}`
    );
    
    await session.commitTransaction();
    
    // Populate ederek tam veriyi döndür
    const tamSatis = await UrunSatis.findById(kaydedilenSatis._id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler');
    
    res.status(201).json({
      success: true,
      msg: 'Satış başarıyla kaydedildi ve cari hesaba işlendi',
      satis: tamSatis
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Satış kaydetme hatası:', error);
    console.error('Hata detayı:', error.stack);
    
    // Duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu satış numarası zaten kullanılıyor' 
      });
    }
    
    // Validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        msg: 'Doğrulama hatası',
        errors: messages 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: 'Satış kaydedilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

// 4. Satış güncelle - PUT /api/urun-satis/:id
router.put('/:id', validateUrunSatis, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { sirketId, satisTarihi, urunler, notlar } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz satış ID formatı' 
      });
    }
    
    // Eski satış kaydını al
    const eskiSatis = await UrunSatis.findById(id).session(session);
    if (!eskiSatis) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Güncellenecek satış kaydı bulunamadı' 
      });
    }
    
    // Şirketin varlığını kontrol et
    const sirket = await Sirket.findById(sirketId).session(session);
    if (!sirket) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Seçilen şirket bulunamadı' 
      });
    }
    
    // Ürünleri işle ve toplam tutarı hesapla
    const processedUrunler = urunler.map(urun => ({
      urunAdi: urun.urunAdi.trim(),
      aciklama: urun.aciklama ? urun.aciklama.trim() : '',
      adet: parseFloat(urun.adet),
      birimFiyat: parseFloat(urun.birimFiyat)
    }));
    
    const yeniToplamTutar = processedUrunler.reduce((toplam, urun) => {
      return toplam + (urun.adet * urun.birimFiyat);
    }, 0);
    
    // Güncellenecek veriyi hazırla
    const guncellenecekVeri = {
      sirketId,
      sirketAdi: sirket.sirketAdi,
      sirketCariBirimi: sirket.sirketCariBirimi || 'TL',
      sirketEmailler: sirket.emailler || ["bzkmuhasebe@gmail.com"],
      satisTarihi: new Date(satisTarihi),
      urunler: processedUrunler,
      toplamTutar: yeniToplamTutar,
      notlar: notlar ? notlar.trim() : '',
      guncelleyenKullanici: 'sistem'
    };
    
    // Güncelleme işlemi
    const guncellenenSatis = await UrunSatis.findByIdAndUpdate(
      id, 
      guncellenecekVeri, 
      { 
        new: true,
        runValidators: true,
        session
      }
    );
    
    // Cari hesap düzeltmesi
    if (eskiSatis.sirketId.toString() === sirketId.toString()) {
      // Aynı şirket - tutar farkını düzelt
      await updateCariIslem(
        sirketId, 
        eskiSatis.toplamTutar, 
        yeniToplamTutar,
        `Satış Güncelleme - No: ${guncellenenSatis.satisNo || guncellenenSatis._id} - ${guncellenenSatis.satisTarihi.toLocaleDateString('tr-TR')}`
      );
    } else {
      // Farklı şirket - eski şirketten düş, yeni şirkete ekle
      await removeCariIslem(
        eskiSatis.sirketId, 
        eskiSatis.toplamTutar,
        `Satış İptali (Güncelleme) - No: ${eskiSatis.satisNo || eskiSatis._id}`
      );
      
      await addCariIslem(
        sirketId, 
        yeniToplamTutar,
        `Satış No: ${guncellenenSatis.satisNo || guncellenenSatis._id} - ${guncellenenSatis.satisTarihi.toLocaleDateString('tr-TR')}`
      );
    }
    
    await session.commitTransaction();
    
    const populatedSatis = await UrunSatis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler');
    
    res.json({
      success: true,
      msg: 'Satış başarıyla güncellendi ve cari hesap düzeltildi',
      satis: populatedSatis
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Satış güncelleme hatası:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        msg: 'Doğrulama hatası',
        errors: messages 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: 'Satış güncellenemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

// 5. Satış sil - DELETE /api/urun-satis/:id
router.delete('/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz satış ID formatı' 
      });
    }
    
    // Satış kaydını al (silmeden önce cari işlem için)
    const satis = await UrunSatis.findById(id).session(session);
    
    if (!satis) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Silinecek satış kaydı bulunamadı' 
      });
    }
    
    // Cari hesaptan düş
    await removeCariIslem(
      satis.sirketId, 
      satis.toplamTutar,
      `Satış İptali - No: ${satis.satisNo || satis._id} - ${satis.satisTarihi.toLocaleDateString('tr-TR')}`
    );
    
    // Satış kaydını sil
    const silinenSatis = await UrunSatis.findByIdAndDelete(id, { session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      msg: 'Satış başarıyla silindi ve cariden düşüldü',
      silinenSatis: {
        _id: silinenSatis._id,
        satisNo: silinenSatis.satisNo || silinenSatis._id,
        toplamTutar: silinenSatis.toplamTutar
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Satış silme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Satış silinemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});

// 6. Email bildirimi gönder - POST /api/urun-satis/:id/send-notification
router.post('/:id/send-notification', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz satış ID formatı' 
      });
    }
    
    // Satış kaydını bul
    const satis = await UrunSatis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler');
    
    if (!satis) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Satış kaydı bulunamadı' 
      });
    }
    
    // Email adreslerini kontrol et
    const emailAddresses = satis.sirketEmailler
      .filter(emailObj => emailObj.email && emailObj.email.trim() !== '')
      .map(emailObj => emailObj.email);
    
    if (emailAddresses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Şirket için email adresi bulunamadı' 
      });
    }
    
    // Email içeriğini hazırla
    const emailContent = {
      subject: `Satış Bildirimi - ${satis.satisNo || satis._id}`,
      html: `
        <h2>Satış Bildirimi</h2>
        <p><strong>Satış No:</strong> ${satis.satisNo || satis._id}</p>
        <p><strong>Tarih:</strong> ${satis.satisTarihi.toLocaleDateString('tr-TR')}</p>
        <p><strong>Toplam Tutar:</strong> ${satis.toplamTutar.toFixed(2)} ${satis.sirketCariBirimi}</p>
        <p><strong>Güncel Cari Bakiye:</strong> ${satis.sirketId.sirketCarisi.toFixed(2)} ${satis.sirketCariBirimi}</p>
        
        <h3>Satılan Ürünler:</h3>
        <ul>
          ${satis.urunler.map(urun => `
            <li>${urun.urunAdi} - ${urun.adet} adet x ${urun.birimFiyat} = ${(urun.adet * urun.birimFiyat).toFixed(2)} ${satis.sirketCariBirimi}</li>
          `).join('')}
        </ul>
        
        ${satis.notlar ? `<p><strong>Notlar:</strong> ${satis.notlar}</p>` : ''}
      `
    };
    
    // Email gönder (eğer SMTP ayarları yapılmışsa)
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createEmailTransporter();
      
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: emailAddresses.join(','),
        subject: emailContent.subject,
        html: emailContent.html
      });
    }
    
    // Satış kaydını güncelle
    satis.emailGonderildi = true;
    satis.emailGonderimTarihi = new Date();
    satis.emailGonderimDetayi = {
      gonderenEmail: process.env.SMTP_USER || 'sistem',
      alicilar: emailAddresses,
      konu: emailContent.subject,
      durum: 'gonderildi'
    };
    
    await satis.save();
    
    res.json({
      success: true,
      msg: 'Email bildirimi başarıyla gönderildi',
      sentTo: emailAddresses
    });
    
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    
    // Satış kaydını hata ile güncelle
    try {
      await UrunSatis.findByIdAndUpdate(req.params.id, {
        'emailGonderimDetayi.durum': 'basarisiz',
        'emailGonderimDetayi.hataMesaji': error.message
      });
    } catch (updateError) {
      console.error('Email hata durumu güncellenemedi:', updateError);
    }
    
    res.status(500).json({ 
      success: false, 
      msg: 'Email gönderilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 7. Şirket cari durumu görüntüle - GET /api/urun-satis/cari/:sirketId
router.get('/cari/:sirketId', async (req, res) => {
  try {
    const { sirketId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(sirketId)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz şirket ID formatı' 
      });
    }
    
    const sirket = await Sirket.findById(sirketId)
      .select('sirketAdi sirketCarisi sirketCariBirimi islemler')
      .lean();
    
    if (!sirket) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Şirket bulunamadı' 
      });
    }
    
    // Son 10 işlemi al
    const sonIslemler = sirket.islemler
      .sort((a, b) => new Date(b.islemTarihi) - new Date(a.islemTarihi))
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        sirketAdi: sirket.sirketAdi,
        guncelBakiye: sirket.sirketCarisi,
        cariBirimi: sirket.sirketCariBirimi,
        sonIslemler: sonIslemler
      }
    });
    
  } catch (error) {
    console.error('Cari durum çekme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Cari durum getirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;