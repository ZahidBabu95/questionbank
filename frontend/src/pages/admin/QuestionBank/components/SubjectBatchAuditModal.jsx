import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, X, CheckCircle, AlertTriangle, Loader2, Play, Sliders, Zap, CheckCheck, RefreshCw } from 'lucide-react';
import academicService from '../../../../services/academicService';
import questionService from '../../../../services/questionService';

const SubjectBatchAuditModal = ({ isOpen, onClose, onBatchFinished, initialLevelId, initialStreamId, initialClassId, initialSubjectId, initialChapterId }) => {
    const [fullHierarchy, setFullHierarchy] = useState(null);
    const [levels, setLevels] = useState([]);
    const [filteredStreams, setFilteredStreams] = useState([]);
    const [filteredClasses, setFilteredClasses] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [filteredChapters, setFilteredChapters] = useState([]);
    
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedChapterId, setSelectedChapterId] = useState('');
    
    const [autoFixTopics, setAutoFixTopics] = useState(true);
    const [skipAlreadyAudited, setSkipAlreadyAudited] = useState(true);
    const [minScore, setMinScore] = useState(80);
    
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    const [starting, setStarting] = useState(false);
    const [batchId, setBatchId] = useState(null);
    const [statusData, setStatusData] = useState(null);

    // Fetch full relational hierarchy & levels on modal open or resume active batch
    useEffect(() => {
        if (!isOpen) return;

        // Auto-resume active background batch if present
        const activeStoredBatchId = localStorage.getItem('activeSubjectBatchId');
        if (activeStoredBatchId && !batchId) {
            setBatchId(activeStoredBatchId);
        }

        const loadHierarchy = async () => {
            setLoadingMetadata(true);
            try {
                const [h, levelList] = await Promise.all([
                    academicService.getHierarchy().catch(() => null),
                    academicService.getAllLevels().catch(() => [])
                ]);
                
                setFullHierarchy(h || {});
                setLevels(levelList || h?.levels || []);

                let levelId = initialLevelId || '';
                let streamId = initialStreamId || '';
                let classId = initialClassId || '';
                let subjectId = initialSubjectId || '';
                let chapterId = initialChapterId || '';

                // Trace backward if subjectId is provided but class/stream/level are blank
                if (subjectId && h?.classSubjects) {
                    const cs = h.classSubjects.find(x => String(x.id) === String(subjectId) || String(x.classSubjectId) === String(subjectId));
                    if (cs && !classId) {
                        classId = cs._classId || cs.classId || cs.academicClass?.id || '';
                    }
                }

                if (classId && h?.classes) {
                    const cls = h.classes.find(c => String(c.id) === String(classId));
                    if (cls) {
                        if (!streamId) streamId = cls._streamId || cls.streamId || cls.stream?.id || '';
                        if (!levelId) levelId = cls.levelId || cls._levelId || cls.academicLevel?.id || cls.stream?.levelId || '';
                    }
                }

                if (streamId && h?.streams && !levelId) {
                    const stm = h.streams.find(s => String(s.id) === String(streamId));
                    if (stm) levelId = stm._levelId || stm.levelId || stm.academicLevel?.id || '';
                }

                setSelectedLevelId(levelId);
                setSelectedStreamId(streamId);
                setSelectedClassId(classId);
                setSelectedSubjectId(subjectId);
                setSelectedChapterId(chapterId);
            } catch (err) {
                console.error("Failed to load full hierarchy:", err);
            } finally {
                setLoadingMetadata(false);
            }
        };
        loadHierarchy();
    }, [isOpen, initialLevelId, initialStreamId, initialClassId, initialSubjectId, initialChapterId]);


    // 1. Relational Stream Filtering: Update streams based on selectedLevelId
    useEffect(() => {
        if (!isOpen) return;

        const updateStreams = async () => {
            if (!selectedLevelId) {
                setFilteredStreams(fullHierarchy?.streams || []);
                return;
            }

            let strms = (fullHierarchy?.streams || []).filter(s => 
                String(s._levelId) === String(selectedLevelId) ||
                String(s.levelId) === String(selectedLevelId) ||
                String(s.academicLevel?.id) === String(selectedLevelId)
            );

            if (strms.length === 0) {
                strms = await academicService.getStreamsByLevel(selectedLevelId).catch(() => []);
            }

            setFilteredStreams(strms || []);
        };

        updateStreams();
    }, [selectedLevelId, fullHierarchy, isOpen]);

    // 2. Relational Class Filtering: Update classes based on selectedStreamId or selectedLevelId
    useEffect(() => {
        if (!isOpen) return;
        
        const updateClasses = async () => {
            if (selectedStreamId) {
                let clsList = (fullHierarchy?.classes || []).filter(c => 
                    String(c._streamId) === String(selectedStreamId) ||
                    String(c.streamId) === String(selectedStreamId) ||
                    String(c.stream?.id) === String(selectedStreamId)
                );

                if (clsList.length === 0) {
                    clsList = await academicService.getClassesByStream(selectedStreamId).catch(() => []);
                }
                setFilteredClasses(clsList || []);
                return;
            }

            if (selectedLevelId) {
                const streamIds = new Set(filteredStreams.map(s => String(s.id)));
                let matchedClasses = (fullHierarchy?.classes || []).filter(c => 
                    String(c._levelId) === String(selectedLevelId) ||
                    String(c.levelId) === String(selectedLevelId) ||
                    String(c.academicLevel?.id) === String(selectedLevelId) ||
                    streamIds.has(String(c._streamId)) ||
                    streamIds.has(String(c.streamId))
                );

                if (matchedClasses.length === 0 && filteredStreams.length > 0) {
                    try {
                        const classPromises = filteredStreams.map(s => academicService.getClassesByStream(s.id).catch(() => []));
                        const classResults = await Promise.all(classPromises);
                        matchedClasses = classResults.flat();
                    } catch (e) {
                        console.error("Fallback class fetch failed:", e);
                    }
                }

                if (matchedClasses.length === 0) {
                    matchedClasses = await academicService.getAllClasses().catch(() => []);
                }

                setFilteredClasses(matchedClasses || []);
                return;
            }

            if (fullHierarchy?.classes && fullHierarchy.classes.length > 0) {
                setFilteredClasses(fullHierarchy.classes);
            } else {
                const allCls = await academicService.getAllClasses().catch(() => []);
                setFilteredClasses(allCls || []);
            }
        };

        updateClasses();
    }, [selectedStreamId, selectedLevelId, filteredStreams, fullHierarchy, isOpen]);

    // 3. Relational Subject Filtering: Update subjects based on selectedClassId or selectedStreamId or selectedLevelId
    useEffect(() => {
        if (!isOpen) return;

        const updateSubjects = async () => {
            if (selectedClassId) {
                let subjs = (fullHierarchy?.classSubjects || []).filter(cs => 
                    String(cs.classId) === String(selectedClassId) || 
                    String(cs._classId) === String(selectedClassId) ||
                    String(cs.academicClass?.id) === String(selectedClassId)
                );

                if (subjs.length === 0) {
                    subjs = await academicService.getSubjectsByClass(selectedClassId).catch(() => []);
                }
                setFilteredSubjects(subjs || []);
            } else if (filteredClasses.length > 0) {
                const validClassIds = new Set(filteredClasses.map(c => String(c.id)));
                let subjs = (fullHierarchy?.classSubjects || []).filter(cs => 
                    validClassIds.has(String(cs.classId || cs._classId || cs.academicClass?.id))
                );
                setFilteredSubjects(subjs);
            } else {
                setFilteredSubjects(fullHierarchy?.classSubjects || []);
            }
        };

        updateSubjects();
    }, [selectedClassId, filteredClasses, fullHierarchy, isOpen]);

    // 4. Relational Chapter Filtering: Update chapters based on selectedSubjectId
    useEffect(() => {
        if (!isOpen) return;

        const updateChapters = async () => {
            if (!selectedSubjectId) {
                setFilteredChapters([]);
                return;
            }

            let chaps = (fullHierarchy?.chapters || []).filter(ch => 
                String(ch.classSubjectId) === String(selectedSubjectId) ||
                String(ch._classSubjectId) === String(selectedSubjectId) ||
                String(ch.classSubject?.id) === String(selectedSubjectId)
            );

            if (chaps.length === 0) {
                chaps = await academicService.getChaptersByClassSubject(selectedSubjectId).catch(() => []);
            }

            setFilteredChapters(chaps || []);
        };

        updateChapters();
    }, [selectedSubjectId, fullHierarchy, isOpen]);

    // Reset child selections when parent filter changes manually
    const handleLevelChange = (e) => {
        const val = e.target.value;
        setSelectedLevelId(val);
        setSelectedStreamId('');
        setSelectedClassId('');
        setSelectedSubjectId('');
        setSelectedChapterId('');
    };

    const handleStreamChange = (e) => {
        const val = e.target.value;
        setSelectedStreamId(val);
        setSelectedClassId('');
        setSelectedSubjectId('');
        setSelectedChapterId('');
    };

    const handleClassChange = (e) => {
        const val = e.target.value;
        setSelectedClassId(val);
        setSelectedSubjectId('');
        setSelectedChapterId('');
    };

    const handleSubjectChange = (e) => {
        const val = e.target.value;
        setSelectedSubjectId(val);
        setSelectedChapterId('');
    };

    const [cancelling, setCancelling] = useState(false);

    const handleResetBatch = () => {
        localStorage.removeItem('activeSubjectBatchId');
        setBatchId(null);
        setStatusData(null);
    };

    // Polling progress tracker when batchId is active
    useEffect(() => {
        if (!batchId) return;

        const interval = setInterval(async () => {
            try {
                const res = await questionService.getBatchAgentStatus(batchId);
                if (res?.status === 'NOT_FOUND') {
                    // Invalid/Expired batch ID -> Auto clean up stale local storage
                    handleResetBatch();
                    clearInterval(interval);
                    return;
                }

                setStatusData(res);

                if (res?.status === 'COMPLETED' || res?.status === 'FAILED' || res?.status === 'CANCELLED') {
                    clearInterval(interval);
                    if (res?.status === 'COMPLETED') {
                        localStorage.removeItem('activeSubjectBatchId');
                    }
                    if (onBatchFinished) onBatchFinished();
                }
            } catch (err) {
                console.error("Failed to poll agent status:", err);
            }
        }, 1200);

        return () => clearInterval(interval);
    }, [batchId]);

    const handleStartBatchAgent = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setStarting(true);
        setStatusData(null);
        try {
            const payload = {
                classSubjectId: selectedSubjectId || null,
                chapterId: selectedChapterId || null,
                autoFixTopics: autoFixTopics,
                skipAlreadyAudited: skipAlreadyAudited,
                minScore: minScore
            };

            const res = await questionService.startSubjectBatchAgent(payload);
            if (res && res.batchId) {
                setBatchId(res.batchId);
                setStatusData(res);
                localStorage.setItem('activeSubjectBatchId', res.batchId);
            }
        } catch (err) {
            console.error("Failed to start batch agent:", err);
        } finally {
            setStarting(false);
        }
    };

    const handleCancelBatchAgent = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!batchId) return;
        setCancelling(true);
        try {
            await questionService.stopSubjectBatchAgent(batchId);
            const res = await questionService.getBatchAgentStatus(batchId);
            setStatusData(res);
            localStorage.removeItem('activeSubjectBatchId');
        } catch (err) {
            console.error("Failed to stop batch agent:", err);
        } finally {
            setCancelling(false);
        }
    };


    if (!isOpen) return null;

    const total = statusData?.totalCount || 0;
    const processed = statusData?.processedCount || 0;
    const autoFixed = statusData?.autoFixedCount || 0;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    const isRunning = statusData?.status === 'RUNNING';
    const isCompleted = statusData?.status === 'COMPLETED';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl text-slate-100 space-y-6 relative overflow-hidden">
                {/* Glow Background Gradient */}
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                Autonomous Subject Audit Agent
                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-mono border border-indigo-500/30">
                                    v2.5 AI Engine
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">সম্পূর্ণ বিষয়/অধ্যায়ের সকল প্রশ্ন সিকোয়েন্সিয়ালি ব্যাকগ্রাউন্ড অডিট ও অটো-ফিক্স এজেন্ট</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Loading state indicator */}
                {loadingMetadata && (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-indigo-400">
                        <Loader2 size={18} className="animate-spin" />
                        <span>একাডেমিক হায়ারার্কি ও ক্যাসকেডিং ডাটা লোড হচ্ছে...</span>
                    </div>
                )}

                {/* Target Scope Selection Controls (Cascading 5-Tier Relational Hierarchy) */}
                {!batchId && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                            {/* Level Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">স্তর (Level)</label>
                                <select
                                    value={selectedLevelId}
                                    onChange={handleLevelChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">সকল স্তর</option>
                                    {levels.map(lvl => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                                </select>
                            </div>

                            {/* Stream Dropdown (Filtered by Level) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">বিভাগ (Stream)</label>
                                <select
                                    value={selectedStreamId}
                                    onChange={handleStreamChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">সকল বিভাগ</option>
                                    {filteredStreams.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                </select>
                            </div>

                            {/* Class Dropdown (Filtered by Stream/Level) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">শ্রেণী (Class)</label>
                                <select
                                    value={selectedClassId}
                                    onChange={handleClassChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">সকল শ্রেণী</option>
                                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Subject Dropdown (Filtered by Class/Stream/Level) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">বিষয় (Subject)</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={handleSubjectChange}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">সকল বিষয় (Full Subject)</option>
                                    {filteredSubjects.map(s => <option key={s.id || s.classSubjectId} value={s.id || s.classSubjectId}>{s.name || s.subjectName || s.subject?.name}</option>)}
                                </select>
                            </div>

                            {/* Chapter Dropdown (Filtered by Subject) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1">অধ্যায় (Chapter)</label>
                                <select
                                    value={selectedChapterId}
                                    onChange={(e) => setSelectedChapterId(e.target.value)}
                                    disabled={!selectedSubjectId}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                                >
                                    <option value="">পুরো বিষয়ের সব অধ্যায়</option>
                                    {filteredChapters.map(ch => <option key={ch.id} value={ch.id}>{ch.chapterName || ch.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Agent Mode Options */}
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-amber-400" size={18} />
                                    <div>
                                        <span className="text-xs font-bold text-slate-100">অটো টপিক ও টাইপো কারেকশন (Auto-Fix Mismatches)</span>
                                        <p className="text-[11px] text-slate-400">কনফিডেন্স ৮০%+ হলে এআই নিজে থেকে টপিক ও টাইপো ফিক্স করে সেভ করে দেবে</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={autoFixTopics}
                                    onChange={(e) => setAutoFixTopics(e.target.checked)}
                                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                                />
                            </div>

                            {/* Skip Already Audited Toggle */}
                            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                                <div className="flex items-center gap-2">
                                    <CheckCheck className="text-emerald-400" size={18} />
                                    <div>
                                        <span className="text-xs font-bold text-slate-100">পূর্বে অডিট করা প্রশ্ন এড়িয়ে চলুন (Skip Already Audited)</span>
                                        <p className="text-[11px] text-slate-400">যেসব প্রশ্নে পূর্বে এআই অডিট সম্পন্ন হয়েছে সেগুলো পুনরায় প্রসেস করবে না</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={skipAlreadyAudited}
                                    onChange={(e) => setSkipAlreadyAudited(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                                />
                            </div>

                            {/* Confidence Slider */}

                            <div className="border-t border-slate-800/80 pt-3">
                                <div className="flex items-center justify-between text-xs font-bold mb-1">
                                    <span className="text-slate-300 flex items-center gap-1.5">
                                        <Sliders size={14} className="text-indigo-400" /> কনফিডেন্স থ্রেশহোল্ড (Minimum Score)
                                    </span>
                                    <span className="font-mono text-indigo-400">{minScore}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="70"
                                    max="95"
                                    step="5"
                                    value={minScore}
                                    onChange={(e) => setMinScore(Number(e.target.value))}
                                    className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Progress Bar Widget when Batch Running or Finished */}
                {batchId && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isRunning ? (
                                    <Loader2 size={20} className="animate-spin text-indigo-400" />
                                ) : isCompleted ? (
                                    <CheckCircle size={20} className="text-emerald-400" />
                                ) : (
                                    <AlertTriangle size={20} className="text-rose-400" />
                                )}
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                    {statusData?.message || 'প্রসেস হচ্ছে...'}
                                </span>
                            </div>
                            <span className="text-sm font-black font-mono text-indigo-400">{percent}%</span>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
                            <div
                                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-indigo-500/50"
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        {/* Counter Metrics Cards */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase">মোট প্রশ্ন</span>
                                <span className="text-base font-black text-white font-mono">{total}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                                <span className="text-[10px] text-indigo-300 font-bold block uppercase">অডিট প্রসেসড</span>
                                <span className="text-base font-black text-indigo-400 font-mono">{processed}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                                <span className="text-[10px] text-amber-300 font-bold block uppercase">পূর্বে অডিটেড</span>
                                <span className="text-base font-black text-amber-400 font-mono">{statusData?.skippedCount || 0}</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                                <span className="text-[10px] text-emerald-300 font-bold block uppercase">অটো-ফিক্সড</span>
                                <span className="text-base font-black text-emerald-400 font-mono">{autoFixed}</span>
                            </div>
                        </div>

                        {/* Real-time Activity Log Feed */}
                        {statusData?.logs && statusData.logs.length > 0 && (
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                                <div className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
                                    <span>⚡ এজেন্ট লাইভ অ্যাক্টিভিটি স্ট্রিম</span>
                                    <span className="text-indigo-400">{statusData.logs.length}টি অ্যাকশন</span>
                                </div>
                                {Array.from(statusData.logs).slice(-10).map((log, idx) => (
                                    <div key={idx} className="text-slate-300 leading-tight border-b border-slate-800/40 pb-1 last:border-0">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    {!batchId ? (
                        <button
                            type="button"
                            onClick={(e) => handleStartBatchAgent(e)}
                            disabled={starting}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                            <span>🚀 ব্যাকগ্রাউন্ড এজেন্ট চালু করুন (Start Agent)</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isRunning && (
                                <button
                                    type="button"
                                    onClick={(e) => handleCancelBatchAgent(e)}
                                    disabled={cancelling}
                                    className="px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                                    <span>🛑 এজেন্ট পজ/ক্যানসেল করুন</span>
                                </button>
                            )}

                            {statusData?.status === 'CANCELLED' && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        setBatchId(null);
                                        handleStartBatchAgent(e);
                                    }}
                                    disabled={starting}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                    <span>▶️ অডিট রিজিউম করুন (Resume Audit)</span>
                                </button>
                            )}

                            {isCompleted && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleResetBatch();
                                        if (onBatchFinished) onBatchFinished();
                                        onClose();
                                    }}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                                >
                                    <CheckCircle size={14} />
                                    <span>🔍 অডিটেড প্রশ্নসমূহ রিভিউ করুন</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    handleResetBatch();
                                    onClose();
                                }}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                            >
                                {isCompleted ? 'বন্ধ করুন' : 'প্যানেল বন্ধ করুন (Run in Background)'}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default SubjectBatchAuditModal;
