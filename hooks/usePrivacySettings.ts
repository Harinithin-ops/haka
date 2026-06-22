'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPrivacySettings } from '@/lib/types';

export const usePrivacySettings = (token: string | null) => {
  const [settings, setSettings] = useState<UserPrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch privacy settings on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchSettings();
  }, [token]);

  const fetchSettings = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/privacy-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch privacy settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[Privacy] Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const updateSettings = useCallback(
    async (updates: Partial<UserPrivacySettings>) => {
      if (!token) {
        throw new Error('No authentication token');
      }

      try {
        setError(null);

        const response = await fetch('/api/privacy-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update privacy settings');
        }

        const data = await response.json();
        setSettings(data.settings);
        return data.settings;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[Privacy] Error updating settings:', err);
        throw err;
      }
    },
    [token]
  );

  const toggleReadReceipts = useCallback(async () => {
    if (!settings) return;

    return updateSettings({
      ...settings,
      readReceiptsEnabled: !settings.readReceiptsEnabled,
    });
  }, [settings, updateSettings]);

  const toggleTypingIndicators = useCallback(async () => {
    if (!settings) return;

    return updateSettings({
      ...settings,
      typingIndicatorsEnabled: !settings.typingIndicatorsEnabled,
    });
  }, [settings, updateSettings]);

  const toggleOnlineStatus = useCallback(async () => {
    if (!settings) return;

    return updateSettings({
      ...settings,
      onlineStatusVisible: !settings.onlineStatusVisible,
    });
  }, [settings, updateSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    toggleReadReceipts,
    toggleTypingIndicators,
    toggleOnlineStatus,
    refetch: fetchSettings,
  };
};
