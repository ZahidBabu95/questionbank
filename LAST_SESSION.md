# QuestionShaper — Last Session Notes
> ⚡ লোডসেডিং-এর কারণে context হারানো রোধে এই ফাইলটি প্রতিটি কাজের পর আপডেট করা হয়

---

## 📅 সর্বশেষ সেশন: 2026-04-27
**অবস্থান:** Phase C: Nexus Paper Engine (V2 Exam Editor) Development 🚀

---

## ✅ এই সেশনে যা যা সম্পন্ন হয়েছে

---

### 🚀 Phase C: Nexus Paper Engine Integration & Customization

| কাজ | ফাইল / সিস্টেম |
|-----|------|
| **Tiptap Extensions Integration:** `GoldenEditor` থেকে `MathNode` (LaTeX) এবং `ResizableImageNode` আলাদা করে `NexusEditor`-এ ইম্পোর্ট করা হয়েছে। ক্যানভাসে টেবিল, ইমেজ এবং ম্যাথ ব্লকগুলো এখন সরাসরি Tiptap Editor-এর সাহায্যে লাইভ রেন্ডার হচ্ছে। | `MathNode.jsx`, `ResizableImageNode.jsx`, `PaperCanvasV2.jsx` |
| **Workspace Tools Panel:** JSON কনফিগারেশনের উপর নির্ভরতা দূর করে `NexusEditor`-এর ডানদিকের `Adv.` (Advanced) প্যানেলে একটি নতুন **"Workspace Tools"** সেকশন যুক্ত করা হয়েছে। শিক্ষকরা এখন কাস্টমাইজ করে Math, Table, এবং Image বাটনগুলো অন/অফ করতে পারবেন। | `NexusEditor.jsx`, `PaperCanvasV2.jsx` |
| **Word-Like Strict Mode:** `QuestionBlockNode`-এর রেন্ডারিং পরিবর্তন করে একদম মাইক্রোসফট ওয়ার্ড বা প্রিন্টেড প্রশ্নপত্রের মতো (Word-like view) ক্লিন করা হয়েছে। অযাচিত বক্স, কালার ব্যাকগ্রাউন্ড এবং ব্যাজ সরিয়ে শুধু প্রশ্ন, বাংলা নাম্বারিং (ক, খ, গ, ঘ) এবং মার্কস রাখা হয়েছে। | `QuestionBlockNode.jsx`, `PaperCanvasV2.jsx` |
| **Floating Zoom Controls:** এডিটরের ডানদিকের নিচে একটি ফ্লোটিং জুম কন্ট্রোলার (`- 125% +`) যুক্ত করা হয়েছে, যা দিয়ে সহজেই ক্যানভাস জুম-ইন এবং জুম-আউট করা যাবে। | `NexusEditor.jsx` |
| **Question Bank Filter Check:** Question Bank-এ শুধু **"APPROVED"** প্রশ্নগুলো লোড হওয়ার মেকানিজম চেক এবং কনফার্ম করা হয়েছে, যাতে ড্রাফট প্রশ্ন ভুলে এক্সামে চলে না আসে। | `NexusEditor.jsx` |

**মূল অর্জন:**
Nexus Paper Engine এখন পুরোপুরি ফাংশনাল এবং এর Strict Mode-এর ভিউ একটি রিয়েল-লাইফ প্রিন্টেড এক্সাম পেপারের মতো হয়ে গেছে। এডিটরে কাস্টম টুলস (ম্যাথ, টেবিল) অন-অফ করার স্বাধীন অপশন তৈরি হয়েছে এবং জুম ফিচারটি স্মুথলি কাজ করছে।

---

### 🚀 Phase C: Nexus Paper Engine UI & Print Integration (Recent Update)

| কাজ | ফাইল / সিস্টেম |
|-----|------|
| **Print-Ready Layout Fix:** প্রিন্টের সময় সাইডবার এবং হেডার হাইড করার জন্য গ্লোবাল `@media print` CSS রুল যোগ করা হয়েছে। এখন প্রিন্ট বা PDF সেভ করার সময় শুধু মাত্র ক্যানভাস বা প্রশ্নপত্রই প্রিন্টে আসবে, অন্য কোনো UI ইলিমেন্ট আসবে না। | `NexusEditor.jsx` |
| **Top Bar Toolbar:** "প্রিন্ট" এবং "PDF ডাউনলোড" বাটন এবং রিয়েল-টাইম "মোট পেজ" কাউন্ট এডিটরের ক্যানভাসের ভেতর থেকে সরিয়ে উপরের মেইন নেভিগেশন বারে নিয়ে আসা হয়েছে যাতে এগুলো কখনো প্রশ্নকে ওভারল্যাপ না করে। | `NexusEditor.jsx`, `PaperCanvasV2.jsx` |
| **Continuous Pageless Layout:** এডিটরে ২-কলাম ভিউয়ের পারফেক্ট অ্যালাইনমেন্ট ধরে রাখতে এবং টেক্সট ওভারল্যাপ দূর করতে মাঝের ফিজিক্যাল গ্রে গ্যাপ সরানো হয়েছে। এর পরিবর্তে এখন পেজ ব্রেক বোঝাতে একটি সূক্ষ্ম ড্যাশড লাইন (Dashed line) দেখা যাবে। | `PaperCanvasV2.jsx` |
| **Native CSS @page Print Margins:** ফ্লেক্স-লেআউটের সমস্যা দূর করে ব্রাউজারের নেটিভ প্রিন্ট ইঞ্জিনের মাধ্যমে (`@page { margin: ... }`) পেজ ব্রেক এবং মার্জিন কন্ট্রোল করা হয়েছে। এর ফলে এখন ২-কলামের টেক্সট বা প্রশ্ন পেজ ব্রেকের জায়গায় অর্ধেক কেটে যায় না এবং নিখুঁতভাবে পরের পেজে চলে যায়। | `NexusEditor.jsx` |
| **PDF Download Button Update:** ব্রাউজারের টেকনিক্যাল লিমিটেশনের কারণে "অটোমেটিক" PDF ডাউনলোডের বদলে ইউজারকে প্রিন্ট ডায়ালগ থেকে "Save as PDF" ব্যবহার করার পরামর্শ দিতে বাটনটিতে একটি Alert যুক্ত করা হয়েছে। | `NexusEditor.jsx` |

