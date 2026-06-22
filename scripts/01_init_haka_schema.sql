-- HAKA Chat App Database Schema
-- Complete message lifecycle tracking with E2E encryption

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL, -- TweetNaCl.js public key for encryption
  avatar_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- In case table already exists from a previous step/project but lacks phone_number:
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(100) UNIQUE;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_phone ON users(phone_number);

-- User devices table for multi-device sync
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(100),
  device_type VARCHAR(50), -- 'mobile', 'web', 'desktop'
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  socket_id VARCHAR(100), -- Socket.io connection ID
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_socket_id ON user_devices(socket_id);

-- Chats table (1-to-1 conversations)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE chats ADD CONSTRAINT chat_unique UNIQUE(user_a_id, user_b_id);

CREATE INDEX idx_chats_user_a ON chats(user_a_id);
CREATE INDEX idx_chats_user_b ON chats(user_b_id);
CREATE INDEX idx_chats_participants ON chats(user_a_id, user_b_id);

-- Messages table with full lifecycle tracking
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_message TEXT NOT NULL, -- Base64 encoded encrypted content
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'audio', 'file'
  file_url TEXT, -- For image/audio/file types
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read'
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Message read receipts tracking (for delivery to multiple devices)
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE message_read_receipts ADD CONSTRAINT unique_receipt UNIQUE(message_id, device_id);

CREATE INDEX idx_read_receipts_message_id ON message_read_receipts(message_id);

-- Typing indicators (ephemeral)
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE typing_indicators ADD CONSTRAINT unique_typing UNIQUE(chat_id, user_id, device_id);

CREATE INDEX idx_typing_chat_id ON typing_indicators(chat_id);

-- User privacy settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  read_receipts_enabled BOOLEAN DEFAULT TRUE,
  typing_indicators_enabled BOOLEAN DEFAULT TRUE,
  online_status_visible BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Message deletion (soft delete with timestamp)
CREATE TABLE IF NOT EXISTS deleted_messages (
  message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  deleted_by_user_id UUID NOT NULL REFERENCES users(id),
  deleted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deleted_messages_user_id ON deleted_messages(deleted_by_user_id);

-- Session table for JWT management
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies configured via app-level auth checks in backend
-- Database handles authorization through application middleware

-- Create a function to update message status
CREATE OR REPLACE FUNCTION update_message_status(
  p_message_id UUID,
  p_status VARCHAR,
  p_timestamp TIMESTAMP DEFAULT NOW()
)
RETURNS void AS $$
BEGIN
  UPDATE messages 
  SET 
    status = p_status,
    updated_at = NOW(),
    delivered_at = CASE WHEN p_status = 'delivered' THEN p_timestamp ELSE delivered_at END,
    read_at = CASE WHEN p_status = 'read' THEN p_timestamp ELSE read_at END
  WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to batch update message status
CREATE OR REPLACE FUNCTION batch_update_message_status(
  p_message_ids UUID[],
  p_status VARCHAR
)
RETURNS void AS $$
BEGIN
  UPDATE messages 
  SET 
    status = p_status,
    updated_at = NOW(),
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    read_at = CASE WHEN p_status = 'read' THEN NOW() ELSE read_at END
  WHERE id = ANY(p_message_ids);
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update user's last_seen_at
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_seen_at = NOW() WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_seen_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_user_last_seen();

-- Initial user privacy settings for new users
CREATE OR REPLACE FUNCTION create_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_settings (user_id) 
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_privacy_settings_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_privacy_settings();


