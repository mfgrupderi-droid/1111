import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Calendar, ChevronLeft, ChevronRight, X, Check, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import './AbsenceTracker.css';

const API_URL = 'http://31.57.33.249:3001/api';

const AttendanceTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [absencesByDate, setAbsencesByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [selectedDayAbsences, setSelectedDayAbsences] = useState([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAllAbsencesForMonth(currentMonth);
    }
  }, [currentMonth, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/calisanlar`);
      const data = await response.json();
      if (Array.isArray(data.data)) {
        setEmployees(data.data);
      } else {
        setError("Veri formatı hatalı.");
      }
    } catch (err) {
      setError('Çalışan verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAbsencesForMonth = async (date) => {
    try {
      const promises = employees.map(emp => 
        fetch(`${API_URL}/absences/${emp._id}`)
          .then(res => res.json())
          .then(data => ({ id: emp._id, name: `${emp.firstName} ${emp.lastName}`, absences: Array.isArray(data) ? data : data.data || [] }))
          .catch(() => ({ id: emp._id, name: '', absences: [] }))
      );
      const results = await Promise.all(promises);

      const absenceMap = {};
      results.forEach(result => {
        result.absences.forEach(absence => {
          const dateStr = new Date(absence.date).toISOString().split('T')[0];
          if (!absenceMap[dateStr]) {
            absenceMap[dateStr] = {};
          }
          // Store absence indexed by employee ID for quick lookup
          const type = absence.type || absence.code || absence.absenceType || absence.kod || '';
          absenceMap[dateStr][result.id] = {
            id: result.id,
            name: result.name,
            date: absence.date,
            type
          };
        });
      });

      setAbsencesByDate(absenceMap);
    } catch (err) {
      console.error('Yoklama verileri yüklenirken hata:', err);
    }
  };

  const toggleAttendance = async (employeeId, isAbsent, dateStr) => {
    if (isAbsent) {
      // Devamsızlığı kaldır
      setSaving(true);
      try {
        await fetch(`${API_URL}/absences`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, date: new Date(dateStr) })
        });
        fetchAllAbsencesForMonth(currentMonth);
      } catch (error) {
        console.error('Yoklama güncellenirken hata:', error);
      } finally {
        setSaving(false);
      }
    } else {
      // Devamsızlık ekleceği zaman modal açarız
      setSelectedEmployeeForModal(employeeId);
      setSelectedDateForModal(dateStr);
      setShowTypeModal(true);
    }
  };

  const addAbsenceWithType = async (absenceType) => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: selectedEmployeeForModal, 
          date: new Date(selectedDateForModal),
          type: absenceType 
        })
      });
      
      fetchAllAbsencesForMonth(currentMonth);
      setShowTypeModal(false);
      setSelectedEmployeeForModal(null);
      setSelectedDateForModal(null);
    } catch (error) {
      console.error('Yoklama güncellenirken hata:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const changeDate = (days) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + days);
    setCurrentMonth(newDate);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Pazartesiden başlasın (0=Pazar, 1=Pazartesi)
    return day === 0 ? 6 : day - 1;
  };

  const handleDayClick = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const filteredList = employees.filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Convert object of absences to array and filter by employee list
    const absenceObj = absencesByDate[dateStr] || {};
    const absent = Object.values(absenceObj).filter(a => {
      const emp = filteredList.find(e => e._id === a.id);
      return emp;
    });
    setSelectedDayAbsences(absent);
    
    const newDate = new Date(dateStr);
    setSelectedDate(newDate);
  };

  const getDaysArray = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getAbsenceCountForDay = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const absenceObj = absencesByDate[dateStr] || {};
    return Object.keys(absenceObj).length;
  };

  const getAbsenceColor = (count, totalEmployees) => {
    if (count === 0) return '#f0fdf4';
    const percentage = (count / totalEmployees) * 100;
    if (percentage <= 20) return '#dcfce7';
    if (percentage <= 40) return '#fef3c7';
    if (percentage <= 60) return '#fed7aa';
    if (percentage <= 80) return '#fecaca';
    return '#fee2e2';

  };

  const exportToExcel = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Puantaj');

    // Temel değişkenler
    const companyName = 'MF GRUP DERİ TEKS. TURZ. İNŞ. SAN. VE TİC. LTD. ŞTİ.';
    const year = currentMonth.getFullYear();
    const monthIndex = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    
    const monthNames = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 
                        'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
    const monthName = monthNames[monthIndex];
    
    const monthStart = `01/${monthName}/${year}`;
    const monthEnd = `${daysInMonth}/${monthName}/${year}`;

    const fixedCols = 3; // Sıra No, T.C., Ad Soyad
    const summaryColCount = 6; // Çalışan Prim Gün, Yıllık İzin, Rapor Günü, Mazeret İzni, TOPLAM, İMZA
    const totalCols = fixedCols + daysInMonth + summaryColCount;

    // ===== SATIR 1: Firma Adı =====
    ws.mergeCells(1, 1, 1, totalCols);
    const companyCell = ws.getCell(1, 1);
    companyCell.value = companyName;
    companyCell.font = { bold: true, size: 11 };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    companyCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    ws.getRow(1).height = 22;

    // ===== SATIR 2: AYLIK PUANTAJ CETVELİ =====
    ws.mergeCells(2, 1, 2, totalCols);
    const titleCell = ws.getCell(2, 1);
    titleCell.value = 'AYLIK PUANTAJ CETVELİ';
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    ws.getRow(2).height = 22;

    // ===== SATIR 3: Boş satırlar (1-3) için "Dönemi" başlığı =====
    // İlk 3 sütun için birleştirme
    ws.mergeCells(3, 1, 4, 3);
    const leftHeaderCell = ws.getCell(3, 1);
    leftHeaderCell.value = '';
    leftHeaderCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Günler için "Dönemi" başlığı
    const periodStartCol = fixedCols + 1;
    const periodEndCol = fixedCols + daysInMonth;
    ws.mergeCells(3, periodStartCol, 3, periodEndCol);
    const periodTitleCell = ws.getCell(3, periodStartCol);
    periodTitleCell.value = 'Dönemi';
    periodTitleCell.font = { bold: true, size: 11 };
    periodTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    periodTitleCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Sağ taraf özet sütunları için birleştirme
    ws.mergeCells(3, periodEndCol + 1, 4, totalCols);
    const rightHeaderCell = ws.getCell(3, periodEndCol + 1);
    rightHeaderCell.value = '';
    rightHeaderCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // ===== SATIR 4: Tarih aralığı =====
    ws.mergeCells(4, periodStartCol, 4, periodEndCol);
    const dateRangeCell = ws.getCell(4, periodStartCol);
    dateRangeCell.value = `${monthStart}-${monthEnd}`;
    dateRangeCell.font = { bold: true, size: 10 };
    dateRangeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateRangeCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    ws.getRow(3).height = 18;
    ws.getRow(4).height = 18;

    // ===== SATIR 5: Başlık satırı (Sıra No, T.C., Ad Soyad, 1-31, Özetler) =====
    const headerLabels = ['Sıra\nNo', 'T.C.Kimlik\nNumarası', 'Adı Soyadı'];
    for (let day = 1; day <= daysInMonth; day++) {
      headerLabels.push(String(day));
    }
    headerLabels.push(
      'Çalışan Prim Gün',
      'Yıllık İzin Günü',
      'Rapor Günü',
      'Mazeret İzin Günü',
      'TOPLAM',
      'İMZA'
    );

    ws.addRow(headerLabels);
    const headerRow = ws.getRow(5);
    headerRow.font = { bold: true, size: 10 };
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE8EAED' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // ===== SATIR 6: Haftanın günleri =====
    const weekdayLabels = ['', '', ''];
    const weekdayMap = ['P', 'Pzt', 'Sa', 'Ça', 'Pe', 'Cu', 'CT'];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, monthIndex, day);
      weekdayLabels.push(weekdayMap[d.getDay()]);
    }
    
    for (let i = 0; i < summaryColCount; i++) {
      weekdayLabels.push('');
    }

    ws.addRow(weekdayLabels);
    const weekdayRow = ws.getRow(6);
    weekdayRow.font = { bold: true, size: 9 };
    weekdayRow.height = 18;
    weekdayRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // ===== Personel Satırları =====
    employees.forEach((emp, idx) => {
      const rowData = [
        idx + 1,
        emp.identityNumber || emp.tcNo || emp.tc || '',
        `${emp.firstName} ${emp.lastName}`.toUpperCase()
      ];

      let prim = 0, yillik = 0, rapor = 0, mazeret = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayAbsences = absencesByDate[dateStr];

        // Support both object-by-empId and legacy array formats, and be tolerant to different id fields
        let absence = null;
        if (Array.isArray(dayAbsences)) {
          absence = dayAbsences.find(a => a.id === emp._id || a.employeeId === emp._id || a.employee === emp._id);
        } else if (dayAbsences && typeof dayAbsences === 'object') {
          absence = dayAbsences[emp._id] || dayAbsences[emp._id.toString()] || Object.values(dayAbsences).find(a => a.id === emp._id || a.employeeId === emp._id || a.employee === emp._id);
        }

        let code = 'X';
        const rawType = absence && (absence.type || absence.code || absence.kod || absence.absenceType || absence.value || '');
        if (rawType) {
          code = String(rawType).trim();
        } else {
          const d = new Date(year, monthIndex, day);
          const dow = d.getDay();
          if (dow === 0) code = 'P';
          else if (dow === 6) code = 'CT';
        }

        // Kod dönüşümleri - daha toleranslı normalize et
        const norm = String(code).toUpperCase();
        if (norm.includes('DEVAMS')) code = 'D';
        else if (norm === 'Üİ' || norm.includes('ÜCRETSIZ') || norm.includes('UCRETSIZ')) code = 'Üİ';
        else if (norm === 'İ' || norm.includes('YILLIK')) code = 'İ';
        else if (norm === 'Mİ' || norm === 'MI' || norm.includes('MAZERET')) code = 'Mİ';
        else if (norm === 'RT' || norm.includes('RESMI') || norm.includes('RESM')) code = 'RT';
        else if (norm === 'B' || norm.includes('BAYRAM')) code = 'B';
        else if (norm === 'İİ' || norm === 'II' || norm.includes('IDARI') || norm.includes('İDAR')) code = 'İİ';
        else if (norm === 'Öİ' || norm === 'OI' || norm.includes('ÖLÜM') || norm.includes('OLUM')) code = 'Öİ';
        else if (norm === 'H' || norm.includes('HASTANE')) code = 'H';
        else if (norm === 'R' || norm.includes('RAPOR')) code = 'R';

        rowData.push(code);

        // Sayaçlar
        if (code === 'X') prim++;
        if (code === 'İ') yillik++;
        if (code === 'R' || code === 'RT') rapor++;
        if (code === 'Mİ' || code === 'MI' || code === 'M') mazeret++;
      }

      const total = prim + yillik + rapor + mazeret;
      rowData.push(prim, yillik, rapor, mazeret, total, '');

      ws.addRow(rowData);
      const dataRow = ws.getRow(7 + idx);
      dataRow.height = 20;
      dataRow.eachCell((cell, colNum) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        if (colNum === 3) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // ===== Alt Bilgi Satırları =====
    const lastEmployeeRow = 7 + employees.length;
    
    // Boş satır
    ws.addRow([]);
    
    // Not satırı
    const noteRow = lastEmployeeRow + 2;
    ws.mergeCells(noteRow, 1, noteRow, totalCols);
    const noteCell = ws.getCell(noteRow, 1);
    noteCell.value = 'BOŞ BIRAKILAN GÜNLER PLANLAT İÇ ÇALIŞILMAYAN GÜNLERDIR.';
    noteCell.font = { bold: true, size: 10, italic: true };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(noteRow).height = 20;

    // Çalışma saatleri bilgisi
    const infoRow = noteRow + 1;
    ws.mergeCells(infoRow, 1, infoRow, totalCols);
    const infoCell = ws.getCell(infoRow, 1);
    infoCell.value = `Yukarıda ismi yazılı bulunan işçimiz    ${monthStart}-${monthEnd}    döneminde puantajda belirtilen günlerde 09:00 - 18:00 saatleri arasında çalıştırılmıştır. Günde iki kere olmak üzere 10:00 - 10:15 ve 15:00 - 15:15  saatleri aralığında ara dinlenme yapılmıştır.`;
    infoCell.font = { size: 9 };
    infoCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getRow(infoRow).height = 40;

    // Personel bilgisi
    const personnelRow = infoRow + 1;
    ws.mergeCells(personnelRow, 1, personnelRow, Math.floor(totalCols / 2));
    const personnelCell = ws.getCell(personnelRow, 1);
    personnelCell.value = 'PERSONEL :';
    personnelCell.font = { bold: true, size: 10 };
    personnelCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(personnelRow).height = 20;

    // İmza bölümleri
    const signRow1 = personnelRow + 1;
    const midCol = Math.floor(totalCols / 2);
    
    ws.mergeCells(signRow1, 1, signRow1, midCol);
    const signCell1 = ws.getCell(signRow1, 1);
    signCell1.value = 'ADI SOYADI:';
    signCell1.font = { bold: true, size: 10 };
    signCell1.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells(signRow1, midCol + 1, signRow1, totalCols);
    const signCell2 = ws.getCell(signRow1, midCol + 1);
    signCell2.value = 'ADI SOYADI : MUHAMMED MÜCAHİT BOZKURT';
    signCell2.font = { bold: true, size: 10 };
    signCell2.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(signRow1).height = 20;

    const signRow2 = signRow1 + 1;
    ws.mergeCells(signRow2, 1, signRow2, midCol);
    const ünvanCell1 = ws.getCell(signRow2, 1);
    ünvanCell1.value = 'ÜNVANI :';
    ünvanCell1.font = { bold: true, size: 10 };
    ünvanCell1.alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells(signRow2, midCol + 1, signRow2, totalCols);
    const ünvanCell2 = ws.getCell(signRow2, midCol + 1);
    ünvanCell2.value = 'İMZA :';
    ünvanCell2.font = { bold: true, size: 10 };
    ünvanCell2.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(signRow2).height = 20;

    const signRow3 = signRow2 + 1;
    ws.mergeCells(signRow3, 1, signRow3, midCol);
    const imzaCell1 = ws.getCell(signRow3, 1);
    imzaCell1.value = 'İMZA:';
    imzaCell1.font = { bold: true, size: 10 };
    imzaCell1.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(signRow3).height = 20;

    // Kısaltmalar
    const legendRow = signRow3 + 2;
    const legendData = [
      ['X', ': Çalışılan Gün'],
      ['İ', ': Yıllık İzin'],
      ['R', ': Rapor Günü'],
      ['P', ': Pazar'],
      ['CT', ': Cumartesi'],
      ['Üİ', ': Ücretsiz İzin'],
      ['Dİ', ': Doğum İzni'],
      ['Mİ', ': Mazeret İzni'],
      ['RT', ': Resmi Tatil'],
      ['B', ': Bayram Tatili'],
      ['İİ', ': İdari İzin'],
      ['Öİ', ': Ölüm İzni'],
      ['H', ': Hastane Günü']
    ];

    legendData.forEach((item, idx) => {
      const row = legendRow + idx;
      ws.mergeCells(row, 1, row, 2);
      const legendCell = ws.getCell(row, 1);
      legendCell.value = `${item[0]}    ${item[1]}`;
      legendCell.font = { size: 9 };
      legendCell.alignment = { horizontal: 'left', vertical: 'middle' };
      ws.getRow(row).height = 16;
    });

    // ===== Kolon Genişlikleri =====
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 22;
    
    for (let col = fixedCols + 1; col <= fixedCols + daysInMonth; col++) {
      ws.getColumn(col).width = 3.5;
    }
    
    ws.getColumn(fixedCols + daysInMonth + 1).width = 11;
    ws.getColumn(fixedCols + daysInMonth + 2).width = 11;
    ws.getColumn(fixedCols + daysInMonth + 3).width = 11;
    ws.getColumn(fixedCols + daysInMonth + 4).width = 13;
    ws.getColumn(fixedCols + daysInMonth + 5).width = 10;
    ws.getColumn(fixedCols + daysInMonth + 6).width = 10;

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Puantaj_${monthName}_${year}.xlsx`);
    
  } catch (err) {
    console.error('Excel export hatası:', err);
    alert('Excel dosyası oluşturulurken bir hata oluştu.');
  }
};

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  const days = getDaysArray();
  const dayNames = ['Ptz', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];
  const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(currentMonth);
  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1 className="attendance-title">Yoklama Yönetimi</h1>
        <p className="attendance-subtitle">Aylık devamsızlık takvimi</p>
      </div>

      <div className="main-content">
        <div className="calendar-section">
          <div className="calendar-header">
            <button className="nav-button" onClick={() => changeDate(-1)}>
              <ChevronLeft size={24} />
            </button>
            <h2 className="month-title">{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
            <button className="nav-button" onClick={() => changeDate(1)}>
              <ChevronRight size={24} />
            </button>
            <button className="export-button" onClick={exportToExcel}>
              <Download size={20} />
              <span>Excel'e Çıkar</span>
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {dayNames.map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>

            <div className="calendar-days">
              {days.map((day, index) => {
                const absenceCount = day ? getAbsenceCountForDay(day) : 0;
                const bgColor = day ? getAbsenceColor(absenceCount, employees.length) : 'transparent';
                const isSelected = day && selectedDate && selectedDate.getDate() === day && 
                  selectedDate.getMonth() === currentMonth.getMonth() &&
                  selectedDate.getFullYear() === currentMonth.getFullYear();

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!day ? 'empty' : ''} ${isSelected ? 'selected' : ''}`}
                    style={{ backgroundColor: bgColor }}
                    onClick={() => day && handleDayClick(day)}
                  >
                    {day && (
                      <>
                        <div className="day-number">{day}</div>
                        {absenceCount > 0 && (
                          <div className="absence-count-badge">{absenceCount}</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f0fdf4' }}></div>
              <span>Devamsız yok</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#dcfce7' }}></div>
              <span>%0-20</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fef3c7' }}></div>
              <span>%20-40</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fed7aa' }}></div>
              <span>%40-60</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fecaca' }}></div>
              <span>%60-80</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fee2e2' }}></div>
              <span>%80+</span>
            </div>
          </div>
        </div>

        {selectedDate ? (
          <div className="details-section">
            <div className="details-header">
              <Calendar size={20} />
              <h3>{formatDate(selectedDate)}</h3>
              <div style={{ marginLeft: 'auto' }}>
                <button className="nav-button" onClick={() => { setSelectedDate(null); setSelectedDayAbsences([]); }} title="Seçimi Temizle">Temizle</button>
              </div>
            </div>

            <div className="search-box">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Çalışan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="employee-list">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee, index) => {
                  const date = selectedDate;
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const absenceRecord = absencesByDate[dateStr]?.[employee._id];
                  const isAbsent = !!absenceRecord;
                  const absenceType = absenceRecord?.type || '';

                  return (
                    <div
                      key={employee._id}
                      className={`employee-card compact`}
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div className="employee-content">
                        <div className="employee-info">
                          <div className="employee-details">
                            <h3 className="employee-name">
                              {employee.firstName} {employee.lastName}
                            </h3>
                            <p className="employee-email">{employee.email}</p>
                          </div>
                        </div>

                        <div className="status-info">
                          <button
                            onClick={() => toggleAttendance(employee._id, isAbsent, dateStr)}
                            disabled={saving}
                            className={`status-button ${isAbsent ? 'absent' : 'present'}`}
                          >
                            {isAbsent ? 'Devamsız' : 'Mevcut'}
                          </button>
                          {isAbsent && absenceType && (
                            <span className="absence-type-label">
                              {absenceType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p className="empty-text">Aramayla eşleşen çalışan bulunamadı</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--muted)', fontWeight: 700 }}>Seçili Günkü Devamsızlar</h4>
              {selectedDayAbsences.length > 0 ? (
                <div>
                  {selectedDayAbsences.map((a) => (
                    <div key={`${a.id}-${a.date}`} className="employee-card compact" style={{ marginBottom: '0.5rem' }}>
                      <div className="employee-content">
                        <div className="employee-info">
                          <div className="employee-details">
                            <h3 className="employee-name">{a.name || a.employeeName || a.employee}</h3>
                            <p className="employee-email">{a.type || ''}</p>
                          </div>
                        </div>
                        <div className="status-info">
                          <button disabled className="status-button absent">Devamsız</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--muted)' }}>Bu gün için devamsız kaydı yok.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="details-placeholder" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
            Takvimden bir gün seçin; çalışan tablosu ve o günün devamsızları burada görüntülenecek.
          </div>
        )}
      </div>

      {showTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Devamsızlık Türünü Seçin</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowTypeModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="type-grid">
                {[
                  { label: 'Çalıştığı Gün', value: 'X' },
                  { label: 'Yıllık İzin', value: 'İ' },
                  { label: 'Rapor Günü', value: 'R' },
                  { label: 'Pazar', value: 'P' },
                  { label: 'Cumartesi', value: 'CT' },
                  { label: 'Resmi Tatil', value: 'RT' },
                  { label: 'Bayram Tatili', value: 'B' },
                  { label: 'İdari İzin', value: 'İİ' },
                  { label: 'Mazeret İzni', value: 'Mİ' },
                  { label: 'Ücretsiz İzin', value: 'Üİ' },
                  { label: 'Doğum İzni', value: 'Dİ' },
                  { label: 'Ölüm İzni', value: 'Öİ' },
                  { label: 'Hastane Günü', value: 'H' },
                  { label: 'Devamsız', value: 'D' }
                ].map(type => (
                  <button
                    key={type.value}
                    className="type-option-button"
                    onClick={() => addAbsenceWithType(type.value)}
                    disabled={saving}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;