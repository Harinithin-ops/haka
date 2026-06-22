import { verifyToken, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

let supabase: any;

try {
  supabase = createSupabaseAdminClient();
} catch (error) {
  console.error('[Chats] Failed to initialize Supabase client:', error);
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

    // Get all chats for this user
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .or(
        `user_a_id.eq.${payload.userId},user_b_id.eq.${payload.userId}`
      );

    if (error) {
      console.error('[Chats] Error fetching chats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    // Enrich chats with recipient information
    const enrichedChats = await Promise.all(
      chats.map(async (chat: any) => {
        const recipientId = chat.user_a_id === payload.userId ? chat.user_b_id : chat.user_a_id;
        
        const { data: recipient } = await supabase
          .from('users')
          .select('id, username, phone_number')
          .eq('id', recipientId)
          .single();

        return {
          ...chat,
          recipientId,
          recipientName: recipient?.username || 'Unknown',
          recipientPhone: recipient?.phone_number || 'Unknown',
        };
      })
    );

    return NextResponse.json({ chats: enrichedChats }, { status: 200 });
  } catch (error) {
    console.error('[Chats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { recipientId } = await request.json();

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Missing recipientId' },
        { status: 400 }
      );
    }

    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .or(
        `and(user_a_id.eq.${payload.userId},user_b_id.eq.${recipientId}),and(user_a_id.eq.${recipientId},user_b_id.eq.${payload.userId})`
      )
      .maybeSingle();

    let chatToReturn = existingChat;

    if (!chatToReturn) {
      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_a_id: payload.userId,
          user_b_id: recipientId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('[Chats] Error creating chat:', createError);
        return NextResponse.json(
          { error: 'Failed to create chat' },
          { status: 500 }
        );
      }
      chatToReturn = newChat;
    }

    // Fetch recipient details to enrich the chat
    const actualRecipientId = chatToReturn.user_a_id === payload.userId ? chatToReturn.user_b_id : chatToReturn.user_a_id;
    const { data: recipient } = await supabase
      .from('users')
      .select('id, username, phone_number')
      .eq('id', actualRecipientId)
      .single();

    const enrichedChat = {
      ...chatToReturn,
      recipientId: actualRecipientId,
      recipientName: recipient?.username || 'Unknown',
      recipientPhone: recipient?.phone_number || 'Unknown'
    };

    return NextResponse.json({ chat: enrichedChat }, { status: 200 });

  } catch (error) {
    console.error('[Chats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
