import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  XCircle,
  ChevronDown,
  PencilLine,
  PlusCircle,
  Trash2,
  Eye,
  Plus,
  Printer,
  Download,
  Users,
  TrendingUp,
  DollarSign,
  Package,
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Calendar,
  FileText
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const API_BASE_URL_ISCILIK = 'http://31.57.33.249:3001/api/iscilikler';
const API_BASE_URL_FASONCU = 'http://31.57.33.249:3001/api/fasoncular';
const API_BASE_URL_ODEME = 'http://31.57.33.249:3001/api/fasonodeme'; // Ödeme API endpoint'i

function IscilikYonetimi() {
  const [viewMode, setViewMode] = useState('fasoncular'); // fasoncular, detay, yeniIscilik, yeniOdeme, yeniFasoncu, odemeler
  const [fasoncular, setFasoncular] = useState([]);
  const [iscilikler, setIscilikler] = useState([]);
  const [odemeler, setOdemeler] = useState([]);
  const [selectedFasoncu, setSelectedFasoncu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtreler
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [modelFilter, setModelFilter] = useState('');
  
  // Yeni işçilik formu
  const [iscilikDetaylari, setIscilikDetaylari] = useState([
    { model: '', adet: '', birimFiyat: '', not: '' }
  ]);
  const [selectedFasoncuId, setSelectedFasoncuId] = useState('');
  const [iscilikTarihi, setIscilikTarihi] = useState(new Date().toISOString().split('T')[0]);
  
  // Yeni ödeme formu
  const [odemeTutari, setOdemeTutari] = useState('');
  const [odemeTarihi, setOdemeTarihi] = useState(new Date().toISOString().split('T')[0]);
  const [odemeNotu, setOdemeNotu] = useState('');
  const [odemeYontemi, setOdemeYontemi] = useState('Nakit');
  
  // Yeni fasoncu formu
  const [yeniFasoncu, setYeniFasoncu] = useState({
    fasoncuAdi: '',
    paraBirimi: 'TL',
    telefon: '',
    adres: '',
    notlar: ''
  });
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIscilik, setSelectedIscilik] = useState(null);

  // Veri çekme
  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('Veri çekme başlıyor...');
      
      const [fasoncuRes, iscilikRes, odemeRes] = await Promise.all([
        axios.get(API_BASE_URL_FASONCU),
        axios.get(API_BASE_URL_ISCILIK),
        axios.get(API_BASE_URL_ODEME) // Ödeme verilerini de çek
      ]);

      console.log('API Yanıtları:', { fasoncuRes, iscilikRes, odemeRes });

      // Veri yapısını daha güvenli şekilde işle
      const fasoncuData = fasoncuRes.data?.data || fasoncuRes.data || [];
      const iscilikData = iscilikRes.data?.data || iscilikRes.data || [];
      const odemeData = odemeRes.data?.data || odemeRes.data || [];

      console.log('İşlenen veriler:', { fasoncuData, iscilikData, odemeData });

      setFasoncular(Array.isArray(fasoncuData) ? fasoncuData : []);
      setIscilikler(Array.isArray(iscilikData) ? iscilikData : []);
      setOdemeler(Array.isArray(odemeData) ? odemeData : []);
      
      if (fasoncuData.length > 0 && !selectedFasoncu) {
        setSelectedFasoncuId(fasoncuData[0]._id);
      }

    } catch (e) {
      console.error('Veri çekme hatası:', e);
      console.error('Hata detayı:', e.response?.data || e.message);
      alert('Veri çekilirken bir hata oluştu: ' + (e.response?.data?.message || e.message));
    } finally {
      console.log('Veri çekme tamamlandı, loading false yapılıyor');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Component mount oldu, veri çekiliyor...');
    fetchData();
  }, []);

  // Para formatı
  const formatCurrency = (amount, currency = 'TL') => {
    if (isNaN(amount) || amount === null) return `0,00 ${currency}`;
    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`;
  };

  // Fasoncu seçildiğinde işçilikleri filtrele
  const fasoncuIscilikler = useMemo(() => {
    if (!selectedFasoncu || !selectedFasoncu._id) return [];
    
    console.log('Filtreleme başlıyor - Fasoncu ID:', selectedFasoncu._id);
    
    const filtered = iscilikler.filter(i => {
      const fasoncuMatch = i.fasoncuId === selectedFasoncu._id;
      console.log(`İşçilik ${i._id} - fasoncuId: ${i.fasoncuId}, match: ${fasoncuMatch}`);
      
      const searchMatch = !searchTerm || 
        i.urunler?.some(u => u.model?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const dateMatch = (!dateFilter.start || new Date(i.iscilikTarihi) >= new Date(dateFilter.start)) &&
                       (!dateFilter.end || new Date(i.iscilikTarihi) <= new Date(dateFilter.end));
      
      const modelMatch = !modelFilter || 
        i.urunler?.some(u => u.model?.toLowerCase().includes(modelFilter.toLowerCase()));
      
      return fasoncuMatch && searchMatch && dateMatch && modelMatch;
    });
    
    console.log('Filtrelenmiş işçilikler:', filtered);
    return filtered;
  }, [iscilikler, selectedFasoncu, searchTerm, dateFilter, modelFilter]);

  // Fasoncu seçildiğinde ödemeleri filtrele
  const fasoncuOdemeler = useMemo(() => {
    if (!selectedFasoncu || !selectedFasoncu._id) return [];
    
    return odemeler.filter(o => {
      // Eğer fasoncuId object ise _id'yi kontrol et, değilse direkt karşılaştır
      const fasoncuMatch = o.fasoncuId?._id === selectedFasoncu._id || o.fasoncuId === selectedFasoncu._id;
      return fasoncuMatch;
    });
  }, [odemeler, selectedFasoncu]);

  // İstatistikler
  const calculateStats = () => {
    if (!selectedFasoncu || fasoncuIscilikler.length === 0) return { 
      toplamIscilik: 0, 
      toplamTutar: 0, 
      toplamAdet: 0, 
      toplamOdenen: 0, 
      bakiye: 0 
    };

    console.log('İstatistik hesaplanıyor - işçilik sayısı:', fasoncuIscilikler.length);

    const toplamIscilik = fasoncuIscilikler.length;
    const toplamTutar = fasoncuIscilikler.reduce((sum, i) => {
      const tutar = i.toplamTutar || i.urunler?.reduce((urunSum, u) => urunSum + (u.adet * u.birimFiyat), 0) || 0;
      console.log(`İşçilik ${i._id} toplam tutar:`, tutar);
      return sum + tutar;
    }, 0);
    
    const toplamAdet = fasoncuIscilikler.reduce((sum, i) => {
      const adet = i.toplamAdet || i.urunler?.reduce((urunSum, u) => urunSum + (u.adet || 0), 0) || 0;
      return sum + adet;
    }, 0);
    
    // Ödeme toplamını hesapla
    const toplamOdenen = fasoncuOdemeler.reduce((sum, o) => {
      return sum + (o.tutar || 0);
    }, 0);
    
    const bakiye = toplamTutar - toplamOdenen;

    console.log('Hesaplanan istatistikler:', { toplamIscilik, toplamTutar, toplamAdet, toplamOdenen, bakiye });

    return { toplamIscilik, toplamTutar, toplamAdet, toplamOdenen, bakiye };
  };

  const stats = calculateStats();

  // Fasoncu detayına git
  const handleFasoncuClick = (fasoncu) => {
    setSelectedFasoncu(fasoncu);
    setViewMode('detay');
    setSearchTerm('');
    setDateFilter({ start: '', end: '' });
    setModelFilter('');
  };

  // Geri dön
  const handleBack = () => {
    setSelectedFasoncu(null);
    setViewMode('fasoncular');
  };

  // Yeni fasoncu işlemleri
  const handleOpenYeniFasoncu = () => {
    setYeniFasoncu({
      fasoncuAdi: '',
      paraBirimi: 'TL',
      telefon: '',
      adres: '',
      notlar: ''
    });
    setViewMode('yeniFasoncu');
  };

  const handleSubmitFasoncu = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(API_BASE_URL_FASONCU, yeniFasoncu);
      alert('Fasoncu başarıyla eklendi!');
      
      setYeniFasoncu({
        fasoncuAdi: '',
        paraBirimi: 'TL',
        telefon: '',
        adres: '',
        notlar: ''
      });
      setViewMode('fasoncular');
      fetchData();
    } catch (err) {
      console.error("Fasoncu kaydederken hata:", err);
      alert('İşlem sırasında bir hata oluştu: ' + (err.response?.data?.msg || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // İşçilik işlemleri
  const handleAddRow = () => {
    setIscilikDetaylari([
      ...iscilikDetaylari,
      { model: '', adet: '', birimFiyat: '', not: '' }
    ]);
  };

  const handleRemoveRow = (index) => {
    if (iscilikDetaylari.length > 1) {
      const newRows = [...iscilikDetaylari];
      newRows.splice(index, 1);
      setIscilikDetaylari(newRows);
    }
  };

  const handleCellChange = (e, rowIndex, fieldName) => {
    const { value } = e.target;
    const newRows = [...iscilikDetaylari];
    newRows[rowIndex][fieldName] = value;
    setIscilikDetaylari(newRows);
  };

  const calculateRowTotal = (row) => {
    const adet = parseInt(row.adet) || 0;
    const birimFiyat = parseFloat(row.birimFiyat) || 0;
    return adet * birimFiyat;
  };

  const toplamTutar = iscilikDetaylari.reduce((acc, row) => {
    return acc + calculateRowTotal(row);
  }, 0);

  const handleSubmitIscilik = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        fasoncuId: selectedFasoncu._id,
        iscilikTarihi,
        urunler: iscilikDetaylari.map(item => ({
          model: item.model,
          adet: parseInt(item.adet) || 0,
          birimFiyat: parseFloat(item.birimFiyat) || 0,
          not: item.not
        }))
      };

      await axios.post(API_BASE_URL_ISCILIK, payload);
      alert('İşçilik başarıyla eklendi!');
      
      setIscilikDetaylari([{ model: '', adet: '', birimFiyat: '', not: '' }]);
      setIscilikTarihi(new Date().toISOString().split('T')[0]);
      setViewMode('detay');
      fetchData();
    } catch (err) {
      console.error("İşçilik kaydederken hata:", err);
      alert('İşlem sırasında bir hata oluştu: ' + (err.response?.data?.msg || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIscilik = async (iscilikId) => {
    if (window.confirm('Bu işçiliği silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_BASE_URL_ISCILIK}/${iscilikId}`);
        alert('İşçilik başarıyla silindi!');
        fetchData();
      } catch (err) {
        console.error('İşçilik silinirken hata:', err);
        alert('İşçilik silinirken bir hata oluştu.');
      }
    }
  };

  // Ödeme işlemleri
  const handleSubmitOdeme = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        fasoncuId: selectedFasoncu._id,
        tutar: parseFloat(odemeTutari),
        odemeTarihi,
        odemeYontemi,
        not: odemeNotu
      };

      await axios.post(API_BASE_URL_ODEME, payload);
      alert('Ödeme başarıyla eklendi!');
      
      setOdemeTutari('');
      setOdemeTarihi(new Date().toISOString().split('T')[0]);
      setOdemeNotu('');
      setOdemeYontemi('Nakit');
      setViewMode('detay');
      fetchData();
    } catch (err) {
      console.error("Ödeme kaydederken hata:", err);
      alert('İşlem sırasında bir hata oluştu: ' + (err.response?.data?.msg || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOdeme = async (odemeId) => {
    if (window.confirm('Bu ödemeyi silmek istediğinize emin misiniz?')) {
      try {
        await axios.delete(`${API_BASE_URL_ODEME}/${odemeId}`);
        alert('Ödeme başarıyla silindi!');
        fetchData();
      } catch (err) {
        console.error('Ödeme silinirken hata:', err);
        alert('Ödeme silinirken bir hata oluştu.');
      }
    }
  };

  const handleOpenViewModal = (iscilik) => {
    setSelectedIscilik(iscilik);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIscilik(null);
  };

  // Ödemeler sayfasına git
  const handleOpenOdemeler = () => {
    setViewMode('odemeler');
  };

  // Excel export
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('İşçilik Detayı');

    ws.columns = [
      { header: 'İşçilik No', key: 'iscilikNo', width: 15 },
      { header: 'Tarih', key: 'tarih', width: 15 },
      { header: 'Model', key: 'model', width: 30 },
      { header: 'Adet', key: 'adet', width: 10 },
      { header: 'Birim Fiyat', key: 'birimFiyat', width: 15 },
      { header: 'Toplam', key: 'toplam', width: 15 },
      { header: 'Not', key: 'not', width: 30 }
    ];

    fasoncuIscilikler.forEach(iscilik => {
      iscilik.urunler?.forEach(urun => {
        ws.addRow({
          iscilikNo: iscilik.iscilikNo,
          tarih: new Date(iscilik.iscilikTarihi).toLocaleDateString('tr-TR'),
          model: urun.model,
          adet: urun.adet,
          birimFiyat: urun.birimFiyat,
          toplam: urun.adet * urun.birimFiyat,
          not: urun.not
        });
      });
    });

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `${selectedFasoncu.fasoncuAdi}_iscilikler.xlsx`);
  };

  // PDF export
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(`${selectedFasoncu.fasoncuAdi} - İşçilik Raporu`, 14, 20);
    
    const tableData = [];
    fasoncuIscilikler.forEach(iscilik => {
      iscilik.urunler?.forEach(urun => {
        tableData.push([
          iscilik.iscilikNo,
          new Date(iscilik.iscilikTarihi).toLocaleDateString('tr-TR'),
          urun.model,
          urun.adet,
          urun.birimFiyat.toFixed(2),
          (urun.adet * urun.birimFiyat).toFixed(2),
          urun.not
        ]);
      });
    });

    doc.autoTable({
      startY: 30,
      head: [['İşçilik No', 'Tarih', 'Model', 'Adet', 'Birim Fiyat', 'Toplam', 'Not']],
      body: tableData
    });

    doc.save(`${selectedFasoncu.fasoncuAdi}_iscilikler.pdf`);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '3rem 2rem',
        borderRadius: '12px',
        marginBottom: '24px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: 0, marginBottom: '8px' }}>
          <Users size={32} style={{ verticalAlign: 'middle', marginRight: '12px' }} />
          İşçilik Yönetim Sistemi
        </h1>
        <p style={{ opacity: 0.9, margin: 0 }}>Fasoncu ve İşçilik Takip Paneli</p>
      </div>

      {/* Fasoncular Listesi */}
      {viewMode === 'fasoncular' && (
        <>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Fasoncular</h2>
            <button
              onClick={handleOpenYeniFasoncu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              <Plus size={18} />
              Yeni Fasoncu
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {fasoncular.map(fasoncu => (
              <div
                key={fasoncu._id}
                onClick={() => handleFasoncuClick(fasoncu)}
                style={{
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginRight: '12px'
                  }}>
                    {fasoncu.fasoncuAdi.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{fasoncu.fasoncuAdi}</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>Para Birimi: {fasoncu.paraBirimi}</p>
                  </div>
                </div>
                
                <div style={{ 
                  padding: '12px', 
                  background: '#f9fafb', 
                  borderRadius: '8px',
                  marginTop: '12px'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Toplam Borç</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea', marginTop: '4px' }}>
                    {formatCurrency(fasoncu.toplamBorc || 0, fasoncu.paraBirimi)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Fasoncu Detay Sayfası */}
      {viewMode === 'detay' && selectedFasoncu && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            >
              <ArrowLeft size={18} />
              Geri
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>{selectedFasoncu.fasoncuAdi}</h2>
                <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Para Birimi: {selectedFasoncu.paraBirimi}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleOpenOdemeler}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <CreditCard size={18} />
                  Ödemeleri Görüntüle
                </button>
                <button
                  onClick={() => setViewMode('yeniIscilik')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <Plus size={18} />
                  Yeni İşçilik
                </button>
                <button
                  onClick={() => setViewMode('yeniOdeme')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  <CreditCard size={18} />
                  Ödeme Yap
                </button>
              </div>
            </div>
          </div>

          {/* İstatistikler */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Toplam İşçilik</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{stats.toplamIscilik}</div>
            </div>
            
            <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Toplam Tutar</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {formatCurrency(stats.toplamTutar, selectedFasoncu.paraBirimi)}
              </div>
            </div>
            
            <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Toplam Adet</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{stats.toplamAdet}</div>
            </div>
            
            <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Ödenen</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {formatCurrency(stats.toplamOdenen, selectedFasoncu.paraBirimi)}
              </div>
            </div>
            
            <div style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', padding: '20px', borderRadius: '12px', color: 'white' }}>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Bakiye</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                {formatCurrency(stats.bakiye, selectedFasoncu.paraBirimi)}
              </div>
            </div>
          </div>

          {/* Filtreler */}
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Model Ara
                </label>
                <input
                  type="text"
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  placeholder="Model adı..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => {
                    setModelFilter('');
                    setDateFilter({ start: '', end: '' });
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Temizle
                </button>
                <button
                  onClick={exportToExcel}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <Download size={16} style={{ verticalAlign: 'middle' }} />
                </button>
                <button
                  onClick={exportToPDF}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <Printer size={16} style={{ verticalAlign: 'middle' }} />
                </button>
              </div>
            </div>
          </div>

          {/* İşçilik Tablosu */}
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>İşçilik No</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Tarih</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Model</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>Adet</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>Birim Fiyat</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>Toplam</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {fasoncuIscilikler.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                        Henüz işçilik kaydı bulunmuyor
                      </td>
                    </tr>
                  ) : (
                    fasoncuIscilikler.map((iscilik) => 
                      iscilik.urunler?.map((urun, idx) => (
                        <tr key={`${iscilik._id}-${idx}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          {idx === 0 && (
                            <>
                              <td rowSpan={iscilik.urunler.length} style={{ padding: '12px 16px', fontWeight: 600 }}>
                                {iscilik.iscilikNo}
                              </td>
                              <td rowSpan={iscilik.urunler.length} style={{ padding: '12px 16px' }}>
                                {new Date(iscilik.iscilikTarihi).toLocaleDateString('tr-TR')}
                              </td>
                            </>
                          )}
                          <td style={{ padding: '12px 16px' }}>{urun.model}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>{urun.adet}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            {formatCurrency(urun.birimFiyat, selectedFasoncu.paraBirimi)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(urun.adet * urun.birimFiyat, selectedFasoncu.paraBirimi)}
                          </td>
                          {idx === 0 && (
                            <td rowSpan={iscilik.urunler.length} style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleOpenViewModal(iscilik)}
                                  style={{
                                    padding: '6px 10px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                  }}
                                  title="Görüntüle"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteIscilik(iscilik._id)}
                                  style={{
                                    padding: '6px 10px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                  }}
                                  title="Sil"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Ödemeler Sayfası */}
      {viewMode === 'odemeler' && selectedFasoncu && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setViewMode('detay')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '16px'
              }}
            >
              <ArrowLeft size={18} />
              Geri
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>{selectedFasoncu.fasoncuAdi} - Ödemeler</h2>
                <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Toplam Ödenen: {formatCurrency(stats.toplamOdenen, selectedFasoncu.paraBirimi)}</p>
              </div>
            </div>
          </div>

          {/* Ödemeler Tablosu */}
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Ödeme No</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Tarih</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>Tutar</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Yöntem</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Durum</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Not</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {fasoncuOdemeler.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        <CreditCard size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                        Henüz ödeme kaydı bulunmuyor
                      </td>
                    </tr>
                  ) : (
                    fasoncuOdemeler.map((odeme) => (
                      <tr key={odeme._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{odeme.odemeNo}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {new Date(odeme.odemeTarihi).toLocaleDateString('tr-TR')}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(odeme.tutar, selectedFasoncu.paraBirimi)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{odeme.odemeYontemi}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: odeme.durum === 'Onaylı' ? '#10b981' : '#f59e0b',
                            color: 'white'
                          }}>
                            {odeme.durum}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{odeme.not || '-'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteOdeme(odeme._id)}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Yeni Ödeme Formu */}
      {viewMode === 'yeniOdeme' && selectedFasoncu && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', maxWidth: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
              Ödeme Yap - {selectedFasoncu.fasoncuAdi}
            </h2>
            <button
              onClick={() => setViewMode('detay')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              İptal
            </button>
          </div>

          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Güncel Borç</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {formatCurrency(stats.bakiye, selectedFasoncu.paraBirimi)}
            </div>
          </div>

          <form onSubmit={handleSubmitOdeme}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ödeme Tutarı</label>
              <input
                type="number"
                value={odemeTutari}
                onChange={(e) => setOdemeTutari(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ödeme Tarihi</label>
              <input
                type="date"
                value={odemeTarihi}
                onChange={(e) => setOdemeTarihi(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ödeme Yöntemi</label>
              <select
                value={odemeYontemi}
                onChange={(e) => setOdemeYontemi(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="Nakit">Nakit</option>
                <option value="Banka Havalesi">Banka Havalesi</option>
                <option value="EFT">EFT</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Çek">Çek</option>
                <option value="Senet">Senet</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Not (Opsiyonel)</label>
              <textarea
                value={odemeNotu}
                onChange={(e) => setOdemeNotu(e.target.value)}
                placeholder="Ödeme notu..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setViewMode('detay')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Kaydediliyor...' : 'Ödeme Yap'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Yeni Ödeme Formu */}
      {viewMode === 'yeniOdeme' && selectedFasoncu && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', maxWidth: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
              Ödeme Yap - {selectedFasoncu.fasoncuAdi}
            </h2>
            <button
              onClick={() => setViewMode('detay')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              İptal
            </button>
          </div>

          <div style={{ 
            background: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Güncel Borç</div>
<div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
  {formatCurrency(
    stats.bakiye,
    selectedFasoncu.paraBirimi
  )}
</div>
          </div>

<form onSubmit={async (e) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const payload = {
      fasoncuId: selectedFasoncu._id,
      tutar: parseFloat(odemeTutari),
      odemeTarihi,
      odemeYontemi: 'Nakit',
      not: odemeNotu
    };

    const res = await axios.post("http://31.57.33.249:3001/api/fasonodeme", payload);

    if (res.data?.success) {
      alert('✅ Ödeme başarıyla eklendi!');
    } else {
      alert('⚠️ Ödeme eklenemedi: ' + (res.data?.msg || 'Bilinmeyen hata'));
    }

    // Formu sıfırla
    setOdemeTutari('');
    setOdemeNotu('');
    setOdemeTarihi(new Date().toISOString().split('T')[0]);
    setViewMode('detay');
    fetchData(); // verileri yeniden yükle

  } catch (err) {
    console.error('Ödeme eklenirken hata:', err);
    alert('❌ Hata: ' + (err.response?.data?.msg || err.message));
  } finally {
    setIsLoading(false);
  }
}}>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ödeme Tutarı</label>
              <input
                type="number"
                value={odemeTutari}
                onChange={(e) => setOdemeTutari(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Ödeme Tarihi</label>
              <input
                type="date"
                value={odemeTarihi}
                onChange={(e) => setOdemeTarihi(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Not (Opsiyonel)</label>
              <textarea
                value={odemeNotu}
                onChange={(e) => setOdemeNotu(e.target.value)}
                placeholder="Ödeme notu..."
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setViewMode('detay')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                İptal
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Ödeme Yap
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedIscilik && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
                  İşçilik Detayı - {selectedIscilik.iscilikNo}
                </h2>
                <button
                  onClick={handleCloseModal}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Fasoncu</p>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0' }}>{selectedIscilik.fasoncuAdi}</p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Tarih</p>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0' }}>
                    {new Date(selectedIscilik.iscilikTarihi).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Toplam Tutar</p>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0' }}>
                    {formatCurrency(selectedIscilik.toplamTutar || 0, selectedIscilik.paraBirimi)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Toplam Adet</p>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0' }}>{selectedIscilik.toplamAdet || 0}</p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Model</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Adet</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Birim Fiyat</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>Toplam</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIscilik.urunler?.map((urun, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{urun.model}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{urun.adet}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {formatCurrency(urun.birimFiyat, selectedIscilik.paraBirimi)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency((urun.adet * urun.birimFiyat), selectedIscilik.paraBirimi)}
                      </td>
                      <td style={{ padding: '12px' }}>{urun.not || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IscilikYonetimi;