import React from 'react';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">ChatInsights</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Unlock deep insights from your ChatGPT conversations with AI-powered analysis.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-sm">
              <p>
                <a 
                  href="mailto:support@chatinsights.online" 
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  support@chatinsights.online
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Built With Section */}
        <div className="border-t mt-8 pt-8">
          <div className="text-center mb-6">
            <h4 className="text-sm font-semibold text-muted-foreground mb-4">Built With</h4>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
              {/* Bolt.new Logo */}
              <div className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity">
                <img 
                  src="/white_circle_360x360.png" 
                  alt="Bolt.new" 
                  className="h-6 w-6"
                />
                <span className="text-sm text-muted-foreground">Bolt.new</span>
              </div>
              
              {/* Entri Logo */}
              <div className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity">
                <img 
                  src="/wordmark-color copy.svg" 
                  alt="Entri" 
                  className="h-6"
                />
              </div>
              
              {/* Netlify Logo */}
              <div className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity">
                <svg className="h-6 w-6" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M185.532 88.839l-.094-.04a.396.396 0 01-.154-.087.734.734 0 01-.187-.621l5.167-31.553-.137-.04c-.2-.058-.338-.256-.338-.498 0-.284.23-.514.514-.514.284 0 .514.23.514.514 0 .05-.007.1-.02.147l-5.167 31.553a.734.734 0 01-.187.621.396.396 0 01-.154.087l-.094.04z" fill="#00C7B7"/>
                  <path d="M128 0C57.308 0 0 57.308 0 128s57.308 128 128 128 128-57.308 128-128S198.692 0 128 0zm0 240C66.98 240 16 189.02 16 128S66.98 16 128 16s112 50.98 112 112-50.98 112-112 112z" fill="#00C7B7"/>
                  <path d="M128 32c-53.02 0-96 42.98-96 96s42.98 96 96 96 96-42.98 96-96-42.98-96-96-96zm0 176c-44.11 0-80-35.89-80-80s35.89-80 80-80 80 35.89 80 80-35.89 80-80 80z" fill="#00C7B7"/>
                </svg>
                <span className="text-sm text-muted-foreground">Netlify</span>
              </div>
              
              {/* Supabase Logo */}
              <div className="flex items-center space-x-2 opacity-70 hover:opacity-100 transition-opacity">
                <svg className="h-6 w-6" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)"/>
                  <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2"/>
                  <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
                  <defs>
                    <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#249361"/>
                      <stop offset="1" stopColor="#3ECF8E"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
                      <stop/>
                      <stop offset="1" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-sm text-muted-foreground">Supabase</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 ChatInsights. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;