import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

function parseMana(cost) {
  if (!cost) return [];
  return (cost.match(/\{[^}]+\}/g) || []).map((s) => s.slice(1, -1));
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

const GOLD = '#c9a35a';
const GOLD_DIM = '#7a6b48';
const SURFACE = '#141210';
const BORDER = '#3d3428';
const TEXT = '#f0e0b8';

export default function Scanner() {
  const { session } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [card, setCard] = useState(null);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setCard(null);
    setError(null);
    setSaveStatus(null);
    setIsLoading(true);

    try {
      const base64 = await compressImage(file, 1200, 0.85);
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ imageBase64: base64, mediaType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to identify card.');
      } else {
        setCard({ ...data, quantity: 1 });
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };
  const handleFileInput = (e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  const setField = (field, value) => setCard((c) => ({ ...c, [field]: value }));

  const saveCard = async () => {
    setSaveStatus('saving');
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(card),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save card.');
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
      }
    } catch {
      setError('Network error. Please try again.');
      setSaveStatus('error');
    }
  };

  const manaSymbols = parseMana(card?.mana_cost);
  const hasPT = card?.power != null && card?.toughness != null;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: '#0f0d0a', overflow: 'hidden' }}>

      {/* ── Left: Drop Zone ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
        style={{
          flex: '0 0 50%',
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem 2.5rem',
          borderRight: `1px solid ${BORDER}`,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <input id="file-input" type="file" accept="image/*" aria-label="Upload a card image" style={{ display: 'none' }} onChange={handleFileInput} />

        <SectionLabel>Identify a Card</SectionLabel>

        {/* Drop box */}
        <div style={{
          flex: 1,
          border: `1px dashed ${isDragging ? GOLD : '#3d3428'}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.9rem',
          backgroundColor: isDragging ? 'rgba(201,163,90,0.04)' : SURFACE,
          transition: 'border-color 0.15s, background-color 0.15s',
        }}>
          {isLoading ? (
            <>
              <Spinner />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.15em', color: GOLD }}>
                IDENTIFYING...
              </span>
            </>
          ) : (
            <>
              <CameraIcon color={isDragging ? GOLD : '#3d3428'} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: isDragging ? GOLD : '#8a7a58', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  Drop a card image here
                </p>
                <p style={{ color: GOLD_DIM, fontSize: '0.78rem', fontStyle: 'italic' }}>
                  or click to browse files · JPG, PNG, WEBP
                </p>
              </div>
            </>
          )}
        </div>

        {/* Status / error strip */}
        <div style={{ marginTop: '1rem', minHeight: 52 }}>
          {card && !isLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              backgroundColor: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
            }}>
              <div style={{
                width: 8, height: 8, flexShrink: 0, marginTop: 4,
                borderRadius: '50%', backgroundColor: '#4ade80',
                boxShadow: '0 0 8px #4ade80',
              }} />
              <p style={{ fontSize: '0.8rem', color: '#6b5d3e', lineHeight: 1.5 }}>
                Card identified via Claude Vision · Validated on Scryfall
              </p>
            </div>
          )}
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#1a0d0d',
              border: '1px solid #5a2020',
              borderRadius: 6,
              color: '#e57373',
              fontSize: '0.82rem',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Card Result ── */}
      <div style={{
        flex: '0 0 50%',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 2.5rem',
        overflowY: 'auto',
      }}>
        <SectionLabel>Card Result</SectionLabel>

        {!card && !isLoading && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.18em', color: '#2d2820',
          }}>
            NO CARD SCANNED
          </div>
        )}

        {card && (
          <>
            {/* Image + info row */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

              {/* Scryfall image */}
              <div style={{ flexShrink: 0 }}>
                {card.scryfall_image_url ? (
                  <img
                    src={card.scryfall_image_url}
                    alt={card.card_name}
                    style={{
                      width: 190,
                      borderRadius: 10,
                      display: 'block',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 190, height: 265, borderRadius: 10,
                    backgroundColor: '#1a1714', border: `1px solid ${BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#3d3428', fontSize: '0.8rem', fontStyle: 'italic',
                  }}>
                    Card art
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: '0.25rem' }}>
                {/* Card name */}
                <GhostInput
                  value={card.card_name}
                  onChange={(v) => setField('card_name', v)}
                  style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: TEXT,
                    marginBottom: '0.3rem',
                  }}
                />

                {/* Type line */}
                <GhostInput
                  value={card.type_line}
                  onChange={(v) => setField('type_line', v)}
                  style={{
                    fontStyle: 'italic',
                    fontSize: '0.83rem',
                    color: '#8a7a58',
                    marginBottom: '0.9rem',
                  }}
                />

                {/* Mana cost + P/T badges */}
                {(manaSymbols.length > 0 || hasPT) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                    {manaSymbols.map((sym, i) => (
                      <ManaBadge key={i} sym={sym} />
                    ))}
                    {hasPT && (
                      <ManaBadge>{card.power} / {card.toughness}</ManaBadge>
                    )}
                  </div>
                )}

                {/* Set (editable) */}
                <InfoRow
                  label="Set"
                  value={card.set_name}
                  onChange={(v) => setField('set_name', v)}
                />

                {/* Rarity (read-only) */}
                {card.rarity && (
                  <InfoRow label="Rarity" value={capitalize(card.rarity)} readOnly />
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: '1.75rem 0 1.25rem' }} />

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem' }}>
              <span style={{
                fontFamily: 'Cinzel, serif', fontSize: '0.7rem',
                letterSpacing: '0.2em', color: GOLD,
              }}>
                QTY
              </span>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1px solid #3d3428`, borderRadius: 6, overflow: 'hidden',
              }}>
                <QtyButton aria-label="Decrease quantity" onClick={() => setField('quantity', Math.max(1, card.quantity - 1))}>−</QtyButton>
                <span style={{
                  width: 52, textAlign: 'center',
                  fontSize: '0.95rem', color: TEXT,
                  backgroundColor: SURFACE, padding: '0.45rem 0',
                  display: 'inline-block',
                }}>
                  {card.quantity}
                </span>
                <QtyButton aria-label="Increase quantity" onClick={() => setField('quantity', card.quantity + 1)}>+</QtyButton>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={saveCard}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                border: `1px solid ${
                  saveStatus === 'saved' ? '#4ade80' :
                  saveStatus === 'saving' ? '#3d3428' : GOLD
                }`,
                borderRadius: 6,
                color: saveStatus === 'saved' ? '#4ade80' :
                       saveStatus === 'saving' ? '#3d3428' : GOLD,
                fontFamily: 'Cinzel, serif',
                fontSize: '0.72rem',
                letterSpacing: '0.2em',
                cursor: (saveStatus === 'saved' || saveStatus === 'saving') ? 'default' : 'pointer',
                transition: 'opacity 0.15s',
              }}
            >
              {saveStatus === 'saving' ? 'SAVING...' :
               saveStatus === 'saved' ? 'SAVED TO COLLECTION' :
               'SAVE TO COLLECTION'}
            </button>

            {saveStatus === 'saved' && (
              <button
                onClick={() => { setCard(null); setSaveStatus(null); setError(null); }}
                style={{
                  marginTop: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: GOLD_DIM,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontStyle: 'italic',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Scan another card
              </button>
            )}

            <p style={{
              marginTop: '1.5rem',
              fontSize: '0.72rem',
              fontStyle: 'italic',
              color: '#3d3428',
              textAlign: 'center',
            }}>
              Card data sourced from Scryfall
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Resizes and converts any image to JPEG before sending to the API.
// Keeps the longest side at maxPx and compresses to the given quality (0–1).
function compressImage(file, maxPx = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Sub-components ──────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <h2 style={{
      fontFamily: 'Cinzel, serif',
      fontSize: '0.65rem',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: GOLD,
      marginBottom: '1rem',
      fontWeight: 'normal',
      margin: '0 0 1rem',
    }}>
      {children}
    </h2>
  );
}

function GhostInput({ value, onChange, style }) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        display: 'block',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid transparent',
        outline: 'none',
        padding: '0 0 2px',
        transition: 'border-color 0.15s',
        ...style,
      }}
      onFocus={(e) => (e.target.style.borderBottomColor = GOLD)}
      onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
    />
  );
}

