import React, { useState, useEffect } from 'react';
import {
    FiPlus, FiArrowLeft, FiEdit, FiTrash2, FiDollarSign,
    FiCreditCard, FiTrendingUp, FiCalendar, FiSave,
    FiXCircle, FiArrowUpCircle, FiArrowDownCircle,
    FiAlertCircle, FiMail, FiStar, FiCheck, FiX,
    FiBriefcase, FiMapPin, FiGlobe, FiUsers,
    FiEye, FiEyeOff, FiFilter, FiChevronDown,
    FiClock, FiRefreshCw,
    FiZap, FiTrendingDown, FiFileText, FiFile
} from 'react-icons/fi';
import html2pdf from "html2pdf.js";
import axios from "axios"
const toast = {
    success: (msg) => console.log('✅ ' + msg),
    error: (msg) => console.log('❌ ' + msg)
};

const API_URL_SIRKETLER = 'http://31.57.33.249:3001/api/sirketler';
const API_URL_CEKSENETLER = 'http://31.57.33.249:3001/api/ceksenetler';
// YENİ API URL'LERİ
const API_URL_ALIS = 'http://31.57.33.249:3001/api/urun-alis';
const API_URL_SATIS = 'http://31.57.33.249:3001/api/urun-satis';
const API_URL_SEVKIYAT = 'http://31.57.33.249:3001/api/sevkiyat';


