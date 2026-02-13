import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUserPlus, FiEdit, FiTrash2, FiX, FiCheck } from 'react-icons/fi';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './UserManagement.css';

const API_URL = 'http://31.57.33.249:3001/api/users';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'kullanici' });
    const [editUser, setEditUser] = useState(null);
    const [editUserForm, setEditUserForm] = useState({ username: '', role: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    
    
    const currentUserRole = 'kurucu'; 

    const userPermissions = {
        canViewUsers: currentUserRole === 'kurucu' ? true : true,
        canCreateUser: currentUserRole === 'kurucu' ? true : true,
        canEditUser: currentUserRole === 'kurucu' ? true : true,
        canDeleteUser: currentUserRole === 'kurucu' ? true : true,
    };
    useEffect(() => {
        if (userPermissions.canViewUsers) {
            fetchUsers();
			document.title = 'Kullanıcı Yönetimi';
        } else {
            setLoading(false);
            toast.error('Bu sayfayı görüntüleme yetkiniz yok.');
        }
    }, [userPermissions.canViewUsers]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                toast.error('Giriş yapmalısınız.');
                return;
            }
            const res = await axios.get(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (Array.isArray(res.data)) {
                setUsers(res.data);
            } else {
                console.error('API beklendiği gibi bir dizi döndürmedi:', res.data);
                toast.error('Kullanıcı verileri beklenmeyen bir formatta geldi.');
                setUsers([]);
            }
        } catch (err) {
            if (err.response?.status === 401) {
                toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
                localStorage.removeItem('token');
            } else if (err.response?.status === 403) {
                toast.error('Bu işlemi yapmaya yetkiniz yok.');
            } else {
                toast.error('Kullanıcılar getirilirken hata oluştu. Lütfen konsolu kontrol edin.');
                console.error('API çağrısı hatası:', err.response?.data || err.message);
            }
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Giriş yapmalısınız.');
                setIsSubmitting(false);
                return;
            }
            await axios.post(API_URL, newUserForm, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Kullanıcı başarıyla oluşturuldu.');
            setNewUserForm({ username: '', password: '', role: 'kullanici' });
            setShowCreateForm(false);
            fetchUsers();
        } catch (err) {
            if (err.response?.status === 401) {
                toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
                localStorage.removeItem('token');
            } else if (err.response?.status === 403) {
                toast.error('Bu işlemi yapmaya yetkiniz yok.');
            } else {
                toast.error('Kullanıcı oluşturulurken hata oluştu.');
                console.error('Kullanıcı oluşturma hatası:', err.response?.data || err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Giriş yapmalısınız.');
                setIsSubmitting(false);
                return;
            }
            await axios.put(`${API_URL}/${editUser._id}`, editUserForm, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Kullanıcı başarıyla güncellendi.');
            setEditUser(null);
            fetchUsers();
        } catch (err) {
            if (err.response?.status === 401) {
                toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
                localStorage.removeItem('token');
            } else if (err.response?.status === 403) {
                toast.error('Bu işlemi yapmaya yetkiniz yok.');
            } else {
                toast.error('Kullanıcı güncellenirken hata oluştu.');
                console.error('Kullanıcı güncelleme hatası:', err.response?.data || err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (userId) => {
        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Giriş yapmalısınız.');
                setIsSubmitting(false);
                return;
            }
            await axios.delete(`${API_URL}/${userToDelete}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Kullanıcı başarıyla silindi.');
            fetchUsers();
        } catch (err) {
            if (err.response?.status === 401) {
                toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
                localStorage.removeItem('token');
            } else if (err.response?.status === 403) {
                toast.error('Bu işlemi yapmaya yetkiniz yok.');
            } else {
                toast.error('Kullanıcı silinirken hata oluştu.');
                console.error('Kullanıcı silme hatası:', err.response?.data || err.message);
            }
        } finally {
            setShowDeleteModal(false);
            setUserToDelete(null);
            setIsSubmitting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setUserToDelete(null);
    };

    const startEdit = (user) => {
        setEditUser(user);
        setEditUserForm({ username: user.username, role: user.role });
    };

    if (loading) {
        return <div className="loader-container"><div className="loader"></div></div>;
    }

    if (!userPermissions.canViewUsers) {
        return <div className="user-management-container"><div className="card"><p>Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p></div></div>;
    }

    return (
        <div className="user-management-container">
            <h1 className="main-title">Kullanıcı Yönetimi</h1>

            {userPermissions.canCreateUser && (
                <div className="button-container">
                    <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
                        <FiUserPlus /> {showCreateForm ? 'İptal' : 'Yeni Kullanıcı Ekle'}
                    </button>
                </div>
            )}

            {showCreateForm && (
                <div className="card create-user-form">
                    <h3>Yeni Kullanıcı Oluştur</h3>
                    <form onSubmit={handleCreateUser}>
                        <div className="form-group">
                            <label>Kullanıcı Adı</label>
                            <input type="text" className="form-control" value={newUserForm.username} onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Şifre</label>
                            <input type="password" className="form-control" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Rol</label>
                            <select className="form-control" value={newUserForm.role} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}>
                                <option value="kullanici">Kullanıcı</option>
                                <option value="yönetici">Yönetici</option>
                                <option value="kurucu">Kurucu</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Oluştur</button>
                    </form>
                </div>
            )}

            <div className="user-list-card card">
                <h3>Kullanıcı Listesi</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Kullanıcı Adı</th>
                            <th>Rol</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map(user => (
                                <tr key={user._id}>
                                    <td>{user.username}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        {userPermissions.canEditUser && (
                                            <button className="btn-icon edit" onClick={() => startEdit(user)}>
                                                <FiEdit />
                                            </button>
                                        )}
                                        {userPermissions.canDeleteUser && (
                                            <button className="btn-icon delete" onClick={() => handleDeleteClick(user._id)}>
                                                <FiTrash2 />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="no-data">Kullanıcı bulunamadı.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editUser && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Kullanıcıyı Düzenle</h3>
                        <form onSubmit={handleUpdateUser}>
                            <div className="form-group">
                                <label>Kullanıcı Adı</label>
                                <input type="text" className="form-control" value={editUserForm.username} onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Rol</label>
                                <select className="form-control" value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>
                                    <option value="kullanici">Kullanıcı</option>
                                    <option value="yönetici">Yönetici</option>
                                    <option value="kurucu">Kurucu</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    <FiCheck /> Güncelle
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)} disabled={isSubmitting}>
                                    <FiX /> İptal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Kullanıcıyı Sil</h3>
                        <p>Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="modal-actions">
                            <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={isSubmitting}>
                                <FiCheck /> {isSubmitting ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                            <button className="btn btn-secondary" onClick={handleCancelDelete} disabled={isSubmitting}>
                                <FiX /> İptal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer position="bottom-right" />
        </div>
    );
};

export default UserManagement;