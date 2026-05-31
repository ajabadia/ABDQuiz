'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send, User, GraduationCap, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { sendMessageAction, getMessagesAction, markMessagesReadAction, type ChatMessage } from '@/actions/chat';

interface ChatThreadProps {
  attemptId: string;
  /** If true, renders in professor/teacher mode */
  isProfessor?: boolean;
  /** Max height of the chat container */
  maxHeight?: string;
}

export function ChatThread({ attemptId, isProfessor = false, maxHeight = '320px' }: ChatThreadProps) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const res = await getMessagesAction(attemptId);
    if (res.success && res.messages) {
      setMessages(res.messages);
    }
    setLoading(false);
  }, [attemptId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when chat is expanded and has messages
  useEffect(() => {
    if (expanded && !loading && messages.length > 0) {
      markMessagesReadAction(attemptId).catch(() => {});
    }
  }, [expanded, loading, messages.length, attemptId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const res = await sendMessageAction(attemptId, input.trim());
    if (res.success) {
      setInput('');
      await loadMessages();
      // Focus back on input after sending
      inputRef.current?.focus();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasUnread = messages.some((m) => {
    if (isProfessor) return m.sender === 'student' && !m.read;
    return m.sender === 'professor' && !m.read;
  });

  return (
    <Card className="bg-card/20 border-border rounded-none overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
        aria-label={expanded ? t('collapse') : t('expand')}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono">
            {t('title')}
          </span>
          {hasUnread && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground">
            {messages.length} {t('messageCount')}
          </span>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col">
          <Separator className="bg-border" />

          {/* Messages area */}
          <div
            className="overflow-y-auto p-4 space-y-3"
            style={{ maxHeight }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                  {t('empty')}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground/40 mt-1">
                  {isProfessor ? t('emptyProfessorHint') : t('emptyStudentHint')}
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isFromProfessor = msg.sender === 'professor';
                const alignRight = isProfessor ? !isFromProfessor : isFromProfessor;

                return (
                  <div
                    key={idx}
                    className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 ${
                        isFromProfessor
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-card/40 border border-border/50'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isFromProfessor ? (
                          <GraduationCap className="w-2.5 h-2.5 text-primary" />
                        ) : (
                          <User className="w-2.5 h-2.5 text-muted-foreground" />
                        )}
                        <span className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">
                          {isFromProfessor ? t('professor') : t('student')}
                        </span>
                        {!msg.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                      </p>
                      <p className="text-[7px] font-mono text-muted-foreground/50 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <Separator className="bg-border" />

          {/* Input area */}
          <div className="p-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('inputPlaceholder')}
              rows={1}
              className="flex-1 bg-card/20 border border-border px-3 py-2 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:border-primary/40 transition-colors"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="h-8 w-8 p-0 rounded-none bg-primary hover:bg-primary/80 shrink-0"
              aria-label={t('send')}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
