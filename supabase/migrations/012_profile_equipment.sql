-- Add equipment fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS racket_brand TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS racket_model TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shoe_brand TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shoe_model TEXT;
