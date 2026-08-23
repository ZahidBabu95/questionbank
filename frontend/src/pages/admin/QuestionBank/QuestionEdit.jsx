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
import CQPartsEditor from './components/CQPartsEditor';
import QuestionSourceTagger from './components/QuestionSourceTagger';
import AiCoPilotPanel from './components/AiCoPilotPanel';
import { Tag } from 'lucide-react';


// Helpher function to convert Markdown Images to HTML so RichTextEditor can render them visually!
const convertMarkdownImagesToHtml = (text) => {
    if (!text) return text;
    return text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/gi, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" />`;
    });
};

const QuestionEdit = ({ inlineId, forceMode, onSaveComplete, onCancel }) => {
    const params = useParams();
    const id = inlineId || params.id;
    const isInline = !!inlineId || !!onSaveComplete;
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
    const isRevision = mode === 'revise' || forceMode === 'revise';

    const [questionType, setQuestionType] = useState('MCQ');
    const [versionComment, setVersionComment] = useState('');

    const [formData, setFormData] = useState({
        academicClassId: '', subjectId: '', chapterId: '', topicId: '',
        questionText: '', stimulus: '', bloomLevel: 'KNOWLEDGE',
        marks: 1, difficulty: 'MEDIUM', language: 'Bangla',
        explanation: '', correctAnswer: '', mcqType: 'SIMPLE', statements: []
    });

    // Reverted frontend auto-filtering logic per user request to allow simple database-driven dropdown mapping

    const [options, setOptions] = useState([]);
    const [cqParts, setCqParts] = useState([]);
    const [examSources, setExamSources] = useState([]);
    const [originalQuestion, setOriginalQuestion] = useState(null);
    const [isLegacyCQ, setIsLegacyCQ] = useState(false);
    const [editMode, setEditMode] = useState('structured'); // 'legacy' or 'structured'
    const [showReference, setShowReference] = useState(true);
    const [activeTab, setActiveTab] = useState('CONTENT'); // 'CONTENT', 'IMAGES', 'META'

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
                // Fetch Classes and Question data in parallel!
                const [classData, questionData] = await Promise.all([
                    academicService.getAllClasses(),
                    questionService.getQuestionById(id)
                ]);
                
                setClasses(classData);
                setQuestionType(questionData.type);
                setOriginalQuestion(questionData);

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

                if (questionData.sources && questionData.sources.length > 0) {
                    setExamSources(questionData.sources.map(src => ({
                        sourceType: src.sourceType,
                        organizationName: src.organizationName,
                        examName: src.examName,
                        examYear: src.examYear,
                        note: src.note
                    })));
                }

                // Prepare parallel loading for options and cascade dropdown data!
                const classId = questionData.classSubject?.academicClass?.id;
                const classSubjectId = questionData.classSubject?.id;
                const chapterId = questionData.chapter?.id;

                const promises = [];
                let fetchOptionsIndex = -1;
                let fetchSubjectsIndex = -1;
                let fetchChaptersIndex = -1;
                let fetchTopicsIndex = -1;

                if (questionData.type === 'MCQ') {
                    fetchOptionsIndex = promises.push(questionService.getOptions(id)) - 1;
                }
                if (classId) {
                    fetchSubjectsIndex = promises.push(academicService.getSubjectsByClass(classId)) - 1;
                }
                if (classSubjectId) {
                    fetchChaptersIndex = promises.push(academicService.getChaptersByClassSubject(classSubjectId)) - 1;
                }
                if (chapterId) {
                    fetchTopicsIndex = promises.push(academicService.getTopicsByChapter(chapterId)) - 1;
                }

                const results = await Promise.all(promises);

                if (fetchOptionsIndex !== -1) {
                    const fetchedOptions = results[fetchOptionsIndex];
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
                }

                if (fetchSubjectsIndex !== -1) {
                    setSubjects(results[fetchSubjectsIndex]);
                }
                if (fetchChaptersIndex !== -1) {
                    setChapters(results[fetchChaptersIndex]);
                }
                if (fetchTopicsIndex !== -1) {
                    setTopics(results[fetchTopicsIndex]);
                }

                // Parse out CQ parts if it's a CQ
                if (questionData.type === 'CQ') {
                    const hasCqQuestions = questionData.questionText && questionData.questionText.includes('cq-questions');
                    const detectedLegacy = !hasCqQuestions;
                    setIsLegacyCQ(detectedLegacy);
                    setEditMode(detectedLegacy ? 'legacy' : 'structured');

                    let partsTemp = [];
                    if (!detectedLegacy) {
                        const html = convertMarkdownImagesToHtml(questionData.questionText || '');
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        
                        const ansHtml = convertMarkdownImagesToHtml(questionData.correctAnswer || '');
                        const expHtml = convertMarkdownImagesToHtml(questionData.explanation || '');
                        
                        const ansDoc = parser.parseFromString(ansHtml, 'text/html');
                        const expDoc = parser.parseFromString(expHtml, 'text/html');
                        
                        const qList = doc.querySelectorAll('.cq-questions ol li');
                        qList.forEach((li, idx) => {
                            const marks = parseFloat(li.getAttribute('data-marks')) || 1;
                            const textSpan = li.querySelector('.cq-text');
                            const label = ['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(97 + idx);
                            
                            let partAns = '';
                            let partExp = '';
                            
                            const ansNode = ansDoc.querySelector(`.cq-ans-part[data-label="${label}"] .cq-ans-content`) || ansDoc.querySelector(`.cq-ans-part[data-label="${label}"]`);
                            if (ansNode) partAns = ansNode.innerHTML;
                            
                            const expNode = expDoc.querySelector(`.cq-exp-part[data-label="${label}"] .cq-exp-content`) || expDoc.querySelector(`.cq-exp-part[data-label="${label}"]`);
                            if (expNode) partExp = expNode.innerHTML;
                            
                            partsTemp.push({
                                label: label,
                                text: textSpan ? textSpan.innerHTML : li.innerHTML,
                                marks: marks,
                                answer: partAns,
                                explanation: partExp
                            });
                        });
                    }
                    
                    if (partsTemp.length > 0) {
                        setCqParts(partsTemp);
                        const html = convertMarkdownImagesToHtml(questionData.questionText || '');
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');
                        const stemDiv = doc.querySelector('.cq-stem');
                        if (stemDiv) {
                            setFormData(prev => ({ ...prev, stimulus: stemDiv.innerHTML }));
                        }
                    } else {
                        // Fallback to empty standard CQ if parsing failed or is legacy
                        setCqParts([
                            { label: 'ক', text: '', answer: '', explanation: '', marks: 1 },
                            { label: 'খ', text: '', answer: '', explanation: '', marks: 2 },
                            { label: 'গ', text: '', answer: '', explanation: '', marks: 3 },
                            { label: 'ঘ', text: '', answer: '', explanation: '', marks: 4 }
                        ]);
                    }
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
        if (((questionType !== 'CQ') || (questionType === 'CQ' && editMode === 'legacy')) && isEmptyQuill(formData.questionText)) {
            setMessage({ type: 'error', text: 'Please fill all required context and question text fields.' });
            document.querySelector('.question-edit-container')?.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (!formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'Please select Class, Subject, and Chapter.' });
            document.querySelector('.question-edit-container')?.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        let finalVersionComment = versionComment.trim();
        if (isRevision && !finalVersionComment) {
            finalVersionComment = 'Minor revision and content update';
        }

        if (questionType === 'MCQ') {
            if (!options.some(opt => opt.isCorrect)) {
                setMessage({ type: 'error', text: 'Please select a correct option.' });
                document.querySelector('.question-edit-container')?.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (options.some(opt => isEmptyQuill(opt.optionText))) {
                setMessage({ type: 'error', text: 'All multiple choice options must have text or an image. Please click into any empty option to remove this error.' });
                document.querySelector('.question-edit-container')?.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
        }

        setSaving(true);
        try {
            const stripOptionPrefix = (html) => {
                if (!html) return '';
                let stripped = html.replace(/^(<p[^>]*>)?\s*(?:(?:[কখগঘa-dA-D1-4]|i{1,3}|iv)\s*[\.\)])\s*/i, '$1');
                stripped = stripped.replace(/^(<p[^>]*>)?\s*(?:(?:[কখগঘa-dA-D1-4]|i{1,3}|iv)\s*[\.\)])\s*/i, '$1');
                return stripped;
            };

            let finalQuestionText = formData.questionText;
            let finalAnswerText = formData.correctAnswer;
            let finalExplanationText = formData.explanation;
            
            // If CQ, build the structured HTML string from the parts ONLY IF editMode === 'structured'
            if (questionType === 'CQ') {
                if (editMode === 'structured') {
                    let stemHtml = formData.stimulus || '';
                    let combinedHtml = `<div class="cq-stem">${stemHtml}</div><div class="cq-questions"><ol type="a">`;
                    let answersHtml = '<div class="cq-answers">';
                    let explanationsHtml = '<div class="cq-explanations">';
                    
                    cqParts.forEach(sq => {
                        combinedHtml += `<li data-marks="${sq.marks}"><span class="cq-text">${sq.text}</span> <span class="cq-marks">(${sq.marks})</span></li>`;
                        if (sq.answer) {
                            answersHtml += `<div class="cq-ans-part" data-label="${sq.label}" style="margin-bottom:8px;"><strong>${sq.label}) উত্তর:</strong> <span class="cq-ans-content">${sq.answer}</span></div>`;
                        }
                        if (sq.explanation) {
                            explanationsHtml += `<div class="cq-exp-part" data-label="${sq.label}" style="margin-bottom:8px;"><strong>${sq.label}) ব্যাখ্যা:</strong> <span class="cq-exp-content">${sq.explanation}</span></div>`;
                        }
                    });
                    
                    combinedHtml += '</ol></div>';
                    answersHtml += '</div>';
                    explanationsHtml += '</div>';
                    
                    finalQuestionText = combinedHtml;
                    finalAnswerText = answersHtml === '<div class="cq-answers"></div>' ? '' : answersHtml;
                    finalExplanationText = explanationsHtml === '<div class="cq-explanations"></div>' ? '' : explanationsHtml;
                } else {
                    // Legacy mode: save raw fields as-is
                    finalQuestionText = formData.questionText;
                    finalAnswerText = formData.correctAnswer;
                    finalExplanationText = formData.explanation;
                }
            }

            const questionPayload = {
                questionText: finalQuestionText,
                marks: formData.marks,
                difficulty: formData.difficulty,
                language: formData.language,
                explanation: finalExplanationText,
                bloomLevel: formData.bloomLevel,
                stimulus: formData.stimulus,
                mcqType: formData.mcqType,
                statements: formData.statements,
                correctAnswer: questionType !== 'MCQ' ? finalAnswerText : null,
                classSubject: { id: formData.subjectId },
                chapter: { id: formData.chapterId },
                topic: formData.topicId ? { id: formData.topicId } : null,
                sources: examSources.length > 0 ? examSources : [],
                versionComment: isRevision ? finalVersionComment : null
            };

            const optionsPayload = questionType === 'MCQ' ? options.map((o, idx) => ({
                optionLabel: o.optionLabel || String.fromCharCode(65 + idx),
                optionText: stripOptionPrefix(o.optionText),
                isCorrect: o.isCorrect
            })) : null;

            let revisionRes = null;
            let updatedRes = null;
            if (isRevision) {
                revisionRes = await questionService.submitRevision(id, {
                    question: questionPayload,
                    options: optionsPayload
                });
                setMessage({ type: 'success', text: 'Revision submitted for review successfully! Returning...' });
            } else {
                updatedRes = await questionService.updateQuestion(id, questionPayload, optionsPayload);
                setMessage({ type: 'success', text: 'Question updated successfully! Returning to list...' });
            }

            clearSavedData(); // Clear auto-save data on successful submit

            if (isInline && onSaveComplete) {
                onSaveComplete(isRevision ? revisionRes?.data : updatedRes);
            } else {
                setTimeout(() => {
                    if (window.history.length <= 2) {
                        if (window.opener) {
                            window.close();
                        }
                        // Fallback if close fails or no opener
                        navigate('/admin/questions');
                    } else {
                        navigate(-1);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error("Failed to update question", error);
            setMessage({ type: 'error', text: 'Failed to update question. Check console for details.' });
        } finally {
            setSaving(false);
        }
    };

    const { restoreData, clearSavedData, hasSavedData, lastSavedTime } = useAutoSave('qst_edit_draft_' + id, {
        formData, options, cqParts, examSources, versionComment
    });

    const handleRestoreDraft = () => {
        const saved = restoreData();
        if (saved) {
            if (saved.formData) setFormData(saved.formData);
            if (saved.options) setOptions(saved.options);
            if (saved.cqParts) setCqParts(saved.cqParts);
            if (saved.examSources) setExamSources(saved.examSources);
            if (saved.versionComment) setVersionComment(saved.versionComment);
            setMessage({ type: 'success', text: 'অটো-সেভ করা ড্রাফট সফলভাবে রিস্টোর হয়েছে!' });
        }
    };

    const handleApplyCoPilotFix = async (updatedFromCoPilot) => {
        const targetQuestionId = originalQuestion?.id || id;
        if (!targetQuestionId || targetQuestionId === 'undefined') {
            setMessage({ type: 'error', text: 'প্রশ্ন আইডি সঠিকভাবে পাওয়া যায়নি।' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            let newTopicId = formData.topicId || originalQuestion?.topic?.id;
            // Match suggested topic name to available topics
            if (updatedFromCoPilot.topicName) {
                let freshTopics = topics;
                if (!freshTopics || freshTopics.length === 0) {
                    const chId = formData.chapterId || originalQuestion?.chapter?.id;
                    if (chId) {
                        try {
                            freshTopics = await academicService.getTopicsByChapter(chId);
                            setTopics(freshTopics);
                        } catch (e) {
                            console.error("Failed to load topics:", e);
                        }
                    }
                }
                if (freshTopics && freshTopics.length > 0) {
                    const targetName = updatedFromCoPilot.topicName.trim().toLowerCase();
                    const matchedTopic = freshTopics.find(t => 
                        t.name?.trim().toLowerCase() === targetName ||
                        t.name?.trim().toLowerCase().includes(targetName) ||
                        targetName.includes(t.name?.trim().toLowerCase())
                    );
                    if (matchedTopic) {
                        newTopicId = matchedTopic.id;
                    }
                }
            }

            const newText = updatedFromCoPilot.questionText || formData.questionText || originalQuestion?.questionText;
            const newExp = updatedFromCoPilot.explanation || formData.explanation || originalQuestion?.explanation;

            // Update local formData
            setFormData(prev => ({
                ...prev,
                questionText: newText,
                explanation: newExp,
                topicId: newTopicId
            }));

            // Prepare save payload conforming to backend UpdateQuestionRequest structure
            const questionObject = {
                id: targetQuestionId,
                type: questionType || originalQuestion?.type || 'MCQ',
                questionText: newText,
                explanation: newExp,
                difficulty: formData.difficulty || originalQuestion?.difficulty || 'MEDIUM',
                marks: formData.marks || originalQuestion?.marks || 1,
                language: formData.language || originalQuestion?.language || 'Bangla',
                bloomLevel: formData.bloomLevel || originalQuestion?.bloomLevel || 'KNOWLEDGE',
                mcqType: formData.mcqType || originalQuestion?.mcqType || 'SIMPLE',
                topic: newTopicId ? { id: newTopicId } : (originalQuestion?.topic ? { id: originalQuestion.topic.id } : null),
                chapter: originalQuestion?.chapter ? { id: originalQuestion.chapter.id } : (formData.chapterId ? { id: formData.chapterId } : null),
                classSubject: originalQuestion?.classSubject ? { id: originalQuestion.classSubject.id } : (formData.subjectId ? { id: formData.subjectId } : null)
            };
            const optionsArray = options.map(o => ({
                optionLabel: o.optionLabel,
                optionText: o.optionText,
                isCorrect: o.isCorrect
            }));

            // Save to backend database
            const saveRes = await questionService.updateQuestion(targetQuestionId, questionObject, optionsArray);

            // Immediately re-run AI audit so quality score turns 100% and topic match turns PASS!
            const reAuditRes = await questionService.runAiAudit(targetQuestionId);
            if (reAuditRes.data) {
                const finalQuestionData = {
                    ...saveRes.data,
                    aiAuditScore: reAuditRes.data.qualityScore,
                    aiAuditSuggestions: reAuditRes.data.rawSuggestionsJson,
                    aiFlagged: reAuditRes.data.qualityScore < 80 || !reAuditRes.data.topicMatch
                };
                setOriginalQuestion(finalQuestionData);
                setMessage({ type: 'success', text: '⚡ এআই প্রস্তাবিত ফিক্স ও টপিক পরিবর্তন সফলভাবে ডাটাবেজে সেভ করা হয়েছে!' });
            } else {
                setOriginalQuestion(saveRes.data);
            }
        } catch (err) {
            console.error("Failed to auto-apply Co-Pilot fix:", err);
            setMessage({ type: 'error', text: 'ফিক্স প্রয়োগ করতে ব্যর্থ হয়েছে।' });
        } finally {
            setSaving(false);
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
        <div className={`question-edit-container ${isInline ? "w-full p-4 space-y-4 overflow-y-auto h-full custom-scrollbar" : "max-w-[1400px] mx-auto p-6 space-y-6"}`}>
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

            {!isInline && (
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
            )}

            {message && (
                <div className={`px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`flex ${isInline ? 'flex-col h-full overflow-hidden' : 'flex-col lg:flex-row'} gap-4 items-stretch`}>
                
                {isInline ? (
                    /* COMPACT TAB VIEW FOR REVIEW WORKSPACE */
                    <div className="flex-1 flex flex-col gap-2.5 min-h-0">
                        {/* Tab Buttons - Modern Segment Control */}
                        <div className="flex bg-slate-200/70 p-0.5 rounded-xl gap-1 shrink-0 select-none border border-slate-200/80 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('CONTENT')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 ${
                                    activeTab === 'CONTENT' 
                                        ? 'bg-white text-indigo-700 font-black shadow-xs border border-slate-200/60' 
                                        : 'text-slate-600 font-bold hover:text-slate-900 hover:bg-white/40'
                                }`}
                            >
                                <span>📝</span> <span>এডিট (Edit)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('IMAGES')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 ${
                                    activeTab === 'IMAGES' 
                                        ? 'bg-white text-indigo-700 font-black shadow-xs border border-slate-200/60' 
                                        : 'text-slate-600 font-bold hover:text-slate-900 hover:bg-white/40'
                                }`}
                            >
                                <span>🖼️</span> <span>ইমেজ ({extractedSourceImages.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('META')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 ${
                                    activeTab === 'META' 
                                        ? 'bg-white text-indigo-700 font-black shadow-xs border border-slate-200/60' 
                                        : 'text-slate-600 font-bold hover:text-slate-900 hover:bg-white/40'
                                }`}
                            >
                                <span>🏷️</span> <span>ট্যাগ ও সোর্স</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('AI_AUDIT')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 ${
                                    activeTab === 'AI_AUDIT' 
                                        ? 'bg-white text-indigo-700 font-black shadow-xs border border-slate-200/60' 
                                        : 'text-indigo-600 font-bold bg-indigo-50/70 hover:bg-indigo-100/70'
                                }`}
                            >
                                <span>🤖</span> <span>AI Co-Pilot</span>
                            </button>
                        </div>

                        {/* Tab Content Wrapper */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-0.5">
                            {activeTab === 'AI_AUDIT' && originalQuestion && (
                                <AiCoPilotPanel
                                    question={originalQuestion}
                                    onUpdateQuestion={handleApplyCoPilotFix}
                                />
                            )}

                            {activeTab === 'CONTENT' && (
                                <div className="space-y-3">
                                    <QuestionContentEditor 
                                        formData={formData} 
                                        setFormData={setFormData} 
                                        questionType={questionType} 
                                        isLegacyCQ={isLegacyCQ}
                                        editMode={editMode}
                                        setEditMode={setEditMode}
                                        showReference={showReference}
                                        setShowReference={setShowReference}
                                        originalQuestion={originalQuestion}
                                        isInline={isInline}
                                    />
                                    {questionType === 'CQ' && editMode === 'structured' && (
                                        <CQPartsEditor 
                                            cqParts={cqParts}
                                            setCqParts={setCqParts}
                                            language={formData.language}
                                            isInline={isInline}
                                        />
                                    )}
                                    {questionType === 'MCQ' && (
                                        <MCQOptionsEditor 
                                            options={options} 
                                            handleOptionChange={handleOptionChange} 
                                            handleCorrectOption={handleCorrectOption} 
                                            language={formData.language}
                                            isInline={isInline}
                                        />
                                    )}
                                </div>
                            )}

                            {activeTab === 'IMAGES' && (
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
                            )}

                            {activeTab === 'META' && (
                                <div className="space-y-3">
                                    {/* Academic Mapping */}
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                            <Book size={13} className="text-indigo-500" /> একাডেমিক কনটেক্সট
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">শ্রেণি (Class)</label>
                                                <select value={formData.academicClassId} onChange={handleClassChange} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold">
                                                    <option value="">Select Class</option>
                                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">বিষয় (Subject)</label>
                                                <select value={formData.subjectId} onChange={handleSubjectChange} disabled={!formData.academicClassId} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold disabled:opacity-50">
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(subj => <option key={subj.classSubjectId} value={subj.classSubjectId}>{subj.subjectName}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">অধ্যায় (Chapter)</label>
                                                <select value={formData.chapterId} onChange={handleChapterChange} disabled={!formData.subjectId} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold disabled:opacity-50">
                                                    <option value="">Select Chapter</option>
                                                    {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">টপিক (Topic)</label>
                                                <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} disabled={!formData.chapterId} className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-semibold disabled:opacity-50">
                                                    <option value="">Select Topic</option>
                                                    {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Exam Sources */}
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                            <Tag size={13} className="text-orange-500" /> পরীক্ষার উৎসসমূহ (Sources)
                                        </h3>
                                        <QuestionSourceTagger sources={examSources} onChange={setExamSources} />
                                    </div>

                                    {isRevision && (
                                        <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-150 shadow-2xs space-y-1.5">
                                            <h3 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                                                <AlertTriangle size={13} className="text-indigo-650" /> রিভিশন বিবরণ (Revision Comment)
                                            </h3>
                                            <input
                                                type="text"
                                                value={versionComment}
                                                onChange={(e) => setVersionComment(e.target.value)}
                                                placeholder="উদা: অপশন ক-এর বানান ঠিক করা হয়েছে।"
                                                className="w-full p-2 bg-white border border-indigo-200 rounded-lg outline-none text-xs font-semibold shadow-2xs"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sticky Action Buttons at Bottom */}
                        <div className="pt-2.5 border-t border-slate-200/80 shrink-0 flex items-center justify-end gap-2 bg-white px-1">
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200/80 shadow-2xs"
                                >
                                    বাতিল
                                </button>
                            )}
                            <button 
                                type="submit" 
                                disabled={saving} 
                                className={`py-2 px-5 font-black text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed text-white ${
                                    isRevision ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> 
                                        <span>সেভ হচ্ছে...</span>
                                    </>
                                ) : (
                                    <>
                                        {isRevision ? <FileText size={14} /> : <Save size={14} />} 
                                        <span>{isRevision ? 'রিভিশন জমা দিন' : 'পরিবর্তন সেভ করুন'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* STANDARD EXPANDED VIEW */
                    <>
                        {/* LEFT COLUMN: Main Editing Form */}
                        <div className="flex-1 w-full space-y-6">
                            {/* Academic Mapping */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
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
                                isLegacyCQ={isLegacyCQ}
                                editMode={editMode}
                                setEditMode={setEditMode}
                                showReference={showReference}
                                setShowReference={setShowReference}
                                originalQuestion={originalQuestion}
                                isInline={isInline}
                            />

                            {/* CQ Parts (Conditional) */}
                            {questionType === 'CQ' && editMode === 'structured' && (
                                <CQPartsEditor 
                                    cqParts={cqParts}
                                    setCqParts={setCqParts}
                                    language={formData.language}
                                    isInline={isInline}
                                />
                            )}

                            {/* MCQ Options (Conditional) */}
                            {questionType === 'MCQ' && (
                                <MCQOptionsEditor 
                                    options={options} 
                                    handleOptionChange={handleOptionChange} 
                                    handleCorrectOption={handleCorrectOption} 
                                    language={formData.language}
                                    isInline={isInline}
                                />
                            )}

                            {/* Exam Sources */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Tag size={18} className="text-orange-500" /> Exam Sources
                                </h2>
                                <QuestionSourceTagger sources={examSources} onChange={setExamSources} />
                            </div>

                            {isRevision && (
                                <div className="bg-indigo-50/50 rounded-2xl shadow-sm border border-indigo-200 p-6">
                                    <h2 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-indigo-650" /> Revision Details *
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
                    </>
                )}

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
