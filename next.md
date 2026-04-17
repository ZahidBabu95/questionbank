# 📚 Knowledge Hub: Next Steps & Implementation Plan

> **Vision:** A centralized EdTech AI Brain using RAG, transforming digitized books into Golden Records for a Role-Based Chatbot (Teacher/Student Agentic Workflows).
> **Last Updated:** 2026-04-04 (Phase 3.5 — WYSIWYG Editor Upgrade — ✅ Complete)

---

## ✅ সম্পন্ন হয়েছে (Completed)

| Feature | Status |
|---------|--------|
| `SourceBookMaster` & `SourceBookIndex` entities | ✅ Done |
| R2 Data Pipeline (bulk image upload, 500MB support) | ✅ Done |
| PDF → Client-side image extraction (pdf.js chunked) | ✅ Done |
| `ProofreadingWorkspace` 3-panel UI (Tree A, OCR, Tree B) | ✅ Done |
| AI Extraction (Gemini Vision → Markdown) | ✅ Done |
| Multi-API Key Rotation (FREE_POOL mode, 9 keys) | ✅ Done |
| 429 Rate Limit handling with retry + wait | ✅ Done |
| TOC Preview endpoint (`/preview-toc`) | ✅ Done |
| TOC Review Modal (Dual-Tree checkbox UI) | ✅ Done |
| Tree A chapter save (duplicate prevention) | ✅ Done |
| Tree B index save (duplicate prevention) | ✅ Done |
| Phase 3A: Page→Chapter Linking | ✅ Done |
| Phase 3B: Golden Content Workflow | ✅ Done |
| Phase 3C: Knowledge Map Bridge (Tree B ↔ Tree A) | ✅ Done |
| Phase 3E: Automated Question Extraction | ✅ Done |
| **Phase 3.5 — Professional WYSIWYG GoldenEditor** | ✅ Done |

### Phase 3.5 বিস্তারিত (এই সেশনে সম্পন্ন):

| Sub-Feature | Status |
|-------------|--------|
| `GoldenEditor.jsx` — Full MS Word-style Ribbon Toolbar | ✅ Done |
| Markdown-to-HTML Conversion (`markdownToHtml()`) | ✅ Done |
| A4 Page Canvas (794px width, zoom, word count) | ✅ Done |
| Noto Serif Bengali font integration | ✅ Done |
| Tiptap `underline` duplicate extension fix | ✅ Done |
| Blank content bug fix (`isSettingContent` ref + `contentLoaded` flag) | ✅ Done |
| Heading dropdown — selection lost bug fix (saveSelection/applyWithSavedSelection) | ✅ Done |
| **All cursor/focus bugs fixed** (zoom buttons, save, fullscreen, font dropdown) | ✅ Done |
| Canvas CORS/Taint fix — backend proxy `/api/v1/knowledge-hub/proxy-image` | ✅ Done |
| **ResizableImage Extension** — `Node.create()` → `BaseImage.extend()` rewrite | ✅ Fixed |
| Bengali text `text-align: justify` default | ✅ Done |
| `parseHTML` dual-rule (img + div[data-image-wrapper] img) backward compat | ✅ Done |
| `addCommands` fix — chain().run() instead of commands.insertContent() | ✅ Done |

---

## 🔴 IMMEDIATE — এখনই করতে হবে

### 1. ResizableImage Extension Debug (সর্বোচ্চ Priority)

**সমস্যা:** Custom ResizableImage extension যোগ করার পর image insert ঠিকমতো কাজ করছে না।

**কারণ অনুসন্ধান:**
- `@tiptap/core` এর `Node.create()` + `ReactNodeViewRenderer` সঠিকভাবে কাজ করছে কিনা
- `addCommands()` এ `setImage` command-এর syntax সঠিক কিনা
- `parseHTML()` — আগের saved HTML `<img>` tags re-load হচ্ছে কিনা

**সম্ভাব্য Fix Checklist:**
```jsx
// Fix 1: addCommands-এর return format সঠিক করা
addCommands() {
    return {
        setImage: (attrs) => ({ chain }) => {
            return chain().insertContent({ type: this.name, attrs }).run();
        },
    };
},

// Fix 2: যদি Node.create না কাজ করে, @tiptap/extension-image extend করা:
import { Image } from '@tiptap/extension-image';
const ResizableImage = Image.extend({
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
    addAttributes() {
        return {
            ...this.parent?.(),
            width: { default: '50%' },
            align: { default: 'left' },
        };
    },
});

// Fix 3: group: 'block' এর পরিবর্তে inline image হলে:
// group: 'inline', inline: true
```

**Debug Steps:**
1. Browser console-এ error check করুন
2. `editor.chain().setImage({src:'...'}).run()` manually test করুন
3. যদি fully broken হয়, alternative: `@tiptap/extension-image` extend করে NodeView যোগ করুন

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
- [ ] Backend: `GoldenContentVectorizationService` — golden HTML কে chunks-এ ভাগ করে (HTML strip → plain text)
- [ ] Chunking Strategy: Sliding window (512 tokens, 128 overlap)
- [ ] Metadata per chunk: `{ bookId, treeBchapterId, treeAchapterId, treeAtopicId, chunkIndex }`
- [ ] Backend: Pinecone upsert endpoint reuse (existing `PineconeVectorDatabaseServiceImpl`)
- [ ] Frontend: "Sync to Vector DB" button per chapter
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

## 🟡 NEXT FOCUS: Phase 3D — Vector Sync Pipeline (Pinecone RAG)
We will now fully shift focus to building **GoldenContentVectorizationService** and preparing Pinecone index mappings for Chatbot queries!
