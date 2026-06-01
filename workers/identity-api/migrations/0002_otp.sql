-- Add OTP support to magic_links
ALTER TABLE magic_links ADD COLUMN otp_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_magic_links_otp_hash ON magic_links(otp_hash);
