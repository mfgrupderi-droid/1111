import React, { useState, useEffect, useRef } from 'react';
import {
  Search, FilePlus, FileText, XCircle, ChevronDown, PencilLine,
  PlusCircle, Trash2, Download, FileSpreadsheet, Mail,
  CheckCircle, AlertCircle, X, Send, Clock, Users, ShoppingBag
} from 'lucide-react';
import axios from 'axios';
import './UrunAlis.css';
import { PageHeader, LoadingSpinner, ErrorAlert, SuccessAlert } from './SharedComponents';
import { toast, ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const loadExternalScripts = () => {
  return new Promise((resolve) => {
    if (!window.XLSX) {
      const xlsxScript = document.createElement('script');
      xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      xlsxScript.onload = () => {
        if (!window.jsPDF) {
          const jsPDFScript = document.createElement('script');
          jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          jsPDFScript.onload = resolve;
          document.head.appendChild(jsPDFScript);
        } else {
          resolve();
        }
      };
      document.head.appendChild(xlsxScript);
    } else if (!window.jsPDF) {
      const jsPDFScript = document.createElement('script');
      jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      jsPDFScript.onload = resolve;
      document.head.appendChild(jsPDFScript);
    } else {
      resolve();
    }
  });
};
const sendEmailNotification = async (alisId) => {
  try {
    const response = await axios.post(`http://31.57.33.249:3001/api/urun-alis/${alisId}/send-notification`);
    return response.data;
	document.title = 'Ürün Alış Yönetimi';
  } catch (error) {
    throw error.response?.data || error;
  }
};
const EmailConfirmationModal = ({ isOpen, onClose, onConfirm, alisData, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="urun-alis-modal mail-confirmation-modal">
      <div className="urun-alis-modal-content">
        <div className="mail-confirmation-content">
          <div className="mail-icon">
            <Mail />
          </div>
          <h3>Email Bildirimi Gönder</h3>
          <p>
            <strong>{alisData?.sirketAdi}</strong> firmasına{' '}
            <strong>#{alisData?.alisNo}</strong> numaralı alış için email bildirimi göndermek istiyor musunuz?
          </p>
          {alisData?.sirketEmailler && alisData.sirketEmailler.length > 0 && (
            <div className="email-list">
              <p><strong>Gönderilecek Email Adresleri:</strong></p>
              <ul>
                {alisData.sirketEmailler.map((emailObj, index) => (
                  <li key={index}>{emailObj.email}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="urun-alis-modal-actions">
          <button
            className="urun-alis-btn urun-alis-btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            <X size={16} />
            İptal
          </button>
          <button
            className="urun-alis-btn urun-alis-btn-success"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send size={16} />
                Email Gönder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
function UrunAlis() {
  const API_BASE_URL_ALIS = 'http://31.57.33.249:3001/api/urun-alis';
  const API_BASE_URL_SIRKET = 'http://31.57.33.249:3001/api/sirketler';

  
  const [viewMode, setViewMode] = useState('list');
  const [alislar, setAlislar] = useState([]);
  const [sirketler, setSirketler] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [selectedSirketCurrency, setSelectedSirketCurrency] = useState('TRY');
  const [year, setYear] = useState(2026);

  
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    firma: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('hepsi');
  const [searchFieldDropdownOpen, setSearchFieldDropdownOpen] = useState(false);

  
  const initialFormData = {
    sirketId: '',
    alisTarihi: new Date().toISOString().split('T')[0],
    urunler: [{ urunAdi: '', aciklama: '', adet: '', birimFiyat: '' }],
    alisNo: null,
  };
  const [formData, setFormData] = useState(initialFormData);
  const [isDirty, setIsDirty] = useState(false);
  const formRef = useRef();

  
  const [selectedAlis, setSelectedAlis] = useState(null);

  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [alisToDelete, setAlisToDelete] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [emailConfirmationModal, setEmailConfirmationModal] = useState({
    isOpen: false,
    alisData: null
  });
  const [savedAlis, setSavedAlis] = useState(null);
  const [isEmailSending, setIsEmailSending] = useState(false);

  
  const [isExporting, setIsExporting] = useState(false);

  
  useEffect(() => {
    if (formData.sirketId && sirketler.length > 0) {
      const selectedSirket = sirketler.find(s => s._id === formData.sirketId);
      if (selectedSirket) {
        setSelectedSirketCurrency(selectedSirket.sirketCariBirimi || 'TRY');
      }
    }
  }, [formData.sirketId, sirketler]);

  const formatCurrency = (amount, currencyCode = selectedSirketCurrency) => {
    const code = currencyCode || 'TRY';
    const currencySymbol = code === 'USD' ? '$' : code === 'EUR' ? '€' : '₺';

    if (isNaN(amount) || amount === null) return `0,00 ${currencySymbol}`;

    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currencySymbol}`;
  };

  
  useEffect(() => {
    fetchData();
    loadExternalScripts().then(() => {
      setScriptsLoaded(true);
    });
  }, [year]);

  const fetchData = async () => {
    try {
      const [alisRes, sirketRes] = await Promise.all([
        axios.get(API_BASE_URL_ALIS, { params: { year } }),
        axios.get(API_BASE_URL_SIRKET),
      ]);

      setAlislar(alisRes.data || []);
      
      const saticiSirketler = sirketRes.data?.filter(sirket => sirket.tip === 'satici') || [];
      setSirketler(saticiSirketler);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      toast.error('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  
  const filteredAlislar = Array.isArray(alislar)
    ? alislar.filter((alis) => {
      const matchesSearch = searchField === 'hepsi'
        ? Object.values(alis).some(value =>
          String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        : searchField === 'alisNo'
          ? String(alis.alisNo || '').toLowerCase().includes(searchTerm.toLowerCase())
          : searchField === 'firma'
            ? String(alis.sirketAdi || '').toLowerCase().includes(searchTerm.toLowerCase())
            : true;

      const matchesFilters = activeFilters.firma.length === 0 ||
        activeFilters.firma.includes(alis.sirketAdi);

      return matchesSearch && matchesFilters;
    })
    : [];

  const exportToExcel = async () => {
    if (!scriptsLoaded || !window.XLSX) {
      toast.error('Excel kütüphanesi yükleniyor, lütfen bekleyin...');
      return;
    }

    setIsExporting(true);
    try {
      const dataToExport = filteredAlislar.map((alis) => ({
        'Alış No': alis.alisNo,
        'Tarih': alis.alisTarihi ? new Date(alis.alisTarihi).toLocaleDateString('tr-TR') : '',
        'Firma': alis.sirketAdi,
        'Toplam Tutar': alis.toplamTutar,
        'Para Birimi': alis.sirketCariBirimi,
        'Ürünler': (alis.urunler || []).map(u => u.urunAdi).join(', '),
      }));

      const ws = window.XLSX.utils.json_to_sheet(dataToExport);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Alışlar');

      ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 40 }
      ];

      window.XLSX.writeFile(wb, `urun_alislari_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel dosyası başarıyla indirildi!');
    } catch (error) {
      console.error('Excel export hatası:', error);
      toast.error('Excel dosyası oluşturulurken hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!scriptsLoaded || !window.jsPDF) {
      toast.error('PDF kütüphanesi yükleniyor, lütfen bekleyin...');
      return;
    }

    setIsExporting(true);
    try {
      const { jsPDF } = window.jsPDF;
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text('Ürün Alış Raporu', 20, 20);

      doc.setFontSize(12);
      doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 35);
      doc.text(`Toplam Kayıt: ${filteredAlislar.length}`, 20, 45);

      let yPosition = 65;
      const pageHeight = doc.internal.pageSize.height;

      filteredAlislar.forEach((alis, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.text(`#${alis.alisNo} - ${alis.sirketAdi}`, 20, yPosition);

        doc.setFontSize(10);
        yPosition += 10;
        doc.text(`Tarih: ${alis.alisTarihi ? new Date(alis.alisTarihi).toLocaleDateString('tr-TR') : '-'}`, 20, yPosition);

        yPosition += 10;
        doc.text(`Toplam: ${formatCurrency(alis.toplamTutar, alis.sirketCariBirimi)}`, 20, yPosition);

        yPosition += 10;
        const urunler = (alis.urunler || []).map(u => u.urunAdi).join(', ');
        if (urunler) {
          const lines = doc.splitTextToSize(`Ürünler: ${urunler}`, 170);
          doc.text(lines, 20, yPosition);
          yPosition += lines.length * 5;
        }

        yPosition += 15;
      });

      doc.save(`urun_alislari_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF dosyası başarıyla indirildi!');
    } catch (error) {
      console.error('PDF export hatası:', error);
      toast.error('PDF dosyası oluşturulurken hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleUrunChange = (index, e) => {
    const { name, value } = e.target;
    const newUrunler = [...formData.urunler];
    newUrunler[index][name] = value;
    setFormData((prev) => ({ ...prev, urunler: newUrunler }));
    setIsDirty(true);
  };

  const handleAddUrun = () => {
    setFormData((prev) => ({
      ...prev,
      urunler: [...prev.urunler, { urunAdi: '', aciklama: '', adet: '', birimFiyat: '' }],
    }));
    setIsDirty(true);
  };

  const handleRemoveUrun = (index) => {
    const newUrunler = formData.urunler.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, urunler: newUrunler }));
    setIsDirty(true);
  };

  const calculateTotal = () => {
    return formData.urunler.reduce((total, urun) => {
      const adet = parseFloat(urun.adet) || 0;
      const birimFiyat = parseFloat(urun.birimFiyat) || 0;
      return total + adet * birimFiyat;
    }, 0);
  };

  
  const handleEmailConfirmation = (alisData) => {
    setEmailConfirmationModal({
      isOpen: true,
      alisData
    });
  };

  const handleSendEmail = async (alisId) => {
    setIsEmailSending(true);
    try {
      const result = await sendEmailNotification(alisId);
      toast.success(`Email başarıyla gönderildi! (${result.sentTo.length} alıcı)`);

      
      setAlislar(prev =>
        prev.map(a =>
          a._id === alisId
            ? { ...a, emailGonderildi: true, emailGonderimTarihi: new Date() }
            : a
        )
      );

      setEmailConfirmationModal({ isOpen: false, alisData: null });
    } catch (error) {
      console.error('Email gönderme hatası:', error);
      toast.error(error.msg || 'Email gönderilirken bir hata oluştu.');
    } finally {
      setIsEmailSending(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      
      const hasInvalidProduct =
        formData.urunler.length === 0 ||
        formData.urunler.some(
          (u) =>
            !u.urunAdi ||
            (parseFloat(u.adet) || 0) <= 0 ||
            (parseFloat(u.birimFiyat) || 0) <= 0
        );

      if (!formData.sirketId || hasInvalidProduct) {
        toast.error('Lütfen tüm zorunlu alanları doldurun ve ürünleri doğru girin.');
        return;
      }

      if (formData.alisTarihi > new Date().toISOString().split('T')[0]) {
        toast.error('Alış tarihi bugünden ileri bir tarih olamaz.');
        return;
      }

      
      const selectedSirket = sirketler.find(s => s._id === formData.sirketId);
      if (!selectedSirket) {
        toast.error('Geçersiz şirket seçimi.');
        return;
      }

      
      const toplamTutar = calculateTotal();

      const payload = {
        ...formData,
        urunler: formData.urunler.map((urun) => ({
          ...urun,
          adet: parseFloat(urun.adet) || 0,
          birimFiyat: parseFloat(urun.birimFiyat) || 0,
        })),
        toplamTutar: toplamTutar,
        sirketAdi: selectedSirket.sirketAdi,
        sirketCariBirimi: selectedSirket.sirketCariBirimi || 'TRY'
      };

      let savedData;
      if (viewMode === 'edit' && selectedAlis?._id) {
        const { alisNo, ...updatePayload } = payload;
        const response = await axios.put(`${API_BASE_URL_ALIS}/${selectedAlis._id}`, updatePayload);
        savedData = response.data.alis;
        toast.success('Alış başarıyla güncellendi!');
      } else {
        const { alisNo, ...newPayload } = payload;
        const response = await axios.post(API_BASE_URL_ALIS, newPayload);
        savedData = response.data.alis;
        toast.success('Alış başarıyla eklendi!');

        
        handleEmailConfirmation(savedData);
      }

      
      await fetchData();

      
      setFormData(initialFormData);
      setIsDirty(false);
      setViewMode('list');
      setSelectedAlis(null);
      setSavedAlis(savedData);

    } catch (err) {
      console.error('Kayıt hatası:', err);
      toast.error(err.response?.data?.msg || 'Alış kaydedilirken bir hata oluştu.');
    }
  };

  
  const handleDelete = async () => {
    if (!alisToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL_ALIS}/${alisToDelete._id}`);
      toast.success('Alış başarıyla silindi!');
      await fetchData();
      setDeleteModalOpen(false);
      setAlisToDelete(null);
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Alış silinirken bir hata oluştu.');
    }
  };

  
  const handleEdit = (alis) => {
    setFormData({
      sirketId: alis.sirketId,
      alisTarihi: alis.alisTarihi ? new Date(alis.alisTarihi).toISOString().split('T')[0] : '',
      urunler: alis.urunler || [{ urunAdi: '', aciklama: '', adet: '', birimFiyat: '' }],
      alisNo: alis.alisNo,
    });
    setSelectedAlis(alis);
    setViewMode('edit');
    setIsDirty(false);
  };

  const handleView = (alis) => {
    setSelectedAlis(alis);
    setViewModalOpen(true);
  };

  const searchFieldOptions = [
    { value: 'hepsi', label: 'Hepsinde Ara' },
    { value: 'alisNo', label: 'Alış No' },
    { value: 'firma', label: 'Firma Adı' },
  ];

  
  return (
    <div className="urun-alis-container">
      {}
      <div className="urun-alis-header">
        <div className="urun-alis-title-container">
          <h1>Ürün Alış Yönetimi</h1>
          <p>Ürün alış kayıtlarını görüntüleyin, ekleyin ve yönetin</p>
        </div>
        <div className="urun-alis-actions">
          {viewMode === 'list' && (
            <>
              <button
                className="urun-alis-btn urun-alis-btn-primary"
                onClick={() => setViewMode('add')}
              >
                <ShoppingBag size={20} />
                Yeni Alış
              </button>
              <div className="export-buttons">
                <button
                  className="urun-alis-btn urun-alis-btn-success"
                  onClick={exportToExcel}
                  disabled={isExporting || !scriptsLoaded}
                >
                  {isExporting ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  Excel
                </button>
                <button
                  className="urun-alis-btn urun-alis-btn-warning"
                  onClick={exportToPDF}
                  disabled={isExporting || !scriptsLoaded}
                >
                  {isExporting ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <Download size={16} />
                  )}
                  PDF
                </button>
              </div>
            </>
          )}
          {(viewMode === 'add' || viewMode === 'edit') && (
            <button
              className="urun-alis-btn urun-alis-btn-secondary"
              onClick={() => {
                if (isDirty) {
                  if (window.confirm('Değişiklikler kaybedilecek. Devam etmek istiyor musunuz?')) {
                    setViewMode('list');
                    setSelectedAlis(null);
                    setFormData(initialFormData);
                    setIsDirty(false);
                  }
                } else {
                  setViewMode('list');
                  setSelectedAlis(null);
                  setFormData(initialFormData);
                }
              }}
            >
              <XCircle size={20} />
              Geri Dön
            </button>
          )}
        </div>
      </div>

      {}
      {isLoading ? (
        <div className="loading-container" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }}></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {}
          {viewMode === 'list' && (
            <div className="urun-alis-list-view">
              {}
              <div className="search-filter-container">
                <div className="search-bar">
                  <Search size={20} />
                  <input
                    type="text"
                    placeholder={`${searchFieldOptions.find(opt => opt.value === searchField)?.label || 'Hepsinde Ara'} için yazın...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="search-field-dropdown-container">
                  <button
                    className="search-field-button"
                    onClick={() => setSearchFieldDropdownOpen(!searchFieldDropdownOpen)}
                  >
                    {searchFieldOptions.find(opt => opt.value === searchField)?.label}
                    <ChevronDown size={16} />
                  </button>
                  {searchFieldDropdownOpen && (
                    <div className="search-field-dropdown">
                      {searchFieldOptions.map((option) => (
                        <div
                          key={option.value}
                          onClick={() => {
                            setSearchField(option.value);
                            setSearchFieldDropdownOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <select 
                  value={year} 
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="year-select"
                >
                  <option value={2025}>📗 2025 (Arşiv)</option>
                  <option value={2026}>📘 2026 (Aktif)</option>
                </select>
              </div>

              {}
              <div className="urun-alis-table-container">
                {filteredAlislar.length > 0 ? (
                  <table className="urun-alis-table">
                    <thead>
                      <tr>
                        <th>Alış No</th>
                        <th>Tarih</th>
                        <th>Satıcı Firma</th>
                        <th>Toplam Tutar</th>
                        <th>Email Durumu</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlislar.map((alis) => (
                        <tr key={alis._id}>
                          <td>#{alis.alisNo}</td>
                          <td>
                            {alis.alisTarihi
                              ? new Date(alis.alisTarihi).toLocaleDateString('tr-TR')
                              : '-'
                            }
                          </td>
                          <td>{alis.sirketAdi || 'Bilinmiyor'}</td>
                          <td>{formatCurrency(alis.toplamTutar, alis.sirketCariBirimi)}</td>
                          <td>
                            {alis.emailGonderildi ? (
                              <span className="status-badge sent">
                                <CheckCircle size={14} />
                                Gönderildi
                              </span>
                            ) : (
                              <span className="status-badge pending">
                                <Clock size={14} />
                                Bekliyor
                              </span>
                            )}
                          </td>
                          <td className="urun-alis-actions-cell">
                            <button
                              onClick={() => handleView(alis)}
                              title="Görüntüle"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(alis)}
                              title="Düzenle"
                            >
                              <PencilLine size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setAlisToDelete(alis);
                                setDeleteModalOpen(true);
                              }}
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                            {!alis.emailGonderildi && (
                              <button
                                onClick={() => handleEmailConfirmation(alis)}
                                title="Email Gönder"
                                style={{ color: 'var(--info-color)' }}
                              >
                                <Mail size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data">
                    <ShoppingBag size={48} />
                    <p>Ürün alışı bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {}
          {(viewMode === 'add' || viewMode === 'edit') && (
            <div className="urun-alis-form-view">
              <h3>{viewMode === 'edit' ? 'Alış Düzenle' : 'Yeni Alış Ekle'}</h3>

              <form className="urun-alis-form" onSubmit={handleSave} ref={formRef}>
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="sirketId">Satıcı Firma *</label>
                    <select
                      id="sirketId"
                      name="sirketId"
                      value={formData.sirketId}
                      onChange={handleFormChange}
                      className="form-control"
                      required
                    >
                      <option value="">Satıcı firma seçin...</option>
                      {sirketler.map((sirket) => (
                        <option key={sirket._id} value={sirket._id}>
                          {sirket.sirketAdi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="alisTarihi">Alış Tarihi *</label>
                    <input
                      type="date"
                      id="alisTarihi"
                      name="alisTarihi"
                      value={formData.alisTarihi}
                      onChange={handleFormChange}
                      className="form-control"
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                {}
                <div className="urun-list-container">
                  <h3>Alınan Ürünler</h3>

                  <div className="urun-list-headers">
                    <div>Ürün Adı *</div>
                    <div>Açıklama</div>
                    <div>Adet *</div>
                    <div>Birim Fiyat *</div>
                    <div>Toplam</div>
                    <div>İşlem</div>
                  </div>

                  {formData.urunler.map((urun, index) => (
                    <div key={index} className="urun-row">
                      <div className="form-group">
                        <input
                          type="text"
                          name="urunAdi"
                          value={urun.urunAdi}
                          onChange={(e) => handleUrunChange(index, e)}
                          placeholder="Ürün adı"
                          className="form-control"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="text"
                          name="aciklama"
                          value={urun.aciklama}
                          onChange={(e) => handleUrunChange(index, e)}
                          placeholder="Ürün açıklaması"
                          className="form-control"
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="number"
                          name="adet"
                          value={urun.adet}
                          onChange={(e) => handleUrunChange(index, e)}
                          placeholder="Adet"
                          className="form-control"
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="number"
                          name="birimFiyat"
                          value={urun.birimFiyat}
                          onChange={(e) => handleUrunChange(index, e)}
                          placeholder="Birim fiyat"
                          className="form-control"
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>

                      <div className="toplam-cell">
                        {formatCurrency(
                          (parseFloat(urun.adet) || 0) * (parseFloat(urun.birimFiyat) || 0)
                        )}
                      </div>

                      <div className="action-cell">
                        {formData.urunler.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUrun(index)}
                            className="remove-urun-btn"
                            title="Ürünü Kaldır"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="urun-actions">
                    <button
                      type="button"
                      onClick={handleAddUrun}
                      className="urun-alis-btn urun-alis-btn-secondary"
                    >
                      <PlusCircle size={16} />
                      Ürün Ekle
                    </button>
                  </div>
                </div>

                {}
                <div className="total-summary">
                  <div className="total-row">
                    <span>Toplam Tutar:</span>
                    <span className="total-amount">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                {}
                <div className="form-actions">
                  <button
                    type="button"
                    className="urun-alis-btn urun-alis-btn-secondary"
                    onClick={() => {
                      if (isDirty) {
                        if (window.confirm('Değişiklikler kaybedilecek. Devam etmek istiyor musunuz?')) {
                          setViewMode('list');
                          setSelectedAlis(null);
                          setFormData(initialFormData);
                          setIsDirty(false);
                        }
                      } else {
                        setViewMode('list');
                        setSelectedAlis(null);
                        setFormData(initialFormData);
                      }
                    }}
                  >
                    <X size={16} />
                    İptal
                  </button>

                  <button
                    type="submit"
                    className="urun-alis-btn urun-alis-btn-success"
                  >
                    <CheckCircle size={16} />
                    {viewMode === 'edit' ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {}
      {viewModalOpen && selectedAlis && (
        <div className="urun-alis-modal">
          <div className="urun-alis-modal-content view-modal">
            <div className="urun-alis-modal-header">
              <h3>Alış Detayları - #{selectedAlis.alisNo}</h3>
              <button onClick={() => setViewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="urun-alis-modal-body">
              <div className="view-details">
                <div className="detail-group">
                  <label>Satıcı Firma:</label>
                  <span>{selectedAlis.sirketAdi}</span>
                </div>

                <div className="detail-group">
                  <label>Alış Tarihi:</label>
                  <span>
                    {selectedAlis.alisTarihi
                      ? new Date(selectedAlis.alisTarihi).toLocaleDateString('tr-TR')
                      : '-'
                    }
                  </span>
                </div>

                <div className="detail-group">
                  <label>Email Durumu:</label>
                  <span>
                    {selectedAlis.emailGonderildi ? (
                      <span className="status-badge sent">
                        <CheckCircle size={14} />
                        Gönderildi
                        {selectedAlis.emailGonderimTarihi && (
                          <small>
                            ({new Date(selectedAlis.emailGonderimTarihi).toLocaleDateString('tr-TR')})
                          </small>
                        )}
                      </span>
                    ) : (
                      <span className="status-badge pending">
                        <Clock size={14} />
                        Gönderilmedi
                      </span>
                    )}
                  </span>
                </div>

                <div className="detail-group full-width">
                  <label>Alınan Ürünler:</label>
                  <div className="urun-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Ürün</th>
                          <th>Açıklama</th>
                          <th>Adet</th>
                          <th>Birim Fiyat</th>
                          <th>Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedAlis.urunler || []).map((urun, index) => (
                          <tr key={index}>
                            <td>{urun.urunAdi}</td>
                            <td>{urun.aciklama || '-'}</td>
                            <td>{urun.adet}</td>
                            <td>{formatCurrency(urun.birimFiyat, selectedAlis.sirketCariBirimi)}</td>
                            <td>{formatCurrency(urun.adet * urun.birimFiyat, selectedAlis.sirketCariBirimi)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="4"><strong>Genel Toplam:</strong></td>
                          <td><strong>{formatCurrency(selectedAlis.toplamTutar, selectedAlis.sirketCariBirimi)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="urun-alis-modal-actions">
              <button
                className="urun-alis-btn urun-alis-btn-secondary"
                onClick={() => setViewModalOpen(false)}
              >
                <X size={16} />
                Kapat
              </button>

              <button
                className="urun-alis-btn urun-alis-btn-primary"
                onClick={() => {
                  setViewModalOpen(false);
                  handleEdit(selectedAlis);
                }}
              >
                <PencilLine size={16} />
                Düzenle
              </button>

              {!selectedAlis.emailGonderildi && (
                <button
                  className="urun-alis-btn urun-alis-btn-info"
                  onClick={() => {
                    setViewModalOpen(false);
                    handleEmailConfirmation(selectedAlis);
                  }}
                >
                  <Mail size={16} />
                  Email Gönder
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {deleteModalOpen && (
        <div className="urun-alis-modal">
          <div className="urun-alis-modal-content">
            <div className="urun-alis-modal-header">
              <h3>Alış Kaydını Sil</h3>
            </div>

            <div className="urun-alis-modal-body">
              <div className="delete-confirmation">
                <AlertCircle size={48} color="#dc3545" />
                <p>
                  <strong>#{alisToDelete?.alisNo}</strong> numaralı alış kaydını silmek istediğinizden emin misiniz?
                </p>
                <p className="warning-text">Bu işlem geri alınamaz!</p>
              </div>
            </div>

            <div className="urun-alis-modal-actions">
              <button
                className="urun-alis-btn urun-alis-btn-secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setAlisToDelete(null);
                }}
              >
                <X size={16} />
                İptal
              </button>

              <button
                className="urun-alis-btn urun-alis-btn-danger"
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      <EmailConfirmationModal
        isOpen={emailConfirmationModal.isOpen}
        onClose={() => setEmailConfirmationModal({ isOpen: false, alisData: null })}
        onConfirm={() => handleSendEmail(emailConfirmationModal.alisData._id)}
        alisData={emailConfirmationModal.alisData}
        isLoading={isEmailSending}
      />

      {}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
    </div>
  );
}

export default UrunAlis;