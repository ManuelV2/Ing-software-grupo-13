"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  X,
  AlertCircle,
  History,
  CheckCircle2
} from "lucide-react";

type Modality = "Presencial" | "Online";
type DayOfWeek = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";

interface Appointment {
  id: string;
  slot_id: string;
  student_id: string;
  professor_id: string;
  day: DayOfWeek;
  start_time: string;
  duration: number;
  modality: Modality;
  location: string;
  status: string;
  notes: string | null;
  created_at: string;
  week_number: number;
  year: number;
  professor?: {
    username: string;
    email: string;
  };
}

const MyAppointments: React.FC = () => {
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error("No hay sesión activa");
        return;
      }

      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = getISOYear(now);

      // PASO 1: Cargar TODAS las appointments del alumno (quitamos el filtro de semana actual)
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("student_id", session.user.id)
        .order("year", { ascending: false })
        .order("week_number", { ascending: false })
        .order("day", { ascending: true }) // Orden secundario por día
        .order("start_time", { ascending: true });

      if (appointmentsError) {
        console.error("Error cargando appointments:", appointmentsError);
        throw appointmentsError;
      }

      if (!appointments || appointments.length === 0) {
        setUpcomingAppointments([]);
        setPastAppointments([]);
        setLoading(false);
        return;
      }

      // PASO 2: Obtener IDs únicos de profesores
      const professorIds = [
        ...new Set(appointments.map((apt) => apt.professor_id)),
      ];

      // PASO 3: Cargar perfiles de los profesores
      const { data: professors, error: professorsError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", professorIds);

      if (professorsError) {
        console.error("Error cargando perfiles de profesores:", professorsError);
        throw professorsError;
      }

      // PASO 4: Combinar los datos
      const professorsMap = new Map(
        (professors || []).map((prof) => [prof.id, prof])
      );

      const enrichedAppointments = appointments.map((apt) => ({
        ...apt,
        professor: professorsMap.get(apt.professor_id),
      }));

      // separar en actuales e historial
      const upcoming: Appointment[] = [];
      const history: Appointment[] = [];

      enrichedAppointments.forEach(apt => {
        // Lógica: Si el año es menor, o si es el mismo año pero semana anterior -> Historial
        if (apt.year < currentYear || (apt.year === currentYear && apt.week_number < currentWeek)) {
          history.push(apt);
        } else {
          // Semana actual o futura
          upcoming.push(apt);
        }
      });

      setUpcomingAppointments(upcoming);
      setPastAppointments(history);

    } catch (error: any) {
      console.error("Error cargando reservas:", error);
      alert("Error al cargar tus reservas: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres cancelar esta reserva?")) {
      return;
    }

    setCancellingId(id);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      // Actualizar estado localmente en ambas listas
      const updateStatus = (list: Appointment[]) => 
        list.map((apt) => apt.id === id ? { ...apt, status: "cancelled" } : apt);

      setUpcomingAppointments(prev => updateStatus(prev));
      setPastAppointments(prev => updateStatus(prev));

      alert("Reserva cancelada exitosamente");
    } catch (error: any) {
      console.error("Error cancelando reserva:", error);
      alert("Error al cancelar la reserva");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl text-gray-600 dark:text-gray-300">
          Cargando tus reservas...
        </div>
      </div>
    );
  }

  // Determinar qué lista mostrar según el tab activo
  const currentList = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;
  
  // Filtrar canceladas para visualización (opcional: podrías querer mostrar las canceladas en el historial)
  const activeAppointments = currentList.filter((apt) => apt.status === "confirmed");
  const cancelledAppointments = currentList.filter((apt) => apt.status === "cancelled");

  return (
    <div className="space-y-6">
      {/* Pestañas de Navegación */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 pb-2 px-4 transition-colors relative ${
            activeTab === 'upcoming'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Semana Actual / Próximas
          {activeTab === 'upcoming' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-2 px-4 transition-colors relative ${
            activeTab === 'history'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          Historial Pasado
          {activeTab === 'history' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* Contenido de la Pestaña */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          {activeTab === 'upcoming' ? 'Reservas Activas' : 'Reservas Anteriores'}
          <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
            {activeAppointments.length}
          </span>
        </h3>

        {activeAppointments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
            {activeTab === 'upcoming' ? (
              <>
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No tienes reservas activas para esta semana.
                </p>
              </>
            ) : (
              <>
                <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No tienes historial de reservas pasadas.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={cancelAppointment}
                cancelling={cancellingId === appointment.id}
                isHistory={activeTab === 'history'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reservas Canceladas (Siempre visible al final de la lista actual) */}
      {cancelledAppointments.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 opacity-75">
            Canceladas en este periodo ({cancelledAppointments.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={cancelAppointment}
                cancelling={false}
                isCancelled
                isHistory={activeTab === 'history'}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para cada tarjeta de reserva
interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (id: string) => void;
  cancelling: boolean;
  isCancelled?: boolean;
  isHistory?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onCancel,
  cancelling,
  isCancelled = false,
  isHistory = false,
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 transition-all ${
        isCancelled
          ? "border-gray-300 dark:border-gray-600 opacity-60"
          : isHistory
          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50" // Estilo distinto para historial
          : "border-blue-500 dark:border-blue-400 hover:shadow-lg"
      }`}
    >
      {isCancelled && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg text-sm font-semibold mb-3 inline-block">
          CANCELADA
        </div>
      )}
      {!isCancelled && isHistory && (
        <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-lg text-sm font-semibold mb-3 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> FINALIZADA
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isHistory ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-100 dark:bg-blue-900'
        }`}>
          <span className="text-xl">👩‍🏫</span>
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-white">
            Prof. {appointment.professor?.username}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {appointment.professor?.email}
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${isHistory ? 'text-gray-400' : 'text-blue-500'}`} />
          <span className="font-semibold">
            {appointment.day} (Semana {appointment.week_number})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isHistory ? 'text-gray-400' : 'text-blue-500'}`} />
          <span>
            {appointment.start_time} ({appointment.duration} min)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${isHistory ? 'text-gray-400' : 'text-blue-500'}`} />
          <span className="truncate">{appointment.location}</span>
        </div>

        <div className="flex items-center gap-2">
          {appointment.modality === "Presencial" ? (
            <User className={`w-4 h-4 ${isHistory ? 'text-gray-500' : 'text-green-600'}`} />
          ) : (
            <Video className={`w-4 h-4 ${isHistory ? 'text-gray-500' : 'text-purple-600'}`} />
          )}
          <span
            className={`font-semibold ${
                isHistory 
                ? 'text-gray-600 dark:text-gray-400' 
                : appointment.modality === "Presencial"
                    ? "text-green-600 dark:text-green-400"
                    : "text-purple-600 dark:text-purple-400"
            }`}
          >
            {appointment.modality}
          </span>
        </div>

        {appointment.notes && (
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mt-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Notas:
            </p>
            <p className="text-sm">{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Solo mostrar botón cancelar si NO es historial y NO está cancelada */}
      {!isCancelled && !isHistory && (
        <button
          onClick={() => onCancel(appointment.id)}
          disabled={cancelling}
          className="mt-4 w-full bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {cancelling ? (
            <span>Cancelando...</span>
          ) : (
            <>
              <X className="w-4 h-4" />
              <span>Cancelar Reserva</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

const getISOWeek = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getISOYear = (date: Date): number => {
  const d = new Date(date);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return d.getFullYear();
};

export default MyAppointments;