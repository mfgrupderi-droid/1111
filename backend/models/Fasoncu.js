const mongoose = require('mongoose');

const fasoncuSchema = new mongoose.Schema({
  fasoncuAdi: {
    type: String,
    required: true,
    unique: true
  },
  paraBirimi: {
    type: String,
    enum: ['TL', 'USD', 'EUR'],
    required: true
  },
  telefon: {
    type: String,
    default: ''
  },
  adres: {
    type: String,
    default: ''
  },
  notlar: {
    type: String,
    default: ''
  },
  aktif: {
    type: Boolean,
    default: true
  },
  toplamBorc: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Fasoncu', fasoncuSchema);