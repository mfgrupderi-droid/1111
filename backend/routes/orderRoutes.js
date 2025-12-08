const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const mongoose = require("mongoose")
const Sirket = require('../models/Şirketler'); // Dikkat: Dosya adı "Şirketler.js"
const ModelFiyati = require('../models/modelFiyati');
// Tüm siparişleri listele (firmaAdi ile birlikte)
router.get('/', async (req, res) => {
    try {
        const orders = await Order.find()
            .select('siparisId firmaAdi toplamAdet siparisTarihi toplamTutar')
            .sort({ siparisTarihi: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Tek sipariş detayı (görüntüleme için)
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('firmaId', 'sirketCariBirimi');
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        // Şirketin para birimini ekle
        const currency = order.firmaId?.sirketCariBirimi || 'TRY';

        res.json({ ...order.toObject(), currency });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Yeni sipariş oluştur
// Yeni sipariş oluştur
router.post('/', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { firmaId, items } = req.body;

        // Firma bilgilerini al
        const sirket = await Sirket.findById(firmaId);
        if (!sirket) return res.status(404).json({ message: 'Şirket bulunamadı' });

        // YENİ: Her item için ModelFiyati kaydı oluştur/güncelle
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

        // Siparişi kaydet
        const newOrder = new Order({
            firmaId,
            firmaAdi: sirket.sirketAdi,
            items
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

// Sipariş sil
router.delete('/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });
        res.json({ message: 'Sipariş silindi' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Sipariş güncelle
// Sipariş güncelle
router.patch('/:id', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, toplamAdet, toplamTutar } = req.body; // ✅ toplamAdet ve toplamTutar'ı da al

        // Önce siparişi bul, firmayı öğren
        const existingOrder = await Order.findById(req.params.id);
        if (!existingOrder) return res.status(404).json({ message: 'Sipariş bulunamadı' });

        // Firma bilgilerini al
        const sirket = await Sirket.findById(existingOrder.firmaId);
        if (!sirket) return res.status(404).json({ message: 'Şirket bulunamadı' });

        // YENİ: Her item için ModelFiyati kaydı oluştur/güncelle
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

        // Siparişi güncelle
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { 
                items,
                toplamAdet,      // ✅ Toplam adeti güncelle
                toplamTutar      // ✅ Toplam tutarı güncelle
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