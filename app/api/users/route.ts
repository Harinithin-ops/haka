import { verifyToken, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

let supabase: any;

try {
  supabase = createSupabaseAdminClient();
} catch (error) {
  console.error('[Users API] Failed to initialize Supabase client:', error);
}

export async function DELETE(request: NextRequest) {
  console.log('[Users API] DELETE account called');

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId } = payload;
    console.log(`[Users API] Deleting user account: ${userId}`);

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service is unavailable' },
        { status: 500 }
      );
    }

    // 1. Manually clean up any tables without ON DELETE CASCADE (defensive coding)
    try {
      await supabase
        .from('deleted_messages')
        .delete()
        .eq('deleted_by_user_id', userId);
    } catch (e) {
      console.warn('[Users API] Warning cleaning up deleted_messages:', e);
    }

    // 2. Delete the user row. Supabase cascades will automatically delete user_devices, user_privacy_settings, chats, messages, etc.
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('[Users API] Account deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      );
    }

    console.log(`[Users API] Account successfully deleted: ${userId}`);
    return NextResponse.json(
      { success: true, message: 'Account successfully deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Users API] Exception in DELETE account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  console.log('[Users API] PUT profile update called');

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId } = payload;
    
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { username, email } = body;

    // Validate inputs
    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service is unavailable' },
        { status: 500 }
      );
    }

    // Check if username is already taken by another user
    const { data: takenUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .neq('id', userId)
      .maybeSingle();

    if (takenUsername) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    // Check if email is already registered by another user
    if (email && email.trim()) {
      const { data: takenEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .neq('id', userId)
        .maybeSingle();

      if (takenEmail) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
      }
    }

    // Update user profile in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        username: username.trim(),
        email: email && email.trim() ? email.trim().toLowerCase() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, email, phone_number')
      .single();

    if (updateError) {
      console.error('[Users API] Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile details' },
        { status: 500 }
      );
    }

    console.log(`[Users API] Profile updated successfully for user: ${userId}`);
    return NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          phoneNumber: updatedUser.phone_number
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Users API] Exception in PUT profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
