import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import './EmployeeManager.css';

const API_URL = 'http://31.57.33.249:3001/api';

const EmployeeManager = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    identityNumber: '',
    department: 'Atölye',
    position: 'İşçi',
    hireDate: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const hasChanges = () => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const fetchEmployees = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_URL}/calisanlar`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setEmployees(data.data || []);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Çalışanlar yüklenirken hata oluştu: ' + err.message);
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    let formatted = digits;
    if (formatted.startsWith('0')) {
      formatted = '90' + formatted.substring(1);
    } else if (!formatted.startsWith('90')) {
      formatted = '90' + formatted;
    }
    if (formatted.length > 12) {
      formatted = formatted.substring(0, 12);
    }
    return '+' + formatted;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validatePhoneNumber = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 11 && digits.length <= 12;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      setError('Geçerli bir telefon numarası girin (+90 ile başlamalı, 11-12 hane)');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/calisanlar/${editingId}` : `${API_URL}/calisanlar`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        await fetchEmployees();
        resetForm();
      } else {
        setError(result.message || 'Çalışan kaydedilirken hata oluştu');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('İstek zaman aşımına uğradı. Lütfen bağlantınızı kontrol edin.');
      } else {
        setError('Çalışan kaydedilirken hata oluştu: ' + err.message);
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emp) => {
    const newFormData = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone,
      email: emp.email || '',
      identityNumber: emp.identityNumber || '',
      department: emp.department || 'Atölye',
      position: emp.position || 'İşçi',
      hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : new Date().toISOString().split('T')[0]
    };
    setFormData(newFormData);
    setInitialFormData(newFormData);
    setEditingId(emp._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`${API_URL}/calisanlar/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          await fetchEmployees();
        }
      } catch (err) {
        setError('Çalışan silinirken hata oluştu');
        console.error(err);
      }
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      if (window.confirm('Kaydedilmemiş değişiklikler var. Çıkmak istediğinizden emin misiniz?')) {
        resetForm();
      }
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setInitialFormData(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      identityNumber: '',
      department: 'Atölye',
      position: 'İşçi',
      hireDate: new Date().toISOString().split('T')[0]
    });
  };

  const closeEmployeeCard = () => {
    setSelectedEmployee(null);
  };

  if (loading) {
    return <div className="loading-text">Çalışanlar yükleniyor...</div>;
  }

  return (
    <div className="employee-manager">
      <div className="manager-header">
        <h2>Çalışan Yönetimi</h2>
        <button className="btn-add" onClick={() => {
          setFormData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            identityNumber: '',
            department: 'Atölye',
            position: 'İşçi',
            hireDate: new Date().toISOString().split('T')[0]
          });
          setInitialFormData({
            firstName: '',
            lastName: '',
            phone: '',
            email: '',
            identityNumber: '',
            department: 'Atölye',
            position: 'İşçi',
            hireDate: new Date().toISOString().split('T')[0]
          });
          setEditingId(null);
          setShowForm(true);
        }}>
          <Plus size={20} /> Yeni Çalışan
        </button>
      </div>

      <div className="search-box">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Çalışan ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Çalışanı Düzenle' : 'Yeni Çalışan Ekle'}</h3>
              <button className="btn-close" onClick={handleCancel}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Ad *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Soyad *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Telefon * (+90 ile başlayın)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+90 5551234567"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>TC Kimlik No</label>
                  <input
                    type="text"
                    name="identityNumber"
                    value={formData.identityNumber}
                    onChange={handleInputChange}
                    maxLength="11"
                    placeholder="11 haneli"
                  />
                </div>
                <div className="form-group">
                  <label>Departman</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="Atölye">Atölye</option>
                    <option value="Kesimhane">Kesimhane</option>
                    <option value="Personel">Personel</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Pozisyon</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>İşe Başlama Tarihi</label>
                  <input
                    type="date"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleCancel}>
                  İptal
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <div className="modal-overlay" onClick={closeEmployeeCard}>
          <div className="employee-card-modal" onClick={e => e.stopPropagation()}>
            <button className="btn-close-card" onClick={closeEmployeeCard}>
              <X size={24} />
            </button>
            
            <div className="card-header">
              <div className="card-avatar">{selectedEmployee.firstName.charAt(0)}{selectedEmployee.lastName.charAt(0)}</div>
              <div className="card-title-section">
                <h2>{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                <p className="card-position">{selectedEmployee.position}</p>
              </div>
            </div>

            <div className="card-body">
              <div className="card-section">
                <h3>Kişi Bilgileri</h3>
                <div className="info-group">
                  <div className="info-item">
                    <span className="info-label">Telefon</span>
                    <span className="info-value">{selectedEmployee.phone}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value">{selectedEmployee.email || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="card-section">
                <h3>Çalışma Bilgileri</h3>
                <div className="info-group">
                  <div className="info-item">
                    <span className="info-label">Departman</span>
                    <span className="info-badge">{selectedEmployee.department}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">TC Kimlik No</span>
                    <span className="info-value">{selectedEmployee.identityNumber || '-'}</span>
                  </div>
                </div>
                <div className="info-group">
                  <div className="info-item full-width">
                    <span className="info-label">İşe Başlama Tarihi</span>
                    <span className="info-value">{selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString('tr-TR') : '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <button 
                className="btn-edit-card" 
                onClick={() => {
                  handleEdit(selectedEmployee);
                  closeEmployeeCard();
                }}
              >
                <Edit size={18} /> Düzenle
              </button>
              <button 
                className="btn-delete-card" 
                onClick={() => {
                  handleDelete(selectedEmployee._id);
                  closeEmployeeCard();
                }}
              >
                <Trash2 size={18} /> Sil
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="employees-table">
        {error && <div className="error-message">{error}</div>}
        {filteredEmployees.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Email</th>
                <th>TC No</th>
                <th>Departman</th>
                <th>Pozisyon</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp._id} onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer' }}>
                  <td className="name-cell">{emp.firstName} {emp.lastName}</td>
                  <td>{emp.phone}</td>
                  <td className="email-cell">{emp.email || '-'}</td>
                  <td>{emp.identityNumber || '-'}</td>
                  <td><span className="dept-badge">{emp.department}</span></td>
                  <td>{emp.position}</td>
                  <td className="actions-cell">
                    <button className="btn-edit" onClick={() => handleEdit(emp)} title="Düzenle">
                      <Edit size={18} />
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(emp._id)} title="Sil">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-message">Çalışan bulunamadı</div>
        )}
      </div>
    </div>
  );
};

export default EmployeeManager;