const EmailManager = ({ sirket, onEmailAdd, onEmailUpdate, onEmailDelete, onClose }) => {
    const [emailForm, setEmailForm] = useState({
        email: '',
        aciklama: '',
        birincil: false
    });
    const [editingEmail, setEditingEmail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // Mevcut state'lerin arasına EKLE:

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
document.title = 'Şirket Yönetimi';
        try {
            if (editingEmail) {
                await onEmailUpdate(editingEmail._id, emailForm);
            } else {
                await onEmailAdd(emailForm);
            }
            setEmailForm({ email: '', aciklama: '', birincil: false });
            setEditingEmail(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (email) => {
        setEditingEmail(email);
        setEmailForm({
            email: email.email,
            aciklama: email.aciklama,
            birincil: email.birincil
        });
    };

    const handleCancel = () => {
        setEmailForm({ email: '', aciklama: '', birincil: false });
        setEditingEmail(null);
    };

    return (
        <div className="email-manager">
            <div className="email-manager-header">
                <div className="header-content">
                    <div className="header-title">
                        <FiMail className="header-icon" />
                        <h3>Email Yönetimi</h3>
                        <span className="email-count">{sirket.emailler?.length || 0}/3</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <FiX />
                    </button>
                </div>
            </div>

            <div className="email-manager-content">
                <div className="existing-emails">
                    <h4>Mevcut Email Adresleri</h4>
                    {sirket.emailler?.length > 0 ? (
                        <div className="email-list">
                            {sirket.emailler.map((email, index) => (
                                <div key={email._id} className={`email-item ${email.birincil ? 'primary' : ''}`}>
                                    <div className="email-info">
                                        <div className="email-address">
                                            {email.birincil && <FiStar className="primary-icon" />}
                                            <span className="email-text">{email.email}</span>
                                        </div>
                                        <div className="email-meta">
                                            <span className="email-description">{email.aciklama || 'Açıklama yok'}</span>
                                            {email.birincil && <span className="primary-badge">Birincil</span>}
                                        </div>
                                    </div>
                                    <div className="email-actions">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => handleEdit(email)}
                                        >
                                            <FiEdit />
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => onEmailDelete(email._id)}
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-emails">
                            <FiMail className="no-emails-icon" />
                            <p>Henüz email adresi eklenmemiş</p>
                        </div>
                    )}
                </div>

                <div className="email-form-section">
                    <h4>{editingEmail ? 'Email Düzenle' : 'Yeni Email Ekle'}</h4>
                    <form onSubmit={handleSubmit} className="email-form">
                        <div className="form-group">
                            <label>Email Adresi</label>
                            <input
                                type="email"
                                className="form-control"
                                value={emailForm.email}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="ornek@sirket.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Açıklama</label>
                            <select
                                className="form-control"
                                value={emailForm.aciklama}
                                onChange={(e) => setEmailForm(prev => ({ ...prev, aciklama: e.target.value }))}
                            >
                                <option value="">Seçiniz</option>
                                <option value="Genel">Genel</option>
                                <option value="Muhasebe">Muhasebe</option>
                                <option value="İletişim">İletişim</option>
                            </select>
                        </div>
                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={emailForm.birincil}
                                    onChange={(e) => setEmailForm(prev => ({ ...prev, birincil: e.target.checked }))}
                                />
                                <span className="checkbox-custom"></span>
                                Birincil email adresi olarak ayarla
                            </label>
                        </div>
                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading || (sirket.emailler?.length >= 3 && !editingEmail)}
                            >
                                {isLoading ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <>
                                        <FiSave />
                                        {editingEmail ? 'Güncelle' : 'Ekle'}
                                    </>
                                )}
                            </button>
                            {editingEmail && (
                                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                                    <FiX /> İptal
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const EditSirketModal = ({ sirket, onSave, onClose }) => {
    const [sirketForm, setSirketForm] = useState({
        sirketAdi: sirket.sirketAdi,
        sirketBolgesi: sirket.sirketBolgesi,
        sirketCariBirimi: sirket.sirketCariBirimi,
        sirketKodu: sirket.sirketKodu,
        tip: sirket.tip
    });
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSirketForm(prev => ({ ...prev, [name]: value }));
        setHasChanges(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave(sirketForm);
            setHasChanges(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            if (window.confirm('Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinizden emin misiniz?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal enhanced-modal">
                <div className="modal-header">
                    <h3>
                        <FiEdit className="modal-icon" />
                        Şirket Düzenle
                    </h3>
                    <button type="button" className="modal-close-btn" onClick={handleClose}>
                        <FiXCircle />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-content">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Şirket Adı *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="sirketAdi"
                                    value={sirketForm.sirketAdi}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Bölge</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="sirketBolgesi"
                                    value={sirketForm.sirketBolgesi}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Para Birimi</label>
                                <select
                                    className="form-control"
                                    name="sirketCariBirimi"
                                    value={sirketForm.sirketCariBirimi}
                                    onChange={handleChange}
                                >
                                    <option value="USD">🇺🇸 USD</option>
                                    <option value="EUR">🇪🇺 EUR</option>
                                    <option value="TRY">🇹🇷 TRY</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Şirket Kodu *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="sirketKodu"
                                    value={sirketForm.sirketKodu}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Şirket Tipi</label>
                                <div className="radio-group">
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="tip"
                                            value="alici"
                                            checked={sirketForm.tip === 'alici'}
                                            onChange={handleChange}
                                        />
                                        <span className="radio-custom"></span>
                                        <FiTrendingUp className="radio-icon" />
                                        Alıcı Şirket
                                    </label>
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="tip"
                                            value="satici"
                                            checked={sirketForm.tip === 'satici'}
                                            onChange={handleChange}
                                        />
                                        <span className="radio-custom"></span>
                                        <FiTrendingDown className="radio-icon" />
                                        Satıcı Şirket
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? (
                                <div className="loading-spinner"></div>
                            ) : (
                                <>
                                    <FiSave /> Kaydet
                                </>
                            )}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleClose}>
                            <FiXCircle /> İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Sirketler = () => {
    const [view, setView] = useState('list');
    const [filter, setFilter] = useState('all');
    const [sirketler, setSirketler] = useState([]);
    const [selectedSirket, setSelectedSirket] = useState(null);
    const [ceksenetler, setCeksenetler] = useState([]);
    const [activeTab, setActiveTab] = useState('gecmis');
    const [showEditSirketModal, setShowEditSirketModal] = useState(false);
    const [showEmailManager, setShowEmailManager] = useState(false);
    const [isEditingIslem, setIsEditingIslem] = useState(false);
    const [editingIslem, setEditingIslem] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [islemPage, setIslemPage] = useState(1);
    const islemPerPage = 10; // Sayfa başına 10 işlem
    // Sayfalama state'leri
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [sirketPage, setSirketPage] = useState(1);
    const sirketPerPage = 15; // Sayfa başına şirket sayısı

    // YENİ STATE'LER
    const [selectedIslem, setSelectedIslem] = useState(null);
    const [showIslemModal, setShowIslemModal] = useState(false);
    const [islemDetayData, setIslemDetayData] = useState(null);
    const [islemDetayLoading, setIslemDetayLoading] = useState(false);
    const [islemDetayError, setIslemDetayError] = useState(null);
// Sirketler component'inin state tanımlamalarının olduğu yere ekleyin
const [allCompanyTransactions, setAllCompanyTransactions] = useState([]);
const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [sirketForm, setSirketForm] = useState({
        sirketAdi: '',
        sirketBolgesi: '',
        sirketCarisi: 0,
        sirketCariBirimi: 'TRY',
        sirketKodu: '',
        tip: 'alici',
        emailler: []
    });

    const [transactionForm, setTransactionForm] = useState({
        islemTuru: 'satis',
        aciklama: '',
        tutar: '',
        odemeTuru: 'nakit',
    });

    // Email yönetimi için state
    const [emailForm, setEmailForm] = useState({
        email: '',
        aciklama: '',
        birincil: false
    });

    // YENİ TASARIMLI RENDER FONKSİYONLARI
    const renderAlisDetay = (data) => (
        <div>
            <div className="detay-header">
                <h4>Alış Detayları <span style={{color: '#888', fontWeight: 500}}>#{data.alisNo}</span></h4>
                <p><strong>Tarih:</strong> {new Date(data.alisTarihi).toLocaleDateString('tr-TR')}</p>
                <p><strong>Şirket:</strong> {data.sirketAdi}</p>
                <p><strong>Toplam Tutar:</strong> {data.toplamTutar?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {data.sirketCariBirimi}</p>
                <p><strong>Genel Toplam (KDV Dahil):</strong> {data.genelToplam?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {data.sirketCariBirimi}</p>
            </div>
            
            <h5>Ürünler</h5>
            <table className="detay-urunler-table">
                <thead>
                    <tr>
                        <th>Ürün</th>
                        <th className="text-right">Adet</th>
                        <th className="text-right">Birim Fiyat</th>
                        <th className="text-right">Toplam</th>
                    </tr>
                </thead>
                <tbody>
                    {data.urunler?.map(urun => (
                        <tr key={urun._id}>
                            <td>
                                <span className="urun-adi">{urun.urunAdi}</span>
                                <span className="urun-aciklama">{urun.aciklama}</span>
                            </td>
                            <td className="text-right">{urun.adet.toLocaleString('tr-TR')} {urun.birimTuru}</td>
                            <td className="text-right">{urun.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {data.sirketCariBirimi}</td>
                            <td className="text-right">{(urun.adet * urun.birimFiyat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {data.sirketCariBirimi}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
    
    const renderSatisDetay = (data) => (
        renderAlisDetay(data)
    );

    const renderSevkiyatDetay = (data) => (
        <div>
            <div className="detay-header">
                <h4>Sevkiyat Detayları</h4>
                <p><strong>Tarih:</strong> {new Date(data.sevkiyatTarihi).toLocaleDateString('tr-TR')}</p>
                <p><strong>Şirket:</strong> {data.sirketId?.sirketAdi}</p>
            </div>
            
            <h5>Ürünler</h5>
            <table className="detay-urunler-table">
                <thead>
                    <tr>
                        <th>Ürün</th>
                        <th className="text-right">Toplam Adet</th>
                        <th className="text-right">Birim Fiyat</th>
                    </tr>
                </thead>
                <tbody>
                    {data.urunler?.map((urun, index) => (
                        <tr key={index}>
                            <td>
                                <span className="urun-adi">{urun.urunAdi}</span>
                                <span className="urun-aciklama">{urun.model} {urun.cins} {urun.renk}</span>
                                {urun.bedenler && (
                                    <ul className="beden-list">
                                        {urun.bedenler.map(b => (
                                            <li key={b.beden}>{b.beden}: {b.adet}</li>
                                        ))}
                                    </ul>
                                )}
                            </td>
                            <td className="text-right">{urun.adet}</td>
                            <td className="text-right">{urun.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {data.sirketId?.sirketCariBirimi}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

const loadFullHistoryAndCalculateBalances = async (sirket) => {
    if (!sirket?._id) return;

    setIsHistoryLoading(true);
    setAllCompanyTransactions([]);

    try {
        const [islemlerResponse, ceksenetlerResponse] = await Promise.all([
            fetchAllHistory(sirket._id),
            axios.get(`${API_URL_CEKSENETLER}?firmaId=${sirket._id}`)
        ]);

        const tumIslemler = islemlerResponse || [];
        
        // --- ÇÖZÜM 1: Çek/senetleri doğru şirkete göre filtrele ---
        const tumCeksenetler_Filtresiz = Array.isArray(ceksenetlerResponse.data) ? ceksenetlerResponse.data : [];
        const tumCeksenetler = tumCeksenetler_Filtresiz.filter(c => c.firmaId === sirket._id);
        // -----------------------------------------------------------

        const sirketCariBirimi = sirket.sirketCariBirimi || 'TRY';

        const mappedIslemler = tumIslemler.map(islem => ({
            ...islem,
            tip: getIslemTipi(islem.islemAciklamasi, islem.tutar),
            paraBirimi: sirketCariBirimi,
            tarih: new Date(islem?.islemTarihi || new Date()),
            gercekTutar: islem.tutar || 0,
        }));

        const mappedCeksenetler = tumCeksenetler.map(cek => ({
            ...cek,
            tip: cek.tip === 'alınan' ? 'Alınan Çek/Senet' : 'Verilen Çek/Senet',
            tarih: new Date(cek?.vadeTarihi || new Date()),
            gercekTutar: cek.tip === 'alınan' ? -(cek.tutar || 0) : (cek.tutar || 0),
            paraBirimi: cek.paraBirimi || sirketCariBirimi,
        }));
        
        let combined = [...mappedIslemler, ...mappedCeksenetler];

        // --- ÇÖZÜM 2: Sıralamanın doğru olduğundan emin ol (sondan başa / en yeni en üstte) ---
        // Bu satır zaten doğru sıralamayı yapıyor, filtreleme düzeltilince doğru çalışacak.
        combined.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
        // ----------------------------------------------------------------------------------
        
        let currentBalance = sirket.sirketCarisi || 0;
        const historyWithBalances = combined.map(item => {
            const balanceAfterThisTransaction = currentBalance;
            const balanceBeforeThisTransaction = currentBalance - (item.gercekTutar || 0);
            currentBalance = balanceBeforeThisTransaction;
            return {
                ...item,
                previousBalance: balanceBeforeThisTransaction,
                currentBalance: balanceAfterThisTransaction
            };
        });

        setAllCompanyTransactions(historyWithBalances);

    } catch (error) {
        console.error("Tüm işlem geçmişi yüklenirken hata:", error);
        toast.error("Tüm işlem geçmişi yüklenirken bir hata oluştu.");
    } finally {
        setIsHistoryLoading(false);
    }
};

    // YENİ HİBRİT VERİ ÇEKME FONKSİYONU
    const handleIslemRowClick = async (islem) => {
        setShowIslemModal(true);
        setSelectedIslem(islem);
        setIslemDetayData(null);
        setIslemDetayError(null);
        setIslemDetayLoading(true);

        const islemTipi = islem.tip?.toLowerCase();
        const aciklama = islem.islemAciklamasi;
        
        console.log("🖱️ Tıklanan İşlem: ", islem);

        if (islemTipi.includes('sevkiyat')) {
            const sevkiyatId = islem._id;
            const url = `${API_URL_SEVKIYAT}/${sevkiyatId}`;
            console.log(`🚀 Sevkiyat detayı ID ile çekiliyor: ${url}`);

            try {
                const response = await axios.get(url);
                if (response.data?.success && response.data.data) {
                    setIslemDetayData(response.data.data);
                } else {
                    setIslemDetayError('Sevkiyat detayı bulunamadı.');
                }
            } catch (error) {
                console.error(`❌ Sevkiyat detayı getirilirken HATA OLUŞTU:`, error);
                setIslemDetayError('Sevkiyat detayı yüklenirken bir hata oluştu.');
            } finally {
                setIslemDetayLoading(false);
            }
            return;
        }

        let url = '';
        let extractedNumber = null;
        let kayitTipi = '';
        
        if (islemTipi.includes('alış')) {
            const match = aciklama.match(/AL-\d{4}-\d+/i); 
            if (match) {
                extractedNumber = match[0];
                kayitTipi = 'alis';
                url = API_URL_ALIS;
            }
        } else if (islemTipi.includes('satış')) {
            const match = aciklama.match(/(ST|SATIS)-\d{4}-\d+/i);
            if (match) {
                extractedNumber = match[0];
                kayitTipi = 'satis';
                url = API_URL_SATIS;
            }
        }

        if (!url || !extractedNumber) {
            console.log("ⓘ Bu işlem için özel bir detay sayfası yok.");
            setIslemDetayLoading(false);
            return;
        }

        console.log(`🚀 Tüm ${kayitTipi} kayıtları çekiliyor, ardından "${extractedNumber}" aranacak.`);

        try {
            const response = await axios.get(url);
            if (Array.isArray(response.data)) {
                const allRecords = response.data;
                
                const findRecordByNumber = (record) => {
                    if (kayitTipi === 'alis') return record.alisNo === extractedNumber;
                    if (kayitTipi === 'satis') return record.satisNo === extractedNumber;
                    return false;
                };

                const foundRecord = allRecords.find(findRecordByNumber);
                if (foundRecord) {
                    setIslemDetayData(foundRecord);
                } else {
                    setIslemDetayError(`"${extractedNumber}" numaralı kayıt listede bulunamadı.`);
                }
            } else {
                setIslemDetayError("API'den beklenen formatta bir liste alınamadı.");
            }
        } catch (error) {
            console.error(`❌ Kayıtlar çekilirken HATA OLUŞTU:`, error);
            setIslemDetayError('Liste yüklenirken bir hata oluştu.');
        } finally {
            setIslemDetayLoading(false);
        }
    };


    const getSirketPagination = () => {
        const totalSirketler = filteredSirketler.length;
        const totalPages = Math.ceil(totalSirketler / sirketPerPage);
        const startIndex = (sirketPage - 1) * sirketPerPage;
        const endIndex = startIndex + sirketPerPage;
        const currentSirketler = filteredSirketler.slice(startIndex, endIndex);

        return { currentSirketler, totalPages, totalSirketler };
    };

    const getIslemPagination = () => {

        const totalIslemler = combinedHistory.length;
        const totalPages = Math.ceil(totalIslemler / islemPerPage);
        const startIndex = (islemPage - 1) * islemPerPage;
        const endIndex = startIndex + islemPerPage;
        const currentIslemler = combinedHistory.slice(startIndex, endIndex);

        return { currentIslemler, totalPages, totalIslemler };
    };
    const fetchSirketler = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(API_URL_SIRKETLER);
            setSirketler(response.data);
        } catch (error) {
            console.error("Şirketler getirilirken hata:", error);
            toast.error("Şirket listesi yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSirketDetails = async (sirketId, page = 1) => {
        const response = await axios.get(
            `${API_URL_SIRKETLER}/${sirketId}?sayfa=${page}&limit=${islemPerPage}`
        );
        setSelectedSirket(response.data.sirket);
        // Burada backend’in döndürdüğü toplam ve mevcut sayfa bilgilerini de alın:
        setMevcutIslemSayfasi(response.data.mevcutSayfa);
        setToplamIslemSayfasi(response.data.toplamSayfa);
    };

    const fetchCekSenetler = async (sirketId) => {
        try {
            const response = await axios.get(`${API_URL_CEKSENETLER}?firmaId=${sirketId}`);
            const responseData = response.data; // Yanıt verisi burada

            if (Array.isArray(responseData)) {
                const sirketCekleri = responseData.filter(c => c.firmaId === sirketId);
                setCeksenetler(sirketCekleri);
            } else {
                console.warn("Beklenen dizi formatında veri gelmedi:", responseData);
                setCeksenetler([]);
            }
        } catch (error) {
            console.error("Çek/senetler getirilirken hata:", error);
            toast.error("Çek/senetler yüklenirken bir hata oluştu.");
            setCeksenetler([]);
        }
    };

    // Mevcut useEffect'lerin altına ekleyin:
    useEffect(() => {
        setSirketPage(1);
    }, [filter]);

    useEffect(() => {
        setIslemPage(1);
    }, [selectedSirket]);

    useEffect(() => {
        if (view === 'list') {
            fetchSirketler();
        }
    }, [view]);

    useEffect(() => {
        if (selectedSirket) {
            fetchCekSenetler(selectedSirket._id);
            setCurrentPage(1);
        }
    }, [selectedSirket]);

    // Email yönetimi fonksiyonları
    const handleEmailAdd = async (emailData) => {
        try {
            await axios.post(`${API_URL_SIRKETLER}/email/${selectedSirket._id}`, emailData);
            await fetchSirketDetails(selectedSirket._id);
            toast.success('Email başarıyla eklendi!');
        } catch (error) {
            console.error("Email eklenirken hata:", error);
            toast.error("Email eklenirken bir hata oluştu.");
        }
    };

    const handleEmailUpdate = async (emailId, emailData) => {
        try {
            await axios.put(`${API_URL_SIRKETLER}/email/${selectedSirket._id}/${emailId}`, emailData);
            await fetchSirketDetails(selectedSirket._id);
            toast.success('Email başarıyla güncellendi!');
        } catch (error) {
            console.error("Email güncellenirken hata:", error);
            toast.error("Email güncellenirken bir hata oluştu.");
        }
    };

    const handleEmailDelete = async (emailId) => {
        if (window.confirm('Bu email adresini silmek istediğinizden emin misiniz?')) {
            try {
                await axios.delete(`${API_URL_SIRKETLER}/email/${selectedSirket._id}/${emailId}`);
                await fetchSirketDetails(selectedSirket._id);
                toast.success('Email başarıyla silindi!');
            } catch (error) {
                console.error("Email silinirken hata:", error);
                toast.error("Email silinirken bir hata oluştu.");
            }
        }
    };

    // Email ekleme formunu add view'e ekleme
    const addEmailToForm = () => {
        if (sirketForm.emailler.length >= 3) {
            toast.error('En fazla 3 email adresi ekleyebilirsiniz.');
            return;
        }

        if (!emailForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) {
            toast.error('Geçerli bir email adresi giriniz.');
            return;
        }

        // Email zaten var mı kontrol et
        if (sirketForm.emailler.some(e => e.email === emailForm.email.toLowerCase())) {
            toast.error('Bu email adresi zaten ekli.');
            return;
        }

        const yeniEmail = {
            email: emailForm.email.toLowerCase(),
            aciklama: emailForm.aciklama || '',
            birincil: emailForm.birincil || sirketForm.emailler.length === 0,
            _id: Date.now().toString() // Temporary ID
        };

        // Eğer birincil olarak işaretlendiyse, diğerlerini birincil olmaktan çıkar
        if (yeniEmail.birincil) {
            setSirketForm(prev => ({
                ...prev,
                emailler: prev.emailler.map(e => ({ ...e, birincil: false }))
            }));
        }

        setSirketForm(prev => ({
            ...prev,
            emailler: [...prev.emailler, yeniEmail]
        }));

        setEmailForm({ email: '', aciklama: '', birincil: false });
        setHasUnsavedChanges(true);
    };

    const removeEmailFromForm = (emailId) => {
        setSirketForm(prev => ({
            ...prev,
            emailler: prev.emailler.filter(e => e._id !== emailId)
        }));
        setHasUnsavedChanges(true);
    };

const handleSelectSirket = async (sirket) => {
    if (hasUnsavedChanges) {
        if (!window.confirm('Kaydedilmemiş değişiklikleriniz var. Devam etmek istediğinizden emin misiniz?')) {
            return;
        }
    }
    setView('detail');
    
    // Sadece temel şirket bilgisini güncelle, işlemleri ayrıca yükleyeceğiz.
    try {
        const response = await axios.get(`${API_URL_SIRKETLER}/${sirket._id}`);
        setSelectedSirket(response.data.sirket);
        await loadFullHistoryAndCalculateBalances(response.data.sirket); // Tüm geçmişi yükle
    } catch (error) {
        toast.error("Şirket detayları getirilemedi.");
        console.error("Şirket detayı alınırken hata:", error);
    }

    setActiveTab('gecmis');
    setHasUnsavedChanges(false);
};


    const handleBackToList = () => {
        if (hasUnsavedChanges) {
            if (!window.confirm('Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinizden emin misiniz?')) {
                return;
            }
        }
        setView('list');
        setSelectedSirket(null);
        setFilter('all');
        setShowEditSirketModal(false);
        setShowEmailManager(false);
        setIsEditingIslem(false);
        setEditingIslem(null);
        setHasUnsavedChanges(false);
    };

    const handleAddView = () => {
        if (hasUnsavedChanges) {
            if (!window.confirm('Kaydedilmemiş değişiklikleriniz var. Devam etmek istediğinizden emin misiniz?')) {
                return;
            }
        }
        setView('add');
        setSirketForm({
            sirketAdi: '',
            sirketBolgesi: '',
            sirketCarisi: 0,
            sirketCariBirimi: 'TRY',
            sirketKodu: '',
            tip: 'alici',
            emailler: []
        });
        setEmailForm({ email: '', aciklama: '', birincil: false });
        setHasUnsavedChanges(false);
    };

    const handleFormChange = (field, value) => {
        if (view === 'add') {
            setSirketForm(prev => ({ ...prev, [field]: value }));
        } else {
            setTransactionForm(prev => ({ ...prev, [field]: value }));
        }
        setHasUnsavedChanges(true);
    };

    const handleAddSirket = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axios.post(API_URL_SIRKETLER, sirketForm);

            // Emailler varsa ekle
            if (sirketForm.emailler.length > 0) {
                for (const email of sirketForm.emailler) {
                    await axios.post(`${API_URL_SIRKETLER}/email/${response.data._id}`, {
                        email: email.email,
                        aciklama: email.aciklama,
                        birincil: email.birincil
                    });
                }
            }

            toast.success('Şirket başarıyla eklendi!');
            setView('list');
            fetchSirketler();
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error("Şirket eklenirken hata:", error);
            toast.error("Şirket eklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    const getIslemTipi = (islemAciklamasi, tutar) => {
        if (!islemAciklamasi) return 'İşlem';

        const aciklama = islemAciklamasi.toLowerCase();

        if (aciklama.includes('alınan ödeme') || aciklama.includes('ödeme al')) {
            return 'Ödeme Alındı';
        } else if (aciklama.includes('yapılan ödeme') || aciklama.includes('ödeme yap')) {
            return 'Ödeme Yapıldı';
        } else if (aciklama.includes('satış')) {
            return 'Satış';
        } else if (aciklama.includes('alış')) {
            return 'Alış';
        } else if (aciklama.includes('başlangıç')) {
            return 'Başlangıç Borcu';
        }
        else if (aciklama.includes('sevkiyat')) {
            return 'Sevkiyat';
        }

        return 'İşlem';
    };

    const getBadgeClassForTip = (tip) => {
        switch (tip) {
            case 'Ödeme Alındı':
            case 'Satış': return 'success';
            case 'Ödeme Yapıldı':
            case 'Alış': return 'danger';
            case 'Başlangıç Borcu': return 'primary';
            case 'Alınan Çek/Senet': return 'warning';
            case 'Verilen Çek/Senet': return 'info';
            default: return 'secondary';
        }
    };

    const handleUpdateSirket = async (updatedData) => {
        try {
            const response = await axios.put(`${API_URL_SIRKETLER}/${selectedSirket._id}`, updatedData);
            setSelectedSirket(response.data);
            setShowEditSirketModal(false);
            fetchSirketler();
            toast.success('Şirket başarıyla güncellendi!');
        } catch (error) {
            console.error("Şirket güncellenirken hata:", error);
            toast.error("Şirket güncellenirken bir hata oluştu.");
        }
    };

    const handleDeleteSirket = async () => {
        if (window.confirm(`${selectedSirket.sirketAdi} şirketini silmek istediğinizden emin misiniz?`)) {
            try {
                await axios.delete(`${API_URL_SIRKETLER}/${selectedSirket._id}`);
                handleBackToList();
                toast.success('Şirket başarıyla silindi!');
            } catch (error) {
                console.error("Şirket silinirken hata:", error);
                toast.error("Şirket silinirken bir hata oluştu.");
            }
        }
    };

    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        const { islemTuru, aciklama, tutar, odemeTuru } = transactionForm;

        if (!tutar || parseFloat(tutar) <= 0) {
            toast.error("Geçerli bir tutar girmelisiniz.");
            return;
        }

        try {
            await axios.post(`${API_URL_SIRKETLER}/islem/${selectedSirket._id}`, {
                islemTuru,
                tutar: parseFloat(tutar), // Pozitif tutar
                aciklama,
                odemeTuru
            });

            fetchSirketDetails(selectedSirket._id);
            fetchCekSenetler(selectedSirket._id);
            setTransactionForm({ islemTuru: 'satis', aciklama: '', tutar: '', odemeTuru: 'nakit' });
            setActiveTab('gecmis');
            setIsEditingIslem(false);
            setEditingIslem(null);
            setHasUnsavedChanges(false);
            toast.success('İşlem başarıyla kaydedildi!');
        } catch (error) {
            console.error('İşlem eklenirken hata:', error);
            toast.error('İşlem eklenirken hata oluştu: ' + (error.response?.data?.mesaj || error.message));
        }
    };

    const handleEditIslem = (islem) => {
        setIsEditingIslem(true);
        setEditingIslem(islem);

        let islemTuru = 'satis';
        const aciklama = islem.islemAciklamasi.toLowerCase();

        if (aciklama.includes('alış')) {
            islemTuru = 'alis';
        } else if (aciklama.includes('alınan ödeme')) {
            islemTuru = 'odemeAl';
        } else if (aciklama.includes('yapılan ödeme')) {
            islemTuru = 'odemeYap';
        }

        setTransactionForm({
            islemTuru,
            aciklama: islem.islemAciklamasi,
            tutar: Math.abs(islem.tutar).toString(),
            odemeTuru: 'nakit'
        });
        setActiveTab('islem');
        setHasUnsavedChanges(false);
    };

    const handleUpdateIslem = async (e) => {
        e.preventDefault();

        if (!editingIslem) {
            toast.error("Düzenlenecek bir işlem seçilmedi.");
            return;
        }

        const { islemTuru, aciklama, tutar } = transactionForm;

        if (!tutar || parseFloat(tutar) <= 0) {
            toast.error("Geçerli bir tutar girmelisiniz.");
            return;
        }

        try {
            const tutarSayisal = parseFloat(tutar);
            let newTutar;

            switch (islemTuru) {
                case 'satis':
                    newTutar = tutarSayisal;
                    break;
                case 'alis':
                    newTutar = -tutarSayisal;
                    break;
                case 'odemeAl':
                    newTutar = -tutarSayisal;
                    break;
                case 'odemeYap':
                    newTutar = tutarSayisal;
                    break;
                default:
                    newTutar = tutarSayisal;
            }
            await axios.put(`${API_URL_SIRKETLER}/islem/${selectedSirket._id}/${editingIslem._id}`, {
                islemTuru: transactionForm.islemTuru, // backend zorunlu
                tutar: newTutar,                      // backend zorunlu
                aciklama: transactionForm.aciklama,   // backend bekliyor
                odemeTuru: transactionForm.odemeTuru  // backend hesaplama için gerekli
            });

            fetchSirketDetails(selectedSirket._id);
            fetchCekSenetler(selectedSirket._id);
            setIsEditingIslem(false);
            setEditingIslem(null);
            setTransactionForm({ islemTuru: 'satis', aciklama: '', tutar: '', odemeTuru: 'nakit' });
            setActiveTab('gecmis');
            setHasUnsavedChanges(false);
            toast.success('İşlem başarıyla güncellendi!');
        } catch (error) {
            console.error("İşlem güncellenirken hata:", error);
            toast.error("İşlem güncellenirken bir hata oluştu.");
        }
    };

    const handleDeleteIslem = async (islemId) => {
        if (!selectedSirket || !islemId) {
            toast.error("Silinecek işlem bilgisi eksik.");
            return;
        }

        if (window.confirm("Bu işlemi silmek istediğinizden emin misiniz?")) {
            try {
                await axios.delete(`${API_URL_SIRKETLER}/islem/${selectedSirket._id}/${islemId}`);
                fetchSirketDetails(selectedSirket._id);
                fetchCekSenetler(selectedSirket._id);
                toast.success('İşlem başarıyla silindi!');
            } catch (error) {
                console.error("İşlem silinirken hata:", error);
                toast.error("İşlem silinirken bir hata oluştu: " + (error.response?.data?.mesaj || error.message));
            }
        }
    };

    const handlePaymentStatusChange = async (cekId, tip) => {
        try {
            const updatedData = { durum: 'Ödendi' };
            await axios.put(`${API_URL_CEKSENETLER}/${cekId}`, updatedData);
            toast.success(`${tip === 'alınan' ? 'Çek başarıyla tahsil edildi!' : 'Senet başarıyla ödendi!'}`);
            fetchCekSenetler(selectedSirket._id);
        } catch (error) {
            console.error("Durum güncellenirken hata:", error);
            toast.error("Durum güncellenirken bir hata oluştu.");
        }
    };

    const getCombinedHistoryWithBalances = () => {
        if (!selectedSirket) return [];

        const sirketCariBirimi = selectedSirket.sirketCariBirimi || 'TRY';
        let combined = [];

        const islemler = (selectedSirket.islemler || [])
            .filter(islem => islem)
            .map(islem => ({
                ...islem,
                tip: getIslemTipi(islem.islemAciklamasi, islem.tutar),
                paraBirimi: sirketCariBirimi,
                tarih: new Date(islem?.islemTarihi || new Date()),
                islemAciklamasi: islem.islemAciklamasi || '-',
                gercekTutar: islem.tutar || 0,
                itemType: 'islem'
            }));

        const ceksenetEntries = (ceksenetler || [])
            .filter(cek => cek)
            .map(cek => ({
                ...cek,
                tip: cek.tip === 'alınan' ? 'Alınan Çek/Senet' : 'Verilen Çek/Senet',
                tarih: new Date(cek?.vadeTarihi || new Date()),
                islemAciklamasi: `${cek.banka || ''} - ${cek.borclu || ''} (${cek.tip === 'alınan' ? 'Alınan' : 'Verilen'} Çek/Senet)`,
                tutar: cek.tutar || 0,
                gercekTutar: cek.tip === 'alınan' ? -(cek.tutar || 0) : (cek.tutar || 0),
                paraBirimi: cek.paraBirimi || sirketCariBirimi,
                durum: cek.durum,
                itemType: 'ceksenet'
            }));

        combined = [...islemler, ...ceksenetEntries];

        // Tarihe göre sırala (yeniden eskiye - görüntüleme sırası)
        combined.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

        // Güncel borçtan başlayarak geriye doğru hesapla
        let currentBalance = selectedSirket.sirketCarisi || 0;

        const historyWithBalances = combined.map((item) => {
            const balanceAfterThisTransaction = currentBalance;
            const balanceBeforeThisTransaction = currentBalance - (item.gercekTutar || 0);

            // Bir sonraki iterasyon için güncelle
            currentBalance = balanceBeforeThisTransaction;

            return {
                ...item,
                previousBalance: balanceBeforeThisTransaction,
                currentBalance: balanceAfterThisTransaction
            };
        });

        return historyWithBalances;
    };
const combinedHistory = allCompanyTransactions;
    // Şirket listesi sayfalama hesaplamaları
    const filteredSirketler = sirketler.filter(sirket => filter === 'all' || sirket.tip === filter);
    const totalSirketPages = Math.ceil(filteredSirketler.length / sirketPerPage);
    const sirketStartIndex = (sirketPage - 1) * sirketPerPage;
    const sirketEndIndex = sirketStartIndex + sirketPerPage;
    const currentSirketler = filteredSirketler.slice(sirketStartIndex, sirketEndIndex);
    const [mevcutIslemSayfasi, setMevcutIslemSayfasi] = useState(1);
    const [toplamIslemSayfasi, setToplamIslemSayfasi] = useState(1);
    
    // İşlem geçmişi sayfalama hesaplamaları  
    const totalPages = Math.ceil(combinedHistory.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = combinedHistory.slice(startIndex, endIndex);

    // Backend'den gelen sayfalı işlem geçmişi
    const islemGecmisi = selectedSirket?.islemler || [];

    const sirketCariBirimi = selectedSirket?.sirketCariBirimi || 'TRY';

// API'den tüm sayfaları çekme helper fonksiyonu


/**
 * Güvenli şirket ID'si alma fonksiyonu
 */
/**
 * Tüm işlem geçmişini getiren fonksiyon
 */
/**
 * Güvenli şirket ID'si alma fonksiyonu - GÜNCELLENMİŞ
 */
/**
 * Gelişmiş güvenli şirket ID'si alma fonksiyonu
 */
const getSafeSirketId = (sirket) => {
  console.log("🔍 getSafeSirketId'ye gelen tam obje:", sirket);
  
  if (!sirket) {
    throw new Error("Şirket bilgisi bulunamadı");
  }
  
  // Olası ID property'lerini kontrol et
  const possibleIdFields = ['_id', 'id', 'sirketId', 'sirketID', 'companyId', 'companyID'];
  
  for (const field of possibleIdFields) {
    if (sirket[field] !== undefined && sirket[field] !== null) {
      console.log(`🎯 ${field} bulundu:`, sirket[field]);
      
      const idValue = sirket[field];
      
      // ID string ise
      if (typeof idValue === 'string') {
        if (/^[0-9a-fA-F]{24}$/.test(idValue)) {
          console.log(`✅ Geçerli ${field}:`, idValue);
          return idValue;
        } else {
          console.log(`⚠️ ${field} string ama ObjectId formatında değil:`, idValue);
        }
      }
      
      // ID obje ise ve toString metodu varsa
      else if (idValue && typeof idValue.toString === 'function') {
        try {
          const idString = idValue.toString();
          if (/^[0-9a-fA-F]{24}$/.test(idString)) {
            console.log(`✅ Geçerli ${field} (toString):`, idString);
            return idString;
          } else {
            console.log(`⚠️ ${field} toString geçersiz format:`, idString);
          }
        } catch (error) {
          console.log(`❌ ${field} toString hatası:`, error);
        }
      }
    }
  }
  
  // Eğer hiçbir ID field'ı bulunamazsa, objenin kendisi ID olabilir mi?
  if (typeof sirket === 'string' && /^[0-9a-fA-F]{24}$/.test(sirket)) {
    console.log("✅ Objenin kendisi geçerli ID:", sirket);
    return sirket;
  }
  
  throw new Error(`Şirket ID'si bulunamadı. Mevcut fields: ${Object.keys(sirket).join(', ')}`);
};
/**
 * Tüm işlem geçmişini getiren fonksiyon - GÜNCELLENMİŞ
 */
const fetchAllHistory = async (sirketId, islemPerPage = 100) => {
  try {
    console.log("🚀 fetchAllHistory başladı");
    console.log("📤 Gönderilen sirketId:", sirketId);
    console.log("📤 Gönderilen sirketId tipi:", typeof sirketId);
    
    // Giriş parametrelerini kontrol et
    if (!sirketId) {
      throw new Error("sirketId geçerli değil");
    }
    
    // ObjectId formatını kontrol et
    if (!/^[0-9a-fA-F]{24}$/.test(sirketId)) {
      throw new Error(`Geçersiz sirketId formatı: ${sirketId}`);
    }

    if (typeof islemPerPage !== 'number' || islemPerPage <= 0) {
      islemPerPage = 100;
    }

    let allData = [];
    let toplamSayfa = 1;

    console.log(`📡 İlk sayfa çekiliyor: ${API_URL_SIRKETLER}/islemler/${sirketId}?limit=${islemPerPage}`);

    // İlk sayfayı çek
    const firstRes = await axios.get(
      `${API_URL_SIRKETLER}/islemler/${sirketId}?sayfa=1&limit=${islemPerPage}`,
      { timeout: 10000 }
    );

    console.log("📥 İlk sayfa response:", firstRes.data);

    if (!firstRes.data) {
      throw new Error("API'den veri alınamadı");
    }

    const { islemler, toplamSayfa: totalPages } = firstRes.data;
    
    allData = [...(islemler || [])];
    toplamSayfa = totalPages || 1;

    console.log(`📊 İlk sayfa alındı: ${allData.length} kayıt, Toplam sayfa: ${toplamSayfa}`);

    // Diğer sayfaları sırayla çek
    if (toplamSayfa > 1) {
      console.log(`🔄 ${toplamSayfa - 1} ek sayfa çekilecek`);
      
      for (let page = 2; page <= toplamSayfa; page++) {
        console.log(`📡 Sayfa ${page} çekiliyor...`);
        
        const res = await axios.get(
          `${API_URL_SIRKETLER}/islemler/${sirketId}?sayfa=${page}&limit=${islemPerPage}`,
          { timeout: 10000 }
        );
        
        allData = [...allData, ...(res.data.islemler || [])];
        console.log(`✅ Sayfa ${page} alındı: ${res.data.islemler?.length || 0} kayıt`);
      }
    }

    console.log(`🎉 Tüm veriler alındı: ${allData.length} toplam kayıt`);
    return allData;

  } catch (error) {
    console.error("❌ fetchAllHistory hatası:", error);
    throw error;
  }
};

const exportToPDF = async () => {
    if (!selectedSirket || allCompanyTransactions.length === 0) {
        toast.error("PDF oluşturmak için işlem geçmişi bulunamadı.");
        return;
    }

    try {
        const pdfData = [...allCompanyTransactions].reverse();
        const paraBirimi = selectedSirket.sirketCariBirimi || 'TRY';
        const sayfaBasinaIslem = 22; // A4 sayfasına uygun kayıt sayısı
        const toplamSayfa = Math.ceil(pdfData.length / sayfaBasinaIslem);
        const formatDate = d => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        
        const formatTutar = (tutar) => {
            if (tutar === 0) return `0.00`;
            const sign = tutar > 0 ? '+' : '';
            return `${sign}${tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        const formatBakiye = (bakiye) => {
             return `${bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        
        let tumSayfalarHTML = '';

        for (let s = 0; s < toplamSayfa; s++) {
            const bas = s * sayfaBasinaIslem;
            const bit = bas + sayfaBasinaIslem;
            const sayfaIslemleri = pdfData.slice(bas, bit);

            const headerHTML = `
                <div class="header">
                    <div class="header-sol">
                        <strong>BOZKURTSAN DERİ SAN. TİC. LTD. ŞTİ.</strong>
                        <p>Yenişehir Mahallesi 1245 Sokak. No: 31<br>Konak, İzmir</p>
                    </div>
                    <div class="header-orta">
                        <h1>HESAP EKSTRESİ</h1>
                    </div>
                    <div class="header-sag">
                        <strong>${selectedSirket.sirketAdi}</strong>
                        <p>Cari Kodu: ${selectedSirket.sirketKodu}<br>
                           Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>
            `;

            const footerHTML = `
                <div class="footer">
                    <p>Bu hesap ekstresi elektronik ortamda oluşturulmuştur.</p>
                    <p>Sayfa ${s + 1} / ${toplamSayfa}</p>
                </div>
            `;

            const sayfaHTML = `
                <div class="sayfa">
                    ${headerHTML}
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width:10%;">Tarih</th>
                                    <th style="width:38%;">Açıklama</th>
                                    <th style="width:17%;" class="text-right">Tutar (${paraBirimi})</th>
                                    <th style="width:17%;" class="text-right">Önceki Bakiye (${paraBirimi})</th>
                                    <th style="width:18%;" class="text-right">Sonraki Bakiye (${paraBirimi})</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sayfaIslemleri.map(item => `
                                    <tr>
                                        <td class="text-center">${formatDate(item.tarih)}</td>
                                        <td>${item.islemAciklamasi || item.aciklama || '-'}</td>
                                        <td class="text-right ${item.gercekTutar >= 0 ? 'borc' : 'alacak'}">
                                            ${formatTutar(item.gercekTutar)}
                                        </td>
                                        <td class="text-right">
                                            ${formatBakiye(item.previousBalance)}
                                        </td>
                                        <td class="text-right">
                                            <strong>${formatBakiye(item.currentBalance)}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${footerHTML}
                </div>
            `;
            tumSayfalarHTML += sayfaHTML;
        }

        const pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        font-size: 8pt; 
                        color: #1d1d1f; /* Apple Black */
                        margin: 0;
                    }
					
					table, tr, td, th {
    page-break-inside: avoid !important;
    page-break-before: auto !important;
    page-break-after: auto !important;
}

                    /* SAYFA YAPISI: Flexbox ile footer'ı en alta itiyoruz, çakışmayı ve boş sayfaları önlüyoruz. */
                    .sayfa {
                        padding: 15mm;
                        box-sizing: border-box;
                        width: 210mm;
                        height: 287mm; /* 1mm boşluk bırakarak render hatalarını önler */
                        display: flex;
                        flex-direction: column;
                        page-break-after: always;
                    }
                    .sayfa:last-child {
                        page-break-after: avoid;
                    }

                    /* BAŞLIK ALANI */
                    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8mm; border-bottom: 1px solid #d2d2d7; }
                    .header-sol, .header-sag { flex: 1; }
                    .header-orta { flex: 1.2; text-align: center; }
                    .header p { font-size: 8pt; color: #6e6e73; margin: 2px 0 0 0; line-height: 1.4; }
                    .header strong { font-size: 9pt; font-weight: 600; }
                    .header h1 { font-size: 16pt; margin: 0; font-weight: 600; letter-spacing: -0.5px; }
                    .header-sag { text-align: right; }
                    
                    /* TABLO ALANI */
                    .table-container { flex-grow: 1; margin-top: 8mm; }
                    table { width: 100%; border-collapse: collapse; }
                    thead th {
                        text-align: left;
                        font-weight: 500;
                        font-size: 7.5pt;
                        color: #6e6e73;
                        padding: 8px;
                        border-bottom: 1px solid #d2d2d7;
                        text-transform: uppercase;
                    }
                    tbody td { padding: 8px; border-bottom: 1px solid #e5e5e5; }
                    tbody tr:last-child td { border-bottom: none; }
                    
                    /* METİN HİZALAMA ve RENKLER */
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .borc { color: #d93d2e; /* Apple Red */ }
                    .alacak { color: #2ba453; /* Apple Green */ }
                    tbody td strong { font-weight: 600; color: #1d1d1f; }

                    /* FOOTER (ALT BİLGİ) */
                    .footer {
                        margin-top: auto; /* Flexbox ile en alta sabitler */
                        padding-top: 5mm;
                        border-top: 1px solid #d2d2d7;
                        display: flex;
                        justify-content: space-between;
                        font-size: 7pt;
                        color: #86868b; /* Apple Gray */
                    }
                </style>
            </head>
            <body>${tumSayfalarHTML}</body>
            </html>
        `;

await html2pdf().set({
    margin: 0,
    filename: `${selectedSirket.sirketAdi}_Ekstre.pdf`,
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, // scrollY:0 eklendi
}).from(pdfContent).save();

        
        toast.success("PDF başarıyla oluşturuldu!");

    } catch (err) {
        console.error("PDF oluşturma hatası:", err);
        toast.error(`Ekstre oluşturulamadı: ${err.message}`);
    }
};


    return (
        <div style={{ position: 'relative', padding: '24px' }}>
            {/* Loading Overlay */}
            {isLoading && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50,
                    }}
                >
                    <div style={{ textAlign: 'center', color: 'white' }}>
                        <div
                            className="loading-spinner large"
                            style={{
                                width: '48px',
                                height: '48px',
                                border: '4px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 12px',
                            }}
                        />
                        <p>Yükleniyor...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', // Yeşil-Turkuaz gradient
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    marginBottom: '24px',
                }}
            >
                {/* SVG Grain Overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage:
                            "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'><circle cx='25' cy='25' r='1' fill='white' opacity='0.1'/><circle cx='75' cy='75' r='1' fill='white' opacity='0.1'/><circle cx='50' cy='10' r='0.5' fill='white' opacity='0.15'/><circle cx='20' cy='80' r='0.8' fill='white' opacity='0.12'/></pattern></defs><rect width='100' height='100' fill='url(%23grain)'/></svg>\")",
                        pointerEvents: 'none',
                    }}
                />

                {/* Header Content */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center', // başlık ortalanıyor
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <FiDollarSign size={28} color="white" />
                        </div>
                        <h1
                            style={{
                                fontSize: '2.25rem',
                                fontWeight: '700',
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                margin: 0,
                            }}
                        >
                            Şirket Yönetimi
                        </h1>
                    </div>

                    {(view === 'detail' || view === 'add') && (
                        <button
                            onClick={handleBackToList}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 500,
                                backgroundColor: 'white',
                                color: '#111827',
                                marginTop: '16px',
                            }}
                        >
                            <FiArrowLeft size={18} /> Geri
                        </button>
                    )}
                </div>
            </div>



            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
                <div className="modern-alert">
                    <div className="alert-content">
                        <FiAlertCircle className="alert-icon" />
                        <div className="alert-text">
                            <strong>Dikkat!</strong> Kaydedilmemiş değişiklikleriniz var
                        </div>
                    </div>
                </div>
            )}

            {view === 'list' && (
                <div className="modern-list-view">
                    <div className="list-controls">
                        <div className="filter-section">
                            <div className="filter-title">
                                <FiFilter className="filter-icon" />
                                <span>Filtrele</span>
                            </div>
                            <div className="filter-buttons">
                                <button
                                    className={`modern-filter-btn ${filter === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilter('all')}
                                >
                                    <FiGlobe className="btn-icon" />
                                    <span>Tüm Şirketler</span>
                                    <span className="count-badge">{sirketler.length}</span>
                                </button>
                                <button
                                    className={`modern-filter-btn ${filter === 'alici' ? 'active' : ''}`}
                                    onClick={() => setFilter('alici')}
                                >
                                    <FiTrendingUp className="btn-icon" />
                                    <span>Alıcı Şirketler</span>
                                    <span className="count-badge">{sirketler.filter(s => s.tip === 'alici').length}</span>
                                </button>
                                <button
                                    className={`modern-filter-btn ${filter === 'satici' ? 'active' : ''}`}
                                    onClick={() => setFilter('satici')}
                                >
                                    <FiTrendingDown className="btn-icon" />
                                    <span>Satıcı Şirketler</span>
                                    <span className="count-badge">{sirketler.filter(s => s.tip === 'satici').length}</span>
                                </button>
                            </div>
                        </div>
                        <button className="btn btn-primary btn-add" onClick={handleAddView}>
                            <FiPlus className="btn-icon" />
                            <span>Yeni Şirket Ekle</span>
                        </button>
                    </div>

                    <div className="modern-companies-grid">
                        {currentSirketler.map(sirket => (
                            <div
                                key={sirket._id}
                                className="modern-company-card"
                                onClick={() => handleSelectSirket(sirket)}
                            >
                                <div className="company-card-header">
                                    <div className="company-main-info">
                                        <div className="company-name-section">
                                            <h3 className="company-name">{sirket.sirketAdi}</h3>
                                            <span className={`company-type-badge ${sirket.tip}`}>
                                                {sirket.tip === 'alici' ? (
                                                    <>
                                                        <FiTrendingUp className="badge-icon" />
                                                        Alıcı
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiTrendingDown className="badge-icon" />
                                                        Satıcı
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <div className="company-code">
                                            <FiBriefcase className="info-icon" />
                                            <span>{sirket.sirketKodu}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="company-card-body">
                                    <div className="company-details">
                                        <div className="detail-item">
                                            <FiMapPin className="detail-icon" />
                                            <span>{sirket.sirketBolgesi || 'Belirtilmemiş'}</span>
                                        </div>
                                        {sirket.emailler && sirket.emailler.length > 0 && (
                                            <div className="detail-item">
                                                <FiMail className="detail-icon" />
                                                <span>{sirket.emailler.length} email adresi</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="company-balance-section">
                                        <div className="balance-label">
                                            {(sirket.sirketCarisi || 0) >= 0 ? 'Bize Borçlu' : 'Biz Borçluyuz'}
                                        </div>
                                        <div className={`balance-amount ${(sirket.sirketCarisi || 0) >= 0 ? 'positive' : 'negative'}`}>
                                            {Math.abs(sirket.sirketCarisi || 0).toLocaleString()} {sirket.sirketCariBirimi}
                                        </div>
                                    </div>
                                </div>

                                <div className="company-card-footer">
                                    <div className="card-action-hint">
                                        <span>Detayları görüntülemek için tıklayın</span>
                                        <FiArrowLeft className="hint-arrow" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {totalSirketPages > 1 && (
                            <div className="modern-pagination">
                                <button
                                    className="pagination-btn prev"
                                    onClick={() => setSirketPage(prev => Math.max(prev - 1, 1))}
                                    disabled={sirketPage === 1}
                                >
                                    <FiArrowLeft />
                                    <span>Önceki</span>
                                </button>
                                <div className="pagination-numbers">
                                    {[...Array(Math.min(5, totalSirketPages))].map((_, index) => {
                                        const pageNum = sirketPage <= 3 ? index + 1 : sirketPage - 2 + index;
                                        if (pageNum <= totalSirketPages) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`pagination-number ${sirketPage === pageNum ? 'active' : ''}`}
                                                    onClick={() => setSirketPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                                <button
                                    className="pagination-btn next"
                                    onClick={() => setSirketPage(prev => Math.min(prev + 1, totalSirketPages))}
                                    disabled={sirketPage === totalSirketPages}
                                >
                                    <span>Sonraki</span>
                                    <FiArrowLeft style={{ transform: 'rotate(180deg)' }} />
                                </button>
                            </div>
                        )}

                        {filteredSirketler.length === 0 && (
                            <div className="no-companies-modern">
                                <div className="no-companies-icon">
                                    <FiBriefcase />
                                </div>
                                <h3>Şirket Bulunamadı</h3>
                                <p>
                                    {filter === 'all'
                                        ? 'Henüz hiç şirket eklenmemiş'
                                        : `${filter === 'alici' ? 'Alıcı' : 'Satıcı'} kategorisinde şirket bulunmuyor`
                                    }
                                </p>
                                <button className="btn btn-primary" onClick={handleAddView}>
                                    <FiPlus /> İlk Şirketi Ekle
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'add' && (
                <div className="modern-add-view">
                    <div className="add-form-card">
                        <div className="form-card-header">
                            <div className="header-icon">
                                <FiPlus />
                            </div>
                            <div className="header-text">
                                <h2>Yeni Şirket Ekle</h2>
                                <p>Yeni bir iş ortağı kaydı oluşturun</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddSirket} className="modern-form">
                            <div className="form-section">
                                <h3 className="section-title">
                                    <FiBriefcase className="section-icon" />
                                    Temel Bilgiler
                                </h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Şirket Adı *</label>
                                        <input
                                            type="text"
                                            className="form-control modern"
                                            value={sirketForm.sirketAdi}
                                            onChange={e => handleFormChange('sirketAdi', e.target.value)}
                                            required
                                            placeholder="Şirket adını giriniz"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Şirket Kodu *</label>
                                        <input
                                            type="text"
                                            className="form-control modern"
                                            value={sirketForm.sirketKodu}
                                            onChange={e => handleFormChange('sirketKodu', e.target.value)}
                                            required
                                            placeholder="Örn: ABC001"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Bölge</label>
                                        <input
                                            type="text"
                                            className="form-control modern"
                                            value={sirketForm.sirketBolgesi}
                                            onChange={e => handleFormChange('sirketBolgesi', e.target.value)}
                                            placeholder="İl/İlçe"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Şirket Tipi</label>
                                        <div className="radio-group modern">
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="tip"
                                                    value="alici"
                                                    checked={sirketForm.tip === 'alici'}
                                                    onChange={e => handleFormChange('tip', e.target.value)}
                                                />
                                                <span className="radio-custom"></span>
                                                <FiTrendingUp className="radio-icon" />
                                                <span>Alıcı Şirket</span>
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="tip"
                                                    value="satici"
                                                    checked={sirketForm.tip === 'satici'}
                                                    onChange={e => handleFormChange('tip', e.target.value)}
                                                />
                                                <span className="radio-custom"></span>
                                                <FiTrendingDown className="radio-icon" />
                                                <span>Satıcı Şirket</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Başlangıç Borç Durumu</label>
                                        <input
                                            type="number"
                                            className="form-control modern"
                                            value={sirketForm.sirketCarisi}
                                            onChange={e => handleFormChange('sirketCarisi', Number(e.target.value))}
                                            placeholder="0"
                                        />
                                        <small className="form-help">
                                            Pozitif: Bize borçlu, Negatif: Biz borçluyuz
                                        </small>
                                    </div>
                                    <div className="form-group">
                                        <label>Para Birimi</label>
                                        <select
                                            className="form-control modern"
                                            value={sirketForm.sirketCariBirimi}
                                            onChange={e => handleFormChange('sirketCariBirimi', e.target.value)}
                                        >
                                            <option value="TRY">🇹🇷 Türk Lirası</option>
                                            <option value="USD">🇺🇸 Amerikan Doları</option>
                                            <option value="EUR">🇪🇺 Euro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 className="section-title">
                                    <FiMail className="section-icon" />
                                    Email Adresleri
                                    <span className="email-counter">{sirketForm.emailler.length}/3</span>
                                </h3>

                                {sirketForm.emailler.length > 0 && (
                                    <div className="added-emails">
                                        {sirketForm.emailler.map((email, index) => (
                                            <div key={email._id} className="added-email-item">
                                                <div className="email-info">
                                                    {email.birincil && <FiStar className="primary-star" />}
                                                    <span className="email-address">{email.email}</span>
                                                    {email.aciklama && <span className="email-desc">({email.aciklama})</span>}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="remove-email-btn"
                                                    onClick={() => removeEmailFromForm(email._id)}
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="email-add-section">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Email Adresi</label>
                                            <input
                                                type="email"
                                                className="form-control modern"
                                                value={emailForm.email}
                                                onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="ornek@sirket.com"
                                                disabled={sirketForm.emailler.length >= 3}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Açıklama</label>
                                            <select
                                                className="form-control modern"
                                                value={emailForm.aciklama}
                                                onChange={(e) => setEmailForm(prev => ({ ...prev, aciklama: e.target.value }))}
                                                disabled={sirketForm.emailler.length >= 3}
                                            >
                                                <option value="">Seçiniz</option>
                                                <option value="Genel">Genel</option>
                                                <option value="Muhasebe">Muhasebe</option>
                                                <option value="İletişim">İletişim</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="email-options">
                                        <label className="checkbox-label modern">
                                            <input
                                                type="checkbox"
                                                checked={emailForm.birincil}
                                                onChange={(e) => setEmailForm(prev => ({ ...prev, birincil: e.target.checked }))}
                                                disabled={sirketForm.emailler.length >= 3}
                                            />
                                            <span className="checkbox-custom"></span>
                                            <span>Birincil email adresi</span>
                                        </label>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={addEmailToForm}
                                            disabled={sirketForm.emailler.length >= 3 || !emailForm.email}
                                        >
                                            <FiPlus /> Email Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary btn-large" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <div className="loading-spinner"></div>
                                            <span>Kaydediliyor...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiSave />
                                            <span>Şirketi Kaydet</span>
                                        </>
                                    )}
                                </button>
                                <button type="button" className="btn btn-secondary btn-large" onClick={handleBackToList}>
                                    <FiXCircle />
                                    <span>İptal</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {view === 'detail' && selectedSirket && (
                <div className="modern-detail-view">
                    <div className="detail-header-card">
                        <div className="company-info-section">
                            <div className="company-main-details">
                                <div className="company-title">
                                    <div className="company-name-wrapper">
                                        <h2 className="company-name">{selectedSirket.sirketAdi}</h2>
                                        <span className={`company-type-badge large ${selectedSirket.tip}`}>
                                            {selectedSirket.tip === 'alici' ? (
                                                <>
                                                    <FiTrendingUp />
                                                    Alıcı Şirket
                                                </>
                                            ) : (
                                                <>
                                                    <FiTrendingDown />
                                                    Satıcı Şirket
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <div className="company-meta">
                                        <div className="meta-item">
                                            <FiBriefcase className="meta-icon" />
                                            <span>{selectedSirket.sirketKodu}</span>
                                        </div>
                                        <div className="meta-item">
                                            <FiMapPin className="meta-icon" />
                                            <span>{selectedSirket.sirketBolgesi || 'Belirtilmemiş'}</span>
                                        </div>
                                        {selectedSirket.emailler && selectedSirket.emailler.length > 0 && (
                                            <div className="meta-item">
                                                <FiMail className="meta-icon" />
                                                <span>{selectedSirket.emailler.length} email adresi</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="balance-display">
                                <div className="balance-label">Güncel Borç Durumu</div>
                                <div className={`balance-amount large ${(selectedSirket.sirketCarisi || 0) >= 0 ? 'positive' : 'negative'}`}>
                                    {Math.abs(selectedSirket.sirketCarisi || 0).toLocaleString()} {sirketCariBirimi}
                                </div>
                                <div className="balance-status">
                                    {(selectedSirket.sirketCarisi || 0) >= 0 ? (
                                        <>
                                            <FiTrendingUp className="status-icon positive" />
                                            Bize Borçlu
                                        </>
                                    ) : (
                                        <>
                                            <FiTrendingDown className="status-icon negative" />
                                            Biz Borçluyuz
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="detail-actions">
                            <button
                                className="btn btn-outline"
                                onClick={() => setShowEmailManager(true)}
                            >
                                <FiMail />
                                <span>Email Yönetimi</span>
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowEditSirketModal(true)}
                            >
                                <FiEdit />
                                <span>Düzenle</span>
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteSirket}
                            >
                                <FiTrash2 />
                                <span>Sil</span>
                            </button>
                        </div>
                    </div>

                    <div className="detail-tabs-container">
                        <div className="modern-tabs">
                            <button
                                className={`modern-tab-btn ${activeTab === 'gecmis' ? 'active' : ''}`}
                                onClick={() => {
                                    if (hasUnsavedChanges && !window.confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam etmek istediğinizden emin misiniz?')) return;
                                    setActiveTab('gecmis');
                                    setIsEditingIslem(false);
                                    setEditingIslem(null);
                                    setHasUnsavedChanges(false);
                                }}
                            >
                                <div className="tab-content">
                                    <FiCalendar className="tab-icon" />
                                    <div className="tab-text">
                                        <span className="tab-title">İşlem Geçmişi</span>
                                        <span className="tab-count">{combinedHistory.length} kayıt</span>
                                    </div>
                                </div>
                            </button>
                            <button
                                className={`modern-tab-btn ${activeTab === 'islem' ? 'active' : ''}`}
                                onClick={() => {
                                    if (hasUnsavedChanges && !window.confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam etmek istediğinizden emin misiniz?')) return;
                                    setActiveTab('islem');
                                    setIsEditingIslem(false);
                                    setEditingIslem(null);
                                    setHasUnsavedChanges(false);
                                }}
                            >
                                <div className="tab-content">
                                    <FiZap className="tab-icon" />
                                    <div className="tab-text">
                                        <span className="tab-title">{isEditingIslem ? 'İşlem Düzenle' : 'Yeni İşlem'}</span>
                                        <span className="tab-subtitle">{isEditingIslem ? 'Mevcut işlemi güncelle' : 'Hızlı işlem ekle'}</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {activeTab === 'gecmis' && (
    <div className="modern-history-section">
        {isHistoryLoading ? (
            <div style={{textAlign: 'center', padding: '60px'}}>
                <div className="loading-spinner large" style={{margin: '0 auto'}}></div>
                <p style={{marginTop: '16px', fontSize: '16px', color: '#666'}}>
                    Tüm işlem geçmişi yükleniyor...
                </p>
            </div>
        ) : (
            <>
                <div className="history-header">
                    <h3>İşlem ve Çek/Senet Geçmişi</h3>
                    <button
                        className="export-btn pdf"
                        onClick={exportToPDF}
                        title="PDF'e Aktar"
                    >
                        <FiFileText size={16} />
                        <span>PDF</span>
                    </button>
                    {totalPages > 1 && (
                        <div className="pagination-info">
                            <span>Sayfa {currentPage} / {totalPages}</span>
                            <span className="total-records">({allCompanyTransactions.length} kayıt)</span>
                        </div>
                    )}
                </div>

                <div className="modern-table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Açıklama</th>
                                <th>Tip</th>
                                <th>Tutar</th>
                                <th>Önceki Borç</th>
                                <th>Yeni Borç</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? (
                                currentItems.map((item, index) => (
                                    <tr key={item._id || index} className={`table-row ${item.tip === 'Başlangıç Borcu' ? 'initial-row' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleIslemRowClick(item)}
                                    >
                                        <td className="date-cell">
                                            <div className="date-content">
                                                <FiCalendar className="date-icon" />
                                                <span>{new Date(item.tarih).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                        </td>
                                        <td className="description-cell">
                                            <div className="description-content">
                                                {item.aciklama || item.islemAciklamasi || '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`modern-badge ${getBadgeClassForTip(item.tip)}`}>
                                                {item.tip}
                                            </span>
                                        </td>
                                        <td className="amount-cell">
                                            <span className={`amount ${(item.tutar || 0) >= 0 ? 'positive' : 'negative'}`}>
                                                {(item.tutar || 0) >= 0 ? '+' : ''}{(item.tutar || 0).toLocaleString()} {item.paraBirimi || sirketCariBirimi}
                                            </span>
                                        </td>
                                        <td className="balance-cell">
                                            <span className={`balance ${(item.previousBalance || 0).toLocaleString()}`}>
                                                {(item.previousBalance || 0).toLocaleString()} {item.paraBirimi || sirketCariBirimi}
                                            </span>
                                        </td>
                                        <td className="balance-cell">
                                            <span className={`balance ${(item.currentBalance || 0).toLocaleString()}`}>
                                                {(item.currentBalance || 0).toLocaleString()} {item.paraBirimi || sirketCariBirimi}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${item.durum === 'Ödendi' ? 'paid' : 'pending'}`}>
                                                {item.durum === 'Ödendi' ? (
                                                    <>
                                                        <FiCheck className="status-icon" /> Ödendi
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiClock className="status-icon" /> {item.durum || 'Tamamlandı'}
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <div className="action-buttons">
                                                {(item.tip === 'İşlem' || item.tip === 'Satış' || item.tip === 'Alış' || item.tip === 'Ödeme Alındı' || item.tip === 'Ödeme Yapıldı') && item.tip !== 'Başlangıç Borcu' && (
                                                    <>
                                                        <button
                                                            className="action-btn edit"
                                                            onClick={(e) => { e.stopPropagation(); handleEditIslem(item); }}
                                                            title="Düzenle"
                                                        >
                                                            <FiEdit />
                                                        </button>
                                                        <button
                                                            className="action-btn delete"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteIslem(item._id); }}
                                                            title="Sil"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="no-data">
                                        <div className="no-data-content">
                                            <FiCalendar className="no-data-icon" />
                                            <h4>Henüz işlem kaydı bulunmuyor</h4>
                                            <p>Yeni işlem eklemek için "Yeni İşlem" sekmesini kullanabilirsiniz</p>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => setActiveTab('islem')}
                                            >
                                                <FiPlus /> İlk İşlemi Ekle
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="modern-pagination">
                        <button
                            className="pagination-btn prev"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <FiArrowLeft />
                            <span>Önceki</span>
                        </button>
                        <div className="pagination-numbers">
                             {[...Array(Math.min(5, totalPages))].map((_, index) => {
                                let pageNum = 1;
                                if (totalPages <= 5) {
                                    pageNum = index + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = index + 1;
                                } else if (currentPage >= totalPages - 2) {
                                     pageNum = totalPages - 4 + index;
                                } else {
                                    pageNum = currentPage - 2 + index;
                                }

                                if (pageNum > 0 && pageNum <= totalPages) {
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>
                        <button
                            className="pagination-btn next"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            <span>Sonraki</span>
                            <FiArrowLeft style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </div>
                )}
                
                {showIslemModal && selectedIslem && (
                    <div className="modal-overlay">
                        <div className="modal islem-detail-modal">
                            <div className="modal-header">
                                <h3>İşlem Detayı</h3>
                                <button
                                    type="button"
                                    className="modal-close-btn"
                                    onClick={() => {
                                        setShowIslemModal(false);
                                        setSelectedIslem(null);
                                        setIslemDetayData(null);
                                    }}
                                >
                                    <FiXCircle />
                                </button>
                            </div>
                            <div className="modal-content-x">
                                {islemDetayLoading ? (
                                    <div style={{textAlign: 'center', padding: '40px'}}>
                                        <div className="loading-spinner"></div>
                                        <p>Detaylar yükleniyor...</p>
                                    </div>
                                ) : islemDetayError ? (
                                    <p style={{ color: 'red', textAlign: 'center' }}>{islemDetayError}</p>
                                ) : islemDetayData ? (
                                    <>
                                        {selectedIslem.tip.toLowerCase().includes('sevkiyat') && renderSevkiyatDetay(islemDetayData)}
                                        {selectedIslem.tip.toLowerCase().includes('alış') && renderAlisDetay(islemDetayData)}
                                        {selectedIslem.tip.toLowerCase().includes('satış') && renderSatisDetay(islemDetayData)}
                                    </>
                                ) : (
                                    <>
                                        <div className="detay-header">
                                            <p><strong>Açıklama:</strong> {selectedIslem.islemAciklamasi || '-'}</p>
                                            <p><strong>Tutar:</strong> {selectedIslem.tutar?.toLocaleString()} {selectedIslem.paraBirimi}</p>
                                            <p><strong>Tarih:</strong> {new Date(selectedIslem.tarih).toLocaleString('tr-TR')}</p>
                                            <p><strong>Tip:</strong> {selectedIslem.tip}</p>
                                            {selectedIslem.durum && <p><strong>Durum:</strong> {selectedIslem.durum}</p>}
                                            <p><strong>Önceki Borç:</strong> {selectedIslem.previousBalance?.toLocaleString()} {selectedIslem.paraBirimi}</p>
                                            <p><strong>Yeni Borç:</strong> {selectedIslem.currentBalance?.toLocaleString()} {selectedIslem.paraBirimi}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
    </div>
)}
                    {activeTab === 'islem' && (
                        <div className="modern-transaction-section">
                            <div className="transaction-header">
                                <div className="header-content">
                                    <h3>{isEditingIslem ? 'İşlem Düzenle' : 'Yeni İşlem Ekle'}</h3>
                                    <p>{isEditingIslem ? 'Mevcut işlem bilgilerini güncelleyin' : 'Şirket ile olan mali işleminizi kaydedin'}</p>
                                </div>
                                {isEditingIslem && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            if (hasUnsavedChanges && !window.confirm('Kaydedilmemiş değişiklikler kaybolacak. İptal etmek istediğinizden emin misiniz?')) return;
                                            setIsEditingIslem(false);
                                            setEditingIslem(null);
                                            setTransactionForm({ islemTuru: 'satis', aciklama: '', tutar: '', odemeTuru: 'nakit' });
                                            setHasUnsavedChanges(false);
                                        }}
                                    >
                                        <FiX />
                                        <span>İptal</span>
                                    </button>
                                )}
                            </div>
                            {/* Sayfalama Kontrolleri */}
                            {totalPages > 1 && (
                                <div className="modern-pagination">
                                    <button
                                        className="pagination-btn prev"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <FiArrowLeft />
                                        <span>Önceki</span>
                                    </button>
                                    <div className="pagination-numbers">
                                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                                            const pageNum = currentPage <= 3 ? index + 1 : currentPage - 2 + index;
                                            if (pageNum <= totalPages) {
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                                        onClick={() => setCurrentPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                    <button
                                        className="pagination-btn next"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <span>Sonraki</span>
                                        <FiArrowLeft style={{ transform: 'rotate(180deg)' }} />
                                    </button>
                                </div>
                            )}
                            <div className="transaction-form-card">
                                <form onSubmit={isEditingIslem ? handleUpdateIslem : handleTransactionSubmit} className="modern-transaction-form">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>İşlem Tipi *</label>
                                            <select
                                                className="form-control modern"
                                                value={transactionForm.islemTuru}
                                                onChange={e => handleFormChange('islemTuru', e.target.value)}
                                                required
                                            >
                                                <option value="satis">📈 Satış (Borç Artar)</option>
                                                <option value="alis">📉 Alış (Borç Azalır)</option>
                                                <option value="odemeAl">💰 Ödeme Al (Borç Azalır)</option>
                                                <option value="odemeYap">💸 Ödeme Yap (Borç Artar)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tutar ({sirketCariBirimi}) *</label>
                                            <div className="input-with-icon">
                                                <FiDollarSign className="input-icon" />
                                                <input
                                                    type="number"
                                                    className="form-control modern"
                                                    value={transactionForm.tutar}
                                                    onChange={e => handleFormChange('tutar', e.target.value)}
                                                    min="0.01"
                                                    step="0.01"
                                                    required
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Açıklama</label>
                                            <input
                                                type="text"
                                                className="form-control modern"
                                                value={transactionForm.aciklama}
                                                onChange={e => handleFormChange('aciklama', e.target.value)}
                                                placeholder="İşlem açıklaması (opsiyonel)"
                                            />
                                        </div>
                                        {['odemeAl', 'odemeYap'].includes(transactionForm.islemTuru) && (
                                            <div className="form-group">
                                                <label>Ödeme Şekli</label>
                                                <select
                                                    className="form-control modern"
                                                    value={transactionForm.odemeTuru}
                                                    onChange={e => handleFormChange('odemeTuru', e.target.value)}
                                                >
                                                    <option value="nakit">💵 Nakit</option>
                                                    <option value="havale">🏦 Havale/EFT</option>
                                                    <option value="cek">📋 Çek</option>
                                                    <option value="senet">📄 Senet</option>
                                                    <option value="kredi">💳 Kredi Kartı</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-actions">
                                        <button type="submit" className="btn btn-primary btn-large">
                                            <FiSave />
                                            <span>{isEditingIslem ? 'Güncelle' : 'İşlemi Kaydet'}</span>
                                        </button>
                                        {!isEditingIslem && (
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={() => {
                                                    if (hasUnsavedChanges && !window.confirm('Form temizlenecek. Emin misiniz?')) return;
                                                    setTransactionForm({ islemTuru: 'satis', aciklama: '', tutar: '', odemeTuru: 'nakit' });
                                                    setHasUnsavedChanges(false);
                                                }}
                                            >
                                                <FiRefreshCw />
                                                <span>Formu Temizle</span>
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Email Manager Modal */}
            {showEmailManager && selectedSirket && (
                <div className="modal-overlay">
                    <div className="modal large">
                        <EmailManager
                            sirket={selectedSirket}
                            onEmailAdd={handleEmailAdd}
                            onEmailUpdate={handleEmailUpdate}
                            onEmailDelete={handleEmailDelete}
                            onClose={() => setShowEmailManager(false)}
                        />
                    </div>
                </div>
            )}

            {/* Edit Sirket Modal */}
            {showEditSirketModal && selectedSirket && (
                <EditSirketModal
                    sirket={selectedSirket}
                    onSave={handleUpdateSirket}
                    onClose={() => setShowEditSirketModal(false)}
                />
            )}

            {/* Toast Container Placeholder */}
            <div className="toast-container">
                {/* Toast notifications would appear here */}
            </div>
        </div>
    );
};

const styles = `
.modern-sirket-container {
    padding: 24px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* YENİ MODAL TASARIMI VE FİYAT TABLOSU */
.islem-detail-modal .modal-content-x {
  padding: 8px 24px 24px 24px;
}

.detay-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.detay-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.detay-header p {
  font-size: 14px;
  color: #666;
  margin: 4px 0;
}

.detay-header strong {
  font-weight: 600;
  color: #333;
}

.detay-urunler-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.detay-urunler-table thead th {
  background-color: #f8f9fa;
  color: #495057;
  padding: 10px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #dee2e6;
}

.detay-urunler-table tbody td {
  padding: 10px;
  border-bottom: 1px solid #f1f1f1;
  vertical-align: top;
}

.detay-urunler-table tbody tr:last-child td {
  border-bottom: none;
}

.text-right {
  text-align: right;
}

.urun-adi {
  font-weight: 500;
  color: #2c3e50;
}

.urun-aciklama {
  font-size: 12px;
  color: #888;
  display: block;
}

.beden-list {
    list-style-type: none;
    padding: 0;
    margin: 5px 0 0 0;
    font-size: 12px;
    color: #555;
}
.beden-list li {
    display: inline-block;
    background: #e9ecef;
    padding: 2px 6px;
    border-radius: 4px;
    margin-right: 5px;
    margin-bottom: 3px;
}

/* Loading Overlay */
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-content {
    text-align: center;
    padding: 40px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e3e3e3;
    border-top: 2px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 8px;
}

.loading-spinner.large {
    width: 48px;
    height: 48px;
    border-width: 4px;
    margin: 0 0 16px 0;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Modern Header */
.modern-app-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    margin-bottom: 32px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32px;
    position: relative;
}

.header-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="%23ffffff" opacity="0.05"/><circle cx="75" cy="75" r="1" fill="%23ffffff" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.1;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 20px;
    position: relative;
    z-index: 1;
}

.header-icon-wrapper {
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
}

.header-main-icon {
    font-size: 28px;
    color: white;
}

.header-text h1 {
    font-size: 32px;
    font-weight: 700;
    color: white;
    margin: 0;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
    margin: 4px 0 0 0;
}

/* Modern Alert */
.modern-alert {
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 24px;
    border: none;
    box-shadow: 0 8px 25px rgba(255, 154, 158, 0.3);
}

.alert-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.alert-icon {
    font-size: 20px;
    color: #d63384;
    flex-shrink: 0;
}

.alert-text {
    color: #d63384;
    font-weight: 500;
}

/* Modern List View */
.modern-list-view {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.list-controls {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
}

.filter-section {
    flex: 1;
    min-width: 300px;
}

.filter-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
}

.filter-icon {
    font-size: 20px;
    color: #667eea;
}

.filter-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.modern-filter-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 14px;
    font-weight: 500;
    color: #6c757d;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.modern-filter-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    border-color: #667eea;
    color: #667eea;
}

.modern-filter-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: transparent;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-icon {
    font-size: 16px;
}

.count-badge {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.modern-filter-btn.active .count-badge {
    background: rgba(255, 255, 255, 0.3);
}

/* Modern Companies Grid */
.modern-companies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 24px;
}

.modern-company-card {
    background: white;
    border-radius: 20px;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    border: 2px solid transparent;
    overflow: hidden;
    position: relative;
}

.modern-company-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.modern-company-card:hover::before {
    transform: scaleX(1);
}

.modern-company-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    border-color: #667eea;
}

.company-card-header {
    padding: 24px 24px 0;
}

.company-main-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.company-name-section {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.company-name {
    font-size: 20px;
    font-weight: 700;
    color: #2c3e50;
    margin: 0;
    line-height: 1.3;
    flex: 1;
}

.company-type-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.company-type-badge.alici {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
}

.company-type-badge.satici {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    color: #856404;
}

.badge-icon {
    font-size: 14px;
}

.company-code {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6c757d;
    font-size: 14px;
    font-weight: 500;
}

.info-icon {
    font-size: 16px;
    color: #667eea;
}

.company-card-body {
    padding: 16px 24px;
}

.company-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6c757d;
}

.detail-icon {
    font-size: 16px;
    color: #667eea;
    flex-shrink: 0;
}

.company-balance-section {
    text-align: right;
    padding: 16px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-radius: 12px;
    margin: 0 -24px -24px;
    border-top: 1px solid #dee2e6;
}

.balance-label {
    font-size: 12px;
    color: #6c757d;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.balance-amount {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 0;
}

.balance-amount.positive {
    color: #28a745;
}

.balance-amount.negative {
    color: #dc3545;
}

.company-card-footer {
    padding: 16px 24px;
    background: rgba(102, 126, 234, 0.05);
    border-top: 1px solid rgba(102, 126, 234, 0.1);
}

.card-action-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    color: #667eea;
    font-weight: 500;
}

.hint-arrow {
    transform: rotate(180deg);
    transition: transform 0.3s ease;
}

.modern-company-card:hover .hint-arrow {
    transform: rotate(180deg) translateX(4px);
}

/* No Companies State */
.no-companies-modern {
    grid-column: 1 / -1;
    text-align: center;
    padding: 80px 40px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.no-companies-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: white;
}

.no-companies-modern h3 {
    font-size: 24px;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 8px;
}

.no-companies-modern p {
    color: #6c757d;
    margin-bottom: 24px;
    font-size: 16px;
}

/* Modern Add View */
.modern-add-view {
    max-width: 1000px;
    margin: 0 auto;
}

.add-form-card {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

.form-card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px;
    display: flex;
    align-items: center;
    gap: 20px;
    position: relative;
}

.form-card-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
}

.header-icon {
    width: 56px;
    height: 56px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: white;
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1;
}

.header-text {
    position: relative;
    z-index: 1;
}

.header-text h2 {
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px 0;
}

.header-text p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-size: 16px;
}

.modern-form {
    padding: 40px;
}

.form-section {
    margin-bottom: 40px;
}

.form-section:last-child {
    margin-bottom: 0;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f8f9fa;
}

.section-icon {
    font-size: 20px;
    color: #667eea;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
    margin-bottom: 24px;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group label {
    font-size: 5px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.form-control.modern {
    padding: 16px 20px;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    font-size: 16px;
    transition: all 0.3s ease;
    background: white;
    font-family: inherit;
}

.form-control.modern:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
}

.form-help {
    font-size: 12px;
    color: #6c757d;
    margin-top: 4px;
    font-style: italic;
}

.input-with-icon {
    position: relative;
}

.input-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
    font-size: 16px;
}

.input-with-icon .form-control {
    padding-left: 48px;
}

/* Radio Groups */
.radio-group.modern {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: white;
    flex: 1;
    min-width: 180px;
}

.radio-label:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
}

.radio-label input[type="radio"] {
    display: none;
}

.radio-custom {
    width: 20px;
    height: 20px;
    border: 2px solid #e9ecef;
    border-radius: 50%;
    position: relative;
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.radio-label input[type="radio"]:checked + .radio-custom {
    border-color: #667eea;
    background: #667eea;
}

.radio-label input[type="radio"]:checked + .radio-custom::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
}

.radio-icon {
    font-size: 18px;
    color: #6c757d;
    transition: color 0.3s ease;
}

.radio-label input[type="radio"]:checked ~ .radio-icon {
    color: #667eea;
}

.radio-label input[type="radio"]:checked ~ span:last-child {
    color: #667eea;
    font-weight: 600;
}

/* Email Management */
.email-counter {
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-left: auto;
}

.added-emails {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
}

.added-email-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: white;
    border-radius: 8px;
    margin-bottom: 8px;
    border: 1px solid #e9ecef;
}

.added-email-item:last-child {
    margin-bottom: 0;
}

.email-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.primary-star {
    color: #ffc107;
    font-size: 14px;
}

.email-address {
    font-weight: 500;
    color: #2c3e50;
}

.email-desc {
    color: #6c757d;
    font-size: 12px;
}

.remove-email-btn {
    background: #dc3545;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
}

.remove-email-btn:hover {
    background: #c82333;
    transform: scale(1.1);
}

.email-add-section {
    border: 2px dashed #e9ecef;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
}

.email-add-section:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.02);
}

.email-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    flex-wrap: wrap;
}

.checkbox-label.modern {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #2c3e50;
}

.checkbox-label input[type="checkbox"] {
    display: none;
}

.checkbox-custom {
    width: 18px;
    height: 18px;
    border: 2px solid #e9ecef;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
    background: #667eea;
    border-color: #667eea;
    color: white;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom::before {
    content: '✓';
    font-size: 12px;
    font-weight: bold;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: 2px solid transparent;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-decoration: none;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
}

.btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
}

.btn:hover::before {
    left: 100%;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
}

.btn-primary:hover {
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-danger {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    color: white;
}

.btn-outline {
    background: transparent;
    border-color: #667eea;
    color: #667eea;
}

.btn-outline:hover {
    background: #667eea;
    color: white;
}

.btn-back {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    backdrop-filter: blur(10px);
    border-color: rgba(255, 255, 255, 0.3);
}

.btn-add {
    background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
    color: white;
}

.btn-large {
    padding: 16px 32px;
    font-size: 16px;
}

.btn-sm {
    padding: 8px 16px;
    font-size: 12px;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.btn:disabled:hover {
    transform: none;
    box-shadow: none;
}

.form-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    padding-top: 32px;
    border-top: 2px solid #f8f9fa;
    flex-wrap: wrap;
}

/* Detail View */
.modern-detail-view {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.detail-header-card {
    background: white;
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    flex-wrap: wrap;
}

.company-info-section {
    flex: 1;
    min-width: 300px;
}

.company-title {
    margin-bottom: 20px;
}

.company-name-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.company-name {
    font-size: 28px;
    font-weight: 700;
    color: #2c3e50;
    margin: 0;
    line-height: 1.2;
    flex: 1;
    min-width: 200px;
}

.company-type-badge.large {
    padding: 12px 16px;
    font-size: 14px;
    gap: 8px;
}

.company-meta {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6c757d;
}

.meta-icon {
    font-size: 16px;
    color: #667eea;
}

.balance-display {
    text-align: center;
    padding: 24px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-radius: 16px;
    border: 2px solid #e9ecef;
    min-width: 200px;
}

.balance-label {
    font-size: 12px;
    color: #6c757d;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
}

.balance-amount.large {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 8px;
}

.balance-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
}

.status-icon {
    font-size: 16px;
}

.status-icon.positive {
    color: #28a745;
}

.status-icon.negative {
    color: #dc3545;
}

.detail-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

/* Tabs */
.detail-tabs-container {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.modern-tabs {
    display: flex;
    background: #f8f9fa;
}

.modern-tab-btn {
    flex: 1;
    padding: 24px;
    background: none;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    border-bottom: 4px solid transparent;
    position: relative;
}

.modern-tab-btn:hover {
    background: rgba(102, 126, 234, 0.05);
}

.modern-tab-btn.active {
    background: white;
    border-bottom-color: #667eea;
}

.tab-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.tab-icon {
    font-size: 20px;
    color: #6c757d;
    transition: color 0.3s ease;
}

.modern-tab-btn.active .tab-icon {
    color: #667eea;
}

.tab-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
}

.tab-title {
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
}

.tab-count,
.tab-subtitle {
    font-size: 12px;
    color: #6c757d;
}

/* History Section */
.modern-history-section {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.history-header {
    padding: 24px 32px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-bottom: 1px solid #e9ecef;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
}

.history-header h3 {
    font-size: 20px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0;
}

.pagination-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6c757d;
}

.total-records {
    font-weight: 500;
    color: #667eea;
}

.modern-table-container {
    overflow-x: auto;
}

.modern-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.modern-table th {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 16px 20px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: sticky;
    top: 0;
    z-index: 1;
}

.modern-table td {
font-size: 11px;
    padding: 8px 20px;
    border-bottom: 1px solid #f8f9fa;
    vertical-align: middle;
}

.table-row {
    transition: all 0.3s ease;
}

.table-row:hover {
    background: linear-gradient(135deg, #f8f9fa, #ffffff);
    transform: scale(1.001);
}

.table-row.initial-row {
    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
    font-weight: 600;
}

.date-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.date-icon {
    color: #667eea;
    font-size: 14px;
}

.description-content {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.modern-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.modern-badge.success { 
    background: linear-gradient(135deg, #d4edda, #c3e6cb); 
    color: #155724; 
}

.modern-badge.danger { 
    background: linear-gradient(135deg, #f8d7da, #f1b0b7); 
    color: #721c24; 
}

.modern-badge.primary { 
    background: linear-gradient(135deg, #cce5ff, #99d6ff); 
    color: #004085; 
}

.modern-badge.warning { 
    background: linear-gradient(135deg, #fff3cd, #ffeaa7); 
    color: #856404; 
}

.modern-badge.info { 
    background: linear-gradient(135deg, #d1ecf1, #bee5eb); 
    color: #0c5460; 
}

.modern-badge.secondary { 
    background: linear-gradient(135deg, #e2e3e5, #d1d3d4); 
    color: #383d41; 
}

.amount, .balance {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.amount.positive, .balance.positive {
    color: #28a745;
}

.amount.negative, .balance.negative {
    color: #dc3545;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-badge.paid {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
}

.status-badge.pending {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    color: #856404;
}

.status-icon {
    font-size: 12px;
}

.action-buttons {
    display: flex;
    gap: 4px;
}

.action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

.action-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.action-btn.edit {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
}

.action-btn.delete {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
}

.action-btn.success {
    background: linear-gradient(135deg, #51cf66, #40c057);
    color: white;
}

.action-btn.warning {
    background: linear-gradient(135deg, #ffd43b, #fab005);
    color: white;
}

.no-data {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
}

.no-data-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.no-data-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: white;
    margin-bottom: 8px;
}

.no-data-content h4 {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 8px 0;
}

.no-data-content p {
    color: #6c757d;
    margin: 0 0 16px 0;
}

/* Pagination */
.modern-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
    gap: 8px;
    background: #f8f9fa;
    border-top: 1px solid #e9ecef;
}

.pagination-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
    color: #6c757d;
}

.pagination-btn:hover:not(:disabled) {
    border-color: #667eea;
    color: #667eea;
    background: rgba(102, 126, 234, 0.05);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-numbers {
    display: flex;
    gap: 4px;
}

.pagination-number {
    width: 40px;
    height: 40px;
    border: 2px solid #e9ecef;
    background: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
    color: #6c757d;
}

.pagination-number:hover {
    border-color: #667eea;
    color: #667eea;
}

.pagination-number.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-color: transparent;
}

/* Transaction Section */
.modern-transaction-section {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.transaction-header {
    padding: 24px 32px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-bottom: 1px solid #e9ecef;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
}

.transaction-header .header-content {
    padding: 0;
    position: static;
}

.transaction-header .header-content::before {
    display: none;
}

.transaction-header h3 {
    font-size: 20px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0;
}

.transaction-header p {
    color: #6c757d;
    margin: 4px 0 0 0;
}

.transaction-form-card {
    padding: 32px;
}

.modern-transaction-form .form-grid {
    margin-bottom: 32px;
}

/* Email Manager */
.email-manager {
    width: 100%;
    max-width: 800px;
    background: white;
    border-radius: 20px;
    overflow: hidden;
}

.email-manager-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px 32px;
    position: relative;
}

.email-manager-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="emailPattern" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23emailPattern)"/></svg>');
}

.email-manager .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 1;
}

.header-title {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
}

.header-icon {
    font-size: 24px;
}

.header-title h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
}

.close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.email-manager-content {
    padding: 32px;
    max-height: 70vh;
    overflow-y: auto;
}

.email-manager-content h4 {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 16px 0;
}

.existing-emails {
    margin-bottom: 32px;
}

.email-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.email-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
}

.email-item:hover {
    background: white;
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.email-item.primary {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    border-color: #ffc107;
}

.email-info {
    flex: 1;
}

.email-address {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.primary-icon {
    color: #ffc107;
    font-size: 14px;
}

.email-text {
    font-weight: 500;
    color: #2c3e50;
    font-size: 15px;
}

.email-meta {
    display: flex;
    align-items: center;
    gap: 12px;
}

.email-description {
    color: #6c757d;
    font-size: 13px;
}

.primary-badge {
    background: #ffc107;
    color: #856404;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.email-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

.edit-btn {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
}

.delete-btn {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
}

.no-emails {
    text-align: center;
    padding: 40px;
    color: #6c757d;
}

.no-emails-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: white;
}

.email-form-section {
    border-top: 2px solid #f8f9fa;
    padding-top: 24px;
}

.email-form {
    background: #f8f9fa;
    padding: 24px;
    border-radius: 12px;
    border: 2px dashed #e9ecef;
}

.email-form:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.02);
}

/* Modal Enhancements */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.modal {
    background: white;
    border-radius: 20px;
    max-width: 95vw;
    max-height: 95vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.modal.large {
    width: 900px;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.enhanced-modal .modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px 32px;
    border-radius: 20px 20px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
}

.enhanced-modal .modal-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="modalPattern" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23modalPattern)"/></svg>');
}

.enhanced-modal .modal-header h3 {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    position: relative;
    z-index: 1;
}

.modal-icon {
    font-size: 20px;
}

.modal-close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1;
}

.modal-close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
}

.enhanced-modal .modal-content {
    padding: 32px;
}

.enhanced-modal .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
}

.enhanced-modal .form-group.full-width {
    grid-column: 1 / -1;
}

.modal-actions {
    display: flex;
    gap: 16px;
    justify-content: center;
    padding: 24px 32px;
    border-top: 2px solid #f8f9fa;
    background: #f8f9fa;
    border-radius: 0 0 20px 20px;
}

/* Responsive Design */
@media (max-width: 768px) {
    .modern-sirket-container {
        padding: 16px;
    }
    
    .header-content {
        flex-direction: column;
        gap: 16px;
        text-align: center;
    }
    
    .header-left {
        flex-direction: column;
        gap: 12px;
    }
    
    .header-text h1 {
        font-size: 24px;
    }
    
    .list-controls {
        flex-direction: column;
        gap: 16px;
    }
    
    .filter-buttons {
        flex-direction: column;
    }
    
    .modern-companies-grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    
    .company-name-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .detail-header-card {
        flex-direction: column;
        align-items: stretch;
        gap: 24px;
    }
    
    .balance-display {
        min-width: auto;
    }
    
    .detail-actions {
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .modern-tabs {
        flex-direction: column;
    }
    
    .tab-content {
        justify-content: center;
    }
    
    .modern-table-container {
        font-size: 12px;
    }
    
    .modern-table th,
    .modern-table td {
        padding: 8px 12px;
    }
    
    .form-grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    
    .radio-group.modern {
        flex-direction: column;
    }
    
    .email-options {
        flex-direction: column;
        align-items: stretch;
    }
    
    .form-actions,
    .modal-actions {
        flex-direction: column;
    }
    
    .modern-pagination {
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .pagination-numbers {
        order: -1;
    }
    
    .modal {
        margin: 10px;
        max-width: calc(100vw - 20px);
        max-height: calc(100vh - 20px);
    }
}

@media (max-width: 480px) {
    .modern-sirket-container {
        padding: 12px;
    }
    
    .header-content {
        padding: 20px;
    }
    
    .header-icon-wrapper {
        width: 48px;
        height: 48px;
    }
    
    .header-main-icon {
        font-size: 20px;
    }
    
    .header-text h1 {
        font-size: 20px;
    }
    
    .company-name {
        font-size: 16px;
    }
    
    .balance-amount {
        font-size: 16px;
    }
    
    .balance-amount.large {
        font-size: 24px;
    }
    
    .section-title {
        font-size: 16px;
    }
    
    .modern-table {
        font-size: 11px;
    }
    
    .action-buttons {
        flex-direction: column;
        gap: 4px;
    }
}

/* Toast Container */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5a6fd8, #6a4190);
}

/* Utilities */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 500; }
.opacity-50 { opacity: 0.5; }
.opacity-75 { opacity: 0.75; }

/* Animation Classes */
.fade-in {
    animation: fadeIn 0.3s ease;
}

.slide-up {
    animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Focus States */
.btn:focus,
.form-control:focus,
.modern-filter-btn:focus {
    outline: 2px solid #667eea;
    outline-offset: 2px;
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
    .modern-company-card {
        border: 2px solid #000;
    }
    
    .btn {
        border: 2px solid currentColor;
    }
    
    .modern-badge {
        border: 1px solid currentColor;
    }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    .btn:hover {
        transform: none;
    }
    
    .modern-company-card:hover {
        transform: none;
    }
}

/* Print Styles */
@media print {
    .modern-sirket-container {
        background: white;
        box-shadow: none;
    }
    
    .btn,
    .detail-actions,
    .form-actions,
    .modal-actions,
    .action-buttons {
        display: none;
    }
    
    .modern-app-header {
        background: white !important;
        color: black !important;
        border: 1px solid #ccc;
    }
    
    .modern-table {
        border: 1px solid #ccc;
    }
    
    .modern-table th,
    .modern-table td {
        border: 1px solid #ccc;
        background: white !important;
        color: black !important;
    }
}

/* Modern Companies Grid - Kompakt Versiyon */
.modern-companies-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
}

.modern-company-card {
    background: white;
    border-radius: 12px;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid #f0f0f0;
    overflow: hidden;
    position: relative;
    min-height: 160px;
}

.modern-company-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.modern-company-card:hover::before {
    transform: scaleX(1);
}

.modern-company-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    border-color: #667eea;
}

/* Kompakt Header */
.company-card-header {
    padding: 16px 18px 12px;
}

.company-main-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.company-name-section {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.company-name {
    font-size: 16px;
    font-weight: 700;
    color: #2c3e50;
    margin: 0;
    line-height: 1.3;
    flex: 1;
    min-width: 0; /* Taşmayı önler */
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}

.company-type-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}

.company-type-badge.alici {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    color: #155724;
}

.company-type-badge.satici {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    color: #856404;
}

.badge-icon {
    font-size: 11px;
}

.company-code {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #6c757d;
    font-size: 12px;
    font-weight: 500;
}

.info-icon {
    font-size: 14px;
    color: #667eea;
}

/* Kompakt Body */
.company-card-body {
    padding: 0 18px 12px;
}

.company-details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6c757d;
    line-height: 1.3;
}

.detail-icon {
    font-size: 13px;
    color: #667eea;
    flex-shrink: 0;
}

/* Kompakt Balance Section */
.company-balance-section {
    text-align: right;
    padding: 12px 18px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border-radius: 0;
    margin: 0 -1px -1px;
    border-top: 1px solid #e9ecef;
}

.balance-label {
    font-size: 10px;
    color: #6c757d;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
}

.balance-amount {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 0;
}

.balance-amount.positive {
    color: #28a745;
}

.balance-amount.negative {
    color: #dc3545;
}

/* Footer Kaldırıldı - Daha kompakt için */
.company-card-footer {
    display: none;
}

/* Liste Görünümü için Alternatif Kompakt Tasarım */
.modern-companies-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.modern-company-row {
    background: white;
    border-radius: 8px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 70px;
}

.modern-company-row:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border-color: #667eea;
}

.company-row-left {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
}

.company-row-badge {
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}

.company-row-info {
    flex: 1;
    min-width: 0;
}

.company-row-name {
    font-size: 15px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 2px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.company-row-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #6c757d;
}

.company-row-right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
}

.company-row-balance {
    text-align: right;
}

.balance-row-amount {
    font-size: 15px;
    font-weight: 700;
    margin: 0;
}

.balance-row-label {
    font-size: 10px;
    color: #6c757d;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
}

/* Görünüm Toggle Butonları */
.view-toggle {
    display: flex;
    background: white;
    border-radius: 10px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border: 1px solid #e9ecef;
    margin-bottom: 20px;
}

.view-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 13px;
    font-weight: 500;
    color: #6c757d;
}

.view-toggle-btn:hover {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
}

.view-toggle-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.toggle-icon {
    font-size: 14px;
}

/* Responsive Düzenlemeler */
@media (max-width: 768px) {
    .modern-companies-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }
    
    .modern-company-card {
        min-height: 140px;
    }
    
    .company-name {
        font-size: 15px;
    }
    
    .balance-amount {
        font-size: 14px;
    }
    
    .modern-company-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        min-height: auto;
        padding: 14px 16px;
    }
    
    .company-row-left {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }
    
    .company-row-meta {
        flex-wrap: wrap;
    }
}

@media (max-width: 480px) {
    .company-card-header {
        padding: 14px 16px 10px;
    }
    
    .company-card-body {
        padding: 0 16px 10px;
    }
    
    .company-balance-section {
        padding: 10px 16px;
    }
    
    .company-name {
        font-size: 14px;
    }
    
    .balance-amount {
        font-size: 13px;
    }
    
    .detail-item {
        font-size: 11px;
    }
}

/* Excel Tarzı Şirket Tablosu */
.modern-companies-table-container {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    border: 1px solid #e9ecef;
}

.companies-table-header {
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    padding: 16px 20px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
}

.table-header-left h3 {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.header-icon {
    font-size: 18px;
    color: #667eea;
}

.table-stats {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 14px;
    color: #6c757d;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
}

.stat-badge {
    background: #667eea;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
}

/* Modern Excel Tablosu */
.modern-companies-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    background: white;
}

.modern-companies-table thead th {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-right: 1px solid rgba(255,255,255,0.1);
    position: sticky;
    top: 0;
    z-index: 10;
    white-space: nowrap;
}

.modern-companies-table thead th:last-child {
    border-right: none;
}

.modern-companies-table tbody tr {
    transition: all 0.2s ease;
    cursor: pointer;
    border-bottom: 1px solid #f8f9fa;
}

.modern-companies-table tbody tr:nth-child(even) {
    background: #fcfcfc;
}

.modern-companies-table tbody tr:hover {
    background: linear-gradient(135deg, #f0f4ff, #e8f0fe);
    transform: scale(1.001);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.modern-companies-table td {
    padding: 12px 16px;
    border-right: 1px solid #f0f0f0;
    vertical-align: middle;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 0; /* Taşmayı kontrol eder */
}

.modern-companies-table td:last-child {
    border-right: none;
}

/* Sütun Genişlikleri */
.col-type { width: 80px; }
.col-name { width: 25%; min-width: 200px; max-width: 300px; }
.col-code { width: 120px; }
.col-contact { width: 15%; min-width: 150px; }
.col-email { width: 20%; min-width: 180px; }
.col-balance { width: 120px; }
.col-actions { width: 100px; }

/* İçerik Stilleri */
.company-name-cell {
    font-weight: 600;
    color: #2c3e50;
    white-space: normal !important;
    line-height: 1.3;
}

.company-code-cell {
    font-family: 'Courier New', monospace;
    color: #6c757d;
    font-size: 12px;
}

.company-type-mini-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 6px;
    border-radius: 6px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.company-type-mini-badge.alici {
    background: #d4edda;
    color: #155724;
}

.company-type-mini-badge.satici {
    background: #fff3cd;
    color: #856404;
}

.mini-badge-icon {
    font-size: 8px;
}

.contact-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.contact-primary {
    font-weight: 500;
    color: #2c3e50;
    font-size: 12px;
}

.contact-secondary {
    color: #6c757d;
    font-size: 11px;
}

.email-info {
    display: flex;
    align-items: center;
    gap: 4px;
}

.email-text {
    color: #2c3e50;
    font-size: 12px;
}

.email-count {
    background: #e9ecef;
    color: #6c757d;
    padding: 1px 4px;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 600;
}

.balance-cell {
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.balance-cell.positive {
    color: #28a745;
}

.balance-cell.negative {
    color: #dc3545;
}

.balance-cell.zero {
    color: #6c757d;
}

/* Aksiyon Butonları */
.table-actions {
    display: flex;
    gap: 4px;
    justify-content: center;
}

.table-action-btn {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 11px;
}

.table-action-btn:hover {
    transform: scale(1.1);
}

.table-action-btn.view {
    background: #667eea;
    color: white;
}

.table-action-btn.edit {
    background: #28a745;
    color: white;
}

.table-action-btn.delete {
    background: #dc3545;
    color: white;
}

/* Tablo Pagination */
.table-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #f8f9fa;
    border-top: 1px solid #e9ecef;
    font-size: 13px;
}

.pagination-info {
    color: #6c757d;
}

.pagination-info strong {
    color: #2c3e50;
    font-weight: 600;
}

.pagination-controls {
    display: flex;
    gap: 8px;
}

.pagination-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    color: #6c757d;
}

.pagination-btn:hover:not(:disabled) {
    border-color: #667eea;
    color: #667eea;
    background: rgba(102, 126, 234, 0.05);
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

/* Loading State */
.table-loading {
    text-align: center;
    padding: 40px;
    color: #6c757d;
}

.loading-spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 8px;
}

/* Empty State */
.table-empty {
    text-align: center;
    padding: 60px 20px;
    color: #6c757d;
}

.empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 16px;
    background: #f8f9fa;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #adb5bd;
}

/* Sıralama İkonları */
.sort-header {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    user-select: none;
}

.sort-icon {
    font-size: 10px;
    opacity: 0.5;
    transition: opacity 0.2s ease;
}

.sort-header:hover .sort-icon {
    opacity: 1;
}

.sort-header.active .sort-icon {
    opacity: 1;
    color: #ffd700;
}

/* Responsive Tasarım */
@media (max-width: 1200px) {
    .col-email { display: none; }
}

@media (max-width: 992px) {
    .col-contact { display: none; }
}

@media (max-width: 768px) {
    .modern-companies-table {
        font-size: 12px;
    }
    
    .modern-companies-table th,
    .modern-companies-table td {
        padding: 8px 12px;
    }
    
    .col-code { display: none; }
    
    .table-stats {
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .companies-table-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }
}

@media (max-width: 576px) {
    .table-actions {
        flex-direction: column;
        gap: 2px;
    }
    
    .table-action-btn {
        width: 20px;
        height: 20px;
        font-size: 10px;
    }
    
    .modern-companies-table {
        font-size: 11px;
    }
    
    .modern-companies-table th,
    .modern-companies-table td {
        padding: 6px 8px;
    }
}

/* Overflow Scroll için Container */
.table-scroll-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.table-scroll-container::-webkit-scrollbar {
    height: 6px;
}

.table-scroll-container::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.table-scroll-container::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* Hızlı Filtre Çubuğu */
.quick-filters {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: white;
    border-bottom: 1px solid #f0f0f0;
    flex-wrap: wrap;
}

.quick-filter-btn {
    padding: 4px 8px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 12px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #6c757d;
}

.quick-filter-btn:hover {
    background: #e9ecef;
    color: #495057;
}

.quick-filter-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
}

/* Kompakt Şirket Ekleme Formu */
.modern-add-view {
    max-width: 800px;
    margin: 0 auto;
}

.add-form-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    border: 1px solid #e9ecef;
}

/* Kompakt Form Header */
.form-card-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
}

.form-card-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="%23ffffff" opacity="0.08"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
}

.header-icon {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: white;
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
}

.header-text {
    position: relative;
    z-index: 1;
}

.header-text h2 {
    font-size: 20px;
    font-weight: 600;
    color: white;
    margin: 0 0 2px 0;
}

.header-text p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    font-size: 13px;
}

/* Kompakt Form İçeriği */
.modern-form {
    padding: 24px;
}

.form-section {
    margin-bottom: 24px;
}

.form-section:last-child {
    margin-bottom: 0;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #f8f9fa;
}

.section-icon {
    font-size: 16px;
    color: #667eea;
}

/* Kompakt Grid Sistemi */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
}

.form-grid.two-col {
    grid-template-columns: 1fr 1fr;
}

.form-grid.three-col {
    grid-template-columns: 1fr 1fr 1fr;
}

.form-group {
    display: flex;
    flex-direction: column;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.form-group.half-width {
    grid-column: span 1;
}

.form-group label {
    font-size: 12px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.required {
    color: #dc3545;
    font-size: 10px;
}

/* Kompakt Form Kontrolleri */
.form-control.modern {
    padding: 10px 12px;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    font-size: 13px;
    transition: all 0.2s ease;
    background: white;
    font-family: inherit;
}

.form-control.modern:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.form-control.modern.sm {
    padding: 8px 10px;
    font-size: 12px;
}

.form-help {
    font-size: 10px;
    color: #6c757d;
    margin-top: 2px;
    font-style: italic;
}

/* İkon'lu Input'lar */
.input-with-icon {
    position: relative;
}

.input-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #adb5bd;
    font-size: 14px;
}

.input-with-icon .form-control {
    padding-left: 36px;
}

/* Kompakt Radio Grupları */
.radio-group.modern {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
    flex: 1;
    min-width: 140px;
    font-size: 13px;
}

.radio-label:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.03);
}

.radio-label input[type="radio"] {
    display: none;
}

.radio-custom {
    width: 16px;
    height: 16px;
    border: 2px solid #e9ecef;
    border-radius: 50%;
    position: relative;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.radio-label input[type="radio"]:checked + .radio-custom {
    border-color: #667eea;
    background: #667eea;
}

.radio-label input[type="radio"]:checked + .radio-custom::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
}

.radio-icon {
    font-size: 14px;
    color: #6c757d;
    transition: color 0.2s ease;
}

.radio-label input[type="radio"]:checked ~ .radio-icon {
    color: #667eea;
}

.radio-label input[type="radio"]:checked ~ span:last-child {
    color: #667eea;
    font-weight: 500;
}

/* Email Yönetimi - Kompakt */
.email-counter {
    background: rgba(255, 255, 255, 0.15);
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    margin-left: auto;
}

.added-emails {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    max-height: 200px;
    overflow-y: auto;
}

.added-email-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    background: white;
    border-radius: 6px;
    margin-bottom: 6px;
    border: 1px solid #e9ecef;
    font-size: 12px;
}

.added-email-item:last-child {
    margin-bottom: 0;
}

.email-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
}

.primary-star {
    color: #ffc107;
    font-size: 12px;
}

.email-address {
    font-weight: 500;
    color: #2c3e50;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.email-desc {
    color: #6c757d;
    font-size: 10px;
    margin-left: 4px;
}

.remove-email-btn {
    background: #dc3545;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 10px;
}

.remove-email-btn:hover {
    background: #c82333;
    transform: scale(1.05);
}

.email-add-section {
    border: 1px dashed #e9ecef;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
}

.email-add-section:hover {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.01);
}

