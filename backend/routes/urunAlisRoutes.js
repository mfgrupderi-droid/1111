const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const UrunAlis = require('../models/UrunAlis');
const Sirket = require('../models/Şirketler');

const router = express.Router();


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


const addCariIslem = async (sirketId, tutar, aciklama) => {
  try {
    const sirket = await Sirket.findById(sirketId);
    if (!sirket) {
      throw new Error('Şirket bulunamadı');
    }

    
    sirket.islemler.push({
      islemTarihi: new Date(),
      islemAciklamasi: aciklama,
      tutar: -tutar 
    });

    
    sirket.sirketCarisi -= tutar;

    await sirket.save();
    console.log(`Cari işlem eklendi: ${sirket.sirketAdi} - (-${tutar}) ${sirket.sirketCariBirimi}`);
    
    return sirket;
  } catch (error) {
    console.error('Cari işlem ekleme hatası:', error);
    throw error;
  }
};


const updateCariIslem = async (sirketId, eskiTutar, yeniTutar, aciklama) => {
  try {
    const sirket = await Sirket.findById(sirketId);
    if (!sirket) {
      throw new Error('Şirket bulunamadı');
    }

    
    const fark = yeniTutar - eskiTutar;
    
    if (fark !== 0) {
      
      sirket.sirketCarisi += eskiTutar; 
      
      
      sirket.sirketCarisi -= yeniTutar; 
      
      
      sirket.islemler.push({
        islemTarihi: new Date(),
        islemAciklamasi: aciklama,
        tutar: -fark 
      });

      await sirket.save();
      console.log(`✅ Cari düzeltme yapıldı: ${sirket.sirketAdi} - Fark: ${-fark} ${sirket.sirketCariBirimi}`);
    } else {
      console.log(`ℹ️ Tutar değişmedi, cari işlem eklenmedi`);
    }
    
    return sirket;
  } catch (error) {
    console.error('❌ Cari düzeltme hatası:', error);
    throw error;
  }
};


const removeCariIslem = async (sirketId, tutar, aciklama) => {
  try {
    const sirket = await Sirket.findById(sirketId);
    if (!sirket) {
      throw new Error('Şirket bulunamadı');
    }

    
    sirket.islemler.push({
      islemTarihi: new Date(),
      islemAciklamasi: aciklama,
      tutar: tutar 
    });

    
    sirket.sirketCarisi += tutar;

    await sirket.save();
    console.log(`Cari silme işlemi: ${sirket.sirketAdi} - ${tutar} ${sirket.sirketCariBirimi}`);
    
    return sirket;
  } catch (error) {
    console.error('Cari silme hatası:', error);
    throw error;
  }
};


const validateUrunAlis = (req, res, next) => {
  const { sirketId, alisTarihi, urunler } = req.body;
  
  
  if (!sirketId) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Satıcı şirket seçimi gereklidir' 
    });
  }
  
  if (!mongoose.Types.ObjectId.isValid(sirketId)) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Geçersiz şirket ID formatı' 
    });
  }
  
  if (!alisTarihi) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Alış tarihi gereklidir' 
    });
  }
  
  
  const alisDate = new Date(alisTarihi);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (alisDate > today) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Alış tarihi bugünden ileri olamaz' 
    });
  }
  
  
  if (!urunler || !Array.isArray(urunler) || urunler.length === 0) {
    return res.status(400).json({ 
      success: false, 
      msg: 'En az bir ürün eklenmelidir' 
    });
  }
  
  
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


