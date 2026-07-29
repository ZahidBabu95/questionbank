import React from 'react';
import { 
    Layers, Search, GitCompare, Filter, X, ChevronDown, 
    CheckCircle, XCircle, FileText, ThumbsUp, ThumbsDown, 
    Clock, Edit, Trash2, Bot 
} from 'lucide-react';


export default function QuestionFilterPanel({
    viewMode,
    setViewMode,
    filterStatus,
    setFilterStatus,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    splitScreenMode,
    setSplitScreenMode,
    showSourceFilters,
    setShowSourceFilters,
    renderQuestionCart,
    showLanguageFilter,
    filterLanguage,
    setFilterLanguage,
    levels,
    selectedLevelId,
    setSelectedLevelId,
    streams,
    selectedStreamId,
    setSelectedStreamId,
    classes,
    selectedClassId,
    setSelectedClassId,
    filteredSubjects,
    selectedSubjectId,
    setSelectedSubjectId,
    chapters,
    selectedChapterId,
    setSelectedChapterId,
    getChapterQuestionCount,
    visibleTopics,
    selectedTopicId,
    setSelectedTopicId,
    getTopicQuestionCount,
    selectedBoards,
    setSelectedBoards,
    selectedYears,
    setSelectedYears,
    selectedSchools,
    setSelectedSchools,
    sourceTags,
    resetFilters,
    fetchQuestions,
    typeTabs,
    filterType,
    setFilterType,
    isSuperAdmin,
    overviewStats,
    filterUnanswered,
    setFilterUnanswered,
    totalElements,
    questions,
    handleSelectAllGlobal,
    isSelectingAll,
    selectedIds,
    handleCreateExamFromSelection,
    handleUpdateStatusBulk,
    handleBulkDelete,
    hasPerm,
    isDefaultOrSuperAdmin,
    hasFullLangAccess,
    uniqueInstituteMediums,
    user,
    portalTarget,
    onOpenBatchAgentModal,
    activeBatchProgress
}) {


    return (
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-1.5 sm:px-4 pt-1 pb-1 sm:pt-2 sm:pb-2 shadow-sm space-y-1 sm:space-y-2">
            
            {/* Top Row: Navigation Tabs & Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1.5 sm:gap-2.5">
                <div className="flex bg-slate-100 p-0.5 rounded-lg self-start shrink-0 overflow-x-auto custom-scrollbar w-full md:w-auto">
                    <button
                        onClick={() => { setViewMode('ALL'); setFilterStatus('ALL'); setCurrentPage(1); }}
                        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'ALL'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                            }`}
                    >
                        <Layers size={12} /> All Questions
                    </button>
                    <button
                        onClick={() => { setViewMode('FAVORITES'); setCurrentPage(1); }}
                        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'FAVORITES'
                            ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                            }`}
                    >
                        <svg className="fill-current w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        My Saved
                    </button>
                    {isDefaultOrSuperAdmin && (
                        <button
                            onClick={() => { setViewMode('REVISED'); setFilterStatus('REVISED'); setCurrentPage(1); }}
                            className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'REVISED'
                                ? 'bg-rose-100 text-rose-700 shadow-sm border border-rose-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                }`}
                        >
                            <Edit size={11} /> Revised
                        </button>
                    )}
                </div>

                <div className="flex flex-row items-center gap-1.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[220px] lg:w-[260px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search questions..."
                            className="w-full pl-7 sm:pl-8 pr-2.5 py-1 text-[11px] sm:text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {onOpenBatchAgentModal && (
                            <button
                                type="button"
                                onClick={onOpenBatchAgentModal}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-white rounded-lg text-[11px] font-black transition-all border shadow-sm active:scale-95 shrink-0 ${activeBatchProgress?.isRunning ? 'bg-gradient-to-r from-indigo-700 via-purple-700 to-emerald-600 border-emerald-400/60 ring-2 ring-emerald-400/30' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 border-indigo-400/40'}`}
                                title="Run Subject-Wide Background AI Audit & Auto-Fix Agent"
                            >
                                <Bot size={13} className={activeBatchProgress?.isRunning ? "text-emerald-300 animate-spin" : "text-amber-300 animate-pulse"} />
                                <span>
                                    {activeBatchProgress?.isRunning 
                                        ? `🤖 অডিট প্রসেসিং: ${activeBatchProgress.percent}% (${activeBatchProgress.processed}/${activeBatchProgress.total})`
                                        : '🤖 এআই এজেন্ট'}
                                </span>
                            </button>
                        )}


                        {hasFullLangAccess && (
                            <button
                                onClick={() => setSplitScreenMode(!splitScreenMode)}
                                className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all border shrink-0 ${splitScreenMode ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                title="Toggle Split-Screen Review Mode"
                            >
                                <GitCompare size={12} /> Review Mode
                            </button>
                        )}


                        <button
                            onClick={() => setShowSourceFilters(!showSourceFilters)}
                            className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all border shrink-0 ${showSourceFilters ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            title="Toggle Filters & Tags Sidebar"
                        >
                            <Filter size={12} />
                            <span className="hidden sm:inline">Filters & Tags</span>
                            <span className="sm:hidden">Filters</span>
                        </button>

                        {!portalTarget && renderQuestionCart()}
                    </div>
                </div>
            </div>

            {/* Frosted Glass Backdrop for Filters & Tags Drawer */}
            {showSourceFilters && (
                <div 
                    onClick={() => setShowSourceFilters(false)}
                    className="fixed inset-0 z-[70] bg-slate-900/15 backdrop-blur-[6px] animate-in fade-in duration-200 lg:hidden"
                />
            )}

            {/* Right Side Drawer for Source Metadata Filters */}
            <div 
                className={`fixed right-0 bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 top-0 h-screen w-[290px] sm:w-[320px] z-[80] shadow-2xl lg:top-[56px] lg:md:top-[60px] lg:h-[calc(100vh-56px)] lg:md:h-[calc(100vh-60px)] lg:z-20 lg:shadow-none ${showSourceFilters ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="p-4 flex items-center justify-between">
                        <h3 className="text-[12px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                            <Filter size={14} className="text-primary"/> Filters & Tags / ফিল্টারসমূহ
                        </h3>
                        <button 
                            onClick={() => setShowSourceFilters(false)} 
                            className="flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 border border-rose-200/40 p-2 rounded-xl transition-all shadow-sm lg:hidden active:scale-95 shrink-0 cursor-pointer"
                            title="Close Filters"
                        >
                            <X size={18} className="stroke-[2.5]" />
                        </button>
                    </div>
                </div>
                
                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    {/* Unified Academic Filters inside the compact sidebar drawer */}
                    <div className="flex flex-col gap-4 border-b border-slate-150 pb-5">
                        <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            <Layers size={12} className="text-indigo-650" /> Academic Filters / শিক্ষাগত ফিল্টার
                        </span>
                        
                        {/* Language Filter */}
                        {showLanguageFilter && (
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Language Version
                                </label>
                                <div className="relative group shrink-0">
                                    <select 
                                        value={filterLanguage} 
                                        onChange={(e) => setFilterLanguage(e.target.value)} 
                                        className={`appearance-none h-10 w-full pl-3.5 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${filterLanguage !== 'ALL' ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                    >
                                        {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.length > 1 || uniqueInstituteMediums.includes('Bilingual')) && <option value="ALL">সব ভার্সন</option>}
                                        {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('Bangla') || uniqueInstituteMediums.includes('Bilingual')) && <option value="Bangla">Bangla</option>}
                                        {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('English') || uniqueInstituteMediums.includes('Bilingual')) && <option value="English">English</option>}
                                        {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('Bilingual')) && <option value="Bilingual">Bilingual</option>}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <ChevronDown size={12} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Level Filter */}
                        {levels.length > 1 && (
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Academic Level
                                </label>
                                <div className="relative group shrink-0">
                                    <select 
                                        value={selectedLevelId} 
                                        onChange={(e) => setSelectedLevelId(e.target.value)} 
                                        className={`appearance-none h-10 w-full pl-3.5 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${selectedLevelId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                    >
                                        <option value="">সব স্তর</option>
                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <ChevronDown size={12} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stream Filter */}
                        {streams.length > 1 && (
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Stream / বিভাগ
                                </label>
                                <div className="relative group shrink-0">
                                    <select 
                                        value={selectedStreamId} 
                                        onChange={(e) => setSelectedStreamId(e.target.value)} 
                                        className={`appearance-none h-10 w-full pl-3.5 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${selectedStreamId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                    >
                                        <option value="">সব বিভাগ</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <ChevronDown size={12} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Class Filter */}
                        {classes.length > 1 && (
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Class / শ্রেণি
                                </label>
                                <div className="relative group shrink-0">
                                    <select 
                                        value={selectedClassId} 
                                        onChange={(e) => setSelectedClassId(e.target.value)} 
                                        className={`appearance-none h-10 w-full pl-3.5 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${selectedClassId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                    >
                                        <option value="">সব শ্রেণি</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <ChevronDown size={12} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Subject Filter */}
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-extrabold text-primary uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Subject / বিষয়
                            </label>
                            <div className="relative group shrink-0">
                                <select 
                                    value={selectedSubjectId} 
                                    onChange={(e) => setSelectedSubjectId(e.target.value)} 
                                    className={`appearance-none h-10 w-full pl-3.5 pr-9 rounded-xl text-[11px] font-black transition-all duration-300 cursor-pointer shadow-md outline-none border-2 focus:ring-4 ${selectedSubjectId ? 'bg-gradient-to-r from-indigo-50 to-pink-50/30 border-primary text-primary focus:ring-primary/10 shadow-primary/5' : 'bg-white border-primary/30 text-indigo-955 focus:ring-primary/10 animate-pulse-slow'}`}
                                    disabled={filteredSubjects.length === 0}
                                >
                                    {filteredSubjects.length === 0 ? (
                                        <option value="">শ্রেণি নির্বাচন করুন</option>
                                    ) : (
                                        <>
                                            <option value="">বিষয় সিলেক্ট করুন</option>
                                            {filteredSubjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                        </>
                                    )}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-primary transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        </div>

                        {/* Chapter Filter */}
                        {chapters.length > 1 && (
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Chapter / অধ্যায়
                                </label>
                                <div className="relative group shrink-0">
                                    <select 
                                        value={selectedChapterId} 
                                        onChange={(e) => setSelectedChapterId(e.target.value)} 
                                        className={`appearance-none h-10 w-full pl-3.5 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 truncate ${selectedChapterId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                    >
                                        <option value="">সব অধ্যায়</option>
                                        {chapters.map(ch => {
                                            const count = getChapterQuestionCount(ch.id);
                                            return (
                                                <option key={ch.id} value={ch.id}>
                                                    {ch.name} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <ChevronDown size={12} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Topic Filter */}
                        {visibleTopics.length > 1 && (
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Topic / টপিক
                                </label>
                                <div className="relative group shrink-0">
                                    <select 
                                        value={selectedTopicId} 
                                        onChange={(e) => setSelectedTopicId(e.target.value)} 
                                        className={`appearance-none h-10 w-full pl-3.5 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 truncate ${selectedTopicId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                    >
                                        <option value="">সব টপিক</option>
                                        {visibleTopics.map(t => {
                                            const count = getTopicQuestionCount(t.id);
                                            return (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <ChevronDown size={12} className="stroke-[2.5]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Selected Tags Bucket */}
                    {(selectedBoards.length > 0 || selectedYears.length > 0 || selectedSchools.length > 0) && (
                        <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                                <Filter size={12} /> Active Filters Bucket
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedBoards.map(b => (
                                    <span key={b} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md shadow-sm">
                                        {b} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setSelectedBoards(prev => prev.filter(x => x !== b))} />
                                    </span>
                                ))}
                                {selectedYears.map(y => (
                                    <span key={y} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md shadow-sm">
                                        {y} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setSelectedYears(prev => prev.filter(x => x !== y))} />
                                    </span>
                                ))}
                                {selectedSchools.map(s => (
                                    <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md shadow-sm">
                                        {s} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setSelectedSchools(prev => prev.filter(x => x !== s))} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Board / University List */}
                    {sourceTags.boards && sourceTags.boards.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">Board / University</label>
                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {sourceTags.boards.map(tag => (
                                    <label key={tag.name} className="flex items-center justify-between group cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedBoards.includes(tag.name)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedBoards(prev => [...prev, tag.name]);
                                                    else setSelectedBoards(prev => prev.filter(b => b !== tag.name));
                                                }}
                                                className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20" 
                                            />
                                            <span className="text-[11px] font-bold text-slate-700">{tag.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">({tag.count})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Year List */}
                    {sourceTags.years && sourceTags.years.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">Year</label>
                            <div className="grid grid-cols-3 gap-2">
                                {sourceTags.years.map(tag => (
                                    <label key={tag.name} className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${selectedYears.includes(tag.name) ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedYears.includes(tag.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedYears(prev => [...prev, tag.name]);
                                                else setSelectedYears(prev => prev.filter(y => y !== tag.name));
                                            }}
                                            className="hidden" 
                                        />
                                        <span className="text-xs font-black">{tag.name}</span>
                                        <span className="text-[9px] font-bold opacity-70">({tag.count})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* School / College List */}
                    {sourceTags.schools && sourceTags.schools.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">School / College</label>
                            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {sourceTags.schools.map(tag => (
                                    <label key={tag.name} className="flex items-center justify-between group cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedSchools.includes(tag.name)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedSchools(prev => [...prev, tag.name]);
                                                    else setSelectedSchools(prev => prev.filter(s => s !== tag.name));
                                                }}
                                                className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20" 
                                            />
                                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]" title={tag.name}>{tag.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">({tag.count})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {(!sourceTags.boards?.length && !sourceTags.years?.length && !sourceTags.schools?.length) && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50 text-center gap-2">
                            <Search size={24} className="text-slate-400" />
                            <p className="text-xs font-bold text-slate-500">No source tags found for the current subject.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <button onClick={resetFilters} className="px-4 py-2 bg-white text-slate-600 hover:text-rose-600 font-bold rounded-lg border border-slate-200 hover:border-rose-200 transition-colors flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide cursor-pointer">
                        <X size={14} /> Clear
                    </button>
                    <button 
                        onClick={() => {
                            fetchQuestions();
                            if (window.innerWidth < 1024) setShowSourceFilters(false);
                        }} 
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg border border-transparent hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide shadow-sm cursor-pointer active:scale-[0.98]"
                    >
                        <CheckCircle size={14} /> Apply Filters
                    </button>
                </div>
            </div>

            {/* Third Row: Formats, Check All & Bulk Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
                    {typeTabs.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setFilterType(type.id)}
                            className={`px-2 sm:px-3 py-0.5 text-[9.5px] sm:text-[10.5px] font-black rounded transition-all duration-300 whitespace-nowrap border active:scale-[0.97] ${filterType === type.id
                                ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-[0_2px_6px_rgba(233,30,140,0.15)] hover:shadow-[0_4px_10px_rgba(233,30,140,0.25)] scale-102'
                                : 'bg-gradient-to-b from-white to-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-800 hover:shadow-sm'
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                    {isSuperAdmin && (!overviewStats || overviewStats.unansweredCount > 0 || filterUnanswered) && (
                        <button
                            onClick={() => {
                                setFilterUnanswered(prev => !prev);
                                setCurrentPage(1);
                            }}
                            className={`ml-2 px-2 py-0.5 text-[9.5px] sm:text-[10.5px] font-black rounded-full transition-all whitespace-nowrap border flex items-center gap-0.5 ${
                                filterUnanswered
                                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm hover:bg-rose-600 shadow-rose-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700'
                            }`}
                            title="যেসকল প্রশ্নের সঠিক উত্তর বা অপশন সেট করা নেই"
                        >
                            <XCircle size={10} className={filterUnanswered ? 'animate-pulse' : ''} />
                            উত্তরবিহীন প্রশ্ন
                        </button>
                    )}
                </div>

                {isDefaultOrSuperAdmin && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto justify-end shrink-0">
                        {totalElements > questions.length && (
                            <button
                                onClick={handleSelectAllGlobal}
                                disabled={isSelectingAll}
                                className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition-colors shrink-0 disabled:opacity-50"
                            >
                                <CheckCircle size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap select-none">
                                    {isSelectingAll ? 'Selecting...' : `Select All ${totalElements}`}
                                </span>
                            </button>
                        )}

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                {(() => {
                                    const selectedQs = questions.filter(q => selectedIds.includes(q.id));
                                    const counts = { MCQ: 0, CQ: 0, SHORT: 0, OTHER: 0 };
                                    selectedQs.forEach(q => {
                                        if (q.type === 'MCQ') counts.MCQ++;
                                        else if (q.type === 'CQ' || q.type === 'CREATIVE') counts.CQ++;
                                        else if (q.type === 'SHORT' || q.type === 'SHORT_ANSWER') counts.SHORT++;
                                        else counts.OTHER++;
                                    });
                                    const unseenCount = selectedIds.length - selectedQs.length;
                                    
                                    const textParts = [];
                                    if (counts.MCQ > 0) textParts.push(`${counts.MCQ} MCQ`);
                                    if (counts.CQ > 0) textParts.push(`${counts.CQ} CQ`);
                                    if (counts.SHORT > 0) textParts.push(`${counts.SHORT} Short`);
                                    if (counts.OTHER > 0) textParts.push(`${counts.OTHER} Other`);
                                    if (unseenCount > 0) textParts.push(`+${unseenCount} off-page`);
                                    
                                    return (
                                        <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center shrink-0">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                Selected: <span className="text-slate-800">{textParts.length > 0 ? textParts.join(', ') : selectedIds.length}</span>
                                            </span>
                                        </div>
                                    );
                                })()}
                                <button 
                                    onClick={handleCreateExamFromSelection}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 font-bold rounded-lg border border-violet-200 hover:bg-violet-100 transition-all text-[11px] uppercase tracking-wide shadow-sm"
                                    title="Create Exam with Selected Questions"
                                >
                                    <FileText size={12} /> Create Exam
                                </button>
                                {isSuperAdmin && (
                                    <>
                                        <button onClick={() => handleUpdateStatusBulk('APPROVED')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all text-[11px] uppercase tracking-wide">
                                            <ThumbsUp size={12} /> Approve
                                        </button>
                                        <button onClick={() => handleUpdateStatusBulk('REJECTED')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-all text-[11px] uppercase tracking-wide">
                                            <ThumbsDown size={12} /> Reject
                                        </button>
                                        <div className="relative group">
                                            <button className="flex items-center gap-1.5 px-2 py-1.5 bg-white text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-[11px] uppercase tracking-wide shadow-sm">
                                                <ChevronDown size={12} className="text-slate-500" />
                                            </button>
                                            <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden py-1">
                                                <button onClick={() => handleUpdateStatusBulk('PENDING')} className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-amber-600 hover:bg-amber-50 font-bold flex items-center gap-2 transition-colors">
                                                    <Clock size={12} /> Pending
                                                </button>
                                                <button onClick={() => handleUpdateStatusBulk('DRAFT')} className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-600 hover:bg-slate-50 font-bold flex items-center gap-2 transition-colors">
                                                    <Edit size={12} /> Draft
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {hasPerm('DELETE') && (
                                    <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all text-[11px] uppercase tracking-wide ml-1">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
