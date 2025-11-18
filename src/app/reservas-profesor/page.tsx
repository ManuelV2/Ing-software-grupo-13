"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { ArrowLeft, Users } from "lucide-react";
import ProfessorAppointments from "../components/ProfessorAppointments";

export default function ProfessorReservationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  // Esta función es vital para proteger la ruta
  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Barra de navegación superior */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/dashboard-profesor")}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Volver al Dashboard</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👩‍🏫</span>
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  {user?.username}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Título de la página */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-8 h-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Reservas Recibidas
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Aquí puedes ver y gestionar las consultas agendadas por tus alumnos
          para la semana actual.
        </p>
      </header>

      {/* Componente principal de reservas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <ProfessorAppointments />
      </div>
    </main>
  );
}
