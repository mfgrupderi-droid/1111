import React from 'react';
import { DayPicker } from 'react-day-picker';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import './AbsenceDetailModal.css'; // KENDİ CSS DOSYASINI IMPORT EDİYOR
import './Calendar.css';       // TAKVİM CSS DOSYASINI IMPORT EDİYOR

const AbsenceDetailModal = ({ employee, absences = [], onAddAbsence, onRemoveAbsence, onClose }) => {
    const absentDays = absences.map(absence => new Date(absence.date));
    const handleDayClick = (day, modifiers) => {
        if (day === undefined || day === null) return;
        if (modifiers.absent) {
            const fullDateToRemove = absences.find(a => new Date(a.date).toDateString() === day.toDateString())?.date;
            if (fullDateToRemove) { onRemoveAbsence(employee._id, fullDateToRemove); }
        } else {
            onAddAbsence(employee._id, day);
        }
    };
    return (
        <div className="modal-container">
            <div className="modal-header">
                <div className="employee-info-header">
                    <img src={employee.photo || `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=007aff&color=fff&rounded=true&size=40`}
                        alt={employee.firstName} className="modal-employee-photo" />
                    <div className="employee-details-header">
                        <h2>{`${employee.firstName} ${employee.lastName}`}</h2>
                        <p>{employee.email}</p>
                    </div>
                </div>
                <button onClick={onClose} className="modal-close-button"><X size={20} /></button>
            </div>
            <div className="modal-body-grid">
                <div className="actions-panel">
                    <h3 className="panel-title">Kayıtlı Günler ({absences.length})</h3>
                    <div className="absence-list-section">
                        {absences.length > 0 ? (
                            <ul className="absence-list">
                                {absences.sort((a,b) => new Date(b.date) - new Date(a.date)).map(absence => (
                                    <li key={absence._id || absence.date}>
                                        <span className="absence-date">{format(new Date(absence.date), 'dd MMMM yyyy', { locale: tr })}</span>
                                        <button className="delete-button" onClick={() => onRemoveAbsence(employee._id, absence.date)}><Trash2 size={14} /></button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="no-absence-container">
                                <p className="no-absence-text">Kayıtlı devamsızlık bulunmuyor.</p>
                                <p className="no-absence-subtext">Eklemek için takvimden bir gün seçin.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="calendar-panel">
                    <DayPicker
                        onDayClick={handleDayClick} modifiers={{ absent: absentDays }}
                        modifiersClassNames={{ absent: 'absent-day', today: 'today-day' }}
                        locale={tr} showOutsideDays
                        components={{ IconLeft: () => <ChevronLeft size={16} />, IconRight: () => <ChevronRight size={16} />, }}
                    />
                </div>
            </div>
        </div>
    );
};
export default AbsenceDetailModal;