const express = require('express');
const router = express.Router();
const CekSenet = require('../models/Ceksenet');
const Sirket = require('../models/Şirketler');

const cariIslemYap = async (firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama = '') => {
    if (!firmaId) return; 

    let cariDegisimi = 0;
    let islemAciklamasi = '';

    if (tip === 'alinan') {
        
        cariDegisimi = -tutar;
        islemAciklamasi = `Alınan ${evrakTipi}${banka ? ' - ' + banka : ''}${borclu ? ' - ' + borclu : ''}${aciklama ? ' (' + aciklama + ')' : ''}`;
    } else if (tip === 'verilen') {
        
        cariDegisimi = tutar;
        islemAciklamasi = `Verilen ${evrakTipi}${banka ? ' - ' + banka : ''}${borclu ? ' - ' + borclu : ''}${aciklama ? ' (' + aciklama + ')' : ''}`;
    }

    
    await Sirket.findByIdAndUpdate(
        firmaId,
        {
            $inc: { sirketCarisi: cariDegisimi },
            $push: {
                islemler: {
                    islemTarihi: new Date(),
                    islemAciklamasi,
                    tutar: cariDegisimi
                }
            }
        }
    );
};


const odemeIcinCariGuncelle = async (evrak, odemeTutari, odemeAciklamasi) => {
    if (!evrak.firmaId || !evrak.cariIslensin) return;

    let cariDegisimi = 0;
    let islemAciklamasi = '';

    if (evrak.tip === 'alinan') {
        
        
        cariDegisimi = odemeTutari;
        islemAciklamasi = `${evrak.evrakTipi.charAt(0).toUpperCase() + evrak.evrakTipi.slice(1)} ödemesi${evrak.banka ? ' - ' + evrak.banka : ''}${evrak.borclu ? ' - ' + evrak.borclu : ''}${odemeAciklamasi ? ' (' + odemeAciklamasi + ')' : ''}`;
    } else if (evrak.tip === 'verilen') {
        
        
        cariDegisimi = -odemeTutari;
        islemAciklamasi = `${evrak.evrakTipi.charAt(0).toUpperCase() + evrak.evrakTipi.slice(1)} ödemesi${evrak.banka ? ' - ' + evrak.banka : ''}${evrak.borclu ? ' - ' + evrak.borclu : ''}${odemeAciklamasi ? ' (' + odemeAciklamasi + ')' : ''}`;
    }

    
    await Sirket.findByIdAndUpdate(
        evrak.firmaId,
        {
            $inc: { sirketCarisi: cariDegisimi },
            $push: {
                islemler: {
                    islemTarihi: new Date(),
                    islemAciklamasi,
                    tutar: cariDegisimi
                }
            }
        }
    );
};



router.get('/', async (req, res) => {
    try {
        const cekSenetler = await CekSenet.find()
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') 
            .sort({ vadeTarihi: 1 });

        res.json(cekSenetler);
    } catch (error) {
        console.error('Çek/Senetler getirilirken hata:', error);
        res.status(500).json({
            error: 'Çek/Senetler getirilirken hata oluştu',
            message: error.message
        });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const item = await CekSenet.findById(req.params.id)
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu');

        if (!item) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        res.json(item);
    } catch (error) {
        console.error('Çek/Senet getirilirken hata:', error);
        res.status(500).json({
            error: 'Çek/Senet getirilirken hata oluştu',
            message: error.message
        });
    }
});


