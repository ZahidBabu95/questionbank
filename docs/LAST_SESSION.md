# QuestionShaper — Last Session Notes
> ⚡ লোডসেডিং-এর কারণে context হারানো রোধে এই ফাইলটি প্রতিটি কাজের পর আপডেট করা হয়

---

## 📅 চলমান সেশন: 2026-05-07
**অবস্থান:** Epic 2 - Question Bank Filtering & Source Management

---

## 🛠️ প্রগ্রেস রিপোর্ট (Progress Report)

### 📊 Backend & API Updates
| ✅ COMPLETED | **Filter API Compilation Fix:** `QuestionServiceImpl` এবং `QuestionSpecification`-এ `sourceBoards`, `sourceYears`, `sourceSchools` ফিল্টার যুক্ত করে 500/Unresolved Compilation Error সমাধান করা হয়েছে। | `QuestionServiceImpl.java` |
| ✅ COMPLETED | **Source Management API:** Question Sources (যেমন বোর্ড, ইউনিভার্সিটি) গ্রুপ করে সামারি বের করা, রিনেম করা এবং মাল্টিপল সোর্স মার্জ (Merge) করার জন্য নতুন `QuestionSourceManagementController` এবং Repository Query তৈরি করা হয়েছে। 403 Forbidden এরর ঠিক করতে `@PreAuthorize` এ `hasAnyRole` ব্যবহার করা হয়েছে। | `QuestionSourceManagementController.java` |

### 📊 Frontend Development
| ✅ COMPLETED | **Source Management UI:** `Question Bank > Repository`-এ একটি নতুন সাব-মেনু যুক্ত করে সম্পূর্ণ "Source Management" পেজ ডিজাইন করা হয়েছে। এটিতে `antd` এর বদলে TailwindCSS এবং `lucide-react` ব্যবহার করা হয়েছে। | `SourceManagement.jsx` |
| ✅ COMPLETED | **Filter & Actions:** Source Type অনুযায়ী ফিল্টার করার জন্য ড্রপডাউন এবং রিনেম/মার্জ করার জন্য কাস্টম মডাল লজিক তৈরি করে ফ্রন্টএন্ড থেকে API তে সংযুক্ত করা হয়েছে। | `SourceManagement.jsx` |
| ✅ COMPLETED | **Question Bank Filters UI Refactoring:** অ্যাডভান্সড ফিল্টারগুলো ইনলাইন থেকে সরিয়ে ডানদিকের সাইডবারে "Filters & Tags" নামে একত্রিত করা হয়েছে। সাইডবারে "Academic" এবং "Source Tags" নামে দুটি প্রফেশনাল ট্যাব যোগ করা হয়েছে। | `QuestionList.jsx` |
| ✅ COMPLETED | **Filter Persistence & Auto-Selection:** সুপার অ্যাডমিনদের সুবিধার জন্য অ্যাকাডেমিক ফিল্টার সিলেকশন (Level/Stream/Class/Subject) `localStorage`-এ সেভ করা হয়েছে, যাতে পেজ রিলোড করলেও অটোমেটিক সর্বশেষ ফিল্টারটি লোড হয়। সাধারণ ইউজারদের জন্য তাদের নিজস্ব ফিল্টারগুলো আগের মতই অটো-সিলেক্ট হয়ে থাকবে। ডিফল্টভাবে "Source Tags" ট্যাবটি ওপেন হবে। | `QuestionList.jsx` |

---

## 🎯 পূর্ববর্তী কাজগুলো (Backlog)
1. **Nexus Editor Inline Editing:** `STRICT_LINKED` মোডে থাকা প্রশ্নের ছোটখাটো বানান ঠিক করার জন্য ইনলাইন এডিটিং ফিচার চালু করা।
2. **Real-time Allocation Validation:** ড্র্যাগ-অ্যান্ড-ড্রপের সময় ক্যানভাসে টোটাল মার্কস লিমিট চেক করার সিস্টেম।
3. **Subscription Invoice Generation:** মাল্টি-ভার্সন প্রাইসিং অনুযায়ী ইনভয়েস জেনারেট এবং পেমেন্ট গেটওয়ে ইন্টিগ্রেশন।

---

## 📞 পরের সেশনে প্রথম বার্তা

> "আমরা Question Bank-এর মেটাডেটা ফিল্টারিং UI রিফ্যাক্টরিং সম্পন্ন করেছি এবং ফিল্টার সিলেকশনগুলো সেভ করে রাখার ব্যবস্থা করেছি। এখন আমরা অন্য একটি নতুন কাজ শুরু করার জন্য প্রস্তুত। আপনি কোন কাজটি দিয়ে শুরু করতে চান?"
