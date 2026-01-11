# Multi-Agent Platform 🤖

A comprehensive AI-powered platform for creating and managing intelligent agents with workspaces, file uploads, and conversational interfaces. Built with Next.js 14, Supabase, and multi-provider LLM support.

## 🤖 Complete Multi-Agent System

This platform features **4 specialized agents** working together:

1. **Strategic Planner** 🎯 - Defines KPIs and tracks business goals
2. **Audience Insights** 👥 - Analyzes pain points from audience
3. **Marketing Strategist** 📢 - Generates monthly content strategy
4. **Content Executor** ✍️ - Delivers daily content and reminders

### System Overview

The agents work in a coordinated flow:
- **Strategic Planner** defines your business goal (e.g., "500 users by Dec")
- **Audience Insights** analyzes Facebook posts to extract pain points
- **Marketing Strategist** reads both outputs and generates 12 posts per month
- **Content Executor** delivers daily content via email and dashboard

**Daily Workflow:**
1. **8:00 AM** - Automated email with today's content
2. **You** - Open dashboard or email
3. **2 min** - Copy content, publish, mark as done
4. **Repeat** - Consistency = success

## 🌟 Features

- **Workspace Management**: Organize your agents in dedicated spaces
- **Multi-Agent Support**: Create custom AI agents with specific roles and capabilities
- **Multi-Agent Dashboard**: Unified view of all agents working together
- **Email Notifications**: Daily reminders with content ready to publish
- **Multi-LLM Provider**: Support for OpenAI, Anthropic (Claude), Google (Gemini), and Ollama
- **File Upload & Processing**: Upload documents and leverage RAG (Retrieval Augmented Generation)
- **Intelligent Chat**: Conversational interface with context-aware responses
- **Vector Search**: Semantic search using pgvector for relevant information retrieval
- **Real-time Updates**: Live chat updates and file processing status
- **Facebook to Notion Saver**: Browser extension to save Facebook posts directly to Notion

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
│   │   ├── client.ts          # Browser Supabase client
│   │   └── server.ts          # Server Supabase client
│   ├── file-processor.ts      # File chunking utilities
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # Utility functions
│   │   ├── client.ts         # Browser Supabase client
│   │   └── server.ts         # Server Supabase client
│   ├── notion.ts             # Notion client helper
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Utility functions
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

## 🤖 Multi-Agent System

The platform now supports multi-agent collaboration with specialized agent roles that can communicate and work together.

### Agent Roles

The system defines four specialized agent roles:

1. **Strategic Planner** - Defines business KPIs and tracks progress toward goals
2. **Audience Insights** - Analyzes audience pain points from content
3. **Marketing Strategist** - Creates content strategy based on KPIs and insights
4. **Content Executor** - Generates and delivers daily content

### Strategic Planner Agent

The Strategic Planner agent helps you define and track business KPIs:

#### Features
- **Define KPIs**: Set business goals with target values, units, and deadlines
- **Track Progress**: Monitor real-time progress with visual dashboards
- **Milestone Management**: Break down goals into smaller milestones
- **Status Alerts**: Get notified when you're ahead, on track, or behind schedule
- **Inter-Agent Communication**: Share KPI data with other agents via the outputs table

#### Usage

1. **Create a Strategic Planner Agent**
   - In your space, create a new agent
   - Set the role to `strategic_planner`
   - Configure LLM settings as needed

2. **Define a KPI**
   ```typescript
   // POST /api/agents/strategic-planner
   {
     "agentId": "your-agent-id",
     "action": "define_kpis",
     "data": {
       "goal": "Reach 1000 active users",
       "targetValue": 1000,
       "unit": "users",
       "deadline": "2024-12-31",
       "description": "Grow our user base to 1000 active monthly users"
     }
   }
   ```

3. **Track Progress**
   ```typescript
   // POST /api/agents/strategic-planner
   {
     "agentId": "your-agent-id",
     "action": "check_progress"
   }
   ```

4. **Update Metrics**
   ```typescript
   // POST /api/agents/strategic-planner
   {
     "agentId": "your-agent-id",
     "action": "update_metric",
     "data": {
       "kpiId": "kpi-id",
       "newValue": 250
     }
   }
   ```

#### UI Components

The platform includes ready-to-use React components:

- **KPITracker**: Displays KPI dashboard with progress bars and status indicators
- **DefineKPIForm**: Form to create new KPIs

