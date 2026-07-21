import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, GraduationCap, MapPin, Layers, Book, CheckSquare, Square, AlertCircle, Loader } from 'lucide-react';
import academicService from '../../../../services/academicService';
import lectureService from '../../../../services/lectureService';

export default function ImportKnowledgeHubModal({
    isOpen,
    closeModal,
    hierarchy,
    subjectLanguageMap,
    onImportSuccess
}) {
    const [levelId, setLevelId] = useState('');
    const [streamId, setStreamId] = useState('');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [chapterId, setChapterId] = useState('');
    
    const [chapters, setChapters] = useState([]);
    const [isLoadingChapters, setIsLoadingChapters] = useState(false);

    const [topics, setTopics] = useState([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);
    const [selectedTopicIds, setSelectedTopicIds] = useState([]);

    const [importing, setImporting] = useState(false);

    // Cascading selection filters
    const filteredStreams = useMemo(() => {
        if (!levelId) return [];
        return hierarchy.streams?.filter(s => s._levelId === levelId) || [];
    }, [levelId, hierarchy.streams]);

    const filteredClasses = useMemo(() => {
        if (!streamId) return [];
        return hierarchy.classes?.filter(c => c._streamId === streamId) || [];
    }, [streamId, hierarchy.classes]);

    const filteredSubjects = useMemo(() => {
        if (!classId) return [];
        return hierarchy.classSubjects?.filter(cs => cs._classId === classId) || [];
    }, [classId, hierarchy.classSubjects]);

    // Fetch chapters when subjectId changes
    useEffect(() => {
        if (!subjectId) {
            setChapters([]);
            setChapterId('');
            return;
        }
        setIsLoadingChapters(true);
        academicService.getChaptersByClassSubject(subjectId)
            .then(data => {
                setChapters(data || []);
                setChapterId('');
            })
            .catch(err => {
                console.error('Failed to fetch chapters:', err);
                setChapters([]);
            })
            .finally(() => {
                setIsLoadingChapters(false);
            });
    }, [subjectId]);

    // Fetch topics when chapterId changes
    useEffect(() => {
        if (!chapterId) {
            setTopics([]);
            setSelectedTopicIds([]);
            return;
        }
        setIsLoadingTopics(true);
        lectureService.getChapterMetadata(chapterId)
            .then(res => {
                if (res.success && res.data) {
                    setTopics(res.data.topics || []);
                } else {
                    setTopics([]);
                }
                setSelectedTopicIds([]);
            })
            .catch(err => {
                console.error('Failed to fetch chapter topics:', err);
                setTopics([]);
            })
            .finally(() => {
                setIsLoadingTopics(false);
            });
    }, [chapterId]);

    const handleToggleTopic = (topicId) => {
        setSelectedTopicIds(prev => 
            prev.includes(topicId) 
                ? prev.filter(id => id !== topicId) 
                : [...prev, topicId]
        );
    };

    const handleSelectAllTopics = () => {
        if (selectedTopicIds.length === topics.length) {
            setSelectedTopicIds([]);
        } else {
            setSelectedTopicIds(topics.map(t => t.id));
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (selectedTopicIds.length === 0) return;

        setImporting(true);
        try {
            // Find selected topics detailed content
            const matchedTopics = topics.filter(t => selectedTopicIds.includes(t.id));
            
            // Build generated HTML output
            const container = document.createElement('div');
            
            matchedTopics.forEach(t => {
                // Section Title header
                const h3 = document.createElement('h3');
                h3.className = 'lecture-section-header';
                h3.setAttribute('data-section-id', t.id || `new-${Date.now()}`);
                h3.textContent = `📖 ${t.name}`;
                container.appendChild(h3);

                // Golden source book content
                const goldenContentDiv = document.createElement('div');
                if (t.goldenText) {
                    goldenContentDiv.innerHTML = `<blockquote class="golden-ref" style="border-left: 4px solid #4f46e5; padding-left: 12px; margin-left: 0; color: #475569; font-style: normal; background-color: #f8fafc; padding: 12px; border-radius: 8px;">${t.goldenText.replace(/\n/g, '<br/>')}</blockquote>`;
                } else {
                    goldenContentDiv.innerHTML = `<p style="color: #94a3b8; font-style: normal;">এই টপিকের অধীনে কোনো গোল্ডেন মেটেরিয়াল পাওয়া যায়নি।</p>`;
                }
                container.appendChild(goldenContentDiv);

                // Approved questions category header and blocks
                if (t.approvedQuestions && t.approvedQuestions.length > 0) {
                    const qHeader = document.createElement('h4');
                    qHeader.className = 'lecture-category-header';
                    qHeader.textContent = 'টপিক সংশ্লিষ্ট প্রশ্নসমূহ';
                    container.appendChild(qHeader);

                    t.approvedQuestions.forEach(q => {
                        const qDiv = document.createElement('div');
                        qDiv.setAttribute('data-type', 'question-block');
                        qDiv.setAttribute('questionid', q.questionId || q.id);
                        qDiv.setAttribute('data-section-id', t.id);
                        qDiv.setAttribute('type', q.type || 'MCQ');
                        qDiv.setAttribute('questiontext', q.questionText || '');
                        qDiv.setAttribute('marks', String(q.marks || 1));
                        qDiv.setAttribute('data-options', JSON.stringify(q.options || []));
                        qDiv.setAttribute('data-statements', JSON.stringify(q.statements || []));
                        qDiv.setAttribute('stimulus', q.stimulus || '');
                        qDiv.setAttribute('explanation', q.explanation || '');
                        qDiv.setAttribute('answer', q.answer || q.correctAnswer || '');
                        qDiv.setAttribute('chaptername', q.chapterName || '');
                        if (q.mcqType) qDiv.setAttribute('mcqtype', q.mcqType);
                        if (q.difficulty) qDiv.setAttribute('difficulty', q.difficulty);
                        container.appendChild(qDiv);
                    });
                }
            });

            onImportSuccess(container.innerHTML, matchedTopics, subjectId, chapterId);
            closeAndReset();
        } catch (err) {
            console.error('Failed to import topics:', err);
            alert('টপিক ইম্পোর্ট করতে সমস্যা হয়েছে।');
        } finally {
            setImporting(false);
        }
    };

    const closeAndReset = () => {
        setLevelId('');
        setStreamId('');
        setClassId('');
        setSubjectId('');
        setChapterId('');
        setChapters([]);
        setTopics([]);
        setSelectedTopicIds([]);
        closeModal();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={closeAndReset}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 40 }}
                        className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl relative z-[110] flex flex-col max-h-[90vh] border border-white/20"
                    >
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Knowledge Hub থেকে টপিক ইম্পোর্ট করুন</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select subject, chapter and topics to import into canvas</p>
                                </div>
                            </div>
                            <button onClick={closeAndReset} className="w-9 h-9 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full flex items-center justify-center transition-all cursor-pointer">
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                {/* Left Form Column */}
                                <div className="md:col-span-2 space-y-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><GraduationCap size={12} /> Level / স্তর</label>
                                            <select 
                                                value={levelId} 
                                                onChange={e => { setLevelId(e.target.value); setStreamId(''); setClassId(''); setSubjectId(''); setChapterId(''); }} 
                                                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">স্তর নির্বাচন করুন</option>
                                                {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><Layers size={12} /> Stream / বিভাগ</label>
                                            <select 
                                                value={streamId} 
                                                onChange={e => { setStreamId(e.target.value); setClassId(''); setSubjectId(''); setChapterId(''); }} 
                                                disabled={!levelId || filteredStreams.length === 0}
                                                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">বিভাগ নির্বাচন করুন</option>
                                                {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><Layers size={12} /> Class / শ্রেণী</label>
                                            <select 
                                                value={classId} 
                                                onChange={e => { setClassId(e.target.value); setSubjectId(''); setChapterId(''); }} 
                                                disabled={!streamId}
                                                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">শ্রেণী নির্বাচন করুন</option>
                                                {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><Book size={12} /> Subject / বিষয়</label>
                                            <select 
                                                value={subjectId} 
                                                onChange={e => { setSubjectId(e.target.value); setChapterId(''); }} 
                                                disabled={!classId}
                                                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">বিষয় নির্বাচন করুন</option>
                                                {filteredSubjects.map(cs => {
                                                    const subData = subjectLanguageMap[cs.id];
                                                    return (
                                                        <option key={cs.id} value={cs.id}>
                                                            {subData?.name || 'Unknown'} {subData?.isEnglish ? '[EN]' : '[BN]'}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-550 uppercase tracking-widest flex items-center gap-1.5"><BookOpen size={12} /> Chapter / অধ্যায়</label>
                                            <select 
                                                value={chapterId} 
                                                onChange={e => setChapterId(e.target.value)} 
                                                disabled={!subjectId || isLoadingChapters}
                                                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                                            >
                                                <option value="">{isLoadingChapters ? 'অধ্যায় লোড হচ্ছে...' : 'অধ্যায় নির্বাচন করুন'}</option>
                                                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Topics Selection Column */}
                                <div className="md:col-span-3 flex flex-col min-h-[300px]">
                                    <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col overflow-hidden">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
                                            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">টপিকসমূহ (Topics)</h3>
                                            {topics.length > 0 && (
                                                <button 
                                                    type="button" 
                                                    onClick={handleSelectAllTopics} 
                                                    className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase cursor-pointer"
                                                >
                                                    {selectedTopicIds.length === topics.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-y-auto min-h-[220px] pr-2 custom-scrollbar">
                                            {isLoadingTopics ? (
                                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                    <Loader className="text-indigo-600 animate-spin" size={24} />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">টপিকসমূহ লোড হচ্ছে...</p>
                                                </div>
                                            ) : !chapterId ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-2">
                                                    <AlertCircle size={24} className="opacity-55 text-slate-350" />
                                                    <p className="text-xs font-semibold">টপিক দেখতে অনুগ্রহ করে বাম পাশ থেকে স্তর, বিষয় ও অধ্যায় নির্বাচন করুন।</p>
                                                </div>
                                            ) : topics.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 space-y-2">
                                                    <AlertCircle size={24} className="opacity-55 text-slate-350" />
                                                    <p className="text-xs font-semibold">এই অধ্যায়ের অধীনে কোনো টপিক পাওয়া যায়নি।</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {topics.map(t => {
                                                        const isChecked = selectedTopicIds.includes(t.id);
                                                        return (
                                                            <div 
                                                                key={t.id} 
                                                                onClick={() => handleToggleTopic(t.id)}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                                                    isChecked 
                                                                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-900' 
                                                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                                                }`}
                                                            >
                                                                {isChecked ? (
                                                                    <CheckSquare size={16} className="text-indigo-600 shrink-0" />
                                                                ) : (
                                                                    <Square size={16} className="text-slate-400 shrink-0" />
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold truncate">{t.name}</p>
                                                                    {t.approvedQuestions && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">
                                                                            {t.approvedQuestions.length} Questions Available
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3 shrink-0">
                            <button 
                                type="button" 
                                onClick={closeAndReset} 
                                className="px-5 py-2.5 text-slate-500 hover:text-rose-500 font-black uppercase tracking-widest text-xs transition-colors cursor-pointer"
                            >
                                Discard
                            </button>
                            <button 
                                type="submit" 
                                onClick={handleImportSubmit} 
                                disabled={selectedTopicIds.length === 0 || importing} 
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-xl hover:shadow-md transition-all active:scale-95 text-xs disabled:cursor-not-allowed cursor-pointer shadow-sm"
                            >
                                {importing ? (
                                    <>
                                        <Loader size={14} className="animate-spin" />
                                        <span>ইম্পোর্ট হচ্ছে...</span>
                                    </>
                                ) : (
                                    <>
                                        <BookOpen size={14} />
                                        <span>লেকচার এডিটরে যোগ করুন ({selectedTopicIds.length})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
