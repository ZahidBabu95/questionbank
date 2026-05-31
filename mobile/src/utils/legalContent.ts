export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS_OF_SERVICE: Record<'en' | 'bn', LegalDocument> = {
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last Updated: May 2026',
    intro: 'Welcome to AI.QB (QuestionShaper). By accessing or using our mobile application, you agree to comply with and be bound by the following terms and conditions. Please read them carefully.',
    sections: [
      {
        title: '1. Acceptance of Terms',
        content: 'By creating an account or using any service within the AI.QB platform, you acknowledge that you have read, understood, and agreed to these terms. If you do not agree, you must immediately cease using the application.'
      },
      {
        title: '2. Account Responsibility & Eligibility',
        content: 'You are responsible for maintaining the confidentiality of your credentials (username, password, JWT tokens). Any action performed under your account is your sole responsibility. You agree to provide accurate and up-to-date information during signup.'
      },
      {
        title: '3. AI-Generated Material & Verification',
        content: 'AI.QB leverages advanced Artificial Intelligence models (such as Google Gemini) to assist teachers in generating question banks, MCQ exams, and creative questions (CQ). While our algorithms aim for maximum accuracy, AI-generated outputs may occasionally contain errors or inconsistencies. Teachers and institution administrators are strictly required to verify all questions and answers before publishing or distributing them to students.'
      },
      {
        title: '4. Knowledge Hub & Intelligent RAG Context',
        content: 'When uploading textbooks, guidebooks, or institutional materials to the Knowledge Hub, you represent that you possess the necessary copyrights or authorization to digitize and index these documents. The materials are processed and embedded into custom vector spaces (Pinecone) exclusively for your institutional tenant context and will not be shared with unauthorized third parties.'
      },
      {
        title: '5. Prohibited Use',
        content: 'You agree not to bypass API limits, abuse the Google API key rotation pool, deploy automated scrapers, or reverse-engineer the Nexus Paper Engine editor. Any attempt to disrupt server resources will result in immediate account termination.'
      },
      {
        title: '6. Subscription Plans & Quota Limits',
        content: 'Access to premium AI templates, parallel worker setups, and bulk page extraction is limited by your active billing package. Quotas are refreshed monthly according to your package type.'
      },
      {
        title: '7. Limitation of Liability',
        content: 'AI.QB is provided "as is" without warranties of any kind. Under no circumstances shall QuestionShaper or its parent organization be liable for academic discrepancies, grading errors, or server downtimes.'
      }
    ]
  },
  bn: {
    title: 'ব্যবহারের শর্তাবলী (Terms of Service)',
    lastUpdated: 'সর্বশেষ আপডেট: মে ২০২৬',
    intro: 'AI.QB (QuestionShaper) প্ল্যাটফর্মে আপনাকে স্বাগতম। এই অ্যাপ্লিকেশনটি ব্যবহারের মাধ্যমে আপনি আমাদের ব্যবহারের শর্তাবলীতে পূর্ণ সম্মতি প্রকাশ করছেন। অনুগ্রহ করে শর্তাবলী মনোযোগ সহকারে পড়ুন।',
    sections: [
      {
        title: '১. শর্তাবলীর গ্রহণযোগ্যতা',
        content: 'অ্যাকাউন্ট তৈরি বা অ্যাপ্লিকেশনের যেকোনো সেবা গ্রহণের মাধ্যমে আপনি এই শর্তাবলী পড়েছেন, বুঝেছেন এবং এতে সম্মত হয়েছেন বলে গণ্য হবে। আপনি যদি এই শর্তাবলীতে একমত না হন, তবে অবিলম্বে অ্যাপের ব্যবহার বন্ধ করুন।'
      },
      {
        title: '২. অ্যাকাউন্ট নিরাপত্তা ও দায়িত্বাবলী',
        content: 'আপনার অ্যাকাউন্টের ক্রেডেনশিয়াল (ব্যবহারকারীর নাম, পাসওয়ার্ড ও জেডব্লিউটি টোকেন) গোপন রাখার দায়িত্ব সম্পূর্ণ আপনার। আপনার অ্যাকাউন্টের অধীনে সংঘটিত সকল কার্যকলাপের জন্য আপনি দায়ী থাকবেন। রেজিস্ট্রেশনের সময় সঠিক ও হালনাগাদ তথ্য প্রদান করা বাধ্যতামূলক।'
      },
      {
        title: '৩. এআই-জেনারেটেড কন্টেন্ট ও যাচাইকরণ',
        content: 'AI.QB প্ল্যাটফর্মটি শিক্ষকদের প্রশ্নপত্র প্রণয়ন, এমসিকিউ (MCQ) এবং সৃজনশীল প্রশ্ন (CQ) দ্রুত তৈরির সুবিধার্থে কৃত্রিম বুদ্ধিমত্তা (যেমন Google Gemini API) ব্যবহার করে থাকে। যদিও আমাদের এআই সিস্টেম অত্যন্ত নির্ভুল ফলাফল দেওয়ার চেষ্টা করে, তবুও এতে ভুলত্রুটি বা অসঙ্গতি থাকতে পারে। শিক্ষার্থীদের মাঝে বিতরণের পূর্বে যেকোনো প্রশ্ন ও উত্তর শিক্ষকদের অবশ্যই নিজস্ব দায়িত্বে যাচাই করে নিতে হবে।'
      },
      {
        title: '৪. নলেজ হাব ও ইন্টেলিজেন্ট আরএজি (RAG) প্রসেস',
        content: 'নলেজ হাব-এ কোনো বই, গাইড বই বা প্রাতিষ্ঠানিক স্টাডি ম্যাটেরিয়াল আপলোড করার পূর্বে নিশ্চিত করুন যে সেটির কপিরাইট বা আপলোড করার প্রয়োজনীয় অনুমতি আপনার আছে। আপলোডকৃত ফাইলসমূহ Pinecone ভেক্টর ডাটাবেসে সেম্যান্টিক চাঙ্কস হিসেবে এনক্রিপ্টেড অবস্থায় থাকবে, যা শুধুমাত্র আপনার প্রতিষ্ঠানের ব্যবহারকারীদের অ্যাক্সেসের জন্য সীমাবদ্ধ রাখা হবে।'
      },
      {
        title: '৫. নিষিদ্ধ ব্যবহার',
        content: 'আপনি এআই কী রোটেশন সিস্টেমের অপব্যবহার, ব্যাকএন্ড এপিআই রিভার্স-ইঞ্জিনিয়ারিং, অথবা স্ক্র্যাপার ব্যবহার করে সিস্টেম লোড বাড়ানোর চেষ্টা করতে পারবেন না। যেকোনো প্রকার ক্ষতিকর কার্যক্রম ধরা পড়লে আপনার অ্যাকাউন্ট তাৎক্ষণিকভাবে বাতিল করার অধিকার আমরা রাখি।'
      },
      {
        title: '৬. সাবস্ক্রিপশন ও লিমিটেশন',
        content: 'প্রফেশনাল টেমপ্লেট ব্যবহার, প্যারালাল চ্যাপ্টার সিঙ্কিং এবং এআই জেনারেশনের কোটা আপনার সক্রিয় বিলিং প্যাকেজ বা প্ল্যানের উপর নির্ভর করে নির্ধারিত হবে। প্যাকেজ অনুযায়ী প্রতি মাসে আপনার কোটা হালনাগাদ করা হবে।'
      },
      {
        title: '৭. দায়ের সীমাবদ্ধতা',
        content: 'AI.QB প্ল্যাটফর্মটি "যেমন আছে" (as is) ভিত্তিতে প্রদান করা হচ্ছে। পরীক্ষার ফলাফল প্রকাশে অসঙ্গতি, প্রশ্নপত্রের কোনো ত্রুটি বা সাময়িক সার্ভার বিভ্রাটের কারণে প্ল্যাটফর্ম বা এর ডেভেলপার টিম কোনো প্রকার আর্থিক বা আইনি দায়ের আওতাভুক্ত হবে না।'
      }
    ]
  }
};

