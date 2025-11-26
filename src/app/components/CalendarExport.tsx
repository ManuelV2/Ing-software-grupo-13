"use client";
import React, { useState } from "react";
import { Download, Calendar, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Appointment {
  id: string;
  day: string;
  start_time: string;
  duration: number;
  modality: string;
  location: string;
  professor_id: string;
  notes?: string;
  week_number: number;
  year: number;
}

interface CalendarExportProps {
  userId: string;
  userRole: "alumno" | "profesor";
}

// Mapa de días para convertir a números comparables
const dayMap: { [key: string]: number } = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Domingo: 7,
};

const getISOWeek = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const getISOYear = (date: Date): number => {
  const d = new Date(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return d.getFullYear();
};

const generateICS = (events: any[]): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const escapeText = (text: string): string => {
    return text.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  };

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sistema Reserva Consultas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Consultas Universitarias",
    "X-WR-TIMEZONE:America/Santiago",
  ].join("\r\n");

  events.forEach((event) => {
    icsContent +=
      "\r\n" +
      [
        "BEGIN:VEVENT",
        `UID:appointment-${event.id}@reservas-consultas`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(event.start)}`,
        `DTEND:${formatDate(event.end)}`,
        `SUMMARY:${escapeText(event.title)}`,
        event.description ? `DESCRIPTION:${escapeText(event.description)}` : "",
        event.location ? `LOCATION:${escapeText(event.location)}` : "",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:Recordatorio de consulta",
        "TRIGGER:-PT15M",
        "END:VALARM",
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
  });

  icsContent += "\r\nEND:VCALENDAR";
  return icsContent;
};

const downloadICS = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const CalendarExport: React.FC<CalendarExportProps> = ({
  userId,
  userRole,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportCount, setExportCount] = useState(0);

  const getDayDate = (dayName: string, time: string): Date => {
    const today = new Date();
    const currentDay = today.getDay() || 7;
    const targetDay = dayMap[dayName];

    let daysToAdd = targetDay - currentDay;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);

    const [hours, minutes] = time.split(":").map(Number);
    targetDate.setHours(hours, minutes, 0, 0);

    return targetDate;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = getISOYear(now);
      const currentDayIndex = now.getDay() || 7; // 1=Lunes ... 7=Domingo

      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq(userRole === "alumno" ? "student_id" : "professor_id", userId)
        .eq("status", "confirmed")
        .eq("week_number", currentWeek)
        .eq("year", currentYear)
        .order("day", { ascending: true })
        .order("start_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      if (!appointments || appointments.length === 0) {
        alert("No tienes citas confirmadas para exportar esta semana");
        setIsExporting(false);
        return;
      }

      // --- NUEVO FILTRO: Eliminar días pasados ---
      const futureAppointments = appointments.filter((apt: any) => {
        const aptDayIndex = dayMap[apt.day] || 0;
        // Incluimos el día de hoy (>=) y futuros. Eliminamos anteriores (<).
        return aptDayIndex >= currentDayIndex;
      });

      if (futureAppointments.length === 0) {
        alert("Todas tus citas de esta semana ya pasaron.");
        setIsExporting(false);
        return;
      }

      // Obtener nombres de profesores (solo si es alumno)
      let professorNames: { [key: string]: string } = {};
      if (userRole === "alumno") {
        const professorIds = [
          ...new Set(futureAppointments.map((apt: any) => apt.professor_id)),
        ];
        const { data: professors } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", professorIds);

        if (professors) {
          professorNames = Object.fromEntries(
            professors.map((p: any) => [p.id, p.username])
          );
        }
      }

      const events = futureAppointments.map((apt: any) => {
        const startDate = getDayDate(apt.day, apt.start_time);
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + apt.duration);
        const professorName = professorNames[apt.professor_id] || "Profesor";

        return {
          id: apt.id,
          title:
            userRole === "alumno"
              ? `Consulta con Prof. ${professorName}`
              : `Consulta - ${apt.modality}`,
          description: `Modalidad: ${apt.modality}\nDuración: ${
            apt.duration
          } min\nNotas: ${apt.notes || ""}`,
          location: apt.location,
          start: startDate,
          end: endDate,
        };
      });

      downloadICS(
        generateICS(events),
        `consultas-futuras-${new Date().toISOString().split("T")[0]}.ics`
      );
      setExportCount(events.length);
      setTimeout(
        () => alert(`✅ ${events.length} cita(s) futuras exportadas.`),
        500
      );
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error al exportar citas");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">
            Exportar Próximas Citas
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Descarga solo las citas pendientes de esta semana
          </p>
        </div>
      </div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isExporting ? (
          "Exportando..."
        ) : (
          <>
            <Download className="w-4 h-4" /> Exportar Pendientes (.ics)
          </>
        )}
      </button>
    </div>
  );
};

export default CalendarExport;