```tsx
import KPITracker from '@/components/agents/KPITracker'
import DefineKPIForm from '@/components/agents/DefineKPIForm'

// In your component
<DefineKPIForm agentId={agentId} onSuccess={() => refetch()} />
<KPITracker agentId={agentId} />
```

### Agent Communication

Agents communicate through the `agent_outputs` table:

- Each agent can write outputs with specific types (e.g., `kpis`, `progress_check`)
- Other agents can read these outputs using the `reads_from` field
- Outputs support versioning and validity periods
- Data is stored as JSONB for flexible schema

Example output structure:
```json
{
  "agent_id": "strategic-planner-id",
  "output_type": "kpis",
  "data": {
    "kpi_id": "uuid",
    "goal": "Reach 1000 users",
    "target": 1000,
    "unit": "users",
    "deadline": "2024-12-31"
  }
}
```

### Audience Insights Agent

The Audience Insights agent analyzes social media content (Notion posts, Facebook posts) to extract pain points from your target audience.

#### Features
- **Notion Integration**: Automatically analyze posts from Notion database
- **Pain Point Extraction**: AI-powered analysis to identify audience problems
- **Categorization**: Automatic categorization (focus, time_management, organization, motivation, overwhelm)
- **Sentiment Analysis**: Detect emotional state (frustrated, confused, seeking_help, desperate)
- **Frequency Tracking**: Track how often each pain point is mentioned
- **Inter-Agent Communication**: Share insights with Marketing Strategist via outputs table

#### Setup

1. **Configure Notion Integration**
   ```bash
   # Add to .env.local or Vercel environment variables
   NOTION_API_KEY=secret_xxxxx
   NOTION_DATABASE_ID=your_database_id
   ```

2. **Create Audience Insights Agent**
   - In your space, create a new agent
   - Set the role to `audience_insights`
   - Configure LLM settings (recommend GPT-4-turbo for best analysis)

3. **Analyze Notion Posts**
   ```typescript
   // POST /api/agents/audience-insights
   {
     "agentId": "your-agent-id",
     "action": "analyze_notion_posts",
     "data": {
       "notionDatabaseId": "optional-override"
     }
   }
   ```

4. **Get Top Pain Points**
   ```typescript
   // POST /api/agents/audience-insights
   {
     "agentId": "your-agent-id",
     "action": "get_top_pain_points"
   }
   ```

#### UI Component

```tsx
import AudienceInsights from '@/components/agents/AudienceInsights'

// In your component
<AudienceInsights agentId={agentId} />
```

#### Notion Database Structure

Your Notion database should have these columns:
- **Treść** (rich_text): Post content
- **Komentarze** (rich_text): Comments on the post

### Marketing Strategist Agent

The Marketing Strategist agent generates flexible monthly content calendars based on audience pain points and business KPIs.

#### Key Features
- **Monthly Content Generation**: Creates 12 posts per month (not rigid 52-week calendar)
- **Pain Point Alignment**: Each post addresses specific audience problems
- **KPI Integration**: Aligns content with business goals from Strategic Planner
- **Flexible Editing**: Full inline editing of generated content
- **Regeneration**: AI-powered post regeneration with feedback
- **Status Workflow**: Draft → Approved → Published → Skipped
- **Narrative Phases**: Automatic sequencing (awareness → education → trust → conversion)

#### Usage

1. **Create Marketing Strategist Agent**
   - In your space, create a new agent
   - Set the role to `marketing_strategist`
   - Configure `reads_from` to include Strategic Planner and Audience Insights agents

2. **Generate Monthly Content**
   ```typescript
   // POST /api/agents/marketing-strategist
   {
     "agentId": "your-agent-id",
     "action": "generate_monthly_content",
     "data": {
       "month": "2026-11",
       "postsPerWeek": 3,
       "contentTypes": ["linkedin_post"]
     }
   }
   ```

3. **Edit Content**
   - Posts are generated in "draft" status
   - Edit inline in the UI or via API
   - Changes are tracked in metadata

4. **Regenerate Post**
   ```typescript
   // POST /api/agents/marketing-strategist
   {
     "agentId": "your-agent-id",
     "action": "regenerate_post",
     "data": {
       "postId": "post-id",
       "reason": "Make it more engaging"
     }
   }
   ```

5. **Get Month Content**
   ```typescript
   // POST /api/agents/marketing-strategist
   {
     "agentId": "your-agent-id",
     "action": "get_month_content",
     "data": {
       "month": "2026-11"
     }
   }
   ```

#### UI Component

```tsx
import ContentCalendar from '@/components/agents/ContentCalendar'

// In your component
<ContentCalendar agentId={agentId} />
```

