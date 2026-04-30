import sys

with open('frontend/src/pages/admin/Exams/NexusEditor/extensions/QuestionBlockNode.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = '<NodeViewWrapper'
end_marker = '{/* Main Question Text & Marks */}'

start_idx = content.rfind(start_marker, 0, content.find(end_marker))
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    replacement = """            <NodeViewWrapper 
                data-type="question-block" 
                data-numberingstyle={node.attrs.numberingStyle || 'bn'}
                className={`relative mb-0 transition-all duration-200 rounded-xl ${isStrict ? 'cursor-pointer hover:bg-slate-50' : 'cursor-text'} print:bg-transparent print:scale-100 print:shadow-none print:ring-0`}
                style={{ 
                    fontSize: fSize ? `${fSize}px` : 'inherit',
                    lineHeight: safeLineGap,
                    marginBottom: node.attrs.questionGap !== undefined && node.attrs.questionGap !== null ? `${node.attrs.questionGap}px` : undefined,
                    paddingTop: '8px',
                    paddingBottom: '8px'
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div className="relative transition-all">
                    {/* Action buttons moved to sidebar */}
                </div>

                """
    
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('frontend/src/pages/admin/Exams/NexusEditor/extensions/QuestionBlockNode.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully replaced')
else:
    print('Failed to find markers')
