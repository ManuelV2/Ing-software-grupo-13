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
  // Añadimos la información del estudiante
  student?: {
    username: string;
    email: string;
  };
}

const ProfessorAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No hay sesión activa");
        return;
      }

      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = getISOYear(now);

      // PASO 1: Cargar appointments del PROFESOR
      // Modificación clave: filtramos por 'professor_id' en lugar de 'student_id'
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("professor_id", session.user.id) // <-- Cambio aquí
        .eq("week_number", currentWeek)
        .eq("year", currentYear)
        .order("day", { ascending: true })
        .order("start_time", { ascending: true });

      if (appointmentsError) {
        console.error("Error cargando appointments:", appointmentsError);
        throw appointmentsError;
      }

      if (!appointments || appointments.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // PASO 2: Obtener IDs únicos de ESTUDIANTES
      const studentIds = [
        ...new Set(appointments.map((apt) => apt.student_id)),
      ];

      // PASO 3: Cargar perfiles de los ESTUDIANTES
      const { data: students, error: studentsError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", studentIds);

      if (studentsError) {
        console.error("Error cargando perfiles de estudiantes:", studentsError);
        throw studentsError;
      }

      // PASO 4: Combinar los datos
      const studentsMap = new Map((students || []).map((stu) => [stu.id, stu]));

      const enrichedAppointments = appointments.map((apt) => ({
        ...apt,
        student: studentsMap.get(apt.student_id), // <-- Cambio aquí
      }));

      setAppointments(enrichedAppointments);
    } catch (error: any) {
      console.error("Error cargando reservas:", error);
      alert(
        "Error al cargar las reservas: " +
          (error.message || "Error desconocido")
      );
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

      setAppointments(
        appointments.map((apt) =>
          apt.id === id ? { ...apt, status: "cancelled" } : apt
        )
      );

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
          Cargando reservas de alumnos...
        </div>
      </div>
    );
  }

  const activeAppointments = appointments.filter(
    (apt) => apt.status === "confirmed"
  );
  const cancelledAppointments = appointments.filter(
    (apt) => apt.status === "cancelled"
  );

  return (
    <div className="space-y-6">
      {/* Reservas Activas */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Reservas Activas ({activeAppointments.length})
        </h3>

        {activeAppointments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No tienes reservas activas de alumnos para esta semana.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={cancelAppointment}
                cancelling={cancellingId === appointment.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reservas Canceladas */}
      {cancelledAppointments.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Historial - Canceladas ({cancelledAppointments.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={cancelAppointment}
                cancelling={false}
                isCancelled
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
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onCancel,
  cancelling,
  isCancelled = false,
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 ${
        isCancelled
          ? "border-gray-300 dark:border-gray-600 opacity-60"
          : "border-purple-500 dark:border-purple-400" // Color distinto para el profe
      }`}
    >
      {isCancelled && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg text-sm font-semibold mb-3 inline-block">
          CANCELADA
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
          <span className="text-xl">👨‍🎓</span> {/* Icono de Alumno */}
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-white">
            Alumno: {appointment.student?.username}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {appointment.student?.email}
          </p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-500" />
          <span className="font-semibold">{appointment.day}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-500" />
          <span>
            {appointment.start_time} ({appointment.duration} min)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-500" />
          <span className="truncate">{appointment.location}</span>
        </div>

        <div className="flex items-center gap-2">
          {appointment.modality === "Presencial" ? (
            <User className="w-4 h-4 text-green-600" />
          ) : (
            <Video className="w-4 h-4 text-purple-600" />
          )}
          <span
            className={`font-semibold ${
              appointment.modality === "Presencial"
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

      {!isCancelled && (
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

// Funciones Helper para la semana (copiadas de MyAppointments)
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

export default ProfessorAppointments;
