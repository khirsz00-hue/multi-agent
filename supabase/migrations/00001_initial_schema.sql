-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Spaces table
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g. "marketing_strategist", "content_writer"
  description TEXT,
  llm_provider TEXT NOT NULL, -- "openai", "anthropic", "google", "ollama"
  llm_model TEXT NOT NULL, -- "gpt-4", "claude-3-opus", etc.
  llm_temperature FLOAT DEFAULT 0.7,
  llm_max_tokens INTEGER DEFAULT 2000,
  system_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- path in Supabase Storage
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File chunks with embeddings
CREATE TABLE file_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embeddings dimension
  chunk_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- "user", "assistant", "system"
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_spaces_user_id ON spaces(user_id);
CREATE INDEX idx_agents_space_id ON agents(space_id);
CREATE INDEX idx_files_agent_id ON files(agent_id);
CREATE INDEX idx_file_chunks_file_id ON file_chunks(file_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Vector similarity search index
CREATE INDEX idx_file_chunks_embedding ON file_chunks USING ivfflat (embedding vector_cosine_ops);

-- Row Level Security (RLS)
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spaces
CREATE POLICY "Users can view their own spaces" ON spaces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own spaces" ON spaces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own spaces" ON spaces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own spaces" ON spaces FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agents
CREATE POLICY "Users can view agents in their spaces" ON agents FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE spaces.id = agents.space_id AND spaces.user_id = auth.uid())
);
CREATE POLICY "Users can create agents in their spaces" ON agents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM spaces WHERE spaces.id = agents.space_id AND spaces.user_id = auth.uid())
);
CREATE POLICY "Users can update agents in their spaces" ON agents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM spaces WHERE spaces.id = agents.space_id AND spaces.user_id = auth.uid())
);
CREATE POLICY "Users can delete agents in their spaces" ON agents FOR DELETE USING (
  EXISTS (SELECT 1 FROM spaces WHERE spaces.id = agents.space_id AND spaces.user_id = auth.uid())
);

-- RLS Policies for files
CREATE POLICY "Users can view files in their agents" ON files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = files.agent_id AND spaces.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create files in their agents" ON files FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = files.agent_id AND spaces.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete files in their agents" ON files FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM agents
    JOIN spaces ON spaces.id = agents.space_id
    WHERE agents.id = files.agent_id AND spaces.user_id = auth.uid()
  )
);

-- RLS Policies for file_chunks
CREATE POLICY "Users can view chunks in their files" ON file_chunks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM files
    JOIN agents ON agents.id = files.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE files.id = file_chunks.file_id AND spaces.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create chunks in their files" ON file_chunks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM files
    JOIN agents ON agents.id = files.agent_id
    JOIN spaces ON spaces.id = agents.space_id
    WHERE files.id = file_chunks.file_id AND spaces.user_id = auth.uid()
  )
);

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their conversations" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their conversations" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create messages in their conversations" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()
  )
);
