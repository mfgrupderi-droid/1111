const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ad alanı zorunludur'],
    trim: true,
    maxlength: [50, 'Ad en fazla 50 karakter olabilir']
  },
  lastName: {
    type: String,
    required: [true, 'Soyad alanı zorunludur'],
    trim: true,
    maxlength: [50, 'Soyad en fazla 50 karakter olabilir']
  },
  phone: {
    type: String,
    required: [true, 'Telefon numarası zorunludur'],
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Geçerli bir telefon numarası girin']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Geçerli bir email adresi girin']
  },
  identityNumber: {
    type: String,
    trim: true,
    match: [/^\d{11}$/, 'TC Kimlik Numarası 11 haneli olmalıdır']
  },
  department: {
    type: String,
    enum: ['Atölye', 'Kesimhane', 'Personel'],
    default: 'Atölye'
  },
  position: {
    type: String,
    trim: true,
    default: 'İşçi'
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  photo: {
    type: String, 
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
employeeSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Calisanlar', employeeSchema);