.email-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    flex-wrap: wrap;
}

/* Kompakt Checkbox */
.checkbox-label.modern {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: #2c3e50;
}

.checkbox-label input[type="checkbox"] {
    display: none;
}

.checkbox-custom {
    width: 14px;
    height: 14px;
    border: 1px solid #e9ecef;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
    background: #667eea;
    border-color: #667eea;
    color: white;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom::before {
    content: '✓';
    font-size: 9px;
    font-weight: bold;
}

/* Kompakt Butonlar */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    white-space: nowrap;
}

.btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-outline {
    background: transparent;
    border-color: #667eea;
    color: #667eea;
}

.btn-outline:hover {
    background: #667eea;
    color: white;
}

.btn-back {
    background: #6c757d;
    color: white;
}

.btn-add {
    background: #28a745;
    color: white;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 11px;
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    padding-top: 20px;
    border-top: 1px solid #f8f9fa;
    flex-wrap: wrap;
}

/* Inline Form Grupları */
.inline-group {
    display: flex;
    gap: 12px;
    align-items: end;
}

.inline-group .form-group {
    flex: 1;
    margin-bottom: 0;
}

.inline-group .btn {
    flex-shrink: 0;
    height: fit-content;
}

/* Accordion Bölümler (İsteğe Bağlı Detaylar İçin) */
.accordion-section {
    border: 1px solid #e9ecef;
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
}

