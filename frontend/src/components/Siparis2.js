// Siparis.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  FileText,
  XCircle,
  CheckSquare,
  Square,
  ChevronDown,
  PencilLine,
  PlusCircle,
  Trash2,
  List,
  Eye,
  Plus,
  Printer,
  Download,
  Check,
  X,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Siparisler.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Email gönderimi için API fonksiyonu
const sendEmailNotification = async (siparisId) => {
  try {
    const response = await axios.post(`http://31.57.33.249:3001/api/siparis/${siparisId}/send-notification`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Email Confirmation Modal Komponenti
const EmailConfirmationModal = ({ isOpen, onClose, onConfirm, siparisData, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="siparis-modal mail-confirmation-modal">
      <div className="siparis-modal-content">
        <div className="mail-confirmation-content">
          <div className="mail-icon">
            <Mail />
          </div>
          <h3>Email Bildirimi Gönder</h3>
          <p>
            <strong>{siparisData?.verenFirmaAdi}</strong> firmasına{' '}
            <strong>#{siparisData?._id?.substring(0, 8)}</strong> numaralı sipariş için email bildirimi göndermek istiyor musunuz?
          </p>
          {siparisData?.sirketEmailler && siparisData.sirketEmailler.length > 0 && (
            <div className="email-list">
              <p><strong>Gönderilecek Email Adresleri:</strong></p>
              <ul>
                {siparisData.sirketEmailler.map((emailObj, index) => (
                  <li key={index}>{emailObj.email}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="siparis-modal-actions">
          <button
            className="siparis-btn siparis-btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            <X size={16} />
            İptal
          </button>
          <button
            className="siparis-btn siparis-btn-success"
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

function Siparisler() {
  const API_BASE_URL_SIPARIS = 'http://31.57.33.249:3001/api/siparis';
  const API_BASE_URL_SIRKET = 'http://31.57.33.249:3001/api/sirketler';
  const BEDENLER = [
    '3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL',
    '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', 'Özel'
  ];

  const [viewMode, setViewMode] = useState('list');
  const [siparisler, setSiparisler] = useState([]);
  const [sirketler, setSirketler] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Çoklu seçim için
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [selectedFilter, setSelectedFilter] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    firma: [],
    model: [],
    cins: [],
    renk: []
  });
  const [searchField, setSearchField] = useState('hepsi');
  const [searchFieldDropdownOpen, setSearchFieldDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Email modal states
  const [emailConfirmationModal, setEmailConfirmationModal] = useState({
    isOpen: false,
    siparisData: null
  });
  const [isEmailSending, setIsEmailSending] = useState(false);

  const toASCII = (text) => {
    if (!text) return text;
    const charMap = {
      'ç': 'c', 'Ç': 'C',
      'ğ': 'g', 'Ğ': 'G',
      'ı': 'i', 'İ': 'I',
      'ö': 'o', 'Ö': 'O',
      'ş': 's', 'Ş': 'S',
      'ü': 'u', 'Ü': 'U'
    };

    return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, (match) => charMap[match] || match);
  };

  const [siparisDetaylari, setSiparisDetaylari] = useState([
    {
      model: '',
      cins: '',
      renk: '',
      bedenler: BEDENLER.map((b) => ({ beden: b, adet: '' })),
      fiyat: 0,
      not: ''
    }
  ]);
  const [toplamTutar, setToplamTutar] = useState(0);
  const [selectedVerenFirma, setSelectedVerenFirma] = useState('');

  // ---- DATA FETCH ----
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sirketRes, sipRes] = await Promise.all([
        axios.get(API_BASE_URL_SIRKET),
        axios.get(API_BASE_URL_SIPARIS)
      ]);

      const sirketData = sirketRes.data || [];
      const sipData = sipRes.data || [];

      const sirketMap = {};
      sirketData.forEach(s => { sirketMap[s._id] = `${s.sirketAdi} (${s.sirketKodu})`; });

      const formattedSiparisler = sipData.map(siparis => ({
        ...siparis,
        verenFirmaAdi: siparis.verenFirma?.sirketAdi || sirketMap[siparis.verenFirma] || 'Bilinmeyen Şirket',
        verenFirma: siparis.verenFirma?._id || siparis.verenFirma,
        urunler: siparis.siparisDetaylari || [],
        // Email durumu için sirket email'lerini de ekle
        sirketEmailler: siparis.verenFirma?.emailler || []
      }));

      setSirketler(sirketData);
      setSiparisler(formattedSiparisler);

      if (sirketData.length > 0) setSelectedVerenFirma(sirketData[0]._id);
      setSelectedOrders([]);
    } catch (e) {
      console.error('Veri çekme hatası:', e);
      toast.error('Veri çekilirken bir hata oluştu: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL_SIPARIS, API_BASE_URL_SIRKET]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- SEARCH DEBOUNCE ----
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 500);
    return () => { clearTimeout(handler); };
  }, [searchTerm]);

  // ---- TOPLAM TUTAR (Form) ----
  useEffect(() => {
    const total = siparisDetaylari.reduce((acc, row) => {
      const adetToplam = (row.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      const line = adetToplam * (parseFloat(row.fiyat) || 0);
      return acc + line;
    }, 0);
    setToplamTutar(total);
  }, [siparisDetaylari]);

  // ---- EMAIL FUNCTIONS ----
  const handleEmailConfirmation = (siparisData) => {
    setEmailConfirmationModal({
      isOpen: true,
      siparisData
    });
  };

  const handleSendEmail = async (siparisId) => {
    setIsEmailSending(true);
    try {
      const result = await sendEmailNotification(siparisId);
      toast.success(`Email başarıyla gönderildi! (${result.sentTo.length} alıcı)`);

      // Sipariş listesini güncelle (email gönderildi olarak işaretle)
      setSiparisler(prev =>
        prev.map(s =>
          s._id === siparisId
            ? { ...s, emailGonderildi: true, emailGonderimTarihi: new Date() }
            : s
        )
      );

      setEmailConfirmationModal({ isOpen: false, siparisData: null });
    } catch (error) {
      console.error('Email gönderme hatası:', error);
      toast.error(error.msg || 'Email gönderilirken bir hata oluştu.');
    } finally {
      setIsEmailSending(false);
    }
  };

  // ---- HELPERS ----
  const formatCurrency = (amount) => {
    if (isNaN(amount) || amount === null) return '0,00';
    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatBedenler = (urunler) => {
    if (!urunler || urunler.length === 0) return 'Belirtilmemiş';
    return urunler.map(urun => {
      const bedenAdetler = (urun.bedenler || []).filter(b => (parseInt(b.adet) || 0) > 0);
      if (bedenAdetler.length === 0) return '';
      const formattedBedenler = bedenAdetler.map(b => `${b.beden}: ${b.adet}`).join(', ');
      return formattedBedenler; 
    }).filter(Boolean).join(' | ');
  };

  const calculateTotalOrderAmount = (urunler) => {
    if (!Array.isArray(urunler)) return 0;
    return urunler.reduce((total, urun) => {
      const urunToplamAdet = (urun.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      return total + (urunToplamAdet * (parseFloat(urun.fiyat) || 0));
    }, 0);
  };

  const calculateTotalAdet = (urunler) => {
    if (!urunler || urunler.length === 0) return 0;
    return urunler.reduce((total, urun) => {
      const adet = (urun.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      return total + adet;
    }, 0);
  };

  // ---- FILTERED LIST ---- //
  const filteredSiparisler = useMemo(() => {
    return siparisler.filter(siparis => {
      const firmaMatches = activeFilters.firma.length === 0 || activeFilters.firma.includes(siparis.verenFirmaAdi);
      const modelMatches = activeFilters.model.length === 0 || siparis.urunler?.some(u => activeFilters.model.includes(u.model));
      const cinsMatches = activeFilters.cins.length === 0 || siparis.urunler?.some(u => activeFilters.cins.includes(u.cins));
      const renkMatches = activeFilters.renk.length === 0 || siparis.urunler?.some(u => activeFilters.renk.includes(u.renk));

      const q = debouncedSearchTerm.toLowerCase();
      const searchMatches = q === '' ||
        (searchField === 'hepsi' && (
          siparis.verenFirmaAdi?.toLowerCase().includes(q) ||
          siparis.urunler?.some(d =>
            (d.model && d.model.toLowerCase().includes(q)) ||
            (d.cins && d.cins.toLowerCase().includes(q)) ||
            (d.renk && d.renk.toLowerCase().includes(q)) ||
            (d.not && d.not.toLowerCase().includes(q))
          )
        )) ||
        (searchField === 'firma' && siparis.verenFirmaAdi?.toLowerCase().includes(q)) ||
        (searchField === 'model' && siparis.urunler?.some(d => d.model?.toLowerCase().includes(q))) ||
        (searchField === 'cins' && siparis.urunler?.some(d => d.cins?.toLowerCase().includes(q))) ||
        (searchField === 'renk' && siparis.urunler?.some(d => d.renk?.toLowerCase().includes(q)));

      return firmaMatches && modelMatches && cinsMatches && renkMatches && searchMatches;
    });
  }, [siparisler, activeFilters, searchField, debouncedSearchTerm]);

  const getUniqueValues = useCallback((field) => {
    const values = new Set();
    siparisler.forEach(s => {
      if (field === 'firma') {
        if (s.verenFirmaAdi) values.add(s.verenFirmaAdi);
      } else {
        s.urunler?.forEach(u => {
          if (u[field]) values.add(u[field]);
        });
      }
    });
    return Array.from(values).filter(Boolean).sort();
  }, [siparisler]);

  const resetForm = () => {
    setSiparisDetaylari([
      {
        model: '',
        cins: '',
        renk: '',
        bedenler: BEDENLER.map((b) => ({ beden: b, adet: '' })),
        fiyat: 0,
        not: ''
      }
    ]);
    setSelectedVerenFirma(sirketler.length > 0 ? sirketler[0]._id : '');
    setSelectedOrder(null);
  };

  // ---- ROW/FORM HANDLERS ----
  const handleEdit = (order) => {
    setSelectedOrder(order);
    const detaylar = (order.urunler || []).map(urun => ({
      model: urun.model,
      cins: urun.cins,
      renk: urun.renk,
      bedenler: BEDENLER.map(b => {
        const foundBeden = (urun.bedenler || []).find(ub => ub.beden === b);
        return { beden: b, adet: foundBeden ? foundBeden.adet : '' };
      }),
      fiyat: urun.fiyat,
      not: urun.not,
    }));
    setSiparisDetaylari(detaylar);
    setSelectedVerenFirma(order.verenFirma);
    setViewMode('create');
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
      try {
        await axios.delete(`${API_BASE_URL_SIPARIS}/${orderId}`);
        toast.success('Sipariş başarıyla silindi!');
        fetchData();
      } catch (err) {
        console.error('Sipariş silinirken hata:', err);
        toast.error('Sipariş silinirken bir hata oluştu.');
      }
    }
  };

  const handleOpenViewModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    document.body.style.overflow = 'unset';
  };

  const handleAddRow = () => {
    setSiparisDetaylari([
      ...siparisDetaylari,
      {
        model: '',
        cins: '',
        renk: '',
        bedenler: BEDENLER.map((b) => ({ beden: b, adet: '' })),
        fiyat: 0,
        not: ''
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (siparisDetaylari.length > 1) {
      const newRows = [...siparisDetaylari];
      newRows.splice(index, 1);
      setSiparisDetaylari(newRows);
    }
  };

  const handleCellChange = (e, rowIndex, fieldName, bedenIndex = null) => {
    const { value } = e.target;
    const newRows = [...siparisDetaylari];
    if (bedenIndex !== null) {
      newRows[rowIndex].bedenler[bedenIndex].adet = value;
    } else {
      newRows[rowIndex][fieldName] = value;
    }
    setSiparisDetaylari(newRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        verenFirma: selectedVerenFirma,
        siparisDetaylari: siparisDetaylari.map(item => ({
          model: item.model,
          cins: item.cins,
          renk: item.renk,
          bedenler: item.bedenler.filter(b => (parseInt(b.adet) || 0) > 0),
          fiyat: item.fiyat,
          not: item.not
        }))
      };

      let savedData;
      if (selectedOrder && selectedOrder._id) {
        await axios.put(`${API_BASE_URL_SIPARIS}/${selectedOrder._id}`, payload);
        toast.success('Sipariş başarıyla güncellendi!');
        savedData = { ...selectedOrder, ...payload };
      } else {
        const response = await axios.post(API_BASE_URL_SIPARIS, payload);
        savedData = response.data.siparis;
        toast.success('Sipariş başarıyla eklendi!');

        // Yeni sipariş için email gönderimi sorulsun
        const verenFirma = sirketler.find(s => s._id === selectedVerenFirma);
        const siparisWithEmailData = {
          ...savedData,
          verenFirmaAdi: verenFirma?.sirketAdi,
          sirketEmailler: verenFirma?.emailler || []
        };
        handleEmailConfirmation(siparisWithEmailData);
      }

      setViewMode('list');
      fetchData();
      resetForm();
    } catch (err) {
      console.error("Sipariş kaydederken/güncellerken hata:", err);
      toast.error('İşlem sırasında bir hata oluştu: ' + (err.response?.data?.msg || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelUpdate = () => {
    resetForm();
    setViewMode('list');
    toast.info('Düzenleme işlemi iptal edildi.');
  };

  // ---- İYİLEŞTİRİLMİŞ PDF EXPORT ----
  const generatePDF = (order) => {
    if (!order) return;

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'landscape' // Yatay sayfa
    });

    // Renkler ve stil tanımları
    const colors = {
      primary: [93, 95, 239],
      secondary: [108, 117, 125],
      success: [40, 167, 69],
      background: [248, 249, 250],
      text: [33, 37, 41]
    };

    // Sayfa boyutları (landscape A4)
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 40;

    // Header bölümü
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SİPARİŞ DETAYI', margin, 35);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - 120, 35);

    // Firma bilgileri
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(toASCII('BOZKURTSAN DERI SAN. VE TIC. LTD. STI.'), margin, 110);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('BOLEMOD-BUGATTI', margin, 125);
    doc.text(toASCII('12345 SOKAK NO: 31. | 21 K.2 D.2 KONAK/IZMIR'), margin, 140);
    doc.text('GSM: +90 (533) 611 9596 | +90 (532) 064 7004', margin, 155);
    doc.text('MAIL: bozkurtsan@hotmail.com', margin, 170);

    // Sipariş bilgileri (sağ taraf)
    const rightColumnX = pageWidth - 300;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(toASCII('SIPARIS BILGILERI'), rightColumnX, 110);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Veren Firma: ${order.verenFirmaAdi}`, rightColumnX, 125);
    doc.text(`Sipariş No: ${order._id.substring(0, 8)}`, rightColumnX, 140);
    doc.text(`Tarih: ${new Date(order.olusturmaTarihi).toLocaleDateString('tr-TR')}`, rightColumnX, 155);

    // Tablo başlıkları
    const tableStartY = 200;
    const headers = ['Model', 'Renk', 'Cins', ...BEDENLER.slice(0, 10), 'Toplam', 'Fiyat', 'Tutar'];

    const tableData = (order.urunler || []).map(item => {
      const bedenler = BEDENLER.slice(0, 10).map(beden => {
        const found = (item.bedenler || []).find(b => b.beden === beden);
        const adet = parseInt(found?.adet) || 0;
        return adet > 0 ? adet.toString() : '-';
      });
      const adetToplam = (item.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      const satirTutar = (parseFloat(item.fiyat) || 0) * adetToplam;

      return [
        toASCII(item.model || '-'),
        toASCII(item.renk || '-'),
        toASCII(item.cins || '-'),
        ...bedenler,
        adetToplam.toString(),
        `${formatCurrency(parseFloat(item.fiyat) || 0)} TL`,
        `${formatCurrency(satirTutar)} TL`
      ];
    });

    doc.autoTable({
      startY: tableStartY,
      head: [headers],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 4,
        textColor: colors.text,
        lineColor: colors.secondary,
        lineWidth: 0.5,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        font: 'helvetica'
      },
      alternateRowStyles: {
        fillColor: colors.background
      },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        [headers.length - 3]: { cellWidth: 50, halign: 'center' },
        [headers.length - 2]: { cellWidth: 60, halign: 'right' },
        [headers.length - 1]: { cellWidth: 80, halign: 'right' }
      }
    });

    // Toplam bölümü
    const finalY = doc.lastAutoTable.finalY + 20;
    const total = calculateTotalOrderAmount(order.urunler);

    doc.setFillColor(...colors.success);
    doc.rect(pageWidth - 250, finalY, 200, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`GENEL TOPLAM: ${formatCurrency(total)} ₺`, pageWidth - 240, finalY + 20);

    // Footer
    doc.setTextColor(...colors.secondary);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Bu belge sistem tarafından otomatik olarak oluşturulmuştur.', margin, pageHeight - 20);
    doc.text(`Sayfa 1/1 - Oluşturma: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`, pageWidth - 200, pageHeight - 20);

    // Kaydet
    const tarih = new Date(order.olusturmaTarihi).toLocaleDateString('tr-TR').replace(/\./g, '-');
    doc.save(`SİPARİŞ_${order.verenFirmaAdi.replace(/[^a-zA-Z0-9]/g, '_')}_${tarih}.pdf`);
  };

  // ---- İYİLEŞTİRİLMİŞ EXCEL EXPORT ----
  const exportOrderExcel = async (order, BEDENLER) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Sipariş Detay', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 20 }
    });

    // Sayfa ayarları
    ws.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 }
    };

    // Firma bilgileri (A1-D5)
    ws.mergeCells('A1:D1');
    const firmaCell = ws.getCell('A1');
    firmaCell.value = 'BOZKURTSAN DERİ SAN. VE TİC. LTD. ŞTİ.';
    firmaCell.font = { bold: true, size: 14, color: { argb: '000000' } };
    firmaCell.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.getCell('A2').value = 'BOLEMOD-BUGATTI';
    ws.getCell('A2').font = { bold: true, size: 11 };

    ws.getCell('A3').value = '12345 SOKAK NO: 31. | 21 K.2 D.2 KONAK/İZMİR';
    ws.getCell('A4').value = 'GSM: +90 (533) 611 9596 | +90 (532) 064 7004';
    ws.getCell('A5').value = 'MAIL: bozkurtsan@hotmail.com';

    // Sipariş bilgileri (sağ taraf)
    const siparisCol = BEDENLER.length + 8; // Dinamik kolon
    ws.mergeCells(1, siparisCol, 1, siparisCol + 3);
    const siparisCell = ws.getCell(1, siparisCol);
    siparisCell.value = `SİPARİŞ VEREN FİRMA: ${order.verenFirmaAdi || ''}`;
    siparisCell.font = { bold: true, size: 12 };
    siparisCell.alignment = { horizontal: 'center' };

    ws.getCell(3, siparisCol).value = 'TARİH:';
    ws.getCell(3, siparisCol).font = { bold: true };
    ws.getCell(3, siparisCol + 1).value = new Date(order.olusturmaTarihi).toLocaleDateString('tr-TR');

    ws.getCell(4, siparisCol).value = 'SİPARİŞ NO:';
    ws.getCell(4, siparisCol).font = { bold: true };
    ws.getCell(4, siparisCol + 1).value = order._id.substring(0, 12);

    // Boş satırlar
    ws.addRow([]);
    ws.addRow([]);

    // Tablo başlıkları
    const headerRow = 8;
    const headers = ['Model', 'Renk', 'Cins', ...BEDENLER, 'Toplam Adet', 'Birim Fiyat', 'Toplam Tutar', 'Notlar'];

    headers.forEach((header, index) => {
      const cell = ws.getCell(headerRow, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D5FEF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Ürün satırları
    let currentRow = headerRow + 1;
    let grandTotal = 0;

    (order.urunler || []).forEach((item, itemIndex) => {
      const bedenAdetleri = BEDENLER.map(b => {
        const found = (item.bedenler || []).find(bb => bb.beden === b);
        return found && parseInt(found.adet) > 0 ? parseInt(found.adet) : '';
      });

      const toplamAdet = bedenAdetleri.reduce((sum, adet) => sum + (parseInt(adet) || 0), 0);
      const tutar = (item.fiyat || 0) * toplamAdet;
      grandTotal += tutar;

      const rowData = [
        item.model || '',
        item.renk || '',
        item.cins || '',
        ...bedenAdetleri,
        toplamAdet,
        item.fiyat || 0,
        tutar,
        item.not || ''
      ];

      rowData.forEach((value, colIndex) => {
        const cell = ws.getCell(currentRow, colIndex + 1);
        cell.value = value;

        // Model hücresi sarı
        if (colIndex === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE699' } };
        }

        // Satır satır farklı renk
        if (itemIndex % 2 === 1) {
          if (colIndex !== 0) { // Model hücresini etkileme
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
          }
        }

        // Sayısal değerler için format
        if (colIndex >= 3 && colIndex <= 3 + BEDENLER.length - 1) {
          // Beden sütunları - ortalanmış
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIndex === headers.length - 4) {
          // Toplam adet
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { bold: true };
        } else if (colIndex === headers.length - 3) {
          // Birim fiyat
          cell.numFmt = '#,##0.00 ₺';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colIndex === headers.length - 2) {
          // Toplam tutar
          cell.numFmt = '#,##0.00 ₺';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { bold: true };
        } else {
          // Diğer hücreler
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Kenarlık
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      currentRow++;
    });

    // Toplam satırı
    const totalRow = currentRow + 1;
    const mergeStart = 1;
    const mergeEnd = headers.length - 2; // Toplam tutar sütunundan önceki

    ws.mergeCells(totalRow, mergeStart, totalRow, mergeEnd);
    const totalLabelCell = ws.getCell(totalRow, mergeStart);
    totalLabelCell.value = 'GENEL TOPLAM';
    totalLabelCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '28A745' } };
    totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalLabelCell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' }
    };

    const totalValueCell = ws.getCell(totalRow, headers.length - 1);
    totalValueCell.value = grandTotal;
    totalValueCell.numFmt = '#,##0.00 ₺';
    totalValueCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '28A745' } };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValueCell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'double' }
    };

    // Sütun genişlikleri
    ws.columns = [
      { width: 15 }, // Model
      { width: 12 }, // Renk
      { width: 12 }, // Cins
      ...BEDENLER.map(() => ({ width: 6 })), // Bedenler
      { width: 10 }, // Toplam Adet
      { width: 12 }, // Birim Fiyat
      { width: 15 }, // Toplam Tutar
      { width: 20 }  // Notlar
    ];

    // Sayfa başlığını ayarla
    ws.headerFooter.oddHeader = '&C&14&BSipariş Detay Raporu';
    ws.headerFooter.oddFooter = '&L&D &T &R&P / &N';

    // Kaydet
    const tarih = new Date(order.olusturmaTarihi).toLocaleDateString('tr-TR').replace(/\./g, '-');
    const fileName = `SİPARİŞ_${order.verenFirmaAdi.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${tarih}.xlsx`;

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), fileName);
  };

  // ---- BULK SELECT / DELETE ----
  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredSiparisler.map(o => o._id);
    const allSelected = visibleIds.every(id => selectedOrders.includes(id));
    if (allSelected) {
      setSelectedOrders(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const union = new Set([...selectedOrders, ...visibleIds]);
      setSelectedOrders(Array.from(union));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) {
      toast.warning('Lütfen silmek istediğiniz siparişleri seçin');
      return;
    }
    if (!window.confirm(`${selectedOrders.length} siparişi silmek istediğinize emin misiniz?`)) return;

    try {
      await Promise.all(selectedOrders.map(orderId => axios.delete(`${API_BASE_URL_SIPARIS}/${orderId}`)));
      toast.success(`${selectedOrders.length} sipariş başarıyla silindi!`);
      setSelectedOrders([]);
      fetchData();
    } catch (err) {
      console.error('Sipariş silinirken hata:', err);
      toast.error('Siparişler silinirken bir hata oluştu.');
    }
  };

  // ---- RENDER ----
  if (isLoading) {
    return (
      <div className="siparis-container loading-state">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="siparis-container">
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
      />

      <div className="siparis-header">
        <h1 className="siparis-title">Sipariş Yönetimi</h1>
        <div className="mode-buttons">
          <button
            className={`btn-mode ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => { setViewMode('list'); resetForm(); }}
          >
            <List size={18} /> Sipariş Listesi
          </button>
          <button
            className={`btn-mode ${viewMode === 'create' ? 'active' : ''}`}
            onClick={() => { setViewMode('create'); resetForm(); }}
          >
            <Plus size={18} /> Yeni Sipariş
          </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <>
          <div className="siparis-controls">
            <div className="siparis-search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Arama yap..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="search-field-dropdown-wrapper">
                <button
                  type="button"
                  className="search-field-button"
                  onClick={() => setSearchFieldDropdownOpen(!searchFieldDropdownOpen)}
                >
                  {searchField.charAt(0).toUpperCase() + searchField.slice(1)} <ChevronDown size={16} />
                </button>
                {searchFieldDropdownOpen && (
                  <ul className="search-field-dropdown">
                    <li onClick={() => { setSearchField('hepsi'); setSearchFieldDropdownOpen(false); }}>Hepsi</li>
                    <li onClick={() => { setSearchField('firma'); setSearchFieldDropdownOpen(false); }}>Firma</li>
                    <li onClick={() => { setSearchField('model'); setSearchFieldDropdownOpen(false); }}>Model</li>
                    <li onClick={() => { setSearchField('cins'); setSearchFieldDropdownOpen(false); }}>Cins</li>
                    <li onClick={() => { setSearchField('renk'); setSearchFieldDropdownOpen(false); }}>Renk</li>
                  </ul>
                )}
              </div>
            </div>

            {/* İyileştirilmiş Çoklu Seçim Kontrolü */}
            {selectedOrders.length > 0 && (
              <div className="bulk-actions-container">
                <div className="bulk-selection-info">
                  <CheckSquare size={16} className="bulk-icon" />
                  <span>{selectedOrders.length} sipariş seçildi</span>
                </div>
                <button onClick={handleBulkDelete} className="btn-bulk-delete">
                  <Trash2 size={16} />
                  Seçilenleri Sil
                </button>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="btn-bulk-clear"
                  title="Seçimi temizle"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="siparis-card">
            <div className="table-wrapper">
              <table className="siparis-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>
                      <div className="select-all-container">
                        <button
                          type="button"
                          className="select-all-btn"
                          onClick={toggleSelectAllVisible}
                          title="Görünür hepsini seç/bırak"
                        >
                          {filteredSiparisler.length > 0 &&
                            filteredSiparisler.every(o => selectedOrders.includes(o._id))
                            ? <CheckSquare size={18} className="select-icon active" />
                            : <Square size={18} className="select-icon" />
                          }
                        </button>
                      </div>
                    </th>

                    <th>
                      <div className="header-with-filter" onClick={() => setSelectedFilter(selectedFilter === 'firma' ? null : 'firma')}>
                        Veren Firma
                        <ChevronDown size={14} className="filter-icon" style={{ transform: selectedFilter === 'firma' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        {selectedFilter === 'firma' && (
                          <div className="filter-dropdown">
                            <ul className="filter-options-list">
                              {getUniqueValues('firma').map(firma => (
                                <li key={firma} onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFilters(p => ({
                                    ...p,
                                    firma: p.firma.includes(firma) ? p.firma.filter(f => f !== firma) : [...p.firma, firma]
                                  }));
                                }}>
                                  <div className="checkbox-container">
                                    {activeFilters.firma.includes(firma)
                                      ? <CheckSquare size={16} className="checkbox-icon active" />
                                      : <Square size={16} className="checkbox-icon" />
                                    }
                                    {firma}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </th>
                    <th>
                      <div className="header-with-filter" onClick={() => setSelectedFilter(selectedFilter === 'model' ? null : 'model')}>
                        Model
                        <ChevronDown size={14} className="filter-icon" style={{ transform: selectedFilter === 'model' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        {selectedFilter === 'model' && (
                          <div className="filter-dropdown">
                            <ul className="filter-options-list">
                              {getUniqueValues('model').map(model => (
                                <li key={model} onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFilters(p => ({
                                    ...p,
                                    model: p.model.includes(model) ? p.model.filter(f => f !== model) : [...p.model, model]
                                  }));
                                }}>
                                  <div className="checkbox-container">
                                    {activeFilters.model.includes(model)
                                      ? <CheckSquare size={16} className="checkbox-icon active" />
                                      : <Square size={16} className="checkbox-icon" />
                                    }
                                    {model}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </th>
                    <th>
                      <div className="header-with-filter" onClick={() => setSelectedFilter(selectedFilter === 'cins' ? null : 'cins')}>
                        Cins
                        <ChevronDown size={14} className="filter-icon" style={{ transform: selectedFilter === 'cins' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        {selectedFilter === 'cins' && (
                          <div className="filter-dropdown">
                            <ul className="filter-options-list">
                              {getUniqueValues('cins').map(cins => (
                                <li key={cins} onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFilters(p => ({
                                    ...p,
                                    cins: p.cins.includes(cins) ? p.cins.filter(f => f !== cins) : [...p.cins, cins]
                                  }));
                                }}>
                                  <div className="checkbox-container">
                                    {activeFilters.cins.includes(cins)
                                      ? <CheckSquare size={16} className="checkbox-icon active" />
                                      : <Square size={16} className="checkbox-icon" />
                                    }
                                    {cins}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </th>
                    <th>
                      <div className="header-with-filter" onClick={() => setSelectedFilter(selectedFilter === 'renk' ? null : 'renk')}>
                        Renk
                        <ChevronDown size={14} className="filter-icon" style={{ transform: selectedFilter === 'renk' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                        {selectedFilter === 'renk' && (
                          <div className="filter-dropdown">
                            <ul className="filter-options-list">
                              {getUniqueValues('renk').map(renk => (
                                <li key={renk} onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFilters(p => ({
                                    ...p,
                                    renk: p.renk.includes(renk) ? p.renk.filter(f => f !== renk) : [...p.renk, renk]
                                  }));
                                }}>
                                  <div className="checkbox-container">
                                    {activeFilters.renk.includes(renk)
                                      ? <CheckSquare size={16} className="checkbox-icon active" />
                                      : <Square size={16} className="checkbox-icon" />
                                    }
                                    {renk}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </th>
                    <th>Toplam Adet</th>
                    <th>Sipariş Tarihi</th>
                    <th>Toplam Tutar</th>
                    <th>Email Durumu</th>
                    <th className="action-column">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSiparisler.length > 0 ? (
                    filteredSiparisler.map(order => {
                      const isChecked = selectedOrders.includes(order._id);
                      return (
                        <tr key={order._id}>
                          <td style={{ textAlign: 'center' }}>
                            <div className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleOrderSelection(order._id)}
                                className="order-checkbox"
                              />
                            </div>
                          </td>

                          <td>{order.verenFirmaAdi}</td>
                          <td>{order.urunler?.map(u => u.model).join(', ')}</td>
                          <td>{order.urunler?.map(u => u.cins).join(', ')}</td>
                          <td>{order.urunler?.map(u => u.renk).join(', ')}</td>

                          <td>{calculateTotalAdet(order.urunler)}</td>
                          <td>{new Date(order.olusturmaTarihi).toLocaleDateString()}</td>
                          <td>{formatCurrency(calculateTotalOrderAmount(order.urunler))} TL</td>
                          <td>
                            {order.emailGonderildi ? (
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
                          <td className="action-column">
                            <div className="action-buttons">
                              <button onClick={() => handleOpenViewModal(order)} className="btn-action btn-view" title="Detayları Görüntüle">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => handleEdit(order)} className="btn-action btn-edit" title="Siparişi Düzenle">
                                <PencilLine size={16} />
                              </button>
                              <button onClick={() => generatePDF(order)} className="btn-action btn-pdf" title="PDF İndir">
                                <FileText size={16} />
                              </button>
                              {!order.emailGonderildi && (
                                <button
                                  onClick={() => handleEmailConfirmation({ ...order, sirketEmailler: order.sirketEmailler || [] })}
                                  className="btn-action btn-mail"
                                  title="Email Gönder"
                                >
                                  <Mail size={16} />
                                </button>
                              )}
                              <button onClick={() => handleDelete(order._id)} className="btn-action btn-delete" title="Siparişi Sil">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="no-data">Sipariş kaydı bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'create' && (
        <div className="siparis-card form-card">
          <form onSubmit={handleSubmit}>
            <h3 className="form-title">{selectedOrder ? 'Siparişi Düzenle' : 'Yeni Sipariş Ekle'}</h3>

            {/* Kompakt Firma Seçimi */}
            <div className="form-header-section">
              <div className="form-group-inline">
                <label htmlFor="firma-secim">Veren Firma</label>
                <select
                  id="firma-secim"
                  className="form-control-compact"
                  value={selectedVerenFirma}
                  onChange={(e) => setSelectedVerenFirma(e.target.value)}
                >
                  {sirketler.map(sirket => (
                    <option key={sirket._id} value={sirket._id}>
                      {sirket.sirketAdi}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kompakt Ürün Detayları Tablosu */}
            <div className="form-section-details">
              <div className="section-header">
                <h4 className="section-title">Ürün Detayları</h4>
                <button type="button" onClick={handleAddRow} className="btn-add-row-compact">
                  <PlusCircle size={16} /> Satır Ekle
                </button>
              </div>

              <div className="compact-table-wrapper">
                <table className="compact-form-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Cins</th>
                      <th>Renk</th>
                      {BEDENLER.map((beden, index) => (
                        <th key={index} className="beden-header">{beden}</th>
                      ))}
                      <th>Fiyat</th>
                      <th>Not</th>
                      <th className="action-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {siparisDetaylari.map((row, rowIndex) => (
                      <tr key={rowIndex} className="compact-row">
                        <td>
                          <input
                            type="text"
                            placeholder="Model"
                            className="compact-input"
                            value={row.model}
                            onChange={(e) => handleCellChange(e, rowIndex, 'model')}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Cins"
                            className="compact-input"
                            value={row.cins}
                            onChange={(e) => handleCellChange(e, rowIndex, 'cins')}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Renk"
                            className="compact-input"
                            value={row.renk}
                            onChange={(e) => handleCellChange(e, rowIndex, 'renk')}
                          />
                        </td>
                        {BEDENLER.map((beden, bedenIndex) => (
                          <td key={bedenIndex} className="beden-cell">
                            <input
                              type="number"
                              className="beden-input"
                              value={row.bedenler.find(b => b.beden === beden)?.adet || ''}
                              onChange={(e) => handleCellChange(e, rowIndex, 'adet', bedenIndex)}
                              min="0"
                            />
                          </td>
                        ))}
                        <td>
                          <input
                            type="number"
                            placeholder="0"
                            className="compact-input price-input"
                            value={row.fiyat}
                            onChange={(e) => handleCellChange(e, rowIndex, 'fiyat')}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Not"
                            className="compact-input note-input"
                            value={row.not}
                            onChange={(e) => handleCellChange(e, rowIndex, 'not')}
                          />
                        </td>
                        <td className="action-col">
                          {siparisDetaylari.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIndex)}
                              className="btn-remove-row"
                              title="Satırı Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-actions-bottom">
              <h4 className="total-amount">Toplam Tutar: <span>{formatCurrency(toplamTutar)} TL</span></h4>
              <div className="button-group">
                {selectedOrder && (
                  <button type="button" onClick={handleCancelUpdate} className="btn-form btn-secondary">İptal</button>
                )}
                <button type="submit" className="btn-form btn-primary" disabled={isLoading}>
                  {selectedOrder ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* İyileştirilmiş Modal */}
      {isModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content modal-fullwidth">
            <button onClick={handleCloseModal} className="modal-close-btn">
              <XCircle size={24} />
            </button>
            <h3 className="modal-title">Sipariş Detayları</h3>
            <div className="modal-info-section">
              <p><strong>Sipariş No:</strong> {selectedOrder._id}</p>
              <p><strong>Veren Firma:</strong> {selectedOrder.verenFirmaAdi}</p>
              <p><strong>Sipariş Tarihi:</strong> {new Date(selectedOrder.olusturmaTarihi).toLocaleDateString()}</p>
              <p><strong>Email Durumu:</strong> {
                selectedOrder.emailGonderildi ? (
                  <span className="status-badge sent">
                    <CheckCircle size={14} />
                    Gönderildi ({new Date(selectedOrder.emailGonderimTarihi).toLocaleDateString()})
                  </span>
                ) : (
                  <span className="status-badge pending">
                    <Clock size={14} />
                    Henüz gönderilmedi
                  </span>
                )
              }</p>
            </div>

            {/* Modal içinde email gönderme butonu */}
            <div className="modal-actions-section">
              {!selectedOrder.emailGonderildi && (
                <button
                  onClick={() => {
                    handleCloseModal();
                    handleEmailConfirmation({
                      ...selectedOrder,
                      sirketEmailler: selectedOrder.sirketEmailller || []
                    });
                  }}
                  className="btn-modal btn-email"
                >
                  <Mail size={16} />
                  Email Bildirimi Gönder
                </button>
              )}
              <button onClick={() => generatePDF(selectedOrder)} className="btn-modal btn-pdf">
                <Printer size={16} />
                PDF İndir
              </button>
              <button onClick={() => exportOrderExcel(selectedOrder, BEDENLER)} className="btn-modal btn-excel">
                <Download size={16} />
                Excel İndir
              </button>
            </div>

            <div className="modal-table-wrapper">
              <table className="modal-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Cins</th>
                    <th>Renk</th>
                    {BEDENLER.map(beden => <th key={beden}>{beden}</th>)}
                    <th>Toplam</th>
                    <th>Fiyat</th>
                    <th>Tutar</th>
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.urunler || []).map((urun, index) => {
                    const toplamAdet = (urun.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
                    const tutar = toplamAdet * (parseFloat(urun.fiyat) || 0);

                    return (
                      <tr key={index}>
                        <td>{urun.model}</td>
                        <td>{urun.cins}</td>
                        <td>{urun.renk}</td>
                        {BEDENLER.map(beden => {
                          const found = (urun.bedenler || []).find(b => b.beden === beden);
                          return <td key={beden}>{found && found.adet > 0 ? found.adet : '-'}</td>;
                        })}
                        <td className="total-cell">{toplamAdet}</td>
                        <td className="price-cell">{formatCurrency(urun.fiyat)} TL</td>
                        <td className="total-price-cell">{formatCurrency(tutar)} TL</td>
                        <td>{urun.not || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-summary">
              <div className="summary-item">
                <span>Toplam Adet:</span>
                <span>{calculateTotalAdet(selectedOrder.urunler)}</span>
              </div>
              <div className="summary-item total">
                <span>Genel Toplam:</span>
                <span>{formatCurrency(calculateTotalOrderAmount(selectedOrder.urunler))} TL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Modal */}
      <EmailConfirmationModal
        isOpen={emailConfirmationModal.isOpen}
        onClose={() => setEmailConfirmationModal({ isOpen: false, siparisData: null })}
        onConfirm={() => handleSendEmail(emailConfirmationModal.siparisData._id)}
        siparisData={emailConfirmationModal.siparisData}
        isLoading={isEmailSending}
      />
    </div>
  );
}

export default Siparisler;