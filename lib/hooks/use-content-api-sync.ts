import { useMemo } from 'react';
import { useAuthContext } from '@/lib/auth/auth-context';
import type { ContentApiSync } from '@/lib/api/content-api';

export function useContentApiSync(): ContentApiSync | null {
  const { tokenPair, executeSignIn } = useAuthContext();
  return useMemo((): ContentApiSync | null => {
    if (!tokenPair) {
      return null;
    }
    return { tokenPair, executeSignIn };
  }, [tokenPair, executeSignIn]);
}
