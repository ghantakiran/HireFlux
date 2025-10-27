# OpenAI Configuration and Embedding Model Update

## Updated OpenAI SDK
- Upgraded from `openai==1.3.7` to `openai==1.12.0`
- Latest SDK includes improved error handling and performance optimizations

## Embedding Model Migration
- **Old Model**: `text-embedding-ada-002` (1536 dimensions)
- **New Model**: `text-embedding-3-small` (1536 dimensions) - **Recommended**
- **Alternative**: `text-embedding-3-large` (3072 dimensions) - For higher accuracy needs

## Benefits of text-embedding-3-small
- **Cost**: ~75% cheaper than ada-002
- **Performance**: Better quality embeddings
- **Speed**: Faster generation
- **Compatibility**: Same 1536 dimensions, drop-in replacement

## Migration Steps

### 1. Update Pinecone Index Configuration
```python
# In your Pinecone setup
EMBEDDING_MODEL = "text-embedding-3-small"  # Updated from ada-002
EMBEDDING_DIMENSIONS = 1536  # Same as before
```

### 2. Update Embedding Generation Code
```python
# Old code
response = openai.Embedding.create(
    input=text,
    model="text-embedding-ada-002"
)

# New code
response = openai.embeddings.create(
    input=text,
    model="text-embedding-3-small"
)
```

### 3. Environment Variables
```bash
# Add to .env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
```

### 4. Cost Optimization
- Consider using `text-embedding-3-large` for critical matching
- Use `text-embedding-3-small` for general job matching
- Implement caching for frequently accessed embeddings

## Backward Compatibility
- Existing Pinecone indexes with ada-002 embeddings will continue to work
- New embeddings will use the updated model
- Gradual migration recommended for production

## Testing
- Test embedding quality with sample job descriptions
- Verify similarity scores remain consistent
- Monitor cost reduction in production
