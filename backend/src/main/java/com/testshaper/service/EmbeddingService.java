package com.testshaper.service;

import java.util.List;

/**
 * Service to generate vector embeddings from raw text.
 * Used for storing texts into Pinecone and performing Similarity Searches.
 */
public interface EmbeddingService {

    /**
     * Converts a single text string into a mathematical vector representation.
     * Dimensions depend on the underlying model (e.g., Gemini text-embedding-004 is 768).
     * 
     * @param text The text to convert
     * @return List of float numbers representing the semantic meaning of the text
     */
    List<Float> generateEmbedding(String text);

    /**
     * Optional: Bulk convert multiple text chunks to embeddings efficiently.
     * 
     * @param texts A list of raw texts
     * @return A list of embedding vectors corresponding to the texts
     */
    List<List<Float>> generateEmbeddings(List<String> texts);
}
