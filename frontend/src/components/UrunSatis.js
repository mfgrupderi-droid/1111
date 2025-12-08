import React, { useState, useEffect, useRef } from 'react';
import {
  Search, FilePlus, FileText, XCircle, ChevronDown, PencilLine,
  PlusCircle, Trash2, Download, FileSpreadsheet, Mail,
  CheckCircle, AlertCircle, X, Send, Clock, Users, ShoppingCart
} from 'lucide-react';
import axios from 'axios';
import './UrunSatis.css';

import { toast, ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import html2canvas from "html2canvas"

// Excel ve PDF export için gerekli kütüphaneler (CDN'den yüklenecek)
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

// Email gönderimi için API fonksiyonu
const sendEmailNotification = async (satisId) => {
  try {
    const response = await axios.post(`http://31.57.33.249:3001/api/urun-satis/${satisId}/send-notification`);
    return response.data;
	document.title = 'Ürün Satış Yönetimi';
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Email Confirmation Modal Komponenti
const EmailConfirmationModal = ({ isOpen, onClose, onConfirm, satisData, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="urun-satis-modal mail-confirmation-modal">
      <div className="urun-satis-modal-content">
        <div className="mail-confirmation-content">
          <div className="mail-icon">
            <Mail />
          </div>
          <h3>Email Bildirimi Gönder</h3>
          <p>
            <strong>{satisData?.sirketAdi}</strong> firmasına{' '}
            <strong>#{satisData?.satisNo}</strong> numaralı satış için email bildirimi göndermek istiyor musunuz?
          </p>
          {satisData?.sirketEmailler && satisData.sirketEmailler.length > 0 && (
            <div className="email-list">
              <p><strong>Gönderilecek Email Adresleri:</strong></p>
              <ul>
                {satisData.sirketEmailler.map((emailObj, index) => (
                  <li key={index}>{emailObj.email}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="urun-satis-modal-actions">
          <button
            className="urun-satis-btn urun-satis-btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            <X size={16} />
            İptal
          </button>
          <button
            className="urun-satis-btn urun-satis-btn-success"
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

// Ürün Satış ana bileşeni
function UrunSatis() {
  const API_BASE_URL_SATIS = 'http://31.57.33.249:3001/api/urun-satis';
  const API_BASE_URL_SIRKET = 'http://31.57.33.249:3001/api/sirketler';

  // State'ler
  const [viewMode, setViewMode] = useState('list');
  const [satislar, setSatislar] = useState([]);
  const [sirketler, setSirketler] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [selectedSirketCurrency, setSelectedSirketCurrency] = useState('TL');

  // Filtreleme state'i
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    firma: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('hepsi');
  const [searchFieldDropdownOpen, setSearchFieldDropdownOpen] = useState(false);

  // Form state'i
  const initialFormData = {
    sirketId: '',
    satisTarihi: new Date().toISOString().split('T')[0],
    urunler: [{ urunAdi: '', aciklama: '', adet: '', birimFiyat: '' }],
    satisNo: null,
  };
  const [formData, setFormData] = useState(initialFormData);
  const [isDirty, setIsDirty] = useState(false);
  const formRef = useRef();

  // Seçili satışı görüntüleme
  const [selectedSatis, setSelectedSatis] = useState(null);

  // Modalların state'leri
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [satisToDelete, setSatisToDelete] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [emailConfirmationModal, setEmailConfirmationModal] = useState({
    isOpen: false,
    satisData: null
  });
  const [savedSatis, setSavedSatis] = useState(null);
  const [isEmailSending, setIsEmailSending] = useState(false);

  // Export states
  const [isExporting, setIsExporting] = useState(false);

  // ---- HELPERS ----
  useEffect(() => {
    if (formData.sirketId && sirketler.length > 0) {
      const selectedSirket = sirketler.find(s => s._id === formData.sirketId);
      if (selectedSirket) {
        setSelectedSirketCurrency(selectedSirket.sirketCariBirimi || 'TL');
      }
    }
  }, [formData.sirketId, sirketler]);

  const formatCurrency = (amount, currencyCode = selectedSirketCurrency) => {
    const code = currencyCode || 'TL';
    const currencySymbol = code === 'USD' ? '$' : code === 'EUR' ? '€' : '₺';

    if (isNaN(amount) || amount === null) return `0,00 ${currencySymbol}`;

    return new Intl.NumberFormat('tr-TR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currencySymbol}`;
  };

  // Yükleme işlemleri
  useEffect(() => {
    fetchData();
    loadExternalScripts().then(() => {
      setScriptsLoaded(true);
    });
  }, []);

  const fetchData = async () => {
    try {
      const [satisRes, sirketRes] = await Promise.all([
        axios.get(API_BASE_URL_SATIS),
        axios.get(API_BASE_URL_SIRKET),
      ]);

      setSatislar(satisRes.data || []);
      setSirketler(sirketRes.data || []);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      toast.error('Veriler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtreleme işlemleri
  const filteredSatislar = Array.isArray(satislar)
    ? satislar.filter((satis) => {
      const matchesSearch = searchField === 'hepsi'
        ? Object.values(satis).some(value =>
          String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        : searchField === 'satisNo'
          ? String(satis.satisNo || '').toLowerCase().includes(searchTerm.toLowerCase())
          : searchField === 'firma'
            ? String(satis.sirketAdi || '').toLowerCase().includes(searchTerm.toLowerCase())
            : true;

      const matchesFilters = activeFilters.firma.length === 0 ||
        activeFilters.firma.includes(satis.sirketAdi);

      return matchesSearch && matchesFilters;
    })
    : [];

// TÜM SATIŞLAR İÇİN PDF EXPORT (Ana Sayfa)
const exportAllSalesToPDF = async () => {
  setIsExporting(true);
  try {
    // Toplam istatistikler hesapla
    const toplamSatisSayisi = filteredSatislar.length;
    const emailGonderilenler = filteredSatislar.filter(s => s.emailGonderildi).length;
    
    // Para birimine göre gruplama ve toplam hesaplama
    const tutarlarByBirim = {};
    filteredSatislar.forEach(s => {
      const birim = s.sirketCariBirimi || 'TL';
      if (!tutarlarByBirim[birim]) {
        tutarlarByBirim[birim] = 0;
      }
      tutarlarByBirim[birim] += parseFloat(s.toplamTutar) || 0;
    });

    // Modern, minimal HTML içeriği oluştur
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '800px';
    pdfContainer.style.padding = '32px 40px';
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    
    pdfContainer.innerHTML = `
      <!-- Header -->
      <div style="border-bottom: 3px solid #1d1d1f; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 28px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px; margin-bottom: 4px;">Tüm Satışlar Raporu</div>
            <div style="font-size: 13px; color: #86868b; font-weight: 500;">Bozkurtsan Deri</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #86868b; margin-bottom: 2px;">RAPOR TARİHİ</div>
            <div style="font-size: 16px; font-weight: 600; color: #1d1d1f;">${new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>
      </div>

      <!-- İstatistikler -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="padding: 16px; background: #f5f5f7; border-radius: 8px;">
          <div style="font-size: 10px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Toplam Satış</div>
          <div style="font-size: 24px; font-weight: 700; color: #1d1d1f;">${toplamSatisSayisi}</div>
        </div>
        <div style="padding: 16px; background: #f5f5f7; border-radius: 8px;">
          <div style="font-size: 10px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Email Gönderildi</div>
          <div style="font-size: 24px; font-weight: 700; color: #34c759;">${emailGonderilenler}</div>
        </div>
        <div style="padding: 16px; background: #f5f5f7; border-radius: 8px;">
          <div style="font-size: 10px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Email Bekliyor</div>
          <div style="font-size: 24px; font-weight: 700; color: #ff9500;">${toplamSatisSayisi - emailGonderilenler}</div>
        </div>
      </div>

      <!-- Toplam Tutarlar -->
      <div style="margin-bottom: 24px; padding: 16px; background: #f5f5f7; border-radius: 8px;">
        <div style="font-size: 11px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Toplam Ciro</div>
        ${Object.entries(tutarlarByBirim).map(([birim, tutar]) => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 13px; color: #1d1d1f; font-weight: 500;">${birim}:</span>
            <span style="font-size: 16px; font-weight: 700; color: #1d1d1f;">${tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${birim === 'USD' ? '$' : birim === 'EUR' ? '€' : '₺'}</span>
          </div>
        `).join('')}
      </div>

      <!-- Satışlar Tablosu -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Satış Detayları</div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #d2d2d7;">
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Satış No</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Tarih</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Firma</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Tutar</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Email</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSatislar.map((satis, index) => `
              <tr style="border-bottom: 1px solid #f5f5f7;">
                <td style="padding: 10px 4px; font-size: 12px; font-weight: 600; color: #1d1d1f;">#${satis.satisNo}</td>
                <td style="padding: 10px 4px; font-size: 11px; color: #86868b;">${satis.satisTarihi ? new Date(satis.satisTarihi).toLocaleDateString('tr-TR') : '-'}</td>
                <td style="padding: 10px 4px; font-size: 12px; font-weight: 500; color: #1d1d1f;">${satis.sirketAdi || 'Bilinmiyor'}</td>
                <td style="padding: 10px 4px; font-size: 12px; font-weight: 600; color: #1d1d1f; text-align: right;">${parseFloat(satis.toplamTutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${(satis.sirketCariBirimi === 'USD' ? '$' : satis.sirketCariBirimi === 'EUR' ? '€' : '₺')}</td>
                <td style="padding: 10px 4px; font-size: 11px; text-align: center;">
                  ${satis.emailGonderildi ? 
                    '<span style="color: #34c759; font-weight: 600;">✓ Gönderildi</span>' : 
                    '<span style="color: #ff9500; font-weight: 600;">○ Bekliyor</span>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d2d2d7; text-align: center;">
        <div style="font-size: 10px; color: #86868b;">Bozkurtsan Deri © ${new Date().getFullYear()} • Bu rapor ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</div>
      </div>
    `;

    // Container'ı DOM'a ekle
    document.body.appendChild(pdfContainer);

    // html2canvas ile görüntüyü oluştur
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });

    // Container'ı DOM'dan kaldır
    document.body.removeChild(pdfContainer);

    // Canvas'ı PDF'e dönüştür
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // İlk sayfa
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Eğer içerik birden fazla sayfaya yayılıyorsa
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // PDF'i indir
    const fileName = `Tum_Satislar_Raporu_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    toast.success('Tüm satışlar raporu başarıyla indirildi!');

  } catch (error) {
    console.error('PDF export hatası:', error);
    toast.error('PDF dosyası oluşturulurken hata oluştu.');
  } finally {
    setIsExporting(false);
  }
};

// TEK SATIŞ İÇİN PDF EXPORT (Detay Sayfası)
const exportToPDF = async (satis) => {
  setIsExporting(true);
  try {
    // Modern, minimal HTML içeriği oluştur (Apple tarzı)
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '800px';
    pdfContainer.style.padding = '32px 40px';
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    
    pdfContainer.innerHTML = `
      <!-- Header -->
      <div style="border-bottom: 3px solid #1d1d1f; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 28px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px; margin-bottom: 4px;">Satış Fişi</div>
            <div style="font-size: 13px; color: #86868b; font-weight: 500;">Bozkurtsan Deri</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #86868b; margin-bottom: 2px;">SATIŞ NO</div>
            <div style="font-size: 20px; font-weight: 600; color: #1d1d1f;">#${satis.satisNo}</div>
          </div>
        </div>
      </div>

      <!-- Info Grid -->
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px; margin-bottom: 20px; padding: 16px; background: #f5f5f7; border-radius: 8px;">
        <div>
          <div style="font-size: 10px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Alıcı</div>
          <div style="font-size: 15px; font-weight: 600; color: #1d1d1f;">${satis.sirketAdi}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Tarih</div>
          <div style="font-size: 13px; font-weight: 500; color: #1d1d1f;">${satis.satisTarihi ? new Date(satis.satisTarihi).toLocaleDateString('tr-TR') : '-'}</div>
        </div>
        <div>
          <div style="font-size: 10px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Para Birimi</div>
          <div style="font-size: 13px; font-weight: 500; color: #1d1d1f;">${satis.sirketCariBirimi || 'TL'}</div>
        </div>
      </div>

      <!-- Products Table -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Ürün Detayları</div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #d2d2d7;">
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Ürün</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Açıklama</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Adet</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Birim Fiyat</th>
              <th style="padding: 8px 4px; color: #1d1d1f; font-size: 10px; font-weight: 600; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${(satis.urunler || []).map((urun, index) => {
              const toplam = (parseFloat(urun.adet) || 0) * (parseFloat(urun.birimFiyat) || 0);
              return `
                <tr style="border-bottom: 1px solid #f5f5f7;">
                  <td style="padding: 10px 4px; font-size: 12px; font-weight: 500; color: #1d1d1f;">${urun.urunAdi || ''}</td>
                  <td style="padding: 10px 4px; font-size: 11px; color: #86868b;">${urun.aciklama || '-'}</td>
                  <td style="padding: 10px 4px; font-size: 12px; font-weight: 500; color: #1d1d1f; text-align: center;">${urun.adet || 0}</td>
                  <td style="padding: 10px 4px; font-size: 12px; font-weight: 500; color: #1d1d1f; text-align: right;">${parseFloat(urun.birimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="padding: 10px 4px; font-size: 12px; font-weight: 600; color: #1d1d1f; text-align: right;">${toplam.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #d2d2d7;">
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; color: #86868b; margin-right: 24px;">Ara Toplam</span>
          <span style="font-size: 13px; font-weight: 500; color: #1d1d1f; min-width: 120px; text-align: right;">${parseFloat(satis.toplamTutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${satis.sirketCariBirimi || 'TL'}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; align-items: center; padding: 12px 0; background: #f5f5f7; border-radius: 6px;">
          <span style="font-size: 14px; font-weight: 600; color: #1d1d1f; margin-right: 24px; padding-right: 12px;">Toplam</span>
          <span style="font-size: 18px; font-weight: 700; color: #1d1d1f; min-width: 120px; text-align: right; padding-right: 12px;">${parseFloat(satis.toplamTutar || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${satis.sirketCariBirimi || 'TL'}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #d2d2d7; text-align: center;">
        <div style="font-size: 10px; color: #86868b;">${new Date().toLocaleDateString('tr-TR')} • Bozkurtsan Deri © 2025</div>
      </div>
    `;

    // Container'ı DOM'a ekle
    document.body.appendChild(pdfContainer);

    // html2canvas ile görüntüyü oluştur
    const canvas = await html2canvas(pdfContainer, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });

    // Container'ı DOM'dan kaldır
    document.body.removeChild(pdfContainer);

    // Canvas'ı PDF'e dönüştür
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Eğer içerik tek sayfadan büyükse küçült
    if (imgHeight > pageHeight) {
      imgHeight = pageHeight - 10; // 10mm margin
      const imgWidthScaled = (canvas.width * imgHeight) / canvas.height;
      const xOffset = (imgWidth - imgWidthScaled) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, 5, imgWidthScaled, imgHeight);
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }
    
    // PDF'i indir
    const fileName = `Satis_${satis.satisNo}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    toast.success('PDF başarıyla indirildi!');

  } catch (error) {
    console.error('PDF export hatası:', error);
    toast.error('PDF dosyası oluşturulurken hata oluştu.');
  } finally {
    setIsExporting(false);
  }
};

  // Form işlemleri
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

  // Email gönderimi fonksiyonları
  const handleEmailConfirmation = (satisData) => {
    setEmailConfirmationModal({
      isOpen: true,
      satisData
    });
  };

  const handleSendEmail = async (satisId) => {
    setIsEmailSending(true);
    try {
      const result = await sendEmailNotification(satisId);
      toast.success(`Email başarıyla gönderildi! (${result.sentTo.length} alıcı)`);

      // Satış listesini güncelle (email gönderildi olarak işaretle)
      setSatislar(prev =>
        prev.map(s =>
          s._id === satisId
            ? { ...s, emailGonderildi: true, emailGonderimTarihi: new Date() }
            : s
        )
      );

      setEmailConfirmationModal({ isOpen: false, satisData: null });
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
      // Kontroller
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

      if (formData.satisTarihi > new Date().toISOString().split('T')[0]) {
        toast.error('Satış tarihi bugünden ileri bir tarih olamaz.');
        return;
      }

      // Seçili şirketi bul
      const selectedSirket = sirketler.find(s => s._id === formData.sirketId);
      if (!selectedSirket) {
        toast.error('Geçersiz şirket seçimi.');
        return;
      }

      // Toplam tutarı hesapla
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
        sirketCariBirimi: selectedSirket.sirketCariBirimi || 'TL'
      };

      let savedData;
      if (viewMode === 'edit' && selectedSatis?._id) {
        const { satisNo, ...updatePayload } = payload;
        const response = await axios.put(`${API_BASE_URL_SATIS}/${selectedSatis._id}`, updatePayload);
        savedData = response.data.satis;
        toast.success('Satış başarıyla güncellendi!');
      } else {
        const { satisNo, ...newPayload } = payload;
        const response = await axios.post(API_BASE_URL_SATIS, newPayload);
        savedData = response.data.satis;
        toast.success('Satış başarıyla eklendi!');

        // Yeni satış için email gönderimi sorulsun
        handleEmailConfirmation(savedData);
      }

      // Listeyi güncelle
      await fetchData();

      // Form temizle ve liste görünümüne dön
      setFormData(initialFormData);
      setIsDirty(false);
      setViewMode('list');
      setSelectedSatis(null);
      setSavedSatis(savedData);

    } catch (err) {
      console.error('Kayıt hatası:', err);
      toast.error(err.response?.data?.msg || 'Satış kaydedilirken bir hata oluştu.');
    }
  };

  // Silme işlemi
  const handleDelete = async () => {
    if (!satisToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL_SATIS}/${satisToDelete._id}`);
      toast.success('Satış başarıyla silindi!');
      await fetchData();
      setDeleteModalOpen(false);
      setSatisToDelete(null);
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Satış silinirken bir hata oluştu.');
    }
  };

  // View işlemleri
  const handleEdit = (satis) => {
    setFormData({
      sirketId: satis.sirketId,
      satisTarihi: satis.satisTarihi ? new Date(satis.satisTarihi).toISOString().split('T')[0] : '',
      urunler: satis.urunler || [{ urunAdi: '', aciklama: '', adet: '', birimFiyat: '' }],
      satisNo: satis.satisNo,
    });
    setSelectedSatis(satis);
    setViewMode('edit');
    setIsDirty(false);
  };

  const handleView = (satis) => {
    setSelectedSatis(satis);
    setViewModalOpen(true);
  };

  const searchFieldOptions = [
    { value: 'hepsi', label: 'Hepsinde Ara' },
    { value: 'satisNo', label: 'Satış No' },
    { value: 'firma', label: 'Firma Adı' },
  ];

  // Render
  return (
    <div className="urun-satis-container">
      {/* Header */}
      <div className="urun-satis-header">
        <div className="urun-satis-title-container">
          <h1>Ürün Satış Yönetimi</h1>
          <p>Ürün satış kayıtlarını görüntüleyin, ekleyin ve yönetin</p>
        </div>
        <div className="urun-satis-actions">
          {viewMode === 'list' && (
            <>
              <button
                className="urun-satis-btn urun-satis-btn-primary"
                onClick={() => setViewMode('add')}
              >
                <ShoppingCart size={20} />
                Yeni Satış
              </button>
              <button
                className="urun-satis-btn urun-satis-btn-success"
                onClick={exportAllSalesToPDF}
                disabled={isExporting || !scriptsLoaded || filteredSatislar.length === 0}
              >
                {isExporting ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <Download size={16} />
                )}
                Tüm Satışlar
              </button>
            </>
          )}
          {(viewMode === 'add' || viewMode === 'edit') && (
            <button
              className="urun-satis-btn urun-satis-btn-secondary"
              onClick={() => {
                if (isDirty) {
                  if (window.confirm('Değişiklikler kaybedilecek. Devam etmek istiyor musunuz?')) {
                    setViewMode('list');
                    setSelectedSatis(null);
                    setFormData(initialFormData);
                    setIsDirty(false);
                  }
                } else {
                  setViewMode('list');
                  setSelectedSatis(null);
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

      {/* Ana İçerik */}
      {isLoading ? (
        <div className="loading-container" style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', margin: '0 auto 20px' }}></div>
          <p>Veriler yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Liste Görünümü */}
          {viewMode === 'list' && (
            <div className="urun-satis-list-view">
              {/* Arama ve Filtreleme */}
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
              </div>

              {/* Tablo */}
              <div className="urun-satis-table-container">
                {filteredSatislar.length > 0 ? (
                  <table className="urun-satis-table">
                    <thead>
                      <tr>
                        <th>Satış No</th>
                        <th>Tarih</th>
                        <th>Firma</th>
                        <th>Toplam Tutar</th>
                        <th>Email Durumu</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSatislar.map((satis) => (
                        <tr key={satis._id}>
                          <td>#{satis.satisNo}</td>
                          <td>
                            {satis.satisTarihi
                              ? new Date(satis.satisTarihi).toLocaleDateString('tr-TR')
                              : '-'
                            }
                          </td>
                          <td>{satis.sirketAdi || 'Bilinmiyor'}</td>
                          <td>{formatCurrency(satis.toplamTutar, satis.sirketCariBirimi)}</td>
                          <td>
                            {satis.emailGonderildi ? (
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
                          <td className="urun-satis-actions-cell">
                            <button
                              onClick={() => handleView(satis)}
                              title="Görüntüle"
                            >
                              <FileText size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(satis)}
                              title="Düzenle"
                            >
                              <PencilLine size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSatisToDelete(satis);
                                setDeleteModalOpen(true);
                              }}
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                            {!satis.emailGonderildi && (
                              <button
                                onClick={() => handleEmailConfirmation(satis)}
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
                    <ShoppingCart size={48} />
                    <p>Ürün satışı bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Görünümü */}
          {(viewMode === 'add' || viewMode === 'edit') && (
            <div className="urun-satis-form-view">
              <h3>{viewMode === 'edit' ? 'Satış Düzenle' : 'Yeni Satış Ekle'}</h3>

              <form className="urun-satis-form" onSubmit={handleSave} ref={formRef}>
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="sirketId">Firma *</label>
                    <select
                      id="sirketId"
                      name="sirketId"
                      value={formData.sirketId}
                      onChange={handleFormChange}
                      className="form-control"
                      required
                    >
                      <option value="">Firma seçin...</option>
                      {sirketler.map((sirket) => (
                        <option key={sirket._id} value={sirket._id}>
                          {sirket.sirketAdi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="satisTarihi">Satış Tarihi *</label>
                    <input
                      type="date"
                      id="satisTarihi"
                      name="satisTarihi"
                      value={formData.satisTarihi}
                      onChange={handleFormChange}
                      className="form-control"
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                {/* Ürün Listesi */}
                <div className="urun-list-container">
                  <h3>Satılan Ürünler</h3>

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
                      className="urun-satis-btn urun-satis-btn-secondary"
                    >
                      <PlusCircle size={16} />
                      Ürün Ekle
                    </button>
                  </div>
                </div>

                {/* Toplam Tutar */}
                <div className="total-summary">
                  <div className="total-row">
                    <span>Toplam Tutar:</span>
                    <span className="total-amount">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                {/* Form Butonları */}
                <div className="form-actions">
                  <button
                    type="button"
                    className="urun-satis-btn urun-satis-btn-secondary"
                    onClick={() => {
                      if (isDirty) {
                        if (window.confirm('Değişiklikler kaybedilecek. Devam etmek istiyor musunuz?')) {
                          setViewMode('list');
                          setSelectedSatis(null);
                          setFormData(initialFormData);
                          setIsDirty(false);
                        }
                      } else {
                        setViewMode('list');
                        setSelectedSatis(null);
                        setFormData(initialFormData);
                      }
                    }}
                  >
                    <X size={16} />
                    İptal
                  </button>

                  <button
                    type="submit"
                    className="urun-satis-btn urun-satis-btn-success"
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

      {/* Görüntüleme Modal */}
      {viewModalOpen && selectedSatis && (
        <div className="urun-satis-modal">
          <div className="urun-satis-modal-content view-modal">
            <div className="urun-satis-modal-header">
              <h3>Satış Detayları - #{selectedSatis.satisNo}</h3>
              <button onClick={() => setViewModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="urun-satis-modal-body">
              <div className="view-details">
                <div className="detail-group">
                  <label>Firma:</label>
                  <span>{selectedSatis.sirketAdi}</span>
                </div>

                <div className="detail-group">
                  <label>Satış Tarihi:</label>
                  <span>
                    {selectedSatis.satisTarihi
                      ? new Date(selectedSatis.satisTarihi).toLocaleDateString('tr-TR')
                      : '-'
                    }
                  </span>
                </div>

                <div className="detail-group">
                  <label>Email Durumu:</label>
                  <span>
                    {selectedSatis.emailGonderildi ? (
                      <span className="status-badge sent">
                        <CheckCircle size={14} />
                        Gönderildi
                        {selectedSatis.emailGonderimTarihi && (
                          <small>
                            ({new Date(selectedSatis.emailGonderimTarihi).toLocaleDateString('tr-TR')})
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
                  <label>Satılan Ürünler:</label>
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
                        {(selectedSatis.urunler || []).map((urun, index) => (
                          <tr key={index}>
                            <td>{urun.urunAdi}</td>
                            <td>{urun.aciklama || '-'}</td>
                            <td>{urun.adet}</td>
                            <td>{formatCurrency(urun.birimFiyat, selectedSatis.sirketCariBirimi)}</td>
                            <td>{formatCurrency(urun.adet * urun.birimFiyat, selectedSatis.sirketCariBirimi)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan="4"><strong>Genel Toplam:</strong></td>
                          <td><strong>{formatCurrency(selectedSatis.toplamTutar, selectedSatis.sirketCariBirimi)}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="urun-satis-modal-actions">
              <button
                className="urun-satis-btn urun-satis-btn-secondary"
                onClick={() => setViewModalOpen(false)}
              >
                <X size={16} />
                Kapat
              </button>
              <button
                className="urun-satis-btn urun-satis-btn-success"
                onClick={async() => await exportToPDF(selectedSatis)}
                disabled={isExporting || !scriptsLoaded}
              >
                {isExporting ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <FileSpreadsheet size={16} />
                )}
              PDF
              </button>
              <button
                className="urun-satis-btn urun-satis-btn-primary"
                onClick={() => {
                  setViewModalOpen(false);
                  handleEdit(selectedSatis);
                }}
              >
                <PencilLine size={16} />
                Düzenle
              </button>

              {!selectedSatis.emailGonderildi && (
                <button
                  className="urun-satis-btn urun-satis-btn-info"
                  onClick={() => {
                    setViewModalOpen(false);
                    handleEmailConfirmation(selectedSatis);
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

      {/* Silme Confirmation Modal */}
      {deleteModalOpen && (
        <div className="urun-satis-modal">
          <div className="urun-satis-modal-content">
            <div className="urun-satis-modal-header">
              <h3>Satış Kaydını Sil</h3>
            </div>

            <div className="urun-satis-modal-body">
              <div className="delete-confirmation">
                <AlertCircle size={48} color="#dc3545" />
                <p>
                  <strong>#{satisToDelete?.satisNo}</strong> numaralı satış kaydını silmek istediğinizden emin misiniz?
                </p>
                <p className="warning-text">Bu işlem geri alınamaz!</p>
              </div>
            </div>

            <div className="urun-satis-modal-actions">
              <button
                className="urun-satis-btn urun-satis-btn-secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSatisToDelete(null);
                }}
              >
                <X size={16} />
                İptal
              </button>

              <button
                className="urun-satis-btn urun-satis-btn-danger"
                onClick={handleDelete}
              >
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Modal */}
      <EmailConfirmationModal
        isOpen={emailConfirmationModal.isOpen}
        onClose={() => setEmailConfirmationModal({ isOpen: false, satisData: null })}
        onConfirm={() => handleSendEmail(emailConfirmationModal.satisData._id)}
        satisData={emailConfirmationModal.satisData}
        isLoading={isEmailSending}
      />

      {/* Toast Container */}
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

export default UrunSatis;