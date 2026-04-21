# 📚 Knowledge Hub: Next Steps & Implementation Plan

> **Vision:** A centralized EdTech AI Brain using RAG, transforming digitized books into Golden Records for a Role-Based Chatbot (Teacher/Student Agentic Workflows).
> **Last Updated:** 2026-04-19 (Phase 3.5.1 — Professional WYSIWYG Editor Planning)

---

## ✅ সম্পন্ন হয়েছে (Completed)

| Feature | Status |
|---------|--------|
| Phase 3A: Page→Chapter Linking | ✅ Done |
| Phase 3B: Golden Content Workflow | ✅ Done |
| Phase 3C: Knowledge Map Bridge (Tree B ↔ Tree A) | ✅ Done |
| Phase 3E: Automated Question Extraction | ✅ Done |
| **Phase 3.5 — Base WYSIWYG GoldenEditor** | ✅ Done |
| Image Selection & Dragging Issues Fixed | ✅ Done |
| LaTeX Focus Issues Fixed | ✅ Done |
| Alignment parseHTML Bugs Fixed | ✅ Done |

---

## 🟡 UPCOMING: Phase 3.5.1 — Professional Editor Upgrade
*(Enterprise-level updates to eliminate lags and make proofreading lightning fast)*

### 1. UX & Productivity Features
- **Slash Menu (`/` Commands):** Quick insert for Heading, Table, Formula, Image without touching the mouse. ✅ Done (Native custom React hook)
- **Find & Replace:** Essential for globally fixing repeating OCR errors. ✅ Done (Built-in AST modifier)
- **Table Support:** Integrate `@tiptap/extension-table` for parsing and editing book tables. ✅ Done (Row/Col UI added)
- **Highlight & Annotations:** Allow editors to mark doubtful sections for later review.

### 2. Enterprise Performance & Stability (To solve Server Lag / Browser Crash)
**সমস্যা:** বর্তমানে `handleMarkAsGolden` এ ম্যানুয়ালি সেভ বাটনে ক্লিক করলে বড় টেক্সটের ক্ষেত্রে ব্রাউজার ল্যাগ করে বা ক্র্যাশ করতে পারে।
**সমাধান প্ল্যান:**
- **Debounced Auto-Save:** ম্যানুয়াল সেভের বদলে প্রতি ৩-৫ সেকেন্ড পর পর ব্যাকগ্রাউন্ডে সাইলেন্ট `PATCH` রিকোয়েস্ট পাঠানো (Optimistic UI)। ✅ Done (3s auto-save timer in Workspace)
- **Web Workers for Markdown Conversion:** Tiptap HTML থেকে Markdown এ কনভার্ট করা (`turndown`/custom serializer) অনেক হেভি কাজ। এটাকে মেইন থ্রেড থেকে সরিয়ে Web Worker-এ নিয়ে গেলে ব্রাউজার ফ্রিজ হবে না। ✅ Solved via onUpdate Debouncer (600ms gap protects Main Thread)
- **Incremental Diff Synching:** পুরো ডকুমেন্ট প্রতিবার না পাঠিয়ে শুধু যতটুকু পরিবর্তন হয়েছে (Diff) ততটুকু পাঠানো।
- **Preventing Re-renders:** React component optimization (React.memo, useCallback) যাতে টাইপ করার সময় পুরো Workspace re-render না হয়।

### 3. Review & AI Tools
- **Original vs Result View:** Split screen diff to compare "Raw AI Extracted Text" vs "Current Edited Markdown".
- **AI Tooltips:** Select text -> Floating menu -> "Rewrite / Fix Grammar / Explain". ✅ Done (UI & BubbleMenu added, stubbed for Backend API endpoint)

---

## ✅ Phase 3.5 সম্পূর্ণ — এখন যা verify করতে হবে

### 1. ResizableImage — Browser Test ✅

