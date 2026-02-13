const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const UrunSatis = require('../models/UrunSatis');
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
      tutar: tutar 
    });

    
    sirket.sirketCarisi += tutar;

    await sirket.save();
    console.log(`Cari işlem eklendi: ${sirket.sirketAdi} - ${tutar} ${sirket.sirketCariBirimi}`);
    
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
      
      sirket.islemler.push({
        islemTarihi: new Date(),
        islemAciklamasi: aciklama,
        tutar: fark
      });

      
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


const removeCariIslem = async (sirketId, tutar, aciklama) => {
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
    console.log(`Cari silme işlemi: ${sirket.sirketAdi} - (-${tutar}) ${sirket.sirketCariBirimi}`);
    
    return sirket;
  } catch (error) {
    console.error('Cari silme hatası:', error);
    throw error;
  }
};


const validateUrunSatis = (req, res, next) => {
  const { sirketId, satisTarihi, urunler } = req.body;
  
  
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
  
  
  const satisDate = new Date(satisTarihi);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (satisDate > today) {
    return res.status(400).json({ 
      success: false, 
      msg: 'Satış tarihi bugünden ileri olamaz' 
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
      filter.satisTarihi = {
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
      if (!filter.satisTarihi) {
        filter.satisTarihi = {};
      }
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


router.post('/', validateUrunSatis, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { sirketId, satisTarihi, urunler, notlar } = req.body;
    
    console.log('POST isteği alındı:', { sirketId, satisTarihi, urunler: urunler?.length });
    
    
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
    
    
    const yeniSatis = new UrunSatis({
      sirketId,
      sirketAdi: sirket.sirketAdi,
      sirketCariBirimi: sirket.sirketCariBirimi || 'TL',
      sirketEmailler: sirket.emailler || ["bzkmuhasebe@gmail.com"],
      satisTarihi: new Date(satisTarihi),
      urunler: processedUrunler,
      toplamTutar: toplamTutar,
      notlar: notlar ? notlar.trim() : '',
      year: 2026,
      olusturanKullanici: 'sistem'
    });
    
    console.log('Yeni satış objesi oluşturuldu');
    
    
    const kaydedilenSatis = await yeniSatis.save({ session });
    console.log('Satış kaydedildi:', kaydedilenSatis._id);
    
    
    await addCariIslem(
      sirketId, 
      toplamTutar, 
      `Satış No: ${kaydedilenSatis.satisNo || kaydedilenSatis._id} - ${kaydedilenSatis.satisTarihi.toLocaleDateString('tr-TR')}`
    );
    
    await session.commitTransaction();
    
    
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
    
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Bu satış numarası zaten kullanılıyor' 
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
      msg: 'Satış kaydedilemedi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
});


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
    
    
    const eskiSatis = await UrunSatis.findById(id).session(session);
    if (!eskiSatis) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Güncellenecek satış kaydı bulunamadı' 
      });
    }
    
    
    const sirket = await Sirket.findById(sirketId).session(session);
    if (!sirket) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Seçilen şirket bulunamadı' 
      });
    }
    
    
    const processedUrunler = urunler.map(urun => ({
      urunAdi: urun.urunAdi.trim(),
      aciklama: urun.aciklama ? urun.aciklama.trim() : '',
      adet: parseFloat(urun.adet),
      birimFiyat: parseFloat(urun.birimFiyat)
    }));
    
    const yeniToplamTutar = processedUrunler.reduce((toplam, urun) => {
      return toplam + (urun.adet * urun.birimFiyat);
    }, 0);
    
    
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
    
    
    const guncellenenSatis = await UrunSatis.findByIdAndUpdate(
      id, 
      guncellenecekVeri, 
      { 
        new: true,
        runValidators: true,
        session
      }
    );
    
    
    if (eskiSatis.sirketId.toString() === sirketId.toString()) {
      
      await updateCariIslem(
        sirketId, 
        eskiSatis.toplamTutar, 
        yeniToplamTutar,
        `Satış Güncelleme - No: ${guncellenenSatis.satisNo || guncellenenSatis._id} - ${guncellenenSatis.satisTarihi.toLocaleDateString('tr-TR')}`
      );
    } else {
      
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
    
    
    const satis = await UrunSatis.findById(id).session(session);
    
    if (!satis) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        msg: 'Silinecek satış kaydı bulunamadı' 
      });
    }
    
    
    await removeCariIslem(
      satis.sirketId, 
      satis.toplamTutar,
      `Satış İptali - No: ${satis.satisNo || satis._id} - ${satis.satisTarihi.toLocaleDateString('tr-TR')}`
    );
    
    
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


router.post('/:id/send-notification', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Geçersiz satış ID formatı' 
      });
    }
    
    
    const satis = await UrunSatis.findById(id)
      .populate('sirketId', 'sirketAdi sirketCariBirimi sirketCarisi emailler');
    
    if (!satis) {
      return res.status(404).json({ 
        success: false, 
        msg: 'Satış kaydı bulunamadı' 
      });
    }
    
    
    const emailAddresses = satis.sirketEmailler
      .filter(emailObj => emailObj.email && emailObj.email.trim() !== '')
      .map(emailObj => emailObj.email);
    
    if (emailAddresses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Şirket için email adresi bulunamadı' 
      });
    }
    
    
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
    
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createEmailTransporter();
      
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: emailAddresses.join(','),
        subject: emailContent.subject,
        html: emailContent.html
      });
    }
    
    
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