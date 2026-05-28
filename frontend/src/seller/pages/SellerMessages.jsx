import { useEffect, useState, useRef } from 'react';
import { sellerApi } from '../api/sellerClient';
import { useSeller } from '../context/SellerContext';

export default function SellerMessages() {
  const { seller } = useSeller();
  const [convs, setConvs]       = useState([]);
  const [active, setActive]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    sellerApi.get('/messages')
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openConv = async (conv) => {
    setActive(conv);
    try {
      const d = await sellerApi.get(`/messages/${conv.id}`);
      setMessages(d.messages || []);
      setConvs(cs => cs.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
    } catch {}
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !active || sending) return;
    setSending(true);
    try {
      const msg = await sellerApi.post(`/messages/${active.id}/send`, { content: text.trim() });
      setMessages(ms => [...ms, msg]);
      setText('');
    } catch {}
    setSending(false);
  };

  const fmtTime = d => new Date(d).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = d => new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' });

  const totalUnread = convs.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Conversations list */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold">Messages</h2>
            {totalUnread > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{totalUnread}</span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-slate-500 text-sm text-center py-8">Chargement...</div>
          ) : convs.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-8">Aucun message</div>
          ) : convs.map(c => (
            <button key={c.id} onClick={() => openConv(c)}
              className={`w-full flex items-start gap-3 p-4 border-b border-slate-800 hover:bg-slate-800 transition-colors text-left ${active?.id === c.id ? 'bg-slate-800' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {c.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-sm font-medium truncate">{c.user?.name || 'Client'}</span>
                  {c.lastMessage && <span className="text-slate-600 text-xs flex-shrink-0">{fmtDate(c.lastMessage.createdAt)}</span>}
                </div>
                <div className="text-slate-500 text-xs truncate mt-0.5">
                  {c.lastMessage?.content || c.subject || 'Nouvelle conversation'}
                </div>
                {c.unread > 0 && (
                  <span className="mt-1 inline-block bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">{c.unread} new</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {active ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-5 gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              {active.user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="text-slate-200 font-medium text-sm">{active.user?.name}</div>
              <div className="text-slate-500 text-xs">{active.user?.email}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(m => {
              const isSeller = m.senderType === 'SELLER';
              return (
                <div key={m.id} className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 ${
                    isSeller ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                  }`}>
                    <p className="text-sm">{m.content}</p>
                    <p className={`text-xs mt-1 ${isSeller ? 'text-blue-200' : 'text-slate-500'}`}>{fmtTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
            <input
              value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Écrire un message..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button onClick={send} disabled={!text.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Envoyer
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-3">💬</div>
            <div className="text-slate-400 font-medium">Sélectionnez une conversation</div>
            <div className="text-slate-600 text-sm mt-1">Répondez aux questions de vos clients</div>
          </div>
        </div>
      )}
    </div>
  );
}