router.post('/tekli', async (req, res) => {
    try {
        const {
            evrakTipi, 
            tip, 
            firmaId, 
            sahisAdi, 
            transferFirmaId,
            banka,
            borclu,
            tutar,
            paraBirimi,
            vadeTarihi,
            aciklama,
            durum,
            cariIslensin = true 
        } = req.body;

        
        if (!evrakTipi || !tip || !borclu || !tutar || !vadeTarihi) {
            return res.status(400).json({
                error: 'Gerekli alanlar eksik',
                required: ['evrakTipi', 'tip', 'borclu', 'tutar', 'vadeTarihi']
            });
        }

        if (!['cek', 'senet'].includes(evrakTipi)) {
            return res.status(400).json({ error: 'Evrak tipi "cek" veya "senet" olmalıdır' });
        }

        if (!['alinan', 'verilen'].includes(tip)) {
            return res.status(400).json({ error: 'Tip "alinan" veya "verilen" olmalıdır' });
        }

        if (tutar <= 0) {
            return res.status(400).json({ error: 'Tutar sıfırdan büyük olmalıdır' });
        }

        if (!firmaId && !sahisAdi) {
            return res.status(400).json({ error: 'firmaId veya sahisAdi alanlarından biri zorunludur' });
        }

        
        if (firmaId) {
            const firma = await Sirket.findById(firmaId);
            if (!firma) {
                return res.status(404).json({ error: 'Belirtilen firma bulunamadı' });
            }
        }

        
        let durumValue = durum;
        if (tip === 'alinan' && evrakTipi === 'cek' && !durum) {
            durumValue = 'Kasa';
        } else if (tip === 'verilen' || evrakTipi === 'senet') {
            durumValue = 'Aktif';
        }

        
        const yeniEvrak = new CekSenet({
            evrakTipi,
            tip,
            firmaId: firmaId || null,
            sahisAdi: sahisAdi || null,
            transferFirmaId: transferFirmaId || null,
            banka: banka || '',
            borclu,
            tutar,
            paraBirimi: paraBirimi || 'TRY',
            vadeTarihi,
            aciklama: aciklama || '',
            durum: durumValue,
            cariIslensin
        });

        
        await yeniEvrak.save();

        
        if (cariIslensin && firmaId) {
            await cariIslemYap(firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama);
        }

        
        const kaydedilenEvrak = await CekSenet.findById(yeniEvrak._id)
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu'); 

        res.status(201).json({
            message: `${evrakTipi.charAt(0).toUpperCase() + evrakTipi.slice(1)} başarıyla eklendi${cariIslensin && firmaId ? ' ve cari güncellendi' : ''}`,
            evrak: kaydedilenEvrak
        });

    } catch (error) {
        console.error('Tekli çek/senet eklenirken hata:', error);
        res.status(500).json({
            error: 'Tekli çek/senet eklenirken hata oluştu',
            message: error.message
        });
    }
});


