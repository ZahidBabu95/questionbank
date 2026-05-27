import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Sparkles, ScanSearch, Brain, Upload, FileText, Image as ImageIcon,
    Loader2, Check, AlertTriangle, ChevronRight, Download, Pencil, Trash2,
    BookOpen, Plus, X, Eye, RefreshCw, Bot, Tag, Edit3, Save, ChevronDown, ChevronUp,
    GraduationCap, BookMarked, Layers, FileSearch
} from 'lucide-react';
import axios from '../../../utils/axios';
import questionService from '../../../services/questionService';
import academicService from '../../../services/academicService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import { useScrapeCache } from '../../../hooks/useScrapeCache';
import useAutoSave from '../../../hooks/useAutoSave';
import ScrapedQuestionCard from './components/ScrapedQuestionCard';
import HierarchySelectorPanel from './components/HierarchySelectorPanel';
import FileUploadZone from './components/FileUploadZone';
import MetadataPanel from './components/MetadataPanel';
import SourceDocumentViewer from './components/SourceDocumentViewer';
import LiveImageCropperModal from './components/LiveImageCropperModal';

const TABS = [
    { key: 'scraper', label: 'প্রশ্ন স্ক্র্যাপার', bn: 'PDF/ছবি থেকে প্রশ্ন বের করুন', icon: <ScanSearch size={18} />, color: 'from-violet-500 to-fuchsia-500' },
    { key: 'generator', label: 'প্রশ্ন জেনারেটর', bn: 'AI দিয়ে নতুন প্রশ্ন তৈরি', icon: <Brain size={18} />, color: 'from-blue-500 to-cyan-500' },
];

const QUESTION_TYPES = [
    { key: 'MCQ', label: 'MCQ', icon: '🅰' },
    { key: 'CQ', label: 'CQ', icon: '📝' },
    { key: 'SHORT', label: 'Short', icon: '✍️' },
];

