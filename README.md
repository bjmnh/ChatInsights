# OpenAI Chat Insights

A React application that analyzes ChatGPT conversation data to provide insights about communication patterns, personality traits, and behavioral characteristics.

## Features

- **User Authentication**: Secure sign-up and login with Supabase Auth
- **File Upload**: Upload ChatGPT conversations.json files
- **Real-time Analysis**: Track analysis progress in real-time
- **Free Insights**: Basic conversation analytics and patterns
- **Premium Insights**: Advanced personality profiling and hidden pattern discovery
- **Data Privacy**: Automatic deletion of raw conversation data after analysis
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Backend**: Supabase (Database, Auth, Storage, Real-time)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd openai-chat-insights
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the migration file: `supabase/migrations/create_initial_schema.sql`

5. Set up Storage:
   - Go to Storage in your Supabase dashboard
   - Create a new bucket called `conversation-files`
   - Set appropriate policies for authenticated users

6. Start the development server:
```bash
npm run dev
```

## Database Schema

The application uses the following main tables:

- **users**: User profiles and premium status
- **jobs**: Analysis job tracking and progress
- **user_reports**: Generated insights and reports
- **payments**: Payment history (for future Stripe integration)

## Features Overview

### Free Tier
- Basic conversation analytics
- Activity patterns and timing
- Topic distribution
- Communication style analysis
- Up to 3 analyses

### Premium Tier
- **The Digital Mirror**: AI personality profiling
- **Hidden Patterns**: Unconscious theme discovery
- **The Revelation Map**: Cross-conversation connections
- Unlimited analyses
- Advanced behavioral insights

## Privacy & Security

- Raw conversation data is automatically deleted after analysis
- All data is encrypted in transit and at rest
- Row Level Security (RLS) ensures users can only access their own data
- GDPR compliant with full data export and deletion capabilities

## Development

### Project Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Theme)
├── lib/               # Utilities and configurations
├── pages/             # Page components
├── services/          # API service layers
└── hooks/             # Custom React hooks
```

### Key Services
- **AuthContext**: Manages user authentication state
- **JobService**: Handles analysis job operations
- **ReportService**: Manages insight reports
- **StorageService**: File upload and management

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)

3. Set up environment variables in your hosting platform

4. Configure Supabase for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.