

const express = require('express');
const Employee = require('../models/Employee');
const router = express.Router();



router.post('/', async (req, res) => {
    try {
        const { ad, soyad, tc, telefonNumarasi, fotograf } = req.body;
        const newEmployee = new Employee({ ad, soyad, tc, telefonNumarasi, fotograf });
        await newEmployee.save();
        res.status(201).json({ msg: 'Çalışan başarıyla eklendi.', employee: newEmployee });
    } catch (err) {
        
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Bu TC kimlik numarasına ait bir çalışan zaten mevcut.' });
        }
        res.status(500).json({ msg: 'Çalışan eklenirken bir hata oluştu.', error: err.message });
    }
});



router.get('/', async (req, res) => {
    try {
        const employees = await Employee.find({});
        res.status(200).json(employees);
    } catch (err) {
        res.status(500).json({ msg: 'Çalışanlar listelenirken bir hata oluştu.', error: err.message });
    }
});



router.put('/:id', async (req, res) => {
    try {
        const employeeId = req.params.id;
        const updatedEmployee = await Employee.findByIdAndUpdate(employeeId, req.body, { new: true, runValidators: true });
        if (!updatedEmployee) {
            return res.status(404).json({ msg: 'Çalışan bulunamadı.' });
        }
        res.status(200).json({ msg: 'Çalışan başarıyla güncellendi.', employee: updatedEmployee });
    } catch (err) {
        res.status(500).json({ msg: 'Çalışan güncellenirken bir hata oluştu.', error: err.message });
    }
});



router.delete('/:id', async (req, res) => {
    try {
        const employeeId = req.params.id;
        const deletedEmployee = await Employee.findByIdAndDelete(employeeId);
        if (!deletedEmployee) {
            return res.status(404).json({ msg: 'Çalışan bulunamadı.' });
        }
        res.status(200).json({ msg: 'Çalışan başarıyla silindi.' });
    } catch (err) {
        res.status(500).json({ msg: 'Çalışan silinirken bir hata oluştu.', error: err.message });
    }
});

module.exports = router;
