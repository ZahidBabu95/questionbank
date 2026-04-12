# 🎯 Perfect AI Scraper JSON Schema — QuestionShaper

> এই JSON টি `/admin/academic/curriculum-rules` এ সেভ করুন।
> AI scraper **হুবহু এই format-এ** প্রশ্ন generate করবে, যা সরাসরি database-এ সেভ হবে।

---

## ⚠️ গুরুত্বপূর্ণ: Entity Field Mapping

| JSON Field | Java Entity Field | Type | Required |
|---|---|---|---|
| `questionText` | `Question.questionText` | String (HTML) | ✅ |
| `type` | `Question.QuestionType` | `MCQ\|CQ\|SHORT\|TRUE_FALSE` | ✅ |
| `mcqType` | AI-only (routing) | `SIMPLE\|MULTIPLE_COMPLETION\|SITUATION_SET` | MCQ only |
| `bloomLevel` | `Question.bloomLevel` | `KNOWLEDGE\|COMPREHENSION\|APPLICATION\|HIGHER_ORDER` | ✅ |
| `difficulty` | `Question.DifficultyLevel` | `EASY\|MEDIUM\|HARD` | ✅ |
| `marks` | `Question.marks` | Double | ✅ |
| `language` | `Question.language` | `Bangla\|English` | ✅ |
| `stimulus` | `Question.stimulus` | String (HTML) | APPLICATION/HIGHER_ORDER |
| `explanation` | `Question.explanation` | String (HTML) | optional |
| `optionLabel` | `QuestionOption.optionLabel` | `ক\|খ\|গ\|ঘ` | MCQ |
| `optionText` | `QuestionOption.optionText` | String | MCQ |
| `isCorrect` | `QuestionOption.isCorrect` | boolean | MCQ |
| `sourceType` | `QuestionSource.sourceType` | `BOARD_EXAM\|INSTITUTION_TEST\|MODEL_TEST\|OTHER` | optional |
| `examYear` | `QuestionSource.examYear` | Integer | optional |
| `organizationName` | `QuestionSource.organizationName` | String | optional |
| `examName` | `QuestionSource.examName` | String | optional |

---

## 📋 Complete JSON Schema (Curriculum Rule হিসেবে সেভ করুন)

