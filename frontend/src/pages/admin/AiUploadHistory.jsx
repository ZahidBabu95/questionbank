import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, CheckCircle, XCircle, AlertTriangle, Clock, HardDrive, Eye, Trash2, BarChart3, Copy, Search, Filter, RefreshCw, Play, Pause, Layers, ClipboardCopy, Loader2, ExternalLink, Database } from 'lucide-react';
import axios from '../../utils/axios';

const API = '/v1/ai';
const getAuth = () => ({});  // centralized axios handles auth via interceptors

const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' })
        + ' ' + date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
};

const STATUS_COLORS = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
    PAUSED: 'bg-orange-50 text-orange-700 border-orange-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABELS = {
    PENDING: '⏳ Pending',
    PROCESSING: '🔄 Processing',
    PAUSED: '⏸️ Paused',
    COMPLETED: '✅ Complete',
    FAILED: '❌ Failed',
};

const AiUploadHistory = () => {
    const [activeTab, setActiveTab] = useState('history');
    const [history, setHistory] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterEmail, setFilterEmail] = useState('');
    const [filterSuccess, setFilterSuccess] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [copiedError, setCopiedError] = useState(null);
    const [resumingJobId, setResumingJobId] = useState(null);
    const [resumeLog, setResumeLog] = useState({});
    const [accumulatedQuestions, setAccumulatedQuestions] = useState({});
    const [accumulatedMeta, setAccumulatedMeta] = useState({});
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
    const [pushingToRag, setPushingToRag] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) setActiveTab(tab);

        const autoStartId = params.get('autoStart');
        if (autoStartId) {
            navigate('/ai/upload-history?tab=queue', { replace: true });
            setTimeout(() => handleResumeJob(autoStartId), 500);
        }
    }, [location.search]);

    const handleResumeJob = async (jobId) => {
        setResumingJobId(jobId);
        setResumeLog(prev => ({ ...prev, [jobId]: 'Processing next chunk...' }));
        try {
            const { data } = await axios.post(`${API}/chunked/resume/${jobId}`, {}, getAuth());
            const result = data?.data;
            const chunkInfo = result?.chunkInfo;
            const questions = result?.questions || [];
            const meta = result?.metadata;
            const msg = `✅ Chunk ${chunkInfo?.chunkNumber}/${chunkInfo?.totalChunks}: ${chunkInfo?.questionsInChunk} questions (pages ${chunkInfo?.pagesProcessed})`;
            setResumeLog(prev => ({ ...prev, [jobId]: msg }));

            // Accumulate metadata
            if (meta) {
                setAccumulatedMeta(prev => ({ ...prev, [jobId]: meta }));
            }

            fetchJobs();

            // Auto-continue if more chunks remain
            if (chunkInfo && !chunkInfo.isComplete) {
                setResumeLog(prev => ({ ...prev, [jobId]: msg + '\n⏳ Next chunk in 1s...' }));
                setTimeout(() => handleResumeJob(jobId), 1000);
            } else {
                setResumingJobId(null);
                setResumeLog(prev => ({ ...prev, [jobId]: msg + '\n🎉 All chunks completed! Collecting questions from DB...' }));
                fetchJobs(); fetchStats();
                // Collect ALL questions from DB (avoids stale React state issue)
                setTimeout(() => handleCollectQuestionsFromDB(jobId), 1000);
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message;
            setResumeLog(prev => ({ ...prev, [jobId]: `❌ Failed: ${errMsg}` }));
            setResumingJobId(null);
            fetchJobs();
        }
    };

    const navigateToImport = (questions, meta, jobId, job) => {
        if (jobId) {
            // Build URL with saved hierarchy IDs so ImportAI can pre-select original hierarchy
            const params = new URLSearchParams({ jobId });
            if (job?.classSubjectId) params.set('classSubjectId', job.classSubjectId);
            if (job?.chapterId)      params.set('chapterId',      job.chapterId);
            if (job?.topicId)        params.set('topicId',        job.topicId);
            navigate(`/questions/import/ai?${params.toString()}`);
            return;
        }
        if (!questions || questions.length === 0) return;
        try {
            sessionStorage.setItem('ai_import_questions', JSON.stringify(questions));
            if (meta) sessionStorage.setItem('ai_import_metadata', JSON.stringify(meta));
        } catch (e) {
            console.error('sessionStorage quota exceeded, will use jobId param instead', e);
        }
        navigate('/questions/import/ai');
    };

    /** Collect all saved questions from DB for a job (works for partial AND complete) */
    const handleCollectQuestionsFromDB = async (jobId) => {
        setResumingJobId(jobId);
        setResumeLog(prev => ({ ...prev, [jobId]: '📥 Collecting saved questions from database...' }));
        try {
            const { data } = await axios.get(`${API}/chunked/questions/${jobId}`, getAuth());
            const result = data?.data;
            const questions = result?.questions || [];
            const meta = result?.metadata;
            setResumingJobId(null);
            if (questions.length > 0) {
                const partial = result?.isPartial;
                const msg = `✅ ${questions.length} questions collected from ${result?.chunksProcessed}/${result?.totalChunks} chunks${partial ? ' (আংশিক)' : ''}`;
                setResumeLog(prev => ({ ...prev, [jobId]: msg }));
                // Pass the full job object to carry hierarchy IDs
                const jobObj = jobs.find(j => j.id === jobId);
                navigateToImport(questions, meta, jobId, jobObj);
            } else {
                setResumeLog(prev => ({ ...prev, [jobId]: '❌ No questions found in DB for this job' }));
            }
        } catch (err) {
            setResumingJobId(null);
            setResumeLog(prev => ({ ...prev, [jobId]: `❌ Failed to collect saved questions: ${err.message}` }));
        }
    };

    const handlePushToRag = async () => {
        if (selectedHistoryIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to push ${selectedHistoryIds.length} file(s) to the Curriculum RAG?`)) return;

        setPushingToRag(true);
        try {
            const { data } = await axios.post(`${API}/upload-history/push-to-rag`, { historyIds: selectedHistoryIds }, getAuth());
            alert(data.message || 'Files pushed to RAG successfully!');
            setSelectedHistoryIds([]);
            fetchHistory();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to push to RAG');
        } finally {
            setPushingToRag(false);
        }
    };

    const toggleHistorySelection = (id) => {
        setSelectedHistoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAllHistory = (e) => {
        if (e.target.checked) {
            setSelectedHistoryIds(history.filter(h => h.success && !h.autoSavedToCurriculum).map(h => h.id));
        } else {
            setSelectedHistoryIds([]);
        }
    };

    const handleSkipJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to skip this chunk? It might be empty or problematic.')) return;
        setResumingJobId(jobId);
        setResumeLog(prev => ({ ...prev, [jobId]: '⏭️ Skipping current chunk...' }));
        try {
            await axios.post(`${API}/chunked/skip/${jobId}`, {}, getAuth());
            setResumeLog(prev => ({ ...prev, [jobId]: '✅ Chunk skipped successfully. Resuming from next...' }));
            await fetchJobs();
            setTimeout(() => handleResumeJob(jobId), 1000);
        } catch (err) {
            setResumingJobId(null);
            setResumeLog(prev => ({ ...prev, [jobId]: `❌ Skip failed: ${err.response?.data?.message || err.message}` }));
        }
    };

    const handleReprocessJob = async (jobId) => {
        // For completed jobs without cached questions — reset and re-process via resume flow
        setResumingJobId(jobId);
        setResumeLog(prev => ({ ...prev, [jobId]: '🔄 Resetting job for re-processing...' }));
        try {
            await axios.post(`${API}/chunked/reprocess/${jobId}`, {}, getAuth());
            // Job is now reset to PAUSED — start resume flow
            setAccumulatedQuestions(prev => ({ ...prev, [jobId]: [] }));
            setResumeLog(prev => ({ ...prev, [jobId]: '✅ Job reset. Starting chunk processing...' }));
            await fetchJobs();
            // Auto-start resume after short delay
            setTimeout(() => handleResumeJob(jobId), 1000);
        } catch (err) {
            setResumingJobId(null);
            setResumeLog(prev => ({ ...prev, [jobId]: `❌ Re-process failed: ${err.response?.data?.message || err.message}` }));
        }
    };

    const handleStopResume = () => {
        setResumingJobId(null);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterEmail) params.append('email', filterEmail);
            if (filterSuccess !== '') params.append('success', filterSuccess);
            const { data } = await axios.get(`${API}/upload-history?${params}`, getAuth());
            setHistory(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const fetchJobs = async () => {
        try {
            const { data } = await axios.get(`${API}/processing-jobs`, getAuth());
            setJobs(data || []);
        } catch (err) { console.error(err); }
    };

    const fetchStats = async () => {
        try {
            const { data } = await axios.get(`${API}/upload-history/stats`, getAuth());
            setStats(data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchHistory(); }, [filterEmail, filterSuccess]);
    useEffect(() => { fetchStats(); fetchJobs(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this record?')) return;
        try {
            await axios.delete(`${API}/upload-history/${id}`, getAuth());
            fetchHistory(); fetchStats();
        } catch (err) { alert('Failed to delete'); }
    };

    const handleDeleteJob = async (id) => {
        if (!window.confirm('Delete this job?')) return;
        try {
            await axios.delete(`${API}/processing-jobs/${id}`, getAuth());
            fetchJobs();
        } catch (err) { alert('Failed to delete'); }
    };

    const copyError = (errorText, jobId) => {
        navigator.clipboard.writeText(errorText).then(() => {
            setCopiedError(jobId);
            setTimeout(() => setCopiedError(null), 2000);
        });
    };

    const tabs = [
        { id: 'history', label: 'Upload History', icon: <Clock size={16} />, count: history.length },
        { id: 'queue', label: 'Processing Queue', icon: <Layers size={16} />, count: jobs.filter(j => j.status !== 'COMPLETED').length },
    ];

    const pausedJobs = jobs.filter(j => j.status === 'PAUSED' || j.status === 'PENDING');
    const activeJobs = jobs.filter(j => j.status === 'PROCESSING');

    return (
        <div className="p-6 bg-gradient-to-br from-slate-50 to-violet-50/30 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="text-violet-600" size={28} />
                        AI Upload History & Queue
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        AI processing history, queue status, and error reports
                    </p>
                </div>
                <button onClick={() => { fetchHistory(); fetchJobs(); fetchStats(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium shadow-sm cursor-pointer">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FileText size={14} /> Total Uploads</div>
                        <div className="text-2xl font-bold text-slate-800">{stats.totalUploads}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CheckCircle size={14} /> Successful</div>
                        <div className="text-2xl font-bold text-emerald-600">{stats.successfulUploads}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><BarChart3 size={14} /> Questions Found</div>
                        <div className="text-2xl font-bold text-blue-600">{stats.totalQuestionsExtracted}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><HardDrive size={14} /> Storage Used</div>
                        <div className="text-2xl font-bold text-violet-600">{formatSize(stats.totalStorageUsed)}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Pause size={14} /> Paused Jobs</div>
                        <div className="text-2xl font-bold text-orange-600">{pausedJobs.length}</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-fit">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            activeTab === t.id
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-50'
                        }`}>
                        {t.icon} {t.label}
                        {t.count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ TAB: UPLOAD HISTORY ═══ */}
            {activeTab === 'history' && (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                        <div className="flex flex-wrap gap-3 items-center">
                            <Filter size={16} className="text-slate-400" />
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Search by email..." value={filterEmail}
                                    onChange={e => setFilterEmail(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-violet-500" />
                            </div>
                            <select value={filterSuccess} onChange={e => setFilterSuccess(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 cursor-pointer">
                                <option value="">All Status</option>
                                <option value="true">Success</option>
                                <option value="false">Failed</option>
                            </select>
                            
                            {selectedHistoryIds.length > 0 && (
                                <button onClick={handlePushToRag} disabled={pushingToRag}
                                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium shadow-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50">
                                    {pushingToRag ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} 
                                    Push {selectedHistoryIds.length} items to RAG
                                </button>
                            )}
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {loading ? (
                            <div className="text-center py-20 text-slate-400">Loading...</div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">
                                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                                No upload history found
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-4 py-3 font-medium text-slate-600">
                                                <input type="checkbox" 
                                                    checked={history.filter(h => h.success && !h.autoSavedToCurriculum).length > 0 && selectedHistoryIds.length === history.filter(h => h.success && !h.autoSavedToCurriculum).length} 
                                                    onChange={toggleAllHistory} 
                                                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer" />
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-600">File</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-600">Detected</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-600">Questions</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-600">Time</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
                                            <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                                            <th className="text-center px-4 py-3 font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(item => (
                                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <input type="checkbox" 
                                                        checked={selectedHistoryIds.includes(item.id)} 
                                                        onChange={() => toggleHistorySelection(item.id)}
                                                        disabled={!item.success || item.autoSavedToCurriculum}
                                                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer disabled:opacity-50" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={16} className="text-violet-400 flex-shrink-0" />
                                                        <div>
                                                            <div className="font-medium text-slate-700 max-w-[200px] flex items-center" title={item.originalFileName}>
                                                                <span className="truncate max-w-[150px]">{item.originalFileName}</span>
                                                                {item.autoSavedToCurriculum && (
                                                                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded ml-1 border border-emerald-100 flex-shrink-0" title="ডাটাবেসে ইম্পোর্ট করা হয়েছে">
                                                                        <Database size={8} className="inline mr-0.5" />সংরক্ষিত
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-400">{formatSize(item.fileSize)}</div>
                                                        </div>
                                                        {item.duplicate && (
                                                            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                                                                <Copy size={10} className="inline mr-0.5" />dup
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                        item.actionType === 'SCRAPE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                    }`}>
                                                        {item.actionType === 'SCRAPE' ? 'Scrape' : 'Generate'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.detectedClass && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">{item.detectedClass}</span>}
                                                        {item.detectedSubject && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">{item.detectedSubject}</span>}
                                                        {item.detectedChapter && <span className="text-xs bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={item.detectedChapter}>{item.detectedChapter}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center"><span className="font-semibold text-slate-700">{item.questionsExtracted || 0}</span></td>
                                                <td className="px-4 py-3 text-center text-xs text-slate-500">{formatDuration(item.processingTimeMs)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.success ? <CheckCircle size={18} className="text-emerald-500 mx-auto" /> : <XCircle size={18} className="text-rose-500 mx-auto" title={item.errorMessage} />}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate" title={item.uploadedByEmail}>
                                                    {item.uploadedByName || item.uploadedByEmail || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                                                            className="p-1.5 text-violet-500 hover:bg-violet-50 rounded cursor-pointer" title="Details">
                                                            <BarChart3 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id)}
                                                            className="p-1.5 text-rose-400 hover:bg-rose-50 rounded cursor-pointer" title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Detail Panel */}
                    {selectedItem && (
                        <div className="mt-4 bg-white rounded-xl shadow-sm border border-violet-200 p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Details: {selectedItem.originalFileName}</h3>
                                <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">x</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><span className="text-slate-500">File Size:</span> <strong>{formatSize(selectedItem.fileSize)}</strong></div>
                                <div><span className="text-slate-500">MIME:</span> <strong>{selectedItem.mimeType || '—'}</strong></div>
                                <div><span className="text-slate-500">Hash:</span> <strong className="text-xs font-mono">{selectedItem.fileHash?.substring(0, 16)}...</strong></div>
                                <div><span className="text-slate-500">Processing:</span> <strong>{formatDuration(selectedItem.processingTimeMs)}</strong></div>
                                <div><span className="text-slate-500">Class:</span> <strong>{selectedItem.detectedClass || '—'}</strong></div>
                                <div><span className="text-slate-500">Subject:</span> <strong>{selectedItem.detectedSubject || '—'}</strong></div>
                                <div><span className="text-slate-500">Chapter:</span> <strong>{selectedItem.detectedChapter || '—'}</strong></div>
                                <div><span className="text-slate-500">Questions:</span> <strong className="text-blue-600">{selectedItem.questionsExtracted || 0}</strong></div>
                            </div>
                            {selectedItem.errorMessage && (
                                <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium flex items-center gap-1"><AlertTriangle size={14} /> Error Report</span>
                                        <button onClick={() => copyError(selectedItem.errorMessage, selectedItem.id)}
                                            className="text-xs flex items-center gap-1 px-2 py-1 bg-rose-100 rounded hover:bg-rose-200 cursor-pointer">
                                            <ClipboardCopy size={12} /> {copiedError === selectedItem.id ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <pre className="text-xs whitespace-pre-wrap font-mono bg-rose-100 rounded p-2 mt-1 max-h-[200px] overflow-y-auto">{selectedItem.errorMessage}</pre>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ═══ TAB: PROCESSING QUEUE ═══ */}
            {activeTab === 'queue' && (
                <div className="space-y-4">
                    {jobs.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
                            <Layers size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No processing jobs found</p>
                            <p className="text-xs text-slate-400 mt-1">Jobs appear here when you process large PDF files using chunked processing</p>
                        </div>
                    ) : (
                        jobs.map(job => (
                            <div key={job.id} className={`bg-white rounded-xl shadow-sm border ${job.status === 'PAUSED' ? 'border-orange-200' : job.status === 'COMPLETED' ? 'border-emerald-200' : 'border-slate-200'} overflow-hidden`}>
                                {/* Job Header */}
                                <div className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            job.status === 'COMPLETED' ? 'bg-gradient-to-br from-emerald-400 to-green-500' :
                                            job.status === 'PAUSED' ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                                            'bg-gradient-to-br from-blue-400 to-indigo-500'
                                        }`}>
                                            <FileText size={18} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-700">{job.originalFileName}</p>
                                            <p className="text-xs text-slate-400">
                                                {job.totalPages} pages | {job.pagesPerChunk} pages/chunk | {formatDate(job.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${STATUS_COLORS[job.status] || ''}`}>
                                            {STATUS_LABELS[job.status] || job.status}
                                        </span>
                                        {(job.status === 'PAUSED' || job.status === 'PENDING' || job.status === 'PROCESSING') && (
                                            resumingJobId === job.id ? (
                                                <>
                                                    <button onClick={handleStopResume}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 shadow-sm cursor-pointer">
                                                        <Loader2 size={14} className="animate-spin" /> Processing... Stop
                                                    </button>
                                                    <button onClick={() => handleCollectQuestionsFromDB(job.id)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-cyan-700 shadow-md cursor-pointer"
                                                        title="আংশিক প্রশ্ন সংগ্রহ করুন">
                                                        <ExternalLink size={14} /> Partial
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {job.status === 'PROCESSING' ? (
                                                        <button onClick={() => handleReprocessJob(job.id)}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg text-xs font-bold hover:from-orange-600 hover:to-amber-700 shadow-md cursor-pointer"
                                                            title="If stuck for a long time, click to force reset and pause">
                                                            <RefreshCw size={14} /> Force Reset
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => handleResumeJob(job.id)}
                                                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-xs font-bold hover:from-emerald-600 hover:to-green-700 shadow-md cursor-pointer">
                                                            <Play size={14} /> Resume
                                                        </button>
                                                    )}
                                                    {job.processedChunks > 0 && (
                                                        <button onClick={() => handleCollectQuestionsFromDB(job.id)}
                                                            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg text-xs font-bold hover:from-blue-600 hover:to-cyan-700 shadow-md cursor-pointer"
                                                            title="আংশিক প্রশ্ন সংগ্রহ করুন">
                                                            <ExternalLink size={14} /> Partial Import ({job.totalQuestionsFound})
                                                        </button>
                                                    )}
                                                </>
                                            )
                                        )}
                                        {job.status === 'COMPLETED' && (
                                            <button onClick={() => handleCollectQuestionsFromDB(job.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg text-xs font-bold hover:from-violet-600 hover:to-indigo-700 shadow-md cursor-pointer">
                                                <ExternalLink size={14} /> View & Import
                                            </button>
                                        )}
                                        <button onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                                            className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg cursor-pointer" title="Details">
                                            <BarChart3 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteJob(job.id)}
                                            className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg cursor-pointer" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="px-5 pb-4">
                                    <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                                        <span className="flex items-center gap-1.5">
                                            {job.status === 'PROCESSING' && <Loader2 size={14} className="animate-spin text-indigo-500" />}
                                            <span className={job.status === 'PROCESSING' ? 'text-indigo-700 font-bold' : ''}>
                                                Chunk {job.processedChunks} of {job.totalChunks} ({(job.totalChunks > 0 ? (job.processedChunks / job.totalChunks * 100) : 0).toFixed(0)}%)
                                            </span>
                                        </span>
                                        <span className="text-slate-500 text-xs mt-0.5">{job.totalQuestionsFound || 0} questions found | {formatDuration(job.totalProcessingTimeMs)}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
                                        <div className={`h-full rounded-full transition-all duration-500 ${
                                            job.status === 'COMPLETED' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                            job.status === 'PAUSED' ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                                            'bg-gradient-to-r from-indigo-500 to-violet-500'
                                        }`} style={{ width: `${job.totalChunks > 0 ? (job.processedChunks / job.totalChunks * 100) : 0}%` }}></div>
                                        
                                        {/* Optional text inside bar if needed */}
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 drop-shadow-sm mix-blend-overlay">
                                            {job.processedChunks} / {job.totalChunks} CHUNKS PROCESSED
                                        </div>
                                    </div>
                                    {job.detectedClass && (
                                        <div className="flex gap-2 mt-2">
                                            {job.detectedClass && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">{job.detectedClass}</span>}
                                            {job.detectedSubject && <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">{job.detectedSubject}</span>}
                                            {job.detectedChapter && <span className="text-xs bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded">{job.detectedChapter}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Error Report (for paused/failed jobs) */}
                                {job.errorMessage && (
                                    <div className="mx-5 mb-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-rose-700 flex items-center gap-1">
                                                <AlertTriangle size={14} /> Error Report
                                                {job.lastErrorChunk && <span className="text-xs text-rose-500">(Chunk {job.lastErrorChunk})</span>}
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSkipJob(job.id)}
                                                    className="text-xs flex items-center gap-1 px-2 py-1 bg-rose-200 text-rose-800 font-bold rounded hover:bg-rose-300 cursor-pointer" title="Skip this chunk and move to next">
                                                    Skip Chunk &gt;&gt;
                                                </button>
                                                <button onClick={() => copyError(
                                                    `Job: ${job.originalFileName}\nStatus: ${job.status}\nChunk: ${job.lastErrorChunk || '?'}/${job.totalChunks}\nPages: ${job.currentChunkStart}-${job.totalPages}\nProcessed: ${job.processedChunks}/${job.totalChunks}\nQuestions: ${job.totalQuestionsFound}\nError: ${job.errorMessage}`,
                                                    job.id
                                                )} className="text-xs flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 cursor-pointer">
                                                    <ClipboardCopy size={12} /> {copiedError === job.id ? 'Copied!' : 'Copy Error Report'}
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="text-xs text-rose-600 whitespace-pre-wrap font-mono bg-rose-100 rounded p-2 mt-1 max-h-[150px] overflow-y-auto">
                                            {job.errorMessage}
                                        </pre>
                                    </div>
                                )}

                                {/* Expanded Details */}
                                {selectedJob?.id === job.id && (
                                    <div className="mx-5 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <h4 className="font-bold text-sm text-slate-700 mb-3">Job Details</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                            <div><span className="text-slate-500">Job ID:</span><br/><strong className="font-mono text-[10px]">{job.id}</strong></div>
                                            <div><span className="text-slate-500">File Hash:</span><br/><strong className="font-mono text-[10px]">{job.fileHash?.substring(0, 16)}...</strong></div>
                                            <div><span className="text-slate-500">Storage Path:</span><br/><strong className="text-[10px] break-all">{job.storedFilePath || 'N/A'}</strong></div>
                                            <div><span className="text-slate-500">Question Type:</span><br/><strong>{job.questionType || 'MCQ'}</strong></div>
                                            <div><span className="text-slate-500">Pages/Chunk:</span><br/><strong>{job.pagesPerChunk}</strong></div>
                                            <div><span className="text-slate-500">Current Chunk Start:</span><br/><strong>Page {job.currentChunkStart}</strong></div>
                                            <div><span className="text-slate-500">User:</span><br/><strong>{job.userName || job.userEmail || '—'}</strong></div>
                                            <div><span className="text-slate-500">Total Time:</span><br/><strong>{formatDuration(job.totalProcessingTimeMs)}</strong></div>
                                        </div>
                                    </div>
                                )}

                                {/* Resume Log */}
                                {resumeLog[job.id] && (
                                    <div className="mx-5 mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                                {resumingJobId === job.id && <Loader2 size={12} className="animate-spin" />}
                                                Resume Log
                                            </span>
                                            <button onClick={() => setResumeLog(prev => { const n = {...prev}; delete n[job.id]; return n; })}
                                                className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer">Clear</button>
                                        </div>
                                        <pre className="text-xs text-indigo-600 whitespace-pre-wrap font-mono">{resumeLog[job.id]}</pre>
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {/* Queue Info */}
                    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5">
                        <h4 className="font-bold text-violet-800 mb-2">How Chunked Processing Queue Works</h4>
                        <div className="text-sm text-violet-700 space-y-1">
                            <p>1. Large PDFs (5+ pages) are split into chunks and processed one by one</p>
                            <p>2. If a chunk fails (timeout/rate limit), the job PAUSES and shows an error report</p>
                            <p>3. You can resume paused jobs from the Import AI page by uploading the same file</p>
                            <p>4. Use the "Copy Error Report" button to share errors for debugging</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiUploadHistory;
