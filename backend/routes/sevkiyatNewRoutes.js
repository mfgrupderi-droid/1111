const express = require('express');
const Sevkiyat = require('../models/Sevkiyat');
const Sirket = require('../models/Şirketler');
const { sendSevkiyatNotification } = require('./emailService');
const router = express.Router();

// Helper function - Response formatı tutarlı olsun
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

// Yeni sevkiyat ekleme
router.post('/', async (req, res) => {
    try {
        const { sirketId, urunler, sevkiyatTarihi } = req.body;

        // Input validasyonu
        if (!sirketId || !urunler || !Array.isArray(urunler) || urunler.length === 0) {
            return res.status(400).json({ 
                success: false,
                msg: 'Şirket ID ve ürün bilgileri zorunludur.' 
            });
        }

        // Şirket kontrolü
        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            return res.status(404).json({ 
                success: false,
                msg: 'Şirket bulunamadı.' 
            });
        }

        // Yeni sevkiyat numarası
        const sonSevkiyat = await Sevkiyat.findOne().sort({ sevkiyatNo: -1 }).limit(1);
        const yeniSevkiyatNo = sonSevkiyat ? sonSevkiyat.sevkiyatNo + 1 : 1;

        // Toplam tutarı hesapla
        const toplamTutar = urunler.reduce((total, urun) => {
            const urunAdet = (urun.bedenler || []).reduce((sum, beden) => sum + (parseInt(beden.adet) || 0), 0);
            return total + (urunAdet * (parseFloat(urun.birimFiyat) || 0));
        }, 0);
        
        // Yeni sevkiyat oluştur
        const yeniSevkiyat = new Sevkiyat({
            sevkiyatNo: yeniSevkiyatNo,
            sirketId,
            urunler,
            toplamTutar,
            sevkiyatTarihi: sevkiyatTarihi || new Date()
        });

        const savedSevkiyat = await yeniSevkiyat.save();
        
        // BORÇ MANTIĞI: Sevkiyat yapınca firmanın borcu artar
        sirket.sirketCarisi += toplamTutar;
        sirket.islemler.push({
            islemTarihi: new Date(),
            islemAciklamasi: `Sevkiyat No: ${yeniSevkiyatNo}`,
            tutar: toplamTutar
        });
        await sirket.save();

        // Populate edilmiş veriyi getir
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

// Tüm sevkiyatları listeleme (şirket bilgileriyle birlikte)
router.get('/', async (req, res) => {
    try {
        const sevkiyatlar = await Sevkiyat.find()
            .populate({
                path: 'sirketId',
                select: 'sirketAdi sirketCariBirimi emailler'
            })
            .sort({ sevkiyatNo: -1 })
            .lean(); // Performance için lean() kullan
        
        // Sevkiyat verilerini zenginleştir
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

// ID'ye göre sevkiyat getirme
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // ID format kontrolü
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

// Sevkiyat güncelleme
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { sirketId, urunler, sevkiyatTarihi } = req.body;

        // ID format kontrolü
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false,
                msg: 'Geçersiz sevkiyat ID formatı.' 
            });
        }

        // Input validasyonu
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
        
        // Yeni toplam tutarı hesapla
        const yeniToplamTutar = urunler.reduce((total, urun) => {
            const urunAdet = (urun.bedenler || []).reduce((sum, beden) => sum + (parseInt(beden.adet) || 0), 0);
            return total + (urunAdet * (parseFloat(urun.birimFiyat) || 0));
        }, 0);

        // Eski firmanın borç durumunu düzeltme
        const eskiSirket = await Sirket.findById(eskiSirketId);
        if (eskiSirket) {
            eskiSirket.sirketCarisi -= eskiToplamTutar;
            // İşlem geçmişinden kaldır
            eskiSirket.islemler = eskiSirket.islemler.filter(
                islem => islem.islemAciklamasi !== `Sevkiyat No: ${sevkiyat.sevkiyatNo}`
            );
            await eskiSirket.save();
        }

        // Sevkiyat verilerini güncelle
        sevkiyat.sirketId = sirketId;
        sevkiyat.urunler = urunler;
        sevkiyat.toplamTutar = yeniToplamTutar;
        if (sevkiyatTarihi) {
            sevkiyat.sevkiyatTarihi = sevkiyatTarihi;
        }
        await sevkiyat.save();

        // Yeni firmanın borç durumunu güncelle
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

        // Güncellenmiş veriyi populate ile getir
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

// Sevkiyat silme
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // ID format kontrolü
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

        // Sevkiyatı sil
        await Sevkiyat.findByIdAndDelete(id);

        // Şirket cari hesabından düş
        const sirket = await Sirket.findById(sirketId);
        if (sirket) {
            sirket.sirketCarisi -= sevkiyatToplamTutar;
            // İşlem geçmişinden kaldır
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

// Sevkiyat email bildirimi gönderme
router.post('/:id/send-notification', async (req, res) => {
    try {
        const { id } = req.params;

        // ID format kontrolü
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                msg: 'Geçersiz sevkiyat ID formatı.'
            });
        }

        // Sevkiyat bilgilerini çek
        const sevkiyat = await Sevkiyat.findById(id);
        if (!sevkiyat) {
            return res.status(404).json({
                success: false,
                msg: 'Sevkiyat bulunamadı'
            });
        }

        // Şirket bilgilerini çek
        const sirket = await Sirket.findById(sevkiyat.sirketId);
        if (!sirket) {
            return res.status(404).json({
                success: false,
                msg: 'Şirket bulunamadı'
            });
        }

        // Email adreslerini kontrol et
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

        // Email gönder
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
        
        // Hata tipine göre mesaj belirle
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

// Toplu sevkiyat bilgileri getirme (istatistikler için)
router.get('/stats/summary', async (req, res) => {
    try {
        const { startDate, endDate, sirketId } = req.query;
        
        let matchFilter = {};
        
        // Tarih filtresi
        if (startDate && endDate) {
            matchFilter.sevkiyatTarihi = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }
        
        // Şirket filtresi
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