import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Search, Loader2, Eye, Trash2, Filter, FileText, CheckCircle2, Archive, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import examService from '../../../services/examService';
import axiosInstance from '../../../utils/axios';

const SavedExams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filters
    const [examType, setExamType] = useState('');
    const [status, setStatus] = useState('');
    
    // Tabs
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'recycle'
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user && user.roles && user.roles.includes('SUPER_ADMIN');

    // For deleting/restoring
    const [actionId, setActionId] = useState(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                size,
                title: debouncedSearch || undefined,
                examType: examType || undefined,
                status: status || undefined
            };
            let res;
            if (activeTab === 'recycle' && isSuperAdmin) {
                res = await examService.listDeletedExams(params);
            } else {
                res = await examService.listExams(params);
            }

            if (res.success) {
                setExams(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (err) {
            console.error('Failed to load exams', err);
        } finally {
            setLoading(false);
        }
    };

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [debouncedSearch, size, examType, status]);

    // Fetch on parameter change
    useEffect(() => {
        fetchExams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedSearch, size, examType, status, activeTab]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this saved exam?")) return;
        setActionId(id);
        try {
            await axiosInstance.delete(`/v1/exams/generate/${id}`);
            fetchExams();
        } catch (err) {
            console.error("Delete error", err);
            alert("Error deleting exam");
        } finally {
            setActionId(null);
        }
    };

    const handleRestore = async (id) => {
        setActionId(id);
        try {
            await examService.restoreExam(id);
            fetchExams();
        } catch (err) {
            console.error("Restore error", err);
            alert("Error restoring exam");
        } finally {
            setActionId(null);
        }
    };

    const handleHardDelete = async (id) => {
        if (!window.confirm("This will permanently delete the exam. This action cannot be undone! Are you sure?")) return;
        setActionId(id);
        try {
            await examService.hardDeleteExam(id);
            fetchExams();
        } catch (err) {
            console.error("Hard delete error", err);
            alert("Error permanently deleting exam");
        } finally {
            setActionId(null);
        }
    };

    const handleEmptyRecycleBin = async () => {
        if (!window.confirm("WARNING: This will permanently delete ALL exams in the recycle bin. Are you absolutely sure?")) return;
        setLoading(true);
        try {
            await examService.emptyRecycleBin();
            fetchExams();
        } catch (err) {
            console.error("Empty recycle bin error", err);
            alert("Error emptying recycle bin");
            setLoading(false);
        }
    };

    const getStatusBadge = (examStatus) => {
        switch (examStatus) {
            case 'PUBLISHED':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 tracking-wide"><CheckCircle2 size={12}/> PUBLISHED</span>;
            case 'ARCHIVED':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 tracking-wide"><Archive size={12}/> ARCHIVED</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 tracking-wide"><FileText size={12}/> DRAFT</span>;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-outfit text-slate-800 pb-20">
            <div className="max-w-full xl:max-w-[1600px] mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                <Save size={24} />
                            </div>
                            Saved Exams Repository
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium">
                            View, manage, and print your previously generated exam papers.
                        </p>
                    </div>
                    <Link to="/exams/generate/auto" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                        + Generate New Exam
                    </Link>
                </div>

                {/* Tabs for Super Admin */}
                {isSuperAdmin && (
                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-max">
                        <button
                            onClick={() => { setActiveTab('active'); setPage(0); }}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                activeTab === 'active'
                                    ? 'bg-slate-800 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <FileText size={16} /> Active Exams
                        </button>
                        <button
                            onClick={() => { setActiveTab('recycle'); setPage(0); }}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
                                activeTab === 'recycle'
                                    ? 'bg-rose-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-rose-600'
                            }`}
                        >
                            <Trash2 size={16} /> Recycle Bin
                        </button>
                    </div>
                )}

                {/* Filters & Controls */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
                    
                    <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by title..."
                                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 block w-full pl-10 p-2.5 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-400 ml-2 hidden md:block" />
                            <select 
                                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-emerald-500/20 p-2.5 outline-none text-slate-600 flex-1 md:flex-none cursor-pointer"
                                value={examType}
                                onChange={(e) => setExamType(e.target.value)}
                            >
                                <option value="">All Types</option>
                                <option value="CLASS_TEST">Class Test</option>
                                <option value="MODEL_TEST">Model Test</option>
                                <option value="FINAL">Final Exam</option>
                                <option value="PRACTICE">Practice</option>
                            </select>

                            <select 
                                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-emerald-500/20 p-2.5 outline-none text-slate-600 flex-1 md:flex-none cursor-pointer"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={activeTab === 'recycle'}
                            >
                                <option value="">All Status</option>
                                <option value="DRAFT">Draft</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {activeTab === 'recycle' && isSuperAdmin && (
                            <button
                                onClick={handleEmptyRecycleBin}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold rounded-xl transition-colors border border-rose-200 mr-2"
                            >
                                <ShieldAlert size={16} /> Empty Bin
                            </button>
                        )}
                        <span className="text-sm font-medium text-slate-500">Items per page:</span>
                        <select 
                            className="bg-slate-50 border border-slate-200 text-sm font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 p-2 outline-none text-slate-700 cursor-pointer"
                            value={size}
                            onChange={(e) => setSize(Number(e.target.value))}
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                                <tr>
                                    <th className="px-6 py-4 w-32">Status</th>
                                    <th className="px-6 py-4">Exam Title & Type</th>
                                    <th className="px-6 py-4">Class & Subject</th>
                                    <th className="px-6 py-4">Marks & Time</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center">
                                            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={32} />
                                            <p className="text-slate-500 font-medium">Loading saved exams...</p>
                                        </td>
                                    </tr>
                                ) : exams.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                                            <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                <Search size={32} />
                                            </div>
                                            <p className="font-bold text-lg text-slate-700">No exams found.</p>
                                            <p className="text-sm mt-1 mb-4">Try adjusting your filters or generate a new exam.</p>
                                            <button onClick={() => {setSearchTerm(''); setExamType(''); setStatus('');}} className="text-emerald-600 font-bold text-sm hover:underline">
                                                Clear all filters
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    exams.map((exam) => (
                                        <tr key={exam.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                {getStatusBadge(exam.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 text-sm mb-1.5">{exam.title}</div>
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wide">{exam.examType?.replace('_', ' ')}</span> 
                                                    <span>•</span>
                                                    <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 text-xs mb-1.5">{exam.className || 'N/A'}</div>
                                                <div className="text-[11px] font-medium text-slate-500">{exam.subjectName || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="font-bold text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 w-max tracking-wide">
                                                        {exam.totalMarks} Marks
                                                    </span>
                                                    <span className="font-bold text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 w-max tracking-wide">
                                                        {exam.durationMinutes} Min
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    {activeTab === 'active' ? (
                                                        <>
                                                            <Link
                                                                to={`/exams/generate/nexus-editor/${exam.id}`}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-sm"
                                                                title="Edit in Nexus Editor"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                            </Link>
                                                            <Link
                                                                to={`/exams/download/pdf`} 
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm"
                                                                title="View / Print"
                                                            >
                                                                <Eye size={16} />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(exam.id)}
                                                                disabled={actionId === exam.id}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
                                                                title="Delete Exam"
                                                            >
                                                                {actionId === exam.id ? <Loader2 size={15} className="animate-spin text-rose-500" /> : <Trash2 size={15} />}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleRestore(exam.id)}
                                                                disabled={actionId === exam.id}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
                                                                title="Restore Exam"
                                                            >
                                                                {actionId === exam.id ? <Loader2 size={15} className="animate-spin text-emerald-500" /> : <RefreshCw size={15} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleHardDelete(exam.id)}
                                                                disabled={actionId === exam.id}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
                                                                title="Hard Delete Forever"
                                                            >
                                                                {actionId === exam.id ? <Loader2 size={15} className="animate-spin text-rose-500" /> : <AlertTriangle size={15} />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && totalPages > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Page {page + 1} of {totalPages} <span className="lowercase font-medium ml-1 text-slate-400">({exams.length} items on this page)</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 0}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavedExams;