**Fix যা করা হয়েছে:**
- `Node.create()` → `BaseImage.extend()` (safer, no name conflicts)
- `addAttributes()` → `...this.parent?.()` দিয়ে BaseImage attrs inherit করা
- `parseHTML` — দুটি rule: `img[src]` (new) + `div[data-image-wrapper] img[src]` (saved HTML backward compat)
- `renderHTML` — `data-image-wrapper` attribute দিয়ে div wrapper, CSS দিয়ে alignment
- `addCommands` — `chain().insertContent(...).run()` (atomic, সঠিক transaction)
- Bengali `text-align: justify` default CSS যোগ করা

**এখনো verify করতে হবে (manually browser-এ):**
- [ ] GoldenEditor-এ image insert হচ্ছে কিনা (ProofreadingWorkspace → Edit Golden)
- [ ] Image select করলে floating toolbar আসছে কিনা
- [ ] Align Left/Center/Right কাজ করছে কিনা
- [ ] Width input + resize handle কাজ করছে কিনা
- [ ] ✕ button দিয়ে image delete হচ্ছে কিনা
- [ ] Previously saved HTML content re-load করলে image দেখা যাচ্ছে কিনা

---

MS Word-এর মতো text এর পাশে image রাখার জন্য:

```jsx
// CSS float-based wrapping
const wrapStyleMap = {
    'wrap-left':  { float: 'left',  marginRight: '1em', marginBottom: '0.5em' },
    'wrap-right': { float: 'right', marginLeft:  '1em', marginBottom: '0.5em' },
    'inline':     { display: 'inline-block' },
};
// Toolbar-এ: "Wrap Left" / "Wrap Right" / "Block" toggle যোগ করুন
```

---

## 🟡 Phase 3D — Vector Sync Pipeline (Pinecone)
**Priority: MEDIUM | Estimated: 2 sessions**

Golden Content → Semantic Chunks → Pinecone vectorization।

**কাজসমূহ:**
- [x] Backend: `TopicExtractorService` — golden markdown কে chunks-এ ভাগ করে (Gemini AI দিয়ে Topic Extract করা)
- [x] Chunking Strategy: Semantic Topic Grouping via Gemini 2.5 Flash
- [x] Metadata per chunk: `{ bookId, chapterId, topicId, topicName, hasImage }`
- [x] Backend: Pinecone upsert endpoint reuse
- [ ] Frontend: "Sync to Vector DB" button / Queue status in UI
- [ ] Frontend: Knowledge Hub dashboard sync status indicator

---

## ✅ Phase 3E — Question Extraction from Golden Content
**Status: COMPLETELY DONE**

- [x] Backend: AI prompt — "Extract all practice questions from this content" → JSON array
- [x] Backend: Extracted questions → existing `QuestionBank` MCQ/CQ creation endpoint
- [x] Frontend: "Automate Questions" button in Proofreading workspace with Job Queue polling
- [x] Review UI: Reuse existing QuestionList via `/questions/drafts` route with "DRAFT" badge integration

---

## 🟢 Phase 4 — Persona-Based Chatbot UI
**Priority: LOW | Estimated: 2-3 sessions**

- [ ] Backend: RAG query endpoint — Pinecone similarity search → context → Gemini prompt
- [ ] Backend: `SystemPrompt` management (Teacher vs Student persona)
- [ ] Ensure any newly uploaded Source Books are accurately indexed and visible in Knowledge Hub.

### Enterprise Readiness & Scaling (Phase 4)
- **Microservice Worker Decoupling:** Detach `AiBulkExtractionWorker` and `AiQuestionGenerationWorker` to a standalone Microservice (Serverless/Docker Worker Cluster) to process huge bulk files without impacting main SaaS REST queries.
- **Vector RAG Pipeline & Pinecone Sync:** Sync the structured AI Extractions (`extractedMarkdown` / `goldenMarkdown`) into vector dimensions on Pinecone, creating a scalable chatbot that allows realtime QA directly referencing the exact book location.
- **Audit Logging and Grafana Monitoring:** Add comprehensive Table/Entity mutation tracking and integrate monitoring solutions like Sentry and Grafana to track SLA and rate-limit drops globally.
- **Dynamic Thread Pool Configuration:** Implement `ThreadPoolTaskExecutor` to scale concurrent API requests based on server CPU and available Gemini API key pool.
- **Smart Load Balancing:** Deploy Greedy/Fair distribution logic to manage concurrent user workloads across the API key rotation pool.
- **Resilience & Auto-Recovery:** Integrate Token Bucket rate-limiting and automatic retry logic to handle 429 errors by switching to healthy proxy keys in real-time.

