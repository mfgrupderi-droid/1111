import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiCalendar, FiList, FiRefreshCw } from 'react-icons/fi';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import { ToastContainer, toast, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Payments.css';

dayjs.locale('tr');

// Para formatını Türkiye formatına çeviren fonksiyon
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === 0) {
        return '0,00';
    }
    
    const number = parseFloat(amount);
    if (isNaN(number)) {
        return '0,00';
    }
    
    return number.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Türkiye formatındaki parayı sayıya çeviren fonksiyon
const parseCurrency = (value) => {
    if (!value || value === '') return 0;
    
    const cleanValue = value.toString()
        .replace(/\./g, '')
        .replace(/,/g, '.');
    
    const number = parseFloat(cleanValue);
    return isNaN(number) ? 0 : number;
};

// Hafta numarası hesaplayan yardımcı fonksiyon
const getWeekNumber = (date) => {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
};

// Haftanın başlangıç tarihini bul
const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
};

// Gelecek haftanın başlangıç tarihini bul
const getNextWeekStart = (date) => {
    const weekStart = getWeekStart(date);
    return new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
};

// Önceki haftanın başlangıç tarihini bul
const getPreviousWeekStart = (date) => {
    const weekStart = getWeekStart(date);
    return new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
};

// Yeni bir ödeme için başlangıç verileri
const initialNewPayment = {
    fullName: '',
    carriedAmount: '',
    progressPayment: '',
    advancePayment: '',
    paidAmount: '',
    description: '',
    date: dayjs().format('YYYY-MM-DD')
};

const API_URL = 'http://31.57.33.249:3001/api/odemeler';

const Odemeler = () => {
    const [payments, setPayments] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [currentWeek, setCurrentWeek] = useState(null);
    const [viewMode, setViewMode] = useState('weekly');
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);

    const [modal, setModal] = useState({
        isOpen: false,
        message: '',
        type: 'confirm',
        onConfirm: null,
        onCancel: null,
    });

    // Tüm verileri API'den çeken fonksiyon
    const fetchPayments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(API_URL);
            setPayments(response.data);
        } catch (err) {
            console.error("API'den veri çekilirken hata:", err);
            setError('Veri yüklenirken bir hata oluştu.');
            toast.error('Veri yüklenirken hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Haftalık verileri çeken fonksiyon
    const fetchWeeklyData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/weekly`);
            setWeeklyData(response.data);
        } catch (err) {
            console.error("Haftalık veri çekilirken hata:", err);
            setError('Haftalık veri yüklenirken bir hata oluştu.');
            toast.error('Haftalık veri yüklenirken hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    // Belirli bir haftanın verilerini çeken fonksiyon
    const fetchWeekData = async (weekKey) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/week/${weekKey}`);
            setCurrentWeek(response.data);
            setPayments(response.data.payments);
        } catch (err) {
            console.error("Hafta verisi çekilirken hata:", err);
            setError('Hafta verisi yüklenirken bir hata oluştu.');
            toast.error('Hafta verisi yüklenirken hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'all') {
            fetchPayments();
        } else if (viewMode === 'weekly') {
            fetchWeeklyData();
        }
    }, [viewMode]);

    // Düzenleme kontrolü
    const checkUnsavedChanges = () => {
        return editingPaymentId !== null;
    };

    // Görüntüleme modunu değiştir
    const handleViewModeChange = (mode) => {
        if (checkUnsavedChanges()) {
            setModal({
                isOpen: true,
                message: 'Kaydedilmemiş değişiklikleriniz var. Devam ederseniz değişiklikler kaybolacak. Emin misiniz?',
                type: 'warning',
                onConfirm: () => {
                    setEditingPaymentId(null);
                    setViewMode(mode);
                    setCurrentWeek(null);
                    closeModal();
                },
                onCancel: closeModal
            });
            return;
        }

        setViewMode(mode);
        setCurrentWeek(null);
        setEditingPaymentId(null);
    };

    // Haftayı seç
    const handleWeekSelect = (weekKey) => {
        if (checkUnsavedChanges()) {
            setModal({
                isOpen: true,
                message: 'Kaydedilmemiş değişiklikleriniz var. Devam ederseniz değişiklikler kaybolacak. Emin misiniz?',
                type: 'warning',
                onConfirm: () => {
                    setEditingPaymentId(null);
                    setViewMode('week');
                    fetchWeekData(weekKey);
                    closeModal();
                },
                onCancel: closeModal
            });
            return;
        }

        setViewMode('week');
        fetchWeekData(weekKey);
    };

    // Haftalık görünüme geri dön
    const backToWeeklyView = () => {
        if (checkUnsavedChanges()) {
            setModal({
                isOpen: true,
                message: 'Kaydedilmemiş değişiklikleriniz var. Devam ederseniz değişiklikler kaybolacak. Emin misiniz?',
                type: 'warning',
                onConfirm: () => {
                    setEditingPaymentId(null);
                    setViewMode('weekly');
                    setCurrentWeek(null);
                    fetchWeeklyData();
                    closeModal();
                },
                onCancel: closeModal
            });
            return;
        }

        setViewMode('weekly');
        setCurrentWeek(null);
        fetchWeeklyData();
    };

    // Modal kapatma
    const closeModal = () => {
        setModal({ isOpen: false, message: '', type: 'confirm', onConfirm: null, onCancel: null });
    };

    // Giriş alanlarındaki değişiklikleri yönetir
    const handleCellChange = (id, field, value) => {
        const updatedPayments = payments.map(p =>
            p._id === id ? { ...p, [field]: value } : p
        );
        setPayments(updatedPayments);
    };

    // Para alanlarındaki değişiklikleri yönetir