```json
{
  "_comment": "QuestionShaper Universal MCQ + CQ Scraper Schema — Entity-Aligned v2.0",
  "_version": "2.0",
  "_last_updated": "2026-03-30",

  "scraping_rules": {
    "language": "Bangla",
    "marks_per_mcq": 1,
    "marks_per_cq": 10,
    "marks_per_short": 2,
    "marks_per_true_false": 1,
    "bloom_distribution": {
      "KNOWLEDGE": "40%",
      "COMPREHENSION": "30%",
      "APPLICATION": "20%",
      "HIGHER_ORDER": "10%"
    },
    "mcq_type_distribution": {
      "SIMPLE": "30-40%",
      "MULTIPLE_COMPLETION": "max 20%",
      "SITUATION_SET": "max 10%"
    }
  },

  "question_formats": [

    {
      "_type": "SIMPLE_MCQ",
      "_description": "সাধারণ বহুনির্বাচনি — একটি প্রশ্ন + ৪টি অপশন (ক, খ, গ, ঘ)",
      "_bloom_eligible": ["KNOWLEDGE", "COMPREHENSION"],
      "_stimulus_rule": "stimulus শুধু APPLICATION বা HIGHER_ORDER bloomLevel-এ আবশ্যক",

      "question": {
        "type": "MCQ",
        "mcqType": "SIMPLE",
        "questionText": "স্প্রেডশিট সফটওয়্যারে প্রতিটি কলামের নাম কীভাবে চিহ্নিত করা হয়?",
        "stimulus": null,
        "bloomLevel": "KNOWLEDGE",
        "difficulty": "EASY",
        "marks": 1,
        "language": "Bangla",
        "explanation": "এক্সেল বা স্প্রেডশিটে কলামগুলো বর্ণমালা (A, B, C) দিয়ে চিহ্নিত থাকে।"
      },
      "options": [
        { "optionLabel": "ক", "optionText": "A, B, C...", "isCorrect": true },
        { "optionLabel": "খ", "optionText": "1, 2, 3...", "isCorrect": false },
        { "optionLabel": "গ", "optionText": "i, ii, iii...", "isCorrect": false },
        { "optionLabel": "ঘ", "optionText": "a1, b1, c1...", "isCorrect": false }
      ],
      "sources": [
        {
          "sourceType": "BOARD_EXAM",
          "examYear": 2023,
          "organizationName": "ঢাকা বোর্ড",
          "examName": "SSC পরীক্ষা",
          "session": "2022-2023",
          "note": null
        }
      ]
    },

    {
      "_type": "SIMPLE_MCQ_WITH_STIMULUS",
      "_description": "সাধারণ বহুনির্বাচনি — APPLICATION/HIGHER_ORDER এ উদ্দীপক আবশ্যক",
      "_bloom_eligible": ["APPLICATION", "HIGHER_ORDER"],
      "_stimulus_rule": "REQUIRED — উদ্দীপক মৌলিক হতে হবে, পাঠ্যপুস্তক থেকে হুবহু নেওয়া যাবে না",

      "question": {
        "type": "MCQ",
        "mcqType": "SIMPLE",
        "questionText": "উদ্দীপকে রহিমের সমস্যা সমাধানে কোন সফটওয়্যারটি সবচেয়ে উপযুক্ত?",
        "stimulus": "রহিম সাহেব তার অফিসে প্রতিদিন শত শত হিসাব রাখতে গিয়ে খাতা-কলমে সময় নষ্ট করেন।",
        "bloomLevel": "APPLICATION",
        "difficulty": "MEDIUM",
        "marks": 1,
        "language": "Bangla",
        "explanation": "MS Excel বা যেকোনো Spreadsheet Software হিসাব ব্যবস্থাপনার জন্য উপযুক্ত।"
      },
      "options": [
        { "optionLabel": "ক", "optionText": "MS Word", "isCorrect": false },
        { "optionLabel": "খ", "optionText": "MS Excel", "isCorrect": true },
        { "optionLabel": "গ", "optionText": "MS PowerPoint", "isCorrect": false },
        { "optionLabel": "ঘ", "optionText": "MS Access", "isCorrect": false }
      ],
      "sources": [
        {
          "sourceType": "INSTITUTION_TEST",
          "examYear": 2024,
          "organizationName": "ঢাকা রেসিডেনসিয়াল মডেল কলেজ",
          "examName": "নির্বাচনী পরীক্ষা",
          "session": null,
          "note": null
        }
      ]
    },

    {
      "_type": "MULTIPLE_COMPLETION_MCQ",
      "_description": "বহুপদী সমাপ্তিসূচক — i, ii, iii তিনটি বিবৃতি, ৪টি fixed সমন্বয় অপশন",
      "_bloom_eligible": ["COMPREHENSION", "ANALYZING"],
      "_stimulus_rule": "optional",
      "_option_rule": "FIXED: ক='i ও ii', খ='i ও iii', গ='ii ও iii', ঘ='i, ii ও iii'",

      "question": {
        "type": "MCQ",
        "mcqType": "MULTIPLE_COMPLETION",
        "questionText": "ইন্টারনেট ব্যবহারের মাধ্যমে একজন শিক্ষার্থী—",
        "stimulus": null,
        "statements": [
          "i. দেশি-বিদেশি লাইব্রেরির বই পড়তে পারে",
          "ii. ঘরে বসে পরীক্ষার ফলাফল জানতে পারে",
          "iii. অনলাইন ক্লাসে অংশগ্রহণ করতে পারে"
        ],
        "bloomLevel": "COMPREHENSION",
        "difficulty": "MEDIUM",
        "marks": 1,
        "language": "Bangla",
        "explanation": "ইন্টারনেটের মাধ্যমে তিনটি সুবিধাই পাওয়া সম্ভব।"
      },
      "options": [
        { "optionLabel": "ক", "optionText": "i ও ii", "isCorrect": false },
        { "optionLabel": "খ", "optionText": "i ও iii", "isCorrect": false },
        { "optionLabel": "গ", "optionText": "ii ও iii", "isCorrect": false },
        { "optionLabel": "ঘ", "optionText": "i, ii ও iii", "isCorrect": true }
      ],
      "sources": [
        {
          "sourceType": "BOARD_EXAM",
          "examYear": 2024,
          "organizationName": "রাজশাহী বোর্ড",
          "examName": "SSC পরীক্ষা",
          "session": null,
          "note": null
        }
      ]
    },

    {
      "_type": "SITUATION_SET_MCQ",
      "_description": "অভিন্ন তথ্যভিত্তিক — একটি উদ্দীপক, একাধিক স্বতন্ত্র MCQ প্রশ্ন (সাধারণত ২-৩টি)",
      "_bloom_eligible": ["APPLICATION", "HIGHER_ORDER"],
      "_stimulus_rule": "REQUIRED — stimulus ছাড়া SITUATION_SET গ্রহণযোগ্য নয়",
      "_special_rule": "প্রতিটি sub-question আলাদাভাবে সেভ হয় কিন্তু একই stimulus শেয়ার করে",

      "stimulus": "নিচের চিত্রটি লক্ষ্য করো: [MS Excel-এর C5 সেল ৬০০ দেখাচ্ছে]",
      "bloomLevel": "APPLICATION",
      "difficulty": "MEDIUM",
      "marks": 1,
      "language": "Bangla",

      "question_sets": [
        {
          "questionText": "চিত্রে প্রদর্শিত 'C5' সেলটির মান কত?",
          "explanation": "C5 সেলের মান সরাসরি চিত্র থেকে দেখা যাচ্ছে।",
          "options": [
            { "optionLabel": "ক", "optionText": "৫০০", "isCorrect": false },
            { "optionLabel": "খ", "optionText": "৬০০", "isCorrect": true },
            { "optionLabel": "গ", "optionText": "৭০০", "isCorrect": false },
            { "optionLabel": "ঘ", "optionText": "৮০০", "isCorrect": false }
          ]
        },
        {
          "questionText": "উক্ত সেলের মান যোগ করতে নিচের কোন ফাংশনটি ব্যবহার হয়?",
          "explanation": "SUM() ফাংশন একাধিক সেলের মান যোগ করে।",
          "options": [
            { "optionLabel": "ক", "optionText": "=SUM()", "isCorrect": true },
            { "optionLabel": "খ", "optionText": "=AVERAGE()", "isCorrect": false },
            { "optionLabel": "গ", "optionText": "=IF()", "isCorrect": false },
            { "optionLabel": "ঘ", "optionText": "=COUNT()", "isCorrect": false }
          ]
        }
      ],
      "sources": [
        {
          "sourceType": "BOARD_EXAM",
          "examYear": 2022,
          "organizationName": "যশোর বোর্ড",
          "examName": "SSC পরীক্ষা",
          "session": null,
          "note": null
        }
      ]
    },

    {
      "_type": "CREATIVE_QUESTION",
      "_description": "সৃজনশীল প্রশ্ন — উদ্দীপক + ৪ অংশ: ক(১) + খ(২) + গ(৩) + ঘ(৪) = ১০",
      "_bloom_mapping": {
        "ক": "KNOWLEDGE — সংজ্ঞা/নাম/কী (১ নম্বর)",
        "খ": "COMPREHENSION — ব্যাখ্যা করো/বোঝাও (২ নম্বর)",
        "গ": "APPLICATION — উদ্দীপকের আলোকে প্রয়োগ (৩ নম্বর)",
        "ঘ": "HIGHER_ORDER — বিশ্লেষণ/মূল্যায়ন/সিদ্ধান্ত (৪ নম্বর)"
      },

      "question": {
        "type": "CQ",
        "mcqType": null,
        "stimulus": "রহিম সাহেব তার অফিসে হিসাব রাখতে এখন কম্পিউটারে বিশেষ সফটওয়্যার ব্যবহার করেন। তবে বিদ্যুৎ বিভ্রাটে তার ডেটা হারিয়ে যাওয়ার ঝুঁকি আছে।",
        "bloomLevel": "HIGHER_ORDER",
        "difficulty": "HARD",
        "marks": 10,
        "language": "Bangla",
        "explanation": null
      },
      "sub_parts": [
        {
          "part": "ক",
          "type": "KNOWLEDGE",
          "questionText": "স্প্রেডশিট কী?",
          "marks": 1,
          "bloomLevel": "KNOWLEDGE",
          "answer_hint": "স্প্রেডশিট হলো এক ধরনের কম্পিউটার অ্যাপ্লিকেশন যা ছককাটা কাগজের মতো কাজ করে।"
        },
        {
          "part": "খ",
          "type": "COMPREHENSION",
          "questionText": "সেল অ্যাড্রেস বলতে কী বোঝায়? ব্যাখ্যা করো।",
          "marks": 2,
          "bloomLevel": "COMPREHENSION",
          "answer_hint": "রো এবং কলামের সংযোগস্থলকে সেল বলে, যা কলামের অক্ষর ও রো-এর নম্বর দিয়ে প্রকাশ করা হয়।"
        },
        {
          "part": "গ",
          "type": "APPLICATION",
          "questionText": "রহিম সাহেবের কাজ সহজ করতে কোন সফটওয়্যার ভূমিকা রেখেছে? উদ্দীপকের আলোকে ব্যাখ্যা করো।",
          "marks": 3,
          "bloomLevel": "APPLICATION",
          "answer_hint": "মাইক্রোসফট এক্সেল বা স্প্রেডশিট সফটওয়্যার — দ্রুত গণনা, ডেটা সংরক্ষণ ও ব্যবস্থাপনা।"
        },
        {
          "part": "ঘ",
          "type": "HIGHER_ORDER",
          "questionText": "\"রহিম সাহেবের ডেটা সুরক্ষায় ক্লাউড কম্পিউটিং কার্যকর ভূমিকা রাখতে পারে\" — উক্তিটি বিশ্লেষণ করো।",
          "marks": 4,
          "bloomLevel": "HIGHER_ORDER",
          "answer_hint": "ক্লাউড স্টোরেজে অটো-সেভ ও ব্যাকআপ সুবিধার মাধ্যমে বিদ্যুৎ বিভ্রাটেও ডেটা নিরাপদ।"
        }
      ],
      "sources": [
        {
          "sourceType": "BOARD_EXAM",
          "examYear": 2024,
          "organizationName": "দিনাজপুর বোর্ড",
          "examName": "SSC পরীক্ষা",
          "session": null,
          "note": null
        }
      ]
    },

    {
      "_type": "SHORT_QUESTION",
      "_description": "সংক্ষিপ্ত প্রশ্ন — PSC/JSC level, সংক্ষিপ্ত উত্তর (২-৩ বাক্য)",

      "question": {
        "type": "SHORT",
        "mcqType": null,
        "questionText": "ওয়ার্ড প্রসেসর কী কাজে ব্যবহার করা হয়?",
        "stimulus": null,
        "correctAnswer": "ডকুমেন্ট তৈরি, সম্পাদনা ও ফরমেট করার জন্য ওয়ার্ড প্রসেসর ব্যবহার করা হয়।",
        "bloomLevel": "KNOWLEDGE",
        "difficulty": "EASY",
        "marks": 2,
        "language": "Bangla",
        "explanation": null
      },
      "options": [],
      "sources": []
    },

    {
      "_type": "TRUE_FALSE",
      "_description": "সত্য/মিথ্যা — দুটি অপশন",

      "question": {
        "type": "TRUE_FALSE",
        "mcqType": null,
        "questionText": "এক্সেলে SUM ফাংশন দিয়ে গড় বের করা যায়।",
        "stimulus": null,
        "bloomLevel": "KNOWLEDGE",
        "difficulty": "EASY",
        "marks": 1,
        "language": "Bangla",
        "explanation": "SUM ফাংশন শুধু যোগ করে; গড়ের জন্য AVERAGE ফাংশন ব্যবহার করতে হয়।"
      },
      "options": [
        { "optionLabel": "ক", "optionText": "সত্য", "isCorrect": false },
        { "optionLabel": "খ", "optionText": "মিথ্যা", "isCorrect": true }
      ],
      "sources": []
    }
  ],

  "ai_scraping_prompt": "তুমি একজন বিশেষজ্ঞ বাংলাদেশ শিক্ষা বোর্ডের প্রশ্ন বিশ্লেষক। নিচের নির্দেশনা অুনসরণ করে প্রশ্ন scrape করো:\n\n1. **Question Type সনাক্তকরণ:**\n   - সাধারণ ৪টি অপশন → SIMPLE\n   - i, ii, iii বিবৃতি সমন্বয় → MULTIPLE_COMPLETION (options সবসময় fixed: ক='i ও ii', খ='i ও iii', গ='ii ও iii', ঘ='i, ii ও iii')\n   - একই উদ্দীপকে একাধিক প্রশ্ন → SITUATION_SET (একই stimulus সব question এ)\n   - উদ্দীপক + ক/খ/গ/ঘ → CQ (marks: ক=1, খ=2, গ=3, ঘ=4)\n\n2. **Bloom Level নির্ধারণ:**\n   - সংজ্ঞা/নাম/কী/কোনটি → KNOWLEDGE\n   - ব্যাখ্যা/কারণ/পার্থক্য → COMPREHENSION\n   - উদ্দীপকভিত্তিক প্রয়োগ → APPLICATION (stimulus REQUIRED)\n   - বিশ্লেষণ/মূল্যায়ন/সিদ্ধান্ত → HIGHER_ORDER (stimulus REQUIRED)\n\n3. **Source ধরন:** বোর্ড পরীক্ষা=BOARD_EXAM, স্কুল টেস্ট=INSTITUTION_TEST, মডেল টেস্ট=MODEL_TEST\n\n4. **isCorrect:** প্রতিটি options array-এ ঠিক একটি isCorrect=true হবে।\n\n5. **Language:** সব বাংলা প্রশ্নের জন্য 'Bangla', ইংরেজির জন্য 'English'\n\n6. **Marks:** MCQ=1, SHORT=2, CQ sub-parts: ক=1, খ=2, গ=3, ঘ=4"
}
```

---

## 🚀 কীভাবে ব্যবহার করবেন

### ১. এই JSON → Curriculum Rules-এ দিন:
```
/admin/academic/curriculum-rules
→ বিষয় সিলেক্ট করুন
→ JSON Editor-এ উপরের JSON paste করুন  
→ Save Rule
```

### ২. অথবা "✏️ Sample Text" দিয়ে উন্নত করুন:
- Sample questions paste করুন
- Custom Prompt: `"MULTIPLE_COMPLETION প্রশ্নে options সবসময় 'i ও ii', 'i ও iii', 'ii ও iii', 'i, ii ও iii' হবে। প্রতিটি MCQ-তে marks=1।"`

---

## 🔍 MCQ Type কখন কী হবে

```
প্রশ্ন পড়ে AI কী বুঝবে:

"কোনটি সঠিক?"          → SIMPLE
"নিচের কোনটি সঠিক?"    → MULTIPLE_COMPLETION (যদি i,ii,iii থাকে)
"উদ্দীপকের আলোকে..."    → SITUATION_SET বা SIMPLE+APPLICATION
"ক. স্প্রেডশিট কী?"    → CQ
```
