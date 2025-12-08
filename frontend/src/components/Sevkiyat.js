// Sevkiyat.js
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Send,
  Truck,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Sevkiyat.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
document.title = 'Sevkiyat Yönetimi';
function Sevkiyat() {
  const API_BASE_URL_SEVKIYAT = 'http://31.57.33.249:3001/api/sevkiyat';
  const API_BASE_URL_SIRKET = 'http://31.57.33.249:3001/api/sirketler';
  const BEDENLER = [
    '3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL',
    '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', 'Özel'
  ];

  const [viewMode, setViewMode] = useState('list');
  const [sevkiyatlar, setSevkiyatlar] = useState([]);
  const [sirketler, setSirketler] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSirketCurrency, setSelectedSirketCurrency] = useState('TL');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Sevkiyat.js başına (import’ların hemen altına) ekleyeceğim:
  const debounceTimer = useRef(null);
  const [autoFilling, setAutoFilling] = useState(false); // Otomatik doldurma sırasında state’i kilitle
  // Çoklu seçim için
  const [selectedShipments, setSelectedShipments] = useState([]);

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

  const [selectedSevkiyat, setSelectedSevkiyat] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal için filtre state'leri
  const [modalFilters, setModalFilters] = useState({
    model: [],
    cins: [],
    renk: []
  });
  const [modalSearchTerm, setModalSearchTerm] = useState('');

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

  const [sevkiyatDetaylari, setSevkiyatDetaylari] = useState([
    {
      model: '',
      cins: '',
      renk: '',
      bedenler: BEDENLER.map((b) => ({ beden: b, adet: '' })),
      birimFiyat: '',
      sevkiyatTarihi: new Date().toISOString().split('T')[0],
      not: ''
    }
  ]);
  const [toplamTutar, setToplamTutar] = useState(0);
  const [selectedSirketId, setSelectedSirketId] = useState('');

  // Kaydedilmemiş değişiklikleri takip et
  useEffect(() => {
    const checkUnsavedChanges = () => {
      const hasNonEmptyRows = sevkiyatDetaylari.some(row =>
        row.model || row.cins || row.renk ||
        row.bedenler.some(b => b.adet) ||
        row.birimFiyat || row.not
      );
      setHasUnsavedChanges(hasNonEmptyRows && viewMode === 'create');
    };

    checkUnsavedChanges();
  }, [sevkiyatDetaylari, viewMode]);

  // Sayfa değiştirme kontrolü
  const handleModeChange = (newMode) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Kaydedilmemiş değişiklikleriniz var. Devam etmek istediğinize emin misiniz?');
      if (!confirmed) return;
    }
    setViewMode(newMode);
    if (newMode === 'list') {
      resetForm();
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sirketRes, sevkiyatRes] = await Promise.all([
        axios.get(API_BASE_URL_SIRKET),
        axios.get(API_BASE_URL_SEVKIYAT)
      ]);

      const sirketData = sirketRes.data || [];
      const sevkiyatData = sevkiyatRes.data.data || sevkiyatRes.data || []

      // Sevkiyat verilerini formatla
      const formattedSevkiyatlar = sevkiyatData.map(sevkiyat => ({
        ...sevkiyat,
        sirketAdi: sevkiyat.sirketAdi || 'Bilinmeyen Şirket',
        urunler: sevkiyat.urunler || []
      }));

      setSirketler(sirketData);
      setSevkiyatlar(formattedSevkiyatlar);

      if (sirketData.length > 0) setSelectedSirketId(sirketData[0]._id);
      setSelectedShipments([]);
    } catch (e) {
      console.error('Veri çekme hatası:', e);
      toast.error('Veri çekilirken bir hata oluştu: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL_SEVKIYAT, API_BASE_URL_SIRKET]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtre açılır menülerinin düzgün çalışması için
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectedFilter && !event.target.closest('.header-with-filter')) {
        setSelectedFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedFilter]);

  // ---- SEARCH DEBOUNCE ----
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 500);
    return () => { clearTimeout(handler); };
  }, [searchTerm]);

  // ---- TOPLAM TUTAR (Form) ----
  useEffect(() => {
    const total = sevkiyatDetaylari.reduce((acc, row) => {
      const adetToplam = (row.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      const birimFiyat = parseFloat(row.birimFiyat) || 0;
      const line = adetToplam * birimFiyat;
      return acc + line;
    }, 0);
    setToplamTutar(total);
  }, [sevkiyatDetaylari]);

  // ---- HELPERS ----
  useEffect(() => {
    if (selectedSirketId && sirketler.length > 0) {
      const selectedSirket = sirketler.find(s => s._id === selectedSirketId);
      if (selectedSirket) {
        setSelectedSirketCurrency(selectedSirket.sirketCariBirimi || 'USD');
      }
    }
  }, [selectedSirketId, sirketler]);

  const formatCurrency = (amount) => {
    if (isNaN(amount) || amount === null) return `0,00 USD`;
    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` USD`;
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


  const calculateTotalAdet = (urunler) => {
    if (!urunler || urunler.length === 0) return 0;
    return urunler.reduce((total, urun) => {
      const adet = (urun.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      return total + adet;
    }, 0);
  };

  // Satır toplamını hesaplama fonksiyonu
  const calculateRowTotal = (row) => {
    const totalAdet = (row.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
    const birimFiyat = parseFloat(row.birimFiyat) || 0;
    return totalAdet * birimFiyat;
  };

  // Modal için filtrelenmiş ürünler
  const filteredModalUrunler = useMemo(() => {
    if (!selectedSevkiyat || !selectedSevkiyat.urunler) return [];

    return selectedSevkiyat.urunler.filter(urun => {
      const modelMatches = modalFilters.model.length === 0 || modalFilters.model.includes(urun.model);
      const cinsMatches = modalFilters.cins.length === 0 || modalFilters.cins.includes(urun.cins);
      const renkMatches = modalFilters.renk.length === 0 || modalFilters.renk.includes(urun.renk);

      const searchMatches = modalSearchTerm === '' ||
        urun.model?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        urun.cins?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        urun.renk?.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        urun.not?.toLowerCase().includes(modalSearchTerm.toLowerCase());

      return modelMatches && cinsMatches && renkMatches && searchMatches;
    });
  }, [selectedSevkiyat, modalFilters, modalSearchTerm]);

  // Modal için benzersiz değerleri alma
  const getModalUniqueValues = (field) => {
    if (!selectedSevkiyat || !selectedSevkiyat.urunler) return [];
    const values = new Set();
    selectedSevkiyat.urunler.forEach(urun => {
      if (urun[field]) values.add(urun[field]);
    });
    return Array.from(values).sort();
  };

  // ---- FILTERED LIST ----
  const filteredSevkiyatlar = useMemo(() => {
    return sevkiyatlar.filter(sevkiyat => {
      const firmaMatches = activeFilters.firma.length === 0 || activeFilters.firma.includes(sevkiyat.sirketAdi);

      const q = debouncedSearchTerm.toLowerCase();
      const searchMatches = q === '' ||
        (searchField === 'hepsi' && (
          sevkiyat.sirketAdi?.toLowerCase().includes(q) ||
          sevkiyat.sevkiyatNo?.toString().includes(q) ||
          sevkiyat.urunler?.some(d =>
            (d.model && d.model.toLowerCase().includes(q)) ||
            (d.cins && d.cins.toLowerCase().includes(q)) ||
            (d.renk && d.renk.toLowerCase().includes(q)) ||
            (d.not && d.not.toLowerCase().includes(q))
          )
        )) ||
        (searchField === 'firma' && sevkiyat.sirketAdi?.toLowerCase().includes(q)) ||
        (searchField === 'sevkiyatNo' && sevkiyat.sevkiyatNo?.toString().includes(q));

      return firmaMatches && searchMatches;
    });
  }, [sevkiyatlar, activeFilters, searchField, debouncedSearchTerm]);

  const getUniqueValues = useCallback((field) => {
    const values = new Set();
    sevkiyatlar.forEach(s => {
      if (field === 'firma') {
        if (s.sirketAdi) values.add(s.sirketAdi);
      }
    });
    return Array.from(values).filter(Boolean).sort();
  }, [sevkiyatlar]);

  const resetForm = () => {
    setSevkiyatDetaylari([
      {
        model: '',
        cins: '',
        renk: '',
        bedenler: BEDENLER.map((b) => ({ beden: b, adet: '' })),
        birimFiyat: '',
        sevkiyatTarihi: new Date().toISOString().split('T')[0],
        not: ''
      }
    ]);
    setSelectedSirketId(sirketler.length > 0 ? sirketler[0]._id : '');
    setSelectedSevkiyat(null);
    setHasUnsavedChanges(false);
  };

  // ---- EMAIL NOTIFICATION ----
  const handleSendNotification = async (sevkiyatId) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL_SEVKIYAT}/${sevkiyatId}/send-notification`);

      if (response.data.success) {
        toast.success('Email bildirimi başarıyla gönderildi!');
      } else {
        toast.error(response.data.msg || 'Email gönderirken bir hata oluştu.');
      }
    } catch (err) {
      console.error('Email gönderme hatası:', err);
      toast.error(err.response?.data?.msg || 'Email gönderirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- ROW/FORM HANDLERS ----
  const handleEdit = (sevkiyat) => {
    setSelectedSevkiyat(sevkiyat);
    const detaylar = (sevkiyat.urunler || []).map(urun => ({
      model: urun.model,
      cins: urun.cins,
      renk: urun.renk,
      bedenler: BEDENLER.map(b => {
        const foundBeden = (urun.bedenler || []).find(ub => ub.beden === b);
        return { beden: b, adet: foundBeden ? foundBeden.adet : '' };
      }),
      birimFiyat: urun.birimFiyat || '',
      sevkiyatTarihi: urun.sevkiyatTarihi || new Date().toISOString().split('T')[0],
      not: urun.not || '',
    }));
    setSevkiyatDetaylari(detaylar);
    setSelectedSirketId(sevkiyat.sirketId);
    setViewMode('create');
    setHasUnsavedChanges(false);
  };

  const handleDelete = async (sevkiyatId) => {
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
    setModalFilters({ model: [], cins: [], renk: [] });
    setModalSearchTerm('');
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSevkiyat(null);
    setModalFilters({ model: [], cins: [], renk: [] });
    setModalSearchTerm('');
    document.body.style.overflow = 'unset';
  };

  const handleAddRow = () => {
    setSevkiyatDetaylari([
      ...sevkiyatDetaylari,
      {
        model: '',
        cins: '',
        renk: '',
        bedenler: BEDENLER.map((b) => ({ beden: b, adet: '' })),
        birimFiyat: '',
        sevkiyatTarihi: new Date().toISOString().split('T')[0],
        not: ''
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (sevkiyatDetaylari.length > 1) {
      const newRows = [...sevkiyatDetaylari];
      newRows.splice(index, 1);
      setSevkiyatDetaylari(newRows);
    }
  };

  const handleCellChange = (e, rowIndex, fieldName, bedenIndex = null) => {
    const { value } = e.target;
    const newRows = [...sevkiyatDetaylari];

    if (bedenIndex !== null) {
      // Beden değişikliği
      newRows[rowIndex].bedenler[bedenIndex].adet = value;
    } else {
      // Diğer alan değişiklikleri
      newRows[rowIndex][fieldName] = value;

      // 🚀 OTOMATİK FİYAT ÇEKME — SADECE MODEL DEĞİŞTİYSE VE FİRMA SEÇİLİYSE
      if (fieldName === 'model' && value && selectedSirketId && !autoFilling) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(async () => {
          try {
            setAutoFilling(true);
            const res = await fetch(`http://31.57.33.249:3001/api/model-fiyatlari?firmaId=${selectedSirketId}&model=${value}`);
            const data = await res.json();
            if (data && data.birimFiyat) {
              // Fiyatı ve para birimini güncelle
              newRows[rowIndex].birimFiyat = data.birimFiyat;
              if (data.paraBirimi) {
                setSelectedSirketCurrency(data.paraBirimi);
              }
              setSevkiyatDetaylari([...newRows]); // State’i güncelle
              toast.success(`✅ Fiyat otomatik dolduruldu: ${data.birimFiyat} ${data.paraBirimi || selectedSirketCurrency}`, {
                position: "top-right",
                autoClose: 1500
              });
            } else {
              // Opsiyonel: "Kayıt bulunamadı" toast’ı
              // toast.info("Bu model için fiyat kaydı bulunamadı.", { autoClose: 1000 });
            }
          } catch (err) {
            console.error("Fiyat getirilemedi:", err);
            toast.error("Fiyat getirilemedi. Lütfen tekrar deneyin.", { autoClose: 2000 });
          } finally {
            setAutoFilling(false);
          }
        }, 500); // 0.5 saniye debounce
      }
    }

    setSevkiyatDetaylari(newRows);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Her bir ürünün toplam adetini hesapla
      const urunlerPayload = sevkiyatDetaylari.map(item => ({
        urunAdi: `${item.model} ${item.cins} ${item.renk}`.trim(),
        model: item.model,
        sirketCariBirimi: selectedSirketCurrency,
        cins: item.cins,
        renk: item.renk,
        bedenler: item.bedenler.filter(b => (parseInt(b.adet) || 0) > 0),
        adet: item.bedenler.reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0),
        birimFiyat: parseFloat(item.birimFiyat) || 0,
        sevkiyatTarihi: item.sevkiyatTarihi,
        not: item.not
      }));

      // Tüm sevkiyatın toplam adetini hesapla
      const totalAdet = urunlerPayload.reduce((sum, item) => sum + item.adet, 0);

      // Backend'in beklediği format
      const payload = {
        sirketId: selectedSirketId,
        sevkiyatTarihi: sevkiyatDetaylari[0]?.sevkiyatTarihi || new Date(),
        urunler: urunlerPayload,
        toplamAdet: totalAdet, // Hesaplanan toplam adeti buraya ekle
      };

      if (selectedSirketId) {
        for (let item of sevkiyatDetaylari) {
          if (item.model && item.birimFiyat) {
            try {
              await fetch('http://31.57.33.249:3001/api/model-fiyatlari', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  firmaId: selectedSirketId,
                  model: item.model,
                  birimFiyat: parseFloat(item.birimFiyat) || 0,
                  paraBirimi: selectedSirketCurrency
                })
              });
            } catch (err) {
              console.warn("Model fiyatı kaydedilemedi:", item.model, err);
              // Hata olsa bile sipariş kaydını engelleme
            }
          }
        }
      }

      if (selectedSevkiyat && selectedSevkiyat._id) {
        await axios.put(`${API_BASE_URL_SEVKIYAT}/${selectedSevkiyat._id}`, payload);
        toast.success('Sevkiyat başarıyla güncellendi!');
      } else {
        await axios.post(API_BASE_URL_SEVKIYAT, payload);
        toast.success('Sevkiyat başarıyla eklendi ve cari hesaba işlendi!');
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

  const handleCancelUpdate = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Kaydedilmemiş değişiklikleriniz var. İptal etmek istediğinize emin misiniz?');
      if (!confirmed) return;
    }
    resetForm();
    setViewMode('list');
    toast.info('Düzenleme işlemi iptal edildi.');
  };

  const exportSevkiyatExcel = async (sevkiyat) => {
    if (!sevkiyat) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Sevkiyat Detayı', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 20 },
    });

    // Sayfa ayarları
    ws.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    // === BAŞLIK ve ALT BİLGİLER ===
    ws.mergeCells('A1:L2');
    const companyCell = ws.getCell('A1');
    companyCell.value = 'BOZKURTSAN DERİ SAN. VE TİC. LTD. ŞTİ.';
    companyCell.font = { name: 'Segoe UI', bold: true, size: 16, color: { argb: '1f4e79' } };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffffff' } };
    companyCell.border = {};

    const infoRows = [
      ['A3', 'BOLEMOD-SHAWO'],
      ['A4', '12345 SOKAK NO: 31. | 21 K.2 D.2 KONAK/İZMİR'],
      ['A5', 'GSM: +90 (533) 611 9596 | +90 (532) 064 7004'],
      ['A6', 'E-mail: bozkurtsan@hotmail.com'],
    ];

    infoRows.forEach(([addr, text]) => {
      const rowNum = addr.slice(1);
      ws.mergeCells(`${addr}:L${rowNum}`);
      const cell = ws.getCell(addr);
      cell.value = text;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: '495057' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {};
    });

    // === Sevkiyat Bilgileri (sağ üst) ===
    const infoStartCol = BEDENLER.length + 6;
    ws.mergeCells(1, infoStartCol, 1, infoStartCol + 3);
    const sevkiyatHeaderCell = ws.getCell(1, infoStartCol);
    sevkiyatHeaderCell.value = `SEVKİYAT EDİLEN FİRMA: ${sevkiyat.sirketAdi}`;
    sevkiyatHeaderCell.font = { name: 'Segoe UI', bold: true, size: 12 };
    sevkiyatHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sevkiyatHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ffffff' } };

    ws.getCell(3, infoStartCol).value = 'TARİH:';
    ws.getCell(3, infoStartCol).font = { name: 'Segoe UI', bold: true, size: 10 };
    ws.getCell(3, infoStartCol + 1).value = new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR');

    ws.getCell(4, infoStartCol).value = 'SEVKİYAT NO:';
    ws.getCell(4, infoStartCol).font = { name: 'Segoe UI', bold: true, size: 10 };
    ws.getCell(4, infoStartCol + 1).value = sevkiyat.sevkiyatNo;

    // === Tablo Başlıkları ===
    const headerRow = 8;
    const headers = ['Model', 'Renk', 'Cins', ...BEDENLER, 'Toplam Adet', 'Birim Fiyat', 'Toplam Tutar', 'Notlar'];

    headers.forEach((header, i) => {
      const cell = ws.getCell(headerRow, i + 1);
      cell.value = header;
      cell.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: 'ffffff' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '5D5FEF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
    });

    // === Ürün Satırları ===
    let currentRow = headerRow + 1;
    let grandTotal = 0;
    let grandTotalAdet = 0;

    (sevkiyat.urunler || []).forEach((item, idx) => {
      const bedenAdetleri = BEDENLER.map(b => {
        const found = (item.bedenler || []).find(bb => bb.beden === b);
        return found && parseInt(found.adet) > 0 ? parseInt(found.adet) : '';
      });

      const toplamAdet = bedenAdetleri.reduce((s, a) => s + (parseInt(a) || 0), 0);
      const birimFiyat = parseFloat(item.birimFiyat) || 0;
      const satirToplami = birimFiyat * toplamAdet;
      grandTotal += satirToplami;
      grandTotalAdet += toplamAdet;

      const rowData = [
        item.model || '',
        item.renk || '',
        item.cins || '',
        ...bedenAdetleri,
        toplamAdet,
        birimFiyat,
        satirToplami,
        item.not || ''
      ];

      rowData.forEach((val, colIdx) => {
        const cell = ws.getCell(currentRow, colIdx + 1);
        cell.value = val;
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colIdx <= 2 ? 'left' : 'center' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // Renkler
        if (colIdx === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE699' } };
          cell.font.bold = true;
        } else if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
        }
        if (colIdx === headers.length - 4) cell.font.bold = true;
        if (colIdx === headers.length - 3 || colIdx === headers.length - 2) cell.numFmt = '#,##0.00';
      });

      currentRow++;
    });

    // === Genel Toplam Satırı ===
    const totalRow = currentRow + 1;
    ws.mergeCells(totalRow, 1, totalRow, headers.length);
    const totalCell = ws.getCell(totalRow, 1);
    const paraBirimi = sevkiyat.sirketCariBirimi || 'USD';

    totalCell.value = `Genel Toplam  ${grandTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${paraBirimi}  (${grandTotalAdet} adet ürün)`;
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EDEDED' } };
    totalCell.font = { name: 'Segoe UI', bold: true, size: 14, color: { argb: '333333' } };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.border = { top: { style: 'double' }, left: { style: 'double' }, bottom: { style: 'double' }, right: { style: 'double' } };

    // Sütun genişlikleri ve satır yükseklikleri
    ws.columns = [
      { width: 25 }, { width: 15 }, { width: 15 },
      ...BEDENLER.map(() => ({ width: 7 })),
      { width: 12 }, { width: 14 }, { width: 18 }, { width: 25 }
    ];
    ws.eachRow(row => {
      row.height = 22;
      row.eachCell(cell => cell.alignment = { ...cell.alignment, wrapText: true });
    });

    // Freeze header
    ws.views = [{ state: 'frozen', xSplit: 3, ySplit: headerRow, topLeftCell: 'D9', activeCell: 'A1' }];

    // Header/Footer
    ws.headerFooter.oddHeader = '&C&14&BSevkiyat Detay Raporu';
    ws.headerFooter.oddFooter = '&L&D &T &R&P / &N';

    // Dosya adı ve kaydet
    const tarih = new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR').replace(/\./g, '-');
    const fileName = `SEVKİYAT_${sevkiyat.sirketAdi.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ0-9\s]/g, '').replace(/\s+/g, '_')}_${tarih}.xlsx`;

    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), fileName);
  };

  // ---- PDF EXPORT ----
  const generatePDF = (sevkiyat) => {
    if (!sevkiyat) return;

    const doc = new jsPDF({
      unit: 'pt',
      format: 'a3',
      orientation: 'landscape'
    });

    // Modern renkler
    const colors = {
      primary: [13, 110, 253],
      secondary: [108, 117, 125],
      success: [25, 135, 84],
      danger: [220, 53, 69],
      warning: [255, 193, 7],
      background: [248, 249, 250],
      text: [33, 37, 41],
      lightBlue: [227, 242, 253]
    };

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 50;

    // Header gradient background
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 100, 'F');

    // Company title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('BOZKURTSAN DERİ SAN. VE TİC. LTD. ŞTİ.', margin, 45);

    // Subtitle
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('BOLEMOD-SHAWO', margin, 70);

    // Date
    doc.setFontSize(12);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - 200, 45);

    // Company info section
    doc.setTextColor(...colors.text);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('12345 SOKAK NO: 31. | 21 K.2 D.2 KONAK/İZMİR', margin, 130);
    doc.text('GSM: +90 (533) 611 9596 | +90 (532) 064 7004 | E-mail: bozkurtsan@hotmail.com', margin, 150);

    // Sevkiyat info card
    const cardX = pageWidth - 350;
    const cardY = 120;
    const cardWidth = 300;
    const cardHeight = 80;

    // Card background
    doc.setFillColor(...colors.lightBlue);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'F');

    // Card border
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(2);
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'S');

    // Card content
    doc.setTextColor(...colors.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SEVKİYAT BİLGİLERİ', cardX + 15, cardY + 25);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Müşteri: ${sevkiyat.sirketAdi}`, cardX + 15, cardY + 45);
    doc.text(`Sevkiyat No: ${sevkiyat.sevkiyatNo}`, cardX + 15, cardY + 60);
    doc.text(`Tarih: ${new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR')}`, cardX + 15, cardY + 75);

    // Table with auto-table
    const tableStartY = 220;
    const maxBedenCount = 12; // A3'te sığacak maksimum beden sayısı
    const visibleBedenler = BEDENLER.slice(0, maxBedenCount);

    const headers = ['Model', 'Renk', 'Cins', ...visibleBedenler, 'Toplam', 'Birim Fiyat', 'Tutar'];

    const tableData = (sevkiyat.urunler || []).map(item => {
      const bedenler = visibleBedenler.map(beden => {
        const found = (item.bedenler || []).find(b => b.beden === beden);
        const adet = parseInt(found?.adet) || 0;
        return adet > 0 ? adet.toString() : '-';
      });

      const adetToplam = (item.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      const birimFiyat = parseFloat(item.birimFiyat) || 0;
      const satirToplami = adetToplam * birimFiyat;

      return [
        item.model || '-',
        item.renk || '-',
        item.cins || '-',
        ...bedenler,
        adetToplam.toString(),
        `${birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
        `${satirToplami.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
      ];
    });

    doc.autoTable({
      startY: tableStartY,
      head: [headers],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: colors.text,
        lineColor: colors.secondary,
        lineWidth: 0.5,
        font: 'helvetica',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [93, 95, 239], // 5D5FEF rengi
        textColor: [255, 255, 255], // Beyaz yazı
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: colors.background
      },
      columnStyles: {
        0: {
          cellWidth: 60,
          fontStyle: 'bold',
          fillColor: [255, 253, 230] // Model sütunu sarı
        }, // Model
        1: { cellWidth: 50 }, // Renk
        2: { cellWidth: 50 }, // Cins
        ...Object.fromEntries(visibleBedenler.map((_, i) => [i + 3, { cellWidth: 30, halign: 'center' }])),
        [headers.length - 3]: {
          cellWidth: 40,
          halign: 'center',
          fontStyle: 'bold',
          fillColor: colors.lightBlue
        }, // Toplam
        [headers.length - 2]: { cellWidth: 60, halign: 'right' }, // Birim Fiyat
        [headers.length - 1]: {
          cellWidth: 70,
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [255, 243, 205]
        } // Tutar
      },
      margin: { left: margin, right: margin },
      theme: 'striped',
      didParseCell: function (data) {
        // Model sütununu sarı yap (sadece veri satırlarında)
        if (data.column.index === 0 && data.section === 'body') {
          data.cell.styles.fillColor = [255, 253, 230];
        }
      }
    });

    // Total section
    const finalY = doc.lastAutoTable.finalY + 30;
    const total = sevkiyat.toplamTutar || calculateTotalAmount(sevkiyat.urunler);
    const totalAdet = (sevkiyat.urunler || []).reduce((sum, item) => {
      return sum + (item.bedenler || []).reduce((itemSum, b) => itemSum + (parseInt(b.adet) || 0), 0);
    }, 0);

    // Total background
    doc.setFillColor(40, 167, 69); // Yeşil renk (28A745)
    doc.roundedRect(pageWidth - 400, finalY, 350, 50, 5, 5, 'F');

    // Total text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOPLAM ADET: ${totalAdet}`, pageWidth - 390, finalY + 20);
    doc.setFontSize(16);
    doc.text(`GENEL TOPLAM: ${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`,
      pageWidth - 390, finalY + 40);

    // Footer
    doc.setTextColor(...colors.secondary);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Bu sevkiyat otomatik olarak sistemimiz tarafından oluşturulmuştur.', margin, pageHeight - 30);

    const tarih = new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR').replace(/\./g, '-');
    const fileName = `SEVKİYAT_${sevkiyat.sirketAdi.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ0-9]/g, '_')}_${tarih}.pdf`;
    doc.save(fileName);
  };

  // Yardımcı fonksiyon
  const calculateTotalAmount = (urunler) => {
    return (urunler || []).reduce((total, item) => {
      const adetToplam = (item.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
      return total + (adetToplam * (parseFloat(item.birimFiyat) || 0));
    }, 0);
  };

  // ---- BULK SELECT / DELETE ----
  const toggleShipmentSelection = (sevkiyatId) => {
    setSelectedShipments(prev =>
      prev.includes(sevkiyatId) ? prev.filter(id => id !== sevkiyatId) : [...prev, sevkiyatId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredSevkiyatlar.map(s => s._id);
    const allSelected = visibleIds.every(id => selectedShipments.includes(id));
    if (allSelected) {
      setSelectedShipments(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const union = new Set([...selectedShipments, ...visibleIds]);
      setSelectedShipments(Array.from(union));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedShipments.length === 0) {
      toast.warning('Lütfen silmek istediğiniz sevkiyatları seçin');
      return;
    }
    if (!window.confirm(`${selectedShipments.length} sevkiyatı silmek istediğinize emin misiniz?`)) return;

    try {
      await Promise.all(selectedShipments.map(sevkiyatId => axios.delete(`${API_BASE_URL_SEVKIYAT}/${sevkiyatId}`)));
      toast.success(`${selectedShipments.length} sevkiyat başarıyla silindi!`);
      setSelectedShipments([]);
      fetchData();
    } catch (err) {
      console.error('Sevkiyat silinirken hata:', err);
      toast.error('Sevkiyatlar silinirken bir hata oluştu.');
    }
  };

  // Genel toplam hesaplama
  const calculateGrandTotal = () => {
    return filteredSevkiyatlar.reduce((total, sevkiyat) => {
      return total + (sevkiyat.toplamTutar || calculateTotalAmount(sevkiyat.urunler));
    }, 0);
  };

  // ---- RENDER ----
  if (isLoading) {
    return (
      <div className="sevkiyat-container loading-state">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
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

      {/* Header */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '3rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
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

        {/* Title */}
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
            marginBottom: '16px',
          }}
        >
          <Truck size={28} style={{ marginRight: '12px' }} />
          Sevkiyat Yönetimi
        </h1>

        {/* Mode Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              backgroundColor: viewMode === 'list' ? '#2563eb' : '#e5e7eb',
              color: viewMode === 'list' ? 'white' : '#111827',
            }}
            onClick={() => handleModeChange('list')}
          >
            <List size={18} />
            Sevkiyat Listesi
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              backgroundColor: viewMode === 'create' ? '#2563eb' : '#e5e7eb',
              color: viewMode === 'create' ? 'white' : '#111827',
            }}
            onClick={() => handleModeChange('create')}
          >
            <Plus size={18} />
            Yeni Sevkiyat
          </button>
        </div>
      </div>



      {viewMode === 'list' && (
        <>
          <div className="sevkiyat-controls">
            <div className="sevkiyat-search-bar">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Sevkiyat ara..."
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
                    <li onClick={() => { setSearchField('sevkiyatNo'); setSearchFieldDropdownOpen(false); }}>Sevkiyat No</li>
                  </ul>
                )}
              </div>
            </div>

            {selectedShipments.length > 0 && (
              <div className="bulk-actions-container">
                <div className="bulk-selection-info">
                  <CheckSquare size={16} className="bulk-icon" />
                  <span>{selectedShipments.length} sevkiyat seçildi</span>
                </div>
                <button onClick={handleBulkDelete} className="btn-bulk-delete">
                  <Trash2 size={16} />
                  Seçilenleri Sil
                </button>
                <button
                  onClick={() => setSelectedShipments([])}
                  className="btn-bulk-clear"
                  title="Seçimi temizle"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="sevkiyat-card">
            <div className="table-wrapper">
              <table className="sevkiyat-table">
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
                          {filteredSevkiyatlar.length > 0 &&
                            filteredSevkiyatlar.every(s => selectedShipments.includes(s._id))
                            ? <CheckSquare size={18} className="select-icon active" />
                            : <Square size={18} className="select-icon" />
                          }
                        </button>
                      </div>
                    </th>

                    <th>Sevkiyat No</th>
                    <th>
                      <div className="header-with-filter" onClick={() => setSelectedFilter(selectedFilter === 'firma' ? null : 'firma')}>
                        Şirket
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

                    <th>Toplam Adet</th>
                    <th>Sevkiyat Tarihi</th>
                    <th>Toplam Tutar</th>
                    <th className="action-column">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSevkiyatlar.length > 0 ? (
                    filteredSevkiyatlar.map(sevkiyat => {
                      const isChecked = selectedShipments.includes(sevkiyat._id);
                      return (
                        <tr key={sevkiyat._id}>
                          <td style={{ textAlign: 'center' }}>
                            <div className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleShipmentSelection(sevkiyat._id)}
                                className="shipment-checkbox"
                              />
                            </div>
                          </td>

                          <td>
                            <div className="sevkiyat-no-badge">
                              {sevkiyat.sevkiyatNo}
                            </div>
                          </td>
                          <td>{sevkiyat.sirketAdi}</td>
                          <td>{calculateTotalAdet(sevkiyat.urunler)}</td>
                          <td>{new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR')}</td>
                          <td>{formatCurrency(sevkiyat.toplamTutar || calculateTotalAmount(sevkiyat.urunler))}</td>
                          <td className="action-column">
                            <div className="action-buttons">
                              <button onClick={() => handleOpenViewModal(sevkiyat)} className="btn-action btn-view" title="Detayları Görüntüle">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => handleEdit(sevkiyat)} className="btn-action btn-edit" title="Sevkiyatı Düzenle">
                                <PencilLine size={16} />
                              </button>
                              <button onClick={() => generatePDF(sevkiyat)} className="btn-action btn-pdf" title="PDF İndir">
                                <FileText size={16} />
                              </button>
                              <button onClick={() => exportSevkiyatExcel(sevkiyat)} className="btn-action btn-excel" title="Excel İndir">
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => handleSendNotification(sevkiyat._id)}
                                className="btn-action btn-email"
                                title="Email Bildirim Gönder"
                              >
                                <Send size={16} />
                              </button>
                              <button onClick={() => handleDelete(sevkiyat._id)} className="btn-action btn-delete" title="Sevkiyatı Sil">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-data">Sevkiyat kaydı bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'create' && (
        <div className="sevkiyat-card form-card">
          <form onSubmit={handleSubmit}>
            <h3 className="form-title">{selectedSevkiyat ? 'Sevkiyatı Düzenle' : 'Yeni Sevkiyat Ekle'}</h3>

            <div className="form-header-section">
              <div className="form-group-inline">
                <label htmlFor="sirket-secim">Şirket</label>
                <select
                  id="sirket-secim"
                  className="form-control-compact"
                  value={selectedSirketId}
                  onChange={(e) => {
                    setSelectedSirketId(e.target.value)
                    const selected = sirketler.find(s => s._id === e.target.value);
                    if (selected) setSelectedSirketCurrency(selected.sirketCariBirimi || 'USD');
                  }}
                >
                  {sirketler.map(sirket => (
                    <option key={sirket._id} value={sirket._id}>
                      {sirket.sirketAdi}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                      <th>Birim Fiyat</th>
                      <th>Satır Toplamı</th>
                      <th>Not</th>
                      <th className="action-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sevkiyatDetaylari.map((row, rowIndex) => (
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
                            placeholder="Birim Fiyat"
                            className="compact-input price-input"
                            value={row.birimFiyat}
                            onChange={(e) => handleCellChange(e, rowIndex, 'birimFiyat')}
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="row-total-cell">
                          <span className="row-total-display">
                            {formatCurrency(calculateRowTotal(row))}
                          </span>
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
                          {sevkiyatDetaylari.length > 1 && (
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
              <h4 className="total-amount">Toplam Tutar: <span>{formatCurrency(toplamTutar)}</span></h4>
              <div className="button-group">
                {selectedSevkiyat && (
                  <button type="button" onClick={handleCancelUpdate} className="btn-form btn-secondary">İptal</button>
                )}
                <button type="submit" className="btn-form btn-primary" disabled={isLoading}>
                  {selectedSevkiyat ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isModalOpen && selectedSevkiyat && (
        <div className="modal-overlay">
          <div className="modal-content modal-fullwidth">
            <button onClick={handleCloseModal} className="modal-close-btn">
              <XCircle size={24} />
            </button>
            <h3 className="modal-title">Sevkiyat Detayları</h3>

            <div className="modal-info-section">
              <div className="info-card">
                <div className="info-item">
                  <strong>Sevkiyat No:</strong> <span className="info-value">{selectedSevkiyat.sevkiyatNo}</span>
                </div>
                <div className="info-item">
                  <strong>Şirket:</strong> <span className="info-value">{selectedSevkiyat.sirketAdi}</span>
                </div>
                <div className="info-item">
                  <strong>Sevkiyat Tarihi:</strong> <span className="info-value">{new Date(selectedSevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="info-item">
                  <strong>Toplam Tutar:</strong> <span className="info-value total-amount">{formatCurrency(selectedSevkiyat.toplamTutar || calculateTotalAmount(selectedSevkiyat.urunler))}</span>
                </div>
              </div>
            </div>

            {/* Modal Filters */}
            <div className="modal-filters">
              <div className="modal-search-bar">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Ürünlerde ara..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="modal-search-input"
                />
              </div>

              <div className="modal-filter-buttons">
                {['model', 'cins', 'renk'].map(filterType => (
                  <div key={filterType} className="modal-filter-group">
                    <button
                      type="button"
                      className={`modal-filter-btn ${modalFilters[filterType].length > 0 ? 'active' : ''}`}
                      onClick={() => {
                        const dropdown = document.getElementById(`modal-${filterType}-dropdown`);
                        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                      }}
                    >
                      <Filter size={14} />
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                      {modalFilters[filterType].length > 0 && (
                        <span className="filter-count">({modalFilters[filterType].length})</span>
                      )}
                      <ChevronDown size={14} />
                    </button>

                    <div id={`modal-${filterType}-dropdown`} className="modal-filter-dropdown" style={{ display: 'none' }}>
                      {getModalUniqueValues(filterType).map(value => (
                        <label key={value} className="modal-filter-option">
                          <input
                            type="checkbox"
                            checked={modalFilters[filterType].includes(value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModalFilters(prev => ({
                                  ...prev,
                                  [filterType]: [...prev[filterType], value]
                                }));
                              } else {
                                setModalFilters(prev => ({
                                  ...prev,
                                  [filterType]: prev[filterType].filter(v => v !== value)
                                }));
                              }
                            }}
                          />
                          <span className="checkmark"></span>
                          {value}
                        </label>
                      ))}
                      <div className="filter-actions">
                        <button
                          type="button"
                          onClick={() => setModalFilters(prev => ({ ...prev, [filterType]: [] }))}
                          className="btn-clear-filter"
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {(modalFilters.model.length > 0 || modalFilters.cins.length > 0 || modalFilters.renk.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setModalFilters({ model: [], cins: [], renk: [] })}
                    className="btn-clear-all-filters"
                  >
                    <X size={14} /> Tüm Filtreleri Temizle
                  </button>
                )}
              </div>
            </div>

            <div className="modal-table-container">
              <table className="modal-table-fullwidth">
                <thead>
                  <tr>
                    <th className="sortable-header">Model</th>
                    <th className="sortable-header">Cins</th>
                    <th className="sortable-header">Renk</th>
                    {BEDENLER.map((beden, index) => (
                      <th key={index} className="beden-col sortable-header">{beden}</th>
                    ))}
                    <th className="sortable-header">Toplam Adet</th>
                    <th className="sortable-header">Birim Fiyat</th>
                    <th className="sortable-header">Satır Toplamı</th>
                    <th className="sortable-header">Not</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalUrunler.length > 0 ? (
                    filteredModalUrunler.map((urun, index) => {
                      const totalAdet = (urun.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
                      const satirToplami = totalAdet * (parseFloat(urun.birimFiyat) || 0);

                      return (
                        <tr key={index} className={index % 2 === 1 ? 'alternate-row' : ''}>
                          <td className="model-cell">{urun.model}</td>
                          <td className="cins-cell">{urun.cins}</td>
                          <td className="renk-cell">{urun.renk}</td>
                          {BEDENLER.map((beden, bedenIndex) => {
                            const bedenAdet = (urun.bedenler || []).find(b => b.beden === beden)?.adet;
                            const adetValue = parseInt(bedenAdet) || 0;
                            return (
                              <td key={bedenIndex} className={`beden-col ${adetValue > 0 ? 'has-value' : ''}`}>
                                {adetValue > 0 ? adetValue : '-'}
                              </td>
                            );
                          })}
                          <td className="total-adet-cell">{totalAdet}</td>
                          <td className="price-cell">{formatCurrency(urun.birimFiyat || 0)}</td>
                          <td className="row-total-cell highlighted">{formatCurrency(satirToplami)}</td>
                          <td className="note-cell">{urun.not || '-'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={BEDENLER.length + 8} className="no-data">
                        {modalSearchTerm || modalFilters.model.length > 0 || modalFilters.cins.length > 0 || modalFilters.renk.length > 0
                          ? 'Filtrelere uygun ürün bulunamadı.'
                          : 'Ürün kaydı bulunamadı.'
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
<tfoot>
  <tr className="summary-row">
    <td colSpan={BEDENLER.length + 5} className="summary-label">
      <strong>TOPLAM ({
        filteredModalUrunler.reduce((totalAdet, urun) => {
          const urunToplamAdet = (urun.bedenler || []).reduce((sum, b) => sum + (parseInt(b.adet) || 0), 0);
          return totalAdet + urunToplamAdet;
        }, 0)
      } adet ürün)</strong>
    </td>
    <td className="summary-value">
      <strong>{formatCurrency(filteredModalUrunler.reduce((sum, urun) => {
        const totalAdet = (urun.bedenler || []).reduce((s, b) => s + (parseInt(b.adet) || 0), 0);
        return sum + (totalAdet * (parseFloat(urun.birimFiyat) || 0));
      }, 0))}</strong>
    </td>
    <td></td>
  </tr>
</tfoot>
              </table>
            </div>

            <div className="modal-footer">
              <div className="modal-actions">
                <button onClick={() => generatePDF(selectedSevkiyat)} className="btn-icon-with-text btn-pdf">
                  <FileText size={18} /> PDF İndir
                </button>
                <button onClick={() => exportSevkiyatExcel(selectedSevkiyat)} className="btn-icon-with-text btn-excel">
                  <Download size={18} /> Excel İndir
                </button>
                <button
                  onClick={() => handleSendNotification(selectedSevkiyat._id)}
                  className="btn-icon-with-text btn-email"
                >
                  <Send size={18} /> Email Gönder
                </button>
                <button type="button" onClick={handleCloseModal} className="btn-form btn-secondary">Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sevkiyat;