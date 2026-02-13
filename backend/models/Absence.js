const mongoose = require('mongoose');

const AbsenceSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Calisanlar',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    type: {
        type: String,
        default: '',
    },
}, { timestamps: true });

module.exports = mongoose.model('Absence', AbsenceSchema);