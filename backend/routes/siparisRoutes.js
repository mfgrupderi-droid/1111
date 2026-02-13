const express = require('express');
const Siparis = require('../models/Siparişler');
const Sirket = require('../models/Şirketler');
const router = express.Router();


router.post('/', async (req, res) => {
    try {
        const { verenFirma, siparisDetaylari } = req.body;

        const urunler = siparisDetaylari.map(detay => ({
            model: detay.model,
            cins: detay.cins,
            renk: detay.renk,
            bedenler: detay.bedenler.filter(b => b.adet > 0),
            fiyat: detay.fiyat,
            not: detay.not
        }));

        const toplamTutar = urunler.reduce((acc, urun) => {
            const urunToplamAdet = urun.bedenler.reduce((sum, b) => sum + (b.adet || 0), 0);
            return acc + (urunToplamAdet * (urun.fiyat || 0));
        }, 0);

        const yeniSiparis = new Siparis({
            verenFirma,
            siparisDetaylari: urunler,
            toplamTutar
        });

        await yeniSiparis.save();


        res.status(201).json(yeniSiparis);
    } catch (err) {
        console.error("Sipariş ekleme hatası:", err);
        res.status(400).json({ msg: 'Sipariş eklenirken bir hata oluştu.', error: err.message });
    }
});


const nodemailer = require('nodemailer');

const transporter = () => {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, 
      auth: {
        user: "bzkmuhasebe@gmail.com",
        pass: "ivlb msnu udht rdeq",
      },
    });
  };

router.post('/:id/send-notification', async (req, res) => {
    try {
      const siparisId = req.params.id;
      
      
      const siparis = await Siparis.findById(siparisId).populate('verenFirma');
      const sirket = siparis.verenFirma;
  
      if (!siparis || !sirket) {
        return res.status(404).json({ msg: 'Sipariş veya şirket bulunamadı' });
      }
  
      
      const result = await sendSiparisNotification(siparis, sirket);
  
      
      await Siparis.findByIdAndUpdate(siparisId, {
        emailGonderildi: true,
        emailGonderimTarihi: new Date()
      });
  
      res.json({
        success: true,
        msg: 'Sipariş emaili başarıyla gönderildi',
        data: result
      });
  
    } catch (error) {
      console.error('Sipariş email hatası:', error);
      res.status(500).json({
        success: false,
        msg: 'Email gönderilirken hata oluştu',
        error: error.message
      });
    }
  });


router.get('/', async (req, res) => {
    try {
        const siparisler = await Siparis.find({})
            .populate({
                path: 'verenFirma',
                select: 'sirketAdi sirketKodu',
                options: { strictPopulate: false }
            })
            .sort({ olusturmaTarihi: -1 })
            .lean();

        res.status(200).json(siparisler);
    } catch (err) {
        console.error("Sipariş listeleme hatası:", err);
        res.status(500).json({ msg: 'Siparişler listelenirken bir hata oluştu.', error: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const { verenFirma, siparisDetaylari } = req.body;
        const eskiSiparis = await Siparis.findById(req.params.id);

        if (!eskiSiparis) {
            return res.status(404).json({ msg: 'Güncellenecek sipariş bulunamadı.' });
        }



        const urunler = siparisDetaylari.map(detay => ({
            model: detay.model,
            cins: detay.cins,
            renk: detay.renk,
            bedenler: detay.bedenler.filter(b => b.adet > 0),
            fiyat: detay.fiyat,
            not: detay.not
        }));

        const yeniToplamTutar = urunler.reduce((acc, urun) => {
            const urunToplamAdet = urun.bedenler.reduce((sum, b) => sum + (b.adet || 0), 0);
            return acc + (urunToplamAdet * (urun.fiyat || 0));
        }, 0);

        const guncellenmisSiparis = await Siparis.findByIdAndUpdate(
            req.params.id,
            { verenFirma, siparisDetaylari: urunler, toplamTutar: yeniToplamTutar },
            { new: true }
        );


        res.json(guncellenmisSiparis);
    } catch (err) {
        console.error("Sipariş güncelleme hatası:", err);
        res.status(400).json({ msg: 'Sipariş güncellenirken bir hata oluştu.', error: err.message });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const siparis = await Siparis.findByIdAndDelete(req.params.id);
        
        if (!siparis) {
            return res.status(404).json({ msg: 'Silinecek sipariş bulunamadı.' });
        }
        

        res.json({ msg: 'Sipariş başarıyla silindi' });
    } catch (err) {
        console.error("Sipariş silme hatası:", err);
        res.status(500).json({ msg: 'Sipariş silinirken sunucu hatası oluştu.', error: err.message });
    }
});

module.exports = router;