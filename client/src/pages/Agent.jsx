import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';
const GOLD = '#c9a35a';
const GOLD_DIM = '#7a6b48';
const BORDER = '#3d3428';
const SURFACE = '#141210';
const TEXT = '#f0e0b8';

export default function Agent() {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]); // display messages
  const [history, setHistory] = useState([]);   // raw API history for context
  const [deck, setDeck] = useState({});
  const [budget, setBudget] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedDecks, setSavedDecks] = useState([]);
  const [showDecks, setShowDecks] = useState(false);
  const [expandedDeckId, setExpandedDeckId] = useState(null);
  const [deckDetails, setDeckDetails] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchSavedDecks();
  }, []);

  async function toggleDeck(id) {
    if (expandedDeckId === id) { setExpandedDeckId(null); return; }
    setExpandedDeckId(id);
    if (deckDetails[id]) return; // already fetched
    try {
      const res = await fetch(`${API_URL}/api/decks/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) { const data = await res.json(); setDeckDetails(prev => ({ ...prev, [id]: data })); }
    } catch {}
  }

  async function fetchSavedDecks() {
    try {
      const res = await fetch(`${API_URL}/api/decks`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) setSavedDecks(await res.json());
    } catch {}
  }

  async function send() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: text, history, deck, budget_usd: budget }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'agent', text: data.error || 'Something went wrong.' }]);
        return;
      }
      setMessages(prev => [...prev, { role: 'agent', text: data.reply }]);
      setHistory(data.history);
      setDeck(data.deck || {});
      setBudget(data.budget_usd ?? null);

      // Refresh saved decks list in case a deck was just saved
      fetchSavedDecks();
    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Network error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const deckEntries = Object.entries(deck).sort(([a], [b]) => a.localeCompare(b));
  const deckTotal = deckEntries.reduce((s, [, i]) => s + i.quantity, 0);
  const deckCost = deckEntries.reduce((s, [, i]) => s + (i.price_usd || 0) * i.quantity, 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: '#0f0d0a', overflow: 'hidden' }}>

      {/* ── Left: Chat ── */}
      <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}` }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: `1px solid ${BORDER}` }}>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.22em', color: GOLD, fontWeight: 'normal', margin: 0 }}>
            DECK BUILDER AGENT
          </h1>
          <p style={{ fontSize: '0.75rem', color: GOLD_DIM, fontStyle: 'italic', margin: '0.2rem 0 0' }}>
            Ask me to build a deck, search for cards, or load your collection.
          </p>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#2d2820' }}>
                START A CONVERSATION
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%',
                padding: '0.65rem 1rem',
                borderRadius: 8,
                backgroundColor: msg.role === 'user' ? '#1e1a12' : SURFACE,
                border: `1px solid ${msg.role === 'user' ? '#4a3e28' : BORDER}`,
                fontSize: '0.85rem',
                color: TEXT,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.65rem 1rem', borderRadius: 8, backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}>
                <Spinner />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '1rem 2rem', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about cards, formats, or deck strategies..."
              rows={2}
              aria-label="Message to deck builder agent"
              style={{
                flex: 1,
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                color: TEXT,
                fontSize: '0.85rem',
                padding: '0.6rem 0.9rem',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              style={{
                padding: '0 1.25rem',
                background: 'transparent',
                border: `1px solid ${!input.trim() || isLoading ? BORDER : GOLD}`,
                borderRadius: 6,
                color: !input.trim() || isLoading ? GOLD_DIM : GOLD,
                fontFamily: 'Cinzel, serif',
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                cursor: !input.trim() || isLoading ? 'default' : 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              SEND
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#2d2820', marginTop: '0.4rem', fontStyle: 'italic' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Right: Deck panel ── */}
      <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

        {/* Working deck */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.22em', color: GOLD, fontWeight: 'normal', margin: 0 }}>
              WORKING DECK
            </h2>
            {deckTotal > 0 && (
              <span style={{ fontSize: '0.75rem', color: GOLD_DIM, fontStyle: 'italic' }}>
                {deckTotal} cards · ${deckCost.toFixed(2)}
              </span>
            )}
          </div>

          {budget !== null && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#1a1714', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: '0.75rem', color: GOLD_DIM }}>
              Budget: ${budget.toFixed(2)} · Spent: ${deckCost.toFixed(2)} · Left: ${Math.max(0, budget - deckCost).toFixed(2)}
            </div>
          )}

          {deckEntries.length === 0 ? (
            <p style={{ color: '#2d2820', fontSize: '0.78rem', fontStyle: 'italic' }}>No cards yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {deckEntries.map(([name, info]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.8rem' }}>
                  <span style={{ color: TEXT }}>
                    <span style={{ color: GOLD_DIM, marginRight: '0.4rem' }}>{info.quantity}x</span>
                    {name}
                  </span>
                  {info.price_usd != null && (
                    <span style={{ color: GOLD_DIM, fontSize: '0.72rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                      ${(info.price_usd * info.quantity).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved decks */}
        <div style={{ padding: '1.25rem 1.75rem' }}>
          <button
            onClick={() => setShowDecks(v => !v)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'Cinzel, serif', fontSize: '0.65rem', letterSpacing: '0.22em',
              color: GOLD, padding: 0, marginBottom: showDecks ? '0.75rem' : 0,
            }}
            aria-expanded={showDecks}
          >
            SAVED DECKS {showDecks ? '▲' : '▼'}
          </button>

          {showDecks && (
            savedDecks.length === 0 ? (
              <p style={{ color: '#2d2820', fontSize: '0.78rem', fontStyle: 'italic' }}>No saved decks yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {savedDecks.map(d => {
                  const isOpen = expandedDeckId === d.id;
                  const detail = deckDetails[d.id];
                  return (
                    <div key={d.id} style={{ backgroundColor: SURFACE, border: `1px solid ${isOpen ? GOLD_DIM : BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
                      {/* Deck header — click to expand */}
                      <button
                        onClick={() => toggleDeck(d.id)}
                        aria-expanded={isOpen}
                        style={{
                          width: '100%', background: 'transparent', border: 'none',
                          padding: '0.6rem 0.75rem', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: TEXT }}>{d.name}</span>
                        <span style={{ fontSize: '0.7rem', color: GOLD_DIM, fontStyle: 'italic', flexShrink: 0, marginLeft: '0.5rem' }}>
                          ${(d.total_cost || 0).toFixed(2)} {isOpen ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Card list */}
                      {isOpen && (
                        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '0.6rem 0.75rem' }}>
                          {!detail ? (
                            <p style={{ fontSize: '0.75rem', color: GOLD_DIM, fontStyle: 'italic', margin: 0 }}>Loading...</p>
                          ) : (
                            <>
                              {detail.summary && (
                                <p style={{ fontSize: '0.73rem', color: GOLD_DIM, fontStyle: 'italic', marginBottom: '0.6rem' }}>
                                  {detail.summary}
                                </p>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                {(detail.cards || []).sort((a, b) => a.card_name.localeCompare(b.card_name)).map(c => (
                                  <div key={c.card_name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                    <span style={{ color: TEXT }}>
                                      <span style={{ color: GOLD_DIM, marginRight: '0.4rem' }}>{c.quantity}x</span>
                                      {c.card_name}
                                    </span>
                                    {c.price_usd != null && (
                                      <span style={{ color: GOLD_DIM, fontSize: '0.7rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                                        ${(c.price_usd * c.quantity).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <p style={{ fontSize: '0.68rem', color: '#2d2820', fontStyle: 'italic', marginTop: '0.5rem', marginBottom: 0 }}>
                                Saved {new Date(detail.created_at).toLocaleDateString()}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 18, height: 18,
      border: `2px solid ${BORDER}`,
      borderTop: `2px solid ${GOLD}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
