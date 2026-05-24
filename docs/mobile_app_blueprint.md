# 📱 QuestionShaper Mobile App Blueprint & Roadmap

This document serves as the master planning blueprint, folder structure guide, and AI Prompt template for the React Native (Expo + TypeScript) mobile application of the **QuestionShaper** platform. 

---

## 🎯 Product Vision
To build a high-performance, premium, and multi-language (with native Bengali and English support, architected for global expansion) cross-platform (Android/iOS) mobile companion application for students and educators. The app will fetch verified questions, CMS landing content, active billing packages, dynamic chat sessions, and academic hierarchy dynamically from the Spring Boot backend (`https://qb.learningshaper.com/api`).

The core mobile experience focuses on three pillars:
1. **Dynamic Landing & Registration:** Porting the landing page and package listings dynamically from CMS services, enabling easy self-service student/educator signup.
2. **Personalized AI Workspace:** Porting the multi-session AI Chat Copilot with mode selectors (Strict vs Creative), academic subject context filtering, tone adjustments, and token telemetry tracking.
3. **Interactive Quiz Practice:** Providing a premium practice canvas for MCQ/CQ questions, complete with explanations, bookmarks, and detailed scorecard analytics.

---

## 🛠️ Technology Stack
* **Framework:** React Native via **Expo SDK 54** (compatible with Expo Go Client 54.0.8, using TypeScript)
* **Routing/Navigation:** React Navigation Stack / Bottom Tabs / Drawer Layout
  * *Bottom Tabs:* Landing Page, AI Workspace, Quiz Practice, User Profile
  * *Drawer Navigation:* AI Chat session list (accessible within the AI Workspace tab)
* **HTTP Client:** Axios (with dynamic JWT token authorization interceptors)
* **Secure Storage:** `expo-secure-store` (for JWT credentials) & `@react-native-async-storage/async-storage` (for offline caching)
* **Styling:** **NativeWind** (Tailwind CSS matching web design tokens) or Vanilla StyleSheet (Design Tokens in `theme.ts`)
* **Rich Text/Markdown Render:** `react-native-markdown-display` (for rendering LaTeX math formulas and Markdown outputs from the AI Workspace)
* **Internationalization (i18n):** `i18next` & `react-react-i18next` + `expo-localization` (detects device system language, stores language preferences, and handles translation dictionary lookup for Bengali & English, ready for future languages)

---

## 📂 Proposed Folder Structure (`mobile/`)

```text
mobile/
├── src/
│   ├── api/             # API services and configurations
│   │   ├── apiClient.ts      # Reusable Axios instance with JWT interceptors
│   │   ├── authService.ts    # Handles login, registration & credentials persistence
│   │   ├── academicService.ts# Fetches Classes, Subjects, and Chapters
│   │   ├── cmsService.ts      # Fetches public Landing sections & active packages
│   │   ├── aiService.ts       # Fetches AI chat sessions, messages & asks Copilot
│   │   └── questionService.ts # Fetches exam/quiz questions dynamically
│   │
│   ├── components/      # Reusable UI elements
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── SkeletonLoader.tsx
│   │   │   └── Badge.tsx
│   │   ├── chat/
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── TypingIndicator.tsx
│   │   │   ├── ToneSelector.tsx
│   │   │   └── ModeSelector.tsx
│   │   └── quiz/
│   │       ├── OptionCard.tsx
│   │       └── ScorecardModal.tsx
│   │
│   ├── context/         # React Context Providers for global state
│   │   ├── AuthContext.tsx    # Manages login, logout, registration, and SecureStore
│   │   └── BrandingContext.tsx# Dynamic branding and custom primary colors
│   │
│   ├── locales/         # Dictionary translation files for i18n
│   │   ├── en.json         # English keys (buttons, labels, headings)
│   │   └── bn.json         # Bengali keys
│   │
│   ├── screens/         # Application Views/Screens
│   │   ├── LandingScreen.tsx     # CMS-driven dynamic landing page & Pricing
│   │   ├── LoginScreen.tsx       # Localized Login UI
│   │   ├── RegisterScreen.tsx    # Multi-role Signup (Student/Teacher)
│   │   ├── AiWorkspaceScreen.tsx # Conversations, subject filters & AI Chat UI
│   │   ├── SubjectSelection.tsx  # Dynamic list of subjects & chapters
│   │   └── QuizScreen.tsx        # Premium interactive MCQ/CQ practice canvas
│   │
│   ├── theme/           # UI Tokens & Styling Config
│   │   └── theme.ts          # Color palette (HSL Indigo), typography, spacing
│   │
│   └── utils/           # Helper utilities
│       ├── bngNumbers.ts     # Bengali numeral converter utility
│       ├── i18n.ts           # i18next configuration setup
│       └── markdownParser.ts # Formats and sanitizes Markdown/LaTeX text
│
├── App.tsx              # Entry point. Wraps Providers and controls routing
├── app.json             # Expo project configuration
├── package.json         # Dependencies & script run commands
└── tsconfig.json        # TypeScript configuration settings
```

