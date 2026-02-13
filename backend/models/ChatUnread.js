const mongoose = require('mongoose');

const ChatUnreadSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
    },
    room: {
        type: String,
        required: true,
        default: 'genel-sohbet'
    },
    count: {
        type: Number,
        default: 0
    }
});

ChatUnreadSchema.index({ user: 1, room: 1 }, { unique: true });

module.exports = mongoose.model('ChatUnread', ChatUnreadSchema);
