const express = require('express');
const router = express.Router();
const Sirket = require('../models/Şirketler');
const mongoose = require("mongoose")


const handleServerError = (res, err, defaultMsg) => {
    console.error(defaultMsg, err);
    if (err.code === 11000) {
        return res.status(400).json({ mesaj: 'Bu şirket kodu zaten başka bir şirkete ait.', hata: err.message });
    }
    res.status(500).json({ mesaj: defaultMsg, hata: err.message });
};


const updateSirketBorc = async (sirketId, tutar) => {
    try {
        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            throw new Error('Şirket bulunamadı.');
        }
        
        sirket.sirketCarisi += tutar;
        await sirket.save();
        return sirket.sirketCarisi;
    } catch (err) {
        console.error('Borç durumu güncelleme hatası:', err.message);
        throw err;
    }
};


const getOdemeTuruText = (odemeTuru) => {
    const odemeTurleri = {
        'nakit': 'Nakit',
        'havale': 'Havale/EFT',
        'cek': 'Çek',
        'senet': 'Senet',
        'kredi': 'Kredi Kartı'
    };
    return odemeTurleri[odemeTuru] || 'Bilinmeyen';
};


const hesaplaIslem = (islemTuru, tutar, aciklama, odemeTuru) => {
    let hesaplananTutar = parseFloat(tutar);
    let islemAciklamasi = '';

    switch (islemTuru) {
        case 'satis':
            
            islemAciklamasi = aciklama || 'Satış işlemi';
            break;
        case 'alis':
            
            hesaplananTutar = -hesaplananTutar;
            islemAciklamasi = aciklama || 'Alış işlemi';
            break;
        case 'odemeAl':
            
            hesaplananTutar = -hesaplananTutar;
            const odemeAlAciklama = odemeTuru ?
                `${getOdemeTuruText(odemeTuru)} ile ödeme alındı` :
                'Ödeme alındı';
            islemAciklamasi = aciklama || odemeAlAciklama;
            break;
        case 'odemeYap':
            
            const odemeYapAciklama = odemeTuru ?
                `${getOdemeTuruText(odemeTuru)} ile ödeme yapıldı` :
                'Ödeme yapıldı';
            islemAciklamasi = aciklama || odemeYapAciklama;
            break;
        default:
            throw new Error('Geçersiz işlem türü');
    }

    return { hesaplananTutar, islemAciklamasi };
};




router.get('/', async (req, res) => {
    try {
        const { tip } = req.query;
        let sorgu = {};

        if (tip) {
            if (!['alici', 'satici'].includes(tip.toLowerCase())) {
                return res.status(400).json({ mesaj: 'Geçersiz şirket tipi. "alici" veya "satici" olmalı.' });
            }
            sorgu.tip = tip.toLowerCase();
        }

        const sirketler = await Sirket.find(sorgu)
            .select('sirketAdi sirketBolgesi sirketCarisi sirketCariBirimi sirketKodu tip emailler')
            .sort({ sirketAdi: 1 });

        res.json(sirketler);
    } catch (err) {
        handleServerError(res, err, 'Şirketler listelenirken hata oluştu.');
    }
});


router.post('/borc/duzelt/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { yeniBakiye, aciklama } = req.body;

        
        if (yeniBakiye === undefined || isNaN(parseFloat(yeniBakiye))) {
            return res.status(400).json({ mesaj: 'Geçerli bir "yeniBakiye" değeri gereklidir.' });
        }

        
        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        
        const mevcutBakiye = sirket.sirketCarisi;
        const hedefBakiye = parseFloat(yeniBakiye);
        const duzeltmeTutari = hedefBakiye - mevcutBakiye;

        
        if (duzeltmeTutari === 0) {
            return res.json({
                mesaj: 'Şirket bakiyesi zaten belirtilen değerde, işlem yapılmadı.',
                yeniBorc: sirket.sirketCarisi
            });
        }

        
        const duzeltmeIslemi = {
            islemTarihi: new Date(),
            islemAciklamasi: aciklama || `Bakiye Düzeltme (Eski: ${mevcutBakiye.toFixed(2)}, Yeni: ${hedefBakiye.toFixed(2)})`,
            tutar: duzeltmeTutari
        };

        
        sirket.sirketCarisi = hedefBakiye; 
        sirket.islemler.push(duzeltmeIslemi);

        
        await sirket.save();

        
        res.status(200).json({
            mesaj: 'Şirket bakiyesi başarıyla düzeltildi.',
            yeniBorc: sirket.sirketCarisi,
            yapilanIslem: sirket.islemler[sirket.islemler.length - 1]
        });

    } catch (err) {
        handleServerError(res, err, 'Bakiye düzeltilirken bir hata oluştu.');
    }
});


