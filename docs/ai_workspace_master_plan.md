# 🚀 QuestionShaper AI Workspace: Enterprise EdTech AI Hub
**Product Vision & Architectural Roadmap**

> **Executive Vision:** "Transforming the QuestionShaper AI Workspace from a conversational chatbot into a fully autonomous, 'Personalized Academic AI Co-Pilot' and 'Content Orchestration Engine' for educational institutions, educators, and learners."

---

## ⚡ CORE DIRECTIVE: Strict Mode & Zero-Token Agentic Operations
**Priority Strategy:** As the platform scales to millions of users, LLM API token costs must be aggressively minimized or eliminated for standard operations.
1. **Strict Mode Zero-Token Pipeline:** When the AI Response Mode is set to 'Strict' (retrieving existing data from the Question Bank rather than generating new content), the system must use **Deterministic/Rule-Based Algorithms** and direct database queries instead of routing through the LLM.
2. **Interactive UI Agents (In-Chat Widgets):** High-frequency tools (like the *Auto Exam Generator* via the `+ Tools` menu) must trigger "Interactive Artifacts" (Frontend Forms rendered within the chat flow). This provides users with a guided, agent-like experience while consuming exactly **0 tokens**.
3. **LLM as an Extractor, Not a Database:** Only utilize LLMs (e.g., Gemini Flash) for parsing unstructured natural language into structured JSON filters. Once structured data is obtained, immediately hand off the execution to traditional backend endpoints.

---

This document outlines the strategic phases for developing a scalable, multi-tenant, and professional-grade AI Ecosystem tailored for modern educational operations.

---

## 🎯 Phase 1: Core AI Orchestration & Workspace Optimization (Ongoing)
**Objective:** Establish a production-ready, frictionless, and secure conversational interface with robust state management.

* **[ ] Persistent Session Management:**
  * Implement robust database schemas (`ai_chat_sessions`, `ai_chat_messages`) for seamless session persistence.
  * Develop RESTful APIs to retrieve conversational history, ensuring context retention across reloads and multi-device access.
* **[ ] Tenant-Specific Knowledge Hub & Zero-Load Uploads:**
  * **Organized Tenant Library:** Activate contextual attachments (`+` icon). When educators upload their proprietary PDFs/lecture sheets, they will not mix with the Global Knowledge Hub. Instead, they will be systematically organized within the Tenant's private library.
  * **Zero-Load Server Architecture:** To guarantee minimal load on the core Spring Boot server, raw files (PDFs/Images) will bypass the local disk and be routed directly to **Cloudflare R2** (or AWS S3) buckets.
  * **Vector Isolation (Pinecone):** The uploaded materials will be semantically chunked and isolated into a unique **Pinecone Vector Namespace** (e.g., `tenant_15_book_x`). The AI will query this external vector space, ensuring lightning-fast responses with zero strain on the MySQL relational database.
* **[ ] Universal AI Gateway (Multi-Model Hub):**
  * Introduce a dynamic "AI Engine" selector (e.g., Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet) in the global top-bar.
  * Refactor `AIQuestionServiceImpl` to serve as a model-agnostic gateway, abstracting API complexities.

---

## ⚙️ Phase 2: Enterprise AI Command Center (Admin Architecture)
**Objective:** Provide Institute Admins and Super Admins with granular, UI-driven control over AI behavior, token telemetry, output auditing, and prompt engineering—without requiring code changes.

### 🧩 System Sub-menus & Logic Flow
To achieve a "Zero Hallucination" and hyper-personalized environment, the AI Workspace will be divided into specific administrative modules:

* **[ ] 💬 AI Chat Console (`/ai-workspace`)**
  * **Access:** All Users (Super Admin, Institute Admin, Teacher, Student).
  * **Function:** The core operational workspace. Users converse, select subject JSON structures, and push outputs directly to the Nexus Editor.

* **[ ] ⚙️ Command Center & Modes (`/ai-workspace/admin/settings`)**
  * **Access:** Super Admin, Institute Admin.
  * **Function:** Global and tenant-level configurations.
  * **Features:** Toggle default Response Mode (Strict vs. Creative). Define Pinecone retrieval chunk limits to manage API costs. Toggle specific Knowledge Sources (Vector DB vs. Question Bank).

* **[ ] 🧠 Prompt Hardening & Rules (`/ai-workspace/admin/prompts`)**
  * **Access:** Super Admin.
  * **Function:** The "Brain Configuration" center.
  * **Features:** A UI-based code editor to modify the Base System Prompt. Dynamically map Subject-Specific JSON Schemas (e.g., Physics equations vs. Literature structure) to ensure the LLM strictly follows predefined curriculum outputs.

* **[ ] 🎭 Persona & Role Customization (`/ai-workspace/admin/personas`)**
  * **Access:** Super Admin, Institute Admin.
  * **Function:** Role-based behavioral mapping.
  * **Features:** Define instructions based on user roles. (e.g., If a Student logs in, the AI adopts a 'Socratic' tone and only gives hints. If a Teacher logs in, it provides direct, professional answers and generates exams). 

