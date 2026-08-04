# 🛠️ Question Shaper Custom API Development Skill & Architecture Guide

এই ডকুমেন্টটিতে **Question Shaper** প্রজেক্টে যেকোনো নতুন **Custom API / Public Mobile API / Integration Endpoint** তৈরি করার সময় অনুসরণীয় আর্কিটেকচার, সিকিউরিটি স্ট্যান্ডার্ড, অটো-ক্যাটাগরাইজেশন এবং এপিআই ম্যানেজার ইন্টিগ্রেশনের সমস্ত নিয়মাবলি বিস্তারিত লিপিবদ্ধ রাখা হলো।

---

## 🎯 ১. প্রধান উদ্দেশ্য (Core Objective)

যখনই ব্যবহারকারী নতুন কোনো **Custom API** বা **Mobile Shared API** তৈরি করতে বলবেন, এই গাইডের নির্দেশাবলি মেনে ব্যাকএন্ড কন্ট্রোলার, সিকিউরিটি ফিল্টার, এপিআই ম্যানেজার গ্রুপ ফিল্টার এবং ফ্রন্টএন্ড টুলিং ১০০% নিখুঁতভাবে তৈরি করতে হবে।

---

## 🛡️ ২. সিকিউরিটি ও হেডার ভ্যালিডেশন স্ট্যান্ডার্ড (Security Rules)

১. **Global App Secret Key (`X-APP-SECRET-KEY`):**
   * যেকোনো পাবলিক বা কাস্টম মোবাইল এপিআই-তে ব্যাকএন্ড ফিল্ড থাকবে:
     ```java
     @org.springframework.beans.factory.annotation.Value("${testshaper.mobile.app-secret-key:QS-MOBILE-SEC-849201}")
     private String appSecretKey;
     ```
   * এপিআই মেথডে রিকোয়েস্ট হেডার রিসিভ ও ভ্যালিডেট করতে হবে:
     ```java
     @GetMapping("/api/v1/public/custom-path/{code}")
     public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomData(
             @PathVariable String code,
             @RequestHeader(value = "X-APP-SECRET-KEY", required = false) String requestSecretKey) {
         
         if (requestSecretKey == null || !requestSecretKey.trim().equals(appSecretKey)) {
             throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing X-APP-SECRET-KEY header. Access Denied.");
         }
         ...
     }
     ```

২. **মেথড লেভেল চেক (Built-in Validations):**
   * **Sanitization:** `String cleanCode = code.trim().toUpperCase();`
   * **Deleted Check:** `if (entity.isDeleted()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);`
   * **Privacy Check:** `if (!entity.isPublicShared() && entity.getStatus() == Status.DRAFT) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);`

৩. **Spring Security Rule (`SecurityConfig.java`):**
   * পাবলিক/কাস্টম এপিআই রুটগুলোকে [SecurityConfig.java](file:///g:/Dev-Pro/Question%20Shaper/backend/src/main/java/com/testshaper/config/SecurityConfig.java)-এ `.requestMatchers("/api/v1/public/**").permitAll()` এর অধীনে রাখতে হবে।

---

## 🏷️ ৩. ক্যাটাগরি ও অটো-গ্রুপিং স্ট্যান্ডার্ড (`AiToolScannerService.java`)

১. **কন্ট্রোলার ক্যাটালগ রুল:**
   * নতুন কন্ট্রোলার তৈরি হলে [AiToolScannerService.java](file:///g:/Dev-Pro/Question%20Shaper/backend/src/main/java/com/testshaper/service/AiToolScannerService.java)-এর `getCategoryFromController` মেথডের **একেবারে উপরে** রুল যুক্ত করতে হবে:
     ```java
     private String getCategoryFromController(String beanName) {
         if (beanName.contains("PublicExamShare") || beanName.contains("CustomShare") || beanName.contains("YourNewController")) {
             return "⭐ কাস্টম এপিআই ফর শেয়ার";
         }
         ...
     }
     ```

২. **ড্রপডাউন সর্টিং ([ApiManager.jsx](file:///g:/Dev-Pro/Question%20Shaper/frontend/src/pages/admin/Settings/ApiManager.jsx)):**
   * `⭐` অথবা `কাস্টম` থাকা ক্যাটাগরিগুলোকে এপিআই ম্যানেজার ড্রপডাউনে **'ALL'** অপশনের ঠিক পরেই সবার উপরে সর্ট করে দেখাতে হবে।

---

## 📦 ৪. রেসপন্স ফরম্যাট স্ট্যান্ডার্ড (`ApiResponse`)

১. **সঠিক ইম্পোর্ট প্যাকেজ:**
   * `ApiResponse` ক্লাসের জন্য অবশ্যই `import com.testshaper.common.ApiResponse;` ব্যবহার করতে হবে (কখনোই `com.testshaper.dto` নয়)।

২. **ডাটা প্যাকেজিং:**
   * `Map<String, Object>` ব্যবহার করে প্রপার্টি লেবেলগুলো পরিষ্কারভাবে সাজাতে হবে (`title`, `marks`, `durationMinutes`, `questions`, `options`)।
   * উত্তরপত্র ও কুইজ অটো-গ্রেডিংয়ের জন্য প্রতিটি অপশনে `isCorrect: true/false` ফ্ল্যাগ নিশ্চিত করতে হবে।

---

## 🌐 ৫. এপিআই ম্যানেজার UI ও ডোমেইন সাপোর্ট ([ApiManager.jsx](file:///g:/Dev-Pro/Question%20Shaper/frontend/src/pages/admin/Settings/ApiManager.jsx))

১. **Dynamic Domain Resolution:**
   * ইউআরএল তৈরির সময় `window.location.origin.replace(':5173', ':8080') + '/api' + path` ব্যবহার করতে হবে যেন লোকালহোস্ট ও লাইভ প্রোডাকশন ডোমেইনে স্বয়ংক্রিয়ভাবে সঠিক লাইভ লিংক তৈরি হয়।

২. **ওয়ান-ক্লিক বাটনসমূহ:**
   * **`[ 📋 Copy Full API URL ]`**: সম্পূর্ণ ডোমেইন লিংক কপি করে।
   * **`[ 🛡️ সিকিউরিটি কোড কপি ]`**: `X-APP-SECRET-KEY: QS-MOBILE-SEC-849201` কপি করে।
   * **`Copy cURL`**: `-H "X-APP-SECRET-KEY: QS-MOBILE-SEC-849201"` সহ cURL কমান্ড তৈরি করে।

---

## 🗣️ ৬. ভাষা নীতি (Communication Rule)

* সমস্ত কোড ডকুমেন্টেশন, ইমপ্লিমেন্টেশন প্ল্যান, ওয়াকথ্রু এবং ব্যবহারকারীর সাথে উত্তর আদান-প্রদান **বাধ্যতামূলকভাবে বাংলা ভাষায়** হতে হবে।

---
*Created and persistent as Skill Specification for Question Shaper Agent.*
