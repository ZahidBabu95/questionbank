# Nexus Editor (Nexus Paper Engine) Analysis & Roadmap

> **Date:** 2026-04-28
> **Focus:** Enterprise Grade Exam Editor Architecture

## 🎯 1. Drag and Drop মেকানিজমের অ্যানালাইসিস
Nexus Editor-এ প্রশ্ন ড্র্যাগ করে ক্যানভাসে বসানোর পদ্ধতিটি অত্যন্ত আধুনিক এবং Tiptap-এর নেটিভ API ব্যবহার করে করা হয়েছে।

**কিভাবে কাজ করছে:**
1. **Drag Start (`NexusEditor.jsx`):** আপনি যখন বাম দিকের প্যানেল থেকে কোনো প্রশ্ন ড্র্যাগ করেন, `handleDragStart` ফাংশনটি ট্রিগার হয়। এটি প্রশ্নটিকে একটি সাধারণ টেক্সট হিসেবে না পাঠিয়ে, Tiptap-এর জন্য একটি সুনির্দিষ্ট JSON Payload (`application/json`) হিসেবে প্যাক করে। এর মধ্যে `type: 'questionBlock'` এবং প্রশ্নের যাবতীয় ডেটা (marks, type, options, numberingStyle) ঢুকিয়ে দেওয়া হয়।
2. **Drop Handling (`PaperCanvasV2.jsx`):** ক্যানভাসের উপর ড্রপ করার সাথে সাথে Tiptap-এর `handleDrop` ইভেন্ট লিসেনার সেটি রিসিভ করে। এটি `view.posAtCoords` ব্যবহার করে মাউসের ঠিক ঐ মুহূর্তের কো-অর্ডিনেট (X, Y পজিশন) বের করে এবং `schema.nodes.questionBlock.create(data.attrs)` কল করে একটি সম্পূর্ণ নতুন "Atomic Node" তৈরি করে ঠিক ওই পজিশনে বসিয়ে দেয়।

**Enterprise লেভেলের সুবিধা:** এই পদ্ধতির কারণে ড্র্যাগ করা প্রশ্নগুলো সাধারণ টেক্সট হিসেবে ক্যানভাসে না বসে, একটি নির্দিষ্ট স্ট্রাকচার বা ব্লক হিসেবে বসে। ফলে ইউজার ভুলে কোনো প্রশ্নের ফরম্যাট ভেঙে ফেলতে পারে না।

---

## 🚀 2. Nexus Editor-এর সম্পূর্ণ অ্যানালাইসিস (What has been done)
আপনারা ইতিমধ্যে Nexus Editor-কে একটি সাধারণ টেক্সট এডিটর থেকে **"Nexus Paper Engine"**-এ রূপান্তর করেছেন। 

**যে অসাধারণ কাজগুলো ইতিমধ্যে করা হয়েছে:**
1. **Headless Tiptap & Atomic Blocks:** সাধারণ HTML-এর বদলে `QuestionBlockNode`-এর মাধ্যমে প্রতিটি প্রশ্নকে একটি React Component (NodeViewRenderer) হিসেবে রেন্ডার করা হয়েছে। "Strict Analytics Mode"-এ `contentEditable={false}` থাকায় ডাটাবেস লিংকড প্রশ্নগুলো এক্সিডেন্টালি এডিট বা ডিলিট হয়ে যায় না।
2. **Print-Perfect Pageless Layout:** `@media print` এবং `@page` CSS রুলের মাধ্যমে ব্রাউজারের প্রিন্ট ডায়ালগকে সম্পূর্ণ নিয়ন্ত্রণ করা হয়েছে। A4, Legal সাইজ, কলাম লেআউট, এবং মার্জিন একেবারে MS Word-এর মতো নিখুঁতভাবে রেন্ডার হচ্ছে। পেজ ব্রেক হলে লেখা মাঝখান দিয়ে কেটে যায় না।
3. **Dynamic Section CSS Injection:** `PaperCanvasV2.jsx`-এ একটি বিশাল ডাইনামিক `<style>` ব্লক লেখা হয়েছে। এর ফলে প্রতিটা সেকশনের ফন্ট সাইজ, গ্যাপ, অ্যালাইনমেন্ট এবং বাংলা/ইংরেজি/রোমান নাম্বারিং (CSS Counter দিয়ে) ক্যানভাসে রিয়েল-টাইম অ্যাপ্লাই হচ্ছে।
4. **Academic Hierarchy Filter:** বাম প্যানেলে লেভেল, স্ট্রিম, ক্লাস, সাবজেক্ট সিলেক্ট করে ফিল্টার করার চমৎকার ব্যবস্থা রয়েছে, যা সরাসরি ডাটাবেস থেকে রিয়েল-টাইম প্রশ্ন এনে দেয়।
5. **Template Management:** `handleSaveTemplate` এবং `handleSaveDocument` এর মাধ্যমে Exam Settings এবং Raw Content JSON আকারে ডাটাবেসে সেভ করার বেসিক লজিক ইমপ্লিমেন্ট করা হয়েছে।
6. **Robust Image Handling Pipeline:** Markdown ইমেজগুলোকে রিয়েল-টাইমে পার্স করে ক্যানভাসে রেন্ডার করা হয়েছে এবং ইউজার ইন্টারঅ্যাকশনের (Click to resize/align) জন্য একটি সিকিউর রেগুলার এক্সপ্রেশন লজিক ডেভেলপ করা হয়েছে। ইমেজের অ্যালাইনমেন্ট ও সাইজ পরিবর্তনের সময় ডাটাবেসে স্টোর করা Markdown ডাটা সঠিকভাবে সিঙ্ক হচ্ছে এবং Tailwind Typography ওভাররাইড প্রিভেন্ট করার জন্য `!important` ব্যবহার করে রেসপন্সিভনেস নিশ্চিত করা হয়েছে।

