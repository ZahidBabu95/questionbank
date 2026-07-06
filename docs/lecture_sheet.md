# 📝 লেকচার শিট মডিউল বাস্তবায়ন ও অগ্রগতি বিবরণী (Lecture Sheet Implementation Notes)

এই ডকুমেন্টটি `/lectures/create` মডিউল বাস্তবায়ন করার প্রক্রিয়ায় আমরা যা যা করেছি এবং পরবর্তীতে যা যা করব তার একটি নিখুঁত ট্র্যাকিং নোট এবং আপডেট বুক হিসেবে কাজ করবে।

---

## 🔍 ১. প্রজেক্ট স্ট্রাকচার ও ডেটাবেস এনালাইসিস

আমরা প্রজেক্টের কোডবেস এবং ডেটাবেস গভীরভাবে বিশ্লেষণ করে নিম্নলিখিত বিষয়গুলো নিশ্চিত করেছি:

1. **ভেক্টর চাঙ্ক ম্যাপিং (`CurriculumDocumentChunk`):**
   * পাইনকোন/ভেক্টর ডেটা স্টোর করার জন্য আমাদের `curriculum_document_chunks` টেবিল এবং এর JPA এন্টিটি `CurriculumDocumentChunk.java` রয়েছে।
   * এই চাঙ্কগুলো `topic_id` (সিলেক্টেড টপিক) এবং `source_book_index_id` (বইয়ের সূচিপত্র বা চ্যাপ্টার) এর সাথে সরাসরি সম্পর্কিত।
   * এর জন্য `CurriculumDocumentChunkRepository` এ `findByMappedTopicId(UUID mappedTopicId)` মেথড অলরেডি বিদ্যমান, যা দিয়ে আমরা RAG এর জন্য সঠিক কনটেক্সট নিয়ে আসতে পারি।

2. **এআই কোশ্চেন সার্ভিস (`AIQuestionService`):**
   * এআই-এর মাধ্যমে র-টেক্সট কম্পাইল করার জন্য `AIQuestionService`-এর `generateRawCompletion(String prompt, MultipartFile file)` মেথডটি রয়েছে। এটি সরাসরি গুগল জেমিনি এপিআই-এর সাথে যুক্ত এবং টোকেন রোটেশন স্বয়ংক্রিয়ভাবে হ্যান্ডেল করে।

3. **অনুমোদিত প্রশ্নাবলী কোয়েরি (`QuestionRepository`):**
   * সিস্টেমে অনুমোদিত প্রশ্নগুলো খোঁজার জন্য `QuestionRepository` এ `searchApproved` এবং অন্যান্য রিলেশনাল মেথড রয়েছে।
   * আমরা টপিক বা চ্যাপ্টারের অধীনে থাকা অনুমোদিত প্রশ্নসমূহ সরাসরি ম্যাপিং করব।

4. **লেকচার ও প্রশ্ন সংযোগ (`LectureQuestion` & `LectureSection`):**
   * লেকচার শিটের ভেতর প্রতিটি চ্যাপ্টারের টপিকগুলো একেকটি `LectureSection` হিসেবে কাজ করবে।
   * প্রতিটি সেকশনের অধীনে নির্দিষ্ট প্রশ্ন সংযুক্ত করার জন্য `LectureQuestion` এন্টিটি রয়েছে যা `lecture_id` ও `section_id` এবং `question_id` দিয়ে একটি নিখুঁত ম্যাপিং তৈরি করে।

---

## 🛠️ ২. বর্তমান সেশনে আমাদের ইমপ্লিমেন্টেশন প্ল্যান ও অগ্রগতি

আমরা প্রথম ধাপ হিসেবে **Phase 1: Core Compiler & Interactive Architect** এর ব্যাকএন্ড মেকানিজম সফলভাবে সম্পন্ন করতে যাচ্ছি। এর আন্ডারে আমরা নিচের কাজগুলো করছি:

### ক) `LectureRequest.java` আপডেট (DTO লেভেল)
* ফ্রন্টএন্ড থেকে লেকচার সেভ বা এডিট করার সময় যাতে সেকশন-ভিত্তিক প্রশ্নগুলো (`questionIds`) এবং মূল লেকচারের আনক্যাটাগোরাইজড প্রশ্নগুলো সহজেই পাস করা যায়, সেজন্য `LectureRequest` ও `LectureSectionRequest` এ `questionIds` লিস্ট যুক্ত করছি।

