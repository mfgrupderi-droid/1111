const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const axios = require("axios")
const app = express();
const port = 3001;
const server = http.createServer(app);
const { GoogleGenerativeAI } = require('@google/generative-ai');
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "http://31.57.33.249:3000",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('Yeni bir kullanıcı bağlandı');
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı');
    });
});

mongoose.connect('mongodb+srv://reawenxd:malibaba31@cluster0.zuyrzbr.mongodb.net/')
    .then(() => console.log('MongoDB\'ye başarıyla bağlandı.'))
    .catch(err => console.error('MongoDB bağlantı hatası:', err));

const usersRoutes = require('./routes/usersRoutes');
const ceksenetlerRouter = require('./routes/ceksenetlerRoutes');
const chatRoutes = require('./routes/chatRouter')(io);
const paymentRoutes = require('./routes/odemelerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const siparisRoutes = require('./routes/siparisRoutes');
const sirketRoutes = require('./routes/sirketRoutes');
const urunSatisRoutes = require('./routes/urunSatisRoutes');
const urunAlisRoutes = require('./routes/urunAlisRoutes');
const sevkiyatRoutes = require('./routes/sevkiyatNewRoutes');
const emailRoutes = require('./routes/emailRoutes');
const yaziciRoutes = require('./routes/yaziciRoutes');
const orderRoutes = require('./routes/orderRoutes');
const modelFiyati = require('./routes/modelFiyatiRoutes');
const calisanlarRoutes = require('./routes/calisanRoutes');
const absenceRoutes = require('./routes/absenceRoutes');
const hakedisRoutes = require("./routes/hakedisRoutes");
const fiyatlarRoutes = require("./routes/fiyatlarRoutes");
const fasonRoutes = require("./routes/fasonRoutes");
const iscilikRoutes = require("./routes/iscilikRoutes");
const fasonOdemeRoutes = require("./routes/fasonOdemeRoutes");
app.use('/api/users', usersRoutes);
app.use('/api/ceksenetler', ceksenetlerRouter);
app.use('/api/order', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/odemeler', paymentRoutes);
app.use('/api/calisanlar', calisanlarRoutes);
app.use('/api/employees', employeeRoutes);
app.use("/api/siparis", siparisRoutes);
app.use("/api/sirketler", sirketRoutes);
app.use("/api/urun-satis", urunSatisRoutes);
app.use("/api/urun-alis", urunAlisRoutes);
app.use("/api/sevkiyat", sevkiyatRoutes);
app.use("/api/print", yaziciRoutes);
app.use("/api", emailRoutes);
app.use('/api/hakedis', hakedisRoutes);
app.use('/api/fiyatlar', fiyatlarRoutes);
app.use('/api/absences', absenceRoutes);
app.use("/api/model-fiyatlari", modelFiyati);
app.use('/api/iscilikler', iscilikRoutes);
app.use('/api/fasoncular', fasonRoutes);
app.use('/api/fasonodeme', fasonOdemeRoutes);
const genAI = new GoogleGenerativeAI("AIzaSyB_UXDPs02N5vYTK9REEJx1dn-1znNC2NM");

app.get('/api/test', async (req, res) => {
  try {
    console.log('🧪 API Test başlıyor...');
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview-09-2025' 
    });
    
    const result = await model.generateContent('Sadece "test başarılı" yaz');
    const text = result.response.text();
    
    console.log('✅ Test başarılı!');
    res.json({ 
      success: true,
      response: text,
      model: 'gemini-2.5-flash-preview-09-2025'
    });
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// ============================================
// NORMAL CHAT (Streaming yok)
// ============================================
app.post('/api/chats', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mesaj boş olamaz' });
    }

    console.log('💬 Mesaj:', message.substring(0, 50));

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview-09-2025'
    });

    const result = await model.generateContent(message);
    const text = result.response.text();

    console.log('✅ Cevap gönderildi');
    res.json({ response: text });
    
  } catch (error) {
    console.error('❌ Chat hatası:', error.message);
    res.status(500).json({ 
      error: 'AI yanıt verirken hata oluştu',
      details: error.message 
    });
  }
});

// ============================================
// STREAMING CHAT
// ============================================
app.post('/api/chat-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { message } = req.body;

    if (!message) {
      res.write(`data: ${JSON.stringify({ error: 'Mesaj boş' })}\n\n`);
      return res.end();
    }

    console.log('🌊 Streaming:', message.substring(0, 50));

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview-09-2025'
    });

    const result = await model.generateContentStream(message);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
    console.log('✅ Streaming tamamlandı');

  } catch (error) {
    console.error('❌ Streaming hatası:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    model: 'gemini-2.5-flash-preview-09-2025',
    apiKey: "AIzaSyB_UXDPs02N5vYTK9REEJx1dn-1znNC2NM" ? '✅ Configured' : '❌ Missing'
  });
});

server.listen(port, () => {
    console.log(`BozkurtSan-Muhasebe backend'i http://31.57.33.249:3001 adresinde çalışıyor.`);
});
