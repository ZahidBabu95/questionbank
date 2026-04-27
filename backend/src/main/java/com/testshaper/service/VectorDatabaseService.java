package com.testshaper.service;

import java.util.List;
import java.util.Map;

/**
 * Interface for Vector Database operations (Hybrid RAG Foundation)
 * Pinecone implementation will provide the concrete logic.
 */
public interface VectorDatabaseService {

    /**
     * Store text chunk with metadata into the Vector Database.
     * Behind the scenes, this will call an Embedding model first,
     * then save the [vector + metadata] to Pinecone.
     * 
     * @param chunkId A unique string/UUID for the chunk
     * @param rawText The actual content of the chunk
     * @param metadata Map containing docId, pageNum, className, subjectName etc.
     */
    void upsertChunk(String chunkId, String rawText, Map<String, Object> metadata);

    /**
     * Search the Vector Database for the most relevant text chunks based on a natural language query.
     * 
     * @param query The user's question or prompt (e.g. "What is Newton's 3rd Law?")
     * @param limit How many top matching chunks to return
     * @param filterMetadata Optional: Filter search by specific subject, class, or docId
     * @return List of matching raw texts ready to be injected into an AI prompt
     */
    List<String> similaritySearch(String query, int limit, Map<String, Object> filterMetadata);

    /**
     * Delete an entire document's embedded chunks from the Vector Database.
     * 
     * @param docId The ID of the CurriculumDocument
     */
    void deleteDocumentChunks(String docId);

    /**
     * Delete embedded chunks from the Vector Database using metadata filters.
     * 
     * @param filterMetadata The metadata map to filter by (e.g. {"chapterId": "xyz"})
     * @param namespace The namespace to delete from (e.g. "book-123")
     */
    void deleteByMetadata(Map<String, Object> filterMetadata, String namespace);
}
