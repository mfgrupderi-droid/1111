const mongoose = require('mongoose');
const contractorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  currency: { type: String, enum: ['TL', 'USD', 'EUR'], default: 'TL' },
  openingDebt: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const modelPriceSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractorV2', required: true },
  model: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['TL', 'USD', 'EUR'], default: 'TL' }
});
const productSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractorV2', required: true },
  deliveryDate: { type: Date, required: true },
  model: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  note: { type: String },
  balanceAfter: { type: Number, required: true }
});
const paymentSchema = new mongoose.Schema({
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractorV2', required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  note: { type: String },
  balanceAfter: { type: Number, required: true }
});

module.exports = {
  ContractorV2: mongoose.models.ContractorV2 || mongoose.model('ContractorV2', contractorSchema),
  ModelPriceV2: mongoose.models.ModelPriceV2 || mongoose.model('ModelPriceV2', modelPriceSchema),
  ProductV2: mongoose.models.ProductV2 || mongoose.model('ProductV2', productSchema),
  PaymentV2: mongoose.models.PaymentV2 || mongoose.model('PaymentV2', paymentSchema)
};