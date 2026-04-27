import sys

file_path = r'c:\questionshaper\frontend\src\pages\admin\Exams\ExamEditor.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Add import
lines.insert(17, "import EditorToolbar from './components/EditorToolbar';\n")

start_ribbon = next(i for i, l in enumerate(lines) if 'const RibbonTab =' in l)
end_ribbon = next(i for i, l in enumerate(lines) if 'const marginPixels =' in l)

start_header = next(i for i, l in enumerate(lines) if '<header className="bg-slate-50' in l)
end_header = next(i for i, l in enumerate(lines[start_header:]) if '</header>' in l) + start_header

toolbar_comp = """            <EditorToolbar
                activeTab={activeTab}
                handleTabClick={handleTabClick}
                navigate={navigate}
                saving={saving}
                handleDownload={handleDownload}
                handleUpdate={handleUpdate}
                applyCommand={applyCommand}
                config={config}
                setConfig={setConfig}
                setExam={setExam}
                BLANK_EXAM={BLANK_EXAM}
                addQuestion={addQuestion}
                setIsBankOpen={setIsBankOpen}
                fileInputRef={fileInputRef}
                handleImageSelect={handleImageSelect}
                setEquationModalOpen={setEquationModalOpen}
            />\n"""

new_lines = lines[:start_ribbon] + lines[end_ribbon:start_header] + [toolbar_comp] + lines[end_header+1:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print('Updated ExamEditor.jsx')
