import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Phone, Mail, Calendar, X, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://31.57.33.249:3001/api';

const EmployeeManager = () => {
    const [employees, setEmployees] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        photo: ''
    });
    const styles = {
        container: {
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '24px',
            backgroundColor: '#f9fafb',
            minHeight: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        },
        // Gradientli header
        header: {
            borderBottom: '1px solid #e5e7eb',
            padding: '24px',
            display: 'flex',
            justifyContent: 'center', // ortala
            alignItems: 'center',
            flexDirection: 'column',
            background: 'linear-gradient(90deg, #4f46e5, #2563eb)', // gradient
            borderRadius: '8px 8px 0 0'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white', // beyaz yazı
            margin: '0 0 4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        subtitle: {
            color: 'white', // beyaz
            margin: 0,
            fontSize: '14px'
        },
        button: {
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'background-color 0.2s'
        },
        buttonHover: {
            backgroundColor: '#1d4ed8'
        },
        buttonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        },
        modal: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
        },
        modalContent: {
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '100%',
            maxWidth: '448px',
            margin: '16px'
        },
        modalHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        },
        modalTitle: {
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
        },
        closeButton: {
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            padding: '4px'
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column'
        },
        label: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
        },
        input: {
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s'
        },
        inputFocus: {
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
        },
        inputDisabled: {
            backgroundColor: '#f3f4f6',
            color: '#6b7280'
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px',
            paddingTop: '16px'
        },
        buttonSecondary: {
            backgroundColor: '#d1d5db',
            color: '#374151',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            flex: 1,
            fontSize: '14px',
            transition: 'background-color 0.2s'
        },
        buttonSecondaryHover: {
            backgroundColor: '#9ca3af'
        },
        content: {
            padding: '24px'
        },
        emptyState: {
            textAlign: 'center',
            padding: '48px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        },
        emptyIcon: {
            color: '#9ca3af',
            marginBottom: '8px'
        },
        emptyTitle: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#111827',
            margin: '8px 0 4px 0'
        },
        emptyText: {
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        tableHeader: {
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
        },
        th: {
            padding: '12px 24px',
            textAlign: 'left',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        },
        thRight: {
            textAlign: 'right'
        },
        tr: {
            borderBottom: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        },
        trHover: {
            backgroundColor: '#f9fafb'
        },
        td: {
            padding: '16px 24px',
            verticalAlign: 'middle'
        },
        tdRight: {
            textAlign: 'right'
        },
        employeeInfo: {
            display: 'flex',
            alignItems: 'center'
        },
        avatar: {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
            marginRight: '16px'
        },
        avatarText: {
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '500',
            marginRight: '16px'
        },
        employeeName: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#111827',
            margin: 0
        },
        contactInfo: {
            fontSize: '14px',
            color: '#111827',
            margin: '0 0 2px 0'
        },
        contactEmail: {
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
        },
        date: {
            fontSize: '14px',
            color: '#6b7280'
        },
        actionButtons: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
        },
        actionButton: {
            background: 'none',
            border: 'none',
            padding: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'color 0.2s'
        },
        editButton: {
            color: '#2563eb'
        },
        deleteButton: {
            color: '#dc2626'
        },
        errorAlert: {
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center'
        },
        errorIcon: {
            color: '#f87171',
            marginRight: '8px'
        },
        errorText: {
            fontSize: '14px',
            color: '#991b1b',
            flex: 1,
            margin: 0
        },
        spinner: {
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
        },
        loadingText: {
            marginTop: '16px',
            color: '#6b7280',
            textAlign: 'center'
        }
    };

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `@keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const apiCall = async (endpoint, options = {}) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: { 'Content-Type': 'application/json', ...options.headers },
                ...options,
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    };

    const fetchEmployees = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiCall('/calisanlar');
            let employeeArray = [];
            if (Array.isArray(data)) employeeArray = data;
            else if (data.employees && Array.isArray(data.employees)) employeeArray = data.employees;
            else if (data.data && Array.isArray(data.data)) employeeArray = data.data;
            else employeeArray = [];
            setEmployees(employeeArray);
        } catch (error) {
            setError('Çalışanlar yüklenirken hata oluştu: ' + error.message);
            setEmployees([{
                _id: '1',
                firstName: 'Demo',
                lastName: 'Kullanıcı',
                phone: '+90 532 123 45 67',
                email: 'demo@example.com',
                photo: null,
                createdAt: '2024-01-15T10:30:00Z'
            }]);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchEmployees(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
            alert('Ad, soyad ve telefon alanları zorunludur!');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            let newEmployee;
            if (editingEmployee) {
                const updated = await apiCall(`/calisanlar/${editingEmployee._id || editingEmployee.id}`, { method: 'PUT', body: JSON.stringify(formData) });
                newEmployee = updated.employee || updated.data || updated;
                setEmployees(employees.map(emp => (emp._id || emp.id) === (editingEmployee._id || editingEmployee.id) ? newEmployee : emp));
                setEditingEmployee(null);
            } else {
                const created = await apiCall('/calisanlar', { method: 'POST', body: JSON.stringify(formData) });
                newEmployee = created.employee || created.data || created;
                setEmployees([newEmployee, ...employees]);
            }
            resetForm();
        } catch (error) { setError(error.message); } finally { setLoading(false); }
    };

    const resetForm = () => {
        setFormData({ firstName: '', lastName: '', phone: '', email: '', photo: '' });
        setShowForm(false);
        setEditingEmployee(null);
        setError(null);
    };

    const handleEdit = (employee) => {
        setFormData({ firstName: employee.firstName, lastName: employee.lastName, phone: employee.phone, email: employee.email || '', photo: employee.photo || '' });
        setEditingEmployee(employee);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu çalışanı silmek istediğinize emin misiniz?')) {
            setLoading(true); setError(null);
            try {
                await apiCall(`/calisanlar/${id}`, { method: 'DELETE' });
                setEmployees(employees.filter(emp => (emp._id || emp.id) !== id));
            } catch (error) { setError(error.message); } finally { setLoading(false); }
        }
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { alert('Fotoğraf boyutu 2MB\'dan küçük olmalıdır.'); return; }
            const reader = new FileReader();
            reader.onload = (e) => setFormData({ ...formData, photo: e.target.result });
            reader.readAsDataURL(file);
        }
    };

    const generateAvatar = (firstName, lastName) => `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

    const ErrorAlert = ({ message, onClose }) => (
        <div style={styles.errorAlert}>
            <AlertCircle style={styles.errorIcon} size={20} />
            <p style={styles.errorText}>{message}</p>
            <button onClick={onClose} style={styles.closeButton}><X size={16} /></button>
        </div>
    );

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>Çalışan Yönetimi</h1>
                        <p style={styles.subtitle}>Toplam {employees.length} çalışan</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        disabled={loading}
                        style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
                        onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = styles.buttonHover.backgroundColor)}
                        onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = styles.button.backgroundColor)}
                    >
                        <Plus size={20} />
                        {loading ? 'Yükleniyor...' : 'Yeni Çalışan'}
                    </button>
                </div>

                {error && <div style={{ padding: '24px' }}><ErrorAlert message={error} onClose={() => setError(null)} /></div>}

                {showForm && (
                    <div style={styles.modal}>
                        <div style={styles.modalContent}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>{editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}</h2>
                                <button onClick={resetForm} style={styles.closeButton}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} style={styles.form}>
                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Ad *</label>
                                        <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} style={{ ...styles.input, ...(loading ? styles.inputDisabled : {}) }} required disabled={loading} />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Soyad *</label>
                                        <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} style={{ ...styles.input, ...(loading ? styles.inputDisabled : {}) }} required disabled={loading} />
                                    </div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Telefon *</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ ...styles.input, ...(loading ? styles.inputDisabled : {}) }} placeholder="+90 5xx xxx xx xx" required disabled={loading} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>E-mail</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ ...styles.input, ...(loading ? styles.inputDisabled : {}) }} placeholder="ornek@email.com" disabled={loading} />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Fotoğraf</label>
                                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ ...styles.input, ...(loading ? styles.inputDisabled : {}) }} disabled={loading} />
                                    {formData.photo && <img src={formData.photo} alt="Preview" style={styles.previewImage} />}
                                </div>
                                <div style={styles.buttonGroup}>
                                    <button type="submit" disabled={loading} style={{ ...styles.button, flex: 1, ...(loading ? styles.buttonDisabled : {}) }}>{loading ? 'İşleniyor...' : (editingEmployee ? 'Güncelle' : 'Ekle')}</button>
                                    <button type="button" onClick={resetForm} disabled={loading} style={{ ...styles.buttonSecondary, ...(loading ? { backgroundColor: '#f3f4f6', color: '#9ca3af' } : {}) }}>İptal</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div style={{ padding: '24px' }}>
                    {loading && employees.length === 0 ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={styles.spinner}></div>
                            <p style={styles.loadingText}>Çalışanlar yükleniyor...</p>
                        </div>
                    ) : employees.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <User style={{ color: '#9ca3af', marginBottom: '8px' }} size={48} />
                            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '8px 0 4px 0' }}>Henüz çalışan yok</h3>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>İlk çalışanınızı eklemek için başlayın.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={styles.table}>
                                <thead style={styles.tableHeader}>
                                    <tr>
                                        <th style={styles.th}>Çalışan</th>
                                        <th style={styles.th}>İletişim</th>
                                        <th style={styles.th}>Eklenme Tarihi</th>
                                        <th style={{ ...styles.th, ...styles.thRight }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp._id || emp.id} style={styles.tr} onClick={() => setSelectedEmployee(emp)} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.trHover.backgroundColor} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td style={styles.td}>
                                                <div style={styles.employeeInfo}>
                                                    {emp.photo ? <img src={emp.photo} alt={`${emp.firstName} ${emp.lastName}`} style={styles.avatar} /> : <div style={styles.avatarText}>{generateAvatar(emp.firstName, emp.lastName)}</div>}
                                                    <p style={styles.employeeName}>{emp.firstName} {emp.lastName}</p>
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <p style={styles.contactInfo}>{emp.phone}</p>
                                                <p style={styles.contactEmail}>{emp.email || 'E-mail yok'}</p>
                                            </td>
                                            <td style={styles.td}><span style={styles.date}>{formatDate(emp.createdAt)}</span></td>
                                            <td style={{ ...styles.td, ...styles.tdRight }}>
                                                <div style={styles.actionButtons}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(emp); }} style={{ ...styles.actionButton, ...styles.editButton }}><Edit2 size={20} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(emp._id || emp.id); }} style={{ ...styles.actionButton, ...styles.deleteButton }}><Trash2 size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {selectedEmployee && (
                    <div style={styles.modal}>
                        <div style={styles.modalContent}>
                            <div style={styles.modalHeader}>
                                <h2 style={styles.modalTitle}>Çalışan Detayı</h2>
                                <button onClick={() => setSelectedEmployee(null)} style={styles.closeButton}><X size={24} /></button>
                            </div>
                            <div style={styles.detailSection}>
                                {selectedEmployee.photo ? <img src={selectedEmployee.photo} alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} style={styles.detailAvatar} /> : <div style={styles.detailAvatarText}>{generateAvatar(selectedEmployee.firstName, selectedEmployee.lastName)}</div>}
                                <h3 style={styles.detailName}>{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                            </div>
                            <div style={styles.detailList}>
                                <div style={styles.detailItem}><Phone style={styles.detailIcon} size={20} /><div style={styles.detailContent}><span style={styles.detailLabel}>Telefon</span><span style={styles.detailValue}>{selectedEmployee.phone}</span></div></div>
                                <div style={styles.detailItem}><Mail style={styles.detailIcon} size={20} /><div style={styles.detailContent}><span style={styles.detailLabel}>E-mail</span><span style={styles.detailValue}>{selectedEmployee.email || 'Belirtilmemiş'}</span></div></div>
                                <div style={styles.detailItem}><Calendar style={styles.detailIcon} size={20} /><div style={styles.detailContent}><span style={styles.detailLabel}>Eklenme Tarihi</span><span style={styles.detailValue}>{formatDate(selectedEmployee.createdAt)}</span></div></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeManager;
