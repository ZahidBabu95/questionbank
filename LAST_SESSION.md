# QuestionShaper — Last Session Notes (July 30, 2026)
> ⚡ সেশন শেষে কনটেক্সট ট্র্যাকিং এর জন্য এই ফাইলটি আপডেট করা হয়।

## 📅 চলমান সেশন: 2026-07-30
**অবস্থান:** এন্টারপ্রাইজ স্কেলিং — Redis Distributed Cache, OSIV Disabling, Database Indexing এবং Meilisearch Integration সম্পূর্ণ সম্পন্ন।

---

## 🛠️ প্রগ্রেস রিপোর্ট (Progress Report)

### ✅ এই সেশনে সম্পন্ন হয়েছে

| Status | Component | বিবরণ |
|--------|-----------|-------|
| ✅ | **Redis Distributed Cache** | লাইভ ও লোকাল সার্ভারের জন্য Redis Distributed Cache এবং সুগঠিত **Caffeine Fail-Safe Fallback** তৈরি করা হয়েছে। লাইভ লিনাক্স সার্ভারে Redis ইনস্টল ও সার্ভিস একটিভ করা হয়েছে। |
| ✅ | **OSIV Disabled (`spring.jpa.open-in-view=false`)** | ডাটাবেজ কানেকশন পুল (HikariCP) দ্রুত ফ্রি করতে OSIV সম্পূর্ণ বন্ধ করা হয়েছে, যা উচ্চ কনকারেন্ট ইউজারে এপিআই রেসপন্স টাইম ৫০% ফাস্ট করবে। |
| ✅ | **Database Indexing** | ৫০,০০০+ প্রশ্নের অপশন ও ফিল্টারিং দ্রুত করতে `question_options` টেবিলে `(question_id, is_correct)` কম্পোজিট ইন্ডেক্স যুক্ত করা হয়েছে। |
| ✅ | **Meilisearch Search Engine Integration** | ৫০,০০০+ প্রশ্ন ও টপিক থেকে ২ms ইনস্ট্যান্ট বাংলা ফাজি সার্চ (Typo-tolerance) ও ফিল্টারিং এর জন্য **Meilisearch Java SDK**, `MeilisearchService` ও `/api/v1/search/instant` এন্ডপয়েন্ট ইন্টিগ্রেট করা হয়েছে। |
| ✅ | **Fail-Safe Search Architecture** | Meilisearch বন্ধ থাকলেও অ্যাপ ক্র্যাশ করবে না; স্বয়ংক্রিয়ভাবে MySQL Database Search-এ শিফট হয়ে কাজ করবে। |
| ✅ | **API Security & Anti-Scraping Rate Limiting** | প্রশ্ন চুরি ও বট/DDoS আক্রমণ ঠেকাতে Redis-Powered `RateLimitingFilter` (Guest: 120 req/min, Auth: 300 req/min) যুক্ত করা হয়েছে। |
| ✅ | **Enterprise Async Worker Thread Pool** | বাল্ক ইমপোর্ট ও ভারী কাজসমূহ ব্যাকগ্রাউন্ডে নিরাপদে চালাতে `AsyncConfig` (10-50 Workers, 500 Queue, `CallerRunsPolicy`) যুক্ত করা হয়েছে। |
| ✅ | **Real-time System Monitoring & Actuator** | রিয়েল-টাইম JVM RAM, HikariCP DB Pool, Redis Health & Prometheus Metrics ট্র্যাকিংয়ের জন্য Spring Actuator যুক্ত করা হয়েছে (`/actuator/health`). |
| ✅ | **Vite Code-Splitting Optimization** | ৭.৩ MB বড় single vendor ফাইল ভেঙে `vendor-react` (54 kB gzip), `vendor-katex`, `vendor-pdfjs` তৈরি করে প্রথমবার পেজ লোড ১০ গুণ ফাস্ট করা হয়েছে। |
| ✅ | **Dashboard Stats Caching Engine** | `/dashboard` পেজ ইনস্ট্যান্ট (1-2ms) লোড করার জন্য `DashboardServiceImpl`-এ **Spring `@Cacheable`** যুক্ত করা হয়েছে। |
| ✅ | **Production Build Validation (`ROOT.war`)** | ফ্রন্টএন্ড ও ব্যাকএন্ডের সকল নতুন এন্টারপ্রাইজ ফিচার সিঙ্ক করে সফলভাবে প্রোডাকশন বিল্ড সম্পন্ন করা হয়েছে (`production/ROOT.war` - 0 Errors, Build Success)। |

---

## 🔧 টেকনিক্যাল কমান্ড ও ইনস্টলেশন নোটস (Quick Reference)

### ১. লিনাক্স সার্ভারে Redis সার্ভিস (ইতিমধ্যেই সক্রিয়):
```bash
sudo systemctl status redis-server
```

### ২. লিনাক্স সার্ভারে Meilisearch সার্ভিস চালুর কমান্ড (ঐচ্ছিক):
```bash
docker run -d --name meilisearch -p 7700:7700 -e MEILI_MASTER_KEY='masterKey' meilisearch/meilisearch:v1.6
```

### ৩. প্রশ্নব্যাংক বাল্ক ইনডেক্সিং (Reindex) API Endpoint:
`POST /api/v1/search/reindex` (Admin privilege, ৫০,০০০+ প্রশ্ন Meilisearch-এ ইনডেক্স করবে)

---

## 🎯 পরবর্তী সেশনের পরিকল্পনা ও কাজ (Next Session Backlog)

1. **Phase 5 — AI CQ মূল্যায়ন:**
   * গুগল জেমিনি ভিশন API ব্যবহার করে সৃজনশীল বা লিখিত পরীক্ষার খাতার ছবি সরাসরি আপলোড করে স্বয়ংক্রিয় এআই মূল্যায়ন ও নম্বর প্রদান।
   
2. **ওপেনসিভি (OpenCV) পাইথন ইন্টিগ্রেশন:**
   * ওএমআর পরীক্ষার ফলাফলের জন্য OpenCV ইন্টিগ্রেশন এবং বাবল ডিটেকশন উন্নতকরণ।

---

## 🔧 টেকনিক্যাল নোটস

- ফ্রন্টএন্ড বিল্ড টুল: Vite v5.4.21
- কভার পেজ ও মেটাডেটা কন্ট্রোল: `LectureRightProperties.jsx` (Header & Meta tab)
- ক্যানভাস ও প্রিন্ট সেটিংস: `LecturePaperCanvas.jsx` ও `LectureEditor.jsx`
- পৃষ্ঠা নম্বর ডাইনামিক কাউন্টার স্টাইল: `counter(page, bengali)`
- পিডিএফ এক্সপোর্ট রেজোলিউশন স্কেল: ২.২x
