import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Calendar, ChevronDown, ChevronUp, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import './AbsenceTracker.css';

const API_URL = 'http://31.57.33.249:3001/api';

const AttendanceTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      fetchAttendanceForDate(selectedDate);
    }
  }, [selectedDate, employees]);

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

  const fetchAttendanceForDate = async (date) => {
    try {
      const promises = employees.map(emp => 
        fetch(`${API_URL}/absences/${emp._id}`)
          .then(res => res.json())
          .then(data => ({ id: emp._id, absences: data }))
          .catch(() => ({ id: emp._id, absences: [] }))
      );
      const results = await Promise.all(promises);
      
      const attendanceMap = {};
      results.forEach(result => {
        const isAbsent = result.absences.some(absence => 
          new Date(absence.date).toDateString() === date.toDateString()
        );
        attendanceMap[result.id] = !isAbsent;
      });
      
      setAttendanceData(attendanceMap);
    } catch (err) {
      console.error('Yoklama verileri yüklenirken hata:', err);
    }
  };

  const toggleAttendance = async (employeeId, currentStatus) => {
    setSaving(true);
    const newStatus = !currentStatus;
    
    setAttendanceData(prev => ({ ...prev, [employeeId]: newStatus }));
    
    try {
      if (newStatus) {
        await fetch(`${API_URL}/absences`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, date: selectedDate })
        });
      } else {
        await fetch(`${API_URL}/absences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, date: selectedDate })
        });
      }
    } catch (error) {
      console.error('Yoklama güncellenirken hata:', error);
      setAttendanceData(prev => ({ ...prev, [employeeId]: currentStatus }));
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
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = Object.values(attendanceData).filter(status => status).length;
  const absentCount = filteredEmployees.length - presentCount;

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

  return (
    <div className="attendance-container">
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
      <div className="attendance-header">
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
        /></div>
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
          Yoklama Yönetimi
        </h1>
      </div>

      {/* Control Panel */}
      <div className="control-panel">
        <div className="control-row">
          <div className="date-selector">
            <button onClick={() => changeDate(-1)} className="date-button">
              <ChevronDown className="rotate-90" size={20} />
            </button>
            
            <div className="date-display">
              <Calendar size={20} />
              <span className="date-text">{formatDate(selectedDate)}</span>
            </div>
            
            <button onClick={() => changeDate(1)} className="date-button">
              <ChevronUp className="rotate-90" size={20} />
            </button>
          </div>

          <div className="stats-container">
            <div className="stat-badge present">
              <UserCheck size={20} />
              <span className="stat-number">{presentCount}</span>
              <span className="stat-label">Mevcut</span>
            </div>
            <div className="stat-badge absent">
              <UserX size={20} />
              <span className="stat-number">{absentCount}</span>
              <span className="stat-label">Devamsız</span>
            </div>
          </div>
        </div>

        {/* Search */}
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
      </div>

      {/* Employee List */}
      <div className="employee-list">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee, index) => {
            const isPresent = attendanceData[employee._id] !== false;
            
            return (
              <div
                key={employee._id}
                className="employee-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="employee-content">
                  <div className="employee-info">
                    <div className="avatar-container">
                      <img
                        src={employee.photo || `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random&color=fff&rounded=true&size=56`}
                        alt={`${employee.firstName} ${employee.lastName}`}
                        className="employee-avatar"
                      />
                      <div className={`status-indicator ${isPresent ? 'present' : 'absent'}`}>
                        {isPresent ? <Check size={12} /> : <X size={12} />}
                      </div>
                    </div>
                    
                    <div className="employee-details">
                      <h3 className="employee-name">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="employee-email">{employee.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAttendance(employee._id, isPresent)}
                    disabled={saving}
                    className={`status-button ${isPresent ? 'present' : 'absent'}`}
                  >
                    {isPresent ? 'Mevcut' : 'Devamsız'}
                  </button>
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
    </div>
  );
};

export default AttendanceTracker;