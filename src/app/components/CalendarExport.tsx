'use client';
import React, { useState } from 'react';
import { Download, Calendar, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Appointment {
  id: string;
  day: string;
  start_time: string;
  duration: number;
  modality: string;
  location: string;
  professor_id: string;
  notes?: string;
}

interface CalendarExportProps {
  userId: string;
  userRole: 'alumno' | 'profesor';
}

// Función para generar archivo ICS
const generateICS = (events: any[]): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sistema Reserva Consultas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Consultas Universitarias',
    'X-WR-TIMEZONE:America/Santiago'
  ].join('\r\n');

  events.forEach((event) => {
    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:appointment-${event.id}@reservas-consultas`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio de consulta',
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};

const downloadICS = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const CalendarExport: React.FC<CalendarExportProps> = ({ userId, userRole }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  // Convertir día de semana a fecha de esta semana
  const getDayDate = (dayName: string, time: string): Date => {
    const days: { [key: string]: number } = {
      'Lunes': 1,
      'Martes': 2,
      'Miércoles': 3,
      'Jueves': 4,
      'Viernes': 5
    };

    const today = new Date();
    const currentDay = today.getDay() || 7; // Domingo = 7
    const targetDay = days[dayName];
    
    let daysToAdd = targetDay - currentDay;
    
    // Si el día ya pasó esta semana, ir a la próxima
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    // Establecer la hora
    const [hours, minutes] = time.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
    
    return targetDate;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      console.log('🔍 Exportando para:', { userId, userRole });

      // Obtener las citas del usuario
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq(userRole === 'alumno' ? 'student_id' : 'professor_id', userId)
        .eq('status', 'confirmed')
        .order('day', { ascending: true })
        .order('start_time', { ascending: true });

      console.log('📅 Appointments obtenidas:', appointments?.length || 0, appointments);
      
      if (appointmentsError) {
        console.error('❌ Error obteniendo appointments:', appointmentsError);
        throw appointmentsError;
      }

      if (!appointments || appointments.length === 0) {
        alert('No tienes citas confirmadas para exportar');
        setIsExporting(false);
        return;
      }

      // Obtener información de los profesores separadamente
      let professorNames: { [key: string]: string } = {};
      
      if (userRole === 'alumno') {
        const professorIds = [...new Set(appointments.map((apt: any) => apt.professor_id))];
        console.log('👨‍🏫 Cargando profesores:', professorIds);
        
        const { data: professors, error: profError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', professorIds);

        console.log('✅ Profesores obtenidos:', professors);
        
        if (profError) {
          console.error('⚠️ Error obteniendo profesores:', profError);
        } else if (professors) {
          professorNames = Object.fromEntries(
            professors.map((p: any) => [p.id, p.username])
          );
        }
      }

      // Convertir appointments a eventos ICS
      const events = appointments.map((apt: any) => {
        const startDate = getDayDate(apt.day, apt.start_time);
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + apt.duration);

        const professorName = professorNames[apt.professor_id] || 'Profesor';

        return {
          id: apt.id,
          title: userRole === 'alumno' 
            ? `Consulta con Prof. ${professorName}`
            : `Consulta - ${apt.modality}`,
          description: `Modalidad: ${apt.modality}\nDuración: ${apt.duration} minutos${apt.notes ? `\n\nNotas: ${apt.notes}` : ''}`,
          location: apt.location,
          start: startDate,
          end: endDate
        };
      });

      console.log('📤 Eventos a exportar:', events);

      // Generar archivo ICS
      const icsContent = generateICS(events);
      const filename = `consultas-${userRole}-${new Date().toISOString().split('T')[0]}.ics`;
      
      downloadICS(icsContent, filename);
      setExportCount(events.length);

      // Mostrar mensaje de éxito
      setTimeout(() => {
        alert(`✅ ${events.length} cita(s) exportadas exitosamente!\n\nAhora puedes:\n1. Abrir el archivo descargado\n2. Se abrirá tu calendario predeterminado\n3. Confirmar la importación`);
      }, 500);

    } catch (error: any) {
      console.error('❌ Error exportando:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      alert(`Error al exportar las citas: ${error.message || 'Error desconocido'}\n\nRevisa la consola para más detalles.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">
            Exportar a Calendario
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Descarga tus citas en formato universal
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exportar Citas (.ics)
            </>
          )}
        </button>

        {exportCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-400">
              {exportCount} cita(s) exportadas recientemente
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
          📅 Compatible con:
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-400">
          <div className="flex items-center gap-1">
            <span>✓</span> Google Calendar
          </div>
          <div className="flex items-center gap-1">
            <span>✓</span> Outlook
          </div>
          <div className="flex items-center gap-1">
            <span>✓</span> Apple Calendar
          </div>
          <div className="flex items-center gap-1">
            <span>✓</span> Thunderbird
          </div>
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
          El archivo se descargará y podrás abrirlo con cualquier aplicación de calendario.
        </p>
      </div>
    </div>
  );
};

export default CalendarExport;