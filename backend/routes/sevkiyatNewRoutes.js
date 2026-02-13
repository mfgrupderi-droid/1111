const express = require('express');
const Sevkiyat = require('../models/Sevkiyat');
const Sirket = require('../models/Şirketler');
const { sendSevkiyatNotification } = require('./emailService');
const router = express.Router();


const enrichSevkiyatData = (sevkiyat) => {
    if (!sevkiyat) return null;
    
    const sevkiyatObj = sevkiyat.toObject ? sevkiyat.toObject() : sevkiyat;
    
    return {
        ...sevkiyatObj,
        sirketAdi: sevkiyat.sirketId?.sirketAdi || sevkiyatObj.sirketAdi || 'Bilinmiyor',
        sirketCariBirimi: sevkiyat.sirketId?.sirketCariBirimi || sevkiyatObj.sirketCariBirimi || 'TL',
        sirketEmailler: sevkiyat.sirketId?.emailler || sevkiyatObj.sirketEmailler || []
    };
};


router.post('/', async (req, res) => {
    try {
        const { sirketId, urunler, sevkiyatTarihi } = req.body;

        
        if (!sirketId || !urunler || !Array.isArray(urunler) || urunler.length === 0) {
            return res.status(400).json({ 
                success: false,
                msg: 'Şirket ID ve ürün bilgileri zorunludur.' 
            });
        }

        
        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            return res.status(404).json({ 
                success: false,
                msg: 'Şirket bulunamadı.' 
            });
        }

        
        const sonSevkiyat = await Sevkiyat.findOne().sort({ sevkiyatNo: -1 }).limit(1);
        const yeniSevkiyatNo = sonSevkiyat ? sonSevkiyat.sevkiyatNo + 1 : 1;

        
        const toplamTutar = urunler.reduce((total, urun) => {
            const urunAdet = (urun.bedenler || []).reduce((sum, beden) => sum + (parseInt(beden.adet) || 0), 0);
            return total + (urunAdet * (parseFloat(urun.birimFiyat) || 0));
        }, 0);
        
        
        const yeniSevkiyat = new Sevkiyat({
            sevkiyatNo: yeniSevkiyatNo,
            sirketId,
            urunler,
            toplamTutar,
            sevkiyatTarihi: sevkiyatTarihi || new Date(),
            year: 2026
        });

        const savedSevkiyat = await yeniSevkiyat.save();
        
        
        sirket.sirketCarisi += toplamTutar;
        sirket.islemler.push({
            islemTarihi: new Date(),
            islemAciklamasi: `Sevkiyat No: ${yeniSevkiyatNo}`,
            tutar: toplamTutar
        });
        await sirket.save();

        
        const populatedSevkiyat = await Sevkiyat.findById(savedSevkiyat._id).populate('sirketId');
        
        res.status(201).json({ 
            success: true,
            msg: 'Sevkiyat başarıyla eklendi.', 
            sevkiyat: enrichSevkiyatData(populatedSevkiyat)
        });
    } catch (err) {
        console.error('Sevkiyat ekleme hatası:', err);
        res.status(400).json({ 
            success: false,
            msg: 'Sevkiyat eklenirken bir hata oluştu.', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
        });
    }
});


