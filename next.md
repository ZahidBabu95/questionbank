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

## 🟡 Phase 3E — Question Extraction from Golden Content
**Priority: MEDIUM | Estimated: 1 session**

- [ ] Backend: AI prompt — "Extract all practice questions from this content" → JSON array
- [ ] Backend: Extracted questions → existing `QuestionBank` MCQ/CQ creation endpoint
- [ ] Frontend: "Extract Questions" button in Proofreading workspace
- [ ] Review UI: Extracted questions preview modal → approve all / select specific

---

## 🟢 Phase 4 — Persona-Based Chatbot UI
**Priority: LOW | Estimated: 2-3 sessions**

- [ ] Backend: RAG query endpoint — Pinecone similarity search → context → Gemini prompt
- [ ] Backend: `SystemPrompt` management (Teacher vs Student persona)
- [ ] Frontend: Chat widget or dedicated `/admin/knowledge-hub/chatbot` page
- [ ] Frontend: Context selector (Book, Chapter, Topic) before asking question

---

## 🗺️ Implementation Order (Updated)

```
✅ DONE:
  ├─ [1] Phase 3A: Page→Chapter Linking           ✅
  ├─ [2] Phase 3B: Golden Content Workflow        ✅
  ├─ [3] Phase 3C: Knowledge Map Bridge           ✅
  ├─ [3.5-A] Professional WYSIWYG Ribbon Editor   ✅
  ├─ [3.5-B] Focus/Selection Bugs Fixed           ✅
  ├─ [3.5-C] Image Crop CORS Fix (Backend Proxy)  ✅
  ├─ [3.5-D] ResizableImage Extension             ✅
  ├─ [3.5-E] Editor State Sync & Clipping Fix    ✅
  └─ [3.5-F] LaTeX/KaTeX Math Extension + UI      ✅

IMMEDIATE NEXT:
  ├─ [4] Phase 3D: Vector Sync (Pinecone)        ← Start here
  └─ [5] Phase 3E: Question Extraction           

UPCOMING:
  └─ [6] Phase 4: Chatbot UI
```

---

## 🏗️ Architecture (Key Files)

```
Frontend:
  src/pages/admin/KnowledgeHub/
    ├── ProofreadingWorkspace.jsx    ← Main workspace (editorInsertPos, proxy image)
    └── components/
        └── GoldenEditor.jsx         ← WYSIWYG editor (ResizableImage, Ribbon, Focus fixes)

  src/pages/admin/QuestionBank/components/
    └── LiveImageCropperModal.jsx    ← Crop modal (backend proxy for R2 CORS)

Backend:
  controller/KnowledgeHubController.java
    ├── POST /upload-image           ← R2 upload
    └── GET  /proxy-image?url=...    ← R2 CORS proxy (NEW)

  service/impl/KnowledgeHubServiceImpl.java
    └── Null type safety warnings (Low priority, non-blocking)
```

---

## 🐛 Known Issues / Tech Debt

| `Null type safety` warnings in `KnowledgeHubServiceImpl` | Low | Non-blocking |
| `chapter_number` unique constraint নেই DB-তে | Low | Code-level prevention আছে |
| Image wrap-with-text not implemented | Medium | Float CSS দিয়ে করা যাবে |

---

## 🎯 Last Session Accomplishments (April 4, 2026)
- **Advanced Dynamic Crop Editing (Edit BEFORE Insert)**: 
  - Integrated `onAdvancedEdit` workflow inside `LiveImageCropperModal`
  - Cropped snippets can now be sent directly to the Filerobot `Advanced Image Editor` by clicking "অ্যাডভান্স ক্রপ এডিট" (Settings icon).
  - Saved snippets from Filerobot are dynamically inserted into the `GoldenEditor` instead of overriding the entire source page image.
- **Dynamic AI MIME Type Detection**: 
  - Fixed an issue where Gemini Extraction crashed on Filerobot's generated `image/png` files due to hardcoded `image/jpeg` MIME values in the backend. 
  - Added smart extension parsing (`.png`, `.webp`) in `extractKnowledgePageContent`.
- **Filerobot Source Proxy Integration**: 
  - Verified and ensured smooth image bypassing using the `PublicLandingController.proxyImage` endpoint for Cloudflare R2 CORS policies.
