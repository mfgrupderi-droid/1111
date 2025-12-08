// routes/fiyatlar.js

const express = require('express');
const router = express.Router();
const Fiyat = require('../models/Fiyat');

// TÜM FİYAT LİSTESİNİ GETİR
router.get('/', async (req, res) => {
    try {
        const fiyatListesi = await Fiyat.find({});
        res.status(200).json(fiyatListesi);
    } catch (err) {
        res.status(500).json({ mesaj: 'Fiyatlar alınırken hata oluştu.', hata: err.message });
    }
});

// YENİ FİYAT GRUBU EKLE (Postman için)
// Body Örneği: { "fiyat": 375, "modeller": ["model1", "model2"], "hesapTuru": "Dikim" }
router.post('/', async (req, res) => {
    try {
        const yeniFiyat = new Fiyat(req.body);
        await yeniFiyat.save();
        res.status(201).json({ mesaj: 'Fiyat grubu başarıyla eklendi.', veri: yeniFiyat });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ mesaj: 'Bu modellerden biri zaten başka bir fiyat grubunda kayıtlı.' });
        }
        res.status(500).json({ mesaj: 'Fiyat eklenirken hata oluştu.', hata: err.message });
    }
});

// FİYAT GRUBUNU GÜNCELLE
router.put('/:id', async (req, res) => {
    try {
        const guncellenenFiyat = await Fiyat.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!guncellenenFiyat) {
            return res.status(404).json({ mesaj: 'Fiyat grubu bulunamadı.' });
        }
        res.status(200).json({ mesaj: 'Fiyat grubu güncellendi.', veri: guncellenenFiyat });
    } catch (err) {
        res.status(500).json({ mesaj: 'Fiyat güncellenirken hata oluştu.', hata: err.message });
    }
});

module.exports = router;