.accordion-header {
    background: #f8f9fa;
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;
    font-size: 14px;
    font-weight: 500;
}

.accordion-header:hover {
    background: #e9ecef;
}

.accordion-header.active {
    background: #667eea;
    color: white;
}

.accordion-toggle {
    transition: transform 0.2s ease;
}

.accordion-header.active .accordion-toggle {
    transform: rotate(180deg);
}

.accordion-content {
    padding: 16px;
    border-top: 1px solid #e9ecef;
    display: none;
}

.accordion-content.active {
    display: block;
}

/* Responsive */
@media (max-width: 992px) {
    .form-main-layout {
        grid-template-columns: 1fr;
        gap: 24px;
    }
    
    .email-management-layout {
        flex-direction: column;
        gap: 16px;
    }
}

@media (max-width: 768px) {
    .modern-form {
        padding: 16px 20px;
    }
    
    .form-grid,
    .form-grid.three-col,
    .form-grid.four-col {
        grid-template-columns: 1fr;
        gap: 12px;
    }
    
    .radio-group.modern {
        flex-direction: column;
    }
    
    .radio-label {
        min-width: auto;
    }
    
    .inline-group {
        flex-direction: column;
        gap: 8px;
    }
    
    .form-actions {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .form-card-header {
        padding: 16px 20px;
    }
    
    .header-text h2 {
        font-size: 18px;
    }
    
    .modern-form {
        padding: 16px;
    }
    
    .section-title {
        font-size: 14px;
    }
    
    .form-control.modern {
        padding: 8px 10px;
        font-size: 12px;
    }
    
    .form-main-layout {
        gap: 16px;
    }
}

.modern-app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.modern-app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.15"/><circle cx="20" cy="80" r="0.8" fill="white" opacity="0.12"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  pointer-events: none;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon-wrapper {
  background: rgba(255, 255, 255, 0.2);
  padding: 1rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.header-main-icon {
  font-size: 2.5rem;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-text h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
}

.header-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0.5rem 0 0 0;
  font-weight: 400;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}


