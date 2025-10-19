import React, { useState, useMemo, useCallback } from 'react';

// --- TIPOS Y DATOS MOCK --- //
type Modality = 'Presencial' | 'Online';
type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

interface AppointmentSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // Formato "HH:MM"
  duration: number; // en minutos
  modalities: Modality[];
  location: string;
}


interface WeeklyCalendarProps {
  slots: AppointmentSlot[];
  onSlotClick: (slot: AppointmentSlot) => void;
}

const VideoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ slots, onSlotClick }) => {
  const days: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const hours = Array.from({ length: 12 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`); // 8 AM to 7 PM

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const calendarStartMinutes = 8 * 60; // 8:00 AM

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg mt-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Calendario Semanal de Consultas</h2>
        <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr] min-w-[700px]">
        {/* Header de Tiempo */}
        <div className="text-xs text-center text-gray-500 dark:text-gray-400"></div>

        {/* Headers de Días */}
        {days.map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 dark:text-gray-200 p-2 border-b-2 border-gray-200 dark:border-gray-700">{day}</div>
        ))}
        
        {/* Filas de Horas y Celdas del Calendario */}
        <div className="row-start-2 col-start-1 pr-2">
            {hours.map(hour => (
            <div key={hour} className="h-20 text-right text-xs text-gray-400 dark:text-gray-500 -mt-2">
                {hour}
            </div>
            ))}
        </div>

        {days.map((day, dayIndex) => (
            <div key={day} className="row-start-2 relative border-l border-gray-200 dark:border-gray-700" style={{ gridColumn: dayIndex + 2 }}>
            {/* Líneas de Hora */}
            {hours.map((_, hourIndex) => (
                <div key={hourIndex} className="h-20 border-t border-gray-100 dark:border-gray-700/50"></div>
            ))}
            
            {/* Eventos/Slots */}
            {slots.filter(slot => slot.day === day).map(slot => {
                const top = ((timeToMinutes(slot.startTime) - calendarStartMinutes) / 60) * 80; // 80px per hour
                const height = (slot.duration / 60) * 80;

                return (
                <div
                    key={slot.id}
                    className="absolute w-full px-1.5 cursor-pointer"
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={() => onSlotClick(slot)}
                >
                    <div className="h-full bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 rounded-r-lg p-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <p className="font-bold text-xs text-blue-800 dark:text-blue-200">{slot.startTime}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 truncate">{slot.location}</p>
                    <div className="flex items-center gap-1 mt-1">
                        {slot.modalities.includes('Presencial') && <UserIcon className="w-3 h-3 text-blue-500"/>}
                        {slot.modalities.includes('Online') && <VideoIcon className="w-3 h-3 text-blue-500"/>}
                    </div>
                    </div>
                </div>
                );
            })}
            </div>
        ))}
        </div>
    </div>
  );
};

export default WeeklyCalendar;