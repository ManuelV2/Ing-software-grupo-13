"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Plus, Users, LogOut } from "lucide-react";
import { Calendar } from "lucide-react";
import CalendarExport from "../components/CalendarExport";

export default function DashboardProfesor() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendarExport, setShowCalendarExport] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    // 🔹 OBTENER ROL Y USERNAME DESDE LA TABLA PROFILES
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, username")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error obteniendo perfil:", error);
      router.push("/login");
      return;
    }

    if (!profile) {
      console.error("No se encontró el perfil del usuario");
      router.push("/login");
      return;
    }

    if (profile.role !== "profesor") {
      router.push("/dashboard-alumno");
      return;
    }

    setUser({
      ...session.user,
      username: profile.username,
      role: profile.role,
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
              <span className="text-3xl">👩‍🏫</span>
              <h1 className="text-xl font-bold text-gray-800">
                Dashboard Profesor
              </h1>
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
            ¡Bienvenido, Profesor {user?.username}! 🎓
          </h2>
          <p className="text-gray-600">
            Gestiona tus horarios disponibles y revisa las reservas de tus
            alumnos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="w-8 h-8 text-blue-500" />
              <h3 className="text-lg font-bold text-gray-800">
                Gestionar Horarios
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Crea, edita y visualiza tus horarios disponibles para consultas
            </p>
            <button
              onClick={() => router.push("/availableTime")}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
            >
              Ir a Horarios
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-purple-500" />
              <h3 className="text-lg font-bold text-gray-800">
                Reservas Recibidas
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Gestiona las reservas de tus alumnos
            </p>
            <button
              onClick={() => router.push("/reservas-profesor")}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition"
            >
              Ver Reservas
            </button>
          </div>

          {/* NUEVA CARD - Exportar Calendario */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-bold text-gray-800">
                Exportar Calendario
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Descarga tus citas para importarlas a tu calendario
            </p>
            <button
              onClick={() => setShowCalendarExport(!showCalendarExport)}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition"
            >
              {showCalendarExport ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {/* Agregar después del grid, el componente de exportación */}
        {showCalendarExport && (
          <div className="mt-6">
            <CalendarExport userId={user?.id} userRole="profesor" />
          </div>
        )}
      </main>
    </div>
  );
}
