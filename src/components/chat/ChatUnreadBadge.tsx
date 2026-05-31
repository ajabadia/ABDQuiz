'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { getUnreadChatCountAction } from '@/actions/chat';
import { useRouter, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 30_000;

export function ChatUnreadBadge() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isOnGradingPage = pathname?.includes('/admin/grading');

  const fetchCount = useCallback(async () => {
    try {
      const n = await getUnreadChatCountAction();
      setCount(n);
    } catch {
      // Silently fail — badge just shows 0
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchCount]);

  const handleClick = () => {
    router.push('/admin/grading');
  };

  if (loading) return null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 cursor-pointer rounded-none',
        isOnGradingPage && 'text-primary'
      )}
      aria-label={`${count} mensajes sin leer de alumnos`}
      title={`${count} mensajes sin leer`}
    >
      <MessageSquare size={16} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-mono font-bold px-1 leading-none rounded-sm animate-in zoom-in duration-150">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
