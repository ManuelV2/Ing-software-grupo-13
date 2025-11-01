'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import WeeklyCalendar from '../components/WeeklyCalendarProps';

// --- TIPOS Y DATOS --- //
type Modality = 'Presencial' | 'Online';
type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';

interface AppointmentSlot {
  id: string;
  day: DayOfWeek;
  startTime: string;
  duration: number;
  modalities: Modality[];
  location: string;
}

// --- ICONOS SVG --- //
const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const VideoIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
);

const MapPinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
);

// --- COMPONENTE PRINCIPAL --- //
const AppointmentScheduler: React.FC = () => {
    const [slots, setSlots] = useState<AppointmentSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [defaults, setDefaults] = useState({
        duration: 45,
        modalities: ['Presencial', 'Online'] as Modality[],
        location: 'Oficina 301, Edificio A',
    });
    const [editingSlot, setEditingSlot] = useState<AppointmentSlot | null>(null);

    // Cargar horarios del profesor
    useEffect(() => {
        loadSlots();
    }, []);

    const loadSlots = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                console.error('No hay sesión activa');
                setLoading(false);
                return;
            }

            setUserId(session.user.id);

            const { data, error } = await supabase
                .from('available_slots')
                .select('*')
                .eq('professor_id', session.user.id)
                .order('day', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) throw error;

            // Transformar datos de BD a formato del frontend
            const transformedSlots: AppointmentSlot[] = (data || []).map(slot => ({
                id: slot.id,
                day: slot.day as DayOfWeek,
                startTime: slot.start_time,
                duration: slot.duration,
                modalities: slot.modalities as Modality[],
                location: slot.location
            }));

            setSlots(transformedSlots);
        } catch (error: any) {
            console.error('Error cargando horarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDefaults(prev => ({ ...prev, [name]: name === 'duration' ? Number(value) : value }));
    };

    const handleModalityChange = (modality: Modality) => {
        setDefaults(prev => {
            const newModalities = prev.modalities.includes(modality)
                ? prev.modalities.filter(m => m !== modality)
                : [...prev.modalities, modality];
            return { ...prev, modalities: newModalities };
        });
    };

    const addSlot = async () => {
        if (!userId) return;

        try {
            const newSlotData = {
                professor_id: userId,
                day: 'Lunes' as DayOfWeek,
                start_time: '09:00',
                duration: defaults.duration,
                modalities: defaults.modalities,
                location: defaults.location
            };

            const { data, error } = await supabase
                .from('available_slots')
                .insert([newSlotData])
                .select()
                .single();

            if (error) throw error;

            const newSlot: AppointmentSlot = {
                id: data.id,
                day: data.day as DayOfWeek,
                startTime: data.start_time,
                duration: data.duration,
                modalities: data.modalities as Modality[],
                location: data.location
            };

            setSlots(prev => [...prev, newSlot].sort((a,b) => a.startTime.localeCompare(b.startTime)));
            setEditingSlot(newSlot);
        } catch (error: any) {
            console.error('Error creando horario:', error);
            alert('Error al crear el horario');
        }
    };
    
    const updateSlot = async (updatedSlot: AppointmentSlot) => {
        try {
            const { error } = await supabase
                .from('available_slots')
                .update({
                    day: updatedSlot.day,
                    start_time: updatedSlot.startTime,
                    duration: updatedSlot.duration,
                    modalities: updatedSlot.modalities,
                    location: updatedSlot.location,
                    updated_at: new Date().toISOString()
                })
                .eq('id', updatedSlot.id);

            if (error) throw error;

            setSlots(slots.map(s => s.id === updatedSlot.id ? updatedSlot : s));
            setEditingSlot(null);
        } catch (error: any) {
            console.error('Error actualizando horario:', error);
            alert('Error al actualizar el horario');
        }
    };

    const deleteSlot = async (id: string) => {
        try {
            const { error } = await supabase
                .from('available_slots')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSlots(slots.filter(s => s.id !== id));
            if (editingSlot?.id === id) {
                setEditingSlot(null);
            }
        } catch (error: any) {
            console.error('Error eliminando horario:', error);
            alert('Error al eliminar el horario');
        }
    };
    
    const handleSlotCardClick = (slot: AppointmentSlot) => {
        setEditingSlot(slot);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-gray-600 dark:text-gray-300">Cargando horarios...</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Configurar Disponibilidad de Consultas</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Define tus horarios base y luego crea los bloques de consulta para tus alumnos.</p>
            
            {/* Sección de Valores Predeterminados */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Valores Predeterminados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (minutos)</label>
                        <input type="number" name="duration" value={defaults.duration} onChange={handleDefaultChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación / Enlace</label>
                        <input type="text" name="location" value={defaults.location} onChange={handleDefaultChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modalidades</label>
                        <div className="flex gap-4">
                            {(['Presencial', 'Online'] as Modality[]).map(mod => (
                                <label key={mod} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={defaults.modalities.includes(mod)} onChange={() => handleModalityChange(mod)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    <span className="text-gray-800 dark:text-gray-200">{mod}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de Bloques de Consulta */}
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Mis Bloques de Consulta Semanales</h3>
                    <button onClick={addSlot} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow hover:shadow-md">
                        <PlusIcon />
                        Añadir Bloque
                    </button>
                </div>
                {slots.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aún no has añadido ningún bloque. ¡Crea tu primer horario de consulta!</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {slots.map(slot => (
                            <div key={slot.id} onClick={() => handleSlotCardClick(slot)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md hover:shadow-xl hover:scale-102 transition-all duration-200 cursor-pointer border dark:border-gray-700">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-gray-800 dark:text-white">{slot.day}, {slot.startTime}</p>
                                    <button onClick={(e) => { e.stopPropagation(); deleteSlot(slot.id); }} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-2"><ClockIcon /><span>{slot.duration} minutos</span></div>
                                    <div className="flex items-center gap-2"><MapPinIcon /><span>{slot.location}</span></div>
                                    <div className="flex items-center gap-2">
                                        {slot.modalities.includes('Presencial') && <UserIcon className="text-green-600 dark:text-green-400" />}
                                        {slot.modalities.includes('Online') && <VideoIcon className="text-purple-600 dark:text-purple-400" />}
                                        <span className="ml-1">{slot.modalities.join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <WeeklyCalendar slots={slots} onSlotClick={handleSlotCardClick} />

            {/* Modal de Edición */}
            {editingSlot && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setEditingSlot(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                       <EditSlotForm
                            slot={editingSlot}
                            onSave={updateSlot}
                            onCancel={() => setEditingSlot(null)}
                            onDelete={deleteSlot}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- FORMULARIO DE EDICIÓN --- //
interface EditSlotFormProps {
    slot: AppointmentSlot;
    onSave: (slot: AppointmentSlot) => void;
    onCancel: () => void;
    onDelete: (id: string) => void;
}

const EditSlotForm: React.FC<EditSlotFormProps> = ({ slot, onSave, onCancel, onDelete }) => {
    const [formData, setFormData] = useState(slot);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'duration' ? Number(value) : value }));
    };

    const handleModalityChange = (modality: Modality) => {
        setFormData(prev => {
            const newModalities = prev.modalities.includes(modality)
                ? prev.modalities.filter(m => m !== modality)
                : [...prev.modalities, modality];
            return { ...prev, modalities: newModalities };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Bloque de Consulta</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Día</label>
                    <select name="day" value={formData.day} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                       {(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as DayOfWeek[]).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora de Inicio</label>
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (minutos)</label>
                <input type="number" name="duration" value={formData.duration} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación / Enlace</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modalidades</label>
                <div className="flex gap-4">
                     {(['Presencial', 'Online'] as Modality[]).map(mod => (
                        <label key={mod} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.modalities.includes(mod)} onChange={() => handleModalityChange(mod)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                            <span className="text-gray-800 dark:text-gray-200">{mod}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="flex justify-between items-center pt-4">
                 <button type="button" onClick={() => {onDelete(formData.id); onCancel();}} className="text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 transition-colors">
                    Eliminar
                </button>
                <div className="flex gap-3">
                    <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow">
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </form>
    );
}

export default AppointmentScheduler;