import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Share2, Printer, Download, Eye, EyeOff, Copy, Check, BookOpen, Award, Clock, ArrowLeft, AlertCircle, Calendar, LogIn, UserPlus, GraduationCap, ShieldCheck, Lock } from 'lucide-react';
import axiosInstance from '../utils/axios';
import MarkdownRenderer from '../components/MarkdownRenderer';
import CQCombinedRenderer from './admin/QuestionBank/components/CQCombinedRenderer';
import DynamicQuestionViewer from './admin/QuestionBank/components/DynamicQuestionViewer';

const PublicExamShare = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAnswers, setShowAnswers] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Check if user is logged in
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    })();
    const isLoggedIn = !!(currentUser && localStorage.getItem('token'));
    const isStudent = isLoggedIn && currentUser?.roles?.some(r => (typeof r === 'string' ? r : r.name || '')
        .toUpperCase().includes('STUDENT'));

    useEffect(() => {
        const fetchPublicExam = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/v1/public/exams/${id}`);
                if (res.data && res.data.success) {
                    const examData = res.data.data;
                    if (examData.status === 'DRAFT') {
                        setError('এই পরীক্ষাটি বর্তমানে খসড়া (Draft) হিসেবে আছে, তাই এর শেয়ার লিংক নিষ্ক্রিয়। শেয়ার করতে চাইলে দয়া করে পরীক্ষার স্ট্যাটাস পরিবর্তন করুন।');
                    } else {
                        setExam(examData);
                    }
                } else {
                    setError('পরীক্ষাটি খুঁজে পাওয়া যায়নি।');
                }
            } catch (err) {
                console.error('Error fetching public exam:', err);
                setError(err.response?.data?.message || 'পরীক্ষাটি লোড করতে সমস্যা হয়েছে। দয়া করে লিংকটি আবার চেক করুন।');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPublicExam();
        }
    }, [id]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadPdf = async () => {
        setDownloading(true);
        try {
            const params = new URLSearchParams({
                includeAnswers: showAnswers,
                includeAnswerSheet: false,
                includeWatermark: false,
                shuffleQuestions: false,
                shuffleOptions: false,
                paperSize: 'A4',
                template: 'default',
                fontSize: 11
            });
            const response = await axiosInstance.get(`/v1/exams/download/pdf/${id}?${params.toString()}`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `exam-${exam?.title || id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF download error:', err);
            alert('পিডিএফ ডাউনলোড করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।');
        } finally {
            setDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleLogoutAndRedirect = (targetPath) => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axiosInstance.defaults.headers.common['Authorization'];
        window.location.href = targetPath;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-outfit">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 font-bold text-lg">পরীক্ষার প্রশ্নপত্র লোড হচ্ছে...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-outfit text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-100 shadow-sm">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">সমস্যা হয়েছে!</h2>
                <p className="text-slate-500 max-w-md mb-6 font-medium">{error}</p>
                <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:bg-slate-700 transition-colors">
                    <ArrowLeft size={16} /> হোমপেজে ফিরে যান
                </Link>
            </div>
        );
    }

    const handleTakeOnlineExam = () => {
        navigate(`/student/exams/take/${id}`);
    };

    // Sort questions by order
    const sortedQuestions = exam ? (exam.questions ? [...exam.questions].sort((a, b) => a.order - b.order) : []) : [];

    const formatBanglaDigits = (num) => {
        if (num === null || num === undefined) return '';
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return num.toString().replace(/[0-9]/g, m => enToBn[m]);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-outfit text-slate-800 pb-20 print:bg-white print:pb-0">
            {/* Header / Toolbar (Hidden during print) */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all border border-slate-200" title="হোমে ফিরুন">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="font-extrabold text-slate-900 text-sm line-clamp-1">{exam?.title}</h1>
                            <p className="text-xs text-slate-400 font-medium">প্রশ্নপত্র শেয়ার করা লিংক</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Take Online Exam Button */}
                        <button
                            onClick={handleTakeOnlineExam}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                        >
                            <GraduationCap size={16} />
                            অনলাইনে পরীক্ষা দিন
                        </button>

                        {/* Toggle Answer Key */}
                        <button
                            onClick={() => setShowAnswers(!showAnswers)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl border transition-all ${
                                showAnswers 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {showAnswers ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showAnswers ? 'উত্তরপত্র বন্ধ করুন' : 'উত্তরপত্র দেখুন'}
                        </button>

                        {/* Copy Link */}
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            {copied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}
                        </button>

                        {/* Download PDF */}
                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition-all shadow-sm"
                        >
                            {downloading ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Download size={14} />
                            )}
                            পিডিএফ ডাউনলোড
                        </button>

                        {/* Print */}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            <Printer size={14} />
                            প্রিন্ট করুন
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Banner Alert for Online Exam */}
            <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white py-2.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-3 print:hidden border-b border-indigo-700/50">
                <span className="flex items-center gap-1.5 text-blue-200">
                    <Award size={15} className="text-amber-400" />
                    এই প্রশ্নপত্রটির উপর সরাসরি অনলাইনে টাইমড কুইজ পরীক্ষা দেওয়ার অপশন সক্রিয় রয়েছে!
                </span>
                <button
                    onClick={handleTakeOnlineExam}
                    className="px-3.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 rounded-lg text-xs font-black hover:from-amber-300 hover:to-amber-400 transition-all shadow-sm flex items-center gap-1 shrink-0"
                >
                    <GraduationCap size={14} />
                    পরীক্ষা দিন →
                </button>
            </div>

            {/* Notification Banner */}
            <div className="max-w-4xl mx-auto px-4 pt-6 print:hidden">
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Share2 size={18} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-emerald-950 text-sm">প্রশ্নপত্রটি শেয়ার করা হয়েছে</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                            এই লিংকটির মাধ্যমে যে কেউ প্রশ্নপত্রটি দেখতে ও পিডিএফ সংস্করণ প্রিন্ট করতে পারবেন। উপরের <strong>"উত্তরপত্র দেখুন"</strong> বাটনটিতে ক্লিক করে সঠিক উত্তরগুলো দৃশ্যমান করতে পারেন।
                        </p>
                    </div>
                </div>
            </div>

            {/* Exam Paper Container */}
            <div className="max-w-4xl mx-auto px-4 mt-6 print:mt-0 print:px-0">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 md:p-12 space-y-8 print:border-none print:shadow-none print:p-0 print:rounded-none">
                    
                    {/* Exam Header */}
                    <div className="text-center space-y-3 pb-6 border-b-2 border-slate-100 print:pb-4">
                        {exam.instituteName && (
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{exam.instituteName}</h2>
                        )}
                        <h1 className="text-lg md:text-xl font-bold text-slate-800">{exam.title}</h1>
                        
                        {/* Class & Subject Badge Row */}
                        <div className="flex flex-wrap justify-center items-center gap-3 text-sm font-semibold text-slate-500 print:text-xs">
                            {exam.className && (
                                <span className="flex items-center gap-1">
                                    শ্রেণি: {exam.className}
                                </span>
                            )}
                            {(exam.className && exam.subjectName) && <span>•</span>}
                            {exam.subjectName && (
                                <span className="flex items-center gap-1">
                                    বিষয়: {exam.subjectName}
                                </span>
                            )}
                        </div>

                        {/* Marks & Time Section */}
                        <div className="flex justify-center items-center gap-6 mt-4">
                            <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3.5 py-1.5 rounded-xl border border-purple-100 shadow-sm text-xs font-extrabold print:bg-white print:border-slate-200">
                                <Award size={14} />
                                মোট নম্বর: {exam.language === 'English' ? exam.totalMarks : formatBanglaDigits(exam.totalMarks)}
                            </div>
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-xl border border-blue-100 shadow-sm text-xs font-extrabold print:bg-white print:border-slate-200">
                                <Clock size={14} />
                                সময়: {exam.language === 'English' ? exam.durationMinutes : formatBanglaDigits(exam.durationMinutes)} মিনিট
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    {exam.instructions && (
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl print:bg-white print:border-slate-200">
                            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">নির্দেশাবলী (Instructions):</span>
                            <div className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">
                                <MarkdownRenderer content={exam.instructions} />
                            </div>
                        </div>
                    )}

                    {/* Questions List */}
                    <div className="space-y-8 pt-4">
                        {sortedQuestions.length === 0 ? (
                            <p className="text-center text-slate-400 font-medium py-10">প্রশ্নপত্রে কোনো প্রশ্ন যোগ করা হয়নি।</p>
                        ) : (
                            sortedQuestions.map((eq, index) => {
                                const q = eq;
                                const isMCQ = q.type === 'MCQ';
                                const isCQ = q.type === 'CQ';
                                const isEnglish = exam.language === 'English';
                                const questionNum = isEnglish ? (index + 1) : formatBanglaDigits(index + 1);
                                const qMarks = isEnglish ? eq.marks : formatBanglaDigits(eq.marks);

                                return (
                                    <div key={eq.id} className="group flex flex-col gap-4 pb-6 border-b border-slate-100 last:border-0 last:pb-0 break-inside-avoid">
                                        {/* Question Header & Points */}
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-start gap-2.5 flex-1">
                                                <span className="font-extrabold text-slate-800 text-base mt-0.5">{questionNum}.</span>
                                                <div className="flex-1 space-y-3">
                                                    {/* Stimulus for CQ */}
                                                    {q.stimulus && (
                                                        <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-xl font-medium leading-relaxed text-sm md:text-base mb-3 print:bg-white print:border-slate-200">
                                                            <MarkdownRenderer content={q.stimulus} />
                                                        </div>
                                                    )}

                                                    {/* Question Title */}
                                                    <div className="font-semibold text-slate-800 text-sm md:text-base leading-relaxed">
                                                        {isCQ ? (
                                                            <CQCombinedRenderer q={q} showAnswer={showAnswers} showExplanation={showAnswers} />
                                                        ) : q.dynamicData ? (
                                                            <DynamicQuestionViewer q={q} mode="preview" showAnswer={showAnswers} />
                                                        ) : (
                                                            <MarkdownRenderer content={q.questionText || ''} />
                                                        )}
                                                    </div>

                                                    {/* MCQ Statements if multiple completion */}
                                                    {q.mcqType === 'MULTIPLE_COMPLETION' && q.statements && q.statements.length > 0 && (
                                                        <div className="mt-2 pl-4 border-l-2 border-slate-200 space-y-1.5 text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                                                            {q.statements.map((stmt, sIdx) => (
                                                                <div key={sIdx}>
                                                                    <MarkdownRenderer content={stmt} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Marks Display */}
                                            {!isCQ && (
                                                <span className="text-xs font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md shrink-0 print:border-slate-200 print:bg-white">
                                                    {qMarks} নম্বর
                                                </span>
                                            )}
                                        </div>

                                        {/* MCQ Options */}
                                        {isMCQ && q.options && q.options.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 mt-1">
                                                {q.options.map((opt, oIdx) => {
                                                    const enLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
                                                    const bnLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
                                                    const displayLabel = isEnglish ? enLabels[oIdx] : bnLabels[oIdx];
                                                    
                                                    const isCorrectAns = opt.correct || opt.isCorrect;
                                                    const highlightClass = showAnswers && isCorrectAns
                                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                                        : 'bg-white border-slate-200 hover:border-slate-300';

                                                    return (
                                                        <div 
                                                            key={opt.id} 
                                                            className={`p-3 rounded-xl border flex items-center gap-3 transition-colors text-sm ${highlightClass}`}
                                                        >
                                                            <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                                                showAnswers && isCorrectAns
                                                                    ? 'bg-emerald-500 text-white'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {displayLabel}
                                                            </span>
                                                            <div className="flex-1 font-medium">
                                                                <MarkdownRenderer content={opt.optionText} />
                                                            </div>
                                                            {showAnswers && isCorrectAns && (
                                                                <Check size={16} className="text-emerald-600 shrink-0" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Structured Answer / Explanation (For Non-CQ / MCQ when answer toggle is ON) */}
                                        {showAnswers && !isCQ && (
                                            <div className="pl-6 space-y-2 mt-2">
                                                {/* Correct Answer */}
                                                {q.correctAnswer && !q.dynamicData && (
                                                    <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-xl text-xs md:text-sm text-emerald-950 leading-relaxed font-medium print:bg-white print:border-slate-200">
                                                        <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">সঠিক উত্তর:</span>
                                                        <MarkdownRenderer content={q.correctAnswer} />
                                                    </div>
                                                )}

                                                {/* Explanation */}
                                                {q.explanation && !q.dynamicData && (
                                                    <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-xl text-xs md:text-sm text-blue-950 leading-relaxed font-medium print:bg-white print:border-slate-200">
                                                        <span className="block text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">ব্যাখ্যা:</span>
                                                        <MarkdownRenderer content={q.explanation} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
							})
                        )}
                    </div>
                    
                    {/* Exam Footer */}
                    {exam.footerText && (
                        <div className="text-center pt-8 border-t border-slate-100 text-xs text-slate-400 font-semibold print:pt-4">
                            <MarkdownRenderer content={exam.footerText} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicExamShare;