router.post('/coklu', async (req, res) => {
    try {
        const evraklar = req.body;

        
        if (!Array.isArray(evraklar) || evraklar.length === 0) {
            return res.status(400).json({ error: 'Geçerli bir çek/senet dizisi gereklidir.' });
        }

        const basariliEvraklar = [];
        const hataMesajlari = [];

        for (let i = 0; i < evraklar.length; i++) {
            try {
                const evrak = evraklar[i];
                const {
                    evrakTipi,
                    tip,
                    firmaId,
                    sahisAdi,
                    transferFirmaId,
                    banka,
                    borclu,
                    tutar,
                    paraBirimi,
                    vadeTarihi,
                    aciklama,
                    durum,
                    cariIslensin = true
                } = evrak;

                
                if (!evrakTipi || !tip || !borclu || !tutar || !vadeTarihi) {
                    hataMesajlari.push({
                        index: i,
                        evrak,
                        mesaj: 'Gerekli alanlar eksik: evrakTipi, tip, borclu, tutar, vadeTarihi'
                    });
                    continue;
                }

                if (!['cek', 'senet'].includes(evrakTipi)) {
                    hataMesajlari.push({
                        index: i,
                        evrak,
                        mesaj: 'Evrak tipi "cek" veya "senet" olmalıdır'
                    });
                    continue;
                }

                if (!['alinan', 'verilen'].includes(tip)) {
                    hataMesajlari.push({
                        index: i,
                        evrak,
                        mesaj: 'Tip "alinan" veya "verilen" olmalıdır'
                    });
                    continue;
                }

                if (tutar <= 0) {
                    hataMesajlari.push({
                        index: i,
                        evrak,
                        mesaj: 'Tutar sıfırdan büyük olmalıdır'
                    });
                    continue;
                }

                if (!firmaId && !sahisAdi) {
                    hataMesajlari.push({
                        index: i,
                        evrak,
                        mesaj: 'firmaId veya sahisAdi alanlarından biri zorunludur'
                    });
                    continue;
                }

                
                if (firmaId) {
                    const firma = await Sirket.findById(firmaId);
                    if (!firma) {
                        hataMesajlari.push({
                            index: i,
                            evrak,
                            mesaj: 'Belirtilen firma bulunamadı'
                        });
                        continue;
                    }
                }

                
                let durumValue = durum;
                if (tip === 'alinan' && evrakTipi === 'cek' && !durum) {
                    durumValue = 'Kasa';
                } else if (tip === 'verilen' || evrakTipi === 'senet') {
                    durumValue = 'Aktif';
                }

                
                const yeniEvrak = new CekSenet({
                    evrakTipi,
                    tip,
                    firmaId: firmaId || null,
                    sahisAdi: sahisAdi || null,
                    transferFirmaId: transferFirmaId || null,
                    banka: banka || '',
                    borclu,
                    tutar,
                    paraBirimi: paraBirimi || 'TRY',
                    vadeTarihi,
                    aciklama: aciklama || '',
                    durum: durumValue,
                    cariIslensin
                });

                
                await yeniEvrak.save();

                
                if (cariIslensin && firmaId) {
                    await cariIslemYap(firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama);
                }

                
                const kaydedilenEvrak = await CekSenet.findById(yeniEvrak._id)
                    .populate('firmaId', 'sirketAdi sirketKodu')
                    .populate('ciroFirmaId', 'sirketAdi sirketKodu'); 

                basariliEvraklar.push(kaydedilenEvrak);

            } catch (err) {
                hataMesajlari.push({
                    index: i,
                    evrak: evraklar[i],
                    mesaj: err.message
                });
            }
        }

        res.status(201).json({
            message: `${basariliEvraklar.length} çek/senet başarıyla eklendi`,
            basariliEvraklar,
            hataMesajlari,
            toplamIslem: evraklar.length,
            basariliSayisi: basariliEvraklar.length,
            hataliSayisi: hataMesajlari.length
        });

    } catch (error) {
        console.error('Çoklu çek/senet eklenirken hata:', error);
        res.status(500).json({
            error: 'Çoklu çek/senet eklenirken hata oluştu',
            message: error.message
        });
    }
});


router.post('/', async (req, res) => {
    try {
        const data = req.body;

        if (Array.isArray(data)) {
            return res.status(400).json({ error: 'Çoklu işlem için /coklu endpoint kullanın' });
        }

        const {
            evrakTipi,
            tip,
            firmaId,
            sahisAdi,
            transferFirmaId,
            banka,
            borclu,
            tutar,
            paraBirimi,
            vadeTarihi,
            aciklama,
            durum,
            cariIslensin = true
        } = data;

        if (!evrakTipi || !tip || !borclu || !tutar || !vadeTarihi) {
            return res.status(400).json({
                error: 'Gerekli alanlar eksik',
                required: ['evrakTipi', 'tip', 'borclu', 'tutar', 'vadeTarihi']
            });
        }

        if (!['cek', 'senet'].includes(evrakTipi)) {
            return res.status(400).json({ error: 'Evrak tipi "cek" veya "senet" olmalıdır' });
        }

        if (!['alinan', 'verilen'].includes(tip)) {
            return res.status(400).json({ error: 'Tip "alinan" veya "verilen" olmalıdır' });
        }

        if (tutar <= 0) {
            return res.status(400).json({ error: 'Tutar sıfırdan büyük olmalıdır' });
        }

        if (!firmaId && !sahisAdi) {
            return res.status(400).json({ error: 'firmaId veya sahisAdi alanlarından biri zorunludur' });
        }

        if (firmaId) {
            const firma = await Sirket.findById(firmaId);
            if (!firma) {
                return res.status(404).json({ error: 'Belirtilen firma bulunamadı' });
            }
        }

        let durumValue = durum;
        if (tip === 'alinan' && evrakTipi === 'cek' && !durum) {
            durumValue = 'Kasa';
        } else if (tip === 'verilen' || evrakTipi === 'senet') {
            durumValue = 'Aktif';
        }

        const yeniEvrak = new CekSenet({
            evrakTipi,
            tip,
            firmaId: firmaId || null,
            sahisAdi: sahisAdi || null,
            transferFirmaId: transferFirmaId || null,
            banka: banka || '',
            borclu,
            tutar,
            paraBirimi: paraBirimi || 'TRY',
            vadeTarihi,
            aciklama: aciklama || '',
            durum: durumValue,
            cariIslensin
        });

        await yeniEvrak.save();

        if (cariIslensin && firmaId) {
            await cariIslemYap(firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama);
        }

        const kaydedilenEvrak = await CekSenet.findById(yeniEvrak._id)
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu');

        res.status(201).json(kaydedilenEvrak);

    } catch (error) {
        console.error('Çek/Senet eklenirken hata:', error);
        res.status(500).json({
            error: 'Çek/Senet eklenirken hata oluştu',
            message: error.message
        });
    }
});

