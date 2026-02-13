
const express = require('express');
const router = express.Router();
const Odeme = require('../models/Odeme');
const Fasoncu = require('../models/Fasoncu');
const Iscilik = require('../models/Iscilik');


router.get('/', async (req, res) => {
  try {
    const { fasoncuId, baslangicTarihi, bitisTarihi } = req.query;
    
    let filter = {};
    
    if (fasoncuId) {
      filter.fasoncuId = fasoncuId;
    }
    
    if (baslangicTarihi || bitisTarihi) {
      filter.odemeTarihi = {};
      if (baslangicTarihi) {
        filter.odemeTarihi.$gte = new Date(baslangicTarihi);
      }
      if (bitisTarihi) {
        filter.odemeTarihi.$lte = new Date(bitisTarihi);
      }
    }
    
    const odemeler = await Odeme.find(filter)
      .populate('fasoncuId', 'fasoncuAdi paraBirimi')
      .sort({ odemeTarihi: -1 });
    
    res.json({
      success: true,
      data: odemeler
    });
  } catch (err) {
    console.error('Ödemeler getirilirken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Ödemeler getirilirken bir hata oluştu',
      error: err.message
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const odeme = await Odeme.findById(req.params.id)
      .populate('fasoncuId', 'fasoncuAdi paraBirimi');
    
    if (!odeme) {
      return res.status(404).json({
        success: false,
        msg: 'Ödeme bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: odeme
    });
  } catch (err) {
    console.error('Ödeme getirilirken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Ödeme getirilirken bir hata oluştu',
      error: err.message
    });
  }
});


router.post('/', async (req, res) => {
  try {
    const { fasoncuId, tutar, odemeTarihi, odemeYontemi, not } = req.body;
    
    
    if (!fasoncuId || !tutar || !odemeTarihi) {
      return res.status(400).json({
        success: false,
        msg: 'Fasoncu, tutar ve ödeme tarihi alanları zorunludur'
      });
    }
    
    if (tutar <= 0) {
      return res.status(400).json({
        success: false,
        msg: 'Ödeme tutarı sıfırdan büyük olmalıdır'
      });
    }
    
    
    const fasoncu = await Fasoncu.findById(fasoncuId);
    if (!fasoncu) {
      return res.status(404).json({
        success: false,
        msg: 'Fasoncu bulunamadı'
      });
    }
    
    
    const yeniOdeme = new Odeme({
      fasoncuId,
      tutar,
      odemeTarihi,
      odemeYontemi: odemeYontemi || 'Nakit',
      not: not || ''
    });
    
    await yeniOdeme.save();
    
    
    const populatedOdeme = await Odeme.findById(yeniOdeme._id)
      .populate('fasoncuId', 'fasoncuAdi paraBirimi');
    
    res.status(201).json({
      success: true,
      msg: 'Ödeme başarıyla eklendi',
      data: populatedOdeme
    });
  } catch (err) {
    console.error('Ödeme eklenirken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Ödeme eklenirken bir hata oluştu',
      error: err.message
    });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const { tutar, odemeTarihi, odemeYontemi, not, durum } = req.body;
    
    const odeme = await Odeme.findById(req.params.id);
    
    if (!odeme) {
      return res.status(404).json({
        success: false,
        msg: 'Ödeme bulunamadı'
      });
    }
    
    
    if (tutar !== undefined) {
      if (tutar <= 0) {
        return res.status(400).json({
          success: false,
          msg: 'Ödeme tutarı sıfırdan büyük olmalıdır'
        });
      }
      odeme.tutar = tutar;
    }
    if (odemeTarihi) odeme.odemeTarihi = odemeTarihi;
    if (odemeYontemi) odeme.odemeYontemi = odemeYontemi;
    if (not !== undefined) odeme.not = not;
    if (durum) odeme.durum = durum;
    
    await odeme.save();
    
    const populatedOdeme = await Odeme.findById(odeme._id)
      .populate('fasoncuId', 'fasoncuAdi paraBirimi');
    
    res.json({
      success: true,
      msg: 'Ödeme başarıyla güncellendi',
      data: populatedOdeme
    });
  } catch (err) {
    console.error('Ödeme güncellenirken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Ödeme güncellenirken bir hata oluştu',
      error: err.message
    });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const odeme = await Odeme.findById(req.params.id);
    
    if (!odeme) {
      return res.status(404).json({
        success: false,
        msg: 'Ödeme bulunamadı'
      });
    }
    
    await Odeme.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      msg: 'Ödeme başarıyla silindi'
    });
  } catch (err) {
    console.error('Ödeme silinirken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Ödeme silinirken bir hata oluştu',
      error: err.message
    });
  }
});


