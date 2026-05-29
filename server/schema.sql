-- Run this in your Supabase SQL editor to create the cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  card_name text NOT NULL,
  scryfall_id text NOT NULL,
  scryfall_image_url text,
  mana_cost text,
  type_line text,
  set_name text,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);
