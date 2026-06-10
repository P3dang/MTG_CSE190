const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SCRYFALL = 'https://api.scryfall.com';
const FORMATS = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper'];

const SYSTEM_PROMPT = `You are an expert Magic: The Gathering deck builder assistant inside the MTG Scry Forge app.

TOOLS
- search_cards: find cards by name, color, type, format, or oracle text
- get_card: look up full details for a specific card
- view_collection: show the user's scanned card collection in this app
- add_card: add a card and optional quantity to the working deck
- remove_card: remove a card from the working deck
- view_deck: show what is currently in the working deck
- clear_deck: wipe the deck and start over
- load_deck: load a saved deck into the working deck so it can be edited
- save_deck: save (or update) the working deck — updates if the name already exists
- list_decks: list all decks the user has saved
- read_deck: read a saved deck by name without loading it into the working deck
- set_budget: set a maximum USD budget — add_card will reject cards that exceed it
- clear_budget: remove the budget cap
- get_budget_status: show budget, deck cost, and remaining headroom
- get_purchase_links: get TCGPlayer and Cardmarket links for a single card
- get_deck_purchase_links: get purchase links for every card in the deck

DECK BUILDING FLOW
1. Search one category at a time (creatures, then removal, then lands).
2. Show the results and ask which ones to add and how many copies.
3. Wait for the user's reply before calling add_card.
4. Never add cards without the user confirming first.

BUDGET
If the user mentions a budget, call set_budget before searching for cards.
add_card enforces the budget — if rejected, suggest a cheaper alternative.

GUIDELINES
- Respect format legality. If a card is banned or not legal, say so.
- Commander: 100-card singleton, 1 legendary commander, color identity must match.
- Standard/Modern/Pioneer: 60-card minimum, up to 4 copies of any non-basic card.
- Keep all responses focused on Magic: The Gathering.`;

function formatCard(card, full = false) {
  const oracle = card.oracle_text || '';
  const text = !full && oracle.length > 120 ? oracle.slice(0, 120) + '…' : oracle;
  const parts = [`${card.name} | ${card.mana_cost || ''} | ${card.type_line || ''}`];
  if (text) parts.push(text);
  if (card.power != null) parts.push(`${card.power}/${card.toughness}`);
  const legal = FORMATS.filter(f => (card.legalities || {})[f] === 'legal');
  parts.push(`Legal: ${legal.length ? legal.join(', ') : 'none'}`);
  return parts.join(' | ');
}

function deckCost(deck, buffered = false) {
  const mult = buffered ? 1.1 : 1.0;
  return Object.values(deck).reduce((sum, info) => sum + (info.price_usd || 0) * info.quantity * mult, 0);
}

async function fetchCard(name) {
  try {
    const { data } = await axios.get(`${SCRYFALL}/cards/named`, { params: { fuzzy: name }, timeout: 10000 });
    return data;
  } catch { return null; }
}

const TOOLS = [
  {
    name: 'search_cards',
    description: "Search for Magic: The Gathering cards using Scryfall's full-text syntax. Examples: 'lightning bolt', 'c:red t:instant cmc<=2', 'f:commander t:creature'.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        max_results: { type: 'integer', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_card',
    description: 'Look up full details for a specific card by name (fuzzy match).',
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'view_collection',
    description: "Show the cards the user has scanned into their collection. Useful for building decks around cards they already own.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'add_card',
    description: 'Add a card to the working deck. Rejects the card if it would exceed the active budget.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        quantity: { type: 'integer', default: 1 },
      },
      required: ['name'],
    },
  },
  {
    name: 'remove_card',
    description: 'Remove a card entirely from the working deck.',
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'view_deck',
    description: 'Show the current working decklist with quantities and card count.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'clear_deck',
    description: 'Remove all cards from the working deck and start fresh.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'load_deck',
    description: "Load a saved deck into the working deck so it can be edited. Replaces whatever is currently in the working deck.",
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'save_deck',
    description: "Save the working deck to the user's account. If a deck with the same name already exists it will be updated, otherwise a new one is created.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        summary: { type: 'string' },
        strategy_early: { type: 'string' },
        strategy_mid: { type: 'string' },
        strategy_late: { type: 'string' },
      },
      required: ['name', 'summary', 'strategy_early', 'strategy_mid', 'strategy_late'],
    },
  },
  {
    name: 'list_decks',
    description: "List all decks the user has saved to their account.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'read_deck',
    description: 'Read a saved deck by name.',
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'set_budget',
    description: 'Set a maximum USD budget. add_card will reject cards that would exceed it.',
    input_schema: { type: 'object', properties: { amount_usd: { type: 'number' } }, required: ['amount_usd'] },
  },
  {
    name: 'clear_budget',
    description: 'Remove the budget cap.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_budget_status',
    description: 'Show the current budget, total deck cost, and remaining headroom.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_purchase_links',
    description: 'Get TCGPlayer and Cardmarket purchase links for a single card.',
    input_schema: { type: 'object', properties: { card_name: { type: 'string' } }, required: ['card_name'] },
  },
  {
    name: 'get_deck_purchase_links',
    description: 'Get TCGPlayer purchase links for every card in the current deck, plus a Mass Entry decklist.',
    input_schema: { type: 'object', properties: {} },
  },
];

