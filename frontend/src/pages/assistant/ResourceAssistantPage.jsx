import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Bot,
  CalendarPlus,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Users,
  Building2,
} from 'lucide-react';
import { assistantService } from '../../services/assistantService';
import { resourceService } from '../../services/resourceService';

const STARTER_PROMPTS = [
  'Find me the best room for a 20-person project meeting with presentation equipment.',
  'Which resource is best for a software lab session tomorrow?',
  'Tell me about this resource and whether it fits a student workshop.',
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl rounded-3xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100'
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60 mb-2">
          {isUser ? 'You' : 'AI Assistant'}
        </p>
        <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }) {
  return (
    <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">
            {suggestion.status}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{suggestion.name}</h3>
        </div>
        <div className="rounded-2xl bg-amber-100 dark:bg-amber-500/10 p-2">
          <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-300" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span>{suggestion.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{suggestion.capacity ?? 0} capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>{suggestion.location || '-'}</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{suggestion.reason}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to={`/resources/${suggestion.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          View resource
        </Link>
        <Link
          to={suggestion.bookingUrl}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          <CalendarPlus className="h-4 w-4" />
          Book now
        </Link>
      </div>
    </div>
  );
}

export default function ResourceAssistantPage() {
  const [searchParams] = useSearchParams();
  const resourceId = searchParams.get('resourceId');
  const [selectedResource, setSelectedResource] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Ask me about rooms, capacity, availability fit, or what to book for a specific need. I can also suggest the best matching resources and send you straight into booking.',
    },
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!resourceId) {
      setSelectedResource(null);
      return;
    }

    resourceService
      .getById(resourceId)
      .then((res) => {
        setSelectedResource(res.data);
        setMessages((current) => {
          if (current.some((message) => message.content.includes('focused on'))) {
            return current;
          }
          return [
            ...current,
            {
              role: 'assistant',
              content: `This conversation is focused on ${res.data.name}. Ask whether it fits your use case, or ask me to compare it with other options.`,
            },
          ];
        });
      })
      .catch(() => {
        setSelectedResource(null);
      });
  }, [resourceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, suggestions]);

  const submitMessage = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await assistantService.chat({
        resourceId: resourceId ? Number(resourceId) : null,
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      setMessages((current) => [...current, { role: 'assistant', content: res.data.answer }]);
      setSuggestions(res.data.suggestions ?? []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to contact the resource assistant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <aside className="space-y-6">
        <div className="rounded-[28px] border border-gray-200 dark:border-gray-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_45%),linear-gradient(135deg,#fff8eb_0%,#ffffff_60%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_45%),linear-gradient(135deg,#18181b_0%,#09090b_60%)] p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-zinc-900 p-3 text-white dark:bg-white dark:text-zinc-900">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
                AI Resource Assistant
              </p>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Ask, compare, and book faster</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
            The assistant uses your campus resource data to answer questions, recommend the best-fit rooms, and point you to the right booking flow.
          </p>
        </div>

        {selectedResource && (
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
              Selected resource
            </p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{selectedResource.name}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {selectedResource.type?.replace(/_/g, ' ')} • {selectedResource.capacity ?? 0} capacity
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{selectedResource.location || '-'}</p>
            <div className="mt-4">
              <Link
                to={`/resources/${selectedResource.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
              >
                Open resource detail
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
            Starter prompts
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => submitMessage(prompt)}
                className="text-left rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/60 dark:hover:bg-amber-500/5 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-stone-100/80 dark:bg-zinc-950/70 p-4 sm:p-6 shadow-sm">
        <div className="grid gap-6">
          <div className="rounded-[28px] bg-gradient-to-br from-white via-white to-amber-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-amber-950/20 border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
            <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
              {messages.map((message, index) => (
                <MessageBubble key={`${message.role}-${index}`} message={message} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-3 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking through the best resource fit...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage(input);
              }}
              className="mt-5 flex flex-col gap-3"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={4}
                placeholder="Ask for the best room, compare resources, or get help choosing what to book..."
                className="w-full rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 px-4 py-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </form>
          </div>

          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
