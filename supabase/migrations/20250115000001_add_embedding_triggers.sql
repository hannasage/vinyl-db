-- Function to generate embeddings for a single album
CREATE OR REPLACE FUNCTION generate_album_embeddings_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by the trigger
  -- The actual embedding generation will be handled by the Edge Function
  -- We just need to ensure the trigger fires
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate embeddings for a single artist
CREATE OR REPLACE FUNCTION generate_artist_embeddings_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by the trigger
  -- The actual embedding generation will be handled by the Edge Function
  -- We just need to ensure the trigger fires
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for album embeddings
CREATE TRIGGER trigger_generate_album_embeddings
  AFTER INSERT OR UPDATE ON album
  FOR EACH ROW
  EXECUTE FUNCTION generate_album_embeddings_trigger();

-- Create triggers for artist embeddings
CREATE TRIGGER trigger_generate_artist_embeddings
  AFTER INSERT OR UPDATE ON artist
  FOR EACH ROW
  EXECUTE FUNCTION generate_artist_embeddings_trigger();

-- Function to check if embeddings exist for an album
CREATE OR REPLACE FUNCTION album_has_embeddings(album_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM album_embeddings WHERE album_embeddings.album_id = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if embeddings exist for an artist
CREATE OR REPLACE FUNCTION artist_has_embeddings(artist_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM artist_embeddings WHERE artist_embeddings.artist_id = $1
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get albums without embeddings
CREATE OR REPLACE FUNCTION get_albums_without_embeddings(limit_count INT DEFAULT 50)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  artist_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    ar.name as artist_name
  FROM album a
  JOIN artist ar ON a.artist_id = ar.id
  WHERE NOT album_has_embeddings(a.id)
  ORDER BY a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get artists without embeddings
CREATE OR REPLACE FUNCTION get_artists_without_embeddings(limit_count INT DEFAULT 50)
RETURNS TABLE (
  id BIGINT,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id,
    ar.name
  FROM artist ar
  WHERE NOT artist_has_embeddings(ar.id)
  ORDER BY ar.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION album_has_embeddings(BIGINT) TO "anon";
GRANT EXECUTE ON FUNCTION album_has_embeddings(BIGINT) TO "authenticated";
GRANT EXECUTE ON FUNCTION album_has_embeddings(BIGINT) TO "service_role";

GRANT EXECUTE ON FUNCTION artist_has_embeddings(BIGINT) TO "anon";
GRANT EXECUTE ON FUNCTION artist_has_embeddings(BIGINT) TO "authenticated";
GRANT EXECUTE ON FUNCTION artist_has_embeddings(BIGINT) TO "service_role";

GRANT EXECUTE ON FUNCTION get_albums_without_embeddings(INT) TO "anon";
GRANT EXECUTE ON FUNCTION get_albums_without_embeddings(INT) TO "authenticated";
GRANT EXECUTE ON FUNCTION get_albums_without_embeddings(INT) TO "service_role";

GRANT EXECUTE ON FUNCTION get_artists_without_embeddings(INT) TO "anon";
GRANT EXECUTE ON FUNCTION get_artists_without_embeddings(INT) TO "authenticated";
GRANT EXECUTE ON FUNCTION get_artists_without_embeddings(INT) TO "service_role"; 