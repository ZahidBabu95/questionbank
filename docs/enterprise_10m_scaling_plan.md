# 🚀 Enterprise Scaling & Database Partitioning Strategy (10M+ Questions)

> **প্রজেক্ট:** QuestionShaper  
> **তারিখ:** ১০ আগস্ট, ২০২৬  
> **লক্ষ্য:** ১+ কোটি (10M+) প্রশ্ন এবং হাজার হাজার বইয়ের ডাটাবেজে ০% ল্যাগ ও ফিউচার-প্রুফ পারফর্মেন্স নিশ্চিত করা।

---

## 🎯 ১. আলোচনার সিদ্ধান্ত ও সারসংক্ষেপ (Executive Summary)

১+ কোটি প্রশ্ন এবং হাজার হাজার বই ডিজিটাইজেশনের স্কেলে কাজ করতে গেলে ব্যবহারকারী সাধারণত একসাথে পুরো কোটি ডাটা অ্যাকসেস করেন না। একজন ব্যবহারকারী নির্দিষ্ট ১টি থেকে ৫-১০টি বিষয়ে কাজ করেন।

সিস্টেমকে এই ১ কোটি প্রশ্নের স্কেলে প্রস্তুত রাখতে আমরা ২টি প্রধান টেকনিক্যাল সিদ্ধান্তে পৌঁছেছি:

1. **ডাটাবেজ পার্টিশন-রেডি করা (Database Subject Partitioning):**
   - ১ কোটি ডাটা জমে যাওয়ার পর ব্যাক-অ্যাক্টিভভাবে `ALTER TABLE` চালানো হলে টেবিল লক হওয়া, মাইগ্রেশন সময় দীর্ঘ হওয়া এবং সার্ভার ডাউনটাইমের মারাত্মক ঝুঁকি থাকে।
   - তাই ডাটাবেজ ছোট থাকতেই (এখনই) `questions` টেবিলকে **Composite Key `(id, class_subject_id)`** দিয়ে **64-HASH Subject Partitioning**-এ রূপান্তরিত করা।
   - এর ফলে ডাটাবেজে ভবিষ্যতে ১ কোটি প্রশ্ন এলেও MySQL স্বয়ংক্রিয়ভাবে বিষয় অনুযায়ী ৬৪টি আলাদা সাব-টেবিলে প্রশ্ন রাউট করবে, যার ফলে কোয়েরি রেসপন্স টাইম সবসময় **১-২ মিলি-সেকেন্ডে** থাকবে।

2. **ফ্রন্টএন্ড রেন্ডারিং ভার্চুয়ালাইজেশন (Frontend Virtualization):**
   - বড় প্রশ্ন তালিকায় (LaTeX Math, HTML Formula, Option ও Image সহ) একসাথে ১০০টি প্রশ্ন রেন্ডার হলে ব্রাউজার মেমরি স্লো হয়।
   - `@tanstack/react-virtual` ব্যবহারের মাধ্যমে স্ক্রিনে কেবল দৃশ্যমান ৫-৮টি প্রশ্ন রেন্ডার হবে, ফলে স্ক্রোলিং হবে ১০০% স্মুথ (০ FPS Drop)।

---

## 🏗️ ২. টেকনিক্যাল পরিবর্তনসমূহ (Architectural Plan)

### ব্যাকএন্ড (Spring Boot JPA & MySQL)
1. **Composite Primary Key Creation:**
   - `QuestionId.java` (`Serializable` composite key class mapping `id` and `classSubjectId`).
   - `Question.java` এনটিটিতে `@IdClass(QuestionId.class)` বা `@EmbeddedId` সক্রিয় করা।
2. **Subject Partitioning Schema Execution:**
   - `backend/src/main/resources/subject_partitioning_schema.sql` স্ক্রিপ্ট কার্যকর করা:
     ```sql
     ALTER TABLE questions DROP PRIMARY KEY, ADD PRIMARY KEY (id, class_subject_id);
     ALTER TABLE questions PARTITION BY HASH(class_subject_id) PARTITIONS 64;
     ```
3. **Cursor-Based Pagination API:**
   - `QuestionRepository` ও `QuestionServiceImpl`-এ `OFFSET` কোয়েরি বাদ দিয়ে ID/Keyset কার্সর পেজিনেশন চালুকরণ।

### ফ্রন্টএন্ড (Vite + React)
1. **List Virtualization:**
   - [QuestionList.jsx](file:///g:/Dev-Pro/Question%20Shaper/frontend/src/pages/admin/QuestionBank/QuestionList.jsx) এবং [ProofreadingWorkspace.jsx](file:///g:/Dev-Pro/Question%20Shaper/frontend/src/pages/admin/KnowledgeHub/ProofreadingWorkspace.jsx)-এ `@tanstack/react-virtual` ইমপ্লিমেন্ট করা।
2. **WebP Image Pipeline & Memory Management:**
   - কন্টেন্ট ইমেজেস Lazy Loading ও Memory Cleanups নিশ্চিত করা।

---

## 🛠️ ৩. বাস্তবায়ন রোডম্যাপ (Phased Execution Workflow)

- **Phase 1:** গিট কমিট, পুশ, নতুন ফিচার ব্রাঞ্চ (`feature/enterprise-partition-and-virtualization`) তৈরি ও ডাটাবেজ ব্যাকআপ গ্রহণ।
- **Phase 2:** ব্যাকএন্ড `Question.java` এনটিটি প্রাইমারি কি কম্পোজিট রিফ্যাক্টরিং ও DB Partitioning SQL রান।
- **Phase 3:** ফ্রন্টএন্ড লিস্ট ভার্চুয়ালাইজেশন প্যাকেজ ইনস্টল ও `QuestionList.jsx` ইন্টিগ্রেশন।
- **Phase 4:** ব্যাকএন্ড ও ফ্রন্টএন্ড বিল্ড ভ্যালিডেশন (`production/ROOT.war` ও Vite `npm run build`) এবং এন্ড-টু-এন্ড টেস্ট।
