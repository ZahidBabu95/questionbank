# QuestionShaper — Last Session Notes
> ⚡ লোডসেডিং-এর কারণে context হারানো রোধে এই ফাইলটি প্রতিটি কাজের পর আপডেট করা হয়

---

## 📅 চলমান সেশন: 2026-05-09
**অবস্থান:** Epic 3 - Nexus Editor & Question Revision Workflow

---

## 🛠️ প্রগ্রেস রিপোর্ট (Progress Report)

### 📊 Backend & API Updates
| ✅ COMPLETED | **Question Revision API Enhancement:** `QuestionController.java`-এর `reviseQuestion` এপিআই আপডেট করা হয়েছে। এটি এখন রিভিশন তৈরি করার পর শুধুমাত্র আইডি নয়, বরং সম্পূর্ণ রিভাইজড প্রশ্ন ডেটা (`data: savedRevision`) ফ্রন্টএন্ডে রিটার্ন করে। | `QuestionController.java` |
| ✅ COMPLETED | **My Pending Revisions Endpoint:** ইউজারের নিজের করা পেন্ডিং রিভিশনগুলো (অ্যাপ্রুভ হওয়ার আগের ভার্সন) ফেচ করার জন্য `/api/v1/questions/my-revisions` এন্ডপয়েন্ট এবং ব্যাকএন্ড সার্ভিস তৈরি করা হয়েছে। | `QuestionController.java`, `QuestionServiceImpl.java` |
| ✅ COMPLETED | **Super Admin Recycle Bin:** ডিলিট হওয়া এক্সাম পেপারগুলো (Soft Deleted) ম্যানেজ করার জন্য সুপার অ্যাডমিনদের জন্য Recycle Bin API তৈরি করা হয়েছে। Native SQL Query ব্যবহার করে `findAllDeleted`, `restore`, `hardDelete` এবং `emptyRecycleBin` মেথডগুলো তৈরি করা হয়েছে। | `ExamGenerationServiceImpl.java`, `ExamRepository.java`, `ExamGenerationController.java` |
| ✅ COMPLETED | **Foreign Key & Sort Fixes:** Recycle Bin থেকে এক্সাম হার্ড ডিলিট করার সময় ফরেইন-কি কন্সট্রেইন্ট (1451) এবং Native SQL-এ Sort কলামের সমস্যা (1054) সমাধান করা হয়েছে। এক্সাম ডিলিট করার আগে এর সাথে যুক্ত প্রশ্ন এবং রুলস ডিলিট করার লজিক যুক্ত করা হয়েছে। | `ExamGenerationServiceImpl.java`, `ExamRepository.java` |

