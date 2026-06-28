import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  deviceId: string;
  email: string;
}

/**
 * Generate JWT token for socket authentication
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
};

/**
 * Hash password using bcryptjs
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

/**
 * Compare password with hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};

/**
 * Generate device ID for multi-device tracking
 */
export const generateDeviceId = (): string => {
  return crypto.randomUUID?.() || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create Supabase admin client for server operations
 */
export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Auth] Missing Supabase env vars. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
    throw new Error('Missing Supabase environment variables');
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey);
    console.log('[Auth] Supabase admin client created successfully');
    return client;
  } catch (error) {
    console.error('[Auth] Failed to create Supabase client:', error);
    throw error;
  }
};
