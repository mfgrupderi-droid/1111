import React, { useState, useEffect, useRef } from 'react';
import { Pencil, FileText, Trash2, X, Plus, Minus, Check, AlertCircle, Search, Filter, Eye, Download, DollarSign, FileSpreadsheet, Clipboard, Palette, TrendingUp } from 'lucide-react';
import axios from 'axios';
import { PageHeader, LoadingSpinner, ErrorAlert, SuccessAlert } from './SharedComponents';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const BEDENLER = ['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'ozel'];
const API_BASE_URL_ORDER = 'http://31.57.33.249:3001/api/order';
const API_BASE_URL_SIRKET = 'http://31.57.33.249:3001/api/sirketler';

const formatCurrency = (amount, currency = '$') => {
    const num = parseFloat(amount) || 0;
    if (currency === '₺' || currency === 'TL') {
        return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
    } else if (currency === '$' || currency === 'USD') {
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
};

const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [viewModal, setViewModal] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [newOrderModal, setNewOrderModal] = useState(null);
    const [exportModal, setExportModal] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [detailSearchTerm, setDetailSearchTerm] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [headerFilterDropdown, setHeaderFilterDropdown] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [detailSortConfig, setDetailSortConfig] = useState({ key: null, direction: 'asc' });
    const [detailFilters, setDetailFilters] = useState({ model: [], cins: [], renk: [] });
    const [detailFilterDropdown, setDetailFilterDropdown] = useState(null);
    // ✅ YENİ: Dropdown pozisyonu için state
    const [detailFilterDropdownPos, setDetailFilterDropdownPos] = useState({ top: 0, left: 0 });
    const [year, setYear] = useState(2026);
    const [showYearPanel, setShowYearPanel] = useState(false);
    
    // Renk Analizi State'leri
    const [showRenkAnalizi, setShowRenkAnalizi] = useState(false);
    const [renkAnaliziOrderId, setRenkAnaliziOrderId] = useState('');
    const [renkAnaliziCins, setRenkAnaliziCins] = useState('');
    const [renkAnaliziSearchTerm, setRenkAnaliziSearchTerm] = useState('');
    
    // Excel-like functionality states
    const [selectedCell, setSelectedCell] = useState({ row: null, col: null });
    const inputRefs = useRef({});

    const toast = {
      success: (msg) => setToastMessage(msg),
      error: (msg) => setToastMessage(msg)
    };

    useEffect(() => {
        const isModalOpen = viewModal || editModal || newOrderModal || deleteModal || exportModal;
        document.body.style.overflow = isModalOpen ? 'hidden' : '';
    }, [viewModal, editModal, newOrderModal, deleteModal, exportModal]);

    useEffect(() => {
        fetchOrders();
        fetchCompanies();
    }, [year]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_BASE_URL_ORDER, { params: { year } });
            setOrders(res.data);
            document.title = 'Sipariş Yönetimi';
        } catch (err) {
            toast.error('Siparişler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const res = await axios.get(API_BASE_URL_SIRKET);
            setCompanies(res.data);
        } catch (err) {
            console.error('Şirketler yüklenirken hata oluştu:', err);
        }
    };

    useEffect(() => {
        let filtered = orders;
        if (filterCompany) {
            filtered = filtered.filter(order => order.firmaAdi === filterCompany);
        }
        if (searchTerm) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(order =>
                (order.siparisId?.toLowerCase().includes(lowercasedSearchTerm)) ||
                (order.firmaAdi?.toLowerCase().includes(lowercasedSearchTerm)) ||
                (order.items || []).some(item => (item.model?.toLowerCase().includes(lowercasedSearchTerm)))
            );
        }
        setFilteredOrders(filtered);
    }, [orders, searchTerm, filterCompany]);

    const calculateRowQuantity = (item) => Object.values(item.bedenler).reduce((sum, adet) => sum + (parseInt(adet) || 0), 0);

    const getUniqueValues = (key) => {
        const values = filteredOrders.map(order => order[key]).filter(Boolean);
        return [...new Set(values)].sort();
    };

    const handleHeaderClick = (columnKey) => {
        if (columnKey === 'firma') {
            setHeaderFilterDropdown(headerFilterDropdown === 'firma' ? null : 'firma');
        } else {
            setSortConfig(prev => ({
                key: columnKey,
                direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        }
    };

    const getSortedAndFilteredOrders = () => {
        let sorted = [...filteredOrders];
        if (sortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (sortConfig.key === 'toplamAdet' || sortConfig.key === 'toplamTutar') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else if (sortConfig.key === 'siparisTarihi') {
                    aVal = new Date(aVal).getTime();
                    bVal = new Date(bVal).getTime();
                }
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    };

    const getSortedDetailItems = (items) => {
        let sorted = [...items];
        if (detailSortConfig.key) {
            sorted.sort((a, b) => {
                let aVal = a[detailSortConfig.key];
                let bVal = b[detailSortConfig.key];
                
                if (detailSortConfig.key === 'satirToplami' || detailSortConfig.key === 'birimFiyat') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                }
                
                if (aVal < bVal) return detailSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return detailSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    };

    const handleDetailHeaderClick = (columnKey) => {
        setDetailSortConfig(prev => ({
            key: columnKey,
            direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getDetailUniqueValues = (key, items) => {
        if (!items || !Array.isArray(items)) return [];
        
        const values = items
            .map(item => {
                const val = item[key];
                if (!val) return null;
                return val.replace(/[\r\n]/g, '').trim();
            })
            .filter(Boolean);
        
        return [...new Set(values)].sort();
    };

    // ✅ GÜNCELLENDİ: event parametresi eklendi, pozisyon hesaplanıyor
    const handleDetailFilterClick = (columnKey, items, event) => {
        if (['model', 'cins', 'renk'].includes(columnKey)) {
            if (detailFilterDropdown === columnKey) {
                setDetailFilterDropdown(null);
            } else {
                const rect = event.currentTarget.getBoundingClientRect();
                setDetailFilterDropdownPos({
                    top: rect.bottom + 4,
                    left: rect.left
                });
                setDetailFilterDropdown(columnKey);
            }
        }
    };

    const toggleDetailFilter = (columnKey, value) => {
        setDetailFilters(prev => ({
            ...prev,
            [columnKey]: prev[columnKey].includes(value)
                ? prev[columnKey].filter(v => v !== value)
                : [...prev[columnKey], value]
        }));
    };

    const getFilteredDetailItems = (items) => {
        return items.filter(item => {
            if (detailFilters.model.length > 0 && !detailFilters.model.includes(item.model)) return false;
            if (detailFilters.cins.length > 0 && !detailFilters.cins.includes(item.cins)) return false;
            if (detailFilters.renk.length > 0 && !detailFilters.renk.includes(item.renk)) return false;
            return true;
        });
    };

    // RENK ANALİZİ FONKSİYONLARI
    const getRenkAnalizi = () => {
        const selectedOrder = orders.find(o => o._id === renkAnaliziOrderId);
        if (!selectedOrder || !renkAnaliziCins || !selectedOrder.items) return [];

        const renkMap = {};
        const cleanedCins = renkAnaliziCins.replace(/[\r\n]/g, '').trim();
        
        selectedOrder.items
            .filter(item => {
                const itemCins = (item.cins || '').replace(/[\r\n]/g, '').trim();
                return itemCins === cleanedCins;
            })
            .forEach(item => {
                const renk = (item.renk || 'Belirtilmemiş').replace(/[\r\n]/g, '').trim();
                const toplamAdet = Object.values(item.bedenler || {}).reduce((sum, adet) => sum + (parseInt(adet) || 0), 0);
                
                if (!renkMap[renk]) {
                    renkMap[renk] = 0;
                }
                renkMap[renk] += toplamAdet;
            });

        return Object.entries(renkMap)
            .map(([renk, adet]) => ({ renk, adet }))
            .sort((a, b) => b.adet - a.adet);
    };

    const renkPaleti = {
        'Siyah': '#1a1a1a',
        'Beyaz': '#ffffff',
        'Kırmızı': '#ef4444',
        'Mavi': '#3b82f6',
        'Yeşil': '#22c55e',
        'Sarı': '#eab308',
        'Turuncu': '#f97316',
        'Mor': '#a855f7',
        'Pembe': '#ec4899',
        'Kahverengi': '#92400e',
        'Gri': '#6b7280',
        'Lacivert': '#1e40af',
        'Turkuaz': '#06b6d4',
        'Lila': '#c084fc',
        'Bordo': '#991b1b',
        'Portakal': '#ff8c00',
        'Belirtilmemiş': '#94a3b8'
    };

    const getRenkKodu = (renkAdi) => {
        const normalizedRenk = Object.keys(renkPaleti).find(
            key => key.toLowerCase() === renkAdi.toLowerCase()
        );
        return renkPaleti[normalizedRenk] || '#6366f1';
    };

    const isDark = (renkAdi) => {
        return ['Siyah', 'Lacivert', 'Mor', 'Kahverengi', 'Bordo', 'Mavi'].some(
            dark => renkAdi.toLowerCase().includes(dark.toLowerCase())
        );
    };

    const handleView = async (orderId) => { try { const res = await axios.get(`${API_BASE_URL_ORDER}/${orderId}`); setViewModal(res.data); } catch (err) { toast.error('Sipariş detayı yüklenemedi.'); } };
    const handleEdit = async (orderId) => { try { const res = await axios.get(`${API_BASE_URL_ORDER}/${orderId}`); setEditModal(res.data); } catch (err) { toast.error('Sipariş detayı yüklenemedi.'); } };
    const handleDelete = (orderId) => setDeleteModal(orderId);

    const handleNewOrder = () => {
        setNewOrderModal({ firmaId: '', items: [{ model: '', renk: '', cins: '', bedenler: BEDENLER.reduce((acc, b) => ({ ...acc, [b]: 0 }), {}), birimFiyat: 0, satirToplami: 0, not: '' }] });
        setSelectedCell({ row: 0, col: 0 });
    };

    const parseClipboardData = (text) => {
        const rows = text.split('\n').filter(row => row.trim());
        return rows.map(row => row.split('\t'));
    };

    const handlePaste = (e, modalType, itemIndex, field) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const parsedData = parseClipboardData(pastedText);
        
        const updater = (prev) => {
            const newItems = [...prev.items];
            const columnMapping = {
                'model': 0,
                'renk': 1,
                'cins': 2,
                'birimFiyat': BEDENLER.length + 3,
                'not': BEDENLER.length + 4
            };

            let startCol = columnMapping[field] !== undefined ? columnMapping[field] : 0;
            
            const bedenIndex = BEDENLER.findIndex(b => field === `beden_${b}`);
            if (bedenIndex !== -1) {
                startCol = 3 + bedenIndex;
            }

            parsedData.forEach((rowData, rowOffset) => {
                const targetRowIndex = itemIndex + rowOffset;
                
                while (targetRowIndex >= newItems.length) {
                    newItems.push({
                        model: '',
                        renk: '',
                        cins: '',
                        bedenler: BEDENLER.reduce((acc, b) => ({ ...acc, [b]: 0 }), {}),
                        birimFiyat: 0,
                        satirToplami: 0,
                        not: ''
                    });
                }

                const currentItem = { ...newItems[targetRowIndex] };
                
                rowData.forEach((cellValue, colOffset) => {
                    const targetCol = startCol + colOffset;
                    
                    if (targetCol === 0) {
                        currentItem.model = cellValue;
                    } else if (targetCol === 1) {
                        currentItem.renk = cellValue;
                    } else if (targetCol === 2) {
                        currentItem.cins = cellValue;
                    } else if (targetCol >= 3 && targetCol < 3 + BEDENLER.length) {
                        const bedenKey = BEDENLER[targetCol - 3];
                        currentItem.bedenler[bedenKey] = parseInt(cellValue) || 0;
                    } else if (targetCol === 3 + BEDENLER.length) {
                        currentItem.birimFiyat = parseFloat(cellValue) || 0;
                    } else if (targetCol === 4 + BEDENLER.length) {
                        currentItem.not = cellValue;
                    }
                });

                const birimFiyat = parseFloat(currentItem.birimFiyat) || 0;
                currentItem.satirToplami = birimFiyat * calculateRowQuantity(currentItem);
                
                newItems[targetRowIndex] = currentItem;
            });

            return { ...prev, items: newItems };
        };

        if (modalType === 'edit') {
            setEditModal(updater);
        } else {
            setNewOrderModal(updater);
        }

        toast.success(`${parsedData.length} satır yapıştırıldı!`);
    };

    const handleKeyDown = (e, modalType, itemIndex, field) => {
        const modal = modalType === 'edit' ? editModal : newOrderModal;
        if (!modal) return;

        const totalCols = 3 + BEDENLER.length + 2 + 1;
        const totalRows = modal.items.length;

        let newRow = itemIndex;
        let newCol = selectedCell.col;

        const columnMapping = {
            'model': 0,
            'renk': 1,
            'cins': 2,
            'birimFiyat': BEDENLER.length + 3,
            'not': BEDENLER.length + 4
        };

        let currentCol = columnMapping[field] !== undefined ? columnMapping[field] : 0;
        const bedenIndex = BEDENLER.findIndex(b => field === `beden_${b}`);
        if (bedenIndex !== -1) {
            currentCol = 3 + bedenIndex;
        }

        switch(e.key) {
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    newCol = currentCol - 1;
                    if (newCol < 0) {
                        newCol = totalCols - 1;
                        newRow = Math.max(0, itemIndex - 1);
                    }
                } else {
                    newCol = currentCol + 1;
                    if (newCol >= totalCols) {
                        newCol = 0;
                        newRow = Math.min(totalRows - 1, itemIndex + 1);
                        if (newRow >= totalRows) {
                            addItem(modalType);
                            newRow = totalRows;
                        }
                    }
                }
                focusCell(newRow, newCol);
                break;

            case 'Enter':
                e.preventDefault();
                newRow = itemIndex + 1;
                if (newRow >= totalRows) {
                    addItem(modalType);
                }
                focusCell(newRow, currentCol);
                break;

            case 'ArrowUp':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    focusCell(Math.max(0, itemIndex - 1), currentCol);
                }
                break;

            case 'ArrowDown':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    focusCell(Math.min(totalRows - 1, itemIndex + 1), currentCol);
                }
                break;
        }
    };

    const focusCell = (row, col) => {
        setTimeout(() => {
            const refKey = `${row}-${col}`;
            if (inputRefs.current[refKey]) {
                inputRefs.current[refKey].focus();
                inputRefs.current[refKey].select();
                setSelectedCell({ row, col });
            }
        }, 0);
    };

    const getFieldNameFromCol = (col) => {
        if (col === 0) return 'model';
        if (col === 1) return 'renk';
        if (col === 2) return 'cins';
        if (col >= 3 && col < 3 + BEDENLER.length) {
            return `beden_${BEDENLER[col - 3]}`;
        }
        if (col === 3 + BEDENLER.length) return 'birimFiyat';
        if (col === 4 + BEDENLER.length) return 'not';
        return 'model';
    };

    const handleItemChange = (modalType, itemIndex, field, value) => {
        const updater = (prev) => {
            const newItems = [...prev.items];
            const currentItem = { ...newItems[itemIndex] };
            if (field.startsWith('beden_')) {
                const beden = field.split('_')[1];
                currentItem.bedenler = { ...currentItem.bedenler, [beden]: parseInt(value) || 0 };
            } else {
                currentItem[field] = value;
            }
            const birimFiyat = parseFloat(currentItem.birimFiyat) || 0;
            currentItem.satirToplami = birimFiyat * calculateRowQuantity(currentItem);
            newItems[itemIndex] = currentItem;
            return { ...prev, items: newItems };
        };
        if (modalType === 'edit') setEditModal(updater); else setNewOrderModal(updater);
    };

    const addItem = (modalType) => {
        const newItem = { model: '', renk: '', cins: '', bedenler: BEDENLER.reduce((acc, b) => ({ ...acc, [b]: 0 }), {}), birimFiyat: 0, satirToplami: 0, not: '' };
        const updater = (prev) => ({ ...prev, items: [...prev.items, newItem] });
        if (modalType === 'edit') setEditModal(updater); else setNewOrderModal(updater);
    };

    const removeItem = (modalType, index) => {
        const remover = (prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) });
        if (modalType === 'edit') setEditModal(remover); else setNewOrderModal(remover);
    };

    const saveEditOrder = async () => {
        try {
            const toplamAdet = editModal.items.reduce((sum, item) => sum + calculateRowQuantity(item), 0);
            const toplamTutar = editModal.items.reduce((sum, item) => sum + item.satirToplami, 0);
            await axios.patch(`${API_BASE_URL_ORDER}/${editModal._id}`, { items: editModal.items, toplamAdet, toplamTutar });
            toast.success('Sipariş başarıyla güncellendi!');
            setEditModal(null);
            fetchOrders();
        } catch (err) { toast.error('Güncelleme başarısız!'); }
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`${API_BASE_URL_ORDER}/${deleteModal}`);
            toast.success('Sipariş başarıyla silindi!');
            setDeleteModal(null);
            fetchOrders();
        } catch (err) { toast.error('Silme başarısız!'); }
    };
    
    const saveNewOrder = async () => {
        if (!newOrderModal.firmaId) { toast.error('Lütfen firma seçin!'); return; }
        try {
            const toplamAdet = newOrderModal.items.reduce((sum, item) => sum + calculateRowQuantity(item), 0);
            const toplamTutar = newOrderModal.items.reduce((sum, item) => sum + item.satirToplami, 0);
            const firmaAdi = companies.find(co => co._id === newOrderModal.firmaId)?.sirketAdi || '';
            await axios.post(API_BASE_URL_ORDER, { firmaId: newOrderModal.firmaId, firmaAdi, items: newOrderModal.items, toplamAdet, toplamTutar });
            toast.success('Yeni sipariş oluşturuldu!');
            setNewOrderModal(null);
            fetchOrders();
        } catch (err) { toast.error('Kayıt başarısız!'); }
    };

    const getExportItems = () => {
        if (!viewModal) return [];
        
        const filteredBySearch = viewModal.items.filter(item => {
            if (!detailSearchTerm) return true;
            const lowerSearch = detailSearchTerm.toLowerCase();
            return (
                item.model?.toLowerCase().includes(lowerSearch) ||
                item.renk?.toLowerCase().includes(lowerSearch) ||
                item.cins?.toLowerCase().includes(lowerSearch) ||
                item.not?.toLowerCase().includes(lowerSearch)
            );
        });

        const filteredByFilters = getFilteredDetailItems(filteredBySearch);

        const hasFilters = Boolean(
            detailSearchTerm?.trim() ||
            detailFilters.model.length ||
            detailFilters.cins.length ||
            detailFilters.renk.length
        );

        return hasFilters ? filteredByFilters : viewModal.items;
    };

    const handleExportToExcel = async (includePrices) => {
        if (!viewModal) return;
        setExportModal(false);

        const exportItems = getExportItems();
        const exportItemCount = exportItems.length;

        const scale = exportItemCount > 40
            ? 80
            : exportItemCount > 30
                ? 85
                : exportItemCount > 20
                    ? 90
                    : exportItemCount > 10
                        ? 95
                        : 100;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sipariş Yönetim Sistemi';
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet('Sipariş Detayı', {
            pageSetup: { paperSize: 9, orientation: 'landscape', scale }
        });

        const standardBorder = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
        };

        const thickBorder = {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } }
        };

        const font = { name: 'Arial', size: 11, color: { argb: 'FF000000' } };
        const headerStyle = { 
            font: { ...font, bold: true, size: 12 }, 
            alignment: { vertical: 'middle', horizontal: 'center', wrapText: true }, 
            border: thickBorder,
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
        };
        const textCellStyle = { font, alignment: { vertical: 'middle', horizontal: 'left' }, border: standardBorder };
        const integerCellStyle = { font, alignment: { vertical: 'middle', horizontal: 'center' }, numFmt: '0', border: standardBorder };
        const currencyCellStyle = { font, alignment: { vertical: 'middle', horizontal: 'right' }, numFmt: '#,##0.00', border: standardBorder };
        const totalLabelStyle = { font: { ...font, bold: true, size: 12 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: thickBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } } };
        const totalIntegerCellStyle = { font: { ...font, bold: true, size: 12 }, alignment: { vertical: 'middle', horizontal: 'center' }, numFmt: '0', border: thickBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } } };
        const totalCurrencyCellStyle = { font: { ...font, bold: true, size: 12 }, alignment: { vertical: 'middle', horizontal: 'right' }, numFmt: '#,##0.00', border: thickBorder, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } } };

        worksheet.mergeCells('B2:F3');
        const titleCell = worksheet.getCell('B2');
        titleCell.value = viewModal.firmaAdi;
        titleCell.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FF000000' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        
        worksheet.mergeCells('B4:F4');
        worksheet.getCell('B4').value = "Sipariş Detayları";
        worksheet.getCell('B4').font = { name: 'Arial', size: 14, color: { argb: 'FF666666' } };
        
        const priceColumnsCount = includePrices ? 2 : 0;
        const infoStartCol = BEDENLER.length + 5 + priceColumnsCount;
        worksheet.getCell(6, infoStartCol).value = 'Sipariş ID:';
        worksheet.getCell(7, infoStartCol).value = 'Tarih:';
        worksheet.getCell(6, infoStartCol).alignment = worksheet.getCell(7, infoStartCol).alignment = { horizontal: 'right' };
        worksheet.getCell(6, infoStartCol).font = worksheet.getCell(7, infoStartCol).font = { ...font, bold: true };
        
        worksheet.getCell(6, infoStartCol + 1).value = viewModal.siparisId;
        worksheet.getCell(7, infoStartCol + 1).value = new Date(viewModal.siparisTarihi);
        worksheet.getCell(7, infoStartCol + 1).numFmt = 'dd.mm.yyyy';
        worksheet.getCell(6, infoStartCol + 1).font = worksheet.getCell(7, infoStartCol + 1).font = font;

        const startRow = 9;
        const headerRow = worksheet.getRow(startRow);
        
        const headerValues = ['Model', 'Renk', 'Cins', ...BEDENLER.map(b => b.toUpperCase()), 'Satır Adet'];
        if (includePrices) {
            headerValues.push('Birim Fiyat', 'Satır Toplamı');
        }
        headerValues.push('Not');
        
        headerRow.values = headerValues;
        headerRow.eachCell((cell, colNumber) => {
            cell.style = headerStyle;
        });
        headerRow.height = 25;

        const columnConfig = [
            { key: 'model', width: 22 }, 
            { key: 'renk', width: 14 }, 
            { key: 'cins', width: 14 },
            ...BEDENLER.map(b => ({ key: b, width: 6 })),
            { key: 'satirAdet', width: 10 }
        ];
        
        if (includePrices) {
            columnConfig.push(
                { key: 'birimFiyat', width: 12 },
                { key: 'satirToplami', width: 14 }
            );
        }
        
        columnConfig.push({ key: 'not', width: 25 });
        
        worksheet.columns = columnConfig;

        exportItems.forEach((item, index) => {
            const bedenValues = {};
            BEDENLER.forEach(b => {
                bedenValues[b] = item.bedenler[b] > 0 ? item.bedenler[b] : '-';
            });
            
            const rowData = { 
                model: item.model, 
                renk: item.renk, 
                cins: item.cins, 
                ...bedenValues, 
                satirAdet: calculateRowQuantity(item)
            };
            
            if (includePrices) {
                rowData.birimFiyat = item.birimFiyat;
                rowData.satirToplami = item.satirToplami;
            }
            
            rowData.not = item.not || '-';
            
            const row = worksheet.addRow(rowData);
            row.height = 20;
        });

        const totalRowNumber = startRow + exportItems.length + 1;
        const totalRow = worksheet.getRow(totalRowNumber);
        
        const totalBedenValues = {};
        BEDENLER.forEach(b => {
            const total = exportItems.reduce((sum, item) => sum + (item.bedenler[b] || 0), 0);
            totalBedenValues[b] = total > 0 ? total : '-';
        });
        
        const totalRowData = { 
            cins: 'TOPLAM', 
            ...totalBedenValues, 
            satirAdet: exportItems.reduce((sum, item) => sum + calculateRowQuantity(item), 0)
        };
        
        if (includePrices) {
            totalRowData.satirToplami = exportItems.reduce((sum, item) => sum + item.satirToplami, 0);
        }
        
        totalRow.values = totalRowData;
        totalRow.height = 25;
        worksheet.mergeCells(`A${totalRowNumber}:C${totalRowNumber}`);

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber < startRow || rowNumber === totalRowNumber) return;
            
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const colKey = worksheet.columns[colNumber - 1].key;
                if (BEDENLER.includes(colKey) || colKey === 'satirAdet') {
                    cell.style = integerCellStyle;
                    if (cell.value === '-') {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    }
                } else if (includePrices && (colKey === 'birimFiyat' || colKey === 'satirToplami')) {
                    cell.style = currencyCellStyle;
                } else {
                    cell.style = textCellStyle;
                }
            });
        });

        totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const colKey = worksheet.columns[colNumber - 1]?.key;
            if (colKey === 'cins') {
                cell.style = totalLabelStyle;
            } else if (BEDENLER.includes(colKey) || colKey === 'satirAdet') {
                cell.style = totalIntegerCellStyle;
                if (cell.value === '-') {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            } else if (includePrices && colKey === 'satirToplami') {
                cell.style = totalCurrencyCellStyle;
            }
        });

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const fileName = includePrices 
                ? `Siparis_Detay_Fiyatli_${viewModal.siparisId}.xlsx`
                : `Siparis_Detay_Fiyatsiz_${viewModal.siparisId}.xlsx`;
            saveAs(blob, fileName);
            toast.success("Excel Raporu başarıyla oluşturuldu!");
        }).catch(err => {
            toast.error("Excel Raporu oluşturulurken bir hata oluştu.");
            console.error(err);
        });
    };

    const renderExportModal = () => {
        if (!exportModal) return null;
        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContentDelete}>
                    <div style={styles.deleteConfirmation}>
                        <div style={styles.exportIcon}><FileSpreadsheet size={48} color="#5D5FEF" /></div>
                        <h3 style={styles.deleteTitle}>Excel Raporu Oluştur</h3>
                        <p style={styles.deleteText}>Excel raporunuzda fiyat bilgileri görünsün mü?</p>
                        <div style={styles.exportActions}>
                            <button style={styles.btnSecondary} onClick={() => setExportModal(false)}>İptal</button>
                            <button style={styles.btnExportWithoutPrice} onClick={() => handleExportToExcel(false)}>
                                <FileSpreadsheet size={16} /> Fiyatsız
                            </button>
                            <button style={styles.btnExportWithPrice} onClick={() => handleExportToExcel(true)}>
                                <DollarSign size={16} /> Fiyatlı
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // RENK ANALİZİ MODAL
    const renderRenkAnaliziModal = () => {
        if (!showRenkAnalizi) return null;

        const selectedOrder = orders.find(o => o._id === renkAnaliziOrderId);
        const availableCinsler = selectedOrder?.items 
            ? getDetailUniqueValues('cins', selectedOrder.items)
            : [];

        const renkAnalizi = getRenkAnalizi();
        const toplamAdet = renkAnalizi.reduce((sum, item) => sum + item.adet, 0);

        const filteredOrders = orders.filter(order => {
            if (!renkAnaliziSearchTerm) return true;
            const lowerSearch = renkAnaliziSearchTerm.toLowerCase();
            return (
                order.siparisId?.toLowerCase().includes(lowerSearch) ||
                order.firmaAdi?.toLowerCase().includes(lowerSearch)
            );
        });

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.renkAnaliziModal}>
                    <div style={styles.modalHeader}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <Palette size={24} color="#6366f1" />
                            <h3 style={styles.modalTitle}>Renk Analizi</h3>
                        </div>
                        <button onClick={() => {
                            setShowRenkAnalizi(false);
                            setRenkAnaliziOrderId('');
                            setRenkAnaliziCins('');
                            setRenkAnaliziSearchTerm('');
                        }} style={styles.closeButton}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={styles.renkAnaliziBody}>
                        <div style={styles.renkAnaliziSidebar}>
                            <div style={styles.searchBox}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Sipariş veya firma ara..."
                                    value={renkAnaliziSearchTerm}
                                    onChange={(e) => setRenkAnaliziSearchTerm(e.target.value)}
                                    style={styles.searchInput}
                                />
                                {renkAnaliziSearchTerm && (
                                    <X 
                                        size={18} 
                                        color="#94a3b8" 
                                        style={{cursor: 'pointer'}}
                                        onClick={() => setRenkAnaliziSearchTerm('')}
                                    />
                                )}
                            </div>

                            <div style={styles.selectWrapper}>
                                <label style={styles.label}>Sipariş</label>
                                <select
                                    value={renkAnaliziOrderId}
                                    onChange={(e) => {
                                        setRenkAnaliziOrderId(e.target.value);
                                        setRenkAnaliziCins('');
                                    }}
                                    style={styles.select}
                                >
                                    <option value="">Sipariş seçin...</option>
                                    {filteredOrders.map(order => (
                                        <option key={order._id} value={order._id}>
                                            {order.siparisId} - {order.firmaAdi}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {renkAnaliziOrderId && availableCinsler.length > 0 && (
                                <div style={styles.selectWrapper}>
                                    <label style={styles.label}>Cins</label>
                                    <select
                                        value={renkAnaliziCins}
                                        onChange={(e) => setRenkAnaliziCins(e.target.value)}
                                        style={styles.select}
                                    >
                                        <option value="">Cins seçin...</option>
                                        {availableCinsler.map(cins => (
                                            <option key={cins} value={cins}>
                                                {cins}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedOrder && renkAnaliziCins && renkAnalizi.length > 0 && (
                                <div style={styles.renkSummary}>
                                    <div style={styles.summaryItem}>
                                        <span style={styles.summaryLabel}>Renk Çeşidi</span>
                                        <span style={styles.summaryValue}>{renkAnalizi.length}</span>
                                    </div>
                                    <div style={styles.summaryDivider}></div>
                                    <div style={styles.summaryItem}>
                                        <span style={styles.summaryLabel}>Toplam Adet</span>
                                        <span style={styles.summaryValue}>{toplamAdet}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={styles.renkAnaliziContent}>
                            {!renkAnaliziOrderId ? (
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyIcon}>📊</div>
                                    <h3 style={styles.emptyTitle}>Sipariş Seçin</h3>
                                    <p style={styles.emptyText}>Renk analizini görüntülemek için bir sipariş seçin</p>
                                </div>
                            ) : !renkAnaliziCins ? (
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyIcon}>🎨</div>
                                    <h3 style={styles.emptyTitle}>Cins Seçin</h3>
                                    <p style={styles.emptyText}>
                                        {availableCinsler.length > 0 
                                            ? `${availableCinsler.length} farklı cins mevcut`
                                            : 'Bu siparişte cins bilgisi bulunamadı'
                                        }
                                    </p>
                                </div>
                            ) : renkAnalizi.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <div style={styles.emptyIcon}>🔍</div>
                                    <h3 style={styles.emptyTitle}>Sonuç Yok</h3>
                                    <p style={styles.emptyText}>Bu cins için renk bilgisi bulunamadı</p>
                                </div>
                            ) : (
                                <div style={styles.renkResults}>
                                    <div style={styles.resultsHeader}>
                                        <TrendingUp size={20} color="#6366f1" />
                                        <h2 style={styles.resultsTitle}>{renkAnaliziCins}</h2>
                                    </div>

                                    <div style={styles.colorGrid}>
                                        {renkAnalizi.map((item, index) => {
                                            const renkKodu = getRenkKodu(item.renk);
                                            const percentage = ((item.adet / toplamAdet) * 100).toFixed(1);
                                            const isRenkDark = isDark(item.renk);

                                            return (
                                                <div 
                                                    key={item.renk}
                                                    style={{
                                                        ...styles.colorCard,
                                                        backgroundColor: renkKodu,
                                                        animationDelay: `${index * 0.05}s`
                                                    }}
                                                >
                                                    <div style={{
                                                        ...styles.colorCardContent,
                                                        color: isRenkDark ? '#ffffff' : '#1a1a1a'
                                                    }}>
                                                        <div style={styles.colorName}>{item.renk}</div>
                                                        <div style={styles.colorAmount}>{item.adet}</div>
                                                        <div style={styles.colorPercent}>{percentage}%</div>
                                                    </div>
                                                    
                                                    <div style={{
                                                        ...styles.colorShine,
                                                        background: isRenkDark 
                                                            ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
                                                            : 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 100%)'
                                                    }}></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    };

    const renderEditNewModal = () => {
        const modalData = editModal || newOrderModal;
        if (!modalData) return null;
        const isEdit = !!editModal;
        const modalType = isEdit ? 'edit' : 'new';
        const toplamTutar = modalData.items.reduce((sum, item) => sum + item.satirToplami, 0);

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContent}>
                    <div style={styles.modalHeader}>
                        <h3 style={styles.modalTitle}>{isEdit ? `Siparişi Düzenle: ${modalData.siparisId}` : 'Yeni Sipariş Oluştur'}</h3>
                        <button onClick={() => { setEditModal(null); setNewOrderModal(null); setSelectedCell({ row: null, col: null }); }} style={styles.closeButton}><X size={24} /></button>
                    </div>
                    
                    <div style={styles.excelTips}>
                        <Clipboard size={16} />
                        <span><strong>Excel İpuçları:</strong> Ctrl+V ile yapıştır | Tab ile sağa git | Enter ile alta in | Ctrl+↑↓ ile satır değiştir</span>
                    </div>

                    <div style={styles.modalBody}>
                        <div style={styles.formHeader}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Firma</label>
                                {isEdit ? (
                                    <input type="text" style={styles.input} value={modalData.firmaAdi} disabled />
                                ) : (
                                    <select style={styles.input} value={newOrderModal.firmaId} onChange={(e) => setNewOrderModal(prev => ({ ...prev, firmaId: e.target.value }))}>
                                        <option value="">-- Firma Seçin --</option>
                                        {companies.map(co => (<option key={co._id} value={co._id}>{co.sirketAdi}</option>))}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Model</th>
                                        <th style={styles.th}>Renk</th>
                                        <th style={styles.th}>Cins</th>
                                        {BEDENLER.map(b => <th key={b} style={{...styles.th, width: '50px'}}>{b.toUpperCase()}</th>)}
                                        <th style={styles.th}>Adet</th>
                                        <th style={styles.th}>Birim Fiyat</th>
                                        <th style={styles.th}>Toplam</th>
                                        <th style={styles.th}>Not</th>
                                        <th style={styles.th}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.td}>
                                                <input 
                                                    ref={el => inputRefs.current[`${idx}-0`] = el}
                                                    type="text" 
                                                    style={{...styles.cellInput, backgroundColor: selectedCell.row === idx && selectedCell.col === 0 ? '#e3f2fd' : 'transparent'}}
                                                    value={item.model} 
                                                    onChange={(e) => handleItemChange(modalType, idx, 'model', e.target.value)}
                                                    onPaste={(e) => handlePaste(e, modalType, idx, 'model')}
                                                    onKeyDown={(e) => handleKeyDown(e, modalType, idx, 'model')}
                                                    onFocus={() => setSelectedCell({ row: idx, col: 0 })}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input 
                                                    ref={el => inputRefs.current[`${idx}-1`] = el}
                                                    type="text" 
                                                    style={{...styles.cellInput, backgroundColor: selectedCell.row === idx && selectedCell.col === 1 ? '#e3f2fd' : 'transparent'}}
                                                    value={item.renk} 
                                                    onChange={(e) => handleItemChange(modalType, idx, 'renk', e.target.value)}
                                                    onPaste={(e) => handlePaste(e, modalType, idx, 'renk')}
                                                    onKeyDown={(e) => handleKeyDown(e, modalType, idx, 'renk')}
                                                    onFocus={() => setSelectedCell({ row: idx, col: 1 })}
                                                />
                                            </td>
                                            <td style={styles.td}>
                                                <input 
                                                    ref={el => inputRefs.current[`${idx}-2`] = el}
                                                    type="text" 
                                                    style={{...styles.cellInput, backgroundColor: selectedCell.row === idx && selectedCell.col === 2 ? '#e3f2fd' : 'transparent'}}
                                                    value={item.cins} 
                                                    onChange={(e) => handleItemChange(modalType, idx, 'cins', e.target.value)}
                                                    onPaste={(e) => handlePaste(e, modalType, idx, 'cins')}
                                                    onKeyDown={(e) => handleKeyDown(e, modalType, idx, 'cins')}
                                                    onFocus={() => setSelectedCell({ row: idx, col: 2 })}
                                                />
                                            </td>
                                            {BEDENLER.map((b, bedenIdx) => (
                                                <td key={b} style={styles.td}>
                                                    <input 
                                                        ref={el => inputRefs.current[`${idx}-${3 + bedenIdx}`] = el}
                                                        type="number" 
                                                        min="0" 
                                                        style={{...styles.cellInput, width: '50px', textAlign: 'center', backgroundColor: selectedCell.row === idx && selectedCell.col === 3 + bedenIdx ? '#e3f2fd' : 'transparent'}}
                                                        value={item.bedenler[b] || ''} 
                                                        onChange={(e) => handleItemChange(modalType, idx, `beden_${b}`, e.target.value)}
                                                        onPaste={(e) => handlePaste(e, modalType, idx, `beden_${b}`)}
                                                        onKeyDown={(e) => handleKeyDown(e, modalType, idx, `beden_${b}`)}
                                                        onFocus={() => setSelectedCell({ row: idx, col: 3 + bedenIdx })}
                                                    />
                                                </td>
                                            ))}
                                            <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f8f9fa'}}>{calculateRowQuantity(item)}</td>
                                            <td style={styles.td}>
                                                <input 
                                                    ref={el => inputRefs.current[`${idx}-${3 + BEDENLER.length}`] = el}
                                                    type="number" 
                                                    step="0.01" 
                                                    style={{...styles.cellInput, backgroundColor: selectedCell.row === idx && selectedCell.col === 3 + BEDENLER.length ? '#e3f2fd' : 'transparent'}}
                                                    value={item.birimFiyat} 
                                                    onChange={(e) => handleItemChange(modalType, idx, 'birimFiyat', e.target.value)}
                                                    onPaste={(e) => handlePaste(e, modalType, idx, 'birimFiyat')}
                                                    onKeyDown={(e) => handleKeyDown(e, modalType, idx, 'birimFiyat')}
                                                    onFocus={() => setSelectedCell({ row: idx, col: 3 + BEDENLER.length })}
                                                />
                                            </td>
                                            <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f8f9fa'}}>{formatCurrency(item.satirToplami)}</td>
                                            <td style={styles.td}>
                                                <input 
                                                    ref={el => inputRefs.current[`${idx}-${4 + BEDENLER.length}`] = el}
                                                    type="text" 
                                                    style={{...styles.cellInput, backgroundColor: selectedCell.row === idx && selectedCell.col === 4 + BEDENLER.length ? '#e3f2fd' : 'transparent'}}
                                                    value={item.not || ''} 
                                                    onChange={(e) => handleItemChange(modalType, idx, 'not', e.target.value)}
                                                    onPaste={(e) => handlePaste(e, modalType, idx, 'not')}
                                                    onKeyDown={(e) => handleKeyDown(e, modalType, idx, 'not')}
                                                    onFocus={() => setSelectedCell({ row: idx, col: 4 + BEDENLER.length })}
                                                />
                                            </td>
                                            <td style={styles.td}><button style={styles.removeBtn} onClick={() => removeItem(modalType, idx)} title="Satırı Sil"><Minus size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} style={styles.footerCell}>
                                            <button style={styles.addRowBtn} onClick={() => addItem(modalType)}><Plus size={16} /> Satır Ekle</button>
                                        </td>
                                        <td colSpan={BEDENLER.length + 5} style={styles.totalCell}>
                                            <strong>Toplam Tutar: {formatCurrency(toplamTutar)}</strong>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div style={styles.modalFooter}>
                        <button style={styles.btnSecondary} onClick={() => { setEditModal(null); setNewOrderModal(null); setSelectedCell({ row: null, col: null }); }}>İptal</button>
                        <button style={styles.btnPrimary} onClick={isEdit ? saveEditOrder : saveNewOrder}><Check size={16} /> Kaydet</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderViewModal = () => {
        if (!viewModal) return null;
        
        const filteredItems = viewModal.items.filter(item => {
            if (!detailSearchTerm) return true;
            const lowerSearch = detailSearchTerm.toLowerCase();
            return (
                item.model?.toLowerCase().includes(lowerSearch) ||
                item.renk?.toLowerCase().includes(lowerSearch) ||
                item.cins?.toLowerCase().includes(lowerSearch) ||
                item.not?.toLowerCase().includes(lowerSearch)
            );
        });

        const finalFilteredItems = getFilteredDetailItems(filteredItems);

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContentView}>
                    <div style={styles.modalHeader}>
                        <h3 style={styles.modalTitle}>Sipariş Detayı</h3>
                        <button onClick={() => {
                            setViewModal(null);
                            setDetailSearchTerm('');
                            setDetailSortConfig({ key: null, direction: 'asc' });
                            setDetailFilters({ model: [], cins: [], renk: [] });
                            setDetailFilterDropdown(null);
                        }} style={styles.closeButton}><X size={24} /></button>
                    </div>
                    <div style={styles.modalBody}>
                        <div style={styles.viewDetails}>
                            <div style={styles.detailCard}><span style={styles.detailLabel}>Sipariş ID</span><span style={styles.detailValue}>{viewModal.siparisId}</span></div>
                            <div style={styles.detailCard}><span style={styles.detailLabel}>Firma</span><span style={styles.detailValue}>{viewModal.firmaAdi}</span></div>
                            <div style={styles.detailCard}><span style={styles.detailLabel}>Sipariş Tarihi</span><span style={styles.detailValue}>{new Date(viewModal.siparisTarihi).toLocaleDateString('tr-TR')}</span></div>
                            <div style={styles.detailCard}><span style={styles.detailLabel}>Toplam Adet</span><span style={styles.detailValue}>{viewModal.toplamAdet}</span></div>
                            <div style={styles.detailCardTotal}><span style={styles.detailLabelWhite}>Toplam Tutar</span><span style={styles.detailValue}>{formatCurrency(viewModal.toplamTutar)}</span></div>
                        </div>
                        <div style={styles.searchContainer}>
                            <div style={styles.searchBox}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Model, Renk, Cins veya Not içinde ara..."
                                    value={detailSearchTerm}
                                    onChange={(e) => setDetailSearchTerm(e.target.value)}
                                    style={styles.searchInput}
                                />
                            </div>
                        </div>
                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {/* ✅ GÜNCELLENDİ: Model th - inline dropdown kaldırıldı, event geçirildi */}
                                        <th
                                            style={{...styles.th, cursor: 'pointer', userSelect: 'none'}}
                                            onClick={(e) => handleDetailFilterClick('model', filteredItems, e)}
                                        >
                                            Model
                                            {detailFilters.model.length > 0 && (
                                                <span style={{marginLeft: '6px', color: '#5D5FEF', fontSize: '12px', fontWeight: '700'}}>
                                                    ({detailFilters.model.length}) <Filter size={11} style={{verticalAlign: 'middle'}} />
                                                </span>
                                            )}
                                        </th>
                                        {/* ✅ GÜNCELLENDİ: Renk th */}
                                        <th
                                            style={{...styles.th, cursor: 'pointer', userSelect: 'none'}}
                                            onClick={(e) => handleDetailFilterClick('renk', filteredItems, e)}
                                        >
                                            Renk
                                            {detailFilters.renk.length > 0 && (
                                                <span style={{marginLeft: '6px', color: '#5D5FEF', fontSize: '12px', fontWeight: '700'}}>
                                                    ({detailFilters.renk.length}) <Filter size={11} style={{verticalAlign: 'middle'}} />
                                                </span>
                                            )}
                                        </th>
                                        {/* ✅ GÜNCELLENDİ: Cins th */}
                                        <th
                                            style={{...styles.th, cursor: 'pointer', userSelect: 'none'}}
                                            onClick={(e) => handleDetailFilterClick('cins', filteredItems, e)}
                                        >
                                            Cins
                                            {detailFilters.cins.length > 0 && (
                                                <span style={{marginLeft: '6px', color: '#5D5FEF', fontSize: '12px', fontWeight: '700'}}>
                                                    ({detailFilters.cins.length}) <Filter size={11} style={{verticalAlign: 'middle'}} />
                                                </span>
                                            )}
                                        </th>
                                        {BEDENLER.map(b => <th key={b} style={{...styles.th, width: '50px'}}>{b.toUpperCase()}</th>)}
                                        <th style={{...styles.th, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleDetailHeaderClick('satirToplami')}>
                                            Adet {detailSortConfig.key === 'satirToplami' && (detailSortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th style={{...styles.th, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleDetailHeaderClick('birimFiyat')}>
                                            Birim Fiyat {detailSortConfig.key === 'birimFiyat' && (detailSortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th style={{...styles.th, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleDetailHeaderClick('satirToplami')}>
                                            Toplam {detailSortConfig.key === 'satirToplami' && (detailSortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th style={styles.th}>Not</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {finalFilteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={BEDENLER.length + 7} style={styles.noData}>
                                                <Eye size={32} />
                                                <p>Filtreye uygun ürün bulunamadı.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        getSortedDetailItems(finalFilteredItems).map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={styles.td}>{item.model}</td>
                                                <td style={styles.td}>{item.renk}</td>
                                                <td style={styles.td}>{item.cins}</td>
                                                {BEDENLER.map(b => <td key={b} style={{...styles.td, textAlign: 'center'}}>{item.bedenler[b] > 0 ? item.bedenler[b] : '-'}</td>)}
                                                <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f8f9fa', textAlign: 'center'}}>{calculateRowQuantity(item)}</td>
                                                <td style={{...styles.td, textAlign: 'right'}}>{formatCurrency(item.birimFiyat)}</td>
                                                <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f8f9fa', textAlign: 'right'}}>{formatCurrency(item.satirToplami)}</td>
                                                <td style={styles.td}>{item.not || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr style={{backgroundColor: '#f0f4ff', fontWeight: '600', borderTop: '2px solid #e2e8f0'}}>
                                        <td colSpan={BEDENLER.length + 3} style={{...styles.td, textAlign: 'center'}}>TOPLAM</td>
                                        <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f0f4ff', textAlign: 'center'}}>{finalFilteredItems.reduce((sum, item) => sum + calculateRowQuantity(item), 0)}</td>
                                        <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f0f4ff'}}></td>
                                        <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f0f4ff', textAlign: 'right'}}>{formatCurrency(finalFilteredItems.reduce((sum, item) => sum + item.satirToplami, 0))}</td>
                                        <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f0f4ff'}}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div style={styles.modalFooter}>
                        <button style={styles.btnSecondary} onClick={() => {
                            setViewModal(null);
                            setDetailSearchTerm('');
                            setDetailSortConfig({ key: null, direction: 'asc' });
                            setDetailFilters({ model: [], cins: [], renk: [] });
                            setDetailFilterDropdown(null);
                        }}>Kapat</button>
                        <button style={styles.btnPrimary} onClick={() => setExportModal(true)}><Download size={16} /> Excel'e Aktar</button>
                    </div>
                </div>

                {/* ✅ YENİ: position:fixed dropdown - overflow:auto'dan bağımsız, her şeyin üstünde */}
                {detailFilterDropdown && (
                    <>
                        {/* Dışarıya tıklayınca kapat */}
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
                            onClick={() => setDetailFilterDropdown(null)}
                        />
                        <div style={{
                            position: 'fixed',
                            top: detailFilterDropdownPos.top,
                            left: detailFilterDropdownPos.left,
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            minWidth: '220px',
                            maxHeight: '320px',
                            overflowY: 'auto',
                            zIndex: 9999,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
                        }}>
                            {getDetailUniqueValues(detailFilterDropdown, filteredItems).map(value => (
                                <label key={value} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f0f0f0',
                                    fontSize: '13px',
                                    color: '#2d3748',
                                    backgroundColor: detailFilters[detailFilterDropdown]?.includes(value) ? '#f0f4ff' : 'white',
                                    transition: 'background-color 0.15s'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={detailFilters[detailFilterDropdown]?.includes(value)}
                                        onChange={() => toggleDetailFilter(detailFilterDropdown, value)}
                                        style={{ accentColor: '#5D5FEF', width: '15px', height: '15px', cursor: 'pointer' }}
                                    />
                                    {value}
                                </label>
                            ))}
                            <div style={{ padding: '8px 14px', borderTop: '2px solid #e2e8f0', backgroundColor: '#f7fafc', position: 'sticky', bottom: 0 }}>
                                <button
                                    onClick={() => {
                                        setDetailFilters(prev => ({ ...prev, [detailFilterDropdown]: [] }));
                                        setDetailFilterDropdown(null);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '7px',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '5px',
                                        backgroundColor: 'white',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        color: '#DC3545',
                                        fontWeight: '600'
                                    }}
                                >
                                    Filtreyi Temizle
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderDeleteModal = () => {
        if (!deleteModal) return null;
        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContentDelete}>
                    <div style={styles.deleteConfirmation}>
                        <div style={styles.deleteIcon}><AlertCircle size={48} color="#DC3545" /></div>
                        <h3 style={styles.deleteTitle}>Siparişi Sil</h3>
                        <p style={styles.deleteText}>Bu siparişi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div style={styles.deleteActions}>
                            <button style={styles.btnSecondary} onClick={() => setDeleteModal(null)}>İptal</button>
                            <button style={styles.btnDanger} onClick={confirmDelete}><Trash2 size={16} /> Evet, Sil</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Yükleniyor...</p></div>;

    return (
        <div style={styles.container}>
            {toastMessage && (
                <div style={styles.toast} onClick={() => setToastMessage('')}>
                    {toastMessage}
                </div>
            )}
            
            {/* Yıl Seçimi Kayan Penceresi */}
            {showYearPanel && (
                <>
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 998,
                        }}
                        onClick={() => setShowYearPanel(false)}
                    />
                    <div style={{
                        position: 'fixed',
                        right: 0,
                        top: 0,
                        height: '100%',
                        width: '400px',
                        backgroundColor: 'white',
                        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
                        zIndex: 999,
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideIn 0.3s ease-out',
                    }}>
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{margin: 0, fontSize: '18px', fontWeight: '600', color: '#333'}}>
                                📅 Yıl Seçimi
                            </h2>
                            <button 
                                onClick={() => setShowYearPanel(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#999'
                                }}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div style={{padding: '30px 20px', flex: 1}}>
                            <p style={{color: '#666', marginBottom: '20px', fontSize: '14px'}}>
                                Siparişleri görmek istediğiniz yılı seçin
                            </p>
                            
                            <div style={{display: 'flex', gap: '12px', flexDirection: 'column'}}>
                                {[2025, 2026].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => {
                                            setYear(y);
                                            setShowYearPanel(false);
                                        }}
                                        style={{
                                            padding: '16px',
                                            border: year === y ? '2px solid #3f51b5' : '1px solid #ddd',
                                            backgroundColor: year === y ? '#f0f4ff' : 'white',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            fontWeight: year === y ? '700' : '500',
                                            color: year === y ? '#3f51b5' : '#333',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (year !== y) {
                                                e.target.style.borderColor = '#3f51b5';
                                                e.target.style.backgroundColor = '#f9f9f9';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (year !== y) {
                                                e.target.style.borderColor = '#ddd';
                                                e.target.style.backgroundColor = 'white';
                                            }
                                        }}
                                    >
                                        {y === 2025 ? '📗 2025 (Arşiv)' : '📘 2026 (Aktif)'} {year === y && '✓'}
                                    </button>
                                ))}
                            </div>

                            <div style={{
                                marginTop: '30px',
                                padding: '16px',
                                backgroundColor: '#f0f4ff',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#3f51b5',
                                lineHeight: '1.5'
                            }}>
                                <strong>💡 Bilgi:</strong> Seçilen yıl içinde tüm siparişler filtrelenecektir. 
                            </div>
                        </div>
                        
                        <div style={{
                            padding: '16px',
                            borderTop: '1px solid #eee',
                            backgroundColor: '#f9f9f9'
                        }}>
                            <button 
                                onClick={() => setShowYearPanel(false)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#3f51b5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                }}
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                    
                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                </>
            )}
            
            <div style={styles.header}>
                <div>
                    <h1 style={styles.h1}>Sipariş Yönetimi</h1>
                    <p style={styles.subtitle}>Tüm siparişlerinizi buradan yönetebilirsiniz</p>
                </div>
                <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <button 
                        style={{...styles.btnSecondary, display: 'inline-flex', alignItems: 'center', gap: '8px'}} 
                        onClick={() => setShowRenkAnalizi(true)}
                    >
                        <Palette size={16} /> Renk Analizi
                    </button>
                    <button style={styles.btnPrimary} onClick={handleNewOrder}><Plus size={16} /> Yeni Sipariş Oluştur</button>
                </div>
            </div>
            <div style={styles.toolbar}>
                <div style={styles.searchBox}>
                    <Search size={18} />
                    <input type="text" placeholder="Sipariş ID, Firma veya Model ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
                </div>
                <div style={styles.filterBox}>
                    <Filter size={18} />
                    <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} style={styles.searchInput}>
                        <option value="">Tüm Firmalar</option>
                        {companies.map((company) => (<option key={company._id} value={company.sirketAdi}>{company.sirketAdi}</option>))}
                    </select>
                </div>
                <button 
                    style={{...styles.btnSecondary, position: 'relative'}}
                    onClick={() => setShowYearPanel(true)}
                >
                    📅 Yıl: {year}
                </button>
            </div>
            <div style={styles.card}>
                <div style={styles.tableContainerMain}>
                    <table style={styles.mainTable}>
                        <thead>
                            <tr>
                                <th style={{...styles.mainTh, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleHeaderClick('siparisId')}>
                                    Sipariş ID {sortConfig.key === 'siparisId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={{...styles.mainTh, cursor: 'pointer', userSelect: 'none', position: 'relative'}} onClick={() => handleHeaderClick('firma')}>
                                    Firma {sortConfig.key === 'firma' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    <div style={{position: 'relative', display: 'inline-block', marginLeft: '8px'}}>
                                        {headerFilterDropdown === 'firma' && (
                                            <div style={{position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', minWidth: '200px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}}>
                                                {getUniqueValues('firmaAdi').map(firma => (
                                                    <label key={firma} style={{display: 'block', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', marginBottom: 0}}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={filterCompany === firma}
                                                            onChange={() => setFilterCompany(filterCompany === firma ? '' : firma)}
                                                            style={{marginRight: '8px'}}
                                                        />
                                                        {firma}
                                                    </label>
                                                ))}
                                                <div style={{padding: '8px 14px', borderTop: '1px solid #e2e8f0'}}>
                                                    <button onClick={() => setFilterCompany('')} style={{width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', fontSize: '12px'}}>Temizle</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </th>
                                <th style={{...styles.mainTh, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleHeaderClick('toplamAdet')}>
                                    Toplam Adet {sortConfig.key === 'toplamAdet' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={{...styles.mainTh, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleHeaderClick('siparisTarihi')}>
                                    Sipariş Tarihi {sortConfig.key === 'siparisTarihi' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={{...styles.mainTh, cursor: 'pointer', userSelect: 'none'}} onClick={() => handleHeaderClick('toplamTutar')}>
                                    Toplam Tutar {sortConfig.key === 'toplamTutar' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th style={{...styles.mainTh, textAlign: 'right'}}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedAndFilteredOrders().length > 0 ? getSortedAndFilteredOrders().map(order => (
                                <tr key={order._id} style={styles.mainTr}>
                                    <td style={styles.mainTd}>{order.siparisId}</td>
                                    <td style={styles.mainTd}>{order.firmaAdi}</td>
                                    <td style={styles.mainTd}>{order.toplamAdet}</td>
                                    <td style={styles.mainTd}>{new Date(order.siparisTarihi).toLocaleDateString('tr-TR')}</td>
                                    <td style={styles.mainTd}>{formatCurrency(order.toplamTutar)}</td>
                                    <td style={styles.actionsCell}>
                                        <button onClick={() => handleView(order._id)} title="Görüntüle" style={styles.actionBtn}><FileText size={16} /></button>
                                        <button onClick={() => handleEdit(order._id)} title="Düzenle" style={styles.actionBtn}><Pencil size={16} /></button>
                                        <button onClick={() => handleDelete(order._id)} title="Sil" style={styles.actionBtn}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={styles.noData}><Eye size={48} /><p>Gösterilecek sipariş bulunamadı.</p></td></tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr style={{backgroundColor: '#f0f4ff', fontWeight: '600', borderTop: '2px solid #e2e8f0'}}>
                                <td colSpan="2" style={styles.mainTd}>TOPLAM</td>
                                <td style={styles.mainTd}>{getSortedAndFilteredOrders().reduce((sum, order) => sum + (order.toplamAdet || 0), 0)}</td>
                                <td style={styles.mainTd}></td>
                                <td style={styles.mainTd}>{formatCurrency(getSortedAndFilteredOrders().reduce((sum, order) => sum + (order.toplamTutar || 0), 0))}</td>
                                <td style={styles.mainTd}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            {renderViewModal()}
            {renderDeleteModal()}
            {renderEditNewModal()}
            {renderExportModal()}
            {renderRenkAnaliziModal()}
        </div>
    );
};

const styles = {
    container: { padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' },
    toast: { position: 'fixed', top: '20px', right: '20px', backgroundColor: '#28a745', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2000, cursor: 'pointer' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' },
    h1: { fontSize: '28px', fontWeight: '700', margin: '0', color: '#1a202c' },
    subtitle: { fontSize: '14px', color: '#718096', margin: '4px 0 0 0' },
    toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    searchBox: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: '1', minWidth: 'auto' },
    filterBox: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: '200px' },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', flex: '1', marginLeft: '8px', width: '100%' },
    card: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
    tableContainerMain: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    mainTable: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    mainTh: { padding: '14px 16px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568', backgroundColor: '#f7fafc', whiteSpace: 'nowrap' },
    mainTr: { transition: 'background-color 0.2s' },
    mainTd: { padding: '14px 16px', borderBottom: '1px solid #e2e8f0' },
    actionsCell: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' },
    noData: { textAlign: 'center', padding: '48px 24px', color: '#718096' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#5D5FEF', color: 'white', whiteSpace: 'nowrap' },
    btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', backgroundColor: 'white', color: '#1a202c', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
    btnDanger: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#DC3545', color: 'white', whiteSpace: 'nowrap' },
    btnExportWithPrice: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#28a745', color: 'white', whiteSpace: 'nowrap' },
    btnExportWithoutPrice: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#FFA500', color: 'white', whiteSpace: 'nowrap' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' },
    modalContent: { backgroundColor: 'white', borderRadius: '12px', width: '95%', maxWidth: '1600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: 'auto' },
    modalContentView: { backgroundColor: 'white', borderRadius: '12px', width: '95%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: 'auto' },
    modalContentDelete: { backgroundColor: 'white', borderRadius: '12px', width: 'auto', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: 'auto' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7fafc', flexWrap: 'wrap', gap: '12px' },
    modalTitle: { fontSize: '20px', margin: 0, fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: '4px', borderRadius: '4px', display: 'flex', flexShrink: 0 },
    excelTips: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#e3f2fd', borderBottom: '1px solid #90caf9', fontSize: '13px', color: '#1565c0' },
    modalBody: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', WebkitOverflowScrolling: 'touch' },
    formHeader: { padding: '20px 24px', backgroundColor: '#f7fafc', borderBottom: '1px solid #e2e8f0' },
    formGroup: { marginBottom: 0 },
    label: { display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
    tableContainer: { flex: 1, overflow: 'auto', padding: '0', WebkitOverflowScrolling: 'touch' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '12px 10px', textAlign: 'left', backgroundColor: '#f7fafc', fontWeight: '600', color: '#2d3748', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10, whiteSpace: 'nowrap' },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0' },
    cellInput: { width: '100%', border: '1px solid transparent', padding: '8px', fontSize: '13px', borderRadius: '4px', backgroundColor: 'transparent', boxSizing: 'border-box', transition: 'background-color 0.2s' },
    removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#DC3545', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 },
    footerCell: { borderBottom: 'none', padding: '16px' },
    addRowBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' },
    totalCell: { textAlign: 'right', padding: '16px', borderBottom: 'none', fontSize: '16px', fontWeight: '600', color: '#5D5FEF' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f7fafc', flexWrap: 'wrap' },
    viewDetails: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', padding: '20px 24px' },
    detailCard: { backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' },
    detailCardTotal: { backgroundColor: '#5D5FEF', color: 'white', borderRadius: '8px', padding: '14px' },
    detailLabel: { display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', fontWeight: '500' },
    detailLabelWhite: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px', fontWeight: '500' },
    detailValue: { fontSize: '18px', fontWeight: '600' },
    searchContainer: { padding: '0 24px 16px 24px' },
    deleteConfirmation: { padding: '32px', textAlign: 'center' },
    deleteIcon: { marginBottom: '16px', display: 'flex', justifyContent: 'center' },
    exportIcon: { marginBottom: '16px', display: 'flex', justifyContent: 'center' },
    deleteTitle: { fontSize: '22px', margin: '0 0 8px 0', fontWeight: '600' },
    deleteText: { color: '#718096', margin: '0 0 24px 0', fontSize: '15px' },
    deleteActions: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
    exportActions: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#718096' },
    spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #5D5FEF', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }
};

export default OrderManagement;