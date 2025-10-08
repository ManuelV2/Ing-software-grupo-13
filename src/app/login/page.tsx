"use client";
import { useState } from 'react';
import { AlertCircle, CheckCircle2, User, Lock, Mail } from 'lucide-react';

type FormMode = 'login' | 'register';

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
}

export default function AuthPage() {
  const [mode, setMode] = useState<FormMode>('login');
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateUsername = (username: string): boolean => {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (mode === 'register') {
      if (!formData.username) {
        newErrors.username = 'El nombre de usuario es requerido';
      } else if (!validateUsername(formData.username)) {
        newErrors.username = 'El nombre debe tener al menos 3 caracteres y solo letras, números y guiones bajos';
      }
    }

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirma tu contraseña';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
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

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(
        mode === 'login' 
          ? '¡Inicio de sesión exitoso!' 
          : '¡Registro exitoso! Ahora puedes iniciar sesión'
      );
      
      if (mode === 'register') {
        setTimeout(() => {
          setMode('login');
          setFormData({
            username: '',
            email: formData.email,
            password: '',
            confirmPassword: ''
          });
          setSuccessMessage('');
        }, 2000);
      }
    }, 1500);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
    setSuccessMessage('');
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
                    className={`w-full text-zinc-600 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
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

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'login' ? 'Nombre de Usuario' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full text-zinc-600 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={mode === 'login' ? 'tu_usuario' : 'tu@email.com'}
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
                  className={`w-full text-zinc-950 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
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
                    className={`w-full text-zinc-950 pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
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