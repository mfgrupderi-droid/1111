import React, { useState, useEffect } from 'react';
import { Search, Printer, FilePlus, FileText, XCircle, ChevronDown, PencilLine, PlusCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader, LoadingSpinner, ErrorAlert, SuccessAlert } from './SharedComponents';
import './Sevkiyat-New.css';
import { toast, ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Square, CheckSquare } from 'lucide-react';
function Sevkiyat() {
    const API_BASE_URL_SEVKIYAT = 'http://31.57.33.249:25565/api/sevkiyat';
    const API_BASE_URL_SIRKET = 'http://31.57.33.249:25565/api/sirketler';

    
    const [viewMode, setViewMode] = useState('list');
    const [sevkiyatlar, setSevkiyatlar] = useState([]);
    const [sirketler, setSirketler] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [activeFilters, setActiveFilters] = useState({
        firma: [],
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('hepsi');
    const [searchFieldDropdownOpen, setSearchFieldDropdownOpen] = useState(false);
    const [year, setYear] = useState(2026);

    
    const [selectedSevkiyat, setSelectedSevkiyat] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    
    const [sevkiyatDetaylari, setSevkiyatDetaylari] = useState([{
        urunAdi: '',
        aciklama: '',
        adet: 0,
        birimFiyat: 0,
    }]);
    const [toplamTutar, setToplamTutar] = useState(0);
    const [selectedSirket, setSelectedSirket] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const sirketResponse = await axios.get(API_BASE_URL_SIRKET);
            setSirketler(sirketResponse.data);

            const sevkiyatResponse = await axios.get(API_BASE_URL_SEVKIYAT, { params: { year } });
            const sevkiyatData = Array.isArray(sevkiyatResponse.data) ? sevkiyatResponse.data : [];
            
            const sevkiyatlarWithSirketAdi = sevkiyatData.map(sevkiyat => {
                const sirket = sirketResponse.data.find(s => s._id === sevkiyat.sirketId);
                return {
                    ...sevkiyat,
                    sirketAdi: sirket ? sirket.sirketAdi : 'Bilinmeyen Şirket',
                    sirketId: sevkiyat.sirketId 
                };
            });
            const sortedData = sevkiyatlarWithSirketAdi.sort((a, b) => new Date(b.sevkiyatTarihi) - new Date(a.sevkiyatTarihi));
            
            setSevkiyatlar(sortedData);
            if (sirketResponse.data.length > 0) setSelectedSirket(sirketResponse.data[0]._id);
        } catch (err) {
            console.error("Veri çekilirken hata oluştu:", err);
            setSevkiyatlar([]);
            toast.error("Veri çekilirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [year]);

    useEffect(() => {
        const total = sevkiyatDetaylari.reduce((acc, row) => {
            const adet = parseFloat(row.adet) || 0;
            const birimFiyat = parseFloat(row.birimFiyat) || 0;
            return acc + (adet * birimFiyat);
        }, 0);
        setToplamTutar(total);
    }, [sevkiyatDetaylari]);
    
    const filteredSevkiyatlar = sevkiyatlar.filter(sevkiyat => {
        const firmaMatches = activeFilters.firma.length === 0 || activeFilters.firma.includes(sevkiyat.sirketAdi);
        
        const searchMatches = searchTerm.toLowerCase() === '' || 
        (searchField === 'hepsi' && (
            sevkiyat.sirketAdi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sevkiyat.urunler && sevkiyat.urunler.some(detay => 
                (detay.urunAdi && detay.urunAdi.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (detay.aciklama && detay.aciklama.toLowerCase().includes(searchTerm.toLowerCase()))
            ))
        )) ||
        (searchField === 'firma' && sevkiyat.sirketAdi?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (searchField === 'urunAdi' && sevkiyat.urunler && sevkiyat.urunler.some(d => d.urunAdi?.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (searchField === 'aciklama' && sevkiyat.urunler && sevkiyat.urunler.some(d => d.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())));

        return firmaMatches && searchMatches;
    });

    const getUniqueValues = (field) => {
        const values = new Set();
        sevkiyatlar.forEach(s => {
            if (s[field]) values.add(s[field]);
        });
        return Array.from(values).sort();
    };

    const handleHeaderClick = (filterName) => {
        if (selectedFilter === filterName) {
            setSelectedFilter(null);
        } else {
            setSelectedFilter(filterName);
        }
    };

    const handleFilterToggle = (filterName, value) => {
        setActiveFilters(prevFilters => {
            const currentFilterArray = prevFilters[filterName];
            if (currentFilterArray.includes(value)) {
                return {
                    ...prevFilters,
                    [filterName]: currentFilterArray.filter(item => item !== value)
                };
            } else {
                return {
                    ...prevFilters,
                    [filterName]: [...currentFilterArray, value]
                };
            }
        });
    };
    
    const handleAddRow = () => {
        setSevkiyatDetaylari([...sevkiyatDetaylari, { 
            urunAdi: '', aciklama: '', adet: 0, birimFiyat: 0
        }]);
    };

    const handleRemoveRow = (index) => {
        if (sevkiyatDetaylari.length > 1) {
            const newRows = [...sevkiyatDetaylari];
            newRows.splice(index, 1);
            setSevkiyatDetaylari(newRows);
        }
    };

    const handleCellChange = (e, rowIndex, fieldName) => {
        const { value } = e.target;
        const newRows = [...sevkiyatDetaylari];
        newRows[rowIndex][fieldName] = value;
        setSevkiyatDetaylari(newRows);
    };
    
    const resetForm = () => {
        setSevkiyatDetaylari([{
            urunAdi: '', aciklama: '', adet: 0, birimFiyat: 0
        }]);
        setSelectedSirket(sirketler.length > 0 ? sirketler[0]._id : '');
        setSelectedSevkiyat(null);
    };

    const handleCancelUpdate = () => {
        resetForm();
        setViewMode('list');
        toast.info('Düzenleme işlemi iptal edildi.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const finalSevkiyatDetaylari = sevkiyatDetaylari.filter(item => item.urunAdi || item.aciklama || parseInt(item.adet) > 0 );
            if (finalSevkiyatDetaylari.length === 0) {
                toast.error('Lütfen en az bir ürün bilgisi girin.');
                setIsLoading(false);
                return;
            }
            const payload = { sirketId: selectedSirket, urunler: finalSevkiyatDetaylari };
            
            let response;
            if (selectedSevkiyat && selectedSevkiyat._id) {
                response = await axios.put(`${API_BASE_URL_SEVKIYAT}/${selectedSevkiyat._id}`, payload);
                if (response.status !== 200) throw new Error('Sevkiyat güncellenemedi');
                toast.success('Sevkiyat başarıyla güncellendi!');
            } else {
                response = await axios.post(API_BASE_URL_SEVKIYAT, payload);
                if (response.status !== 201) throw new Error('Sevkiyat kaydedilemedi');
                toast.success('Sevkiyat başarıyla eklendi!');
            }
            
            setViewMode('list');
            fetchData();
            resetForm();
        } catch (err) {
            console.error("Sevkiyat kaydederken/güncellerken hata:", err);
            toast.error('İşlem sırasında bir hata oluştu: ' + (err.response?.data?.msg || err.message));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteSevkiyat = async (sevkiyatId) => {
        if (window.confirm('Bu sevkiyatı silmek istediğinizden emin misiniz?')) {
            try {
                await axios.delete(`${API_BASE_URL_SEVKIYAT}/${sevkiyatId}`);
                toast.success('Sevkiyat başarıyla silindi!');
                fetchData();
            } catch (err) {
                console.error('Sevkiyat silinirken hata:', err);
                toast.error('Sevkiyat silinirken bir hata oluştu.');
            }
        }
    };

    const handleOpenViewModal = (sevkiyat) => {
        setSelectedSevkiyat(sevkiyat);
        setIsViewModalOpen(true);
    };

    const handleEditDetails = (sevkiyat) => {
        setSelectedSevkiyat(sevkiyat);
        const detaylar = sevkiyat.urunler.map(urun => ({
            urunAdi: urun.urunAdi,
            aciklama: urun.aciklama,
            adet: urun.adet,
            birimFiyat: urun.birimFiyat,
        }));
        setSevkiyatDetaylari(detaylar);
        setSelectedSirket(sevkiyat.sirketId);
        setViewMode('add');
    };

    const handleCloseModal = () => {
        setIsViewModalOpen(false);
        setSelectedSevkiyat(null);
    };

    const formatCurrency = (amount) => {
        if (isNaN(amount) || amount === null) return '0,00';
        return new Intl.NumberFormat('tr-TR', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="sevkiyat-container">
                <p>Yükleniyor...</p>
            </div>
        );
    }
    
    return (
        <div className="sevkiyat-container">
            <ToastContainer
                position="top-right"
                autoClose={1500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
            <div className="sevkiyat-header">
                <h1 className="sevkiyat-title">Sevkiyat Yönetimi</h1>
                <div className="sevkiyat-mode-buttons">
                    <button className={`sevkiyat-mode-button ${viewMode === 'list' ? 'sevkiyat-active' : ''}`} onClick={() => setViewMode('list')}>
                        <FileText size={18} /> Sevkiyat Listesi
                    </button>
                    <button className={`sevkiyat-mode-button ${viewMode === 'add' ? 'sevkiyat-active' : ''}`} onClick={() => { setViewMode('add'); resetForm(); }}>
                        <FilePlus size={18} /> Yeni Sevkiyat
                    </button>
                </div>
            </div>
            
            {viewMode === 'list' && (
                <>
                    <div className="sevkiyat-order-controls">
                        <div className="sevkiyat-search-bar">
                            <Search size={18} className="sevkiyat-search-icon" />
                            <input
                                type="text"
                                placeholder="Arama yap..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="sevkiyat-search-field-dropdown-wrapper">
                                <button type="button" className="sevkiyat-search-field-button" onClick={() => setSearchFieldDropdownOpen(!searchFieldDropdownOpen)}>
                                    {searchField === 'hepsi' ? 'Hepsi' : searchField} <ChevronDown size={16} />
                                </button>
                                {searchFieldDropdownOpen && (
                                    <ul className="sevkiyat-search-field-dropdown">
                                        <li onClick={() => { setSearchField('hepsi'); setSearchFieldDropdownOpen(false); }}>Hepsi</li>
                                        <li onClick={() => { setSearchField('firma'); setSearchFieldDropdownOpen(false); }}>Firma</li>
                                        <li onClick={() => { setSearchField('urunAdi'); setSearchFieldDropdownOpen(false); }}>Ürün Adı</li>
                                        <li onClick={() => { setSearchField('aciklama'); setSearchFieldDropdownOpen(false); }}>Açıklama</li>
                                    </ul>
                                )}
                            </div>
                        </div>
                        <button className="sevkiyat-print-button">
                            <Printer size={18} /> Yazdır
                        </button>

                        <select 
                          value={year} 
                          onChange={(e) => setYear(parseInt(e.target.value))}
                          className="year-select"
                        >
                          <option value={2025}>📗 2025 (Arşiv)</option>
                          <option value={2026}>📘 2026 (Aktif)</option>
                        </select>
                    </div>

                    <div className="sevkiyat-card">
                        <h3>Sevkiyatlar</h3>
                        <div className="sevkiyat-table-wrapper">
                            <table className="sevkiyat-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <div className="sevkiyat-header-with-filter" onClick={() => handleHeaderClick('firma')}>
                                                Gönderilen Firma
                                                <ChevronDown size={14} className="sevkiyat-filter-icon" style={{ transform: selectedFilter === 'firma' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                                {selectedFilter === 'firma' && (
                                                    <div className="sevkiyat-filter-dropdown">
                                                        <ul className="sevkiyat-filter-options-list">
                                                            {getUniqueValues('sirketAdi').map(firma => (
                                                                <li key={firma} onClick={(e) => { e.stopPropagation(); handleFilterToggle('firma', firma); }}>
                                                                    <div className="sevkiyat-checkbox-container">
                                                                        {activeFilters.firma.includes(firma) ? (
                                                                            <CheckSquare size={16} className="sevkiyat-checkbox-icon sevkiyat-active" />
                                                                        ) : (
                                                                            <Square size={16} className="sevkiyat-checkbox-icon" />
                                                                        )}
                                                                        {firma}
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                        <th>Sevkiyat Tarihi</th>
                                        <th>Toplam Tutar</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSevkiyatlar.length > 0 ? (
                                        filteredSevkiyatlar.map(sevkiyat => (
                                            <tr key={sevkiyat._id}>
                                                <td>{sevkiyat.sirketAdi}</td>
                                                <td>{new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString()}</td>
                                                <td>{formatCurrency(sevkiyat.urunler.reduce((total, urun) => total + (urun.adet * urun.birimFiyat), 0))} TL</td>
                                                <td>
                                                    <button onClick={() => handleOpenViewModal(sevkiyat)} className="sevkiyat-btn-icon sevkiyat-secondary">
                                                        <FileText size={16} />
                                                    </button>
                                                    <button onClick={() => handleEditDetails(sevkiyat)} className="sevkiyat-btn-icon sevkiyat-secondary">
                                                        <PencilLine size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteSevkiyat(sevkiyat._id)} className="sevkiyat-btn-icon sevkiyat-danger">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="sevkiyat-no-data">Sevkiyat kaydı bulunamadı.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {viewMode === 'add' && (
                <div className="sevkiyat-card">
                    <form onSubmit={handleSubmit} className="sevkiyat-form-container">
                        <h3 className="sevkiyat-form-title">{selectedSevkiyat ? 'Sevkiyatı Düzenle' : 'Yeni Sevkiyat Ekle'}</h3>
                        <div className="sevkiyat-form-group">
                            <label htmlFor="sirket-secim">Gönderilen Firma:</label>
                            <select
                                id="sirket-secim"
                                className="sevkiyat-form-control"
                                value={selectedSirket}
                                onChange={(e) => setSelectedSirket(e.target.value)}
                            >
                                {sirketler.map(sirket => (
                                    <option key={sirket._id} value={sirket._id}>{sirket.sirketAdi}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="sevkiyat-form-details">
                            <h4 className="sevkiyat-form-title">Sevkiyat Detayları</h4>
                            <div className="sevkiyat-form-row sevkiyat-form-header">
                                <label>Ürün Adı</label>
                                <label>Açıklama</label>
                                <label>Adet</label>
                                <label>Birim Fiyat</label>
                            </div>
                            {sevkiyatDetaylari.map((row, index) => (
                                <div className="sevkiyat-form-row" key={index}>
                                    <input type="text" className="sevkiyat-form-control" value={row.urunAdi} onChange={(e) => handleCellChange(e, index, 'urunAdi')} />
                                    <input type="text" className="sevkiyat-form-control" value={row.aciklama} onChange={(e) => handleCellChange(e, index, 'aciklama')} />
                                    <input type="number" className="sevkiyat-form-control" value={row.adet} onChange={(e) => handleCellChange(e, index, 'adet')} />
                                    <input type="number" className="sevkiyat-form-control" value={row.birimFiyat} onChange={(e) => handleCellChange(e, index, 'birimFiyat')} />
                                    {sevkiyatDetaylari.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveRow(index)} className="sevkiyat-remove-row-btn">
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={handleAddRow} className="sevkiyat-add-row-btn">
                                <PlusCircle size={20} /> Satır Ekle
                            </button>
                        </div>
                        
                        <div className="sevkiyat-form-actions">
                            <h4>Toplam Tutar: {formatCurrency(toplamTutar)} TL</h4>
                            {selectedSevkiyat && (
                                <button type="button" onClick={handleCancelUpdate} className="sevkiyat-btn sevkiyat-btn-secondary">İptal</button>
                            )}
                            <button type="submit" className="sevkiyat-btn sevkiyat-btn-primary" disabled={isLoading}>{selectedSevkiyat ? 'Güncelle' : 'Kaydet'}</button>
                        </div>
                    </form>
                </div>
            )}

            {isViewModalOpen && selectedSevkiyat && (
                <div className="sevkiyat-modal-overlay">
                    <div className="sevkiyat-modal-content">
                        <button onClick={handleCloseModal} className="sevkiyat-modal-close-btn">
                            <XCircle size={24} />
                        </button>
                        <h3 className="sevkiyat-form-title">Sevkiyat Detayları</h3>
                        <p><strong>Firma:</strong> {selectedSevkiyat.sirketAdi}</p>
                        <p><strong>Tarih:</strong> {new Date(selectedSevkiyat.sevkiyatTarihi).toLocaleDateString()}</p>
                        <div className="sevkiyat-table-wrapper">
                            <table className="sevkiyat-modal-details-table">
                                <thead>
                                    <tr>
                                        <th>Ürün Adı</th>
                                        <th>Açıklama</th>
                                        <th>Adet</th>
                                        <th>Birim Fiyat</th>
                                        <th>Toplam Fiyat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSevkiyat.urunler.map((urun, index) => (
                                        <tr key={index}>
                                            <td>{urun.urunAdi}</td>
                                            <td>{urun.aciklama}</td>
                                            <td>{urun.adet}</td>
                                            <td>{formatCurrency(urun.birimFiyat)} TL</td>
                                            <td>{formatCurrency(urun.adet * urun.birimFiyat)} TL</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sevkiyat-form-actions">
                            <h4>Toplam Tutar: {formatCurrency(selectedSevkiyat.urunler.reduce((total, urun) => total + (urun.adet * urun.birimFiyat), 0))} TL</h4>
                            <button type="button" onClick={handleCloseModal} className="sevkiyat-btn sevkiyat-btn-secondary">Kapat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Sevkiyat;