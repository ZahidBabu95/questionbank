# 💰 Billing & AI Token Management System Plan

> **Vision:** A comprehensive hybrid billing system for QuestionShaper that seamlessly manages standard manual operations (like question creation limits) and advanced AI usage (Prompt Tokens from Gemini/OpenAI vs Free usage from Ollama), all tied together via flexible Subscription Packages.

## 🗂️ ১. সাব-মেনু স্ট্রাকচার (`/billing/`)

ফ্রন্টএন্ডে Billing মেনুর অধীনে নিচের ৫টি সাব-মেনু থাকবে:

### ১. ড্যাশবোর্ড / Overview (`/billing/overview`)
* **উদ্দেশ্য:** কোম্পানির ফাইন্যান্সিয়াল এবং এআই খরচের প্রধান ড্যাশবোর্ড (Super Admin view)।
* **উপাদান:**
  * Total Revenue (মোট আয়), Active Subscriptions (চলতি প্যাকেজসমূহ)।
  * Our API Cost (Gemini/OpenAI-এর জন্য মোট কত $ এপিআই খরচ হলো)।
  * Revenue vs Cost বার চার্ট বা গ্রাফ।
  * Model Usage Distribution (কোন মডেল কতটা ব্যবহৃত হচ্ছে তার পাই চার্ট)।

### ২. প্যাকেজ ম্যানেজমেন্ট (`/billing/packages`) *[Upgrading]*
* **উদ্দেশ্য:** বিক্রয়যোগ্য প্ল্যান তৈরি করা (যেমন: Basic, Premium)।
* **উপাদান:** প্রতিটি প্যাকেজে ২টি প্রধান লিমিট থাকবে:
  1. **Standard System Limit:** মাসেক সর্বোচ্চ কতগুলো প্রশ্ন/Teacher অ্যাড করা যাবে।
  2. **AI Credit/Token Limit:** মাসে এআই ব্যবহারের জন্য কত টোকেন বা ক্রেডিট দেওয়া হবে। (যেমন: বেসিকে 0 ক্রেডিট, প্রিমিয়ামে 1 Million ক্রেডিট)।
* **Academic Access & Dynamic Pricing:** প্যাকেজের মধ্যে নির্দিষ্ট সাবজেক্ট এবং তাদের **Allowed Versions** (Bangla, English, Bilingual) সিলেক্ট করে প্রাইসিং রুলস সেট করা যায়। ইউজার যতগুলো ভার্সন সিলেক্ট করবে, সাবজেক্টের মূল্যের সাথে ভার্সনের সংখ্যা গুণ হয়ে ডাইনামিক প্রাইস ক্যালকুলেট হবে (যেমন: ১টি সাবজেক্টের ২টি ভার্সন সিলেক্ট করলে মূল্য দ্বিগুণ হবে)।

### ৩. সাবস্ক্রিপশন ও কোটা (`/billing/subscriptions`) *[New]*
* **উদ্দেশ্য:** ইন্সটিটিউট বা ইউজারদের বর্তমান সাবস্ক্রিপশন এবং ইউজেস ট্র্যাক করা।
* **উপাদান:** 
  * ইউজারের লিস্ট এবং তাদের Active Package.
  * **Progress Bars:** "Question Quota: 800/1000" এবং "AI Quota: 450k/1M"।
  * ম্যানুয়ালি কোটা রিনিউ বা বোনাস ক্রেডিট এড করার অপশন।

### ৪. ইনভয়েস ও রসিদ (`/billing/invoices`) *[Upgrading]*
* **উদ্দেশ্য:** পেমেন্ট এবং বিলিং রসিদ জেনারেট করা।
* **উপাদান:** ইনভয়েস লিস্ট (Paid, Unpaid, Overdue) এবং PDF ডাউনলোড অপশন।

### ৫. এআই খরচ ও লেজার (`/billing/ai-usage`) *[New]*
* **উদ্দেশ্য:** সম্পূর্ণ ইন্টারনাল অডিট এবং টোকেন খরচের রিয়েল-টাইম হিসাব।
* **উপাদান:** একটি বিশদ টেবিল যেখানে থাকবে - `Date` | `User/Institute` | `Feature` | `Model (Gemini/Ollama)` | `Tokens (In/Out)` | `Actual Provider Cost ($)`।

---

## ⚙️ ২. ব্যাকএন্ড ও কোটা লজিক (Hybrid Logic)

ইউজারদের কাজের ধরন অনুযায়ী সিস্টেম ২টি আলাদা ভাবে লিমিট হিসাব করবে:

1. **ম্যানুয়াল কাজ (Non-AI):** 
   ইউজার নিজে প্রশ্ন টাইপ করলে শুধুমাত্র `Standard Quota` (যেমন: Monthly Max Questions) মাইনাস হবে।
2. **এআই কাজ (API Models - Gemini/OpenAI):** 
   পিডিএফ থেকে এআই ব্যবহার করে প্রশ্ন বানালে, ২টি কোটাই মাইনাস হবে। প্রশ্ন তৈরি হওয়ার কারণে `Standard Quota` কমবে এবং প্রম্পট/রেসপন্স অনুযায়ী `AI Quota` (Credits) কাটবে।
