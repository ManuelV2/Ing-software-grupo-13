"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, LogOut } from 'lucide-react';

export default function DashboardAlumno() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    // 🔹 OBTENER ROL Y USERNAME DESDE LA TABLA PROFILES
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👨‍🎓</span>
              <h1 className="text-xl font-bold text-gray-800">Dashboard Alumno</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Bienvenido, {user?.username}! 👋
          </h2>
          <p className="text-gray-600">
            Aquí podrás ver y reservar horarios disponibles de los profesores.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-blue-500" />
              <h3 className="text-lg font-bold text-gray-800">Mis Reservas</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Ver todas tus reservas programadas con profesores
            </p>
            <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition">
              Ver Reservas
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-bold text-gray-800">Buscar Profesores</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Encuentra profesores disponibles y reserva tu horario
            </p>
            <button className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition">
              Buscar
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h3 className="text-lg font-bold text-gray-800">Historial</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Revisa tu historial de reservas y sesiones pasadas
            </p>
            <button className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition">
              Ver Historial
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
