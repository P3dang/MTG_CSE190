import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const GOLD = '#c9a35a';
const GOLD_DIM = '#7a6b48';
const BORDER = '#3d3428';
const SURFACE = '#141210';
const TEXT = '#f0e0b8';

const RARITIES = ['common', 'uncommon', 'rare', 'mythic'];

const RARITY_COLOR = {
  common: '#aaaaaa',
  uncommon: '#a0b8c8',
  rare: '#c9a35a',
  mythic: '#e07828',
};

function rarityColor(r) {
  return RARITY_COLOR[r?.toLowerCase()] || TEXT;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export default function Collection() {
  const { session } = useAuth();
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editSet, setEditSet] = useState('');
  const [editRarity, setEditRarity] = useState('');
  const [editQty, setEditQty] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [prints, setPrints] = useState([]);
  const [loadingPrints, setLoadingPrints] = useState(false);

  useEffect(() => {
    async function fetchCollection() {
      try {
        const res = await fetch(`${API_URL}/api/collection`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load collection.');
        } else {
          setCards(data);
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchCollection();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { deselect(); return; }
      if (!cards.length) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = selected ? cards.findIndex(c => c.id === selected.id) : -1;
        const next = e.key === 'ArrowRight'
          ? Math.min(cards.length - 1, idx + 1)
          : Math.max(0, idx - 1);
        selectCard(cards[next]);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, selected]);

  function selectCard(card) {
    setSelected(card);
    setIsEditing(false);
    setSaveStatus(null);
    setPrints([]);
    fetchPrints(card);
  }

  async function fetchPrints(card) {
    setLoadingPrints(true);
    try {
      const res = await fetch(
        `${API_URL}/api/card-prints?name=${encodeURIComponent(card.card_name)}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (res.ok) setPrints(await res.json());
    } catch {}
    finally { setLoadingPrints(false); }
  }

  async function selectArt(print) {
    if (!selected || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/collection/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          quantity: selected.quantity,
          set_name: print.set_name,
          scryfall_image_url: print.image_url,
        }),
      });
      if (res.ok) {
        const updated = { ...selected, scryfall_image_url: print.image_url, set_name: print.set_name };
        setCards(cs => cs.map(c => (c.id === selected.id ? updated : c)));
        setSelected(updated);
      }
    } catch {}
    finally { setIsSaving(false); }
  }

  function deselect() {
    setSelected(null);
    setIsEditing(false);
    setSaveStatus(null);
    setPrints([]);
  }

  function startEditing() {
    setEditName(selected.card_name || '');
    setEditType(selected.type_line || '');
    setEditSet(selected.set_name || '');
    setEditRarity(selected.rarity || '');
    setEditQty(selected.quantity);
    setSaveStatus(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveStatus(null);
  }

  async function saveCard() {
    if (!selected || isSaving) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/collection/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          card_name: editName,
          type_line: editType,
          set_name: editSet,
          rarity: editRarity,
          quantity: editQty,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = {
          ...selected,
          card_name: editName,
          type_line: editType,
          set_name: editSet,
          rarity: editRarity,
          quantity: editQty,
        };
        setCards((cs) => cs.map((c) => (c.id === selected.id ? updated : c)));
        setSelected(updated);
        setIsEditing(false);
        setSaveStatus('saved');
      } else {
        setSaveStatus(data.error || 'Failed to save. Please try again.');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCard() {
    if (!selected || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/collection/${selected.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setCards((cs) => cs.filter((c) => c.id !== selected.id));
        setSelected(null);
        setIsEditing(false);
      }
    } catch {}
    finally {
      setIsSaving(false);
    }
  }

  const showPanel = !!selected;

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#0f0d0a', display: 'flex' }}>

      {/* ── Card grid ── */}
      <div style={{
        flex: showPanel ? '0 0 60%' : '1',
        padding: '2.5rem',
        overflowY: 'auto',
        borderRight: showPanel ? `1px solid ${BORDER}` : 'none',
      }}>
        <div style={{ maxWidth: showPanel ? '100%' : 1100, margin: '0 auto' }}>

          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '0.65rem',
                letterSpacing: '0.22em',
                color: GOLD,
                marginBottom: '0.4rem',
                fontWeight: 'normal',
              }}>
                MY COLLECTION
              </h1>
              {!isLoading && !error && (
                <p style={{ color: GOLD_DIM, fontSize: '0.8rem', fontStyle: 'italic' }}>
                  {cards.length} unique card{cards.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            {showPanel && (
              <button onClick={deselect} aria-label="Close card details" style={ghostBtnStyle}>
                close
              </button>
            )}
          </div>

          {isLoading && (
            <p style={{ color: GOLD_DIM, fontStyle: 'italic', fontSize: '0.85rem' }}>Loading...</p>
          )}

          {error && (
            <div style={{
              color: '#e57373',
              backgroundColor: '#1a0d0d',
              border: '1px solid #5a2020',
              borderRadius: 6,
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {!isLoading && !error && cards.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '5rem' }}>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.18em', color: '#2d2820' }}>
                NO CARDS IN YOUR COLLECTION
              </p>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: showPanel
              ? 'repeat(auto-fill, minmax(130px, 1fr))'
              : 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1.5rem',
          }}>
            {cards.map((card) => {
              const isSelected = selected?.id === card.id;
              const rc = card.rarity ? rarityColor(card.rarity) : null;
              return (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${card.card_name}, quantity ${card.quantity}${card.rarity ? ', ' + card.rarity : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => selectCard(card)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(card); } }}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 10,
                    padding: 4,
                    border: isSelected ? `2px solid ${GOLD}` : '2px solid transparent',
                    transition: 'border-color 0.15s',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = GOLD_DIM;
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'transparent';
                  }}
                  onFocus={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = GOLD_DIM;
                  }}
                  onBlur={(e) => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {card.scryfall_image_url ? (
                    <img
                      src={card.scryfall_image_url}
                      alt={card.card_name}
                      style={{ width: '100%', borderRadius: 6, display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', paddingBottom: '140%', borderRadius: 6,
                      backgroundColor: '#1a1714', border: `1px solid ${BORDER}`,
                    }} />
                  )}
                  <p style={{
                    marginTop: '0.5rem',
                    fontFamily: 'Cinzel, serif',
                    fontSize: '0.75rem',
                    color: GOLD,
                    letterSpacing: '0.03em',
                    lineHeight: 1.4,
                  }}>
                    {card.card_name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <p style={{ color: GOLD_DIM, fontSize: '0.75rem', fontStyle: 'italic', margin: 0 }}>
                      ×{card.quantity}
                    </p>
                    {rc && (
                      <>
                        <span style={{ color: GOLD_DIM, fontSize: '0.65rem' }}>·</span>
                        <span style={{ fontSize: '0.68rem', color: rc, fontWeight: 600 }}>
                          {capitalize(card.rarity)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {showPanel && (
        <div style={{
          flex: '0 0 40%',
          padding: '2.5rem',
          overflowY: 'auto',
          backgroundColor: SURFACE,
        }}>
          <h2 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            color: GOLD,
            marginBottom: '1.5rem',
            fontWeight: 'normal',
          }}>
            CARD DETAILS
          </h2>

          {selected.scryfall_image_url && (
            <img
              src={selected.scryfall_image_url}
              alt={selected.card_name}
              style={{
                width: '70%', maxWidth: 220, borderRadius: 10,
                display: 'block', margin: '0 auto 1.5rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              }}
            />
          )}

          {/* ── Art picker ── */}
          {(loadingPrints || prints.length > 1) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{
                fontFamily: 'Cinzel, serif', fontSize: '0.62rem',
                letterSpacing: '0.18em', color: GOLD_DIM, marginBottom: '0.6rem',
              }}>
                CHOOSE ART
              </p>
              {loadingPrints ? (
                <p style={{ fontSize: '0.75rem', color: GOLD_DIM, fontStyle: 'italic' }}>Loading printings…</p>
              ) : (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: 180, overflowY: 'auto',
                }}>
                  {prints.map(p => {
                    const isCurrent = p.image_url === selected.scryfall_image_url;
                    return (
                      <button
                        key={p.scryfall_id}
                        onClick={() => selectArt(p)}
                        title={`${p.set_name} #${p.collector_number}`}
                        aria-label={`Select art from ${p.set_name} #${p.collector_number}`}
                        aria-pressed={isCurrent}
                        disabled={isSaving}
                        style={{
                          background: 'none',
                          border: `2px solid ${isCurrent ? GOLD : BORDER}`,
                          borderRadius: 5,
                          padding: 2,
                          cursor: isSaving ? 'default' : 'pointer',
                          flexShrink: 0,
                          opacity: isSaving && !isCurrent ? 0.5 : 1,
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.borderColor = GOLD_DIM; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.borderColor = BORDER; }}
                      >
                        <img
                          src={p.image_url}
                          alt={`${p.set_name} #${p.collector_number}`}
                          style={{ width: 56, borderRadius: 3, display: 'block' }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '1.25rem' }} />
            </div>
          )}

          {/* ── View mode ── */}
          {!isEditing && (
            <>
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: TEXT, marginBottom: '0.25rem' }}>
                {selected.card_name}
              </p>
              {selected.type_line && (
                <p style={{ fontSize: '0.8rem', color: '#8a7a58', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                  {selected.type_line}
                </p>
              )}

              <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '1rem' }} />

              <StatRow label="Set" value={selected.set_name || '—'} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: GOLD_DIM }}>Rarity</span>
                <span style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: selected.rarity ? rarityColor(selected.rarity) : GOLD_DIM,
                  fontStyle: selected.rarity ? 'normal' : 'italic',
                }}>
                  {selected.rarity ? capitalize(selected.rarity) : '—'}
                </span>
              </div>

              <StatRow label="Quantity" value={`×${selected.quantity}`} />

              <div style={{ borderTop: `1px solid ${BORDER}`, margin: '1.25rem 0' }} />

              {saveStatus === 'saved' && (
                <p style={{ color: '#4ade80', fontSize: '0.78rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                  Changes saved.
                </p>
              )}

              <button
                onClick={startEditing}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: `1px solid ${GOLD}`,
                  borderRadius: 6,
                  color: GOLD,
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.72rem',
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  marginBottom: '0.75rem',
                }}
              >
                EDIT
              </button>

              <button
                onClick={removeCard}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  background: 'transparent',
                  border: '1px solid #5a2020',
                  borderRadius: 6,
                  color: '#c04040',
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.7rem',
                  letterSpacing: '0.2em',
                  cursor: isSaving ? 'default' : 'pointer',
                }}
              >
                REMOVE FROM COLLECTION
              </button>
            </>
          )}

          {/* ── Edit mode ── */}
          {isEditing && (
            <>
              <label style={{ display: 'block', marginBottom: '1.25rem' }}>
                <FieldLabel>Card Name</FieldLabel>
                <GhostInput value={editName} onChange={setEditName} />
              </label>

              <label style={{ display: 'block', marginBottom: '1.25rem' }}>
                <FieldLabel>Type</FieldLabel>
                <GhostInput value={editType} onChange={setEditType} />
              </label>

              <label style={{ display: 'block', marginBottom: '1.25rem' }}>
                <FieldLabel>Set</FieldLabel>
                <GhostInput value={editSet} onChange={setEditSet} />
              </label>

              <label style={{ display: 'block', marginBottom: '1.25rem' }}>
                <FieldLabel>Rarity</FieldLabel>
                <select
                  value={editRarity}
                  onChange={(e) => setEditRarity(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a1714',
                    border: `1px solid #3d3428`,
                    borderRadius: 6,
                    outline: 'none',
                    fontSize: '0.88rem',
                    fontWeight: editRarity ? 600 : 'normal',
                    color: editRarity ? rarityColor(editRarity) : GOLD_DIM,
                    cursor: 'pointer',
                    padding: '0.5rem 0.75rem',
                    marginTop: '0.35rem',
                  }}
                >
                  <option value="" style={{ backgroundColor: '#1a1714', color: GOLD_DIM }}>— select —</option>
                  {RARITIES.map((r) => (
                    <option key={r} value={r} style={{ backgroundColor: '#1a1714', color: rarityColor(r) }}>
                      {capitalize(r)}
                    </option>
                  ))}
                </select>
              </label>

              <div role="group" aria-label="Quantity" style={{ marginBottom: '1.5rem' }}>
                <FieldLabel>Quantity</FieldLabel>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '0.35rem',
                  border: `1px solid #3d3428`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  width: 'fit-content',
                }}>
                  <QtyButton aria-label="Decrease quantity" onClick={() => setEditQty((q) => Math.max(1, q - 1))}>−</QtyButton>
                  <span style={{
                    width: 52, textAlign: 'center', fontSize: '0.95rem',
                    color: TEXT, backgroundColor: SURFACE, padding: '0.45rem 0', display: 'inline-block',
                  }}>
                    {editQty}
                  </span>
                  <QtyButton aria-label="Increase quantity" onClick={() => setEditQty((q) => q + 1)}>+</QtyButton>
                </div>
              </div>

              {saveStatus && saveStatus !== 'saved' && (
                <p style={{ color: '#e57373', fontSize: '0.78rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                  {saveStatus}
                </p>
              )}

              <button
                onClick={saveCard}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'transparent',
                  border: `1px solid ${isSaving ? '#3d3428' : GOLD}`,
                  borderRadius: 6,
                  color: isSaving ? '#3d3428' : GOLD,
                  fontFamily: 'Cinzel, serif',
                  fontSize: '0.72rem',
                  letterSpacing: '0.2em',
                  cursor: isSaving ? 'default' : 'pointer',
                  marginBottom: '0.75rem',
                }}
              >
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>

              <button
                onClick={cancelEditing}
                disabled={isSaving}
                style={ghostBtnStyle}
              >
                cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const ghostBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: GOLD_DIM,
  fontSize: '0.78rem',
  fontStyle: 'italic',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

function StatRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', marginBottom: '0.45rem', gap: '0.75rem',
    }}>
      <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: GOLD_DIM, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.88rem', color: TEXT }}>{value}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <p style={{
      fontFamily: 'Cinzel, serif',
      fontSize: '0.62rem',
      letterSpacing: '0.18em',
      color: GOLD_DIM,
      marginBottom: 0,
    }}>
      {children}
    </p>
  );
}

function GhostInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        display: 'block',
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid #3d3428`,
        outline: 'none',
        fontSize: '0.95rem',
        color: TEXT,
        padding: '0.35rem 0',
        transition: 'border-color 0.15s',
        marginTop: '0.35rem',
      }}
      onFocus={(e) => (e.target.style.borderBottomColor = GOLD)}
      onBlur={(e) => (e.target.style.borderBottomColor = '#3d3428')}
    />
  );
}

function QtyButton({ onClick, children, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        width: 36, height: 36, border: 'none',
        backgroundColor: '#1e1a14', color: GOLD,
        fontSize: '1.1rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a2418')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e1a14')}
    >
      {children}
    </button>
  );
}
