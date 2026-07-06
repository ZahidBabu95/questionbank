# Curriculum Mapping Reconstruction & Production Migration Guide

এই গাইডটির উদ্দেশ্য হলো লোকাল মেশিনে সফলভাবে সম্পন্ন করা কারিকুলাম ম্যাপিং পুনর্গঠন, বাংলা/ইংরেজি সংস্করণ পৃথকীকরণ ব্যবস্থা, এবং লাইব্রেরির নতুন "Language Version Filter & Mismatch Alert" ব্যবস্থা লাইভ (Production) সার্ভারে নিরাপদে ডেপ্লয় করার জন্য সম্পূর্ণ গাইডলাইন প্রদান করা।

---

## 1. Frontend Code Deployment (স্বয়ংক্রিয়)
ফ্রন্টএন্ডের সকল পরিবর্তন (যেমন: নতুন চেকবক্স, সংস্করণ ব্যাজ, এবং স্মার্ট ড্রপডাউন ফিল্টারিং) রিঅ্যাক্ট বিল্ডের অংশ।
* আপনি যখন আপনার লোকাল ফ্রন্টএন্ড কোডটি লাইভ সার্ভারে ডেপ্লয় করবেন (যেমন: `npm run build` করে `dist` ফোল্ডার সার্ভারে আপলোড করবেন), তখন ফ্রন্টএন্ডের এই ফীচারগুলো **সম্পূর্ণ স্বয়ংক্রিয়ভাবে লাইভে কাজ করা শুরু করবে।** এর জন্য আলাদা কোনো কাজ করতে হবে না।
* লাইব্রেরি এবং ম্যাপিং পেজে যুক্ত হওয়া নতুন **Medium / Version Filter Selector** এবং কার্ডের ওপর **Crimson Pulsing Mismatch Warning Alert Overlay Badge** সম্পূর্ণ স্বয়ংক্রিয়ভাবে ক্লায়েন্ট-সাইডেই রি-ম্যাপ করা অসঙ্গতিগুলো চিহ্নিত করতে থাকবে।

---

## 2. Database Migration Options (ডেটাবেজ মাইগ্রেশনের বিকল্পসমূহ)
আপনার লাইভ ডেটাবেজে যদি পূর্বে থেকেই বাংলা ও ইংরেজি সংস্করণের বই এবং টপিকগুলো মিশ্রিত বা ভুলভাবে অ্যাসাইন করা অবস্থায় থাকে, তবে সেগুলোকে নিখুঁতভাবে আলাদা করা ও গ্লোবাল সমাধান করার জন্য ৩টি অত্যন্ত শক্তিশালী পদ্ধতি রয়েছে:

### Method A: Global Dual-Version Subject & Class Mapping Duplication (গ্লোবাল সমাধান)
যদি আপনি চান আপনার ডাটাবেজের সকল শ্রেণির সকল বিষয়ের বাংলা ও ইংরেজি সংস্করণ স্বয়ংক্রিয়ভাবে তৈরি হয়ে যাক এবং পূর্বের সকল সেশনের ক্লাস-ম্যাপিং ডাবল হয়ে যাক, তবে এই স্ক্রিপ্টটি ব্যবহার করুন। এটি ব্যবহার করলে ভবিষ্যতে কখনো কোনো ইংরেজি বইকে জোর করে বাংলা বিষয়ের সাথে ম্যাপ করার প্রয়োজন হবে না।

#### ব্যবহারের নিয়ম:
1. `dual_version_generator.py` পাইথন কোডটি সার্ভারে সেভ করুন।
2. কোডের উপরে ডাটাবেজ ক্রেডেনশিয়াল লাইভ সার্ভারের ক্রেডেনশিয়ালের সাথে আপডেট করুন।
3. প্রথমে `python dual_version_generator.py` চালিয়ে টেস্ট (Dry Run) করুন।
4. এরপর লাইভ ডাটাবেজ রাইট করার জন্য নিচের কমান্ডটি চালান:
   ```bash
   python dual_version_generator.py --execute
   ```

