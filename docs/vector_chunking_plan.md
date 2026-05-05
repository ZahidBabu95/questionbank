# RAG Pipeline & Vectorization Architecture Plan

## 1. Topic Generation Workflow Fix (Metadata Inheritance)

**Current Problem:**
During the question generation phase, the AI is allowed to "invent" or extract topics dynamically. This leads to slight variations of the same topic (e.g., "Photosynthesis" vs "Photosynthesis Process") and causes duplicates when saving to the database via `AcademicAutoLinkServiceImpl`.

**Professional Workflow Architecture:**
1. **Golden Data Chunking Phase:** Determine the specific `topic_name` (or `topic_id`) *during* the initial document chunking phase. The Chapter structure is already perfectly aligned in `/knowledge-hub/library`.
2. **Vector Metadata Injection:** When saving chunks to the Vector Database (Pinecone), inject the academic hierarchy into the vector's metadata:
   ```json
   {
     "text": "Extracted paragraph content...",
     "metadata": {
       "level_id": "...",
       "class_id": "...",
       "subject_name": "...",
       "chapter_id": "...",
       "topic_name": "...",
       "chunk_type": "theory"
     }
   }
   ```
3. **Question Generation Phase:** When a question is generated based on retrieved chunks, do **NOT** ask the AI to generate a topic. Extract the `topic_name` directly from the metadata of the retrieved chunk.
4. **Strict Prompting:** Explicitly instruct the AI: *"You are generating a question for the topic: '[Topic Name from Metadata]'. Do NOT generate any new topic name. Use this exact topic."*

This completely removes the AI's ability to create duplicate or hallucinated topics during the question generation phase.

---

## 2. Advanced Professional Vectorization Strategies

**A. Semantic Chunking**
Do not chunk by arbitrary character or token counts (e.g., exactly 500 tokens). Instead, chunk by logical and semantic boundaries such as Markdown headers (`##`, `###`), or paragraph breaks (`\n\n`).

**B. Parent-Child Chunking (Advanced RAG)**
Split large context blocks (Parent) into smaller, highly searchable segments (Child). When a Child chunk matches a search query, retrieve and feed the entire Parent chunk to the AI to provide full context without losing detail.

**C. Metadata Pre-filtering**
Utilize the rich metadata (level, class, subject, chapter) to perform pre-filtering in the vector database *before* similarity search. This guarantees that math questions are not generated using physics context, drastically improving accuracy.

**D. Overlapping Chunks**
Maintain a 10-15% overlap between consecutive chunks. This prevents critical context from being split in half across two different vectors.

---

## 3. Deep Architectural Analysis: Next-Gen Knowledge Hub 

As a top-level AI Chatbot architecture, purely relying on "Vector Similarity" is an outdated approach. To build a system that can flawlessly answer questions from a local book and generate perfect exams, we must move to **Hybrid RAG (Retrieval-Augmented Generation)** and **Knowledge Graphs**.

### A. Academic Hierarchy & Rule Injection (Faceted RAG)
**Can we inject `/structure`, `/sessions`, and `/curriculum-rules` into Vector Data?**
**Yes, absolutely. This is mandatory for Enterprise systems.**
When you chunk your Golden Data, you shouldn't just inject `topic` and `chapter`. You must inject the **Curriculum Rules** and **Hierarchy** directly into the Vector Metadata.
```json
{
  "text": "The mitochondria is the powerhouse of the cell...",
  "metadata": {
    "session_year": "2026",
    "hierarchy_path": "Level:Secondary/Class:9/Subject:Biology/Chapter:Cell",
    "curriculum_rule_blooms_taxonomy": "Knowledge, Comprehension",
    "curriculum_rule_marks_weightage": "High"
  }
}
```
**Why this is a game-changer:**
When the chatbot receives a prompt: *"Make a hard 10-mark creative question for Class 9 Biology based on 2026 rules."*
The system does a **Metadata Hard-Filter** first: `session=2026 AND class=9 AND blooms_taxonomy=Hard/Creative`. Then it searches the vectors. This guarantees **0% hallucination** regarding exam rules.

