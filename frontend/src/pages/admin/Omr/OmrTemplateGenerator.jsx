import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    QrCode, FileDown, Settings, Printer, Eye, HelpCircle, 
    ArrowLeft, ChevronRight, Layers, Sparkles, Check, CheckCircle2,
    Download, Type, Sliders, FileText, CheckSquare, Info, Calendar,
    Clock, Edit3, Trash2, Palette, RefreshCw, ZoomIn
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useLanguage } from '../../../context/LanguageContext';

// Harmony Themes for preview
const themeColors = {
    black: { name: 'Pure Black (OCR Recommended)', primary: 'border-black text-black', bg: 'bg-black', text: 'text-black', hex: '#000000' },
    blue: { name: 'Royal Blue (Premium Print)', primary: 'border-blue-600 text-blue-600', bg: 'bg-blue-600', text: 'text-blue-600', hex: '#2563eb' },
    green: { name: 'Forest Green (Eco Theme)', primary: 'border-emerald-700 text-emerald-700', bg: 'bg-emerald-700', text: 'text-emerald-700', hex: '#047857' },
    red: { name: 'Crimson Red (Exam Special)', primary: 'border-red-600 text-red-600', bg: 'bg-red-600', text: 'text-red-600', hex: '#dc2626' }
};

// Custom Bubble Sizes for Modern layout
const bubbleSizeClasses = {
    small: {
        bubble: 'w-[18px] h-[18px] text-[8px]',
        container: 'gap-[3px]',
        label: 'w-[20px] text-right font-bold text-[10px] text-slate-700'
    },
    medium: {
        bubble: 'w-[22px] h-[22px] text-[10px]',
        container: 'gap-1.5',
        label: 'w-6 text-right font-bold text-xs text-slate-700'
    },
    large: {
        bubble: 'w-[26px] h-[26px] text-[11px]',
        container: 'gap-2',
        label: 'w-7 text-right font-bold text-sm text-slate-700'
    }
};