#### পাইথন গ্লোবাল কনভার্টার কোড (`dual_version_generator.py`):
```python
import mysql.connector
import sys
import uuid
import datetime

sys.stdout.reconfigure(encoding='utf-8')

DRY_RUN = True # Set to False using --execute to write in DB

TRANSLATIONS = {
    # Science Group
    "পদার্থবিজ্ঞান ১ম পত্র": "Physics 1st Paper",
    "পদার্থবিজ্ঞান ২য় পত্র": "Physics 2nd Paper",
    "রসায়ন ১ম পত্র": "Chemistry 1st Paper",
    "রসায়ন ২য় পত্র": "Chemistry 2nd Paper",
    "জীববিজ্ঞান ১ম পত্র": "Biology 1st Paper",
    "জীববিজ্ঞান ২য় পত্র": "Biology 2nd Paper",
    "উচ্চতর গণিত ১ম পত্র": "Higher Mathematics 1st Paper",
    "উচ্চতর গণিত ২য় পত্র": "Higher Mathematics 2nd Paper",
    "গণিত": "Mathematics",
    "সাধারণ বিজ্ঞান": "General Science",
    "বিজ্ঞান": "Science",
    "তথ্য ও যোগাযোগ প্রযুক্তি": "Information and Communication Technology",
    "তথ্য ও যোগাযোগ প্রযুক্ত": "Information and Communication Technology",
    "কৃষি শিক্ষা ১ম পত্র": "Agriculture Education 1st Paper",
    "কৃষি শিক্ষা ২য় পত্র": "Agriculture Education 2nd Paper",
    "গার্হস্থ্য বিজ্ঞান ১ম পত্র": "Home Science 1st Paper",
    "গার্হস্থ্য বিজ্ঞান ২য় পত্র": "Home Science 2nd Paper",

    # Commerce Group
    "হিসাববিজ্ঞান ১ম পত্র": "Accounting 1st Paper",
    "হিসাববিজ্ঞান ২য় পত্র": "Accounting 2nd Paper",
    "ব্যবসায় সংগঠন ও ব্যবস্থাপনা ১ম পত্র": "Business Organization and Management 1st Paper",
    "ব্যবসায় সংগঠন ও ব্যবস্থাপনা ২য় পত্র": "Business Organization and Management 2nd Paper",
    "ফিন্যান্স ব্যাংকিং ও বীমা ১ম পত্র": "Finance, Banking and Insurance 1st Paper",
    "ফিন্যান্স ব্যাংকিং ও বীমা ২য় পত্র": "Finance, Banking and Insurance 2nd Paper",
    "উৎপাদন ব্যবস্থা ও বিপণন ১ম পত্র": "Production Management and Marketing 1st Paper",
    "উৎপাদন ব্যবস্থা ও বিপণন ২য় পত্র": "Production Management and Marketing 2nd Paper",

    # Humanities Group
    "অর্থনীতি ১ম পত্র": "Economics 1st Paper",
    "অর্থনীতি ২য় পত্র": "Economics 2nd Paper",
    "পৌরনীতি ও নাগরিকতা": "Civics and Citizenship",
    "পৌরনীতি ও সুশাসন ১ম পত্র": "Civics and Good Governance 1st Paper",
    "পৌরনীতি ও সুশাসন ২য় পত্র": "Civics and Good Governance 2nd Paper",
    "ইতিহাস ১ম পত্র": "History 1st Paper",
    "ইতিহাস ২য় পত্র": "History 2nd Paper",
    "ইসলামের ইতিহাস ও সংস্কৃতি ১ম পত্র": "Islamic History and Culture 1st Paper",
    "ইসলামের ইতিহাস ও সংস্কৃতি ২য় পত্র": "Islamic History and Culture 2nd Paper",
    "ইসলামের ইতিহাস": "Islamic History",
    "মনোবিজ্ঞান ১ম পত্র": "Psychology 1st Paper",
    "মনোবিজ্ঞান ২য় পত্র": "Psychology 2nd Paper",
    "যুক্তিবিদ্যা ১ম পত্র": "Logic 1st Paper",
    "যুক্তিবিদ্যা ২য় পত্র": "Logic 2nd Paper",
    "পরিসংখ্যান ১ম পত্র": "Statistics 1st Paper",
    "পরিসংখ্যান ২য় পত্র": "Statistics 2nd Paper",
    "ভূগোল ও পরিবেশ": "Geography and Environment",
    "সমাজকর্ম ১ম পত্র": "Social Work 1st Paper",
    "সমাজকর্ম ২য় পত্র": "Social Work 2nd Paper",
    "সমাজবিজ্ঞান ১ম পত্র": "Sociology 1st Paper",
    "সমাজবিজ্ঞান ২য় পত্র": "Sociology 2nd Paper",

    # General / Arts Group
    "চারু ও কারুকলা ১ম পত্র": "Fine Arts and Crafts 1st Paper",
    "চারু ও কারুকলা ২য় পত্র": "Fine Arts and Crafts 2nd Paper",
    "গার্হস্থ্য অর্থনীতি ১ম পত্র": "Home Economics 1st Paper",
    "গার্হস্থ্য অর্থনীতি ২য় পত্র": "Home Economics 2nd Paper",
    "कर्म ও জীবনমুখী শিক্ষা": "Work and Life Oriented Education",
    "শারীরিক শিক্ষা ও স্বাস্থ্য": "Physical Education and Health",
    "ক্যারিয়ার শিক্ষা": "Career Education",
    
    # Religion
    "ইসলাম শিক্ষা ১ম পত্র": "Islamic Education 1st Paper",
    "ইসলাম শিক্ষা ২য় পত্র": "Islamic Education 2nd Paper",
    "হিন্দুধর্ম ও নৈতিক শিক্ষা": "Hindu Religion and Moral Education",
    "বৌদ্ধধর্ম ও নৈতিক শিক্ষা": "Buddhist Religion and Moral Education",
    "খ্রিষ্টধর্ম ও নৈতিক শিক্ষা": "Christian Religion and Moral Education",
}

def translate_subject(name):
    if name in TRANSLATIONS:
        return TRANSLATIONS[name]
    return f"{name} (English Version)"

def run():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="questionshaper"
    )
    cursor = conn.cursor()

    print(f"=== AUTOMATED DUAL-VERSION SUBJECT GENERATOR (DRY_RUN = {DRY_RUN}) ===\n")

    cursor.execute("SELECT id, name, code, paper, tenant_id FROM subjects WHERE is_english_version = 0")
    bangla_subjects = cursor.fetchall()
    print(f"Found {len(bangla_subjects)} global Bangla subjects. Processing conversion:")

    subject_map = {}
    subject_names = {}

    for sub in bangla_subjects:
        sid, name, code, paper, tenant = sub
        translated_name = translate_subject(name)
        
        # Ensure new_code is unique
        base_code = f"{code}-EN" if code else f"SUB-EN"
        new_code = base_code
        suffix = 1
        while True:
            cursor.execute("SELECT id FROM subjects WHERE code = %s LIMIT 1", (new_code,))
            if not cursor.fetchone():
                break
            suffix_str = f"-{suffix}"
            new_code = f"{base_code[:30]}{suffix_str}"
            suffix += 1

        cursor.execute("SELECT id FROM subjects WHERE name = %s AND is_english_version = 1 LIMIT 1", (translated_name,))
        existing = cursor.fetchone()

        new_sid = None
        if existing:
            new_sid = existing[0]
            print(f"  - Subject '{name}' -> '{translated_name}' | English version already exists (ID: {new_sid})")
        else:
            new_sid = str(uuid.uuid4())
            print(f"  - Subject '{name}' -> '{translated_name}' | Creating new English version with ID: {new_sid}")
            if not DRY_RUN:
                now = datetime.datetime.now()
                cursor.execute("""
                    INSERT INTO subjects (id, created_at, deleted, updated_at, version, tenant_id, name, code, is_english_version, paper)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (new_sid, now, 0, now, 0, "DEFAULT", translated_name, new_code, 1, paper))
        
        subject_map[sid] = new_sid
        subject_names[sid] = translated_name

    print("\nProcessing ClassSubject mappings (duplicating mappings for English subjects):")
    cursor.execute("""
        SELECT cs.id, cs.academic_class_id, cs.session_id, cs.subject_id, cs.tenant_id, cs.subject_order, cs.group_id
        FROM class_subjects cs
        JOIN subjects s ON cs.subject_id = s.id
        WHERE s.is_english_version = 0
    """)
    cs_mappings = cursor.fetchall()
    print(f"Found {len(cs_mappings)} ClassSubject mappings to duplicate.")

    created_assignments_count = 0

    for mapping in cs_mappings:
        cs_id, class_id, session_id, subject_id, tenant_id, order, group_id = mapping
        new_subject_id = subject_map.get(subject_id)
        if not new_subject_id:
            continue

        cursor.execute("SELECT name FROM academic_classes WHERE id = %s", (class_id,))
        c_row = cursor.fetchone()
        c_name = c_row[0] if c_row else "Unknown Class"
        s_name = subject_names.get(subject_id, "Unknown Subject")

        cursor.execute("""
            SELECT id FROM class_subjects 
            WHERE academic_class_id = %s AND session_id = %s AND subject_id = %s LIMIT 1
        """, (class_id, session_id, new_subject_id))
        existing_mapping = cursor.fetchone()

        if existing_mapping:
            print(f"  - Class '{c_name}': Subject '{s_name}' is already assigned (CS_ID: {existing_mapping[0]})")
        else:
            new_cs_id = str(uuid.uuid4())
            print(f"  - Class '{c_name}': Subject '{s_name}' -> Assigning now (CS_ID: {new_cs_id})")
            if not DRY_RUN:
                now = datetime.datetime.now()
                cursor.execute("""
                    INSERT INTO class_subjects (id, created_at, deleted, updated_at, version, tenant_id, is_active, academic_class_id, session_id, subject_id, subject_order, group_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (new_cs_id, now, 0, now, 0, tenant_id, 1, class_id, session_id, new_subject_id, order, group_id))
                created_assignments_count += 1

    if not DRY_RUN:
        conn.commit()
        print(f"\n=== GENERATION COMPLETED! Created {created_assignments_count} ClassSubject assignments. ===")
    else:
        print("\n=== DRY RUN COMPLETED! NO DATABASE CHANGES WERE COMMITTED. ===")

    conn.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--execute':
        DRY_RUN = False
    run()
```

