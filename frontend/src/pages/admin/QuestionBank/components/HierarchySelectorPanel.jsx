import React from 'react';
import { Layers, Check, ChevronUp, ChevronDown, Plus, Loader2 } from 'lucide-react';

export default function HierarchySelectorPanel({ controls }) {
    const {
        levels, streams, classes, subjects,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
        curriculumRule, hierarchyOpen, setHierarchyOpen,
        newChapterName, setNewChapterName, creatingChapter, showNewChapter, setShowNewChapter, handleCreateChapter, localChapters,
        newTopicName, setNewTopicName, creatingTopic, showNewTopic, setShowNewTopic, handleCreateTopic, localTopics
    } = controls;

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-white/60 border-b border-blue-100">
                <div className="flex items-center gap-2 flex-wrap">
                    <Layers size={14} className="text-blue-500" />
                    <h3 className="text-xs font-bold text-slate-700">শিক্ষাস্তর নির্বাচন</h3>
                    {classId && subjectId && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold border border-emerald-200">
                            <Check size={9} /> নির্বাচিত
                        </span>
                    )}
                    {curriculumRule?.found && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-bold border border-violet-200" title={curriculumRule.title}>
                            ✨ Curriculum Rule Active
                        </span>
                    )}
                    {curriculumRule && !curriculumRule.found && subjectId && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                            No Rule — AI auto-detects
                        </span>
                    )}
                </div>
                <button onClick={() => setHierarchyOpen(v => !v)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                    {hierarchyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
            </div>
            {hierarchyOpen && (
                <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {/* Level */}
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">শিক্ষাস্তর</label>
                            <select value={levelId} onChange={e => setLevelId(e.target.value)}
                                className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                <option value="">নির্বাচন করুন</option>
                                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        {/* Stream */}
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">বিভাগ/ধারা</label>
                            <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId}
                                className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                                <option value="">নির্বাচন করুন</option>
                                {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        {/* Class */}
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">শ্রেণি</label>
                            <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId}
                                className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                                <option value="">নির্বাচন করুন</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {/* Subject */}
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">বিষয়</label>
                            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId}
                                className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed">
                                <option value="">নির্বাচন করুন</option>
                                {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* Chapter */}
                    {subjectId && (
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">অধ্যায় (ঐচ্ছিক)</label>
                            <div className="flex gap-1.5">
                                <select value={chapterId} onChange={e => { setChapterId(e.target.value); setShowNewChapter(false); }}
                                    className="flex-1 p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                    <option value="">অধ্যায় নির্বাচন করুন</option>
                                    {localChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button onClick={() => setShowNewChapter(v => !v)}
                                    className="px-2 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold hover:bg-amber-100 flex items-center gap-1">
                                    <Plus size={11} /> নতুন
                                </button>
                            </div>
                            {showNewChapter && (
                                <div className="mt-2 flex gap-2">
                                    <input value={newChapterName} onChange={e => setNewChapterName(e.target.value)}
                                        placeholder="অধ্যায়ের নাম" className="flex-1 p-2 text-xs border border-amber-200 rounded-lg outline-none bg-white" />
                                    <button onClick={handleCreateChapter} disabled={creatingChapter || !newChapterName.trim()}
                                        className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                                        {creatingChapter ? <Loader2 size={11} className="animate-spin" /> : '✓'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Topic */}
                    {chapterId && (
                        <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">টপিক (ঐচ্ছিক)</label>
                            <div className="flex gap-1.5">
                                <select value={topicId} onChange={e => { setTopicId(e.target.value); setShowNewTopic(false); }}
                                    className="flex-1 p-2 text-xs border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                    <option value="">টপিক নির্বাচন করুন</option>
                                    {localTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <button onClick={() => setShowNewTopic(v => !v)}
                                    className="px-2 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold hover:bg-indigo-100 flex items-center gap-1">
                                    <Plus size={11} /> নতুন
                                </button>
                            </div>
                            {showNewTopic && (
                                <div className="mt-2 flex gap-2">
                                    <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
                                        placeholder="টপিকের নাম" className="flex-1 p-2 text-xs border border-indigo-200 rounded-lg outline-none bg-white" />
                                    <button onClick={handleCreateTopic} disabled={creatingTopic || !newTopicName.trim()}
                                        className="px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                                        {creatingTopic ? <Loader2 size={11} className="animate-spin" /> : '✓'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Selected summary */}
                    {(classId || subjectId || chapterId) && (
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-blue-100">
                            {[
                                levels.find(l => l.id === levelId)?.name, 
                                streams.find(s => s.id === streamId)?.name, 
                                classes.find(c => c.id === classId)?.name, 
                                subjects.find(s => s.classSubjectId === subjectId)?.subjectName, 
                                localChapters.find(c => c.id === chapterId)?.name, 
                                localTopics.find(t => t.id === topicId)?.name
                            ].filter(Boolean).map((n, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 bg-white border border-blue-200 rounded-full font-bold text-slate-600">{n}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