router.post('/', async (req, res) => {
    try {
        const { sirketAdi, sirketBolgesi, sirketCarisi, sirketCariBirimi, sirketKodu, tip, emailler } = req.body;

        
        if (!sirketAdi || !sirketBolgesi || sirketCarisi === undefined || !sirketKodu || !tip) {
            return res.status(400).json({ mesaj: 'Zorunlu alanlar eksik.' });
        }

        if (!['alici', 'satici'].includes(tip.toLowerCase())) {
            return res.status(400).json({ mesaj: 'Geçersiz şirket tipi. "alici" veya "satici" olmalı.' });
        }

        const yeniSirket = new Sirket({
            sirketAdi,
            sirketBolgesi,
            sirketCarisi: parseFloat(sirketCarisi),
            sirketCariBirimi: sirketCariBirimi || 'USD',
            sirketKodu,
            tip: tip.toLowerCase(),
            emailler: emailler || [],
            islemler: [{
                islemTarihi: new Date(),
                islemAciklamasi: "Başlangıç borç durumu",
                tutar: parseFloat(sirketCarisi)
            }]
        });

        await yeniSirket.save();
        res.status(201).json(yeniSirket);
    } catch (err) {
        handleServerError(res, err, 'Şirket eklenirken hata oluştu.');
    }
});


router.post('/islem/tekli/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { islemTuru, tutar, aciklama, odemeTuru } = req.body;

        
        if (!islemTuru || tutar === undefined || tutar === 0) {
            return res.status(400).json({ mesaj: 'İşlem türü ve geçerli bir tutar gereklidir.' });
        }
        if (!['satis', 'alis', 'odemeAl', 'odemeYap'].includes(islemTuru)) {
            return res.status(400).json({ mesaj: 'Geçersiz işlem türü.' });
        }

        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        
        const { hesaplananTutar, islemAciklamasi } = hesaplaIslem(islemTuru, tutar, aciklama, odemeTuru);

        
        sirket.sirketCarisi += hesaplananTutar;

        
        const yeniIslem = {
            islemTarihi: new Date(),
            islemAciklamasi: islemAciklamasi,
            tutar: hesaplananTutar
        };

        sirket.islemler.push(yeniIslem);
        await sirket.save();

        res.status(201).json({
            mesaj: 'İşlem başarıyla eklendi.',
            yeniBorc: sirket.sirketCarisi,
            eklenenIslem: sirket.islemler[sirket.islemler.length - 1]
        });

    } catch (err) {
        handleServerError(res, err, 'Tekli işlem eklenirken hata oluştu.');
    }
});


router.post('/islem/coklu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const islemler = req.body;

        
        if (!Array.isArray(islemler) || islemler.length === 0) {
            return res.status(400).json({ mesaj: 'Geçerli bir işlem dizisi gereklidir.' });
        }

        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        const basariliIslemler = [];
        const hataMesajlari = [];

        
        for (const islem of islemler) {
            try {
                const { islemTuru, tutar, aciklama, odemeTuru } = islem;

                
                if (!islemTuru || tutar === undefined || tutar === 0) {
                    hataMesajlari.push({ islem: islem, mesaj: 'İşlem türü ve geçerli bir tutar gereklidir.' });
                    continue;
                }
                if (!['satis', 'alis', 'odemeAl', 'odemeYap'].includes(islemTuru)) {
                    hataMesajlari.push({ islem: islem, mesaj: 'Geçersiz işlem türü.' });
                    continue;
                }

                
                const { hesaplananTutar, islemAciklamasi } = hesaplaIslem(islemTuru, tutar, aciklama, odemeTuru);

                
                sirket.sirketCarisi += hesaplananTutar;

                
                const yeniIslem = {
                    islemTarihi: new Date(),
                    islemAciklamasi: islemAciklamasi,
                    tutar: hesaplananTutar
                };

                sirket.islemler.push(yeniIslem);
                basariliIslemler.push(yeniIslem);

            } catch (err) {
                hataMesajlari.push({ islem: islem, mesaj: err.message });
            }
        }

        
        await sirket.save();

        res.status(201).json({
            mesaj: `${basariliIslemler.length} işlem başarıyla eklendi.`,
            yeniBorc: sirket.sirketCarisi,
            basariliIslemler: basariliIslemler,
            hataMesajlari: hataMesajlari
        });

    } catch (err) {
        handleServerError(res, err, 'Çoklu işlem eklenirken hata oluştu.');
    }
});


