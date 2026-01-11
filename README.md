# Multi-Agent Platform 🤖

A comprehensive AI-powered platform for creating and managing intelligent agents with workspaces, file uploads, and conversational interfaces. Built with Next.js 14, Supabase, and multi-provider LLM support.

## 🌟 Features

- **Workspace Management**: Organize your agents in dedicated spaces
- **Multi-Agent Support**: Create custom AI agents with specific roles and capabilities
- **Multi-LLM Provider**: Support for OpenAI, Anthropic (Claude), Google (Gemini), and Ollama
- **File Upload & Processing**: Upload documents and leverage RAG (Retrieval Augmented Generation)
- **Intelligent Chat**: Conversational interface with context-aware responses
- **Vector Search**: Semantic search using pgvector for relevant information retrieval
- **Real-time Updates**: Live chat updates and file processing status

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Storage, Auth) + Next.js API Routes
- **Vector Database**: pgvector extension in PostgreSQL
- **AI Providers**: 
  - OpenAI (GPT-4, GPT-3.5-turbo)
  - Anthropic (Claude 3 Opus, Sonnet, Haiku)
  - Google (Gemini Pro)
  - Ollama (Local LLMs)

## 📁 Project Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles
│   ├── spaces/
│   │   ├── page.tsx           # Spaces list
│   │   └── [id]/
│   │       └── page.tsx       # Space details & agents
│   ├── agents/
│   │   └── [id]/
│   │       └── page.tsx       # Agent chat interface
│   └── api/
│       ├── chat/
│       │   └── route.ts       # Chat API route with LLM integration
│       └── process-file/
│           └── route.ts       # File processing API route
├── components/
│   ├── ui/                    # Shadcn/ui base components
│   ├── AgentBuilder.tsx       # Agent creation/editing form
│   ├── ChatInterface.tsx      # Chat UI
│   ├── FileUploader.tsx       # File upload component
│   ├── LLMSelector.tsx        # LLM provider/model selector
│   ├── MessageList.tsx        # Chat messages display
│   ├── SpaceCard.tsx          # Space card component
│   └── SpaceList.tsx          # Spaces grid
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   └── server.ts          # Server Supabase client
│   ├── file-processor.ts      # File chunking utilities
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # Utility functions
├── supabase/
│   └── migrations/
│       ├── 00001_initial_schema.sql        # Database schema
│       ├── 00002_update_files_rls_policies.sql
│       └── 00003_add_metadata_to_file_chunks.sql
├── .env.local.example         # Environment variables template
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── package.json               # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- API keys for desired LLM providers

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/multi-agent.git
   cd multi-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings > API to get your keys
   - Enable pgvector extension: Run `CREATE EXTENSION vector;` in SQL Editor

4. **Run database migrations**
   ```bash
   # Copy the SQL from supabase/migrations/00001_initial_schema.sql
   # Paste and run it in your Supabase SQL Editor
   ```

5. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # LLM API Keys
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_AI_API_KEY=...
   OLLAMA_ENDPOINT=http://localhost:11434
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Creating a Space
1. Navigate to the Spaces page
2. Click "New Space"
3. Enter a name and optional description
4. Click "Create Space"

### Creating an Agent
1. Open a space
2. Click "New Agent"
3. Configure:
   - Name and type
   - LLM provider and model
   - Temperature and max tokens
   - System instructions
4. Click "Create Agent"

### Uploading Files
1. Open an agent
2. Drag and drop files or click to upload
3. Files are automatically processed and chunked
4. Embeddings are generated for semantic search

### Chatting with an Agent
1. Open an agent
2. Type your message in the chat interface
3. Agent responds using:
   - Configured LLM
   - System instructions
   - Relevant file context (RAG)

## 🤖 LLM Configuration

The platform supports multiple LLM providers through Next.js API Routes:
- **OpenAI** (GPT-4, GPT-3.5)
- **Anthropic** (Claude)
- **Google AI** (Gemini)
- **Ollama** (Local models)

### Setup API Keys

Add your API keys to environment variables (`.env.local` for development, or Vercel environment variables for production):

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

For Ollama (local):
```bash
OLLAMA_ENDPOINT=http://localhost:11434
```

## 💬 Chat & RAG

The chat system uses:
- **Conversation history**: Last 10 messages
- **RAG (Retrieval Augmented Generation)**: Searches uploaded files for relevant context
- **File chunking**: Automatically chunks large files (1000 chars with 200 char overlap) for efficient retrieval
- **Multiple LLM providers**: Switch between OpenAI, Claude, Gemini, Ollama

Files are automatically processed after upload and chunked for semantic search.

## 🔧 Configuration

### LLM Models

Configure available models in `lib/types.ts`:

```typescript
export const LLM_MODELS = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
  google: ['gemini-pro', 'gemini-pro-vision'],
  ollama: ['llama3', 'mistral', 'codellama']
};
```

### Agent Types

Predefined agent types in `lib/types.ts`:

```typescript
export const AGENT_TYPES = [
  'marketing_strategist',
  'content_writer',
  'code_reviewer',
  'data_analyst',
  'customer_support',
  'custom'
];
```

## 🚢 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables from `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY` (optional, if using OpenAI)
     - `ANTHROPIC_API_KEY` (optional, if using Anthropic)
     - `GOOGLE_AI_API_KEY` (optional, if using Google)
     - `OLLAMA_ENDPOINT` (optional, if using Ollama)
   - Deploy!

3. **Configure domains**
   - Set up custom domain in Vercel settings
   - Update CORS settings in Supabase if needed

### Supabase Production Setup

1. **Database**: Already set up with migrations
2. **Storage**: Create `agent-files` bucket in Supabase Storage (see Storage Configuration below)
3. **Auth**: Configure authentication providers in Supabase Auth settings

## 🗄️ Storage Configuration

### Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `agent-files`
4. Public: **NO** (keep private)
5. Click "Create bucket"

### Set Up Storage Policies

Run these SQL queries in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agent-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agent-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'agent-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Update Database RLS Policies

The initial migration includes RLS policies for the files table. For improved compatibility with the storage path structure (`userId/agentId/filename`), you can optionally simplify the INSERT policy:

```sql
-- Simplified INSERT policy for files table (optional)
DROP POLICY IF EXISTS "Users can create files in their agents" ON files;
CREATE POLICY "Authenticated users can insert files"
ON files FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
```

**Note:** The storage path structure is `{userId}/{agentId}/{timestamp}_{sanitized_filename}` to ensure proper RLS policy matching.

## 🔒 Security

- **Row Level Security (RLS)**: All database tables have RLS policies
- **Authentication**: Supabase Auth handles user authentication
- **API Keys**: Stored securely in environment variables
- **File Upload**: Validated file types and sizes
- **CORS**: Configured for your domains

## 🎯 Roadmap

- [ ] Multi-user collaboration in spaces
- [ ] Agent-to-agent communication
- [ ] Advanced file processing (PDFs, images, code)
- [ ] Conversation export and sharing
- [ ] Custom embeddings models
- [ ] Agent templates marketplace
- [ ] Performance analytics dashboard
- [ ] Voice input/output support
- [ ] Mobile app (React Native)
- [ ] API for external integrations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

## 📞 Support

For support, email support@yourdomain.com or join our Discord community.

---

Built with ❤️ using Next.js and Supabase