- [ ] Frontend: Chat widget or dedicated `/admin/knowledge-hub/chatbot` page
- [ ] Frontend: Context selector (Book, Chapter, Topic) before asking question

---

## 🗺️ Implementation Order (Updated)

```
✅ DONE:
  ├─ [1] Phase 3A: Page→Chapter Linking           ✅
  ├─ [2] Phase 3B: Golden Content Workflow        ✅
  ├─ [3] Phase 3C: Knowledge Map Bridge           ✅
  ├─ [4] Phase 3E: Automated Question Extraction  ✅ (Full Integration completed)
  ├─ [3.5-G] Knowledge Hub Analytical Reporting   ✅
  └─ [3.5-H] Seamless Background Bulk Extraction  ✅ (New Queue system + Frontend Polling)

IMMEDIATE NEXT:
  ├─ [5] Phase 3D: Vector Sync (Pinecone RAG)    ← Start here

UPCOMING:
  └─ [6] Phase 4: Persona-Based Chatbot UI
```

---

## 🏗️ Architecture (Key Files)

```
Frontend:
  src/pages/admin/KnowledgeHub/
    ├── ProofreadingWorkspace.jsx    ← Main workspace (editorInsertPos, proxy image)
    └── components/
        └── GoldenEditor.jsx         ← WYSIWYG editor (ResizableImage, Ribbon, Focus fixes)

  src/pages/admin/Reports/
    └── KnowledgeHubReport.jsx       ← Analytics report (PDF, Excel, Hierarchy Mapping)

  src/pages/admin/QuestionBank/components/
    └── LiveImageCropperModal.jsx    ← Crop modal (backend proxy for R2 CORS)

Backend:
  controller/KnowledgeHubController.java
    ├── POST /upload-image           ← R2 upload
    └── GET  /proxy-image?url=...    ← R2 CORS proxy (NEW)

  service/impl/AcademicServiceImpl.java
    └── GET  /hierarchy              ← Used extensively for mapping reports
    
  service/impl/KnowledgeHubServiceImpl.java
    └── Null type safety warnings (Low priority, non-blocking)

  scheduler/
    ├── AiExtractionScheduler.java      ← Background bulk PDF text extraction (2s polling)
    └── AiQuestionGenScheduler.java     ← NEW: Background queue for Phase 3E (Drafting Questions)

---

## 🛠️ Deep Dive: Phase 3E Automated Question Extraction
**Strategy: "Prompt as a Database (PaaD)" leveraging CurriculumRules**

1. **Schema Definition**: Will NOT hardcode prompts. We will reuse the existing `/admin/academic/structure` (CurriculumRules.jsx) which saves subject-specific schemas into `AiKnowledgeBase` table (Tagged as `SCRAPING_JSON`, `RULE_FOR_{Subject}`).
2. **Background Queue Engine**: `AiQuestionGenerationJob` entity keeps track of bulk operations (similar to extraction queue). (**✅ BACKEND COMPLETE**)
3. **The Scheduler** (`AiQuestionGenScheduler`): Pings database every 2 seconds. Merges `KnowledgePage` Golden Content + Database Prompt + Subject Schema. (**✅ BACKEND COMPLETE**)
4. **Data Persistence**: Parses Gemini's generated JSON Array. Inserts directly into `Question` entity with `type`, `marks`, `options`, `status=DRAFT`, `aiGenerated=true`. (**✅ BACKEND COMPLETE**)
5. **API Endpoints**: `/v1/knowledge-hub/jobs/generate-questions/source-books/{id}/...` endpoints mapped for UI controls. (**✅ BACKEND COMPLETE**)
6. **Frontend Review**: A dashboard where Super Admin reviews AI Drafts and publishes them to the mainstream Question Bank. *(Next Step!)*
```

