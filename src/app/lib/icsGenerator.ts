interface ICSEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  status?: 'CONFIRMED' | 'CANCELLED';
}

export const generateICS = (events: ICSEvent[]): string => {
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
    'X-WR-TIMEZONE:America/Santiago',
    'X-WR-CALDESC:Horarios de consultas con profesores'
  ].join('\r\n');

  events.forEach((event) => {
    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:appointment-${event.id}@reservas-consultas.app`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      `STATUS:${event.status || 'CONFIRMED'}`,
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio de consulta en 15 minutos',
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};

export const downloadICS = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Función helper para convertir día de la semana a fecha
export const getDayDate = (dayName: string, time: string, weekOffset: number = 0): Date => {
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
  
  // Calcular días hasta el día objetivo
  let daysToAdd = targetDay - currentDay;
  
  // Si el día ya pasó esta semana, ir a la próxima
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  
  // Agregar semanas adicionales si es necesario
  daysToAdd += (weekOffset * 7);
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysToAdd);
  
  // Establecer la hora
  const [hours, minutes] = time.split(':').map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  
  return targetDate;
};