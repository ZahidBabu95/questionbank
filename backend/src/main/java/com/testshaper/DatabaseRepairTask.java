package com.testshaper;

import com.testshaper.entity.CurriculumDocumentChunk;
import com.testshaper.entity.KnowledgePage;
import com.testshaper.repository.CurriculumDocumentChunkRepository;
import com.testshaper.repository.KnowledgePageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseRepairTask implements CommandLineRunner {

    private final CurriculumDocumentChunkRepository chunkRepository;
    private final KnowledgePageRepository knowledgePageRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("DatabaseRepairTask: Checking for chunks with missing page numbers...");
        try {
            repairMissingPageNumbers();
        } catch (Exception e) {
            log.error("DatabaseRepairTask: Error occurred during repair: ", e);
        }
    }

    @Transactional
    public void repairMissingPageNumbers() {
        List<CurriculumDocumentChunk> nullPageChunks = chunkRepository.findByPageNumberIsNull();
        if (nullPageChunks.isEmpty()) {
            log.info("DatabaseRepairTask: No chunks with missing page numbers found.");
            return;
        }

        log.info("DatabaseRepairTask: Found {} chunks with missing page numbers. Resolving page numbers...", nullPageChunks.size());
        
        // Cache book-index to pages to avoid querying the DB repeatedly for the same chapter
        Map<java.util.UUID, List<KnowledgePage>> indexPagesCache = new HashMap<>();
        int repairedCount = 0;

        for (CurriculumDocumentChunk chunk : nullPageChunks) {
            if (chunk.getSourceBookIndex() == null) {
                continue;
            }

            java.util.UUID indexId = chunk.getSourceBookIndex().getId();
            List<KnowledgePage> pages = indexPagesCache.computeIfAbsent(indexId, 
                id -> knowledgePageRepository.findBySourceBookIndexId(id)
            );

            if (pages.isEmpty()) {
                continue;
            }

            Integer pageNum = findBestMatchingPageNumber(chunk.getChunkText(), pages);
            if (pageNum != null) {
                chunk.setPageNumber(pageNum);
                chunkRepository.save(chunk);
                repairedCount++;
            }
        }

        log.info("DatabaseRepairTask: Successfully resolved and repaired page numbers for {}/{} chunks.", 
            repairedCount, nullPageChunks.size());
    }

    private Integer findBestMatchingPageNumber(String chunkText, List<KnowledgePage> pages) {
        if (chunkText == null || chunkText.isBlank() || pages == null || pages.isEmpty()) {
            return null;
        }
        
        String cleanChunk = cleanText(chunkText);
        if (cleanChunk.length() < 10) return pages.get(0).getPageNumber();
        
        String sample = cleanChunk.substring(0, Math.min(100, cleanChunk.length()));
        for (KnowledgePage page : pages) {
            String pageText = page.getGoldenMarkdown() != null ? page.getGoldenMarkdown() : page.getExtractedMarkdown();
            if (pageText != null && cleanText(pageText).contains(sample)) {
                return page.getPageNumber();
            }
        }
        
        int maxOverlap = -1;
        KnowledgePage bestPage = pages.get(0);
        for (KnowledgePage page : pages) {
            String pageText = page.getGoldenMarkdown() != null ? page.getGoldenMarkdown() : page.getExtractedMarkdown();
            if (pageText == null) continue;
            
            String cleanPage = cleanText(pageText);
            int overlap = calculateOverlap(cleanChunk, cleanPage);
            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestPage = page;
            }
        }
        return bestPage.getPageNumber();
    }

    private String cleanText(String text) {
        return text.replaceAll("\\s+", "").toLowerCase();
    }

    private int calculateOverlap(String chunk, String page) {
        int score = 0;
        int length = chunk.length();
        int step = Math.max(20, length / 10);
        for (int i = 0; i < length; i += step) {
            String part = chunk.substring(i, Math.min(i + 20, length));
            if (page.contains(part)) {
                score += part.length();
            }
        }
        return score;
    }
}
