-- Enforce the venue-images upload allowlist at the bucket level too, so
-- Storage itself refuses anything the server action doesn't produce, even if
-- that code path has a bug or is bypassed. The app re-encodes every accepted
-- upload to WebP before storing it, so that's the only content type we need
-- to allow here.

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/webp']
where id = 'venue-images';
