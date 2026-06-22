import { generateToken, hashPassword, generateDeviceId, createSupabaseAdminClient } from '@/lib/auth';
import { generateKeyPair } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('[v0] Signup API called');
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[v0] Request body parsed:', { email: body.email, username: body.username });
    } catch (parseError) {
      console.error('[v0] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { phoneNumber, username, password, deviceName = 'Web' } = body;

    // Validate inputs
    if (!phoneNumber || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: phone number, username, password' },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!/^\+?[\d\s\-()]+$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    console.log('[v0] Input validation passed');

    // Initialize Supabase client
    let supabase;
    try {
      supabase = createSupabaseAdminClient();
      console.log('[v0] Supabase client initialized');
    } catch (initError) {
      console.error('[v0] Supabase client init failed:', initError);
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Try to check if user exists by phone number
    console.log('[v0] Checking if user exists with phone:', phoneNumber);
    let existingUser = null;
    let checkError = null;
    
    try {
      const result = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      
      existingUser = result.data;
      checkError = result.error;
    } catch (error) {
      console.error('[v0] Database connection error:', error);
      checkError = error;
    }

    // If database is unavailable, proceed with creation (will fail if duplicate)
    if (checkError) {
      console.warn('[v0] Could not check existing user:', checkError);
    }

    if (existingUser) {
      console.log('[v0] User already exists');
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Generate keypair and hash password
    console.log('[v0] Generating keypair and hashing password');
    const keyPair = generateKeyPair();
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID?.() || `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const deviceId = generateDeviceId();

    // Create user - with better error handling
    console.log('[v0] Creating user in database with ID:', userId);
    let user = null;
    let userError = null;
    
    try {
      const result = await supabase
        .from('users')
        .insert({
          id: userId,
          phone_number: phoneNumber,
          username,
          password_hash: passwordHash,
          public_key: keyPair.publicKey,
        })
        .select()
        .single();
      
      user = result.data;
      userError = result.error;
    } catch (error) {
      console.error('[v0] User creation exception:', error);
      userError = error;
    }

    if (userError) {
      console.error('[v0] User creation failed:', userError);
      // Return more detailed error info
      const errorMsg = userError instanceof Error ? userError.message : JSON.stringify(userError);
      return NextResponse.json({ error: `Failed to create user: ${errorMsg}` }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User creation returned no data' }, { status: 500 });
    }

    console.log('[v0] User created:', user.id);

    // Create device entry
    console.log('[v0] Creating device entry with ID:', deviceId);
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

    console.log('[v0] Signup successful');

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          publicKey: keyPair.publicKey,
        },
        device: {
          id: device.id,
          name: device.device_name || deviceName,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Signup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
