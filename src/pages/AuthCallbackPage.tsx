import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const providerError = params.get('error_description') || hash.get('error_description');
    if (params.get('error') || hash.get('error')) {
      setMessage(providerError || 'That sign-in did not finish. Use email instead.');
      return;
    }

    let settled = false;
    const finish = (session: Session | null) => {
      if (settled || !session) return;
      settled = true;
      navigate('/dashboard', { replace: true });
    };

    supabase.auth.getSession().then(({ data }) => finish(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      finish(session);
    });
    const timer = window.setTimeout(() => {
      if (!settled) {
        setMessage('We could not finish signing you in. Use email instead.');
      }
    }, 8000);

    return () => {
      settled = true;
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [navigate]);

  if (!message) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-4 text-center">
        <div>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-4xl">Sign-in didn't finish</h1>
      <p className="mt-3 text-muted-foreground">{message}</p>
      <Button className="mt-6 rounded-full" onClick={() => navigate('/auth')}>
        Back to email sign-in
      </Button>
    </div>
  );
};

export default AuthCallbackPage;
