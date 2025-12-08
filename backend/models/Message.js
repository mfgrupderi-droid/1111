const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    filePath: {
        type: String,
        required: false,
    },
    fileName: {
        type: String,
        required: false,
    },
    seenBy: {
        type: [String],
        default: [], 
    },
    room: {
        type: String,
        required: true,
        default: 'genel-sohbet',
    }
});

module.exports = mongoose.model('Message', MessageSchema);
