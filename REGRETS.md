# REGRETS

## Things I wish I'd gotten to

Public deck sharing — I wanted a page where users could browse and share decks that other people built. I dropped it to focus on getting the core features working well, but it would've made the app feel more like a real community tool rather than just a personal one.

Deck Builder: I wish I implemented the deck builder to actually pull cards form your collection and like show you own vs un owned cards. 

## Where time was wasted

Setting up render: I had alot of issues getting the repo to work with Render, Since my repo was private I had to figure out how to connect them. But after numerous attempts I just setup another presonal repo to run the front end on.
---

## Advice for a future engineer picking this up

- The agent is stateless by design — the client sends the full working deck and conversation history with every request, and the server responds with updated state. This works well but means if you add tools that have side effects, you need to be careful about what the client tracks vs. what lives in the database.

- Scryfall rate-limits aggressively if you make too many requests in a short window. The agent already handles this okay, but if you add any batch operations (like importing a full deck list), you'll need to add delays between Scryfall calls.

- The `decks` table stores cards as a JSONB column. This was fast to implement but means there's no easy way to query "which decks contain card X." If you want to add features like cross-deck search or collection overlap detection, it's worth migrating to a proper `deck_cards` join table.
