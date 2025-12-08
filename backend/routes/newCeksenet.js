const express = require('express');
const router = express.Router();
const CekSenet = require('../models/Ceksenet');
const Sirket = require('../models/Şirketler');

// Hata yönetim fonksiyonu
const handleServerError = (res, err, defaultMsg) => {
    console.error(defaultMsg, err);
    res.status(500).json({ msg: defaultMsg, error: err.message });
};

// GET: Tüm çek/senetleri veya firmaId'ye göre filtreleyerek listele
router.get('/', async (req, res) => {
    try {
        const { firmaId } = req.query;
        let query = {};

        if (firmaId) {
            query.firmaId = firmaId;
        }

        const cekSenetler = await CekSenet.find(query);
        res.json(cekSenetler);
    } catch (err) {
        handleServerError(res, err, 'Çek/senetler listelenirken bir hata oluştu.');
    }
});

// POST: Yeni çek/senet ekle
router.post('/', async (req, res) => {
    try {
        // Eksik firmaId kontrolü
        if (!req.body.firmaId) {
            return res.status(400).json({ msg: 'firmaId alanı zorunludur ve boş olamaz.' });
        }
        
        const yeniCekSenet = new CekSenet(req.body);
        await yeniCekSenet.save();

        const sirket = await Sirket.findById(yeniCekSenet.firmaId);
        if (!sirket) {
            return res.status(404).json({ msg: 'İlgili şirket bulunamadı.' });
        }

        let tutar = yeniCekSenet.tutar;
        let islemAciklamasi = '';
        let cariEtki = 0;

        if (yeniCekSenet.tip === 'alinan') {
            islemAciklamasi = `Alinan Cek/Senet - Borclu: ${yeniCekSenet.borclu || ''} - Vade: ${new Date(yeniCekSenet.vadeTarihi).toLocaleDateString()}`;
            // Alınan çekler sadece tahsil edildiğinde veya ödendiğinde cariye etki eder
            if (yeniCekSenet.durum === 'Tahsil Edildi' || yeniCekSenet.durum === 'Ödendi') {
                cariEtki = tutar;
            }
        } else { // verilen
            islemAciklamasi = `Verilen Cek/Senet - Banka: ${yeniCekSenet.banka || ''} - Vade: ${new Date(yeniCekSenet.vadeTarihi).toLocaleDateString()}`;
            // Verilen çekler cariye etkisi hemen başlar
            cariEtki = -tutar;
        }

        sirket.sirketCarisi += cariEtki;
        sirket.islemler.push({
            islemAciklamasi,
            tutar: cariEtki,
            tarih: new Date(),
            cekSenetId: yeniCekSenet._id
        });
        
        await sirket.save();

        res.status(201).json({ msg: 'Çek/senet ve şirket carisi başarıyla güncellendi.', cekSenet: yeniCekSenet });
    } catch (err) {
        handleServerError(res, err, 'Çek/senet eklenirken bir hata oluştu.');
    }
});

// PUT: Çek/seneti güncelle
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const cekSenet = await CekSenet.findById(id);

        if (!cekSenet) {
            return res.status(404).json({ msg: 'Çek/senet bulunamadı.' });
        }
        
        const eskiCekSenet = { ...cekSenet._doc };

        const sirket = await Sirket.findById(cekSenet.firmaId);
        if (!sirket) {
            return res.status(404).json({ msg: 'İlgili şirket bulunamadı.' });
        }

        // Eski durumun cariye etkisini geri al
        let eskiCariEtki = 0;
        if (eskiCekSenet.tip === 'alinan' && (eskiCekSenet.durum === 'Tahsil Edildi' || eskiCekSenet.durum === 'Ödendi')) {
            eskiCariEtki = eskiCekSenet.tutar;
        } else if (eskiCekSenet.tip === 'verilen') {
            eskiCariEtki = -eskiCekSenet.tutar;
        }
        sirket.sirketCarisi -= eskiCariEtki;

        // Güncellemeyi uygula
        Object.assign(cekSenet, updates);
        await cekSenet.save();

        // Yeni durumun cariye etkisini ekle
        let yeniCariEtki = 0;
        if (cekSenet.tip === 'alinan' && (cekSenet.durum === 'Tahsil Edildi' || cekSenet.durum === 'Ödendi')) {
            yeniCariEtki = cekSenet.tutar;
        } else if (cekSenet.tip === 'verilen') {
            yeniCariEtki = -cekSenet.tutar;
        }
        sirket.sirketCarisi += yeniCariEtki;

        // İşlem kaydını cekSenetId ile güvenli bir şekilde güncelle
        sirket.islemler = sirket.islemler.filter(i => 
            String(i.cekSenetId) !== String(id)
        );
        
        let yeniAciklama;
        if (cekSenet.tip === 'alinan') {
            yeniAciklama = `Alinan Cek/Senet - Borclu: ${cekSenet.borclu || ''} - Vade: ${new Date(cekSenet.vadeTarihi).toLocaleDateString()}`;
        } else {
            yeniAciklama = `Verilen Cek/Senet - Banka: ${cekSenet.banka || ''} - Vade: ${new Date(cekSenet.vadeTarihi).toLocaleDateString()}`;
        }

        sirket.islemler.push({
            islemAciklamasi: yeniAciklama,
            tutar: yeniCariEtki,
            tarih: new Date(),
            cekSenetId: cekSenet._id
        });
        
        await sirket.save();

        res.json({ msg: 'Çek/senet ve şirket carisi başarıyla güncellendi.', cekSenet: cekSenet });
    } catch (err) {
        handleServerError(res, err, 'Çek/senet güncellenirken bir hata oluştu.');
    }
});

// DELETE: Çek/seneti sil
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cekSenet = await CekSenet.findByIdAndDelete(id);

        if (!cekSenet) {
            return res.status(404).json({ msg: 'Çek/senet bulunamadı.' });
        }

        const sirket = await Sirket.findById(cekSenet.firmaId);
        if (sirket) {
            let cariEtki = 0;
            if (cekSenet.tip === 'alinan' && (cekSenet.durum === 'Tahsil Edildi' || cekSenet.durum === 'Ödendi')) {
                cariEtki = cekSenet.tutar;
            } else if (cekSenet.tip === 'verilen') {
                cariEtki = -cekSenet.tutar;
            }
            sirket.sirketCarisi -= cariEtki;

            // İşlem kaydını cekSenetId ile güvenli bir şekilde sil
            sirket.islemler = sirket.islemler.filter(i => 
                String(i.cekSenetId) !== String(id)
            );

            await sirket.save();
        }

        res.json({ msg: 'Çek/senet başarıyla silindi ve şirket carisi güncellendi.' });
    } catch (err) {
        handleServerError(res, err, 'Çek/senet silinirken bir hata oluştu.');
    }
});

module.exports = router;