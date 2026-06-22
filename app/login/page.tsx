'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/socket-context';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { connect } = useSocket();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber || !password) {
      setError('Please enter both phone number and password');
      return;
    }

    if (!/^\+?[\d\s\-()]+$/.test(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[Login] Failed to parse response:', parseError);
        setError('acc not created');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('[Login] Login failed:', data?.error);
        setError(data?.error || 'acc not created');
        setIsLoading(false);
        return;
      }

      if (!data.user || !data.device || !data.token) {
        console.error('[Login] Invalid response data');
        setError('acc not created');
        setIsLoading(false);
        return;
      }

      try {
        // Store auth data
        const authData = {
          userId: data.user.id,
          phoneNumber: data.user.phone_number || phoneNumber,
          username: data.user.username,
          publicKey: data.user.publicKey || data.user.public_key,
          deviceId: data.device.id,
          token: data.token,
        };
        
        console.log('[Login] Storing auth data:', { userId: authData.userId, username: authData.username });
        localStorage.setItem('auth', JSON.stringify(authData));

        // Connect to socket (with error handling)
        try {
          connect(data.token, data.user.id, data.device.id);
          console.log('[Login] Socket connected');
        } catch (socketError) {
          console.warn('[Login] Socket connection error:', socketError);
        }

        // Redirect to chat
        console.log('[Login] Redirecting to chat');
        router.push('/chat');
      } catch (storageError) {
        console.error('[Login] Storage or redirect error:', storageError);
        setError('Failed to complete login. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err instanceof Error ? err.message : 'acc not created');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600">HAKA</h1>
            <p className="text-gray-600 text-sm mt-2">Secure 1-to-1 Encrypted Chat</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 000-0000"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !phoneNumber || !password}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-blue-500 hover:text-blue-600 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
