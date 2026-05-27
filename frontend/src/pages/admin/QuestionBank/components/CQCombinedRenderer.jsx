import React, { useMemo } from 'react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import { CheckCircle, Layers } from 'lucide-react';

const formatBanglaDigits = (num) => {
    if (num === null || num === undefined) return '';
    const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return num.toString().replace(/[0-9]/g, m => enToBn[m]);
};

const cleanMarks = (num) => {
    if (num === null || num === undefined) return '';
    const parsed = parseFloat(num);
    return isNaN(parsed) ? num.toString() : parsed.toString();
};

const CQCombinedRenderer = ({ q, showAnswer, showExplanation, isDark = false }) => {
    const parts = useMemo(() => {
        const questionText = q.questionText || '';
        const correctAnswer = q.correctAnswer || '';
        const explanation = q.explanation || '';
        
        if (!questionText.includes('<div class="cq-questions">')) return null;

        const strippedQText = '<div class="cq-questions">' + questionText.split('<div class="cq-questions">')[1];

        const parser = new DOMParser();
        const doc = parser.parseFromString(strippedQText, 'text/html');
        const ansDoc = parser.parseFromString(correctAnswer, 'text/html');
        const expDoc = parser.parseFromString(explanation, 'text/html');

        const qList = doc.querySelectorAll('.cq-questions ol li');
        const parsedParts = [];
        
        qList.forEach((li, idx) => {
            const marks = parseFloat(li.getAttribute('data-marks')) || parseFloat(li.querySelector('.cq-marks')?.textContent?.replace(/[^\d.]/g, '')) || 1;
            const textSpan = li.querySelector('.cq-text');
            const isEnglish = q.language && q.language.toLowerCase() === 'english';
            const label = isEnglish ? String.fromCharCode(97 + idx) : (['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(97 + idx));

            let partAns = '';
            let partExp = '';

            const ansNode = ansDoc.querySelector(`.cq-ans-part[data-label="${label}"] .cq-ans-content`) || ansDoc.querySelector(`.cq-ans-part[data-label="${label}"]`);
            if (ansNode) partAns = ansNode.innerHTML;

            const expNode = expDoc.querySelector(`.cq-exp-part[data-label="${label}"] .cq-exp-content`) || expDoc.querySelector(`.cq-exp-part[data-label="${label}"]`);
            if (expNode) partExp = expNode.innerHTML;

            parsedParts.push({
                label,
                text: textSpan ? textSpan.innerHTML : li.innerHTML,
                marks,
                answer: partAns,
                explanation: partExp
            });
        });
        
        return parsedParts;
    }, [q, showAnswer, showExplanation]);

    if (!parts || parts.length === 0) {
        return <MarkdownRenderer content={q.type === 'CQ' && q.questionText && q.questionText.includes('<div class="cq-questions">') ? '<div class="cq-questions">' + q.questionText.split('<div class="cq-questions">')[1] : q.questionText} className={isDark ? 'prose-invert' : ''} />;
    }

    const isEnglish = q.language && q.language.toLowerCase() === 'english';

    return (
        <div className="flex flex-col gap-3 mt-2">
            {parts.map((p, idx) => {
                // Strip duplicate leading labels (e.g. "a. ", "ক) ", etc.) from subquestion text
                let cleanText = p.text || '';
                const labelPattern = new RegExp(`^\\s*(?:${p.label}|[a-eA-E]|[ক-ঙ])\\s*[\\.\\)\\-–—\\s]+`, 'i');
                cleanText = cleanText.replace(labelPattern, '').trim();

                return (
                    <div key={idx} className="flex flex-col gap-1.5 w-full relative">
                        <div className="flex items-start gap-2 w-full text-[14px] leading-relaxed">
                            <span className={`shrink-0 font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'} mt-0.5`}>{p.label}.</span>
                            <div className="flex-1 min-w-0 font-medium">
                                <MarkdownRenderer content={cleanText} className={`!max-w-full prose-p:!m-0 prose-p:!p-0 ${isDark ? 'prose-invert' : ''}`} />
                            </div>
                            <span className={`text-[12px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} shrink-0 ml-2`}>
                                {isEnglish ? cleanMarks(p.marks) : formatBanglaDigits(cleanMarks(p.marks))}
                            </span>
                        </div>
                    {showAnswer && (
                        p.answer ? (
                            <div className={`ml-[1.25rem] p-3 pb-2 pt-2.5 ${isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300 border-l-[3px] border-l-emerald-600' : 'bg-emerald-50/70 border-emerald-100 text-emerald-900 border-l-[3px] border-l-emerald-500'} border mt-0.5 shadow-sm rounded-lg text-[12px]`}>
                                <span className={`flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-1.5 uppercase tracking-wider`}><CheckCircle size={12}/> উত্তর ({p.label}):</span>
                                <MarkdownRenderer content={p.answer} className={`-mt-1 !max-w-full ${isDark ? 'prose-invert' : ''}`} />
                            </div>
                        ) : (
                            <div className={`ml-[1.25rem] p-2 border border-dashed ${isDark ? 'bg-rose-950/10 border-rose-900/30 text-rose-400' : 'bg-rose-50/30 border-rose-200 text-rose-700'} mt-0.5 rounded-lg text-[11px] flex items-center gap-1.5`}>
                                <span>⚠️ {p.label} অংশের কোনো উত্তর যুক্ত করা হয়নি।</span>
                            </div>
                        )
                    )}
                    {showExplanation && (
                        p.explanation ? (
                            <div className={`ml-[1.25rem] p-3 pb-2 pt-2.5 ${isDark ? 'bg-blue-950/20 border-blue-800/40 text-blue-300 border-l-[3px] border-l-blue-600' : 'bg-blue-50/70 border-blue-100 text-blue-950 border-l-[3px] border-l-blue-500'} border mt-0.5 shadow-sm rounded-lg text-[12px]`}>
                                <span className={`flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'} mb-1.5`}><Layers size={12}/> ব্যাখ্যা ({p.label}):</span>
                                <MarkdownRenderer content={p.explanation} className={`-mt-1 !max-w-full ${isDark ? 'prose-invert' : ''}`} />
                            </div>
                        ) : (
                            <div className={`ml-[1.25rem] p-2 border border-dashed ${isDark ? 'bg-amber-950/10 border-amber-900/30 text-amber-400' : 'bg-amber-50/30 border-amber-200 text-amber-700'} mt-0.5 rounded-lg text-[11px] flex items-center gap-1.5`}>
                                <span>⚠️ {p.label} অংশের কোনো ব্যাখ্যা যুক্ত করা হয়নি।</span>
                            </div>
                        )
                    )}
                </div>
            )})}
        </div>
    );
};

export default CQCombinedRenderer;
