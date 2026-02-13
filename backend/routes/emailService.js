const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');


const createTransporter = () => {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,           
      secure: true,           
      auth: {
        user: "bzkmuhasebe@gmail.com",
        pass: "ivlb msnu udht rdeq" 

      }
    });
  };


const BEDENLER = [
  '3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL',
  '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', 'Özel'
];


const createPDF = (sevkiyat, sirket) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        layout: 'landscape'
      });

      const fileName = `sevkiyat_${sevkiyat.sevkiyatNo}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../temp', fileName);

      
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.font(path.join(__dirname, '../fonts/Akrobat-Regular.otf'));
      
      doc.fontSize(16)
         .fillColor('#4f46e5')
         .text('SEVKİYAT BİLGİLENDİRMESİ', { align: 'center' });
      
      doc.moveDown(1);

      
      doc.fontSize(10)
         .fillColor('#1e293b')
         .text(`Şirket: ${sirket.sirketAdi} | Sevkiyat No: #${sevkiyat.sevkiyatNo} | Tarih: ${new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR')} | Toplam: ${formatCurrency(sevkiyat.toplamTutar, sirket.sirketCariBirimi)}`, { align: 'center' });

      doc.moveDown(1);

      
      const tableStartY = doc.y;
      const tableLeft = 30;
      const rowHeight = 20;
      const columnWidths = [80, 60, 60, ...BEDENLER.map(() => 25), 40, 60, 80];
      const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);

      
      doc.fontSize(8)
         .fillColor('#E3E3E3');
      
         doc.rect(tableLeft, tableStartY, totalWidth, rowHeight).fill('#4f46e5');

      let currentX = tableLeft;
      const headers = ['Model', 'Cins', 'Renk', ...BEDENLER, 'T.Adet', 'B.Fiyat', 'Toplam'];
      
      headers.forEach((header, index) => {
        doc.text(header, currentX + 2, tableStartY + 6, { 
          width: columnWidths[index] - 4, 
          align: 'center',
          ellipsis: true
        });
        currentX += columnWidths[index];
      });

      let currentY = tableStartY + rowHeight;

      
      sevkiyat.urunler.forEach((urun, index) => {
        const isEven = index % 2 === 0;
        
        if (isEven) {
          doc.rect(tableLeft, currentY, totalWidth, rowHeight)
             .fill('#f8fafc');
        }

        doc.fillColor('#1e293b');
        currentX = tableLeft;

        
        doc.text(urun.model || '-', currentX + 2, currentY + 6, { 
          width: columnWidths[0] - 4, 
          ellipsis: true 
        });
        currentX += columnWidths[0];

        
        doc.text(urun.cins || '-', currentX + 2, currentY + 6, { 
          width: columnWidths[1] - 4, 
          ellipsis: true 
        });
        currentX += columnWidths[1];

        
        doc.text(urun.renk || '-', currentX + 2, currentY + 6, { 
          width: columnWidths[2] - 4, 
          ellipsis: true 
        });
        currentX += columnWidths[2];

        
        BEDENLER.forEach((beden, bedenIndex) => {
          const bedenAdet = (urun.bedenler || []).find(b => b.beden === beden)?.adet || 0;
          doc.text(bedenAdet > 0 ? bedenAdet.toString() : '-', currentX + 2, currentY + 6, { 
            width: columnWidths[3 + bedenIndex] - 4, 
            align: 'center' 
          });
          currentX += columnWidths[3 + bedenIndex];
        });

        
        doc.text(urun.adet.toString(), currentX + 2, currentY + 6, { 
          width: columnWidths[columnWidths.length - 3] - 4, 
          align: 'center' 
        });
        currentX += columnWidths[columnWidths.length - 3];

        
        doc.text(formatCurrency(urun.birimFiyat, sirket.sirketCariBirimi), currentX + 2, currentY + 6, { 
          width: columnWidths[columnWidths.length - 2] - 4, 
          align: 'right' 
        });
        currentX += columnWidths[columnWidths.length - 2];

        
        const toplamFiyat = urun.adet * urun.birimFiyat;
        doc.text(formatCurrency(toplamFiyat, sirket.sirketCariBirimi), currentX + 2, currentY + 6, { 
          width: columnWidths[columnWidths.length - 1] - 4, 
          align: 'right' 
        });

        currentY += rowHeight;

        
        if (currentY > 500) {
          doc.addPage();
          currentY = 50;
        }
      });

      
      doc.fontSize(8)
         .fillColor('#64748b')
         .text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Bu sevkiyat otomatik olarak sistemimiz tarafından oluşturulmuştur.`, 
               30, doc.page.height - 50, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve({ filePath, fileName });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};


const createExcel = async (sevkiyat, sirket) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sevkiyat Detayı', {
      views: [{ showGridLines: true }],
      properties: { defaultRowHeight: 20 }
    });

    const fileName = `sevkiyat_${sevkiyat.sevkiyatNo}_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../temp', fileName);

    
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75 }
    };

    
    worksheet.mergeCells('A1:D1');
    const firmaCell = worksheet.getCell('A1');
    firmaCell.value = 'BOZKURTSAN DERİ SAN. VE TİC. LTD. ŞTİ.';
    firmaCell.font = { bold: true, size: 14 };
    firmaCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.getCell('A2').value = 'BOLEMOD-BUGATTI';
    worksheet.getCell('A2').font = { bold: true, size: 11 };

    worksheet.getCell('A3').value = '12345 SOKAK NO: 31. | 21 K.2 D.2 KONAK/İZMİR';
    worksheet.getCell('A4').value = 'GSM: +90 (533) 611 9596 | +90 (532) 064 7004';
    worksheet.getCell('A5').value = 'MAIL: bozkurtsan@hotmail.com';

    
    const sevkiyatCol = BEDENLER.length + 8;
    worksheet.mergeCells(1, sevkiyatCol, 1, sevkiyatCol + 3);
    const sevkiyatCell = worksheet.getCell(1, sevkiyatCol);
    sevkiyatCell.value = `SEVKİYAT EDİLEN FİRMA: ${sirket.sirketAdi}`;
    sevkiyatCell.font = { bold: true, size: 12 };
    sevkiyatCell.alignment = { horizontal: 'center' };

    worksheet.getCell(3, sevkiyatCol).value = 'TARİH:';
    worksheet.getCell(3, sevkiyatCol).font = { bold: true };
    worksheet.getCell(3, sevkiyatCol + 1).value = new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR');

    worksheet.getCell(4, sevkiyatCol).value = 'SEVKİYAT NO:';
    worksheet.getCell(4, sevkiyatCol).font = { bold: true };
    worksheet.getCell(4, sevkiyatCol + 1).value = sevkiyat.sevkiyatNo;

    
    worksheet.addRow([]);
    worksheet.addRow([]);

    
    const headerRow = 8;
    const headers = ['Model', 'Renk', 'Cins', ...BEDENLER, 'Toplam Adet', 'Birim Fiyat', 'Toplam Tutar', 'Notlar'];
    
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1);
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

    
    let currentRow = headerRow + 1;
    let grandTotal = 0;

    sevkiyat.urunler.forEach((item, itemIndex) => {
      const bedenAdetleri = BEDENLER.map(b => {
        const found = (item.bedenler || []).find(bb => bb.beden === b);
        return found && parseInt(found.adet) > 0 ? parseInt(found.adet) : '';
      });
      
      const toplamAdet = bedenAdetleri.reduce((sum, adet) => sum + (parseInt(adet) || 0), 0);
      const tutar = (item.birimFiyat || 0) * toplamAdet;
      grandTotal += tutar;

      const rowData = [
        item.model || '',
        item.renk || '',
        item.cins || '',
        ...bedenAdetleri,
        toplamAdet,
        item.birimFiyat || 0,
        tutar,
        item.not || ''
      ];

      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(currentRow, colIndex + 1);
        cell.value = value;
        
        
        if (colIndex === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE699' } };
        }
        
        
        if (itemIndex % 2 === 1) {
          if (colIndex !== 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
          }
        }

        
        if (colIndex >= 3 && colIndex <= 3 + BEDENLER.length - 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colIndex === headers.length - 4) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { bold: true };
        } else if (colIndex === headers.length - 3) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colIndex === headers.length - 2) {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { bold: true };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      currentRow++;
    });

    
    const totalRow = currentRow + 1;
    const mergeStart = 1;
    const mergeEnd = headers.length - 2;
    
    worksheet.mergeCells(totalRow, mergeStart, totalRow, mergeEnd);
    const totalLabelCell = worksheet.getCell(totalRow, mergeStart);
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

    const totalValueCell = worksheet.getCell(totalRow, headers.length - 1);
    totalValueCell.value = grandTotal;
    totalValueCell.numFmt = '#,##0.00';
    totalValueCell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
    totalValueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '28A745' } };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValueCell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'double' }
    };

    
    worksheet.columns = [
      { width: 15 }, 
      { width: 12 }, 
      { width: 12 }, 
      ...BEDENLER.map(() => ({ width: 6 })), 
      { width: 10 }, 
      { width: 12 }, 
      { width: 15 }, 
      { width: 20 }  
    ];

    
    worksheet.headerFooter.oddHeader = '&C&14&BSevkiyat Detay Raporu';
    worksheet.headerFooter.oddFooter = '&L&D &T &R&P / &N';

    await workbook.xlsx.writeFile(filePath);
    return { filePath, fileName };
  } catch (error) {
    throw error;
  }
};