router.put('/islem/:sirketId/:islemId', async (req, res) => {
    try {
        const { sirketId, islemId } = req.params;
        const { islemTuru, tutar, aciklama, odemeTuru } = req.body;

        
        if (!mongoose.Types.ObjectId.isValid(sirketId)) {
            return res.status(400).json({ mesaj: 'Geçersiz şirket ID formatı.' });
        }

        if (!mongoose.Types.ObjectId.isValid(islemId)) {
            return res.status(400).json({ mesaj: 'Geçersiz işlem ID formatı.' });
        }

        
        if (!islemTuru || tutar === undefined || isNaN(parseFloat(tutar))) {
            return res.status(400).json({ mesaj: 'İşlem türü ve geçerli bir tutar gereklidir.' });
        }

        if (!['satis', 'alis', 'odemeAl', 'odemeYap'].includes(islemTuru)) {
            return res.status(400).json({ mesaj: 'Geçersiz işlem türü.' });
        }

        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        
        const islem = sirket.islemler.id(islemId);
        
        if (!islem) {
            return res.status(404).json({ mesaj: 'İşlem bulunamadı.' });
        }

        
        const eskiTutar = islem.tutar;

        
        const { hesaplananTutar, islemAciklamasi } = hesaplaIslem(islemTuru, tutar, aciklama, odemeTuru);

        
        sirket.sirketCarisi -= eskiTutar;
        
        
        sirket.sirketCarisi += hesaplananTutar;

        
        islem.islemAciklamasi = islemAciklamasi;
        islem.tutar = hesaplananTutar;
        islem.guncellenmeTarihi = new Date();

        
        await sirket.save();

        res.status(200).json({
            mesaj: 'İşlem başarıyla güncellendi.',
            yeniBorc: sirket.sirketCarisi,
            guncellenenIslem: {
                _id: islem._id,
                islemTarihi: islem.islemTarihi,
                islemAciklamasi: islem.islemAciklamasi,
                tutar: islem.tutar,
                guncellenmeTarihi: islem.guncellenmeTarihi
            }
        });

    } catch (err) {
        console.error('İşlem güncelleme hatası:', err);
        handleServerError(res, err, 'İşlem güncellenirken hata oluştu.');
    }
});


router.post('/islem/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        
        if (Array.isArray(data)) {
            return router.handle({
                method: 'POST',
                url: `/islem/coklu/${id}`,
                params: { id },
                body: data
            }, res);
        }

        
        const { islemTuru, tutar, aciklama, odemeTuru } = data;

        
        if (!islemTuru || tutar === undefined || tutar === 0) {
            return res.status(400).json({ mesaj: 'İşlem türü ve geçerli bir tutar gereklidir.' });
        }
        if (!['satis', 'alis', 'odemeAl', 'odemeYap'].includes(islemTuru)) {
            return res.status(400).json({ mesaj: 'Geçersiz işlem türü.' });
        }

        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        
        const { hesaplananTutar, islemAciklamasi } = hesaplaIslem(islemTuru, tutar, aciklama, odemeTuru);

        
        sirket.sirketCarisi += hesaplananTutar;

        
        const yeniIslem = {
            islemTarihi: new Date(),
            islemAciklamasi: islemAciklamasi,
            tutar: hesaplananTutar
        };

        sirket.islemler.push(yeniIslem);
        await sirket.save();

        res.status(201).json({
            mesaj: 'İşlem başarıyla eklendi.',
            yeniBorc: sirket.sirketCarisi,
            eklenenIslem: sirket.islemler[sirket.islemler.length - 1]
        });

    } catch (err) {
        handleServerError(res, err, 'İşlem eklenirken hata oluştu.');
    }
});