---

## 📡 Backend API Endpoints Reference

Use these endpoints to connect the mobile app to the Spring Boot backend:

### 1. Dynamic Landing Page & Billing (`PublicLandingController` / `BillingPackageController`)
* **Landing Sections:** `GET /v1/public/landing` (Fetches HERO_SECTION, FEATURES_SECTION, STATS_SECTION, CTA_SECTION values)
* **Active Packages:** `GET /v1/public/packages` (Returns lists of active pricing packages, student/teacher limits, and feature flags)

### 2. Authentication (`AuthController`)
* **Login:** `POST /v1/auth/login`
  * *Request Body:* `{ email, password }`
  * *Response:* `{ success: true, data: "JWT_ACCESS_TOKEN", user: { id, name, email, roles, instituteId } }`
* **Registration:** `POST /v1/auth/signup`
  * *Request Body:* `{ name, email, password, phone, instituteId, roles: ["STUDENT"] }`
  * *Response:* `{ success: true, message: "User registered successfully", data: { id, name, email } }`

### 3. AI Workspace & Telemetry (`AiWorkspaceController` / `AiUsageController`)
* **Workspace Config:** `GET /v1/ai/workspace/config` (Fetches active system configurations, default mode, default tone, and custom tones list)
* **Chat Sessions:** `GET /v1/ai/workspace/sessions` (Returns active chat sessions list for the logged-in user)
* **Create Session:** `POST /v1/ai/workspace/sessions`
  * *Request Body:* `{ title: "New Chat" }`
* **Delete Session:** `DELETE /v1/ai/workspace/sessions/{id}` (Soft deletes a chat history session)
* **Session Messages:** `GET /v1/ai/workspace/sessions/{sessionId}/messages` (Retrieves full chat history)
* **Ask Copilot:** `POST /v1/ai/workspace/sessions/{sessionId}/ask`
  * *Request Body:* `{ query: "Prompt text", filter: "Class - Subject name", filterId: classSubjectUUID, mode: "strict"|"creative", tone: "professional"|"friendly"|"socratic", toneInstruction: "custom instruction payload" }`
  * *Response:* `{ success: true, data: { userMessage: {...}, aiMessage: { content: "text answer", actionableData: "parsed JSON string" } } }`
* **AI Credit Telemetry:** `GET /v1/ai/usage/my-usage` (Fetches total active tokens used against monthly limits)

### 4. Academic Syllabus & Metadata (`AcademicController`)
* **Academic Hierarchy:** `GET /v1/academic/hierarchy` (Fetches full levels, streams, classes, and global subjects mapping)
* **Chapters by Subject:** `GET /v1/academic/class-subjects/{classSubjectId}/chapters`
* **Topics by Chapter:** `GET /v1/academic/chapters/{chapterId}/topics`

