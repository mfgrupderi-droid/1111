import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Iscilik.new.css';
import Modal from './Modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API = 'http://31.57.33.249:3001/api/iscilikler';

function Iscilik() {
  
  const [contractors, setContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  
  const [statement, setStatement] = useState([]);
  const [modelPrices, setModelPrices] = useState([]);

  
  const [newContractor, setNewContractor] = useState({ name: '', currency: 'TL', openingDebt: 0 });
  const [showContractorModal, setShowContractorModal] = useState(false);

  
  const [newModelPrice, setNewModelPrice] = useState({ model: '', price: '', currency: 'TL' });
  const [showModelPriceModal, setShowModelPriceModal] = useState(false);

  
  const [newProducts, setNewProducts] = useState([{ model: '', quantity: '', note: '', price: '' }]);

  
  const [payment, setPayment] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], note: '' });

  
  const [editingContractor, setEditingContractor] = useState(null);
  const [editingModelPrice, setEditingModelPrice] = useState(null);
  const [editingStatement, setEditingStatement] = useState(null);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    setIsLoading(true);
    const res = await axios.get(API + '/contractors');
    setContractors(res.data.data);
    setIsLoading(false);
  };

  const handleContractorClick = async (contractor) => {
    setSelectedContractor(contractor);
    
    const statementRes = await axios.get(`${API}/statement/${contractor._id}`);
    setStatement(statementRes.data.data);
    const mpRes = await axios.get(`${API}/model-prices/${contractor._id}`);
    setModelPrices(mpRes.data.data);
  };

  const handleAddContractor = async () => {
    await axios.post(API + '/contractor', newContractor);
    setShowContractorModal(false);
    setNewContractor({ name: '', currency: 'TL', openingDebt: 0 });
    fetchContractors();
  };

  const handleAddModelPrice = async () => {
    if (!selectedContractor || !selectedContractor._id) {
      toast.error('Lütfen önce bir fasoncu seçin');
      return;
    }
    try {
      if (!newModelPrice.model || !newModelPrice.price) {
        toast.error('Model ve fiyat giriniz');
        return;
      }
      await axios.post(API + '/model-prices', { ...newModelPrice, contractorId: selectedContractor._id });
      setNewModelPrice({ model: '', price: '', currency: 'TL' });
      const mpRes = await axios.get(`${API}/model-prices/${selectedContractor._id}`);
      setModelPrices(mpRes.data.data);
      toast.success('Model fiyatı eklendi');
    } catch (err) {
      console.error(err);
      toast.error('Model fiyatı eklenirken hata');
    }
  };

  const handleAddProduct = async () => {
    if (!selectedContractor || !selectedContractor._id) {
      toast.error('Lütfen önce bir fasoncu seçin');
      return;
    }
    try {
      
      for (const p of newProducts) {
        if (!p.model || !p.quantity) {
          toast.error('Ürün için model ve adet giriniz');
          return;
        }
      }
      for (const product of newProducts) {
        await axios.post(API + '/product', { ...product, contractorId: selectedContractor._id, deliveryDate: new Date().toISOString() });
      }
      setNewProducts([{ model: '', quantity: '', note: '', price: '' }]);
      const statementRes = await axios.get(`${API}/statement/${selectedContractor._id}`);
      setStatement(statementRes.data.data);
      toast.success('Ürünler eklendi');
    } catch (err) {
      console.error(err);
      toast.error('Ürün eklenirken hata');
    }
  };

  const handleAddPayment = async () => {
    if (!selectedContractor || !selectedContractor._id) {
      toast.error('Lütfen önce bir fasoncu seçin');
      return;
    }
    try {
      if (!payment.amount) {
        toast.error('Tutar giriniz');
        return;
      }
      await axios.post(API + '/payment', { ...payment, contractorId: selectedContractor._id, paymentDate: payment.paymentDate || new Date().toISOString() });
      setPayment({ amount: '', paymentDate: new Date().toISOString().split('T')[0], note: '' });
      const statementRes = await axios.get(`${API}/statement/${selectedContractor._id}`);
      setStatement(statementRes.data.data);
      toast.success('Ödeme kaydedildi');
    } catch (err) {
      console.error(err);
      toast.error('Ödeme eklenirken hata');
    }
  };

  
  const findId = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    
    if (obj._id) return obj._id;
    if (obj.id) return obj.id;
    if (obj.ID) return obj.ID;
    if (obj.uuid) return obj.uuid;
    if (obj.guid) return obj.guid;
    
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v)) return v;
    }
    return null;
  };

  const exportToExcel = (data, contractorName) => {
    
    const bom = '\uFEFF';
    const headerLines = [
      ['MF Grup Deri'],
      [`Fasoncu: ${contractorName}`],
      [`Oluşturulma: ${new Date().toLocaleString()}`],
      []
    ];
    const rows = [
      ['Tarih', 'Açıklama', 'Tutar', 'Bakiye Sonrası'],
      ...data.map(h => [
        new Date(h.date).toLocaleDateString(),
        (h.description || '').replace(/"/g, '""'),
        (Number(h.amount) || 0).toLocaleString(),
        (Number(h.balanceAfter) || 0).toLocaleString()
      ])
    ];
    const all = [...headerLines, ...rows];
    const csv = all.map(r => r.map(v => `"${v ?? ''}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(bom + csv)}`;
    link.download = `${contractorName}_ekstre_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

const exportToPDF = async (data, contractorName) => {
  try {
    
    const { jsPDF } = window.jspdf ? { jsPDF: window.jspdf.jsPDF } : await import('jspdf');
    
    
    if (!jsPDF) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
      const { jsPDF } = window.jspdf;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    
    
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 120, 'F');

    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text('MF GRUP DERI', margin, 60);

    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('FASONCU EKSTRESI', margin, 80);

    
    const safeContractorName = contractorName
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[şŞ]/g, 's')
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[çÇ]/g, 'c')
      .substring(0, 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(safeContractorName, margin, 100);

    
    const metaX = pageWidth - margin - 150;

    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Tarih:', metaX, 60);

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${
      (today.getMonth() + 1).toString().padStart(2, '0')
    }.${today.getFullYear()}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(dateStr, metaX + 50, 60);

    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Bakiye:', metaX, 80);

    const finalBalance = data && data.length > 0 ? 
      (data[data.length - 1].balanceAfter || 0) : 0;
    
    const balanceText = finalBalance !== 0 ? 
      `${finalBalance >= 0 ? '' : '-'}${Math.abs(finalBalance).toLocaleString('tr-TR')} TL` : 
      '0 TL';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(balanceText, metaX + 50, 80);

    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1);
    doc.line(margin, 130, pageWidth - margin, 130);

    
    const tableData = [];
    let totalAmount = 0;

    
    data.forEach((item, index) => {
      const amount = Number(item.amount) || 0;
      const balance = Number(item.balanceAfter) || 0;
      totalAmount += amount;

      
      let dateFormatted = '';
      try {
        const dateObj = new Date(item.date);
        dateFormatted = isNaN(dateObj.getTime()) ? 
          item.date : 
          `${dateObj.getDate().toString().padStart(2, '0')}.${
            (dateObj.getMonth() + 1).toString().padStart(2, '0')
          }.${dateObj.getFullYear()}`;
      } catch (e) {
        dateFormatted = item.date || '';
      }

      
      let description = item.description || '';
      description = description
        .replace(/[ğĞ]/g, 'g')
        .replace(/[üÜ]/g, 'u')
        .replace(/[şŞ]/g, 's')
        .replace(/[ıİ]/g, 'i')
        .replace(/[öÖ]/g, 'o')
        .replace(/[çÇ]/g, 'c')
        .substring(0, 50);

      tableData.push([
        dateFormatted,
        description,
        `${amount >= 0 ? '' : '-'}${Math.abs(amount).toLocaleString('tr-TR')} TL`,
        `${balance >= 0 ? '' : '-'}${Math.abs(balance).toLocaleString('tr-TR')} TL`
      ]);
    });

    
    
    const startY = 150;
    const colWidths = [80, 250, 90, 90];
    const rowHeight = 30;
    let currentY = startY;

    
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F');

    const headers = ['Tarih', 'Aciklama', 'Tutar', 'Bakiye'];
    headers.forEach((header, i) => {
      const x = margin + (i > 0 ? colWidths.slice(0, i).reduce((a, b) => a + b, 0) : 0);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(header, x + 10, currentY + 20);
    });

    currentY += rowHeight;

    
    tableData.forEach((row, rowIndex) => {
      
      if (rowIndex % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 250, 250);
      }
      
      doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight, 'F');

      
      row.forEach((cell, colIndex) => {
        const x = margin + (colIndex > 0 ? colWidths.slice(0, colIndex).reduce((a, b) => a + b, 0) : 0);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        
        if (colIndex === 2) {
          const amount = Number(data[rowIndex].amount) || 0;
          doc.setTextColor(amount < 0 ? [200, 0, 0] : [30, 30, 30]);
          doc.setFont('helvetica', amount < 0 ? 'bold' : 'normal');
        } else {
          doc.setTextColor(60, 60, 60);
        }

        
        const cellText = String(cell).length > 40 ? 
          String(cell).substring(0, 40) + '...' : 
          String(cell);
        
        doc.text(cellText, x + 10, currentY + 20);
      });

      
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

      currentY += rowHeight;

      
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = margin;
        
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(safeContractorName + ' - Devam', margin, 30);
      }
    });

    
    const summaryY = currentY + 40;

    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Toplam Islem Tutari:', margin, summaryY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(
      `${totalAmount >= 0 ? '' : '-'}${Math.abs(totalAmount).toLocaleString('tr-TR')} TL`,
      pageWidth - margin,
      summaryY,
      { align: 'right' }
    );

    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Net Bakiye:', margin, summaryY + 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(finalBalance >= 0 ? [0, 128, 0] : [200, 0, 0]);
    doc.text(
      balanceText,
      pageWidth - margin,
      summaryY + 25,
      { align: 'right' }
    );

    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1);
    doc.line(margin, summaryY + 45, pageWidth - margin, summaryY + 45);

    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Sayfa ${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    }

    
    const fileName = `${safeContractorName.replace(/[^a-zA-Z0-9]/g, '_')}_ekstre_${dateStr.replace(/\./g, '-')}.pdf`;
    doc.save(fileName);

    
    if (typeof toast !== 'undefined' && toast.success) {
      toast.success('PDF basariyla olusturuldu');
    } else {
      alert('PDF basariyla olusturuldu');
    }

  } catch (err) {
    console.error('PDF olusturma hatasi:', err);
    
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error('PDF olusturulamadi: ' + err.message);
    } else {
      alert('PDF olusturulamadi: ' + err.message);
    }
  }
};
  
  if (isLoading) return <div>Yükleniyor...</div>;

  return (
    <div className="iscilik-container">
      <ToastContainer />
      <h1>İşçilik Sistemi</h1>
      {}
      {!selectedContractor && (
        <div className="contractor-list">
          {contractors.map(c => (
            <div key={c._id} className="contractor-card">
              <div className="contractor-name">{c.name}</div>
              <div>Döviz: {c.currency}</div>
              <div>Bakiye: {c.balance}</div>
              <div className="contractor-actions">
                <button className="action-btn" onClick={() => handleContractorClick(c)}>Seç</button>
                <button className="edit-btn" onClick={() => setEditingContractor(c)}>Düzenleme</button>
                <button className="delete-btn" onClick={async () => { await axios.delete(`${API}/contractor/${c._id}`); fetchContractors(); }}>Sil</button>
              </div>
            </div>
          ))}
          <button className="add-contractor-btn" onClick={() => setShowContractorModal(true)}>+ Fasoncu Ekle</button>
        </div>
      )}

      {}
      {selectedContractor && (
        <div className="contractor-panel">
          <div className="panel-header">
            <button className="back-btn" onClick={() => setSelectedContractor(null)}>← Geri</button>
            <h2>{selectedContractor.name} ({selectedContractor.currency})</h2>
            <div className="panel-actions">
              <button className="edit-btn" onClick={() => setEditingContractor(selectedContractor)}>Düzenleme</button>
              <button className="delete-btn" onClick={async () => { await axios.delete(`${API}/contractor/${selectedContractor._id}`); setSelectedContractor(null); fetchContractors(); }}>Sil</button>
            </div>
          </div>
          <div>Bakiye: {selectedContractor.balance}</div>

          {}
          <div className="action-buttons-section">
            <button className="action-button" onClick={() => { setNewModelPrice({ model: '', price: '', currency: selectedContractor.currency }); setShowModelPriceModal(true); }}>Model Fiyatları</button>
            <button className="action-button" onClick={() => { setNewProducts([{ model: '', quantity: '', note: '', price: '' }]); setShowProductModal(true); }}>Ürün Ekle</button>
            <button className="action-button" onClick={() => { setPayment({ amount: '', paymentDate: new Date().toISOString().split('T')[0], note: '' }); setShowPaymentModal(true); }}>Ödeme Ekle</button>
            <button className="export-btn export-excel" onClick={() => exportToExcel(statement, selectedContractor.name)}>📊 Excel'e Aktar</button>
            <button className="export-btn export-pdf" onClick={() => exportToPDF(statement, selectedContractor.name)}>📄 PDF'e Aktar</button>
          </div>

          {}
          <div className="statement-section">
            <h3>Ekstre</h3>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th>Tutar</th>
                  <th>Bakiye Sonrası</th>
                  <th>????lem</th>
                </tr>
              </thead>
              <tbody>
                {statement.map((h, idx) => (
                  <tr key={idx}>
                    <td>{new Date(h.date).toLocaleDateString()}</td>
                    <td>{h.description}</td>
                    <td style={{ color: h.type === 'Payment' ? 'green' : 'black' }}>{h.amount}</td>
                    <td>{h.balanceAfter}</td>
                          <td>
                            <button className="edit-btn" onClick={() => setEditingStatement(h)}>Düzenleme</button>
                            <button className="delete-btn" onClick={async () => {
                              try {
                                if (!selectedContractor || !selectedContractor._id) {
                                  toast.error('Fasoncu seçili değil');
                                  return;
                                }
                                const id = findId(h);
                                if (!id) {
                                  console.log('Silme denen satır (id yok):', h);
                                  toast.error('Silinecek işlem id bulunamadı — konsolu kontrol edin');
                                  return;
                                }
                                await axios.delete(`${API}/statement/${id}`);
                                
                                const res = await axios.get(`${API}/statement/${selectedContractor._id}`);
                                setStatement(res.data.data);
                                toast.success('İşlem silindi');
                              } catch (err) {
                                console.error(err);
                                toast.error('İşlem silinirken hata');
                              }
                            }}>Sil</button>
                          </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {}
      <Modal open={showModelPriceModal} onClose={() => setShowModelPriceModal(false)}>
        <h3>Model Fiyatları</h3>
        <div className="model-price-list">
          {modelPrices.map(mp => (
            <div key={mp._id} className="model-price-item">
              {mp.model}: {mp.price} {mp.currency}
              <button className="edit-btn" onClick={() => setEditingModelPrice(mp)}>Düzenleme</button>
              <button className="delete-btn" onClick={async () => {
                try {
                  await axios.delete(`${API}/model-prices/${mp._id}`);
                  setModelPrices(modelPrices.filter(m => m._id !== mp._id));
                  toast.success('Model fiyatı silindi');
                } catch (err) {
                  console.error(err);
                  toast.error('Model fiyatı silinirken hata');
                }
              }}>Sil</button>
            </div>
          ))}
        </div>
        <hr style={{ margin: '12px 0' }} />
        <h4>Yeni Model Fiyatı Ekle</h4>
        <input placeholder="Model" value={newModelPrice.model} onChange={e => setNewModelPrice({ ...newModelPrice, model: e.target.value })} />
        <input placeholder="Fiyat" type="number" value={newModelPrice.price} onChange={e => setNewModelPrice({ ...newModelPrice, price: e.target.value })} />
        <select value={newModelPrice.currency} onChange={e => setNewModelPrice({ ...newModelPrice, currency: e.target.value })}>
          <option value="TL">TL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
        <button className="add-btn" onClick={async () => { await handleAddModelPrice(); setNewModelPrice({ model: '', price: '', currency: selectedContractor?.currency || 'TL' }); }}>Ekle</button>
        <button className="close-btn" onClick={() => setShowModelPriceModal(false)}>Kapat</button>
      </Modal>

      {}
      <Modal open={showProductModal} onClose={() => setShowProductModal(false)}>
        <h3>Ürün Ekle</h3>
        <div className="product-rows">
          {newProducts.map((row, idx) => (
            <div key={idx} className="product-row">
              <input placeholder="Model" value={row.model} onChange={e => {
                const val = e.target.value;
                const arr = [...newProducts];
                arr[idx].model = val;
                
                const found = modelPrices.find(m => m.model && val && m.model.toLowerCase() === val.toLowerCase());
                if (found) arr[idx].price = found.price;
                setNewProducts(arr);
              }} />
              <input placeholder="Adet" type="number" value={row.quantity} onChange={e => { const arr = [...newProducts]; arr[idx].quantity = e.target.value; setNewProducts(arr); }} />
              <input placeholder="Fiyat" type="number" value={row.price} onChange={e => { const arr = [...newProducts]; arr[idx].price = e.target.value; setNewProducts(arr); }} />
              <input placeholder="Not" value={row.note} onChange={e => { const arr = [...newProducts]; arr[idx].note = e.target.value; setNewProducts(arr); }} />
              <button className="delete-row-btn" onClick={() => setNewProducts(newProducts.filter((_, i) => i !== idx))}>Sil</button>
            </div>
          ))}
        </div>
        <button className="add-row-btn" onClick={() => setNewProducts([...newProducts, { model: '', quantity: '', note: '', price: '' }])}>Satır Ekle</button>
        <button className="save-btn" onClick={async () => { await handleAddProduct(); setShowProductModal(false); }}>Kayıt Et</button>
        <button className="close-btn" onClick={() => setShowProductModal(false)}>Kapat</button>
      </Modal>

      {}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
        <h3>Ödeme Ekle</h3>
        <input placeholder="Tutar" type="number" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} />
        <input placeholder="Tarih" type="date" value={payment.paymentDate} onChange={e => setPayment({ ...payment, paymentDate: e.target.value })} />
        <input placeholder="Not" value={payment.note} onChange={e => setPayment({ ...payment, note: e.target.value })} />
        <button className="add-payment-btn" onClick={async () => { await handleAddPayment(); setShowPaymentModal(false); }}>Ödeme Ekle</button>
        <button className="close-btn" onClick={() => setShowPaymentModal(false)}>Kapat</button>
      </Modal>

      {}
      <Modal open={editingContractor !== null} onClose={() => setEditingContractor(null)}>
        <h3>Fasoncu Düzenle</h3>
        {editingContractor && (
          <>
            <input placeholder="Ad" value={editingContractor.name} onChange={e => setEditingContractor({ ...editingContractor, name: e.target.value })} />
            <select value={editingContractor.currency} onChange={e => setEditingContractor({ ...editingContractor, currency: e.target.value })}>
              <option value="TL">TL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <button className="add-btn" onClick={async () => {
              try {
                const res = await axios.put(`${API}/contractor/${editingContractor._id}`, editingContractor);
                await fetchContractors();
                
                setSelectedContractor(res.data?.data || editingContractor);
                setEditingContractor(null);
                toast.success('Fasoncu güncellendi');
              } catch (err) {
                console.error(err);
                toast.error('Fasoncu güncellenirken hata');
              }
            }}>Güncelle</button>
            <button className="close-btn" onClick={() => setEditingContractor(null)}>Kapat</button>
          </>
        )}
      </Modal>

      {}
      <Modal open={editingStatement !== null} onClose={() => setEditingStatement(null)}>
        <h3>İşlem Düzenle</h3>
        {editingStatement && (
          <>
            <input placeholder="Açıklama" value={editingStatement.description || ''} onChange={e => setEditingStatement({ ...editingStatement, description: e.target.value })} />
            <input placeholder="Tutar" type="number" value={editingStatement.amount || ''} onChange={e => setEditingStatement({ ...editingStatement, amount: e.target.value })} />
            <input placeholder="Tarih" type="date" value={editingStatement.date ? new Date(editingStatement.date).toISOString().split('T')[0] : ''} onChange={e => setEditingStatement({ ...editingStatement, date: e.target.value })} />
            <select value={editingStatement.type || 'Charge'} onChange={e => setEditingStatement({ ...editingStatement, type: e.target.value })}>
              <option value="Charge">Tahsilat</option>
              <option value="Payment">Ödeme</option>
            </select>
            <button className="add-btn" onClick={async () => {
              try {
                if (!selectedContractor || !selectedContractor._id) {
                  toast.error('Fasoncu seçili değil');
                  return;
                }
                const id = findId(editingStatement);
                if (!id) {
                  console.log('Güncelleme denen işlem (id yok):', editingStatement);
                  toast.error('Güncellenecek işlem id bulunamadı — konsolu kontrol edin');
                  return;
                }
                await axios.put(`${API}/statement/${id}`, editingStatement);
                const res = await axios.get(`${API}/statement/${selectedContractor._id}`);
                setStatement(res.data.data);
                setEditingStatement(null);
                toast.success('İşlem güncellendi');
              } catch (err) {
                console.error(err);
                toast.error('İşlem güncellenirken hata');
              }
            }}>Güncelle</button>
            <button className="close-btn" onClick={() => setEditingStatement(null)}>Kapat</button>
          </>
        )}
      </Modal>

      {}
      <Modal open={editingModelPrice !== null} onClose={() => setEditingModelPrice(null)}>
        <h3>Model Fiyatı Düzenle</h3>
        {editingModelPrice && (
          <>
            <input placeholder="Model" value={editingModelPrice.model} onChange={e => setEditingModelPrice({ ...editingModelPrice, model: e.target.value })} />
            <input placeholder="Fiyat" type="number" value={editingModelPrice.price} onChange={e => setEditingModelPrice({ ...editingModelPrice, price: e.target.value })} />
            <select value={editingModelPrice.currency} onChange={e => setEditingModelPrice({ ...editingModelPrice, currency: e.target.value })}>
              <option value="TL">TL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <button className="add-btn" onClick={async () => {
              try {
                await axios.put(`${API}/model-prices/${editingModelPrice._id}`, editingModelPrice);
                const mpRes = await axios.get(`${API}/model-prices/${selectedContractor._id}`);
                setModelPrices(mpRes.data.data);
                setEditingModelPrice(null);
                toast.success('Model fiyatı güncellendi');
              } catch (err) {
                console.error(err);
                toast.error('Model fiyatı güncellenirken hata');
              }
            }}>Güncelle</button>
            <button className="close-btn" onClick={() => setEditingModelPrice(null)}>Kapat</button>
          </>
        )}
      </Modal>

      {}
      {showContractorModal && (
        <div className="modal-bg">
          <div className="modal-content">
            <h2>Yeni Fasoncu</h2>
            <input placeholder="Ad" value={newContractor.name} onChange={e => setNewContractor({ ...newContractor, name: e.target.value })} />
            <select value={newContractor.currency} onChange={e => setNewContractor({ ...newContractor, currency: e.target.value })}>
              <option value="TL">TL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input placeholder="Açılış Borcu" type="number" value={newContractor.openingDebt} onChange={e => setNewContractor({ ...newContractor, openingDebt: e.target.value })} />
            <button className="add-btn" onClick={handleAddContractor}>Ekle</button>
            <button className="close-btn" onClick={() => setShowContractorModal(false)}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Iscilik;
