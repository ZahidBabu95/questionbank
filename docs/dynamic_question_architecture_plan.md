# Project Plan: Dynamic Question Architecture & Schema-Driven UI

## 1. Overview & Objective
Transform the current static Question Bank system into a **Highly Polymorphic & Dynamic Assessment Platform**. This will allow the system to handle any complex question variant (like Bangladesh Primary Curriculum, English Reading Passages, Matching, Rearranging, etc.) without writing new code for each type. 

We will use a **Hybrid Approach**: 
- Keep existing highly optimized forms (MCQ, CQ) as native components.
- Use **Schema-Driven UI (JSON Forms)** for all new and complex question types.

---

## 2. Phase 1: Database Architecture (Spring Boot & PostgreSQL/MySQL)

### A. New Entity: `QuestionType`
Instead of a hardcoded Java `Enum`, question types will be managed dynamically via the database.
**Table `question_types`:**
- `id` (UUID/Long) - Primary Key
- `name` (String) - Display Name (e.g., "Fill in the Blanks", "Matching")
- `code` (String) - Unique Identifier (e.g., `FILL_BLANKS`, `MATCHING`, `MCQ`)
- `is_system_default` (Boolean) - True for MCQ/CQ so they cannot be deleted.
- `schema_template` (JSONB) - The JSON blueprint that dictates how the frontend form should render for this type.
- `ai_prompt_template` (Text) - Specific instructions for AI generation for this type.

### B. Modifications to `Question` Entity
**Table `questions`:**
- Add `parent_id` (UUID, Nullable) - To support "Composite/Passage-based" questions (Parent = Passage, Children = MCQs/Short questions).
- Add `dynamic_data` (JSONB) - To store the actual user input corresponding to the `schema_template` (e.g., arrays of strings, matching pairs).
- Change `question_type` column to be a Foreign Key referencing `question_types.code` (or keep as String but validate against the table).

---

## 3. Phase 2: Backend Development (Spring Boot)

1. **QuestionType CRUD API:**
   - `GET /api/v1/question-types` (List all types with usage statistics).
   - `POST /api/v1/question-types` (Create a new type with its JSON schema).
   - `PUT /api/v1/question-types/{id}` (Update schema).
   - `DELETE /api/v1/question-types/{id}` (Prevent deletion if `is_system_default` is true or if questions exist).

2. **Question API Adjustments:**
   - Update the Create/Edit endpoints to accept and persist `parent_id` and `dynamic_data`.
   - Update filtering algorithms to search inside `dynamic_data` if needed.

---

## 4. Phase 3: Frontend Admin Panel (Settings > Question Types)

1. **Type Management Interface:**
   - Create a new route: `/dashboard/settings/question-types`.
   - Display a data table showing all dynamic and static types, and how many questions of each type currently exist.
2. **Schema Builder UI:**
   - A form where Admins can define the JSON schema for a new type.
   - Example Fields to configure: `Field Name`, `Field Type (Text, RichText, Dynamic List, Dropdown)`, `Required?`.
   - *Advanced:* Implement a split-screen live preview of how the form will look to teachers based on the JSON written.

---

## 5. Phase 4: Dynamic Form Builder (The Core Frontend Engine)

1. **The Form Renderer (`QuestionFormEngine.jsx`):**
   - When a user selects a question type, fetch its `schema_template` from the backend.
   - Map the schema to React components dynamically.
   - For `type: "richtext"`, render Quill/Editor.js.
   - For `type: "dynamic_list"`, render a repeatable field with "+ Add More" button.
2. **Hybrid Integration:**
   - If the selected type code is `MCQ` or `CQ`, bypass the dynamic engine and render the existing native React forms to ensure backward compatibility.

---

## 6. Phase 5: Question Bank UI (Rendering for Students/Teachers)

1. **The Factory Pattern (`QuestionRendererFactory.jsx`):**
   - In `QuestionList.jsx`, replace the monolithic rendering logic with a Factory pattern.
   - Pass the `dynamic_data` to specialized lightweight components (e.g., `<MatchingViewer data={...} />`, `<RearrangeViewer data={...} />`).
2. **Composite Questions View:**
   - Render the `Parent Question` (e.g., Reading Passage) prominently, and nest the `Child Questions` underneath it with visual indentation.

---

## 7. Phase 6: AI Generation Integration (The Magic Touch)

1. **Dynamic Prompt Injection:**
   - Update the AI generation prompt logic.
   - When generating a dynamic question, append the `schema_template` to the AI's system prompt.
   - Instruction: *"Generate 5 questions of this type. You MUST return the output EXACTLY strictly adhering to the following JSON schema: {schema_template}"*
2. **Auto-Population:**
   - Since the AI returns data matching the exact schema the dynamic form expects, the form can be instantly populated via `setFormData(aiResponse)` without any mapping code!

---

## Roadmap / Implementation Order
- **Session 1:** Database Schema updates and Backend APIs for `QuestionType`.
- **Session 2:** Settings UI for managing Question Types and creating Schemas.
- **Session 3:** The Dynamic Form Engine (React frontend) to parse schemas.
- **Session 4:** Updating Question Bank viewing and AI integration.
