const fs = require('fs');
const path = require('path');

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    // KnowledgeHubServiceImpl.java
    content = content.replace(/q\.setType\(com\.testshaper\.entity\.Question\.QuestionType\.([A-Z_]+)\);/g, "q.setType(\"$1\");");
    content = content.replace(/q\.setType\(com\.testshaper\.entity\.Question\.QuestionType\.valueOf\(typeStr\)\);/g, "q.setType(typeStr);");

    // ExamDTO.java
    content = content.replace(/private Question\.QuestionType type;/g, "private String type;");

    // ManualExamServiceImpl.java
    content = content.replace(/Question\.QuestionType qType = q\.getType\(\);/g, "String qType = q.getType();");
    content = content.replace(/Question\.QuestionType type = q\.getType\(\);/g, "String type = q.getType();");
    
    // ExamPdfService.java and ExamWordService.java (might be eq.getQuestion().getType())
    content = content.replace(/Question\.QuestionType type = eq\.getQuestion\(\)\.getType\(\);/g, "String type = eq.getQuestion().getType();");

    // LectureService.java and others calling .name() on a string
    content = content.replace(/question\.getType\(\)\.name\(\)/g, "question.getType()");
    content = content.replace(/q\.getType\(\)\.name\(\)/g, "q.getType()");

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
