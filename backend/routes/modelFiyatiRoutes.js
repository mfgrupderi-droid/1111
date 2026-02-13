const express = require('express');
const router = express.Router();
const ModelFiyati = require('../models/modelFiyati');


router.get('/', async (req, res) => {
    try {
        const { firmaId, model } = req.query;
        if (!firmaId || !model) {
            return res.status(400).json({ message: 'firmaId ve model zorunlu' });
        }

        const kayit = await ModelFiyati.findOne({ firmaId, model });
        res.json(kayit || null);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.post('/', async (req, res) => {
    try {
        const { firmaId, model, birimFiyat, paraBirimi } = req.body;

        const kayit = await ModelFiyati.findOneAndUpdate(
            { firmaId, model },
            { birimFiyat, paraBirimi },
            { upsert: true, new: true, runValidators: true }
        );

        res.status(201).json(kayit);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;