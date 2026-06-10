require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const ws = require('ws');
const { runAgentTurn } = require('./agent');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SCAN_DAILY_LIMIT = parseInt(process.env.SCAN_DAILY_LIMIT) || 20;
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

  // Enforce daily scan cost ceiling
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count, error: limitError } = await supabase
    .from('scan_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.userId)
    .gte('scanned_at', todayStart.toISOString());
  if (limitError) {
    console.error('Limit check error:', limitError.message);
    return res.status(500).json({ error: 'Failed to check usage limit.' });
  }
  if (count >= SCAN_DAILY_LIMIT) {
    return res.status(429).json({
      error: `Daily scan limit of ${SCAN_DAILY_LIMIT} reached. Resets at midnight UTC.`,
    });
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

    // Log scan for cost ceiling (fire-and-forget)
    supabase.from('scan_logs').insert({ user_id: req.userId }).then(({ error }) => {
      if (error) console.error('Failed to log scan:', error.message);
    });

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
  const { card_name, scryfall_id, scryfall_image_url, mana_cost, type_line, set_name, rarity, quantity } = req.body;
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
        .update({ quantity: newQty, card_name, mana_cost, type_line, set_name, rarity })
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
      rarity: rarity || null,
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

// GET /api/card-prints
// Returns all Scryfall printings (with distinct art) for a given card name
app.get('/api/card-prints', requireAuth, async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Card name required.' });
  try {
    const scryfallRes = await axios.get(
      `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(name)}"&unique=prints&order=released`
    );
    const prints = scryfallRes.data.data
      .map(card => ({
        scryfall_id: card.id,
        set_name: card.set_name,
        set: card.set,
        collector_number: card.collector_number,
        image_url: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
      }))
      .filter(p => p.image_url);
    return res.json(prints);
  } catch (err) {
    if (err.response?.status === 404) return res.json([]);
    console.error('Scryfall prints error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch printings.' });
  }
});

// PATCH /api/collection/:id
// Updates quantity, set_name, rarity, scryfall_image_url, and/or other fields for a card
app.patch('/api/collection/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { quantity, card_name, set_name, rarity, type_line, scryfall_image_url } = req.body;
  const qty = parseInt(quantity);

  if (isNaN(qty) || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1.' });
  }

  const fields = { quantity: qty };
  if (card_name !== undefined) fields.card_name = card_name;
  if (set_name !== undefined) fields.set_name = set_name;
  if (rarity !== undefined) fields.rarity = rarity || null;
  if (type_line !== undefined) fields.type_line = type_line;
  if (scryfall_image_url !== undefined) fields.scryfall_image_url = scryfall_image_url;

  try {
    const { error } = await supabase
      .from('cards')
      .update(fields)
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    return res.json({ message: 'Card updated.', quantity: qty });
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to update card.' });
  }
});

// DELETE /api/collection/:id
// Removes a card from the user's collection
app.delete('/api/collection/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    return res.json({ message: 'Card removed.' });
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to remove card.' });
  }
});

// POST /api/agent
// Runs one turn of the deck builder agent; client passes history and deck state
app.post('/api/agent', requireAuth, async (req, res) => {
  const { message, history, deck, budget_usd } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'No message provided.' });
  try {
    const result = await runAgentTurn({ message, history, deck, budget_usd, userId: req.userId, supabase });
    return res.json(result);
  } catch (err) {
    console.error('Agent error:', err.message);
    return res.status(500).json({ error: 'Agent failed. Please try again.' });
  }
});

// GET /api/decks
// Returns all saved decks for the current user
app.get('/api/decks', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('id, name, total_cost, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch decks.' });
  }
});

// GET /api/decks/:id
// Returns a single saved deck
app.get('/api/decks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('decks').select('*')
      .eq('id', id).eq('user_id', req.userId).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Deck not found.' });
    return res.json(data);
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch deck.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
