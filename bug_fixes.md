# 🐞 QuestionShaper Bug Tracker (WYSIWYG & Knowledge Hub)

This document tracks identified bugs, their root causes, and how they were solved. It should be maintained continuously to help resolve tech debt systematically.

## 🔴 ACTIVE BUGS

## 🔴 ACTIVE BUGS

*No active bugs currently.*

---

## ✅ SOLVED BUGS
*(Move bugs here after they are fixed and briefly describe the solution.)*

### 6. Phase 3D Topic Extraction Crash (document_id cannot be null)
**Location:** `TopicExtractorServiceImpl` & Database Schema (`curriculum_document_chunks`)
**Description:** During the background bulk transaction for Phase 3D Semantic Chunking, saving AI-generated topics threw a `SQLIntegrityConstraintViolationException` stating `Column 'document_id' cannot be null`.
**Root Cause:** The `CurriculumDocumentChunk.java` entity rightly marked the `document` relation as optional because AI extracted chunks derive directly from `SourceBookIndex` and `KnowledgePage`. However, the physical MySQL database schema was originally created with an explicit `NOT NULL` constraint for the `document_id` column, leading to transaction crashes despite Java entity configurations.
**Solution Applied:** Executed a direct database migration (`ALTER TABLE questionshaper.curriculum_document_chunks MODIFY document_id char(36) NULL;`) to drop the constraint, successfully aligning the target schema with the Java object mappings.

### 1. Image Selection, Cursor Focus Jumps & Missing Toolbar
**Location:** `GoldenEditor.jsx` (`ResizableImageView` -> `handleWrapperMouseDown`)
**Description:** Clicking on an inline image frequently failed to select the node on the second attempt, made the text cursor jump erratically, and caused the context toolbar to disappear.
**Root Cause:** Severe conflict between React synthetic events (`onMouseDown`), Tiptap's NodeView layer, and ProseMirror's native text cursor DOM actions. Because ProseMirror acts on standard native bubbling events, `e.preventDefault()` via React happened too late. Additionally, React's closure system maintained "stale" `getPos()` states when node attributes updated, causing subsequent clicks to completely fail.
**Solution Applied:** Stripped generic ProseMirror plugins and React Synthetic events. Implemented a bulletproof NATIVE CAPTURE event listener (`{ capture: true }`) using `useEffect` directly on the wrapper `div`. Intercepting the click in the "Capture Phase" stops default browser behavior *before* ProseMirror perceives the click. By explicitly declaring `[editor, getPos, selected, imgError]` in the `useEffect` dependencies, the listener dynamically re-binds after every render cycle—eliminating stale closures and ensuring 100% robust image node selection and layout bar rendering.

### 2. Custom LaTeX Editor Focus Lost
**Location:** `GoldenEditor.jsx` (`MathInlineView`)
**Description:** Clicking the math equation opens the popup, but selecting the text inside struggles or loses focus.
**Root Cause:** React DOM nesting inside `contentEditable={false}` conflicts with TipTap/Prosemirror's strict caret monitoring and aggressive `e.preventDefault()` blocks on `mousedown`.
**Solution Applied:** Removed `e.preventDefault()` from `onMouseDown` and migrated editing trigger entirely to React's `onClick`. Added `requestAnimationFrame` to gracefully return `editor.commands.focus()` upon formula save.

### 3. `parseHTML` Dropping Custom Layout Hooks 
**Location:** `GoldenEditor.jsx` (`ResizableImage` extension)
**Description:** Loading old saved HTML drops the text-wrap or center alignment of images.
**Root Cause:** Backward compatibility `parseHTML` rule failed to traverse DOM trees properly because Tiptap's internal memory parser occasionally detaches elements, making `dom.closest()` return null.
**Solution Applied:** Mapped `data-align` natively inside the `img` tag itself via `renderHTML`, and updated `parseHTML` to prioritize reading the configuration natively from the tag before resorting to parent traversal.

### 4. Golden Page Status Reset on Reload
**Location:** `ProofreadingWorkspace.jsx` (Page gallery render loop, line ~950)
**Description:** When a page is saved via Golden Editor, it gets a "Golden Star" (amber color). But after page refresh, it reverts to a "Green Checkmark".
**Root Cause:** The UI checked `p.extractionStatus === 'EXTRACTED' || p.extractionStatus === 'PROOFREAD'` for the green checkmark. But `PROOFREAD` is actually the backend's state for Golden Content. Since `p.isGolden` was only set temporarily on save and lost on reload, it incorrectly fell back to the green checkmark.
**Solution Applied:** Changed the condition to `p.isGolden || p.extractionStatus === 'PROOFREAD'` for the Golden Star badge, and only `p.extractionStatus === 'EXTRACTED'` for the Green Checkmark.

### 5. Image Delete Button Failure & Error Crash
**Location:** `GoldenEditor.jsx` (`ResizableImageView` -> `handleDelete`)
**Description:** Clicking the delete icon on an image node failed to delete the image, sometimes dropping cursor focus entirely.
**Root Cause:** The `handleDelete` method invoked `deleteNode()` and then explicitly tried to restore focus by forcing `editor.chain().setTextSelection(pos).focus().run()`. Because the block was deleted, returning to the exact prior `pos` index threw an internal out-of-bounds error.
**Solution Applied:** Removed the strict index selection logic. Now it just calls `deleteNode()` and safely runs a generic `editor.commands.focus()` inside a `requestAnimationFrame`.