### 5. Question Bank & Quiz (`QuestionController`)
* **Paginated Questions:** `GET /v1/questions/list-paginated`
  * *Parameters:* `classSubjectId`, `chapterId`, `topicId`, `type` (`MCQ` or `CQ`), `page`, `size`
* **MCQ Question Options:** `GET /v1/questions/{id}/options`

---

## 🔐 API Sharing & Integration Guidelines
1. **JWT Authorization:** Replicate Axios interceptors from `frontend/src/utils/axios.js` to ensure the dynamic `Bearer` token header is injected automatically into all request headers. Save tokens securely in `expo-secure-store`.
2. **Actionable Data Handlers:** The `ask` API responds with an optional `actionableData` JSON block. If the AI generates assessment templates, the mobile app should capture the JSON payload, parse it, and render a dedicated action card (e.g., *"Start Practice Quiz"* button) rather than displaying raw code.
3. **Connectivity Fail-safes:** Use React Native NetInfo to verify connection states. Gracefully switch to offline-cached subjects and bookmarked question sets saved in AsyncStorage when internet access is unavailable.

---

## 🌐 Internationalization (i18n) & Global Scaling Architecture
To support seamless global expansion and multi-language support (starting with Bengali & English, and extensible to Arabic, Spanish, etc.), the application must adhere to the following rules:

### 1. Mobile App i18n
* **Zero Hardcoded Text:** All static labels, buttons, messages, and titles must use `t('translation_key')` hooks from `react-i18next`.
* **Dictionary Files:** Store dictionary JSON translations in `src/locales/en.json` and `src/locales/bn.json`.
* **Dynamic Language Switcher:** Detect the device's system language on first boot using `expo-localization` and save it to AsyncStorage. Allow users to switch languages manually inside their Profile settings.
* **Numeral Formatting:** Create a utility `bngNumbers.ts` to switch numbers dynamically between standard Western digits (1, 2, 3) and Bengali digits (১, ২, ৩) based on the active language context.

### 2. Web App i18n (Aligning Web with Mobile)
* **Standard Integration:** Install `i18next` and `react-i18next` inside `frontend/` to structure the web layouts.
* **API Language Header:** Configure Axios client in `frontend/src/utils/axios.js` and `mobile/src/api/apiClient.ts` to pass an `Accept-Language` header (e.g., `bn` or `en`) during API calls to allow the Spring Boot backend to localize API responses (such as error messages or dynamic notifications).

---

## 🚀 Execution Roadmap (Step-by-Step)

### Phase 1: Setup, Landing & Auth (Immediate Next Step)
* Initialize Expo TypeScript template and integrate NativeWind styling.
* Build the dynamic, scrollable `LandingScreen.tsx` fetching data from `cmsService` to render custom Hero banners, Features grid, and Package pricing cards.
* Build standard authorization screens: `LoginScreen.tsx` and `RegisterScreen.tsx` with role selection.

### Phase 2: Navigation & Context Bindings
* Setup React Navigation stack: Bottom tab navigator for primary views, with AI Workspace wrapping a side Drawer for session history navigation.
* Implement `BrandingContext.tsx` to pull primary colors from settings and apply HSL styling globally across screens.

### Phase 3: Conversational AI Workspace Screen
* Build the `AiWorkspaceScreen.tsx` interface:
  * Top bar containing Subject dropdown selector and AI usage progress bar (Credits).
  * Chat scroll view parsing markdown with mathematical LaTeX rendering.
  * Message input panel with quick buttons for Mode toggle (Strict vs Creative) and Tone selectors.
  * Integration with the session list drawer to load, delete, and switch between previous chat logs.

### Phase 4: Syllabus Explorer & Premium Practice Canvas
* Implement `SubjectSelection.tsx` displaying the academic subject-chapter accordion tree.
* Implement `QuizScreen.tsx` containing:
  * Linear progress tracking and dynamic timer.
  * Beautiful option pressable cards with touch animations.
  * "Show Explanation" drawers translating markdown and showing correct answers.
  * Post-quiz Scorecard overlay displaying performance stats and a retry selector.

