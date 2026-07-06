import { useState, useEffect } from 'react';
import academicService from '../../../../../services/academicService';
import questionService from '../../../../../services/questionService';
import { useNexusEditor } from '../context/NexusEditorContext';

export const useAcademicFilters = () => {
    const { leftPanelTab, docSettings } = useNexusEditor();

    const [levels, setLevels] = useState([]);
    const [streams, setStreams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    
    const [selectedLanguage, setSelectedLanguage] = useState(() => {
        if (user?.instituteMedium && user.instituteMedium.includes(',')) return 'ALL';
        return user?.instituteMedium || 'ALL';
    });

    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');

    const [bankQuestions, setBankQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [disableAutoFilter, setDisableAutoFilter] = useState(false);

    // Hierarchy Fetching
    useEffect(() => {
        academicService.getAllLevels().then(setLevels).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedLevelId) academicService.getStreamsByLevel(selectedLevelId).then(setStreams).catch(console.error);
        else setStreams([]);
        setSelectedStreamId(''); setSelectedClassId(''); setSelectedSubjectId('');
        setSelectedChapterId(''); setSelectedTopicId('');
        setClasses([]); setSubjects([]); setChapters([]); setTopics([]);
    }, [selectedLevelId]);

    useEffect(() => {
        if (selectedStreamId) academicService.getClassesByStream(selectedStreamId).then(setClasses).catch(console.error);
        else setClasses([]);
        setSelectedClassId(''); setSelectedSubjectId('');
        setSelectedChapterId(''); setSelectedTopicId('');
        setSubjects([]); setChapters([]); setTopics([]);
    }, [selectedStreamId]);

    useEffect(() => {
        if (selectedClassId) academicService.getSubjectsByClass(selectedClassId).then(setSubjects).catch(console.error);
        else setSubjects([]);
        setSelectedSubjectId(''); setSelectedChapterId(''); setSelectedTopicId('');
        setChapters([]); setTopics([]);
    }, [selectedClassId]);

    useEffect(() => {
        if (selectedSubjectId) academicService.getChaptersByClassSubject(selectedSubjectId).then(setChapters).catch(console.error);
        else setChapters([]);
        setSelectedChapterId(''); setSelectedTopicId(''); setTopics([]);
    }, [selectedSubjectId]);

    useEffect(() => {
        if (selectedChapterId) academicService.getTopicsByChapter(selectedChapterId).then(setTopics).catch(console.error);
        else setTopics([]);
        setSelectedTopicId('');
    }, [selectedChapterId]);

    // Fetch real questions for Question Bank
    useEffect(() => {
        const fetchQuestions = async () => {
            if (leftPanelTab !== 'manual') return;
            setLoadingQuestions(true);
            try {
                const res = await questionService.getAllQuestionsPaginated({ 
                    page: 0, 
                    size: 100, 
                    search: searchQuery,
                    filterStatus: 'APPROVED',
                    language: selectedLanguage === 'ALL' ? '' : selectedLanguage,
                    levelId: selectedLevelId || '',
                    streamId: selectedStreamId || '',
                    classId: selectedClassId || '',
                    subjectId: selectedSubjectId || '',
                    chapterId: selectedChapterId || '',
                    topicId: selectedTopicId || '',
                    className: (!selectedLevelId && docSettings?.className && !disableAutoFilter) ? docSettings.className : '',
                    subjectName: (!selectedLevelId && docSettings?.subject && !disableAutoFilter) ? docSettings.subject : '',
                    sourceMode: docSettings?.sourceMode || undefined,
                    lectureIds: docSettings?.sourceMode === 'LECTURE_SHEETS' ? docSettings.lectureIds : undefined,
                    boards: docSettings?.boards || undefined,
                    years: docSettings?.years || undefined,
                    schools: docSettings?.schools || undefined
                });
                if (res?.content) {
                    setBankQuestions(res.content);
                } else {
                    setBankQuestions([]);
                }
            } catch (err) {
                console.error("Failed to load bank questions:", err);
                setBankQuestions([]);
            } finally {
                setLoadingQuestions(false);
            }
        };
        const timer = setTimeout(() => fetchQuestions(), 300);
        return () => clearTimeout(timer);
    }, [
        searchQuery, docSettings?.className, docSettings?.subject, 
        leftPanelTab, selectedLanguage, selectedLevelId, selectedStreamId, 
        selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId, 
        disableAutoFilter, docSettings?.sourceMode, docSettings?.lectureIds,
        docSettings?.boards, docSettings?.years, docSettings?.schools
    ]);

    return {
        levels, streams, classes, subjects, chapters, topics,
        selectedLanguage, setSelectedLanguage,
        selectedLevelId, setSelectedLevelId,
        selectedStreamId, setSelectedStreamId,
        selectedClassId, setSelectedClassId,
        selectedSubjectId, setSelectedSubjectId,
        selectedChapterId, setSelectedChapterId,
        selectedTopicId, setSelectedTopicId,
        bankQuestions, loadingQuestions,
        searchQuery, setSearchQuery,
        disableAutoFilter, setDisableAutoFilter
    };
};