const ImportAI = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('scraper');
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [message, setMessage] = useState(null);
    const [questionType, setQuestionType] = useState('MCQ');
    const [previewQuestion, setPreviewQuestion] = useState(null);
    const [activeSourcePage, setActiveSourcePage] = useState(1);
    const [remoteFileUrl, setRemoteFileUrl] = useState(null);
    const [remoteFileType, setRemoteFileType] = useState(null);
    const [cropperTarget, setCropperTarget] = useState(null); // { questionId, optionIndex }
    const fileInputRef = useRef(null);

    // Metadata state
    const [metadata, setMetadata] = useState(null);
    const [editingMeta, setEditingMeta] = useState(false);
    const [metaForm, setMetaForm] = useState({});
    const [metaPanelOpen, setMetaPanelOpen] = useState(true);

    // Advanced Custom Prompt
    const [customPrompt, setCustomPrompt] = useState('');

    // Generator-specific state
    const [genTopic, setGenTopic] = useState('');
    const [genCount, setGenCount] = useState(10);
    const [genDifficulty, setGenDifficulty] = useState('MIXED');
    const [genBloom, setGenBloom] = useState('MIXED');

    // Hierarchy Hook
    const {
        levels, streams, classes, subjects, chapters, topics,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
        restoreHierarchy,
    } = useAcademicHierarchy();

    // Cache Hook
    const { getCachedResult, saveToCache, computeFileHash } = useScrapeCache();

    // Auto-Save Hook (for Editor Recovery)
    const { restoreData, clearSavedData, hasSavedData, lastSavedTime } = useAutoSave('qst_importai_draft_v1', {
        extractedQuestions, activeTab, questionType, 
        metadata, metaForm, 
        levelId, streamId, classId, subjectId, chapterId, topicId
    });

    const handleRestoreDraft = () => {
        const saved = restoreData();
        if (saved) {
            setExtractedQuestions(saved.extractedQuestions || []);
            if (saved.activeTab) setActiveTab(saved.activeTab);
            if (saved.questionType) setQuestionType(saved.questionType);
            if (saved.metadata) setMetadata(saved.metadata);
            if (saved.metaForm) setMetaForm(saved.metaForm);
            
            // Restore hierarchy (using the custom hook's method)
            if (saved.classId || saved.subjectId) {
                // If the backend call is needed, we could use classSubjectId, but simple local restore is to set directly
                setLevelId(saved.levelId);
                setStreamId(saved.streamId);
                setClassId(saved.classId);
                setSubjectId(saved.subjectId);
                setChapterId(saved.chapterId);
                setTopicId(saved.topicId);
            }
            setMessage({ type: 'success', text: 'অটো-সেভ করা ড্রাফট সফলভাবে রিস্টোর হয়েছে!' });
        }
    };

    // ─── Render text with embedded markdown images ───
    const renderWithImages = React.useCallback((text) => {
        if (!text) return null;
        // Match ![alt](url) pattern
        const parts = text.split(/(![^\[]*\[[^\]]*\]\([^)]+\))/g);
        return parts.map((part, i) => {
            const match = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (match) {
                return (
                    <div key={i} className="my-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 inline-block max-w-full">
                        <img
                            src={match[2]}
                            alt={match[1] || 'ছবি'}
                            className="max-w-full max-h-64 object-contain rounded"
                            onError={(e) => { e.target.style.display='none'; }}
                        />
                    </div>
                );
            }
            return <span key={i}>{part}</span>;
        });
    }, []);

    // Inline chapter/topic creation
    const [newChapterName, setNewChapterName] = useState('');
    const [creatingChapter, setCreatingChapter] = useState(false);
    const [showNewChapter, setShowNewChapter] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [creatingTopic, setCreatingTopic] = useState(false);
    const [showNewTopic, setShowNewTopic] = useState(false);
    const [localChapters, setLocalChapters] = useState([]);
    const [localTopics, setLocalTopics] = useState([]);
    const [hierarchyOpen, setHierarchyOpen] = useState(true);
    React.useEffect(() => { setLocalChapters(chapters); }, [chapters]);
    React.useEffect(() => { setLocalTopics(topics); }, [topics]);

    const handleCreateChapter = async () => {
        if (!newChapterName.trim() || !subjectId) return;
        setCreatingChapter(true);
        try {
            const created = await academicService.createChapter(subjectId, { name: newChapterName.trim(), order: localChapters.length + 1, isActive: true });
            setLocalChapters(p => [...p, created]);
            setChapterId(created.id);
            setNewChapterName(''); setShowNewChapter(false);
        } catch { } finally { setCreatingChapter(false); }
    };

    const handleCreateTopic = async () => {
        if (!newTopicName.trim() || !chapterId) return;
        setCreatingTopic(true);
        try {
            const created = await academicService.createTopic(chapterId, { name: newTopicName.trim(), order: localTopics.length + 1 });
            setLocalTopics(p => [...p, created]);
            setTopicId(created.id);
            setNewTopicName(''); setShowNewTopic(false);
        } catch { } finally { setCreatingTopic(false); }
    };

    // Chunked processing state
    const [chunkedJob, setChunkedJob] = useState(null);
    const [chunkProgress, setChunkProgress] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [pausedJob, setPausedJob] = useState(null); // { jobId, file, estimatedChunks, allQs, meta, nextChunk }
    const [academicSuggestions, setAcademicSuggestions] = useState({ classes: [], subjects: [], chapters: [], topics: [] });
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);
    const [curriculumRule, setCurriculumRule] = useState(null); // { found: bool, title: string }

    // Fetch academic suggestions for autocomplete - deferred by 3s to avoid
    // hitting rate limits alongside useAcademicHierarchy's cascade calls on mount
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const [classRes, subjectRes] = await Promise.all([
                    axios.get('/v1/academic/classes').catch(() => ({ data: [] })),
                    axios.get('/v1/academic/subjects').catch(() => ({ data: [] })),
                ]);
                setAcademicSuggestions(prev => ({
                    ...prev,
                    classes: Array.isArray(classRes.data) ? classRes.data.map(c => c.name) : [],
                    subjects: Array.isArray(subjectRes.data) ? subjectRes.data.map(s => s.name) : [],
                }));
            } catch (e) { console.log('suggestions fetch failed', e); }
        }, 3000); // Delay 3s: let hierarchy hook finish its cascade first
        return () => clearTimeout(timer);
    }, []);

    // Auto-detect Curriculum Rule when subject is selected
    React.useEffect(() => {
        const checkCurriculumRule = async () => {
            const subjectName = subjects.find(s => s.classSubjectId === subjectId)?.subjectName || '';
            if (!subjectName) { setCurriculumRule(null); return; }
            try {
                const { data } = await axios.get('/v1/support/knowledge');
                const tag = `RULE_FOR_${subjectName.replace(/\s/g, '')}`;
                // Note: Java boolean 'isActive' → JSON key is 'isActive' (not 'active')
                const found = (data || []).find(kb => kb.tags && kb.tags.includes(tag) && kb.tags.includes('TARGET_RULE') && kb.isActive !== false);
                setCurriculumRule(found ? { found: true, title: found.title } : { found: false });
            } catch {
                setCurriculumRule(null);
            }
        };
        checkCurriculumRule();
    }, [subjectId, subjects]);

    // Read jobId from URL query params
    const [searchParams] = useSearchParams();
    const jobIdFromUrl = searchParams.get('jobId');

    // Load questions from DB via jobId (primary) or sessionStorage (fallback)
    React.useEffect(() => {
        const loadFromDB = async (jobId) => {
            try {
                setProcessing(true);
                setProgressText('ডাটাবেস থেকে প্রশ্ন লোড হচ্ছে...');
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`/v1/ai/chunked/questions/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const result = data?.data;
                const questions = result?.questions || [];
                const meta = result?.metadata;
                setProcessing(false);
                setProgressText('');
                if (questions.length > 0) {
                    questions.forEach(q => { q.id = crypto.randomUUID(); q.status = q.status || 'ready'; });
                    setExtractedQuestions([...questions]);
                    setMessage({ type: 'success', text: `${questions.length}টি প্রশ্ন ডাটাবেস থেকে লোড হয়েছে (${result?.chunksProcessed || '?'}টি চাংক)। মেটাডেটা যাচাই করে সংরক্ষণ করুন।` });
                    if (result?.fileUrl) {
                        setRemoteFileUrl(result.fileUrl);
                        setRemoteFileType(result.fileType);
                    }
                } else {
                    setMessage({ type: 'error', text: 'ডাটাবেসে কোনো প্রশ্ন পাওয়া যায়নি। দয়া করে Processing Queue থেকে পুনরায় প্রক্রিয়া করুন।' });
                }
                if (meta) {
                    const displayMeta = { ...meta };
                    setMetadata(displayMeta);
                    setMetaForm({
                        className: displayMeta.className || displayMeta.class || '',
                        subject:   displayMeta.subject || '',
                        chapter:   displayMeta.chapter || '',
                        chapterNo: displayMeta.chapterNo || '',
                        topic:     displayMeta.topic || '',
                    });
                    setMetaPanelOpen(true);
                }

            } catch (e) {
                setProcessing(false);
                setProgressText('');
                console.error('Failed to load from DB:', e);
                setMessage({ type: 'error', text: `ডাটাবেস থেকে লোড ব্যর্থ: ${e.response?.data?.message || e.message}` });
            }
        };

        if (jobIdFromUrl) {
            loadFromDB(jobIdFromUrl);

            // Restore hierarchy from URL params — resolve full chain via backend
            const csId  = searchParams.get('classSubjectId');
            const chapId = searchParams.get('chapterId');
            const topId  = searchParams.get('topicId');
            if (csId) {
                // Fetch levelId/streamId/classId from backend using classSubjectId
                axios.get(`/v1/academic/class-subjects/${csId}/hierarchy`)
                    .then(({ data }) => {
                        restoreHierarchy({
                            levelId:        data.levelId,
                            streamId:       data.streamId,
                            classId:        data.classId,
                            classSubjectId: data.classSubjectId,
                            chapterId:      chapId || null,
                            topicId:        topId  || null,
                        });
                    })
                    .catch(e => console.error('Failed to restore hierarchy:', e));
            }
            return;
        }

        // Fallback: try sessionStorage
        try {
            const storedQs = sessionStorage.getItem('ai_import_questions');
            const storedMeta = sessionStorage.getItem('ai_import_metadata');
            if (storedQs) {
                const questions = JSON.parse(storedQs);
                if (questions && questions.length > 0) {
                    questions.forEach(q => { q.id = crypto.randomUUID(); q.status = q.status || 'ready'; });
                    setExtractedQuestions([...questions]);
                    setMessage({ type: 'success', text: `${questions.length}টি প্রশ্ন লোড হয়েছে (Processing Queue থেকে)। মেটাডেটা যাচাই করে সংরক্ষণ করুন।` });
                }
                sessionStorage.removeItem('ai_import_questions');
            }
            if (storedMeta) {
                const meta = JSON.parse(storedMeta);
                if (meta) {
                    setMetadata(meta);
                    setMetaForm({
                        className: meta.className || '',
                        subject: meta.subject || '',
                        chapter: meta.chapter || '',
                        topic: meta.topic || '',
                    });
                    setMetaPanelOpen(true);
                }
                sessionStorage.removeItem('ai_import_metadata');
            }
        } catch (e) { console.log('Failed to load from sessionStorage:', e); }
    }, [jobIdFromUrl]);

    const getSuggestionsForField = (fieldKey, inputValue) => {
        const val = (inputValue || '').toLowerCase();
        if (!val) return [];
        const map = { className: 'classes', classLevel: 'classes', subject: 'subjects', chapter: 'chapters', topic: 'topics' };
        const list = academicSuggestions[map[fieldKey]] || [];
        return list.filter(item => item && item.toLowerCase().includes(val)).slice(0, 8);
    };

    // Resume chunked processing from where it paused
    const resumeChunkedProcessing = async () => {
        if (!pausedJob) return;
        const { jobId, estimatedChunks, allQs: prevQs, meta: prevMeta, nextChunk } = pausedJob;
        setPausedJob(null);
        setProcessing(true);
        setMessage(null);

        setProgressText(`Resuming parallel processing...`);
        setProgress(50);

        try {
            const cr = await axios.post(`/v1/ai/chunked/process-all/${jobId}`);
            const cd = cr.data?.data;
            const cqs = cd?.questions || [];
            
            // Generate stable IDs
            cqs.forEach((q) => { q.id = crypto.randomUUID(); q.status = 'ready'; q.aiExplanation = true; q.classSubject = subjectId ? {id: subjectId} : undefined; q.chapter = chapterId ? {id: chapterId} : undefined; q.topic = topicId ? {id: topicId} : undefined; });
            
            const meta = cd?.metadata || prevMeta;
            
            if (meta && Object.keys(meta).length > 0) { setMetadata(meta); setMetaForm({ ...meta }); }
            setExtractedQuestions([...cqs]);
            setChunkProgress(null);
            
            if (cqs.length > 0) {
                setMessage({ type: 'success', text: `Parallel processing complete! Total ${cqs.length} questions extracted.` });
            }
        } catch (ce) {
            console.error(`Parallel resume failed:`, ce);
            setMessage({ type: 'error', text: `Parallel processing failed. ${ce.response?.data?.message || ce.message}` });
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };


    const validateFile = (f) => {
        if (!f) return false;
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(f.type)) {
            setMessage({ type: 'error', text: 'শুধুমাত্র PDF বা ইমেজ ফাইল (.pdf, .jpg, .png, .webp) সাপোর্টেড।' });
            return false;
        }
        if (f.size > 20 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'ফাইল সাইজ ২০MB এর বেশি হতে পারবে না।' });
            return false;
        }
        return true;
    };

    const handleFileSelect = (f) => {
        if (validateFile(f)) {
            setFile(f);
            setMessage(null);
            setExtractedQuestions([]);
            setMetadata(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        handleFileSelect(f);
    };

    // Real AI processing via Gemini API
    const processWithAI = async () => {
        if (!file && activeTab === 'scraper') return;
        if (activeTab === 'generator' && !file && !genTopic.trim()) {
            setMessage({ type: 'error', text: 'টপিক বা রেফারেন্স ফাইলের মধ্যে অন্তত একটি দিতে হবে।' });
            return;
        }

        setProcessing(true);
        setExtractedQuestions([]);
        setMetadata(null);
        setMessage(null);
        setDuplicateWarning(null);
        setChunkProgress(null);
        setProgressText('AI processing...');
        setProgress(20);

        // Check IndexedDB Frontend Cache first
        let fileHash = null;
        if (file && activeTab === 'scraper') {
            fileHash = await computeFileHash(file);
                if (fileHash) {
                    const cachedData = await getCachedResult(fileHash);
                    if (cachedData && cachedData.questions?.length > 0) {
                        const { questions, metadata: cacheMeta } = cachedData;
                        
                        // Fake progress
                        setProgress(50);
                        setTimeout(() => setProgress(80), 300);
                        setTimeout(() => {
                            questions.forEach((q) => { q.id = crypto.randomUUID(); q.status = 'ready'; });
                            setExtractedQuestions([...questions]);
                            setMessage({ type: 'success', text: `ক্যাশ থেকে ${questions.length}টি প্রশ্ন লোড হয়েছে (instant)!` });
                            if (cacheMeta) {
                                // Apply generic meta
                                setMetadata({ ...cacheMeta });
                                setMetaForm({
                                    className: cacheMeta.className || cacheMeta.class || '',
                                    subject:   cacheMeta.subject || '',
                                    chapter:   cacheMeta.chapter || '',
                                    topic:     cacheMeta.topic || ''
                                });
                                setMetaPanelOpen(true);
                            }
                            
                            setProcessing(false);
                            setProgress(0);
                        }, 600);
                        return;
                    }
                }
            }

        // ── Build known context from hierarchy picker ──
        const knownClassName  = classes.find(c => c.id === classId)?.name   || '';
        const knownSubject    = subjects.find(s => s.classSubjectId === subjectId)?.subjectName || '';
        const knownChapter    = localChapters.find(c => c.id === chapterId)?.name || '';
        const knownTopic      = localTopics.find(t => t.id === topicId)?.name     || '';
        const knownClassLevel = levels.find(l => l.id === levelId)?.name         || '';

        // Helper: merge AI metadata with known context, then auto-fill hierarchy dropdowns
        const applyMeta = (meta) => {
            if (!meta) return;
            const merged = { ...meta };
            // Override with user-known values (so AI doesn't show wrong data)
            if (knownClassName)  merged.className    = knownClassName;
            if (knownSubject)    merged.subject      = knownSubject;
            if (knownChapter)    merged.chapter      = knownChapter;
            if (knownTopic)      merged.topic        = knownTopic;
            if (knownClassLevel) merged.classLevel   = knownClassLevel;

            // If user already selected class+subject via hierarchy picker,
            // remove those from the metadata panel (they're shown by the pickers)
            const displayMeta = { ...merged };
            if (subjectId) {
                displayMeta.className  = undefined;
                displayMeta.subject    = undefined;
                displayMeta.classLevel = undefined;
            }

            setMetadata(displayMeta);
            setMetaForm({ ...displayMeta });

            // Auto-fill hierarchy dropdowns from AI-detected values (for fields NOT pre-selected)
            if (!chapterId && merged.chapter) {
                const found = localChapters.find(c =>
                    c.name.trim().toLowerCase() === merged.chapter.trim().toLowerCase());
                if (found) setChapterId(found.id);
            }
            if (!topicId && merged.topic) {
                const found = localTopics.find(t =>
                    t.name.trim().toLowerCase() === merged.topic.trim().toLowerCase());
                if (found) setTopicId(found.id);
            }
        };

        try {
            const formData = new FormData();
            if (file) formData.append('file', file);
            formData.append('questionType', questionType);

            // Inject known context so AI skips detecting them (saves tokens)
            if (knownClassName)  formData.append('knownClassName',  knownClassName);
            if (knownSubject)    formData.append('knownSubject',    knownSubject);
            if (knownChapter)    formData.append('knownChapter',    knownChapter);
            if (knownTopic)      formData.append('knownTopic',      knownTopic);
            if (knownClassLevel) formData.append('knownClassLevel', knownClassLevel);

            if (activeTab === 'scraper') {
                if (file && file.type === 'application/pdf') {
                    setProgressText('Creating Processing Job...');
                    const jf = new FormData();
                    jf.append('file', file);
                    jf.append('questionType', questionType);
                    // Save selected hierarchy IDs with the job for history restore
                    if (subjectId) jf.append('classSubjectId', subjectId);
                    if (chapterId) jf.append('chapterId', chapterId);
                    if (topicId)   jf.append('topicId', topicId);
                    if (customPrompt) jf.append('customPrompt', customPrompt);
                    
                    try {
                        const jr = await axios.post('/v1/ai/chunked/create-job', jf, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        const job = jr.data?.data;
                        setMessage({ type: 'success', text: `জব সফলভাবে তৈরি হয়েছে! প্রসেসিং কিউতে রিডাইরেক্ট করা হচ্ছে...` });
                        
                        setTimeout(() => {
                            navigate(`/ai/upload-history?tab=queue&autoStart=${job.id}`);
                        }, 1000);
                        return;
                    } catch (err) {
                        const msg = err.response?.data?.message || err.message;
                        setMessage({ type: 'error', text: `Failed to create job: ${msg}` });
                        setProcessing(false);
                        return;
                    }
                } else if (file && file.type.startsWith('image/')) {
                    // Image -> Direct Scrape (single page, no chunking)
                    setProgressText('ছবি থেকে প্রশ্ন স্ক্র্যাপ হচ্ছে...');
                    setProgress(40);
                    try {
                        const imageForm = new FormData();
                        imageForm.append('file', file);
                        imageForm.append('questionType', questionType);
                        if (knownClassName)  imageForm.append('knownClassName',  knownClassName);
                        if (knownSubject)    imageForm.append('knownSubject',    knownSubject);
                        if (knownChapter)    imageForm.append('knownChapter',    knownChapter);
                        if (knownTopic)      imageForm.append('knownTopic',      knownTopic);
                        if (knownClassLevel) imageForm.append('knownClassLevel', knownClassLevel);
                        if (customPrompt)    imageForm.append('customPrompt',    customPrompt);
                        const ir = await axios.post('/v1/ai/scrape-questions', imageForm, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setProgress(90);
                        const idata = ir.data?.data;
                        const qs = idata?.questions || [];
                        if (qs.length === 0) {
                            setMessage({ type: 'error', text: 'ছবি থেকে কোনো প্রশ্ন পাওয়া যায়নি।' });
                        } else {
                            qs.forEach((q) => { q.id = crypto.randomUUID(); q.status = 'ready'; q.aiExplanation = true; });
                            setExtractedQuestions(qs);
                            setMessage({ type: 'success', text: qs.length + 'টি প্রশ্ন সফলভাবে স্ক্র্যাপ হয়েছে!' });

                            // Save to Local DB cache
                            if (fileHash) saveToCache(fileHash, { questions: qs, metadata: idata?.metadata });
                        }
                        if (idata?.metadata) applyMeta(idata.metadata);
                    } catch (imgErr) {
                        // Handle backend cache hit disguised as success
                        if (imgErr.response?.status === 200 && imgErr.response?.data?.data?.fromCache) {
                            const cached = imgErr.response.data.data;
                            const qs = cached.questions || [];
                            qs.forEach((q) => { q.id = crypto.randomUUID(); q.status = 'ready'; q.aiExplanation = true; });
                            setExtractedQuestions(qs);
                            setMessage({ type: 'success', text: cached.cacheNote || 'ক্যাশ থেকে লোড হয়েছে!' });
                            if (cached.metadata) applyMeta(cached.metadata);
                            if (fileHash) saveToCache(fileHash, { questions: qs, metadata: cached.metadata });
                            return;
                        }
                        const msg = imgErr.response?.data?.message || imgErr.message;
                        setMessage({ type: 'error', text: 'Image scraping failed: ' + msg });
                    } finally {
                        setProcessing(false);
                        setProgress(0);
                    }
                    return;
                } else {
                    setMessage({ type: 'error', text: 'অনুগ্রহ করে PDF বা ইমেজ ফাইল (JPG, PNG, WebP) আপলোড করুন।' });
                    setProcessing(false);
                    return;
                }
            } else {
                formData.append('topic', genTopic);
                formData.append('count', genCount);
                formData.append('difficulty', genDifficulty);
                formData.append('bloomLevel', genBloom);
                setProgressText('Generating...');
                setProgress(40);
                const response = await axios.post('/v1/ai/generate-questions', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                setProgress(80);
                const data = response.data?.data;
                const questions = data?.questions || [];
                if (questions.length === 0) {
                    setMessage({ type: 'error', text: 'No questions generated.' });
                } else {
                    questions.forEach((q) => { q.id = crypto.randomUUID(); q.status = 'ready'; q.aiExplanation = true; q.classSubject = subjectId ? {id: subjectId} : undefined; q.chapter = chapterId ? {id: chapterId} : undefined; q.topic = topicId ? {id: topicId} : undefined; });
                    setExtractedQuestions(questions);
                    setMessage({ type: 'success', text: `${questions.length} questions generated!` });
                }
            }
        } catch (err) {
            console.error('AI error:', err);
            const errMsg = err.response?.data?.message || err.message || 'AI processing failed.';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };


    const removeQuestion = React.useCallback((id) => setExtractedQuestions(prev => prev.filter(q => q.id !== id)), []);

    const handleSaveMeta = () => {
        setMetadata({ ...metaForm });
        setEditingMeta(false);
    };

    // ═══ Question Edit Helpers ═══
    const updateQuestion = React.useCallback((id, field, value) => {
        setExtractedQuestions(prev => prev.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        ));
    }, []);

    const updateQuestionFields = React.useCallback((id, updates) => {
        setExtractedQuestions(prev => prev.map(q =>
            q.id === id ? { ...q, ...updates } : q
        ));
    }, []);

    const updateOption = React.useCallback((qId, optIndex, field, value) => {
        setExtractedQuestions(prev => prev.map(q => {
            if (q.id !== qId) return q;
            const newOptions = [...q.options];
            newOptions[optIndex] = { ...newOptions[optIndex], [field]: value };
            return { ...q, options: newOptions };
        }));
    }, []);

    const handleImportAll = async () => {
        if (extractedQuestions.length === 0) return;
        setProcessing(true);
        setProgressText('ডাটাবেসে সংরক্ষণ হচ্ছে (' + extractedQuestions.length + ' প্রশ্ন)...');

        try {
            const questionsData = [];
            const optionsListData = [];

            // Helper to upload base64 images
            const uploadBase64 = async (b64) => {
                if(!b64 || !b64.startsWith('data:image')) return null;
                try {
                    const res = await fetch(b64);
                    const blob = await res.blob();
                    const fd = new FormData();
                    fd.append('file', blob, 'cropped.jpg');
                    const uploadRes = await axios.post('/v1/questions/upload-image', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    return uploadRes.data?.url || uploadRes.data; // Expects {"url": "..."}
                } catch(e) {
                    console.error("Image upload failed", e);
                    return null;
                }
            };

            // Helper to parsing markdown images to HTML for React-Quill compatibility 
            const convertMdToHtml = (txt) => (txt || '').replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />');

            for (const q of extractedQuestions) {
                const options = [];
                for (const o of (q.options || [])) {
                    let finalOptImgUrl = o.imageUrl;
                    if (finalOptImgUrl && finalOptImgUrl.startsWith('data:image')) {
                        const uploadedOptUrl = await uploadBase64(finalOptImgUrl);
                        if (uploadedOptUrl) finalOptImgUrl = uploadedOptUrl;
                    }

                    let optTextHtml = convertMdToHtml(o.text || o.optionText || '');
                    if (finalOptImgUrl && !optTextHtml.includes(finalOptImgUrl)) {
                        optTextHtml += `<br/><img src="${finalOptImgUrl}" alt="অপশনের ছবি" />`;
                    }

                    options.push({
                        optionLabel: o.label || o.optionLabel || '',
                        optionText: optTextHtml,
                        isCorrect: o.isCorrect === true || o.isCorrect === 'true' || o.correct === true || o.correct === 'true'
                    });
                }

                const explanationText = q.explanation || '';
                const isAiExplanation = q.aiExplanation !== false;

                // Upload locally cropped image
                let finalImageUrl = q.imageUrl;
                if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
                    const uploadedUrl = await uploadBase64(finalImageUrl);
                    if (uploadedUrl) finalImageUrl = uploadedUrl;
                }

                // If a final image exists, prefix it to stimulus as HTML so it renders in React Quill
                let finalStimulus = convertMdToHtml(q.stimulus || '');
                if (finalImageUrl && !finalStimulus.includes(finalImageUrl)) {
                    finalStimulus = `<img src="${finalImageUrl}" alt="প্রশ্নের ছবি" /><br/><br/>${finalStimulus}`;
                }

                const questionData = {
                    questionText: convertMdToHtml(q.questionText),
                    type: q.type || questionType,
                    mcqType: q.mcqType || 'SIMPLE',
                    statements: q.statements || [],
                    stimulus: finalStimulus,
                    explanation: convertMdToHtml(isAiExplanation ? `[AI] ${explanationText}` : explanationText),
                    correctAnswer: convertMdToHtml(q.correctAnswer || ''),
                    bloomLevel: q.bloomLevel || 'KNOWLEDGE',
                    difficulty: q.difficulty || 'MEDIUM',
                    marks: (q.type || questionType) === 'CQ' ? 10 : (q.type || questionType) === 'SHORT' ? 2 : 1,
                    language: 'Bangla',
                    aiGenerated: true,
                    // Per-question topic overrides global topic for source reference
                    sourceReference: q.source || (metadata
                        ? [metadata.className, metadata.subject, metadata.chapter,
                           q.topic || metadata.topic].filter(Boolean).join(' | ')
                        : ''),
                    // Per-question topic name — backend will auto-link to topic entity
                    topicName: q.topic || null,
                };

                questionsData.push(questionData);
                optionsListData.push(options);
            }

            // ── Hybrid Linking Strategy ──
            // academicIds: direct UUIDs from hierarchy picker (highest priority)
            const academicIds = {};
            if (subjectId)  academicIds.classSubjectId = String(subjectId); // subjectId = classSubjectId
            if (chapterId)  academicIds.chapterId      = String(chapterId);
            if (topicId)    academicIds.topicId        = String(topicId);

            // autoLinkMetadata: AI-detected names for fields NOT manually selected
            // Backend will name-match and auto-create these when IDs are absent
            const autoLinkMetadata = {};
            if (!chapterId && metadata?.chapter)  autoLinkMetadata.chapter = metadata.chapter;
            if (!topicId   && metadata?.topic)    autoLinkMetadata.topic   = metadata.topic;
            // className + subject only needed if no classSubjectId selected
            if (!subjectId) {
                if (metadata?.className) autoLinkMetadata.className = metadata.className;
                if (metadata?.subject)   autoLinkMetadata.subject   = metadata.subject;
            }

            await questionService.createMCQBulk(
                questionsData,
                optionsListData,
                Object.keys(autoLinkMetadata).length > 0 ? autoLinkMetadata : null,
                Object.keys(academicIds).length > 0 ? academicIds : undefined
            );

            setMessage({ type: 'success', text: `সবগুলো (${extractedQuestions.length}) প্রশ্ন সফলভাবে ডাটাবেসে ইম্পোর্ট হয়েছে!` });
            
            // ── Mark as Imported in Upload History ──
            try {
                const searchParams = new URLSearchParams(window.location.search);
                const urlJobId = searchParams.get('jobId');
                
                let curFileHash = null;
                if (file) {
                    const cryptoBuffer = await file.arrayBuffer();
                    const hashBuffer = await crypto.subtle.digest('SHA-256', cryptoBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    curFileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                }
                
                await axios.post('/v1/ai/upload-history/mark-imported', {
                    jobId: urlJobId,
                    fileHash: curFileHash
                });
            } catch (e) {
                console.error("Failed to mark history as imported:", e);
            }

            // Clear screen after save
            setExtractedQuestions([]);
            setMetadata(null);
            setFile(null);
            if (activeTab === 'generator') {
                setGenTopic('');
            }
        } catch (err) {
            console.error('Import error:', err);
            setMessage({ type: 'error', text: 'ইম্পোর্ট ব্যর্থ: ' + (err.response?.data?.message || err.message) });
        } finally {
            setProcessing(false);
            setProgressText('');
        }
    };

    const isPdf = file ? file.type === 'application/pdf' : remoteFileType === 'application/pdf';
    const isImage = file ? file.type.startsWith('image/') : remoteFileType?.startsWith('image/');
    
    const hasFileSource = file != null || remoteFileUrl != null;
    const isSplitScreen = activeTab === 'scraper' && hasFileSource && extractedQuestions.length > 0;
    const hasResults = extractedQuestions.length > 0;

    // ═══ Metadata Fields Definition ═══
    const META_FIELDS = [
        { key: 'className', label: 'শ্রেণি', icon: <GraduationCap size={13} /> },
        { key: 'classLevel', label: 'স্তর', icon: <Layers size={13} /> },
        { key: 'subject', label: 'বিষয়/বই', icon: <BookMarked size={13} /> },
        { key: 'chapter', label: 'অধ্যায়', icon: <BookOpen size={13} /> },
        { key: 'chapterNo', label: 'অধ্যায় নং', icon: <Tag size={13} /> },
        { key: 'topic', label: 'টপিক', icon: <FileSearch size={13} /> },
    ];

    const showMetaPanel = metadata && META_FIELDS.some(f => metadata[f.key]);

    return (
        <div className="w-full">
            {/* ═══ AUTO-SAVE BANNER ═══ */}
            {hasSavedData && extractedQuestions.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 mb-5 rounded-xl flex flex-wrap items-center justify-between shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="text-amber-500" size={20} /></div>
                        <div>
                            <p className="text-sm font-bold text-amber-800">অসম্পূর্ণ কাজের ড্রাফট পাওয়া গেছে!</p>
                            <p className="text-xs text-amber-700">লোডশেডিং বা ট্যাব বন্ধ হওয়ার আগের ডেটা। সর্বশেষ সেভ: {lastSavedTime ? lastSavedTime.toLocaleTimeString() : 'কিছুক্ষণ আগে'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleRestoreDraft} className="px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-amber-600 transition-colors">ডেটা রিকভার করুন</button>
                        <button type="button" onClick={clearSavedData} className="px-3 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">ড্রাফট মুছুন</button>
                    </div>
                </div>
            )}
            
            {!isSplitScreen && (
                <>
                    {/* ═══ HEADER ═══ */}
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-primary text-xs mb-1 transition-colors">
                                <ArrowLeft size={12} /> পেছনে যান
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles size={22} className="text-violet-500" /> Import With AI
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">কৃত্রিম বুদ্ধিমত্তা ব্যবহার করে প্রশ্ন স্ক্র্যাপ বা জেনারেট করুন</p>
                        </div>
                    </div>

                    {/* ═══ TAB SELECTOR ═══ */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {TABS.map(tab => (
                            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExtractedQuestions([]); setFile(null); setMessage(null); setMetadata(null); }}
                                className={`relative p-4 rounded-2xl border-2 transition-all group overflow-hidden ${activeTab === tab.key
                                    ? 'border-transparent shadow-lg scale-[1.01]'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}>
                                {activeTab === tab.key && (
                                    <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} opacity-10`}></div>
                                )}
                                <div className="relative z-10 flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === tab.key
                                        ? `bg-gradient-to-br ${tab.color} text-white shadow-lg`
                                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                                    }`}>
                                        {tab.icon}
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-sm font-bold ${activeTab === tab.key ? 'text-slate-800' : 'text-slate-600'}`}>
                                            {tab.label}
                                        </div>
                                        <div className="text-[11px] text-slate-400">{tab.bn}</div>
                                    </div>
                                </div>
                                {activeTab === tab.key && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`}></div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* CHUNK PROGRESS */}
            {chunkProgress && (
                <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-indigo-700">
                            Chunk {chunkProgress.current}/{chunkProgress.total} processing...
                        </span>
                        <span className="text-sm font-bold text-indigo-600">{chunkProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-indigo-100 rounded-full h-3">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${chunkProgress.percent}%` }}></div>
                    </div>
                    <p className="text-xs text-indigo-500 mt-1">
                        {extractedQuestions.length} questions found so far
                    </p>
                </div>
            )}

            {/* DUPLICATE WARNING */}
            {duplicateWarning && (
                <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle size={16} />
                    {duplicateWarning}
                </div>
            )}

            {/* MESSAGE */}
            {message && (
                <div className={`mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            {/* RESUME BUTTON */}
            {pausedJob && !processing && (
                <div className="mb-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-violet-800 flex items-center gap-2">
                                <RefreshCw size={18} /> Chunked Processing Paused
                            </h4>
                            <p className="text-sm text-violet-600 mt-1">
                                {extractedQuestions.length} questions found | Chunk {pausedJob.nextChunk + 1}/{pausedJob.estimatedChunks} remaining
                            </p>
                        </div>
                        <button onClick={resumeChunkedProcessing}
                            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2 cursor-pointer">
                            <RefreshCw size={16} /> Resume Processing
                        </button>
                    </div>
                    <div className="mt-3 w-full bg-violet-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${(pausedJob.nextChunk / pausedJob.estimatedChunks * 100).toFixed(0)}%` }}></div>
                    </div>
                </div>
            )}

            <div className={`flex flex-col lg:flex-row gap-5 ${isSplitScreen ? 'h-[calc(100vh-80px)] overflow-hidden -mx-2 px-2' : ''}`}>
                {/* ─── LEFT: Upload & Controls / Document Viewer ─── */}
                <div className={`${isSplitScreen ? 'w-full lg:w-[45%] h-full flex flex-col min-h-0' : 'flex-1'} min-w-0 space-y-4`}>

                    {!isSplitScreen ? (
                        <>
                            {/* ─── HIERARCHY SELECTOR PANEL ─── */}
                            <HierarchySelectorPanel controls={{
                                levels, streams, classes, subjects,
                                levelId, streamId, classId, subjectId, chapterId, topicId,
                                setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
                                curriculumRule, hierarchyOpen, setHierarchyOpen,
                                newChapterName, setNewChapterName, creatingChapter, showNewChapter, setShowNewChapter, handleCreateChapter, localChapters,
                                newTopicName, setNewTopicName, creatingTopic, showNewTopic, setShowNewTopic, handleCreateTopic, localTopics
                            }} />

                            {/* Question Type */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">প্রশ্নের ধরন</label>
                                <div className="flex gap-2">
                                    {QUESTION_TYPES.map(t => (
                                        <button key={t.key} onClick={() => setQuestionType(t.key)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${questionType === t.key
                                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-200'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}>
                                            <span>{t.icon}</span> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generator-specific: Topic Input */}
                            {activeTab === 'generator' && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">টপিক / বিষয়বস্তু নির্দেশনা</label>
                                    <textarea value={genTopic} onChange={e => setGenTopic(e.target.value)}
                                        rows={3} placeholder="যেমন: পদার্থবিজ্ঞান — নিউটনের গতিসূত্র, বল ও ত্বরণের সম্পর্ক..."
                                        className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">সংখ্যা</label>
                                            <input type="number" value={genCount} onChange={e => setGenCount(e.target.value)} min={1} max={50}
                                                className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">কঠিনতা</label>
                                            <select value={genDifficulty} onChange={e => setGenDifficulty(e.target.value)}
                                                className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20">
                                                <option value="MIXED">মিশ্র</option>
                                                <option value="EASY">সহজ</option>
                                                <option value="MEDIUM">মাঝারি</option>
                                                <option value="HARD">কঠিন</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bloom</label>
                                            <select value={genBloom} onChange={e => setGenBloom(e.target.value)}
                                                className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20">
                                                <option value="MIXED">মিশ্র</option>
                                                <option value="KNOWLEDGE">জ্ঞান</option>
                                                <option value="COMPREHENSION">অনুধাবন</option>
                                                <option value="APPLICATION">প্রয়োগ</option>
                                                <option value="HIGHER_ORDER">উচ্চতর</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* File Upload Zone */}
                            <FileUploadZone 
                                dragging={dragging}
                                setDragging={setDragging}
                                handleDrop={handleDrop}
                                processing={processing}
                                fileInputRef={fileInputRef}
                                handleFileSelect={handleFileSelect}
                                file={file}
                                isPdf={isPdf}
                                activeTab={activeTab}
                                setFile={setFile}
                                setExtractedQuestions={setExtractedQuestions}
                                setMetadata={setMetadata}
                            />

                            {/* Advanced Instructions */}
                            {activeTab === 'scraper' && file && !processing && extractedQuestions.length === 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        <Bot size={14} className="text-violet-500" /> Advanced Instructions 
                                        <span className="text-[10px] text-slate-400 normal-case font-medium ml-2">(ঐচ্ছিক)</span>
                                    </label>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        rows={2}
                                        placeholder="যেমন: এটি ঢাকা ভার্সিটির ফিজিক্সের প্রশ্ন, সমীকরণগুলো LaTeX-এ দাও।"
                                        className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 outline-none resize-none"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        এই বক্সে নির্দিষ্ট কোনো রুল লিখলে AI সেই রুল অনুযায়ী প্রশ্ন স্ক্র্যাপ করবে। (যেমন: Table ফরম্যাট করা, ম্যাথ এর সূত্র LaTeX এ দেওয়া ইত্যাদি)।
                                    </p>
                                </div>
                            )}

                            {/* Process Button */}
                            {(file || (activeTab === 'generator' && genTopic.trim())) && !processing && extractedQuestions.length === 0 && (
                                <button onClick={processWithAI}
                                    className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                                    <Sparkles size={18} />
                                    {activeTab === 'scraper' ? 'AI দিয়ে প্রশ্ন স্ক্র্যাপ করুন' : 'AI দিয়ে প্রশ্ন জেনারেট করুন'}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800">{classes.find(c => c.id == classId)?.name || 'Class'}</span>
                                <span className="text-slate-300">/</span>
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800">{subjects.find(s => s.id == subjectId)?.name || 'Subject'}</span>
                                {chapterId && (
                                    <>
                                        <span className="text-slate-300">/</span>
                                        <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800 max-w-[150px] truncate">
                                            {localChapters.find(c => c.id == chapterId)?.name || 'Chapter'}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setFile(null) || setExtractedQuestions([])} className="text-xs px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors rounded-lg font-bold text-slate-500 flex items-center gap-1">
                                    <X size={14} /> বাতিল
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {processing && (
                        <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                                    <Loader2 size={20} className="text-white animate-spin" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-700">{progressText}</p>
                                    <p className="text-[11px] text-slate-400">AI প্রসেসিং চলছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {/* ═══ RESULTS SECTION IN NON-SPLIT MODE (Generator) ═══ */}
                    {!isSplitScreen && hasResults && (
                        <>
                            <MetadataPanel 
                                extractedQuestions={extractedQuestions}
                                showMetaPanel={showMetaPanel}
                                metadata={metadata}
                                META_FIELDS={META_FIELDS}
                                editingMeta={editingMeta}
                                setEditingMeta={setEditingMeta}
                                metaForm={metaForm}
                                setMetaForm={setMetaForm}
                                handleSaveMeta={handleSaveMeta}
                                metaPanelOpen={metaPanelOpen}
                                setMetaPanelOpen={setMetaPanelOpen}
                                activeSuggestionField={activeSuggestionField}
                                setActiveSuggestionField={setActiveSuggestionField}
                                getSuggestionsForField={getSuggestionsForField}
                            />
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Check size={16} className="text-emerald-500" />
                                        জেনারেটকৃত প্রশ্ন ({extractedQuestions.length} টি)
                                    </h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setExtractedQuestions([]); setFile(null); setMetadata(null); setRemoteFileUrl(null); }}
                                            className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                                            <RefreshCw size={12} /> পুনরায় করুন
                                        </button>
                                    </div>
                                </div>

                                {extractedQuestions.map((q, idx) => (
                                    <ScrapedQuestionCard 
                                        key={q.id} q={q} idx={idx}
                                        previewQuestion={previewQuestion} setPreviewQuestion={setPreviewQuestion}
                                        updateQuestion={updateQuestion} removeQuestion={removeQuestion}
                                        renderWithImages={renderWithImages}
                                        activeSourcePage={activeSourcePage}
                                        setActiveSourcePage={setActiveSourcePage}
                                        setCropperTarget={setCropperTarget}
                                    />
                                ))}

                                {/* Floating Smart Action Bar */}
                                <div className="sticky bottom-6 mt-8 z-20">
                                    <div className="bg-white/90 backdrop-blur-md border border-slate-200/50 p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-3">
                                        <div className="flex-1 px-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <Check className="text-emerald-600" size={20} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">সর্বমোট {extractedQuestions.length}টি প্রশ্ন প্রস্তুত</div>
                                                <div className="text-[10px] font-medium text-slate-500">প্রুফিং শেষ হলে মূল ডাটাবেসে যুক্ত করুন</div>
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleImportAll} disabled={processing}
                                            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:hover:scale-100">
                                            {processing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                            ডাটাবেসে ইম্পোর্ট করুন
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* SOURCE VIEWER (SPLIT SCREEN LEFT) */}
                    {isSplitScreen && (
                        <div className="mt-4 flex-1 overflow-hidden">
                            <SourceDocumentViewer file={file} remoteUrl={remoteFileUrl} remoteType={remoteFileType} activeSourcePage={activeSourcePage} />
                        </div>
                    )}
                </div>

                {/* ─── RIGHT: Guide Panel OR Extracted Questions ─── */}
                <div className={`${isSplitScreen ? 'w-full lg:w-[55%] h-full overflow-y-auto custom-scrollbar pr-2 pb-10' : 'w-full lg:w-[300px] xl:w-[330px]'} shrink-0 space-y-4`}>
                    
                    {isSplitScreen ? (
                        <>
                            <MetadataPanel 
                                extractedQuestions={extractedQuestions}
                                showMetaPanel={showMetaPanel}
                                metadata={metadata}
                                META_FIELDS={META_FIELDS}
                                editingMeta={editingMeta}
                                setEditingMeta={setEditingMeta}
                                metaForm={metaForm}
                                setMetaForm={setMetaForm}
                                handleSaveMeta={handleSaveMeta}
                                metaPanelOpen={metaPanelOpen}
                                setMetaPanelOpen={setMetaPanelOpen}
                                activeSuggestionField={activeSuggestionField}
                                setActiveSuggestionField={setActiveSuggestionField}
                                getSuggestionsForField={getSuggestionsForField}
                            />
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Check size={16} className="text-emerald-500" />
                                        শনাক্তকৃত প্রশ্ন ({extractedQuestions.length} টি)
                                    </h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setExtractedQuestions([]); setFile(null); setMetadata(null); }}
                                            className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                                            <RefreshCw size={12} /> পুনরায় করুন
                                        </button>
                                    </div>
                                </div>

                                {extractedQuestions.map((q, idx) => (
                                    <ScrapedQuestionCard 
                                        key={q.id} q={q} idx={idx}
                                        previewQuestion={previewQuestion} setPreviewQuestion={setPreviewQuestion}
                                        updateQuestion={updateQuestion} removeQuestion={removeQuestion}
                                        renderWithImages={renderWithImages}
                                        activeSourcePage={activeSourcePage}
                                        setActiveSourcePage={setActiveSourcePage}
                                        setCropperTarget={setCropperTarget}
                                    />
                                ))}

                                {/* Floating Smart Action Bar */}
                                <div className="sticky bottom-6 mt-8 z-20">
                                    <div className="bg-white/90 backdrop-blur-md border border-slate-200/50 p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-3">
                                        <div className="flex-1 px-3 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <Check className="text-emerald-600" size={20} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">সর্বমোট {extractedQuestions.length}টি প্রশ্ন প্রস্তুত</div>
                                                <div className="text-[10px] font-medium text-slate-500">প্রুফিং শেষ হলে মূল ডাটাবেসে যুক্ত করুন</div>
                                            </div>
                                        </div>
                                        
                                        <button onClick={handleImportAll} disabled={processing}
                                            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 disabled:hover:scale-100">
                                            {processing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                            ডাটাবেসে ইম্পোর্ট করুন
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>

                    {/* How it Works */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-violet-500" /> কিভাবে কাজ করে
                        </h3>
                        {activeTab === 'scraper' ? (
                            <div className="space-y-2.5">
                                {[
                                    { step: '১', text: 'প্রশ্নপত্রের PDF বা ছবি আপলোড করুন', icon: '📄' },
                                    { step: '২', text: 'AI স্বয়ংক্রিয়ভাবে প্রশ্ন, অপশন, উত্তর ও মেটাডেটা শনাক্ত করবে', icon: '🤖' },
                                    { step: '৩', text: 'শ্রেণি, বিষয়, অধ্যায় রিভিউ ও সম্পাদনা করুন', icon: '✏️' },
                                    { step: '৪', text: 'এক ক্লিকে সব প্রশ্ন ডাটাবেসে ইম্পোর্ট করুন', icon: '✅' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-2.5 p-2 bg-violet-50/50 rounded-lg">
                                        <span className="text-lg">{s.icon}</span>
                                        <div>
                                            <span className="text-[10px] font-bold text-violet-500">ধাপ {s.step}</span>
                                            <p className="text-[11px] text-slate-600">{s.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {[
                                    { step: '১', text: 'বইয়ের পৃষ্ঠা বা টপিকের নাম দিন', icon: '📚' },
                                    { step: '২', text: 'AI NCTB কারিকুলাম অনুযায়ী প্রশ্ন তৈরি করবে', icon: '🧠' },
                                    { step: '৩', text: 'রিভিউ করে এক ক্লিকে ইম্পোর্ট করুন', icon: '🚀' },
                                ].map(s => (
                                    <div key={s.step} className="flex items-start gap-2.5 p-2 bg-blue-50/50 rounded-lg">
                                        <span className="text-lg">{s.icon}</span>
                                        <div>
                                            <span className="text-[10px] font-bold text-blue-500">ধাপ {s.step}</span>
                                            <p className="text-[11px] text-slate-600">{s.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Features */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">AI শনাক্ত করে</h3>
                        <div className="space-y-1.5">
                            {[
                                { feature: 'শ্রেণি ও স্তর', desc: 'মাধ্যমিক/উচ্চ মাধ্যমিক', color: 'text-indigo-500 bg-indigo-50' },
                                { feature: 'বিষয় ও অধ্যায়', desc: 'বই ও পাঠের নাম', color: 'text-violet-500 bg-violet-50' },
                                { feature: 'পরীক্ষার সোর্স', desc: 'সাল, বোর্ড, পরীক্ষা', color: 'text-blue-500 bg-blue-50' },
                                { feature: 'ব্যাখ্যা (বাংলায়)', desc: 'AI জেনারেটেড ট্যাগ সহ', color: 'text-emerald-500 bg-emerald-50' },
                            ].map(f => (
                                <div key={f.feature} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.color}`}>{f.feature}</span>
                                    <span className="text-[11px] text-slate-500">{f.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Supported Formats */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">সাপোর্টেড ফরম্যাট</h3>
                        <div className="space-y-1.5">
                            {[
                                { format: 'PDF', desc: 'প্রশ্নপত্র, বই, নোট', color: 'text-rose-500 bg-rose-50' },
                                { format: 'JPG/PNG', desc: 'ক্যামেরা বা স্ক্রিনশট', color: 'text-blue-500 bg-blue-50' },
                                { format: 'WebP', desc: 'ওয়েব থেকে সংগৃহীত', color: 'text-emerald-500 bg-emerald-50' },
                            ].map(f => (
                                <div key={f.format} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${f.color}`}>{f.format}</span>
                                    <span className="text-[11px] text-slate-500">{f.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Tips */}
                    <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4">
                        <h3 className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            💡 AI টিপস
                        </h3>
                        <div className="space-y-1.5 text-[11px] text-violet-600">
                            <p>• পরিষ্কার, উচ্চ রেজোলিউশনের ছবি ব্যবহার করুন</p>
                            <p>• হাতে লেখা প্রশ্ন স্ক্যান করলে OCR ভালো কাজ করে</p>
                            <p>• PDF-এ টেক্সট সিলেক্টেবল থাকলে সবচেয়ে ভালো ফলাফল</p>
                        </div>
                    </div>
                        </>
                    )}
                </div>
            </div>
            {/* Live Cropper Modal */}
            {/* Live Cropper Modal */}
            <LiveImageCropperModal 
                isOpen={!!cropperTarget}
                onClose={() => setCropperTarget(null)}
                sourceImage={isImage && hasFileSource ? (file ? URL.createObjectURL(file) : (remoteFileUrl ? (remoteFileUrl.startsWith('http') ? `/api/v1/public/proxy-image?url=${encodeURIComponent(remoteFileUrl)}` : `/api/v1/storage?path=${encodeURIComponent(remoteFileUrl)}`) : null)) : null}
                isPdf={isPdf && hasFileSource}
                pdfUrl={isPdf && hasFileSource ? (file ? URL.createObjectURL(file) : (remoteFileUrl ? (remoteFileUrl.startsWith('http') ? `/api/v1/public/proxy-image?url=${encodeURIComponent(remoteFileUrl)}` : `/api/v1/storage?path=${encodeURIComponent(remoteFileUrl)}`) : null)) : null}
                pageNumber={cropperTarget ? (extractedQuestions.find(q => q.id === cropperTarget.questionId)?.sourcePage || activeSourcePage) : activeSourcePage}
                onSave={(base64Img) => {
                    if (cropperTarget) {
                        const { questionId, optionIndex } = cropperTarget;
                        const targetQ = extractedQuestions.find(q => q.id === questionId);
                        if (targetQ) {
                            if (optionIndex !== undefined && optionIndex !== null) {
                                updateOption(questionId, optionIndex, 'imageUrl', base64Img);
                            } else {
                                const stripMdImg = (t) => (t||'').replace(/!\[.*?\]\(.*?\)/g, '').trim();
                                updateQuestionFields(questionId, {
                                    imageUrl: base64Img,
                                    stimulus: stripMdImg(targetQ.stimulus),
                                    questionText: stripMdImg(targetQ.questionText)
                                });
                            }
                        }
                        setCropperTarget(null);
                    }
                }}
            />
        </div>
    );
};

export default ImportAI;
