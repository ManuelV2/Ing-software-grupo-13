"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Search,
  Clock,
  MapPin,
  Video,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";

type Modality = "Presencial" | "Online";
type DayOfWeek = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes";

interface Professor {
  id: string;
  username: string;
  email: string;
}

interface AppointmentSlot {
  id: string;
  professor_id: string;
  day: DayOfWeek;
  start_time: string;
  duration: number;
  modalities: Modality[];
  location: string;
  professor?: Professor;
  isBooked?: boolean;
}

interface ProfessorSearchProps {
  onBookSlot: (slot: AppointmentSlot, modality: Modality) => void;
  currentUserId?: string;
}

const ProfessorSearch: React.FC<ProfessorSearchProps> = ({
  onBookSlot,
  currentUserId,
}) => {
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [filteredSlots, setFilteredSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | "Todos">("Todos");
  const [selectedModality, setSelectedModality] = useState<Modality | "Todos">(
    "Todos"
  );

  const days: (DayOfWeek | "Todos")[] = [
    "Todos",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
  ];

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  useEffect(() => {
    filterSlots();
  }, [searchTerm, selectedDay, selectedModality, availableSlots]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar SOLO perfiles de profesores
      const { data: professors, error: profError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .eq("role", "profesor");

      if (profError) throw profError;

      if (!professors || professors.length === 0) {
        console.warn("No se encontraron perfiles de profesores.");
        setAvailableSlots([]);
        setFilteredSlots([]);
        setLoading(false);
        return;
      }

      // Crear un mapa y una lista de IDs para las siguientes consultas
      const professorMap = new Map(professors.map((p) => [p.id, p]));
      const professorIds = professors.map((p) => p.id);

      // 2. Cargar slots DISPONIBLES que pertenezcan a esos profesores
      const { data: slots, error: slotsError } = await supabase
        .from("available_slots")
        .select("*")
        .in("professor_id", professorIds); // Solo slots de profesores válidos

      if (slotsError) throw slotsError;

      if (!slots || slots.length === 0) {
        console.warn("No se encontraron slots para esos profesores.");
        setAvailableSlots([]);
        setFilteredSlots([]);
        setLoading(false);
        return;
      }

      // 3. Cargar (si hay usuario) las reservas (appointments) del estudiante actual
      // Usar un Set es más rápido para verificar (lookup O(1))
      let bookedSlotIds = new Set<string>();
      if (currentUserId) {
        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select("slot_id")
          .eq("student_id", currentUserId)
          .eq("status", "confirmed"); // Solo contar las confirmadas

        if (appointmentsError) {
          // No es un error fatal, solo un aviso
          console.warn(
            "Error cargando appointments del alumno:",
            appointmentsError
          );
        }
        if (appointments) {
          bookedSlotIds = new Set(appointments.map((apt) => apt.slot_id));
        }
      }

      // 4. Combinar TODA la información en un solo paso
      const combinedSlots: AppointmentSlot[] = slots.map((slot) => ({
        ...slot,
        professor: professorMap.get(slot.professor_id), // <-- Añadir info del profesor
        isBooked: bookedSlotIds.has(slot.id), // <-- Añadir estado de reserva
      }));

      // 5. Actualizar estados
      setAvailableSlots(combinedSlots);
      setFilteredSlots(combinedSlots); // Inicialmente, mostrar todo
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      alert("Error al cargar los horarios disponibles. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  const filterSlots = () => {
    let filtered = [...availableSlots];

    // Filtrar por término de búsqueda (nombre del profesor)
    if (searchTerm) {
      filtered = filtered.filter((slot) =>
        slot.professor?.username
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por día
    if (selectedDay !== "Todos") {
      filtered = filtered.filter((slot) => slot.day === selectedDay);
    }

    // Filtrar por modalidad
    if (selectedModality !== "Todos") {
      filtered = filtered.filter((slot) =>
        slot.modalities.includes(selectedModality)
      );
    }

    setFilteredSlots(filtered);
  };

  const groupSlotsByProfessor = () => {
    const grouped: {
      [key: string]: { professor: Professor; slots: AppointmentSlot[] };
    } = {};

    filteredSlots.forEach((slot) => {
      if (!slot.professor) return;

      if (!grouped[slot.professor_id]) {
        grouped[slot.professor_id] = {
          professor: slot.professor,
          slots: [],
        };
      }
      grouped[slot.professor_id].slots.push(slot);
    });

    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-xl text-gray-600 dark:text-gray-300">
          Cargando profesores...
        </div>
      </div>
    );
  }

  const groupedData = groupSlotsByProfessor();

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Buscar Horarios Disponibles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Buscador de profesor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar Profesor
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre del profesor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Filtro de día */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Día de la Semana
            </label>
            <select
              value={selectedDay}
              onChange={(e) =>
                setSelectedDay(e.target.value as DayOfWeek | "Todos")
              }
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de modalidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Modalidad
            </label>
            <select
              value={selectedModality}
              onChange={(e) =>
                setSelectedModality(e.target.value as Modality | "Todos")
              }
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="Todos">Todas</option>
              <option value="Presencial">Presencial</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {groupedData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No se encontraron horarios disponibles con los filtros
            seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map(({ professor, slots }) => (
            <div
              key={professor.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👩‍🏫</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    Profesor {professor.username}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {professor.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot) => (
                  <SlotCard key={slot.id} slot={slot} onBookSlot={onBookSlot} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente para cada tarjeta de horario
interface SlotCardProps {
  slot: AppointmentSlot;
  onBookSlot: (slot: AppointmentSlot, modality: Modality) => void;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, onBookSlot }) => {
  const [selectedModality, setSelectedModality] = useState<Modality>(
    slot.modalities[0]
  );
  const [showModal, setShowModal] = useState(false);

  const handleBook = () => {
    if (slot.isBooked) {
      alert("Ya tienes una reserva para este horario");
      return;
    }
    setShowModal(true);
  };

  const confirmBook = () => {
    onBookSlot(slot, selectedModality);
    setShowModal(false);
  };

  return (
    <>
      <div
        className={`bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border-2 transition-all ${
          slot.isBooked
            ? "border-orange-400 dark:border-orange-500 opacity-75"
            : "border-gray-200 dark:border-gray-600 hover:shadow-md hover:border-blue-300"
        }`}
      >
        {slot.isBooked && (
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded text-xs font-semibold mb-2 inline-block">
            YA RESERVADO
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-500" />
          <p className="font-bold text-gray-800 dark:text-white">{slot.day}</p>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              {slot.start_time} ({slot.duration} min)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{slot.location}</span>
          </div>
          <div className="flex items-center gap-2">
            {slot.modalities.includes("Presencial") && (
              <User className="w-4 h-4 text-green-600" />
            )}
            {slot.modalities.includes("Online") && (
              <Video className="w-4 h-4 text-purple-600" />
            )}
            <span>{slot.modalities.join(", ")}</span>
          </div>
        </div>

        <button
          onClick={handleBook}
          disabled={slot.isBooked}
          className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors ${
            slot.isBooked
              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {slot.isBooked ? "Ya Reservado" : "Reservar"}
        </button>
      </div>

      {/* Modal de confirmación */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Confirmar Reserva
            </h3>

            <div className="space-y-3 mb-6 text-gray-700 dark:text-gray-300">
              <p>
                <strong>Profesor:</strong> {slot.professor?.username}
              </p>
              <p>
                <strong>Día:</strong> {slot.day}
              </p>
              <p>
                <strong>Hora:</strong> {slot.start_time}
              </p>
              <p>
                <strong>Duración:</strong> {slot.duration} minutos
              </p>

              {slot.modalities.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Selecciona la modalidad:
                  </label>
                  <div className="flex gap-4">
                    {slot.modalities.map((mod) => (
                      <label
                        key={mod}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="modality"
                          value={mod}
                          checked={selectedModality === mod}
                          onChange={() => setSelectedModality(mod)}
                          className="h-4 w-4"
                        />
                        <span>{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <p>
                <strong>Ubicación:</strong> {slot.location}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBook}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfessorSearch;
