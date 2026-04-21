# Knowledge Hub Data Extraction & Processing Workflow

This flowchart explains the step-by-step process of how our Knowledge Hub takes raw images/PDFs and turns them into highly structured AI-generated questions.

```mermaid
graph TD
    %% Define Styles
    classDef default fill:#f9fafb,stroke:#e5e7eb,stroke-width:2px,color:#374151
    classDef step fill:#eff6ff,stroke:#cbd5e1,stroke-width:2px,color:#1e40af,font-weight:bold
    classDef db fill:#f0fdfa,stroke:#5eead4,stroke-width:2px,color:#0f766e
    classDef ai fill:#fdf4ff,stroke:#f0abfc,stroke-width:2px,color:#a21caf
    classDef qb fill:#fffbeb,stroke:#fcd34d,stroke-width:2px,color:#b45309

    %% Phase 1: Upload
    A[1. Add Pages / Raw Upload]:::step -->|Uploads PDF/Images| B[(Cloudflare R2 Bucket)]:::db
    B -->|Creates Entries| C[(System DB: CurriculumDocument)]:::db

    %% Phase 2: OCR Extraction
    C --> D[2. Server Bulk Extract]:::step
    D -->|Sends image to| E[Google Gemini Vision AI]:::ai
    E -->|Returns Markdown Text| F[(System DB: Extracted Markdown)]:::db

    %% Phase 3: Golden Editor (Proofreading & Mapping)
    F --> G[3. Proofreading Workspace]:::step
    G -->|User Proofreads| H[Golden Markdown]
    G -->|User Assigns Chapter| I[Tree B Mapping]
    H --> J[(System DB: Golden Document)]:::db
    I --> J

    %% Phase 4: Vectorization
    J --> K[4. Extract Topics & Sync]:::step
    K -->|Semantic Chunking| L[Create Topics & Chunks]
    L -->|Generate Embeddings| M[Embedding Model]:::ai
    M -->|Upsert Vectors| N[(Pinecone Vector DB:\nNamespace: book-xxx)]:::db

    %% Phase 5: Question Generation
    N --> P[5. Automate Questions]:::step
    P -->|RAG Retrieval| Q[Retrieved Relevant Context]
    Q -->|Context + Prompting| R[Gemini AI RAG Generator]:::ai
    R -->|Final Output| S[(Target: Question Bank)]:::qb
```