async function executeTool(name, input, ctx, userId, supabase) {
  switch (name) {
    case 'search_cards': {
      try {
        const { data } = await axios.get(`${SCRYFALL}/cards/search`, {
          params: { q: input.query, order: 'edhrec' },
          timeout: 10000,
        });
        const cards = (data.data || []).slice(0, input.max_results || 5);
        return { output: `Found ${data.total_cards || cards.length} card(s). Showing ${cards.length}:\n\n${cards.map(c => formatCard(c)).join('\n\n')}` };
      } catch (err) {
        if (err.response?.status === 404) return { output: 'No cards found for that query.' };
        return { output: `Scryfall error: ${err.message}` };
      }
    }

    case 'get_card': {
      const card = await fetchCard(input.name);
      if (!card) return { output: `Card '${input.name}' not found.` };
      return { output: formatCard(card, true) };
    }

    case 'view_collection': {
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('card_name, quantity, set_name, rarity')
          .eq('user_id', userId)
          .order('card_name');
        if (error) throw error;
        if (!data.length) return { output: 'Your collection is empty. Scan some cards first!' };
        const lines = data.map(c =>
          `${c.quantity}x ${c.card_name}${c.set_name ? ` (${c.set_name})` : ''}${c.rarity ? ` [${c.rarity}]` : ''}`
        );
        return { output: `Your collection (${data.length} unique cards):\n${lines.join('\n')}` };
      } catch (err) {
        return { output: `Failed to load collection: ${err.message}` };
      }
    }

    case 'add_card': {
      const qty = Math.max(1, parseInt(input.quantity) || 1);
      const cardData = await fetchCard(input.name);
      if (!cardData) return { output: `Card '${input.name}' not found on Scryfall.` };

      const cardName = cardData.name;
      const priceUsd = cardData.prices?.usd ? parseFloat(cardData.prices.usd) : null;

      if (ctx.budget !== null) {
        if (priceUsd === null) return { output: `Cannot add ${cardName}: no price data available to verify it fits the $${ctx.budget.toFixed(2)} budget.` };
        const bufferedCost = priceUsd * qty * 1.1;
        const current = deckCost(ctx.deck);
        if (current + bufferedCost > ctx.budget) {
          const remaining = ctx.budget - current;
          return { output: `Cannot add ${qty}x ${cardName} ($${priceUsd.toFixed(2)} each). Estimated cost with 10% buffer: $${bufferedCost.toFixed(2)}. Only $${remaining.toFixed(2)} remaining. Try fewer copies or a cheaper alternative.` };
        }
      }

      if (ctx.deck[cardName]) {
        ctx.deck[cardName].quantity += qty;
      } else {
        ctx.deck[cardName] = { quantity: qty, cmc: Math.round(cardData.cmc || 0), price_usd: priceUsd, type_line: cardData.type_line || '' };
      }

      const total = Object.values(ctx.deck).reduce((s, i) => s + i.quantity, 0);
      const costNote = ctx.budget !== null ? ` | Deck cost: $${deckCost(ctx.deck).toFixed(2)}` : '';
      return { output: `Added ${qty}x ${cardName} (total: ${ctx.deck[cardName].quantity}x). Deck has ${total} cards.${costNote}` };
    }

    case 'remove_card': {
      const match = Object.keys(ctx.deck).find(k => k.toLowerCase().includes(input.name.toLowerCase()));
      if (!match) return { output: `'${input.name}' is not in the deck.` };
      const qty = ctx.deck[match].quantity;
      delete ctx.deck[match];
      const total = Object.values(ctx.deck).reduce((s, i) => s + i.quantity, 0);
      return { output: `Removed ${qty}x ${match}. Deck has ${total} cards.` };
    }

    case 'view_deck': {
      if (!Object.keys(ctx.deck).length) return { output: 'The deck is empty.' };
      const total = Object.values(ctx.deck).reduce((s, i) => s + i.quantity, 0);
      const lines = Object.entries(ctx.deck).sort(([a], [b]) => a.localeCompare(b)).map(([n, i]) => `  ${i.quantity} ${n}`);
      return { output: `Current deck (${total} cards):\n${lines.join('\n')}` };
    }

    case 'clear_deck': {
      const count = Object.keys(ctx.deck).length;
      Object.keys(ctx.deck).forEach(k => delete ctx.deck[k]);
      return { output: `Deck cleared (${count} unique cards removed).` };
    }

    case 'load_deck': {
      try {
        const { data, error } = await supabase
          .from('decks').select('*').eq('user_id', userId)
          .ilike('name', `%${input.name}%`)
          .order('created_at', { ascending: false }).limit(1);
        if (error) throw error;
        if (!data.length) return { output: `No deck matching "${input.name}" found.` };
        const d = data[0];
        // Clear current deck and load saved cards
        Object.keys(ctx.deck).forEach(k => delete ctx.deck[k]);
        for (const c of (d.cards || [])) {
          ctx.deck[c.card_name] = { quantity: c.quantity, cmc: c.cmc || 0, price_usd: c.price_usd ?? null, type_line: c.type_line || '' };
        }
        const total = Object.values(ctx.deck).reduce((s, i) => s + i.quantity, 0);
        return { output: `Loaded "${d.name}" into the working deck (${total} cards). You can now add, remove, or edit cards, then save when done.` };
      } catch (err) {
        return { output: `Failed to load deck: ${err.message}` };
      }
    }

    case 'save_deck': {
      if (!Object.keys(ctx.deck).length) return { output: 'The deck is empty. Add cards before saving.' };
      const cards = Object.entries(ctx.deck).map(([card_name, info]) => ({ card_name, ...info }));
      const totalCost = deckCost(ctx.deck);
      const totalCards = Object.values(ctx.deck).reduce((s, i) => s + i.quantity, 0);
      try {
        // Check if a deck with this name already exists for this user
        const { data: existing } = await supabase
          .from('decks').select('id').eq('user_id', userId).ilike('name', input.name).limit(1);

        if (existing?.length) {
          const { error } = await supabase.from('decks').update({
            cards, summary: input.summary,
            strategy_early: input.strategy_early, strategy_mid: input.strategy_mid,
            strategy_late: input.strategy_late, total_cost: totalCost,
          }).eq('id', existing[0].id);
          if (error) throw error;
          return { output: `Deck "${input.name}" updated (${totalCards} cards, estimated $${totalCost.toFixed(2)}).` };
        }

        const { error } = await supabase.from('decks').insert({
          user_id: userId, name: input.name, cards, summary: input.summary,
          strategy_early: input.strategy_early, strategy_mid: input.strategy_mid,
          strategy_late: input.strategy_late, total_cost: totalCost,
        });
        if (error) throw error;
        return { output: `Deck "${input.name}" saved (${totalCards} cards, estimated $${totalCost.toFixed(2)}).` };
      } catch (err) {
        return { output: `Failed to save deck: ${err.message}` };
      }
    }

    case 'list_decks': {
      try {
        const { data, error } = await supabase
          .from('decks')
          .select('name, total_cost, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!data.length) return { output: 'No saved decks yet.' };
        return { output: `Your saved decks:\n${data.map(d => `  ${d.name} ($${(d.total_cost || 0).toFixed(2)})`).join('\n')}` };
      } catch (err) {
        return { output: `Failed to list decks: ${err.message}` };
      }
    }

    case 'read_deck': {
      try {
        const { data, error } = await supabase
          .from('decks').select('*').eq('user_id', userId)
          .ilike('name', `%${input.name}%`)
          .order('created_at', { ascending: false }).limit(1);
        if (error) throw error;
        if (!data.length) return { output: `No deck matching "${input.name}" found.` };
        const d = data[0];
        const decklist = (d.cards || []).map(c => `${c.quantity} ${c.card_name}`).join('\n');
        return { output: `${d.name}\n\nSUMMARY\n${d.summary}\n\nDECKLIST\n${decklist}\n\nSTRATEGY\nEarly: ${d.strategy_early}\nMid: ${d.strategy_mid}\nLate: ${d.strategy_late}\n\nEstimated cost: $${(d.total_cost || 0).toFixed(2)}` };
      } catch (err) {
        return { output: `Failed to read deck: ${err.message}` };
      }
    }

    case 'set_budget': {
      ctx.budget = input.amount_usd;
      const spent = deckCost(ctx.deck);
      return { output: `Budget set to $${ctx.budget.toFixed(2)}. Current spend: $${spent.toFixed(2)}. Remaining: $${(ctx.budget - spent).toFixed(2)}.` };
    }

    case 'clear_budget': {
      ctx.budget = null;
      return { output: 'Budget cleared. No spending limit is active.' };
    }

    case 'get_budget_status': {
      const raw = deckCost(ctx.deck);
      const buffered = deckCost(ctx.deck, true);
      if (ctx.budget === null) return { output: `No budget set. Scryfall estimate: $${raw.toFixed(2)} (~$${buffered.toFixed(2)} with 10% retail buffer).` };
      const remaining = ctx.budget - buffered;
      return { output: `Budget: $${ctx.budget.toFixed(2)} | Estimate: $${raw.toFixed(2)} | Buffered (+10%): $${buffered.toFixed(2)} | Remaining: $${remaining.toFixed(2)} (${remaining >= 0 ? 'within budget' : 'OVER BUDGET'})` };
    }

    case 'get_purchase_links': {
      const card = await fetchCard(input.card_name);
      if (!card) return { output: `Card '${input.card_name}' not found.` };
      const links = card.purchase_uris || {};
      return { output: `${card.name}:\n  TCGPlayer: ${links.tcgplayer || 'N/A'}\n  Cardmarket: ${links.cardmarket || 'N/A'}` };
    }

    case 'get_deck_purchase_links': {
      if (!Object.keys(ctx.deck).length) return { output: 'The deck is empty.' };
      const lines = ['Purchase links:\n'];
      const massEntry = [];
      for (const [cardName, info] of Object.entries(ctx.deck).sort(([a], [b]) => a.localeCompare(b))) {
        massEntry.push(`${info.quantity} ${cardName}`);
        const card = await fetchCard(cardName);
        lines.push(`${info.quantity}x ${cardName}: ${card?.purchase_uris?.tcgplayer || 'N/A'}`);
      }
      lines.push(`\nEstimate: $${deckCost(ctx.deck).toFixed(2)}\n\nPaste at https://www.tcgplayer.com/massentry:\n${massEntry.join('\n')}`);
      return { output: lines.join('\n') };
    }

    default:
      return { output: `Unknown tool: ${name}` };
  }
}

