import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Edit, Trash2, CheckCircle, XCircle, Clock, Search, Layers, ListFilter, X, ThumbsUp, ThumbsDown, ChevronDown, Filter, FileText, Settings2, Bookmark, BookmarkCheck, GitCompare, Loader2, MoreHorizontal, ShoppingCart } from 'lucide-react';
import questionService from '../../../services/questionService';
import academicService from '../../../services/academicService';
import examService from '../../../services/examService';
import questionTypeService from '../../../services/questionTypeService';
import RevisePanel from './components/RevisePanel';
import RevisionReviewPanel from './components/RevisionReviewPanel';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import QuestionEdit from './QuestionEdit';
import CQCombinedRenderer from './components/CQCombinedRenderer';
import QuestionListItem from './components/QuestionListItem';
import QuestionPreviewContent from './components/QuestionPreviewContent';


const QuestionList = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin' || user?.email?.includes('admin@');
    const isDefaultInstitute = user?.instituteName?.toUpperCase() === 'DEFAULT' || user?.instituteName === 'Default Institute';
    const isDefaultOrSuperAdmin = isSuperAdmin || isDefaultInstitute;
    const hasFullLangAccess = isSuperAdmin || isDefaultInstitute;
    const uniqueInstituteMediums = useMemo(() => {
        if (!user?.instituteMedium) return [];
        return [...new Set(user.instituteMedium.split(',').map(m => m.trim()).filter(Boolean))];
    }, [user?.instituteMedium]);

    const showLanguageFilter = hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.length > 1 || user.instituteMedium.includes('Bilingual');


    const hasPerm = (action) => {
        if (isSuperAdmin) return true;
        // Dynamically infer permission string based on route
        let permId = 'QUESTION_BANK_REPOSITORY_ALL_QUESTIONS';
        if (location.pathname.includes('/approved')) permId = 'QUESTION_BANK_REPOSITORY_APPROVED';
        if (location.pathname.includes('/pending')) permId = 'QUESTION_BANK_REPOSITORY_PENDING';
        if (location.pathname.includes('/rejected')) permId = 'QUESTION_BANK_REPOSITORY_REJECTED';
        // Note: drafts may not have a specific hardcoded permission, fallback to ALL or standard ones.
        return user?.permissions?.includes(`${permId}_${action}`);
    };

    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const observerTarget = useRef(null);
    const getInitialStatus = (path) => {
        if (path.includes('/drafts')) return 'DRAFT';
        if (path.includes('/pending')) return 'PENDING';
        if (path.includes('/rejected')) return 'REJECTED';
        if (path.includes('/approved')) return 'APPROVED';
        if (path.includes('/revised')) return 'REVISED';
        return 'ALL';
    };

    const getInitialViewMode = (path) => {
        if (path.includes('/favorites')) return 'FAVORITES';
        if (path.includes('/revised')) return 'REVISED';
        return 'ALL';
    };

    const [filterStatus, setFilterStatus] = useState(() => getInitialStatus(location.pathname));
    const [viewMode, setViewMode] = useState(() => getInitialViewMode(location.pathname));
    const [filterType, setFilterType] = useState('ALL');
    const [filterLanguage, setFilterLanguage] = useState(() => {
        if (uniqueInstituteMediums && uniqueInstituteMediums.length > 1) return 'ALL';
        return uniqueInstituteMediums[0] || 'ALL';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [filterUnanswered, setFilterUnanswered] = useState(false);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [splitScreenMode, setSplitScreenMode] = useState(false);
    const [savedIds, setSavedIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('savedQuestionIds') || '[]'); } catch { return []; }
    });

    const [selectedQuestionMap, setSelectedQuestionMap] = useState({});
    const [isCartOpen, setIsCartOpen] = useState(false);
    const cartRef = useRef(null);

    const [portalTarget, setPortalTarget] = useState(null);
    useEffect(() => {
        let isMounted = true;
        const findTarget = () => {
            const el = document.getElementById('topbar-actions');
            if (el) {
                if (isMounted) setPortalTarget(el);
                return true;
            }
            return false;
        };

        if (!findTarget()) {
            let count = 0;
            const interval = setInterval(() => {
                count++;
                if (findTarget() || count >= 15) {
                    clearInterval(interval);
                }
            }, 100);
            return () => {
                isMounted = false;
                clearInterval(interval);
                setPortalTarget(null);
            };
        }

        return () => {
            isMounted = false;
            setPortalTarget(null);
        };
    }, []);

    useEffect(() => {
        const handleClickOutsideCart = (event) => {
            if (cartRef.current && !cartRef.current.contains(event.target)) {
                setIsCartOpen(false);
            }
        };
        if (isCartOpen) {
            document.addEventListener('mousedown', handleClickOutsideCart);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideCart);
        };
    }, [isCartOpen]);

    const [overviewStats, setOverviewStats] = useState(null);
    const [dynamicTypes, setDynamicTypes] = useState([]);



    const handleSaveToggle = React.useCallback(async (id) => {
        setSavedIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem('savedQuestionIds', JSON.stringify(next));
            return next;
        });
        try {
            await questionService.toggleFavorite(id);
        } catch (error) {
            console.error("Failed to toggle favorite on backend", error);
        }
    }, []);

    useEffect(() => {
        const fetchFavoriteIds = async () => {
            try {
                const ids = await questionService.getMyFavoriteIds();
                if (ids && Array.isArray(ids)) {
                    setSavedIds(ids);
                    localStorage.setItem('savedQuestionIds', JSON.stringify(ids));
                }
            } catch (error) {
                console.error("Failed to fetch favorite IDs", error);
            }
        };
        if (user && user.id) fetchFavoriteIds();
    }, [user?.id]);

    // Sync filter status with URL path for sidebar menus
    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/drafts')) {
            setFilterStatus('DRAFT');
            setViewMode('ALL');
        } else if (path.includes('/pending')) {
            setFilterStatus('PENDING');
            setViewMode('ALL');
        } else if (path.includes('/rejected')) {
            setFilterStatus('REJECTED');
            setViewMode('ALL');
        } else if (path.includes('/approved')) {
            setFilterStatus('APPROVED');
            setViewMode('ALL');
        } else if (path.includes('/favorites')) {
            setFilterStatus('ALL');
            setViewMode('FAVORITES');
        } else if (path.includes('/revised')) {
            setFilterStatus('REVISED');
            setViewMode('REVISED');
        } else {
            setFilterStatus('ALL');
            setViewMode('ALL');
        }
        setCurrentPage(1);
    }, [location.pathname]);

    const [reviseItem, setReviseItem] = useState(null); // question to revise
    const [reviewItem, setReviewItem] = useState(null); // revision to review (Super Admin)
    const [revisedIds, setRevisedIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('revisedQuestionIds') || '[]'); } catch { return []; }
    });

    // Hierarchy filter options
    const [levels, setLevels] = useState([]);
    const [streams, setStreams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [fullHierarchy, setFullHierarchy] = useState([]);
    const [metadataSearchTerm, setMetadataSearchTerm] = useState('');
    const [metadataSuggestions, setMetadataSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Hierarchy filter selections
    const [selectedLevelId, setSelectedLevelId] = useState(() => localStorage.getItem('qb_filter_level') || '');
    const [selectedStreamId, setSelectedStreamId] = useState(() => localStorage.getItem('qb_filter_stream') || '');
    const [selectedClassId, setSelectedClassId] = useState(() => localStorage.getItem('qb_filter_class') || '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(() => localStorage.getItem('qb_filter_subject') || ''); // classSubjectId
    const [selectedChapterId, setSelectedChapterId] = useState(() => localStorage.getItem('qb_filter_chapter') || '');
    const [selectedTopicId, setSelectedTopicId] = useState(() => localStorage.getItem('qb_filter_topic') || '');
    
    // Save filter selections to localStorage
    useEffect(() => {
        localStorage.setItem('qb_filter_level', selectedLevelId || '');
        localStorage.setItem('qb_filter_stream', selectedStreamId || '');
        localStorage.setItem('qb_filter_class', selectedClassId || '');
        localStorage.setItem('qb_filter_subject', selectedSubjectId || '');
        localStorage.setItem('qb_filter_chapter', selectedChapterId || '');
        localStorage.setItem('qb_filter_topic', selectedTopicId || '');
    }, [selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId]);
    
    // Source Tag filters
    const [selectedBoards, setSelectedBoards] = useState([]);
    const [selectedYears, setSelectedYears] = useState([]);
    const [selectedSchools, setSelectedSchools] = useState([]);
    const [sourceTags, setSourceTags] = useState({ boards: [], years: [], schools: [] });

    // Parameter builders
    const getHierarchyParams = React.useCallback(() => {
        return {
            filterStatus: filterStatus === 'ALL' ? '' : filterStatus,
            filterType: filterType === 'ALL' ? '' : filterType,
            language: filterLanguage === 'ALL' ? '' : filterLanguage,
            search: searchQuery,
            levelId: selectedLevelId,
            streamId: selectedStreamId,
            classId: selectedClassId,
            subjectId: selectedSubjectId,
            chapterId: selectedChapterId,
            topicId: selectedTopicId,
            filterUnanswered: filterUnanswered ? 'true' : 'false'
        };
    }, [filterStatus, filterType, filterLanguage, searchQuery, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId, filterUnanswered]);

    const getFullParams = React.useCallback(() => {
        return {
            ...getHierarchyParams(),
            sourceBoards: selectedBoards.join(','),
            sourceYears: selectedYears.join(','),
            sourceSchools: selectedSchools.join(',')
        };
    }, [getHierarchyParams, selectedBoards, selectedYears, selectedSchools]);

    const fetchOverviewStats = async () => {
        try {
            const params = getFullParams();
            const data = await questionService.getOverviewStats(params);
            setOverviewStats(data);
        } catch (error) {
            console.error("Failed to fetch overview stats", error);
        }
    };

    const fetchSourceTags = async () => {
        try {
            // Source tags are aggregated based purely on the hierarchy parameters
            // to allow users to see all available tags for the selected subject
            const params = getHierarchyParams();
            const data = await questionService.getSourceTags(params);
            setSourceTags(data || { boards: [], years: [], schools: [] });
        } catch (error) {
            console.error("Failed to fetch source tags", error);
        }
    };

    // Load source tags whenever hierarchy filters change
    useEffect(() => {
        fetchSourceTags();
    }, [getHierarchyParams]);

    // Run fetchInitialFilters once on mount
    useEffect(() => {
        fetchInitialFilters();
    }, []);

    useEffect(() => {
        const viewId = searchParams.get('view');
        if (viewId) {
            const openQuestion = async () => {
                try {
                    const qObj = await questionService.getQuestionById(viewId);
                    if (qObj) {
                        if (qObj.type === 'MCQ') {
                            try {
                                const options = await questionService.getOptions(qObj.id);
                                qObj.options = options;
                            } catch (e) { console.error('Failed to load options', e); }
                        }
                        
                        if (qObj.status === 'REVISED' && isSuperAdmin) {
                            setReviewItem(qObj);
                        } else {
                            setSelectedQuestion(qObj);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch linked question", error);
                }
                
                // Remove parameter from URL
                searchParams.delete('view');
                setSearchParams(searchParams, { replace: true });
            };
            openQuestion();
        }
    }, [searchParams, isSuperAdmin, setSearchParams]);

    const fetchInitialFilters = async () => {
        try {
            const levelData = await academicService.getAllLevels();
            setLevels(levelData);
            if (levelData.length === 1) setSelectedLevelId(levelData[0].id);
            const hierarchyData = await academicService.getHierarchy();
            setFullHierarchy(hierarchyData || []);
            
            const qTypes = await questionTypeService.getAllQuestionTypes();
            setDynamicTypes(qTypes || []);
        } catch (error) {
            console.error("Failed to fetch initial filters", error);
        }
    };

    // Metadata Search Effect
    useEffect(() => {
        if (metadataSearchTerm === undefined || metadataSearchTerm === null || !fullHierarchy) {
            setMetadataSuggestions([]);
            return;
        }

        const term = metadataSearchTerm.trim().toLowerCase();
        const results = [];
        
        // Ensure fullHierarchy has the expected arrays before proceeding
        if (fullHierarchy.classSubjects && Array.isArray(fullHierarchy.classSubjects)) {
            fullHierarchy.classSubjects.forEach(cs => {
                if (!term || (cs.name && cs.name.toLowerCase().includes(term))) {
                    let className = '';
                    if (fullHierarchy.classes) {
                        const cls = fullHierarchy.classes.find(c => c.id === cs._classId);
                        if (cls) className = ` (${cls.name})`;
                    }
                    results.push({ 
                        type: 'Subject', 
                        id: cs.id, 
                        name: cs.name + className, 
                        classId: cs._classId, 
                        subjectId: cs.id 
                    });
                }
            });
        }
        
        if (fullHierarchy.subjects && Array.isArray(fullHierarchy.subjects)) {
            fullHierarchy.subjects.forEach(sub => {
                if (!term || (sub.name && sub.name.toLowerCase().includes(term))) {
                    // Prevent duplicate subject names if already added via classSubjects
                    if (!results.find(r => r.name === sub.name && r.type === 'Subject')) {
                        results.push({ 
                            type: 'Subject (Global)', 
                            id: sub.id, 
                            name: sub.name, 
                            subjectId: sub.id 
                        });
                    }
                }
            });
        }
        
        if (fullHierarchy.classes && Array.isArray(fullHierarchy.classes)) {
            fullHierarchy.classes.forEach(cls => {
                if (!term || (cls.name && cls.name.toLowerCase().includes(term))) {
                    results.push({ 
                        type: 'Class', 
                        id: cls.id, 
                        name: cls.name, 
                        streamId: cls._streamId, 
                        classId: cls.id 
                    });
                }
            });
        }

        setMetadataSuggestions(results.slice(0, 15)); // max 15 suggestions
    }, [metadataSearchTerm, fullHierarchy]);

    const handleSelectSuggestion = (suggestion) => {
        let { levelId, streamId, classId, subjectId, chapterId, topicId } = suggestion;

        // Auto-resolve missing parent IDs if we have fullHierarchy
        if (fullHierarchy) {
            if (topicId && !chapterId) {
                const tp = fullHierarchy.topics?.find(t => t.id === topicId);
                if (tp) chapterId = tp._chapterId;
            }
            if (chapterId && !subjectId) {
                const ch = fullHierarchy.chapters?.find(c => c.id === chapterId);
                if (ch) subjectId = ch._classSubjectId;
            }
            if (subjectId && !classId) {
                const cs = fullHierarchy.classSubjects?.find(c => c.id === subjectId);
                if (cs) classId = cs._classId;
            }
            if (classId && !streamId) {
                const cls = fullHierarchy.classes?.find(c => c.id === classId);
                if (cls) streamId = cls._streamId;
            }
            if (streamId && !levelId) {
                const str = fullHierarchy.streams?.find(s => s.id === streamId);
                if (str) levelId = str._levelId;
            }
        }

        if (levelId) setSelectedLevelId(levelId);
        
        // Use timeout to allow hierarchy dropdowns to populate from API
        // since setting selectedLevelId triggers fetching streams, etc.
        setTimeout(() => {
            if (streamId) setSelectedStreamId(streamId);
            setTimeout(() => {
                if (classId) setSelectedClassId(classId);
                setTimeout(() => {
                    if (subjectId) setSelectedSubjectId(subjectId);
                    setTimeout(() => {
                        if (chapterId) setSelectedChapterId(chapterId);
                        setTimeout(() => {
                            if (topicId) setSelectedTopicId(topicId);
                        }, 300);
                    }, 300);
                }, 300);
            }, 300);
        }, 300);

        setMetadataSearchTerm('');
        setMetadataSuggestions([]);
    };

    // Level → Streams
    useEffect(() => {
        if (selectedLevelId) {
            academicService.getStreamsByLevel(selectedLevelId).then(data => {
                setStreams(data);
                if (data.length === 1) {
                    setSelectedStreamId(data[0].id);
                } else if (selectedStreamId && !data.find(s => s.id === selectedStreamId)) {
                    setSelectedStreamId('');
                }
            }).catch(console.error);
        } else {
            setStreams([]);
            setSelectedStreamId('');
        }
    }, [selectedLevelId]);

    // Stream → Classes
    useEffect(() => {
        if (selectedStreamId) {
            academicService.getClassesByStream(selectedStreamId).then(data => {
                setClasses(data);
                if (data.length === 1) {
                    setSelectedClassId(data[0].id);
                } else if (selectedClassId && !data.find(c => c.id === selectedClassId)) {
                    setSelectedClassId('');
                }
            }).catch(console.error);
        } else {
            setClasses([]);
            setSelectedClassId('');
        }
    }, [selectedStreamId]);

    // Class → Subjects
    useEffect(() => {
        if (selectedClassId) {
            academicService.getSubjectsByClass(selectedClassId).then(data => {
                setSubjects(data);
                if (data.length === 1) {
                    setSelectedSubjectId(data[0].classSubjectId);
                } else if (selectedSubjectId && !data.find(s => s.classSubjectId === selectedSubjectId)) {
                    setSelectedSubjectId('');
                }
            }).catch(console.error);
        } else {
            setSubjects([]);
            setSelectedSubjectId('');
        }
    }, [selectedClassId]);
    
    // Filter subjects based on language selection
    const filteredSubjects = useMemo(() => {
        if (!subjects) return [];
        return subjects.filter(s => {
            const isEng = s.isEnglishVersion || s.englishVersion || false;
            if (filterLanguage === 'English') return isEng === true;
            if (filterLanguage === 'Bangla') return isEng === false;
            return true;
        });
    }, [subjects, filterLanguage]);

    // Reset selected subject/chapter/topic if no longer in filtered subjects list
    useEffect(() => {
        if (selectedSubjectId && filteredSubjects.length > 0) {
            const exists = filteredSubjects.some(s => s.classSubjectId === selectedSubjectId);
            if (!exists) {
                setSelectedSubjectId('');
                setSelectedChapterId('');
                setSelectedTopicId('');
            }
        }
    }, [filterLanguage, filteredSubjects, selectedSubjectId]);

    // Auto-select subject if only one is available after language filtering
    useEffect(() => {
        if (filteredSubjects && filteredSubjects.length === 1) {
            if (selectedSubjectId !== filteredSubjects[0].classSubjectId) {
                setSelectedSubjectId(filteredSubjects[0].classSubjectId);
            }
        }
    }, [filteredSubjects, selectedSubjectId]);


    // Subject → Chapters
    useEffect(() => {
        if (selectedSubjectId) {
            academicService.getChaptersByClassSubject(selectedSubjectId).then(data => {
                setChapters(data);
                if (data.length === 1) {
                    setSelectedChapterId(data[0].id);
                } else if (selectedChapterId && !data.find(ch => ch.id === selectedChapterId)) {
                    setSelectedChapterId('');
                }
            }).catch(console.error);
        } else {
            setChapters([]);
            setSelectedChapterId('');
        }
    }, [selectedSubjectId]);

    // Chapter → Topics
    useEffect(() => {
        if (selectedChapterId) {
            academicService.getTopicsByChapter(selectedChapterId).then(data => {
                setTopics(data);
                if (data.length === 1) {
                    setSelectedTopicId(data[0].id);
                } else if (selectedTopicId && !data.find(t => t.id === selectedTopicId)) {
                    setSelectedTopicId('');
                }
            }).catch(console.error);
        } else {
            setTopics([]);
            setSelectedTopicId('');
        }
    }, [selectedChapterId]);

    const fetchQuestions = async () => {
        if (currentPage === 1) setLoading(true);
        else setLoadingMore(true);
        try {
            const params = {
                ...getFullParams(),
                page: currentPage - 1,
                size: itemsPerPage
            };
            
            let data;
            if (viewMode === 'FAVORITES') {
                data = await questionService.getMyFavorites(params);
            } else {
                data = await questionService.getAllQuestionsPaginated(params);
            }
            
            if (currentPage === 1) {
                setQuestions(data.content || []);
            } else {
                setQuestions(prev => {
                    const newQs = data.content || [];
                    const existingIds = new Set(prev.map(q => q.id));
                    const uniqueNewQs = newQs.filter(q => !existingIds.has(q.id));
                    return [...prev, ...uniqueNewQs];
                });
            }
            setTotalPages(data.totalPages || 0);
            setTotalElements(data.totalElements || 0);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const prevSearchRef = useRef(searchQuery);

    // Refetch whenever filters or pagination change
    useEffect(() => {
        const isSearchChange = prevSearchRef.current !== searchQuery;
        prevSearchRef.current = searchQuery;

        if (isSearchChange) {
            const timer = setTimeout(() => {
                fetchQuestions();
                fetchOverviewStats();
            }, 300); // 300ms debounce only for search query typing
            return () => clearTimeout(timer);
        } else {
            // Pagination and other filters trigger instantly
            fetchQuestions();
            if (currentPage === 1) fetchOverviewStats();
        }
    }, [viewMode, currentPage, itemsPerPage, filterStatus, filterType, filterLanguage, searchQuery, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId, selectedBoards, selectedYears, selectedSchools, filterUnanswered]);

    // Intersection Observer for Infinite Scrolling
    useEffect(() => {
        if (loading || loadingMore || questions.length === 0) return;

        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                if (entry.isIntersecting && currentPage < totalPages) {
                    setCurrentPage(prev => prev + 1);
                }
            },
            { rootMargin: '0px' }
        );

        const target = observerTarget.current;
        if (target) {
            observer.observe(target);
        }

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, [loading, loadingMore, currentPage, totalPages, questions.length]);



    const handleDelete = React.useCallback(async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await questionService.deleteQuestion(id);
                setQuestions(prev => prev.filter(q => q.id !== id));
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            } catch (error) {
                console.error("Failed to delete", error);
            }
        }
    }, []);

    const handleViewQuestion = React.useCallback(async (q) => {
        setSelectedQuestion(q);
        setTimeout(() => {
            const el = document.getElementById(`question-item-${q.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        
        if (q.type === 'MCQ') {
            try {
                const options = await questionService.getOptions(q.id);
                setSelectedQuestion({ ...q, options });
            } catch (err) {
                console.error('Failed to load options', err);
            }
        }
    }, []);

    const handleSelectItem = React.useCallback((id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                setSelectedQuestionMap(prevMap => {
                    const newMap = { ...prevMap };
                    delete newMap[id];
                    return newMap;
                });
                return prev.filter(selectedId => selectedId !== id);
            } else {
                const qObj = questions.find(q => q.id === id);
                if (qObj) {
                    setSelectedQuestionMap(prevMap => ({
                        ...prevMap,
                        [id]: qObj
                    }));
                }
                return [...prev, id];
            }
        });
    }, [questions]);

    const [bulkProgress, setBulkProgress] = useState(null); // { current, total, action }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} questions?`)) {
            setBulkProgress({ current: 0, total: selectedIds.length, action: 'Deleting' });
            
            const CHUNK_SIZE = 20;
            let successCount = 0;
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                try {
                    await questionService.deleteQuestionsBulk(chunk);
                    successCount += chunk.length;
                    setQuestions(prev => prev.filter(q => !chunk.includes(q.id)));
                } catch (error) {
                    console.error("Failed to bulk delete chunk", error);
                }
                setBulkProgress({ current: Math.min(i + CHUNK_SIZE, selectedIds.length), total: selectedIds.length, action: 'Deleting' });
            }
            
            setBulkProgress({ current: selectedIds.length, total: selectedIds.length, action: 'Refreshing Data' });
            setSelectedIds([]);
            await fetchQuestions();
            await fetchOverviewStats();
            setBulkProgress(null);
        }
    };

    const handleUpdateStatusBulk = async (status) => {
        if (!selectedIds.length) return;
        if (window.confirm(`Update ${selectedIds.length} questions to ${status}?`)) {
            setBulkProgress({ current: 0, total: selectedIds.length, action: `Updating to ${status}` });
            
            const CHUNK_SIZE = 20;
            let successCount = 0;
            for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
                const chunk = selectedIds.slice(i, i + CHUNK_SIZE);
                try {
                    await questionService.updateStatusBulk(chunk, status);
                    successCount += chunk.length;
                    setQuestions(prev => prev.map(q => chunk.includes(q.id) ? { ...q, status } : q));
                } catch (error) {
                    console.error("Failed to update status chunk", error);
                }
                setBulkProgress({ current: Math.min(i + CHUNK_SIZE, selectedIds.length), total: selectedIds.length, action: `Updating to ${status}` });
            }
            
            setBulkProgress({ current: selectedIds.length, total: selectedIds.length, action: 'Refreshing Data' });
            setSelectedIds([]);
            await fetchQuestions();
            await fetchOverviewStats();
            setBulkProgress(null);
        }
    };

    const handleQuickAction = async (questionId, status) => {
        try {
            await questionService.updateStatusBulk([questionId], status);
            setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status } : q));
            
            // Auto-select next question
            const currentIndex = questions.findIndex(q => q.id === questionId);
            if (currentIndex >= 0 && currentIndex < questions.length - 1) {
                handleViewQuestion(questions[currentIndex + 1]);
            } else if (currentIndex === questions.length - 1) {
                // If it's the last item on the current page, try to go to next page
                if (currentPage < totalPages) {
                    setCurrentPage(p => p + 1);
                    setSelectedQuestion(null); // will need to click the next page's first item
                } else {
                    setSelectedQuestion(null);
                }
            }
        } catch (error) {
            alert("Action failed.");
        }
    };

    const handleCreateExamFromSelection = async () => {
        if (!selectedIds.length) return;
        
        const firstSelectedQ = questions.find(q => q.id === selectedIds[0]) || selectedQuestionMap[selectedIds[0]];
        if (!firstSelectedQ) return;
        
        const sId = firstSelectedQ.classSubject?.id || firstSelectedQ.classSubjectId || selectedSubjectId;
        const language = firstSelectedQ.language || 'Bangla';
        const defaultMarksMap = { 'MCQ': 1, 'CQ': 10, 'SHORT': 2 };

        if (!sId) {
            alert("Could not determine the subject. Please filter questions by a specific subject first.");
            return;
        }
        
        const selectedQuestions = selectedIds.map(id => selectedQuestionMap[id] || questions.find(q => q.id === id)).filter(Boolean);
        let totalMarks = 0;
        for (const q of selectedQuestions) {
            totalMarks += q.marks || defaultMarksMap[q.type] || 1;
        }

        if (window.confirm(`Create a new exam with these ${selectedIds.length} selected questions (${totalMarks} Marks)?`)) {
            setBulkProgress({ current: 0, total: selectedIds.length + 2, action: 'Initializing Exam' });
            try {
                const examRes = await examService.createManualExam({
                    title: 'Custom Exam ' + new Date().toLocaleDateString(),
                    examType: 'MODEL_TEST',
                    classSubjectId: sId,
                    totalMarks: totalMarks,
                    durationMinutes: 60,
                    language: language,
                    instructions: "",
                    instituteName: user?.instituteName || "",
                    headerText: "",
                    shuffleQuestions: false,
                    shuffleOptions: false,
                    sections: []
                });

                if (examRes.success) {
                    const examId = examRes.data.id;
                    setBulkProgress({ current: 1, total: selectedIds.length + 2, action: 'Adding Questions' });
                    
                    let addedCount = 0;
                    for (const q of selectedQuestions) {
                        const marks = q.marks || defaultMarksMap[q.type] || 1;
                        await examService.addQuestionToManualExam(examId, {
                            questionId: q.id,
                            marks: marks,
                            sectionId: null
                        });
                        addedCount++;
                        setBulkProgress({ current: 1 + addedCount, total: selectedIds.length + 2, action: 'Adding Questions' });
                    }

                    setBulkProgress({ current: selectedIds.length + 1, total: selectedIds.length + 2, action: 'Publishing Exam' });
                    const publishRes = await examService.publishManualExam(examId);
                    
                    if (publishRes.success) {
                        setBulkProgress({ current: selectedIds.length + 2, total: selectedIds.length + 2, action: 'Opening Editor' });
                        setSelectedIds([]);
                        setSelectedQuestionMap({});
                        navigate(`/exams/generate/nexus-editor/${examId}`);
                    }
                }
            } catch (error) {
                console.error("Failed to create exam from selection", error);
                alert("Failed to create exam: " + (error.response?.data?.message || error.message || "Please try again."));
            } finally {
                setBulkProgress(null);
            }
        }
    };

    useEffect(() => {
        setCurrentPage(1); // Reset page to 1 when any filter changes
    }, [filterStatus, filterType, filterLanguage, searchQuery, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId]);

    const typeTabs = useMemo(() => {
        const baseTabs = [
            { id: 'ALL', label: 'All' },
            { id: 'MCQ', label: 'MCQ' },
            { id: 'CQ', label: 'Creative (CQ)' },
            { id: 'SHORT', label: 'Short Q' },
            ...dynamicTypes
                .filter(t => !t.isSystemDefault)
                .map(t => ({ id: t.code, label: t.name }))
        ];

        if (!overviewStats || !overviewStats.typeCounts) {
            return baseTabs;
        }

        return baseTabs.filter(tab => {
            if (tab.id === 'ALL' || filterType === tab.id) return true;
            const count = overviewStats.typeCounts[tab.id] || 0;
            return count > 0;
        });
    }, [overviewStats, dynamicTypes, filterType]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><CheckCircle size={14} /> Approved</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><XCircle size={14} /> Rejected</span>;
            case 'PENDING':
                return <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><Clock size={14} /> Pending</span>;
            case 'REVISED':
                return <span className="px-2.5 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><Edit size={14} /> Revised</span>;
            case 'DRAFT':
                return <span className="px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><FileText size={14} /> Draft</span>;
            default:
                return <span className="px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center w-max">Draft</span>;
        }
    };

    const resetFilters = () => {
        if (levels.length > 1) {
            setSelectedLevelId('');
        } else if (levels.length === 1) {
            setSelectedLevelId(levels[0].id);
        }

        if (streams.length > 1) {
            setSelectedStreamId('');
        } else if (streams.length === 1) {
            setSelectedStreamId(streams[0].id);
        }

        if (classes.length > 1) {
            setSelectedClassId('');
        } else if (classes.length === 1) {
            setSelectedClassId(classes[0].id);
        }

        if (filteredSubjects.length > 1) {
            setSelectedSubjectId('');
        } else if (filteredSubjects.length === 1) {
            setSelectedSubjectId(filteredSubjects[0].classSubjectId);
        }

        if (chapters.length > 1) {
            setSelectedChapterId('');
        } else if (chapters.length === 1) {
            setSelectedChapterId(chapters[0].id);
        }

        if (topics.length > 1) {
            setSelectedTopicId('');
        } else if (topics.length === 1) {
            setSelectedTopicId(topics[0].id);
        }

        setSearchQuery('');
        setFilterType('ALL');
        if (showLanguageFilter) {
            setFilterLanguage('ALL');
        } else {
            setFilterLanguage(uniqueInstituteMediums[0] || 'ALL');
        }
        setSelectedBoards([]);
        setSelectedYears([]);
        setSelectedSchools([]);
        setFilterUnanswered(false);
    };

    const [isSelectingAll, setIsSelectingAll] = useState(false);
    const [showSourceFilters, setShowSourceFilters] = useState(() => window.innerWidth >= 1024);
    const [activeSidebarTab, setActiveSidebarTab] = useState('academic');

    const handleSelectAllGlobal = async () => {
        setIsSelectingAll(true);
        try {
            const params = getFullParams();
            const ids = await questionService.getAllQuestionIds(params);
            setSelectedIds(ids);
        } catch (error) {
            console.error("Failed to fetch all IDs", error);
            alert("Failed to select all questions.");
        } finally {
            setIsSelectingAll(false);
        }
    };

    const getActiveFiltersBreadcrumb = () => {
        const crumbs = [];
        if (selectedLevelId) {
            const l = levels.find(x => x.id === selectedLevelId);
            if (l) crumbs.push(l.name);
        }
        if (selectedStreamId) {
            const s = streams.find(x => x.id === selectedStreamId);
            if (s) crumbs.push(s.name);
        }
        if (selectedClassId) {
            const c = classes.find(x => x.id === selectedClassId);
            if (c) crumbs.push(c.name);
        }
        if (selectedSubjectId) {
            const sub = subjects.find(x => x.classSubjectId === selectedSubjectId);
            if (sub) crumbs.push(sub.subjectName);
        }
        if (selectedChapterId) {
            const ch = chapters.find(x => x.id === selectedChapterId);
            if (ch) crumbs.push(ch.name);
        }
        if (selectedTopicId) {
            const t = topics.find(x => x.id === selectedTopicId);
            if (t) crumbs.push(t.name);
        }
        return crumbs;
    };

    const renderQuestionCart = () => {
        return (
            <div className="relative shrink-0 animate-in fade-in zoom-in duration-200" ref={cartRef}>
                <button
                    onClick={() => setIsCartOpen(!isCartOpen)}
                    className={`relative p-2 rounded-xl transition-colors active:scale-90 ${
                        isCartOpen
                            ? 'bg-slate-100 text-slate-800'
                            : selectedIds.length > 0
                            ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100/75'
                            : 'text-slate-500 hover:bg-slate-50'
                    }`}
                    title="Question Cart"
                >
                    <ShoppingCart className="w-5 h-5" />
                    {selectedIds.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white border-[1.5px] border-white rounded-full text-[9px] font-black flex items-center justify-center translate-x-1/4 -translate-y-1/4 animate-bounce">
                            {selectedIds.length}
                        </span>
                    )}
                </button>

                {isCartOpen && (
                    <div className="absolute right-0 mt-2 w-[92vw] sm:w-[440px] max-w-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <ShoppingCart size={14} className="text-indigo-600" />
                                <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Question Cart</span>
                            </div>
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={() => {
                                        setSelectedIds([]);
                                        setSelectedQuestionMap({});
                                    }}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3 space-y-3">
                            {selectedIds.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-1">
                                    <ShoppingCart size={24} className="stroke-[1.5] text-slate-300" />
                                    <span className="text-xs font-bold">Cart is empty</span>
                                    <span className="text-[10px] opacity-80">Click checkboxes in the list to add questions</span>
                                </div>
                            ) : (
                                Object.entries(
                                    selectedIds.reduce((groups, id, idx) => {
                                        const q = selectedQuestionMap[id] || questions.find(x => x.id === id);
                                        const qType = q?.type || 'OTHER';
                                        if (!groups[qType]) groups[qType] = [];
                                        groups[qType].push({ id, q, originalIdx: idx });
                                        return groups;
                                    }, {})
                                ).map(([type, items]) => {
                                    const getGroupLabel = (t) => {
                                        switch (t.toUpperCase()) {
                                            case 'MCQ': return 'Multiple Choice (MCQ)';
                                            case 'CQ': return 'Creative Questions (CQ)';
                                            case 'SHORT': return 'Short Questions';
                                            case 'TF': return 'True / False';
                                            default: return `${t} Questions`;
                                        }
                                    };

                                    return (
                                        <div key={type} className="space-y-1.5">
                                            {/* Section Header */}
                                            <div className="bg-slate-100/80 px-2.5 py-1.5 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center justify-between">
                                                <span>{getGroupLabel(type)}</span>
                                                <span className="bg-white px-1.5 py-0.5 rounded-md border border-slate-200 text-[9px] text-indigo-600 font-bold shadow-sm">{items.length}</span>
                                            </div>

                                            {/* Section Items */}
                                            <div className="space-y-1.5 pl-1">
                                                {items.map(({ id, q, originalIdx }) => {
                                                    const cleanText = q?.questionText
                                                        ? q.questionText.replace(/<[^>]*>/g, '').substring(0, 55) + (q.questionText.replace(/<[^>]*>/g, '').length > 55 ? '...' : '')
                                                        : `Question #${originalIdx + 1}`;
                                                    return (
                                                        <div
                                                            key={id}
                                                            className="p-2 bg-slate-50/50 hover:bg-slate-100/50 rounded-xl border border-slate-150 flex items-start gap-2 group transition-all"
                                                        >
                                                            <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center shrink-0 border border-indigo-100 mt-0.5">
                                                                {originalIdx + 1}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold text-slate-700 leading-snug break-words">
                                                                    {cleanText}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                    <span className="text-[9px] text-slate-400 font-bold">
                                                                        {q?.marks || 1} Marks
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedIds(prev => prev.filter(x => x !== id));
                                                                    setSelectedQuestionMap(prevMap => {
                                                                        const newMap = { ...prevMap };
                                                                        delete newMap[id];
                                                                        return newMap;
                                                                    });
                                                                }}
                                                                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-all"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 shrink-0">
                                <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                                    <span>Total Questions: {selectedIds.length}</span>
                                    <span>Total Marks: {(() => {
                                        const defaultMarksMap = { 'MCQ': 1, 'CQ': 10, 'SHORT': 2 };
                                        return selectedIds.reduce((sum, id) => {
                                            const q = selectedQuestionMap[id] || questions.find(x => x.id === id);
                                            return sum + (q?.marks || defaultMarksMap[q?.type] || 1);
                                        }, 0);
                                    })()}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsCartOpen(false);
                                        handleCreateExamFromSelection();
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-black text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                                    style={{ background: 'linear-gradient(135deg, var(--primary-color, #e91e8c) 0%, var(--secondary-color, #a855f7) 100%)' }}
                                >
                                    <FileText size={13} /> Create Exam
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
        {/* Portal Question Cart next to the Notification Bell */}
        {portalTarget && createPortal(renderQuestionCart(), portalTarget)}

        {/* Bulk Action Progress Overlay */}
        {bulkProgress && (
            <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 w-[320px]">
                    <Loader2 className="animate-spin text-primary w-10 h-10" />
                    <h3 className="font-bold text-slate-800">{bulkProgress.action}...</h3>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                        {bulkProgress.current} / {bulkProgress.total} Complete
                    </span>
                </div>
            </div>
        )}

        <div className={`flex flex-col min-h-full bg-slate-50 transition-all duration-300 ${showSourceFilters ? 'md:pr-[320px]' : ''}`}>

            {/* OVERVIEW STATS BOARD - COMPACT */}
            <div className={`px-4 md:px-6 pt-3 pb-2 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 bg-white shadow-sm z-40 relative gap-2 md:gap-0 ${!isDefaultOrSuperAdmin ? 'hidden md:flex' : ''}`}>
                <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
                    <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 shrink-0"><Layers size={14} className="text-primary" /> Question Bank</h2>
                    {getActiveFiltersBreadcrumb().length > 0 && (
                        <div className="hidden sm:flex items-center gap-2 text-xs font-extrabold text-slate-500 overflow-x-auto text-ellipsis whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner custom-scrollbar">
                            {getActiveFiltersBreadcrumb().map((crumb, idx, arr) => (
                                <React.Fragment key={idx}>
                                    <span className={idx === arr.length - 1 ? "text-primary tracking-wide" : "tracking-wide"}>{crumb}</span>
                                    {idx < arr.length - 1 && <span className="text-slate-400 mx-0.5">/</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-4 shrink-0 mt-2 md:mt-0 justify-end w-full md:w-auto">
                    {overviewStats && isDefaultOrSuperAdmin && (
                        <>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total</span>
                                <span className="text-sm font-black text-slate-800 leading-none">{overviewStats.totalQuestions}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none mb-1">Approved</span>
                                <span className="text-sm font-black text-emerald-700 leading-none">{overviewStats.totalApproved}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-none mb-1">Pending</span>
                                <span className="text-sm font-black text-amber-700 leading-none">{overviewStats.totalPending}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
                            <div className="flex-col items-end hidden sm:flex">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">Subjects</span>
                                <span className="text-sm font-black text-indigo-700 leading-none">{overviewStats.totalSubjects}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200"></div>
                        </>
                    )}
                </div>
            </div>

            {/* STICKY COMPACT FILTER HEADER */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-6 pt-3 pb-3 shadow-sm space-y-3">
                
                {/* Top Row: Navigation Tabs & Search */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg self-start shrink-0 overflow-x-auto custom-scrollbar w-full md:w-auto">
                        <button
                            onClick={() => { setViewMode('ALL'); setFilterStatus('ALL'); setCurrentPage(1); }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'ALL'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                }`}
                        >
                            <Layers size={14} /> All Questions
                        </button>
                        <button
                            onClick={() => { setViewMode('FAVORITES'); setCurrentPage(1); }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'FAVORITES'
                                ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                }`}
                        >
                            <svg className="fill-current w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            My Saved
                        </button>
                        {isDefaultOrSuperAdmin && (
                            <button
                                onClick={() => { setViewMode('REVISED'); setFilterStatus('REVISED'); setCurrentPage(1); }}
                                className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'REVISED'
                                    ? 'bg-rose-100 text-rose-700 shadow-sm border border-rose-200'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                    }`}
                            >
                                <Edit size={13} /> Revised
                            </button>
                        )}
                    </div>

                    <div className="flex flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-[260px] lg:w-[300px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search explicitly by question text..."
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                            {hasFullLangAccess && (
                                <button
                                    onClick={() => setSplitScreenMode(!splitScreenMode)}
                                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-all border shrink-0 ${splitScreenMode ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                    title="Toggle Split-Screen Review Mode"
                                >
                                    <GitCompare size={14} /> Review Mode
                                </button>
                            )}

                            <button
                                onClick={() => setShowSourceFilters(!showSourceFilters)}
                                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-all border shrink-0 ${showSourceFilters ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                title="Toggle Filters & Tags Sidebar"
                            >
                                <Filter size={14} />
                                <span className="hidden sm:inline">Filters & Tags</span>
                                <span className="sm:hidden">Filters</span>
                            </button>

                            {!portalTarget && renderQuestionCart()}
                        </div>
                    </div>
                </div>

                {/* Backdrop for Filters & Tags Drawer */}
                {showSourceFilters && (
                    <div 
                        onClick={() => setShowSourceFilters(false)}
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 lg:hidden"
                    />
                )}

                {/* Right Side Drawer for Source Metadata Filters */}
                <div 
                    className={`fixed right-0 bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 top-0 h-screen w-[290px] sm:w-[320px] z-50 shadow-2xl lg:top-[56px] lg:md:top-[60px] lg:h-[calc(100vh-56px)] lg:md:h-[calc(100vh-60px)] lg:w-[320px] lg:z-20 lg:shadow-none ${showSourceFilters ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="flex flex-col border-b border-slate-200 bg-slate-50 shrink-0 pt-3 lg:pt-0">
                        <div className="p-4 pb-2 flex items-center justify-between">
                            <h3 className="text-[12px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <Filter size={14} className="text-primary"/> Filters & Tags
                            </h3>
                            <button onClick={() => setShowSourceFilters(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors lg:hidden">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="flex w-full mt-2 px-2">
                            <button 
                                onClick={() => setActiveSidebarTab('academic')}
                                className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-all ${activeSidebarTab === 'academic' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Academic Filters
                            </button>
                            <button 
                                onClick={() => setActiveSidebarTab('source')}
                                className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-all ${activeSidebarTab === 'source' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Board & Year
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                        
                        {activeSidebarTab === 'academic' && (
                            <div className="flex flex-col gap-4">
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={14} />
                                    <input
                                        type="text"
                                        value={metadataSearchTerm}
                                        onChange={(e) => {
                                            setMetadataSearchTerm(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => { 
                                            if (!metadataSearchTerm) setMetadataSearchTerm(' ');
                                            setShowSuggestions(true);
                                        }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        placeholder="Auto-select Subject/Topic..."
                                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-400 shadow-sm"
                                    />
                                    {showSuggestions && metadataSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[300px] overflow-y-auto custom-scrollbar z-50">
                                            {metadataSuggestions.map((s, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleSelectSuggestion(s)}
                                                    className="px-3 py-2 border-b border-slate-50 last:border-0 hover:bg-indigo-50 cursor-pointer flex flex-col gap-0.5 transition-colors"
                                                >
                                                    <span className="text-xs font-bold text-slate-700">{s.name}</span>
                                                    <span className="text-[9px] font-black text-primary/70 uppercase tracking-wider">{s.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {showLanguageFilter && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Language</label>
                                        <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} disabled={!showLanguageFilter} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer disabled:opacity-50">
                                            {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.length > 1 || uniqueInstituteMediums.includes('Bilingual')) && <option value="ALL">সব ভার্সন</option>}
                                            {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('Bangla') || uniqueInstituteMediums.includes('Bilingual')) && <option value="Bangla">Bangla</option>}
                                            {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('English') || uniqueInstituteMediums.includes('Bilingual')) && <option value="English">English</option>}
                                            {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('Bilingual')) && <option value="Bilingual">Bilingual</option>}
                                        </select>
                                    </div>
                                )}

                                {levels.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Level</label>
                                        <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                                            <option value="">সব স্তর</option>
                                            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {streams.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Stream</label>
                                        <select value={selectedStreamId} onChange={(e) => setSelectedStreamId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                                            <option value="">সব বিভাগ</option>
                                            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {classes.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Class</label>
                                        <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                                            <option value="">সব শ্রেণি</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {filteredSubjects.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Subject</label>
                                        <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                                            <option value="">সব বিষয়</option>
                                            {filteredSubjects.map(s => {
                                                const isEng = s.isEnglishVersion || s.englishVersion || false;
                                                return (
                                                    <option key={s.classSubjectId} value={s.classSubjectId}>
                                                        {s.subjectName} {isEng ? '[EN]' : '[BN]'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}

                                {chapters.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Chapter</label>
                                        <select value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                                            <option value="">সব অধ্যায়</option>
                                            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {topics.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">Topic</label>
                                        <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer">
                                            <option value="">সব টপিক</option>
                                            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeSidebarTab === 'source' && (
                            <div className="flex flex-col gap-6">
                                {/* Selected Tags Bucket */}
                                {(selectedBoards.length > 0 || selectedYears.length > 0 || selectedSchools.length > 0) && (
                                    <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                        <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                                            <Filter size={12} /> Active Filters Bucket
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedBoards.map(b => (
                                                <span key={b} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md shadow-sm">
                                                    {b} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setSelectedBoards(prev => prev.filter(x => x !== b))} />
                                                </span>
                                            ))}
                                            {selectedYears.map(y => (
                                                <span key={y} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md shadow-sm">
                                                    {y} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setSelectedYears(prev => prev.filter(x => x !== y))} />
                                                </span>
                                            ))}
                                            {selectedSchools.map(s => (
                                                <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-indigo-200 text-[10px] font-bold text-indigo-700 rounded-md shadow-sm">
                                                    {s} <X size={12} className="cursor-pointer hover:text-rose-500" onClick={() => setSelectedSchools(prev => prev.filter(x => x !== s))} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Board / University List */}
                                {sourceTags.boards && sourceTags.boards.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">Board / University</label>
                                        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {sourceTags.boards.map(tag => (
                                                <label key={tag.name} className="flex items-center justify-between group cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedBoards.includes(tag.name)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedBoards(prev => [...prev, tag.name]);
                                                                else setSelectedBoards(prev => prev.filter(b => b !== tag.name));
                                                            }}
                                                            className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20" 
                                                        />
                                                        <span className="text-[11px] font-bold text-slate-700">{tag.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">({tag.count})</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Year List */}
                                {sourceTags.years && sourceTags.years.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">Year</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {sourceTags.years.map(tag => (
                                                <label key={tag.name} className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${selectedYears.includes(tag.name) ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'}`}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedYears.includes(tag.name)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedYears(prev => [...prev, tag.name]);
                                                            else setSelectedYears(prev => prev.filter(y => y !== tag.name));
                                                        }}
                                                        className="hidden" 
                                                    />
                                                    <span className="text-xs font-black">{tag.name}</span>
                                                    <span className="text-[9px] font-bold opacity-70">({tag.count})</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* School / College List */}
                                {sourceTags.schools && sourceTags.schools.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 border-b border-slate-100 pb-1">School / College</label>
                                        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {sourceTags.schools.map(tag => (
                                                <label key={tag.name} className="flex items-center justify-between group cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedSchools.includes(tag.name)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setSelectedSchools(prev => [...prev, tag.name]);
                                                                else setSelectedSchools(prev => prev.filter(s => s !== tag.name));
                                                            }}
                                                            className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary/20" 
                                                        />
                                                        <span className="text-[11px] font-bold text-slate-700 truncate max-w-[180px]" title={tag.name}>{tag.name}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">({tag.count})</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {(!sourceTags.boards?.length && !sourceTags.years?.length && !sourceTags.schools?.length) && (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-50 text-center gap-2">
                                        <Search size={24} className="text-slate-400" />
                                        <p className="text-xs font-bold text-slate-500">No source tags found for the current subject.</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                    
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <button onClick={resetFilters} className="px-4 py-2 bg-white text-slate-600 hover:text-rose-600 font-bold rounded-lg border border-slate-200 hover:border-rose-200 transition-colors flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide">
                            <X size={14} /> Clear
                        </button>
                        <button onClick={() => fetchQuestions()} className="px-6 py-2 bg-primary text-white font-bold rounded-lg border border-transparent hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 text-xs uppercase tracking-wide shadow-sm">
                            <CheckCircle size={14} /> Apply Filters
                        </button>
                    </div>
                </div>

                {/* Third Row: Formats, Check All & Bulk Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
                        {typeTabs.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setFilterType(type.id)}
                                className={`px-4 py-1.5 text-[11.5px] font-black rounded-xl transition-all duration-300 whitespace-nowrap border active:scale-[0.97] ${filterType === type.id
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white border-transparent shadow-[0_4px_12px_rgba(233,30,140,0.25)] hover:shadow-[0_6px_16px_rgba(233,30,140,0.35)] scale-105'
                                    : 'bg-gradient-to-b from-white to-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-800 hover:shadow-sm'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                        {isSuperAdmin && (!overviewStats || overviewStats.unansweredCount > 0 || filterUnanswered) && (
                            <button
                                onClick={() => {
                                    setFilterUnanswered(prev => !prev);
                                    setCurrentPage(1);
                                }}
                                className={`ml-3 px-3 py-1 text-[11px] font-black rounded-full transition-all whitespace-nowrap border flex items-center gap-1 ${
                                    filterUnanswered
                                        ? 'bg-rose-500 text-white border-rose-500 shadow-sm hover:bg-rose-600 shadow-rose-100'
                                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:text-rose-700'
                                }`}
                                title="যেসকল প্রশ্নের সঠিক উত্তর বা অপশন সেট করা নেই"
                            >
                                <XCircle size={12} className={filterUnanswered ? 'animate-pulse' : ''} />
                                উত্তরবিহীন প্রশ্ন
                            </button>
                        )}
                    </div>

                    {isDefaultOrSuperAdmin && (
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto justify-end shrink-0">


                            {totalElements > questions.length && (
                                <button
                                    onClick={handleSelectAllGlobal}
                                    disabled={isSelectingAll}
                                    className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition-colors shrink-0 disabled:opacity-50"
                                >
                                    <CheckCircle size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap select-none">
                                        {isSelectingAll ? 'Selecting...' : `Select All ${totalElements}`}
                                    </span>
                                </button>
                            )}

                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {(() => {
                                        const selectedQs = questions.filter(q => selectedIds.includes(q.id));
                                        const counts = { MCQ: 0, CQ: 0, SHORT: 0, OTHER: 0 };
                                        selectedQs.forEach(q => {
                                            if (q.type === 'MCQ') counts.MCQ++;
                                            else if (q.type === 'CQ' || q.type === 'CREATIVE') counts.CQ++;
                                            else if (q.type === 'SHORT' || q.type === 'SHORT_ANSWER') counts.SHORT++;
                                            else counts.OTHER++;
                                        });
                                        const unseenCount = selectedIds.length - selectedQs.length;
                                        
                                        const textParts = [];
                                        if (counts.MCQ > 0) textParts.push(`${counts.MCQ} MCQ`);
                                        if (counts.CQ > 0) textParts.push(`${counts.CQ} CQ`);
                                        if (counts.SHORT > 0) textParts.push(`${counts.SHORT} Short`);
                                        if (counts.OTHER > 0) textParts.push(`${counts.OTHER} Other`);
                                        if (unseenCount > 0) textParts.push(`+${unseenCount} off-page`);
                                        
                                        return (
                                            <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center shrink-0">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                    Selected: <span className="text-slate-800">{textParts.length > 0 ? textParts.join(', ') : selectedIds.length}</span>
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    <button 
                                        onClick={handleCreateExamFromSelection}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 font-bold rounded-lg border border-violet-200 hover:bg-violet-100 transition-all text-[11px] uppercase tracking-wide shadow-sm"
                                        title="Create Exam with Selected Questions"
                                    >
                                        <FileText size={12} /> Create Exam
                                    </button>
                                    {isSuperAdmin && (
                                        <>
                                            <button onClick={() => handleUpdateStatusBulk('APPROVED')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all text-[11px] uppercase tracking-wide">
                                                <ThumbsUp size={12} /> Approve
                                            </button>
                                            <button onClick={() => handleUpdateStatusBulk('REJECTED')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-all text-[11px] uppercase tracking-wide">
                                                <ThumbsDown size={12} /> Reject
                                            </button>
                                            <div className="relative group">
                                                <button className="flex items-center gap-1.5 px-2 py-1.5 bg-white text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-[11px] uppercase tracking-wide shadow-sm">
                                                    <ChevronDown size={12} className="text-slate-500" />
                                                </button>
                                                <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden py-1">
                                                    <button onClick={() => handleUpdateStatusBulk('PENDING')} className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-amber-600 hover:bg-amber-50 font-bold flex items-center gap-2 transition-colors">
                                                        <Clock size={12} /> Pending
                                                    </button>
                                                    <button onClick={() => handleUpdateStatusBulk('DRAFT')} className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-600 hover:bg-slate-50 font-bold flex items-center gap-2 transition-colors">
                                                        <Edit size={12} /> Draft
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {hasPerm('DELETE') && (
                                        <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all text-[11px] uppercase tracking-wide ml-1">
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className={`flex gap-4 px-4 md:px-6 py-4 ${splitScreenMode ? 'flex-col md:flex-row h-[65vh] overflow-hidden' : 'flex-col'}`}>
                {/* List Side */}
                <div id="question-list-scroll-container" className={`${splitScreenMode ? 'w-full md:w-1/2 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex flex-col gap-4' : 'w-full flex flex-col gap-4'}`}>
                    {loading && currentPage === 1 ? (
                        <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-8 h-8 border-4 border-indigo-100 border-t-primary rounded-full animate-spin"></div>
                                <span className="text-slate-500 text-sm font-bold tracking-wide">Loading Questions...</span>
                            </div>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-dashed border-slate-300 mt-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Layers size={40} className="text-slate-300" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-slate-700 tracking-tight">No elements discovered</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-sm font-medium">We couldn't find any questions matching your active filters or search terms.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 pb-2 relative" style={{ overflowAnchor: 'none' }}>
                            {/* Foolproof Observer Target: 2500px tall invisible div at the bottom.
                                2500px height ensures it triggers 2-3 screens early to beat network latency!
                                overflowAnchor: 'none' on parent ensures the browser NEVER jumps scroll position. */}
                            <div 
                                ref={observerTarget} 
                                style={{ position: 'absolute', bottom: 0, height: '2500px', width: '100%', pointerEvents: 'none', zIndex: -1 }} 
                            />
                            
                            {questions.map((q, index) => (
                                <QuestionListItem 
                                    key={q.id}
                                    q={q}
                                    index={index + 1}
                                    isSelected={selectedIds.includes(q.id)}
                                    onSelect={handleSelectItem}
                                    onSave={handleSaveToggle}
                                    isSaved={savedIds.includes(q.id)}
                                    onView={handleViewQuestion}
                                    onDelete={handleDelete}
                                    onRevise={setReviseItem}
                                    onReview={setReviewItem}
                                    isSuperAdmin={isSuperAdmin}
                                    hasPerm={hasPerm}
                                    splitScreenMode={splitScreenMode}
                                    isViewing={selectedQuestion?.id === q.id}
                                    isDefaultOrSuperAdmin={isDefaultOrSuperAdmin}
                                />
                            ))}
                            
                            {currentPage < totalPages && (
                                <div className="py-8 flex flex-col items-center justify-center relative z-10">
                                    {loadingMore ? (
                                        <div className="flex flex-col items-center gap-2 opacity-70">
                                            <div className="w-5 h-5 border-2 border-indigo-200 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Loading Questions...</span>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-full transition-all border border-slate-200 hover:border-slate-300 flex items-center shadow-sm"
                                        >
                                            Load More Questions
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Split Screen Preview Side */}
                {splitScreenMode && hasFullLangAccess && (
                    <div className="w-full md:w-1/2 hidden md:flex flex-col bg-slate-50 border border-slate-200 rounded-2xl shadow-inner overflow-hidden h-full relative" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        {selectedQuestion ? (
                            <>
                                <div className="bg-slate-50/90 backdrop-blur-sm m-2 rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col flex-1 relative">
                                    <QuestionEdit 
                                        inlineId={selectedQuestion.id} 
                                        key={selectedQuestion.id} 
                                        onSaveComplete={() => {
                                            fetchQuestions();
                                            // auto-select next question
                                            const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                            if (currentIndex >= 0 && currentIndex < questions.length - 1) {
                                                handleViewQuestion(questions[currentIndex + 1]);
                                            }
                                        }} 
                                    />
                                </div>
                                <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                                if (currentIndex > 0) handleViewQuestion(questions[currentIndex - 1]);
                                            }}
                                            className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-black tracking-wide hover:bg-slate-200 hover:text-slate-800 transition-colors shadow-sm uppercase"
                                        >
                                            Prev
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                                if (currentIndex < questions.length - 1) handleViewQuestion(questions[currentIndex + 1]);
                                            }}
                                            className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-black tracking-wide hover:bg-slate-200 hover:text-slate-800 transition-colors shadow-sm uppercase"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isSuperAdmin && (
                                            <button 
                                                onClick={async () => {
                                                    const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                                    await handleDelete(selectedQuestion.id);
                                                    if (currentIndex >= 0 && currentIndex < questions.length - 1) {
                                                        handleViewQuestion(questions[currentIndex + 1]);
                                                    } else {
                                                        setSelectedQuestion(null);
                                                    }
                                                }}
                                                className="flex items-center justify-center w-9 h-9 bg-white border-2 border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleQuickAction(selectedQuestion.id, 'REJECTED')}
                                            className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-black transition-colors uppercase tracking-wider"
                                        >
                                            <ThumbsDown size={14} strokeWidth={3} /> Reject
                                        </button>
                                        <button 
                                            onClick={() => handleQuickAction(selectedQuestion.id, 'APPROVED')}
                                            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 rounded-lg text-xs font-black transition-all shadow-sm uppercase tracking-wider transform hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <ThumbsUp size={14} strokeWidth={3} /> Approve
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center m-4 bg-white/50 backdrop-blur-sm rounded-xl border border-dashed border-slate-300">
                                <GitCompare size={48} className="mb-4 text-slate-400" />
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Review Mode Active</h3>
                                <p className="text-sm">Click "View" on any question from the list to preview and edit it here side-by-side.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {totalElements > 0 && (
                <div className="mt-4 text-center pb-8">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {questions.length} of {totalElements} questions
                    </span>
                </div>
            )}

            {selectedQuestion && !splitScreenMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Question Preview</h2>
                            <button onClick={() => setSelectedQuestion(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold tracking-widest uppercase">{selectedQuestion.type}</span>
                                <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase ${selectedQuestion.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700' :
                                    selectedQuestion.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                                        'bg-rose-50 text-rose-700'
                                    }`}>{selectedQuestion.difficulty}</span>
                                {getStatusBadge(selectedQuestion.status)}
                            </div>

                            <div className="space-y-6">
                                {selectedQuestion.classSubject && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Subject Context</h3>
                                        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                                            <p className="text-slate-800 font-semibold">{selectedQuestion.classSubject.academicClass?.name} • {selectedQuestion.classSubject.subject?.name}</p>
                                            {(selectedQuestion.chapter || selectedQuestion.topic) && (
                                                <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2">
                                                    {selectedQuestion.chapter?.name}
                                                    {selectedQuestion.topic && <span className="text-slate-300">/</span>}
                                                    {selectedQuestion.topic?.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!selectedQuestion.classSubject && selectedQuestion.sourceReference && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Source / Context</h3>
                                        <div className="p-4 bg-violet-50/80 rounded-xl border border-violet-100 flex items-center gap-3">
                                            <p className="text-slate-800 font-semibold flex-1">{selectedQuestion.sourceReference}</p>
                                            {selectedQuestion.aiGenerated && <span className="text-[10px] bg-violet-100 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">AI Imported</span>}
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    if (!selectedQuestion.stimulus) return null;
                                    const cleanStimulus = selectedQuestion.stimulus.replace(/<[^>]*>/g, '').trim().toLowerCase();
                                    const isPlaceholder = 
                                        cleanStimulus === '' || 
                                        cleanStimulus === 'generated question' || 
                                        cleanStimulus === 'dynamic question' || 
                                        cleanStimulus === 'ডায়নামিক প্রশ্ন' ||
                                        cleanStimulus === 'ডায়নামিক প্রশ্ন';
                                    if (isPlaceholder) return null;
                                    return (
                                        <div>
                                            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Stimulus (উদ্দীপক)</h3>
                                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-slate-800 font-medium leading-relaxed">
                                                <MarkdownRenderer content={selectedQuestion.stimulus} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Question</h3>
                                    <div className="text-lg font-medium text-slate-900 leading-relaxed">
                                        {selectedQuestion.type === 'CQ' ? (
                                            <CQCombinedRenderer q={selectedQuestion} showAnswer={true} showExplanation={true} />
                                        ) : (
                                            <MarkdownRenderer content={selectedQuestion.questionText} />
                                        )}
                                    </div>
                                    {selectedQuestion.mcqType === 'MULTIPLE_COMPLETION' && selectedQuestion.statements && selectedQuestion.statements.length > 0 && (
                                        <div className="mt-3 pl-4 border-l-2 border-indigo-200 space-y-2">
                                            {selectedQuestion.statements.map((stmt, sIdx) => (
                                                <div key={sIdx} className="text-sm text-slate-700 font-medium leading-relaxed">
                                                    <MarkdownRenderer content={stmt} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedQuestion.type === 'MCQ' && selectedQuestion.options && selectedQuestion.options.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Answers / Options</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedQuestion.options.map(opt => (
                                                <div key={opt.id} className={`p-3 rounded-xl border-2 flex items-center gap-3 ${opt.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                                                    <span className={`flex shadow-sm items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{opt.optionLabel}</span>
                                                    <span className={`text-sm flex-1 ${opt.isCorrect ? 'text-emerald-900 font-bold' : 'text-slate-700 font-medium'}`}>
                                                        <MarkdownRenderer content={opt.optionText} />
                                                    </span>
                                                    {opt.isCorrect && <CheckCircle size={18} className="text-emerald-500 ml-auto" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedQuestion.correctAnswer && selectedQuestion.type !== 'MCQ' && selectedQuestion.type !== 'CQ' && (
                                    <div>
                                        <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2"><CheckCircle size={16} /> Correct Answer</h3>
                                        <div className="p-4 bg-emerald-50 text-emerald-900 font-medium leading-relaxed rounded-xl border border-emerald-200">
                                            <MarkdownRenderer content={selectedQuestion.correctAnswer} />
                                        </div>
                                    </div>
                                )}

                                {selectedQuestion.explanation && selectedQuestion.type !== 'CQ' && (
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Explanation (ব্যাখ্যা)</h3>
                                        <div className="p-4 bg-blue-50 text-blue-900 font-medium leading-relaxed rounded-xl border border-blue-200">
                                            <MarkdownRenderer content={selectedQuestion.explanation} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ── Revise Panel (right slide-in drawer) ── */}
        <RevisePanel
            question={reviseItem}
            isOpen={!!reviseItem}
            onClose={() => setReviseItem(null)}
            onSuccess={() => {
                setReviseItem(null);
                try { setRevisedIds(JSON.parse(localStorage.getItem('revisedQuestionIds') || '[]')); } catch {}
                fetchQuestions();
            }}
        />

        {/* ── Revision Review Panel (Super Admin diff + approve/reject) ── */}
        <RevisionReviewPanel
            revision={reviewItem}
            isOpen={!!reviewItem}
            onClose={() => setReviewItem(null)}
            onActionComplete={() => {
                setReviewItem(null);
                fetchQuestions();
            }}
        />
        </>
    );
};

export default QuestionList;
