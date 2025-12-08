const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['kurucu', 'yönetici', 'kullanici'],
        default: 'kullanici'
    },
    permissions: {
        canViewUsers: { type: Boolean, default: false },
        canCreateUser: { type: Boolean, default: false },
        canEditUser: { type: Boolean, default: false },
        canDeleteUser: { type: Boolean, default: false },
        
        canViewChecks: { type: Boolean, default: false },
        canViewCheckAmounts: { type: Boolean, default: false },
        canCreateChecks: { type: Boolean, default: false },
        canEditChecks: { type: Boolean, default: false },
        canDeleteChecks: { type: Boolean, default: false },
        
        canViewShipments: { type: Boolean, default: false },
        canViewShipmentAmounts: { type: Boolean, default: false },
        canCreateShipments: { type: Boolean, default: false },
        canEditShipments: { type: Boolean, default: false },
        canDeleteShipments: { type: Boolean, default: false },
        
        canViewSirketler: { type: Boolean, default: false },
        canCreateSirket: { type: Boolean, default: false },
        canEditSirket: { type: Boolean, default: false },
        canDeleteSirket: { type: Boolean, default: false },
    }
});

UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    
    // Yalnızca yeni kullanıcı oluşturuluyorsa veya rol değiştiriliyorsa yetkileri ata
    if (this.isModified('role') || this.isNew) {
        if (this.role === 'kurucu') {
            this.permissions = {
                canViewChecks: true, canViewCheckAmounts: true, canCreateChecks: true, canEditChecks: true, canDeleteChecks: true,
                canViewShipments: true, canViewShipmentAmounts: true, canCreateShipments: true, canEditShipments: true, canDeleteShipments: true,
                canViewSirketler: true, canCreateSirket: true, canEditSirket: true, canDeleteSirket: true,
                canViewUsers: true, canCreateUser: true, canEditUser: true, canDeleteUser: true
            };
        } else if (this.role === 'yönetici') {
            this.permissions = {
                canViewChecks: true, canViewCheckAmounts: true, canCreateChecks: true, canEditChecks: true, canDeleteChecks: false,
                canViewShipments: true, canViewShipmentAmounts: true, canCreateShipments: true, canEditShipments: true, canDeleteShipments: false,
                canViewSirketler: true, canCreateSirket: true, canEditSirket: true, canDeleteSirket: false,
                canViewUsers: true, canCreateUser: true, canEditUser: true, canDeleteUser: false
            };
        } else if (this.role === 'kullanici') {
            this.permissions = {
                canViewChecks: true, canViewCheckAmounts: false, canCreateChecks: false, canEditChecks: false, canDeleteChecks: false,
                canViewShipments: true, canViewShipmentAmounts: false, canCreateShipments: false, canEditShipments: false, canDeleteShipments: false,
                canViewSirketler: true, canCreateSirket: false, canEditSirket: false, canDeleteSirket: false,
                canViewUsers: false, canCreateUser: false, canEditUser: false, canDeleteUser: false
            };
        }
    }
    
    next();
});

UserSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);