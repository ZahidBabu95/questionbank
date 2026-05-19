const fs = require('fs');
const path = require('path');

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    content = content.replace(/\.getType\(\)\s*==\s*Question\.QuestionType\.([A-Z_]+)/g, 
        ".getType().equals(Question.QuestionType.$1.name())");
        
    content = content.replace(/([a-zA-Z0-9_\(\)\.]+)\.getType\(\)\s*!=\s*Question\.QuestionType\.([A-Z_]+)/g, 
        "!$1.getType().equals(Question.QuestionType.$2.name())");

    content = content.replace(/\.getType\(\)\s*==\s*QuestionType\.([A-Z_]+)/g, 
        ".getType().equals(QuestionType.$1.name())");

    content = content.replace(/([a-zA-Z0-9_\(\)\.]+)\.getType\(\)\s*!=\s*QuestionType\.([A-Z_]+)/g, 
        "!$1.getType().equals(QuestionType.$2.name())");

    content = content.replace(/\.setType\(\s*Question\.QuestionType\.([A-Z_]+)\s*\)/g,
        ".setType(Question.QuestionType.$1.name())");

    content = content.replace(/\.setType\(\s*QuestionType\.([A-Z_]+)\s*\)/g,
        ".setType(QuestionType.$1.name())");

    content = content.replace(/Question\.QuestionType\s+([a-zA-Z0-9_]+)\s*=\s*\(Question\.QuestionType\)/g,
        "String $1 = (String)");

    content = content.replace(/\b([a-zA-Z0-9_]+)\s*==\s*Question\.QuestionType\.([A-Z_]+)/g,
        "$1.equals(Question.QuestionType.$2.name())");
        
    // Fix setQuestionType to handle enum/string mismatch if any
    content = content.replace(/\.setQuestionType\(rule\.getQuestionType\(\)\)/g,
        ".setQuestionType(rule.getQuestionType())"); // Rule is already QuestionType enum, wait, ExamGenerationRule entity...
        
    // Let's just fix the common ones first.
        
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log("Fixed", filepath);
    }
}

function walkDir(dir) {
    let files = fs.readdirSync(dir);
    for (let file of files) {
        let filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walkDir(filepath);
        } else if (filepath.endsWith('.java')) {
            fixFile(filepath);
        }
    }
}

walkDir("backend/src/main/java/com/testshaper");
console.log("Done");
