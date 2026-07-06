import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Plus, Save, Upload, BookOpen, Layers, X, Edit, Trash2, Settings, ArrowRight, FileText, CheckCircle, Bot, Paperclip, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import lectureService from '../../../services/lectureService';
import academicService from '../../../services/academicService';
import AttachmentPanel from './components/AttachmentPanel';
import RichTextEditor from '../../../components/RichTextEditor';

const cleanGoldenReference = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const headings = Array.from(doc.querySelectorAll('h3'));
        headings.forEach(h3 => {
            const txt = (h3.textContent || '').trim();
            if (txt.includes('📚 গোল্ডেন সোর্স বুক রিডিং রেফারেন্স') || txt.includes('Reference Source')) {
                let sibling = h3.nextElementSibling;
                h3.remove();
                while (sibling && (sibling.tagName.toLowerCase() === 'br' || sibling.textContent.trim() === '')) {
                    const next = sibling.nextElementSibling;
                    sibling.remove();
                    sibling = next;
                }
            }
        });
        return doc.body.innerHTML;
    } catch (e) {
        console.error("Error cleaning golden reference:", e);
        return html;
    }
};

const LectureBuilder = () => {
    // Top-level lecture data
    const [title, setTitle] = useState('New Concept Lecture');
    const [language, setLanguage] = useState('Bangla');
    const [difficulty, setDifficulty] = useState('EASY');
    const [timeMinutes, setTimeMinutes] = useState(45);

    // Cascading Hierarchy States
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });
    const [levelId, setLevelId] = useState('');
    const [streamId, setStreamId] = useState('');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState(''); // this is classSubjectId
    const [chapterId, setChapterId] = useState('');
    const [topicId, setTopicId] = useState(null); // safety fallback

    const [chapters, setChapters] = useState([]);

    // Interactive Step-by-Step RAG States
    const [chapterMetadata, setChapterMetadata] = useState(null);
    const [isMetadataLoading, setIsMetadataLoading] = useState(false);
    const [lectureCount, setLectureCount] = useState(1);
    const [plannedOutline, setPlannedOutline] = useState([]);
    const [selectedPartIndex, setSelectedPartIndex] = useState(0);

    // UI states
    const [isSaving, setIsSaving] = useState(false);
    const [lectureId, setLectureId] = useState(null);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [generatingExam, setGeneratingExam] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);

    const [sections, setSections] = useState([
        { id: Date.now().toString(), title: 'Introduction', content: '', questions: [] },
    ]);
    const [activeSectionId, setActiveSectionId] = useState(sections[0].id);

    const location = useLocation();
    const { id: routeId } = useParams();
    const [pendingTopicIds, setPendingTopicIds] = useState(null);

    // 1. Memoized hierarchy mapping
    const subjectLanguageMap = React.useMemo(() => {
        const map = {};
        if (!hierarchy.classSubjects || !hierarchy.subjects) return map;
        hierarchy.classSubjects.forEach(cs => {
            const subject = hierarchy.subjects.find(s => s.id === cs._subjectId);
            if (subject) {
                map[cs.id] = {
                    name: subject.name || '',
                    isEnglish: subject.isEnglishVersion || subject.englishVersion || false
                };
            }
        });
        return map;
    }, [hierarchy.classSubjects, hierarchy.subjects]);

    // 2. Cascading Lists Filter Logic
    const filteredStreams = React.useMemo(() => {
        if (!levelId || !hierarchy.streams) return [];
        return hierarchy.streams.filter(s => s._levelId === levelId) || [];
    }, [levelId, hierarchy.streams]);

    const filteredClasses = React.useMemo(() => {
        if (!hierarchy.classes) return [];
        const streamsUnderLevel = levelId 
            ? (hierarchy.streams?.filter(s => s._levelId === levelId).map(s => s.id) || [])
            : [];

        return hierarchy.classes.filter(c => {
            if (!levelId) return true;
            if (streamId) return c._streamId === streamId;
            return c._levelId === levelId || streamsUnderLevel.includes(c._streamId);
        }).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [levelId, streamId, hierarchy.classes, hierarchy.streams]);

    const filteredClassSubjects = React.useMemo(() => {
        if (!classId || !hierarchy.classSubjects) return [];
        return hierarchy.classSubjects.filter(cs => cs._classId === classId) || [];
    }, [classId, hierarchy.classSubjects]);

    // 3. Fetch Chapters dynamically when subjectId changes
    useEffect(() => {
        if (subjectId) {
            academicService.getChaptersByClassSubject(subjectId)
                .then(data => {
                    setChapters(data || []);
                })
                .catch(console.error);
        } else {
            setChapters([]);
            setChapterId('');
        }
    }, [subjectId]);

    // Fetch chapter metadata dynamically when chapterId changes
    useEffect(() => {
        if (chapterId) {
            setIsMetadataLoading(true);
            setPlannedOutline([]);
            setChapterMetadata(null);
            lectureService.getChapterMetadata(chapterId)
                .then(res => {
                    if (res.success && res.data) {
                        setChapterMetadata(res.data);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch chapter metadata:", err);
                })
                .finally(() => {
                    setIsMetadataLoading(false);
                });
        } else {
            setChapterMetadata(null);
            setPlannedOutline([]);
        }
    }, [chapterId]);

    // Load Hierarchy and Lecture on mount / search params change
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryId = params.get('id');
        const id = routeId || queryId;
        const openAttachments = params.get('attachments') === 'open';

        // Query parameters for auto-creating from book reader:
        const qClassSubjectId = params.get('classSubjectId');
        const qChapterId = params.get('chapterId');
        const qTopicIds = params.get('topicIds');

        if (qTopicIds) {
            setPendingTopicIds(qTopicIds.split(','));
        }

        academicService.getHierarchy()
            .then(hData => {
                const normH = hData || { streams: [], classes: [], subjects: [], classSubjects: [], levels: [] };
                setHierarchy(normH);
                if (id) {
                    setLectureId(id);
                    loadLecture(id, normH);
                } else if (qClassSubjectId) {
                    // Resolve hierarchy from classSubjectId
                    const cs = normH.classSubjects?.find(c => c.id === qClassSubjectId);
                    if (cs) {
                        setSubjectId(cs.id);
                        setClassId(cs._classId || '');
                        const cl = normH.classes?.find(x => x.id === cs._classId);
                        if (cl) {
                            setStreamId(cl._streamId || '');
                            const st = normH.streams?.find(x => x.id === cl._streamId);
                            if (st) {
                                setLevelId(st._levelId || '');
                            } else if (cl._levelId) {
                                setLevelId(cl._levelId || '');
                            }
                        }
                        if (qChapterId) {
                            setChapterId(qChapterId);
                        }
                    }
                }
            })
            .catch(console.error);

        if (openAttachments) {
            setShowAttachments(true);
        }
    }, [location.search, routeId]);

    // Auto-generate sections from book reader query params once metadata loads
    useEffect(() => {
        if (chapterMetadata && pendingTopicIds && pendingTopicIds.length > 0) {
            const matchedTopics = chapterMetadata.topics?.filter(t => 
                t.id && pendingTopicIds.some(pid => pid.trim().toLowerCase() === t.id.toString().trim().toLowerCase())
            ) || [];
            if (matchedTopics.length > 0) {
                const newSections = matchedTopics.map((t, idx) => {
                    const goldenContent = t.goldenText 
                        ? `<blockquote class="golden-ref" style="border-left: 4px solid #4f46e5; padding-left: 12px; margin-left: 0; color: #475569; font-style: normal; background-color: #f8fafc; padding: 12px; border-radius: 8px;">` + t.goldenText.replace(/\n/g, '<br/>') + `</blockquote>`
                        : `<p style="color: #94a3b8; font-style: normal;">এই টপিকের অধীনে কোনো গোল্ডেন মেটেরিয়াল পাওয়া যায়নি।</p>`;

                    const templateContent = `
                        <h3>📖 ${t.name}</h3>
                        ${goldenContent}
                    `.trim();

                    return {
                        id: t.id,
                        title: t.name,
                        content: templateContent,
                        questions: t.approvedQuestions ? t.approvedQuestions.map(q => ({
                            questionId: q.questionId,
                            questionText: q.questionText,
                            type: q.type,
                            difficulty: q.difficulty,
                            marks: q.marks,
                            mcqType: q.mcqType,
                            statements: q.statements
                        })) : []
                    };
                });

                setSections(newSections);
                setActiveSectionId(newSections[0].id);
                
                // Set lecture title dynamically based on book/chapter/topics
                setTitle(`লেকচার শিট - ${matchedTopics[0].name}${matchedTopics.length > 1 ? ` (এবং আরও ${matchedTopics.length - 1} টি টপিক)` : ''}`);
            }
            setPendingTopicIds(null);
        }
    }, [chapterMetadata, pendingTopicIds]);

    const loadLecture = async (id, currentHierarchy) => {
        try {
            const res = await lectureService.getLecture(id);
            const data = res.data;
            setTitle(data.title);
            setLanguage(data.language);
            setDifficulty(data.difficultyLevel);
            setTimeMinutes(data.lectureTimeMinutes);

            const activeHierarchy = currentHierarchy || hierarchy;

            if (data.classSubjectId && activeHierarchy?.classSubjects) {
                const cs = activeHierarchy.classSubjects.find(c => c.id === data.classSubjectId);
                if (cs) {
                    setSubjectId(cs.id);
                    setClassId(cs._classId || '');
                    const cl = activeHierarchy.classes?.find(x => x.id === cs._classId);
                    if (cl) {
                        setStreamId(cl._streamId || '');
                        const st = activeHierarchy.streams?.find(x => x.id === cl._streamId);
                        if (st) {
                            setLevelId(st._levelId || '');
                        } else if (cl._levelId) {
                            setLevelId(cl._levelId || '');
                        }
                    }
                    // Load chapters
                    const chapData = await academicService.getChaptersByClassSubject(cs.id);
                    setChapters(chapData || []);
                    if (data.chapterId) {
                        setChapterId(data.chapterId);
                    }
                }
            } else if (data.classId) {
                setClassId(data.classId);
                if (activeHierarchy?.classes) {
                    const cl = activeHierarchy.classes.find(x => x.id === data.classId);
                    if (cl) {
                        setStreamId(cl._streamId || '');
                        const st = activeHierarchy.streams?.find(x => x.id === cl._streamId);
                        if (st) {
                            setLevelId(st._levelId || '');
                        } else if (cl._levelId) {
                            setLevelId(cl._levelId || '');
                        }
                    }
                }
                if (data.classSubjectId) {
                    setSubjectId(data.classSubjectId);
                    const chapData = await academicService.getChaptersByClassSubject(data.classSubjectId);
                    setChapters(chapData || []);
                    if (data.chapterId) {
                        setChapterId(data.chapterId);
                    }
                }
            }

            if (data.sections && data.sections.length > 0) {
                const mappedSections = data.sections.map(s => ({
                    id: s.id,
                    title: s.sectionTitle,
                    content: cleanGoldenReference(s.content || ''),
                    questions: s.sectionQuestions ? s.sectionQuestions.map(sq => ({
                        id: sq.id,
                        questionId: sq.questionId,
                        questionText: sq.questionText,
                        type: sq.type,
                        difficulty: sq.difficulty,
                        marks: sq.marks,
                        mcqType: sq.mcqType,
                        statements: sq.statements
                    })) : []
                }));
                setSections(mappedSections);
                setActiveSectionId(mappedSections[0].id);
            }
        } catch (err) {
            console.error('Failed to load lecture:', err);
        }
    };

    // Content of currently selected section
    const activeSection = sections.find(s => s.id === activeSectionId) || sections[0] || { id: '', title: '', content: '', questions: [] };

    const handleAddSection = () => {
        const newSec = { id: Date.now().toString(), title: 'New Section', content: '', questions: [] };
        setSections([...sections, newSec]);
        setActiveSectionId(newSec.id);
    };

    const handleRemoveSection = (id) => {
        if (sections.length === 1) return; // Prevent removing last section
        const newSecs = sections.filter(s => s.id !== id);
        setSections(newSecs);
        if (activeSectionId === id) setActiveSectionId(newSecs[0].id);
    };

    const updateActiveSectionContent = (content) => {
        setSections(sections.map(s =>
            s.id === activeSectionId ? { ...s, content } : s
        ));
    };

    const updateActiveSectionTitle = (newTitle) => {
        setSections(sections.map(s =>
            s.id === activeSectionId ? { ...s, title: newTitle } : s
        ));
    };

    const handleAIAssist = async () => {
        if (!activeSection.title) return;
        setAiGenerating(true);
        try {
            // Check if activeSection.id is a valid UUID topicId
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeSection.id);
            const res = await lectureService.aiGenerate({
                topic: activeSection.title,
                topicId: isUuid ? activeSection.id : null,
                class: classId || '10',
                difficulty: difficulty,
                language: language
            });

            if (res.success && res.data) {
                // If it is raw HTML, replace or append beautifully
                const newContent = activeSection.content + "<br/><br/>" + res.data.explanation;
                updateActiveSectionContent(newContent);
                alert('এআই অ্যাসিস্ট সফলভাবে ব্যাখ্যা যুক্ত করেছে!');
            }
        } catch (err) {
            console.error(err);
            alert('এআই অ্যাসিস্ট ব্যর্থ হয়েছে।');
        } finally {
            setAiGenerating(false);
        }
    };

    const handlePlanOutline = () => {
        if (!chapterMetadata || !chapterMetadata.topics || chapterMetadata.topics.length === 0) {
            alert("এই অধ্যায়ের অধীনে কোনো টপিক পাওয়া যায়নি!");
            return;
        }

        const topics = [...chapterMetadata.topics];
        const numSheets = parseInt(lectureCount) || 1;
        const totalTopics = topics.length;
        
        const parts = [];
        const baseSize = Math.floor(totalTopics / numSheets);
        const remainder = totalTopics % numSheets;

        let index = 0;
        for (let i = 0; i < numSheets; i++) {
            const size = baseSize + (i < remainder ? 1 : 0);
            const partTopics = topics.slice(index, index + size);
            index += size;

            parts.push({
                partIndex: i + 1,
                title: `অংশ ${i + 1} (${partTopics.length} টি টপিক)`,
                topics: partTopics
            });
        }

        setPlannedOutline(parts);
        setSelectedPartIndex(0);
        alert(`অধ্যায়ের টপিকগুলো সফলভাবে ${numSheets} টি ভাগে বিভক্ত করা হয়েছে! নিচে অংশ নির্বাচন করে খসড়া তৈরি করুন।`);
    };

    const handleCreateDraftFromPart = (part) => {
        if (!part || !part.topics || part.topics.length === 0) return;

        if (sections.length > 1 || (sections[0] && sections[0].content !== "")) {
            if (!window.confirm("খসড়া প্রস্তুত করলে বর্তমান লেকচার শিটের এডিটর ও সেকশন ডেটা মুছে নতুন খসড়া ওভাররাইট হবে। আপনি কি নিশ্চিত?")) {
                return;
            }
        }

        const newSections = part.topics.map((t, idx) => {
            const goldenContent = t.goldenText 
                ? `<blockquote class="golden-ref" style="border-left: 4px solid #4f46e5; padding-left: 12px; margin-left: 0; color: #475569; font-style: normal; background-color: #f8fafc; padding: 12px; border-radius: 8px;">` + t.goldenText.replace(/\n/g, '<br/>') + `</blockquote>`
                : `<p style="color: #94a3b8; font-style: normal;">এই টপিকের অধীনে কোনো গোল্ডেন মেটেরিয়াল পাওয়া যায়নি।</p>`;

            const templateContent = `
                <h3>📖 ${t.name}</h3>
                ${goldenContent}
            `.trim();

            return {
                id: t.id,
                title: t.name,
                content: templateContent,
                questions: t.approvedQuestions ? t.approvedQuestions.map(q => ({
                    questionId: q.questionId,
                    questionText: q.questionText,
                    type: q.type,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    mcqType: q.mcqType,
                    statements: q.statements
                })) : []
            };
        });

        setSections(newSections);
        if (newSections.length > 0) {
            setActiveSectionId(newSections[0].id);
        }
        
        // Auto update lecture title
        const cleanTitle = title.startsWith('New Concept') || title === '' ? 'নতুন লেকচার শিট' : title;
        setTitle(`${cleanTitle} (${part.title})`);
        
        alert("খসড়া লেকচার শিট সফলভাবে প্রস্তুত করা হয়েছে! এখন এডিটর থেকে প্রতিটি টপিক রিফাইন করুন এবং এআই অ্যাসিস্ট ব্যবহার করুন।");
    };

    const handleCreateExam = async () => {
        if (!lectureId) {
            alert('প্রশ্নপত্র তৈরি করার আগে দয়া করে লেকচার শিটটি ড্রাফট হিসেবে সেভ করুন!');
            return;
        }
        setGeneratingExam(true);
        try {
            const res = await lectureService.createExamFromLecture(lectureId);
            if (res.success && res.data?.id) {
                alert('প্রশ্নপত্র সফলভাবে জেনারেট হয়েছে! এখন এডিটরে রিডাইরেক্ট করা হচ্ছে...');
                window.location.href = `/exams/generate/editor/${res.data.id}`;
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'প্রশ্নপত্র তৈরি করতে ব্যর্থ হয়েছে। নিশ্চিত করুন যে লেকচারে অন্তত ১টি প্রশ্ন সংযুক্ত আছে।');
        } finally {
            setGeneratingExam(false);
        }
    };

    const handleMoveQuestion = (sectionId, questionId, direction) => {
        setSections(prevSections => prevSections.map(sec => {
            if (sec.id !== sectionId) return sec;
            const qList = [...(sec.questions || [])];
            const index = qList.findIndex(q => (q.questionId || q.id) === questionId);
            if (index === -1) return sec;

            if (direction === 'up' && index > 0) {
                const temp = qList[index];
                qList[index] = qList[index - 1];
                qList[index - 1] = temp;
            } else if (direction === 'down' && index < qList.length - 1) {
                const temp = qList[index];
                qList[index] = qList[index + 1];
                qList[index + 1] = temp;
            }
            return { ...sec, questions: qList };
        }));
    };

    const handleRemoveQuestion = (sectionId, questionId) => {
        setSections(prevSections => prevSections.map(sec => {
            if (sec.id !== sectionId) return sec;
            return {
                ...sec,
                questions: (sec.questions || []).filter(q => (q.questionId || q.id) !== questionId)
            };
        }));
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const payload = {
                title,
                language,
                difficultyLevel: difficulty,
                lectureTimeMinutes: timeMinutes,
                classSubjectId: subjectId || null,
                chapterId: chapterId || null,
                topicId: topicId || null,
                sections: sections.map((s, idx) => ({
                    sectionTitle: s.title,
                    content: s.content,
                    sectionOrder: idx,
                    questionIds: s.questions ? s.questions.map(q => q.questionId || q.id) : []
                }))
            };

            let res;
            if (lectureId) {
                res = await lectureService.updateLecture(lectureId, payload);
            } else {
                res = await lectureService.createLecture(payload);
                if (res.data?.id) setLectureId(res.data.id);
            }
            alert('Lecture saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save lecture');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50">
            {/* Header / Config Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="text-xl font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-slate-50 rounded px-2"
                            placeholder="Lecture Title..."
                        />
                        <div className="flex gap-4 mt-1 pl-2">
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="text-xs bg-slate-100 border-none rounded p-1 outline-none text-slate-600 font-medium">
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                            <select value={language} onChange={e => setLanguage(e.target.value)} className="text-xs bg-slate-100 border-none rounded p-1 outline-none text-slate-600 font-medium">
                                <option value="Bangla">Bangla</option>
                                <option value="English">English</option>
                                <option value="Bilingual">Bilingual</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {lectureId && (
                        <button
                            onClick={handleCreateExam}
                            disabled={generatingExam}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Sparkles size={16} />
                            {generatingExam ? 'পরীক্ষা তৈরি হচ্ছে...' : 'এক-ক্লিকে প্রশ্নপত্র তৈরি'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowAttachments(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-200 transition"
                        title="Resources & Attachments"
                    >
                        <Paperclip size={16} />
                        <span className="hidden sm:inline">Attachments</span>
                    </button>
                    <button onClick={handleSaveDraft} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-200 transition">
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition">
                        <Upload size={16} /> Publish Lecture
                    </button>
                </div>
            </div>

            {/* Main Builder Area: Left Panel (Selectors + Sections) + Right Panel (Editor) */}
            <div className="flex flex-1 overflow-hidden h-full">

                {/* Left Panel: Selectors + Sections */}
                <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto font-satoshi">
                    {/* Academic selectors */}
                    <div className="p-5 bg-slate-50 border-b border-slate-200/80 space-y-5">
                        <div className="flex items-center gap-2 text-indigo-900 font-black text-xs uppercase tracking-wider mb-2">
                            <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                            <span>একাডেমিক ম্যাপিং</span>
                        </div>
                        
                        {/* 1. LEVEL SELECTOR */}
                        <div className="relative">
                            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[9px] font-black text-indigo-500 uppercase z-10 tracking-widest">Level</span>
                            <select 
                                value={levelId} 
                                onChange={e => {
                                    setLevelId(e.target.value);
                                    setStreamId('');
                                    setClassId('');
                                    setSubjectId('');
                                    setChapterId('');
                                }} 
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                            >
                                <option value="">All Levels</option>
                                {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>

                        {/* 2. STREAM SELECTOR */}
                        <div className="relative">
                            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[9px] font-black text-indigo-500 uppercase z-10 tracking-widest">Stream</span>
                            <select 
                                value={streamId} 
                                onChange={e => {
                                    setStreamId(e.target.value);
                                    setClassId('');
                                    setSubjectId('');
                                    setChapterId('');
                                }} 
                                disabled={!levelId || filteredStreams.length === 0}
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                                <option value="">All Streams</option>
                                {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* 3. CLASS SELECTOR */}
                        <div className="relative">
                            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[9px] font-black text-indigo-500 uppercase z-10 tracking-widest">Class</span>
                            <select 
                                value={classId} 
                                onChange={e => {
                                    setClassId(e.target.value);
                                    setSubjectId('');
                                    setChapterId('');
                                }} 
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                            >
                                <option value="">All Classes</option>
                                {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* 4. SUBJECT SELECTOR */}
                        <div className="relative">
                            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[9px] font-black text-indigo-500 uppercase z-10 tracking-widest">Subject</span>
                            <select 
                                value={subjectId} 
                                onChange={e => {
                                    setSubjectId(e.target.value);
                                    setChapterId('');
                                }} 
                                disabled={!classId}
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                                <option value="">All Subjects</option>
                                {filteredClassSubjects.map(cs => {
                                    const subName = cs.subjectName || subjectLanguageMap[cs.id]?.name || 'Unknown';
                                    const isEng = subjectLanguageMap[cs.id]?.isEnglish;
                                    return <option key={cs.id} value={cs.id}>{subName} {isEng ? '[EN]' : '[BN]'}</option>;
                                })}
                            </select>
                        </div>

                        {/* 5. CHAPTER SELECTOR */}
                        <div className="relative">
                            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[9px] font-black text-indigo-500 uppercase z-10 tracking-widest">Chapter</span>
                            <select 
                                value={chapterId} 
                                onChange={e => setChapterId(e.target.value)} 
                                disabled={!subjectId}
                                className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                                <option value="">All Chapters</option>
                                {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                            </select>
                        </div>

                        {/* Loading chapter metadata state */}
                        {isMetadataLoading && (
                            <div className="text-center p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <span className="text-[11px] font-bold text-slate-500">ডাটা বিশ্লেষণ হচ্ছে...</span>
                            </div>
                        )}

                        {/* Chapter Stats and Step-by-Step interactive Options */}
                        {chapterId && chapterMetadata && (
                            <div className="p-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-3.5">
                                <div className="text-xs font-black text-slate-700 border-b pb-1.5 flex items-center justify-between">
                                    <span>📊 অধ্যায় সংক্ষেপ</span>
                                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-black">RAG Metadata</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">টপিক</p>
                                        <p className="text-sm font-black text-slate-800">{chapterMetadata.topics?.length || 0}</p>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">গোল্ডেন</p>
                                        <p className="text-sm font-black text-slate-800">{chapterMetadata.goldenChunksCount || 0}</p>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">প্রশ্ন</p>
                                        <p className="text-sm font-black text-slate-800">{chapterMetadata.approvedQuestionsCount || 0}</p>
                                    </div>
                                </div>

                                {/* Step Options Dropdown */}
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">কয়টি লেকচারশীট তৈরি করবেন?</label>
                                    <select 
                                        value={lectureCount}
                                        onChange={e => setLectureCount(parseInt(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
                                    >
                                        <option value={1}>১ টি (১টি সমন্বিত লেকচার শিট)</option>
                                        <option value={2}>২ টি (২টি ভাগে বিভক্ত লেকচার শিট)</option>
                                        <option value={3}>৩ টি (৩টি ভাগে বিভক্ত লেকচার শিট)</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handlePlanOutline}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <Sparkles size={12} strokeWidth={3} />
                                    আউটলাইন প্ল্যান করুন
                                </button>
                            </div>
                        )}

                        {/* Render Planned Outlines (Parts) list */}
                        {plannedOutline.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    📋 প্রস্তাবিত লেকচার প্ল্যান
                                </div>
                                <div className="space-y-2.5">
                                    {plannedOutline.map((part, idx) => (
                                        <div key={idx} className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200/50 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-black text-indigo-700">{part.title}</span>
                                                <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                                    {part.topics.length} Topics
                                                </span>
                                            </div>
                                            
                                            {/* Mini topics outline */}
                                            <ul className="text-[10px] text-slate-500 space-y-1 list-disc list-inside font-medium border-l border-indigo-200 pl-2">
                                                {part.topics.slice(0, 3).map((t, tIdx) => (
                                                    <li key={tIdx} className="truncate">{t.name}</li>
                                                ))}
                                                {part.topics.length > 3 && <li className="italic text-slate-400">+{part.topics.length - 3} more topics...</li>}
                                            </ul>

                                            <button
                                                onClick={() => handleCreateDraftFromPart(part)}
                                                className="w-full py-2 bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-black rounded-xl border border-slate-200 transition active:scale-95 shadow-sm"
                                            >
                                                ✨ খসড়া লেকচার প্রস্তুত করুন
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-3 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <span>Lecture Outline</span>
                    </div>

                    <div className="flex-1 px-3 py-3 space-y-1">
                        {sections.map((sec, idx) => (
                            <div
                                key={sec.id}
                                onClick={() => setActiveSectionId(sec.id)}
                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${activeSectionId === sec.id ? 'bg-white shadow-sm border border-slate-200 shadow-indigo-100/50 relative' : 'hover:bg-slate-200/50 text-slate-600 border border-transparent'
                                    }`}
                            >
                                {activeSectionId === sec.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r" />}
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${activeSectionId === sec.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="text-sm font-medium truncate">{sec.title || 'Untitled Section'}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveSection(sec.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={handleAddSection}
                            className="w-full flex items-center justify-center gap-2 p-3 mt-4 text-sm font-medium text-indigo-600 border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all"
                        >
                            <Plus size={16} /> Add Section
                        </button>
                    </div>
                </div>

                {/* Right Panel: Content Editor */}
                <div className="flex-1 bg-white flex flex-col overflow-y-auto p-8 lg:p-12 relative">
                    <div className="max-w-4xl mx-auto w-full space-y-8">

                        {/* Section Header */}
                        <div>
                            <input
                                type="text"
                                value={activeSection.title}
                                onChange={e => updateActiveSectionTitle(e.target.value)}
                                className="text-3xl font-bold text-slate-900 w-full outline-none border-b border-transparent focus:border-slate-200 pb-2 transition-all"
                                placeholder="Section Title..."
                            />
                        </div>

                        {/* Toolbar Simulation */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex gap-2 text-slate-500 items-center">
                                <button className="p-1.5 hover:bg-white rounded shadow-sm hover:text-slate-900 transition"><Edit size={16} /></button>
                                <button className="p-1.5 hover:bg-white rounded shadow-sm hover:text-slate-900 transition"><Layers size={16} /></button>
                                <button className="p-1.5 hover:bg-white rounded shadow-sm hover:text-slate-900 transition"><FileText size={16} /></button>

                                <div className="w-px h-6 bg-slate-300 mx-1" />

                                <button
                                    onClick={handleAIAssist}
                                    disabled={aiGenerating}
                                    className="p-1.5 hover:bg-indigo-50 rounded shadow-sm hover:text-indigo-700 text-indigo-500 transition flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Bot size={16} />
                                    <span className="text-xs font-bold">{aiGenerating ? 'Writing...' : 'AI Assist'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Rich Text Editor */}
                        <RichTextEditor
                            value={activeSection.content}
                            onChange={updateActiveSectionContent}
                            placeholder="Write your lecture content here. Use AI Assist to generate structured explanations instantly..."
                            height="h-[500px]"
                        />

                        {/* Linked Questions section */}
                        <div className="mt-12 pt-8 border-t border-slate-200 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                                        <FileText size={16} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">🔗 সংযুক্ত অনুমোদিত প্রশ্নাবলী</h4>
                                        <p className="text-xs text-slate-400">এই টপিকের অধীনে শিক্ষার্থীদের জন্য নির্বাচিত প্রশ্নসমূহ</p>
                                    </div>
                                </div>
                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {(activeSection.questions || []).length} টি প্রশ্ন
                                </span>
                            </div>

                            {activeSection.questions && activeSection.questions.length > 0 ? (
                                <div className="grid gap-4">
                                    {activeSection.questions.map((q, qidx) => (
                                        <div 
                                            key={q.questionId || q.id} 
                                            className={`p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-4 border-l-4 ${
                                                q.type === 'MCQ' ? 'border-l-indigo-500' : 'border-l-emerald-500'
                                            }`}
                                        >
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        q.type === 'MCQ' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {q.type}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                        {q.difficulty}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                        মান: {q.marks || 1}
                                                    </span>
                                                </div>

                                                <div 
                                                    className="text-slate-700 font-medium text-sm leading-relaxed q-preview" 
                                                    dangerouslySetInnerHTML={{ __html: q.questionText }} 
                                                />
                                                
                                                {/* MCQ Options Rendering */}
                                                {q.type === 'MCQ' && q.statements && q.statements.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-2">
                                                        {q.statements.map((stmt, sIdx) => (
                                                            <div key={sIdx} className="text-xs text-slate-500 flex items-start gap-1.5 font-medium">
                                                                <span className="font-bold text-slate-400">{String.fromCharCode(2437 + sIdx)}.</span>
                                                                <span>{stmt}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Question Actions */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button 
                                                    onClick={() => handleMoveQuestion(activeSection.id, q.questionId || q.id, 'up')}
                                                    disabled={qidx === 0}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-30 transition-all"
                                                    title="উপরে নিয়ে যান"
                                                >
                                                    <ChevronUp size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => handleMoveQuestion(activeSection.id, q.questionId || q.id, 'down')}
                                                    disabled={qidx === activeSection.questions.length - 1}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-30 transition-all"
                                                    title="নিচে নিয়ে যান"
                                                >
                                                    <ChevronDown size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => handleRemoveQuestion(activeSection.id, q.questionId || q.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="বাদ দিন"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center">
                                    <FileText className="text-slate-300 mb-2" size={32} />
                                    <p className="text-slate-500 text-sm font-semibold">এই টপিকের অধীনে কোনো প্রশ্ন সংযুক্ত নেই।</p>
                                    <p className="text-xs text-slate-400 mt-1">আরএজি জেনারেট করুন অথবা পরে প্রশ্নপত্র তৈরিতে প্রশ্ন যোগ করুন।</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Attachment Side Panel */}
            <AttachmentPanel
                lectureId={lectureId}
                isOpen={showAttachments}
                onClose={() => setShowAttachments(false)}
            />
        </div >
    );
};

export default LectureBuilder;