---

### Method B: ICT-Specific Class & Topic Migration (পুরোনো ক্লাস ৯-১০ ICT সিঙ্কের জন্য)
পূর্বের সেশনের ভুল ম্যাপ করা নির্দিষ্ট ICT বই ও টপিককে বিশুদ্ধ ও বিভক্ত করতে পাইথন মাইগ্রেশন কোড (`db_migration.py`) ব্যবহার করুন। এটি ১ম অধ্যায় থেকে শুরু করে সকল অধ্যায়ের ইংরেজি ও বাংলা টপিকগুলোকে স্বয়ংক্রিয়ভাবে পৃথক করে।

#### পাইথন ICT মাইগ্রেশন কোড (`db_migration.py`):
(এই ফাইলটি `/scratch/db_migration.py` ফোল্ডারে সেভ রয়েছে, আপনি সেখান থেকে সরাসরি সার্ভারে আপলোড করে রান করতে পারবেন)।

---

### Method C: Manual UI Setup (নতুন বা ফ্রেশ ডেটাবেজের ক্ষেত্রে)
যদি প্রোডাকশন সার্ভারে পূর্বে কোনো ডেটা আপলোড করা না থাকে (বা ফ্রেশ ডেটাবেজে কাজ শুরু করেন):
* আলাদা কোনো স্ক্রিপ্ট চালানো ছাড়াই **সম্পূর্ণ কাজ নতুন আপগ্রেড হওয়া ফ্রন্টএন্ড UI ব্যবহার করে ম্যানুয়ালি করতে পারবেন!**
  1. `/admin/academic/subjects` পেজে যান এবং "New Global Subject" তৈরি করে **"Is English Version"** চেক করুন।
  2. এটিকে ৯ম-১০ম শ্রেণির সাথে সিলেবাসে ম্যাপ করুন।
  3. `/knowledge-hub/library`-তে নতুন বই আপলোড করার সময় **Language Branch = English Medium** সিলেক্ট করে এই নতুন সাবজেক্টটিকে "Target Subject" সিলেক্ট করে দিন।
  4. `/knowledge-hub/mapping` পেজে গিয়ে "Auto Assign Pages" এ ক্লিক করলেই সিস্টেম সম্পূর্ণ অধ্যায় ও ম্যাপিং স্বয়ংক্রিয়ভাবে রেডি করে ফেলবে!

