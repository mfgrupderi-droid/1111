import React, { useState, useEffect } from 'react';
import { Pencil, FileText, Trash2, X, Plus, Minus, Check, AlertCircle, Search, Filter, Eye, Download, DollarSign, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
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
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_BASE_URL_ORDER);
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

    const handleView = async (orderId) => { try { const res = await axios.get(`${API_BASE_URL_ORDER}/${orderId}`); setViewModal(res.data); } catch (err) { toast.error('Sipariş detayı yüklenemedi.'); } };
    const handleEdit = async (orderId) => { try { const res = await axios.get(`${API_BASE_URL_ORDER}/${orderId}`); setEditModal(res.data); } catch (err) { toast.error('Sipariş detayı yüklenemedi.'); } };
    const handleDelete = (orderId) => setDeleteModal(orderId);

    const handleNewOrder = () => {
        setNewOrderModal({ firmaId: '', items: [{ model: '', renk: '', cins: '', bedenler: BEDENLER.reduce((acc, b) => ({ ...acc, [b]: 0 }), {}), birimFiyat: 0, satirToplami: 0, not: '' }] });
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

    const handleExportToExcel = async (includePrices) => {
        if (!viewModal) return;
        setExportModal(false);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sipariş Yönetim Sistemi';
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet('Sipariş Detayı', {
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
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

        viewModal.items.forEach((item, index) => {
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

        const totalRowNumber = startRow + viewModal.items.length + 1;
        const totalRow = worksheet.getRow(totalRowNumber);
        
        const totalBedenValues = {};
        BEDENLER.forEach(b => {
            const total = viewModal.items.reduce((sum, item) => sum + (item.bedenler[b] || 0), 0);
            totalBedenValues[b] = total > 0 ? total : '-';
        });
        
        const totalRowData = { 
            cins: 'TOPLAM', 
            ...totalBedenValues, 
            satirAdet: viewModal.toplamAdet
        };
        
        if (includePrices) {
            totalRowData.satirToplami = viewModal.toplamTutar;
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
                        <button onClick={() => { setEditModal(null); setNewOrderModal(null); }} style={styles.closeButton}><X size={24} /></button>
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
                                            <td style={styles.td}><input type="text" style={styles.cellInput} value={item.model} onChange={(e) => handleItemChange(modalType, idx, 'model', e.target.value)} /></td>
                                            <td style={styles.td}><input type="text" style={styles.cellInput} value={item.renk} onChange={(e) => handleItemChange(modalType, idx, 'renk', e.target.value)} /></td>
                                            <td style={styles.td}><input type="text" style={styles.cellInput} value={item.cins} onChange={(e) => handleItemChange(modalType, idx, 'cins', e.target.value)} /></td>
                                            {BEDENLER.map(b => (
                                                <td key={b} style={styles.td}><input type="number" min="0" style={{...styles.cellInput, width: '50px', textAlign: 'center'}} value={item.bedenler[b] || ''} onChange={(e) => handleItemChange(modalType, idx, `beden_${b}`, e.target.value)} /></td>
                                            ))}
                                            <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f8f9fa'}}>{calculateRowQuantity(item)}</td>
                                            <td style={styles.td}><input type="number" step="0.01" style={styles.cellInput} value={item.birimFiyat} onChange={(e) => handleItemChange(modalType, idx, 'birimFiyat', e.target.value)} /></td>
                                            <td style={{...styles.td, fontWeight: '600', backgroundColor: '#f8f9fa'}}>{formatCurrency(item.satirToplami)}</td>
                                            <td style={styles.td}><input type="text" style={styles.cellInput} value={item.not || ''} onChange={(e) => handleItemChange(modalType, idx, 'not', e.target.value)} /></td>
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
                        <button style={styles.btnSecondary} onClick={() => { setEditModal(null); setNewOrderModal(null); }}>İptal</button>
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

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContentView}>
                    <div style={styles.modalHeader}>
                        <h3 style={styles.modalTitle}>Sipariş Detayı</h3>
                        <button onClick={() => { setViewModal(null); setDetailSearchTerm(''); }} style={styles.closeButton}><X size={24} /></button>
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
                                        <th style={styles.th}>Model</th>
                                        <th style={styles.th}>Renk</th>
                                        <th style={styles.th}>Cins</th>
                                        {BEDENLER.map(b => <th key={b} style={{...styles.th, width: '50px'}}>{b.toUpperCase()}</th>)}
                                        <th style={styles.th}>Adet</th>
                                        <th style={styles.th}>Birim Fiyat</th>
                                        <th style={styles.th}>Toplam</th>
                                        <th style={styles.th}>Not</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={BEDENLER.length + 7} style={styles.noData}>
                                                <Eye size={32} />
                                                <p>Filtreye uygun ürün bulunamadı.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item, idx) => (
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
                            </table>
                        </div>
                    </div>
                    <div style={styles.modalFooter}>
                        <button style={styles.btnSecondary} onClick={() => { setViewModal(null); setDetailSearchTerm(''); }}>Kapat</button>
                        <button style={styles.btnPrimary} onClick={() => setExportModal(true)}><Download size={16} /> Excel'e Aktar</button>
                    </div>
                </div>
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
            <div style={styles.header}>
                <div>
                    <h1 style={styles.h1}>Sipariş Yönetimi</h1>
                    <p style={styles.subtitle}>Tüm siparişlerinizi buradan yönetebilirsiniz</p>
                </div>
                <button style={styles.btnPrimary} onClick={handleNewOrder}><Plus size={16} /> Yeni Sipariş Oluştur</button>
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
            </div>
            <div style={styles.card}>
                <div style={styles.tableContainerMain}>
                    <table style={styles.mainTable}>
                        <thead>
                            <tr>
                                <th style={styles.mainTh}>Sipariş ID</th>
                                <th style={styles.mainTh}>Firma</th>
                                <th style={styles.mainTh}>Toplam Adet</th>
                                <th style={styles.mainTh}>Sipariş Tarihi</th>
                                <th style={styles.mainTh}>Toplam Tutar</th>
                                <th style={{...styles.mainTh, textAlign: 'right'}}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order._id} style={styles.mainTr}>
                                    <td style={styles.mainTd}>{order.siparisId}</td>
                                    <td style={styles.mainTd}>{order.firmaAdi}</td>
                                    <td style={styles.mainTd}>{order.toplamAdet}</td>
                                    <td style={styles.mainTd}>{new Date(order.siparisTarihi).toLocaleDateString('tr-TR')}</td>
                                    <td style={styles.mainTd}>{formatCurrency(order.toplamTutar)} </td>
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
                    </table>
                </div>
            </div>
            {renderViewModal()}
            {renderDeleteModal()}
            {renderEditNewModal()}
            {renderExportModal()}
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
    searchBox: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: '280px', flex: '1' },
    filterBox: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: '200px' },
    searchInput: { border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', flex: '1', marginLeft: '8px', width: '100%' },
    card: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' },
    tableContainerMain: { overflowX: 'auto' },
    mainTable: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    mainTh: { padding: '14px 16px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600', color: '#4a5568', backgroundColor: '#f7fafc' },
    mainTr: { transition: 'background-color 0.2s' },
    mainTd: { padding: '14px 16px', borderBottom: '1px solid #e2e8f0' },
    actionsCell: { display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '14px 16px', borderBottom: '1px solid #e2e8f0' },
    actionBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' },
    noData: { textAlign: 'center', padding: '48px', color: '#718096' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#5D5FEF', color: 'white' },
    btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', backgroundColor: 'white', color: '#1a202c', border: '1px solid #e2e8f0' },
    btnDanger: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#DC3545', color: 'white' },
    btnExportWithPrice: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#28a745', color: 'white' },
    btnExportWithoutPrice: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', backgroundColor: '#FFA500', color: 'white' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modalContent: { backgroundColor: 'white', borderRadius: '12px', width: '95%', minWidth: '1600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalContentView: { backgroundColor: 'white', borderRadius: '12px', width: '95%', minWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalContentDelete: { backgroundColor: 'white', borderRadius: '12px', width: 'auto', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalHeader: { padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7fafc' },
    modalTitle: { fontSize: '20px', margin: 0, fontWeight: '600' },
    closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#718096', padding: '4px', borderRadius: '4px', display: 'flex' },
    modalBody: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' },
    formHeader: { padding: '20px 24px', backgroundColor: '#f7fafc', borderBottom: '1px solid #e2e8f0' },
    formGroup: { marginBottom: 0 },
    label: { display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' },
    tableContainer: { flex: 1, overflow: 'auto', padding: '0' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '12px 10px', textAlign: 'left', backgroundColor: '#f7fafc', fontWeight: '600', color: '#2d3748', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 },
    td: { padding: '10px', borderBottom: '1px solid #e2e8f0' },
    cellInput: { width: '100%', border: '1px solid transparent', padding: '8px', fontSize: '13px', borderRadius: '4px', backgroundColor: 'transparent' },
    removeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#DC3545', padding: '6px', borderRadius: '4px' },
    footerCell: { borderBottom: 'none', padding: '16px' },
    addRowBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px' },
    totalCell: { textAlign: 'right', padding: '16px', borderBottom: 'none', fontSize: '16px', fontWeight: '600', color: '#5D5FEF' },
    modalFooter: { padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f7fafc' },
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
    deleteActions: { display: 'flex', gap: '12px', justifyContent: 'center' },
    exportActions: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' },
    loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#718096' },
    spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #5D5FEF', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }
};

export default OrderManagement;