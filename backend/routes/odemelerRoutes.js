const express = require('express');
const router = express.Router();
const Payment = require('../models/Odemeler');


router.get('/', async (req, res) => {
    try {
        const { year = 2026 } = req.query;
        const y = parseInt(year);
        const filter = {};

        // Use explicit date-range filtering because the Payment schema
        // doesn't include a `year` field. 2025 remains the special archive
        // range, but for any other year we filter by that year's date range.
        const start = new Date(`${y}-01-01T00:00:00.000Z`);
        const end = new Date(`${y + 1}-01-01T00:00:00.000Z`);
        filter.date = { $gte: start, $lt: end };

        const payments = await Payment.find(filter).sort({ date: -1 });
        res.status(200).json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/weekly', async (req, res) => {
    try {
        const { year = 2026 } = req.query;
        const y = parseInt(year);
        const start = new Date(`${y}-01-01T00:00:00.000Z`);
        const end = new Date(`${y + 1}-01-01T00:00:00.000Z`);

        const payments = await Payment.find({ date: { $gte: start, $lt: end } }).sort({ date: -1 });
        
        
        const weeklyPayments = {};
        
        payments.forEach(payment => {
            const paymentDate = new Date(payment.date);
            
            
            const dayOfWeek = paymentDate.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; 
            
            const weekStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate() + diff);
            weekStart.setHours(0, 0, 0, 0);
            
            
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            
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
            
            
            weeklyPayments[weekKey].totalCarried += payment.carriedAmount || 0;
            weeklyPayments[weekKey].totalProgress += payment.progressPayment || 0;
            weeklyPayments[weekKey].totalAdvance += payment.advancePayment || 0;
            weeklyPayments[weekKey].totalPayable += payment.payableAmount || 0;
            weeklyPayments[weekKey].totalPaid += payment.paidAmount || 0;
            weeklyPayments[weekKey].totalRemaining += payment.remainingAmount || 0;
        });
        
        
        const weeklyArray = Object.values(weeklyPayments).sort((a, b) => 
            new Date(b.weekStart) - new Date(a.weekStart)
        );
        
        res.status(200).json(weeklyArray);
    } catch (err) {
        console.error('Haftalık veri hatası:', err);
        res.status(500).json({ message: err.message });
    }
});


router.get('/week/:weekKey', async (req, res) => {
    try {
        const { weekKey } = req.params;
        
        
        const [year, weekPart] = weekKey.split('-W');
        const weekNumber = parseInt(weekPart);
        
        
        const weekStart = getDateFromWeek(parseInt(year), weekNumber);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        
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


router.post('/', async (req, res) => {
    const payment = new Payment(req.body);
    try {
        const savedPayment = await payment.save();
        res.status(201).json(savedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const paymentToUpdate = await Payment.findById(req.params.id);
        
        if (!paymentToUpdate) {
            return res.status(404).json({ message: "Ödeme bulunamadı." });
        }

        
        paymentToUpdate.fullName = req.body.fullName;
        paymentToUpdate.carriedAmount = req.body.carriedAmount;
        paymentToUpdate.progressPayment = req.body.progressPayment;
        paymentToUpdate.advancePayment = req.body.advancePayment;
        paymentToUpdate.paidAmount = req.body.paidAmount;
        paymentToUpdate.description = req.body.description;
        paymentToUpdate.date = req.body.date;

        
        paymentToUpdate.payableAmount = (paymentToUpdate.carriedAmount + paymentToUpdate.progressPayment) - paymentToUpdate.advancePayment;
        paymentToUpdate.remainingAmount = paymentToUpdate.payableAmount - paymentToUpdate.paidAmount;

        
        const updatedPayment = await paymentToUpdate.save();

        res.json(updatedPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


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