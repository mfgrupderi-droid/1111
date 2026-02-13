const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const User = require('../models/User');
const ChatUnread = require('../models/ChatUnread');

module.exports = (io) => {
    const router = express.Router();
    // map of username => Set(socketId)
    const userSockets = new Map();

    
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`📂 'uploads' klasörü oluşturuldu: ${uploadDir}`);
    }

    
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        }
    });
    const upload = multer({ storage });

    
    io.on('connection', (socket) => {
        console.log(`Kullanıcı bağlandı: ${socket.id}`);

        socket.on('register', (username) => {
            if (!username) return;
            socket.username = username;
            const set = userSockets.get(username) || new Set();
            set.add(socket.id);
            userSockets.set(username, set);
            console.log(`Socket ${socket.id} register oldu: ${username}`);
        });

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

                // increment unread counts for all users except sender
                try {
                    const users = await User.find().select('username -_id');
                    for (const u of users) {
                        if (u.username === msg.user) continue;
                        const updated = await ChatUnread.findOneAndUpdate(
                            { user: u.username, room: msg.room },
                            { $inc: { count: 1 } },
                            { upsert: true, new: true }
                        );
                        const sockets = userSockets.get(u.username);
                        if (sockets) {
                            sockets.forEach(sid => {
                                io.to(sid).emit('unread:update', { user: u.username, room: msg.room, count: updated.count });
                            });
                        }
                    }
                } catch (err) {
                    console.error('Unread sayacı güncellenirken hata:', err);
                }

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

                    // clear unread count for this user in the message's room
                    try {
                        await ChatUnread.findOneAndUpdate(
                            { user, room: message.room },
                            { $set: { count: 0 } },
                            { upsert: true }
                        );
                        const sockets = userSockets.get(user);
                        if (sockets) {
                            sockets.forEach(sid => {
                                io.to(sid).emit('unread:update', { user, room: message.room, count: 0 });
                            });
                        }
                    } catch (err) {
                        console.error('Unread sıfırlanırken hata:', err);
                    }
                }
            } catch (err) {
                console.error('Mesaj görülme durumu güncellenirken hata:', err);
            }
        });

        socket.on('clearRoom', async (room) => {
            try {
                await Message.deleteMany({ room: room });
                io.to(room).emit('roomCleared');
                // reset unread counts for all users for this room
                try {
                    await ChatUnread.updateMany({ room }, { $set: { count: 0 } });
                    for (const [username, sockets] of userSockets.entries()) {
                        sockets.forEach(sid => io.to(sid).emit('unread:update', { user: username, room, count: 0 }));
                    }
                } catch (err) {
                    console.error('ClearRoom unread sıfırlama hatası:', err);
                }
            } catch (err) {
                console.error('Oda mesajları silinirken hata:', err);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Kullanıcı bağlantısı kesildi: ${socket.id}`);
            if (socket.username) {
                const set = userSockets.get(socket.username);
                if (set) {
                    set.delete(socket.id);
                    if (set.size === 0) userSockets.delete(socket.username);
                }
            }
        });
    });

    
    router.post('/', upload.single('file'), async (req, res) => {
        try {
            const { user, text, room } = req.body;
            const file = req.file;

            
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

            // increment unread counts for all users except sender (HTTP path)
            try {
                const users = await User.find().select('username -_id');
                for (const u of users) {
                    if (u.username === user) continue;
                    const updated = await ChatUnread.findOneAndUpdate(
                        { user: u.username, room },
                        { $inc: { count: 1 } },
                        { upsert: true, new: true }
                    );
                    const sockets = userSockets.get(u.username);
                    if (sockets) sockets.forEach(sid => io.to(sid).emit('unread:update', { user: u.username, room, count: updated.count }));
                }
            } catch (err) {
                console.error('Unread sayacı (HTTP) güncellenirken hata:', err);
            }

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

    // get unread counts for a user
    router.get('/unread', async (req, res) => {
        try {
            const { user } = req.query;
            if (!user) return res.status(400).send('user query param required');
            const counts = await ChatUnread.find({ user }).select('room count -_id');
            res.send(counts);
        } catch (err) {
            console.error('Unread alınırken hata:', err);
            res.status(500).send('Unread alınamadı.');
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