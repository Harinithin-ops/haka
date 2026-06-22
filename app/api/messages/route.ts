import { verifyToken, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

let supabase: any;

try {
  supabase = createSupabaseAdminClient();
} catch (error) {
  console.error('[Messages] Failed to initialize Supabase client:', error);
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

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

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

    // Fetch messages with pagination, including nested reply-to message data
    // Falls back to simple select if migration hasn't been run yet
    let messages: any[] = [];
    let fetchError: any = null;

    const { data: messagesWithReply, error: replyError } = await supabase
      .from('messages')
      .select('*, reply_msg:reply_to_message_id(id, encrypted_message, sender_id, message_type, file_url, is_deleted)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (replyError) {
      // Fallback: migration may not have run yet — use simple select
      console.warn('[Messages] reply_to join failed, falling back to simple select:', replyError.message);
      const { data: simpleMessages, error: simpleError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      messages = simpleMessages || [];
      fetchError = simpleError;
    } else {
      messages = messagesWithReply || [];
    }

    const error = fetchError;

    if (error) {
      console.error('[Messages] Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { messages: messages.reverse() },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Messages] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { messageId, text } = await request.json();
    if (!messageId || !text?.trim()) {
      return NextResponse.json({ error: 'Missing messageId or text' }, { status: 400 });
    }

    // Verify ownership
    const { data: msg } = await supabase
      .from('messages')
      .select('sender_id, is_deleted')
      .eq('id', messageId)
      .single();

    if (!msg || msg.sender_id !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (msg.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 });
    }

    const { error } = await supabase
      .from('messages')
      .update({ encrypted_message: text, is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      return NextResponse.json({ error: 'Failed to edit message' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    // Verify ownership
    const { data: msg } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (!msg || msg.sender_id !== payload.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, encrypted_message: 'This message was deleted', file_url: null, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
