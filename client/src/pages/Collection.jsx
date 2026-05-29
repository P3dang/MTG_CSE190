import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const GOLD = '#c9a35a';
const GOLD_DIM = '#5a4e38';
const BORDER = '#2d2820';

export default function Collection() {
  const { session } = useAuth();
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', backgroundColor: '#0f0d0a', padding: '2.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.65rem',
            letterSpacing: '0.22em',
            color: GOLD,
            marginBottom: '0.4rem',
          }}>
            MY COLLECTION
          </p>
          {!isLoading && !error && (
            <p style={{ color: GOLD_DIM, fontSize: '0.8rem', fontStyle: 'italic' }}>
              {cards.length} unique card{cards.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* States */}
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

        {/* Card grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1.5rem',
        }}>
          {cards.map((card) => (
            <div key={card.id}>
              {card.scryfall_image_url ? (
                <img
                  src={card.scryfall_image_url}
                  alt={card.card_name}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    display: 'block',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  paddingBottom: '140%',
                  borderRadius: 8,
                  backgroundColor: '#1a1714',
                  border: `1px solid ${BORDER}`,
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
              <p style={{ color: GOLD_DIM, fontSize: '0.75rem', fontStyle: 'italic' }}>
                ×{card.quantity}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