### 📊 Frontend Development
| ✅ COMPLETED | **Revise Mode in Nexus Editor:** এডিটরের ক্যানভাস থেকে সরাসরি প্রশ্ন রিভাইজ করার জন্য "Revise" বাটনে ইভেন্ট `nexusReviseRequested` ফায়ার করা হয়েছে, যা নতুন ট্যাবের বদলে সরাসরি ইনলাইন কাজ করবে। | `QuestionBlockNode.jsx` |
| ✅ COMPLETED | **Inline Revision Modal & Instant Swap:** `LeftSidebar.jsx`-এ একটি রিভিশন মোডাল যুক্ত করা হয়েছে যা `QuestionEdit.jsx` (forceMode="revise") লোড করে। সফল রিভিশন সাবমিটের পর এটি স্বয়ংক্রিয়ভাবে ক্যানভাসে পুরনো প্রশ্নটিকে নতুন রিভাইজড প্রশ্ন দিয়ে রিপ্লেস করে দেয়। | `LeftSidebar.jsx` |
| ✅ COMPLETED | **QuestionEdit Component Upgrade:** `QuestionEdit.jsx`-কে আরও নমনীয় করা হয়েছে যাতে এটি ইনলাইন মোডাল হিসেবে কাজ করতে পারে। স্ট্যান্ডএলোন নতুন ট্যাবে ওপেন হলে সাবমিটের পর স্বয়ংক্রিয়ভাবে ট্যাব ক্লোজ হওয়ার ফলব্যাক লজিক যুক্ত করা হয়েছে (close fail হলে List-এ নেভিগেট করবে)। | `QuestionEdit.jsx` |
| ✅ COMPLETED | **My Saved Questions Sync:** ইউজারের তৈরি করা ম্যানুয়াল এক্সাম বা এডিটর সোয়াপের মাধ্যমে ব্যবহৃত প্রশ্নগুলো স্বয়ংক্রিয়ভাবে তার `My Saved Questions`-এ ফেভারিট হিসেবে যুক্ত হওয়ার রিয়েল-টাইম সিঙ্ক মেকানিজম যুক্ত করা হয়েছে। | `QuestionList.jsx`, `ManualExamServiceImpl.java` |
| ✅ COMPLETED | **Revision Draft Missing Options Bug:** `QuestionServiceImpl` এর `submitRevision` মেথডে একটি বাগ ফিক্স করা হয়েছে যেখানে ড্রাফট সেভ করার সময় `options` গুলো L1 Cache-এ যুক্ত হতো না। ফলে রিভিশন সাবমিট করার পর ক্যানভাসে MCQ অপশনগুলো উধাও হয়ে যেত (১ নম্বর প্রশ্নের বাগ)। | `QuestionServiceImpl.java` |
| ✅ COMPLETED | **Nexus Editor Dead Link Bug:** `LeftSidebar.jsx`-এ রিভিশন সোয়াপ করার লজিক ফিক্স করা হয়েছে। এখন রিভাইজ করার পর ক্যানভাসে ড্রাফট আইডির বদলে আসল প্রশ্নের আইডি ধরে রাখা হয়, যাতে Paper সেভ করার পর এবং অ্যাডমিন অ্যাপ্রুভ করার পর ডেড-লিংক এরর (404) না হয়। | `LeftSidebar.jsx` |
| ✅ COMPLETED | **Revision UI/UX Redesign:** ইউজারদের জন্য ইনলাইন রিভিশন পপআপ (LeftSidebar) এবং `RevisePanel` ড্রয়ার রিডিজাইন করে আরও প্রফেশনাল এবং ক্লিন লুক দেওয়া হয়েছে। এছাড়া AI প্রিফিক্স ক্লিনআপ ফাংশন (`stripOptionPrefix`) RevisePanel-এ যুক্ত করা হয়েছে। | `LeftSidebar.jsx`, `RevisePanel.jsx` |
| ✅ COMPLETED | **Pending Revision Auto-Hydration:** `NexusEditor`-এ পেজ রিলোড করার পরেও যেন ইউজারের নিজের করা পেন্ডিং রিভিশনগুলো অটোমেটিক্যালি ক্যানভাসে রেন্ডার হয়, তার জন্য `useExamManager`-এ DOMParser ব্যবহার করে প্রশ্ন লোড হওয়ার আগেই ডাটাবেস থেকে রিয়েল-টাইমে সোয়াপিং লজিক ইমপ্লিমেন্ট করা হয়েছে। | `useExamManager.js`, `questionService.js` |

---

## 🎯 পূর্ববর্তী কাজগুলো (Backlog)
1. **Nexus Editor Inline Editing:** `STRICT_LINKED` মোডে থাকা প্রশ্নের ছোটখাটো বানান ঠিক করার জন্য ইনলাইন এডিটিং ফিচার চালু করা।
2. **Real-time Allocation Validation:** ড্র্যাগ-অ্যান্ড-ড্রপের সময় ক্যানভাসে টোটাল মার্কস লিমিট চেক করার সিস্টেম।
3. **Subscription Invoice Generation:** মাল্টি-ভার্সন প্রাইসিং অনুযায়ী ইনভয়েস জেনারেট এবং পেমেন্ট গেটওয়ে ইন্টিগ্রেশন।

---

## 📞 পরের সেশনে প্রথম বার্তা

> "আমরা সেশন ম্যানেজমেন্টের স্ট্যাবিলিটি ইস্যু ফিক্স করেছি এবং সুপার অ্যাডমিনদের জন্য এক্সাম পেপারের Recycle Bin ফিচার সফলভাবে তৈরি করেছি। এখন ডিলিট হওয়া এক্সাম রিস্টোর বা পার্মানেন্টলি ক্লিন করা যাবে। আপনার পরবর্তী কাজ কী হবে?"
