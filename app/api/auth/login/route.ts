import { generateToken, comparePassword, generateDeviceId, createSupabaseAdminClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[v0] Login API called');
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[v0] Request body parsed:', { phoneNumber: body.phoneNumber });
    } catch (parseError) {
      console.error('[v0] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { phoneNumber, password, deviceName = 'Web' } = body;

    // Validate inputs
    if (!phoneNumber || !password) {
      return NextResponse.json({ error: 'Missing phone number or password' }, { status: 400 });
    }

    console.log('[v0] Input validation passed');

    // Initialize Supabase client
    let supabase;
    try {
      supabase = createSupabaseAdminClient();
      console.log('[v0] Supabase client initialized');
    } catch (initError) {
      console.error('[v0] Supabase client init failed:', initError);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Find user by phone number
    console.log('[v0] Finding user with phone:', phoneNumber);
    let user = null;
    let userError = null;
    
    try {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      
      user = result.data;
      userError = result.error;
    } catch (error) {
      console.error('[v0] Database query exception:', error);
      userError = error;
    }

    if (userError) {
      console.error('[v0] Find user error:', userError);
      const errorMsg = userError instanceof Error ? userError.message : JSON.stringify(userError);
      return NextResponse.json({ error: `Database error: ${errorMsg}` }, { status: 500 });
    }

    if (!user) {
      console.log('[v0] User not found');
      return NextResponse.json({ error: 'Invalid phone number or password' }, { status: 401 });
    }

    // Compare password
    console.log('[v0] Comparing password');
    let isPasswordValid = false;
    try {
      isPasswordValid = await comparePassword(password, user.password_hash);
    } catch (error) {
      console.error('[v0] Password comparison error:', error);
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }
    
    if (!isPasswordValid) {
      console.log('[v0] Password invalid');
      return NextResponse.json({ error: 'Invalid phone number or password' }, { status: 401 });
    }

    // Create device entry
    console.log('[v0] Creating device entry');
    const deviceId = generateDeviceId();
    let device = null;
    let deviceError = null;
    
    try {
      const result = await supabase
        .from('user_devices')
        .insert({
          id: deviceId,
          user_id: user.id,
          device_name: deviceName,
          device_type: 'web',
          is_active: true,
        })
        .select()
        .single();
      
      device = result.data;
      deviceError = result.error;
    } catch (error) {
      console.error('[v0] Device creation exception:', error);
      deviceError = error;
    }

    if (deviceError) {
      console.error('[v0] Device creation failed:', deviceError);
      const errorMsg = deviceError instanceof Error ? deviceError.message : JSON.stringify(deviceError);
      return NextResponse.json({ error: `Failed to create device: ${errorMsg}` }, { status: 500 });
    }

    if (!device) {
      return NextResponse.json({ error: 'Device creation returned no data' }, { status: 500 });
    }

    console.log('[v0] Device created:', device.id);

    // Generate token
    const token = generateToken({
      userId: user.id,
      deviceId: device.id,
      email: user.email,
    });

    // Update online status (non-critical)
    try {
      await supabase.from('users').update({ is_online: true }).eq('id', user.id);
    } catch (updateError) {
      console.warn('[v0] Failed to update online status:', updateError);
    }

    console.log('[v0] Login successful');

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          publicKey: user.public_key,
          avatarUrl: user.avatar_url,
        },
        device: {
          id: device.id,
          name: device.device_name,
        },
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