router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sayfa = parseInt(req.query.sayfa) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const atla = (sayfa - 1) * limit;

        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        const siraliIslemler = [...sirket.islemler].sort((a, b) => {
            const tarihA = a?.islemTarihi ? new Date(a.islemTarihi) : new Date(0);
            const tarihB = b?.islemTarihi ? new Date(b.islemTarihi) : new Date(0);
            return tarihB - tarihA;
        });

        const toplamIslem = siraliIslemler.length;
        const toplamSayfa = Math.ceil(toplamIslem / limit);
        const sayfaliIslemler = siraliIslemler.slice(atla, atla + limit);

        const responseData = {
            sirket: {
                ...sirket.toObject(),
                islemler: sayfaliIslemler
            },
            mevcutSayfa: sayfa,
            toplamSayfa: toplamSayfa
        };

        res.json(responseData);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ mesaj: 'Geçersiz şirket ID formatı.' });
        }
        handleServerError(res, err, 'Şirket detayları alınırken hata oluştu.');
    }
});


router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const guncellemeler = req.body;

        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ mesaj: 'Geçersiz şirket ID' });
        }

        const guncellenenSirket = await Sirket.findByIdAndUpdate(
            id,
            { $set: guncellemeler },
            { new: true, runValidators: true }
        );

        if (!guncellenenSirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı' });
        }

        res.json(guncellenenSirket);
    } catch (err) {
        handleServerError(res, err, 'Şirket güncellenirken hata oluştu');
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const silinenSirket = await Sirket.findByIdAndDelete(id);
        if (!silinenSirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı' });
        }

        res.json({ mesaj: 'Şirket başarıyla silindi', silinenSirket });
    } catch (err) {
        handleServerError(res, err, 'Şirket silinirken hata oluştu');
    }
});




router.post('/email/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, aciklama, birincil } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ mesaj: 'Geçerli bir email adresi giriniz.' });
        }

        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        if (sirket.emailler.length >= 3) {
            return res.status(400).json({ mesaj: 'En fazla 3 email adresi ekleyebilirsiniz.' });
        }

        
        if (sirket.emailler.some(e => e.email === email.toLowerCase())) {
            return res.status(400).json({ mesaj: 'Bu email adresi zaten ekli.' });
        }

        
        if (birincil) {
            sirket.emailler.forEach(e => e.birincil = false);
        }

        const yeniEmail = {
            email: email.toLowerCase(),
            aciklama: aciklama || '',
            birincil: birincil || (sirket.emailler.length === 0) 
        };

        sirket.emailler.push(yeniEmail);
        await sirket.save();

        const eklenenEmail = sirket.emailler[sirket.emailler.length - 1];
        res.status(201).json({
            mesaj: 'Email başarıyla eklendi.',
            email: eklenenEmail
        });
    } catch (err) {
        handleServerError(res, err, 'Email eklenirken hata oluştu.');
    }
});


router.put('/email/:sirketId/:emailId', async (req, res) => {
    try {
        const { sirketId, emailId } = req.params;
        const { email, aciklama, birincil } = req.body;

        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        const emailObj = sirket.emailler.id(emailId);
        if (!emailObj) {
            return res.status(404).json({ mesaj: 'Email bulunamadı.' });
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ mesaj: 'Geçerli bir email adresi giriniz.' });
        }

        
        if (email && email.toLowerCase() !== emailObj.email) {
            if (sirket.emailler.some(e => e.email === email.toLowerCase() && e._id.toString() !== emailId)) {
                return res.status(400).json({ mesaj: 'Bu email adresi zaten ekli.' });
            }
            emailObj.email = email.toLowerCase();
        }

        if (aciklama !== undefined) emailObj.aciklama = aciklama;

        
        if (birincil !== undefined) {
            if (birincil) {
                
                sirket.emailler.forEach(e => {
                    if (e._id.toString() !== emailId) e.birincil = false;
                });
            }
            emailObj.birincil = birincil;
        }

        await sirket.save();
        res.json({
            mesaj: 'Email başarıyla güncellendi.',
            email: emailObj
        });
    } catch (err) {
        handleServerError(res, err, 'Email güncellenirken hata oluştu.');
    }
});


