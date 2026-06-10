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
  rarity text,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Migration: add rarity to existing tables
-- ALTER TABLE cards ADD COLUMN IF NOT EXISTS rarity text;

-- Scan usage tracking for cost ceiling
CREATE TABLE IF NOT EXISTS scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  scanned_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_logs_user_date ON scan_logs (user_id, scanned_at);

-- Saved decks from the deck builder agent
CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  cards jsonb NOT NULL DEFAULT '[]',
  summary text,
  strategy_early text,
  strategy_mid text,
  strategy_late text,
  total_cost numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);
