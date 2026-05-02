# QuestionShaper - Production Deployment & Debugging History

এই ফাইলটিতে QuestionShaper প্রজেক্টের Production (Tomcat) Deployment-এ ফেস করা জটিল এরর, তাদের সমাধান এবং ভবিষ্যতের জন্য গাইডলাইন দেওয়া হলো। যে কোনো সময় সার্ভারে বা ডিপ্লয়মেন্টে সমস্যা হলে এআই (AI/Copilot)-কে এই ফাইলের কন্টেক্সট দিলে সে খুব দ্রুত আগের হিস্ট্রি বুঝতে পারবে।

---

## 🛑 ১. পূর্বে কী কী সমস্যা হয়েছিল? (The Problems)

1. **SPA (React) Routing Infinite Loop & StackOverflow:** 
   - সার্ভারে কোনো ফাইল মিসিং থাকলে (যেমন `favicon.ico`), Spring Boot সেটাকে 404 ধরে `/error` পাথে পাঠাতো। 
   - `SpaController`-এ থাকা Regex `[^.]+` ভুলবশত `/error` কে ক্যাচ করে তাকে আবার `index.html`-এ ফরোয়ার্ড করতো, যা একটি Infinite Loop এবং StackOverflow Error তৈরি করতো।
2. **Whitelabel Error Page on 401 Unauthorized:** 
   - Spring Security টোকেন না থাকলে JSON রেসপন্স দেওয়ার বদলে ডিফল্ট HTML Whitelabel Error Page দেখাচ্ছিল, যা React Frontend-কে ক্র্যাশ করাচ্ছিল।
3. **Corrupted WAR Build (Missing .class files):** 
   - পিসিতে `manage.bat` দিয়ে প্রোডাকশন বিল্ড করার সময় ব্যাকগ্রাউন্ডে IntelliJ IDEA-এর অটো-কম্পাইলার চালু থাকায়, শেষ মুহূর্তে `UserMapper.class` ফাইলটি `ROOT.war` থেকে মিসিং হয়ে যায়। এর ফলে সার্ভারে `java.io.FileNotFoundException` এবং `BeanDefinitionStoreException` থ্রো হয়।

---

## ✅ ২. কীভাবে সমাধান করা হয়েছে? (The Solutions)

1. **SpaController.java Refactoring:** 
   - জটিল Regex পুরোপুরি বাদ দিয়ে সবগুলো React Route (যেমন `/dashboard/**`, `/login`, `/questions/**`) **Explicitly (সরাসরি)** বলে দেওয়া হয়েছে। এর ফলে `/error` বা স্ট্যাটিক ফাইল কখনো ভুলবশত `index.html`-এ ফরোয়ার্ড হবে না এবং Loop হবে না।
2. **SecurityConfig.java Fix:** 
   - `authenticationEntryPoint`-এ কাস্টম JSON রেসপন্স (401 Unauthorized) অ্যাড করা হয়েছে।
3. **manage.bat Optimization:** 
   - `taskkill /f /im java.exe` কমান্ডটি রিমুভ করে, শুধুমাত্র 8080 এবং 5173 পোর্টের স্পেসিফিক PID ধরে কিল করার ব্যবস্থা করা হয়েছে যেন পিসির অন্য কোনো সফটওয়্যারের ক্ষতি না হয়।
   - `move /Y` এর বদলে `copy /Y` ব্যবহার করা হয়েছে।
   - বিল্ডের সময় IDE-তে কাজ না করার জন্য Warning অ্যাড করা হয়েছে।

---

## 🚫 ৩. কী কী করা যাবে না? (DON'Ts)

- **Do NOT Edit Files During Build:** `manage.bat` থেকে Option `[3]` চাপার পর বিল্ড চলাকালীন সময়ে **IntelliJ বা VS Code-এ কোনো ফাইল সেভ বা এডিট করা যাবে না**। এটি করলে `.class` ফাইল গায়েব হয়ে WAR ফাইল Corrupt হয়ে যাবে।
- **Do NOT Use Regex for SPA Routing:** ভবিষ্যতে নতুন কোনো পেইজ বানালে `SpaController`-এ কখনো Regex ব্যবহার করবেন না, বরং পাথের নাম সরাসরি অ্যাড করে দেবেন।
- **Do NOT Keep Old WARs:** সার্ভারে ডিপ্লয় করার সময় `webapps/` ডিরেক্টরি থেকে পুরনো `ROOT` ফোল্ডার এবং `ROOT.war` ডিলিট না করে কখনোই নতুন WAR আপলোড করবেন না।

---

## 💡 ৪. কী কী করতে হবে? (DOs & Best Practices)

- **সার্ভার রিস্টার্ট করার সঠিক নিয়ম:**
  ```bash
  cd /usr/aminul/apache-tomcat-10.1.52/bin/
  sudo sh ./shutdown.sh
  sleep 5
  cd ../webapps/
  sudo rm -rf ROOT ROOT.war
  # এরপর নতুন ROOT.war আপলোড করুন
  cd ../bin/
  sudo sh ./startup.sh
  sudo cat ../logs/catalina.out
  ```
- **নতুন রাউট যুক্ত করা:** React-এ নতুন কোনো Main Route তৈরি করলে অবশ্যই ব্যাকএন্ডের `SpaController.java`-তে সেই নামটি যুক্ত করে দেবেন যেন রিফ্রেশ করলে 404 না আসে।

---

## 🔄 ৫. ভবিষ্যতে AI-কে কীভাবে এই হিস্ট্রি দেবেন?

ভবিষ্যতে সার্ভারে কোনো এরর বা 404 সমস্যা হলে, AI-কে শুধু এই কথাটি প্রম্পটে বলে দিন:
> *"সার্ভারে ডিপ্লয়মেন্ট নিয়ে একটি সমস্যা হচ্ছে। আমার প্রোজেক্টের রুট ফোল্ডারে থাকা `DEPLOYMENT_HISTORY.md` ফাইলটি পড়ে দেখুন আগের ইতিহাসগুলো কী ছিল এবং সাথে সার্ভারের `catalina.out` লগটি চেক করে সমাধান দিন।"*
