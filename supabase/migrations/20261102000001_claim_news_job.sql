-- RPC function to atomically claim a pending news job
CREATE OR REPLACE FUNCTION public.claim_news_job()
RETURNS TABLE (id UUID, url TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.news_queue
  SET status = 'processing',
      last_attempt = timezone('utc'::text, now()),
      attempts = attempts + 1
  WHERE id = (
      SELECT id
      FROM public.news_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
  )
  RETURNING id, url;
END;
$$ LANGUAGE plpgsql;
