"use client";
import { useState } from 'react';
import { AlertCircle, CheckCircle2, User, Lock, Mail } from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; // Ajusta la ruta según tu estructura
import { useRouter } from 'next/navigation';

type FormMode = 'login' | 'register';
type UserRole = 'alumno' | 'profesor';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

export default function AuthPage() {
  const [mode, setMode] = useState<FormMode>('login');
  const [role, setRole] = useState<UserRole>('alumno');
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string): boolean => password.length >= 8;
  const validateUsername = (username: string): boolean => username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (mode === 'register') {
      if (!formData.username) newErrors.username = 'El nombre de usuario es requerido';
      else if (!validateUsername(formData.username))
        newErrors.username = 'El nombre debe tener al menos 3 caracteres y solo letras, números y guiones bajos';
      
      if (!role) newErrors.role = 'Debes seleccionar un rol';
    }

    if (!formData.email) newErrors.email = 'El email es requerido';
    else if (!validateEmail(formData.email)) newErrors.email = 'El email no es válido';

    if (!formData.password) newErrors.password = 'La contraseña es requerida';
    else if (!validatePassword(formData.password))
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';

    if (mode === 'register') {
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirma tu contraseña';
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        // 🔹 PASO 1: REGISTRO EN SUPABASE AUTH
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { 
              username: formData.username,
              role: role 
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        // 🔹 PASO 2: CREAR PERFIL EN LA TABLA PROFILES
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: formData.username,
            email: formData.email,
            role: role
          });

        if (profileError) {
          console.error('Error creando perfil:', profileError);
          throw new Error('Error al crear el perfil de usuario');
        }

        setSuccessMessage('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
        
        // Limpiar formulario
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        
        setTimeout(() => setMode('login'), 2000);

      } else {
        // 🔹 LOGIN EN SUPABASE AUTH
        const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;
        if (!session) throw new Error('No se pudo iniciar sesión');

        // 🔹 OBTENER ROL DESDE LA TABLA PROFILES
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, username')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error obteniendo perfil:', profileError);
          throw new Error('No se encontró el perfil del usuario');
        }
        
        if (!profile) throw new Error('No se encontró el perfil del usuario');

        const userRole = profile.role as UserRole;

        setSuccessMessage(`¡Bienvenido ${profile.username}! Redirigiendo...`);
        
        setTimeout(() => {
          if (userRole === 'profesor') {
            router.push('/dashboard-profesor');
          } else {
            router.push('/dashboard-alumno');
          }
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error en autenticación:', error);
      
      // Mensajes de error más específicos
      let errorMessage = error.message;
      
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        errorMessage = 'Este email o nombre de usuario ya está registrado';
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Por favor confirma tu email antes de iniciar sesión';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'Este email ya está registrado';
      }
      
      setErrors({ email: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
    setSuccessMessage('');
    setRole('alumno');
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">
              {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="text-gray-500 mt-2">
              {mode === 'login'
                ? 'Ingresa tus credenciales para continuar'
                : 'Completa el formulario para registrarte'}
            </p>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full text-zinc-600 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="tu_usuario"
                  />
                </div>
                {errors.username && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.username}</span>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona tu rol
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('alumno')}
                    className={`px-4 py-3 border rounded-lg text-center transition ${
                      role === 'alumno' 
                        ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-300' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-2xl mb-1">👨‍🎓</span>
                    <span className="block text-sm font-medium">Alumno</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('profesor')}
                    className={`px-4 py-3 border rounded-lg text-center transition ${
                      role === 'profesor' 
                        ? 'bg-purple-500 text-white border-purple-500 ring-2 ring-purple-300' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-2xl mb-1">👩‍🏫</span>
                    <span className="block text-sm font-medium">Profesor</span>
                  </button>
                </div>
                {errors.role && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.role}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full text-zinc-600 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && (
                <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full text-zinc-950 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full text-zinc-950 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && (
                  <div className="flex items-center gap-1 mt-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Procesando...'
                : mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              {mode === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              <button
                onClick={switchMode}
                className="ml-2 text-blue-600 font-semibold hover:text-blue-700 transition"
              >
                {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}