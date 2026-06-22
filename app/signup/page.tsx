'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/lib/socket-context';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { connect } = useSocket();
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone number
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      setError('Please enter a phone number');
      return;
    }

    if (!/^\+?[\d\s\-()]+$/.test(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!username || username.trim().length === 0) {
      setError('Please enter a username');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, username, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('[Signup] Failed to parse response:', parseError);
        setError('acc not created');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('[Signup] Signup failed:', data?.error);
        setError(data?.error || 'acc not created');
        setIsLoading(false);
        return;
      }

      if (!data.user || !data.device || !data.token) {
        console.error('[Signup] Invalid response data');
        setError('acc not created');
        setIsLoading(false);
        return;
      }

      try {
        // Store auth data
        const authData = {
          userId: data.user.id,
          phoneNumber: phoneNumber,
          username: data.user.username,
          publicKey: data.user.publicKey,
          deviceId: data.device.id,
          token: data.token,
        };

        console.log('[Signup] Storing auth data:', { userId: authData.userId, username: authData.username });
        localStorage.setItem('auth', JSON.stringify(authData));

        // Connect to socket (with error handling)
        try {
          connect(data.token, data.user.id, data.device.id);
          console.log('[Signup] Socket connected');
        } catch (socketError) {
          console.warn('[Signup] Socket connection error:', socketError);
        }

        // Redirect to chat
        console.log('[Signup] Redirecting to chat');
        router.push('/chat');
      } catch (storageError) {
        console.error('[Signup] Storage or redirect error:', storageError);
        setError('Failed to complete signup. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[Signup] Error:', err);
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
            <p className="text-gray-600 text-sm mt-2">Create Your Secure Account</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
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
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="johndoe"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !phoneNumber || !username || !password || !confirmPassword}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-500 hover:text-blue-600 font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
