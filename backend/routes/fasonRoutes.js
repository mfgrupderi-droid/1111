const express = require('express');
const router = express.Router();
const Fasoncu = require('../models/Fasoncu');

// Tüm fasoncuları getir
router.get('/', async (req, res) => {
  try {
    const fasoncular = await Fasoncu.find().sort({ fasoncuAdi: 1 });
    res.json({ success: true, data: fasoncular });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

// Fasoncu ekle
router.post('/', async (req, res) => {
  try {
    const yeniFasoncu = new Fasoncu(req.body);
    await yeniFasoncu.save();
    res.status(201).json({ 
      success: true, 
      msg: 'Fasoncu başarıyla eklendi',
      data: yeniFasoncu 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, msg: 'Bu isimde bir fasoncu zaten mevcut' });
    }
    res.status(500).json({ success: false, msg: error.message });
  }
});

// Fasoncu güncelle
router.put('/:id', async (req, res) => {
  try {
    const fasoncu = await Fasoncu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!fasoncu) {
      return res.status(404).json({ success: false, msg: 'Fasoncu bulunamadı' });
    }
    
    res.json({ 
      success: true, 
      msg: 'Fasoncu başarıyla güncellendi',
      data: fasoncu 
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

// Fasoncu sil
router.delete('/:id', async (req, res) => {
  try {
    const fasoncu = await Fasoncu.findByIdAndDelete(req.params.id);
    
    if (!fasoncu) {
      return res.status(404).json({ success: false, msg: 'Fasoncu bulunamadı' });
    }
    
    res.json({ 
      success: true, 
      msg: 'Fasoncu başarıyla silindi' 
    });
  } catch (error) {
    res.status(500).json({ success: false, msg: error.message });
  }
});

module.exports = router;