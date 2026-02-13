import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { X, Trash2, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import 'react-day-picker/dist/style.css';
import './AbsenceCalendar.css';

const AbsenceCalendar = ({ employee, absences = [], onAddAbsence, onRemoveAbsence, onClose }) => {
    
    const today = new Date().toISOString().split('T')[0];
    const [newDate, setNewDate] = useState(today);

    
    const absentDays = absences.map(absence => new Date(absence.date));

    const handleAddClick = () => {
        
        const dateToSend = new Date(newDate + 'T00:00:00.000Z');
        onAddAbsence(employee._id, dateToSend);
    };

    return (
        <div className="modal-container">
            <button onClick={onClose} className="modal-close-button">
                <X size={24} />
            </button>

            <div className="modal-header">
                <img
                    src={employee.photo || `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random&size=64`}
                    alt={employee.firstName} className="modal-employee-photo"
                />
                <div>
                    <h2>{`${employee.firstName} ${employee.lastName}`}</h2>
                    <p>Devamsızlık Yönetimi</p>
                </div>
            </div>

            <div className="modal-body">
                {}
                <div className="actions-panel">
                    <div className="add-absence-section">
                        <h3>Yeni Devamsızlık Ekle</h3>
                        <div className="input-group">
                            <input
                                type="date"
                                className="date-input-modal"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                            />
                            <button className="add-button" onClick={handleAddClick}>
                                <CalendarPlus size={18} /> Ekle
                            </button>
                        </div>
                    </div>

                    <div className="absence-list-section">
                        <h3>Kayıtlı Günler ({absences.length})</h3>
                        <ul className="absence-list">
                            {absences.length > 0 ? (
                                absences.map(absence => (
                                    <li key={absence._id || absence.date}>
                                        <span>
                                            {format(new Date(absence.date), 'dd MMMM yyyy', { locale: tr })}
                                        </span>
                                        <button className="delete-button" onClick={() => onRemoveAbsence(employee._id, absence.date)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <p className="no-absence-text">Kayıtlı devamsızlık yok.</p>
                            )}
                        </ul>
                    </div>
                </div>

                {}
                <div className="calendar-panel">
                    <DayPicker
                        mode="multiple"
                        selected={absentDays}
                        locale={tr} 
                        showOutsideDays
                        fixedWeeks
                        modifiersClassNames={{ selected: 'absent-day' }}
                        month={new Date()} 
                    />
                </div>
            </div>
        </div>
    );
};

export default AbsenceCalendar;