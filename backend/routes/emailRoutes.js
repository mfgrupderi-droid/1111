const express = require('express');
const router = express.Router();
const { sendSevkiyatNotification } = require('./emailService');
const Sevkiyat = require('../models/Sevkiyat');
const Sirket = require('../models/Şirketler');

// Sevkiyat email bildirimi gönderme
router.post('/send-sevkiyat-notification', async (req, res) => {
    try {
        const { sevkiyatId } = req.body;

        if (!sevkiyatId) {
            return res.status(400).json({
                success: false,
                message: 'Sevkiyat ID gereklidir'
            });
        }

        // Sevkiyat bilgilerini çek
        const sevkiyat = await Sevkiyat.findById(sevkiyatId);
        if (!sevkiyat) {
            return res.status(404).json({
                success: false,
                message: 'Sevkiyat bulunamadı'
            });
        }

        // Şirket bilgilerini çek
        const sirket = await Sirket.findById(sevkiyat.sirketId);
        if (!sirket) {
            return res.status(404).json({
                success: false,
                message: 'Şirket bulunamadı'
            });
        }

        // Email adreslerini kontrol et
        if (!sirket.emailler || sirket.emailler.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Şirkete ait email adresi bulunamadı'
            });
        }

        const validEmails = sirket.emailler.filter(
            emailObj => emailObj.email && emailObj.email.trim()
        );

        if (validEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli email adresi bulunamadı'
            });
        }

        // Email gönder
        const result = await sendSevkiyatNotification(sevkiyat, sirket);
        
        res.json({
            success: true,
            message: 'Email bildirimi başarıyla gönderildi',
            data: {
                messageId: result.messageId,
                sentTo: result.sentTo,
                attachments: result.attachments,
                sevkiyatNo: sevkiyat.sevkiyatNo,
                sirketAdi: sirket.sirketAdi
            }
        });

    } catch (error) {
        console.error('Email gönderme hatası:', error);
        
        // Hata tipine göre farklı mesajlar
        let errorMessage = 'Email gönderilirken bir hata oluştu';
        
        if (error.code === 'EAUTH') {
            errorMessage = 'Email kimlik doğrulama hatası. SMTP ayarlarını kontrol edin.';
        } else if (error.code === 'ECONNECTION') {
            errorMessage = 'Email sunucusuna bağlanılamadı. İnternet bağlantınızı kontrol edin.';
        } else if (error.responseCode === 550) {
            errorMessage = 'Geçersiz email adresi. Alıcı email adreslerini kontrol edin.';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Test email gönderme (geliştirme amaçlı)
router.post('/test-email', async (req, res) => {
    try {
        const { to, subject = 'Test Email' } = req.body;

        if (!to) {
            return res.status(400).json({
                success: false,
                message: 'Email adresi gereklidir'
            });
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const testHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">🧪 Test Email</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Email servisiniz düzgün çalışıyor!</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                    <h3 style="color: #1e293b;">✅ Başarılı Test</h3>
                    <p style="color: #64748b;">Bu test emaili, sevkiyat yönetim sisteminizin email servisinin düzgün çalıştığını göstermektedir.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #475569;">
                            <strong>Test Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}<br>
                            <strong>Gönderen:</strong> ${process.env.SMTP_USER}
                        </p>
                    </div>
                    <p style="color: #059669; font-weight: 600;">Artık sevkiyat bildirimlerini gönderebilirsiniz! 🎉</p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: {
                name: 'Sevkiyat Yönetim Sistemi',
                address: process.env.SMTP_USER
            },
            to: to,
            subject: subject,
            html: testHTML
        };

        const info = await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Test emaili başarıyla gönderildi',
            data: {
                messageId: info.messageId,
                sentTo: to
            }
        });

    } catch (error) {
        console.error('Test email hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Test emaili gönderilirken hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Email ayarlarını kontrol etme
router.get('/check-settings', (req, res) => {
    const settings = {
        smtpHost: process.env.SMTP_HOST || 'Tanımlanmamış',
        smtpPort: process.env.SMTP_PORT || 'Tanımlanmamış',
        smtpUser: process.env.SMTP_USER || 'Tanımlanmamış',
        smtpPassConfigured: !!process.env.SMTP_PASS
    };

    const isConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    res.json({
        success: true,
        configured: isConfigured,
        settings: settings,
        message: isConfigured ? 
            'Email ayarları tamamlanmış' : 
            'Email ayarları eksik. .env dosyasını kontrol edin.'
    });
});

module.exports = router;