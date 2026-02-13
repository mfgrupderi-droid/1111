const express = require('express');
const router = express.Router();
const Hakedis = require('../models/Hakedis');
const { getISOWeek, getYear } = require('date-fns');
const mongoose = require('mongoose');


router.get('/', async (req, res) => {
    try {
        const hakedisler = await Hakedis.find({})
            .sort({ yil: -1, hafta: -1, personelAdi: 1 });
        res.status(200).json(hakedisler);
    } catch (err) {
        console.error("Hakediş listesi hatası:", err);
        res.status(500).json({ mesaj: 'Veriler alınırken hata oluştu.', hata: err.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ mesaj: 'Geçersiz ID formatı.' });
        }

        const hakedis = await Hakedis.findById(id);
        if (!hakedis) {
            return res.status(404).json({ mesaj: 'Hakediş kaydı bulunamadı.' });
        }

        res.status(200).json(hakedis);
    } catch (err) {
        console.error("Hakediş detay hatası:", err);
        res.status(500).json({ mesaj: 'Veri alınırken hata oluştu.', hata: err.message });
    }
});


router.post('/', async (req, res) => {
    try {
        const { personelAdi, hesapTuru, islemler } = req.body;

        if (!personelAdi || !hesapTuru || !Array.isArray(islemler)) {
            return res.status(400).json({ mesaj: 'Eksik veya hatalı veri gönderildi.' });
        }

        const simdi = new Date();
        const yil = getYear(simdi);
        const hafta = getISOWeek(simdi);

        const toplamAdet = islemler.reduce((acc, islem) => acc + (Number(islem.adet) || 0), 0);
        const toplamHakedis = islemler.reduce((acc, islem) => {
            const adet = Number(islem.adet) || 0;
            const fiyat = Number(islem.fiyat) || 0;
            return acc + (adet * fiyat);
        }, 0);

        const yeniHakedis = new Hakedis({
            personelAdi,
            hesapTuru,
            yil,
            hafta,
            islemler,
            toplamAdet,
            toplamHakedis
        });

        const kaydedilenHakedis = await yeniHakedis.save();

        res.status(201).json({
            mesaj: 'Hakediş başarıyla oluşturuldu.',
            veri: kaydedilenHakedis
        });

    } catch (err) {
        console.error("Hakediş oluşturma hatası:", err);
        res.status(500).json({ mesaj: 'Oluşturma sırasında hata oluştu.', hata: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { personelAdi, hesapTuru, islemler, yil, hafta } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ mesaj: 'Geçersiz ID formatı.' });
        }

        const hakedis = await Hakedis.findById(id);
        if (!hakedis) {
            return res.status(404).json({ mesaj: 'Güncellenecek hakediş kaydı bulunamadı.' });
        }

        const toplamAdet = islemler.reduce((acc, islem) => acc + (Number(islem.adet) || 0), 0);
        const toplamHakedis = islemler.reduce((acc, islem) => {
            const adet = Number(islem.adet) || 0;
            const fiyat = Number(islem.fiyat) || 0;
            return acc + (adet * fiyat);
        }, 0);

        hakedis.personelAdi = personelAdi || hakedis.personelAdi;
        hakedis.hesapTuru = hesapTuru || hakedis.hesapTuru;
        hakedis.islemler = islemler;
        hakedis.toplamAdet = toplamAdet;
        hakedis.toplamHakedis = toplamHakedis;
        
        if (yil) hakedis.yil = yil;
        if (hafta) hakedis.hafta = hafta;

        const guncellenenHakedis = await hakedis.save();

        res.status(200).json({ 
            mesaj: 'Hakediş başarıyla güncellendi.', 
            veri: guncellenenHakedis 
        });

    } catch (err) {
        console.error("Hakediş güncelleme hatası:", err);
        res.status(500).json({ mesaj: 'Güncelleme sırasında hata oluştu.', hata: err.message });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ mesaj: 'Geçersiz ID formatı.' });
        }

        const hakedis = await Hakedis.findByIdAndDelete(id);
        if (!hakedis) {
            return res.status(404).json({ mesaj: 'Silinecek hakediş kaydı bulunamadı.' });
        }

        res.status(200).json({ 
            mesaj: 'Hakediş başarıyla silindi.',
            veri: hakedis
        });

    } catch (err) {
        console.error("Hakediş silme hatası:", err);
        res.status(500).json({ mesaj: 'Silme sırasında hata oluştu.', hata: err.message });
    }
});


router.get('/haftalik', async (req, res) => {
    try {
        const simdi = new Date();
        const yil = parseInt(req.query.yil) || getYear(simdi);
        const hafta = parseInt(req.query.hafta) || getISOWeek(simdi);

        const hakedisler = await Hakedis.find({ yil, hafta });
        res.status(200).json(hakedisler);

    } catch (err) {
        console.error("Haftalık hakediş hatası:", err);
        res.status(500).json({ mesaj: 'Veriler alınırken hata oluştu.', hata: err.message });
    }
});

module.exports = router;