function trimHistory(messages, max = 20) {
  if (messages.length <= max) return messages;
  const trimmed = messages.slice(-max);
  for (let i = 0; i < trimmed.length; i++) {
    const msg = trimmed[i];
    if (msg.role !== 'user') continue;
    if (typeof msg.content === 'string') return trimmed.slice(i);
    if (Array.isArray(msg.content) && !msg.content.some(b => b.type === 'tool_result')) return trimmed.slice(i);
  }
  return [];
}

async function runAgentTurn({ message, history, deck, budget_usd, userId, supabase }) {
  const ctx = { deck: JSON.parse(JSON.stringify(deck || {})), budget: budget_usd ?? null };
  let messages = [...(history || []), { role: 'user', content: message }];

  for (let turn = 0; turn < 20; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    messages = [...messages, { role: 'assistant', content: response.content }];

    if (response.stop_reason === 'end_turn') {
      const reply = response.content.find(b => b.type === 'text')?.text || '';
      return { reply, deck: ctx.deck, budget_usd: ctx.budget, history: trimHistory(messages) };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input, ctx, userId, supabase);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result.output });
        }
      }
      messages = [...messages, { role: 'user', content: toolResults }];
    }
  }

  throw new Error('Agent exceeded maximum turns.');
}

module.exports = { runAgentTurn };
