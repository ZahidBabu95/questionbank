import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Save, Search, Loader2, Eye, Trash2, Filter, FileText, CheckCircle2, 
    Archive, RefreshCw, AlertTriangle, ShieldAlert, Download, Share2, 
    Copy, Check, BarChart3, Smartphone, LayoutGrid, List, X, 
    RotateCcw, CheckSquare, Square, ExternalLink, QrCode, Layers, 
    Clock, Award, Sparkles, ChevronRight, Edit3, Globe, Building2
} from 'lucide-react';
import examService from '../../../services/examService';
import axiosInstance from '../../../utils/axios';
import { downloadExamPdf } from '../../../services/pdfService';

const SavedExams = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    
    // View Mode ('table' | 'grid')
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('savedExams_viewMode') || 'table';
    });

    // Filters
    const [examType, setExamType] = useState('');
    const [status, setStatus] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedInstitute, setSelectedInstitute] = useState('');
    
    // Tabs
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'recycle'
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user && user.roles && user.roles.includes('SUPER_ADMIN');

    // Batch Selection
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Actions & Spinners
    const [actionId, setActionId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);

    // Quick Preview Drawer
    const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
    const [previewExam, setPreviewExam] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Share Modal
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareExamId, setShareExamId] = useState(null);
    const [shareExamTitle, setShareExamTitle] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    // Mobile App Sharing
    const [mobileShareCode, setMobileShareCode] = useState('');
    const [isMobileShared, setIsMobileShared] = useState(true);
    const [copiedPin, setCopiedPin] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    // Sharing Draft Check
    const [draftWarningOpen, setDraftWarningOpen] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

    // Save viewMode preference
    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('savedExams_viewMode', mode);
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
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

            if (res && res.success) {
                setExams(res.data.content || []);
                setTotalPages(res.data.totalPages || 1);
            } else if (res && res.data && Array.isArray(res.data)) {
                setExams(res.data);
                setTotalPages(1);
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
        setSelectedIds([]);
    }, [debouncedSearch, size, examType, status, selectedClass, selectedSubject, selectedInstitute, activeTab]);

    // Fetch on parameter change
    useEffect(() => {
        fetchExams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, debouncedSearch, size, examType, status, activeTab]);

    // Extract unique classes, subjects, and institutes dynamically from loaded exams
    const uniqueClasses = useMemo(() => {
        return Array.from(new Set(exams.map(e => e.className).filter(Boolean))).sort();
    }, [exams]);

    const uniqueSubjects = useMemo(() => {
        return Array.from(new Set(exams.map(e => e.subjectName).filter(Boolean))).sort();
    }, [exams]);

    const uniqueInstitutes = useMemo(() => {
        return Array.from(new Set(exams.map(e => e.instituteName).filter(Boolean))).sort();
    }, [exams]);

    // Client-side filtering by Class, Subject, and Institute
    const filteredExams = useMemo(() => {
        return exams.filter(exam => {
            const matchClass = !selectedClass || exam.className === selectedClass;
            const matchSubject = !selectedSubject || exam.subjectName === selectedSubject;
            const matchInstitute = !selectedInstitute || exam.instituteName === selectedInstitute;
            return matchClass && matchSubject && matchInstitute;
        });
    }, [exams, selectedClass, selectedSubject, selectedInstitute]);

    // Check if any filter is active
    const hasActiveFilters = Boolean(searchTerm || examType || status || selectedClass || selectedSubject || selectedInstitute);

    const handleClearAllFilters = () => {
        setSearchTerm('');
        setExamType('');
        setStatus('');
        setSelectedClass('');
        setSelectedSubject('');
        setSelectedInstitute('');
    };

    // --- Batch Selection Handlers ---
    const handleToggleSelectAll = () => {
        if (selectedIds.length === filteredExams.length && filteredExams.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredExams.map(e => e.id));
        }
    };

    const handleToggleSelectOne = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (selectedIds.length === 0) return;
        setBulkActionLoading(true);
        try {
            await Promise.all(
                selectedIds.map(id => axiosInstance.put(`/v1/exams/generate/${id}`, { status: newStatus }))
            );
            setSelectedIds([]);
            await fetchExams();
        } catch (err) {
            console.error('Error during bulk status update', err);
            alert('কিছু পরীক্ষার স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`আপনি কি নির্বাচিত ${selectedIds.length}টি পরীক্ষা মুছে ফেলতে নিশ্চিত?`)) return;
        
        setBulkActionLoading(true);
        try {
            await Promise.all(
                selectedIds.map(id => axiosInstance.delete(`/v1/exams/generate/${id}`))
            );
            setSelectedIds([]);
            await fetchExams();
        } catch (err) {
            console.error('Error during bulk delete', err);
            alert('কিছু পরীক্ষা ডিলিট করতে সমস্যা হয়েছে।');
        } finally {
            setBulkActionLoading(false);
        }
    };

    // --- Quick Preview Drawer Handler ---
    const handleOpenQuickPreview = async (exam) => {
        setPreviewDrawerOpen(true);
        setPreviewExam(exam);
        setPreviewLoading(true);
        try {
            const res = await examService.previewExam(exam.id);
            if (res && res.success && res.data) {
                setPreviewExam(res.data);
            }
        } catch (e) {
            console.error("Could not fetch detailed preview, falling back to summary", e);
        } finally {
            setPreviewLoading(false);
        }
    };

    // --- Share Modal Handlers ---
    const openShareModal = async (exam) => {
        setShareExamId(exam.id);
        setShareExamTitle(exam.title);
        setMobileShareCode(exam.shareCode || '');
        setIsMobileShared(exam.isPublicShared ?? true);

        if (exam.status === 'DRAFT') {
            setDraftWarningOpen(true);
        } else {
            setShareModalOpen(true);
            try {
                const res = await axiosInstance.post(`/v1/exams/generate/${exam.id}/mobile-share`, {
                    isPublicShared: true
                });
                if (res.data && res.data.success) {
                    setMobileShareCode(res.data.data.shareCode);
                    setIsMobileShared(res.data.data.isPublicShared);
                }
            } catch (e) {
                console.error("Failed to sync mobile share info", e);
            }
        }
    };

    const handleToggleMobileShare = async () => {
        if (!shareExamId) return;
        try {
            const res = await axiosInstance.post(`/v1/exams/generate/${shareExamId}/mobile-share`, {
                isPublicShared: !isMobileShared
            });
            if (res.data && res.data.success) {
                setIsMobileShared(res.data.data.isPublicShared);
                setMobileShareCode(res.data.data.shareCode);
            }
        } catch (e) {
            console.error("Failed to toggle mobile share", e);
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
                setShareExamId(examId);
                const updatedExam = exams.find(e => e.id === examId) || res.data.data;
                if (updatedExam) {
                    setShareExamTitle(updatedExam.title);
                }
                try {
                    const mobileRes = await axiosInstance.post(`/v1/exams/generate/${examId}/mobile-share`, {
                        isPublicShared: true
                    });
                    if (mobileRes.data && mobileRes.data.success) {
                        setMobileShareCode(mobileRes.data.data.shareCode);
                        setIsMobileShared(mobileRes.data.data.isPublicShared);
                    }
                } catch (e) {
                    console.error("Failed to sync mobile share info after status update", e);
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
        if (!window.confirm("আপনি কি নিশ্চিত যে এই সংরক্ষিত পরীক্ষাটি মুছে ফেলতে চান?")) return;
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
        if (!window.confirm("এটি স্থায়ীভাবে পরীক্ষাটি ডিলিট করবে এবং এটি ফিরিয়ে আনা যাবে না! আপনি কি নিশ্চিত?")) return;
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
        if (!window.confirm("সতর্কতা: এটি রিসাইকেল বিনের সকল পরীক্ষা স্থায়ীভাবে মুছে ফেলবে। আপনি কি নিশ্চিত?")) return;
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

    const shareUrl = `${window.location.origin}/exams/share/${shareExamId}`;
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-3 sm:p-5 md:p-8 font-outfit text-slate-800 pb-28">
            <div className="max-w-full xl:max-w-[1600px] mx-auto space-y-5">

                {/* Top Tabs & View Switcher Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                    {/* Active vs Recycle Bin Tabs */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => { setActiveTab('active'); setPage(0); }}
                            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
                                activeTab === 'active'
                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <FileText size={16} /> 
                            <span>Active Exams</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === 'active' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                                {activeTab === 'active' ? filteredExams.length : ''}
                            </span>
                        </button>

                        {isSuperAdmin && (
                            <button
                                onClick={() => { setActiveTab('recycle'); setPage(0); }}
                                className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
                                    activeTab === 'recycle'
                                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-rose-600'
                                }`}
                            >
                                <Trash2 size={16} /> 
                                <span>Recycle Bin</span>
                            </button>
                        )}
                    </div>

                    {/* Right Controls: Empty Bin (if recycle) + View Switcher */}
                    <div className="flex items-center gap-2.5">
                        {activeTab === 'recycle' && isSuperAdmin && (
                            <button
                                onClick={handleEmptyRecycleBin}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors border border-rose-200"
                            >
                                <ShieldAlert size={15} /> 
                                <span>Empty Bin</span>
                            </button>
                        )}

                        {/* View Switcher Toggle */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => handleViewModeChange('table')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewMode === 'table' 
                                        ? 'bg-white text-slate-800 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                                title="Table View"
                            >
                                <List size={15} />
                                <span className="hidden sm:inline">Table</span>
                            </button>
                            <button
                                onClick={() => handleViewModeChange('grid')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    viewMode === 'grid' 
                                        ? 'bg-white text-slate-800 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid size={15} />
                                <span className="hidden sm:inline">Grid</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filter Toolbar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex flex-col xl:flex-row gap-3 items-center justify-between">
                        
                        {/* Search & Main Filter Row */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 w-full xl:w-auto items-center">
                            
                            {/* Search Input */}
                            <div className="relative w-full sm:w-64 md:w-72">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by title or topic..."
                                    className="bg-slate-50 border border-slate-200 text-xs md:text-sm font-medium rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 block w-full pl-9 pr-8 py-2.5 transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 flex items-center justify-center transition-colors"
                                        title="Clear search"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdowns */}
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                
                                {/* Exam Type */}
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 py-2.5 px-3 outline-none text-slate-700 cursor-pointer flex-1 sm:flex-none hover:border-slate-300 transition-colors"
                                    value={examType}
                                    onChange={(e) => setExamType(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="CLASS_TEST">Class Test</option>
                                    <option value="MODEL_TEST">Model Test</option>
                                    <option value="FINAL">Final Exam</option>
                                    <option value="PRACTICE">Practice</option>
                                </select>

                                {/* Status */}
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 py-2.5 px-3 outline-none text-slate-700 cursor-pointer flex-1 sm:flex-none hover:border-slate-300 transition-colors"
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

                                {/* Class */}
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 py-2.5 px-3 outline-none text-slate-700 cursor-pointer flex-1 sm:flex-none hover:border-slate-300 transition-colors"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="">All Classes</option>
                                    {uniqueClasses.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>

                                {/* Subject */}
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 py-2.5 px-3 outline-none text-slate-700 cursor-pointer flex-1 sm:flex-none hover:border-slate-300 transition-colors"
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                >
                                    <option value="">All Subjects</option>
                                    {uniqueSubjects.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>

                                {/* Institute / Workspace Filter */}
                                {uniqueInstitutes.length > 0 && (
                                    <select 
                                        className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 py-2.5 px-3 outline-none text-slate-700 cursor-pointer flex-1 sm:flex-none hover:border-slate-300 transition-colors"
                                        value={selectedInstitute}
                                        onChange={(e) => setSelectedInstitute(e.target.value)}
                                    >
                                        <option value="">All Institutes</option>
                                        {uniqueInstitutes.map(inst => (
                                            <option key={inst} value={inst}>{inst}</option>
                                        ))}
                                    </select>
                                )}

                                {/* Reset All Filters Button */}
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearAllFilters}
                                        className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                                        title="Clear all filters"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Page Size & Stats */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full xl:w-auto pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                            <span className="text-xs font-bold text-slate-400">
                                Showing <strong className="text-slate-700">{filteredExams.length}</strong> exams
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-slate-500">Per page:</span>
                                <select 
                                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 py-1.5 px-2.5 outline-none text-slate-700 cursor-pointer"
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
                    </div>
                </div>

                {/* SKELETON LOADER STATE */}
                {loading && (
                    <div className="space-y-4">
                        {viewMode === 'table' ? (
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 space-y-3">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="flex items-center justify-between gap-4 p-3 bg-slate-50/70 rounded-xl animate-pulse">
                                        <div className="w-6 h-6 bg-slate-200 rounded-md" />
                                        <div className="w-20 h-6 bg-slate-200 rounded-md" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="w-1/3 h-4 bg-slate-200 rounded" />
                                            <div className="w-1/5 h-3 bg-slate-200 rounded" />
                                        </div>
                                        <div className="w-28 h-6 bg-slate-200 rounded" />
                                        <div className="w-24 h-6 bg-slate-200 rounded" />
                                        <div className="w-32 h-8 bg-slate-200 rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse">
                                        <div className="flex items-center justify-between">
                                            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                                            <div className="w-20 h-6 bg-slate-200 rounded-md" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-3/4 h-5 bg-slate-200 rounded" />
                                            <div className="w-1/2 h-3 bg-slate-200 rounded" />
                                        </div>
                                        <div className="h-16 bg-slate-100 rounded-xl" />
                                        <div className="flex justify-between items-center pt-2">
                                            <div className="w-20 h-5 bg-slate-200 rounded" />
                                            <div className="w-28 h-8 bg-slate-200 rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && filteredExams.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-3xl p-10 md:p-16 text-center shadow-sm max-w-2xl mx-auto space-y-5">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                            <FileText size={36} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-800">কোনো সংরক্ষিত পরীক্ষা পাওয়া যায়নি</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto">
                                {hasActiveFilters 
                                    ? 'আপনার ফিল্টারের সাথে মিলে এমন কোনো পরীক্ষা নেই। ফিল্টার রিসেট করে আবার চেষ্টা করুন।'
                                    : 'আপনার প্রশ্নব্যাংক থেকে নতুন একটি স্বয়ংক্রিয় বা ম্যানুয়াল প্রশ্নপত্র তৈরি করুন।'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            {hasActiveFilters ? (
                                <button
                                    onClick={handleClearAllFilters}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                >
                                    সব ফিল্টার রিসেট করুন
                                </button>
                            ) : (
                                <>
                                    <Link
                                        to="/exams/generate/auto"
                                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
                                    >
                                        <Sparkles size={15} /> অটো এক্সাম তৈরি করুন
                                    </Link>
                                    <Link
                                        to="/exams/generate/manual"
                                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <Edit3 size={15} /> ম্যানুয়াল এক্সাম তৈরি করুন
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* TABLE VIEW (when viewMode === 'table' and data exists) */}
                {!loading && filteredExams.length > 0 && viewMode === 'table' && (
                    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center">
                                            <button 
                                                onClick={handleToggleSelectAll}
                                                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                                                title={selectedIds.length === filteredExams.length ? "Deselect All" : "Select All"}
                                            >
                                                {selectedIds.length === filteredExams.length && filteredExams.length > 0 ? (
                                                    <CheckSquare size={18} className="text-emerald-600" />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-4 py-4 w-36">Status</th>
                                        <th className="px-5 py-4">Exam Title & Type</th>
                                        <th className="px-5 py-4">Institution / Workspace</th>
                                        <th className="px-5 py-4">Class & Subject</th>
                                        <th className="px-5 py-4">Marks & Time</th>
                                        <th className="px-5 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredExams.map((exam) => {
                                        const isSelected = selectedIds.includes(exam.id);
                                        return (
                                            <tr 
                                                key={exam.id} 
                                                className={`transition-colors group ${
                                                    isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                                                }`}
                                            >
                                                {/* Select Checkbox */}
                                                <td className="px-4 py-4 text-center">
                                                    <button 
                                                        onClick={() => handleToggleSelectOne(exam.id)}
                                                        className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare size={18} className="text-emerald-600" />
                                                        ) : (
                                                            <Square size={18} />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Status Dropdown */}
                                                <td className="px-4 py-4">
                                                    <select
                                                        value={exam.status}
                                                        disabled={actionId === exam.id}
                                                        onChange={(e) => handleStatusCellChange(exam.id, e.target.value)}
                                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer outline-none transition-all ${
                                                            exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                                                            exam.status === 'ONLINE_EXAM' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' :
                                                            exam.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                        }`}
                                                    >
                                                        <option value="DRAFT">DRAFT</option>
                                                        <option value="PUBLISHED">PUBLISHED</option>
                                                        <option value="ONLINE_EXAM">ONLINE EXAM</option>
                                                        <option value="ARCHIVED">ARCHIVED</option>
                                                    </select>
                                                </td>

                                                {/* Title & Type */}
                                                <td className="px-5 py-4">
                                                    <div 
                                                        onClick={() => handleOpenQuickPreview(exam)}
                                                        className="font-bold text-slate-900 text-sm mb-1 hover:text-emerald-600 cursor-pointer transition-colors line-clamp-1 flex items-center gap-1.5"
                                                    >
                                                        <span>{exam.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold tracking-wide">
                                                            {exam.examType?.replace('_', ' ') || 'STANDARD'}
                                                        </span> 
                                                        <span>•</span>
                                                        <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </td>

                                                {/* Institution / Workspace */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                        <Building2 size={14} className="text-indigo-500 shrink-0" />
                                                        <span className="truncate max-w-[170px]" title={exam.instituteName || 'Default Institute'}>
                                                            {exam.instituteName || 'Default Institute'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Class & Subject */}
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-slate-700 text-xs mb-0.5">{exam.className || 'N/A'}</div>
                                                    <div className="text-[11px] font-medium text-slate-500">{exam.subjectName || 'N/A'}</div>
                                                </td>

                                                {/* Marks & Duration */}
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        <span className="font-bold text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100 tracking-wide">
                                                            {exam.totalMarks} Marks
                                                        </span>
                                                        <span className="font-bold text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 tracking-wide">
                                                            {exam.durationMinutes} Min
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Action Buttons (40x40 touch targets) */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {activeTab === 'active' ? (
                                                            <>
                                                                {/* Quick Preview Button */}
                                                                <button
                                                                    onClick={() => handleOpenQuickPreview(exam)}
                                                                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-sm active:scale-95"
                                                                    title="Quick Preview"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>

                                                                {/* Nexus Editor */}
                                                                <Link
                                                                    to={`/exams/generate/nexus-editor/${exam.id}`}
                                                                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-sm active:scale-95"
                                                                    title="Edit in Nexus Editor"
                                                                >
                                                                    <Edit3 size={16} />
                                                                </Link>

                                                                {/* Share Button */}
                                                                <button
                                                                    onClick={() => openShareModal(exam)}
                                                                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm active:scale-95"
                                                                    title="Share Exam"
                                                                >
                                                                    <Share2 size={16} />
                                                                </button>

                                                                {/* Analytics */}
                                                                {(exam.status === 'ONLINE_EXAM' || exam.status === 'PUBLISHED') && (
                                                                    <Link
                                                                        to={`/exams/analytics/${exam.id}`}
                                                                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 flex items-center justify-center transition-all shadow-sm active:scale-95"
                                                                        title="View Analytics"
                                                                    >
                                                                        <BarChart3 size={16} />
                                                                    </Link>
                                                                )}

                                                                {/* PDF Download */}
                                                                <button
                                                                    onClick={() => handleDirectDownloadPdf(exam)}
                                                                    disabled={downloadingId === exam.id}
                                                                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm active:scale-95"
                                                                    title="Direct PDF Download"
                                                                >
                                                                    {downloadingId === exam.id ? <Loader2 size={16} className="animate-spin text-rose-500" /> : <Download size={16} />}
                                                                </button>

                                                                {/* Delete Button */}
                                                                <button
                                                                    onClick={() => handleDelete(exam.id)}
                                                                    disabled={actionId === exam.id}
                                                                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all disabled:opacity-50 shadow-sm active:scale-95"
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
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* GRID VIEW (when viewMode === 'grid' and data exists) */}
                {!loading && filteredExams.length > 0 && viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredExams.map((exam) => {
                            const isSelected = selectedIds.includes(exam.id);
                            return (
                                <div 
                                    key={exam.id} 
                                    className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300 relative group flex flex-col justify-between ${
                                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10' : 'border-slate-200/90 hover:border-slate-300'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2.5">
                                                {/* Select Button */}
                                                <button 
                                                    onClick={() => handleToggleSelectOne(exam.id)}
                                                    className="text-slate-400 hover:text-slate-700 transition-colors"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare size={18} className="text-emerald-600" />
                                                    ) : (
                                                        <Square size={18} />
                                                    )}
                                                </button>

                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                    exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    exam.status === 'ONLINE_EXAM' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                    exam.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    <FileText size={18} />
                                                </div>
                                            </div>

                                            {/* Status Dropdown */}
                                            <select
                                                value={exam.status}
                                                disabled={actionId === exam.id}
                                                onChange={(e) => handleStatusCellChange(exam.id, e.target.value)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer outline-none transition-all ${
                                                    exam.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    exam.status === 'ONLINE_EXAM' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    exam.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                <option value="DRAFT">DRAFT</option>
                                                <option value="PUBLISHED">PUBLISHED</option>
                                                <option value="ONLINE_EXAM">ONLINE EXAM</option>
                                                <option value="ARCHIVED">ARCHIVED</option>
                                            </select>
                                        </div>

                                        {/* Title */}
                                        <h3 
                                            onClick={() => handleOpenQuickPreview(exam)}
                                            className="font-bold text-slate-800 text-sm hover:text-emerald-600 cursor-pointer transition-colors line-clamp-2 leading-snug"
                                        >
                                            {exam.title}
                                        </h3>
                                        
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                            {exam.instituteName && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                    <Building2 size={10} /> {exam.instituteName}
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {new Date(exam.createdAt).toLocaleDateString()} • {exam.examType?.replace('_', ' ') || 'STANDARD'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Class</span>
                                            <span className="font-bold text-slate-700 truncate block">{exam.className || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Subject</span>
                                            <span className="font-bold text-slate-700 truncate block">{exam.subjectName || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Marks</span>
                                            <span className="font-bold text-purple-700">{exam.totalMarks}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Time</span>
                                            <span className="font-bold text-blue-700">{exam.durationMinutes} Min</span>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleOpenQuickPreview(exam)}
                                            className="text-xs font-bold text-slate-600 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                                        >
                                            <Eye size={14} /> Preview
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {activeTab === 'active' ? (
                                                <>
                                                    <Link
                                                        to={`/exams/generate/nexus-editor/${exam.id}`}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Nexus Editor"
                                                    >
                                                        <Edit3 size={14} />
                                                    </Link>
                                                    <button
                                                        onClick={() => openShareModal(exam)}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Share"
                                                    >
                                                        <Share2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDirectDownloadPdf(exam)}
                                                        disabled={downloadingId === exam.id}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Download PDF"
                                                    >
                                                        {downloadingId === exam.id ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <Download size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(exam.id)}
                                                        disabled={actionId === exam.id}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Delete"
                                                    >
                                                        {actionId === exam.id ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <Trash2 size={14} />}
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleRestore(exam.id)}
                                                        disabled={actionId === exam.id}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Restore"
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleHardDelete(exam.id)}
                                                        disabled={actionId === exam.id}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                        title="Hard Delete"
                                                    >
                                                        <AlertTriangle size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 0 && filteredExams.length > 0 && (
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Page {page + 1} of {totalPages} <span className="lowercase font-medium ml-1 text-slate-400">({filteredExams.length} items on this page)</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => p + 1)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING BULK ACTIONS TOOLBAR */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 md:gap-5 border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-[95vw] overflow-x-auto">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            {selectedIds.length}
                        </span>
                        <span className="text-xs font-bold text-slate-200 whitespace-nowrap">নির্বাচিত (Selected)</span>
                    </div>

                    <div className="h-5 w-px bg-slate-700 shrink-0" />

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => handleBulkStatusUpdate('PUBLISHED')}
                            disabled={bulkActionLoading}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            {bulkActionLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            <span>পাবলিশ (Publish)</span>
                        </button>

                        <button
                            onClick={() => handleBulkStatusUpdate('ARCHIVED')}
                            disabled={bulkActionLoading}
                            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            <Archive size={14} />
                            <span>আর্কাইভ (Archive)</span>
                        </button>

                        <button
                            onClick={handleBulkDelete}
                            disabled={bulkActionLoading}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                            <Trash2 size={14} />
                            <span>ডিলিট (Delete)</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedIds([])}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        title="Deselect all"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            {/* QUICK PREVIEW SLIDE-OVER DRAWER */}
            {previewDrawerOpen && previewExam && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setPreviewDrawerOpen(false)}
                    />

                    {/* Drawer Panel */}
                    <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                                    Quick Preview
                                </span>
                                <h3 className="font-black text-slate-900 text-base mt-1 line-clamp-1">
                                    {previewExam.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => setPreviewDrawerOpen(false)}
                                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {previewLoading ? (
                                <div className="py-20 text-center space-y-3">
                                    <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto" />
                                    <p className="text-xs font-bold text-slate-500">পরীক্ষার বিবরণ লোড হচ্ছে...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Meta Summary Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-3">
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">প্রতিষ্ঠান (Institution / Workspace)</span>
                                            <span className="font-bold text-indigo-700 text-xs flex items-center gap-1.5 mt-0.5">
                                                <Building2 size={13} /> {previewExam.instituteName || 'Default Institute'}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">শ্রেণি (Class)</span>
                                            <span className="font-bold text-slate-800 text-xs">{previewExam.className || 'N/A'}</span>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">বিষয় (Subject)</span>
                                            <span className="font-bold text-slate-800 text-xs truncate block">{previewExam.subjectName || 'N/A'}</span>
                                        </div>
                                        <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                                            <span className="block text-[10px] uppercase font-bold text-purple-600">পূর্ণমান (Marks)</span>
                                            <span className="font-bold text-purple-900 text-xs">{previewExam.totalMarks || 0}</span>
                                        </div>
                                        <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 col-span-2 sm:col-span-1">
                                            <span className="block text-[10px] uppercase font-bold text-blue-600">সময় (Duration)</span>
                                            <span className="font-bold text-blue-900 text-xs">{previewExam.durationMinutes || 0} মিনিট</span>
                                        </div>
                                    </div>

                                    {/* Exam Questions / Content Preview */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                                <Layers size={14} /> প্রশ্নপত্রের কাঠামো ও বিষয়বস্তু
                                            </h4>
                                            <span className="text-[11px] font-bold text-slate-400">
                                                {previewExam.sections?.length || 0} Sections
                                            </span>
                                        </div>

                                        {previewExam.sections && previewExam.sections.length > 0 ? (
                                            previewExam.sections.map((sec, secIdx) => (
                                                <div key={secIdx} className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="font-bold text-slate-800 text-xs">{sec.name || `Section ${secIdx + 1}`}</h5>
                                                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                                            {sec.questions?.length || 0} Questions
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2 text-xs">
                                                        {(sec.questions || []).slice(0, 5).map((q, qIdx) => (
                                                            <div key={qIdx} className="bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                                                                <div className="font-bold text-slate-800 flex items-start gap-2">
                                                                    <span className="text-slate-400 shrink-0">{qIdx + 1}.</span>
                                                                    <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: q.content || q.title || 'Question content' }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(sec.questions || []).length > 5 && (
                                                            <p className="text-center text-[11px] font-bold text-slate-400 pt-1">
                                                                + আরও {sec.questions.length - 5}টি প্রশ্ন রয়েছে...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="bg-slate-50 p-6 rounded-2xl text-center text-slate-400 text-xs">
                                                বিস্তারিত প্রশ্ন কাঠামো দেখতে Nexus Editor-এ ওপেন করুন।
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                            <button
                                onClick={() => handleDirectDownloadPdf(previewExam)}
                                className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Download size={15} /> PDF ডাউনলোড
                            </button>

                            <Link
                                to={`/exams/generate/nexus-editor/${previewExam.id}`}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                            >
                                <Edit3 size={15} /> Nexus Editor-এ এডিট করুন
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Click Catcher Backdrop for FAB */}
            {fabOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] transition-all duration-300"
                    onClick={() => setFabOpen(false)}
                />
            )}

            {/* Floating Action Button (FAB) Speed Dial */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 font-outfit">
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
                            <Sparkles size={20} />
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
                            <Edit3 size={20} />
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </div>
                </button>
            </div>

            {/* ENHANCED SHARE MODAL WITH QR CODE */}
            {shareModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-5 relative font-outfit text-slate-800">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900">প্রশ্নপত্র শেয়ার করুন (Share Exam)</h3>
                                <p className="text-xs text-slate-500 font-medium">ওয়েব লিঙ্ক, কিউআর কোড বা মোবাইল পিনের মাধ্যমে প্রশ্নপত্র শেয়ার করুন।</p>
                            </div>
                            <button 
                                onClick={() => { setShareModalOpen(false); setShowQrModal(false); }}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border border-slate-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Exam info summary */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{shareExamTitle}</h4>
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
                                    value={shareUrl}
                                    className="bg-slate-50 border border-slate-200 text-xs font-medium rounded-xl p-3 flex-1 outline-none text-slate-700 truncate"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareUrl);
                                        setCopiedId(shareExamId);
                                        setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shrink-0"
                                >
                                    {copiedId === shareExamId ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                    <span>{copiedId === shareExamId ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Dynamic QR Code & Social Grid */}
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400">দ্রুত শেয়ার ও কিউআর স্ক্যান</label>
                                <button
                                    type="button"
                                    onClick={() => setShowQrModal(!showQrModal)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <QrCode size={14} /> {showQrModal ? 'QR লুকান' : 'QR কোড দেখুন'}
                                </button>
                            </div>

                            {/* QR Code Expansion Panel */}
                            {showQrModal && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-in fade-in duration-200">
                                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
                                        <img 
                                            src={qrCodeApiUrl} 
                                            alt="Exam QR Code" 
                                            className="w-28 h-28 object-contain rounded" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <h5 className="font-bold text-slate-800 text-xs">মোবাইল ক্যামেরা দিয়ে স্ক্যান করুন</h5>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            শিক্ষার্থী বা শিক্ষক মোবাইল ক্যামেরা বা QR স্ক্যানার দিয়ে স্ক্যান করলে সরাসরি প্রশ্নপত্রটি দেখতে পাবেন।
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* WhatsApp & Email */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <a
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`পরীক্ষার প্রশ্নপত্র: ${shareExamTitle}\nদেখতে এখানে ক্লিক করুন: ${shareUrl}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                    হোয়াটসঅ্যাপ (WhatsApp)
                                </a>

                                <a
                                    href={`mailto:?subject=${encodeURIComponent(`পরীক্ষার প্রশ্নপত্র: ${shareExamTitle}`)}&body=${encodeURIComponent(`হ্যালো,\n\nএখানে পরীক্ষার প্রশ্নপত্রটির লিংক শেয়ার করা হলো:\n${shareUrl}\n\nধন্যবাদ!`)}`}
                                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    ইমেইল (Email)
                                </a>
                            </div>
                        </div>

                        {/* Mobile App Share Section */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                    <Smartphone size={15} /> মোবাইল অ্যাপে শেয়ার (Mobile App PIN)
                                </label>
                                <button
                                    type="button"
                                    onClick={handleToggleMobileShare}
                                    className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                                        isMobileShared 
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                                            : 'bg-slate-100 text-slate-600 border-slate-300'
                                    }`}
                                >
                                    {isMobileShared ? '✓ Mobile Access ON' : 'Mobile Access OFF'}
                                </button>
                            </div>

                            {/* Mobile PIN Display & Copy */}
                            <div className="p-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-2xl border border-indigo-100">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400">পরীক্ষার শেয়ারিং কোড (EXAM PIN)</span>
                                        <div className="text-2xl font-black font-mono text-indigo-700 tracking-wider mt-0.5">
                                            {mobileShareCode || (shareExamId ? `EX-${shareExamId.substring(0, 6).toUpperCase()}` : 'EX-849201')}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const pinToCopy = mobileShareCode || (shareExamId ? `EX-${shareExamId.substring(0, 6).toUpperCase()}` : 'EX-849201');
                                            if (pinToCopy) {
                                                navigator.clipboard.writeText(pinToCopy);
                                                setCopiedPin(true);
                                                setTimeout(() => setCopiedPin(false), 2000);
                                            }
                                        }}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 shrink-0"
                                    >
                                        {copiedPin ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                                        <span>{copiedPin ? 'PIN কপি হয়েছে' : 'PIN কপি করুন'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DRAFT WARNING MODAL */}
            {draftWarningOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 relative font-outfit text-slate-800">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                                <AlertTriangle size={24} className="animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-900">পরীক্ষাটি ড্রাফট মোডে আছে</h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    যে পরীক্ষাগুলোর স্ট্যাটাস <strong>DRAFT</strong> থাকে, সেগুলোর শেয়ার লিংক জেনারেট করা যায় না। শেয়ার করতে হলে প্রথমে পরীক্ষাটি পাবলিশ করুন।
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
                                className="w-full flex items-center justify-between p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 group active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center font-black text-sm">
                                        ✓
                                    </span>
                                    <span className="text-left">
                                        <span className="block text-sm font-black">পরীক্ষাটি পাবলিশ ও শেয়ার সক্রিয় করুন</span>
                                        <span className="block text-[11px] text-emerald-100 font-medium mt-0.5">অনলাইন শেয়ার লিঙ্ক ও মোবাইল অ্যাপের জন্য প্রশ্নপত্রটি লাইভ করা হবে</span>
                                    </span>
                                </div>
                                {updatingStatusId === shareExamId ? (
                                    <Loader2 size={18} className="animate-spin text-white" />
                                ) : (
                                    <ChevronRight size={18} className="text-white group-hover:translate-x-0.5 transition-transform" />
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