const OmrTemplateGenerator = () => {
    const { t, currentLang } = useLanguage();

    // Config states
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [sheetType, setSheetType] = useState('GENERIC'); // PERSONALIZED vs GENERIC
    const [questionCount, setQuestionCount] = useState(30);
    const [optionsCount, setOptionsCount] = useState(4); // 4 or 5
    const [optionLanguage, setOptionLanguage] = useState('bn'); // bn vs en
    
    // Layout Style Selector
    const [layoutStyle, setLayoutStyle] = useState('board'); // 'board' (Traditional Board Style) vs 'modern'
    const [boardThemeColor, setBoardThemeColor] = useState('red'); // 'red' (Dropout Orange-Red) vs 'black'
    
    // CQ Marks Setup
    const [includeCqMarks, setIncludeCqMarks] = useState(false);
    const [cqCount, setCqCount] = useState(5);
    const [cqMaxVal, setCqMaxVal] = useState(10); // 10 marks (0-10) or 5 marks (0-5)

    // Dynamic Designer Styling States
    const [activeTab, setActiveTab] = useState('design'); // exam, bubble, student, design
    const [themeColor, setThemeColor] = useState('black');
    const [bubbleSize, setBubbleSize] = useState('medium');
    const [rowDensity, setRowDensity] = useState('cozy');
    const [columnsCount, setColumnsCount] = useState(2); // 2, 3, or 4 columns
    const [rollDigits, setRollDigits] = useState(5); // 5 or 6 digit Roll grid
    
    // Board style config states
    const [rollDigitsBoard, setRollDigitsBoard] = useState(6);
    const [includeRegGrid, setIncludeRegGrid] = useState(true);
    const [regDigitsBoard, setRegDigitsBoard] = useState(10);
    const [includeSubjectGrid, setIncludeSubjectGrid] = useState(true);
    const [subjectDigitsBoard, setSubjectDigitsBoard] = useState(3);
    const [includeInvigilatorBox, setIncludeInvigilatorBox] = useState(true);

    // Header Info & In-place edit states
    const [examDetails, setExamDetails] = useState({
        title: "বহুনির্বাচনি/নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র",
        className: "১০ম শ্রেণী",
        subjectName: "পদার্থবিজ্ঞান",
        instituteName: "ক্যান্টনমেন্ট পাবলিক স্কুল এন্ড কলেজ মোমেনশাহী",
        totalMarks: 30,
        examDuration: "৩০ মিনিট",
        examCode: "১২২",
        examDate: "২০২৬-০৬-২৪"
    });

    const [isEditingInst, setIsEditingInst] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingSub, setIsEditingSub] = useState(false);
    const [isEditingClass, setIsEditingClass] = useState(false);
    const [isEditingMarks, setIsEditingMarks] = useState(false);
    const [isEditingDur, setIsEditingDur] = useState(false);
    const [isEditingCode, setIsEditingCode] = useState(false);
    const [isEditingDate, setIsEditingDate] = useState(false);

    // Toggle fields in Student Info Area (For Modern)
    const [studentNameEnabled, setStudentNameEnabled] = useState(true);
    const [rollNumberEnabled, setRollNumberEnabled] = useState(true);
    const [classSectionEnabled, setStudentClassEnabled] = useState(true);
    const [studentIdEnabled, setStudentIdEnabled] = useState(true);
    const [examDateEnabled, setExamDateEnabled] = useState(true);
    const [studentSigEnabled, setStudentSigEnabled] = useState(true);
    const [invigilatorSigEnabled, setInvigilatorSigEnabled] = useState(true);
    
    // Set Code Settings
    const [includeSetCode, setIncludeSetCode] = useState(true);
    const [selectedSetCode, setSelectedSetCode] = useState('A');

    // Watermark States
    const [watermarkText, setWatermarkText] = useState('');
    const [watermarkOpacity, setWatermarkOpacity] = useState(10); // 0 to 100
    const [watermarkRotation, setWatermarkRotation] = useState(-30);
    const [watermarkSize, setWatermarkSize] = useState(60);

    // Overflow check state
    const [isOverflowing, setIsOverflowing] = useState(false);

    // Mock student for Personalized OMR preview
    const [studentInfo, setStudentInfo] = useState({
        name: "তাহমিদ হাসান রনি",
        roll: "১০০২৫",
        section: "ক শাখা",
        studentId: "STU-982105"
    });

    // Loading & Progress States for PDF download
    const [loading, setLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);
    const [pdfStatus, setPdfStatus] = useState('');

    useEffect(() => {
        // Only override if the value matches the default Bengali value or the default English value
        setExamDetails(prev => {
            const defaultsBn = {
                title: "বহুনির্বাচনি/নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র",
                className: "১০ম শ্রেণী",
                subjectName: "পদার্থবিজ্ঞান",
                instituteName: "ক্যান্টনমেন্ট পাবলিক স্কুল এন্ড কলেজ মোমেনশাহী",
                examDuration: "৩০ মিনিট"
            };
            const defaultsEn = {
                title: "MCQ/Objective Exam Answer Sheet",
                className: "Class 10",
                subjectName: "Physics",
                instituteName: "Cantonment Public School and College Mymensingh",
                examDuration: "30 Minutes"
            };

            const updated = { ...prev };
            
            if (prev.title === defaultsBn.title || prev.title === defaultsEn.title) {
                updated.title = t('omr_gen_default_title');
            }
            if (prev.className === defaultsBn.className || prev.className === defaultsEn.className) {
                updated.className = t('omr_gen_default_class');
            }
            if (prev.subjectName === defaultsBn.subjectName || prev.subjectName === defaultsEn.subjectName) {
                updated.subjectName = t('omr_gen_default_subject');
            }
            if (prev.instituteName === defaultsBn.instituteName || prev.instituteName === defaultsEn.instituteName) {
                updated.instituteName = t('omr_gen_default_institute');
            }
            if (prev.examDuration === defaultsBn.examDuration || prev.examDuration === defaultsEn.examDuration) {
                updated.examDuration = t('omr_gen_default_duration');
            }
            
            return updated;
        });

        setStudentInfo(prev => {
            const defaultsBn = {
                name: "তাহমিদ হাসান রনি",
                section: "ক শাখা"
            };
            const defaultsEn = {
                name: "Tahmid Hasan Roni",
                section: "Section A"
            };
            
            const updated = { ...prev };
            if (prev.name === defaultsBn.name || prev.name === defaultsEn.name) {
                updated.name = t('omr_gen_default_student_name');
            }
            if (prev.section === defaultsBn.section || prev.section === defaultsEn.section) {
                updated.section = t('omr_gen_default_section');
            }
            return updated;
        });
    }, [currentLang]);

    useEffect(() => {
        const fetchActiveExams = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get('/v1/exams/generate');
                if (res.data && res.data.success) {
                    setExams(res.data.data.content || []);
                    if (res.data.data.content && res.data.data.content.length > 0) {
                        const firstExam = res.data.data.content[0];
                        setSelectedExamId(firstExam.id);
                        setExamDetails({
                            title: "বহুনির্বাচনি/নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র",
                            className: firstExam.className || "১০ম শ্রেণী",
                            subjectName: firstExam.subjectName || "পদার্থবিজ্ঞান",
                            instituteName: firstExam.instituteName || "ক্যান্টনমেন্ট পাবলিক স্কুল এন্ড কলেজ মোমেনশাহী",
                            totalMarks: firstExam.totalMarks || 30,
                            examDuration: firstExam.durationMinutes ? `${firstExam.durationMinutes} মিনিট` : "৩০ মিনিট",
                            examCode: firstExam.examCode || "১২২",
                            examDate: new Date().toISOString().split('T')[0]
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch exams:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActiveExams();
    }, []);

    // Live Overflow Detector
    useEffect(() => {
        const timer = setTimeout(() => {
            const previewEl = document.querySelector('.print-area-wrapper');
            if (previewEl) {
                // clientHeight is fixed to 1123px (A4 height). scrollHeight measures the actual content height.
                // We allow a tiny 5px margin of error for borders
                setIsOverflowing(previewEl.scrollHeight > 1128);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [
        questionCount, columnsCount, bubbleSize, rowDensity, includeCqMarks, 
        cqCount, cqMaxVal, includeSetCode, sheetType, rollDigits, 
        studentNameEnabled, rollNumberEnabled, classSectionEnabled, 
        studentIdEnabled, examDateEnabled, studentSigEnabled, invigilatorSigEnabled, 
        examDetails, watermarkText, layoutStyle, boardThemeColor, rollDigitsBoard,
        includeRegGrid, regDigitsBoard, includeSubjectGrid, subjectDigitsBoard, includeInvigilatorBox
    ]);

    const handleExamChange = (examId) => {
        setSelectedExamId(examId);
        const exam = exams.find(e => e.id === examId);
        if (exam) {
            setExamDetails({
                title: "বহুনির্বাচনি/নৈর্ব্যক্তিক অভীক্ষার উত্তরপত্র",
                className: exam.className || "১০ম শ্রেণী",
                subjectName: exam.subjectName || "N/A",
                instituteName: exam.instituteName || "ক্যান্টনমেন্ট পাবলিক স্কুল এন্ড কলেজ মোমেনশাহী",
                totalMarks: exam.totalMarks || 30,
                examDuration: exam.durationMinutes ? `${exam.durationMinutes} মিনিট` : "৩০ মিনিট",
                examCode: exam.examCode || "১২২",
                examDate: new Date().toISOString().split('T')[0]
            });
        }
    };

    // Client-side PDF Generation with high-resolution scaling
    const handleDownloadPdf = async () => {
        setPdfLoading(true);
        setPdfProgress(10);
        setPdfStatus(t('omr_gen_status_clone'));
        
        try {
            const originalElement = document.querySelector('.print-area-wrapper');
            if (!originalElement) {
                alert(t('omr_gen_alert_preview_not_found'));
                setPdfLoading(false);
                return;
            }

            // Wait for fonts to load
            setPdfProgress(25);
            setPdfStatus(t('omr_gen_status_fonts'));
            try {
                await document.fonts.ready;
            } catch (e) {
                console.warn("Fonts load waiting failed:", e);
            }

            // Clone the element to render offscreen without styling issues
            const clone = originalElement.cloneNode(true);
            
            // Clean up all interactive input tags in the clone to avoid rendering double inputs
            const openInputs = clone.querySelectorAll('input');
            openInputs.forEach(input => {
                const span = document.createElement('span');
                span.textContent = input.value;
                span.className = "font-bold text-black border-b border-black px-2 pb-0.5";
                input.parentNode.replaceChild(span, input);
            });

            // Set styling for A4 exact dimensions in pixels (794x1123 is standard A4 at 96DPI)
            clone.style.position = 'fixed';
            clone.style.left = '-9999px';
            clone.style.top = '-9999px';
            clone.style.width = '794px';
            clone.style.height = '1123px';
            clone.style.padding = '10mm'; // Standard margins
            clone.style.boxSizing = 'border-box';
            clone.style.borderRadius = '0';
            clone.style.border = 'none';
            clone.style.boxShadow = 'none';
            clone.style.backgroundColor = '#ffffff';
            clone.style.color = '#000000';
            
            // Clean recursively all transition classes, cursor helpers, and hover configurations
            // to completely eliminate double-drawn text or outline rendering glitches in html2canvas
            const cleanElement = (el) => {
                el.removeAttribute('title');
                el.removeAttribute('onclick');
                el.classList.remove(
                    'transition-all', 'hover:bg-slate-100', 'hover:bg-slate-150', 'cursor-pointer', 
                    'border-dashed', 'hover:border-slate-400', 'hover:border-slate-450', 'active:scale-95'
                );
                el.childNodes.forEach(child => {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        cleanElement(child);
                    }
                });
            };
            cleanElement(clone);

            // Add style rules directly inside the clone to bypass Tailwind's space-y sibling selectors
            // which html2canvas fails to calculate accurately, causing uneven gaps in question rows.
            const styleTag = document.createElement('style');
            
            // If theme is black, force all colors to black. If theme is red, keep the board colors!
            const forceBlack = layoutStyle === 'modern' || boardThemeColor === 'black';
            
            styleTag.innerHTML = `
                * {
                    transition: none !important;
                    animation: none !important;
                    box-sizing: border-box !important;
                    font-family: 'Noto Serif Bengali', 'Noto Sans Bengali', sans-serif !important;
                }
                ${forceBlack ? `
                .print-bubble {
                    border-color: #000000 !important;
                    color: #000000 !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                }
                .print-bubble[data-prefilled="true"] {
                    background-color: #000000 !important;
                    color: #ffffff !important;
                }
                .print-border {
                    border-color: #000000 !important;
                }
                .print-text {
                    color: #000000 !important;
                }
                ` : `
                .print-bubble {
                    border-color: #e15b4c !important;
                    color: #e15b4c !important;
                    background-color: transparent !important;
                }
                .print-border {
                    border-color: #e15b4c !important;
                }
                `}
            `;
            clone.appendChild(styleTag);

            document.body.appendChild(clone);

            setPdfProgress(50);
            setPdfStatus(t('omr_gen_status_render'));

            // Yield control back to browser to finalize layout rendering
            await new Promise(resolve => setTimeout(resolve, 600));

            const canvas = await html2canvas(clone, {
                scale: 2.5, // 2.5x high resolution for sharp print output
                useCORS: true,
                allowTaint: false,
                backgroundColor: '#ffffff',
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 794,
                windowHeight: 1123,
                scrollX: 0,
                scrollY: 0
            });

            document.body.removeChild(clone);

            setPdfProgress(80);
            setPdfStatus(t('omr_gen_status_compile'));

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [794, 1123]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
            
            setPdfProgress(95);
            setPdfStatus(t('omr_gen_status_download'));
            
            const sanitizedTitle = examDetails.instituteName.substring(0, 15).replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, "_");
            const filename = `OMR_${sanitizedTitle || 'board_template'}.pdf`;
            pdf.save(filename);

            setPdfProgress(100);
            setPdfStatus(t('omr_gen_completed'));
            setTimeout(() => {
                setPdfLoading(false);
                setPdfProgress(0);
            }, 800);

        } catch (error) {
            console.error("PDF download failed:", error);
            alert('পিডিএফ ফাইল ডাউনলোড করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
            setPdfLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Reset all parameters to defaults
    const handleReset = () => {
        setLayoutStyle('board');
        setBoardThemeColor('red');
        setThemeColor('black');
        setBubbleSize('medium');
        setRowDensity('cozy');
        setColumnsCount(2);
        setQuestionCount(30);
        setOptionsCount(4);
        setOptionLanguage('bn');
        setIncludeCqMarks(false);
        setIncludeSetCode(true);
        setSelectedSetCode('A');
        setWatermarkText('');
        setStudentNameEnabled(true);
        setRollNumberEnabled(true);
        setStudentClassEnabled(true);
        setStudentIdEnabled(true);
        setExamDateEnabled(true);
        setStudentSigEnabled(true);
        setInvigilatorSigEnabled(true);
        setRollDigits(5);
        setRollDigitsBoard(6);
        setIncludeRegGrid(true);
        setRegDigitsBoard(10);
        setIncludeSubjectGrid(true);
        setSubjectDigitsBoard(3);
        setIncludeInvigilatorBox(true);
    };

    // Render Option bubble labels
    const getOptionLabel = (index) => {
        if (optionLanguage === 'bn') {
            const bnLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ'];
            return bnLabels[index] || 'ক';
        } else {
            const enLabels = ['A', 'B', 'C', 'D', 'E'];
            return enLabels[index] || 'A';
        }
    };

    // Convert digit to Bengali numerals
    const toBnNumeral = (num) => {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().split('').map(d => bnDigits[d] || d).join('');
    };

    // Helper function to resolve margin top for row density without Tailwind sibling space-y
    const getDensityMargin = (density) => {
        if (density === 'compact') return '4px';
        if (density === 'comfortable') return '10px';
        return '6px'; // cozy
    };

    const questionsArray = Array.from({ length: questionCount }, (_, i) => i + 1);
    const optionsArray = Array.from({ length: optionsCount }, (_, i) => i);
    const cqsArray = Array.from({ length: cqCount }, (_, i) => i + 1);

    // QR Code API Url helper
    const qrData = JSON.stringify({
        exam_id: selectedExamId || "EXAM-10025",
        student_id: sheetType === 'PERSONALIZED' ? studentInfo.studentId : "GENERIC_SHEET"
    });
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

    // Current Style Theme Config
    const currentTheme = themeColors[themeColor] || themeColors.black;
    const currentBubbleSize = bubbleSizeClasses[bubbleSize] || bubbleSizeClasses.medium;

    // Calculate columns distribution
    const questionsPerCol = Math.ceil(questionCount / columnsCount);
    const columnsArray = Array.from({ length: columnsCount }, (_, i) => i);

    // Dynamic widths for label based on bubble size
    const labelWidth = bubbleSize === 'small' ? '20px' : bubbleSize === 'large' ? '28px' : '24px';

    // Traditional board style drop-out colors
    const boardColor = boardThemeColor === 'red' ? '#e15b4c' : '#000000';

    // Board columns width distribution
    const mcqWidth = columnsCount === 2 ? 'w-[45%]' : columnsCount === 3 ? 'w-[55%]' : 'w-[65%]';
    const studentWidth = columnsCount === 2 ? 'w-[55%]' : columnsCount === 3 ? 'w-[45%]' : 'w-[35%]';

    return (
        <div className="min-h-screen bg-[#090D1A] text-slate-100 font-outfit pb-20 p-4 md:p-8 flex flex-col gap-6 print:bg-white print:text-black print:p-0 print:pb-0 relative overflow-x-hidden">
            
            {/* Global Loader for PDF Export */}
            <AnimatePresence>
                {pdfLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 no-print"
                    >
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full flex flex-col items-center gap-6 shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                {/* Double spinning ring */}
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-teal-500 animate-spin"></div>
                                <FileDown className="text-emerald-400 animate-bounce" size={32} />
                            </div>
                            
                            <div className="text-center w-full">
                                <h3 className="text-lg font-black text-white">{t('omr_gen_generating_pdf')}</h3>
                                <p className="text-xs text-slate-400 mt-1">{pdfStatus}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <motion.div 
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pdfProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <div className="text-xs font-mono text-emerald-400 font-bold">
                                {pdfProgress}% {t('omr_gen_completed')}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Styles for print mode */}
            <style dangerouslySetInnerHTML={{__html: `
                @page {
                    size: A4;
                    margin: 0;
                }
                @media print {
                    body {
                        background-color: white !important;
                        color: black !important;
                    }
                    nav, aside, header, footer, button, .no-print, .edit-overlay {
                        display: none !important;
                    }
                    .print-area-wrapper {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm;
                        height: 297mm;
                        padding: 10mm !important;
                        margin: 0;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        border-radius: 0 !important;
                    }
                    .print-bubble {
                        border-color: #000000 !important;
                        color: #000000 !important;
                        background-color: transparent !important;
                    }
                    .print-bubble[data-prefilled="true"] {
                        background-color: #000000 !important;
                        color: #ffffff !important;
                    }
                    .print-anchor {
                        background-color: black !important;
                        border-color: black !important;
                    }
                    .print-border {
                        border-color: black !important;
                    }
                    .print-text {
                        color: black !important;
                    }
                }
            `}} />

            {/* Top Navigation / Breadcrumbs */}
            <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between no-print border-b border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="p-2.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 rounded-xl transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                {t('omr_gen_title')} <Sparkles className="text-emerald-500 animate-pulse" size={20} />
                            </h1>
                            <span className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 shadow-sm">
                                Dynamic v2.0
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{t('omr_gen_subtitle')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-all hover:text-white"
                        title={t('omr_gen_reset')}
                    >
                        <RefreshCw size={14} /> {t('omr_gen_reset')}
                    </button>
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] active:scale-95 border border-emerald-400/20"
                    >
                        <Download size={16} /> {t('omr_gen_download_pdf')}
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all border border-slate-700"
                    >
                        <Printer size={16} /> {t('omr_gen_print_sheet')}
                    </button>
                </div>
            </div>

            {/* Main Working Panel */}
            <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Configuration Sidebar - 5 cols */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 no-print">
                    
                    {/* Live Overflow Warning Notification Banner */}
                    {isOverflowing && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-[11px] text-red-400 leading-relaxed flex gap-3 shadow-lg animate-pulse"
                        >
                            <Info className="shrink-0 text-red-500 mt-0.5" size={16} />
                            <div>
                                <strong className="text-red-250 block font-black">{t('omr_gen_overflow_title')}</strong>
                                <p className="mt-0.5 text-red-300">
                                    {t('omr_gen_overflow_desc')}
                                </p>
                                <strong className="block mt-1.5 text-white">{t('omr_gen_overflow_solve')}</strong>
                                <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-slate-300 font-bold">
                                    <li>{t('omr_gen_overflow_tip1')}</li>
                                    <li>{t('omr_gen_overflow_tip2')}</li>
                                    <li>{t('omr_gen_overflow_tip3')}</li>
                                    <li>{t('omr_gen_overflow_tip4')}</li>
                                </ul>
                            </div>
                        </motion.div>
                    )}

                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-5 backdrop-blur-md shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Settings className="text-emerald-500 animate-spin-slow" size={18} />
                                <h2 className="font-extrabold text-white text-sm tracking-wide uppercase">{t('omr_gen_control_center')}</h2>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">{t('omr_gen_customize_all')}</span>
                        </div>

                        {/* Accordion Tabs Header */}
                        <div className="grid grid-cols-4 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                            <button 
                                onClick={() => setActiveTab('exam')}
                                className={`py-2 px-1 rounded-lg text-[11px] font-extrabold transition-all flex flex-col items-center gap-1.5 ${
                                    activeTab === 'exam' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <FileText size={15} />
                                <span>{t('omr_gen_tab_exam')}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('bubble')}
                                className={`py-2 px-1 rounded-lg text-[11px] font-extrabold transition-all flex flex-col items-center gap-1.5 ${
                                    activeTab === 'bubble' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Sliders size={15} />
                                <span>{t('omr_gen_tab_bubble')}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('student')}
                                className={`py-2 px-1 rounded-lg text-[11px] font-extrabold transition-all flex flex-col items-center gap-1.5 ${
                                    activeTab === 'student' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <QrCode size={15} />
                                <span>{t('omr_gen_tab_student')}</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('design')}
                                className={`py-2 px-1 rounded-lg text-[11px] font-extrabold transition-all flex flex-col items-center gap-1.5 ${
                                    activeTab === 'design' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <Palette size={15} />
                                <span>{t('omr_gen_tab_design')}</span>
                            </button>
                        </div>

                        {/* Accordion Panels */}
                        <div className="min-h-[380px]">
                            {/* Tab 1: Exam Info */}
                            {activeTab === 'exam' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="flex flex-col gap-4"
                                >
                                    {/* Select Exam Link */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Layers size={12} /> {t('omr_gen_sync_exam')}
                                        </label>
                                        <select 
                                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all cursor-pointer"
                                            value={selectedExamId}
                                            onChange={(e) => handleExamChange(e.target.value)}
                                        >
                                            <option value="">{t('omr_gen_select_exam')}</option>
                                            {exams.map(e => (
                                                <option key={e.id} value={e.id}>{e.title}</option>
                                            ))}
                                            {exams.length === 0 && <option value="mock-1">পদার্থবিজ্ঞান অর্ধবার্ষিক মডেল টেস্ট - ২০২৬</option>}
                                        </select>
                                    </div>

                                    <div className="border-t border-slate-800/80 my-1"></div>

                                    {/* Institution Name */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-400">{t('omr_gen_inst_name')}</label>
                                        <input 
                                            type="text"
                                            value={examDetails.instituteName}
                                            onChange={(e) => setExamDetails({ ...examDetails, instituteName: e.target.value })}
                                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            placeholder={t('omr_gen_inst_placeholder')}
                                        />
                                    </div>

                                    {/* Exam Title */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-400">{t('omr_gen_exam_title')}</label>
                                        <input 
                                            type="text"
                                            value={examDetails.title}
                                            onChange={(e) => setExamDetails({ ...examDetails, title: e.target.value })}
                                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            placeholder={t('omr_gen_exam_placeholder')}
                                        />
                                    </div>

                                    {/* Subject & Class */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_subject')}</label>
                                            <input 
                                                type="text"
                                                value={examDetails.subjectName}
                                                onChange={(e) => setExamDetails({ ...examDetails, subjectName: e.target.value })}
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_class')}</label>
                                            <input 
                                                type="text"
                                                value={examDetails.className}
                                                onChange={(e) => setExamDetails({ ...examDetails, className: e.target.value })}
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Code & Date & Marks */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400">{t('omr_gen_code_set')}</label>
                                            <input 
                                                type="text"
                                                value={examDetails.examCode}
                                                onChange={(e) => setExamDetails({ ...examDetails, examCode: e.target.value })}
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400">{t('omr_gen_exam_time')}</label>
                                            <input 
                                                type="text"
                                                value={examDetails.examDuration}
                                                onChange={(e) => setExamDetails({ ...examDetails, examDuration: e.target.value })}
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-bold text-slate-400">{t('omr_gen_total_marks')}</label>
                                            <input 
                                                type="number"
                                                value={examDetails.totalMarks}
                                                onChange={(e) => setExamDetails({ ...examDetails, totalMarks: Number(e.target.value) })}
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-400">পরীক্ষার তারিখ</label>
                                        <input 
                                            type="text"
                                            value={examDetails.examDate}
                                            onChange={(e) => setExamDetails({ ...examDetails, examDate: e.target.value })}
                                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Tab 2: Bubble Layout Config */}
                            {activeTab === 'bubble' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="flex flex-col gap-4"
                                >
                                    {/* Question Setup */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_qs_count')}</label>
                                            <select 
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                                                value={questionCount}
                                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                            >
                                                {[10, 20, 25, 30, 40, 50, 75, 100].map(count => (
                                                    <option key={count} value={count}>
                                                        {currentLang === 'bn' ? `${toBnNumeral(count)}টি` : count} MCQ
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_options_count')}</label>
                                            <select 
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                                                value={optionsCount}
                                                onChange={(e) => setOptionsCount(Number(e.target.value))}
                                            >
                                                <option value={4}>{currentLang === 'bn' ? '৪টি (ক-ঘ / A-D)' : '4 (A-D)'}</option>
                                                <option value={5}>{currentLang === 'bn' ? '৫টি (ক-ঙ / A-E)' : '5 (A-E)'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Options Language & Columns count */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_bubble_lang')}</label>
                                            <select 
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                                                value={optionLanguage}
                                                onChange={(e) => setOptionLanguage(e.target.value)}
                                            >
                                                <option value="bn">{currentLang === 'bn' ? 'বাংলা (ক, খ, গ, ঘ)' : 'Bengali (ক, খ, গ, ঘ)'}</option>
                                                <option value="en">English (A, B, C, D)</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_columns_count')}</label>
                                            <select 
                                                className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                                                value={columnsCount}
                                                onChange={(e) => setColumnsCount(Number(e.target.value))}
                                            >
                                                <option value={2}>{currentLang === 'bn' ? '২ কলাম' : '2 Columns'}</option>
                                                <option value={3}>{currentLang === 'bn' ? '৩ কলাম (কমপ্যাক্ট)' : '3 Columns (Compact)'}</option>
                                                <option value={4}>{currentLang === 'bn' ? '৪ কলাম (সর্বোচ্চ)' : '4 Columns (Max)'}</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-800/80 my-1"></div>

                                    {/* Bubble Size & Spacing */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <Sliders size={12} /> {t('omr_gen_bubble_size')}
                                            </label>
                                            <div className="grid grid-cols-3 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                                                {['small', 'medium', 'large'].map(sz => (
                                                    <button
                                                        key={sz}
                                                        onClick={() => setBubbleSize(sz)}
                                                        className={`py-1 text-[10px] font-bold rounded capitalize transition-all ${
                                                            bubbleSize === sz ? 'bg-emerald-500 text-white' : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {sz === 'small' ? (currentLang === 'bn' ? 'ছোট' : 'Small') : sz === 'medium' ? (currentLang === 'bn' ? 'মাঝারি' : 'Med') : (currentLang === 'bn' ? 'বড়' : 'Large')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <Layers size={12} /> {t('omr_gen_bubble_spacing')}
                                            </label>
                                            <div className="grid grid-cols-3 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                                                {['compact', 'cozy', 'comfortable'].map(sp => (
                                                    <button
                                                        key={sp}
                                                        onClick={() => setRowDensity(sp)}
                                                        className={`py-1 text-[10px] font-bold rounded capitalize transition-all ${
                                                            rowDensity === sp ? 'bg-emerald-500 text-white' : 'text-slate-400'
                                                        }`}
                                                    >
                                                        {sp === 'compact' ? (currentLang === 'bn' ? 'কমপ্যাক্ট' : 'Compact') : sp === 'cozy' ? (currentLang === 'bn' ? 'কোজি' : 'Cozy') : (currentLang === 'bn' ? 'কমফোর্ট' : 'Comfort')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-400/90 leading-relaxed mt-2 flex gap-2">
                                        <Info className="shrink-0 text-emerald-500" size={14} />
                                        <span>{t('omr_gen_bubble_tip')}</span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Tab 3: Student Details & Set Code */}
                            {activeTab === 'student' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="flex flex-col gap-4"
                                >
                                    {/* Traditional Board Style Student Config */}
                                    {layoutStyle === 'board' ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-bold text-slate-400">{t('omr_gen_roll_digits_board')}</label>
                                                <select 
                                                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                                                    value={rollDigitsBoard}
                                                    onChange={(e) => setRollDigitsBoard(Number(e.target.value))}
                                                >
                                                    {[4,5,6,7,8].map(d => (
                                                        <option key={d} value={d}>{currentLang === 'bn' ? `${toBnNumeral(d)} ডিজিটের রোল` : `${d} Digit Roll`}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="border border-slate-800 p-3 rounded-xl bg-slate-950/40 flex flex-col gap-2.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-white">{t('omr_gen_include_reg')}</label>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={includeRegGrid}
                                                        onChange={(e) => setIncludeRegGrid(e.target.checked)}
                                                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                                    />
                                                </div>
                                                {includeRegGrid && (
                                                    <div className="flex items-center justify-between gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-400">{currentLang === 'bn' ? 'ডিজিট সংখ্যা:' : 'Digits:'}</span>
                                                        <select 
                                                            className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-200"
                                                            value={regDigitsBoard}
                                                            onChange={(e) => setRegDigitsBoard(Number(e.target.value))}
                                                        >
                                                            {[8,9,10,11,12].map(d => (
                                                                <option key={d} value={d}>{currentLang === 'bn' ? `${toBnNumeral(d)} ডিজিট` : `${d} Digits`}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border border-slate-800 p-3 rounded-xl bg-slate-950/40 flex flex-col gap-2.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-bold text-white">{t('omr_gen_include_subject')}</label>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={includeSubjectGrid}
                                                        onChange={(e) => setIncludeSubjectGrid(e.target.checked)}
                                                        className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                                    />
                                                </div>
                                                {includeSubjectGrid && (
                                                    <div className="flex items-center justify-between gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-400">{currentLang === 'bn' ? 'ডিজিট সংখ্যা:' : 'Digits:'}</span>
                                                        <select 
                                                            className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-200"
                                                            value={subjectDigitsBoard}
                                                            onChange={(e) => setSubjectDigitsBoard(Number(e.target.value))}
                                                        >
                                                            {[3,4].map(d => (
                                                                <option key={d} value={d}>{currentLang === 'bn' ? `${toBnNumeral(d)} ডিজিট` : `${d} Digits`}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
                                                <label className="text-xs font-bold text-white">{t('omr_gen_include_invigilator')}</label>
                                                <input 
                                                    type="checkbox" 
                                                    checked={includeInvigilatorBox}
                                                    onChange={(e) => setIncludeInvigilatorBox(e.target.checked)}
                                                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        /* Modern style configs */
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-400">{t('omr_gen_sheet_format')}</label>
                                                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                                                    <button 
                                                        onClick={() => setSheetType('PERSONALIZED')}
                                                        className={`p-2.5 rounded-lg text-xs font-bold transition-all ${
                                                            sheetType === 'PERSONALIZED' 
                                                                ? 'bg-emerald-500 text-white shadow-md' 
                                                                : 'text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {t('omr_gen_personalized')}
                                                    </button>
                                                    <button 
                                                        onClick={() => setSheetType('GENERIC')}
                                                        className={`p-2.5 rounded-lg text-xs font-bold transition-all ${
                                                            sheetType === 'GENERIC' 
                                                                ? 'bg-emerald-500 text-white shadow-md' 
                                                                : 'text-slate-400 hover:text-slate-200'
                                                        }`}
                                                    >
                                                        {t('omr_gen_generic')}
                                                    </button>
                                                </div>
                                            </div>

                                            {sheetType === 'GENERIC' && (
                                                <div className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-2.5 rounded-xl">
                                                    <label className="text-xs font-bold text-slate-300">{t('omr_gen_roll_digits_modern')}</label>
                                                    <div className="flex gap-2">
                                                        {[4, 5, 6].map(d => (
                                                            <button
                                                                key={d}
                                                                onClick={() => setRollDigits(d)}
                                                                className={`px-3 py-1 rounded text-xs font-bold ${
                                                                    rollDigits === d ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                                                                }`}
                                                            >
                                                                {currentLang === 'bn' ? `${toBnNumeral(d)}টি` : `${d} Digits`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
                                                <label className="text-xs font-bold text-slate-400">{t('omr_gen_fields_to_include')}</label>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                        <input type="checkbox" checked={studentNameEnabled} onChange={(e) => setStudentNameEnabled(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                                                        <span>{t('omr_gen_field_student_name')}</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                        <input type="checkbox" checked={rollNumberEnabled} onChange={(e) => setRollNumberEnabled(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                                                        <span>{t('omr_gen_field_roll')}</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                        <input type="checkbox" checked={classSectionEnabled} onChange={(e) => setStudentClassEnabled(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                                                        <span>{t('omr_gen_field_class_sec')}</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                        <input type="checkbox" checked={studentIdEnabled} onChange={(e) => setStudentIdEnabled(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                                                        <span>{t('omr_gen_field_student_id')}</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                        <input type="checkbox" checked={examDateEnabled} onChange={(e) => setExamDateEnabled(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                                                        <span>{t('omr_gen_field_exam_date')}</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                                        <input type="checkbox" checked={studentSigEnabled} onChange={(e) => setStudentSigEnabled(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
                                                        <span>{t('omr_gen_field_student_sig')}</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Set Code Configuration */}
                                    <div className="border border-slate-800 p-3 rounded-xl bg-slate-950/40 flex flex-col gap-2 mt-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-extrabold text-white">{t('omr_gen_set_code_grid')}</label>
                                            <input 
                                                type="checkbox" 
                                                checked={includeSetCode}
                                                onChange={(e) => setIncludeSetCode(e.target.checked)}
                                                className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Tab 4: Written Section & Watermark & Styling */}
                            {activeTab === 'design' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 5 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="flex flex-col gap-4"
                                >
                                    {/* OMR Layout Style Toggle */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Layers size={12} /> {t('omr_gen_layout_template')}
                                        </label>
                                        <div className="grid grid-cols-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                                            <button 
                                                onClick={() => setLayoutStyle('board')}
                                                className={`p-2 rounded-lg text-[11px] font-extrabold transition-all ${
                                                    layoutStyle === 'board' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                {t('omr_gen_board_style')}
                                            </button>
                                            <button 
                                                onClick={() => setLayoutStyle('modern')}
                                                className={`p-2 rounded-lg text-[11px] font-extrabold transition-all ${
                                                    layoutStyle === 'modern' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                {t('omr_gen_modern_style')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Board Specific Theme Color Selection */}
                                    {layoutStyle === 'board' ? (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400">{t('omr_gen_board_theme')}</label>
                                            <div className="grid grid-cols-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                                                <button 
                                                    onClick={() => setBoardThemeColor('red')}
                                                    className={`p-2 rounded-lg text-xs font-bold transition-all ${
                                                        boardThemeColor === 'red' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    Dropout Orange-Red
                                                </button>
                                                <button 
                                                    onClick={() => setBoardThemeColor('black')}
                                                    className={`p-2 rounded-lg text-xs font-bold transition-all ${
                                                        boardThemeColor === 'black' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                                                    }`}
                                                >
                                                    Pure Black (Standard)
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Modern specific Theme Selector */
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <Palette size={12} /> {t('omr_gen_theme_accent')}
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {Object.keys(themeColors).map(colorKey => (
                                                    <button
                                                        key={colorKey}
                                                        onClick={() => setThemeColor(colorKey)}
                                                        className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                                                            themeColor === colorKey 
                                                                ? 'bg-slate-800 border-slate-600 text-white shadow-md' 
                                                                : 'bg-slate-950/60 border-slate-900 text-slate-500 hover:border-slate-800'
                                                        }`}
                                                    >
                                                        <span className={`w-3.5 h-3.5 rounded-full`} style={{ backgroundColor: themeColors[colorKey].hex }} />
                                                        <span className="capitalize">{currentLang === 'bn' ? (colorKey === 'black' ? 'কালো' : colorKey === 'blue' ? 'নীল' : colorKey === 'green' ? 'সবুজ' : 'লাল') : colorKey}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-800/80 my-1"></div>

                                    {/* Creative Marks Setup (Common/Modern) */}
                                    <div className="border border-slate-800 p-3 rounded-xl bg-slate-950/40 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <label className="text-xs font-extrabold text-white">{t('omr_gen_cq_box')}</label>
                                                <span className="text-[9px] text-slate-400">{t('omr_gen_cq_box_desc')}</span>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={includeCqMarks}
                                                onChange={(e) => setIncludeCqMarks(e.target.checked)}
                                                className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                            />
                                        </div>

                                        {includeCqMarks && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="flex flex-col gap-2 pl-2 border-l border-emerald-500 mt-1"
                                            >
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-bold text-slate-400">{t('omr_gen_qs_count')}</label>
                                                        <select 
                                                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                                                            value={cqCount}
                                                            onChange={(e) => setCqCount(Number(e.target.value))}
                                                        >
                                                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                                <option key={n} value={n}>{currentLang === 'bn' ? `${toBnNumeral(n)}টি সৃজনশীল` : `${n} Creative Qs`}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-bold text-slate-400">{t('omr_gen_cq_max_val')}</label>
                                                        <select 
                                                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none"
                                                            value={cqMaxVal}
                                                            onChange={(e) => setCqMaxVal(Number(e.target.value))}
                                                        >
                                                            <option value={10}>{currentLang === 'bn' ? '১০ নম্বর (০-১০)' : '10 Marks (0-10)'}</option>
                                                            <option value={5}>{currentLang === 'bn' ? '৫ নম্বর (০-৫)' : '5 Marks (0-5)'}</option>
                                                            <option value={8}>{currentLang === 'bn' ? '৮ নম্বর (০-৮)' : '8 Marks (0-8)'}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Watermark Settings */}
                                    <div className="border border-slate-800 p-3 rounded-xl bg-slate-950/40 flex flex-col gap-2.5">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-white flex items-center gap-1">
                                                <Type size={13} /> {t('omr_gen_watermark')}
                                            </label>
                                            <input 
                                                type="text"
                                                value={watermarkText}
                                                onChange={(e) => setWatermarkText(e.target.value)}
                                                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                                                placeholder={t('omr_gen_watermark_placeholder')}
                                            />
                                        </div>

                                        {watermarkText && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="flex flex-col gap-2"
                                            >
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                                    <span>{currentLang === 'bn' ? `অপাসিটি: ${toBnNumeral(watermarkOpacity)}%` : `Opacity: ${watermarkOpacity}%`}</span>
                                                    <input 
                                                        type="range" 
                                                        min="5" 
                                                        max="50" 
                                                        value={watermarkOpacity} 
                                                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                                                        className="w-1/2 accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg" 
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                                    <span>{currentLang === 'bn' ? `ঘূর্ণন কোণ: ${toBnNumeral(watermarkRotation)}°` : `Rotation: ${watermarkRotation}°`}</span>
                                                    <input 
                                                        type="range" 
                                                        min="-90" 
                                                        max="90" 
                                                        value={watermarkRotation} 
                                                        onChange={(e) => setWatermarkRotation(Number(e.target.value))}
                                                        className="w-1/2 accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg" 
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                                    <span>{currentLang === 'bn' ? `ফন্ট সাইজ: ${toBnNumeral(watermarkSize)}px` : `Font Size: ${watermarkSize}px`}</span>
                                                    <input 
                                                        type="range" 
                                                        min="30" 
                                                        max="120" 
                                                        value={watermarkSize} 
                                                        onChange={(e) => setWatermarkSize(Number(e.target.value))}
                                                        className="w-1/2 accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg" 
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Printing Guideline Info Banner */}
                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex gap-3 text-[11px] text-slate-400 leading-relaxed shadow-inner">
                            <HelpCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                            <div>
                                <strong className="text-slate-200 block mb-0.5">{t('omr_gen_guide_title')}</strong>
                                {t('omr_gen_guide_text')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Printable Live Preview Panel - 7 cols */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center w-full gap-4">
                    
                    {/* Viewport Info Header */}
                    <div className="w-full flex items-center justify-between bg-slate-900/40 border border-slate-800/60 rounded-xl px-5 py-3 text-xs text-slate-300 no-print">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isOverflowing ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`}></span>
                            <span className="font-extrabold text-white">{t('omr_gen_preview_canvas')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-800 px-2.5 py-1 rounded-md text-[10px] font-mono border border-slate-700">A4 PAPER</span>
                            <span className="text-slate-400 font-bold">{currentLang === 'bn' ? 'টেমপ্লেট: ' : 'Template: '}<span className="text-emerald-400 capitalize">{layoutStyle}</span></span>
                        </div>
                    </div>

                    {/* Scrollable container for mobile */}
                    <div className="w-full overflow-x-auto flex justify-center py-4 bg-slate-950/40 border border-slate-800 rounded-2xl shadow-inner scrollbar-thin scrollbar-thumb-slate-800">
                        
                        {/* A4 Paper Canvas Container (Exact pixel A4 bounding box) */}
                        <div className={`print-area-wrapper bg-white text-black w-[794px] h-[1123px] min-h-[1123px] max-h-[1123px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative p-[10mm] flex flex-col justify-between overflow-hidden border ${isOverflowing ? 'border-red-500/80 ring-2 ring-red-500/10' : 'border-slate-200'}`}>
                            
                            {/* Box sizing style override for perfect canvas layout */}
                            <style dangerouslySetInnerHTML={{__html: `
                                .print-area-wrapper * {
                                    box-sizing: border-box !important;
                                }
                            `}} />

                            {/* Watermark Diagonal Layer */}
                            {watermarkText && (
                                <div 
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0"
                                    style={{
                                        opacity: watermarkOpacity / 100,
                                        transform: `rotate(${watermarkRotation}deg)`,
                                        fontSize: `${watermarkSize}px`,
                                        fontWeight: 900,
                                        color: '#333333',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {watermarkText}
                                </div>
                            )}

                            {/* Corner Anchor Marks for OpenCV calibration (Standard 20px Solid Black Box) */}
                            <div className="print-anchor absolute top-4 left-4 w-5 h-5 bg-black border border-black z-10"></div>
                            <div className="print-anchor absolute top-4 right-4 w-5 h-5 bg-black border border-black z-10"></div>
                            <div className="print-anchor absolute bottom-4 left-4 w-5 h-5 bg-black border border-black z-10"></div>
                            <div className="print-anchor absolute bottom-4 right-4 w-5 h-5 bg-black border border-black z-10"></div>

                            {/* Left & Right Timing Marks for Board Layout replication */}
                            {layoutStyle === 'board' && (
                                <>
                                    <div className="absolute top-[15%] bottom-[10%] left-1 flex flex-col justify-between" style={{ width: '6px', zIndex: 5 }}>
                                        {Array.from({ length: 32 }).map((_, i) => (
                                            <div key={i} className="w-1.5 h-1.5 bg-black" />
                                        ))}
                                    </div>
                                    <div className="absolute top-[15%] bottom-[10%] right-1 flex flex-col justify-between" style={{ width: '6px', zIndex: 5 }}>
                                        {Array.from({ length: 32 }).map((_, i) => (
                                            <div key={i} className="w-1.5 h-1.5 bg-black" />
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* INNER CONTENT SWITCHER */}
                            <div className="flex flex-col justify-between h-full w-full relative z-10">
                                {layoutStyle === 'board' ? (
                                    /* ==================== TRADITIONAL BOARD EXAM STYLE ==================== */
                                    <>
                                        {/* Board Header Section */}
                                        <div className="flex flex-col items-center w-full" style={{ gap: '4px' }}>
                                            <div className="flex items-center justify-center gap-3 w-full">
                                                {/* Logo Slot */}
                                                <div className="w-9 h-9 border border-dashed border-slate-400 rounded-full flex items-center justify-center bg-slate-50 text-[7px] font-bold text-slate-400 text-center uppercase p-1">Logo Slot</div>
                                                <div className="text-center">
                                                    {isEditingInst ? (
                                                        <input 
                                                            type="text" 
                                                            value={examDetails.instituteName}
                                                            onChange={(e) => setExamDetails({ ...examDetails, instituteName: e.target.value })}
                                                            onBlur={() => setIsEditingInst(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingInst(false)}
                                                            className="text-center text-lg font-bold border-b border-dashed border-emerald-500 outline-none w-full max-w-[480px] text-black bg-emerald-50 px-2 py-0.5"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h2 
                                                            onClick={() => setIsEditingInst(true)}
                                                            className="text-base md:text-lg font-bold tracking-wide uppercase border-dashed hover:border-slate-400 transition-all font-noto cursor-pointer hover:bg-slate-100 rounded px-1.5 py-0.5"
                                                            title={currentLang === 'bn' ? "প্রতিষ্ঠানের নাম এডিট করতে ক্লিক করুন" : "Click to edit institution name"}
                                                        >
                                                            {examDetails.instituteName}
                                                        </h2>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* HSC/SSC Year selection layout */}
                                            <div className="flex items-center justify-center text-[10px] font-bold text-slate-700 gap-1.5 font-noto select-none mt-0.5">
                                                <span>--------------------------- {currentLang === 'bn' ? 'এস. এস. সি / এইচ. এস. সি পরীক্ষা' : 'S.S.C / H.S.C Examination'} </span>
                                                <div className="flex gap-[2px] border border-black p-[1px] bg-white">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div key={i} className="w-3 h-4 border border-slate-300 bg-slate-50" />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Header Title */}
                                            <div className="text-center">
                                                {isEditingTitle ? (
                                                    <input 
                                                        type="text" 
                                                        value={examDetails.title}
                                                        onChange={(e) => setExamDetails({ ...examDetails, title: e.target.value })}
                                                        onBlur={() => setIsEditingTitle(false)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                                                        className="text-center text-xs font-bold border-b border-dashed border-emerald-500 outline-none w-full max-w-[400px] text-black bg-emerald-50 px-2 py-0.5"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <h3 
                                                        onClick={() => setIsEditingTitle(true)}
                                                        className="text-xs font-black text-slate-800 border-dashed hover:border-slate-400 transition-all inline-block uppercase tracking-wider font-noto cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5"
                                                        title={currentLang === 'bn' ? "পরীক্ষার নাম এডিট করতে ক্লিক করুন" : "Click to edit exam name"}
                                                    >
                                                        {examDetails.title}
                                                    </h3>
                                                )}
                                            </div>

                                            {/* Board instructions banner */}
                                            <div className="w-full flex flex-col items-center mt-1" style={{ gap: '1px' }}>
                                                <div className="bg-black text-white text-[8px] font-black text-center py-0.5 w-full tracking-wider uppercase font-noto">
                                                    {t('omr_gen_board_header_inst1')}
                                                </div>
                                                <div className="border border-black text-[8px] font-black text-center py-0.5 w-full tracking-wider font-noto bg-white">
                                                    {t('omr_gen_board_header_inst2')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Board Main Body (MCQ + Grids side-by-side) */}
                                        <div className="flex gap-4 items-start w-full my-2 flex-1">
                                            {/* MCQ answer sheets (Left side) */}
                                            <div className={`${mcqWidth} flex gap-2.5`}>
                                                {columnsArray.map(colIdx => {
                                                    const colQuestions = questionsArray.slice(colIdx * questionsPerCol, (colIdx + 1) * questionsPerCol);
                                                    
                                                    return (
                                                        <div key={colIdx} className="flex-1 flex flex-col border rounded overflow-hidden" style={{ borderColor: boardColor }}>
                                                            <div className="flex border-b" style={{ borderColor: boardColor, backgroundColor: boardThemeColor === 'red' ? '#fff5f4' : '#f8fafc' }}>
                                                                <div className="w-7 text-[8px] font-black text-center py-1 border-r font-noto" style={{ borderColor: boardColor, color: boardColor }}>{t('omr_gen_board_question_title')}</div>
                                                                <div className="flex-1 text-[8px] font-black text-center py-1 font-noto" style={{ color: boardColor }}>{t('omr_gen_board_answer_title')}</div>
                                                            </div>
                                                            {colQuestions.map((qNum, qIndex) => (
                                                                <div 
                                                                    key={qNum} 
                                                                    className={`flex items-center ${qIndex < colQuestions.length - 1 ? 'border-b' : ''}`}
                                                                    style={{ borderColor: boardColor, height: '21px' }}
                                                                >
                                                                    <div className="w-7 text-[10px] font-bold text-center border-r font-noto py-0.5" style={{ borderColor: boardColor, color: boardColor }}>
                                                                        {optionLanguage === 'bn' ? toBnNumeral(qNum) : qNum.toString().padStart(2, '0')}
                                                                    </div>
                                                                    <div className="flex-1 flex justify-center gap-[4px] py-0.5">
                                                                        {optionsArray.map(optIdx => (
                                                                            <div 
                                                                                key={optIdx} 
                                                                                className="print-bubble w-[15px] h-[15px] border rounded-full flex items-center justify-center text-[7.5px] font-bold bg-white"
                                                                                style={{ borderColor: boardColor, color: boardColor }}
                                                                            >
                                                                                {getOptionLabel(optIdx)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Board Student ID Grids (Right side) */}
                                            <div className={`${studentWidth} flex flex-col gap-2.5`}>
                                                
                                                {/* Top row of grids (Roll + Set Code + Signature) */}
                                                <div className="flex gap-2.5 items-start justify-between">
                                                    {/* Roll grid */}
                                                    <div className="border flex flex-col items-center rounded overflow-hidden shrink-0" style={{ borderColor: boardColor }}>
                                                        <div className="text-[8.5px] font-black text-center py-0.5 border-b w-full font-noto" style={{ borderColor: boardColor, color: boardColor, backgroundColor: boardThemeColor === 'red' ? '#fff5f4' : '#f8fafc' }}>
                                                            {t('omr_gen_board_roll')}
                                                        </div>
                                                        <div className="flex border-b" style={{ borderColor: boardColor }}>
                                                            {Array.from({ length: rollDigitsBoard }).map((_, i) => (
                                                                <div key={i} className="w-3.5 h-3.5 border-r last:border-r-0" style={{ borderColor: boardColor }} />
                                                            ))}
                                                        </div>
                                                        <div className="flex p-0.5 gap-[1px] bg-white">
                                                            {Array.from({ length: rollDigitsBoard }).map((_, colIdx) => (
                                                                <div key={colIdx} className="flex flex-col" style={{ gap: '0.5px' }}>
                                                                    {Array.from({ length: 10 }, (_, num) => (
                                                                        <div 
                                                                            key={num} 
                                                                            className="print-bubble w-[10px] h-[10px] border rounded-full flex items-center justify-center text-[6px] font-bold"
                                                                            style={{ borderColor: boardColor, color: boardColor }}
                                                                        >
                                                                            {optionLanguage === 'bn' ? toBnNumeral(num) : num}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Set Code Grid */}
                                                    {includeSetCode && (
                                                        <div className="border flex flex-col items-center rounded overflow-hidden shrink-0" style={{ borderColor: boardColor }}>
                                                            <div className="text-[8.5px] font-black text-center py-0.5 border-b w-full font-noto" style={{ borderColor: boardColor, color: boardColor, backgroundColor: boardThemeColor === 'red' ? '#fff5f4' : '#f8fafc' }}>
                                                                {t('omr_gen_board_set_code')}
                                                            </div>
                                                            <div className="w-4.5 h-3.5 border-b" style={{ borderColor: boardColor }} />
                                                            <div className="flex flex-col p-0.5" style={{ gap: '1.5px' }}>
                                                                {['ক', 'খ', 'গ', 'ঘ'].map((set, setIdx) => {
                                                                    const label = optionLanguage === 'bn' ? set : ['A', 'B', 'C', 'D'][setIdx];
                                                                    return (
                                                                        <div 
                                                                            key={set} 
                                                                            className="print-bubble w-[12px] h-[12px] border rounded-full flex items-center justify-center text-[7px] font-bold"
                                                                            style={{ borderColor: boardColor, color: boardColor }}
                                                                        >
                                                                            {label}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Invigilator signature box */}
                                                    {includeInvigilatorBox && (
                                                        <div className="border flex rounded overflow-hidden justify-between items-center flex-1" style={{ borderColor: boardColor, minHeight: '154px', minWidth: '45px' }}>
                                                            <div className="flex-1" />
                                                            <div className="border-l h-full flex items-center justify-center px-0.5 select-none" style={{ borderColor: boardColor, backgroundColor: boardThemeColor === 'red' ? '#fff5f4' : '#f8fafc' }}>
                                                                <span className="text-[6px] font-black font-noto text-center uppercase tracking-wide" style={{ writingMode: 'vertical-rl', color: boardColor, lineHeight: 1.1 }}>
                                                                    {t('omr_gen_board_invigilator')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Bottom row of grids (Registration + Subject Code) */}
                                                <div className="flex gap-2.5 items-start">
                                                    {/* Registration ID grid */}
                                                    {includeRegGrid && (
                                                        <div className="border flex flex-col items-center rounded overflow-hidden shrink-0" style={{ borderColor: boardColor }}>
                                                            <div className="text-[8.5px] font-black text-center py-0.5 border-b w-full font-noto" style={{ borderColor: boardColor, color: boardColor, backgroundColor: boardThemeColor === 'red' ? '#fff5f4' : '#f8fafc' }}>
                                                                {t('omr_gen_board_reg')}
                                                            </div>
                                                            <div className="flex border-b" style={{ borderColor: boardColor }}>
                                                                {Array.from({ length: regDigitsBoard }).map((_, i) => (
                                                                    <div key={i} className="w-3.5 h-3.5 border-r last:border-r-0" style={{ borderColor: boardColor }} />
                                                                ))}
                                                            </div>
                                                            <div className="flex p-0.5 gap-[1px] bg-white">
                                                                {Array.from({ length: regDigitsBoard }).map((_, colIdx) => (
                                                                    <div key={colIdx} className="flex flex-col" style={{ gap: '0.5px' }}>
                                                                        {Array.from({ length: 10 }, (_, num) => (
                                                                            <div 
                                                                                key={num} 
                                                                                className="print-bubble w-[10px] h-[10px] border rounded-full flex items-center justify-center text-[6px] font-bold"
                                                                                style={{ borderColor: boardColor, color: boardColor }}
                                                                            >
                                                                                {optionLanguage === 'bn' ? toBnNumeral(num) : num}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Subject Code grid */}
                                                    {includeSubjectGrid && (
                                                        <div className="border flex flex-col items-center rounded overflow-hidden shrink-0" style={{ borderColor: boardColor }}>
                                                            <div className="text-[8.5px] font-black text-center py-0.5 border-b w-full font-noto" style={{ borderColor: boardColor, color: boardColor, backgroundColor: boardThemeColor === 'red' ? '#fff5f4' : '#f8fafc' }}>
                                                                {t('omr_gen_board_sub_code')}
                                                            </div>
                                                            <div className="flex border-b" style={{ borderColor: boardColor }}>
                                                                {Array.from({ length: subjectDigitsBoard }).map((_, i) => (
                                                                    <div key={i} className="w-3.5 h-3.5 border-r last:border-r-0" style={{ borderColor: boardColor }} />
                                                                ))}
                                                            </div>
                                                            <div className="flex p-0.5 gap-[1px] bg-white">
                                                                {Array.from({ length: subjectDigitsBoard }).map((_, colIdx) => (
                                                                    <div key={colIdx} className="flex flex-col" style={{ gap: '0.5px' }}>
                                                                        {Array.from({ length: 10 }, (_, num) => (
                                                                            <div 
                                                                                key={num} 
                                                                                className="print-bubble w-[10px] h-[10px] border rounded-full flex items-center justify-center text-[6px] font-bold"
                                                                                style={{ borderColor: boardColor, color: boardColor }}
                                                                            >
                                                                                {optionLanguage === 'bn' ? toBnNumeral(num) : num}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>

                                        {/* Board Instructions / Footer Section */}
                                        <div className="w-full flex flex-col mt-auto" style={{ gap: '1.5px' }}>
                                            <div className="text-[9px] font-black font-noto tracking-wide" style={{ color: boardColor }}>
                                                {t('omr_gen_board_warning_seal')}
                                            </div>
                                            
                                            <div className="flex justify-center my-0.5">
                                                <span className="bg-[#e15b4c] text-white text-[8px] font-black px-4 py-0.5 rounded font-noto uppercase">{t('omr_gen_board_instructions')}</span>
                                            </div>

                                            {/* Correct / Incorrect SVG styles */}
                                            <div className="flex gap-4 items-center justify-center text-[8px] py-0.5 border border-slate-200 rounded bg-slate-50 font-noto select-none w-full">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-extrabold">{t('omr_gen_correct_method')}</span>
                                                    <span className="w-3 h-3 rounded-full bg-black border border-black inline-block" />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold">{t('omr_gen_incorrect_method')}</span>
                                                    <span className="w-3 h-3 rounded-full border border-black inline-flex items-center justify-center relative font-mono text-[7px] font-bold">✖</span>
                                                    <span className="w-3 h-3 rounded-full border border-black inline-flex items-center justify-center relative text-[7px] font-bold">✓</span>
                                                    <span className="w-3 h-3 rounded-full border border-black inline-flex items-center justify-center relative"><span className="w-1.5 h-1.5 rounded-full bg-black" /></span>
                                                </div>
                                            </div>

                                            {/* Bengali list instruction */}
                                            <ul className="text-[8px] leading-relaxed text-slate-800 font-noto font-bold list-decimal pl-4.5 space-y-0.5">
                                                <li>{t('omr_gen_board_inst_1')}</li>
                                                <li>{t('omr_gen_board_inst_2')}</li>
                                                <li>{t('omr_gen_board_inst_3')}</li>
                                                <li>{t('omr_gen_board_inst_4')}</li>
                                                <li>{t('omr_gen_board_inst_5')}</li>
                                            </ul>
                                        </div>
                                    </>
                                ) : (
                                    /* ==================== MODERN QUIZ STYLE ==================== */
                                    <>
                                        {/* Top Header Section */}
                                        <div className="z-10 relative flex flex-col items-center w-full" style={{ gap: '6px' }}>
                                            <div className="text-center flex flex-col items-center w-full">
                                                {/* Institution Name Inline Editor */}
                                                <div style={{ marginBottom: '2px' }}>
                                                    {isEditingInst ? (
                                                        <input 
                                                            type="text" 
                                                            value={examDetails.instituteName}
                                                            onChange={(e) => setExamDetails({ ...examDetails, instituteName: e.target.value })}
                                                            onBlur={() => setIsEditingInst(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingInst(false)}
                                                            className="text-center text-lg font-bold border-b border-dashed border-emerald-500 outline-none w-full max-w-[480px] text-black bg-emerald-50 px-2 py-0.5"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h2 
                                                            onClick={() => setIsEditingInst(true)}
                                                            className="text-lg md:text-xl font-bold tracking-wide uppercase border-b-2 border-black pb-0.5 inline-block cursor-pointer hover:bg-slate-150 rounded px-1 border-dashed hover:border-slate-400 transition-all font-noto"
                                                            title={currentLang === 'bn' ? "প্রতিষ্ঠানের নাম এডিট করতে ক্লিক করুন" : "Click to edit institution name"}
                                                        >
                                                            {examDetails.instituteName}
                                                        </h2>
                                                    )}
                                                </div>

                                                {/* Exam Title Inline Editor */}
                                                <div style={{ marginBottom: '2px' }}>
                                                    {isEditingTitle ? (
                                                        <input 
                                                            type="text" 
                                                            value={examDetails.title}
                                                            onChange={(e) => setExamDetails({ ...examDetails, title: e.target.value })}
                                                            onBlur={() => setIsEditingTitle(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                                                            className="text-center text-xs font-bold border-b border-dashed border-emerald-500 outline-none w-full max-w-[400px] text-black bg-emerald-50 px-2 py-0.5"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3 
                                                            onClick={() => setIsEditingTitle(true)}
                                                            className="text-sm font-bold text-slate-800 cursor-pointer hover:bg-slate-150 rounded px-1.5 py-0.5 border-dashed hover:border-slate-400 transition-all inline-block font-noto"
                                                            title={currentLang === 'bn' ? "পরীক্ষার নাম এডিট করতে ক্লিক করুন" : "Click to edit exam name"}
                                                        >
                                                            {examDetails.title}
                                                        </h3>
                                                    )}
                                                </div>

                                                {/* Exam Subject & Class Inline Row */}
                                                <p className="text-[11px] font-bold text-slate-655 flex items-center justify-center gap-1 font-noto">
                                                    <span>{t('omr_gen_subject')}:</span>
                                                    {isEditingSub ? (
                                                        <input 
                                                            type="text" 
                                                            value={examDetails.subjectName}
                                                            onChange={(e) => setExamDetails({ ...examDetails, subjectName: e.target.value })}
                                                            onBlur={() => setIsEditingSub(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingSub(false)}
                                                            className="border-b border-dashed border-emerald-500 outline-none text-black bg-emerald-50 px-1 w-24 text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span onClick={() => setIsEditingSub(true)} className="text-black cursor-pointer hover:bg-slate-150 px-1 rounded border-dashed hover:border-slate-450">{examDetails.subjectName}</span>
                                                    )}
                                                    <span className="mx-1">|</span>
                                                    
                                                    <span>{t('omr_gen_class')}:</span>
                                                    {isEditingClass ? (
                                                        <input 
                                                            type="text" 
                                                            value={examDetails.className}
                                                            onChange={(e) => setExamDetails({ ...examDetails, className: e.target.value })}
                                                            onBlur={() => setIsEditingClass(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingClass(false)}
                                                            className="border-b border-dashed border-emerald-500 outline-none text-black bg-emerald-50 px-1 w-20 text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span onClick={() => setIsEditingClass(true)} className="text-black cursor-pointer hover:bg-slate-150 px-1 rounded border-dashed hover:border-slate-450">{examDetails.className}</span>
                                                    )}
                                                    <span className="mx-1">|</span>

                                                    <span>{t('omr_gen_total_marks_label')}</span>
                                                    {isEditingMarks ? (
                                                        <input 
                                                            type="number" 
                                                            value={examDetails.totalMarks}
                                                            onChange={(e) => setExamDetails({ ...examDetails, totalMarks: Number(e.target.value) })}
                                                            onBlur={() => setIsEditingMarks(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingMarks(false)}
                                                            className="border-b border-dashed border-emerald-500 outline-none text-black bg-emerald-50 px-1 w-14 text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span onClick={() => setIsEditingMarks(true)} className="text-black cursor-pointer hover:bg-slate-150 px-1 rounded border-dashed hover:border-slate-450">{examDetails.totalMarks}</span>
                                                    )}
                                                    
                                                    <span className="mx-1">|</span>
                                                    
                                                    <span>{t('omr_gen_duration_label')}</span>
                                                    {isEditingDur ? (
                                                        <input 
                                                            type="text" 
                                                            value={examDetails.examDuration}
                                                            onChange={(e) => setExamDetails({ ...examDetails, examDuration: e.target.value })}
                                                            onBlur={() => setIsEditingDur(false)}
                                                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingDur(false)}
                                                            className="border-b border-dashed border-emerald-500 outline-none text-black bg-emerald-50 px-1 w-24 text-center"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span onClick={() => setIsEditingDur(true)} className="text-black cursor-pointer hover:bg-slate-150 px-1 rounded border-dashed hover:border-slate-450">{examDetails.examDuration}</span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Student Info Box */}
                                            <div className={`grid grid-cols-12 gap-3 border-2 ${currentTheme.primary} p-2.5 rounded-lg bg-slate-50/40 relative z-10 print-border w-full`}>
                                                
                                                {/* Selected Fields Area */}
                                                <div className="col-span-8 space-y-1.5 text-[10px] font-noto">
                                                    {sheetType === 'PERSONALIZED' ? (
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-bold">
                                                            {studentNameEnabled && (
                                                                <div>
                                                                    <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_student_name')}:</span>
                                                                    <span className="text-black">{studentInfo.name}</span>
                                                                </div>
                                                            )}
                                                            {rollNumberEnabled && (
                                                                <div>
                                                                    <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_roll')}:</span>
                                                                    <span className="text-black">{studentInfo.roll}</span>
                                                                </div>
                                                            )}
                                                            {classSectionEnabled && (
                                                                <div>
                                                                    <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_class_sec')}:</span>
                                                                    <span className="text-black">{examDetails.className} ({studentInfo.section})</span>
                                                                </div>
                                                            )}
                                                            {studentIdEnabled && (
                                                                <div>
                                                                    <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_student_id')}:</span>
                                                                    <span className="font-mono text-black text-[11px]">{studentInfo.studentId}</span>
                                                                </div>
                                                            )}
                                                            {examDateEnabled && (
                                                                <div className="col-span-2">
                                                                    <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_exam_date')}:</span>
                                                                    <span className="text-black">{examDetails.examDate}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* Generic sheet empty fields to fill */
                                                        <div className="space-y-1.5">
                                                            <div className="flex gap-4">
                                                                {studentNameEnabled && (
                                                                    <div className="flex-1">
                                                                        <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_student_name')}:</span>
                                                                        <div className="border-b border-black h-4.5 w-full"></div>
                                                                    </div>
                                                                )}
                                                                {classSectionEnabled && (
                                                                    <div className="w-[100px]">
                                                                        <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{currentLang === 'bn' ? 'শাখা:' : 'Section:'}</span>
                                                                        <div className="border-b border-black h-4.5 w-full"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-4">
                                                                {studentIdEnabled && (
                                                                    <div className="flex-1">
                                                                        <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_field_student_id')}:</span>
                                                                        <div className="border-b border-black h-4.5 w-full"></div>
                                                                    </div>
                                                                )}
                                                                {examDateEnabled && (
                                                                    <div className="w-[120px]">
                                                                        <span className="text-slate-500 font-extrabold block text-[8px] uppercase print-text">{t('omr_gen_date_label')}</span>
                                                                        <div className="border-b border-black h-4.5 w-full"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] text-red-655 font-bold leading-tight mt-0.5">
                                                                {t('omr_gen_generic_warning')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* QR Code / Roll Grid / Set Code column */}
                                                <div className="col-span-4 flex items-center justify-end gap-2.5">
                                                    
                                                    {/* Set Code selection box (if checked) */}
                                                    {includeSetCode && (
                                                        <div className={`border ${currentTheme.primary} p-1 bg-white rounded flex flex-col items-center print-border shrink-0`}>
                                                            <span className="block text-[8px] font-black text-center mb-0.5 uppercase tracking-wide print-text">{currentLang === 'bn' ? 'সেট' : 'Set'}</span>
                                                            <div className="flex flex-col gap-0.5">
                                                                {['A', 'B', 'C', 'D'].map(set => {
                                                                    const isPrefilled = sheetType === 'PERSONALIZED' && selectedSetCode === set;
                                                                    return (
                                                                        <div 
                                                                            key={set} 
                                                                            data-prefilled={isPrefilled ? "true" : "false"}
                                                                            className={`print-bubble w-4 h-4 border rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                                                                                isPrefilled 
                                                                                    ? `${currentTheme.bg} text-white` 
                                                                                    : `${currentTheme.primary} bg-white hover:bg-slate-50 cursor-pointer`
                                                                            } print-border`}
                                                                        >
                                                                            {set}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Personalized QR Code or Generic Roll Grid */}
                                                    {sheetType === 'PERSONALIZED' ? (
                                                        <div className="text-center flex flex-col items-center shrink-0">
                                                            <img src={qrCodeUrl} alt="QR Code" className="w-14 h-14 border border-slate-300 rounded p-0.5 bg-white" />
                                                            <span className="text-[6.5px] font-extrabold font-mono tracking-widest text-slate-500 mt-1">OMR DATA KEY</span>
                                                        </div>
                                                    ) : (
                                                        /* Generic Roll Number Bubble Grid */
                                                        <div className={`border ${currentTheme.primary} p-1 bg-white rounded print-border shrink-0`}>
                                                            <span className="block text-[7.5px] font-black text-center mb-0.5 uppercase tracking-wide print-text font-noto">{currentLang === 'bn' ? 'রোল নম্বর' : 'Roll No'}</span>
                                                            <div className="flex gap-0.5">
                                                                {Array.from({ length: rollDigits }).map((_, digitIndex) => (
                                                                    <div key={digitIndex} className="flex flex-col gap-0.5">
                                                                        <div className="w-3.5 h-3.5 border border-slate-400 font-extrabold text-[8px] flex items-center justify-center bg-slate-50"></div>
                                                                        {Array.from({ length: 10 }, (_, num) => (
                                                                            <div 
                                                                                key={num} 
                                                                                className={`print-bubble w-[11px] h-[11px] border ${currentTheme.primary} rounded-full flex items-center justify-center text-[7px] font-bold text-slate-700 print-border`}
                                                                            >
                                                                                {num}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>
                                            </div>
                                        </div>

                                        {/* MCQ Answer Sheet Grid */}
                                        <div className="my-2 flex-1 flex flex-col justify-center z-10 relative w-full" style={{ minHeight: '100px' }}>
                                            <div className="flex gap-x-8 justify-between w-full">
                                                {columnsArray.map(colIdx => {
                                                    const colQuestions = questionsArray.slice(colIdx * questionsPerCol, (colIdx + 1) * questionsPerCol);
                                                    
                                                    return (
                                                        <div key={colIdx} className="flex-1 flex flex-col">
                                                            {colQuestions.map((qNum, qIndex) => (
                                                                <div 
                                                                    key={qNum} 
                                                                    style={{ marginTop: qIndex > 0 ? getDensityMargin(rowDensity) : '0px' }}
                                                                    className="flex items-center justify-start"
                                                                >
                                                                    <span 
                                                                        style={{ width: labelWidth }}
                                                                        className="text-right font-bold text-[11px] text-slate-700 print-text pr-1.5 font-mono"
                                                                    >
                                                                        {optionLanguage === 'bn' ? toBnNumeral(qNum) : qNum.toString().padStart(2, '0')}.
                                                                    </span>

                                                                    <div 
                                                                        className="flex" 
                                                                        style={{ gap: bubbleSize === 'small' ? '4px' : bubbleSize === 'large' ? '8px' : '6px' }}
                                                                    >
                                                                        {optionsArray.map(optIdx => (
                                                                            <div 
                                                                                key={optIdx} 
                                                                                className={`print-bubble ${currentBubbleSize.bubble} border ${currentTheme.primary} rounded-full flex items-center justify-center font-bold cursor-pointer hover:bg-slate-100 transition-colors bg-white print-border print-text font-noto`}
                                                                            >
                                                                                {getOptionLabel(optIdx)}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Examiner CQ Box */}
                                        {includeCqMarks && (
                                            <div className={`border-2 border-red-500/80 border-dashed p-2 rounded-lg bg-red-50/5 mt-2 relative z-10 print-border w-full`}>
                                                <span className="block text-[8.5px] font-black text-red-655 tracking-widest uppercase mb-1.5 text-center print-text font-noto">
                                                    {t('omr_gen_examiner_use_only')}
                                                </span>
                                                <div className="flex gap-2 justify-center w-full">
                                                    {cqsArray.map(cqNum => (
                                                        <div key={cqNum} className="flex-1 flex flex-col items-center border border-red-200/50 py-1 px-0.5 rounded bg-white shadow-sm print-border max-w-[55px]">
                                                            <span className="text-[8px] font-bold text-slate-655 mb-0.5 print-text font-mono">
                                                                {currentLang === 'bn' ? 'সৃজনশীল' : 'CQ'} {optionLanguage === 'bn' ? toBnNumeral(cqNum) : cqNum}
                                                            </span>
                                                            <div className="flex flex-col" style={{ gap: '1.5px' }}>
                                                                {Array.from({ length: cqMaxVal + 1 }, (_, mIdx) => (
                                                                    <div 
                                                                        key={mIdx} 
                                                                        className="print-bubble w-3.5 h-3.5 border border-red-400 rounded-full flex items-center justify-center text-[7px] font-bold text-red-500 cursor-pointer hover:bg-red-50 print-border"
                                                                    >
                                                                        {mIdx}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer & Signatures */}
                                        <div className="mt-2.5 relative z-10 w-full">
                                            {(studentSigEnabled || invigilatorSigEnabled) && (
                                                <div className="border-t border-dashed border-slate-300 pt-4 flex justify-between px-6 mb-2">
                                                    {studentSigEnabled && (
                                                        <div className="text-center w-[120px]">
                                                            <div className="border-t border-black w-full pt-0.5">
                                                                <span className="text-[8.5px] font-black text-slate-800 print-text font-noto">{t('omr_gen_student_sig_label')}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {invigilatorSigEnabled && (
                                                        <div className="text-center w-[120px]">
                                                            <div className="border-t border-black w-full pt-0.5">
                                                                <span className="text-[8.5px] font-black text-slate-800 print-text font-noto">{t('omr_gen_invigilator_sig_label')}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Bottom Footer Info Row */}
                                            <div className="border-t border-slate-300 pt-2 flex justify-between text-[8px] font-extrabold text-slate-400">
                                                <span className="print-text font-noto">QuestionShaper OMR System v2.0</span>
                                                <span className="font-mono print-text">{currentLang === 'bn' ? 'পরীক্ষা আইডি:' : 'Exam ID:'} {selectedExamId || "EX-MOCK-26"}</span>
                                                <span className="print-text font-noto">{currentLang === 'bn' ? 'পৃষ্ঠা ১ এর ১' : 'Page 1 of 1'}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OmrTemplateGenerator;
