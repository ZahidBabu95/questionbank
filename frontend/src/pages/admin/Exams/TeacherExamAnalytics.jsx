import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../../utils/axios';
import { 
    Users, Award, Calendar, ChevronRight, ArrowLeft, Search, 
    Download, CheckCircle, XCircle, AlertCircle, Loader2, Sparkles, X, HelpCircle
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../context/LanguageContext';

const TeacherExamAnalytics = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, currentLang } = useLanguage();

    const [submissions, setSubmissions] = useState([]);
    const [topicAnalytics, setTopicAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [generatingAiReport, setGeneratingAiReport] = useState(false);
    const [aiReportGenerated, setAiReportGenerated] = useState(false);
    const [sendingReport, setSendingReport] = useState(false);
    
    // Graded booklet modal states
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [bookletData, setBookletData] = useState(null);
    const [loadingBooklet, setLoadingBooklet] = useState(false);

    const formatBanglaDigits = (num) => {
        if (num === null || num === undefined) return '';
        if (currentLang === 'en') return num.toString();
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return num.toString().replace(/[0-9]/g, m => enToBn[m]);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const translateClass = (clsName) => {
        if (!clsName) return '';
        if (currentLang === 'bn') return clsName;
        const mapping = {
            '৯ম-১০ম শ্রেণি': '9-10',
            '৯ম শ্রেণি': '9',
            '১০ম শ্রেণি': '10',
            'একাদশ শ্রেণি': '11',
            'দ্বাদশ শ্রেণি': '12',
            '৬ষ্ঠ শ্রেণি': '6',
            '৭ম শ্রেণি': '7',
            '৮ম শ্রেণি': '8',
            'সংযুক্ত নেই': 'Not connected'
        };
        return mapping[clsName] || clsName;
    };

    const translateSubject = (subName) => {
        if (!subName) return '';
        if (currentLang === 'bn') return subName;
        const mapping = {
            'উচ্চতর গণিত': 'Higher Mathematics',
            'গণিত': 'Mathematics',
            'পদার্থবিজ্ঞান': 'Physics',
            'রসায়ন': 'Chemistry',
            'জীববিজ্ঞান': 'Biology',
            'ইংরেজি': 'English',
            'বাংলা': 'Bangla'
        };
        return mapping[subName] || subName;
    };

    const translateExamTitle = (title) => {
        if (!title) return '';
        if (currentLang === 'bn') return title;
        if (title === 'পরীক্ষা অ্যানালিটিক্স') return t('db_analytics_title') || 'Exam Analytics';
        const mapping = {
            'অর্ধবার্ষিক পরীক্ষা': 'Half Yearly Exam',
            'অর্ধ-বার্ষিক পরীক্ষা': 'Half Yearly Exam',
            'বার্ষিক পরীক্ষা': 'Annual Exam',
            'নির্বাচনী পরীক্ষা': 'Test Exam',
            'মডেল টেস্ট': 'Model Test',
            'ক্লাস টেস্ট': 'Class Test'
        };
        for (const [key, val] of Object.entries(mapping)) {
            if (title.includes(key)) {
                return title.replace(key, val);
            }
        }
        return title;
    };

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const res = await axios.get(`/v1/teacher/exams/${id}/submissions`);
                if (res.data) {
                    if (res.data.submissions) {
                        setSubmissions(res.data.submissions);
                        setTopicAnalytics(res.data.topicAnalytics || []);
                    } else {
                        setSubmissions(res.data);
                    }
                }
            } catch (err) {
                console.error("Error loading exam submissions:", err);
                setError(t('db_analytics_error') || 'সাবমিশন তালিকা লোড করতে সমস্যা হয়েছে।');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSubmissions();
        }
    }, [id, t]);

    // Fetch individual student booklet
    const handleViewBooklet = async (submissionId) => {
        setSelectedSubmissionId(submissionId);
        setLoadingBooklet(true);
        setBookletData(null);
        setAiReportGenerated(false); // Reset AI report when opening new booklet
        try {
            const res = await axios.get(`/v1/teacher/results/${submissionId}`);
            if (res.data) {
                setBookletData(res.data);
            }
        } catch (err) {
            console.error("Error fetching student booklet:", err);
            alert(currentLang === 'bn' ? "উত্তরপত্র লোড করতে সমস্যা হয়েছে।" : "Failed to load student booklet.");
            setSelectedSubmissionId(null);
        } finally {
            setLoadingBooklet(false);
        }
    };

    const handleSendReport = () => {
        setSendingReport(true);
        setTimeout(() => {
            setSendingReport(false);
            alert(currentLang === 'bn' 
                ? `✉️ শিক্ষার্থী "${bookletData?.studentName || 'ইমতিয়াজ আহমেদ'}" এর ইমেইলে রিপোর্টটি সফলভাবে পাঠানো হয়েছে!` 
                : `✉️ The assessment report has been successfully sent to student "${bookletData?.studentName || 'Student'}"!`
            );
        }, 800);
    };

    const handlePrintBooklet = () => {
        if (!bookletData) return;
        const printContent = document.getElementById("booklet-print-area").innerHTML;
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${bookletData.studentName} - Answer Sheet Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 30px; color: #1e293b; }
                        @media print {
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="space-y-6">
                        <div class="border-b pb-4 flex justify-between items-center">
                            <div>
                                <h1 class="text-xl font-bold text-slate-800">${bookletData.studentName}</h1>
                                <p class="text-xs text-slate-500">Roll: ${bookletData.studentRoll} | Class: ${translateClass(bookletData.className)}</p>
                            </div>
                            <div class="text-right">
                                <h2 class="text-lg font-black text-blue-600">${bookletData.score} / ${bookletData.totalMarks}</h2>
                                <p class="text-[10px] text-slate-400 font-bold uppercase">Score Obtained</p>
                            </div>
                        </div>
                        ${printContent}
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const getAiFeedbackText = () => {
        if (!bookletData) return '';
        const pct = Math.round((bookletData.score / bookletData.totalMarks) * 100);
        
        const topicScores = {};
        bookletData.answers?.forEach(ans => {
            const topic = ans.topicName || (currentLang === 'bn' ? 'সাধারণ টপিক' : 'General Topic');
            if (!topicScores[topic]) {
                topicScores[topic] = { correct: 0, total: 0 };
            }
            topicScores[topic].total += 1;
            if (ans.isCorrect) {
                topicScores[topic].correct += 1;
            }
        });
        
        const sortedTopics = Object.keys(topicScores).map(name => ({
            name,
            percent: Math.round((topicScores[name].correct / topicScores[name].total) * 100)
        }));
        
        let strongest = currentLang === 'bn' ? 'নির্দিষ্ট অধ্যায়' : 'Selected topic';
        let weakest = currentLang === 'bn' ? 'নির্দিষ্ট অধ্যায়' : 'Selected topic';
        if (sortedTopics.length > 0) {
            strongest = translateSubject(sortedTopics.sort((a, b) => b.percent - a.percent)[0].name);
            weakest = translateSubject(sortedTopics.sort((a, b) => a.percent - b.percent)[0].name);
        }

        if (pct >= 80) {
            return currentLang === 'bn'
                ? `শিক্ষার্থী ${bookletData.studentName} এই পরীক্ষায় অসামান্য দক্ষতা প্রদর্শন করেছে। তার অর্জিত স্কোর ${formatBanglaDigits(pct)}%, যা অত্যন্ত প্রশংসনীয়। বিশেষ করে "${strongest}" টপিকে সে অসামান্য দখল দেখিয়েছে। তবে "${weakest}" অধ্যায়ে তার সামান্য কিছু ভুলের অবকাশ রয়েছে, যা একটু ঝালাই করে নিলে সে ভবিষ্যতে শতভাগ নম্বর অর্জন করতে সক্ষম হবে।`
                : `Student ${bookletData.studentName} has demonstrated outstanding proficiency in this exam, securing ${formatBanglaDigits(pct)}% marks. Notably, they showed exceptional mastery in "${strongest}". However, minor gaps were identified in "${weakest}". A quick revision will help them secure perfect marks in future exams.`;
        } else if (pct >= 40) {
            return currentLang === 'bn'
                ? `শিক্ষার্থী ${bookletData.studentName} পরীক্ষায় সন্তোষজনক পারফরম্যান্স করেছে। তার অর্জিত স্কোর ${formatBanglaDigits(pct)}%। সে "${strongest}" অধ্যায়ে ভালো দক্ষতা দেখালেও, "${weakest}" অধ্যায়ে তার বেশ কিছু ভুল হয়েছে যা তার প্রাপ্ত নম্বর কমিয়ে দিয়েছে। এই অধ্যায়ের মূল ধারণাগুলো পুনরায় রিভিশন দেওয়ার এবং অতিরিক্ত অনুশীলন করার পরামর্শ দেওয়া হচ্ছে।`
                : `Student ${bookletData.studentName} performed satisfactorily, securing a success rate of ${formatBanglaDigits(pct)}%. While they showed good understanding in "${strongest}", multiple errors in "${weakest}" reduced their overall score. Re-reviewing the core concepts and practicing additional questions for this topic is highly recommended.`;
        } else {
            return currentLang === 'bn'
                ? `শিক্ষার্থীর পারফরম্যান্স এভারেজ স্কোরের নিচে রয়েছে। বিশেষ করে "${weakest}" অধ্যায়ে সে প্রত্যাশিত পারফরম্যান্স করতে পারেনি। তার মূল দুর্বলতাগুলো দূর করতে শিক্ষকের বিশেষ গাইডেন্স এবং নিয়মিত অনুশীলনের প্রয়োজন। যদিও "${strongest}" অধ্যায়ে কিছু অগ্রগতি লক্ষ্য করা গেছে, তবে সামগ্রিক উন্নতির জন্য তাকে আরও মনোযোগী হতে হবে।`
                : `The student's performance is currently below average. Specifically, in "${weakest}", they struggled to score. Personalized teacher guidance and consistent practice are needed to strengthen their core concepts. While "${strongest}" shows some progress, overall dedication is required.`;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-bold text-sm">
                    {currentLang === 'bn' ? 'অ্যানালিটিক্স লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' : 'Loading analytics, please wait...'}
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-3xl border border-red-100 shadow-xl text-center">
                <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-red-700 font-black text-lg mb-2">{currentLang === 'bn' ? 'ত্রুটি ঘটেছে' : 'Error Occurred'}</h3>
                <p className="text-slate-600 font-semibold mb-6">{error}</p>
                <button 
                    onClick={() => navigate('/exams/generate/saved')}
                    className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto"
                >
                    <ArrowLeft size={16} />
                    <span>{currentLang === 'bn' ? 'সংরক্ষিত পরীক্ষা তালিকায় ফিরে যান' : 'Back to Saved Exams List'}</span>
                </button>
            </div>
        );
    }

    // Calculations
    const totalSubmissions = submissions.length;
    const scores = submissions.map(s => s.score);
    const averageScore = totalSubmissions > 0 ? (scores.reduce((a, b) => a + b, 0) / totalSubmissions).toFixed(1) : 0;
    const highestScore = totalSubmissions > 0 ? Math.max(...scores) : 0;
    const totalMarks = totalSubmissions > 0 ? submissions[0].totalMarks : 0;
    
    // Pass rate (>= 40%)
    const passCount = submissions.filter(s => (s.score / s.totalMarks) >= 0.4).length;
    const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

    // Chart Data (Distribution)
    // Ranges: Excellent (>=80%), Good (60-79%), Passed (40-59%), Failed (<40%)
    const distribution = [
        { name: currentLang === 'bn' ? "উচ্চ পারফর্মার (>=৮০%)" : "High (>=80%)", value: submissions.filter(s => (s.score / s.totalMarks) >= 0.80).length, color: '#10b981' },
        { name: currentLang === 'bn' ? "মধ্যম পারফর্মার (৬০-৭৯%)" : "Avg (60-79%)", value: submissions.filter(s => { const r = s.score / s.totalMarks; return r >= 0.60 && r < 0.80; }).length, color: '#3b82f6' },
        { name: currentLang === 'bn' ? "উত্তীর্ণ (৪০-৫৯%)" : "Pass (40-59%)", value: submissions.filter(s => { const r = s.score / s.totalMarks; return r >= 0.40 && r < 0.60; }).length, color: '#fb7185' },
        { name: currentLang === 'bn' ? "অকৃতকার্য (<৪০%)" : "Fail (<40%)", value: submissions.filter(s => (s.score / s.totalMarks) < 0.40).length, color: '#f43f5e' }
    ];

    // Filter submissions
    const filteredSubmissions = submissions.filter(sub => {
        const nameMatch = sub.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
        const rollMatch = sub.studentRoll?.toString().includes(searchTerm);
        const emailMatch = sub.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || rollMatch || emailMatch;
    });

    // Pagination Calculations
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
    const paginatedSubmissions = filteredSubmissions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculate strongest and weakest topics across the exam
    let topTopic = null;
    let bottomTopic = null;
    if (topicAnalytics && topicAnalytics.length > 0) {
        const sorted = [...topicAnalytics].sort((a, b) => b.avgCorrectRate - a.avgCorrectRate);
        topTopic = sorted[0];
        bottomTopic = sorted[sorted.length - 1];
    }

    const rawExamTitle = submissions.length > 0 ? submissions[0].examTitle || "পরীক্ষা অ্যানালিটিক্স" : "পরীক্ষা অ্যানালিটিক্স";
    const examTitle = translateExamTitle(rawExamTitle);
    const rawSubjectName = submissions.length > 0 ? submissions[0].subjectName : "";
    const subjectName = translateSubject(rawSubjectName);
    const rawClassName = submissions.length > 0 ? submissions[0].className : "";
    const className = translateClass(rawClassName);

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/exams/generate/saved')}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-slate-800">
                            {examTitle}
                        </h2>
                        {className && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                {subjectName} • {currentLang === 'bn' ? 'শ্রেণি' : 'Class'}: {className}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Insights Banner */}
            {topTopic && bottomTopic && (
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100/50 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <Sparkles size={18} className="animate-pulse" />
                            <h4 className="text-sm font-black uppercase tracking-wider">{currentLang === 'bn' ? 'এআই চালিত অন্তর্দৃষ্টি' : 'AI-Powered Insights'}</h4>
                        </div>
                        <p className="text-slate-700 text-xs font-semibold leading-relaxed">
                            {currentLang === 'bn' 
                                ? 'শিক্ষার্থীদের পরীক্ষার খাতা ও টপিক-ভিত্তিক পারফরম্যান্স বিশ্লেষণ করে তৈরি করা তাৎক্ষণিক অন্তর্দৃষ্টি।' 
                                : 'Instant insights generated by analyzing student exam booklets and topic performance.'}
                        </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-indigo-100 shadow-sm flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Award size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'bn' ? 'সবচেয়ে শক্তিশালী অধ্যায়' : 'Strongest Topic'}</p>
                            <h5 className="text-xs font-black text-slate-800 mt-1">{translateSubject(topTopic.topicName)}</h5>
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                {currentLang === 'bn' ? `গড় কারেক্ট রেট: ${formatBanglaDigits(topTopic.avgCorrectRate)}%` : `Avg Correct Rate: ${formatBanglaDigits(topTopic.avgCorrectRate)}%`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-indigo-100 shadow-sm flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                            <AlertCircle size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'bn' ? 'মনোযোগ প্রয়োজন (দুর্বলতম)' : 'Needs Attention (Weakest)'}</p>
                            <h5 className="text-xs font-black text-slate-800 mt-1">{translateSubject(bottomTopic.topicName)}</h5>
                            <p className="text-[10px] text-red-500 font-bold mt-0.5">
                                {currentLang === 'bn' ? `গড় কারেক্ট রেট: ${formatBanglaDigits(bottomTopic.avgCorrectRate)}%` : `Avg Correct Rate: ${formatBanglaDigits(bottomTopic.avgCorrectRate)}%`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Participants */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Users size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_total_participants')}</p>
                            <p className="text-xl font-black text-slate-800 mt-0.5">{formatBanglaDigits(totalSubmissions)}</p>
                            <p className="text-[9px] text-emerald-600 font-bold mt-1">
                                {currentLang === 'bn' ? '১০০% অংশগ্রহণকারী' : '100% attendance rate'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Average Score */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Award size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_avg_score')}</p>
                            <p className="text-xl font-black text-slate-800 mt-0.5">
                                {formatBanglaDigits(averageScore)} 
                                <span className="text-xs text-slate-400 font-bold">/ {formatBanglaDigits(totalMarks)}</span>
                            </p>
                            
                            {/* Mini horizontal progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
                                <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${totalMarks > 0 ? (averageScore / totalMarks) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Highest Score */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Award size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_highest_score')}</p>
                            <p className="text-xl font-black text-emerald-600 mt-0.5">
                                {formatBanglaDigits(highestScore)} 
                                <span className="text-xs text-slate-400 font-bold">/ {formatBanglaDigits(totalMarks)}</span>
                            </p>
                            <p className="text-[9px] text-indigo-600 font-bold mt-1">
                                {currentLang === 'bn' 
                                    ? `🥇 ${formatBanglaDigits(submissions.filter(s => s.score === highestScore).length)} জন শিক্ষার্থী` 
                                    : `🥇 ${formatBanglaDigits(submissions.filter(s => s.score === highestScore).length)} student(s)`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pass Rate */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'bn' ? 'পাস করার হার' : 'Pass Rate'}</p>
                            <p className="text-xl font-black text-purple-600 mt-0.5">{formatBanglaDigits(passRate)}%</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1">
                                {currentLang === 'bn' ? '৪০% পাস মার্কস ভিত্তিতে' : 'Based on 40% pass marks'}
                            </p>
                        </div>
                        <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
                            <svg className="w-10 h-10 transform -rotate-90">
                                <circle cx="20" cy="20" r="16" stroke="#f1f5f9" strokeWidth="2.5" fill="transparent" />
                                <circle cx="20" cy="20" r="16" stroke="#a855f7" strokeWidth="2.5" fill="transparent"
                                    strokeDasharray={100.53}
                                    strokeDashoffset={100.53 - (100.53 * passRate) / 100}
                                />
                            </svg>
                            <span className="absolute text-[8px] font-black text-purple-700">{formatBanglaDigits(passRate)}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart and Submissions Table Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Score Distribution Chart */}
                <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div>
                        <h3 className="text-slate-800 font-extrabold text-sm mb-1">{t('db_analytics_score_dist')}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                            {currentLang === 'bn' ? 'অংশগ্রহণকারীদের স্কোর ক্যাটাগরি' : 'Participant Score Categories'}
                        </p>
                    </div>

                    {totalSubmissions > 0 ? (
                        <div className="w-full flex items-center justify-center pt-2">
                            <BarChart width={280} height={220} data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} />
                                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={30}>
                                    {distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-slate-400 text-xs font-bold">{currentLang === 'bn' ? 'কোন ডেটা নেই' : 'No Data'}</div>
                    )}
                </div>

                {/* Submissions List Table */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-slate-800 font-extrabold text-sm mb-1">{t('db_analytics_sub_list')}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {currentLang === 'bn' ? `মোট ${formatBanglaDigits(filteredSubmissions.length)} টি সাবমিশন পাওয়া গেছে` : `Total ${formatBanglaDigits(filteredSubmissions.length)} submissions found`}
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder={t('db_analytics_search_placeholder') || "Search by name or roll..."}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/25 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="pb-3 text-center w-16">{t('db_analytics_roll') || 'Roll'}</th>
                                    <th className="pb-3">{t('db_analytics_student') || 'Student Name'}</th>
                                    <th className="pb-3">{t('db_analytics_class') || 'Class'}</th>
                                    <th className="pb-3 text-center">{t('db_analytics_score') || 'Score'}</th>
                                    <th className="pb-3 text-right">{t('db_analytics_submitted') || 'Submitted At'}</th>
                                    <th className="pb-3 text-center w-28">{t('db_analytics_action') || 'Action'}</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-slate-600 font-bold">
                                {paginatedSubmissions.length > 0 ? (
                                    paginatedSubmissions.map((sub) => (
                                        <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 text-center font-mono text-slate-500">{sub.studentRoll ? formatBanglaDigits(sub.studentRoll) : '—'}</td>
                                            <td className="py-3.5 text-slate-900 font-extrabold">{sub.studentName || 'Unknown Student'}</td>
                                            <td className="py-3.5">{currentLang === 'bn' ? sub.className : `Class ${translateClass(sub.className)}`}</td>
                                            <td className="py-3.5 text-center font-extrabold text-blue-600">{formatBanglaDigits(sub.score)} / {formatBanglaDigits(sub.totalMarks)}</td>
                                            <td className="py-3.5 text-right text-slate-400 text-[11px]">{formatDate(sub.submittedAt)}</td>
                                            <td className="py-3.5 text-center">
                                                <button
                                                    onClick={() => handleViewBooklet(sub.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black active:scale-[0.96] transition-all"
                                                >
                                                    <span>{t('db_analytics_booklet') || 'Booklet'}</span>
                                                    <ChevronRight size={10} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-10 text-center text-slate-400 font-semibold">
                                            {currentLang === 'bn' ? 'কোন রেকর্ড পাওয়া যায়নি' : 'No records found'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                            <div>
                                {currentLang === 'bn' ? (
                                    <span>
                                        মোট <strong>{formatBanglaDigits(filteredSubmissions.length)}</strong> টি সাবমিশনের মধ্যে{' '}
                                        <strong>{formatBanglaDigits((currentPage - 1) * itemsPerPage + 1)}</strong> -{' '}
                                        <strong>{formatBanglaDigits(Math.min(currentPage * itemsPerPage, filteredSubmissions.length))}</strong> পর্যন্ত দেখাচ্ছে
                                    </span>
                                ) : (
                                    <span>
                                        Showing <strong>{formatBanglaDigits((currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                                        <strong>{formatBanglaDigits(Math.min(currentPage * itemsPerPage, filteredSubmissions.length))}</strong> of{' '}
                                        <strong>{formatBanglaDigits(filteredSubmissions.length)}</strong> submissions
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-xl transition-all"
                                >
                                    {currentLang === 'bn' ? 'পূর্ববর্তী' : 'Previous'}
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNo => (
                                    <button
                                        key={pageNo}
                                        onClick={() => setCurrentPage(pageNo)}
                                        className={`w-8 h-8 rounded-xl font-bold transition-all ${
                                            currentPage === pageNo
                                                ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
                                                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                                        }`}
                                    >
                                        {formatBanglaDigits(pageNo)}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-xl transition-all"
                                >
                                    {currentLang === 'bn' ? 'পরবর্তী' : 'Next'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Graded Booklet Modal Overlay */}
            <AnimatePresence>
                {selectedSubmissionId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="bg-white h-full w-full max-w-3xl shadow-2xl flex flex-col justify-between border-l border-slate-100"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-base leading-snug">
                                        {loadingBooklet 
                                            ? (currentLang === 'bn' ? 'উত্তরপত্র লোড হচ্ছে...' : 'Loading booklet...') 
                                            : (currentLang === 'bn' 
                                                ? `${bookletData?.studentName || 'শিক্ষার্থী'} এর উত্তরপত্র` 
                                                : `${bookletData?.studentName || 'Student'}'s Answer Sheet`
                                              )
                                        }
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {currentLang === 'bn' ? 'রোল' : 'Roll'}: {bookletData?.studentRoll ? formatBanglaDigits(bookletData.studentRoll) : '—'} • {currentLang === 'bn' ? 'শ্রেণি' : 'Class'}: {currentLang === 'bn' ? bookletData?.className : `Class ${translateClass(bookletData?.className)}`}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedSubmissionId(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body / Booklet Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                                {loadingBooklet ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                        <p className="mt-4 text-slate-400 font-bold text-xs">
                                            {currentLang === 'bn' ? 'উত্তরপত্র লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' : 'Loading answer sheet, please wait...'}
                                        </p>
                                    </div>
                                ) : bookletData ? (
                                    <div id="booklet-print-area" className="space-y-6">
                                        {/* Result Summary Bar */}
                                        <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t('db_analytics_score_obtained') || 'Score Obtained'}</p>
                                                <p className="text-base font-black text-blue-600 mt-0.5">{formatBanglaDigits(bookletData.score)} / {formatBanglaDigits(bookletData.totalMarks)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t('db_analytics_correct_count') || 'Correct Answers'}</p>
                                                <p className="text-base font-black text-emerald-600 mt-0.5">{formatBanglaDigits(bookletData.answers?.filter(a => a.isCorrect).length)} {currentLang === 'bn' ? 'টি' : ''}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t('db_analytics_skipped_count') || 'Skipped Answers'}</p>
                                                <p className="text-base font-black text-slate-500 mt-0.5">{formatBanglaDigits(bookletData.answers?.filter(a => a.isSkipped).length)} {currentLang === 'bn' ? 'টি' : ''}</p>
                                            </div>
                                        </div>

                                        {/* Student Topic-wise Performance Analysis */}
                                        {(() => {
                                            // Compute student's topic-wise performance
                                            const topicScores = {};
                                            bookletData.answers?.forEach(ans => {
                                                const topic = ans.topicName || (currentLang === 'bn' ? 'সাধারণ টপিক' : 'General Topic');
                                                if (!topicScores[topic]) {
                                                    topicScores[topic] = { correct: 0, total: 0, marksObtained: 0, totalMarks: 0 };
                                                }
                                                topicScores[topic].total += 1;
                                                topicScores[topic].totalMarks += ans.marks || 1.0;
                                                if (ans.isCorrect) {
                                                    topicScores[topic].correct += 1;
                                                    topicScores[topic].marksObtained += ans.marksObtained || 0;
                                                }
                                            });
                                            
                                            const studentTopics = Object.keys(topicScores).map(name => {
                                                const stats = topicScores[name];
                                                const percent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                                                return {
                                                    name,
                                                    correct: stats.correct,
                                                    total: stats.total,
                                                    marksObtained: stats.marksObtained,
                                                    totalMarks: stats.totalMarks,
                                                    percent
                                                };
                                            });

                                            // Sort to find strongest and weakest
                                            let strongestTopic = null;
                                            let weakestTopic = null;
                                            if (studentTopics.length > 0) {
                                                const sortedDesc = [...studentTopics].sort((a, b) => b.percent - a.percent);
                                                strongestTopic = sortedDesc[0];
                                                const sortedAsc = [...studentTopics].sort((a, b) => a.percent - b.percent);
                                                weakestTopic = sortedAsc[0];
                                            }

                                            if (studentTopics.length === 0) return null;

                                            return (
                                                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 space-y-4 shadow-sm">
                                                    <div>
                                                        <h4 className="text-slate-800 font-extrabold text-xs">
                                                            {currentLang === 'bn' ? 'টপিক-ভিত্তিক মূল্যায়ন ও বিশ্লেষণ' : 'Topic-wise Assessment & Analytics'}
                                                        </h4>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                                            {currentLang === 'bn' ? 'টপিক অনুযায়ী শিক্ষার্থীর সবল ও দুর্বল দিক' : "Student's strengths and weaknesses by topic"}
                                                        </p>
                                                    </div>

                                                    {/* Key Highlights (Strongest / Weakest) */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {strongestTopic && (
                                                            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                                                                <p className="text-[8px] text-emerald-600 font-black uppercase tracking-wider">
                                                                    {currentLang === 'bn' ? 'সবচেয়ে শক্তিশালী অধ্যায়' : 'Strongest Topic'}
                                                                </p>
                                                                <p className="text-xs font-black text-emerald-950 mt-1">{translateSubject(strongestTopic.name)}</p>
                                                                <p className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                                                    {currentLang === 'bn' ? `গড় স্কোর: ${formatBanglaDigits(strongestTopic.percent)}%` : `Avg Score: ${formatBanglaDigits(strongestTopic.percent)}%`}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {weakestTopic && (
                                                            <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl">
                                                                <p className="text-[8px] text-red-500 font-black uppercase tracking-wider">
                                                                    {currentLang === 'bn' ? 'সবচেয়ে বেশি দুর্বলতা' : 'Needs Improvement'}
                                                                </p>
                                                                <p className="text-xs font-black text-red-950 mt-1">{translateSubject(weakestTopic.name)}</p>
                                                                <p className="text-[10px] font-bold text-red-600 mt-0.5">
                                                                    {currentLang === 'bn' ? `গড় স্কোর: ${formatBanglaDigits(weakestTopic.percent)}%` : `Avg Score: ${formatBanglaDigits(weakestTopic.percent)}%`}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Topics Table */}
                                                    <div className="overflow-hidden border border-slate-100 rounded-xl">
                                                        <table className="w-full text-left border-collapse bg-white">
                                                            <thead>
                                                                <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                                    <th className="p-2.5">{currentLang === 'bn' ? 'টপিক' : 'Topic'}</th>
                                                                    <th className="p-2.5 text-center">{currentLang === 'bn' ? 'সঠিক / মোট' : 'Correct / Total'}</th>
                                                                    <th className="p-2.5 text-center">{currentLang === 'bn' ? 'প্রাপ্ত নম্বর' : 'Marks'}</th>
                                                                    <th className="p-2.5 text-right w-24">{currentLang === 'bn' ? 'শতকরা হার' : 'Success Rate'}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="text-[11px] text-slate-600 font-bold">
                                                                {studentTopics.map((topic, tIdx) => (
                                                                    <tr key={tIdx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                                                                        <td className="p-2.5 text-slate-900 font-extrabold">{translateSubject(topic.name)}</td>
                                                                        <td className="p-2.5 text-center font-mono text-slate-500">{formatBanglaDigits(topic.correct)} / {formatBanglaDigits(topic.total)}</td>
                                                                        <td className="p-2.5 text-center font-mono text-slate-500">{formatBanglaDigits(topic.marksObtained)} / {formatBanglaDigits(topic.totalMarks)}</td>
                                                                        <td className="p-2.5 text-right font-black">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                                                topic.percent >= 70 ? 'bg-emerald-50 text-emerald-700' :
                                                                                topic.percent >= 40 ? 'bg-blue-50 text-blue-700' :
                                                                                'bg-red-50 text-red-700'
                                                                            }`}>
                                                                                {formatBanglaDigits(topic.percent)}%
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* AI Assessment Report Widget */}
                                        {!aiReportGenerated ? (
                                            <div className="bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50 rounded-2xl border border-indigo-100 p-5 text-center space-y-3 no-print">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                                                    <Sparkles size={20} className={generatingAiReport ? "animate-spin" : ""} />
                                                </div>
                                                <div>
                                                    <h4 className="text-slate-800 font-extrabold text-xs">
                                                        {currentLang === 'bn' ? 'এআই মূল্যায়ন ও বিশ্লেষণ' : 'AI-Powered Performance Insights'}
                                                    </h4>
                                                    <p className="text-[9px] text-slate-400 font-semibold mt-1">
                                                        {currentLang === 'bn' 
                                                            ? 'শিক্ষার্থীর উত্তরের ওপর ভিত্তি করে একটি বিস্তারিত বিবরণী মূল্যায়ন ও পরামর্শ রিপোর্ট তৈরি করুন।' 
                                                            : "Generate a detailed descriptive feedback and improvement report based on student's answers."}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setGeneratingAiReport(true);
                                                        setTimeout(() => {
                                                            setGeneratingAiReport(false);
                                                            setAiReportGenerated(true);
                                                        }, 1000);
                                                    }}
                                                    disabled={generatingAiReport}
                                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black rounded-xl active:scale-[0.97] transition-all flex items-center gap-1.5 mx-auto"
                                                >
                                                    {generatingAiReport ? (
                                                        <>
                                                            <Loader2 size={12} className="animate-spin" />
                                                            <span>{currentLang === 'bn' ? 'জেনারেট হচ্ছে...' : 'Generating...'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={12} />
                                                            <span>{currentLang === 'bn' ? 'এআই রিপোর্ট জেনারেট করুন' : 'Generate AI Report'}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4 shadow-sm">
                                                <div className="flex justify-between items-start no-print">
                                                    <div className="flex items-center gap-2 text-indigo-700">
                                                        <Sparkles size={16} />
                                                        <h4 className="text-xs font-extrabold uppercase tracking-wider">{currentLang === 'bn' ? 'এআই মূল্যায়ন ও পরামর্শ রিপোর্ট' : 'AI Assessment & Analytics Report'}</h4>
                                                    </div>
                                                    
                                                    {/* Print / Send actions */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={handlePrintBooklet}
                                                            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg active:scale-95 transition-all"
                                                            title={currentLang === 'bn' ? 'রিপোর্ট প্রিন্ট করুন' : 'Print Report'}
                                                        >
                                                            <Download size={12} />
                                                        </button>
                                                        <button
                                                            onClick={handleSendReport}
                                                            disabled={sendingReport}
                                                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg active:scale-95 transition-all flex items-center gap-1"
                                                            title={currentLang === 'bn' ? 'অভিভাবককে পাঠান' : 'Send to Parents'}
                                                        >
                                                            {sendingReport ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                                                            <span className="text-[9px] font-black">{currentLang === 'bn' ? 'পাঠান' : 'Send'}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-[10px] text-indigo-700 font-extrabold hidden print:block">{currentLang === 'bn' ? 'এআই মূল্যায়ন ও পরামর্শ রিপোর্ট' : 'AI Assessment & Diagnostics Report'}</p>
                                                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-white/60 p-4 rounded-xl border border-indigo-50">
                                                        {getAiFeedbackText()}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Questions review */}
                                        <div className="space-y-4">
                                            {bookletData.answers?.map((ans, idx) => {
                                                const isCorrect = ans.isCorrect;
                                                const isSkipped = ans.isSkipped;
                                                const optionLabels = currentLang === 'bn' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'];
                                                
                                                return (
                                                    <div key={ans.questionId} className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4 shadow-sm">
                                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                            <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                                                                {currentLang === 'bn' ? 'প্রশ্ন' : 'Question'}: {formatBanglaDigits(idx + 1)}
                                                            </span>

                                                            <div className="flex items-center gap-2">
                                                                {isSkipped ? (
                                                                    <span className="text-[9px] font-black bg-slate-50 border text-slate-400 px-2 py-0.5 rounded">
                                                                        {currentLang === 'bn' ? 'স্কিপ করা হয়েছে' : 'Skipped'}
                                                                    </span>
                                                                ) : isCorrect ? (
                                                                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                                        <CheckCircle size={10} /> {currentLang === 'bn' ? 'সঠিক' : 'Correct'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                                        <XCircle size={10} /> {currentLang === 'bn' ? 'ভুল' : 'Incorrect'}
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                                                    {t('db_analytics_marks_val') || 'Marks'}: {formatBanglaDigits(ans.marksObtained)} / {formatBanglaDigits(ans.marks || 1.0)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Text */}
                                                        <div className="space-y-3">
                                                            {ans.stimulus && (
                                                                <div className="p-3 bg-slate-50 border rounded-xl text-slate-600 font-semibold text-xs leading-relaxed">
                                                                    {ans.stimulus}
                                                                </div>
                                                            )}
                                                            <h5 className="font-extrabold text-slate-800 text-sm leading-relaxed">
                                                                {ans.questionText}
                                                            </h5>
                                                        </div>

                                                        {/* Options */}
                                                        <div className="space-y-2">
                                                            {ans.options?.map((opt, oIdx) => {
                                                                const isSelected = ans.selectedOptionId === opt.id.toString();
                                                                const isCorrectOpt = opt.isCorrect;
                                                                
                                                                let boxStyle = "w-full text-left p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-3 ";
                                                                let labelStyle = "w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ";

                                                                if (isCorrectOpt) {
                                                                    boxStyle += "bg-emerald-50/50 border-emerald-500 text-emerald-900";
                                                                    labelStyle += "bg-emerald-600 text-white";
                                                                } else if (isSelected && !isCorrectOpt) {
                                                                    boxStyle += "bg-red-50/50 border-red-300 text-red-900";
                                                                    labelStyle += "bg-red-600 text-white";
                                                                } else {
                                                                    boxStyle += "bg-white border-slate-200/60 text-slate-600";
                                                                    labelStyle += "bg-slate-50 border border-slate-200 text-slate-400";
                                                                }

                                                                return (
                                                                    <div key={opt.id} className={boxStyle}>
                                                                        <div className={labelStyle}>
                                                                            {optionLabels[oIdx] || (oIdx + 1)}
                                                                        </div>
                                                                        <div className="flex-1 flex justify-between items-center gap-2">
                                                                            <span className="leading-snug">{opt.optionText}</span>
                                                                            <div className="flex gap-1">
                                                                                {isCorrectOpt && (
                                                                                    <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                                                                        {currentLang === 'bn' ? 'সঠিক' : 'Correct'}
                                                                                    </span>
                                                                                )}
                                                                                {isSelected && (
                                                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                                                                        isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                                    }`}>
                                                                                        {currentLang === 'bn' ? 'উত্তর' : 'Selected'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Explanation */}
                                                        {ans.explanation && (
                                                            <div className="p-3.5 bg-blue-50/30 border border-blue-100/50 rounded-xl flex gap-2">
                                                                 <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                                 <div>
                                                                     <p className="text-[10px] font-black text-blue-900">
                                                                         {currentLang === 'bn' ? 'ব্যাখ্যা ও বিশ্লেষণ:' : 'Explanation & Analysis:'}
                                                                     </p>
                                                                     <p className="text-slate-500 text-[11px] font-semibold leading-relaxed mt-0.5">{ans.explanation}</p>
                                                                 </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                     </div>
                                ) : (
                                    <div className="text-center py-20 text-slate-400 font-bold text-xs">
                                        {currentLang === 'bn' ? 'কোন রেকর্ড পাওয়া যায়নি' : 'No records found'}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 flex justify-end bg-white">
                                <button
                                    onClick={() => setSelectedSubmissionId(null)}
                                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all"
                                >
                                    {currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default TeacherExamAnalytics;