.modern-app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.modern-app-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.15"/><circle cx="20" cy="80" r="0.8" fill="white" opacity="0.12"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  pointer-events: none;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-icon-wrapper {
  background: rgba(255, 255, 255, 0.2);
  padding: 1rem;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.header-main-icon {
  font-size: 2.5rem;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-text h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
}

.header-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0.5rem 0 0 0;
  font-weight: 400;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.islem-detail-modal {
  max-width: 500px;
  width: 90%;
}
.islem-detail-modal .modal-content p {
  margin: 8px 0;
  font-size: 16px;
}

/* Modal genel */
.islem-detail-modal {
  background: #ffffff;         /* beyaz zemin */
  color: #222;                 /* koyu metin */
  border-radius: 16px;
  padding: 24px;
  max-width: 520px;
  width: 90%;
  /* kaydırmayı kapat */
  max-height: none;
  overflow: visible;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}

/* Başlık */
.islem-detail-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.islem-detail-modal .modal-header h3 {
  font-size: 22px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

/* İçerik */
.islem-detail-modal .modal-content p {
  margin: 10px 0;
  font-size: 17px;
  line-height: 1.6;
  color: #333;
}

/* Kapat butonu */
.modal-close-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #666;
}
.modal-close-btn:hover {
  color: #000;
}

