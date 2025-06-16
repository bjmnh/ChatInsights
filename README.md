# OpenAI Chat Insights

A React application that analyzes ChatGPT conversation data to provide insights about communication patterns, personality traits, and behavioral characteristics.

## Features

- **User Authentication**: Secure sign-up and login with Supabase Auth (Email, Google, Apple)
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
VITE_APP_URL=http://localhost:5173
```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the migration files in order:
     - `supabase/migrations/20250615044735_dark_coast.sql`
     - `supabase/migrations/20250616090703_velvet_river.sql`

5. Configure Supabase Authentication:
   
   **Basic Setup:**
   - Go to Authentication → URL Configuration in your Supabase dashboard
   - Set **Site URL** to: `http://localhost:5173` (for development)
   - Add **Redirect URLs**:
     - `http://localhost:5173/auth/confirm`
     - `http://localhost:5173/auth/reset-password`

   **Google OAuth Setup:**
   - Go to Authentication → Providers → Google
   - Enable Google provider
   - Add your Google OAuth credentials:
     - **Client ID**: Get from [Google Cloud Console](https://console.cloud.google.com/)
     - **Client Secret**: Get from Google Cloud Console
   - Set **Authorized redirect URIs** in Google Cloud Console:
     - `https://yaykfgyucipnqufydyjb.supabase.co/auth/v1/callback`

   **Apple OAuth Setup:**
   - Go to Authentication → Providers → Apple
   - Enable Apple provider
   - Add your Apple OAuth credentials:
     - **Services ID**: Get from [Apple Developer](https://developer.apple.com/)
     - **Team ID**: Your Apple Developer Team ID
     - **Key ID**: Your Apple Sign In Key ID
     - **Private Key**: Your Apple Sign In private key
   - Set **Return URLs** in Apple Developer Console:
     - `https://yaykfgyucipnqufydyjb.supabase.co/auth/v1/callback`

6. Set up Storage:
   - Go to Storage in your Supabase dashboard
   - Create a new bucket called `conversation-files`
   - Set appropriate policies for authenticated users

7. Start the development server:
```bash
npm run dev
```

## OAuth Provider Setup Guide

### Google OAuth Setup

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google+ API:**
   - Go to APIs & Services → Library
   - Search for "Google+ API" and enable it

3. **Create OAuth Credentials:**
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URI: `https://yaykfgyucipnqufydyjb.supabase.co/auth/v1/callback`

4. **Configure in Supabase:**
   - Copy Client ID and Client Secret to Supabase Auth settings

### Apple OAuth Setup

1. **Apple Developer Account:**
   - You need an active Apple Developer account ($99/year)

2. **Create App ID:**
   - Go to [Apple Developer](https://developer.apple.com/)
   - Certificates, Identifiers & Profiles → Identifiers
   - Create new App ID with Sign In with Apple capability

3. **Create Services ID:**
   - Create new Services ID
   - Enable Sign In with Apple
   - Configure return URL: `https://yaykfgyucipnqufydyjb.supabase.co/auth/v1/callback`

4. **Create Private Key:**
   - Go to Keys section
   - Create new key with Sign In with Apple capability
   - Download the .p8 file

5. **Configure in Supabase:**
   - Add Services ID, Team ID, Key ID, and Private Key content

## Production Deployment

### Environment Configuration

For production deployment, update your environment variables:

```bash
# Production .env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=https://yourdomain.com
```

### Supabase Configuration for Production

1. **Update Site URL** in Supabase Dashboard:
   - Go to Authentication → URL Configuration
   - Set **Site URL** to: `https://yourdomain.com`

2. **Update Redirect URLs**:
   - `https://yourdomain.com/auth/confirm`
   - `https://yourdomain.com/auth/reset-password`

3. **Update OAuth Provider Settings:**
   - **Google**: Update authorized redirect URIs in Google Cloud Console
   - **Apple**: Update return URLs in Apple Developer Console

4. **Deploy Steps**:
   ```bash
   npm run build
   ```
   Deploy the `dist` folder to your hosting platform (Vercel, Netlify, etc.)

### Hosting Platform Setup

The app is configured to work seamlessly with:
- **Vercel**: Zero-config deployment
- **Netlify**: Automatic builds and deploys
- **Any static hosting**: Just upload the `dist` folder

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
- **AuthContext**: Manages user authentication state with social providers
- **JobService**: Handles analysis job operations
- **ReportService**: Manages insight reports
- **StorageService**: File upload and management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.