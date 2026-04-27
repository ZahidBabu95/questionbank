import sys
import re

file_path = r'c:\questionshaper\frontend\src\pages\admin\Exams\components\PaperCanvas.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if "import InlineGoldenEditor" not in content:
    content = content.replace("import { Plus, Trash2, Minus, RotateCcw } from 'lucide-react';", "import { Plus, Trash2, Minus, RotateCcw } from 'lucide-react';\nimport InlineGoldenEditor from './InlineGoldenEditor';")

# Replace questionText contentEditable
q_text_old = """                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => updateQuestion(q.id, 'questionText', e.target.innerHTML)}
                                                className="outline-none text-slate-900 leading-[1.6] mb-3 min-h-[1.5em] cursor-text"
                                                dangerouslySetInnerHTML={{ __html: q.questionText }}
                                            />"""
q_text_new = """                                            <InlineGoldenEditor
                                                value={q.questionText}
                                                onChange={(val) => updateQuestion(q.id, 'questionText', val)}
                                                className="outline-none text-slate-900 leading-[1.6] mb-3 min-h-[1.5em] cursor-text"
                                                placeholder={isBengaliFont ? 'নতুন প্রশ্ন...' : 'Type your question here...'}
                                            />"""
content = content.replace(q_text_old, q_text_new)

# Replace optionText contentEditable
opt_text_old = """                                                                <div
                                                                    contentEditable
                                                                    suppressContentEditableWarning
                                                                    onBlur={(e) => updateOption(q.id, oIdx, e.target.innerHTML)}
                                                                    className={`bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-0.5 text-[0.95em] outline-none w-full min-h-[1.5em] ${(config.includeAnswers && opt.isCorrect) ? 'text-emerald-700 font-bold bg-emerald-50/30' : 'text-slate-900 border-b-slate-100 border-dotted cursor-text'}`}
                                                                    dangerouslySetInnerHTML={{ __html: opt.optionText || '' }}
                                                                />"""
opt_text_new = """                                                                <InlineGoldenEditor
                                                                    value={opt.optionText || ''}
                                                                    onChange={(val) => updateOption(q.id, oIdx, val)}
                                                                    className={`bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-0.5 text-[0.95em] outline-none w-full min-h-[1.5em] ${(config.includeAnswers && opt.isCorrect) ? 'text-emerald-700 font-bold bg-emerald-50/30' : 'text-slate-900 border-b-slate-100 border-dotted cursor-text'}`}
                                                                    placeholder="Option"
                                                                />"""
content = content.replace(opt_text_old, opt_text_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated PaperCanvas.jsx to use InlineGoldenEditor.")
