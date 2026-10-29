import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function usePremium(userId?: string) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsPremium(false);
      setLoading(false);
      return false;
    }

    const { data, error } = await supabase
      .from('users')
      .select('premium_status')
      .eq('id', userId)
      .maybeSingle();

    const unlocked = !error && Boolean(data?.premium_status);
    setIsPremium(unlocked);
    setLoading(false);
    return unlocked;
  }, [userId]);

  useEffect(() => {
    setLoading(Boolean(userId));
    refresh();
  }, [refresh, userId]);

  return { isPremium, loading, refresh };
}
