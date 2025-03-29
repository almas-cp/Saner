-- Create completed_consultations table
CREATE TABLE IF NOT EXISTS completed_consultations (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  client_name TEXT,
  professional_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  fee_paid NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  is_new BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Create completed_chats table
CREATE TABLE IF NOT EXISTS completed_chats (
  id UUID PRIMARY KEY,
  completed_consultation_id UUID REFERENCES completed_consultations(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  professional_id UUID NOT NULL REFERENCES auth.users(id),
  client_name TEXT,
  professional_name TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  moved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create completed_chat_messages table
CREATE TABLE IF NOT EXISTS completed_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  completed_chat_id UUID REFERENCES completed_chats(id),
  sender_id TEXT,
  sender_type TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Enable row level security
ALTER TABLE completed_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for completed_consultations
CREATE POLICY "Allow users to view their own completed consultations"
  ON completed_consultations
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = professional_id);

-- Create policies for completed_chats
CREATE POLICY "Allow users to view their own completed chats"
  ON completed_chats
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = professional_id);

-- Create policies for completed_chat_messages
CREATE POLICY "Allow users to view messages in their completed chats"
  ON completed_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM completed_chats
      WHERE completed_chats.id = completed_chat_id
      AND (completed_chats.client_id = auth.uid() OR completed_chats.professional_id = auth.uid())
    )
  );

-- Grant permissions
GRANT ALL ON completed_consultations TO authenticated;
GRANT ALL ON completed_chats TO authenticated;
GRANT ALL ON completed_chat_messages TO authenticated;

-- Fix the column name in completed_chat_messages
ALTER TABLE completed_chat_messages RENAME COLUMN content TO message; 