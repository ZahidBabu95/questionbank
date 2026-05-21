import React, { useState, useEffect } from 'react';
import {
    X, Lock, BookOpen, FileText, Tag, MessageSquare,
    CheckCircle, AlertCircle, Loader2, ChevronRight,
    Layers, Info, Edit3, Send, Eye
} from 'lucide-react';
import questionService from '../../../../services/questionService';
import RichTextEditor from '../../../../components/RichTextEditor';

// ─── Locked field display ────────────────────────────────────────────────────
const LockedField = ({ label, value }) => (
    <div className="flex items-start gap-2.5 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg">
        <Lock size={12} className="text-slate-300 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
            <span className="text-[12px] text-slate-500 leading-snug line-clamp-2"
                dangerouslySetInnerHTML={{ __html: value || '—' }} />
        </div>
    </div>
);

// ─── Section header ─────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, locked }) => (
    <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b ${locked ? 'border-slate-100' : 'border-primary/20'}`}>
        <Icon size={13} className={locked ? 'text-slate-300' : 'text-primary'} />
        <span className={`text-[11px] font-black uppercase tracking-widest ${locked ? 'text-slate-400' : 'text-slate-700'}`}>
            {title}
        </span>
        {locked && (
            <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                <Lock size={8} /> Locked
            </span>
        )}
    </div>
);

// ─── Main RevisePanel ───────────────────────────────────────────────────────
const RevisePanel = ({ question: q, isOpen, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        stimulus: '',
        questionText: '',
        correctAnswer: '',
        explanation: '',
        options: [],
        statements: [],
        cqParts: [],
        revisionNotes: '',
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [isLegacyCQ, setIsLegacyCQ] = useState(false);
    const [editMode, setEditMode] = useState('structured'); // 'legacy' or 'structured'
    const [showReference, setShowReference] = useState(true);

    const convertMarkdownImagesToHtml = (text) => {
        if (!text) return text;
        return text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/gi, (match, alt, url) => {
            return `<img src="${url}" alt="${alt}" />`;
        });
    };

    // Pre-fill form when question changes
    useEffect(() => {
        if (!q) return;

        let initialStimulus = q.stimulus || '';
        let parsedCqParts = [];
        let detectedLegacy = false;

        if (q.type === 'CQ') {
            const hasCqQuestions = q.questionText && q.questionText.includes('cq-questions');
            detectedLegacy = !hasCqQuestions;

            if (!detectedLegacy) {
                const html = convertMarkdownImagesToHtml(q.questionText || '');
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                const ansHtml = convertMarkdownImagesToHtml(q.correctAnswer || '');
                const expHtml = convertMarkdownImagesToHtml(q.explanation || '');
                
                const ansDoc = parser.parseFromString(ansHtml, 'text/html');
                const expDoc = parser.parseFromString(expHtml, 'text/html');
                
                const qList = doc.querySelectorAll('.cq-questions ol li');
                qList.forEach((li, idx) => {
                    const marks = parseFloat(li.getAttribute('data-marks')) || 1;
                    const textSpan = li.querySelector('.cq-text');
                    const label = ['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(97 + idx);
                    
                    let partAns = '';
                    let partExp = '';
                    
                    const ansNode = ansDoc.querySelector(`.cq-ans-part[data-label="${label}"] .cq-ans-content`) || ansDoc.querySelector(`.cq-ans-part[data-label="${label}"]`);
                    if (ansNode) partAns = ansNode.innerHTML;
                    
                    const expNode = expDoc.querySelector(`.cq-exp-part[data-label="${label}"] .cq-exp-content`) || expDoc.querySelector(`.cq-exp-part[data-label="${label}"]`);
                    if (expNode) partExp = expNode.innerHTML;
                    
                    parsedCqParts.push({
                        label: label,
                        text: textSpan ? textSpan.innerHTML : li.innerHTML,
                        marks: marks,
                        answer: partAns,
                        explanation: partExp
                    });
                });

                const stemDiv = doc.querySelector('.cq-stem');
                if (stemDiv) {
                    initialStimulus = stemDiv.innerHTML;
                } else if (!initialStimulus && q.questionText && q.questionText.includes('<div class="cq-questions">')) {
                    initialStimulus = q.questionText.split('<div class="cq-questions">')[0];
                }
            }

            if (parsedCqParts.length === 0) {
                parsedCqParts = [
                    { label: 'ক', text: '', answer: '', explanation: '', marks: 1 },
                    { label: 'খ', text: '', answer: '', explanation: '', marks: 2 },
                    { label: 'গ', text: '', answer: '', explanation: '', marks: 3 },
                    { label: 'ঘ', text: '', answer: '', explanation: '', marks: 4 }
                ];
            }
        }

        setIsLegacyCQ(detectedLegacy);
        setEditMode(detectedLegacy ? 'legacy' : 'structured');

        setForm({
            stimulus: initialStimulus,
            questionText: q.questionText || '',
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            options: (q.options || []).map(o => ({ ...o, correct: o.correct ?? o.isCorrect ?? false })),
            statements: q.statements || [],
            cqParts: parsedCqParts,
            revisionNotes: '',
        });
        setToast(null);
    }, [q?.id]);

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const updateOption = (index, field, value) => {
        setForm(prev => {
            const opts = [...prev.options];
            opts[index] = { ...opts[index], [field]: value };
            return { ...prev, options: opts };
        });
    };

    const handleSubmit = async () => {
        if (!form.revisionNotes.trim()) {
            setToast({ type: 'error', msg: 'Revision notes আবশ্যক — কেন রিভাইজ করছেন লিখুন।' });
            return;
        }
        if (q.type === 'CQ' && editMode === 'structured') {
            if (form.cqParts.some(sq => !sq.text || sq.text.trim() === '' || sq.text === '<p><br></p>')) {
                setToast({ type: 'error', msg: `সকল ${form.cqParts.length} টি উপ-প্রশ্ন পূরণ করুন।` });
                return;
            }
        }
        setSaving(true);
        setToast(null);
        try {
            const stripOptionPrefix = (html) => {
                if (!html) return '';
                let stripped = html.replace(/^(<p[^>]*>)?\s*(?:(?:[কখগঘa-dA-D1-4]|i{1,3}|iv)\s*[\.\)])\s*/i, '$1');
                stripped = stripped.replace(/^(<p[^>]*>)?\s*(?:(?:[কখগঘa-dA-D1-4]|i{1,3}|iv)\s*[\.\)])\s*/i, '$1');
                return stripped;
            };

            let finalQuestionText = form.questionText;
            let finalCorrectAnswer = form.correctAnswer;
            let finalExplanation = form.explanation;

            if (q.type === 'CQ') {
                if (editMode === 'structured') {
                    let stemHtml = form.stimulus || '';
                    let combinedHtml = `<div class="cq-stem">${stemHtml}</div><div class="cq-questions"><ol type="a">`;
                    let answersHtml = '<div class="cq-answers">';
                    let explanationsHtml = '<div class="cq-explanations">';

                    form.cqParts.forEach(sq => {
                        combinedHtml += `<li data-marks="${sq.marks}"><span class="cq-text">${sq.text}</span> <span class="cq-marks">(${sq.marks})</span></li>`;
                        if (sq.answer) {
                            answersHtml += `<div class="cq-ans-part" data-label="${sq.label}" style="margin-bottom:8px;"><strong>${sq.label}) উত্তর:</strong> <span class="cq-ans-content">${sq.answer}</span></div>`;
                        }
                        if (sq.explanation) {
                            explanationsHtml += `<div class="cq-exp-part" data-label="${sq.label}" style="margin-bottom:8px;"><strong>${sq.label}) ব্যাখ্যা:</strong> <span class="cq-exp-content">${sq.explanation}</span></div>`;
                        }
                    });

                    combinedHtml += '</ol></div>';
                    answersHtml += '</div>';
                    explanationsHtml += '</div>';

                    finalQuestionText = combinedHtml;
                    finalCorrectAnswer = answersHtml === '<div class="cq-answers"></div>' ? null : answersHtml;
                    finalExplanation = explanationsHtml === '<div class="cq-explanations"></div>' ? null : explanationsHtml;
                } else {
                    // Legacy mode: save raw fields as-is
                    finalQuestionText = form.questionText;
                    finalCorrectAnswer = form.correctAnswer;
                    finalExplanation = form.explanation;
                }
            }

            const payload = {
                stimulus: form.stimulus,
                questionText: finalQuestionText,
                correctAnswer: finalCorrectAnswer,
                explanation: finalExplanation,
                options: q.type === 'MCQ' ? form.options.map(o => ({
                    id: o.id,
                    optionLabel: o.optionLabel,
                    optionText: stripOptionPrefix(o.optionText),
                    isCorrect: o.correct === true,
                    correct: o.correct === true,
                })) : undefined,
                statements: form.statements,
                revisionNotes: form.revisionNotes,
                status: 'PENDING',
            };
            await questionService.reviseQuestion(q.id, payload);
            setToast({ type: 'success', msg: 'Revision সফলভাবে জমা হয়েছে! প্রশ্নটি পুনরায় Review-তে পাঠানো হয়েছে।' });

            // Save locally for "My Revised" tab
            try {
                const revised = JSON.parse(localStorage.getItem('revisedQuestionIds') || '[]');
                if (!revised.includes(q.id)) {
                    revised.push(q.id);
                    localStorage.setItem('revisedQuestionIds', JSON.stringify(revised));
                }
            } catch {}

            setTimeout(() => { if (onSuccess) onSuccess(q.id); }, 1200);
        } catch (err) {
            setToast({ type: 'error', msg: err?.response?.data?.message || 'Revision জমা দিতে ব্যর্থ হয়েছে।' });
        } finally {
            setSaving(false);
        }
    };

    if (!q) return null;

    const typeLabel = q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'CQ' ? 'Creative' : q.type === 'SHORT' ? 'Short Answer' : q.type;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px] transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Slide-in Drawer — 50% screen width */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-1/2 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, var(--primary-color, #e91e8c), var(--secondary-color, #a855f7))' }}>
                            <Edit3 size={15} />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-black text-slate-800 leading-tight">Revise Question</h2>
                            <p className="text-[10px] text-slate-400 font-medium">Core content editable — source/chapter/tags are locked</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all active:scale-90">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-5 py-4 space-y-4">

                        {/* ── LOCKED: Metadata badges ── */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold border border-slate-200">{typeLabel}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                q.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : q.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>⚡ {q.difficulty}</span>
                            <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full text-[11px] font-bold border border-slate-200">{q.marks || 1} Marks</span>
                            <span className="ml-auto flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                <Lock size={9} /> Type, Difficulty, Marks Locked
                            </span>
                        </div>

                        {/* Warning Banner & Mode Selector for Legacy CQ */}
                        {isLegacyCQ && (
                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
                                <div className="flex gap-2.5">
                                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                    <div className="space-y-1">
                                        <h4 className="text-[12px] font-bold text-amber-800">লেগেসি (আনস্ট্রাকচার্ড) সৃজনশীল প্রশ্ন সনাক্ত করা হয়েছে</h4>
                                        <p className="text-[11px] text-amber-700 leading-relaxed">
                                            এই প্রশ্নটি ক, খ, গ, ঘ সাব-প্রশ্নে বিভক্ত নয়। আপনি এটিকে সরাসরি মূল টেক্সট হিসেবে এডিট করতে পারেন অথবা নতুন ক, খ, গ, ঘ স্ট্রাকচারে রূপান্তর করতে পারেন।
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 border-t border-amber-200/60 pt-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setEditMode('legacy')}
                                        className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all ${
                                            editMode === 'legacy'
                                                ? 'bg-amber-600 text-white shadow-sm'
                                                : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100/50'
                                        }`}
                                    >
                                        Raw Text এডিট করুন
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditMode('structured')}
                                        className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all ${
                                            editMode === 'structured'
                                                ? 'bg-amber-600 text-white shadow-sm'
                                                : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100/50'
                                        }`}
                                    >
                                        Structured এ রূপান্তর করুন
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Collapsible Reference Panel for Legacy CQ Conversion */}
                        {isLegacyCQ && editMode === 'structured' && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setShowReference(!showReference)}
                                    className="w-full px-4 py-2.5 bg-slate-100 flex items-center justify-between text-slate-700 hover:bg-slate-200/70 transition-all text-left"
                                >
                                    <span className="text-[11px] font-bold flex items-center gap-1.5">
                                        <BookOpen size={13} className="text-slate-500" />
                                        মূল লেগেসি টেক্সট রেফারেন্স (এখান থেকে কপি করুন)
                                    </span>
                                    <ChevronRight size={14} className={`text-slate-500 transition-transform ${showReference ? 'rotate-90' : ''}`} />
                                </button>
                                {showReference && (
                                    <div className="p-3.5 space-y-3 text-[11px] border-t border-slate-200 max-h-60 overflow-y-auto custom-scrollbar bg-white">
                                        {q.stimulus && (
                                            <div>
                                                <span className="font-bold text-slate-500 block mb-1">মূল উদ্দীপক (Stimulus):</span>
                                                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-24 overflow-y-auto" dangerouslySetInnerHTML={{ __html: q.stimulus }} />
                                            </div>
                                        )}
                                        <div>
                                            <span className="font-bold text-slate-500 block mb-1">মূল প্রশ্ন টেক্সট (Question Text):</span>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: q.questionText || '—' }} />
                                        </div>
                                        {q.correctAnswer && (
                                            <div>
                                                <span className="font-bold text-slate-500 block mb-1">মূল উত্তর (Correct Answer):</span>
                                                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: q.correctAnswer }} />
                                            </div>
                                        )}
                                        {q.explanation && (
                                            <div>
                                                <span className="font-bold text-slate-500 block mb-1">মূল ব্যাখ্যা (Explanation):</span>
                                                <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── EDITABLE: Stimulus ── */}
                        <div className="space-y-1.5">
                            <SectionHeader icon={Edit3} title="উদ্দীপক / Stimulus" />
                            {q.type === 'CQ' ? (
                                <RichTextEditor
                                    value={form.stimulus}
                                    onChange={val => set('stimulus', val)}
                                    height="h-28"
                                    placeholder="উদ্দীপক লিখুন — সমীকরণ, তথ্য, পরিস্থিতি..."
                                    className="bg-white text-[12px]"
                                />
                            ) : (
                                <textarea
                                    value={form.stimulus}
                                    onChange={e => set('stimulus', e.target.value)}
                                    rows={3}
                                    placeholder="উদ্দীপক লিখুন (যদি থাকে)..."
                                    className="w-full px-3 py-2.5 text-[12px] bg-amber-50/50 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-400"
                                />
                            )}
                        </div>

                        {/* ── EDITABLE: Question Text ── */}
                        {q.type === 'CQ' && editMode === 'legacy' ? (
                            <div className="space-y-1.5">
                                <SectionHeader icon={FileText} title="সৃজনশীল প্রশ্ন / Question Text" />
                                <RichTextEditor
                                    value={form.questionText}
                                    onChange={val => set('questionText', val)}
                                    height="h-40"
                                    placeholder="সৃজনশীল প্রশ্নের মূল কন্টেন্ট লিখুন..."
                                    className="bg-white text-[12px]"
                                />
                            </div>
                        ) : q.type !== 'CQ' ? (
                            <div className="space-y-1.5">
                                <SectionHeader icon={FileText} title="প্রশ্ন / Question Text" />
                                <textarea
                                    value={form.questionText}
                                    onChange={e => set('questionText', e.target.value)}
                                    rows={4}
                                    placeholder="প্রশ্নের টেক্সট লিখুন..."
                                    className="w-full px-3 py-2.5 text-[13px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all resize-none text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <SectionHeader icon={FileText} title="উপ-প্রশ্ন (CQ Sub-Questions)" />
                                {form.cqParts.map((part, index) => {
                                    const colors = [
                                        { color: 'border-blue-200 bg-blue-50/30', iconBg: 'bg-blue-500' },
                                        { color: 'border-emerald-200 bg-emerald-50/30', iconBg: 'bg-emerald-500' },
                                        { color: 'border-amber-200 bg-amber-50/30', iconBg: 'bg-amber-500' },
                                        { color: 'border-rose-200 bg-rose-50/30', iconBg: 'bg-rose-500' }
                                    ];
                                    const theme = colors[index % colors.length];
                                    const isEnglish = q.language && q.language.toLowerCase() === 'english';
                                    const displayLabel = isEnglish ? String.fromCharCode(97 + index) : (['ক', 'খ', 'গ', 'ঘ'][index] || String.fromCharCode(97 + index));

                                    return (
                                        <div key={index} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 ${theme.color} transition-all`}>
                                            <div className="shrink-0 flex flex-col items-center gap-1">
                                                <span className={`w-8 h-8 rounded-lg ${theme.iconBg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                                                    {displayLabel}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-500">Marks: {part.marks}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-3">
                                                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">প্রশ্ন টেক্সট</span>
                                                    <RichTextEditor
                                                        value={part.text || ''}
                                                        onChange={(val) => {
                                                            const pts = [...form.cqParts];
                                                            pts[index].text = val;
                                                            set('cqParts', pts);
                                                        }}
                                                        placeholder={`${displayLabel} অংশের প্রশ্ন লিখুন...`}
                                                        height="h-16"
                                                        minimal={true}
                                                        className="text-xs bg-white"
                                                    />
                                                </div>
                                                <div className="bg-emerald-50/30 p-2 rounded-lg border border-emerald-100 shadow-sm">
                                                    <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-1">উত্তর (ঐচ্ছিক)</span>
                                                    <RichTextEditor
                                                        value={part.answer || ''}
                                                        onChange={(val) => {
                                                            const pts = [...form.cqParts];
                                                            pts[index].answer = val;
                                                            set('cqParts', pts);
                                                        }}
                                                        placeholder={`${displayLabel} অংশের উত্তর লিখুন (ঐচ্ছিক)...`}
                                                        height="h-16"
                                                        minimal={true}
                                                        className="text-xs bg-white"
                                                    />
                                                </div>
                                                <div className="bg-amber-50/30 p-2 rounded-lg border border-amber-100 shadow-sm">
                                                    <span className="block text-[9px] font-bold text-amber-600 uppercase tracking-wide mb-1">ব্যাখ্যা (ঐচ্ছিক)</span>
                                                    <RichTextEditor
                                                        value={part.explanation || ''}
                                                        onChange={(val) => {
                                                            const pts = [...form.cqParts];
                                                            pts[index].explanation = val;
                                                            set('cqParts', pts);
                                                        }}
                                                        placeholder={`${displayLabel} অংশের ব্যাখ্যা লিখুন (ঐচ্ছিক)...`}
                                                        height="h-16"
                                                        minimal={true}
                                                        className="text-xs bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── EDITABLE: Statements (Multiple Completion) ── */}
                        {q.mcqType === 'MULTIPLE_COMPLETION' && (
                            <div className="space-y-1.5">
                                <SectionHeader icon={Layers} title="তথ্য / বিবৃতি (Statements)" />
                                <div className="space-y-2">
                                    {form.statements.map((stmt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0">{['i', 'ii', 'iii'][idx] || idx+1}</span>
                                            <input type="text"
                                                value={stmt.replace(/^[iv]+\.\s*/, '')}
                                                onChange={(e) => {
                                                    const newStmts = [...form.statements];
                                                    const label = ['i', 'ii', 'iii'][idx] || idx+1;
                                                    newStmts[idx] = `${label}. ${e.target.value}`;
                                                    set('statements', newStmts);
                                                }}
                                                className="flex-1 px-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-slate-700"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── EDITABLE: MCQ Options ── */}
                        {q.type === 'MCQ' && form.options.length > 0 && (
                            <div className="space-y-1.5">
                                <SectionHeader icon={CheckCircle} title="MCQ Options (Edit & Set Correct)" />
                                <div className="space-y-2">
                                    {form.options.map((opt, idx) => {
                                        const isEnglish = q.language && q.language.toLowerCase() === 'english';
                                        const displayLabel = isEnglish ? String.fromCharCode(65 + idx) : (['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(65 + idx));
                                        return (
                                        <div key={opt.id || idx}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                                opt.correct ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                                            }`}>
                                            {/* Radio to set correct */}
                                            <button
                                                onClick={() => {
                                                    setForm(prev => ({
                                                        ...prev,
                                                        options: prev.options.map((o, i) => ({ ...o, correct: i === idx }))
                                                    }));
                                                }}
                                                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                                    opt.correct ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                }`}
                                                title={opt.correct ? 'Correct answer' : 'Set as correct'}
                                            >
                                                {displayLabel}
                                            </button>
                                            <input
                                                type="text"
                                                value={opt.optionText}
                                                onChange={e => updateOption(idx, 'optionText', e.target.value)}
                                                className="flex-1 px-2 py-1 text-[12px] bg-transparent border-0 border-b border-transparent focus:border-primary/30 focus:outline-none text-slate-700 placeholder:text-slate-400"
                                                placeholder={`Option ${displayLabel}`}
                                            />
                                            {opt.correct && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        )}

                        {/* ── EDITABLE: Correct Answer (non-MCQ / Legacy CQ) ── */}
                        {((q.type !== 'MCQ' && q.type !== 'CQ') || (q.type === 'CQ' && editMode === 'legacy')) && (
                            <div className="space-y-1.5">
                                <SectionHeader icon={CheckCircle} title="সঠিক উত্তর / Correct Answer" />
                                {q.type === 'CQ' ? (
                                    <RichTextEditor
                                        value={form.correctAnswer}
                                        onChange={val => set('correctAnswer', val)}
                                        height="h-32"
                                        placeholder="সৃজনশীল প্রশ্নের উত্তর লিখুন..."
                                        className="bg-white text-[12px]"
                                    />
                                ) : (
                                    <textarea
                                        value={form.correctAnswer}
                                        onChange={e => set('correctAnswer', e.target.value)}
                                        rows={3}
                                        placeholder="সঠিক উত্তর লিখুন..."
                                        className="w-full px-3 py-2.5 text-[12px] bg-emerald-50/50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-400"
                                    />
                                )}
                            </div>
                        )}

                        {/* ── EDITABLE: Explanation ── */}
                        {(q.type !== 'CQ' || (q.type === 'CQ' && editMode === 'legacy')) && (
                            <div className="space-y-1.5">
                                <SectionHeader icon={MessageSquare} title="ব্যাখ্যা / Explanation" />
                                {q.type === 'CQ' ? (
                                    <RichTextEditor
                                        value={form.explanation}
                                        onChange={val => set('explanation', val)}
                                        height="h-32"
                                        placeholder="প্রশ্নের ব্যাখ্যা লিখুন (ঐচ্ছিক)..."
                                        className="bg-white text-[12px]"
                                    />
                                ) : (
                                    <textarea
                                        value={form.explanation}
                                        onChange={e => set('explanation', e.target.value)}
                                        rows={3}
                                        placeholder="প্রশ্নের ব্যাখ্যা লিখুন (ঐচ্ছিক)..."
                                        className="w-full px-3 py-2.5 text-[12px] bg-blue-50/50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-400"
                                    />
                                )}
                            </div>
                        )}

                        <div className="border-t border-dashed border-slate-200" />

                        {/* ── LOCKED: Source / Chapter / Topic / Tags ── */}
                        <div className="space-y-2">
                            <SectionHeader icon={Lock} title="Source, Chapter, Topic, Tags (Locked)" locked />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                <LockedField label="Source" value={q.sourceReference || 'N/A'} />
                                <LockedField label="Subject" value={q.classSubject?.subject?.name || 'N/A'} />
                                <LockedField label="Chapter" value={q.chapter?.name || 'N/A'} />
                                <LockedField label="Topic" value={q.topic?.name || 'N/A'} />
                            </div>
                        </div>

                        <div className="border-t border-dashed border-slate-200" />

                        {/* ── REQUIRED: Revision Notes ── */}
                        <div className="space-y-1.5">
                            <SectionHeader icon={MessageSquare} title="Revision Notes (আবশ্যক)" />
                            <textarea
                                value={form.revisionNotes}
                                onChange={e => set('revisionNotes', e.target.value)}
                                rows={3}
                                placeholder="কেন এই রিভিশন প্রয়োজন? পর্যালোচকের জন্য নোট লিখুন..."
                                className={`w-full px-3 py-2.5 text-[12px] bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-400 ${!form.revisionNotes.trim() ? 'border-rose-200' : 'border-slate-200 focus:border-primary/50'}`}
                            />
                            {!form.revisionNotes.trim() && (
                                <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                                    <AlertCircle size={10} /> এই ফিল্ডটি পূরণ করা বাধ্যতামূলক
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Toast ── */}
                {toast && (
                    <div className={`mx-5 mb-2 px-4 py-3 rounded-xl text-[12px] font-semibold flex items-start gap-2.5 border ${
                        toast.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                        {toast.type === 'success'
                            ? <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                            : <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />}
                        {toast.msg}
                    </div>
                )}

                {/* ── Footer ── */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-[12px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all active:scale-[0.98]">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.revisionNotes.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-black text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(to right, var(--primary-color, #e91e8c), var(--secondary-color, #a855f7))' }}
                    >
                        {saving
                            ? <><Loader2 size={13} className="animate-spin" /> Submitting...</>
                            : <><Send size={13} /> Submit Revision</>
                        }
                    </button>
                </div>
            </div>
        </>
    );
};

export default RevisePanel;
