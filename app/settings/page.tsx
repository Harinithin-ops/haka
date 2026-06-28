'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { ArrowLeft, Check, AlertCircle, Trash2 } from 'lucide-react';
import { useSocket } from '@/lib/socket-context';
import Link from 'next/link';

interface AuthData {
  token: string;
  userId: string;
  username: string;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { disconnect } = useSocket();
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const {
    settings,
    isLoading,
    error,
    toggleReadReceipts,
    toggleTypingIndicators,
    toggleOnlineStatus,
  } = usePrivacySettings(authData?.token || null);

  // Load auth data
  useEffect(() => {
    const authStr = localStorage.getItem('auth');
    if (!authStr) {
      router.push('/login');
      return;
    }

    const auth = JSON.parse(authStr);
    setAuthData(auth);
  }, [router]);

  const handleToggle = async (
    toggle: () => Promise<any>,
    settingName: string
  ) => {
    try {
      setIsSaving(true);
      await toggle();
      setSuccessMessage(`${settingName} updated successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(`Error updating ${settingName}:`, err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!authData || confirmUsername !== authData.username) return;

    try {
      setIsDeleting(true);
      setDeleteError('');

      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      });

      if (response.ok) {
        // Sever socket connection immediately
        disconnect();
        // Clear local credentials
        localStorage.removeItem('auth');
        // Redirect to login page
        router.push('/login');
      } else {
        const errorData = await response.json();
        setDeleteError(errorData.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!authData) return;
    if (!editUsername.trim()) {
      setProfileError('Username is required');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      setProfileError('');

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
          username: editUsername.trim(),
          email: editEmail.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Sync local storage
        const updatedAuth = {
          ...authData,
          username: data.user.username,
          email: data.user.email || '',
        };
        localStorage.setItem('auth', JSON.stringify(updatedAuth));
        setAuthData(updatedAuth);
        setIsEditingProfile(false);
        setSuccessMessage('Profile updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileError('An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!authData) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-card">
        <div className="flex items-center gap-4">
          <Link href="/chat">
            <button className="p-2 hover:bg-background rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* User Info Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Account Information
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => {
                  setEditUsername(authData.username);
                  setEditEmail(authData.email || '');
                  setProfileError('');
                  setIsEditingProfile(true);
                }}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-lg text-xs transition-all active:scale-95"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/50 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-foreground/30 text-sm font-medium"
                  placeholder="Enter username"
                  disabled={isUpdatingProfile}
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-foreground/50 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-foreground/30 text-sm font-medium"
                  placeholder="Enter email"
                  disabled={isUpdatingProfile}
                />
              </div>

              {profileError && (
                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="flex gap-2.5 justify-end mt-2">
                <button
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileError('');
                  }}
                  disabled={isUpdatingProfile}
                  className="px-4 py-2 bg-muted text-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isUpdatingProfile || !editUsername.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold rounded-lg hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  {isUpdatingProfile ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-foreground/50">Username</p>
                <p className="text-foreground font-medium">{authData.username}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/50">Email</p>
                <p className="text-foreground font-medium">{authData.email || <em className="text-foreground/30 font-normal">Not set</em>}</p>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Settings Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            Privacy Settings
          </h2>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Read Receipts */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-background/80 transition-colors">
                <div>
                  <p className="font-medium text-foreground">Read Receipts</p>
                  <p className="text-sm text-foreground/50">
                    Show when you've read messages
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleToggle(toggleReadReceipts, 'Read receipts')
                  }
                  disabled={isSaving}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings?.readReceiptsEnabled
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings?.readReceiptsEnabled
                        ? 'translate-x-6'
                        : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Typing Indicators */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-background/80 transition-colors">
                <div>
                  <p className="font-medium text-foreground">Typing Indicators</p>
                  <p className="text-sm text-foreground/50">
                    Show when you're typing
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleToggle(toggleTypingIndicators, 'Typing indicators')
                  }
                  disabled={isSaving}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings?.typingIndicatorsEnabled
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings?.typingIndicatorsEnabled
                        ? 'translate-x-6'
                        : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Online Status */}
              <div className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-background/80 transition-colors">
                <div>
                  <p className="font-medium text-foreground">Online Status</p>
                  <p className="text-sm text-foreground/50">
                    Show when you're online
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(toggleOnlineStatus, 'Online status')}
                  disabled={isSaving}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings?.onlineStatusVisible
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings?.onlineStatusVisible
                        ? 'translate-x-6'
                        : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-card border border-red-200/30 rounded-lg p-6 mt-6 border-l-4 border-l-red-500">
          <h2 className="text-lg font-semibold text-red-500 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h2>
          <p className="text-sm text-foreground/60 mb-4">
            Once you delete your account, there is no going back. All of your chats, encrypted messages, user profile settings, cryptographic keys, and active sessions will be permanently erased.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 font-semibold transition-all duration-200 active:scale-95 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>

        {/* About Section */}
        <div className="bg-card border border-border rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">About</h2>
          <div className="space-y-2 text-sm text-foreground/50">
            <p>HAKA - Secure 1-to-1 Encrypted Chat</p>
            <p>Version 1.0.0</p>
            <p>End-to-end encrypted messaging with real-time delivery tracking</p>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <h3 className="text-xl font-bold">Permanently Delete Account</h3>
            </div>
            
            <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
              This action is <strong className="text-red-500">permanent</strong> and cannot be undone. All database records, cryptographic settings, device authorizations, and message keys will be lost forever.
            </p>

            <div className="mb-4">
              <p className="text-sm text-foreground/70 mb-2">
                To confirm, type your exact username <strong className="text-foreground font-semibold">{authData.username}</strong> below:
              </p>
              <input
                type="text"
                placeholder={authData.username}
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground placeholder:text-foreground/30"
              />
            </div>

            {deleteError && (
              <div className="mb-4 text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex gap-2 items-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmUsername('');
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-muted text-foreground font-semibold rounded-xl hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmUsername !== authData.username || isDeleting}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:text-foreground/40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-red-600/10 flex items-center gap-2 transition-all active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
