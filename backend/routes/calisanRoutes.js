const express = require('express');
const router = express.Router();
const Employee = require('../models/Calisanlar');

// Tüm çalışanları getir
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çalışanlar getirilemedi',
      error: error.message
    });
  }
});

// Tek çalışan getir
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Çalışan bulunamadı'
      });
    }
    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çalışan getirilemedi',
      error: error.message
    });
  }
});

// Yeni çalışan ekle
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, photo } = req.body;
    
    const employee = new Employee({
      firstName,
      lastName,
      phone,
      email,
      photo
    });

    const savedEmployee = await employee.save();
    res.status(201).json({
      success: true,
      data: savedEmployee,
      message: 'Çalışan başarıyla eklendi'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validasyon hatası',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Çalışan eklenemedi',
      error: error.message
    });
  }
});

// Çalışan güncelle
router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, photo } = req.body;
    
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, phone, email, photo, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Çalışan bulunamadı'
      });
    }

    res.json({
      success: true,
      data: employee,
      message: 'Çalışan başarıyla güncellendi'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validasyon hatası',
        errors
      });
    }
    res.status(500).json({
      success: false,
      message: 'Çalışan güncellenemedi',
      error: error.message
    });
  }
});

// Çalışan sil
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Çalışan bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Çalışan başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çalışan silinemedi',
      error: error.message
    });
  }
});

module.exports = router;