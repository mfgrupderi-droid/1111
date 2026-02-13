const mongoose = require("mongoose")

const PaymentSchema = new mongoose.Schema({
  fullName: { type: String, required: true }, 
  carriedAmount: { type: Number, default: 0 }, 
  progressPayment: { type: Number, default: 0 }, 
  advancePayment: { type: Number, default: 0 }, 
  payableAmount: { type: Number, default: 0 }, 
  paidAmount: { type: Number, default: 0 }, 
  remainingAmount: { type: Number, default: 0 }, 
  description: { type: String, default: "" }, 
  date: { type: Date, default: Date.now } 
});
PaymentSchema.pre('save', function(next) {
  this.payableAmount = (this.carriedAmount + this.progressPayment) - this.advancePayment;
  this.remainingAmount = this.payableAmount - this.paidAmount;
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);