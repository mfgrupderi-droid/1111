const express = require('express');
const router = express.Router();
const Absence = require('../models/Absence');



router.get('/:employeeId', async (req, res) => {
    try {
        const absences = await Absence.find({ employee: req.params.employeeId });
        res.json(absences);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.post('/', async (req, res) => {
    const { employeeId, date, type } = req.body;

    if (!employeeId || !date) {
        return res.status(400).json({ message: 'Çalışan ID ve tarih zorunludur.' });
    }

    try {
        const newAbsence = new Absence({
            employee: employeeId,
            date: new Date(date),
            type: type || ''
        });

        const savedAbsence = await newAbsence.save();
        res.status(201).json(savedAbsence);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/', async (req, res) => {
    const { employeeId, date } = req.body;

    if (!employeeId || !date) {
        return res.status(400).json({ message: 'Çalışan ID ve tarih zorunludur.' });
    }

    try {
        
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const result = await Absence.findOneAndDelete({
            employee: employeeId,
            date: {
                $gte: startOfDay,
                $lte: endOfDay,
            },
        });

        if (!result) {
            return res.status(404).json({ message: 'Silinecek kayıt bulunamadı.' });
        }

        res.status(200).json({ message: 'Devamsızlık kaydı başarıyla silindi.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;