### B. Vector-less Data / LLM Wiki (GraphRAG Architecture)
Pure Vector DBs fail when answering "Global Questions" (e.g., "Summarize the entire book" or "Compare Chapter 1 with Chapter 5"). To build a system that perfectly acts like a "Mini Book AI", you need **GraphRAG (Knowledge Graphs)**.

**How GraphRAG (LLM Wiki) Works:**
Instead of just cutting text into vectors, you ask the LLM to extract **Entities (Nodes)** and **Relationships (Edges)**.
- **Node 1:** Newton
- **Node 2:** Gravity
- **Relationship:** Newton *discovered* Gravity.

These are saved in a Graph Database (like Neo4j) or as structured JSON (Vector-less Data).
When the user chats, the AI traverses this "Wiki-like Graph". It doesn't rely on similarity scores; it relies on **hard logic and relationships**. 

### C. The Perfect "Mini-Book" RAG System
To achieve 100% perfection, use the **Hybrid Approach**:
1. **Sparse Retrieval (BM25):** Good for exact keyword matching (e.g., specific dates, specific scientific names).
2. **Dense Retrieval (Pinecone/Vector):** Good for semantic meaning and concepts.
3. **Graph Retrieval (LLM Wiki):** Good for logical relationships and global understanding.

**Action Plan:**
1. Upgrade the Golden Data chunker to append all `curriculum-rules` into the Metadata object.
2. Introduce a "Graph Extraction Phase" alongside vectorization to build an internal Wiki for every uploaded book.

---

## 4. The Vectorization Command Center (`/knowledge-hub/sync-library`)

To execute this massive backend operation without bloating the WYSIWYG Proofreading Editor, we will introduce a dedicated Command Center for synchronization.

### Upgraded Plan: Zero-Click Metadata Extraction
Instead of forcing admins to manually select Class, Subject, and Rules via a dropdown before syncing, the system will be entirely automated:
1. **Auto-Resolution:** When a Book is ready for sync, the system already knows its `bookId`. From `bookId`, it dynamically traces back to `ClassSubject` -> `Level` -> `AcademicSession`.
2. **Dynamic Rule Fetching:** The system will automatically fetch the latest active `CurriculumRules` tied to that specific `ClassSubject`.
3. **The Metadata Verification Modal:** When the admin clicks "Sync to Vector DB", a modal appears. *It does not ask for input.* Instead, it displays a **read-only verification summary** (e.g., "Ready to sync: Class 9 | Physics | 2026 Session Rules"). 
4. **Graph & Entity Extraction:** Alongside semantic chunking, this background process will quietly extract Wiki-Nodes (GraphRAG) and push them to the relational database without any extra human effort.

---

## 5. Progress Tracker (Step-by-Step Implementation)

- [x] **Step 1: Frontend - Zero-Click Metadata Modal** 
  - Update `SyncCommandCenter.jsx` to auto-fetch `book` details (`ClassSubject`, `Level`, `Session`) and `CurriculumRules`.
  - Redesign `TopicExtractConfigModal` to be a "Read-only Verification Summary" instead of just chapter selection.
- [x] **Step 2: Backend - Rule Fetching & Job Payload**
  - Update the `/extract-all-topics` API endpoint payload to accept or auto-resolve the curriculum rules. (Implemented via internal auto-resolve to keep it Zero-Click).
- [x] **Step 3: Backend - Chunking & Metadata Injection**
  - Update `TopicExtractorService` / `PineconeService` to inject the resolved `topic_name` and curriculum rules directly into the Pinecone Vector metadata during the chunking phase.
- [x] **Step 4: Frontend - Data Verification Viewer (Preview)**
  - Enhance the `PreviewTopicsModal` in `SyncCommandCenter.jsx` to allow admins to rename AI-generated topics before the final push to Pinecone.
- [x] **Step 5: Backend - Question Generation (Strict Prompting)**
  - Update `AIQuestionServiceImpl` to read the `topic_name` from the vector metadata and pass it to the AI prompt, strictly blocking the AI from inventing new topics.