#### Monthly Workflow

1. **Audience Insights** analyzes social posts → extracts pain points
2. **Strategic Planner** defines business KPIs and goals
3. **Marketing Strategist** reads both outputs → generates monthly content (12 posts)
4. Review, edit, or regenerate posts as needed
5. Approve posts and update status
6. Repeat for next month

#### Content Structure

Each post includes:
- **Title**: 5-7 word headline
- **Content**: Full post text with emojis (max 250 words)
- **Structure**: Hook → Problem → Solution → CTA
- **Metadata**: Version, edit history, regeneration tracking
- **Links**: Connected to pain point and KPI

### Content Executor Agent

The Content Executor agent delivers daily content and manages the publishing workflow.

#### Features
- **Daily Content Delivery**: Get today's content ready to publish
- **Weekly Preview**: See upcoming content for the next 7 days
- **One-Click Publishing**: Mark content as published with single click
- **Performance Stats**: Track monthly completion rate and day streak
- **Email Notifications**: Daily reminders with content ready to copy

#### Usage

1. **Create Content Executor Agent**
   - In your space, create a new agent
   - Set the role to `content_executor`
   - Configure LLM settings as needed

2. **Get Today's Content**
   ```typescript
   // POST /api/agents/content-executor
   {
     "agentId": "your-agent-id",
     "action": "get_today"
   }
   ```

3. **Get Upcoming Content**
   ```typescript
   // POST /api/agents/content-executor
   {
     "agentId": "your-agent-id",
     "action": "get_upcoming",
     "data": { "days": 7 }
   }
   ```

4. **Mark as Published**
   ```typescript
   // POST /api/agents/content-executor
   {
     "agentId": "your-agent-id",
     "action": "mark_published",
     "data": { "contentId": "content-id" }
   }
   ```

5. **Get Stats**
   ```typescript
   // POST /api/agents/content-executor
   {
     "agentId": "your-agent-id",
     "action": "get_stats"
   }
   ```

### Multi-Agent Dashboard

The unified dashboard brings all agents together in a single view.

#### Features
- **KPI Progress**: Real-time progress bars for business goals
- **Today's Content**: Full content ready to copy and publish
- **Top Pain Points**: Most frequent audience problems
- **Weekly Preview**: Upcoming content at a glance
- **Monthly Performance**: Completion rate and day streak
- **Agent Status**: Visual overview of all active agents

#### Usage

```tsx
import MultiAgentDashboard from '@/components/dashboard/MultiAgentDashboard'

// In your component
<MultiAgentDashboard spaceId={spaceId} />
```

### Email Notifications

Daily reminders sent at 8 AM with:
- Full content ready to copy
- KPI progress update
- Quick action buttons

#### Setup

1. **Configure Resend API Key**
   ```bash
   # Add to .env.local or Vercel environment variables
   RESEND_API_KEY=your_resend_api_key
   CRON_SECRET=your_random_secret
   NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
   ```

2. **Deploy to Vercel**
   - Vercel Cron automatically reads `vercel.json`
   - Cron job runs daily at 8 AM
   - Sends emails to users with content ready

### Daily Workflow

**8:00 AM** - Automated email with today's content  
**You** - Open dashboard or email  
**2 min** - Copy content, publish, mark as done  
**Repeat** - Consistency = success

### Complete Agent Flow

```
Strategic Planner → Defines: "500 users by Dec"
        ↓
Audience Insights → Analyzes: FB posts → Pain points
        ↓
Marketing Strategist → Reads both → Generates: 12 posts
        ↓
Content Executor → Daily: Email + Dashboard
        ↓
You → Copy → Publish → Mark done (2 min)
```

## 🎯 Roadmap

- [x] Multi-agent foundation with specialized roles
- [x] Strategic Planner agent with KPI tracking
- [x] Audience Insights agent implementation
- [x] Marketing Strategist agent implementation
- [x] Content Executor agent implementation
- [x] Multi-Agent Dashboard
- [x] Email notification system
- [x] Daily reminder cron job
- [ ] Multi-user collaboration in spaces
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
2. Enter your API URL: `https://your-deployment-url.vercel.app` (replace with your actual deployment URL)
3. Click "Save Settings"

#### 4. Setup Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create new integration: "Multi-Agent FB Saver"
3. Copy the Internal Integration Token
4. Add to Vercel environment variables:
   - `NOTION_API_KEY=secret_xxxxx`
   - `NOTION_DATABASE_ID=your_notion_database_id`
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