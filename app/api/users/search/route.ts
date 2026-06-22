import { verifyToken, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

let supabase: any;

try {
  supabase = createSupabaseAdminClient();
} catch (error) {
  console.error('[Users Search] Failed to initialize Supabase client:', error);
}

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

    // Get phone number from query
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('[Users Search] Searching for users with phone containing:', phoneNumber);

    // Search for users by phone number (partial match)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, phone_number, public_key')
      .ilike('phone_number', `%${phoneNumber}%`)
      .neq('id', payload.userId)
      .limit(10);

    if (error) {
      console.error('[Users Search] Error:', error);
      return NextResponse.json(
        { error: 'Failed to search for users' },
        { status: 500 }
      );
    }

    console.log('[Users Search] Found', users?.length || 0, 'users');

    return NextResponse.json({ users: users || [] }, { status: 200 });
  } catch (error) {
    console.error('[Users Search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