export const PRIVACY_POLICY: Record<'en' | 'bn', LegalDocument> = {
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last Updated: May 2026',
    intro: 'Your privacy is critical to us. This Privacy Policy describes how AI.QB (QuestionShaper) collects, stores, protects, and utilizes personal and academic data when you interact with our mobile application.',
    sections: [
      {
        title: '1. Information We Collect',
        content: 'We collect personal identification details such as your full name, email address, phone number, and institution details during registration. If you purchase subscription packages, transaction data is processed securely through gateway services.'
      },
      {
        title: '2. Document & Resource Data',
        content: 'Textbooks, images, and worksheets uploaded to the Knowledge Hub are stored in safe cloud repositories (Cloudflare R2/S3). These files are strictly parsed into markdown and digitized chunks solely to enhance the cognitive capabilities of your private institutional chatbot/question generator.'
      },
      {
        title: '3. Processing and RAG Embedding',
        content: 'To power our RAG (Retrieval-Augmented Generation) workspace, digitized texts are segmented and sent to embedding servers to generate semantic vector dimensions stored on Pinecone. We guarantee that your academic resources are never shared with third parties or used to train public AI models.'
      },
      {
        title: '4. Use of Google AI & Security Rules',
        content: 'We utilize API connections to Google Gemini to automate question extraction. No personally identifiable data is sent to AI processors; only raw book texts and curriculum schemas are transmitted. Our high-performance rotation pool ensures all connections remain encrypted.'
      },
      {
        title: '5. Security Protocols',
        content: 'We enforce industry-standard security architectures including JWT authorization tokens, HTTPS/SSL protocols, database row-level multitenant filtering (TenantContext), and secure storage (AsyncStorage) on your physical mobile device.'
      },
      {
        title: '6. User Controls and Data Deletion',
        content: 'You have complete control over your files. You can delete uploaded books, topics, draft questions, or your entire user profile directly from the dashboard settings. Upon deletion, all associated Pinecone vector dimensions are cleared immediately.'
      }
    ]
  },
  bn: {
    title: 'গোপনীয়তা নীতি (Privacy Policy)',
    lastUpdated: 'সর্বশেষ আপডেট: মে ২০২৬',
    intro: 'আপনার ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্যের নিরাপত্তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। AI.QB (QuestionShaper) মোবাইল অ্যাপ্লিকেশনটি ব্যবহার করার সময় আমরা কীভাবে আপনার তথ্য সংগ্রহ, সংরক্ষণ ও ব্যবহার করি, তা নিচে স্পষ্ট করা হলো।',
    sections: [
      {
        title: '১. সংগৃহীত তথ্যাবলী',
        content: 'রেজিস্ট্রেশনের সময় আমরা আপনার নাম, ইমেইল এড্রেস, ফোন নম্বর এবং প্রতিষ্ঠানের নাম সংগ্রহ করি। পেমেন্ট গেটওয়ের মাধ্যমে সাবস্ক্রিপশন সম্পন্ন করার সময় পেমেন্ট সংক্রান্ত তথ্য অত্যন্ত নিরাপদ চ্যানেলের মাধ্যমে প্রসেস করা হয়।'
      },
      {
        title: '২. ডকুমেন্ট ও রিসোর্স ডেটা',
        content: 'নলেজ হাব-এ আপনার আপলোড করা বইয়ের পিডিএফ বা ছবি নিরাপদ ক্লাউড স্টোরেজে (Cloudflare R2/S3) সংরক্ষিত থাকে। এই ফাইলগুলোকে টেক্সটে রূপান্তর করে শুধুমাত্র আপনার ব্যক্তিগত বা প্রাতিষ্ঠানিক প্রশ্নপত্র প্রণয়ন কাজের সুবিধার্থে কাজে লাগানো হয়।'
      },
      {
        title: '৩. আরএজি (RAG) ও ভেক্টর প্রসেসিং',
        content: 'বইয়ের তথ্যগুলোকে কার্যকরভাবে খোঁজার জন্য আমরা সেগুলোকে ছোট ছোট চাঙ্কে রূপান্তর করে Pinecone ভেক্টর ডাটাবেসে সেভ করি। আমরা নিশ্চয়তা দিচ্ছি যে আপনার আপলোডকৃত কোনো ফাইল বা বুদ্ধিবৃত্তিক সম্পদ অন্য কোনো পাবলিক এআই মডেল প্রশিক্ষণের জন্য পাঠানো হবে না।'
      },
      {
        title: '৪. গুগল এআই (Gemini) সংযোগ ও নিরাপত্তা',
        content: 'প্রশ্নপত্র জেনারেশনের জন্য গুগল এআই এপিআই ব্যবহারের সময় কোনো প্রকার ব্যক্তিগত তথ্য পাঠানো হয় না; শুধুমাত্র সিলেক্টেড চ্যাপ্টারের টেক্সট পাঠানো হয়। এপিআই কী রোটেশন পুলের মাধ্যমে সকল রিকোয়েস্ট অত্যন্ত নিরাপদে সম্পন্ন করা হয়।'
      },
      {
        title: '৫. ডেটা সিকিউরিটি প্রোটোকল',
        content: 'আপনার ডেটার নিরাপত্তা নিশ্চিতে আমরা এন্টারপ্রাইজ-গ্রেড সিকিউরিটি যেমন JWT টোকেন, HTTPS/SSL এনক্রিপশন, মাল্টি-টিন্যান্ট ডেটাবেস ফিল্টারিং এবং মোবাইল ডিভাইসের লোকাল সিকিউর স্টোরেজ ব্যবহার করে থাকি।'
      },
      {
        title: '৬. অ্যাকাউন্ট ও ডেটা মুছে ফেলা (Deletion)',
        content: 'আপনার আপলোড করা ফাইল বা প্রশ্নপত্রের উপর আপনার সম্পূর্ণ নিয়ন্ত্রণ রয়েছে। আপনি যেকোনো সময় ড্যাশবোর্ড থেকে আপনার আপলোড করা বই বা সম্পূর্ণ প্রোফাইল মুছে ফেলতে পারবেন। মুছে ফেলার সাথে সাথে Pinecone ভেক্টর ডাটাবেস থেকে সংশ্লিষ্ট সকল ডেটা চিরতরে রিমুভ করা হবে।'
      }
    ]
  }
};
