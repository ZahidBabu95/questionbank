import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix: q.getType() == Question.QuestionType.MCQ -> q.getType().equals(Question.QuestionType.MCQ.name())
    # Regex for == Question.QuestionType.XXXX
    content = re.sub(r'\.getType\(\)\s*==\s*Question\.QuestionType\.([A-Z_]+)', 
                     r'.getType().equals(Question.QuestionType.\1.name())', content)
    
    # Fix: != Question.QuestionType.XXXX -> !q.getType().equals(Question.QuestionType.XXXX.name())
    content = re.sub(r'([a-zA-Z0-9_\(\)\.]+)\.getType\(\)\s*!=\s*Question\.QuestionType\.([A-Z_]+)', 
                     r'!\1.getType().equals(Question.QuestionType.\2.name())', content)
                     
    # Fix: == QuestionType.XXXX
    content = re.sub(r'\.getType\(\)\s*==\s*QuestionType\.([A-Z_]+)', 
                     r'.getType().equals(QuestionType.\1.name())', content)

    # Fix: != QuestionType.XXXX
    content = re.sub(r'([a-zA-Z0-9_\(\)\.]+)\.getType\(\)\s*!=\s*QuestionType\.([A-Z_]+)', 
                     r'!\1.getType().equals(QuestionType.\2.name())', content)

    # Fix: setType(Question.QuestionType.MCQ) -> setType(Question.QuestionType.MCQ.name())
    content = re.sub(r'\.setType\(\s*Question\.QuestionType\.([A-Z_]+)\s*\)',
                     r'.setType(Question.QuestionType.\1.name())', content)

    content = re.sub(r'\.setType\(\s*QuestionType\.([A-Z_]+)\s*\)',
                     r'.setType(QuestionType.\1.name())', content)

    # Specific cases like Question.QuestionType type = (Question.QuestionType) result[0]
    # And type == Question.QuestionType.MCQ
    content = re.sub(r'Question\.QuestionType\s+([a-zA-Z0-9_]+)\s*=\s*\(Question\.QuestionType\)',
                     r'String \1 = (String)', content)
    
    content = re.sub(r'\b([a-zA-Z0-9_]+)\s*==\s*Question\.QuestionType\.([A-Z_]+)',
                     r'\1.equals(Question.QuestionType.\2.name())', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

backend_dir = r"c:\questionshaper\backend\src\main\java\com\testshaper"
for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith(".java"):
            fix_file(os.path.join(root, file))

print("Done")
