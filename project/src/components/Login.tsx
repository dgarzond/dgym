import React, { useState } from 'react';
import { User } from 'lucide-react';
import { DGymLogo } from './DGymLogo';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

interface LoginProps {
  onLogin: (username: string, email?: string, googleId?: string) => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleJWT {
  name?: string;
  email?: string;
  picture?: string;
  given_name?: string;
  sub?: string; // Google ID
}

export function Login({ onLogin }: LoginProps) {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  // Google OAuth Client ID - necesitarás configurar esto en las variables de entorno
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (userName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    // Para login manual, podemos generar un email temporal
    const email = `${userName.trim()}@gymtracker.local`;
    onLogin(userName.trim(), email);
  };

  const handleGoogleSuccess = (credentialResponse: GoogleCredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        const decoded: GoogleJWT = jwtDecode(credentialResponse.credential);
        const userName = decoded.given_name || decoded.name || decoded.email?.split('@')[0] || 'Usuario';
        const email = decoded.email;
        const googleId = decoded.sub;

        console.log('🔐 Google login successful:', { userName, email });
        onLogin(userName, email, googleId);
      }
    } catch (error) {
      console.error('Error decoding Google credential:', error);
      setError('Error processing Google authentication');
    }
  };

  const handleGoogleError = () => {
    setError('Error signing in with Google. Please try again.');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <DGymLogo size="lg" showText={false} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DGym</h1>
            <p className="text-gray-600">Welcome to your personal trainer</p>
          </div>

          {/* Google Sign-In Button */}
          {GOOGLE_CLIENT_ID && (
            <div className="mb-6">
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_blue"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  locale="en"
                />
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or continue with your name</span>
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                What's your name?
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
                  placeholder="Enter your name"
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
              Start Training
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {GOOGLE_CLIENT_ID
                ? 'Your information is stored securely'
                : 'Configure VITE_GOOGLE_CLIENT_ID to enable Google Sign-In'
              }
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}