* **[ ] 📊 Telemetry & Audit Logs (`/ai-workspace/admin/audit`)**
  * **Access:** Super Admin, Institute Admin.
  * **Function:** 100% visibility into AI operations.
  * **Features:** View all historical prompts, generated outputs, API latencies, and token consumption. Manage RLHF (Reinforcement Learning from Human Feedback) via a "Hallucination Report" dashboard built from user Thumbs Down events.

---

## 🛠️ Phase 3: Educator's Content Factory (The Game Changer)
**Objective:** Automate and orchestrate the entire academic content lifecycle (Planning ➡️ Material ➡️ Assessment) natively within the platform.

* **[ ] Hybrid Question Engineering (Response Mode Architecture):**
  * **Deterministic Mode (Strict):** When set to 'Strict', the AI behaves conversationally but acts as a highly intelligent query engine. It strictly retrieves and formats **Verified Real Questions** from the system's proprietary Question Bank (Zero Hallucination).
  * **Generative Mode (Creative):** Leverages LLM cognition to synthesize entirely new, unique, and curriculum-aligned questions on demand.
* **[ ] Connected Contextual Workflow (Lecture to Assessment):**
  * Orchestrate a seamless pipeline: "Generate a comprehensive lecture sheet on Thermodynamics" ➡️ "Now, generate 10 MCQs based strictly on the nuances of this lecture."
* **[ ] Automated Presentation (PPTX) Synthesizer:**
  * Instantly convert generated lecture sheets or summaries into structured, bullet-driven, classroom-ready presentation slides.
* **[x] Dynamic Tool Studio & Zero-Token Workflows:**
  * Transition from static UI forms to fully dynamic, database-driven conversational Agents (`DynamicToolWidget.jsx`). Admin users can now define custom UI workflows via JSON schemas directly from the `AiToolManager`.
  * Implemented a full-screen **Dynamic Tool Studio** with real-time live preview, enabling rapid development of new zero-token widgets (e.g., Student Profiler, Routine Generator) without writing React code.
  * **[x] AI Widget Copilot & Codebase Scanner:** Integrated a real-time AI Copilot (`gemini-2.5-flash` model mapping) directly within the Studio. It scans backend APIs and auto-generates or updates the `schema.json` iteratively via user prompts, seamlessly updating the Live Widget Preview.
  * *Future Update Required:* Implement robust JSON Schema Validation in the editor to prevent syntax errors before rendering the preview, and optimize the layout padding/alignment for a cleaner split-pane view.
  * Introduce a **Split-Pane UI** (similar to Claude Artifacts). When the AI generates actionable content (e.g., Exam Paper, Lecture Sheet), it renders beautifully in a right-side **Special Previewer** panel, keeping the chat interface clean on the left.
  * Provide context-aware action buttons within the Artifact Previewer (e.g., "✏️ Open in Nexus Editor" for exams, or "📥 Export to PDF" for notes) to seamlessly handoff the content to the appropriate specialized editor.
* **[ ] Cognitive Marking Scheme Generator:**
  * Autonomously generate comprehensive rubrics and "Evaluation Directives" (Marking Schemes) alongside Creative/Subjective questions.

---

## 🎓 Phase 4: Student Success Co-Pilot & Guidance System
**Objective:** Deploy the AI as an empathetic, 24/7 personal academic mentor for students, driving personalized learning outcomes.

* **[ ] Personalized Academic Routing (Lesson Planning):**
  * Analyze syllabus coverage, upcoming exam dates, and historical performance to generate micro-targeted daily/weekly study routines.
* **[ ] Strategic Study Advisory:**
  * Provide tactical guidance on exam preparation, focus prioritization, and effective study methodologies tailored to the student's learning style.
* **[ ] Socratic Doubt Resolution Engine:**
  * Instead of spoon-feeding direct answers, the AI employs the Socratic method—providing strategic hints and guiding questions to help students arrive at the solution independently, fostering critical thinking.

---

## 💰 Phase 5: Smart Freemium & Token Economics
**Objective:** Monetize AI capabilities sustainably through transparent, real-time usage tracking and tiered access models.

* **[ ] Real-Time Token Telemetry:**
  * Implement sub-millisecond tracking of token consumption (Prompt + Completion) during every generation cycle.
  * Visualize consumption metrics dynamically in the user dashboard (`/billing/ai-usage`) via progress bars and usage charts.
* **[ ] Tiered Capability Access (RBAC-Driven AI):**
  * **Standard Tier:** Access limited to cost-effective models (e.g., Gemini 1.5 Flash).
  * **Premium/Pro Tier:** Unlock advanced multimodal capabilities and heavy-duty models (GPT-4o, Claude 3) via subscription or token recharge.

---

## 🧠 Phase 6: Autonomous Self-Learning & Predictive Analytics
**Objective:** Transform the platform from a static tool into an evolving ecosystem that learns from institutional patterns.

