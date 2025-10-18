
import React, { useState } from 'react';
import { Dumbbell, User } from 'lucide-react';

interface LoginProps {
  onLogin: (userName: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName.trim()) {
      setError('Por favor, ingresa tu nombre');
      return;
    }

    if (userName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    onLogin(userName.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Dumbbell className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GymTracker</h1>
          <p className="text-gray-600">Bienvenido a tu entrenador personal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cuál es tu nombre?
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  setError('');
                }}
                className={`block w-full pl-10 pr-3 py-3 border ${
                  error ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                placeholder="Ingresa tu nombre"
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium text-lg"
          >
            Comenzar Entrenamiento
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Tu información se guarda localmente en tu dispositivo
          </p>
        </div>
      </div>
    </div>
  );
}
