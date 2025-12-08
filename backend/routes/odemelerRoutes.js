const express = require('express');
const router = express.Router();
const Payment = require('../models/Odemeler');

// Tüm ödemeleri getirir (en yeniden en eskiye sıralar)
router.get('/', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ date: -1 });
        res.status(200).json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Haftalık gruplandırılmış ödemeleri getirir
router.get('/weekly', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ date: -1 });
        
        // Haftalık gruplandırma
        const weeklyPayments = {};
        
        payments.forEach(payment => {
            const paymentDate = new Date(payment.date);
            
            // Haftanın başlangıcını hesapla (Pazartesi) - tarihi değiştirmeden
            const dayOfWeek = paymentDate.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Pazar ise -6, diğerleri için 1-dayOfWeek
            
            const weekStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate() + diff);
            weekStart.setHours(0, 0, 0, 0);
            
            // Hafta sonu
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            // Hafta anahtarı oluştur
            const weekKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
            
            if (!weeklyPayments[weekKey]) {
                weeklyPayments[weekKey] = {
                    weekKey,
                    weekStart: weekStart.toISOString(),
                    weekEnd: weekEnd.toISOString(),
                    weekLabel: formatWeekLabel(weekStart, weekEnd),
                    payments: [],
                    totalCarried: 0,
                    totalProgress: 0,
                    totalAdvance: 0,
                    totalPayable: 0,
                    totalPaid: 0,
                    totalRemaining: 0
                };
            }
            
            weeklyPayments[weekKey].payments.push(payment);
            
            // Haftalık toplamları hesapla
            weeklyPayments[weekKey].totalCarried += payment.carriedAmount || 0;
            weeklyPayments[weekKey].totalProgress += payment.progressPayment || 0;
            weeklyPayments[weekKey].totalAdvance += payment.advancePayment || 0;
            weeklyPayments[weekKey].totalPayable += payment.payableAmount || 0;
            weeklyPayments[weekKey].totalPaid += payment.paidAmount || 0;
            weeklyPayments[weekKey].totalRemaining += payment.remainingAmount || 0;
        });
        
        // Diziye çevir ve tarihe göre sırala
        const weeklyArray = Object.values(weeklyPayments).sort((a, b) => 
            new Date(b.weekStart) - new Date(a.weekStart)
        );
        
        res.status(200).json(weeklyArray);
    } catch (err) {
        console.error('Haftalık veri hatası:', err);
        res.status(500).json({ message: err.message });
    }
});

// Belirli bir haftanın ödemelerini getirir
router.get('/week/:weekKey', async (req, res) => {
    try {
        const { weekKey } = req.params;
        
        // Hafta anahtarından yıl ve hafta numarasını çıkar
        const [year, weekPart] = weekKey.split('-W');
        const weekNumber = parseInt(weekPart);
        
        // Hafta başlangıç ve bitiş tarihlerini hesapla
        const weekStart = getDateFromWeek(parseInt(year), weekNumber);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        // Bu hafta aralığındaki ödemeleri getir
        const payments = await Payment.find({
            date: {
                $gte: weekStart,
                $lte: weekEnd
            }
        }).sort({ date: -1 });
        
        res.status(200).json({
            weekKey,
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            weekLabel: formatWeekLabel(weekStart, weekEnd),
            payments
        });
    } catch (err) {
        console.error('Hafta verisi hatası:', err);
        res.status(500).json({ message: err.message });
    }
});

// Yeni ödeme ekler (POST)
router.post('/', async (req, res) => {
    const payment = new Payment(req.body);
    try {
        const savedPayment = await payment.save();
        res.status(201).json(savedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Belirli bir ödemeyi günceller (PUT)
router.put('/:id', async (req, res) => {
    try {
        const paymentToUpdate = await Payment.findById(req.params.id);
        
        if (!paymentToUpdate) {
            return res.status(404).json({ message: "Ödeme bulunamadı." });
        }

        // Bulunan ödemenin alanlarını günceller
        paymentToUpdate.fullName = req.body.fullName;
        paymentToUpdate.carriedAmount = req.body.carriedAmount;
        paymentToUpdate.progressPayment = req.body.progressPayment;
        paymentToUpdate.advancePayment = req.body.advancePayment;
        paymentToUpdate.paidAmount = req.body.paidAmount;
        paymentToUpdate.description = req.body.description;
        paymentToUpdate.date = req.body.date;

        // Hesaplamaları yapar
        paymentToUpdate.payableAmount = (paymentToUpdate.carriedAmount + paymentToUpdate.progressPayment) - paymentToUpdate.advancePayment;
        paymentToUpdate.remainingAmount = paymentToUpdate.payableAmount - paymentToUpdate.paidAmount;

        // Güncellenmiş ödemeyi kaydeder
        const updatedPayment = await paymentToUpdate.save();

        res.json(updatedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Belirli bir ödemeyi siler (DELETE)
router.delete('/:id', async (req, res) => {
    try {
        const deletedPayment = await Payment.findByIdAndDelete(req.params.id);
        if (!deletedPayment) {
            return res.status(404).json({ message: "Ödeme bulunamadı." });
        }
        res.json({ message: 'Ödeme başarıyla silindi' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Yardımcı fonksiyonlar
function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function getDateFromWeek(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function formatWeekLabel(weekStart, weekEnd) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const startStr = weekStart.toLocaleDateString('tr-TR', options);
    const endStr = weekEnd.toLocaleDateString('tr-TR', options);
    return `${startStr} - ${endStr}`;
}

module.exports = router;