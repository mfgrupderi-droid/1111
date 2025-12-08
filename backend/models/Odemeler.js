const mongoose = require("mongoose")

const PaymentSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, // Ad Soyad
  carriedAmount: { type: Number, default: 0 }, // Devreden
  progressPayment: { type: Number, default: 0 }, // Hakediş
  advancePayment: { type: Number, default: 0 }, // Avans
  payableAmount: { type: Number, default: 0 }, // Ödenecek Tutar (otomatik hesaplanır)
  paidAmount: { type: Number, default: 0 }, // Ödenen Tutar
  remainingAmount: { type: Number, default: 0 }, // Kalan (otomatik hesaplanır)
  description: { type: String, default: "" }, // Açıklama
  date: { type: Date, default: Date.now } // İşlem Tarihi
});

// Kayıt etmeden önce ödenecek ve kalan miktarları hesaplayan hook
PaymentSchema.pre('save', function(next) {
  this.payableAmount = (this.carriedAmount + this.progressPayment) - this.advancePayment;
  this.remainingAmount = this.payableAmount - this.paidAmount;
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);