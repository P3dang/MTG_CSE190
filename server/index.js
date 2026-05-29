require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const ws = require('ws');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { realtime: { transport: ws } }
);

// Auth middleware — verifies the Supabase JWT and sets req.userId
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const token = auth.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
  req.userId = user.id;
  next();
}

// POST /api/scan
// Receives base64 image, identifies card via Claude, fetches data from Scryfall
app.post('/api/scan', requireAuth, async (req, res) => {
  const { imageBase64, mediaType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided.' });
  }

  let cardName;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'What is the name of this Magic: The Gathering card? Reply with only the card name, nothing else.',
            },
          ],
        },
      ],
    });
    cardName = message.content[0].text.trim();
  } catch (err) {
    console.error('Claude error:', err.message);
    return res.status(500).json({ error: 'Failed to identify card. Please try again.' });
  }

  try {
    const scryfallRes = await axios.get(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    );
    const card = scryfallRes.data;

    // Double-faced cards store image_uris on each face
    const imageUrl =
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      null;

    const manaCost =
      card.mana_cost ||
      card.card_faces?.[0]?.mana_cost ||
      '';

    return res.json({
      card_name: card.name,
      scryfall_id: card.id,
      scryfall_image_url: imageUrl,
      mana_cost: manaCost,
      type_line: card.type_line,
      set_name: card.set_name,
      rarity: card.rarity || null,
      power: card.power ?? null,
      toughness: card.toughness ?? null,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({
        error: 'Card not recognized. Please try a clearer photo.',
      });
    }
    console.error('Scryfall error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch card data. Please try again.' });
  }
});

// POST /api/save
// Saves a card to Supabase; increments quantity if already present
app.post('/api/save', requireAuth, async (req, res) => {
  const { card_name, scryfall_id, scryfall_image_url, mana_cost, type_line, set_name, quantity } = req.body;
  const addQty = Math.max(1, parseInt(quantity) || 1);

  if (!scryfall_id || !card_name) {
    return res.status(400).json({ error: 'Missing required card data.' });
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('cards')
      .select('id, quantity')
      .eq('user_id', req.userId)
      .eq('scryfall_id', scryfall_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      const newQty = existing.quantity + addQty;
      const { error: updateError } = await supabase
        .from('cards')
        .update({ quantity: newQty, card_name, mana_cost, type_line, set_name })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      return res.json({ message: 'Card quantity updated.', quantity: newQty });
    }

    const { error: insertError } = await supabase.from('cards').insert({
      user_id: req.userId,
      card_name,
      scryfall_id,
      scryfall_image_url,
      mana_cost,
      type_line,
      set_name,
      quantity: addQty,
    });

    if (insertError) throw insertError;
    return res.json({ message: 'Card saved to collection.', quantity: 1 });
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to save card. Please try again.' });
  }
});

// GET /api/collection
// Returns all cards for the current user
app.get('/api/collection', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch collection.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
