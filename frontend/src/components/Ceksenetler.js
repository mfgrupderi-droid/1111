import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, CreditCard, Building2, Calendar, DollarSign, CheckCircle, Clock, ArrowRightLeft, TrendingUp, TrendingDown, Wallet, Users, Filter, User, Upload, ChevronLeft, ChevronRight, AlertTriangle, Edit, Receipt } from 'lucide-react';

import { PageHeader, LoadingSpinner, ErrorAlert, SuccessAlert } from './SharedComponents';
const CekSenet = () => {
    const [evraklar, setEvraklar] = useState([]);
    const [sirketler, setSirketler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showDurumModal, setShowDurumModal] = useState(false);
    const [showBulkModal, setBulkModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showOdemeModal, setShowOdemeModal] = useState(false);
    const [selectedEvrak, setSelectedEvrak] = useState(null);
    const [activeTab, setActiveTab] = useState('alinan-cek');
    const [stats, setStats] = useState({});
    const [durumFilter, setDurumFilter] = useState('');

    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    
    const [bulkData, setBulkData] = useState('');
    const [bulkPreview, setBulkPreview] = useState([]);

    const [formData, setFormData] = useState({
        evrakTipi: 'cek',
        tip: 'alinan',
        firmaId: '',
        sahisAdi: '',
        transferFirmaId: '',
        banka: '',
        borclu: '',
        tutar: '',
        paraBirimi: 'TRY',
        vadeTarihi: '',
        aciklama: '',
        durum: '',
        cariIslensin: true
    });

    const [durumData, setDurumData] = useState({
        durum: '',
        transferFirmaId: '',
        aciklama: ''
    });

    const [odemeData, setOdemeData] = useState({
        tutar: '',
        aciklama: ''
    });

    useEffect(() => {
        fetchEvraklar();
        fetchSirketler();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [evraklar]);

    const fetchEvraklar = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://31.57.33.249:3001/api/ceksenetler');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setEvraklar(data);
        } catch (error) {
            console.error('Evraklar yüklenirken hata:', error);
            setEvraklar([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSirketler = async () => {
        try {
            const response = await fetch('http://31.57.33.249:3001/api/sirketler');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setSirketler(data);
        } catch (error) {
            console.error('Şirketler yüklenirken hata:', error);
            setSirketler([]);
        }
    };

    const calculateStats = () => {
        const stats = {
            alinanCekToplam: { TRY: 0, USD: 0, EUR: 0 },
            alinanCekAdet: 0,
            verilenCekToplam: { TRY: 0, USD: 0, EUR: 0 },
            verilenCekAdet: 0,
            alinanSenetToplam: { TRY: 0, USD: 0, EUR: 0 },
            alinanSenetAdet: 0,
            verilenSenetToplam: { TRY: 0, USD: 0, EUR: 0 },
            verilenSenetAdet: 0,
            vadesiDolmusCekToplam: { TRY: 0, USD: 0, EUR: 0 },
            vadesiDolmusCekAdet: 0,
            vadesiDolmusSenetToplam: { TRY: 0, USD: 0, EUR: 0 },
            vadesiDolmusSenetAdet: 0,
            toplamTutar: { TRY: 0, USD: 0, EUR: 0 },
            toplamEvrakAdet: 0
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        evraklar.forEach(evrak => {
            const tutar = parseFloat(evrak.tutar) || 0;
            const paraBirimi = evrak.paraBirimi || 'TRY';
            const vadeTarihi = new Date(evrak.vadeTarihi);
            vadeTarihi.setHours(0, 0, 0, 0);
            const vadesiDolmus = vadeTarihi < today;

            stats.toplamTutar[paraBirimi] = (stats.toplamTutar[paraBirimi] || 0) + tutar;
            stats.toplamEvrakAdet++;

            if (evrak.evrakTipi === 'cek') {
                if (evrak.tip === 'alinan') {
                    stats.alinanCekToplam[paraBirimi] = (stats.alinanCekToplam[paraBirimi] || 0) + tutar;
                    stats.alinanCekAdet++;
                } else if (evrak.tip === 'verilen') {
                    stats.verilenCekToplam[paraBirimi] = (stats.verilenCekToplam[paraBirimi] || 0) + tutar;
                    stats.verilenCekAdet++;
                }

                if (vadesiDolmus) {
                    stats.vadesiDolmusCekToplam[paraBirimi] = (stats.vadesiDolmusCekToplam[paraBirimi] || 0) + tutar;
                    stats.vadesiDolmusCekAdet++;
                }
            } else if (evrak.evrakTipi === 'senet') {
                if (evrak.tip === 'alinan') {
                    stats.alinanSenetToplam[paraBirimi] = (stats.alinanSenetToplam[paraBirimi] || 0) + tutar;
                    stats.alinanSenetAdet++;
                } else if (evrak.tip === 'verilen') {
                    stats.verilenSenetToplam[paraBirimi] = (stats.verilenSenetToplam[paraBirimi] || 0) + tutar;
                    stats.verilenSenetAdet++;
                }

                if (vadesiDolmus) {
                    stats.vadesiDolmusSenetToplam[paraBirimi] = (stats.vadesiDolmusSenetToplam[paraBirimi] || 0) + tutar;
                    stats.vadesiDolmusSenetAdet++;
                }
            }
        });

        setStats(stats);
    };

    const calculateToplamOdenen = (evrak) => {
        if (!evrak.odemeler || evrak.odemeler.length === 0) return 0;
        return evrak.odemeler.reduce((sum, odeme) => sum + (parseFloat(odeme.tutar) || 0), 0);
    };

    const calculateKalan = (evrak) => {
        const toplamTutar = parseFloat(evrak.tutar) || 0;
        const toplamOdenen = calculateToplamOdenen(evrak);
        return toplamTutar - toplamOdenen;
    };

    const calculateFilteredSummary = () => {
        const filtered = getFilteredEvraklar();
        const summary = {
            TRY: { toplamOdenecek: 0, toplamOdenen: 0, toplamKalan: 0 },
            USD: { toplamOdenecek: 0, toplamOdenen: 0, toplamKalan: 0 },
            EUR: { toplamOdenecek: 0, toplamOdenen: 0, toplamKalan: 0 }
        };

        filtered.forEach(evrak => {
            const paraBirimi = evrak.paraBirimi || 'TRY';
            const toplamTutar = parseFloat(evrak.tutar) || 0;
            const toplamOdenen = calculateToplamOdenen(evrak);
            const kalan = toplamTutar - toplamOdenen;

            summary[paraBirimi].toplamOdenecek += toplamTutar;
            summary[paraBirimi].toplamOdenen += toplamOdenen;
            summary[paraBirimi].toplamKalan += kalan;
        });

        return summary;
    };

    const formatCurrencyAmounts = (amounts) => {
        const parts = [];
        if (amounts.USD > 0) parts.push(`${formatMoney(amounts.USD, 'USD')}`);
        if (amounts.EUR > 0) parts.push(`${formatMoney(amounts.EUR, 'EUR')}`);
        if (amounts.TRY > 0) parts.push(`${formatMoney(amounts.TRY, 'TRY')}`);

        return parts.join(' - ') || '₺0,00';
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firmaId && !formData.sahisAdi) {
            alert('Lütfen firma seçin veya şahıs adı girin');
            return;
        }

        const bankaRequired = formData.evrakTipi === 'cek';

        if (!formData.borclu || !formData.tutar || !formData.vadeTarihi ||
            (bankaRequired && !formData.banka)) {
            alert('Lütfen tüm gerekli alanları doldurun');
            return;
        }

        try {
            const response = await fetch('http://31.57.33.249:3001/api/ceksenetler', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const newEvrak = await response.json();
            setEvraklar(prev => [...prev, newEvrak]);
            setShowForm(false);
            resetForm();
            alert('Evrak başarıyla eklendi');
        } catch (error) {
            console.error('Hata:', error);
            alert('Evrak eklenirken hata oluştu');
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`http://31.57.33.249:3001/api/ceksenetler/${selectedEvrak._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const updatedEvrak = await response.json();
            setEvraklar(prev => prev.map(evrak =>
                evrak._id === selectedEvrak._id ? updatedEvrak : evrak
            ));

            setShowEditModal(false);
            setSelectedEvrak(null);
            resetForm();
            alert('Evrak başarıyla güncellendi');
        } catch (error) {
            console.error('Hata:', error);
            alert('Evrak güncellenirken hata oluştu');
        }
    };

    const handleOdemeEkle = async (e) => {
        e.preventDefault();

        if (!odemeData.tutar || parseFloat(odemeData.tutar) <= 0) {
            alert('Geçerli bir tutar girin');
            return;
        }

        const kalan = calculateKalan(selectedEvrak);
        if (parseFloat(odemeData.tutar) > kalan) {
            alert(`Ödeme tutarı kalan tutardan (${formatMoney(kalan, selectedEvrak.paraBirimi)}) fazla olamaz`);
            return;
        }

        try {
            const response = await fetch(`http://31.57.33.249:3001/api/ceksenetler/${selectedEvrak._id}/odeme`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tutar: parseFloat(odemeData.tutar),
                    aciklama: odemeData.aciklama || ''
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network response was not ok');
            }

            const result = await response.json();
            setEvraklar(prev => prev.map(evrak =>
                evrak._id === selectedEvrak._id ? result.evrak : evrak
            ));

            setShowOdemeModal(false);
            setSelectedEvrak(null);
            setOdemeData({ tutar: '', aciklama: '' });
            alert(result.message || 'Ödeme başarıyla eklendi ve cari güncellendi');
        } catch (error) {
            console.error('Hata:', error);
            alert(error.message || 'Ödeme eklenirken hata oluştu');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bu evrakı silmek istediğinizden emin misiniz?')) {
            try {
                const response = await fetch(`http://31.57.33.249:3001/api/ceksenetler/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                setEvraklar(prev => prev.filter(e => e._id !== id));
                alert('Evrak başarıyla silindi');
            } catch (error) {
                console.error('Silme hatası:', error);
                alert('Evrak silinirken hata oluştu');
            }
        }
    };

    const handleDurumUpdate = async () => {
        try {
            const response = await fetch(`http://31.57.33.249:3001/api/ceksenetler/${selectedEvrak._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(durumData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const updatedEvrak = await response.json();
            setEvraklar(prev => prev.map(evrak =>
                evrak._id === selectedEvrak._id ? updatedEvrak : evrak
            ));

            setShowDurumModal(false);
            setSelectedEvrak(null);
            setDurumData({ durum: '', transferFirmaId: '', aciklama: '' });
            alert('Durum başarıyla güncellendi');
        } catch (error) {
            console.error('Hata:', error);
            alert('Durum güncellenirken hata oluştu');
        }
    };

    const resetForm = () => {
        setFormData({
            evrakTipi: 'cek',
            tip: 'alinan',
            firmaId: '',
            sahisAdi: '',
            transferFirmaId: '',
            banka: '',
            borclu: '',
            tutar: '',
            paraBirimi: 'TRY',
            vadeTarihi: '',
            aciklama: '',
            durum: '',
            cariIslensin: true
        });
    };

    const openForm = (evrakTipi, tip) => {
        setFormData(prev => ({
            ...prev,
            evrakTipi,
            tip
        }));
        setShowForm(true);
    };

    const openEditModal = (evrak) => {
        setSelectedEvrak(evrak);
        setFormData({
            evrakTipi: evrak.evrakTipi,
            tip: evrak.tip,
            firmaId: evrak.firmaId?._id || '',
            sahisAdi: evrak.sahisAdi || '',
            transferFirmaId: evrak.transferFirmaId?._id || '',
            banka: evrak.banka || '',
            borclu: evrak.borclu,
            tutar: evrak.tutar,
            paraBirimi: evrak.paraBirimi,
            vadeTarihi: evrak.vadeTarihi?.split('T')[0] || '',
            aciklama: evrak.aciklama || '',
            durum: evrak.durum,
            cariIslensin: evrak.cariIslensin
        });
        setShowEditModal(true);
    };

    const openDurumModal = (evrak) => {
        setSelectedEvrak(evrak);
        setDurumData({
            durum: evrak.durum,
            transferFirmaId: evrak.transferFirmaId?._id || '',
            aciklama: evrak.aciklama || ''
        });
        setShowDurumModal(true);
    };

    const openOdemeModal = (evrak) => {
        setSelectedEvrak(evrak);
        setOdemeData({ tutar: '', aciklama: '' });
        setShowOdemeModal(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const formatMoney = (amount, currency = 'TRY') => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const getDurumBadge = (durum) => {
        const badgeClasses = {
            'Kasa': 'bg-blue-100 text-blue-800',
            'Ciro': 'bg-orange-100 text-orange-800',
            'Aktif': 'bg-green-100 text-green-800',
            'Ödendi': 'bg-gray-100 text-gray-800'
        };
        return badgeClasses[durum] || 'bg-blue-100 text-blue-800';
    };

    const isVadesiDolmus = (vadeTarihi) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const vadeDate = new Date(vadeTarihi);
        vadeDate.setHours(0, 0, 0, 0);
        return vadeDate < today;
    };

    const getFilteredEvraklar = () => {
        try {
            const [tip, evrakTipi] = activeTab.split('-');
            let filtered = evraklar.filter(evrak => evrak.tip === tip && evrak.evrakTipi === evrakTipi);

            if (durumFilter) {
                filtered = filtered.filter(evrak => evrak.durum === durumFilter);
            }

            if (selectedMonth || selectedYear) {
                filtered = filtered.filter(evrak => {
                    if (!evrak.vadeTarihi) return false;

                    try {
                        const evrakDate = new Date(evrak.vadeTarihi);
                        if (isNaN(evrakDate.getTime())) return false;

                        const evrakMonth = evrakDate.getMonth() + 1;
                        const evrakYear = evrakDate.getFullYear();

                        const monthMatches = !selectedMonth || evrakMonth === parseInt(selectedMonth);
                        const yearMatches = !selectedYear || evrakYear === parseInt(selectedYear);

                        return monthMatches && yearMatches;
                    } catch (error) {
                        console.error('Date filtering error for evrak:', evrak._id, error);
                        return false;
                    }
                });
            }

            return Array.isArray(filtered) ? filtered : [];
        } catch (error) {
            console.error('Filtreleme hatası:', error);
            return [];
        }
    };

    const getPaginatedData = (data) => {
        if (!data || !Array.isArray(data)) {
            return [];
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const getTotalPages = (totalItems) => {
        if (!totalItems || totalItems <= 0) {
            return 1;
        }
        return Math.ceil(totalItems / itemsPerPage);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const resetPagination = () => {
        setCurrentPage(1);
    };

    const getDurumOptions = () => {
        try {
            const [tip, evrakTipi] = activeTab.split('-');
            const tabEvraklar = evraklar.filter(evrak => evrak.tip === tip && evrak.evrakTipi === evrakTipi);
            const durumlar = [...new Set(tabEvraklar.map(evrak => evrak.durum).filter(Boolean))];
            return durumlar;
        } catch (error) {
            console.error('Durum options error:', error);
            return [];
        }
    };

    const getTabConfig = () => {
        return [
            {
                key: 'alinan-cek',
                label: 'Alınan Çekler',
                icon: TrendingDown,
                description: 'Borç Azalır',
                colorClass: 'text-emerald-600 border-emerald-500'
            },
            {
                key: 'verilen-cek',
                label: 'Verilen Çekler',
                icon: TrendingUp,
                description: 'Borç Artar',
                colorClass: 'text-red-600 border-red-500'
            },
            {
                key: 'alinan-senet',
                label: 'Alınan Senetler',
                icon: FileText,
                description: 'Borç Azalır',
                colorClass: 'text-emerald-600 border-emerald-500'
            },
            {
                key: 'verilen-senet',
                label: 'Verilen Senetler',
                icon: FileText,
                description: 'Borç Artar',
                colorClass: 'text-red-600 border-red-500'
            }
        ];
    };

    const getMonthsOptions = () => {
        const months = [
            { value: '', label: 'Tüm Aylar' },
            { value: '1', label: 'Ocak' },
            { value: '2', label: 'Şubat' },
            { value: '3', label: 'Mart' },
            { value: '4', label: 'Nisan' },
            { value: '5', label: 'Mayıs' },
            { value: '6', label: 'Haziran' },
            { value: '7', label: 'Temmuz' },
            { value: '8', label: 'Ağustos' },
            { value: '9', label: 'Eylül' },
            { value: '10', label: 'Ekim' },
            { value: '11', label: 'Kasım' },
            { value: '12', label: 'Aralık' }
        ];
        return months;
    };

    const getYearsOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            years.push({ value: i.toString(), label: i.toString() });
        }
        return [{ value: '', label: 'Tüm Yıllar' }, ...years];
    };

    const styles = {
        container: {
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '24px 24px 120px 24px',
            backgroundColor: '#f9fafb',
            minHeight: '100vh'
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            border: '1px solid #e5e7eb'
        },
        statCard: {
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            padding: '24px'
        },
        iconContainer: {
            padding: '12px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        button: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s'
        },
        primaryButton: {
            backgroundColor: '#2563eb',
            color: 'white'
        },
        secondaryButton: {
            backgroundColor: '#f3f4f6',
            color: '#374151'
        },
        dangerButton: {
            color: '#dc2626'
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
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '32rem',
            width: '100%',
            margin: '16px',
            maxHeight: '90vh',
            overflow: 'auto'
        },
        input: {
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px'
        },
        select: {
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        textarea: {
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            resize: 'vertical'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed'
        },
        th: {
            backgroundColor: '#f9fafb',
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid #e5e7eb'
        },
        td: {
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '9999px'
        },
        pagination: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb'
        },
        pageButton: {
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: '#374151'
        },
        activePageButton: {
            backgroundColor: '#2563eb',
            color: 'white',
            borderColor: '#2563eb'
        },
        expiredRow: {
            backgroundColor: '#fef2f2'
        },
        summaryCard: {
            backgroundColor: '#f0f9ff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '24px',
            marginTop: '24px'
        }
    };

    const filteredData = getFilteredEvraklar() || [];
    const totalPages = getTotalPages(filteredData.length) || 0;
    const paginatedData = getPaginatedData(filteredData);
    const isAlinanTab = activeTab.startsWith('alinan');
    const filteredSummary = calculateFilteredSummary();

    return (
        <div style={styles.container}>
            <style>{`
                ::-webkit-scrollbar {
                    width: 16px;
                    height: 16px;
                }
                ::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 8px;
                }
                ::-webkit-scrollbar-thumb {
                    background: #94a3b8;
                    border-radius: 8px;
                    border: 3px solid #f1f5f9;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }
            `}</style>

            <div style={{ ...styles.card, padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            padding: '3rem 0',
                            textAlign: 'center',
                            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                            borderRadius: '12px',
                        }}
                    >
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
                        <h1
                            style={{
                                fontSize: '2.5rem',
                                fontWeight: '700',
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                letterSpacing: '-0.02em',
                                position: 'relative',
                                zIndex: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Building2 style={{ marginRight: '12px' }} size={32} />
                            Çek & Senet Yönetimi
                        </h1>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '48px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Toplam Evrak</p>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                                {stats.toplamEvrakAdet || 0}
                            </p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Aktif Firmalar</p>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                                {sirketler.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    marginBottom: '24px',
                }}
            >
                <div style={styles.statCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ ...styles.iconContainer, backgroundColor: '#d1fae5' }}>
                            <TrendingDown style={{ color: '#059669' }} size={24} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#059669' }}>Çekler</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Verilen Çek & Senetler</h3>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                        {formatCurrencyAmounts({
                            TRY: (stats.verilenSenetToplam?.TRY || 0) + (stats.verilenCekToplam?.TRY || 0),
                            USD: (stats.verilenSenetToplam?.USD || 0) + (stats.verilenCekToplam?.USD || 0),
                            EUR: (stats.verilenSenetToplam?.EUR || 0) + (stats.verilenCekToplam?.EUR || 0),
                        })}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <CheckCircle size={12} style={{ marginRight: '4px' }} />
                        {(stats.verilenSenetAdet || 0) + (stats.verilenCekAdet || 0)} adet
                    </p>
                </div>

                <div style={styles.statCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ ...styles.iconContainer, backgroundColor: '#d1fae5' }}>
                            <TrendingDown style={{ color: '#059669' }} size={24} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#059669' }}>Senetler</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Alınan Çek & Senetler</h3>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                        {formatCurrencyAmounts({
                            TRY: (stats.alinanSenetToplam?.TRY || 0) + (stats.alinanCekToplam?.TRY || 0),
                            USD: (stats.alinanSenetToplam?.USD || 0) + (stats.alinanCekToplam?.USD || 0),
                            EUR: (stats.alinanSenetToplam?.EUR || 0) + (stats.alinanCekToplam?.EUR || 0),
                        })}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <CheckCircle size={12} style={{ marginRight: '4px' }} />
                        {(stats.alinanSenetAdet || 0) + (stats.alinanCekAdet || 0)} adet
                    </p>
                </div>

                <div style={styles.statCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ ...styles.iconContainer, backgroundColor: '#fff3cd' }}>
                            <AlertTriangle style={{ color: '#f59e0b' }} size={24} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#f59e0b' }}>Vadeli</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Vadesi Dolmuş Çekler</h3>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                        {formatCurrencyAmounts(stats.vadesiDolmusCekToplam || { TRY: 0, USD: 0, EUR: 0 })}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                        {stats.vadesiDolmusCekAdet || 0} adet
                    </p>
                </div>

                <div style={styles.statCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ ...styles.iconContainer, backgroundColor: '#fff3cd' }}>
                            <AlertTriangle style={{ color: '#f59e0b' }} size={24} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#f59e0b' }}>Vadeli</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Vadesi Dolmuş Senetler</h3>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                        {formatCurrencyAmounts(stats.vadesiDolmusSenetToplam || { TRY: 0, USD: 0, EUR: 0 })}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <AlertTriangle size={12} style={{ marginRight: '4px' }} />
                        {stats.vadesiDolmusSenetAdet || 0} adet
                    </p>
                </div>
            </div>

            {((stats.vadesiDolmusCekAdet || 0) > 0 || (stats.vadesiDolmusSenetAdet || 0) > 0) && (
                <div style={{
                    ...styles.card,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle style={{ color: '#dc2626' }} size={24} />
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>
                                Vadesi Dolmuş Evraklar Bulundu!
                            </h3>
                            <p style={{ fontSize: '14px', color: '#7f1d1d' }}>
                                {(stats.vadesiDolmusCekAdet || 0)} adet çek ve {(stats.vadesiDolmusSenetAdet || 0)} adet senet vadesi dolmuş durumda.
                                Bu evraklar tabloda kırmızı renkte gösterilmektedir.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ ...styles.card, marginBottom: '24px' }}>
                <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <nav style={{ display: 'flex', gap: '32px', padding: '0 24px' }}>
                        {getTabConfig().map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        setDurumFilter('');
                                        resetPagination();
                                    }}
                                    style={{
                                        padding: '16px 4px',
                                        borderBottom: isActive ? '2px solid currentColor' : '2px solid transparent',
                                        fontWeight: '500',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: isActive ? (tab.colorClass.includes('emerald') ? '#059669' : '#dc2626') : '#6b7280',
                                        cursor: 'pointer',
                                        border: 'none',
                                        background: 'none'
                                    }}
                                >
                                    <Icon size={20} />
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{tab.label}</div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{tab.description}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div style={{ display: 'flex', justifyContent: 'end', gap: '12px', padding: '24px' }}>
                    <button
                        onClick={() => setBulkModal(true)}
                        style={{ ...styles.button, ...styles.secondaryButton }}
                    >
                        <Upload size={20} />
                        <span>Toplu Giriş</span>
                    </button>
                    <button
                        onClick={() => {
                            const [tip, evrakTipi] = activeTab.split('-');
                            openForm(evrakTipi, tip);
                        }}
                        style={{ ...styles.button, ...styles.primaryButton }}
                    >
                        <Plus size={20} />
                        <span>Yeni {activeTab.includes('cek') ? 'Çek' : 'Senet'} Ekle</span>
                    </button>
                </div>
            </div>

            <div style={{ ...styles.card, padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={20} style={{ color: '#6b7280' }} />
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Filtreler:</span>
                    </div>

                    <div>
                        <select
                            value={durumFilter}
                            onChange={(e) => {
                                setDurumFilter(e.target.value);
                                resetPagination();
                            }}
                            style={styles.select}
                        >
                            <option value="">Tüm Durumlar</option>
                            {getDurumOptions().map(durum => (
                                <option key={durum} value={durum}>{durum}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={selectedMonth}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                resetPagination();
                            }}
                            style={styles.select}
                        >
                            {getMonthsOptions().map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={selectedYear}
                            onChange={(e) => {
                                setSelectedYear(e.target.value);
                                resetPagination();
                            }}
                            style={styles.select}
                        >
                            {getYearsOptions().map(year => (
                                <option key={year.value} value={year.value}>{year.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(durumFilter || selectedMonth || selectedYear !== new Date().getFullYear().toString()) && (
                            <button
                                onClick={() => {
                                    setDurumFilter('');
                                    setSelectedMonth('');
                                    setSelectedYear(new Date().getFullYear().toString());
                                    resetPagination();
                                }}
                                style={{ ...styles.button, padding: '8px 12px', color: '#6b7280', fontSize: '12px' }}
                                title="Tüm Filtreleri Temizle"
                            >
                                <X size={16} />
                                <span>Temizle</span>
                            </button>
                        )}
                        <div style={{ fontSize: '12px', color: '#6b7280', padding: '8px' }}>
                            Toplam: {filteredData.length} kayıt
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ ...styles.card, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
                        <Clock size={24} style={{ color: '#9ca3af', marginBottom: '16px' }} className="animate-spin" />
                        <p style={{ color: '#6b7280' }}>Veriler yükleniyor...</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {activeTab.includes('cek') && <th style={{ ...styles.th, width: '12%' }}>Banka</th>}
                                        <th style={{ ...styles.th, width: '14%' }}>Borçlu</th>
                                        <th style={{ ...styles.th, width: '10%' }}>Tutar</th>
                                        <th style={{ ...styles.th, width: '10%' }}>Ödenen</th>
                                        <th style={{ ...styles.th, width: '10%' }}>Kalan</th>
                                        <th style={{ ...styles.th, width: '10%' }}>Vade Tarihi</th>
                                        <th style={{ ...styles.th, width: '10%' }}>Durum</th>
                                        {!isAlinanTab && <th style={{ ...styles.th, width: '12%' }}>Firma/Şahıs</th>}
                                        <th style={{ ...styles.th, width: '6%' }}>Cari</th>
                                        <th style={{ ...styles.th, textAlign: 'center', width: '12%' }}>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAlinanTab ? (activeTab.includes('cek') ? "9" : "8") : (activeTab.includes('cek') ? "10" : "9")} style={{ ...styles.td, textAlign: 'center', padding: '48px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <FileText size={32} style={{ color: '#9ca3af', marginBottom: '16px' }} />
                                                    <p style={{ fontSize: '18px', fontWeight: '500', color: '#111827', marginBottom: '8px' }}>
                                                        {filteredData.length === 0
                                                            ? (durumFilter || selectedMonth || selectedYear !== new Date().getFullYear().toString()
                                                                ? `Filtrelenmiş sonuç bulunamadı`
                                                                : 'Henüz evrak bulunamadı'
                                                            )
                                                            : 'Bu sayfada gösterilecek veri yok'
                                                        }
                                                    </p>
                                                    <p style={{ color: '#6b7280' }}>
                                                        {filteredData.length === 0
                                                            ? (durumFilter || selectedMonth || selectedYear !== new Date().getFullYear().toString()
                                                                ? 'Filtreleri temizleyerek tüm evrakları görebilirsiniz'
                                                                : 'Yeni bir evrak ekleyerek başlayın'
                                                            )
                                                            : 'Diğer sayfalara göz atabilirsiniz'
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map(evrak => {
                                            const vadesiDolmus = isVadesiDolmus(evrak.vadeTarihi);
                                            const toplamOdenen = calculateToplamOdenen(evrak);
                                            const kalan = calculateKalan(evrak);
                                            return (
                                                <tr
                                                    key={evrak._id}
                                                    style={{
                                                        backgroundColor: vadesiDolmus ? '#fef2f2' : 'white'
                                                    }}
                                                >
                                                    {activeTab.includes('cek') && (
                                                        <td style={styles.td}>
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <Building2 size={16} style={{ color: '#9ca3af', marginRight: '8px' }} />
                                                                <span title={evrak.banka}>{evrak.banka}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td style={styles.td}>
                                                        <div>
                                                            <div title={evrak.borclu}>{evrak.borclu ? evrak.borclu : evrak.firmaId?.sirketAdi}</div>
                                                            {evrak.aciklama && (
                                                                <div style={{ fontSize: '12px', color: '#6b7280' }} title={evrak.aciklama}>
                                                                    {evrak.aciklama.length > 30 ? evrak.aciklama.substring(0, 30) + '...' : evrak.aciklama}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ fontWeight: '600' }}>
                                                            {formatMoney(evrak.tutar, evrak.paraBirimi)}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ fontWeight: '600', color: toplamOdenen > 0 ? '#059669' : '#6b7280' }}>
                                                            {formatMoney(toplamOdenen, evrak.paraBirimi)}
                                                        </span>
                                                        {evrak.odemeler && evrak.odemeler.length > 0 && (
                                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                                {evrak.odemeler.length} ödeme
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ 
                                                            fontWeight: '700', 
                                                            color: kalan === 0 ? '#059669' : kalan < evrak.tutar ? '#f59e0b' : '#111827'
                                                        }}>
                                                            {formatMoney(kalan, evrak.paraBirimi)}
                                                        </span>
                                                        {kalan === 0 && (
                                                            <div style={{ fontSize: '11px', color: '#059669' }}>
                                                                ✓ Tamamen ödendi
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            {vadesiDolmus ? (
                                                                <AlertTriangle size={16} style={{ color: '#dc2626', marginRight: '8px' }} />
                                                            ) : (
                                                                <Calendar size={16} style={{ color: '#9ca3af', marginRight: '8px' }} />
                                                            )}
                                                            <span style={{ color: vadesiDolmus ? '#dc2626' : 'inherit', fontWeight: vadesiDolmus ? '600' : 'normal' }}>
                                                                {formatDate(evrak.vadeTarihi)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div>
                                                            <span style={{
                                                                ...styles.badge,
                                                                backgroundColor: evrak.durum === 'Kasa' ? '#dbeafe' : evrak.durum === 'Ciro' ? '#fed7aa' : evrak.durum === 'Aktif' ? '#dcfce7' : '#f3f4f6',
                                                                color: evrak.durum === 'Kasa' ? '#1e40af' : evrak.durum === 'Ciro' ? '#ea580c' : evrak.durum === 'Aktif' ? '#166534' : '#374151'
                                                            }}>
                                                                {evrak.durum}
                                                            </span>
                                                            {evrak.transferFirmaId && (
                                                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                                    <ArrowRightLeft size={12} style={{ marginRight: '4px' }} />
                                                                    <span title={evrak.transferFirmaId.sirketAdi}>
                                                                        {evrak.transferFirmaId.sirketAdi.length > 15
                                                                            ? evrak.transferFirmaId.sirketAdi.substring(0, 15) + '...'
                                                                            : evrak.transferFirmaId.sirketAdi}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {!isAlinanTab && (
                                                        <td style={styles.td}>
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                {evrak.firmaId ? (
                                                                    <>
                                                                        <Building2 size={16} style={{ color: '#9ca3af', marginRight: '8px' }} />
                                                                        <span title={evrak.firmaId.sirketAdi}>
                                                                            {evrak.firmaId.sirketAdi.length > 15
                                                                                ? evrak.firmaId.sirketAdi.substring(0, 15) + '...'
                                                                                : evrak.firmaId.sirketAdi}
                                                                        </span>
                                                                    </>
                                                                ) : (
<>
    <User size={16} style={{ color: '#9ca3af', marginRight: '8px' }} />
    <span title={evrak.sahisAdi || 'Belirtilmemiş'}>
        {evrak.sahisAdi && evrak.sahisAdi.length > 15
            ? evrak.sahisAdi.substring(0, 15) + '...'
            : (evrak.sahisAdi || 'Belirtilmemiş')}
    </span>
</>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            ...styles.badge,
                                                            backgroundColor: evrak.cariIslensin ? '#dcfce7' : '#fecaca',
                                                            color: evrak.cariIslensin ? '#166534' : '#dc2626'
                                                        }}>
                                                            {evrak.cariIslensin ? 'Evet' : 'Hayır'}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <button
                                                                onClick={() => openEditModal(evrak)}
                                                                style={{ ...styles.button, padding: '4px', color: '#2563eb' }}
                                                                title="Düzenle"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
<button
    onClick={() => openOdemeModal(evrak)}
    style={{ 
        ...styles.button, 
        padding: '4px', 
        color: kalan === 0 ? '#6b7280' : '#059669'  // Rengi değiştir
    }}
    title={kalan === 0 ? "Ödeme Geçmişi" : "Ödeme Ekle"}
>
    <Receipt size={16} />
</button>
                                                            <button
                                                                onClick={() => openDurumModal(evrak)}
                                                                style={{ ...styles.button, padding: '4px', color: '#f59e0b' }}
                                                                title="Durum Güncelle"
                                                            >
                                                                <ArrowRightLeft size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(evrak._id)}
                                                                style={{ ...styles.button, padding: '4px', color: '#dc2626' }}
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        style={{
                                            ...styles.pageButton,
                                            opacity: currentPage === 1 ? 0.5 : 1,
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                        if (totalPages <= 7) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    style={{
                                                        ...styles.pageButton,
                                                        ...(currentPage === page ? styles.activePageButton : {})
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        }

                                        if (page === 1 || page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    style={{
                                                        ...styles.pageButton,
                                                        ...(currentPage === page ? styles.activePageButton : {})
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        }

                                        if ((page === currentPage - 2 && currentPage > 3) ||
                                            (page === currentPage + 2 && currentPage < totalPages - 2)) {
                                            return <span key={page} style={{ padding: '8px 4px', color: '#6b7280' }}>...</span>;
                                        }

                                        return null;
                                    })}

                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            ...styles.pageButton,
                                            opacity: currentPage === totalPages ? 0.5 : 1,
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Sayfa {currentPage} / {totalPages}
                                    <span style={{ marginLeft: '16px' }}>
                                        Toplam {filteredData.length} kayıttan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} arası gösteriliyor
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {}
            {filteredData.length > 0 && (
                <div style={styles.summaryCard}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e40af', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={24} />
                        Filtrelenmiş Özet ({filteredData.length} kayıt)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        {Object.keys(filteredSummary).map(paraBirimi => {
                            const data = filteredSummary[paraBirimi];
                            if (data.toplamOdenecek === 0) return null;
                            
                            return (
                                <div key={paraBirimi} style={{ 
                                    backgroundColor: 'white', 
                                    padding: '20px', 
                                    borderRadius: '8px',
                                    border: '2px solid #e0e7ff'
                                }}>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af', marginBottom: '12px' }}>
                                        {paraBirimi}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}>Toplam Ödenecek:</span>
                                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                                                {formatMoney(data.toplamOdenecek, paraBirimi)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}>Toplam Ödenen:</span>
                                            <span style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                                                {formatMoney(data.toplamOdenen, paraBirimi)}
                                            </span>
                                        </div>
                                        <div style={{ height: '1px', backgroundColor: '#e0e7ff', margin: '4px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>Toplam Kalan:</span>
                                            <span style={{ fontSize: '18px', fontWeight: '700', color: data.toplamKalan === 0 ? '#059669' : '#dc2626' }}>
                                                {formatMoney(data.toplamKalan, paraBirimi)}
                                            </span>
                                        </div>
                                        <div style={{ 
                                            marginTop: '8px',
                                            padding: '8px',
                                            backgroundColor: data.toplamKalan === 0 ? '#dcfce7' : '#fef2f2',
                                            borderRadius: '6px',
                                            textAlign: 'center'
                                        }}>
                                            <span style={{ 
                                                fontSize: '12px', 
                                                fontWeight: '600',
                                                color: data.toplamKalan === 0 ? '#166534' : '#dc2626'
                                            }}>
                                                {data.toplamKalan === 0 ? '✓ Tümü ödendi' : `Ödeme oranı: ${((data.toplamOdenen / data.toplamOdenecek) * 100).toFixed(1)}%`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {}
            {showForm && (
                <div style={styles.modal}>
                    <div style={{ ...styles.modalContent, maxWidth: '48rem' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                                    Yeni {formData.evrakTipi === 'cek' ? 'Çek' : 'Senet'} Ekle
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    style={{ color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'none' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Evrak Tipi
                                    </label>
                                    <select
                                        name="evrakTipi"
                                        value={formData.evrakTipi}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                        required
                                    >
                                        <option value="cek">Çek</option>
                                        <option value="senet">Senet</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Tip
                                    </label>
                                    <select
                                        name="tip"
                                        value={formData.tip}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                        required
                                    >
                                        <option value="alinan">Alınan</option>
                                        <option value="verilen">Verilen</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Firma
                                    </label>
                                    <select
                                        name="firmaId"
                                        value={formData.firmaId}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                    >
                                        <option value="">Firma Seçin</option>
                                        {sirketler.map(sirket => (
                                            <option key={sirket._id} value={sirket._id}>
                                                {sirket.sirketAdi} - {sirket.sirketKodu}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Şahıs Adı
                                    </label>
                                    <input
                                        type="text"
                                        name="sahisAdi"
                                        value={formData.sahisAdi}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="Şahıs adı girin"
                                    />
                                </div>
                            </div>

                            {formData.evrakTipi === 'cek' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Banka *
                                    </label>
                                    <input
                                        type="text"
                                        name="banka"
                                        value={formData.banka}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="Banka adı"
                                        required={formData.evrakTipi === 'cek'}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Borçlu *
                                </label>
                                <input
                                    type="text"
                                    name="borclu"
                                    value={formData.borclu}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    placeholder="Borçlu kişi/kurum"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Tutar *
                                    </label>
                                    <input
                                        type="number"
                                        name="tutar"
                                        value={formData.tutar}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Para Birimi
                                    </label>
                                    <select
                                        name="paraBirimi"
                                        value={formData.paraBirimi}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                    >
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Vade Tarihi *
                                </label>
                                <input
                                    type="date"
                                    name="vadeTarihi"
                                    value={formData.vadeTarihi}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Açıklama
                                </label>
                                <textarea
                                    name="aciklama"
                                    value={formData.aciklama}
                                    onChange={handleInputChange}
                                    rows={3}
                                    style={styles.textarea}
                                    placeholder="Ek açıklama..."
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                                <input
                                    type="checkbox"
                                    name="cariIslensin"
                                    checked={formData.cariIslensin}
                                    onChange={handleInputChange}
                                    style={{ height: '16px', width: '16px', marginRight: '8px' }}
                                />
                                <label style={{ fontSize: '14px', color: '#111827' }}>
                                    Cari hesaba işlensin
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={{ ...styles.button, ...styles.secondaryButton }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    style={{ ...styles.button, ...styles.primaryButton }}
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {}
            {showEditModal && selectedEvrak && (
                <div style={styles.modal}>
                    <div style={{ ...styles.modalContent, maxWidth: '48rem' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                                    {formData.evrakTipi === 'cek' ? 'Çek' : 'Senet'} Düzenle
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedEvrak(null);
                                        resetForm();
                                    }}
                                    style={{ color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'none' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleEdit} style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Firma
                                    </label>
                                    <select
                                        name="firmaId"
                                        value={formData.firmaId}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                    >
                                        <option value="">Firma Seçin</option>
                                        {sirketler.map(sirket => (
                                            <option key={sirket._id} value={sirket._id}>
                                                {sirket.sirketAdi} - {sirket.sirketKodu}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Şahıs Adı
                                    </label>
                                    <input
                                        type="text"
                                        name="sahisAdi"
                                        value={formData.sahisAdi}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="Şahıs adı girin"
                                    />
                                </div>
                            </div>

                            {formData.evrakTipi === 'cek' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Banka *
                                    </label>
                                    <input
                                        type="text"
                                        name="banka"
                                        value={formData.banka}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="Banka adı"
                                        required={formData.evrakTipi === 'cek'}
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Borçlu *
                                </label>
                                <input
                                    type="text"
                                    name="borclu"
                                    value={formData.borclu}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    placeholder="Borçlu kişi/kurum"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Tutar *
                                    </label>
                                    <input
                                        type="number"
                                        name="tutar"
                                        value={formData.tutar}
                                        onChange={handleInputChange}
                                        style={styles.input}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Para Birimi
                                    </label>
                                    <select
                                        name="paraBirimi"
                                        value={formData.paraBirimi}
                                        onChange={handleInputChange}
                                        style={styles.select}
                                    >
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Vade Tarihi *
                                </label>
                                <input
                                    type="date"
                                    name="vadeTarihi"
                                    value={formData.vadeTarihi}
                                    onChange={handleInputChange}
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Açıklama
                                </label>
                                <textarea
                                    name="aciklama"
                                    value={formData.aciklama}
                                    onChange={handleInputChange}
                                    rows={3}
                                    style={styles.textarea}
                                    placeholder="Ek açıklama..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedEvrak(null);
                                        resetForm();
                                    }}
                                    style={{ ...styles.button, ...styles.secondaryButton }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    style={{ ...styles.button, ...styles.primaryButton }}
                                >
                                    Güncelle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {}
{showOdemeModal && selectedEvrak && (
    <div style={styles.modal}>
        <div style={styles.modalContent}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                        {calculateKalan(selectedEvrak) === 0 ? 'Ödeme Geçmişi' : 'Ödeme Ekle'}
                    </h2>
                    <button
                        onClick={() => {
                            setShowOdemeModal(false);
                            setSelectedEvrak(null);
                            setOdemeData({ tutar: '', aciklama: '' });
                        }}
                        style={{ color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'none' }}
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div style={{ padding: '24px' }}>
                <div style={{ backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>Toplam Tutar:</span>
                        <span style={{ fontSize: '16px', fontWeight: '600' }}>
                            {formatMoney(selectedEvrak.tutar, selectedEvrak.paraBirimi)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>Toplam Ödenen:</span>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                            {formatMoney(calculateToplamOdenen(selectedEvrak), selectedEvrak.paraBirimi)}
                        </span>
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '15px', fontWeight: '600' }}>Kalan:</span>
                        <span style={{ 
                            fontSize: '18px', 
                            fontWeight: '700', 
                            color: calculateKalan(selectedEvrak) === 0 ? '#059669' : '#dc2626'
                        }}>
                            {formatMoney(calculateKalan(selectedEvrak), selectedEvrak.paraBirimi)}
                        </span>
                    </div>
                    {calculateKalan(selectedEvrak) === 0 && (
                        <div style={{ 
                            marginTop: '12px', 
                            padding: '8px', 
                            backgroundColor: '#dcfce7', 
                            borderRadius: '6px',
                            textAlign: 'center',
                            color: '#166534',
                            fontSize: '14px',
                            fontWeight: '600'
                        }}>
                            ✓ Bu evrak tamamen ödenmiştir
                        </div>
                    )}
                </div>

                {/* Sadece kalan > 0 ise form göster */}
                {calculateKalan(selectedEvrak) > 0 && (
                    <form onSubmit={handleOdemeEkle}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Ödeme Tutarı * ({selectedEvrak.paraBirimi})
                            </label>
                            <input
                                type="number"
                                value={odemeData.tutar}
                                onChange={(e) => setOdemeData(prev => ({ ...prev, tutar: e.target.value }))}
                                style={styles.input}
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                max={calculateKalan(selectedEvrak)}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                Açıklama
                            </label>
                            <textarea
                                value={odemeData.aciklama}
                                onChange={(e) => setOdemeData(prev => ({ ...prev, aciklama: e.target.value }))}
                                rows={3}
                                style={styles.textarea}
                                placeholder="Ödeme açıklaması..."
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowOdemeModal(false);
                                    setSelectedEvrak(null);
                                    setOdemeData({ tutar: '', aciklama: '' });
                                }}
                                style={{ ...styles.button, ...styles.secondaryButton }}
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                style={{ ...styles.button, ...styles.primaryButton }}
                            >
                                Ödeme Ekle
                            </button>
                        </div>
                    </form>
                )}

                {/* Ödeme geçmişi her zaman gösterilsin */}
                {selectedEvrak.odemeler && Array.isArray(selectedEvrak.odemeler) && selectedEvrak.odemeler.length > 0 && (
                    <div style={{ 
                        marginTop: calculateKalan(selectedEvrak) > 0 ? '24px' : '0', 
                        paddingTop: calculateKalan(selectedEvrak) > 0 ? '24px' : '0', 
                        borderTop: calculateKalan(selectedEvrak) > 0 ? '1px solid #e5e7eb' : 'none'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                            Ödeme Geçmişi ({selectedEvrak.odemeler.length} ödeme)
                        </h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedEvrak.odemeler.map((odeme, index) => (
                                <div key={index} style={{ 
                                    padding: '12px', 
                                    backgroundColor: '#f9fafb', 
                                    borderRadius: '6px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                                            {formatMoney(odeme.tutar, selectedEvrak.paraBirimi)}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {formatDate(odeme.tarih)}
                                        </span>
                                    </div>
                                    {odeme.aciklama && (
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                            {odeme.aciklama}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ödeme yoksa mesaj göster */}
                {(!selectedEvrak.odemeler || selectedEvrak.odemeler.length === 0) && calculateKalan(selectedEvrak) === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
                        Henüz ödeme kaydı bulunmuyor.
                    </div>
                )}

                {/* Kalan 0 ise sadece kapat butonu */}
                {calculateKalan(selectedEvrak) === 0 && (
                    <div style={{ display: 'flex', justifyContent: 'end', marginTop: '24px' }}>
                        <button
                            onClick={() => {
                                setShowOdemeModal(false);
                                setSelectedEvrak(null);
                                setOdemeData({ tutar: '', aciklama: '' });
                            }}
                            style={{ ...styles.button, ...styles.primaryButton }}
                        >
                            Kapat
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
)}

            {}
            {showDurumModal && selectedEvrak && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                                    Durum Güncelle
                                </h2>
                                <button
                                    onClick={() => setShowDurumModal(false)}
                                    style={{ color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'none' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Yeni Durum
                                </label>
                                <select
                                    value={durumData.durum}
                                    onChange={(e) => setDurumData(prev => ({ ...prev, durum: e.target.value }))}
                                    style={styles.select}
                                    required
                                >
                                    <option value="">Durum Seçin</option>
                                    <option value="Kasa">Kasa</option>
                                    <option value="Ciro">Ciro</option>
                                    <option value="Aktif">Aktif</option>
                                    <option value="Ödendi">Ödendi</option>
                                </select>
                            </div>

                            {durumData.durum === 'Ciro' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                        Transfer Edilecek Firma
                                    </label>
                                    <select
                                        value={durumData.transferFirmaId}
                                        onChange={(e) => setDurumData(prev => ({ ...prev, transferFirmaId: e.target.value }))}
                                        style={styles.select}
                                        required={durumData.durum === 'Ciro'}
                                    >
                                        <option value="">Firma Seçin</option>
                                        {sirketler.map(sirket => (
                                            <option key={sirket._id} value={sirket._id}>
                                                {sirket.sirketAdi} - {sirket.sirketKodu}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                                    Açıklama
                                </label>
                                <textarea
                                    value={durumData.aciklama}
                                    onChange={(e) => setDurumData(prev => ({ ...prev, aciklama: e.target.value }))}
                                    rows={3}
                                    style={styles.textarea}
                                    placeholder="Durum değişikliği açıklaması..."
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                                <button
                                    onClick={() => setShowDurumModal(false)}
                                    style={{ ...styles.button, ...styles.secondaryButton }}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleDurumUpdate}
                                    style={{ ...styles.button, ...styles.primaryButton }}
                                >
                                    Güncelle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CekSenet;