import { useState, useEffect, useRef } from 'react';
import academicService from '../services/academicService';

/**
 * Shared hook for cascading academic hierarchy:
 * Level → Stream → Class → Subject → Chapter → Topic
 *
 * Returns: state, setters, dropdown data lists, and restoreHierarchy().
 */
const useAcademicHierarchy = (options = {}) => {
    const { activeOnly = true } = options;
    const [levels, setLevels] = useState([]);
    const [streams, setStreams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);

    const [levelId, setLevelId] = useState('');
    const [streamId, setStreamId] = useState('');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState(''); // classSubjectId
    const [chapterId, setChapterId] = useState('');
    const [topicId, setTopicId] = useState('');

    const isRestoring = useRef(false);

    // Load top-level: levels
    useEffect(() => {
        academicService.getAllLevels().then(setLevels).catch(console.error);
    }, []);

    // Auto-select Level if there's only one option
    useEffect(() => {
        if (levels.length === 1 && levelId !== levels[0].id) {
            setLevelId(levels[0].id);
        }
    }, [levels, levelId]);

    // Auto-select Stream if there's only one option
    useEffect(() => {
        if (levelId && streams.length === 1 && streamId !== streams[0].id) {
            setStreamId(streams[0].id);
        }
    }, [streams, levelId, streamId]);

    // Auto-select Class if there's only one option
    useEffect(() => {
        if (streamId && classes.length === 1 && classId !== classes[0].id) {
            setClassId(classes[0].id);
        }
    }, [classes, streamId, classId]);

    // Auto-select Subject if there's only one option
    useEffect(() => {
        if (classId && subjects.length === 1 && subjectId !== subjects[0].classSubjectId) {
            setSubjectId(subjects[0].classSubjectId);
        }
    }, [subjects, classId, subjectId]);

    // Level → Streams
    useEffect(() => {
        if (isRestoring.current) return;
        setStreamId(''); setClassId(''); setSubjectId(''); setChapterId(''); setTopicId('');
        setStreams([]); setClasses([]); setSubjects([]); setChapters([]); setTopics([]);
        if (levelId) academicService.getStreamsByLevel(levelId).then(setStreams).catch(console.error);
    }, [levelId]);

    // Stream → Classes
    useEffect(() => {
        if (isRestoring.current) return;
        setClassId(''); setSubjectId(''); setChapterId(''); setTopicId('');
        setClasses([]); setSubjects([]); setChapters([]); setTopics([]);
        if (streamId) academicService.getClassesByStream(streamId).then(setClasses).catch(console.error);
    }, [streamId]);

    // Class → Subjects
    useEffect(() => {
        if (isRestoring.current) return;
        setSubjectId(''); setChapterId(''); setTopicId('');
        setSubjects([]); setChapters([]); setTopics([]);
        if (classId) academicService.getSubjectsByClass(classId).then(setSubjects).catch(console.error);
    }, [classId]);

    // Subject → Chapters
    useEffect(() => {
        if (isRestoring.current) return;
        setChapterId(''); setTopicId('');
        setChapters([]); setTopics([]);
        if (subjectId) academicService.getChaptersByClassSubject(subjectId, activeOnly).then(setChapters).catch(console.error);
    }, [subjectId, activeOnly]);

    // Chapter → Topics
    useEffect(() => {
        if (isRestoring.current) return;
        setTopicId('');
        setTopics([]);
        if (chapterId) academicService.getTopicsByChapter(chapterId).then(setTopics).catch(console.error);
    }, [chapterId]);

    /**
     * Restore a previously saved hierarchy without triggering cascade resets.
     * Fetches all dropdown data in parallel then sets all IDs at once.
     */
    const restoreHierarchy = async ({ levelId: lId, streamId: sId, classId: cId, classSubjectId: csId, chapterId: chapId, topicId: topId }) => {
        try {
            isRestoring.current = true;
            // Fetch all needed dropdown data in parallel
            const [streamsData, classesData, subjectsData, chaptersData, topicsData] = await Promise.all([
                lId  ? academicService.getStreamsByLevel(lId).catch(() => [])   : Promise.resolve([]),
                sId  ? academicService.getClassesByStream(sId).catch(() => [])  : Promise.resolve([]),
                cId  ? academicService.getSubjectsByClass(cId).catch(() => [])  : Promise.resolve([]),
                csId ? academicService.getChaptersByClassSubject(csId, activeOnly).catch(() => []) : Promise.resolve([]),
                chapId ? academicService.getTopicsByChapter(chapId).catch(() => [])    : Promise.resolve([]),
            ]);

            // Set all dropdown data
            if (streamsData.length)  setStreams(streamsData);
            if (classesData.length)  setClasses(classesData);
            if (subjectsData.length) setSubjects(subjectsData);
            if (chaptersData.length) setChapters(chaptersData);
            if (topicsData.length)   setTopics(topicsData);

            // Set IDs — order matters: set parent first so cascade effects don't wipe children
            // We use functional setState batching trick by setting in the right sequence
            if (lId)    setLevelId(lId);
            if (sId)    setStreamId(sId);
            if (cId)    setClassId(cId);
            if (csId)   setSubjectId(csId);
            if (chapId) setChapterId(chapId);
            if (topId)  setTopicId(topId);
        } catch (e) {
            console.error('restoreHierarchy failed:', e);
        } finally {
            // Unset the flag carefully in the next tick to ensure react batching catches it
            setTimeout(() => {
                isRestoring.current = false;
            }, 100);
        }
    };

    return {
        // Data lists
        levels, streams, classes, subjects, chapters, topics,
        // Selected IDs
        levelId, streamId, classId, subjectId, chapterId, topicId,
        // Setters
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
        // Restore
        restoreHierarchy,
    };
};

export default useAcademicHierarchy;