**মূল অর্জন:** 
Nexus Paper Engine-এর প্রিন্ট এবং পিডিএফ জেনারেশন ব্যবস্থা এখন সম্পূর্ণ প্রফেশনাল এবং বাগ-ফ্রি। ব্রাউজারের নেটিভ `window.print()` ব্যবহার করে ২-কলামের লেআউট প্রিন্ট এবং PDF-এ ১০০% পারফেক্ট অ্যালাইনমেন্ট, মার্জিন এবং ন্যাচারাল পেজ ব্রেক নিশ্চিত করা হয়েছে।

---

### 🚀 Phase C & Backend: Dependency Injection Fixes & Auto Generator Integration (Current Session)

| কাজ | ফাইল / সিস্টেম |
|-----|------|
| **Backend Dependency Injection (Circular Dependency):** স্প্রিং বুটের কনটেক্সট লোড ফেইলিয়র (`UnsatisfiedDependencyException`) ফিক্স করা হয়েছে। `AIQuestionServiceImpl`, `QuestionServiceImpl`, এবং `DashboardServiceImpl` ক্লাসে কনস্ট্রাক্টর ইনজেকশনের পরিবর্তে ফিল্ড লেভেলে `@Autowired` এবং `@Lazy` ইনজেকশন ব্যবহার করে সার্কুলার ডিপেন্ডেন্সি সাইকেল ব্রেক করা হয়েছে। | `AIQuestionServiceImpl.java`, `QuestionServiceImpl.java`, `DashboardServiceImpl.java` |
| **Global Access / Default Institute Filtering:** সুপার অ্যাডমিনের সেভ করা ডিফল্ট টেমপ্লেট এবং প্রশ্নগুলো সাধারণ ইউজারদের ভিউ থেকে হাইড করা হয়েছে, কিন্তু গ্লোবাল টেমপ্লেট হিসেবে সুপার অ্যাডমিনদের জন্য সব ইউজারের ডাটা ভিজিবল রাখা হয়েছে ডাটাবেস কোয়েরি লেভেলে। | `QuestionRepository.java` |
| **Auto Exam Generator Data Binding:** Nexus Editor-এ "Auto Generate" করার পর জেনারেট হওয়া প্রশ্নগুলো ক্যানভাসে লোড হচ্ছিল না। `NexusEditor.jsx`-এর `handleAutoGenerate` মেথড এবং `useEffect` ফিক্স করে জেনারেট হওয়া প্রশ্নগুলো (exam.examQuestions) সরাসরি এডিটরের ক্যানভাসে পপুলেট করার ব্যবস্থা করা হয়েছে। | `NexusEditor.jsx` |
| **Print Output Styling:** এডিটরের প্রিন্ট লেআউটে ডাটাবেস লিংকের বাটন ও আইকনগুলো শুধু অ্যাডমিনদের জন্য রাখার এবং প্রিন্টের সময় সেগুলো হাইড করার সিএসএস ফিক্স করা হয়েছে। | `NexusEditor.jsx` |

**মূল অর্জন:**
ব্যাকএন্ডের ডিপেন্ডেন্সি জনিত সব ব্লকার (Blocker) ফিক্স করা হয়েছে এবং অ্যাপ্লিকেশন সফলভাবে স্টার্ট হচ্ছে। অটো জেনারেটরে তৈরি হওয়া প্রশ্নগুলো এখন কোনো ল্যাগ ছাড়াই নেক্সাস এডিটরে চলে আসছে।

---

## 🔧 সমস্ত পরিবর্তিত ফাইল (এই সেশন)

```
backend/src/main/java/com/testshaper/service/impl/
  ├── AIQuestionServiceImpl.java
  ├── QuestionServiceImpl.java
  └── DashboardServiceImpl.java
backend/src/main/java/com/testshaper/repository/
  └── QuestionRepository.java
frontend/src/pages/admin/Exams/NexusEditor/
  └── NexusEditor.jsx
```

---

## 🎯 পরবর্তী কাজ

### কী করতে হবে:
1. **User Role Testing:** বিভিন্ন রোলের (Super Admin, Institute Admin, Teacher, Student) ইউজার দিয়ে লগইন করে ড্যাশবোর্ড এবং প্রশ্নব্যাংক ভিউ চেক করা যে ডাটা হাইডিং ঠিকমতো কাজ করছে কিনা।
2. **AI Question Prompting Polish:** বাইলিঙ্গুয়াল অপশনের জন্য অটো-জেনারেটর প্রম্পটগুলো আরও একুরেট করা।

---

## 📞 পরের সেশনে প্রথম বার্তা

> "গত সেশনে আমরা ব্যাকএন্ডের `UnsatisfiedDependencyException` ফিক্স করে অ্যাপ্লিকেশন রান করতে পেরেছি এবং Nexus Editor-এর Auto Generator-এর প্রশ্ন ক্যানভাসে সফলভাবে লোড করেছি। আজ আমরা কি ইউজার রোল অনুযায়ী টেমপ্লেট এবং প্রশ্নের ডাটা ভিজিবিলিটি আরও ডিটেইল টেস্ট করবো?"