* **[ ] Continuous User-Specific Personalization & RLHF:**
  * **Individual Memory Vector:** Create a dedicated Pinecone namespace for each specific user/teacher (e.g., `user_memory_105`). The AI saves and retrieves specific phrasing choices and formatting habits from this personal space.
  * **Tenant-Isolated Feedback Loop:** Capture editorial corrections made by teachers within the Nexus Editor and feed them back into the Tenant’s private vector namespace. The AI implicitly learns the specific stylistic preferences and difficulty standards of that particular school without leaking data to other institutes.
  * **Dynamic Preference Injection:** Maintain a `user_ai_preferences` database table. Automatically inject these learned preferences into the Base System Prompt seamlessly during chat interactions.
* **[ ] Cognitive Knowledge Graphing:**
  * Synthesize data from OMR evaluations and ERP grading to construct an individualized "Cognitive Graph" detailing micro-competencies and blind spots for every student.
* **[ ] Auto-Prescriptive Remedial Worksheets:**
  * Autonomously generate and recommend "Targeted Remedial Worksheets" addressing specific conceptual weaknesses identified in a student's Knowledge Graph.

---

## 🔮 Phase 7: Advanced Research & Future Expansions (2026 Innovations)
**Objective:** Integrate cutting-edge EdTech AI capabilities inspired by global trends to provide a world-class workflow for educators and students.

* **[ ] "In-Workflow" AI Action Menu (Micro-Interactions):**
  * Introduce a "Floating AI Menu" directly inside the **Nexus Editor**.
  * When a teacher highlights text, offer quick actions: *Simplify Language*, *Increase Difficulty*, *Generate MCQs from this text*, and *Translate*.
* **[ ] Instant Differentiation Engine:**
  * Allow teachers to upload a reading passage and instantly generate 3 leveled versions (Basic, Standard, Advanced) along with matching questions to cater to diverse student abilities.
* **[ ] Administrative Copilot (Templates & Workflows):**
  * Expand beyond exams into administrative tasks. Provide templates for drafting *Parent Communication Emails*, *Weekly Lesson Plans*, and *Recommendation Letters*.
* **[ ] Interactive Presentation & Poll Generator:**
  * Enhance PPTX synthesis by generating interactive slides containing "Live Polls", "Word Clouds", and "Quick MCQs" for live classroom engagement.
* **[ ] AI Authenticity & Plagiarism Inspector:**
  * Build a workspace tool to analyze student-submitted subjective answers, highlighting text that is likely AI-generated versus human-written to maintain academic integrity.
* **[ ] "Socratic" Tutor Chatbot for Students:**
  * Deploy a specialized student-facing AI that refuses to provide direct answers, instead guiding students with hints and strategic questions to solve problems independently.

---

### 🚀 Immediate Execution Roadmap
To materialize this architecture, the engineering focus should pivot to one of the following foundational epics:

✅ **Epic 1 (Actionable Output Pipeline) [COMPLETED]:** Standardize JSON payloads from `CopilotService` and implement the **"Open in Nexus Editor"** dynamic button with automated drafting capabilities.
✅ **Epic 1.5 (Database Mapping Engine) [COMPLETED]:** Injected actual UUIDs into the Strict Mode RAG context to seamlessly map AI-selected content directly to true verified Question Bank records in Nexus Editor.
✅ **Epic 1.6 (Nexus Editor Stability & Sync) [COMPLETED]:** Fixed Chrome layout engine crashes (`column-span: all` inside contenteditable grids) and synchronized AI-generated structural metadata (Section headers, instructions, layout parameters) dynamically without data loss or infinite loops.

✅ **Epic 2 (Conversational Tool Calling & Dynamic Registry) [COMPLETED]:** 
  *   Upgraded the AI Workspace to an Agentic Workflow using Native LLM Function Calling.
  *   Implemented **Database-Driven Dynamic Tool Registry** (`AiToolConfig` / `AiPrompt` entities) to manage chat tools and system prompts from a Super Admin UI (`/ai-workspace/admin/tools`) without touching React code.
  *   Decoupled `AiWorkspace.jsx` by implementing `WidgetRegistry` pattern. First Tool to migrate: **Auto Exam Generator**.
  *   **UI Polish & UX Refinements:** Implemented an elegant, responsive `AiWorkspace` UI with a custom draggable sidebar resizer, `+` icon alignment, chat history soft-delete querying fixes, and polished transition animations.
👉 **Epic 3 (Strict Mode Knowledge Hub Integration):** Finalize the "Strict Mode" interactions. Connect the AI Copilot securely to the specific Question Bank, enforcing exact curriculum retrieval without hallucination.
👉 **Epic 4 (Command Center Foundation):** Bootstrap the `/ai-workspace/settings` route, establishing the backend architecture for dynamic Context Window sizing and Model switching.
👉 **Epic 5 (Billing & Telemetry):** Implement token usage tracking and visualize it in the frontend via a credit limit API.
