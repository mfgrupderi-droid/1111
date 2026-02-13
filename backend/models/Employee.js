const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    ad: {
        type: String,
        required: [true, 'Ad alanı zorunludur.'],
        trim: true
    },
    soyad: {
        type: String,
        required: [true, 'Soyad alanı zorunludur.'],
        trim: true
    },
    tc: {
        type: String,
        required: [true, 'TC kimlik numarası zorunludur.'],
        unique: true,
        minlength: 11,
        maxlength: 11
    },
    telefonNumarasi: {
        type: String,
        required: [true, 'Telefon numarası zorunludur.'],
        trim: true
    },
    fotograf: {
        type: String,
        default: null 
    }
}, {
    timestamps: true 
});

const Employee = mongoose.model('Employee', EmployeeSchema);

module.exports = Employee;