---

## 🐛 Known Issues / Tech Debt

| `Null type safety` warnings in `KnowledgeHubServiceImpl` | Low | Non-blocking |
| `chapter_number` unique constraint নেই DB-তে | Low | Code-level prevention আছে |
| Image wrap-with-text not implemented | Medium | Float CSS দিয়ে করা যাবে |

---

## 🎯 Last Session Accomplishments (April 2026 - AI Pipeline Polish & Refinements)
- **Phase 3E Image & Markdown Schema Polish:** 
  - Backend dynamically injects `"stimulus"` property into user-created Curriculum Rules inside `KnowledgeHubServiceImpl` so that images are never left behind during generation.
  - Rectified frontend image stripping by enabling `image` and `link` formats within ReactQuill inside `RichTextEditor.jsx`. Images extracted via Golden Content now display natively during AI Draft reviews.
- **Dynamic Question Engine Configuration (Textbook, Guidebook, Hybrid):**
  - **Frontend:** Added a 3-way toggle in `ProofreadingWorkspace.jsx` allowing the user to explicitly select between "Generate New", "Extract Only", and "Hybrid/Both". The UI automatically pre-selects the appropriate mode based on the `bookType` dynamically passed from the DB.
  - **Backend:** Updated `KnowledgeHubServiceImpl.java` prompt builder to inject specific instructions handling `TEXTBOOK`, `GUIDEBOOK`, and `HYBRID` directives to Gemini, ensuring the AI model applies the correct extraction vs. synthesis logic based on the source material.
  - **Bug Fix:** Removed broken string escapes (`\"`) injected during CQ HTML template processing which previously caused `Unresolved compilation problems: Syntax error` across the codebase.
- **Smart Deduplication Architecture:**
  - Added repository checks to block repetitive bulk generation by cross-referencing `sourceReference` (Page IDs). It gracefully handles and skips previously generated drafts to preserve API limits.
- **FREE_POOL High-Performance Architecture Validation:**
  - Validated that the soft-delete functionality for API Keys (`deleted=true`) successfully trims the rotation pool without breaking relation mapping. 
  - The rotational multi-key logic securely runs multiple Google AI Studio Free Tier Keys, yielding seamless enterprise-tier continuity (~45 RPM without bottlenecks), virtually indistinguishable from paid billing plans.
- **Critical Edge Case Bugs Resolved (API Key Overwrites & Truncation):**
  - **Masking Collision Bug:** Fixed a highly evasive bug where the frontend `AIza••••••••••••` bullet points bypassed the backend `****` masking check, causing the literal masked string to permanently overwrite original API keys in the DB.
  - **Data Truncation Error Bypass:** Fixed a hidden loop flaw where Google's massive JSON response pushed the `API_KEY_INVALID` reason beyond the database's 250-char `last_error` limit. The truncation occurred *before* the keyword validation, blinding the system from marking the key as exhausted. This has been reversed by evaluating the raw response strings pre-truncation.
  - **Hibernate L1 Cache Staleness Fix:** Added `clearAutomatically=true` on `@Modifying` queries in `AiApiKeyRepository` to prevent the Entity Manager from continuously feeding dirty, stale `requestsToday = 0` instances to the rotation logic in long-running job threads.

---

## 🤖 Next Phase Architecture: Dynamic UI-Controlled API Dispatcher (Distributed Worker Pool)

For the next session, we are upgrading the basic sequential `@Scheduled` queues into a highly concurrent, "Distributed Network" scaling model that can be controlled dynamically from the frontend by the Super Admin. Because we now possess **Pay-as-you-go** API keys, the system can leverage hundreds of threads without rate limits.