router.post('/:id/odeme', async (req, res) => {
    try {
        const evrakId = req.params.id;
        const { tutar, aciklama } = req.body;

        if (!tutar || parseFloat(tutar) <= 0) {
            return res.status(400).json({ error: 'Geçerli bir ödeme tutarı giriniz' });
        }

        const evrak = await CekSenet.findById(evrakId).populate('firmaId');
        if (!evrak) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        const toplamOdenen = (evrak.odemeler || []).reduce((sum, o) => sum + parseFloat(o.tutar), 0);
        const kalan = parseFloat(evrak.tutar) - toplamOdenen;

        if (parseFloat(tutar) > kalan) {
            return res.status(400).json({ 
                error: 'Ödeme tutarı kalan tutardan fazla olamaz',
                kalan: kalan
            });
        }

        const yeniOdeme = {
            tarih: new Date(),
            tutar: parseFloat(tutar),
            aciklama: aciklama || ''
        };

        // evrak.save() yerine updateOne kullan - validation bypass edilir
        await CekSenet.findByIdAndUpdate(
            evrakId,
            { $push: { odemeler: yeniOdeme } },
            { runValidators: false } // Validation'ı çalıştırma
        );

        if (evrak.cariIslensin) {
            await odemeIcinCariGuncelle(evrak, parseFloat(tutar), aciklama);
        }

        const guncellenenEvrak = await CekSenet.findById(evrakId)
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu');

        res.json({
            message: 'Ödeme başarıyla eklendi' + (evrak.cariIslensin && evrak.firmaId ? ' ve cari güncellendi' : ''),
            evrak: guncellenenEvrak
        });

    } catch (error) {
        console.error('Ödeme eklenirken hata:', error);
        res.status(500).json({
            error: 'Ödeme eklenirken hata oluştu',
            message: error.message
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const evrakId = req.params.id;
        const guncellemeler = req.body;

        
        if (guncellemeler.firmaId === '') guncellemeler.firmaId = null;
        if (guncellemeler.transferFirmaId === '') guncellemeler.transferFirmaId = null;
        if (guncellemeler.ciroFirmaId === '') guncellemeler.ciroFirmaId = null;

        
        const mevcutEvrak = await CekSenet.findById(evrakId);
        if (!mevcutEvrak) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        
        const cariEtkiliGuncelleme = (
            (guncellemeler.tutar && guncellemeler.tutar !== mevcutEvrak.tutar) ||
            (guncellemeler.tip && guncellemeler.tip !== mevcutEvrak.tip) ||
            (guncellemeler.cariIslensin !== undefined && guncellemeler.cariIslensin !== mevcutEvrak.cariIslensin) ||
            (guncellemeler.firmaId && guncellemeler.firmaId !== mevcutEvrak.firmaId?.toString())
        );

        
        const yeniFirmaId = guncellemeler.firmaId !== undefined ? guncellemeler.firmaId : mevcutEvrak.firmaId;

        
        if (cariEtkiliGuncelleme && (mevcutEvrak.firmaId || yeniFirmaId)) {
            
            if (mevcutEvrak.cariIslensin && mevcutEvrak.firmaId) {
                let eskiCariDegisimi = 0;
                if (mevcutEvrak.tip === 'alinan') {
                    eskiCariDegisimi = mevcutEvrak.tutar; 
                } else {
                    eskiCariDegisimi = -mevcutEvrak.tutar; 
                }

                await Sirket.findByIdAndUpdate(
                    mevcutEvrak.firmaId,
                    {
                        $inc: { sirketCarisi: eskiCariDegisimi },
                        $push: {
                            islemler: {
                                islemTarihi: new Date(),
                                islemAciklamasi: `${mevcutEvrak.evrakTipi} güncelleme - eski işlem geri alındı`,
                                tutar: eskiCariDegisimi
                            }
                        }
                    }
                );
            }

            
            const yeniCariIslensin = guncellemeler.cariIslensin !== undefined ? guncellemeler.cariIslensin : mevcutEvrak.cariIslensin;
            if (yeniCariIslensin && yeniFirmaId) {
                const yeniTip = guncellemeler.tip || mevcutEvrak.tip;
                const yeniTutar = guncellemeler.tutar || mevcutEvrak.tutar;

                let yeniCariDegisimi = 0;
                if (yeniTip === 'alinan') {
                    yeniCariDegisimi = -yeniTutar; 
                } else {
                    yeniCariDegisimi = yeniTutar; 
                }

                await Sirket.findByIdAndUpdate(
                    yeniFirmaId,
                    {
                        $inc: { sirketCarisi: yeniCariDegisimi },
                        $push: {
                            islemler: {
                                islemTarihi: new Date(),
                                islemAciklamasi: `${mevcutEvrak.evrakTipi} güncellendi - ${guncellemeler.banka || mevcutEvrak.banka}`,
                                tutar: yeniCariDegisimi
                            }
                        }
                    }
                );
            }
        }

        
        const guncellenenEvrak = await CekSenet.findByIdAndUpdate(
            evrakId,
            guncellemeler,
            { new: true }
        ).populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu');

        res.json({
            message: 'Çek/Senet başarıyla güncellendi',
            evrak: guncellenenEvrak
        });

    } catch (error) {
        console.error('Çek/Senet güncellenirken hata:', error);
        res.status(500).json({
            error: 'Çek/Senet güncellenirken hata oluştu',
            message: error.message
        });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const evrakId = req.params.id;

        
        const mevcutEvrak = await CekSenet.findById(evrakId);
        if (!mevcutEvrak) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        
        if (mevcutEvrak.cariIslensin && mevcutEvrak.firmaId) {
            let cariDegisimi = 0;
            let islemAciklamasi = '';

            if (mevcutEvrak.tip === 'alinan') {
                
                cariDegisimi = mevcutEvrak.tutar;
                islemAciklamasi = `Alınan ${mevcutEvrak.evrakTipi} silindi - ${mevcutEvrak.banka} - ${mevcutEvrak.borclu}`;
            } else if (mevcutEvrak.tip === 'verilen') {
                
                cariDegisimi = -mevcutEvrak.tutar;
                islemAciklamasi = `Verilen ${mevcutEvrak.evrakTipi} silindi - ${mevcutEvrak.banka} - ${mevcutEvrak.borclu}`;
            }

            
            await Sirket.findByIdAndUpdate(
                mevcutEvrak.firmaId,
                {
                    $inc: { sirketCarisi: cariDegisimi },
                    $push: {
                        islemler: {
                            islemTarihi: new Date(),
                            islemAciklamasi,
                            tutar: cariDegisimi
                        }
                    }
                }
            );
        }

        
        await CekSenet.findByIdAndDelete(evrakId);

        res.json({
            message: 'Çek/Senet başarıyla silindi' + (mevcutEvrak.cariIslensin && mevcutEvrak.firmaId ? ' ve cari güncellendi' : '')
        });

    } catch (error) {
        console.error('Çek/Senet silinirken hata:', error);
        res.status(500).json({
            error: 'Çek/Senet silinirken hata oluştu',
            message: error.message
        });
    }
});


router.patch('/:id/durum', async (req, res) => {
    try {
        const { id } = req.params;
        const { durum, transferFirmaId, aciklama } = req.body;

        if (!durum || !['Kasa', 'Ciro', 'Aktif', 'Ödendi'].includes(durum)) {
            return res.status(400).json({
                error: 'Geçerli durum belirtiniz: Kasa, Ciro, Aktif, Ödendi'
            });
        }

        const mevcutCek = await CekSenet.findById(id);
        if (!mevcutCek) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        const updateData = { durum };

        if (durum === 'Ciro') {
            if (!transferFirmaId) {
                return res.status(400).json({ error: 'Ciro işlemi için transferFirmaId gereklidir' });
            }

            const transferFirma = await Sirket.findById(transferFirmaId);
            if (!transferFirma) {
                return res.status(404).json({ error: 'Transfer edilecek firma bulunamadı' });
            }

            updateData.ciroFirmaId = transferFirmaId;
        }

        if (aciklama) {
            updateData.aciklama = aciklama;
        }

        const guncellenenCek = await CekSenet.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu');

        res.json({
            message: `Çek/Senet durumu ${durum} olarak güncellendi`,
            evrak: guncellenenCek
        });

    } catch (error) {
        console.error('Çek durumu güncellenirken hata:', error);
        res.status(500).json({
            error: 'Çek durumu güncellenirken hata oluştu',
            message: error.message
        });
    }
});

router.get('/vade/:durum', async (req, res) => {
    try {
        const { durum } = req.params; 
        const bugun = new Date();
        const yediGunSonra = new Date(bugun.getTime() + 7 * 24 * 60 * 60 * 1000);

        let filter = {};

        switch (durum) {
            case 'gecmis':
                filter.vadeTarihi = { $lt: bugun };
                break;
            case 'yakin':
                filter.vadeTarihi = { $gte: bugun, $lte: yediGunSonra };
                break;
            case 'gelecek':
                filter.vadeTarihi = { $gt: yediGunSonra };
                break;
            default:
                return res.status(400).json({ error: 'Geçerli durum: gecmis, yakin, gelecek' });
        }

        const evraklar = await CekSenet.find(filter)
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') 
            .sort({ vadeTarihi: 1 });

        res.json({
            durum,
            adet: evraklar.length,
            evraklar
        });

    } catch (error) {
        console.error('Vade durumu sorgulanırken hata:', error);
        res.status(500).json({
            error: 'Vade durumu sorgulanırken hata oluştu',
            message: error.message
        });
    }
});


router.get('/firma/:firmaId', async (req, res) => {
    try {
        const { firmaId } = req.params;

        
        const firma = await Sirket.findById(firmaId);
        if (!firma) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }

        const evraklar = await CekSenet.find({ firmaId })
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') 
            .sort({ vadeTarihi: 1 });

        res.json({
            firma: {
                _id: firma._id,
                sirketAdi: firma.sirketAdi,
                sirketKodu: firma.sirketKodu
            },
            adet: evraklar.length,
            evraklar
        });

    } catch (error) {
        console.error('Firma bazlı çek/senet getirilirken hata:', error);
        res.status(500).json({
            error: 'Firma bazlı çek/senet getirilirken hata oluştu',
            message: error.message
        });
    }
});


router.get('/sahis/:sahisAdi', async (req, res) => {
    try {
        const { sahisAdi } = req.params;

        const evraklar = await CekSenet.find({
            sahisAdi: { $regex: sahisAdi, $options: 'i' }
        })
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') 
            .sort({ vadeTarihi: 1 });

        res.json({
            sahisAdi,
            adet: evraklar.length,
            evraklar
        });

    } catch (error) {
        console.error('Şahıs bazlı çek/senet getirilirken hata:', error);
        res.status(500).json({
            error: 'Şahıs bazlı çek/senet getirilirken hata oluştu',
            message: error.message
        });
    }
});


router.get('/durum/:durum', async (req, res) => {
    try {
        const { durum } = req.params;

        if (!['Kasa', 'Ciro', 'Aktif', 'Ödendi'].includes(durum)) {
            return res.status(400).json({
                error: 'Geçerli durum belirtiniz: Kasa, Ciro, Aktif, Ödendi'
            });
        }

        const evraklar = await CekSenet.find({ durum })
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') 
            .sort({ vadeTarihi: 1 });

        res.json({
            durum,
            adet: evraklar.length,
            evraklar
        });

    } catch (error) {
        console.error('Durum bazlı çek/senet getirilirken hata:', error);
        res.status(500).json({
            error: 'Durum bazlı çek/senet getirilirken hata oluştu',
            message: error.message
        });
    }
});


router.get('/istatistik/ozet', async (req, res) => {
    try {
        const [
            toplamCek,
            toplamSenet,
            alinanlar,
            verilenler,
            kasadakiler,
            ciroEdilenler,
            aktifler,
            odenenler,
            gecmisVadeler,
            yakinVadeler
        ] = await Promise.all([
            CekSenet.countDocuments({ evrakTipi: 'cek' }),
            CekSenet.countDocuments({ evrakTipi: 'senet' }),
            CekSenet.countDocuments({ tip: 'alinan' }),
            CekSenet.countDocuments({ tip: 'verilen' }),
            CekSenet.countDocuments({ durum: 'Kasa' }),
            CekSenet.countDocuments({ durum: 'Ciro' }),
            CekSenet.countDocuments({ durum: 'Aktif' }),
            CekSenet.countDocuments({ durum: 'Ödendi' }),
            CekSenet.countDocuments({ vadeTarihi: { $lt: new Date() } }),
            CekSenet.countDocuments({
                vadeTarihi: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            })
        ]);

        
        const tutarOzeti = await CekSenet.aggregate([
            {
                $group: {
                    _id: {
                        evrakTipi: '$evrakTipi',
                        tip: '$tip'
                    },
                    toplamTutar: { $sum: '$tutar' },
                    adet: { $sum: 1 }
                }
            }
        ]);

        res.json({
            adetOzeti: {
                toplamCek,
                toplamSenet,
                toplam: toplamCek + toplamSenet,
                alinanlar,
                verilenler,
                durumlar: {
                    kasadakiler,
                    ciroEdilenler,
                    aktifler,
                    odenenler
                },
                vadeDurumlari: {
                    gecmisVadeler,
                    yakinVadeler
                }
            },
            tutarOzeti
        });

    } catch (error) {
        console.error('İstatistik getirilirken hata:', error);
        res.status(500).json({
            error: 'İstatistik getirilirken hata oluştu',
            message: error.message
        });
    }
});


router.patch('/toplu/durum', async (req, res) => {
    try {
        const { evrakIds, durum, transferFirmaId, aciklama } = req.body;

        if (!Array.isArray(evrakIds) || evrakIds.length === 0) {
            return res.status(400).json({ error: 'Evrak ID listesi gereklidir' });
        }

        if (!durum || !['Kasa', 'Ciro', 'Aktif', 'Ödendi'].includes(durum)) {
            return res.status(400).json({
                error: 'Geçerli durum belirtiniz: Kasa, Ciro, Aktif, Ödendi'
            });
        }

        
        if (durum === 'Ciro' && !transferFirmaId) {
            return res.status(400).json({ error: 'Ciro işlemi için transferFirmaId gereklidir' });
        }

        const updateData = { durum };
        if (transferFirmaId) updateData.ciroFirmaId = transferFirmaId; 
        if (aciklama) updateData.aciklama = aciklama;

        const sonuc = await CekSenet.updateMany(
            { _id: { $in: evrakIds } },
            updateData
        );

        res.json({
            message: `${sonuc.modifiedCount} çek/senet durumu ${durum} olarak güncellendi`,
            guncellenenAdet: sonuc.modifiedCount
        });

    } catch (error) {
        console.error('Toplu durum güncellenirken hata:', error);
        res.status(500).json({
            error: 'Toplu durum güncellenirken hata oluştu',
            message: error.message
        });
    }
});


router.delete('/temizlik/tekrarlananlari-sil', async (req, res) => {
    try {
        
        const duplicates = await CekSenet.aggregate([
            {
                $group: {
                    _id: {
                        evrakTipi: "$evrakTipi",
                        tip: "$tip",
                        firmaId: "$firmaId",
                        sahisAdi: "$sahisAdi",
                        borclu: "$borclu",
                        tutar: "$tutar",
                        vadeTarihi: "$vadeTarihi"
                    },
                    sayisi: { $sum: 1 },
                    kayitIdleri: { $push: "$_id" }
                }
            },
            {
                $match: {
                    sayisi: { $gt: 1 }
                }
            }
        ]);

        let silinenKayitSayisi = 0;
        const silinecekIdler = [];

        
        duplicates.forEach(doc => {
            const [ilkKayit, ...digerKayitlar] = doc.kayitIdleri;
            silinecekIdler.push(...digerKayitlar);
            silinenKayitSayisi += digerKayitlar.length;
        });

        if (silinecekIdler.length > 0) {
            
            await CekSenet.deleteMany({ _id: { $in: silinecekIdler } });
        }

        res.json({
            message: `${silinenKayitSayisi} adet tekrarlayan kayıt başarıyla silindi.`,
            silinenIdler: silinecekIdler
        });

    } catch (error) {
        console.error('Tekrarlayan kayıtlar silinirken hata:', error);
        res.status(500).json({
            error: 'Tekrarlayan kayıtlar silinirken hata oluştu',
            message: error.message
        });
    }
});


router.post('/ara', async (req, res) => {
    try {
        const {
            evrakTipi,
            tip,
            firmaId,
            sahisAdi,
            durum,
            baslangicTarihi,
            bitisTarihi,
            minTutar,
            maxTutar,
            banka,
            borclu,
            sayfa = 1,
            limit = 50
        } = req.body;

        let filter = {};

        if (evrakTipi) filter.evrakTipi = evrakTipi;
        if (tip) filter.tip = tip;
        if (firmaId) filter.firmaId = firmaId;
        if (sahisAdi) filter.sahisAdi = { $regex: sahisAdi, $options: 'i' };
        if (durum) filter.durum = durum;
        if (banka) filter.banka = { $regex: banka, $options: 'i' };
        if (borclu) filter.borclu = { $regex: borclu, $options: 'i' };

        
        if (baslangicTarihi || bitisTarihi) {
            filter.vadeTarihi = {};
            if (baslangicTarihi) filter.vadeTarihi.$gte = new Date(baslangicTarihi);
            if (bitisTarihi) filter.vadeTarihi.$lte = new Date(bitisTarihi);
        }

        
        if (minTutar || maxTutar) {
            filter.tutar = {};
            if (minTutar) filter.tutar.$gte = minTutar;
            if (maxTutar) filter.tutar.$lte = maxTutar;
        }

        const skip = (sayfa - 1) * limit;

        const [evraklar, toplam] = await Promise.all([
            CekSenet.find(filter)
                .populate('firmaId', 'sirketAdi sirketKodu')
                .populate('ciroFirmaId', 'sirketAdi sirketKodu') 
                .sort({ vadeTarihi: 1 })
                .skip(skip)
                .limit(limit),
            CekSenet.countDocuments(filter)
        ]);

        res.json({
            evraklar,
            sayfalama: {
                mevcutSayfa: sayfa,
                toplamSayfa: Math.ceil(toplam / limit),
                toplamKayit: toplam,
                sayfaBasiKayit: limit
            }
        });

    } catch (error) {
        console.error('Arama yapılırken hata:', error);
        res.status(500).json({
            error: 'Arama yapılırken hata oluştu',
            message: error.message
        });
    }
});

module.exports = router;