3. **লোকাল মডেল (Ollama):** 
   Ollama সিলেক্ট করলে API খরচ নেই। তাই এই ক্ষেত্রে AI limit হয়তো কাটা হবে না (বা খুবই নগণ্য কাটা হবে সার্ভার ভাড়ার জন্য), শুধুমাত্র `Standard Quota` কাটা হবে।
4. **কোটা লিমিট শেষ হলে:** 
   যদি কোনো ইউজারের AI কোটা শেষ হয় কিন্তু Standard কোটা বাকি থাকে, সে মেনুয়ালি কাজ করতে পারবে কিন্তু AI বাটনে ক্লিক করলে আপগ্রেড মেসেজ পাবে।

---

## 🏗️ ৩. ডেটাবেস স্কিমা (প্রস্তাবিত নতুন টেবিল)

1. `ai_token_usage_log`: ইউজারের প্রতিটি এআই রিকোয়েস্টের লগ, ইনপুট/আউটপুট টোকেন এবং আসল এপিআই কস্ট ($) ট্র্যাক করার জন্য।
2. `ai_model_pricing`: কোন মডেলের (Gemini, Ollama) দাম কত, তা কনফিগার করার জন্য।
3. `Institute` টেবিলে ফিল্ড যুক্ত হবে: `ai_credits_limit` এবং `used_ai_credits`।

---

## 🚀 ৪. ডেভলপমেন্ট রোডম্যাপ ও বর্তমান স্ট্যাটাস

* **ধাপ ১:** `billing.md` তে পুরো প্ল্যানটি ডকুমেন্ট করা। (Done ✅)
* **ধাপ ২:** ফ্রন্টএন্ডে Sidebar আপডেট করে Billing এর সাব-মেনুগুলো তৈরি করা এবং `Overview` পেজের ডিজাইন ও API Integration করা। (Done ✅)
* **ধাপ ৩:** প্যাকেজ (Package) স্কিমা আপডেট করে AI Credits যুক্ত করা এবং CRUD তৈরি করা। (Done ✅)
* **ধাপ ৪:** ব্যাকএন্ডে `AiUsageLog` তৈরি এবং Question Bank ও Knowledge Hub-এর সকল এআই কলগুলোর উপর টোকেন ও কস্ট ($) Tracking বসানো। (Done ✅)
* **ধাপ ৫:** সাবস্ক্রিপশন ম্যানেজমেন্ট (`/billing/subscriptions`) এবং AI ইউজেস ট্র্যাকার (`/billing/ai-usage`) সম্পূর্ণ করা এবং ডাইনামিক ডেটা যুক্ত করা। (Done ✅)
* **ধাপ ৬:** প্যাকেজ ম্যানেজমেন্টে Per-subject Version Dynamic Pricing (Bangla, English, Bilingual) এবং User Self-Service Package Selection ফ্লো তৈরি করা। (Done ✅)

---

## 🔮 ৫. ভবিষ্যৎ ডেভলপমেন্ট লক্ষ্য (Future Roadmap)

1. **পেমেন্ট গেটওয়ে ইন্টিগ্রেশন (Payment Gateway):** 
   - SSLCommerz বা Stripe-এর মতো পেমেন্ট গেটওয়ে যুক্ত করা, যেন ইনস্টিটিউটগুলো সরাসরি ড্যাশবোর্ড থেকে প্যাকেজ কিনতে পারে।
2. **অটোমেটেড ইনভয়েস জেনারেটর (`/billing/invoices`):**
   - প্রতি মাসে ইনস্টিটিউটের বিল জেনারেট করা এবং পিডিএফ (PDF) ডাউনলোড অপশন পেমেন্ট স্ট্যাটাসসহ (Paid/Unpaid) দেখানো।
3. **কোটা রিসেট ক্রন জব (Monthly Cron Job):**
   - প্রতি মাসের ১ তারিখে (বা বিলিং সাইকেলে) ইউজারদের কোটা (AI limit & Standard Question limit) অটোমেটিক রিসেট করার জন্য স্প্রিং বুটে `@Scheduled` টাস্ক ইমপ্লিমেন্ট করা।
4. **অ্যাডভান্সড প্রাইসিং রুলস ম্যানেজমেন্ট:**
   - সিস্টেম থেকে সরাসরি নির্দিষ্ট এআই মডেলের (যেমন Gemini 2.0 Pro) প্রাইসিং আপডেট করার জন্য UI তৈরি করা, যেন কোড পরিবর্তন করা ছাড়াই প্রাইস পরিবর্তন হলে সুপার অ্যাডমিন তা এডজাস্ট করতে পারেন।
5. **প্রফিট ও মার্জিন ট্র্যাকিং:**
   - ইনভয়েসের মাধ্যমে মোট আয় এবং এআই এপিআই-এর খরচের হিসেব করে ড্যাশবোর্ডে নিখুঁত **Net Profit** দেখানো।
