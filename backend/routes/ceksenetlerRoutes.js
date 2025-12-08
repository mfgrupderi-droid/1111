const express = require('express');
const router = express.Router();
const CekSenet = require('../models/Ceksenet');
const Sirket = require('../models/Şirketler');

const cariIslemYap = async (firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama = '') => {
    if (!firmaId) return; // Şahıs işlemi ise cari işlem yapma

    let cariDegisimi = 0;
    let islemAciklamasi = '';

    if (tip === 'alinan') {
        // Alınan çek/senet: Şirketin bize borcu azalır (negatif)
        cariDegisimi = -tutar;
        islemAciklamasi = `Alınan ${evrakTipi}${banka ? ' - ' + banka : ''}${borclu ? ' - ' + borclu : ''}${aciklama ? ' (' + aciklama + ')' : ''}`;
    } else if (tip === 'verilen') {
        // Verilen çek/senet: Bizim şirkete borcumuz artar (pozitif)
        cariDegisimi = tutar;
        islemAciklamasi = `Verilen ${evrakTipi}${banka ? ' - ' + banka : ''}${borclu ? ' - ' + borclu : ''}${aciklama ? ' (' + aciklama + ')' : ''}`;
    }

    // Şirket carisini güncelle ve işlemi kaydet
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

// Ödeme işlemi için cari güncelleme fonksiyonu
const odemeIcinCariGuncelle = async (evrak, odemeTutari, odemeAciklamasi) => {
    if (!evrak.firmaId || !evrak.cariIslensin) return;

    let cariDegisimi = 0;
    let islemAciklamasi = '';

    if (evrak.tip === 'alinan') {
        // Alınan çek/senet ödemesi: Şirketin bize borcu artar (pozitif)
        // Çünkü ödemeyi biz aldık, şirket bize ödeme yaptı
        cariDegisimi = odemeTutari;
        islemAciklamasi = `${evrak.evrakTipi.charAt(0).toUpperCase() + evrak.evrakTipi.slice(1)} ödemesi${evrak.banka ? ' - ' + evrak.banka : ''}${evrak.borclu ? ' - ' + evrak.borclu : ''}${odemeAciklamasi ? ' (' + odemeAciklamasi + ')' : ''}`;
    } else if (evrak.tip === 'verilen') {
        // Verilen çek/senet ödemesi: Bizim şirkete borcumuz azalır (negatif)
        // Çünkü ödemeyi biz yaptık
        cariDegisimi = -odemeTutari;
        islemAciklamasi = `${evrak.evrakTipi.charAt(0).toUpperCase() + evrak.evrakTipi.slice(1)} ödemesi${evrak.banka ? ' - ' + evrak.banka : ''}${evrak.borclu ? ' - ' + evrak.borclu : ''}${odemeAciklamasi ? ' (' + odemeAciklamasi + ')' : ''}`;
    }

    // Şirket carisini güncelle ve işlemi kaydet
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


// Tüm çek/senetleri getir
router.get('/', async (req, res) => {
    try {
        const cekSenetler = await CekSenet.find()
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') // DÜZELTİLDİ
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

// ID'ye göre çek/senet getir
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

// TEKLİ ÇEK/SENET EKLE
router.post('/tekli', async (req, res) => {
    try {
        const {
            evrakTipi, // 'cek' veya 'senet'
            tip, // 'alinan' veya 'verilen'
            firmaId, // Opsiyonel - şirket işlemi için
            sahisAdi, // Opsiyonel - şahıs işlemi için
            transferFirmaId,
            banka,
            borclu,
            tutar,
            paraBirimi,
            vadeTarihi,
            aciklama,
            durum,
            cariIslensin = true // Varsayılan true
        } = req.body;

        // Temel validasyon
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

        // Şirket var mı kontrol et (firmaId verilmişse)
        if (firmaId) {
            const firma = await Sirket.findById(firmaId);
            if (!firma) {
                return res.status(404).json({ error: 'Belirtilen firma bulunamadı' });
            }
        }

        // Durum belirleme
        let durumValue = durum;
        if (tip === 'alinan' && evrakTipi === 'cek' && !durum) {
            durumValue = 'Kasa';
        } else if (tip === 'verilen' || evrakTipi === 'senet') {
            durumValue = 'Aktif';
        }

        // Çek/Senet oluştur
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

        // Çek/Senet kaydet
        await yeniEvrak.save();

        // Cari işlem yap (sadece cariIslensin true ise ve firmaId varsa)
        if (cariIslensin && firmaId) {
            await cariIslemYap(firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama);
        }

        // Populate edilmiş çek/senet bilgisini döndür
        const kaydedilenEvrak = await CekSenet.findById(yeniEvrak._id)
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu'); // DÜZELTİLDİ

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

// ÇOKLU ÇEK/SENET EKLE
router.post('/coklu', async (req, res) => {
    try {
        const evraklar = req.body;

        // Array kontrolü
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

                // Validasyon
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

                // Şirket var mı kontrol et (firmaId verilmişse)
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

                // Durum belirleme
                let durumValue = durum;
                if (tip === 'alinan' && evrakTipi === 'cek' && !durum) {
                    durumValue = 'Kasa';
                } else if (tip === 'verilen' || evrakTipi === 'senet') {
                    durumValue = 'Aktif';
                }

                // Çek/Senet oluştur
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

                // Çek/Senet kaydet
                await yeniEvrak.save();

                // Cari işlem yap (sadece cariIslensin true ise ve firmaId varsa)
                if (cariIslensin && firmaId) {
                    await cariIslemYap(firmaId, tutar, tip, evrakTipi, banka, borclu, aciklama);
                }

                // Populate edilmiş evrak
                const kaydedilenEvrak = await CekSenet.findById(yeniEvrak._id)
                    .populate('firmaId', 'sirketAdi sirketKodu')
                    .populate('ciroFirmaId', 'sirketAdi sirketKodu'); // DÜZELTİLDİ

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

// ANA ÇEK/SENET EKLE ENDPOINT
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
// ÖDEME EKLEME ENDPOINT - YENİ!
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

        // Toplam ödenen tutarı hesapla
        const toplamOdenen = (evrak.odemeler || []).reduce((sum, o) => sum + parseFloat(o.tutar), 0);
        const kalan = parseFloat(evrak.tutar) - toplamOdenen;

        if (parseFloat(tutar) > kalan) {
            return res.status(400).json({ 
                error: 'Ödeme tutarı kalan tutardan fazla olamaz',
                kalan: kalan
            });
        }

        // Yeni ödemeyi ekle
        const yeniOdeme = {
            tarih: new Date(),
            tutar: parseFloat(tutar),
            aciklama: aciklama || ''
        };

        evrak.odemeler = evrak.odemeler || [];
        evrak.odemeler.push(yeniOdeme);
        await evrak.save();

        // Cari işlemi gerçekleştir
        if (evrak.cariIslensin) {
            await odemeIcinCariGuncelle(evrak, parseFloat(tutar), aciklama);
        }

        // Güncel evrakı dön
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

// Çek/Senet güncelle
router.put('/:id', async (req, res) => {
    try {
        const evrakId = req.params.id;
        const guncellemeler = req.body;

        // Mevcut çek/senet bilgisini al
        const mevcutEvrak = await CekSenet.findById(evrakId);
        if (!mevcutEvrak) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        // Cari işlem gerekli mi kontrol et
        const cariEtkiliGuncelleme = (
            (guncellemeler.tutar && guncellemeler.tutar !== mevcutEvrak.tutar) ||
            (guncellemeler.tip && guncellemeler.tip !== mevcutEvrak.tip) ||
            (guncellemeler.cariIslensin !== undefined && guncellemeler.cariIslensin !== mevcutEvrak.cariIslensin)
        );

        // Cari hesabı güncelle
        if (cariEtkiliGuncelleme && mevcutEvrak.firmaId) {
            // Eski işlemi geri al (sadece önceden cari işlenmişse)
            if (mevcutEvrak.cariIslensin) {
                let eskiCariDegisimi = 0;
                if (mevcutEvrak.tip === 'alinan') {
                    eskiCariDegisimi = mevcutEvrak.tutar; // Geri al (pozitif)
                } else {
                    eskiCariDegisimi = -mevcutEvrak.tutar; // Geri al (negatif)
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

            // Yeni işlemi uygula (sadece yeni cariIslensin true ise)
            const yeniCariIslensin = guncellemeler.cariIslensin !== undefined ? guncellemeler.cariIslensin : mevcutEvrak.cariIslensin;
            if (yeniCariIslensin) {
                const yeniTip = guncellemeler.tip || mevcutEvrak.tip;
                const yeniTutar = guncellemeler.tutar || mevcutEvrak.tutar;

                let yeniCariDegisimi = 0;
                if (yeniTip === 'alinan') {
                    yeniCariDegisimi = -yeniTutar; // Alınan: borç azalır
                } else {
                    yeniCariDegisimi = yeniTutar; // Verilen: borç artar
                }

                await Sirket.findByIdAndUpdate(
                    mevcutEvrak.firmaId,
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

        // Çek/Senet güncelle
        const guncellenenEvrak = await CekSenet.findByIdAndUpdate(
            evrakId,
            guncellemeler,
            { new: true }
        ).populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu'); // DÜZELTİLDİ

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

// Çek/Senet sil ve cari hesabı güncelle
router.delete('/:id', async (req, res) => {
    try {
        const evrakId = req.params.id;

        // Mevcut çek/senet bilgisini al
        const mevcutEvrak = await CekSenet.findById(evrakId);
        if (!mevcutEvrak) {
            return res.status(404).json({ error: 'Çek/Senet bulunamadı' });
        }

        // Cari hesabı düzelt (sadece cariIslensin true ise ve firmaId varsa)
        if (mevcutEvrak.cariIslensin && mevcutEvrak.firmaId) {
            let cariDegisimi = 0;
            let islemAciklamasi = '';

            if (mevcutEvrak.tip === 'alinan') {
                // Alınan çek/senet silme: İşlemi geri al (pozitif)
                cariDegisimi = mevcutEvrak.tutar;
                islemAciklamasi = `Alınan ${mevcutEvrak.evrakTipi} silindi - ${mevcutEvrak.banka} - ${mevcutEvrak.borclu}`;
            } else if (mevcutEvrak.tip === 'verilen') {
                // Verilen çek/senet silme: İşlemi geri al (negatif)
                cariDegisimi = -mevcutEvrak.tutar;
                islemAciklamasi = `Verilen ${mevcutEvrak.evrakTipi} silindi - ${mevcutEvrak.banka} - ${mevcutEvrak.borclu}`;
            }

            // Şirket carisini güncelle ve işlemi kaydet
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

        // Çek/Senet sil
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

// Çek durumunu güncelle
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
// Vade durumu sorgulama
router.get('/vade/:durum', async (req, res) => {
    try {
        const { durum } = req.params; // 'gecmis', 'yakin', 'gelecek'
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
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') // DÜZELTİLDİ
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

// Firma bazlı çek/senet listesi
router.get('/firma/:firmaId', async (req, res) => {
    try {
        const { firmaId } = req.params;

        // Firma kontrol
        const firma = await Sirket.findById(firmaId);
        if (!firma) {
            return res.status(404).json({ error: 'Firma bulunamadı' });
        }

        const evraklar = await CekSenet.find({ firmaId })
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') // DÜZELTİLDİ
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

// Şahıs bazlı çek/senet listesi
router.get('/sahis/:sahisAdi', async (req, res) => {
    try {
        const { sahisAdi } = req.params;

        const evraklar = await CekSenet.find({
            sahisAdi: { $regex: sahisAdi, $options: 'i' }
        })
            .populate('firmaId', 'sirketAdi sirketKodu')
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') // DÜZELTİLDİ
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

// Durum bazlı filtreleme
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
            .populate('ciroFirmaId', 'sirketAdi sirketKodu') // DÜZELTİLDİ
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

// İstatistik endpoint'i
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

        // Tutar bazlı özet
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

// Toplu durum güncelleme
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

        // Ciro işlemi ise transferFirmaId gerekli
        if (durum === 'Ciro' && !transferFirmaId) {
            return res.status(400).json({ error: 'Ciro işlemi için transferFirmaId gereklidir' });
        }

        const updateData = { durum };
        if (transferFirmaId) updateData.ciroFirmaId = transferFirmaId; // DÜZELTİLDİ
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

// TEKRARLAYAN KAYITLARI TEMİZLEME ENDPOINT'İ
router.delete('/temizlik/tekrarlananlari-sil', async (req, res) => {
    try {
        // Aynı özelliklere sahip olan kayıtları grupla
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

        // Her bir tekrarlayan grup için, ilk kaydı dışındaki ID'leri topla
        duplicates.forEach(doc => {
            const [ilkKayit, ...digerKayitlar] = doc.kayitIdleri;
            silinecekIdler.push(...digerKayitlar);
            silinenKayitSayisi += digerKayitlar.length;
        });

        if (silinecekIdler.length > 0) {
            // Toplanan tüm ID'lere sahip kayıtları sil
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

// Gelişmiş arama
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

        // Tarih aralığı
        if (baslangicTarihi || bitisTarihi) {
            filter.vadeTarihi = {};
            if (baslangicTarihi) filter.vadeTarihi.$gte = new Date(baslangicTarihi);
            if (bitisTarihi) filter.vadeTarihi.$lte = new Date(bitisTarihi);
        }

        // Tutar aralığı
        if (minTutar || maxTutar) {
            filter.tutar = {};
            if (minTutar) filter.tutar.$gte = minTutar;
            if (maxTutar) filter.tutar.$lte = maxTutar;
        }

        const skip = (sayfa - 1) * limit;

        const [evraklar, toplam] = await Promise.all([
            CekSenet.find(filter)
                .populate('firmaId', 'sirketAdi sirketKodu')
                .populate('ciroFirmaId', 'sirketAdi sirketKodu') // DÜZELTİLDİ
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