/* Arka plan overlay */
.modal-overlay {
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
}

/* Arka planı kesin beyaz yap, metni koyu değil siyah üzerine okunur hale getir */
.modal.islem-detail-modal {
  background: #ffffff !important;    /* override için !important */
  color: #000000 !important;
  border-radius: 16px;
  padding: 24px;
  max-width: 520px;
  width: 90%;
  max-height: none;
  overflow: visible;
  box-shadow: 0 8px 20px rgba(0,0,0,0.25);
}

/* Başlık */
.modal.islem-detail-modal .modal-header h3 {
  font-size: 22px;
  font-weight: 600;
  color: #000 !important;
  margin: 0;
}

/* İçerik metinleri */
.modal.islem-detail-modal .modal-content-x p {
  margin: 10px 0;
  font-size: 17px;
  line-height: 1.6;
  color: #000 !important;
}

/* Kapat butonu */
.modal.islem-detail-modal .modal-close-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #555 !important;
}
.modal.islem-detail-modal .modal-close-btn:hover {
  color: #000 !important;
}

/* Arka plan overlay */
.modal-overlay {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.modern-history-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          padding: 24px;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .history-header h3 {
          margin: 0;
          color: #333;
          font-size: 24px;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .export-buttons {
          display: flex;
          gap: 8px;
        }
        
        .export-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .export-btn.excel {
          background: #217346;
          color: white;
        }
        
        .export-btn.excel:hover {
          background: #1a5c37;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(33, 115, 70, 0.3);
        }
        
        .export-btn.pdf {
          background: #dc3545;
          color: white;
        }
        
        .export-btn.pdf:hover {
          background: #c82333;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
        }
        
        .pagination-info {
          display: flex;
          gap: 10px;
          align-items: center;
          color: #666;
        }
        
        .total-records {
          color: #888;
          font-size: 14px;
        }
        
        .modern-table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .modern-table thead {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .modern-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        
        .modern-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .modern-table tbody tr {
          transition: all 0.2s ease;
        }
        
        .modern-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .date-cell .date-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .date-icon {
          color: #667eea;
        }
        
        .modern-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .modern-badge.success {
          background: #d4edda;
          color: #155724;
        }
        
        .modern-badge.warning {
          background: #fff3cd;
          color: #856404;
        }
        
        .modern-badge.info {
          background: #d1ecf1;
          color: #0c5460;
        }
        
        .modern-badge.danger {
          background: #f8d7da;
          color: #721c24;
        }
        
        .modern-badge.primary {
          background: #cce5ff;
          color: #004085;
        }
        
        .modern-badge.secondary {
          background: #e2e3e5;
          color: #383d41;
        }
        
        .amount-cell .amount.positive {
          color: #28a745;
          font-weight: 600;
        }
        
        .amount-cell .amount.negative {
          color: #dc3545;
          font-weight: 600;
        }
        
        .balance-cell .balance {
          font-weight: 500;
        }
        
        .balance-cell .balance.positive {
          color: #28a745;
        }
        
        .balance-cell .balance.negative {
          color: #dc3545;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .status-badge.paid {
          background: #d4edda;
          color: #155724;
        }
        
        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }
        
        .status-icon {
          width: 14px;
          height: 14px;
        }
        
        .actions-cell .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          padding: 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .action-btn.edit {
          background: #17a2b8;
          color: white;
        }
        
        .action-btn.edit:hover {
          background: #138496;
          transform: scale(1.1);
        }
        
        .action-btn.delete {
          background: #dc3545;
          color: white;
        }
        
        .action-btn.delete:hover {
          background: #c82333;
          transform: scale(1.1);
        }
        
        .no-data {
          text-align: center;
          padding: 60px 20px;
        }
        
        .no-data-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .no-data-icon {
          width: 48px;
          height: 48px;
          color: #ccc;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        
        .btn-primary {
          background: #667eea;
          color: white;
        }
        
        .btn-primary:hover {
          background: #5568d3;
        }
        
        .modern-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
        }
        
        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .pagination-btn:hover:not(:disabled) {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .pagination-numbers {
          display: flex;
          gap: 6px;
        }
        
        .pagination-number {
          width: 40px;
          height: 40px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .pagination-number:hover {
          background: #f0f0f0;
        }
        
        .pagination-number.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
        
        @media print {
          .export-buttons,
          .action-buttons,
          .modern-pagination {
            display: none !important;
          }
        }
		
		/* ... mevcut stillerinizin sonuna ekleyin ... */

.islem-detay-modal .modal-content-x {
  padding: 8px 24px 24px 24px;
}

.detay-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.detay-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.detay-header p {
  font-size: 14px;
  color: #666;
  margin: 4px 0;
}

.detay-header strong {
  font-weight: 600;
  color: #333;
}

.detay-urunler-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.detay-urunler-table thead th {
  background-color: #f8f9fa;
  color: #495057;
  padding: 10px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #dee2e6;
}

.detay-urunler-table tbody td {
  padding: 10px;
  border-bottom: 1px solid #f1f1f1;
  vertical-align: top;
}

.detay-urunler-table tbody tr:last-child td {
  border-bottom: none;
}

.text-right {
  text-align: right;
}

.urun-adi {
  font-weight: 500;
  color: #2c3e50;
}

.urun-aciklama {
  font-size: 12px;
  color: #888;
  display: block;
}

/* Sevkiyat Beden Listesi */
.beden-list {
    list-style-type: none;
    padding: 0;
    margin: 5px 0 0 0;
    font-size: 12px;
    color: #555;
}
.beden-list li {
    display: inline-block;
    background: #e9ecef;
    padding: 2px 6px;
    border-radius: 4px;
    margin-right: 5px;
    margin-bottom: 3px;
}
`;

export default function EnhancedSirketler() {
    return (
        <>
            <style>{styles}</style>
            <Sirketler />
        </>
    );
}

