import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Search, Loader2, Eye, Trash2, Filter, FileText, CheckCircle2, Archive, RefreshCw, AlertTriangle, ShieldAlert, Download, Share2, Copy, Check, BarChart3 } from 'lucide-react';
import examService from '../../../services/examService';
import axiosInstance from '../../../utils/axios';
import { downloadExamPdf } from '../../../services/pdfService';

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
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    
    // Tabs
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'recycle'
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user && user.roles && user.roles.includes('SUPER_ADMIN');

    // For deleting/restoring/downloading
    const [actionId, setActionId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);

    // For sharing
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareExamId, setShareExamId] = useState(null);
    const [shareExamTitle, setShareExamTitle] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    // For sharing draft check
    const [draftWarningOpen, setDraftWarningOpen] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

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

    const openShareModal = (exam) => {
        setShareExamId(exam.id);
        setShareExamTitle(exam.title);
        if (exam.status === 'DRAFT') {
            setDraftWarningOpen(true);
        } else {
            setShareModalOpen(true);
        }
    };

    const handleUpdateStatus = async (examId, newStatus) => {
        setUpdatingStatusId(examId);
        try {
            const res = await axiosInstance.put(`/v1/exams/generate/${examId}`, {
                status: newStatus
            });
            if (res.data && res.data.success) {
                await fetchExams();
                setDraftWarningOpen(false);
                
                // Open share modal since it is now published/online
                setShareExamId(examId);
                const updatedExam = exams.find(e => e.id === examId) || res.data.data;
                if (updatedExam) {
                    setShareExamTitle(updatedExam.title);
                }
                setShareModalOpen(true);
            } else {
                alert('স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            alert('স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleStatusCellChange = async (examId, newStatus) => {
        setActionId(examId);
        try {
            const res = await axiosInstance.put(`/v1/exams/generate/${examId}`, {
                status: newStatus
            });
            if (res.data && res.data.success) {
                await fetchExams();
            } else {
                alert('স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে।');
            }
        } catch (err) {
            console.error('Error changing status:', err);
            alert('স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
        } finally {
            setActionId(null);
        }
    };

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
            case 'ONLINE_EXAM':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wide"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> ONLINE EXAM</span>;
            case 'ARCHIVED':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 tracking-wide"><Archive size={12}/> ARCHIVED</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 tracking-wide"><FileText size={12}/> DRAFT</span>;
        }
    };

    // Extract unique classes and subjects dynamically from loaded exams
    const uniqueClasses = Array.from(new Set(exams.map(e => e.className).filter(Boolean)));
    const uniqueSubjects = Array.from(new Set(exams.map(e => e.subjectName).filter(Boolean)));

    // Client-side filtering by Class and Subject
    const filteredExams = exams.filter(exam => {
        const matchClass = !selectedClass || exam.className === selectedClass;
        const matchSubject = !selectedSubject || exam.subjectName === selectedSubject;
        return matchClass && matchSubject;
    });

    const handleDirectDownloadPdf = async (exam) => {
        setDownloadingId(exam.id);
        try {
            await downloadExamPdf(exam.id, {
                includeAnswers: false,
                includeAnswerSheet: false,
                includeWatermark: false,
                shuffleQuestions: false,
                shuffleOptions: false,
                paperSize: 'A4',
                template: 'default',
                fontSize: 11
            });
        } catch (err) {
            console.error("Direct download error", err);
            alert("Direct PDF download failed. Please try again.");
        } finally {
            setDownloadingId(null);
        }
    };

    const totalExams = exams.length;
    const publishedExams = exams.filter(e => e.status === 'PUBLISHED').length;
    const draftExams = exams.filter(e => e.status !== 'PUBLISHED' && e.status !== 'ARCHIVED').length;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-outfit text-slate-800 pb-20">
            <div className="max-w-full xl:max-w-[1600px] mx-auto space-y-6">



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

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                                <option value="ONLINE_EXAM">Online Exam</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>

                            <select 
                                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-emerald-500/20 p-2.5 outline-none text-slate-600 flex-1 md:flex-none cursor-pointer"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                            >
                                <option value="">All Classes</option>
                                {uniqueClasses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select 
                                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-emerald-500/20 p-2.5 outline-none text-slate-600 flex-1 md:flex-none cursor-pointer"
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                            >
                                <option value="">All Subjects</option>
                                {uniqueSubjects.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
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

                {/* Desktop view Table (Hidden on Mobile) */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hidden md:block">
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
                                    filteredExams.map((exam) => (
                                        <tr key={exam.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <select
                                                    value={exam.status}
                                                    disabled={actionId === exam.id}
                                                    onChange={(e) => handleStatusCellChange(exam.id, e.target.value)}
                                                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold border cursor-pointer outline-none transition-all ${
                                                        exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20' :
                                                        exam.status === 'ONLINE_EXAM' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-2 focus:ring-indigo-500/20' :
                                                        exam.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border-slate-200 focus:ring-2 focus:ring-slate-500/20' :
                                                        'bg-amber-50 text-amber-700 border-amber-200 focus:ring-2 focus:ring-amber-500/20'
                                                    }`}
                                                >
                                                    <option value="DRAFT">DRAFT</option>
                                                    <option value="PUBLISHED">PUBLISHED</option>
                                                    <option value="ONLINE_EXAM">ONLINE EXAM</option>
                                                    <option value="ARCHIVED">ARCHIVED</option>
                                                </select>
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
                                                                title="Edit in Editor"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                            </Link>
                                                            <button
                                                                onClick={() => openShareModal(exam)}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm"
                                                                title="Share Exam"
                                                            >
                                                                <Share2 size={15} />
                                                            </button>
                                                            {(exam.status === 'ONLINE_EXAM' || exam.status === 'PUBLISHED') && (
                                                                <Link
                                                                    to={`/exams/analytics/${exam.id}`}
                                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 flex items-center justify-center transition-all shadow-sm"
                                                                    title="View Analytics"
                                                                >
                                                                    <BarChart3 size={15} />
                                                                </Link>
                                                            )}
                                                            <button
                                                                onClick={() => handleDirectDownloadPdf(exam)}
                                                                disabled={downloadingId === exam.id}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                                title="Direct PDF Download"
                                                            >
                                                                {downloadingId === exam.id ? <Loader2 size={15} className="animate-spin text-rose-500" /> : <Download size={15} />}
                                                            </button>
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
                </div>

                {/* Mobile view Folder-Card Drive Grid (Visible on Mobile) */}
                <div className="block md:hidden space-y-4">
                    {loading ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={32} />
                            <p className="text-slate-500 font-medium">Loading saved drive exams...</p>
                        </div>
                    ) : filteredExams.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Search size={24} />
                            </div>
                            <p className="font-bold text-slate-700">No drive exams found.</p>
                            <p className="text-xs mt-1 mb-4">Try adjusting search/filters or generate a new paper.</p>
                            <button onClick={() => {setSearchTerm(''); setExamType(''); setStatus(''); setSelectedClass(''); setSelectedSubject('');}} className="text-emerald-600 font-bold text-xs hover:underline">
                                Reset Drive filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredExams.map((exam) => (
                                <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-emerald-300 transition-all duration-300 relative overflow-hidden group">
                                    {/* Folder Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                exam.status === 'ONLINE_EXAM' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                exam.status === 'ARCHIVED' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                                                'bg-amber-50 text-amber-600 border border-amber-100'
                                            }`}>
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{exam.title}</h3>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    {new Date(exam.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <select
                                            value={exam.status}
                                            disabled={actionId === exam.id}
                                            onChange={(e) => handleStatusCellChange(exam.id, e.target.value)}
                                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold border cursor-pointer outline-none transition-all ${
                                                exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-205 focus:ring-1 focus:ring-emerald-500/20' :
                                                exam.status === 'ONLINE_EXAM' ? 'bg-indigo-50 text-indigo-700 border-indigo-205 focus:ring-1 focus:ring-indigo-500/20' :
                                                exam.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border-slate-205 focus:ring-1 focus:ring-slate-500/20' :
                                                'bg-amber-50 text-amber-700 border-amber-205 focus:ring-1 focus:ring-amber-500/20'
                                            }`}
                                        >
                                            <option value="DRAFT">DRAFT</option>
                                            <option value="PUBLISHED">PUBLISHED</option>
                                            <option value="ONLINE_EXAM">ONLINE EXAM</option>
                                            <option value="ARCHIVED">ARCHIVED</option>
                                        </select>
                                    </div>

                                    {/* Folder Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Class</span>
                                            <span className="font-bold text-slate-700 text-xs">{exam.className || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Subject</span>
                                            <span className="font-bold text-slate-700 text-xs line-clamp-1">{exam.subjectName || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Duration</span>
                                            <span className="font-bold text-slate-700 text-xs">{exam.durationMinutes} Mins</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Total Marks</span>
                                            <span className="font-bold text-slate-700 text-xs">{exam.totalMarks} Marks</span>
                                        </div>
                                    </div>

                                    {/* Action Row */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span className="bg-slate-100 text-slate-600 font-bold text-[9px] uppercase px-2.5 py-1 rounded tracking-wider">
                                            {exam.examType?.replace('_', ' ')}
                                        </span>
                                        
                                        <div className="flex items-center gap-2">
                                            {activeTab === 'active' ? (
                                                <>
                                                    <Link
                                                        to={`/exams/generate/nexus-editor/${exam.id}`}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Edit in Editor"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                    </Link>
                                                    <button
                                                        onClick={() => openShareModal(exam)}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Share Exam"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                    {(exam.status === 'ONLINE_EXAM' || exam.status === 'PUBLISHED') && (
                                                        <Link
                                                            to={`/exams/analytics/${exam.id}`}
                                                            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 flex items-center justify-center transition-all shadow-sm"
                                                            title="View Analytics"
                                                        >
                                                            <BarChart3 size={16} />
                                                        </Link>
                                                    )}
                                                    <button
                                                        onClick={() => handleDirectDownloadPdf(exam)}
                                                        disabled={downloadingId === exam.id}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Direct PDF Download"
                                                    >
                                                        {downloadingId === exam.id ? <Loader2 size={16} className="animate-spin text-rose-500" /> : <Download size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exam.id)}
                                                        disabled={actionId === exam.id}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
                                                        title="Delete Exam"
                                                    >
                                                        {actionId === exam.id ? <Loader2 size={16} className="animate-spin text-rose-500" /> : <Trash2 size={16} />}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleRestore(exam.id)}
                                                        disabled={actionId === exam.id}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
                                                        title="Restore Exam"
                                                    >
                                                        {actionId === exam.id ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <RefreshCw size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleHardDelete(exam.id)}
                                                        disabled={actionId === exam.id}
                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm"
                                                        title="Hard Delete Forever"
                                                    >
                                                        {actionId === exam.id ? <Loader2 size={16} className="animate-spin text-rose-500" /> : <AlertTriangle size={16} />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && totalPages > 0 && (
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
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

            {/* Click Catcher Backdrop for FAB */}
            {fabOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] transition-all duration-300"
                    onClick={() => setFabOpen(false)}
                />
            )}

            {/* Premium Floating Action Button (FAB) Speed Dial */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-outfit">
                {/* Speed Dial Options Container */}
                <div className={`flex flex-col gap-3 transition-all duration-300 transform origin-bottom ${
                    fabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'
                }`}>
                    {/* Auto Exam Option */}
                    <Link
                        to="/exams/generate/auto"
                        onClick={() => setFabOpen(false)}
                        className="flex items-center gap-3 bg-white border border-pink-100 hover:border-pink-200 text-pink-600 px-4 py-2.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 group hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                            অটো এক্সাম (Auto Exam)
                        </span>
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        </div>
                    </Link>

                    {/* Manual Exam Option */}
                    <Link
                        to="/exams/generate/manual"
                        onClick={() => setFabOpen(false)}
                        className="flex items-center gap-3 bg-white border border-indigo-100 hover:border-indigo-200 text-indigo-600 px-4 py-2.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 group hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                            ম্যানুয়্যাল এক্সাম (Manual Exam)
                        </span>
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:scale-105 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </div>
                    </Link>
                </div>

                {/* Main FAB Trigger Button */}
                <button
                    onClick={() => setFabOpen(!fabOpen)}
                    className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-300 relative group overflow-hidden ${
                        fabOpen 
                            ? 'bg-gradient-to-tr from-rose-500 to-red-500 shadow-rose-200 hover:shadow-rose-300' 
                            : 'bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105 active:scale-95'
                    }`}
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div 
                        className="transform transition-transform duration-300" 
                        style={{ transform: fabOpen ? 'rotate(135deg)' : 'rotate(0deg)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                </button>
            </div>

            {/* Share Modal */}
            {shareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-6 relative font-outfit text-slate-800">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900">প্রশ্নপত্র শেয়ার করুন (Share Exam)</h3>
                                <p className="text-xs text-slate-500 font-medium">নিচের লিংকটির মাধ্যমে যেকোনো ব্যক্তি প্রশ্নপত্রটি সরাসরি দেখতে পারবেন।</p>
                            </div>
                            <button 
                                onClick={() => setShareModalOpen(false)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border border-slate-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Exam info summary */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{shareExamTitle}</h4>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">ID: {shareExamId}</p>
                            </div>
                        </div>

                        {/* Share link input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">শেয়ারিং লিংক (Shareable Link)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/exams/share/${shareExamId}`}
                                    className="bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl p-3 flex-1 outline-none text-slate-650"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/exams/share/${shareExamId}`);
                                        setCopiedId(shareExamId);
                                        setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="px-4 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-md shadow-slate-200"
                                >
                                    {copiedId === shareExamId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    {copiedId === shareExamId ? 'কপি হয়েছে' : 'কপি করুন'}
                                </button>
                            </div>
                        </div>

                        {/* Social sharing links */}
                        <div className="space-y-2 pt-2">
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">অন্যান্য মাধ্যমে শেয়ার করুন</label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Whatsapp */}
                                <a
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`পরীক্ষার প্রশ্নপত্র: ${shareExamTitle}\nদেখতে এখানে ক্লিক করুন: ${window.location.origin}/exams/share/${shareExamId}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-750 rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                    হোয়াটসঅ্যাপ (WhatsApp)
                                </a>

                                {/* Email */}
                                <a
                                    href={`mailto:?subject=${encodeURIComponent(`পরীক্ষার প্রশ্নপত্র: ${shareExamTitle}`)}&body=${encodeURIComponent(`হ্যালো,\n\nএখানে পরীক্ষার প্রশ্নপত্রটির লিংক শেয়ার করা হলো:\n${window.location.origin}/exams/share/${shareExamId}\n\nধন্যবাদ!`)}`}
                                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    ইমেইল (Email)
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Draft Warning Modal */}
            {draftWarningOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 relative font-outfit text-slate-800 animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                                <AlertTriangle size={24} className="animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900">পরীক্ষাটি ড্রাফট মোডে আছে</h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    যে পরীক্ষাগুলোর স্ট্যাটাস <strong>DRAFT</strong> থাকে, সেগুলোর শেয়ার লিংক জেনারেট করা যায় না। শেয়ার লিংক ব্যবহার করতে হলে প্রথমে পরীক্ষার স্ট্যাটাস আপডেট করুন।
                                </p>
                            </div>
                        </div>

                        {/* Exam title preview */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                                <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-xs truncate">{shareExamTitle}</h4>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">বর্তমান স্ট্যাটাস: DRAFT</p>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-2.5">
                            <button
                                onClick={() => handleUpdateStatus(shareExamId, 'PUBLISHED')}
                                disabled={updatingStatusId !== null}
                                className="w-full flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 hover:border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold transition-all shadow-sm group active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform font-black">
                                        ✓
                                    </span>
                                    <span className="text-left">
                                        <span className="block font-black">পাবলিশ করুন (PUBLISHED)</span>
                                        <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">সবাই প্রশ্নপত্রটি দেখতে ও ডাউনলোড করতে পারবে</span>
                                    </span>
                                </div>
                                {updatingStatusId === shareExamId ? (
                                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 group-hover:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                )}
                            </button>

                            <button
                                onClick={() => handleUpdateStatus(shareExamId, 'ONLINE_EXAM')}
                                disabled={updatingStatusId !== null}
                                className="w-full flex items-center justify-between p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 text-indigo-800 rounded-2xl text-xs font-bold transition-all shadow-sm group active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center group-hover:scale-105 transition-transform font-black">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                    </span>
                                    <span className="text-left">
                                        <span className="block font-black">অনলাইন পরীক্ষা (ONLINE EXAM)</span>
                                        <span className="block text-[10px] text-indigo-600 font-medium mt-0.5">অনলাইনে সরাসরি পরীক্ষা দেওয়ার জন্য প্রস্তুত করুন</span>
                                    </span>
                                </div>
                                {updatingStatusId === shareExamId ? (
                                    <Loader2 size={16} className="animate-spin text-indigo-600" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 group-hover:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                )}
                            </button>
                        </div>

                        {/* Footer Close */}
                        <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setDraftWarningOpen(false)}
                                className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                            >
                                বন্ধ করুন (Close)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedExams;