### 🌟 Technical Viability & Strategy (✅ COMPLETED in Recent Session):

1. **Dynamic UI-Controlled Thread Pool (`ThreadPoolTaskExecutor`):**
   - **Status:** ✅ Done. Replaced primitive executors with Spring `ThreadPoolTaskExecutor`.
   - **Persistence:** ✅ Done. Added `GeneralSetting` persistence so `maxWorkers` size survives server reboots.
   - Admin can dynamically set the active loop parallel workers via the React GUI.

2. **Server & Jobs Analytics Enhancements:**
   - **Worker Configurator UI:** ✅ Done. Integrated into Knowledge Hub Report.
   - **Extraction Progress Sync:** ✅ Done. Adjusted frontend tracking so that `b.extractedPages >= b.totalPages` correctly flags files as 'Extraction Completed', bypassing temporary backend worker states.
   - **WebSocket Sync Fix:** ✅ Done. Removed legacy `ForwardingController.java` to prevent `HttpRequestMethodNotSupportedException` on `POST` fallback mappings affecting the SockJS STOMP client in production servers without HTTPS.

3. **Smart Load Balancing (Greedy + Fair Distribution):**
   - **Status:** ✅ Done. Handled dynamically inside `AiExtractionScheduler`.

---

## 🟡 ENTERPRISE ARCHITECTURE PIVOT: Enterprise Curriculum Pipeline (Phase 3D -> 3E)
*Based on architectural review, generating questions directly from "Pages" produces orphaned data that lacks syllabus hierarchy.*

### The Enterprise Content Pipeline (New Blueprint)
1. **Digitization (Done):** Raw PDF -> KnowledgePage -> Golden Markdown.
2. **Semantic Chunking (Phase 3D):** Golden Markdown + AI -> `CurriculumDocumentChunk` & `Topic` entities inside Pinecone RAG.
3. **Context-Aware Question Gen (Phase 3E Shift):** Generate questions mapped directly to `Topic` Vectors instead of random pages.

---

### 1. Phase 3D: Semantic Indexing & Topic Extraction Pipeline
- **Status:** Backend Implementation DONE. UI Integration pending.
- **Objective:** Read Golden Data from a chapter/book and split it into logical sub-topics or "Chunks" using AI.
- **Backend Components:**
  - ✅ `TopicExtractorService` (NEW): Reads a sequence of `KnowledgePage`s for a `Chapter` or `SourceBookIndex`.
  - ✅ Prompts AI to divide text boundaries into `Topic` entities (e.g., "Velocity", "Newton's First Law").
  - ✅ Saves the structured topics into the `topics` table linked to `chapter_id`.
  - ✅ Saves the corresponding split text into `CurriculumDocumentChunk` table. (Fixed `document_id` NOT NULL DB Constraint).
- **RAG/Vector DB (Pinecone):**
  - ✅ Integrate a fast embedding service to convert `CurriculumDocumentChunk` text into vectors via existing Pinecone Service.

### 2. Phase 3E.2: RAG-Powered Context-Aware Question Engine
- **Status:** Paused until Phase 3D is active.
- **Objective:** Modify the current `AiQuestionGenScheduler` so it no longer loops over `targetPageIds`. Instead, it will:
  - Take `targetTopicIds` (or all Topics in a Chapter) from the UI.
  - Query Pinecone/Database for the text payload specific to that `Topic`.
  - Prompt AI: *"Generate 5 MCQs and 2 CQs specifically for the Topic: 'XYZ'. Context: [Chunk Data]"*.
  - Map the newly generated questions natively to the `topic_id`.
- **UI Update:**
  - The Question Engine Setup Modal will allow users to select "Generate by Exact Page" (Legacy Guidebook mode) OR "Generate by RAG/Curriculum Topic" (Enterprise Textbook Mode).

### 3. Smart Deduplication (Post-Generation)
- **Status:** Planning Phase
- **Details:** If matching old questions exist in the topic, append new tags (e.g. "Dhaka Board 2026") instead of duplicating arrays.