router.get('/', async (req, res) => {
  try {
    const { 
      sirketId, 
      baslangicTarihi, 
      bitisTarihi, 
      emailDurumu,
      year = 2026,
      page = 1, 
      limit = 50,
      sort = '-createdAt' 
    } = req.query;
    
    let filter = {};

    if (year == 2025) {
      filter.alisTarihi = {
        $gte: new Date('2025-01-01'),
        $lt: new Date('2026-01-01')
      };
    } else {
      filter.year = parseInt(year);
    }
    
    if (sirketId && mongoose.Types.ObjectId.isValid(sirketId)) {
      filter.sirketId = sirketId;
    }
    
    if (baslangicTarihi || bitisTarihi) {
      if (!filter.alisTarihi) {
        filter.alisTarihi = {};
      }
      if (baslangicTarihi) {
        filter.alisTarihi.$gte = new Date(baslangicTarihi);
      }
      if (bitisTarihi) {
        filter.alisTarihi.$lte = new Date(bitisTarihi);
      }
    }
    
    if (emailDurumu !== undefined) {
      filter.emailGonderildi = emailDurumu === 'true';
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    
    const [alislar, totalCount] = await Promise.all([
      UrunAlis.find(filter)
        .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler tip')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UrunAlis.countDocuments(filter)
    ]);
    
    
    const saticiAlislar = alislar.filter(alis => 
      alis.sirketId && alis.sirketId.tip === 'satici'
    );
    
    res.json(saticiAlislar);
    
  } catch (error) {
    console.error('Alış listesi çekme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Alış kayıtları getirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz alış ID formatı' 
      });
    }
    
    const alis = await UrunAlis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler adres telefon tip')
      .lean();
    
    if (!alis) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Alış kaydı bulunamadı' 
      });
    }
    
    
    if (alis.sirketId && alis.sirketId.tip !== 'satici') {
      return res.status(403).json({ 
        success: false, 
        msg: 'Bu şirket satıcı değil, alış işlemi yapılamaz' 
      });
    }
    
    res.json({
      success: true,
      data: alis
    });
    
  } catch (error) {
    console.error('Alış detayı çekme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Alış detayı getirilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


router.post('/', validateUrunAlis, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { sirketId, alisTarihi, urunler, notlar } = req.body;
    
    console.log('POST isteği alındı:', { sirketId, alisTarihi, urunler: urunler?.length });
    
    
    const sirket = await Sirket.findById(sirketId).session(session);
    if (!sirket) {
      console.log('Şirket bulunamadı:', sirketId);
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Seçilen şirket bulunamadı' 
      });
    }
    
    if (sirket.tip !== 'satici') {
      console.log('Şirket satıcı değil:', sirket.sirketAdi, sirket.tip);
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu şirket satıcı değil, alış işlemi yapılamaz' 
      });
    }
    
    console.log('Satıcı şirket bulundu:', sirket.sirketAdi);
    
    
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
    
    
    const yeniAlis = new UrunAlis({
      sirketId,
      sirketAdi: sirket.sirketAdi,
      sirketCariBirimi: sirket.sirketCariBirimi || 'TL',
      sirketEmailler: sirket.emailler || [],
      alisTarihi: new Date(alisTarihi),
      urunler: processedUrunler,
      toplamTutar: toplamTutar,
      notlar: notlar ? notlar.trim() : '',
      year: 2026,
      olusturanKullanici: 'sistem'
    });
    
    console.log('Yeni alış objesi oluşturuldu');
    
    
    const kaydedilenAlis = await yeniAlis.save({ session });
    console.log('Alış kaydedildi:', kaydedilenAlis._id);
    
    
    await addCariIslem(
      sirketId, 
      toplamTutar, 
      `Alış No: ${kaydedilenAlis.alisNo || kaydedilenAlis._id} - ${kaydedilenAlis.alisTarihi.toLocaleDateString('tr-TR')}`
    );
    
    await session.commitTransaction();
    
    
    const tamAlis = await UrunAlis.findById(kaydedilenAlis._id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler tip');
    
    res.status(201).json({
      success: true,
      msg: 'Alış başarıyla kaydedildi ve cari hesaba işlendi',
      alis: tamAlis
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Alış kaydetme hatası:', error);
    console.error('Hata detayı:', error.stack);
    
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu alış numarası zaten kullanılıyor' 
      });
    }
    
    
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
      msg: 'Alış kaydedilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});


