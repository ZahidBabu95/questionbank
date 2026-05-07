# Question Metadata & Knowledge Hub Architecture Update Plan

This plan outlines the steps to unify and properly structure the extraction, storage, and UI management of academic metadata (such as Board Names, School Names, and Exam Years) across both the Question Bank and the Knowledge Hub.

## Phase 1: Backend API & Service Layer Update (✅ Completed)
**Goal:** Enable the backend to receive and save `QuestionSource` metadata when creating or updating a question.
- **Task 1:** Create `QuestionSourceDTO` to map incoming metadata requests.
- **Task 2:** Update `QuestionServiceImpl.java` (`createQuestion`, `updateQuestion`, and `getQuestionById`) to properly handle the `QuestionSource` entity. Ensure it saves, updates, and deletes sources properly, tying them to the `question_sources` database table.

## Phase 2: Frontend UI Integration (Question Bank) (✅ Completed)
**Goal:** Allow users to manually add or edit Board/School metadata from the admin dashboard.
- **Task 1:** Create a reusable UI component `QuestionSourceEditor.jsx` for the frontend.
- **Task 2:** Integrate this component into `MCQCreate.jsx`, `CQCreate.jsx`, and `ShortQuestionCreate.jsx`.
- **Task 3:** Integrate this component into `QuestionEdit.jsx` so existing questions can have their metadata updated.

## Phase 3: AI Question Generation & Deletion Safety (✅ Completed)
- [x] **Safe Topic Deletion API**: Ensured `AcademicService.deleteTopic` correctly handles foreign keys (Questions, Chunks, Lectures) and utilized it within the KnowledgeHub vector sync deletion flow to clean up `/admin/academic/structure`.
- [x] **Sequential Bulk Delete UI**: Prevented potential database deadlocks on the frontend `TopicList.jsx` by processing multiple bulk deletes sequentially.
- [x] **Chunk Metadata Injection**: Upgraded the `AIQuestionServiceImpl` to read stored metadata from `CurriculumDocumentChunk` and inject it directly into the `QuestionSource` table, bypassing AI hallucination completely.

## Phase 4: Knowledge Hub "Pre-Vector" Update (✅ Completed)
**Goal:** Prevent non-textbooks from cluttering the Academic Structure with duplicate topics, while retaining their rich metadata.
- **Task 1:** Update `CurriculumDocumentChunk.java` to include an `extractionMetadata` JSON column or explicit fields to hold board/school data.
- **Task 2:** Update `TopicExtractorServiceImpl.processBatch`. Implement conditional logic based on `BookType`.
  - **TEXTBOOK:** Create new Topics in the database (current behavior).
  - **GUIDE / QUESTION_BANK:** Use a modified prompt to extract metadata. Match the extracted topic against existing Textbook topics. **Do not create new topics.**
- **Task 3:** Ensure this metadata is passed to Pinecone during the Vector Finalization stage.

---
*Status: All phases for Metadata Extraction & Generation Workflow Completed.*