---

## 🤖 AI Prompt for Antigravity 2.0 (Copy & Paste to Start)

*Copy the text below to instruct any Antigravity 2.0 session to execute these tasks seamlessly:*

```markdown
Role: Senior React Native (Expo) & TypeScript Specialist
Task: Implement Mobile Landing Page, SignUp, and AI Chat Workspace Screen.

Context:
We are developing the "QuestionShaper Mobile App" using Expo + TypeScript. The app connects to our live Spring Boot backend at "https://qb.learningshaper.com/api".

API Reference Details:
1. Dynamic CMS Landing:
   - Landing Content: `GET /v1/public/landing`
   - Active Packages: `GET /v1/public/packages`
2. Authentication:
   - Login: `POST /v1/auth/login` (Body: `{ email, password }`)
   - Signup: `POST /v1/auth/signup` (Body: `{ name, email, password, phone, instituteId, roles }`)
3. AI Workspace:
   - Config: `GET /v1/ai/workspace/config`
   - Sessions: `GET /v1/ai/workspace/sessions`
   - Create Session: `POST /v1/ai/workspace/sessions` (Body: `{ title }`)
   - Ask Copilot: `POST /v1/ai/workspace/sessions/{sessionId}/ask` (Body: `{ query, filter, filterId, mode, tone, toneInstruction }`)
   - AI Usage: `GET /v1/ai/usage/my-usage`

Goals & Files to Modify/Create:
1. Initialize the services: `src/api/cmsService.ts` and `src/api/aiService.ts`.
2. Build the scrollable `LandingScreen.tsx` displaying dynamic Hero, Feature, and Subscription pricing cards.
3. Build the `RegisterScreen.tsx` validating name, email, password, and optional phone/institute IDs.
4. Build the premium `AiWorkspaceScreen.tsx` conversational chat view featuring Subject filtration, Mode selection (Strict/Creative), Tone sliders, and Token tracking.

Please execute the following steps in sequence. Do NOT jump to the next step until the current step is completed and verified:

### Step 1: Research & Setup (Planning Mode)
1. Scan the backend controllers `PublicLandingController.java`, `AuthController.java`, and `AiWorkspaceController.java` to verify response models.
2. Read the existing web services `cmsService.js` and pages `LandingPage.jsx`, `AiWorkspace.jsx` for feature reference.
3. Create `implementation_plan.md` mapping the Expo navigation flow and TypeScript interfaces. Set `request_feedback = true` and wait for my approval.

### Step 2: Service Layer & Auth Integration (Once approved)
1. Add `cmsService.ts` and `aiService.ts` mapping.
2. Update `authService.ts` to include register registration handler.
3. Define strict interfaces for `CmsSection`, `BillingPackage`, `AiChatSession`, `AiChatMessage` and `AiUsage`.

### Step 3: Landing Screen & Registration
1. Create `LandingScreen.tsx` with dynamic sections mapping and marquee component for trusted clients.
2. Create `RegisterScreen.tsx` with custom Tailwind styles, validations, and loading states.
3. Integrate Landing, Login, and Signup into the Auth Navigation flow.

### Step 4: Conversations & AI Workspace Chat View
1. Create `AiWorkspaceScreen.tsx` including:
   - A scrollable message bubble chain rendering Markdown.
   - Quick settings drawer to toggle Mode (Strict/Creative) and Tones (Socratic/Friendly/Professional).
   - Dynamic top bar containing Subject selection dropdown.
   - Progress bar depicting current AI credit usage.
2. Ensure proper safe-area rendering and input keyboard-avoiding behaviors.

### Step 5: Type Safety Verification & Compile
1. Run `npx tsc --noEmit` to verify type safety.
2. Provide physical testing setup instructions.

Let's start by analyzing the current workspace and preparing the implementation plan. What files do you need me to open first?
```
