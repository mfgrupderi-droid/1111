import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, User, Phone, Mail, Calendar, X, AlertCircle } from 'lucide-react';
import "./Calisanlar.css";
import { PageHeader, LoadingSpinner, ErrorAlert, SuccessAlert } from './SharedComponents';

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

  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('/calisanlar');
      setEmployees(data.employees || data);
    } catch (err) {
      setError('Çalışanlar yüklenirken hata oluştu: ' + err.message);
      setEmployees([{
        _id: '1',
        firstName: 'Demo',
        lastName: 'Kullanıcı',
        phone: '+90 532 123 45 67',
        email: 'demo@example.com',
        photo: null,
        createdAt: '2024-01-15T10:30:00Z'
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const createEmployee = async (data) => apiCall('/calisanlar', { method: 'POST', body: JSON.stringify(data) });
  const updateEmployee = async (id, data) => apiCall(`/calisanlar/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  const deleteEmployee = async (id) => apiCall(`/calisanlar/${id}`, { method: 'DELETE' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      alert('Ad, soyad ve telefon alanları zorunludur!');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editingEmployee) {
        const updated = await updateEmployee(editingEmployee._id, formData);
        setEmployees(employees.map(emp => emp._id === editingEmployee._id ? updated : emp));
        setEditingEmployee(null);
      } else {
        const newEmp = await createEmployee(formData);
        setEmployees([newEmp, ...employees]);
      }
      resetForm();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', phone: '', email: '', photo: '' });
    setShowForm(false);
    setEditingEmployee(null);
    setError(null);
  };

  const handleEdit = (emp) => {
    setFormData({ firstName: emp.firstName, lastName: emp.lastName, phone: emp.phone, email: emp.email || '', photo: emp.photo || '' });
    setEditingEmployee(emp);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu çalışanı silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    setError(null);
    try { await deleteEmployee(id); setEmployees(employees.filter(emp => emp._id !== id)); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Fotoğraf boyutu 2MB\'dan küçük olmalıdır.'); return; }
    const reader = new FileReader();
    reader.onload = () => setFormData({ ...formData, photo: reader.result });
    reader.readAsDataURL(file);
  };

  const generateAvatar = (f, l) => `${f.charAt(0).toUpperCase()}${l.charAt(0).toUpperCase()}`;
  const formatDate = (d) => new Date(d).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  const ErrorAlert = ({ message, onClose }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
        <div className="flex-1"><p className="text-sm text-red-800">{message}</p></div>
        <button onClick={onClose} className="text-red-400 hover:text-red-600"><X size={16} /></button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'><circle cx='25' cy='25' r='1' fill='white' opacity='0.1'/><circle cx='75' cy='75' r='1' fill='white' opacity='0.1'/><circle cx='50' cy='10' r='0.5' fill='white' opacity='0.15'/><circle cx='20' cy='80' r='0.8' fill='white' opacity='0.12'/></pattern></defs><rect width='100' height='100' fill='url(%23grain)'/></svg>\")",
          pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)', margin: 0 }}>
              Çalışan Yönetimi
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: '4px', fontSize: '1rem' }}>
              Toplam {employees.length} çalışan
            </p>
          </div>
          <button onClick={() => setShowForm(true)} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, backgroundColor: '#ffffff', color: '#8b5cf6'
          }}>
            <Plus size={20} color="#8b5cf6" /> {loading ? 'Yükleniyor...' : 'Yeni Çalışan'}
          </button>
        </div>
      </div>

      {}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
            {}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}</h2>
                            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                                    <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
                                    <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="+90 5xx xxx xx xx" required disabled={loading} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ornek@email.com" disabled={loading} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fotoğraf</label>
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading} />
                                {formData.photo && <img src={formData.photo} alt="Preview" className="mt-2 w-20 h-20 rounded-full object-cover" />}
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors">{loading ? 'İşleniyor...' : (editingEmployee ? 'Güncelle' : 'Ekle')}</button>
                                <button type="button" onClick={resetForm} disabled={loading} className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors">İptal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {}
            <div style={{ padding: '24px' }}>
                {loading && employees.length === 0 ? (
                    <div className="empty-state">
                        <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p style={{ color: '#64748b', marginTop: '16px' }}>Çalışanlar yükleniyor...</p>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="empty-state">
                        <User className="empty-icon" size={48} />
                        <h3 className="empty-title">Henüz çalışan yok</h3>
                        <p className="empty-description">İlk çalışanınızı eklemek için başlayın.</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        {employees.map((employee) => (
                            <div key={employee._id} 
                                className="employee-card"
                                style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    transform: 'translateZ(0)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                onClick={() => setSelectedEmployee(employee)}
                            >
                                <div style={{
                                    padding: '20px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid #f1f5f9'
                                }}>
                                    {employee.photo ? (
                                        <img 
                                            className="detail-avatar" 
                                            src={employee.photo} 
                                            alt={`${employee.firstName} ${employee.lastName}`}
                                            style={{ margin: '0 auto 16px' }}
                                        />
                                    ) : (
                                        <div 
                                            className="detail-avatar-placeholder"
                                            style={{ margin: '0 auto 16px' }}
                                        >
                                            {generateAvatar(employee.firstName, employee.lastName)}
                                        </div>
                                    )}
                                    <h3 style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: '600', 
                                        color: '#1e293b',
                                        margin: '0 0 4px 0'
                                    }}>
                                        {employee.firstName} {employee.lastName}
                                    </h3>
                                </div>

                                <div style={{ padding: '16px' }}>
                                    <div className="info-item">
                                        <Phone size={16} className="info-icon" />
                                        <div className="info-content">
                                            <p className="info-label">Telefon</p>
                                            <p className="info-value">{employee.phone}</p>
                                        </div>
                                    </div>

                                    {employee.email && (
                                        <div className="info-item" style={{ marginTop: '12px' }}>
                                            <Mail size={16} className="info-icon" />
                                            <div className="info-content">
                                                <p className="info-label">E-mail</p>
                                                <p className="info-value">{employee.email}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="info-item" style={{ marginTop: '12px' }}>
                                        <Calendar size={16} className="info-icon" />
                                        <div className="info-content">
                                            <p className="info-label">Eklenme Tarihi</p>
                                            <p className="info-value">{formatDate(employee.createdAt)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '16px',
                                    borderTop: '1px solid #f1f5f9'
                                }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(employee); }} 
                                        disabled={loading}
                                        className="action-btn edit"
                                        style={{
                                            flex: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            fontSize: '0.875rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <Edit2 size={16} /> Düzenle
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(employee._id); }} 
                                        disabled={loading}
                                        className="action-btn delete"
                                        style={{
                                            flex: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            fontSize: '0.875rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <Trash2 size={16} /> Sil
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {}
            {selectedEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Çalışan Detayları</h2>
                            <button onClick={() => setSelectedEmployee(null)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        <div className="text-center mb-6">
                            {selectedEmployee.photo ? (
                                <img className="h-24 w-24 rounded-full object-cover mx-auto mb-4" src={selectedEmployee.photo} alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} />
                            ) : (
                                <div className="h-24 w-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium mx-auto mb-4">{generateAvatar(selectedEmployee.firstName, selectedEmployee.lastName)}</div>
                            )}
                            <h3 className="text-xl font-semibold text-gray-900">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone size={20} className="text-gray-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Telefon</p>
                                    <p className="font-medium">{selectedEmployee.phone}</p>
                                </div>
                            </div>
                            {selectedEmployee.email && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Mail size={20} className="text-gray-600" />
                                    <div>
                                        <p className="text-sm text-gray-600">E-mail</p>
                                        <p className="font-medium">{selectedEmployee.email}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar size={20} className="text-gray-600" />
                                <div>
                                    <p className="text-sm text-gray-600">Eklenme Tarihi</p>
                                    <p className="font-medium">{formatDate(selectedEmployee.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => { setSelectedEmployee(null); handleEdit(selectedEmployee); }} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"><Edit2 size={16} />Düzenle</button>
                            <button onClick={() => setSelectedEmployee(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors">Kapat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManager;