router.put('/:id', validateUrunAlis, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    const { sirketId, alisTarihi, urunler, notlar } = req.body;
    
    console.log('🔄 PUT isteği alındı:', { id, sirketId, urunSayisi: urunler?.length });
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz alış ID formatı' 
      });
    }
    
    
    const eskiAlis = await UrunAlis.findById(id).session(session);
    if (!eskiAlis) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Güncellenecek alış kaydı bulunamadı' 
      });
    }
    
    console.log('📦 Eski alış bulundu:', {
      alisNo: eskiAlis.alisNo,
      eskiSirket: eskiAlis.sirketId,
      eskiTutar: eskiAlis.toplamTutar
    });
    
    
    const sirket = await Sirket.findById(sirketId).session(session);
    if (!sirket) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Seçilen şirket bulunamadı' 
      });
    }
    
    if (sirket.tip !== 'satici') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu şirket satıcı değil, alış işlemi yapılamaz' 
      });
    }
    
    console.log('🏢 Yeni şirket kontrol edildi:', sirket.sirketAdi);
    
    
    const processedUrunler = urunler.map(urun => ({
      urunAdi: urun.urunAdi.trim(),
      aciklama: urun.aciklama ? urun.aciklama.trim() : '',
      adet: parseFloat(urun.adet),
      birimFiyat: parseFloat(urun.birimFiyat)
    }));
    
    const yeniToplamTutar = processedUrunler.reduce((toplam, urun) => {
      return toplam + (urun.adet * urun.birimFiyat);
    }, 0);
    
    console.log('💰 Yeni toplam tutar:', yeniToplamTutar);
    
    
    if (eskiAlis.sirketId.toString() === sirketId.toString()) {
      console.log('🔄 Aynı şirket - tutar düzeltmesi yapılıyor...');
      
      
      await updateCariIslem(
        sirketId, 
        eskiAlis.toplamTutar, 
        yeniToplamTutar,
        `Alış Güncelleme - No: ${eskiAlis.alisNo || eskiAlis._id} - ${new Date(alisTarihi).toLocaleDateString('tr-TR')}`
      );
    } else {
      console.log('🔄 Farklı şirket - cari transferi yapılıyor...');
      
      
      await removeCariIslem(
        eskiAlis.sirketId, 
        eskiAlis.toplamTutar,
        `Alış İptali (Güncelleme) - No: ${eskiAlis.alisNo || eskiAlis._id}`
      );
      
      await addCariIslem(
        sirketId, 
        yeniToplamTutar,
        `Alış No: ${eskiAlis.alisNo || eskiAlis._id} - ${new Date(alisTarihi).toLocaleDateString('tr-TR')}`
      );
    }
    
    
    const guncellenecekVeri = {
      sirketId,
      sirketAdi: sirket.sirketAdi,
      sirketCariBirimi: sirket.sirketCariBirimi || 'TL',
      sirketEmailler: sirket.emailler || [],
      alisTarihi: new Date(alisTarihi),
      urunler: processedUrunler,
      toplamTutar: yeniToplamTutar,
      notlar: notlar ? notlar.trim() : '',
      guncelleyenKullanici: 'sistem',
      guncellenmeTarihi: new Date()
    };
    
    const guncellenenAlis = await UrunAlis.findByIdAndUpdate(
      id, 
      guncellenecekVeri, 
      { 
        new: true,
        runValidators: true,
        session
      }
    );
    
    await session.commitTransaction();
    console.log('✅ İşlem başarıyla tamamlandı');
    
    
    const populatedAlis = await UrunAlis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler tip');
    
    res.json({
      success: true,
      msg: 'Alış başarıyla güncellendi ve cari hesap düzeltildi',
      alis: populatedAlis
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Alış güncelleme hatası:', error);
    console.error('Hata detayı:', error.stack);
    
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
      msg: 'Alış güncellenemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});


router.delete('/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz alış ID formatı' 
      });
    }
    
    
    const alis = await UrunAlis.findById(id).session(session);
    
    if (!alis) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Silinecek alış kaydı bulunamadı' 
      });
    }
    
    
    await removeCariIslem(
      alis.sirketId, 
      alis.toplamTutar,
      `Alış İptali - No: ${alis.alisNo || alis._id} - ${alis.alisTarihi.toLocaleDateString('tr-TR')}`
    );
    
    
    const silinenAlis = await UrunAlis.findByIdAndDelete(id, { session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      msg: 'Alış başarıyla silindi ve cariden düşüldü',
      silinenAlis: {
        _id: silinenAlis._id,
        alisNo: silinenAlis.alisNo || silinenAlis._id,
        toplamTutar: silinenAlis.toplamTutar
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Alış silme hatası:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Alış silinemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});


router.post('/:id/send-notification', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz alış ID formatı' 
      });
    }
    
    
    const alis = await UrunAlis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler tip');
    
    if (!alis) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Alış kaydı bulunamadı' 
      });
    }
    
    
    if (alis.sirketId && alis.sirketId.tip !== 'satici') {
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu şirket satıcı değil' 
      });
    }
    
    
    const emailAddresses = alis.sirketEmailler
      .filter(emailObj => emailObj.email && emailObj.email.trim() !== '')
      .map(emailObj => emailObj.email);
    
    if (emailAddresses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Şirket için email adresi bulunamadı' 
      });
    }
    
    
    const emailContent = {
      subject: `Alış Bildirimi - ${alis.alisNo || alis._id}`,
      html: `
        <h2>Alış Bildirimi</h2>
        <p><strong>Alış No:</strong> ${alis.alisNo || alis._id}</p>
        <p><strong>Tarih:</strong> ${alis.alisTarihi.toLocaleDateString('tr-TR')}</p>
        <p><strong>Toplam Tutar:</strong> ${alis.toplamTutar.toFixed(2)} ${alis.sirketCariBirimi}</p>
        <p><strong>Güncel Cari Bakiye:</strong> ${alis.sirketId.sirketCarisi.toFixed(2)} ${alis.sirketCariBirimi}</p>
        
        <h3>Alınan Ürünler:</h3>
        <ul>
          ${alis.urunler.map(urun => `
            <li>${urun.urunAdi} - ${urun.adet} adet x ${urun.birimFiyat} = ${(urun.adet * urun.birimFiyat).toFixed(2)} ${alis.sirketCariBirimi}</li>
          `).join('')}
        </ul>
        
        ${alis.notlar ? `<p><strong>Notlar:</strong> ${alis.notlar}</p>` : ''}
      `
    };
    
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createEmailTransporter();
      
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: emailAddresses.join(','),
        subject: emailContent.subject,
        html: emailContent.html
      });
    }
    
    
    alis.emailGonderildi = true;
    alis.emailGonderimTarihi = new Date();
    alis.emailGonderimDetayi = {
      gonderenEmail: process.env.SMTP_USER || 'sistem',
      alicilar: emailAddresses,
      konu: emailContent.subject,
      durum: 'gonderildi'
    };
    
    await alis.save();
    
    res.json({
      success: true,
      msg: 'Email bildirimi başarıyla gönderildi',
      sentTo: emailAddresses
    });
    
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    
    
    try {
      await UrunAlis.findByIdAndUpdate(req.params.id, {
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
      .select('sirketAdi sirketCarisi sirketCariBirimi islemler tip')
      .lean();
    
    if (!sirket) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Şirket bulunamadı' 
      });
    }
    
    if (sirket.tip !== 'satici') {
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu şirket satıcı değil' 
      });
    }
    
    
    const sonIslemler = sirket.islemler
      .sort((a, b) => new Date(b.islemTarihi) - new Date(a.islemTarihi))
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        sirketAdi: sirket.sirketAdi,
        guncelBakiye: sirket.sirketCarisi,
        cariBirimi: sirket.sirketCariBirimi,
        tip: sirket.tip,
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