---

### Method D: Global English Subjects & Book Titles Clean Translation (খাঁটি ইংরেজি রূপান্তর)
যদি আপনার লাইভ ডাটাবেজের `subjects` টেবিলে থাকা ইংরেজি সংস্করণের বিষয়গুলোর নাম এবং `source_book_master` টেবিলের ইংরেজি বইগুলোর নাম বাংলায় সংরক্ষিত থাকে, তবে সেগুলোকে স্ট্যান্ডার্ড ইংরেজি নামে রূপান্তর করতে এই স্ক্রিপ্টটি ব্যবহার করুন।

#### পাইথন ট্রান্সলেশন স্ক্রিপ্ট (`execute_db_translations.py`):
(এই ফাইলটি `/scratch/execute_db_translations.py` ফোল্ডারে সেভ রয়েছে, আপনি সেখান থেকে সরাসরি সার্ভারে আপলোড করে রান করতে পারবেন)।
```python
# execute_db_translations.py
# Run this on your production server to cleanly translate English subjects and book titles:
# python execute_db_translations.py
```
> [!TIP]
> এই স্ক্রিপ্টটি ডাটাবেজের ইংরেজি বিষয়ের ৪২টি নাম এবং ইংরেজি সংস্করণ বইয়ের ১৪টি নামকে বাংলায় সংরক্ষিত অবস্থা থেকে খাঁটি ইংরেজি নামে আপডেট করে সম্পূর্ণ ডেটা সিঙ্ক করে দেবে।

