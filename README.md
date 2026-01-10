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
- **Facebook to Notion Saver**: Browser extension to save Facebook posts directly to Notion

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Backend**: Supabase (PostgreSQL, Storage, Auth, Edge Functions)
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
│       ├── chat/              # Chat API route
│       ├── process-file/      # File processing API route
│       └── facebook-to-notion/ # Facebook to Notion API route
├── browser-extension/
│   ├── manifest.json          # Extension configuration
│   ├── content-script.js      # Facebook Save button detection
│   ├── background.js          # API communication
│   ├── popup.html             # Settings UI
│   ├── popup.js               # Settings logic
│   └── icon*.png              # Extension icons
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
│   │   ├── client.ts         # Browser Supabase client
│   │   └── server.ts         # Server Supabase client
│   ├── notion.ts             # Notion client helper
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Utility functions
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql  # Database schema
│   └── functions/
│       ├── chat-with-agent/   # Chat Edge Function
│       └── process-file/      # File processing Edge Function
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
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   GOOGLE_AI_API_KEY=your_google_key
   OLLAMA_ENDPOINT=http://localhost:11434
   ```

6. **Deploy Edge Functions**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref your-project-ref
   
   # Deploy functions
   supabase functions deploy chat-with-agent
   supabase functions deploy process-file
   
   # Set secrets for Edge Functions
   supabase secrets set OPENAI_API_KEY=your_key
   supabase secrets set ANTHROPIC_API_KEY=your_key
   supabase secrets set GOOGLE_AI_API_KEY=your_key
   supabase secrets set OLLAMA_ENDPOINT=your_endpoint
   ```

7. **Run the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
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
   - Add environment variables from `.env.local`
   - Deploy!

3. **Configure domains**
   - Set up custom domain in Vercel settings
   - Update CORS settings in Supabase if needed

### Supabase Production Setup

1. **Database**: Already set up with migrations
2. **Storage**: Create `agent-files` bucket in Supabase Storage (see Storage Configuration below)
3. **Auth**: Configure authentication providers in Supabase Auth settings
4. **Edge Functions**: Already deployed via CLI

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

## 📱 Facebook to Notion Saver (Browser Extension)

### Setup

#### 1. Install Extension (Chrome/Edge)

1. Open Chrome → Extensions → Enable "Developer mode"
2. Click "Load unpacked"
3. Select the `browser-extension/` folder
4. Extension is now installed! 

#### 2. Install Extension (Firefox)

1. Open Firefox → `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `manifest.json` from `browser-extension/`
4. Extension is now installed!

#### 3. Configure API URL

1. Click extension icon in toolbar
2. Enter your API URL: `https://multi-agent-one.vercel.app`
3. Click "Save Settings"

#### 4. Setup Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create new integration: "Multi-Agent FB Saver"
3. Copy the Internal Integration Token
4. Add to Vercel environment variables:
   - `NOTION_API_KEY=secret_xxxxx`
   - `NOTION_DATABASE_ID=2e4d8e44d9158097bdd1d96c89f3fcf3`
5. In your Notion database → Share → Add integration

#### 5. Usage

1. Browse Facebook
2. See a post you like
3. Click "Save" button (native Facebook button)
4. Extension automatically sends to Notion!
5. Toast notification: "✅ Zapisano do Notion!"

### How It Works

```
Facebook "Save" click
    ↓
Extension extracts: content, comments, URL
    ↓
POST /api/facebook-to-notion
    ↓
Notion API creates page
    ↓
Toast: "✅ Zapisano do Notion!"
```

### Troubleshooting

**Extension not working?**
- Check if extension is enabled
- Check API URL in settings
- Check browser console for errors

**API errors?**
- Verify NOTION_API_KEY in Vercel
- Verify database ID is correct
- Check if integration is shared with database

**No comments captured?**
- Extension captures top 10 comments only
- Some comment formats might not be detected

---

Built with ❤️ using Next.js and Supabase