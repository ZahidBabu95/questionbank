import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, AlertTriangle, Check, Book, FileText, ArrowLeft, Loader2, Eye, Image as ImageIcon, UploadCloud, Trash2, RotateCw, X } from 'lucide-react';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import RichTextEditor from '../../../components/RichTextEditor';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import ImageEditorModal from '../../../components/ImageEditorModal';
import useAutoSave from '../../../hooks/useAutoSave';
import ImageSidebar from './components/ImageSidebar';
import MCQOptionsEditor from './components/MCQOptionsEditor';
import QuestionContentEditor from './components/QuestionContentEditor';

// Helpher function to convert Markdown Images to HTML so RichTextEditor can render them visually!
const convertMarkdownImagesToHtml = (text) => {
    if (!text) return text;
    return text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/gi, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" />`;
    });
};

const QuestionEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data lists
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);

    // Form states
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    const isRevision = mode === 'revise';

    const [questionType, setQuestionType] = useState('MCQ');
    const [versionComment, setVersionComment] = useState('');

    const [formData, setFormData] = useState({
        academicClassId: '', subjectId: '', chapterId: '', topicId: '',
        questionText: '', stimulus: '', bloomLevel: 'KNOWLEDGE',
        marks: 1, difficulty: 'MEDIUM', language: 'Bangla',
        explanation: '', correctAnswer: '', mcqType: 'SIMPLE', statements: []
    });

    const [options, setOptions] = useState([]);

    // Image Upload & Crop States
    const [imageUploading, setImageUploading] = useState(false);
    const [editingImageFile, setEditingImageFile] = useState(null);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [reCroppingUrl, setReCroppingUrl] = useState(null); // URL being replaced by re-crop
    const [lightboxSrc, setLightboxSrc] = useState(null);    // fullscreen preview
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const classData = await academicService.getAllClasses();
                setClasses(classData);

                // Fetch Question
                const questionData = await questionService.getQuestionById(id);
                setQuestionType(questionData.type);

                // Prefill basic fields
                setFormData({
                    academicClassId: questionData.classSubject?.academicClass?.id || '',
                    subjectId: questionData.classSubject?.id || '',
                    chapterId: questionData.chapter?.id || '',
                    topicId: questionData.topic?.id || '',
                    questionText: convertMarkdownImagesToHtml(questionData.questionText || ''),
                    stimulus: convertMarkdownImagesToHtml(questionData.stimulus || ''),
                    bloomLevel: questionData.bloomLevel || 'KNOWLEDGE',
                    marks: questionData.marks || 1,
                    difficulty: questionData.difficulty || 'MEDIUM',
                    language: questionData.language || 'Bangla',
                    explanation: convertMarkdownImagesToHtml(questionData.explanation || ''),
                    correctAnswer: convertMarkdownImagesToHtml(questionData.correctAnswer || ''),
                    mcqType: questionData.mcqType || 'SIMPLE',
                    statements: questionData.statements || []
                });

                if (questionData.type === 'MCQ') {
                    // Normalize options
                    try {
                        const fetchedOptions = await questionService.getOptions(id);
                        const opts = (fetchedOptions && fetchedOptions.length > 0)
                            ? fetchedOptions
                            : [
                                { optionLabel: 'A', optionText: '', isCorrect: false },
                                { optionLabel: 'B', optionText: '', isCorrect: false },
                                { optionLabel: 'C', optionText: '', isCorrect: false },
                                { optionLabel: 'D', optionText: '', isCorrect: false }
                            ];
                        setOptions(opts.map(o => ({ 
                            ...o, 
                            optionText: convertMarkdownImagesToHtml(o.optionText || ''),
                            isCorrect: o.correct || o.isCorrect 
                        })));
                    } catch (optErr) {
                        console.error('Failed to load MCQ options', optErr);
                    }
                }

                // Load cascade dropdowns if necessary
                if (questionData.classSubject?.academicClass?.id) {
                    const subjData = await academicService.getSubjectsByClass(questionData.classSubject.academicClass.id);
                    setSubjects(subjData);
                }
                if (questionData.classSubject?.id) {
                    const chapData = await academicService.getChaptersByClassSubject(questionData.classSubject.id);
                    setChapters(chapData);
                }
                if (questionData.chapter?.id) {
                    const topData = await academicService.getTopicsByChapter(questionData.chapter.id);
                    setTopics(topData);
                }

            } catch (err) {
                console.error("Failed to load question details:", err);
                setMessage({ type: 'error', text: 'Failed to load question data. It might have been deleted.' });
            } finally {
                setLoadingData(false);
            }
        };

        loadInitialData();
    }, [id]);

    const handleClassChange = async (e) => {
        const classId = e.target.value;
        setFormData({ ...formData, academicClassId: classId, subjectId: '', chapterId: '', topicId: '' });
        setSubjects([]); setChapters([]); setTopics([]);
        if (classId) {
            const data = await academicService.getSubjectsByClass(classId);
            setSubjects(data);
        }
    };

    const handleSubjectChange = async (e) => {
        const classSubjectId = e.target.value;
        setFormData({ ...formData, subjectId: classSubjectId, chapterId: '', topicId: '' });
        setChapters([]); setTopics([]);
        if (classSubjectId) {
            const data = await academicService.getChaptersByClassSubject(classSubjectId);
            setChapters(data);
        }
    };

    const handleChapterChange = async (e) => {
        const chapterId = e.target.value;
        setFormData({ ...formData, chapterId, topicId: '' });
        setTopics([]);
        if (chapterId) {
            const data = await academicService.getTopicsByChapter(chapterId);
            setTopics(data);
        }
    };

    const handleOptionChange = React.useCallback((index, field, value) => {
        setOptions(prev => {
            if (prev[index][field] === value) return prev;
            const newOptions = [...prev];
            newOptions[index] = { ...newOptions[index], [field]: value };
            return newOptions;
        });
    }, []);

    const handleCorrectOption = React.useCallback((index) => {
        setOptions(prev => prev.map((opt, i) => ({
            ...opt,
            isCorrect: i === index
        })));
    }, []);

    const handleImageSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setEditingImageFile(files[0]);
            setShowImageEditor(true);
        }
        e.target.value = '';
    };

    const handleImageEditorSave = async (processedFile) => {
        setImageUploading(true);
        try {
            const res = await questionService.uploadStimulusImage(processedFile);
            if (res.url) {
                const newUrl = res.url;
                const newImgCode = `<img src="${newUrl}" alt="Fixed Screenshot" />`;

                if (reCroppingUrl) {
                    // ── Re-crop mode: replace old URL with new URL everywhere ──
                    const replace = (html) => {
                        if (!html) return html;
                        const escapedOld = reCroppingUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Replace <img src="OLD" ...> tags
                        let out = html.replace(new RegExp(`<img[^>]*src=["']${escapedOld}["'][^>]*>`, 'g'), newImgCode);
                        // Replace markdown ![alt](OLD)
                        out = out.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escapedOld}\\)`, 'g'), newImgCode);
                        return out;
                    };
                    setFormData(prev => ({
                        ...prev,
                        questionText: replace(prev.questionText),
                        stimulus: replace(prev.stimulus),
                        explanation: replace(prev.explanation),
                        correctAnswer: replace(prev.correctAnswer),
                    }));
                    setOptions(prev => prev.map(o => ({ ...o, optionText: replace(o.optionText) })));
                    setMessage({ type: 'success', text: 'ছবিটি সফলভাবে পুনরায় ক্রপ ও রিপ্লেস হয়েছে!' });
                } else {
                    // ── Insert new image at end of questionText ──
                    setFormData(prev => ({
                        ...prev,
                        questionText: (prev.questionText || '') + '<br/>' + newImgCode + '<br/>'
                    }));
                    setMessage({ type: 'success', text: 'Image uploaded and inserted into Question Text. Please move it to the right position if needed.' });
                }
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Image upload failed. Try again.' });
        } finally {
            setImageUploading(false);
            setEditingImageFile(null);
            setReCroppingUrl(null);
            setShowImageEditor(false);
        }
    };

    // Open an existing image URL in the crop editor (re-crop workflow)
    // Instead of fetching (CORS issues), pass URL directly to ImageEditorModal via src prop
    const handleReCropExistingImage = (srcUrl) => {
        setReCroppingUrl(srcUrl);   // remember which URL we're replacing
        setEditingImageFile(null);  // no File object — we use src prop instead
        setShowImageEditor(true);   // open modal with src prop
    };

    useEffect(() => {
        const handleGlobalPaste = (e) => {
            // Let the Quill editor handle its own paste, only capture global pastes if it contains an image!
            const clipboardData = e.clipboardData;
            if (!clipboardData) return;
            
            let hasImage = false;
            for (let i = 0; i < clipboardData.items.length; i++) {
                if (clipboardData.items[i].type.indexOf('image') !== -1) {
                    hasImage = true;
                    const blob = clipboardData.items[i].getAsFile();
                    // Set highly unique name to ensure browser caches don't overlap
                    if (blob && (!blob.name || blob.name === 'image.png')) {
                        Object.defineProperty(blob, 'name', {
                            writable: true,
                            value: `screenshot_${new Date().getTime()}.png`
                        });
                    }
                    setEditingImageFile(blob);
                    setShowImageEditor(true);
                    e.preventDefault();
                    e.stopPropagation();
                    break;
                }
            }
        };
        
        // Listen to paste events in the capture phase to intercept before Quill
        document.addEventListener('paste', handleGlobalPaste, true);
        return () => document.removeEventListener('paste', handleGlobalPaste, true);
    }, []);

    const extractedSourceImages = useMemo(() => {
        const urls = new Set();
        const extract = (html) => {
            if (!html) return;
            const htmlRegex = /<img[^>]+src="([^">]+)"/g;
            let match;
            while ((match = htmlRegex.exec(html)) !== null) {
                urls.add(match[1]);
            }
            const mdRegex = /!\[[^\]]*\]\((https?:\/\/[^\)]+)\)/g;
            while ((match = mdRegex.exec(html)) !== null) {
                urls.add(match[1]);
            }
        };
        extract(formData.questionText);
        extract(formData.stimulus);
        extract(formData.explanation);
        extract(formData.correctAnswer);
        options.forEach(o => extract(o.optionText));
        return Array.from(urls);
    }, [formData.questionText, formData.stimulus, formData.explanation, formData.correctAnswer, options]);

    const handleRemoveExtractedImage = (srcToRemove) => {
        const removeImgFromHtml = (html) => {
            if (!html) return html;
            let newHtml = html;
            // Escape the URL for regex
            const escapedSrc = srcToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Remove <img src="url" ... /> OR <img ... src="url" ... />
            newHtml = newHtml.replace(new RegExp(`<img[^>]*src=["']${escapedSrc}["'][^>]*>`, 'g'), '');
            // Remove markdown ![alt](url)
            newHtml = newHtml.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escapedSrc}\\)`, 'g'), '');
            // Cleanup any resulting empty paragraphs <p></p>
            newHtml = newHtml.replace(/<p>\s*<\/p>/g, '');
            return newHtml;
        };
        
        setFormData(prev => ({
            ...prev,
            questionText: removeImgFromHtml(prev.questionText),
            stimulus: removeImgFromHtml(prev.stimulus),
            explanation: removeImgFromHtml(prev.explanation),
            correctAnswer: removeImgFromHtml(prev.correctAnswer)
        }));
        
        setOptions(prev => prev.map(o => ({
            ...o,
            optionText: removeImgFromHtml(o.optionText)
        })));
        
        setMessage({ type: 'success', text: 'Image removed successfully.' });
    };

    const isEmptyQuill = (html) => {
        if (!html) return true;
        const stripped = html.replace(/<[^>]*>?/gm, '').trim();
        return stripped === '' && !html.includes('<img');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (isEmptyQuill(formData.questionText) || !formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'Please fill all required context and question text fields.' });
            return;
        }

        if (isRevision && !versionComment.trim()) {
            setMessage({ type: 'error', text: 'Please provide a version comment explaining your changes.' });
            return;
        }

        if (questionType === 'MCQ') {
            if (!options.some(opt => opt.isCorrect)) {
                setMessage({ type: 'error', text: 'Please select a correct option.' });
                return;
            }
            if (options.some(opt => isEmptyQuill(opt.optionText))) {
                setMessage({ type: 'error', text: 'All multiple choice options must have text or an image. Please click into any empty option to remove this error.' });
                return;
            }
        }

        setSaving(true);
        try {
            const questionPayload = {
                questionText: formData.questionText,
                marks: formData.marks,
                difficulty: formData.difficulty,
                language: formData.language,
                explanation: formData.explanation,
                bloomLevel: formData.bloomLevel,
                stimulus: formData.stimulus,
                mcqType: formData.mcqType,
                statements: formData.statements,
                correctAnswer: questionType !== 'MCQ' ? formData.correctAnswer : null,
                classSubject: { id: formData.subjectId },
                chapter: { id: formData.chapterId },
                topic: formData.topicId ? { id: formData.topicId } : null,
                versionComment: isRevision ? versionComment : null
            };

            const optionsPayload = questionType === 'MCQ' ? options.map(o => ({
                optionLabel: o.optionLabel,
                optionText: o.optionText,
                isCorrect: o.isCorrect
            })) : null;

            if (isRevision) {
                await questionService.submitRevision(id, {
                    question: questionPayload,
                    options: optionsPayload
                });
                setMessage({ type: 'success', text: 'Revision submitted for review successfully! Returning...' });
            } else {
                await questionService.updateQuestion(id, questionPayload, optionsPayload);
                setMessage({ type: 'success', text: 'Question updated successfully! Returning to list...' });
            }

            clearSavedData(); // Clear auto-save data on successful submit

            setTimeout(() => {
                navigate(-1);
            }, 1000);

        } catch (error) {
            console.error("Failed to update question", error);
            setMessage({ type: 'error', text: 'Failed to update question. Check console for details.' });
        } finally {
            setSaving(false);
        }
    };

    const { restoreData, clearSavedData, hasSavedData, lastSavedTime } = useAutoSave('qst_edit_draft_' + id, {
        formData, options, versionComment
    });

    const handleRestoreDraft = () => {
        const saved = restoreData();
        if (saved) {
            if (saved.formData) setFormData(saved.formData);
            if (saved.options) setOptions(saved.options);
            if (saved.versionComment) setVersionComment(saved.versionComment);
            setMessage({ type: 'success', text: 'অটো-সেভ করা ড্রাফট সফলভাবে রিস্টোর হয়েছে!' });
        }
    };

    if (loadingData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Loading Modern Editor...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
            {/* ═══ AUTO-SAVE BANNER ═══ */}
            {hasSavedData && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-wrap items-center justify-between shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="text-amber-500" size={20} /></div>
                        <div>
                            <p className="text-sm font-bold text-amber-800">অসম্পূর্ণ কাজের ড্রাফট পাওয়া গেছে!</p>
                            <p className="text-xs text-amber-700">লোডশেডিং বা ট্যাব বন্ধ হওয়ার আগের ডেটা। সর্বশেষ সেভ: {lastSavedTime ? lastSavedTime.toLocaleTimeString() : 'কিছুক্ষণ আগে'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleRestoreDraft} className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-amber-600 transition-colors">ডেটা রিকভার করুন</button>
                        <button type="button" onClick={clearSavedData} className="px-4 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">ড্রাফট মুছুন</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 shadow-sm transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{isRevision ? 'Suggest a Revision' : 'Advanced Question Editor'}</h1>
                        <p className="text-sm text-slate-500 font-medium">
                            {isRevision ? 'Your revision will be reviewed by a Super Admin to receive contribution points.' : `Modifying ${questionType} question details.`}
                        </p>
                    </div>
                </div>
                {lastSavedTime && <span className="text-xs text-slate-400 flex items-center gap-1 font-medium"><Check size={14} className="text-emerald-500"/> Auto-saved at {lastSavedTime.toLocaleTimeString()}</span>}
            </div>

            {message && (
                <div className={`px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* LEFT COLUMN: Main Editing Form */}
                <div className="flex-1 w-full space-y-6">
                    {/* Academic Mapping */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Book size={18} className="text-indigo-500" /> Core Context *
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Class</label>
                                <select value={formData.academicClassId} onChange={handleClassChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all">
                                    <option value="">Select Class</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                                <select value={formData.subjectId} onChange={handleSubjectChange} disabled={!formData.academicClassId} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-60 text-sm font-medium transition-all">
                                    <option value="">Select Subject</option>
                                    {subjects.map(subj => <option key={subj.classSubjectId} value={subj.classSubjectId}>{subj.subjectName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chapter</label>
                                <select value={formData.chapterId} onChange={handleChapterChange} disabled={!formData.subjectId} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-60 text-sm font-medium transition-all">
                                    <option value="">Select Chapter</option>
                                    {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Topic</label>
                                <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} disabled={!formData.chapterId} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:opacity-60 text-sm font-medium transition-all">
                                    <option value="">Select Topic</option>
                                    {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Question Info */}
                    <QuestionContentEditor 
                        formData={formData} 
                        setFormData={setFormData} 
                        questionType={questionType} 
                    />

                    {/* MCQ Options (Conditional) */}
                    {questionType === 'MCQ' && (
                        <MCQOptionsEditor 
                            options={options} 
                            handleOptionChange={handleOptionChange} 
                            handleCorrectOption={handleCorrectOption} 
                        />
                    )}

                    {isRevision && (
                        <div className="bg-indigo-50/50 p-6 rounded-2xl shadow-sm border border-indigo-200">
                            <h2 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-indigo-600" /> Revision Details *
                            </h2>
                            <div>
                                <label className="block text-sm font-semibold text-indigo-800 mb-2">What did you change? (Required)</label>
                                <textarea
                                    value={versionComment}
                                    onChange={(e) => setVersionComment(e.target.value)}
                                    placeholder="E.g., Fixed typos in option A and updated the stimulus grammar."
                                    className="w-full p-4 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all resize-y min-h-[100px] shadow-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Submit Action */}
                    <div className="pt-4 pb-12">
                        <button type="submit" disabled={saving} className={`w-full py-4 font-bold text-lg rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-white ${isRevision ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25' : 'bg-primary hover:bg-blue-700 shadow-primary/25'}`}>
                            {saving ? <><Loader2 size={24} className="animate-spin" /> Saving changes...</> : <>{isRevision ? <FileText size={24} /> : <Save size={24} />} {isRevision ? 'Submit Revision for Review' : 'Save Question Updates'}</>}
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Sticky Toolbar & Live Preview */}
                <ImageSidebar
                    imageUploading={imageUploading}
                    fileInputRef={fileInputRef}
                    handleImageSelect={handleImageSelect}
                    extractedSourceImages={extractedSourceImages}
                    setLightboxSrc={setLightboxSrc}
                    handleReCropExistingImage={handleReCropExistingImage}
                    reCroppingUrl={reCroppingUrl}
                    handleRemoveExtractedImage={handleRemoveExtractedImage}
                    lightboxSrc={lightboxSrc}
                />

            </form>

            <ImageEditorModal
                file={editingImageFile}
                src={reCroppingUrl || undefined}
                isOpen={showImageEditor}
                onClose={() => { setShowImageEditor(false); setEditingImageFile(null); setReCroppingUrl(null); }}
                onSave={handleImageEditorSave}
                maxSizeKB={800}
            />

        </div>
    );
};

export default QuestionEdit;
