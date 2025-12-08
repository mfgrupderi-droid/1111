const express = require('express');
const router = express.Router();
const Iscilik = require('../models/Iscilik');
const Fasoncu = require('../models/Fasoncu');

// Tüm işçilikleri getir
router.get('/', async (req, res) => {
  try {
    const iscilikler = await Iscilik.find()
      .populate('fasoncuId', 'fasoncuAdi paraBirimi')
      .sort({ iscilikNo: -1 });
    res.json({ success: true, data: iscilikler });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

// Tek işçilik getir
router.get('/:id', async (req, res) => {
  try {
    const iscilik = await Iscilik.findById(req.params.id)
      .populate('fasoncuId', 'fasoncuAdi paraBirimi');
    
    if (!iscilik) {
      return res.status(404).json({ success: false, msg: 'İşçilik bulunamadı' });
    }
    
    res.json({ success: true, data: iscilik });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

// Yeni işçilik ekle
router.post('/', async (req, res) => {
  try {
    const { fasoncuId, iscilikTarihi, urunler } = req.body;

    // Fasoncu bilgilerini getir
    const fasoncu = await Fasoncu.findById(fasoncuId);
    if (!fasoncu) {
      return res.status(404).json({ success: false, msg: 'Fasoncu bulunamadı' });
    }

    // Toplam tutar ve adet hesapla
    let toplamTutar = 0;
    let toplamAdet = 0;
    
    const urunlerWithTotals = urunler.map(urun => {
      const adet = parseInt(urun.adet) || 0;
      const birimFiyat = parseFloat(urun.birimFiyat) || 0;
      const toplamTutarUrun = adet * birimFiyat;
      
      toplamTutar += toplamTutarUrun;
      toplamAdet += adet;
      
      return {
        ...urun,
        adet,
        birimFiyat,
        toplamTutar: toplamTutarUrun
      };
    });

    const yeniIscilik = new Iscilik({
      fasoncuId,
      fasoncuAdi: fasoncu.fasoncuAdi,
      iscilikTarihi,
      urunler: urunlerWithTotals,
      toplamTutar,
      toplamAdet,
      paraBirimi: fasoncu.paraBirimi
    });

    await yeniIscilik.save();

    // Fasoncu toplam borcunu güncelle
    fasoncu.toplamBorc += toplamTutar;
    await fasoncu.save();

    res.status(201).json({ 
      success: true, 
      msg: 'İşçilik başarıyla eklendi',
      data: yeniIscilik 
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

// İşçilik güncelle
router.put('/:id', async (req, res) => {
  try {
    const { fasoncuId, iscilikTarihi, urunler, odemeDurumu } = req.body;
    
    const eskiIscilik = await Iscilik.findById(req.params.id);
    if (!eskiIscilik) {
      return res.status(404).json({ success: false, msg: 'İşçilik bulunamadı' });
    }

    const fasoncu = await Fasoncu.findById(fasoncuId);
    if (!fasoncu) {
      return res.status(404).json({ success: false, msg: 'Fasoncu bulunamadı' });
    }

    // Eski tutarı fasoncu borcundan düş
    fasoncu.toplamBorc -= eskiIscilik.toplamTutar;

    // Yeni toplam tutar ve adet hesapla
    let toplamTutar = 0;
    let toplamAdet = 0;
    
    const urunlerWithTotals = urunler.map(urun => {
      const adet = parseInt(urun.adet) || 0;
      const birimFiyat = parseFloat(urun.birimFiyat) || 0;
      const toplamTutarUrun = adet * birimFiyat;
      
      toplamTutar += toplamTutarUrun;
      toplamAdet += adet;
      
      return {
        ...urun,
        adet,
        birimFiyat,
        toplamTutar: toplamTutarUrun
      };
    });

    // Yeni tutarı fasoncu borcuna ekle
    fasoncu.toplamBorc += toplamTutar;
    await fasoncu.save();

    eskiIscilik.fasoncuId = fasoncuId;
    eskiIscilik.fasoncuAdi = fasoncu.fasoncuAdi;
    eskiIscilik.iscilikTarihi = iscilikTarihi;
    eskiIscilik.urunler = urunlerWithTotals;
    eskiIscilik.toplamTutar = toplamTutar;
    eskiIscilik.toplamAdet = toplamAdet;
    eskiIscilik.paraBirimi = fasoncu.paraBirimi;
    if (odemeDurumu) eskiIscilik.odemeDurumu = odemeDurumu;
    eskiIscilik.updatedAt = Date.now();

    await eskiIscilik.save();

    res.json({ 
      success: true, 
      msg: 'İşçilik başarıyla güncellendi',
      data: eskiIscilik 
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

// İşçilik sil
router.delete('/:id', async (req, res) => {
  try {
    const iscilik = await Iscilik.findById(req.params.id);
    if (!iscilik) {
      return res.status(404).json({ success: false, msg: 'İşçilik bulunamadı' });
    }

    // Fasoncu borcunu güncelle
    const fasoncu = await Fasoncu.findById(iscilik.fasoncuId);
    if (fasoncu) {
      fasoncu.toplamBorc -= iscilik.toplamTutar;
      await fasoncu.save();
    }

    await Iscilik.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      msg: 'İşçilik başarıyla silindi' 
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

module.exports = router;