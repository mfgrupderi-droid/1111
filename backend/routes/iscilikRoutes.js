const express = require('express');
const router = express.Router();
const { ContractorV2, ModelPriceV2, ProductV2, PaymentV2 } = require('../models/Iscilik');


router.get('/contractors', async (req, res) => {
  const data = await ContractorV2.find();
  res.json({ success: true, data });
});

router.post('/contractor', async (req, res) => {
  const { name, currency, openingDebt } = req.body;
  const contractor = new ContractorV2({ name, currency, openingDebt, balance: openingDebt });
  await contractor.save();
  res.json({ success: true, data: contractor });
});

router.delete('/contractor/:id', async (req, res) => {
  await ContractorV2.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});


router.post('/model-price', async (req, res) => {
  const { contractorId, model, price, currency } = req.body;
  const mp = new ModelPriceV2({ contractorId, model, price, currency });
  await mp.save();
  res.json({ success: true, data: mp });
});


router.post('/model-prices', async (req, res) => {
  const { contractorId, model, price, currency } = req.body;
  const mp = new ModelPriceV2({ contractorId, model, price, currency });
  await mp.save();
  res.json({ success: true, data: mp });
});

router.get('/model-prices/:contractorId', async (req, res) => {
  const data = await ModelPriceV2.find({ contractorId: req.params.contractorId });
  res.json({ success: true, data });
});


router.post('/product', async (req, res) => {
  const { contractorId, deliveryDate, model, quantity, note } = req.body;
  
  const mp = await ModelPriceV2.findOne({ contractorId, model });
  const unitPrice = mp ? mp.price : 0;
  const totalPrice = unitPrice * quantity;

  
  const contractor = await ContractorV2.findById(contractorId);
  const balanceAfter = contractor.balance + totalPrice;

  const product = new ProductV2({ contractorId, deliveryDate, model, quantity, unitPrice, totalPrice, note, balanceAfter });
  await product.save();

  
  contractor.balance = balanceAfter;
  await contractor.save();

  res.json({ success: true, data: product });
});

router.get('/products/:contractorId', async (req, res) => {
  const data = await ProductV2.find({ contractorId: req.params.contractorId });
  res.json({ success: true, data });
});


router.post('/payment', async (req, res) => {
  const { contractorId, amount, paymentDate, note } = req.body;
  const contractor = await ContractorV2.findById(contractorId);
  const balanceAfter = contractor.balance - amount;
  const payment = new PaymentV2({ contractorId, amount, paymentDate, note, balanceAfter });
  await payment.save();
  contractor.balance = balanceAfter;
  await contractor.save();
  res.json({ success: true, data: payment });
});

router.get('/payments/:contractorId', async (req, res) => {
  const data = await PaymentV2.find({ contractorId: req.params.contractorId });
  res.json({ success: true, data });
});


router.get('/statement/:contractorId', async (req, res) => {
  const products = await ProductV2.find({ contractorId: req.params.contractorId });
  const payments = await PaymentV2.find({ contractorId: req.params.contractorId });
  
  const movements = [
    ...products.map(u => ({
      type: 'Product',
      id: u._id,
      source: 'Product',
      date: u.deliveryDate,
      description: `${u.model} (${u.quantity} adet)`,
      amount: u.totalPrice,
      balanceAfter: u.balanceAfter
    })),
    ...payments.map(o => ({
      type: 'Payment',
      id: o._id,
      source: 'Payment',
      date: o.paymentDate,
      description: o.note || 'Payment',
      amount: -o.amount,
      balanceAfter: o.balanceAfter
    }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ success: true, data: movements });
});


const recomputeBalances = async (contractorId) => {
  const contractor = await ContractorV2.findById(contractorId);
  if (!contractor) return;
  const products = await ProductV2.find({ contractorId });
  const payments = await PaymentV2.find({ contractorId });
  
  const items = [
    ...products.map(p => ({ id: p._id.toString(), type: 'Product', date: p.deliveryDate, amount: p.totalPrice })),
    ...payments.map(p => ({ id: p._id.toString(), type: 'Payment', date: p.paymentDate, amount: -p.amount }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = contractor.openingDebt || 0;
  for (const it of items) {
    balance = balance + (Number(it.amount) || 0);
    if (it.type === 'Product') {
      await ProductV2.findByIdAndUpdate(it.id, { balanceAfter: balance });
    } else {
      await PaymentV2.findByIdAndUpdate(it.id, { balanceAfter: balance });
    }
  }
  
  contractor.balance = balance;
  await contractor.save();
};


router.delete('/statement/:id', async (req, res) => {
  const id = req.params.id;
  
  let p = await ProductV2.findById(id);
  if (p) {
    const contractorId = p.contractorId;
    await ProductV2.findByIdAndDelete(id);
    await recomputeBalances(contractorId);
    return res.json({ success: true });
  }
  
  let pay = await PaymentV2.findById(id);
  if (pay) {
    const contractorId = pay.contractorId;
    await PaymentV2.findByIdAndDelete(id);
    await recomputeBalances(contractorId);
    return res.json({ success: true });
  }
  res.status(404).json({ success: false, message: 'Statement entry not found' });
});


router.put('/statement/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  
  let p = await ProductV2.findById(id);
  if (p) {
    if (body.model !== undefined) p.model = body.model;
    if (body.quantity !== undefined) p.quantity = body.quantity;
    if (body.amount !== undefined) p.totalPrice = Number(body.amount) || 0;
    if (body.date !== undefined) p.deliveryDate = body.date;
    if (body.note !== undefined) p.note = body.note;
    
    if (p.quantity && p.quantity != 0) p.unitPrice = p.totalPrice / p.quantity;
    await p.save();
    await recomputeBalances(p.contractorId);
    return res.json({ success: true, data: p });
  }
  
  let pay = await PaymentV2.findById(id);
  if (pay) {
    if (body.amount !== undefined) {
      const amt = Number(body.amount) || 0;
      pay.amount = Math.abs(amt);
    }
    if (body.date !== undefined) pay.paymentDate = body.date;
    if (body.note !== undefined) pay.note = body.note;
    await pay.save();
    await recomputeBalances(pay.contractorId);
    return res.json({ success: true, data: pay });
  }
  res.status(404).json({ success: false, message: 'Statement entry not found' });
});

module.exports = router;