router.get('/', async (req, res) => {
    try {
        const { year = 2026 } = req.query;
        let filter = {};

        if (year == 2025) {
            filter.sevkiyatTarihi = {
                $gte: new Date('2025-01-01'),
                $lt: new Date('2026-01-01')
            };
        } else {
            filter.year = parseInt(year);
        }

        const sevkiyatlar = await Sevkiyat.find(filter)
            .populate({
                path: 'sirketId',
                select: 'sirketAdi sirketCariBirimi emailler'
            })
            .sort({ sevkiyatNo: -1 })
            .lean(); 
        
        
        const enrichedSevkiyatlar = sevkiyatlar.map(sevkiyat => ({
            ...sevkiyat,
            sirketAdi: sevkiyat.sirketId?.sirketAdi || 'Bilinmiyor',
            sirketCariBirimi: sevkiyat.sirketId?.sirketCariBirimi || 'TL',
            sirketEmailler: sevkiyat.sirketId?.emailler || []
        }));

        res.json({
            success: true,
            data: enrichedSevkiyatlar,
            count: enrichedSevkiyatlar.length
        });
    } catch (err) {
        console.error('Sevkiyat listesi getirme hatası:', err);
        res.status(500).json({ 
            success: false,
            msg: 'Sevkiyatlar getirilirken bir hata oluştu.',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
        });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false,
                msg: 'Geçersiz sevkiyat ID formatı.' 
            });
        }

        const sevkiyat = await Sevkiyat.findById(id)
            .populate({
                path: 'sirketId',
                select: 'sirketAdi sirketCariBirimi emailler'
            });
            
        if (!sevkiyat) {
            return res.status(404).json({ 
                success: false,
                msg: 'Sevkiyat bulunamadı.' 
            });
        }

        res.json({
            success: true,
            data: enrichSevkiyatData(sevkiyat)
        });
    } catch (err) {
        console.error('Sevkiyat getirme hatası:', err);
        res.status(500).json({ 
            success: false,
            msg: 'Sevkiyat getirilirken bir hata oluştu.',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
        });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { sirketId, urunler, sevkiyatTarihi } = req.body;

        
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false,
                msg: 'Geçersiz sevkiyat ID formatı.' 
            });
        }

        
        if (!sirketId || !urunler || !Array.isArray(urunler)) {
            return res.status(400).json({ 
                success: false,
                msg: 'Şirket ID ve ürün bilgileri zorunludur.' 
            });
        }

        const sevkiyat = await Sevkiyat.findById(id);
        if (!sevkiyat) {
            return res.status(404).json({ 
                success: false,
                msg: 'Sevkiyat bulunamadı.' 
            });
        }
        
        const eskiSirketId = sevkiyat.sirketId;
        const eskiToplamTutar = sevkiyat.toplamTutar;
        
        
        const yeniToplamTutar = urunler.reduce((total, urun) => {
            const urunAdet = (urun.bedenler || []).reduce((sum, beden) => sum + (parseInt(beden.adet) || 0), 0);
            return total + (urunAdet * (parseFloat(urun.birimFiyat) || 0));
        }, 0);

        
        const eskiSirket = await Sirket.findById(eskiSirketId);
        if (eskiSirket) {
            eskiSirket.sirketCarisi -= eskiToplamTutar;
            
            eskiSirket.islemler = eskiSirket.islemler.filter(
                islem => islem.islemAciklamasi !== `Sevkiyat No: ${sevkiyat.sevkiyatNo}`
            );
            await eskiSirket.save();
        }

        
        sevkiyat.sirketId = sirketId;
        sevkiyat.urunler = urunler;
        sevkiyat.toplamTutar = yeniToplamTutar;
        if (sevkiyatTarihi) {
            sevkiyat.sevkiyatTarihi = sevkiyatTarihi;
        }
        await sevkiyat.save();

        
        const yeniSirket = await Sirket.findById(sirketId);
        if (yeniSirket) {
            yeniSirket.sirketCarisi += yeniToplamTutar;
            yeniSirket.islemler.push({
                islemTarihi: new Date(),
                islemAciklamasi: `Sevkiyat No: ${sevkiyat.sevkiyatNo}`,
                tutar: yeniToplamTutar
            });
            await yeniSirket.save();
        }

        
        const updatedSevkiyat = await Sevkiyat.findById(id)
            .populate({
                path: 'sirketId',
                select: 'sirketAdi sirketCariBirimi emailler'
            });

        res.json({ 
            success: true,
            msg: 'Sevkiyat başarıyla güncellendi.', 
            sevkiyat: enrichSevkiyatData(updatedSevkiyat)
        });
    } catch (err) {
        console.error('Sevkiyat güncelleme hatası:', err);
        res.status(400).json({ 
            success: false,
            msg: 'Sevkiyat güncellenirken bir hata oluştu.', 
            error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
        });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false,
                msg: 'Geçersiz sevkiyat ID formatı.' 
            });
        }

        const sevkiyat = await Sevkiyat.findById(id);
        if (!sevkiyat) {
            return res.status(404).json({ 
                success: false,
                msg: 'Silinecek sevkiyat bulunamadı.' 
            });
        }

        const sevkiyatToplamTutar = sevkiyat.toplamTutar;
        const sirketId = sevkiyat.sirketId;
        const sevkiyatNo = sevkiyat.sevkiyatNo;

        
        await Sevkiyat.findByIdAndDelete(id);

        
        const sirket = await Sirket.findById(sirketId);
        if (sirket) {
            sirket.sirketCarisi -= sevkiyatToplamTutar;
            
            sirket.islemler = sirket.islemler.filter(
                islem => islem.islemAciklamasi !== `Sevkiyat No: ${sevkiyatNo}`
            );
            await sirket.save();
        }

        res.json({ 
            success: true,
            msg: 'Sevkiyat başarıyla silindi.' 
        });
    } catch (err) {
        console.error('Sevkiyat silme hatası:', err);
        res.status(500).json({ 
            success: false,
            msg: 'Sevkiyat silinirken bir hata oluştu.',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
        });
    }
});


