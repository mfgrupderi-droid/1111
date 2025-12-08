const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// Veritabanı bağlantı URI'nizi buraya yapıştırın
const MONGODB_URI = 'mongodb+srv://reawenxd:malibaba31@cluster0.zuyrzbr.mongodb.net/'; 

const createFirstUser = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB bağlantısı başarılı.');

        const username = 'depo';
        const password = '1'; // Daha güvenli bir şifre kullanılması tavsiye edilir.
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log(`'${username}' isimli kurucu kullanıcı zaten mevcut.`);
            await mongoose.disconnect();
            return;
        }
        
        const newUser = new User({
            username,
            password: password,
            role: 'kurucu',
            permissions: {
                canViewChecks: true, canViewCheckAmounts: true, canCreateChecks: true, canEditChecks: true, canDeleteChecks: true,
                canViewShipments: true, canViewShipmentAmounts: true, canCreateShipments: true, canEditShipments: true, canDeleteShipments: true,
                canViewSirketler: true, canCreateSirket: true, canEditSirket: true, canDeleteSirket: true,
                canViewUsers: true, canCreateUser: true, canEditUser: true, canDeleteUser: true
            }
        });

        await newUser.save();
        console.log(`'${username}' isimli kurucu kullanıcı başarıyla oluşturuldu.`);

    } catch (err) {
        console.error('Kullanıcı oluşturulurken bir hata oluştu:', err);
    } finally {
        await mongoose.disconnect();
    }
};

createFirstUser();