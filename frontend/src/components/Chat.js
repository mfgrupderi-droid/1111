import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SendHorizontal, Paperclip, Edit2, Trash2, Check, X, MessageSquareText, Plus, Users, Shield, Menu, CheckCheck, CirclePlus } from 'lucide-react';
import './Chat.css';

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

    const [activeRoom, setActiveRoom] = useState('genel-sohbet');
    const [rooms, setRooms] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [selectedMessageInfo, setSelectedMessageInfo] = useState(null);

    // ⭐ Yeni state'ler: Oda oluşturma modalı için
    const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');

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

    const fetchRooms = async () => {
        let initialRooms = ['genel-sohbet'];
        if (role === 'yönetici' || role === 'kurucu') {
            initialRooms.push('yönetici-sohbeti');
        }

        try {
            const res = await axios.get(`${API_BASE_URL_CHAT}/rooms?user=${username}`);
            const dmRooms = Array.isArray(res.data)
                ? res.data.filter(room => !initialRooms.includes(room))
                : [];

            const allRooms = [...new Set([...initialRooms, ...dmRooms, activeRoom])];
            setRooms(allRooms);
        } catch (err) {
            console.error('Odalar alınamadı:', err);
            const allRooms = [...new Set([...initialRooms, activeRoom])];
            setRooms(allRooms);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await axios.get(API_BASE_URL_USERS);
            setAllUsers(res.data.filter(u => u.username !== username));
        } catch (err) {
            console.error('Kullanıcılar alınamadı:', err);
        }
    };

    const markMessagesAsSeen = () => {
        if (!username || !document.hasFocus()) return;

        const unseenMessages = messages.filter(
            (msg) => msg.user !== username && (!msg.seenBy || !msg.seenBy.includes(username))
        );
        unseenMessages.forEach((msg) => {
            socket.emit('message seen', { messageId: msg._id, user: username });
        });
    };

    useEffect(() => {
        if (!username) return;

        socket.emit('joinRoom', activeRoom);
        fetchMessages();

        const handleNewMessage = (msg) => {
            setMessages(prev => {
                if (!prev.some(m => m._id === msg._id)) {
                    if (document.visibilityState === 'hidden' && msg.user !== username) {
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
            console.log(`Socket'ten "mesaj görüldü" bilgisi geldi, mesaj ID: ${messageId}`);
        });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setUnreadCount(0);
                markMessagesAsSeen();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            socket.off('allMessagesCleared', handleAllMessagesCleared);
            socket.off('message edited');
            socket.off('message deleted');
            socket.off('typing');
            socket.off('stop typing');
            socket.off('message seen');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [username, allUsers]);

    useEffect(() => {
        if (username) {
            const intervalId = setInterval(() => {
                fetchMessages();
                fetchRooms();
                fetchAllUsers();
                console.log('İsteğiniz üzerine tüm veriler yenilendi...');
            }, 1000);

            return () => clearInterval(intervalId);
        }
    }, [username, role, activeRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (messages.length > 0) {
            markMessagesAsSeen();
        }
    }, [messages]);

    useEffect(() => {
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) Yeni Mesaj`;
        } else {
            document.title = 'Genel Sohbet Odası';
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

    const createDmRoomName = (otherUser) => {
        const sortedUsers = [username, otherUser].sort();
        return `${sortedUsers[0]}-${sortedUsers[1]}`;
    };

    const getRoomDisplayName = (roomName) => {
        if (roomName === 'genel-sohbet') return 'Genel Sohbet';
        if (roomName === 'yönetici-sohbeti') return 'Yönetici Sohbeti';
        // Yeni odalar için oda adını doğrudan göster
        if (roomName.includes('-')) {
            return roomName.split('-').find(u => u !== username);
        }
        return roomName;
    };

    const handleStartDm = (otherUser) => {
        const dmRoomName = createDmRoomName(otherUser);
        setActiveRoom(dmRoomName);
        if (!rooms.includes(dmRoomName)) {
            setRooms(prev => [...prev, dmRoomName]);
        }
        setIsUserListModalOpen(false);
    };

    // ⭐ Yeni fonksiyon: Oda oluşturma
    const handleCreateNewRoom = () => {
        if (!newRoomName.trim()) {
            alert('Lütfen bir oda adı girin.');
            return;
        }

        setActiveRoom(newRoomName.trim());
        setNewRoomName('');
        setIsCreateRoomModalOpen(false);
    };

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
            <div className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h4>Sohbetler</h4>
                    <div className="sidebar-actions">
                        {/* ⭐ Yeni Buton: Oda Oluştur */}
                        <button onClick={() => setIsCreateRoomModalOpen(true)} className="create-room-btn">
                            <CirclePlus size={20} />
                        </button>
                        {/* Mevcut DM butonu */}
                        <button onClick={() => setIsUserListModalOpen(true)} className="add-dm-btn">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
                <div className="rooms-list">
                    {rooms.map(room => (
                        <div
                            key={room}
                            className={`room-item ${room === activeRoom ? 'active' : ''}`}
                            onClick={() => {
                                setActiveRoom(room);
                                setIsSidebarOpen(false);
                            }}
                        >
                            {/* ... Oda isimlerini render eden kısım ... */}
                            <span>{getRoomDisplayName(room)}</span>
                        </div>
                    ))}
                </div>
                {(role === 'yönetici' || role === 'kurucu') && (
                    <div className="admin-actions">
                        <button onClick={handleDeleteAllMessages} className="delete-all-btn">
                            <Trash2 size={16} /> Tüm Mesajları Sil
                        </button>
                    </div>
                )}
            </div>
            {/* Mevcut Kullanıcı Listesi Modalı */}
            {isUserListModalOpen && (
                <div className="user-list-modal-overlay">
                    <div className="user-list-modal">
                        <div className="modal-header">
                            <h5>Kullanıcılar</h5>
                            <button onClick={() => setIsUserListModalOpen(false)}><X size={20} /></button>
                        </div>
                        <ul className="user-list">
                            {allUsers.map(user => (
                                <li key={user.username} onClick={() => handleStartDm(user.username)}>
                                    {user.username}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ⭐ Yeni Modal: Oda Oluştur */}
            {isCreateRoomModalOpen && (
                <div className="create-room-modal-overlay">
                    <div className="create-room-modal">
                        <div className="modal-header">
                            <h5>Yeni Oda Oluştur</h5>
                            <button onClick={() => setIsCreateRoomModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                placeholder="Oda Adı Girin"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                className="create-room-input"
                                autoFocus
                            />
                            <button onClick={handleCreateNewRoom} className="create-room-confirm-btn">
                                Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mevcut Mesaj Bilgisi Modalı (değişmedi) */}
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
                                <h6>Görüldü</h6>
                                <ul className="seen-users-list">
                                    {allUsers.filter(u => selectedMessageInfo.seenBy?.includes(u.username)).map(user => (
                                        <li key={user.username}>{user.username} <span className="status seen-status">Gördü</span></li>
                                    ))}
                                    {selectedMessageInfo.seenBy?.filter(u => u === username).length > 0 &&
                                        <li>{username} <span className="status seen-status">Gördü (Siz)</span></li>
                                    }
                                </ul>
                                <h6>Görülmedi</h6>
                                <ul className="unseen-users-list">
                                    {allUsers.filter(u => !selectedMessageInfo.seenBy?.includes(u.username)).map(user => (
                                        <li key={user.username}>{user.username} <span className="status unseen-status">Görmedi</span></li>
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
                    <h3>{getRoomDisplayName(activeRoom)}</h3>
                </div>
                <ul className="messages-list">
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
                                <>
                                    <span className="message-user">{msg.user}</span>
                                    <p className="message-text">
                                        {msg.text}
                                        {msg.filePath && (
                                            <span className="file-attachment">
                                                {msg.fileName && (msg.fileName.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/)) ? (
                                                    <img src={`http://31.57.33.249:3001/${msg.filePath}`} alt={msg.fileName} className="message-image-preview" />
                                                ) : (
                                                    <a href={`http://31.57.33.249:3001/${msg.filePath}`} target="_blank" rel="noopener noreferrer" className="file-link">
                                                        <Paperclip size={14} /> {msg.fileName}
                                                    </a>
                                                )}
                                            </span>
                                        )}
                                    </p>
                                    <span className="message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
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
                                    {msg.user === username && renderMessageStatus(msg)}
                                </>
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