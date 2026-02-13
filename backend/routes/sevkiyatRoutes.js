const express = require('express');
const Sevkiyat = require('../models/Sevkiyat');
const Sirket = require('../models/Sirket');
const router = express.Router();
const { check, validationResult } = require('express-validator');


router.post('/', [
  check('sirketId').notEmpty().withMessage('Şirket seçimi zorunludur'),
  check('urunler').isArray({ min: 1 }).withMessage('En az 1 ürün eklenmeli')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { sirketId, urunler } = req.body;
    
    const toplamTutar = urunler.reduce((total, urun) => 
      total + (urun.adet * urun.birimFiyat), 0);

    const yeniSevkiyat = new Sevkiyat({
      sirketId,
      urunler,
      toplamTutar
    });

    const savedSevkiyat = await yeniSevkiyat.save();
    
    
    await Sirket.findByIdAndUpdate(sirketId, {
      $inc: { sirketCarisi: -toplamTutar },
      $push: {
        islemler: {
          islemTarihi: new Date(),
          aciklama: `Sevkiyat No: ${savedSevkiyat._id} (${urun.adet})`,
          tutar: -toplamTutar
        }
      }
    });

    res.status(201).json(savedSevkiyat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const sevkiyatlar = await Sevkiyat.find()
      .populate('sirketId', 'sirketAdi')
      .sort({ createdAt: -1 });
    res.json(sevkiyatlar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const sevkiyat = await Sevkiyat.findByIdAndDelete(req.params.id);
    if (!sevkiyat) {
      return res.status(404).json({ error: 'Sevkiyat bulunamadı' });
    }

    
    await Sirket.findByIdAndUpdate(sevkiyat.sirketId, {
      $inc: { sirketCarisi: sevkiyat.toplamTutar },
      $pull: { islemler: { aciklama: { $regex: `Sevkiyat No: ${req.params.id}` } } }
    });

    res.json({ message: 'Sevkiyat silindi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;