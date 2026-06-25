-- ADD NOTIFICATIONS SUPPORT
-- Run this in Supabase SQL Editor

-- Add FCM token column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
