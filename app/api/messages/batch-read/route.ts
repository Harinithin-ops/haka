import { verifyToken, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

let supabase: any;

try {
  supabase = createSupabaseAdminClient();
} catch (error) {
  console.error('[BatchRead] Failed to initialize Supabase client:', error);
}

/**
 * Batch mark multiple messages as read
 * POST /api/messages/batch-read
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { messageIds, chatId } = await request.json();

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid messageIds' },
        { status: 400 }
      );
    }

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing chatId' },
        { status: 400 }
      );
    }

    // Verify user is participant in chat
    const { data: chat } = await supabase
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .or(
        `user_a_id.eq.${payload.userId},user_b_id.eq.${payload.userId}`
      )
      .single();

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Get privacy settings
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('read_receipts_enabled')
      .eq('user_id', payload.userId)
      .single();

    if (!privacySettings?.read_receipts_enabled) {
      return NextResponse.json(
        { success: true, marked: 0, reason: 'read_receipts_disabled' },
        { status: 200 }
      );
    }

    // Batch update messages
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('id, sender_id')
      .in('id', messageIds)
      .eq('chat_id', chatId)
      .neq('status', 'read');

    if (fetchError) {
      console.error('[Batch Read] Error fetching messages:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: true, marked: 0 },
        { status: 200 }
      );
    }

    // Update status to read with timestamp
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .in('id', messageIds)
      .eq('chat_id', chatId);

    if (updateError) {
      console.error('[Batch Read] Error updating messages:', updateError);
      return NextResponse.json(
        { error: 'Failed to update messages' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        marked: messages.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Batch Read] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
