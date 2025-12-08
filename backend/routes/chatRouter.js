// routes/chatRouter.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');

module.exports = (io) => {
    const router = express.Router();

    // === 1. Upload klasörü yoksa oluştur ===
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`📂 'uploads' klasörü oluşturuldu: ${uploadDir}`);
    }

    // === 2. Multer ayarları ===
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        }
    });
    const upload = multer({ storage });

    // === 3. Socket.io olayları ===
    io.on('connection', (socket) => {
        console.log(`Kullanıcı bağlandı: ${socket.id}`);

        socket.on('joinRoom', (room) => {
            socket.join(room);
            console.log(`Kullanıcı ${socket.id} odaya katıldı: ${room}`);
        });

        socket.on('chat message', async (msg) => {
            try {
                const newMessage = new Message({
                    user: msg.user,
                    text: msg.text,
                    room: msg.room
                });
                await newMessage.save();
                io.to(msg.room).emit('chat message', newMessage);
            } catch (err) {
                console.error('Veritabanına mesaj kaydedilirken hata:', err);
            }
        });

        socket.on('typing', ({ room, user }) => {
            socket.to(room).emit('typing', { user });
        });

        socket.on('stop typing', ({ room, user }) => {
            socket.to(room).emit('stop typing', { user });
        });

        socket.on('message seen', async ({ messageId, user }) => {
            try {
                const message = await Message.findById(messageId);
                if (message && !message.seenBy.includes(user)) {
                    message.seenBy.push(user);
                    await message.save();
                    io.to(message.room).emit('message seen', {
                        messageId: message._id,
                        seenBy: message.seenBy,
                    });
                }
            } catch (err) {
                console.error('Mesaj görülme durumu güncellenirken hata:', err);
            }
        });

        socket.on('clearRoom', async (room) => {
            try {
                await Message.deleteMany({ room: room });
                io.to(room).emit('roomCleared');
            } catch (err) {
                console.error('Oda mesajları silinirken hata:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Kullanıcı bağlantısı kesildi: ${socket.id}`);
        });
    });

    // === 4. API endpoint'leri ===
    router.post('/', upload.single('file'), async (req, res) => {
        try {
            const { user, text, room } = req.body;
            const file = req.file;

            // Tam URL oluştur
            const fileUrl = file
                ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
                : null;

            const newMessage = new Message({
                user,
                text,
                room,
                filePath: fileUrl,
                fileName: file ? file.originalname : null,
            });

            await newMessage.save();

            io.to(room).emit('chat message', newMessage);
            res.status(201).send(newMessage);

        } catch (err) {
            console.error('Mesaj veya dosya gönderilirken hata:', err);
            res.status(500).send('Mesaj gönderilemedi.');
        }
    });

    router.get('/', async (req, res) => {
        try {
            const { room } = req.query;
            const messages = await Message.find({ room }).sort({ timestamp: 1 });
            res.send(messages);
        } catch (err) {
            console.error('Mesajlar getirilirken hata:', err);
            res.status(500).send('Mesajlar alınamadı.');
        }
    });

    router.get('/rooms', async (req, res) => {
        try {
            const { user } = req.query;
            const dmRooms = await Message.distinct('room', {
                room: {
                    $not: /^genel-sohbet$|^yönetici-sohbeti$/i,
                    $regex: new RegExp(`\\b${user}\\b`, 'i')
                }
            });
            res.send(dmRooms);
        } catch (err) {
            console.error('Odalar getirilirken hata:', err);
            res.status(500).send('Odalar alınamadı.');
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { text } = req.body;
            const updatedMessage = await Message.findByIdAndUpdate(id, { text, edited: true }, { new: true });
            io.to(updatedMessage.room).emit('message edited', updatedMessage);
            res.send(updatedMessage);
        } catch (err) {
            res.status(500).send('Mesaj düzenlenirken hata.');
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const deletedMessage = await Message.findByIdAndDelete(id);
            io.to(deletedMessage.room).emit('message deleted', { id });
            res.status(200).send('Mesaj silindi.');
        } catch (err) {
            res.status(500).send('Mesaj silinirken hata.');
        }
    });

    router.delete('/all', async (req, res) => {
        try {
            await Message.deleteMany({});
            io.emit('allMessagesCleared');
            res.status(200).send('Tüm mesajlar silindi.');
        } catch (err) {
            res.status(500).send('Tüm mesajlar silinirken hata.');
        }
    });

    return router;
};
