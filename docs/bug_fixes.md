# 🐞 QuestionShaper Bug Tracker (WYSIWYG & Knowledge Hub)

This document tracks identified bugs, their root causes, and how they were solved. It should be maintained continuously to help resolve tech debt systematically.

## 🔴 ACTIVE BUGS

## 🔴 ACTIVE BUGS

*No active bugs currently.*

---

## ✅ SOLVED BUGS
*(Move bugs here after they are fixed and briefly describe the solution.)*

### 12. Auto Exam Generator Pre-fill & State Hydration Failure
**Location:** `AutoExamGenerator.jsx`
**Description:** After selecting parameters (Subject, Chapter, Question Count) via the Conversational Auto Exam Widget and clicking "Generate", the user was redirected to the Auto Exam Generator page, but none of the parameters were applied. The page remained on Step 1 (Subject Selection) or ignored the specific question counts and loaded the default blueprint.
**Root Cause:** The `AutoExamGenerator` was missing the `useLocation` hook to intercept the `prefill` state passed by the widget. Furthermore, the frontend lacked a reliable way to reverse-lookup `classId`, `streamId`, and `levelId` solely from a `classSubjectId`.
**Solution Applied:** Implemented auto-hydration via `location.state.prefill`. Created a clean reverse-lookup by hitting the specific backend endpoint `/v1/academic/class-subjects/{id}/hierarchy` to accurately populate all dropdowns. Modified `fetchSchema` to override the default blueprint with the user's requested `qsCount` (allocating it to the primary question type) and automatically mapping the questions to the selected `chapterId` in the `allocations` state, achieving a seamless zero-click handoff to Step 2.

### 11. Nexus Editor Auto-Save Failure (400 Bad Request)
**Location:** `NexusEditor.jsx` (`importFromAi` hook) & `AiWorkspace.jsx`
**Description:** Clicking the "Open in Editor" button transported the AI-generated questions to the Nexus Editor, but immediately threw an "Auto-save failed" alert, and the questions could not be seen in the right sidebar.
**Root Cause:** The `createManualExam` backend endpoint explicitly enforces validation rules (`@Valid` via `ManualExamRequest`), requiring fields like `classSubjectId`, `totalMarks`, and `durationMinutes`. The frontend payload was completely omitting these context variables when auto-drafting from the AI.
**Solution Applied:** First, updated `AiWorkspace.jsx` to parse the AI JSON output and dynamically inject the active `classSubjectId` before storing it in `localStorage`. Second, updated `NexusEditor.jsx` to extract this ID, generate fallback totals (`totalMarks=100`, `durationMinutes=120`), and seamlessly bundle them into the auto-save payload, preventing the 400 Bad Request rejection and successfully rendering the saved draft.

### 10. AI Workspace JSON Extraction Failure (Raw UI Leakage)
**Location:** `AiWorkspaceController.java` (`askCopilot`)
**Description:** AI-generated JSON payloads were bleeding into the chat UI as raw unformatted code instead of securely rendering as an actionable "Open" button.
**Root Cause:** The existing JSON extraction logic relied on the AI perfectly wrapping the payload in markdown blocks (e.g., ` ```json `). When the Gemini API returned raw strings without the markdown wrapper, the regular expression failed, and the payload was mistakenly treated as standard chat text.
**Solution Applied:** Replaced fragile Regex matching with robust String index slicing. Utilizing `indexOf("{\"actionable_type\"")` and `lastIndexOf("}")` ensures that regardless of how the AI formats the markdown envelope, the core JSON object is forcefully amputated from the text body, parsed, and routed exclusively to the frontend button renderer.

### 9. AI Workspace Copilot Formatting Failure (Raw JSON Output)
**Location:** `AIQuestionServiceImpl.java` (`generateRawCompletion` and `buildGeminiRequest`)
**Description:** The Copilot AI was instructed to output beautifully formatted Markdown text. However, the output was consistently rendered as a raw JSON string like `{"note": "...", "questions": [...]}`.
**Root Cause:** The `buildGeminiRequest` helper method hardcoded `generationConfig.put("responseMimeType", "application/json")` for ALL Gemini queries. Even when the `generateRawCompletion` method (used by the Chatbot) requested Markdown, the Gemini API was forced by the configuration to output JSON.
**Solution Applied:** Refactored `buildGeminiRequest` to accept a boolean `expectJson` flag. For Copilot RAG queries, this flag is passed as `false`, removing the JSON constraint and allowing native Markdown.

### 8. Pinecone Namespace String Mismatch (Parenthesis Failure)
**Location:** `CopilotService.java` (`askCopilot` subject parsing)
**Description:** The backend RAG pipeline could not find matching database records to resolve Pinecone namespaces when the user selected subjects like `"৬ষ্ঠ শ্রেণি - বাংলা ১ম পত্র (১st Paper)"`.
**Root Cause:** The frontend dynamically attaches UI labels like `(1st Paper)` or `(Compulsory)`. The `CopilotService` blindly split the string by `" - "` and tried to `LIKE` search the database column with `"বাংলা ১ম পত্র (১st Paper)"`. Since the database column is exactly `"বাংলা ১ম পত্র"`, the query failed, yielding an empty namespace array, crashing strict RAG capability.
**Solution Applied:** Implemented a string manipulation cleanup snippet in `askCopilot` that actively strips out parenthesis blocks `( ... )` from the `subjN` variable before executing the repository search.

### 7. Spring Boot UTF-8 Console/Request Encoding (Bengali '?????')
**Location:** `application.properties` & API Logs
**Description:** User queries sent from the frontend containing Bengali text (`"আমাকে ৫টি বহু নির্বাচনী প্রশ্ন দিন"`) were corrupted into `?????` inside the Spring Boot execution environment, breaking the search mechanisms completely.
**Root Cause:** The underlying server/OS default file encoding was `Cp1252` instead of `UTF-8`. As a result, the `HttpServletRequest` stream decoded the Bengali text incorrectly.
**Solution Applied:** Forced strict UTF-8 decoding globally by injecting `server.servlet.encoding.charset=UTF-8` and `server.servlet.encoding.force=true` into the `application.properties` configuration file.

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
