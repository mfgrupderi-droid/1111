const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const mongoose = require("mongoose")
const Sirket = require('../models/Şirketler'); 
const ModelFiyati = require('../models/modelFiyati');

router.get('/', async (req, res) => {
    try {
        const { year = 2026 } = req.query;
        let filter = {};

        if (year == 2025) {
            // 2025 için tarih aralığı filtresi (year field'ı 2025'te eklenmediği için)
            filter.siparisTarihi = {
                $gte: new Date('2025-01-01'),
                $lt: new Date('2026-01-01')
            };
        } else {
            // 2026 ve sonrası için year field'ı kullan
            filter.year = parseInt(year);
        }

        const orders = await Order.find(filter)
            .select('siparisId firmaAdi toplamAdet siparisTarihi toplamTutar')
            .sort({ siparisTarihi: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('firmaId', 'sirketCariBirimi');
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        
        const currency = order.firmaId?.sirketCariBirimi || 'TRY';

        res.json({ ...order.toObject(), currency });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.post('/', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { firmaId, items } = req.body;

        
        const sirket = await Sirket.findById(firmaId);
        if (!sirket) return res.status(404).json({ message: 'Şirket bulunamadı' });

        
        for (let item of items) {
            await ModelFiyati.findOneAndUpdate(
                { firmaId, model: item.model },
                {
                    birimFiyat: item.birimFiyat,
                    paraBirimi: sirket.sirketCariBirimi
                },
                { upsert: true, session }
            );
        }

        
        const newOrder = new Order({
            firmaId,
            firmaAdi: sirket.sirketAdi,
            items,
            year: 2026
        });

        const savedOrder = await newOrder.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(savedOrder);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: err.message });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });
        res.json({ message: 'Sipariş silindi' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



router.patch('/:id', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, toplamAdet, toplamTutar } = req.body; 

        
        const existingOrder = await Order.findById(req.params.id);
        if (!existingOrder) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        
        const sirket = await Sirket.findById(existingOrder.firmaId);
        if (!sirket) return res.status(404).json({ message: 'Şirket bulunamadı' });

        
        for (let item of items) {
            await ModelFiyati.findOneAndUpdate(
                { firmaId: existingOrder.firmaId, model: item.model },
                {
                    birimFiyat: item.birimFiyat,
                    paraBirimi: sirket.sirketCariBirimi
                },
                { upsert: true, session }
            );
        }

        
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { 
                items,
                toplamAdet,      
                toplamTutar      
            },
            { new: true, runValidators: true, session }
        );

        if (!updatedOrder) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        await session.commitTransaction();
        session.endSession();

        res.json(updatedOrder);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;