const formatCurrency = (amount, currencyCode = 'TL') => {
  const code = currencyCode || 'TL';
  const currency = code === 'USD' ? '$' : code === 'EUR' ? '€' : '₺';
  const num = Number.isFinite(Number(amount)) ? Number(amount) : 0;

  const formattedAmount = new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return `${formattedAmount} ${currency}`;
};


const createEmailHTML = (sevkiyat, sirket) => {
  
  const bedenHeaders = BEDENLER.map(beden => `<th style="padding: 8px 4px; text-align: center; background: #4f46e5; color: white; border: 1px solid #3730a3; font-size: 11px; min-width: 35px;">${beden}</th>`).join('');
  
  
  const urunlerHTML = sevkiyat.urunler.map((urun, index) => {
    const bedenCells = BEDENLER.map(beden => {
      const bedenAdet = (urun.bedenler || []).find(b => b.beden === beden)?.adet || 0;
      const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `<td style="padding: 6px 4px; text-align: center; border: 1px solid #e2e8f0; background: ${backgroundColor}; font-size: 11px;">${bedenAdet > 0 ? bedenAdet : '-'}</td>`;
    }).join('');

    const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    const toplamFiyat = urun.adet * urun.birimFiyat;
    
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor}; font-weight: 600;">${urun.model || '-'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor};">${urun.cins || '-'}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor};">${urun.renk || '-'}</td>
        ${bedenCells}
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor}; text-align: center; font-weight: 600;">${urun.adet}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor}; text-align: right;">${formatCurrency(urun.birimFiyat, sirket.sirketCariBirimi)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor}; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(toplamFiyat, sirket.sirketCariBirimi)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; background: ${backgroundColor}; font-size: 12px; color: #64748b;">${urun.not || '-'}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sevkiyat Bildirimi</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 800; }
            .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; }
            .content { padding: 20px; }
            .info-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #4f46e5; }
            .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
            .info-item { margin: 5px 0; }
            .info-item strong { color: #374151; display: inline-block; width: 120px; }
            .table-container { overflow-x: auto; margin: 20px 0; border: 2px solid #e2e8f0; border-radius: 8px; }
            .excel-table { width: 100%; border-collapse: collapse; font-size: 12px; background: white; }
            .excel-table th { background: #4f46e5; color: white; padding: 8px; text-align: center; border: 1px solid #3730a3; font-weight: 600; white-space: nowrap; }
            .excel-table td { padding: 6px 8px; border: 1px solid #e2e8f0; white-space: nowrap; }
            .total-section { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .total-amount { font-size: 28px; font-weight: 800; margin: 10px 0; }
            .footer { background: #1e293b; color: white; padding: 20px; text-align: center; }
            .footer p { margin: 5px 0; opacity: 0.8; }
            @media (max-width: 768px) {
                .container { margin: 0; }
                .content { padding: 15px; }
                .excel-table { font-size: 10px; }
                .excel-table th, .excel-table td { padding: 4px 6px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📦 BOZKURTSAN SEVKİYAT BİLDİRİMİ</h1>
                <p>Sevkiyatınız başarıyla tamamlanmıştır</p>
            </div>
            
            <div class="content">
                <div class="info-section">
                    <h3 style="margin: 0 0 15px; color: #1e293b; font-size: 18px;">📋 Sevkiyat Bilgileri</h3>
                    <div class="info-grid">
                        <div>
                            <div class="info-item"><strong>Şirket:</strong> ${sirket.sirketAdi}</div>
                            <div class="info-item"><strong>Bölge:</strong> ${sirket.sirketBolgesi || '-'}</div>
                            <div class="info-item"><strong>Para Birimi:</strong> ${sirket.sirketCariBirimi || 'TL'}</div>
                        </div>
                        <div>
                            <div class="info-item"><strong>Sevkiyat No:</strong> #${sevkiyat.sevkiyatNo}</div>
                            <div class="info-item"><strong>Tarih:</strong> ${new Date(sevkiyat.sevkiyatTarihi).toLocaleDateString('tr-TR')}</div>
                            <div class="info-item"><strong>Ürün Adeti:</strong> ${sevkiyat.urunler.length} Adet</div>
                        </div>
                    </div>
                </div>
                
                <h3 style="color: #1e293b; margin: 25px 0 15px;">📊 Detaylı Sevkiyat Tablosu</h3>
                
                <div class="table-container">
                    <table class="excel-table">
                        <thead>
                            <tr>
                                <th style="min-width: 100px;">Model</th>
                                <th style="min-width: 80px;">Cins</th>
                                <th style="min-width: 80px;">Renk</th>
                                ${bedenHeaders}
                                <th style="min-width: 60px;">Toplam<br>Adet</th>
                                <th style="min-width: 80px;">Birim<br>Fiyat</th>
                                <th style="min-width: 90px;">Toplam<br>Fiyat</th>
                                <th style="min-width: 100px;">Notlar</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${urunlerHTML}
                        </tbody>
                    </table>
                </div>
                
                <div class="total-section">
                    <h3 style="margin: 0 0 10px;">💰 GENEL TOPLAM</h3>
                    <div class="total-amount">${formatCurrency(sevkiyat.toplamTutar, sirket.sirketCariBirimi)}</div>
                    <p style="margin: 15px 0 0; opacity: 0.9; font-size: 14px;">
                        ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur
                    </p>
                </div>
                
                <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-weight: 600;">ℹ️ Bilgilendirme</p>
                    <p style="margin: 10px 0 0; color: #475569; font-size: 14px;">
                        Detaylı Excel ve PDF raporları ek dosyalar halinde eklenmiştir. Herhangi bir sorunuz için lütfen bizimle iletişime geçin.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Teşekkür ederiz!</strong></p>
                <p>Bu e-posta otomatik olarak sistem tarafından oluşturulmuştur.</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    © ${new Date().getFullYear()} BOZKURTSAN DERİ SAN. VE TİC. LTD. ŞTİ.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const sendSevkiyatNotification = async (sevkiyat, sirket) => {
  try {
    const transporter = createTransporter();
    
    
    const [pdfFile, excelFile] = await Promise.all([
      createPDF(sevkiyat, sirket),
      createExcel(sevkiyat, sirket)
    ]);

    
    const emailAddresses = sirket.emailler
      .filter(emailObj => emailObj.email && emailObj.email.trim())
      .map(emailObj => emailObj.email.trim());

    if (emailAddresses.length === 0) {
      throw new Error('Geçerli email adresi bulunamadı');
    }

    
    const htmlContent = createEmailHTML(sevkiyat, sirket);

    
    const mailOptions = {
      from: {
        name: 'Sevkiyat Yönetim Sistemi',
        address: process.env.SMTP_USER
      },
      to: emailAddresses,
      subject: `📦 Sevkiyat Tamamlandı - #${sevkiyat.sevkiyatNo} | ${sirket.sirketAdi}`,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFile.fileName,
          path: pdfFile.filePath,
          contentType: 'application/pdf'
        },
        {
          filename: excelFile.fileName,
          path: excelFile.filePath,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    };

    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email başarıyla gönderildi:', info.messageId);
    console.log('Gönderilen adresler:', emailAddresses);

    
    setTimeout(() => {
      try {
        fs.unlinkSync(pdfFile.filePath);
        fs.unlinkSync(excelFile.filePath);
        console.log('Geçici dosyalar silindi');
      } catch (error) {
        console.error('Geçici dosya silme hatası:', error);
      }
    }, 10000); 

    return {
      success: true,
      messageId: info.messageId,
      sentTo: emailAddresses,
      attachments: [pdfFile.fileName, excelFile.fileName]
    };

  } catch (error) {
    console.error('Email gönderme hatası:', error);
    throw error;
  }
};

module.exports = {
  sendSevkiyatNotification,
  createPDF,
  createExcel
};