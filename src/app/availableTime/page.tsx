"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';
import AppointmentScheduler from '../components/AppointmentScheduler';

export default function AvailableTimePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    const userRole = session.user.user_metadata.role;
    const username = session.user.user_metadata.username;

    if (userRole !== 'profesor') {
      router.push('/dashboard-alumno');
      return;
    }

    setUser({ ...session.user, username, role: userRole });
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
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push('/dashboard-profesor')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Volver al Dashboard</span>
            </button>
            <div className="ml-6 flex items-center gap-2">
              <span className="text-2xl">👩‍🏫</span>
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                {user?.username}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Componente principal del scheduler */}
      <AppointmentScheduler />
    </main>
  );
}
