import sys

file_path = r'c:\questionshaper\frontend\src\pages\admin\Exams\ExamEditor.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports_to_add = """import LeftNavigator from './components/LeftNavigator';
import RightProperties from './components/RightProperties';
import PaperCanvas from './components/PaperCanvas';
"""
if "import LeftNavigator" not in content:
    content = content.replace("import EditorToolbar from './components/EditorToolbar';", "import EditorToolbar from './components/EditorToolbar';\n" + imports_to_add)


# 1. Remove LeftNavigator
start_left_idx = content.find('{/* Left Panel - Navigator */}')
end_left_idx = content.find('{/* Left Panel Toggle Button */}')
if start_left_idx != -1 and end_left_idx != -1:
    left_comp = """{/* Left Panel - Navigator */}
                <LeftNavigator
                    id={id}
                    exam={exam}
                    leftPanelOpen={leftPanelOpen}
                    selectedQuestionId={selectedQuestionId}
                    setSelectedQuestionId={setSelectedQuestionId}
                    isBengaliFont={isBengaliFont}
                    toBengaliNumeral={toBengaliNumeral}
                    moveQuestion={moveQuestion}
                    navigate={navigate}
                />

                """
    content = content[:start_left_idx] + left_comp + content[end_left_idx:]

# 2. Remove PaperCanvas
start_paper_idx = content.find('{/* 3. CANVAS / PAPER AREA */}')
end_paper_idx = content.find('{/* Right Panel Toggle Button */}')
if start_paper_idx != -1 and end_paper_idx != -1:
    paper_comp = """{/* 3. CANVAS / PAPER AREA */}
                <PaperCanvas
                    id={id}
                    exam={exam}
                    setExam={setExam}
                    config={config}
                    zoom={zoom}
                    setZoom={setZoom}
                    selection={selection}
                    setSelection={setSelection}
                    setRightPanelOpen={setRightPanelOpen}
                    isBengaliFont={isBengaliFont}
                    toBengaliNumeral={toBengaliNumeral}
                    selectedQuestionId={selectedQuestionId}
                    updateQuestion={updateQuestion}
                    updateOption={updateOption}
                    removeOption={removeOption}
                    addOption={addOption}
                    getOptionLabel={getOptionLabel}
                    navigate={navigate}
                    rightPanelOpen={rightPanelOpen}
                />

                """
    content = content[:start_paper_idx] + paper_comp + content[end_paper_idx:]


# 3. Remove RightProperties
start_right_idx = content.find('{/* 4. RIGHT SIDEBAR (Properties & Templates) */}')
end_right_idx = content.find('</aside>', start_right_idx)
if start_right_idx != -1 and end_right_idx != -1:
    right_comp = """{/* 4. RIGHT SIDEBAR (Properties & Templates) */}
                <RightProperties
                    rightPanelOpen={rightPanelOpen}
                    rightPanelTab={rightPanelTab}
                    setRightPanelTab={setRightPanelTab}
                    selection={selection}
                    setSelection={setSelection}
                    exam={exam}
                    setExam={setExam}
                    config={config}
                    setConfig={setConfig}
                    updateQuestion={updateQuestion}
                    deleteQuestion={deleteQuestion}
                    MATH_SSC_TEMPLATE={MATH_SSC_TEMPLATE}
                />"""
    content = content[:start_right_idx] + right_comp + content[end_right_idx+8:]


# Remove marginPixels and paperDimensions if present
import re
content = re.sub(r'const marginPixels = \{[^}]*\};\s*', '', content)
content = re.sub(r'const paperDimensions = \{[^}]*\};\s*', '', content)
content = re.sub(r'const getPageStyle = \(\) => \{[^}]*\}\s*};\s*', '', content)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ExamEditor.jsx components.")
