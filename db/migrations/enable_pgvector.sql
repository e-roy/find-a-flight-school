-- Enable pgvector extension
-- Run this migration manually after creating the school_embeddings table
-- This must be run before drizzle-kit can introspect the vector type

CREATE EXTENSION IF NOT EXISTS vector;

-- Convert the embedding column from text to vector(1536)
-- Note: This assumes the table already exists with text type
ALTER TABLE school_embeddings 
  ALTER COLUMN embedding TYPE vector(1536) 
  USING embedding::vector;

-- Recreate the index with vector type
DROP INDEX IF EXISTS school_embeddings_embedding_idx;

CREATE INDEX school_embeddings_embedding_idx 
  ON school_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

