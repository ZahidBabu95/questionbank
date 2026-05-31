import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, LayoutGrid, ChevronRight, ChevronLeft, CheckCircle2, Target, BookOpen, ChevronDown, ChevronUp, Loader2, ListChecks, BrainCircuit, AlertCircle } from 'lucide-react';
import academicService from '../../../services/academicService';
import examService from '../../../services/examService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import axios from '../../../utils/axios';

const AutoExamGenerator = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const {
        levels, streams, classes, subjects, chapters,
        levelId, streamId, classId, subjectId,
        setLevelId, setStreamId, setClassId, setSubjectId,
        restoreHierarchy
    } = useAcademicHierarchy({ activeOnly: true });

    const location = useLocation();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin' || user?.email?.includes('admin@');
    const hasFullLangAccess = isSuperAdmin || user?.instituteName === 'DEFAULT';

    const [examInfo, setExamInfo] = useState({
        title: '',
        duration: 120,
        language: (user?.instituteMedium && user.instituteMedium.includes(',')) ? 'Bangla' : (user?.instituteMedium || 'Bangla'),
        examType: 'MODEL_TEST'
    });

    const [availableCounts, setAvailableCounts] = useState({ chapters: {}, topics: {} });
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    const [bloomDistribution, setBloomDistribution] = useState({
        knowledge: 40,
        comprehension: 30,
        application: 20,
        higherOrder: 10
    });

    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [newTemplateName, setNewTemplateName] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    const availableLanguages = React.useMemo(() => {
        const langs = [];
        if (hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bangla') || user.instituteMedium.includes('Bilingual')) {
            langs.push('Bangla');
        }
        if (hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('English') || user.instituteMedium.includes('Bilingual')) {
            langs.push('English');
        }
        if (hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bilingual')) {
            langs.push('Bilingual');
        }
        return langs;
    }, [hasFullLangAccess, user?.instituteMedium]);

    const getAvailableCount = (id, type, isChapter = true) => {
        const pool = isChapter ? availableCounts.chapters : availableCounts.topics;
        const typePool = pool[id]?.[type] || {};
        return Object.values(typePool).reduce((a, b) => a + b, 0);
    };



    // Auto-select Language if there's only one option
    useEffect(() => {
        if (availableLanguages.length === 1 && examInfo.language !== availableLanguages[0]) {
            setExamInfo(prev => ({ ...prev, language: availableLanguages[0] }));
        }
    }, [availableLanguages, examInfo.language]);

    // Fetch availability counters when subject or language changes
    useEffect(() => {
        if (subjectId) {
            const fetchAvailability = async () => {
                setLoadingAvailability(true);
                try {
                    const { data } = await axios.get(`/v1/questions/availability?classSubjectId=${subjectId}&language=${examInfo.language}`);
                    if (data) {
                        setAvailableCounts({
                            chapters: data.chapters || {},
                            topics: data.topics || {}
                        });
                    }
                } catch (e) {
                    console.error("Failed to fetch question availability", e);
                } finally {
                    setLoadingAvailability(false);
                }
            };
            fetchAvailability();
        } else {
            setAvailableCounts({ chapters: {}, topics: {} });
        }
    }, [subjectId, examInfo.language]);

    // Fetch blueprint templates on mount
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const res = await examService.getTemplates();
                if (res) {
                    setTemplates(Array.isArray(res) ? res : (res.data || []));
                }
            } catch (e) {
                console.error("Failed to fetch templates", e);
            } finally {
                setLoadingTemplates(false);
            }
        };
        fetchTemplates();
    }, []);

    // Reverted frontend auto-filtering logic per user request to allow simple database-driven dropdown mapping

    useEffect(() => {
        if (location.state?.prefill && !subjectId) {
            const prefill = location.state.prefill;
            const resolveHierarchyAndRestore = async () => {
                try {
                    const { data } = await axios.get(`/v1/academic/class-subjects/${prefill.subjectId}/hierarchy`);
                    
                    if (data && data.levelId) {
                        restoreHierarchy({
                            levelId: data.levelId,
                            streamId: data.streamId,
                            classId: data.classId,
                            classSubjectId: data.classSubjectId,
                            chapterId: prefill.chapterId || ''
                        });

                        setExamInfo(prev => ({ ...prev, title: prefill.title }));
                        
                        if (prefill.difficulty) {
                            if (prefill.difficulty === 'Easy') setDifficulty({ easy: 50, medium: 40, hard: 10 });
                            if (prefill.difficulty === 'Medium') setDifficulty({ easy: 30, medium: 50, hard: 20 });
                            if (prefill.difficulty === 'Hard') setDifficulty({ easy: 20, medium: 30, hard: 50 });
                        }
                        
                        setStep(2);
                    }
                } catch (e) {
                    console.error("Failed to auto-restore hierarchy from prefill", e);
                }
            };
            resolveHierarchyAndRestore();
        }
    }, [location.state]);

    const [dynamicSections, setDynamicSections] = useState([]);
    const [userStructure, setUserStructure] = useState({});
    const [loadingBlueprint, setLoadingBlueprint] = useState(false);
    
    // Syllabus Allocation State
    // Format: { chapterId: { MCQ: 5, CQ: 2 }, topicId: { MCQ: 2, CQ: 0 } }
    const [allocations, setAllocations] = useState({});
    const [expandedChapters, setExpandedChapters] = useState([]);
    const [chapterTopics, setChapterTopics] = useState({}); // { chId: [topics] }
    const [topicsLoading, setTopicsLoading] = useState({});

    const [difficulty, setDifficulty] = useState({ easy: 30, medium: 50, hard: 20 });

    const [expandedCategories, setExpandedCategories] = useState([]);

    // Group chapters by category
    const groupedChapters = React.useMemo(() => {
        const groups = {};
        chapters.forEach(ch => {
            const cat = ch.categoryName || 'অন্যান্য';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(ch);
        });
        return groups;
    }, [chapters]);

    // Initialize expanded categories when chapters load
    useEffect(() => {
        if (chapters.length > 0) {
            const categories = [...new Set(chapters.map(ch => ch.categoryName || 'অন্যান্য'))];
            setExpandedCategories(categories);
        }
    }, [chapters]);

    const toggleCategoryExpand = (categoryName) => {
        if (expandedCategories.includes(categoryName)) {
            setExpandedCategories(expandedCategories.filter(cat => cat !== categoryName));
        } else {
            setExpandedCategories([...expandedCategories, categoryName]);
        }
    };

    const getCategoryStyles = (category) => {
        switch (category) {
            case 'গদ্য':
                return {
                    border: 'border-emerald-200',
                    bg: 'bg-emerald-50/50',
                    text: 'text-emerald-800',
                    badge: 'bg-emerald-100 text-emerald-700',
                    accent: 'from-emerald-500 to-teal-600',
                    iconBg: 'bg-emerald-100 text-emerald-600',
                    sidebar: 'border-l-emerald-500'
                };
            case 'পদ্য':
            case 'কবিতা':
                return {
                    border: 'border-rose-200',
                    bg: 'bg-rose-50/50',
                    text: 'text-rose-800',
                    badge: 'bg-rose-100 text-rose-700',
                    accent: 'from-rose-500 to-pink-600',
                    iconBg: 'bg-rose-100 text-rose-600',
                    sidebar: 'border-l-rose-500'
                };
            case 'উপন্যাস':
            case 'সহপাঠ':
                return {
                    border: 'border-violet-200',
                    bg: 'bg-violet-50/50',
                    text: 'text-violet-800',
                    badge: 'bg-violet-100 text-violet-700',
                    accent: 'from-violet-500 to-purple-600',
                    iconBg: 'bg-violet-100 text-violet-600',
                    sidebar: 'border-l-violet-500'
                };
            case 'নাটক':
                return {
                    border: 'border-amber-200',
                    bg: 'bg-amber-50/50',
                    text: 'text-amber-800',
                    badge: 'bg-amber-100 text-amber-700',
                    accent: 'from-amber-500 to-orange-600',
                    iconBg: 'bg-amber-100 text-amber-600',
                    sidebar: 'border-l-amber-500'
                };
            case 'অন্যান্য':
                return {
                    border: 'border-slate-200',
                    bg: 'bg-slate-50/50',
                    text: 'text-slate-800',
                    badge: 'bg-slate-100 text-slate-700',
                    accent: 'from-slate-500 to-slate-600',
                    iconBg: 'bg-slate-100 text-slate-600',
                    sidebar: 'border-l-slate-500'
                };
            default:
                // Generate a stable color scheme based on category name hash
                let hash = 0;
                if (category) {
                    for (let i = 0; i < category.length; i++) {
                        hash = category.charCodeAt(i) + ((hash << 5) - hash);
                    }
                }
                const colorPalettes = [
                    {
                        border: 'border-indigo-200',
                        bg: 'bg-indigo-50/50',
                        text: 'text-indigo-800',
                        badge: 'bg-indigo-100 text-indigo-700',
                        accent: 'from-indigo-500 to-blue-600',
                        iconBg: 'bg-indigo-100 text-indigo-600',
                        sidebar: 'border-l-indigo-500'
                    },
                    {
                        border: 'border-teal-200',
                        bg: 'bg-teal-50/50',
                        text: 'text-teal-800',
                        badge: 'bg-teal-100 text-teal-700',
                        accent: 'from-teal-500 to-emerald-600',
                        iconBg: 'bg-teal-100 text-teal-600',
                        sidebar: 'border-l-teal-500'
                    },
                    {
                        border: 'border-sky-200',
                        bg: 'bg-sky-50/50',
                        text: 'text-sky-800',
                        badge: 'bg-sky-100 text-sky-700',
                        accent: 'from-sky-500 to-blue-500',
                        iconBg: 'bg-sky-100 text-sky-600',
                        sidebar: 'border-l-sky-500'
                    },
                    {
                        border: 'border-orange-200',
                        bg: 'bg-orange-50/50',
                        text: 'text-orange-800',
                        badge: 'bg-orange-100 text-orange-700',
                        accent: 'from-orange-500 to-amber-600',
                        iconBg: 'bg-orange-100 text-orange-600',
                        sidebar: 'border-l-orange-500'
                    },
                    {
                        border: 'border-pink-200',
                        bg: 'bg-pink-50/50',
                        text: 'text-pink-800',
                        badge: 'bg-pink-100 text-pink-700',
                        accent: 'from-pink-500 to-rose-600',
                        iconBg: 'bg-pink-100 text-pink-600',
                        sidebar: 'border-l-pink-500'
                    }
                ];
                const index = Math.abs(hash) % colorPalettes.length;
                return colorPalettes[index];
        }
    };

    // Calculate Targets
    const targetTotals = Object.entries(userStructure).reduce((acc, [type, struct]) => {
        const count = parseInt(struct.count) || 0;
        const marks = parseFloat(struct.marks) || 1;
        acc.qs += count;
        acc.marks += (count * marks);
        acc[type] = count;
        return acc;
    }, { qs: 0, marks: 0 });

    // Calculate Allocated
    const allocatedTotals = Object.values(allocations).reduce((acc, counts) => {
        Object.entries(counts).forEach(([type, count]) => {
            if (!acc[type]) acc[type] = 0;
            acc[type] += (parseInt(count) || 0);
            acc.total += (parseInt(count) || 0);
        });
        return acc;
    }, { total: 0 });

    // Fetch Schema when subject changes
    useEffect(() => {
        if (subjectId) fetchSchema();
        else { setDynamicSections([]); setUserStructure({}); }
    }, [subjectId]);

    // Dynamic Main Header updates to prevent double-headers
    useEffect(() => {
        if (step === 2) {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: 'Auto Exam Generator',
                    subtitle: 'Syllabus Allocation'
                }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: 'Auto Exam Generator',
                    subtitle: 'Exam Configuration'
                }
            }));
        }
        return () => {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
        };
    }, [step]);

    const fetchSchema = async () => {
        setLoadingBlueprint(true);
        try {
            const selectedSubjectObj = subjects.find(s => s.classSubjectId == subjectId);
            const selectedClassName = classes.find(c => c.id == classId)?.name;
            if (selectedSubjectObj?.subjectName) {
                const cleanSubjectName = selectedSubjectObj.subjectName.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const subTag = 'RULE_FOR_' + cleanSubjectName.replace(/\s/g, '');
                const altTag = cleanSubjectName;
                const origSubTag = 'RULE_FOR_' + selectedSubjectObj.subjectName.replace(/\s/g, '');
                const origAltTag = selectedSubjectObj.subjectName;

                const kbRes = await axios.get('/v1/support/knowledge');
                let validRules = [
                    ...kbRes.data.filter(k => k.tags && (
                        k.tags.includes(subTag) || 
                        k.tags.includes(altTag) || 
                        k.tags.includes(origSubTag) || 
                        k.tags.includes(origAltTag)
                    )), 
                    ...kbRes.data.filter(k => k.content && (
                        k.content.includes(cleanSubjectName) || 
                        k.content.includes(selectedSubjectObj.subjectName)
                    ))
                ];
                validRules = validRules.filter(k => {
                    try { const p = JSON.parse(k.content); return Array.isArray(p) || (p && p.generation_blueprint); } catch(e) { return false; }
                });

                if (validRules.length > 0) {
                    const matchedRule = validRules.find(r => (r.tags && r.tags.includes(selectedClassName)) || (r.content && r.content.includes(selectedClassName))) || validRules[0];
                    const schemaObj = JSON.parse(matchedRule.content);
                    let sections = [];
                    let initialStruct = {};

                    if (Array.isArray(schemaObj)) {
                        const uniqueTypes = [...new Set(schemaObj.map(r => r.questionType))];
                        sections = uniqueTypes.map(t => {
                            const rule = schemaObj.find(r => r.questionType === t);
                            let tName = t === 'MULTIPLE_CHOICE' ? 'MCQ' : t === 'CREATIVE' ? 'CQ' : t === 'SHORT_ANSWER' ? 'SHORT' : t;
                            return { name: rule.sectionName || tName, type: tName };
                        });
                        schemaObj.forEach(r => {
                            let t = r.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : r.questionType === 'CREATIVE' ? 'CQ' : r.questionType === 'SHORT_ANSWER' ? 'SHORT' : r.questionType;
                            initialStruct[t] = { count: 0, marks: r.marks || 1 };
                        });
                    } else {
                        sections = schemaObj.generation_blueprint?.mandatory_sections || [];
                        (schemaObj.scraping_rules || []).forEach(r => {
                            let t = r.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : r.questionType === 'CREATIVE' ? 'CQ' : r.questionType === 'SHORT_ANSWER' ? 'SHORT' : r.questionType;
                            initialStruct[t] = { count: r.totalQuestions || 0, marks: r.marks || 1 };
                        });
                        sections.forEach(sec => { 
                            if (!initialStruct[sec.type]) {
                                initialStruct[sec.type] = { count: sec.question_count || 0, marks: 1 };
                            } else if (sec.question_count && initialStruct[sec.type].count === 0) {
                                initialStruct[sec.type].count = sec.question_count;
                            }
                        });
                    }
                    if (location.state?.prefill) {
                        const prefill = location.state.prefill;
                        // Overwrite userStructure with custom qsCount if provided
                        if (prefill.qsCount && prefill.qsCount > 0) {
                            const mainType = initialStruct['MCQ'] ? 'MCQ' : Object.keys(initialStruct)[0];
                            if (mainType) {
                                Object.keys(initialStruct).forEach(k => {
                                    initialStruct[k].count = 0; // Reset others
                                });
                                initialStruct[mainType].count = prefill.qsCount;
                            }
                        }
                    }

                    setDynamicSections(sections);
                    setUserStructure(initialStruct);

                    // Auto-allocate if specific chapter is provided in prefill
                    if (location.state?.prefill?.chapterId) {
                        const cId = location.state.prefill.chapterId;
                        const mainType = initialStruct['MCQ'] ? 'MCQ' : Object.keys(initialStruct)[0];
                        if (mainType && initialStruct[mainType]?.count > 0) {
                            setAllocations({
                                [cId]: { [mainType]: initialStruct[mainType].count }
                            });
                            // Auto expand that chapter
                            setExpandedChapters([cId]);
                        }
                    }
                } else setDynamicSections([]);
            }
        } catch (e) { console.error(e); } finally { setLoadingBlueprint(false); }
    };

    const activeSections = dynamicSections.filter(sec => (parseInt(userStructure[sec.type]?.count) || 0) > 0);

    const toggleChapterExpand = async (chapterId) => {
        if (expandedChapters.includes(chapterId)) {
            setExpandedChapters(expandedChapters.filter(id => id !== chapterId));
        } else {
            setExpandedChapters([...expandedChapters, chapterId]);
            if (!chapterTopics[chapterId]) {
                setTopicsLoading({ ...topicsLoading, [chapterId]: true });
                try {
                    const tops = await academicService.getTopicsByChapter(chapterId);
                    setChapterTopics({ ...chapterTopics, [chapterId]: tops });
                } catch (e) { console.error(e); } finally {
                    setTopicsLoading({ ...topicsLoading, [chapterId]: false });
                }
            }
        }
    };

    const handleAllocationChange = (id, type, value) => {
        const num = parseInt(value) || 0;
        setAllocations(prev => ({
            ...prev,
            [id]: { ...prev[id], [type]: num }
        }));
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateName.trim()) {
            return alert("Please enter a template name.");
        }
        setSavingTemplate(true);
        try {
            const structure = {
                difficulty,
                bloomDistribution,
                userStructure
            };
            const payload = {
                templateName: newTemplateName.trim(),
                isGlobal: isSuperAdmin,
                structureJson: JSON.stringify(structure),
                docSettingsJson: "{}"
            };
            const res = await examService.createTemplate(payload);
            if (res) {
                alert("Template saved successfully!");
                setNewTemplateName('');
                const freshRes = await examService.getTemplates();
                setTemplates(Array.isArray(freshRes) ? freshRes : (freshRes.data || []));
            }
        } catch (e) {
            console.error("Failed to save template", e);
            alert("Failed to save template: " + (e.response?.data?.message || e.message));
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleTemplateChange = (templateId) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;

        const selected = templates.find(t => t.id === templateId);
        if (selected && selected.structureJson) {
            try {
                const parsed = JSON.parse(selected.structureJson);
                if (parsed.difficulty) {
                    setDifficulty(parsed.difficulty);
                }
                if (parsed.bloomDistribution) {
                    setBloomDistribution(parsed.bloomDistribution);
                }
                if (parsed.userStructure) {
                    setUserStructure(prev => {
                        const merged = { ...prev };
                        Object.keys(parsed.userStructure).forEach(k => {
                            if (merged[k]) {
                                merged[k] = { ...merged[k], ...parsed.userStructure[k] };
                            }
                        });
                        return merged;
                    });
                }
            } catch (e) {
                console.error("Failed to parse template structure", e);
                alert("Failed to parse template structure.");
            }
        }
    };

    const handleGenerate = async () => {
        if (targetTotals.qs === 0) return alert("Total questions must be greater than 0.");
        
        // Ensure difficulty is 100
        if (difficulty.easy + difficulty.medium + difficulty.hard !== 100) {
            return alert("Difficulty percentages must equal exactly 100%.");
        }

        // Ensure Bloom's distribution is 100
        if (bloomDistribution.knowledge + bloomDistribution.comprehension + bloomDistribution.application + bloomDistribution.higherOrder !== 100) {
            return alert("Bloom's Taxonomy percentages must equal exactly 100%.");
        }

        // Collect selected chapters/topics from allocations
        const selectedChapterIds = [];
        const selectedTopicIds = [];
        Object.entries(allocations).forEach(([id, counts]) => {
            const hasAllocation = Object.values(counts).some(v => v > 0);
            if (hasAllocation) {
                if (chapters.find(c => c.id === id)) selectedChapterIds.push(id);
                else selectedTopicIds.push(id);
            }
        });

        if (selectedChapterIds.length === 0 && selectedTopicIds.length === 0) {
            return alert("Please allocate at least one question from the syllabus chapters/topics.");
        }

        // Pre-flight availability check
        let validationError = false;
        Object.entries(allocations).forEach(([id, counts]) => {
            Object.entries(counts).forEach(([type, count]) => {
                const num = parseInt(count) || 0;
                if (num > 0) {
                    const isChapter = chapters.some(c => c.id === id);
                    const avail = getAvailableCount(id, type, isChapter);
                    if (num > avail) {
                        validationError = true;
                    }
                }
            });
        });

        if (validationError) {
            return alert("One or more allocations exceed the available questions in the bank. Please adjust allocations before generating.");
        }

        setLoading(true);
        try {
            let qTypes = [];
            Object.entries(userStructure).forEach(([type, struct]) => {
                const count = parseInt(struct.count) || 0;
                if (count > 0) {
                    qTypes.push({
                        questionType: type,
                        count: count,
                        marksPerQuestion: parseFloat(struct.marks) || 1
                    });
                }
            });

            const res = await examService.generateExam({
                title: examInfo.title,
                examType: examInfo.examType,
                classSubjectId: subjectId,
                totalMarks: targetTotals.marks,
                totalQuestions: targetTotals.qs,
                durationMinutes: parseInt(examInfo.duration),
                language: examInfo.language,
                instructions: "",
                instituteName: JSON.parse(localStorage.getItem('user') || '{}').instituteName || "",
                headerText: "",
                shuffleQuestions: true,
                shuffleOptions: true,
                chapterIds: selectedChapterIds.length > 0 ? selectedChapterIds : undefined, 
                topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
                easyPercent: difficulty.easy,
                mediumPercent: difficulty.medium,
                hardPercent: difficulty.hard,
                knowledgePercent: bloomDistribution.knowledge,
                comprehensionPercent: bloomDistribution.comprehension,
                applicationPercent: bloomDistribution.application,
                higherOrderPercent: bloomDistribution.higherOrder,
                questionTypeRules: qTypes
            });

            if (res.success) {
                const searchParams = new URLSearchParams(window.location.search);
                const embedded = searchParams.get('embedded') === 'true' || sessionStorage.getItem('embedded') === 'true';
                navigate(`/exams/generate/nexus-editor/${res.data.id}${embedded ? '?embedded=true' : ''}`);
            } else {
                alert(res.message || "Failed to generate exam.");
            }
        } catch (e) {
            console.error("Generate API Error:", e);
            const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || "Unknown API Error";
            alert(`API Error: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // --- UI HELPERS ---
    const selectCls = "w-full bg-white/50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all disabled:opacity-40 hover:border-slate-300";
    const inputCls = "w-full bg-white/50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all hover:border-slate-300";

    return (
        <div className="min-h-screen bg-slate-50 font-outfit pb-24">

            <div className="max-w-[1600px] w-full mx-auto p-4 md:p-8">
                
                {/* Stepper Progress Indicator at the top center of the page */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-6 py-3 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-violet-600' : 'text-slate-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${step === 1 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>1</div>
                            <span className="text-xs font-black uppercase tracking-wider">Config</span>
                        </div>
                        <div className="w-8 h-0.5 bg-slate-200"></div>
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-violet-600' : 'text-slate-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${step === 2 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2</div>
                            <span className="text-xs font-black uppercase tracking-wider">Syllabus</span>
                        </div>
                    </div>
                </div>

                {/* STEP 1: CONFIGURATION & STRUCTURE */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* LEFT: Basic Info */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6">
                                        <LayoutGrid className="text-violet-500" /> Exam Configuration
                                    </h2>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Exam Title</label>
                                            <input type="text" value={examInfo.title} onChange={e => setExamInfo({...examInfo, title: e.target.value})} className={inputCls} placeholder="e.g. Final Term Examination - 2026" />
                                        </div>


                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {levels.length > 1 && (
                                                <div>
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Level</label>
                                                    <select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}>
                                                        <option value="">Select Level</option>
                                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {!(levelId && streams.length === 1) && (
                                                <div>
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Stream</label>
                                                    <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}>
                                                        <option value="">Select Stream</option>
                                                        {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {!(streamId && classes.length === 1) && (
                                                <div>
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Class</label>
                                                    <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}>
                                                        <option value="">Select Class</option>
                                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Subject</label>
                                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}>
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                                </select>
                                            </div>
                                            {availableLanguages.length > 1 && (
                                                <div>
                                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Language</label>
                                                    <select value={examInfo.language} onChange={e => setExamInfo({...examInfo, language: e.target.value})} disabled={!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual')} className={selectCls + (!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual') ? ' opacity-50' : '')}>
                                                        {availableLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Duration (Min)</label>
                                                <input type="number" value={examInfo.duration} onChange={e => setExamInfo({...examInfo, duration: e.target.value})} className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Blueprint Structure */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 rounded-bl-full -mr-10 -mt-10 opacity-50 z-0"></div>
                                    
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
                                            <Target className="text-violet-500" /> Blueprint Target
                                        </h2>
                                        {subjectId && (
                                            <div className="text-xs font-black text-violet-600 bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5 mb-4 inline-flex items-center gap-1.5 shadow-sm">
                                                <BookOpen size={12} className="text-violet-500" />
                                                Subject: {subjects.find(s => s.classSubjectId == subjectId)?.subjectName}
                                            </div>
                                        )}
                                        <p className="text-sm text-slate-500 mb-6 font-medium">Define structure to see allocation targets.</p>

                                        {loadingBlueprint ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-violet-500">
                                                <Loader2 size={32} className="animate-spin mb-3" />
                                                <span className="font-bold">Loading Structure...</span>
                                            </div>
                                        ) : !subjectId ? (
                                            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                Select a subject to load the blueprint.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {dynamicSections.map(sec => (
                                                    <div key={sec.type} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-violet-200 transition-all hover:shadow-sm">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="font-bold text-slate-800">{sec.name}</div>
                                                            <div className="text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-1 rounded uppercase">{sec.type}</div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target Qs</label>
                                                                <input type="number" min="0" value={userStructure[sec.type]?.count ?? ""} onChange={e => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], count: e.target.value }})} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-slate-700 outline-none focus:border-violet-500" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Marks/Q</label>
                                                                <input type="number" min="1" value={userStructure[sec.type]?.marks ?? ""} onChange={e => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], marks: e.target.value }})} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-slate-700 outline-none focus:border-violet-500" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="mt-6 pt-6 border-t border-slate-100">
                                                    <div className="bg-slate-800 text-white rounded-2xl p-5 shadow-lg shadow-slate-800/20">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Assessment Target</div>
                                                        <div className="text-3xl font-black text-emerald-400">{targetTotals.marks} <span className="text-lg font-bold text-slate-300">Marks</span> / {targetTotals.qs} <span className="text-lg font-bold text-slate-300">Qs</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: SYLLABUS ALLOCATION */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Chapters & Topics List */}
                            <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
                                {chapters.length === 0 ? (
                                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">No chapters found for this subject.</div>
                                ) : (
                                    Object.entries(groupedChapters).map(([category, catChapters]) => {
                                        const isCatExpanded = expandedCategories.includes(category);
                                        const styles = getCategoryStyles(category);
                                        
                                        return (
                                            <div key={category} className={`bg-white rounded-2xl sm:rounded-[2rem] border ${styles.border} shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300`}>
                                                
                                                {/* Category Header */}
                                                <div 
                                                    onClick={() => toggleCategoryExpand(category)}
                                                    className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer select-none bg-gradient-to-r ${styles.bg} border-b ${styles.border} transition-colors duration-200 hover:bg-opacity-80 gap-3`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all bg-white shadow-sm shrink-0 ${styles.text}`}>
                                                            {isCatExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <h3 className={`text-base sm:text-lg font-black tracking-tight ${styles.text}`}>{category}</h3>
                                                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5">{catChapters.length}টি সক্রিয় অধ্যায়</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full ${styles.badge} shadow-sm self-start sm:self-auto`}>
                                                        {category} বিভাগ
                                                    </span>
                                                </div>

                                                {/* Category Chapters Container */}
                                                {isCatExpanded && (
                                                    <div className="p-6 space-y-4 bg-slate-50/20">
                                                        {catChapters.map(ch => {
                                                            const isExpanded = expandedChapters.includes(ch.id);
                                                            return (
                                                                <div key={ch.id} className={`bg-white rounded-2xl border border-slate-150 transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-violet-300 ring-4 ring-violet-500/5' : 'hover:border-slate-300'}`}>
                                                                    
                                                                    {/* Chapter Header */}
                                                                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50" onClick={() => toggleChapterExpand(ch.id)}>
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isExpanded ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <h4 className={`font-bold text-sm sm:text-base break-words ${isExpanded ? 'text-violet-900' : 'text-slate-700'}`}>{ch.name}</h4>
                                                                                {ch.chapterNumber && <p className="text-[10px] font-bold text-slate-400 uppercase">অধ্যায় {ch.chapterNumber}</p>}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Chapter Level Allocation */}
                                                                        <div className="flex gap-3 justify-start sm:justify-start w-full sm:w-auto pl-11 sm:pl-0" onClick={e => e.stopPropagation()}>
                                                                            {activeSections.map(sec => {
                                                                                const avail = getAvailableCount(ch.id, sec.type, true);
                                                                                const allocated = parseInt(allocations[ch.id]?.[sec.type]) || 0;
                                                                                const isExceeded = allocated > avail;
                                                                                
                                                                                return (
                                                                                    <div key={sec.type} className="flex flex-col items-center w-16">
                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{sec.type}</span>
                                                                                        <input 
                                                                                            type="number" 
                                                                                            min="0"
                                                                                            value={allocations[ch.id]?.[sec.type] || ''} 
                                                                                            onChange={(e) => handleAllocationChange(ch.id, sec.type, e.target.value)}
                                                                                            placeholder="0"
                                                                                            className={`w-full text-center text-sm font-black rounded-xl p-2 outline-none transition-all ${
                                                                                                isExceeded 
                                                                                                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-800 focus:ring-4 focus:ring-rose-500/10' 
                                                                                                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10'
                                                                                            }`}
                                                                                        />
                                                                                        <div className={`text-[9px] px-1.5 py-0.5 rounded-md mt-1.5 font-bold tracking-tight text-center shrink-0 ${
                                                                                            isExceeded 
                                                                                                ? 'bg-rose-100 text-rose-700 animate-pulse font-black' 
                                                                                                : avail > 0 
                                                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                                                                                                    : 'bg-slate-100 text-slate-400'
                                                                                        }`}>
                                                                                            {isExceeded ? `সীমা: ${avail}` : `মজুদ: ${avail}`}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    {/* Topics List (Expanded) */}
                                                                    {isExpanded && (
                                                                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 pl-6 sm:pl-12 space-y-3">
                                                                            {topicsLoading[ch.id] ? (
                                                                                <div className="flex items-center gap-2 text-violet-500 text-sm font-bold py-2"><Loader2 size={16} className="animate-spin"/> Loading topics...</div>
                                                                            ) : chapterTopics[ch.id]?.length > 0 ? (
                                                                                chapterTopics[ch.id].map(top => (
                                                                                    <div key={top.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-150 rounded-xl shadow-sm gap-2.5">
                                                                                        <span className="text-sm font-bold text-slate-600 break-words flex-1">{top.name}</span>
                                                                                        <div className="flex flex-wrap gap-3 justify-start sm:justify-end w-full sm:w-auto">
                                                                                            {activeSections.map(sec => {
                                                                                                const avail = getAvailableCount(top.id, sec.type, false);
                                                                                                const allocated = parseInt(allocations[top.id]?.[sec.type]) || 0;
                                                                                                const isExceeded = allocated > avail;
                                                                                                
                                                                                                return (
                                                                                                    <div key={sec.type} className="flex items-center gap-1.5 w-28">
                                                                                                        <div className="flex flex-col items-end shrink-0">
                                                                                                            <span className="text-[9px] font-black text-slate-400 uppercase w-6 text-right shrink-0">{sec.type}</span>
                                                                                                            <span className={`text-[8px] px-1 py-0.5 rounded mt-0.5 font-bold shrink-0 ${
                                                                                                                isExceeded 
                                                                                                                    ? 'bg-rose-100 text-rose-700 animate-pulse font-black' 
                                                                                                                    : avail > 0 
                                                                                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/30' 
                                                                                                                        : 'bg-slate-100 text-slate-400'
                                                                                                            }`}>
                                                                                                                {isExceeded ? `সীমা:${avail}` : `মজুদ:${avail}`}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <input 
                                                                                                            type="number" 
                                                                                                            min="0"
                                                                                                            value={allocations[top.id]?.[sec.type] || ''} 
                                                                                                            onChange={(e) => handleAllocationChange(top.id, sec.type, e.target.value)}
                                                                                                            placeholder="0"
                                                                                                            className={`w-full text-center text-sm font-black rounded-lg p-1.5 outline-none transition-all ${
                                                                                                                isExceeded 
                                                                                                                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-800 focus:ring-4 focus:ring-rose-500/10' 
                                                                                                                    : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10'
                                                                                                            }`}
                                                                                                        />
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="text-xs font-bold text-slate-400 py-2 italic text-center sm:text-left">কোন টপিক পাওয়া যায়নি। উপরের অধ্যায়ে সরাসরি প্রশ্ন বরাদ্দ করুন।</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* RIGHT: Difficulty & Bloom's Taxonomy & Status */}
                            <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
                                
                                {/* Blueprint Templates Card */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 bg-gradient-to-br from-white to-violet-50/10">
                                    <h3 className="font-black text-slate-800 flex items-center gap-2 mb-4">
                                        <LayoutGrid className="text-violet-500" /> Blueprint Templates
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">Load Blueprint</label>
                                            {loadingTemplates ? (
                                                <div className="text-xs font-bold text-slate-400 py-2 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin text-violet-500" /> Loading...</div>
                                            ) : (
                                                <select 
                                                    value={selectedTemplateId} 
                                                    onChange={e => handleTemplateChange(e.target.value)} 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:border-violet-500 focus:bg-white transition-all cursor-pointer"
                                                >
                                                    <option value="">Custom Configuration</option>
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.templateName} {t.isGlobal ? '(Global)' : ''}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="border-t border-slate-100 pt-3.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">Save Configuration</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Template Name" 
                                                    value={newTemplateName} 
                                                    onChange={e => setNewTemplateName(e.target.value)}
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-violet-500 focus:bg-white transition-all"
                                                />
                                                <button 
                                                    onClick={handleSaveTemplate}
                                                    disabled={savingTemplate}
                                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all hover:shadow-md hover:shadow-violet-500/20 active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1"
                                                >
                                                    {savingTemplate ? <Loader2 size={12} className="animate-spin" /> : null}
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Difficulty Card */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                    <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
                                        <BrainCircuit className="text-violet-500" /> Difficulty AI Prompt
                                    </h3>
                                    
                                    <div className="space-y-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        {/* Presets */}
                                        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200/60 justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Presets:</span>
                                            <div className="flex gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={() => setDifficulty({ easy: 50, medium: 40, hard: 10 })}
                                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 transition-all hover:shadow-sm active:scale-95"
                                                >
                                                    সহজ
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setDifficulty({ easy: 30, medium: 50, hard: 20 })}
                                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 transition-all hover:shadow-sm active:scale-95"
                                                >
                                                    সুষম
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setDifficulty({ easy: 20, medium: 30, hard: 50 })}
                                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 transition-all hover:shadow-sm active:scale-95"
                                                >
                                                    কঠিন
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">Easy</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={difficulty.easy} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setDifficulty({...difficulty, easy: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-emerald-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={difficulty.easy} onChange={(e) => setDifficulty({...difficulty, easy: parseInt(e.target.value)})} className="w-full accent-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-amber-500 uppercase tracking-wider">Medium</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={difficulty.medium} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setDifficulty({...difficulty, medium: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-amber-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={difficulty.medium} onChange={(e) => setDifficulty({...difficulty, medium: parseInt(e.target.value)})} className="w-full accent-amber-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-rose-500 uppercase tracking-wider">Hard</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={difficulty.hard} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setDifficulty({...difficulty, hard: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-rose-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={difficulty.hard} onChange={(e) => setDifficulty({...difficulty, hard: parseInt(e.target.value)})} className="w-full accent-rose-500" />
                                        </div>
                                        
                                        {(difficulty.easy + difficulty.medium + difficulty.hard) !== 100 && (
                                            <div className="p-3 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 border border-rose-200">
                                                <AlertCircle size={14} /> Total must equal 100% 
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bloom's Taxonomy Cognitive levels Card */}
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                    <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
                                        <Sparkles className="text-violet-500" /> Cognitive Levels (Bloom's)
                                    </h3>
                                    
                                    <div className="space-y-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        {/* Presets */}
                                        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200/60 justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Presets:</span>
                                            <div className="flex gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={() => setBloomDistribution({ knowledge: 40, comprehension: 30, application: 20, higherOrder: 10 })}
                                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 transition-all hover:shadow-sm active:scale-95"
                                                >
                                                    সুষম
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setBloomDistribution({ knowledge: 50, comprehension: 30, application: 15, higherOrder: 5 })}
                                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 transition-all hover:shadow-sm active:scale-95"
                                                >
                                                    স্মরণ ও অনুধাবন
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setBloomDistribution({ knowledge: 25, comprehension: 35, application: 25, higherOrder: 15 })}
                                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 transition-all hover:shadow-sm active:scale-95"
                                                >
                                                    প্রয়োগ ও উচ্চতর
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">Knowledge (জ্ঞানমূলক)</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={bloomDistribution.knowledge} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setBloomDistribution({...bloomDistribution, knowledge: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-indigo-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={bloomDistribution.knowledge} onChange={(e) => setBloomDistribution({...bloomDistribution, knowledge: parseInt(e.target.value)})} className="w-full accent-indigo-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-sky-500 uppercase tracking-wider">Comprehension (অনুধাবনমূলক)</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={bloomDistribution.comprehension} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setBloomDistribution({...bloomDistribution, comprehension: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-sky-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={bloomDistribution.comprehension} onChange={(e) => setBloomDistribution({...bloomDistribution, comprehension: parseInt(e.target.value)})} className="w-full accent-sky-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-teal-500 uppercase tracking-wider">Application (প্রয়োগমূলক)</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={bloomDistribution.application} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setBloomDistribution({...bloomDistribution, application: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-teal-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={bloomDistribution.application} onChange={(e) => setBloomDistribution({...bloomDistribution, application: parseInt(e.target.value)})} className="w-full accent-teal-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2 items-center">
                                                <span className="text-xs font-black text-fuchsia-500 uppercase tracking-wider">Higher Order (উচ্চতর দক্ষতা)</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        value={bloomDistribution.higherOrder} 
                                                        onChange={(e) => {
                                                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                            setBloomDistribution({...bloomDistribution, higherOrder: val});
                                                        }}
                                                        className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-xs font-black text-slate-700 outline-none focus:border-fuchsia-500"
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <input type="range" min="0" max="100" value={bloomDistribution.higherOrder} onChange={(e) => setBloomDistribution({...bloomDistribution, higherOrder: parseInt(e.target.value)})} className="w-full accent-fuchsia-500" />
                                        </div>
                                        
                                        {(bloomDistribution.knowledge + bloomDistribution.comprehension + bloomDistribution.application + bloomDistribution.higherOrder) !== 100 && (
                                            <div className="p-3 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 border border-rose-200">
                                                <AlertCircle size={14} /> Total must equal 100% 
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                            
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 backdrop-blur-md bg-white/90 border-t border-slate-200 p-3 sm:p-4 z-50 flex justify-between items-center shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
                <div className="max-w-[1600px] w-full mx-auto flex flex-row justify-between items-center gap-3">
                    {step === 1 ? (
                        <div className="w-5 h-5"></div>
                    ) : (
                        <button 
                            onClick={() => setStep(1)}
                            className="px-3 sm:px-6 py-2 sm:py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 bg-white border border-slate-200 active:scale-95 transition-all flex items-center gap-1 sm:gap-2 shrink-0"
                        >
                            <ChevronLeft size={16} />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                    )}
                    
                    {/* Live Syllabus Allocation Tracker */}
                    {step === 2 && (
                        <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-1 px-1 sm:px-3 overflow-x-auto no-scrollbar">
                            {activeSections.map(sec => {
                                const target = targetTotals[sec.type] || 0;
                                const alloc = allocatedTotals[sec.type] || 0;
                                const isComplete = target === alloc;
                                const isOver = alloc > target;
                                
                                return (
                                    <div 
                                        key={sec.type} 
                                        className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border flex items-center gap-1 sm:gap-2 shrink-0 transition-all ${
                                            isComplete 
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm' 
                                                : isOver 
                                                    ? 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}
                                    >
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">{sec.type}</span>
                                        <div className="flex items-baseline gap-0.5">
                                            <span className="text-xs sm:text-sm font-black">{alloc}</span>
                                            <span className="text-[8px] sm:text-[10px] font-bold text-slate-400">/{target}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {step === 1 ? (
                        <button 
                            onClick={() => {
                                if(!examInfo.title || !subjectId) return alert("Fill title and subject");
                                if(targetTotals.qs === 0) return alert("Define question targets");
                                setStep(2);
                            }}
                            disabled={loadingBlueprint}
                            className="px-4 sm:px-8 py-2.5 sm:py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 active:scale-95 ml-auto"
                        >
                            <span className="hidden sm:inline">Next: Syllabus Allocation</span>
                            <span className="sm:hidden">Next</span>
                            <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="px-4 sm:px-8 py-2.5 sm:py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xl shadow-violet-500/30 hover:-translate-y-0.5 active:scale-95 ml-auto shrink-0"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                            <span className="hidden sm:inline">{loading ? 'Processing AI...' : 'Generate Exam Paper'}</span>
                            <span className="sm:hidden">{loading ? 'Generating...' : 'Generate'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoExamGenerator;
