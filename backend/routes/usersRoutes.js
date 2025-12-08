const express = require('express');
const User = require('../models/User');
const { authMiddleware, permissionMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'cok-gizli-anahtarim';

// Kullanıcı girişi rotası
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Geçersiz kimlik bilgileri.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Geçersiz kimlik bilgileri.' });
        }
        const payload = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                permissions: user.permissions
            },
        };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: payload.user });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu hatası');
    }
});

// Yeni kullanıcı oluşturma rotası (Kayıt ekranından)
router.post('/register', async (req, res) => {
    const { username, password, role = 'kullanici' } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Bu kullanıcı adı zaten mevcut.' });
        }
        user = new User({ username, password, role });
        await user.save();
        res.status(201).json({ msg: 'Kullanıcı başarıyla kaydedildi.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu hatası');
    }
});

// Yeni kullanıcı oluşturma rotası (Yetki kontrolü ile)
router.post('/', authMiddleware, permissionMiddleware('canCreateUser'), async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const newUser = new User({ username, password, role });
        await newUser.save();
        res.status(201).json({ msg: 'Kullanıcı başarıyla oluşturuldu.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu hatası');
    }
});

// Tüm kullanıcıları getir (Sadece yetkili kişiler görebilir)
router.get('/', authMiddleware, permissionMiddleware('canViewUsers'), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu hatası');
    }
});

// Kullanıcı yetkilerini güncelle
router.put('/:id', authMiddleware, permissionMiddleware('canEditUser'), async (req, res) => {
    try {
        const { permissions } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ msg: 'Kullanıcı bulunamadı.' });
        }
        
        user.permissions = permissions;
        await user.save();
        
        res.json({ msg: 'Kullanıcı yetkileri güncellendi.', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu hatası');
    }
});

// Kullanıcı silme
router.delete('/:id', authMiddleware, permissionMiddleware('canDeleteUser'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'Kullanıcı bulunamadı.' });
        }
        
        await user.remove();
        res.json({ msg: 'Kullanıcı başarıyla silindi.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sunucu hatası');
    }
});

module.exports = router;