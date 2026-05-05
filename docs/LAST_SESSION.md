# QuestionShaper — Last Session Notes
> ⚡ লোডসেডিং-এর কারণে context হারানো রোধে এই ফাইলটি প্রতিটি কাজের পর আপডেট করা হয়

---

## 📅 চলমান সেশন: 2026-05-05
**অবস্থান:** Epic 4 - Admin Dashboard & Nexus Editor Analysis

---

## 🛠️ প্রগ্রেস রিপোর্ট (Progress Report)

### 📊 Code Review: Nexus Editor (Nexus Paper Engine)
| ✅ COMPLETED | **"Hot Swap" Mechanism:** `NexusEditor.jsx` এবং `PaperCanvasV2.jsx`-এ "Manual Swap" এবং "Auto Swap" সফলভাবে ইমপ্লিমেন্ট করা হয়েছে। Tiptap-এর `replaceWith` ট্রানজেকশন ব্যবহার করে ক্যানভাসে প্রশ্ন রিপ্লেস করা কাজ করছে। | `PaperCanvasV2.jsx` |
| ✅ COMPLETED | **Schema Extraction:** সাবজেক্ট অনুযায়ী `editorConfig` এবং `generationBlueprint` ডাটাবেস থেকে রিসিভ করার লজিক তৈরি হয়েছে। | `NexusEditor.jsx` |
| ⏳ PENDING | **Inline Editing (Free Mode):** `QuestionBlockNode.jsx`-এ লক করা প্রশ্নের ওপর ক্লিক করে `InlineGoldenEditor`-এর মাধ্যমে বানান ঠিক করার সুবিধা এখনো তৈরি করা হয়নি। | `QuestionBlockNode.jsx` |
| ⏳ PENDING | **Real-time Allocation Validation:** ড্র্যাগ-অ্যান্ড-ড্রপের সময় ক্যানভাসে টোটাল মার্কস লিমিট চেক করার সিস্টেম এখনো নেই। | `PaperCanvasV2.jsx` |

---

## 🎯 পূর্ববর্তী কাজগুলো (Backlog)
1. **Subscription Invoice Generation:** মাল্টি-ভার্সন প্রাইসিং অনুযায়ী ইনভয়েস জেনারেট এবং পেমেন্ট গেটওয়ে ইন্টিগ্রেশন।
2. **Institute Subject Verification:** ব্যাকএন্ডে রিকোয়েস্ট এক্সেপ্ট করার পর মাল্টি-ভার্সন ডাটা ঠিকমতো `Institute` মডেলে সেভ করার লজিক আপডেট।
3. **Nexus Editor Inline Editing:** `STRICT_LINKED` মোডে থাকা প্রশ্নের ছোটখাটো বানান ঠিক করার জন্য ইনলাইন এডিটিং ফিচার চালু করা।

---

## 📞 পরের সেশনে প্রথম বার্তা

> "আমরা Nexus Editor-এর কোড অ্যানালাইসিস করে দেখেছি যে 'Hot Swap' ফিচারটি সফলভাবে সম্পন্ন হয়েছে। এখন আমরা অন্য একটি নতুন কাজ শুরু করার জন্য প্রস্তুত। আপনি কোন কাজটি দিয়ে শুরু করতে চান?"
