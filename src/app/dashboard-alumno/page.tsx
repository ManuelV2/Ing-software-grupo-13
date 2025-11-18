"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Calendar, LogOut, Search, BookOpen } from 'lucide-react';
import ProfessorSearch from '../components/ProfessorSearch';
import MyAppointments from '../components/MyAppointments';
import CalendarExport from '../components/CalendarExport';

type Modality = 'Presencial' | 'Online';
type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

interface AppointmentSlot {
  id: string;
  professor_id: string;
  day: DayOfWeek;
  start_time: string;
  duration: number;
  modalities: Modality[];
  location: string;
  professor?: {
    id: string;
    username: string;
    email: string;
  };
}

export default function DashboardAlumno() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'search' | 'appointments'>('home');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error obteniendo perfil:', error);
      router.push('/login');
      return;
    }

    if (!profile) {
      console.error('No se encontró el perfil del usuario');
      router.push('/login');
      return;
    }

    if (profile.role !== 'alumno') {
      router.push('/dashboard-profesor');
      return;
    }

    setUser({ ...session.user, username: profile.username, role: profile.role });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleBookSlot = async (slot: AppointmentSlot, modality: Modality) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Debes iniciar sesión para reservar");
        return;
      }

      // Obtener semana y año actuales
      const now = new Date();
      const currentWeek = getISOWeek(now);
      const currentYear = getISOYear(now);

      const appointmentData = {
        slot_id: slot.id,
        student_id: session.user.id,
        professor_id: slot.professor_id,
        day: slot.day,
        start_time: slot.start_time,
        duration: slot.duration,
        modality: modality,
        location: slot.location,
        status: "confirmed",
        week_number: currentWeek, // 👈 NUEVO
        year: currentYear, // 👈 NUEVO
      };

      const { data, error } = await supabase
        .from("appointments")
        .insert([appointmentData])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          alert("Este horario ya está reservado para esta semana");
        } else {
          throw error;
        }
        return;
      }

      alert("¡Reserva creada exitosamente!");
      setRefreshKey((prev) => prev + 1);
      setActiveView("appointments");
    } catch (error: any) {
      console.error("Error creando reserva:", error);
      alert("Error al crear la reserva. Por favor intenta de nuevo.");
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-300">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navegación Superior */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👨‍🎓</span>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  Dashboard Alumno
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Navegación de Pestañas */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveView('home')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeView === 'home'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Inicio
            </button>
            <button
              onClick={() => setActiveView('search')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeView === 'search'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Search className="w-5 h-5" />
              Buscar Profesores
            </button>
            <button
              onClick={() => setActiveView('appointments')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeView === 'appointments'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Mis Reservas
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'home' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                ¡Bienvenido, {user?.username}! 👋
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Aquí podrás reservar horarios de consulta con tus profesores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => setActiveView('search')}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-blue-500"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <Search className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    Buscar Profesores
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Encuentra profesores disponibles y reserva tu horario de consulta
                </p>
                <div className="text-blue-600 dark:text-blue-400 font-semibold">
                  Ir a búsqueda →
                </div>
              </div>

              <div 
                onClick={() => setActiveView('appointments')}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-blue-500"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    Mis Reservas
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Ver y gestionar todas tus reservas programadas con profesores
                </p>
                <div className="text-blue-600 dark:text-blue-400 font-semibold">
                  Ver reservas →
                </div>
              </div>
            </div>

            {/* Tips útiles */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-3">
                💡 Consejos útiles
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                <li>• Reserva con anticipación para asegurar tu horario preferido</li>
                <li>• Puedes cancelar una reserva si surge algún imprevisto</li>
                <li>• Verifica la modalidad (presencial u online) antes de confirmar</li>
                <li>• Llega puntual a tu consulta para aprovechar al máximo el tiempo</li>
              </ul>
            </div>
          </div>
        )}

        {activeView === 'search' && (
          <ProfessorSearch 
            key={refreshKey} 
            onBookSlot={handleBookSlot} 
            currentUserId={user?.id}
          />
        )}

        {activeView === 'appointments' && (
          <div className="space-y-6">
            {/* Agregar el componente de exportación */}
            <CalendarExport userId={user?.id} userRole="alumno" />
            
            {/* Componente existente de citas */}
            <MyAppointments key={refreshKey} />
          </div>
        )}
      </main>
    </div>
  );
}