router.delete('/email/:sirketId/:emailId', async (req, res) => {
    try {
        const { sirketId, emailId } = req.params;

        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        const emailObj = sirket.emailler.id(emailId);
        if (!emailObj) {
            return res.status(404).json({ mesaj: 'Email bulunamadı.' });
        }

        const birinciMi = emailObj.birincil;
        sirket.emailler.pull(emailId);

        
        if (birinciMi && sirket.emailler.length > 0) {
            sirket.emailler[0].birincil = true;
        }

        await sirket.save();
        res.json({ mesaj: 'Email başarıyla silindi.' });
    } catch (err) {
        handleServerError(res, err, 'Email silinirken hata oluştu.');
    }
});




router.post('/borc/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tutar, aciklama } = req.body;

        if (tutar === undefined || tutar === 0) {
            return res.status(400).json({ mesaj: 'Geçerli bir tutar giriniz.' });
        }

        const sirket = await Sirket.findById(id);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        
        sirket.sirketCarisi += parseFloat(tutar);

        
        const yeniIslem = {
            islemTarihi: new Date(),
            islemAciklamasi: aciklama || (tutar > 0 ? 'Borç eklendi' : 'Borç azaltıldı'),
            tutar: parseFloat(tutar)
        };

        sirket.islemler.push(yeniIslem);
        await sirket.save();

        res.json({
            mesaj: 'Borç durumu başarıyla güncellendi.',
            yeniBorc: sirket.sirketCarisi,
            islem: yeniIslem
        });
    } catch (err) {
        handleServerError(res, err, 'Borç güncellenirken hata oluştu.');
    }
});


router.get("/islemler/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sayfa = parseInt(req.query.sayfa) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const baslangic = req.query.baslangic;
    const bitis = req.query.bitis;

    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        mesaj: "Geçersiz veya eksik şirket ID",
      });
    }

    
    const sirket = await Sirket.findById(id);
    if (!sirket) {
      return res.status(404).json({
        success: false,
        mesaj: "Şirket bulunamadı",
      });
    }

    
    let islemler = [...sirket.islemler];

    
    if (baslangic || bitis) {
      islemler = islemler.filter((islem) => {
        const islemTarihi = new Date(islem.islemTarihi);
        if (baslangic && islemTarihi < new Date(baslangic)) return false;
        if (bitis && islemTarihi > new Date(bitis)) return false;
        return true;
      });
    }

    
    islemler.sort((a, b) => new Date(b.islemTarihi) - new Date(a.islemTarihi));

    
    const toplamIslem = islemler.length;
    const toplamSayfa = Math.ceil(toplamIslem / limit);
    const atla = (sayfa - 1) * limit;
    const sayfaliIslemler = islemler.slice(atla, atla + limit);

    
    res.json({
      success: true,
      sirket: {
        _id: sirket._id,
        sirketAdi: sirket.sirketAdi,
        sirketCariBirimi: sirket.sirketCariBirimi,
        sirketCarisi: sirket.sirketCarisi,
      },
      islemler: sayfaliIslemler,
      mevcutSayfa: sayfa,
      toplamSayfa,
      toplamIslem,
    });
  } catch (err) {
    console.error("❌ islemler/:id hata:", err);
    res.status(500).json({
      success: false,
      mesaj: "İşlem geçmişi alınırken hata oluştu.",
      hata: err.message,
    });
  }
});

router.delete('/islem/:sirketId/:islemId', async (req, res) => {
    try {
        const { sirketId, islemId } = req.params;

        const sirket = await Sirket.findById(sirketId);
        if (!sirket) {
            return res.status(404).json({ mesaj: 'Şirket bulunamadı.' });
        }

        const islem = sirket.islemler.id(islemId);
        if (!islem) {
            return res.status(404).json({ mesaj: 'İşlem bulunamadı.' });
        }

        
        sirket.sirketCarisi -= islem.tutar;
        sirket.islemler.pull(islemId);

        await sirket.save();
        res.json({
            mesaj: 'İşlem başarıyla silindi.',
            yeniBorc: sirket.sirketCarisi
        });
    } catch (err) {
        handleServerError(res, err, 'İşlem silinirken hata oluştu.');
    }
});

module.exports = router;