router.post('/:id/send-notification', async (req, res) => {
    try {
        const { id } = req.params;

        
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                msg: 'Geçersiz sevkiyat ID formatı.'
            });
        }

        
        const sevkiyat = await Sevkiyat.findById(id);
        if (!sevkiyat) {
            return res.status(404).json({
                success: false,
                msg: 'Sevkiyat bulunamadı'
            });
        }

        
        const sirket = await Sirket.findById(sevkiyat.sirketId);
        if (!sirket) {
            return res.status(404).json({
                success: false,
                msg: 'Şirket bulunamadı'
            });
        }

        
        if (!sirket.emailler || sirket.emailler.length === 0) {
            return res.status(400).json({
                success: false,
                msg: 'Şirkete ait email adresi bulunamadı'
            });
        }

        const validEmails = sirket.emailler.filter(
            emailObj => emailObj.email && emailObj.email.trim() && 
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailObj.email.trim())
        );

        if (validEmails.length === 0) {
            return res.status(400).json({
                success: false,
                msg: 'Geçerli email adresi bulunamadı'
            });
        }

        
        const result = await sendSevkiyatNotification(sevkiyat, sirket);
        
        res.json({
            success: true,
            msg: 'Email bildirimi başarıyla gönderildi',
            data: {
                messageId: result.messageId,
                sentTo: result.sentTo,
                attachments: result.attachments,
                sevkiyatNo: sevkiyat.sevkiyatNo,
                sirketAdi: sirket.sirketAdi
            }
        });

    } catch (error) {
        console.error('Email gönderme hatası:', error);
        
        let errorMessage = 'Email gönderilirken bir hata oluştu';
        
        
        if (error.code === 'EAUTH') {
            errorMessage = 'Email kimlik doğrulama hatası. SMTP ayarlarını kontrol edin.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            errorMessage = 'Email sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.';
        } else if (error.responseCode === 550) {
            errorMessage = 'Geçersiz email adresi. Alıcı email adreslerini kontrol edin.';
        } else if (error.responseCode === 553) {
            errorMessage = 'Email gönderme limiti aşıldı veya spam filtresi tarafından engellendi.';
        }

        res.status(500).json({
            success: false,
            msg: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


router.get('/stats/summary', async (req, res) => {
    try {
        const { startDate, endDate, sirketId } = req.query;
        
        let matchFilter = {};
        
        
        if (startDate && endDate) {
            matchFilter.sevkiyatTarihi = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }
        
        
        if (sirketId) {
            matchFilter.sirketId = sirketId;
        }

        const stats = await Sevkiyat.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    toplamSevkiyat: { $sum: 1 },
                    toplamTutar: { $sum: '$toplamTutar' },
                    ortalamaTutar: { $avg: '$toplamTutar' }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats[0] || {
                toplamSevkiyat: 0,
                toplamTutar: 0,
                ortalamaTutar: 0
            }
        });

    } catch (err) {
        console.error('İstatistik getirme hatası:', err);
        res.status(500).json({
            success: false,
            msg: 'İstatistikler getirilirken bir hata oluştu.',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
        });
    }
});

module.exports = router;