### খ) RAG-Driven AI Lecture Generator এপিআই (`POST /api/v1/lectures/ai-generate-rag`)
* এই এপিআইটি `classSubjectId`, `chapterId`, `language` এবং `difficulty` ইনপুট নিবে।
* নির্বাচিত চ্যাপ্টারের অধীনে থাকা সমস্ত `Topic` ক্রমানুসারে খুঁজে বের করবে।
* প্রতিটি টপিকের জন্য `CurriculumDocumentChunkRepository` থেকে ভেক্টর ডেটা সংগ্রহ করবে।
* সংগৃহীত চাঙ্কগুলো আরএজি (RAG) কনটেক্সট হিসেবে জেমিনি এআই-তে পাঠিয়ে সহজ ও প্রফেশনাল নোট (Markdown) জেনারেট করবে।
* একই সাথে ওই টপিক বা চ্যাপ্টারের অধীনে থাকা অনুমোদিত (`APPROVED`) প্রশ্নসমূহ কোয়েরি করে একেকটি কমপ্লিট `LectureSection` ও `LectureQuestion` পে-লোড তৈরি করবে।

### গ) এক-ক্লিকে প্রশ্নপত্র জেনারেশন এপিআই (`POST /api/v1/exams/generate/create-from-lecture/{lectureId}`)
* `lectureId` গ্রহণ করে লেকচারের আন্ডারে থাকা সমস্ত অনুমোদিত `Question` খুঁজে বের করবে।
* একটি `DRAFT` এক্সাম (Exam) তৈরি করবে এবং সেই এক্সামের আন্ডারে `ExamQuestion` সংযোগ ঘটিয়ে দেবে।
* সবশেষে `examId` রিটার্ন করবে, যা দিয়ে সরাসরি ফ্রন্টএন্ডে ওয়ান-ক্লিকে Nexus V2 এডিটরে রিডাইরেক্ট করা যাবে।

---

## 📋 ৩. কি কি কাজ করা হচ্ছে (Done & In-Progress Checklist)

- [ ] **১. DTO ও রিকোয়েস্ট ম্যাপিং আপডেট:**
  - `LectureRequest.java` ও `LectureRequest.LectureSectionRequest` এ `questionIds` ফিল্ড যুক্ত করা। (Done)
- [ ] **২. QuestionRepository-তে হেল্পার কোয়েরি যুক্ত করা:**
  - `findByTopicIdAndStatusAndDeletedFalse` এবং `findByChapterIdAndStatusAndDeletedFalse` মেথড স্থাপন। (In Progress)
- [ ] **৩. LectureService-এ AI RAG লজিক ও এক্সাম ব্রিজ ইমপ্লিমেন্ট করা:**
  - `generateRAGLectureContent(...)` এবং `createExamFromLecture(...)` মেথড বাস্তবায়ন। (In Progress)
- [ ] **৪. LectureController ও ExamGenerationController এ এপিআই উন্মুক্ত করা:**
  - `/ai-generate-rag` এবং `/create-from-lecture/{lectureId}` এপিআই রেডি করা। (In Progress)

---

## 🔮 ৪. পরবর্তী ধাপসমূহ (Next Steps in Future Phases)

১. **ফ্রন্টএন্ড উইজার্ড ডিজাইন (`LectureBuilder.jsx`):**
   * Class ➡️ Subject ➡️ Chapter ড্রপডাউন সিলেক্টর।
   * "✨ জেনারেট লেকচার শিট" বাটনে ক্লিক করলে ব্যাকএন্ডের RAG এপিআই কল করা এবং ডাইনামিকালি এডিটর পেজে লোড করা।
২. **RichTextEditor ও স্প্লিট-স্ক্রিন এডিটর:**
   * Textarea সরিয়ে `RichTextEditor` স্থাপন।
   * বাম পাশে লেকচার সেকশন লিস্ট, ডান পাশে স্প্লিট-স্ক্রিন ক্যানভাস।
   * প্রতিটি সেকশনের নিচে সংযুক্ত প্রশ্নের কার্ড এবং তা ড্র্যাগ-অ্যান্ড-ড্রপ বা রি-অ্যারেঞ্জ করার সুবিধা।
৩. **প্রিন্ট লেআউট ও পিপিটিএক্স প্রেজেন্টেশন (Phase 2):**
   * A4 পেজ ব্রেক ও ওয়াটারমার্ক সহ প্রফেশনাল ডাউনলোড।
   * Reveal.js দিয়ে লেকচার শিট থেকে চমৎকার অ্যানিমেটেড স্লাইড শো প্রেজেন্টেশন জেনারেটর।
