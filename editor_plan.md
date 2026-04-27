# 📝 Nexus Paper Engine & Dynamic Question Pipeline (Super Dynamic Plan)

> **লক্ষ্য:** QuestionShaper এর Exam Editor এবং Question Generation প্রক্রিয়াকে (Auto/Manual) সম্পূর্ণভাবে কারিকুলাম JSON স্কিমার ওপর নির্ভরশীল (Super Dynamic) করা, যাতে প্রতিটি বিষয়ের (Subject) ধরন অনুযায়ী এডিটর ও প্রশ্ন বানানোর প্রক্রিয়া স্বয়ংক্রিয়ভাবে পরিবর্তিত হয়।

---

## 🏗️ আর্কিটেকচারাল পরিবর্তন ও মাস্টার প্ল্যান

### ধাপ ১: কারিকুলাম JSON স্কিমা এক্সপ্যানশন (Curriculum Schema Expansion)
বর্তমানে `AiKnowledgeBase`-এ সংরক্ষিত JSON স্কিমা মূলত AI Scraping-এর জন্য ব্যবহৃত হয়। এটিকে একটি **Comprehensive Configuration Object** এ রূপান্তর করতে হবে।

**প্রস্তাবিত নতুন JSON স্ট্রাকচার:**
```json
{
  "subject": "Physics",
  "scraping_rules": { ... }, 
  "editor_config": {
    "allowed_blocks": ["MCQ", "CQ", "SHORT", "EQUATION", "DIAGRAM"],
    "toolbar_features": ["math_formula", "draw_canvas", "table", "image_upload"],
    "validation_rules": {
      "CQ_TOTAL_MARKS": 10,
      "MCQ_TOTAL_MARKS": 1,
      "CQ_MAX_SUBPARTS": 4
    }
  },
  "generation_blueprint": {
    "mandatory_sections": [
      { "name": "বহুনির্বাচনি প্রশ্ন (MCQ)", "type": "MCQ", "target_ratio": "30%" },
      { "name": "সৃজনশীল প্রশ্ন (CQ)", "type": "CQ", "target_ratio": "70%" }
    ],
    "bloom_target": { 
      "KNOWLEDGE": 30, 
      "COMPREHENSION": 30, 
      "APPLICATION": 20, 
      "HIGHER_ORDER": 20 
    },
    "custom_prompts": {
      "generation": "এই বিষয়ের সৃজনশীল প্রশ্ন অবশ্যই গাণিতিক সমীকরণ নির্ভর হতে হবে..."
    }
  }
}
```

---

### ধাপ ২: Dynamic Auto & Manual Question Generation (অটো ও ম্যানুয়াল জেনারেশন)

**১. Auto Generator UI (সুপার ডায়নামিক ফর্ম):**
- স্ট্যাটিক Easy/Medium/Hard ইনপুটগুলোর পরিবর্তে, সিস্টেম যখন ক্লাস ও বিষয় সিলেক্ট করবে, তখন API কল করে ওই বিষয়ের `generation_blueprint` নিয়ে আসবে।
- UI স্বয়ংক্রিয়ভাবে ফর্ম রেন্ডার করবে (e.g. ইংরেজির জন্য Grammar/Vocab রেশিও, বিজ্ঞানের জন্য CQ/MCQ রেশিও)।

**২. Manual Builder & Hot-Swap:**
- ডান/বাম দিকের প্যানেল থেকে যখন শিক্ষক ম্যানুয়ালি প্রশ্ন ড্র্যাগ করবেন, তখন UI লাইভ ক্যালকুলেট করবে যে JSON-এর `bloom_target` কতটা পূরণ হলো। 
- e.g. "Knowledge Level 20% / 30% fulfilled" প্রোগ্রেসবার দেখাবে।

**৩. Backend Rule Engine Service:**
- Spring Boot-এ `CurriculumRuleEngineService` তৈরি করা।
- অটো জেনারেশনের সময় এই সার্ভিস JSON পড়ে ডেটাবেসের `CriteriaBuilder` তৈরি করবে এবং ঠিক সেই রেশিও অনুযায়ী প্রশ্ন ফিল্টার করবে।

---

### ধাপ ৩: Dynamic Exam Editor (Nexus Paper Engine)

এডিটরটি একটি "State Machine" হিসেবে কাজ করবে যা বিষয়ভিত্তিক স্কিমার উপর ভিত্তি করে নিজের রূপ পরিবর্তন করবে।

**১. ডায়নামিক টুলবার (Dynamic Tiptap Toolbar):**
- **বিজ্ঞান (Science):** টুলবারে `Equation`, `Graph`, `Drawing` বাটনগুলো এনাবল থাকবে।
- **ইংরেজি (English):** ম্যাথ টুল হাইড থাকবে, কিন্তু `Comprehension Passage`, `Fill in the blanks` ব্লক যুক্ত করার বাটন আসবে।
- `editor_config.toolbar_features` এর উপর ভিত্তি করে Tiptap Extensions লোড/আনলোড হবে।

**২. ডায়নামিক ব্লক রেন্ডারিং (Dynamic Block Nodes):**
- `QuestionBlockNode` শুধুমাত্র সাধারণ ক,খ,গ,ঘ রেন্ডার করবে না। 
- এটি JSON পড়ে সিদ্ধান্ত নিবে এই সাবজেক্টে ক,খ,গ,ঘ হবে নাকি a,b,c,d হবে, নাকি এটা একটা প্যারাগ্রাফ বেসড প্রশ্ন।

**৩. রিয়েল-টাইম ভ্যালিডেশন (Real-time Validations):**
- এডিটরে টাইপ করার সময় যদি ইউজার কোনো সৃজনশীল প্রশ্নের মার্কস পাল্টে ১৫ করে দেয়, কিন্তু ওই সাবজেক্টের `validation_rules.CQ_TOTAL_MARKS` ১০ থাকে, তাহলে এডিটর সাথে সাথে ওয়ার্নিং দেখাবে।

---

### 🚀 বাস্তবায়ন পর্যায়ক্রম (Implementation Phases)

1. ✅ **Phase A (Schema Update):** `CurriculumRules.jsx` এবং ডাটাবেস আপডেট করে নতুন JSON স্কিমা সেভ করার ব্যবস্থা করা। (সম্পন্ন)
2. ✅ **Phase B (Backend Logic):** `ExamGenerationServiceImpl` এবং AI Prompting সিস্টেমে এই JSON স্কিমা ইনজেক্ট করা। (সম্পন্ন)
3. ✅ **Phase D (Builder UI):** Auto এবং Manual এক্সাম বিল্ডারের ইন্টারফেস ডায়নামিক করা, ট্র্যাকার অ্যাড করা এবং এপিআই পেলোড ফিক্স করা। (সম্পন্ন)
4. ⏳ **Phase C (Editor UI):** `PaperCanvasV2` (Nexus Paper Engine) কে ডায়নামিক করা যাতে সে স্কিমা রিসিভ করে টুলবার এবং ব্লক কন্ট্রোল করতে পারে, এবং এডিটরের আধুনিকায়ন। (পরবর্তী কাজ)

---

> **বর্তমান স্ট্যাটাস:** আমরা সফলভাবে Auto Exam Generator এবং Manual Exam Builder-এর ডায়নামিক উইজার্ড এবং সিলেবাস অ্যালোকেশন সম্পন্ন করেছি। পরবর্তী সেশনে আমরা **Phase C** অর্থাৎ Nexus Editor-এর আধুনিকায়ন, ড্র্যাগ-এন্ড-ড্রপ সাপোর্ট এবং ডায়নামিক টুলবার নিয়ে কাজ শুরু করবো।
