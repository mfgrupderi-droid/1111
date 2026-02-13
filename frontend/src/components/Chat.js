import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SendHorizontal, Paperclip, Edit2, Trash2, Check, X, MessageSquareText, Plus, Users, Shield, Menu, CheckCheck, CirclePlus } from 'lucide-react';
import './Chat.css';
import { PageHeader, LoadingSpinner, InlineLoading } from './SharedComponents';

const API_BASE_URL_CHAT = 'http://31.57.33.249:3001/api/chat';
const API_BASE_URL_USERS = 'http://31.57.33.249:3001/api/users';

const socket = io('http://31.57.33.249:3001');

function Chat({ username, role }) {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editedMessageText, setEditedMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // single-channel setup
    const [activeRoom] = useState('genel-sohbet');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [selectedMessageInfo, setSelectedMessageInfo] = useState(null);

    const fetchMessages = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL_CHAT}?room=${activeRoom}`);
            if (Array.isArray(res.data)) {
                setMessages(res.data);
            }
        } catch (err) {
            console.error('Mesajlar alınamadı:', err);
        }
    };

    // rooms and user lists removed — single shared room only

    const markMessagesAsSeen = () => {
        if (!username) return;

        const unseenMessages = messages.filter(
            (msg) => msg.user !== username && (!msg.seenBy || !msg.seenBy.includes(username))
        );
        
        if (unseenMessages.length > 0) {
            unseenMessages.forEach((msg) => {
                socket.emit('message seen', { messageId: msg._id, user: username });
            });
            // Bildirim sayısını hemen sıfırla
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        if (!username) return;

        socket.emit('joinRoom', activeRoom);
        socket.emit('register', username);
        fetchMessages();

        const handleNewMessage = (msg) => {
            setMessages(prev => {
                if (!prev.some(m => m._id === msg._id)) {
                    const el = messagesContainerRef.current;
                    const nearBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 150) : true;
                    if ((document.visibilityState === 'hidden' && msg.user !== username) || (!nearBottom && msg.user !== username)) {
                        setUnreadCount(prevCount => prevCount + 1);
                    }
                    return [...prev, msg];
                }
                return prev;
            });
        };
        socket.on('chat message', handleNewMessage);

        const handleRoomCleared = () => {
            setMessages([]);
        };
        socket.on('roomCleared', handleRoomCleared);

        return () => {
            socket.off('chat message', handleNewMessage);
            socket.off('roomCleared', handleRoomCleared);
            socket.emit('leaveRoom', activeRoom);
        };
    }, [activeRoom, username]);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const handleAllMessagesCleared = () => {
            setMessages([]);
            console.log('Tüm mesajlar sunucu tarafından silindi.');
        };
        socket.on('allMessagesCleared', handleAllMessagesCleared);

        socket.on('message edited', updatedMessage => {
            setMessages(prev => prev.map(m => (m._id === updatedMessage._id ? updatedMessage : m)));
        });

        socket.on('message deleted', ({ id }) => {
            setMessages(prev => prev.filter(m => m._id !== id));
        });

        socket.on('typing', ({ user }) => {
            setTypingUsers(prev => {
                if (prev.includes(user) || user === username) return prev;
                return [...prev, user];
            });
        });

        socket.on('stop typing', ({ user }) => {
            setTypingUsers(prev => prev.filter(u => u !== user));
        });

        socket.on('message seen', ({ messageId, seenBy }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) {
                    return { ...m, seenBy };
                }
                return m;
            }));
            
            // Kendi mesajlarımızın görüldüğü bilgisi geldiğinde unread count'u güncelle
            if (document.visibilityState === 'visible') {
                const unseenCount = messages.filter(
                    msg => msg.user !== username && (!msg.seenBy || !msg.seenBy.includes(username))
                ).length;
                
                if (unseenCount === 0) {
                    setUnreadCount(0);
                }
            }
            
            console.log(`Socket'ten "mesaj görüldü" bilgisi geldi, mesaj ID: ${messageId}`);
        });

        socket.on('unread:update', ({ user: u, room, count }) => {
            if (u === username) {
                setUnreadCount(count);
                try {
                    window.dispatchEvent(new CustomEvent('chat:unread', { detail: count }));
                } catch (e) {}
            }
        });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Sayfa görünür olduğunda hemen sıfırla ve mesajları görüldü olarak işaretle
                setUnreadCount(0);
                // Kısa bir gecikme ile mesajları işaretle (DOM güncellensin diye)
                setTimeout(() => {
                    markMessagesAsSeen();
                }, 100);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // fetch initial unread counts for this user
        (async () => {
            try {
                const res = await axios.get(`${API_BASE_URL_CHAT}/unread`, { params: { user: username } });
                if (Array.isArray(res.data)) {
                    const total = res.data.reduce((s, it) => s + (it.count || 0), 0);
                    setUnreadCount(total);
                    try { window.dispatchEvent(new CustomEvent('chat:unread', { detail: total })); } catch (e) {}
                }
            } catch (e) {
                // ignore
            }
        })();

        return () => {
            socket.off('allMessagesCleared', handleAllMessagesCleared);
            socket.off('message edited');
            socket.off('message deleted');
            socket.off('typing');
            socket.off('stop typing');
            socket.off('message seen');
            socket.off('unread:update');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [username]);

    useEffect(() => {
        if (username) {
            // Initial load (socket pushes new messages; polling removed)
            fetchMessages();
            return () => {};
        }
    }, [username]);

    const isUserNearBottom = () => {
        const el = messagesContainerRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    };

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        const nearBottom = isUserNearBottom();

        if (nearBottom || lastMessage?.user === username) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }

        // Sayfa görünürse ve kullanıcı altta ise mesajları görüldü olarak işaretle
        if (messages.length > 0 && document.visibilityState === 'visible') {
            // Unread count'u her mesaj değişiminde kontrol et
            const unseenCount = messages.filter(
                msg => msg.user !== username && (!msg.seenBy || !msg.seenBy.includes(username))
            ).length;
            
            if (unseenCount === 0 && unreadCount > 0) {
                setUnreadCount(0);
            }
            
            if (nearBottom) {
                markMessagesAsSeen();
            }
        }
    }, [messages]);

    useEffect(() => {
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) Yeni Mesaj`;
        } else {
            document.title = 'Genel Sohbet Odası';
        }
        // Broadcast unread count so other UI (sidebar) can show a badge
        try {
            window.dispatchEvent(new CustomEvent('chat:unread', { detail: unreadCount }));
        } catch (e) {
            // ignore in environments that restrict CustomEvent
        }
    }, [unreadCount]);

    const handleTyping = (e) => {
        setCurrentMessage(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', { room: activeRoom, user: username });
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('stop typing', { room: activeRoom, user: username });
        }, 1500);
    };

    const handleFileChange = e => {
        setSelectedFile(e.target.files[0]);
    };

    const handleSendMessage = async e => {
        e.preventDefault();
        if (!username) {
            alert('Lütfen önce giriş yapınız.');
            return;
        }

        if (currentMessage.trim() === '/sil') {
            socket.emit('clearRoom', activeRoom);
            setMessages([]);
            setCurrentMessage('');
            return;
        }

        if (currentMessage.trim() === '' && !selectedFile) return;

        setIsSending(true);
        clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
        socket.emit('stop typing', { room: activeRoom, user: username });

        const formData = new FormData();
        formData.append('user', username);
        formData.append('text', currentMessage);
        formData.append('room', activeRoom);
        if (selectedFile) formData.append('file', selectedFile);

        try {
            await axios.post(API_BASE_URL_CHAT, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCurrentMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Mesaj gönderilirken hata oluştu:', err);
        } finally {
            setIsSending(false);
        }
    };

    const handleEditMessage = async e => {
        e.preventDefault();
        if (editedMessageText.trim() === '') return;

        try {
            await axios.put(`${API_BASE_URL_CHAT}/${editingMessageId}`, {
                text: editedMessageText,
            });
            setEditingMessageId(null);
            setEditedMessageText('');
        } catch (err) {
            console.error('Mesaj düzenlenirken hata oluştu:', err);
        }
    };

    const handleDeleteMessage = async id => {
        try {
            await axios.delete(`${API_BASE_URL_CHAT}/${id}`);
        } catch (err) {
            console.error('Mesaj silinirken hata oluştu:', err);
        }
    };

    const handleDeleteAllMessages = async () => {
        if (!window.confirm('Tüm sohbet geçmişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            return;
        }
        try {
            await axios.delete(`${API_BASE_URL_CHAT}/all`);
        } catch (err) {
            console.error('Tüm mesajlar silinirken hata:', err);
            alert('Tüm mesajlar silinirken bir hata oluştu.');
        }
    };

    const handleEditClick = msg => {
        setEditingMessageId(msg._id);
        setEditedMessageText(msg.text);
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditedMessageText('');
    };

    // Single-channel app — room/DM helpers removed

    const renderMessageStatus = (msg) => {
        if (msg.user !== username) return null;

        const seenByCount = msg.seenBy?.filter(u => u !== username).length;

        if (seenByCount > 0) {
            return <CheckCheck className="message-status seen" size={14} />;
        } else {
            return <Check className="message-status sent" size={14} />;
        }
    };

    const openMessageInfoModal = (msg) => {
        if (msg.user === username) {
            setSelectedMessageInfo(msg);
            setIsInfoModalOpen(true);
        }
    };

    const closeMessageInfoModal = () => {
        setIsInfoModalOpen(false);
        setSelectedMessageInfo(null);
    };

    const isHovered = (messageId) => hoveredMessageId === messageId;

    return (
        <div className="chat-app-container">
            {/* Sidebar/room list removed — single global channel */}
            <div style={{ width: 0, overflow: 'hidden' }} />

            {isInfoModalOpen && selectedMessageInfo && (
                <div className="message-info-modal-overlay" onClick={closeMessageInfoModal}>
                    <div className="message-info-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h5>Mesaj Bilgisi</h5>
                            <button onClick={closeMessageInfoModal}><X size={20} /></button>
                        </div>
                        <div className="info-content">
                            <p className="message-info-text">{selectedMessageInfo.text}</p>
                            <div className="info-list-container">
                                <h6>Görüldü (kullanıcı adları)</h6>
                                <ul className="seen-users-list">
                                    {(selectedMessageInfo.seenBy || []).map(u => (
                                        <li key={u}>{u} <span className="status seen-status">Gördü</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="chat-container">
                <div className="chat-header">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="toggle-sidebar-btn">
                        <Menu size={24} />
                    </button>
                    <h3>Genel Sohbet</h3>
                </div>
                <ul className="messages-list" ref={messagesContainerRef}>
                    {messages.map(msg => (
                        <li
                            key={msg._id}
                            className={`message ${msg.user === username ? 'sent-by-me' : ''}`}
                            onMouseEnter={() => setHoveredMessageId(msg._id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                            onClick={() => openMessageInfoModal(msg)}
                        >
                            {editingMessageId === msg._id ? (
                                <form onSubmit={handleEditMessage} className="edit-form">
                                    <input
                                        type="text"
                                        value={editedMessageText}
                                        onChange={(e) => setEditedMessageText(e.target.value)}
                                        className="edit-input"
                                        autoFocus
                                    />
                                    <button type="submit" className="edit-save-btn">
                                        <Check size={18} />
                                    </button>
                                    <button type="button" onClick={handleCancelEdit} className="edit-cancel-btn">
                                        <X size={18} />
                                    </button>
                                </form>
                            ) : (
                                <div className="message-main">
                                    <div className={`avatar ${msg.user === username ? 'mine' : ''}`}>
                                        {msg.user ? msg.user.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div className={`message-content ${msg.user === username ? 'mine' : ''}`}>
                                        <div className="message-header">
                                            <span className="message-user">{msg.user}</span>
                                            <span className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="message-bubble">
                                            <div className="message-text">
                                                {msg.text}
                                            </div>
                                            {msg.filePath && (
                                                <div className="file-attachment">
                                                    {msg.fileName && (msg.fileName.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/)) ? (
                                                        <img src={`http://31.57.33.249:3001/${msg.filePath}`} alt={msg.fileName} className="message-image-preview" />
                                                    ) : (
                                                        <a href={`http://31.57.33.249:3001/${msg.filePath}`} target="_blank" rel="noopener noreferrer" className="file-link">
                                                            <Paperclip size={14} /> {msg.fileName}
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="message-meta">
                                            {msg.user === username && renderMessageStatus(msg)}
                                            {msg.user === username && isHovered(msg._id) && (
                                                <div className="message-actions">
                                                    <button onClick={() => handleEditClick(msg)} className="edit-btn">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteMessage(msg._id)} className="delete-btn">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                    {typingUsers.length > 0 && (
                        <li className="typing-indicator">
                            {typingUsers.join(', ')} yazıyor...
                        </li>
                    )}
                    <div ref={messagesEndRef} />
                </ul>
                <form onSubmit={handleSendMessage} className="message-form">
                    <label htmlFor="file-upload" className="file-upload-btn">
                        <Paperclip size={24} />
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <input
                        type="text"
                        value={currentMessage}
                        onChange={handleTyping}
                        placeholder={selectedFile ? `Dosya: ${selectedFile.name} | Mesaj ekle...` : 'Mesaj yaz...'}
                        className="message-input"
                        disabled={isSending}
                    />
                    <button type="submit" className="send-btn" disabled={isSending}>
                        <SendHorizontal size={24} />
                    </button>
                </form>
                {selectedFile && (
                    <div className="file-preview">
                        <span>Seçilen dosya: {selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} className="clear-file-btn">
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;