---

## 🛠️ 3. আগামীতে কী কী করতে হবে (Roadmap)
Enterprise Grade সিস্টেম হিসেবে এই এডিটরটিকে ১০০% স্বয়ংসম্পূর্ণ করতে হলে আমাদের নিম্নলিখিত কাজগুলোতে ফোকাস করতে হবে:

### **A. Template & Document Load/Save ফাইনালাইজেশন**
* **ইস্যু:** বর্তমানে সেভ করা টেমপ্লেট অ্যাপ্লাই করলে তা `setDocSettings`-এ যায়, কিন্তু ক্যানভাসের ভেতরের আগের প্রশ্নগুলোর সাথে নতুন টেমপ্লেটের সিঙ্ক লজিক আরেকটু রোবাস্ট করতে হবে। 
* **সমাধান:** টেমপ্লেট সেভ করার সময় কোনো ফিল্ড যেন মিস না হয় তার জন্য পে-লোড ভ্যালিডেশন বসাতে হবে এবং পুরানো সেভড এক্সাম লোড করার সময় Tiptap-এর `setContent` যেন পারফেক্টলি ডাটাগুলো রিড করতে পারে তা নিশ্চিত করতে হবে।

### **B. Inline Editing & Free Mode (Critical Feature)**
* **ইস্যু:** বর্তমানে `STRICT_LINKED` মোডে প্রশ্নগুলো পুরোপুরি লক করা। কিন্তু একজন শিক্ষক যদি কোনো প্রশ্নের বানানে ভুল দেখেন, তাকে সেটা এডিট করার সুযোগ দিতে হবে। 
* **সমাধান:** `QuestionBlockNode.jsx`-এর ভেতরে `questionText` এবং `options`-এর জন্য **InlineGoldenEditor** বা একটি ছোট Tiptap ইন্সট্যান্স বসাতে হবে।

### ✅ **C. "Hot Swap" বা Question Replacement (UX Enhancement) - COMPLETED**
* **স্ট্যাটাস:** সফলভাবে সম্পন্ন করা হয়েছে। `PaperCanvasV2.jsx`-এ `pendingSwapQuestion` এবং `replaceWith` ট্রানজেকশনের মাধ্যমে "Manual Swap" এবং "Auto Swap" দুটোই কাজ করছে।

### **D. Auto Generator Blueprint Integration**
* **ইস্যু:** বাম দিকের "Auto Generator" ট্যাবটি শুধু একটি প্লেসহোল্ডার মেসেজ দেখাচ্ছে।
* **সমাধান:** Backend-এর `generation_blueprint` কল করে আনতে হবে। "Generate Blueprint" এ ক্লিক করলে এডিটর স্বয়ংক্রিয়ভাবে একটি কাঠামোগত এক্সাম পেপার তৈরি করে ফেলবে।

### **E. Real-time Allocation Validation (Enterprise Rules)**
* **ইস্যু:** ড্র্যাগ-অ্যান্ড-ড্রপ করে ইউজার চাইলে একটি সেকশনে আনলিমিটেড মার্কসের প্রশ্ন বসাতে পারে।
* **সমাধান:** ক্যানভাসে ড্রপ করার সাথে সাথে একটি চেকার রান করবে যা টোটাল মার্কস কাউন্ট করবে এবং যদি তা Blueprint-এর লিমিট ক্রস করে, তবে ইউজারকে একটি ওয়ার্নিং দেখাবে।

---
**Next Immediate Action Plan:**
1. Question Bank Fetching & Drag-and-Drop Review in Left Panel.
2. Step-by-step fixing based on the roadmap.
