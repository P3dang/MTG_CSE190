Title: MTG Scry Forge

One sentence description – "Receipt scanner on Google Cloud (Ship it with auth + live URL)", "Game Master for Werewolf (Generation as the point)", "Private CSE tutor installed on ieng6 (Run it fully on your laptop)". The description should make it obvious which of the above options you've chosen

MTG card scanner with deck builder agent using google authentication  ( Ship it with auth + live URL )

---

Past project reference – Indicate which assignment + student's past project is the base, if any. With permission from the other partner, partners can extend the past project submission from a group. Include a github link (if a truly new project, make a stub github repository and link that).

I will be using my MTG deck building agent from project 3 in this project. I will need to create a document scanner that works for mtg cards.

Github link: https://github.com/ucsd-cse-genai-programming-sp26/03-agents-phuoc-a3

---

Planned technologies – What frameworks, platforms, etc do you plan to use? It's fine to give multiple options for a category.

I'm planning on using Claude API for the LLM and OpenAI Agents SDK for the agent framework. Similarly to my assignment 3 I'm using Scryfall API for mtg card information. I'm planning on using SQLite for my database and basic HTML/REACT for my frontend.

- I switched from OpenAI Agents SDK to the Anthropic SDK directly, implementing the tool-use agentic loop in Node.js in server/agent.js. The agent supports 16 tools including card search, deck building, collection viewing, and deck saving/loading.
- I switched from SQLite to Supabase (PostgreSQL) for the database, which handles both auth and card/deck storage.
- The frontend is React with Vite, deployed on Render alongside the Express backend.
- A cost ceiling was added via a daily scan limit enforced by a scan_logs table in Supabase (server/index.js).

---

First deliverable – What is the first thing you will build? Focus on a single user story/workflow, or as small a set of them as you can. What will force you to look at all the parts of your application in at least some way?

The first deliverable that I will implement is the document scanner. The user will be able to upload a photo of a Magic: the gathering card, the scanner will identify the card, then the card will be saved into that individual's own database. Assignment 2 makes you look at the entire stack, since there has to be a frontend that holds the scanner, a backend to store the data, and personal accounts for individuals privacy. Claude API will help identify the card and the scryfall api will help give the card an "ID" tag.

For my assignment 2 I created a menu scanner.
- Everything is implemented as written and remains fully working in the final submission. The scanner is at client/src/pages/Scanner.jsx and the backend endpoint is POST /api/scan in server/index.js. Claude identifies the card from the uploaded image, Scryfall does a fuzzy search to match it to a real card, and the result is saved to the user's Supabase collection. Accessibility improvements (labels, semantic headings, keyboard navigation) were also added as part of review feedback.

---

Rough architecture for first deliverable – What components and data will be involved? A component is often best described like a function call – what inputs does each component take, what output does it produce, what effects does it have? Data could be the database shape or an application-specific kind of data (like the ReceiptUpdate type or the representation of git commands for gitbot). Don't talk about individual Python helper functions, but try to explain your system in terms of 5-10 major components.

**Read Card:** This will take in an image as an input and the output would be a new added card into a users database.
- Implemented as written. Claude reads the image, Scryfall returns card metadata, and the card is saved to the Supabase cards table. A daily scan limit (default 20) is enforced via a scan_logs table.

**Google Auth:** Allows for user to log in using their google gmail account
- I used Supabase email auth instead of Google. Users sign up with email and password and must verify their email before accessing the app. The JWT is passed as a Bearer token on all API calls and verified server-side via supabase.auth.getUser().

**Collection Database:** Lets the Agent or LLM to upload users card into their collection
- Implemented. Cards are stored in a Supabase PostgreSQL table with per-user isolation. The agent can also read the collection via the view_collection tool in server/agent.js.

**Scryfall Search:** Look up cards from scryfall API
- Implemented. Used in two places: the scanner (fuzzy name lookup) and the new card-prints endpoint (GET /api/card-prints) which fetches all available printings for a card so users can pick their preferred art.

---

After first deliverable goals – What else do you want to support after the first deliverable? Make this be a clear bulleted list of features that we could clearly identify in a final submission: we may add to, subtract from, and hold you accountable for completing things in the list.

Add in the Agent support tool that's able to pull cards from your collection and also pull unowned cards from the scryfall directory. Add a public Area for people to post their own decks. Implement a better looking collections page that allows for users to select the card art for their respective card ( since user's uploaded image won't be saved, I can just pull images from the scryfall )

Agent Support tool: Fully implemented. The deck builder agent lives in server/agent.js and is exposed via POST /api/agent. It supports 16 tools: searching Scryfall, viewing the user's collection, building/editing a working deck, setting a budget, and saving/loading named decks to Supabase. The frontend chat interface is at client/src/pages/Agent.jsx and shows a live working deck panel alongside the conversation.

Public area for posting decks: Dropped. I focused on getting the core features polished rather than adding a social layer.

Better collections page with Scryfall card art: Implemented. The collection page (client/src/pages/Collection.jsx) fetches all available printings via GET /api/card-prints when a card is selected. A thumbnail picker appears in the detail panel letting users choose any alternate art. Clicking a print updates the stored image URL and set name via PATCH /api/collection/:id. Additional improvements include keyboard navigation (ArrowLeft/ArrowRight/Escape), accessibility labels, and an eval pipeline (server/eval/run.js) that benchmarks Claude vision accuracy against OCR-only approaches across 6 test cases.
