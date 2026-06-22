import { verifyToken, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

let supabase: any;

try {
  supabase = createSupabaseAdminClient();
} catch (error) {
  console.error('[PrivacySettings] Failed to initialize Supabase client:', error);
}

/**
 * GET /api/privacy-settings
 * Get user's privacy settings
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', payload.userId)
      .maybeSingle();

    if (error) {
      console.error('[Privacy] Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch privacy settings' },
        { status: 500 }
      );
    }

    if (!settings) {
      // Return defaults if not found
      return NextResponse.json(
        {
          userId: payload.userId,
          readReceiptsEnabled: true,
          typingIndicatorsEnabled: true,
          onlineStatusVisible: true,
        },
        { status: 200 }
      );
    }

    // Map database snake_case fields to camelCase for the client
    const clientSettings = {
      userId: settings.user_id,
      readReceiptsEnabled: settings.read_receipts_enabled,
      typingIndicatorsEnabled: settings.typing_indicators_enabled,
      onlineStatusVisible: settings.online_status_visible,
      updatedAt: settings.updated_at,
    };

    return NextResponse.json(clientSettings, { status: 200 });
  } catch (error) {
    console.error('[Privacy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/privacy-settings
 * Update user's privacy settings
 */
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { readReceiptsEnabled, typingIndicatorsEnabled, onlineStatusVisible } =
      await request.json();

    // Validate input and map to database snake_case columns
    const updates: any = {};
    if (typeof readReceiptsEnabled === 'boolean') {
      updates.read_receipts_enabled = readReceiptsEnabled;
    }
    if (typeof typingIndicatorsEnabled === 'boolean') {
      updates.typing_indicators_enabled = typingIndicatorsEnabled;
    }
    if (typeof onlineStatusVisible === 'boolean') {
      updates.online_status_visible = onlineStatusVisible;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    // Upsert privacy settings
    const { data: settings, error } = await supabase
      .from('user_privacy_settings')
      .upsert(
        {
          user_id: payload.userId,
          ...updates,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Privacy] Error updating settings:', error);
      return NextResponse.json(
        { error: 'Failed to update privacy settings' },
        { status: 500 }
      );
    }

    // Map database snake_case fields back to camelCase for the client
    const clientSettings = {
      userId: settings.user_id,
      readReceiptsEnabled: settings.read_receipts_enabled,
      typingIndicatorsEnabled: settings.typing_indicators_enabled,
      onlineStatusVisible: settings.online_status_visible,
      updatedAt: settings.updated_at,
    };

    return NextResponse.json(
      {
        success: true,
        settings: clientSettings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Privacy] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