router.get('/bakiye/:fasoncuId', async (req, res) => {
  try {
    const { fasoncuId } = req.params;
    
    
    const fasoncu = await Fasoncu.findById(fasoncuId);
    if (!fasoncu) {
      return res.status(404).json({
        success: false,
        msg: 'Fasoncu bulunamadı'
      });
    }
    
    
    const iscilikler = await Iscilik.find({ fasoncuId });
    const toplamIscilik = iscilikler.reduce((sum, iscilik) => {
      return sum + (iscilik.toplamTutar || 0);
    }, 0);
    
    
    const odemeler = await Odeme.find({ 
      fasoncuId,
      durum: 'Onaylı' 
    });
    const toplamOdenen = odemeler.reduce((sum, odeme) => {
      return sum + (odeme.tutar || 0);
    }, 0);
    
    
    const bakiye = toplamIscilik - toplamOdenen;
    
    res.json({
      success: true,
      data: {
        fasoncuId,
        fasoncuAdi: fasoncu.fasoncuAdi,
        paraBirimi: fasoncu.paraBirimi,
        toplamIscilik,
        toplamOdenen,
        bakiye,
        iscilikSayisi: iscilikler.length,
        odemeSayisi: odemeler.length
      }
    });
  } catch (err) {
    console.error('Bakiye hesaplanırken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Bakiye hesaplanırken bir hata oluştu',
      error: err.message
    });
  }
});


router.get('/fasoncu/:fasoncuId', async (req, res) => {
  try {
    const odemeler = await Odeme.find({ fasoncuId: req.params.fasoncuId })
      .sort({ odemeTarihi: -1 });
    
    res.json({
      success: true,
      data: odemeler
    });
  } catch (err) {
    console.error('Fasoncu ödemeleri getirilirken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'Fasoncu ödemeleri getirilirken bir hata oluştu',
      error: err.message
    });
  }
});



router.get('/istatistikler/genel', async (req, res) => {
  try {
    const { baslangicTarihi, bitisTarihi } = req.query;
    
    let dateFilter = {};
    if (baslangicTarihi || bitisTarihi) {
      dateFilter.odemeTarihi = {};
      if (baslangicTarihi) {
        dateFilter.odemeTarihi.$gte = new Date(baslangicTarihi);
      }
      if (bitisTarihi) {
        dateFilter.odemeTarihi.$lte = new Date(bitisTarihi);
      }
    }
    
    const odemeler = await Odeme.find({ 
      ...dateFilter,
      durum: 'Onaylı' 
    }).populate('fasoncuId', 'fasoncuAdi paraBirimi');
    
    
    const fasoncuBazinda = {};
    odemeler.forEach(odeme => {
      const fasoncuId = odeme.fasoncuId._id.toString();
      if (!fasoncuBazinda[fasoncuId]) {
        fasoncuBazinda[fasoncuId] = {
          fasoncuAdi: odeme.fasoncuId.fasoncuAdi,
          paraBirimi: odeme.fasoncuId.paraBirimi,
          toplamTutar: 0,
          odemeSayisi: 0
        };
      }
      fasoncuBazinda[fasoncuId].toplamTutar += odeme.tutar;
      fasoncuBazinda[fasoncuId].odemeSayisi += 1;
    });
    
    
    const odemeYontemine = {};
    odemeler.forEach(odeme => {
      const yontem = odeme.odemeYontemi || 'Nakit';
      if (!odemeYontemine[yontem]) {
        odemeYontemine[yontem] = {
          toplamTutar: 0,
          odemeSayisi: 0
        };
      }
      odemeYontemine[yontem].toplamTutar += odeme.tutar;
      odemeYontemine[yontem].odemeSayisi += 1;
    });
    
    const toplamOdenen = odemeler.reduce((sum, odeme) => sum + odeme.tutar, 0);
    
    res.json({
      success: true,
      data: {
        toplamOdemeSayisi: odemeler.length,
        toplamOdenen,
        fasoncuBazinda: Object.values(fasoncuBazinda),
        odemeYontemine: Object.entries(odemeYontemine).map(([yontem, data]) => ({
          yontem,
          ...data
        }))
      }
    });
  } catch (err) {
    console.error('İstatistikler hesaplanırken hata:', err);
    res.status(500).json({
      success: false,
      msg: 'İstatistikler hesaplanırken bir hata oluştu',
      error: err.message
    });
  }
});

module.exports = router;