function InfoRow({ label, value, onChange, readOnly = false }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '0.45rem',
      gap: '0.75rem',
    }}>
      <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: GOLD_DIM, flexShrink: 0 }}>
        {label}
      </span>
      {readOnly ? (
        <span style={{ fontSize: '0.88rem', color: TEXT, fontWeight: '600' }}>{value}</span>
      ) : (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid transparent',
            textAlign: 'right',
            fontSize: '0.88rem',
            color: TEXT,
            outline: 'none',
            padding: '0 0 1px',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderBottomColor = GOLD)}
          onBlur={(e) => (e.target.style.borderBottomColor = 'transparent')}
        />
      )}
    </div>
  );
}

const MANA_STYLES = {
  W: { label: 'W', bg: '#f0e6c0', color: '#2a1a00', border: '#c8b060' },
  U: { label: 'B', bg: '#1a4a8a', color: '#dde8ff', border: '#2a5aaa' }, // Blue shown as B
  B: { label: 'B', bg: '#111111', color: '#aaaaaa', border: '#333333' }, // Black
  R: { label: 'R', bg: '#7a1e1e', color: '#ffd0d0', border: '#aa3030' },
  G: { label: 'G', bg: '#1a4a28', color: '#c0f0c8', border: '#2a6a38' },
  C: { label: 'C', bg: '#2a2828', color: '#aaaaaa', border: '#444444' },
};

function ManaBadge({ sym, children }) {
  const cfg = MANA_STYLES[sym];
  const bg = cfg ? cfg.bg : '#1e1a14';
  const color = cfg ? cfg.color : GOLD;
  const border = cfg ? cfg.border : '#3d3428';
  const label = cfg ? cfg.label : (children ?? sym);

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.2rem 0.55rem',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: 4,
      fontSize: '0.78rem',
      fontWeight: cfg ? '700' : 'normal',
      color,
      fontFamily: 'Cinzel, serif',
      minWidth: 28,
    }}>
      {label}
    </span>
  );
}

function QtyButton({ onClick, children, ...props }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      {...props}
      style={{
        width: 36, height: 36,
        border: 'none',
        backgroundColor: '#1e1a14',
        color: GOLD,
        fontSize: '1.1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={(e) => (e.target.style.backgroundColor = '#2a2418')}
      onMouseLeave={(e) => (e.target.style.backgroundColor = '#1e1a14')}
    >
      {children}
    </button>
  );
}

function CameraIcon({ color }) {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      backgroundColor: '#1e1a14',
      border: `1px solid #3d3428`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 36, height: 36,
      border: `2px solid #2d2820`,
      borderTop: `2px solid ${GOLD}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