const handleAmountChange = (id, field, value) => {
    const cleanValue = value.replace(/[^0-9.,-]/g, '');
    handleCellChange(id, field, cleanValue);
};

    // Yeni ödeme satırı ekler
    const handleAddRow = () => {
        if (checkUnsavedChanges()) {
            toast.warning("Önce mevcut düzenlemeyi kaydedin veya iptal edin!");
            return;
        }

        if (viewMode === 'weekly') {
            const today = new Date();
            const weekStart = getWeekStart(today);
            const weekNumber = getWeekNumber(weekStart);
            const weekKey = `${weekStart.getFullYear()}-W${weekNumber}`;

            setViewMode('week');
            fetchWeekData(weekKey).then(() => {
                const newPaymentRow = { ...initialNewPayment, _id: `new-${Date.now()}` };
                setPayments(prev => [newPaymentRow, ...prev]);
                setEditingPaymentId(newPaymentRow._id);
            });
            return;
        }

        const newPaymentRow = { ...initialNewPayment, _id: `new-${Date.now()}` };
        setPayments([newPaymentRow, ...payments]);
        setEditingPaymentId(newPaymentRow._id);
    };

    const savePayment = async (paymentData) => {
        try {
            const processedData = {
                ...paymentData,
                carriedAmount: parseCurrency(paymentData.carriedAmount),
                progressPayment: parseCurrency(paymentData.progressPayment),
                advancePayment: parseCurrency(paymentData.advancePayment),
                paidAmount: parseCurrency(paymentData.paidAmount)
            };

            let response;
            if (processedData._id && !processedData._id.startsWith('new-')) {
                response = await axios.put(`${API_URL}/${processedData._id}`, processedData);
                toast.success("Ödeme başarıyla güncellendi!");
            } else {
                const postData = { ...processedData };
                delete postData._id;
                response = await axios.post(API_URL, postData);
                toast.success("Yeni ödeme başarıyla eklendi!");
            }

            setEditingPaymentId(null);

            // Veriyi yenile
            if (viewMode === 'all') {
                fetchPayments();
            } else if (viewMode === 'weekly') {
                fetchWeeklyData();
            } else if (viewMode === 'week' && currentWeek) {
                fetchWeekData(currentWeek.weekKey);
                fetchWeeklyData();
            }
        } catch (err) {
            console.error("Kayıt/Güncelleme hatası:", err.response?.data || err);
            setError(err.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
            toast.error("Kayıt/Güncelleme sırasında hata oluştu!");
        }
    };
    // Gelecek haftaya devir kaydı oluştur
    const createCarryOverPayment = async (fullName, amount, currentDate) => {
        try {
            const nextWeekStart = getNextWeekStart(new Date(currentDate));
            const nextWeekDate = nextWeekStart.toISOString().split('T')[0];

            // Gelecek hafta bu kişi için zaten kayıt var mı kontrol et
            const allPaymentsResponse = await axios.get(API_URL);
            const existingCarryOver = allPaymentsResponse.data.find(p => 
                p.fullName === fullName && 
                p.date === nextWeekDate &&
                p.progressPayment === 0 &&
                p.advancePayment === 0 &&
                p.paidAmount === 0
            );

            if (existingCarryOver) {
                // Mevcut devir kaydını güncelle
                await axios.put(`${API_URL}/${existingCarryOver._id}`, {
                    ...existingCarryOver,
                    carriedAmount: amount
                });
                toast.info(`${fullName} için devir güncellendi: ${formatCurrency(amount)} TL`);
            } else {
                // Yeni devir kaydı oluştur
                const carryOverData = {
                    fullName: fullName,
                    date: nextWeekDate,
                    carriedAmount: amount,
                    progressPayment: 0,
                    advancePayment: 0,
                    paidAmount: 0,
                    description: `${currentDate} tarihinden devir`
                };

                await axios.post(API_URL, carryOverData);
                toast.success(`${fullName} için gelecek haftaya devir oluşturuldu: ${formatCurrency(amount)} TL`);
            }
        } catch (err) {
            console.error("Devir oluşturma hatası:", err);
            toast.error("Devir oluşturulurken hata oluştu!");
        }
    };

// Mevcut hafta için senkronizasyon - önceki haftadan kalanları bu haftaya getir
const handleSyncCurrentWeek = async () => {
    if (checkUnsavedChanges()) {
        toast.warning("Önce mevcut düzenlemeyi kaydedin!");
        return;
    }

    if (!currentWeek) {
        toast.error("Hafta bilgisi bulunamadı!");
        return;
    }

    setSyncing(true);
    try {
        // Mevcut haftanın başlangıç tarihini al
        const currentWeekStart = new Date(currentWeek.weekStart);
        
        // Önceki haftanın başlangıç tarihini hesapla
        const previousWeekStart = getPreviousWeekStart(currentWeekStart);
        const previousWeekEnd = new Date(previousWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

        // Tüm kayıtları çek
        const response = await axios.get(API_URL);
        const allPayments = response.data;

        // Önceki haftanın kayıtlarını filtrele
        const previousWeekPayments = allPayments.filter(p => {
            const paymentDate = new Date(p.date);
            return paymentDate >= previousWeekStart && paymentDate <= previousWeekEnd;
        });

        let syncCount = 0;
        const currentWeekStartStr = dayjs(currentWeekStart).format('YYYY-MM-DD');

        // Önceki haftanın her kaydı için kalan hesapla ve MEVCUT haftaya ekle
        for (const payment of previousWeekPayments) {
            const toPay = payment.carriedAmount + payment.progressPayment - payment.advancePayment;
            const remaining = toPay - payment.paidAmount;

            if (remaining > 0) {
                // MEVCUT haftada bu kişi için zaten kayıt var mı?
                const existingInCurrentWeek = allPayments.find(p => {
                    const pDate = dayjs(p.date).format('YYYY-MM-DD');
                    return p.fullName === payment.fullName && pDate === currentWeekStartStr;
                });

                if (existingInCurrentWeek) {
                    // Mevcut kaydın devreden tutarını güncelle
                    await axios.put(`${API_URL}/${existingInCurrentWeek._id}`, {
                        ...existingInCurrentWeek,
                        carriedAmount: remaining,
                        description: `${dayjs(payment.date).format('DD.MM.YYYY')} tarihinden devir`
                    });
                    syncCount++;
                } else {
                    const carryOverData = {
                        fullName: payment.fullName,
                        date: currentWeekStartStr,
                        carriedAmount: remaining,
                        progressPayment: 0,
                        advancePayment: 0,
                        paidAmount: 0,
                        description: `${dayjs(payment.date).format('DD.MM.YYYY')} tarihinden devir`
                    };

                    await axios.post(API_URL, carryOverData);
                    syncCount++;
                }
            }
        }

        if (syncCount > 0) {
            toast.success(`${syncCount} adet devir kaydı oluşturuldu/güncellendi!`);
            // Mevcut hafta verisini yenile
            fetchWeekData(currentWeek.weekKey);
        } else {
            toast.info('Önceki haftadan devredecek kayıt bulunamadı.');
        }
    } catch (err) {
        console.error("Senkronizasyon hatası:", err);
        toast.error("Senkronizasyon sırasında hata oluştu!");
    } finally {
        setSyncing(false);
    }
};
    // Düzenleme modunu açar
    const handleEditClick = (paymentId) => {
        if (checkUnsavedChanges() && editingPaymentId !== paymentId) {
            toast.warning("Önce mevcut düzenlemeyi kaydedin veya iptal edin!");
            return;
        }
        setEditingPaymentId(paymentId);
    };

    // Düzenleme modunu iptal eder
    const handleCancelEdit = () => {
        setEditingPaymentId(null);
        if (viewMode === 'all') {
            fetchPayments();
        } else if (viewMode === 'week' && currentWeek) {
            fetchWeekData(currentWeek.weekKey);
        }
    };

    // Silme modalını açar
    const openDeleteModal = (id) => {
        if (checkUnsavedChanges()) {
            toast.warning("Önce mevcut düzenlemeyi kaydedin veya iptal edin!");
            return;
        }

        setModal({
            isOpen: true,
            message: 'Bu ödemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
            type: 'confirm',
            onConfirm: () => confirmDelete(id),
            onCancel: closeModal
        });
    };

    // Silme işlemini onaylar
    const confirmDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            closeModal();
            toast.success("Ödeme başarıyla silindi!");

            if (viewMode === 'all') {
                fetchPayments();
            } else if (viewMode === 'weekly') {
                fetchWeeklyData();
            } else if (viewMode === 'week' && currentWeek) {
                fetchWeekData(currentWeek.weekKey);
                fetchWeeklyData();
            }
        } catch (err) {
            console.error("Silme hatası:", err.response?.data || err);
            setError(err.response?.data?.message || 'Silme işlemi sırasında bir hata oluştu.');
            toast.error("Silme işlemi sırasında hata oluştu!");
        }
    };

    // Ödenecek ve Kalan tutarları hesaplar
    const calculateAmounts = (payment) => {
        const carried = parseCurrency(payment.carriedAmount);
        const progress = parseCurrency(payment.progressPayment);
        const advance = parseCurrency(payment.advancePayment);
        const paid = parseCurrency(payment.paidAmount);
        const toPay = carried + progress - advance;
        const remaining = toPay - paid;
        return { toPay, remaining };
    };

    // Input değerini formatla - düzenleme modunda 0 gösterme
    const getDisplayValue = (value, isEditing, isNew = false) => {
        if (isEditing) {
            // Düzenleme modunda 0 değerini gösterme
            if (value === 0 || value === '0' || value === '' || value === null || value === undefined) {
                return '';
            }
            return value;
        } else {
            return formatCurrency(value);
        }
    };

    // Haftalık özet tablosunu render eden fonksiyon
    const renderWeeklySummary = () => (
        <div className="weekly-summary">
            <div className="table-container">
                <table className="payments-table">
                    <thead>
                        <tr>
                            <th>Hafta</th>
                            <th>Kayıt Sayısı</th>
                            <th>Toplam Devreden</th>
                            <th>Toplam Hakediş</th>
                            <th>Toplam Avans</th>
                            <th>Toplam Ödenecek</th>
                            <th>Toplam Ödenen</th>
                            <th>Toplam Kalan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weeklyData.length > 0 ? (
                            weeklyData.map((week) => (
                                <tr key={week.weekKey} className="weekly-row" onClick={() => handleWeekSelect(week.weekKey)}>
                                    <td className="week-label">
                                        <FiCalendar className="week-icon" />
                                        {week.weekLabel}
                                    </td>
                                    <td className="text-center">{week.payments.length}</td>
                                    <td className="text-right">{formatCurrency(week.totalCarried)} TL</td>
                                    <td className="text-right">{formatCurrency(week.totalProgress)} TL</td>
                                    <td className="text-right">{formatCurrency(week.totalAdvance)} TL</td>
                                    <td className="text-right font-bold">{formatCurrency(week.totalPayable)} TL</td>
                                    <td className="text-right">{formatCurrency(week.totalPaid)} TL</td>
                                    <td className={`text-right font-bold ${week.totalRemaining < 0 ? 'text-danger' : week.totalRemaining > 0 ? 'text-warning' : 'text-success'}`}>
                                        {formatCurrency(week.totalRemaining)} TL
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="no-data">
                                    Henüz haftalık veri bulunamadı.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Normal ödeme tablosunu render eden fonksiyon
    const renderPaymentsTable = () => (
        <div className="table-container">
            <table className="payments-table">
                <thead>
                    <tr>
                        <th>Ad Soyad</th>
                        <th>Tarih</th>
                        <th>Devreden</th>
                        <th>Hakediş</th>
                        <th>Avans</th>
                        <th>Ödenecek</th>
                        <th>Ödenen</th>
                        <th>Kalan</th>
                        <th>Açıklama</th>
                        <th className="actions-header">İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.length > 0 ? (
                        payments.map((payment) => {
                            const isEditing = editingPaymentId === payment._id;
                            const isNew = payment._id && payment._id.startsWith('new-');
                            const { toPay, remaining } = calculateAmounts(payment);

                            return (
                                <tr key={payment._id} className={isEditing ? 'editing-row' : ''}>
                                    <td>
                                        <input
                                            type="text"
                                            value={payment.fullName}
                                            onChange={(e) => handleCellChange(payment._id, 'fullName', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input ${isEditing ? '' : 'readonly'}`}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="date"
                                            value={payment.date ? dayjs(payment.date).format('YYYY-MM-DD') : ''}
                                            onChange={(e) => handleCellChange(payment._id, 'date', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input ${isEditing ? '' : 'readonly'}`}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={getDisplayValue(payment.carriedAmount, isEditing, isNew)}
                                            onChange={(e) => handleAmountChange(payment._id, 'carriedAmount', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input text-right ${isEditing ? '' : 'readonly'}`}
                                            placeholder={isEditing ? "0,00" : ""}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={getDisplayValue(payment.progressPayment, isEditing, isNew)}
                                            onChange={(e) => handleAmountChange(payment._id, 'progressPayment', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input text-right ${isEditing ? '' : 'readonly'}`}
                                            placeholder={isEditing ? "0,00" : ""}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={getDisplayValue(payment.advancePayment, isEditing, isNew)}
                                            onChange={(e) => handleAmountChange(payment._id, 'advancePayment', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input text-right ${isEditing ? '' : 'readonly'}`}
                                            placeholder={isEditing ? "0,00" : ""}
                                        />
                                    </td>
                                    <td className="calculated-cell text-right">
                                        {formatCurrency(toPay)} TL
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={getDisplayValue(payment.paidAmount, isEditing, isNew)}
                                            onChange={(e) => handleAmountChange(payment._id, 'paidAmount', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input text-right ${isEditing ? '' : 'readonly'}`}
                                            placeholder={isEditing ? "0,00" : ""}
                                        />
                                    </td>
                                    <td className={`calculated-cell text-right ${remaining < 0 ? 'text-danger' : remaining > 0 ? 'text-warning' : 'text-success'}`}>
                                        {formatCurrency(remaining)} TL
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            value={payment.description}
                                            onChange={(e) => handleCellChange(payment._id, 'description', e.target.value)}
                                            readOnly={!isEditing}
                                            className={`table-input ${isEditing ? '' : 'readonly'}`}
                                        />
                                    </td>
                                    <td className="actions-cell">
                                        {isEditing ? (
                                            <>
                                                <button className="btn-icon btn-save" onClick={() => savePayment(payment)}><FiSave /></button>
                                                <button className="btn-icon btn-cancel" onClick={handleCancelEdit}><FiX /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="btn-icon btn-edit" onClick={() => handleEditClick(payment._id)}><FiEdit /></button>
                                                <button className="btn-icon btn-delete" onClick={() => openDeleteModal(payment._id)}><FiTrash2 /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="10" className="no-data">
                                {viewMode === 'week' && currentWeek ?
                                    `${currentWeek.weekLabel} haftasında ödeme kaydı bulunamadı.` :
                                    'Henüz bir ödeme kaydı bulunamadı. Yeni bir ödeme eklemek için yukarıdaki butonu kullanın.'
                                }
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="payments-container">
            <header className="page-header">
                <h1 className="page-title">Ödeme Takip Tablosu</h1>
            </header>

            <div className="card">
                <div className="card-header">
                    <div className="header-left">
                        <h2 className="card-title">
                            {viewMode === 'all' && 'Tüm Ödemeler'}
                            {viewMode === 'weekly' && 'Haftalık Özet'}
                            {viewMode === 'week' && currentWeek && `${currentWeek.weekLabel} Haftası`}
                        </h2>
                        {viewMode === 'week' && currentWeek && (
                            <span className="week-info">
                                {currentWeek.payments.length} ödeme kaydı
                            </span>
                        )}
                    </div>

                    <div className="header-actions">
                        <div className="view-toggle">
                            {viewMode === 'weekly' && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleViewModeChange('all')}
                                >
                                    <FiList /> Tümünü Listele
                                </button>
                            )}
                            {viewMode === 'all' && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleViewModeChange('weekly')}
                                >
                                    <FiCalendar /> Haftalık Görünüm
                                </button>
                            )}
                            {viewMode === 'week' && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={backToWeeklyView}
                                >
                                    ← Haftalık Özet
                                </button>
                            )}
                        </div>

                        {/* Senkronize butonu sadece hafta detay görünümünde göster */}
                        {viewMode === 'week' && (
                            <button 
                                className="btn btn-sync" 
                                onClick={handleSyncCurrentWeek}
                                disabled={syncing}
                            >
                                <FiRefreshCw className={syncing ? 'spinning' : ''} /> 
                                {syncing ? 'Senkronize Ediliyor...' : 'Önceki Haftadan Getir'}
                            </button>
                        )}

                        <button className="btn btn-primary" onClick={handleAddRow}>
                            <FiPlus /> Yeni Ödeme Ekle
                        </button>
                    </div>
                </div>

                {loading && <p className="text-center loading-text">Veriler yükleniyor...</p>}
                {error && <p className="text-center error-message">Hata: {error}</p>}

                {viewMode === 'weekly' ? renderWeeklySummary() : renderPaymentsTable()}
            </div>

            {modal.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className={`modal-icon ${modal.type}`}>
                            {modal.type === 'warning' ? '⚠️' : '❓'}
                        </div>
                        <p>{modal.message}</p>
                        <div className="modal-actions">
                            <button
                                className={`btn ${modal.type === 'confirm' ? 'btn-delete' : 'btn-warning'}`}
                                onClick={modal.onConfirm}
                            >
                                {modal.type === 'confirm' ? 'Evet, Sil' : 'Evet, Devam Et'}
                            </button>
                            <button className="btn btn-cancel" onClick={modal.onCancel}>İptal</button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer
                position="top-center"
                autoClose={1500}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
        </div>
    );
};

export default Odemeler;