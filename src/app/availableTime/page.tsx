"use client";
import React, { useState, useMemo, useCallback } from 'react';
import AppointmentScheduler from '../components/AppointmentScheduler';

// --- COMPONENTE PRINCIPAL DE LA APLICACIÓN --- //

export default function App() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <AppointmentScheduler />
    </main>
  );
}
