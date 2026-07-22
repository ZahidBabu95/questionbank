import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Edit, Trash2, CheckCircle, XCircle, Clock, Search, Layers, ListFilter, X, ThumbsUp, ThumbsDown, ChevronDown, Filter, FileText, Settings2, Bookmark, BookmarkCheck, GitCompare, Loader2, MoreHorizontal, ShoppingCart, ArrowLeft } from 'lucide-react';
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
import useDebounce from '../../../hooks/useDebounce';
import SubjectSelectorModal from './components/SubjectSelectorModal';
import QuestionPreviewModal from './components/QuestionPreviewModal';
import QuestionFilterPanel from './components/QuestionFilterPanel';
import SourceDocumentViewer from './components/SourceDocumentViewer';


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

    const isEmbedded = useMemo(() => {
        return window.location.search.includes('embedded=true') || sessionStorage.getItem('embedded') === 'true';
    }, []);

    const handleExitMobileView = () => {
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'close_webview'
            }));
        } else {
            navigate(-1);
        }
    };

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
    const pendingSelectionRef = useRef(null);
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
    const [showAllOverride, setShowAllOverride] = useState(false);
    const [savedIds, setSavedIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('savedQuestionIds') || '[]'); } catch { return []; }
    });

    const [selectedQuestionMap, setSelectedQuestionMap] = useState({});

    const [rightPanelTab, setRightPanelTab] = useState('EDIT'); // 'EDIT' or 'SOURCE'
    const [sourceContext, setSourceContext] = useState(null);
    const [loadingSource, setLoadingSource] = useState(false);

    const [loadingNextPage, setLoadingNextPage] = useState(false);

    const [colWidths, setColWidths] = useState({ col1: 34, col2: 33, col3: 33 });
    const [sourceViewerHeight, setSourceViewerHeight] = useState(260);
    const [navDrawerHeight, setNavDrawerHeight] = useState(120);
    const containerRef = useRef(null);

    const handleColResizeStart = (e, dividerIndex) => {
        e.preventDefault();
        const startX = e.clientX;
        const containerWidth = containerRef.current?.getBoundingClientRect().width || 1000;
        const startWidths = { ...colWidths };

        const handleMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaPct = (deltaX / containerWidth) * 100;

            setColWidths(prev => {
                let newWidths = { ...prev };
                if (dividerIndex === 1) {
                    const nextCol1 = Math.max(20, Math.min(60, startWidths.col1 + deltaPct));
                    const diff = nextCol1 - startWidths.col1;
                    const nextCol2 = Math.max(20, startWidths.col2 - diff);
                    newWidths.col1 = nextCol1;
                    newWidths.col2 = prev.col1 + prev.col2 + prev.col3 - nextCol1 - prev.col3;
                } else if (dividerIndex === 2) {
                    const nextCol2 = Math.max(20, Math.min(60, startWidths.col2 + deltaPct));
                    const diff = nextCol2 - startWidths.col2;
                    const nextCol3 = Math.max(20, startWidths.col3 - diff);
                    newWidths.col2 = nextCol2;
                    newWidths.col3 = prev.col1 + prev.col2 + prev.col3 - prev.col1 - newWidths.col2;
                }

                const sum = newWidths.col1 + newWidths.col2 + newWidths.col3;
                newWidths.col1 = (newWidths.col1 / sum) * 100;
                newWidths.col2 = (newWidths.col2 / sum) * 100;
                newWidths.col3 = (newWidths.col3 / sum) * 100;

                return newWidths;
            });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleSourceHeightResizeStart = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = sourceViewerHeight;

        const handleMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            setSourceViewerHeight(Math.max(120, Math.min(600, startHeight + deltaY)));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleNavDrawerHeightResizeStart = (e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = navDrawerHeight;

        const handleMouseMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            setNavDrawerHeight(Math.max(80, Math.min(300, startHeight - deltaY)));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
        if (!selectedQuestion?.id) {
            setSourceContext(null);
            return;
        }
        let active = true;
        const loadSource = async () => {
            setLoadingSource(true);
            try {
                const data = await questionService.getQuestionSourceContext(selectedQuestion.id);
                if (active) {
                    setSourceContext(data);
                }
            } catch (err) {
                console.error("Failed to load source context:", err);
                if (active) setSourceContext(null);
            } finally {
                if (active) setLoadingSource(false);
            }
        };
        loadSource();
        return () => {
            active = false;
        };
    }, [selectedQuestion?.id]);
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
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState(''); // classSubjectId
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [hasSelectedOnce, setHasSelectedOnce] = useState(!!selectedSubjectId || !!showAllOverride || viewMode === 'FAVORITES' || viewMode === 'REVISED');
    const [isScrolled, setIsScrolled] = useState(false);
    
    // Source Tag filters
    const [selectedBoards, setSelectedBoards] = useState([]);
    const [selectedYears, setSelectedYears] = useState([]);
    const [selectedSchools, setSelectedSchools] = useState([]);
    const [sourceTags, setSourceTags] = useState({ boards: [], years: [], schools: [] });

    // Fetch chapter and topic counts dynamically for the active subject
    const [availability, setAvailability] = useState({ chapters: {}, topics: {} });

    const activeSubjectName = useMemo(() => {
        if (selectedSubjectId) {
            const sub = subjects?.find(x => x && (String(x.classSubjectId) === String(selectedSubjectId) || String(x.id) === String(selectedSubjectId)));
            if (sub) return sub.subjectName || sub.name;
            if (fullHierarchy?.classSubjects) {
                const cs = fullHierarchy.classSubjects.find(x => String(x.id) === String(selectedSubjectId));
                if (cs) return cs.name || cs.subjectName;
            }
        }
        if (showAllOverride) return 'সব বিষয় (অফলাইন)';
        return '';
    }, [selectedSubjectId, subjects, fullHierarchy, showAllOverride]);

    const activeClassName = useMemo(() => {
        if (selectedClassId) {
            const cls = classes?.find(c => c && String(c.id) === String(selectedClassId));
            if (cls) return cls.name;
        }
        if (selectedSubjectId && fullHierarchy?.classSubjects) {
            const cs = fullHierarchy.classSubjects.find(x => String(x.id) === String(selectedSubjectId));
            if (cs) {
                const cls = fullHierarchy.classes?.find(c => String(c.id) === String(cs._classId || cs.classId));
                if (cls) return cls.name;
            }
        }
        return '';
    }, [selectedClassId, classes, selectedSubjectId, fullHierarchy]);

    useEffect(() => {
        if (isDefaultOrSuperAdmin) {
            const titleText = activeSubjectName 
                ? `${activeSubjectName}${activeClassName ? ` (${activeClassName})` : ''}` 
                : 'Question Bank';
            const subtitleText = activeSubjectName
                ? `Exploring questions for ${activeSubjectName}`
                : 'Manage and explore questions in the repository';
            
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: titleText,
                    subtitle: subtitleText,
                    hideLayoutBars: splitScreenMode
                }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
        }
        return () => {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
        };
    }, [isDefaultOrSuperAdmin, activeSubjectName, activeClassName, splitScreenMode]);

    useEffect(() => {
        if (splitScreenMode && questions.length > 0 && !selectedQuestion) {
            handleViewQuestion(questions[0]);
        }
    }, [splitScreenMode, questions, selectedQuestion]);

    useEffect(() => {
        if (splitScreenMode && loadingNextPage && questions.length > 0) {
            const prevIndex = questions.findIndex(q => q.id === selectedQuestion?.id);
            if (prevIndex >= 0 && prevIndex < questions.length - 1) {
                handleViewQuestion(questions[prevIndex + 1]);
                setLoadingNextPage(false);
            }
        }
    }, [questions, splitScreenMode, loadingNextPage, selectedQuestion]);
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
        if (reviewItem || searchParams.get('view')) return;
        try {
            const params = getFullParams();
            const data = await questionService.getOverviewStats(params);
            setOverviewStats(data);
        } catch (error) {
            console.error("Failed to fetch overview stats", error);
        }
    };

    const fetchSourceTags = async () => {
        if (reviewItem || searchParams.get('view')) return;
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

    useEffect(() => {
        if (reviewItem || searchParams.get('view')) return;
        if (selectedSubjectId) {
            questionService.getQuestionAvailability(selectedSubjectId, filterLanguage)
                .then(data => {
                    setAvailability(data || { chapters: {}, topics: {} });
                })
                .catch(err => {
                    console.error("Failed to load availability", err);
                    setAvailability({ chapters: {}, topics: {} });
                });
        } else {
            setAvailability({ chapters: {}, topics: {} });
        }
    }, [selectedSubjectId, filterLanguage, reviewItem]);

    const getChapterQuestionCount = React.useCallback((chapId) => {
        if (!availability?.chapters || !availability.chapters[chapId]) return 0;
        let total = 0;
        const types = availability.chapters[chapId];
        Object.values(types).forEach(diffs => {
            Object.values(diffs).forEach(count => {
                total += count;
            });
        });
        return total;
    }, [availability]);

    const getTopicQuestionCount = React.useCallback((topId) => {
        if (!availability?.topics || !availability.topics[topId]) return 0;
        let total = 0;
        const types = availability.topics[topId];
        Object.values(types).forEach(diffs => {
            Object.values(diffs).forEach(count => {
                total += count;
            });
        });
        return total;
    }, [availability]);

    const visibleTopics = React.useMemo(() => {
        return topics.filter(t => getTopicQuestionCount(t.id) > 0);
    }, [topics, getTopicQuestionCount]);


    useEffect(() => {
        if (selectedSubjectId || showAllOverride || viewMode === 'FAVORITES' || viewMode === 'REVISED') {
            setHasSelectedOnce(true);
        }
    }, [selectedSubjectId, showAllOverride, viewMode]);

    useEffect(() => {
        const handleScroll = (e) => {
            const scrollTop = e.target.scrollTop || 
                              (e.target.documentElement && e.target.documentElement.scrollTop) || 
                              window.scrollY || 
                              0;
            if (scrollTop > 30) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
        return () => document.removeEventListener('scroll', handleScroll, { capture: true });
    }, []);

    // Run fetchInitialFilters once on mount
    useEffect(() => {
        fetchInitialFilters();
    }, []);

    // Automatically trigger full-screen mode in embedded mobile WebView
    useEffect(() => {
        if (isEmbedded && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'hide_layout_bars',
                hide: true
            }));
        }
        return () => {
            if (isEmbedded && window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'hide_layout_bars',
                    hide: false
                }));
            }
        };
    }, [isEmbedded]);

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

        pendingSelectionRef.current = { chapterId, topicId };

        if (levelId) setSelectedLevelId(levelId);
        if (streamId) setSelectedStreamId(streamId);
        if (classId) setSelectedClassId(classId);
        if (subjectId) setSelectedSubjectId(subjectId);

        setMetadataSearchTerm('');
        setMetadataSuggestions([]);
    };

    // Level → Streams
    useEffect(() => {
        if (selectedLevelId) {
            if (fullHierarchy && Array.isArray(fullHierarchy.streams)) {
                const filteredStreams = fullHierarchy.streams.filter(s => String(s._levelId) === String(selectedLevelId));
                setStreams(filteredStreams);
                if (filteredStreams.length === 1) {
                    setSelectedStreamId(filteredStreams[0].id);
                } else if (selectedStreamId && !filteredStreams.find(s => String(s.id) === String(selectedStreamId))) {
                    setSelectedStreamId('');
                }
            } else {
                academicService.getStreamsByLevel(selectedLevelId).then(data => {
                    const safeData = Array.isArray(data) ? data : [];
                    setStreams(safeData);
                    if (safeData.length === 1) {
                        setSelectedStreamId(safeData[0].id);
                    } else if (selectedStreamId && !safeData.find(s => s.id === selectedStreamId)) {
                        setSelectedStreamId('');
                    }
                }).catch(error => {
                    console.error(error);
                    setStreams([]);
                });
            }
        } else {
            setStreams([]);
            setSelectedStreamId('');
        }
    }, [selectedLevelId, fullHierarchy]);

    // Stream → Classes
    useEffect(() => {
        if (selectedStreamId) {
            if (fullHierarchy && Array.isArray(fullHierarchy.classes)) {
                const filteredClasses = fullHierarchy.classes.filter(c => String(c._streamId) === String(selectedStreamId));
                setClasses(filteredClasses);
                if (filteredClasses.length === 1) {
                    setSelectedClassId(filteredClasses[0].id);
                } else if (selectedClassId && !filteredClasses.find(c => String(c.id) === String(selectedClassId))) {
                    setSelectedClassId('');
                }
            } else {
                academicService.getClassesByStream(selectedStreamId).then(data => {
                    const safeData = Array.isArray(data) ? data : [];
                    setClasses(safeData);
                    if (safeData.length === 1) {
                        setSelectedClassId(safeData[0].id);
                    } else if (selectedClassId && !safeData.find(c => c.id === selectedClassId)) {
                        setSelectedClassId('');
                    }
                }).catch(error => {
                    console.error(error);
                    setClasses([]);
                });
            }
        } else {
            setClasses([]);
            setSelectedClassId('');
        }
    }, [selectedStreamId, fullHierarchy]);

    // Class → Subjects
    useEffect(() => {
        if (selectedClassId) {
            if (fullHierarchy && Array.isArray(fullHierarchy.classSubjects)) {
                const filteredCS = fullHierarchy.classSubjects.filter(cs => String(cs._classId) === String(selectedClassId));
                const mappedSubjects = filteredCS.map(cs => {
                    const globalSub = Array.isArray(fullHierarchy.subjects)
                        ? fullHierarchy.subjects.find(s => String(s.id) === String(cs._subjectId))
                        : null;
                    return {
                        classSubjectId: cs.id,
                        subjectId: cs._subjectId,
                        subjectName: cs.name,
                        isEnglishVersion: globalSub ? (globalSub.isEnglishVersion || globalSub.englishVersion) : false,
                        order: cs.order
                    };
                });
                setSubjects(mappedSubjects);
                if (selectedSubjectId && !mappedSubjects.find(s => String(s.classSubjectId) === String(selectedSubjectId))) {
                    setSelectedSubjectId('');
                }
            } else {
                academicService.getSubjectsByClass(selectedClassId).then(data => {
                    const safeData = Array.isArray(data) ? data : [];
                    setSubjects(safeData);
                    if (selectedSubjectId && !safeData.find(s => s.classSubjectId === selectedSubjectId)) {
                        setSelectedSubjectId('');
                    }
                }).catch(error => {
                    console.error(error);
                    setSubjects([]);
                });
            }
        } else {
            setSubjects([]);
            setSelectedSubjectId('');
        }
    }, [selectedClassId, fullHierarchy]);
    
    // Filter subjects based on language selection
    const filteredSubjects = useMemo(() => {
        const safeSubjects = Array.isArray(subjects) ? subjects : [];
        return safeSubjects.filter(s => {
            const isEng = s.isEnglishVersion || s.englishVersion || false;
            if (filterLanguage === 'English') return isEng === true;
            if (filterLanguage === 'Bangla') return isEng === false;
            return true;
        });
    }, [subjects, filterLanguage]);

    // Reset selected subject/chapter/topic if no longer in filtered subjects list
    useEffect(() => {
        const safeFiltered = Array.isArray(filteredSubjects) ? filteredSubjects : [];
        if (selectedSubjectId && safeFiltered.length > 0) {
            const exists = safeFiltered.some(s => s.classSubjectId === selectedSubjectId);
            if (!exists) {
                setSelectedSubjectId('');
                setSelectedChapterId('');
                setSelectedTopicId('');
            }
        }
    }, [filterLanguage, filteredSubjects, selectedSubjectId]);




    // Subject → Chapters
    useEffect(() => {
        if (selectedSubjectId) {
            academicService.getChaptersByClassSubject(selectedSubjectId).then(data => {
                const safeData = Array.isArray(data) ? data : [];
                setChapters(safeData);
                
                const pendingChapterId = pendingSelectionRef.current?.chapterId;
                if (pendingChapterId && safeData.some(ch => String(ch.id) === String(pendingChapterId))) {
                    setSelectedChapterId(pendingChapterId);
                    if (pendingSelectionRef.current) pendingSelectionRef.current.chapterId = null;
                } else if (safeData.length === 1) {
                    setSelectedChapterId(safeData[0].id);
                } else if (selectedChapterId && !safeData.find(ch => ch.id === selectedChapterId)) {
                    setSelectedChapterId('');
                }
            }).catch(error => {
                console.error(error);
                setChapters([]);
            });
        } else {
            setChapters([]);
            setSelectedChapterId('');
        }
    }, [selectedSubjectId]);

    // Chapter → Topics
    useEffect(() => {
        if (selectedChapterId) {
            academicService.getTopicsByChapter(selectedChapterId).then(data => {
                const safeData = Array.isArray(data) ? data : [];
                setTopics(safeData);
                
                const pendingTopicId = pendingSelectionRef.current?.topicId;
                if (pendingTopicId && safeData.some(t => String(t.id) === String(pendingTopicId))) {
                    setSelectedTopicId(pendingTopicId);
                    pendingSelectionRef.current = null;
                } else if (safeData.length === 1) {
                    setSelectedTopicId(safeData[0].id);
                } else if (selectedTopicId && !safeData.find(t => t.id === selectedTopicId)) {
                    setSelectedTopicId('');
                }
            }).catch(error => {
                console.error(error);
                setTopics([]);
            });
        } else {
            setTopics([]);
            setSelectedTopicId('');
        }
    }, [selectedChapterId]);

    const fetchQuestions = async () => {
        if (reviewItem || searchParams.get('view')) return;
        const isAcademicSelected = !!selectedSubjectId;
        const canFetch = isAcademicSelected || showAllOverride || viewMode === 'FAVORITES' || viewMode === 'REVISED';

        if (!canFetch) {
            setQuestions([]);
            setTotalPages(0);
            setTotalElements(0);
            setLoading(false);
            setLoadingMore(false);
            return;
        }

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

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Refetch whenever filters or pagination change
    useEffect(() => {
        fetchQuestions();
        if (currentPage === 1) fetchOverviewStats();
    }, [viewMode, currentPage, itemsPerPage, filterStatus, filterType, filterLanguage, debouncedSearchQuery, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId, selectedBoards, selectedYears, selectedSchools, filterUnanswered, showAllOverride, reviewItem]);

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
    const [showSourceFilters, setShowSourceFilters] = useState(false);

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

    const renderProfessionalReviewWorkspace = () => {
        if (!selectedQuestion && questions.length > 0) {
            return (
                <div className="fixed inset-0 z-50 bg-slate-100 flex items-center justify-center p-8">
                    <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
                        <span className="text-sm font-bold text-slate-500">রিভিউ মোড লোড হচ্ছে...</span>
                    </div>
                </div>
            );
        }

        const currentIndex = selectedQuestion ? questions.findIndex(q => q.id === selectedQuestion.id) : -1;
        const totalCount = questions.length;

        const handlePrev = () => {
            if (currentIndex > 0) {
                handleViewQuestion(questions[currentIndex - 1]);
            }
        };

        const handleNext = () => {
            if (currentIndex < totalCount - 1) {
                handleViewQuestion(questions[currentIndex + 1]);
            } else if (currentPage < totalPages) {
                setLoadingNextPage(true);
                setCurrentPage(prev => prev + 1);
            }
        };

        return (
            <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden h-screen w-screen font-sans text-slate-900 select-none">
                {/* 1. Header Toolbar */}
                <div className="bg-white border-b border-slate-200/80 px-4 md:px-6 h-16 flex items-center justify-between shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSplitScreenMode(false)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                            title="Exit Review Mode"
                        >
                            <ArrowLeft size={14} className="stroke-[2.5]" />
                            <span>প্রস্থান (Exit)</span>
                        </button>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-slate-800 leading-tight">
                                🔍 প্রফেশনাল রিভিউ মোড
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold tracking-tight">
                                {activeSubjectName || 'সব বিষয়'} {activeClassName ? `(${activeClassName})` : ''}
                            </span>
                        </div>
                    </div>

                    {/* Navigation Counter */}
                    {selectedQuestion && (
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex <= 0}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-[10px] font-black transition-colors"
                            >
                                Prev
                            </button>
                            <span className="text-[11px] font-bold text-slate-600 min-w-[70px] text-center font-mono">
                                প্রশ্ন {currentIndex + 1} / {totalElements}
                            </span>
                            <button
                                onClick={handleNext}
                                disabled={(currentIndex >= totalCount - 1 && currentPage >= totalPages) || loadingMore}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-[10px] font-black transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}

                    {/* Quick Decision Actions */}
                    {selectedQuestion && (
                        <div className="flex items-center gap-2">
                            {isSuperAdmin && (
                                <button
                                    onClick={async () => {
                                        const proceed = window.confirm("Are you sure you want to delete this question?");
                                        if (proceed) {
                                            const nextIdx = currentIndex < totalCount - 1 ? currentIndex + 1 : currentIndex > 0 ? currentIndex - 1 : -1;
                                            await handleDelete(selectedQuestion.id);
                                            if (nextIdx >= 0) {
                                                handleViewQuestion(questions[nextIdx]);
                                            } else {
                                                setSelectedQuestion(null);
                                            }
                                        }
                                    }}
                                    className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-colors shadow-sm"
                                    title="Delete Question"
                                >
                                    <Trash2 size={15} />
                                </button>
                            )}
                            <button
                                onClick={() => handleQuickAction(selectedQuestion.id, 'REJECTED')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-650 hover:bg-rose-55 rounded-xl text-xs font-black transition-colors shadow-sm"
                            >
                                <ThumbsDown size={13} strokeWidth={3} /> Reject
                            </button>
                            <button
                                onClick={() => handleQuickAction(selectedQuestion.id, 'APPROVED')}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 rounded-xl text-xs font-black transition-all shadow-sm transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <ThumbsUp size={13} strokeWidth={3} /> Approve
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Three Columns Layout */}
                <div ref={containerRef} className="flex-1 flex gap-2 p-4 overflow-hidden h-[calc(100vh-64px)] relative z-0">
                    
                    {/* COLUMN 1: Source PDF & OCR Text (Left Column - resizable width) */}
                    <div style={{ width: `${colWidths.col1}%` }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full shrink-0">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                📖 উৎস পেজ ও OCR (Source)
                            </span>
                            {sourceContext?.chunk?.pageNumber && (
                                <span className="text-[10px] font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                    পৃষ্ঠা নম্বর: {sourceContext.chunk.pageNumber}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
                            {loadingSource ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    <span className="text-xs font-bold">লোডিং সোর্স কন্টেন্ট...</span>
                                </div>
                            ) : sourceContext?.chunk ? (
                                <>
                                    {/* Scanned Image background document */}
                                    {sourceContext.chunk.page?.imageUrl ? (
                                        <div style={{ height: `${sourceViewerHeight}px` }} className="border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-inner bg-slate-900">
                                            <SourceDocumentViewer
                                                remoteUrl={(sourceContext.chunk.page.imageUrl.startsWith('http') && sourceContext.chunk.page.imageUrl.includes('r2.dev'))
                                                    ? `/api/v1/public/proxy-image?url=${encodeURIComponent(sourceContext.chunk.page.imageUrl)}`
                                                    : sourceContext.chunk.page.imageUrl}
                                                remoteType="image/jpeg"
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 text-slate-550 text-xs font-bold text-center border border-dashed border-slate-350 rounded-xl shrink-0">
                                            এই চাঙ্কের স্ক্যান করা পৃষ্ঠা চিত্র পাওয়া যায়নি।
                                        </div>
                                    )}

                                    {/* Height Resizer Handle */}
                                    <div 
                                        onMouseDown={handleSourceHeightResizeStart} 
                                        className="h-2 hover:bg-indigo-500/80 bg-slate-100 hover:text-white border-y border-slate-200 cursor-row-resize transition-all shrink-0 w-full flex items-center justify-center text-[10px] text-slate-400 font-bold select-none rounded hover:scale-y-110 active:scale-y-95 shadow-sm"
                                        title="টেনে সোর্স ইমেজের আকার পরিবর্তন করুন"
                                    >
                                        •••
                                    </div>

                                    {/* OCR text segment */}
                                    <div className="flex-1 flex flex-col gap-2 min-h-[120px] overflow-hidden">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">মূল টেক্সট (OCR / Content Chunks)</h5>
                                        <div className="flex-1 p-4 bg-slate-50/60 rounded-xl border border-slate-200 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-slate-700 select-text">
                                            <MarkdownRenderer content={sourceContext.chunk.chunkText} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 font-bold py-20 gap-2">
                                    <span className="text-3xl">📖</span>
                                    <p className="text-xs">এই প্রশ্নের জন্য কোনো এআই বুক চ্যাপ্টার সোর্স চাঙ্ক পাওয়া যায়নি।</p>
                                    <p className="text-[10px] text-slate-400 font-medium max-w-xs mt-1">এটি ম্যানুয়ালি তৈরি করা প্রশ্ন হতে পারে অথবা এতে সোর্স চাঙ্কের লিংক নেই।</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Column 1-2 Horizontal Resizer handle */}
                    <div 
                        onMouseDown={(e) => handleColResizeStart(e, 1)} 
                        className="w-1.5 hover:w-2 hover:bg-indigo-650/80 bg-slate-200/40 cursor-col-resize transition-all self-stretch shrink-0 rounded-full my-1 flex items-center justify-center text-[8px] text-slate-450 font-bold select-none group"
                        title="টেনে বাম পাশের কলামের সাইজ পরিবর্তন করুন"
                    >
                        <span className="opacity-0 group-hover:opacity-100 text-white font-black">⋮</span>
                    </div>

                    {/* COLUMN 2: Question Preview & Mini Navigation (Middle Column - resizable width) */}
                    <div style={{ width: `${colWidths.col2}%` }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full shrink-0">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                ❓ প্রশ্ন প্রিভিউ (Preview)
                            </span>
                            <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                                {selectedQuestion.type}
                            </span>
                        </div>

                        {/* Top Preview Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4 select-text professional-review-image">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                                    selectedQuestion.difficulty === 'EASY' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    selectedQuestion.difficulty === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                    'bg-rose-50 border-rose-200 text-rose-700'
                                }`}>
                                    {selectedQuestion.difficulty}
                                </span>
                                {selectedQuestion.status && getStatusBadge && getStatusBadge(selectedQuestion.status)}
                                {selectedQuestion.aiGenerated && (
                                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-wide">
                                        AI Generated
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4 mt-2">
                                {/* Stimulus / passage context */}
                                {selectedQuestion.stimulus && (() => {
                                    const cleanStimulus = selectedQuestion.stimulus.replace(/<[^>]*>/g, '').trim().toLowerCase();
                                    const isPlaceholder = 
                                        cleanStimulus === '' || 
                                        cleanStimulus === 'generated question' || 
                                        cleanStimulus === 'dynamic question' || 
                                        cleanStimulus === 'ডায়নামিক প্রশ্ন' ||
                                        cleanStimulus === 'ডায়নামিক প্রশ্ন';
                                    if (isPlaceholder) return null;
                                    return (
                                        <div className="space-y-1">
                                            <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Stimulus / উদ্দীপক</h5>
                                            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/70 text-slate-700 text-xs font-semibold leading-relaxed">
                                                <MarkdownRenderer content={selectedQuestion.stimulus} />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Question body */}
                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">প্রশ্ন (Question Text)</h5>
                                    <div className="text-sm font-semibold text-slate-800 leading-relaxed bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                                        {selectedQuestion.type === 'CQ' ? (
                                            <CQCombinedRenderer q={selectedQuestion} showAnswer={true} showExplanation={true} />
                                        ) : (
                                            <MarkdownRenderer content={selectedQuestion.questionText} />
                                        )}
                                    </div>
                                </div>

                                {/* MCQ Multiple Statements if present */}
                                {selectedQuestion.mcqType === 'MULTIPLE_COMPLETION' && selectedQuestion.statements && selectedQuestion.statements.length > 0 && (
                                    <div className="pl-3 border-l-2 border-indigo-200 space-y-1">
                                        {selectedQuestion.statements.map((stmt, sIdx) => (
                                            <div key={sIdx} className="text-xs text-slate-600 font-bold leading-normal">
                                                <MarkdownRenderer content={stmt} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* MCQ Options */}
                                {selectedQuestion.type === 'MCQ' && selectedQuestion.options && selectedQuestion.options.length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">বিকল্পসমূহ (Options)</h5>
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedQuestion.options.map(opt => (
                                                <div 
                                                    key={opt.id} 
                                                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                                                        opt.isCorrect 
                                                            ? 'border-emerald-300 bg-emerald-50/30' 
                                                            : 'border-slate-100 bg-white'
                                                    }`}
                                                >
                                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold ${
                                                        opt.isCorrect 
                                                            ? 'bg-emerald-500 text-white' 
                                                            : 'bg-slate-150 text-slate-550'
                                                    }`}>
                                                        {opt.optionLabel}
                                                    </span>
                                                    <span className={`text-xs ${opt.isCorrect ? 'text-emerald-900 font-bold' : 'text-slate-700 font-semibold'}`}>
                                                        <MarkdownRenderer content={opt.optionText} />
                                                    </span>
                                                    {opt.isCorrect && <CheckCircle size={15} className="text-emerald-555 ml-auto shrink-0" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Correct Answer for non-MCQ / non-CQ */}
                                {selectedQuestion.correctAnswer && selectedQuestion.type !== 'MCQ' && selectedQuestion.type !== 'CQ' && (
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1"><CheckCircle size={12} /> সঠিক উত্তর (Correct Answer)</h5>
                                        <div className="p-3 bg-emerald-50/30 text-emerald-950 text-xs font-semibold leading-relaxed rounded-xl border border-emerald-100">
                                            <MarkdownRenderer content={selectedQuestion.correctAnswer} />
                                        </div>
                                    </div>
                                )}

                                {/* Explanation */}
                                {selectedQuestion.explanation && selectedQuestion.type !== 'CQ' && (
                                    <div className="space-y-1">
                                        <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">ব্যাখ্যা (Explanation)</h5>
                                        <div className="p-3 bg-indigo-50/30 text-indigo-900 text-xs font-semibold leading-relaxed rounded-xl border border-indigo-100/60">
                                            <MarkdownRenderer content={selectedQuestion.explanation} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Height Resizer Handle */}
                        <div 
                            onMouseDown={handleNavDrawerHeightResizeStart} 
                            className="h-2 hover:bg-indigo-500/80 bg-slate-100 hover:text-white border-y border-slate-200 cursor-row-resize transition-all shrink-0 w-full flex items-center justify-center text-[10px] text-slate-400 font-bold select-none rounded hover:scale-y-110 active:scale-y-95 shadow-sm"
                            title="টেনে নিচের তালিকা ড্রয়ারের আকার পরিবর্তন করুন"
                        >
                            •••
                        </div>

                        {/* Bottom navigation mini question drawer list */}
                        <div style={{ height: `${navDrawerHeight}px` }} className="bg-slate-50 border-t border-slate-200/80 p-3 shrink-0 flex flex-col gap-1.5 overflow-hidden">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                তালিকা নেভিগেশন (Jump to Question)
                            </span>
                            <div className="flex-1 flex gap-2 overflow-x-auto py-1 no-scrollbar items-center">
                                {questions.map((q, idx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => handleViewQuestion(q)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 ${
                                            selectedQuestion.id === q.id 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-150' 
                                                : q.status === 'APPROVED' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100/40'
                                                    : q.status === 'REJECTED'
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200/60 hover:bg-rose-100/40'
                                                        : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>Q #{idx + 1}</span>
                                        <span className="text-[9px] font-extrabold opacity-60">({q.type})</span>
                                    </button>
                                ))}
                                {currentPage < totalPages && (
                                    <button
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        disabled={loadingMore}
                                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin text-indigo-650 animate-pulse" />
                                                <span>লোডিং...</span>
                                            </>
                                        ) : (
                                            <span>আরও ৫০টি লোড করুন</span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2-3 Horizontal Resizer handle */}
                    <div 
                        onMouseDown={(e) => handleColResizeStart(e, 2)} 
                        className="w-1.5 hover:w-2 hover:bg-indigo-600/80 bg-slate-200/40 cursor-col-resize transition-all self-stretch shrink-0 rounded-full my-1 flex items-center justify-center text-[8px] text-slate-450 font-bold select-none group"
                        title="টেনে ডান পাশের কলামের সাইজ পরিবর্তন করুন"
                    >
                        <span className="opacity-0 group-hover:opacity-100 text-white font-black">⋮</span>
                    </div>

                    {/* COLUMN 3: Edit Form (Right Column - resizable width) */}
                    <div style={{ width: `${colWidths.col3}%` }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full shrink-0">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                📝 প্রশ্ন সম্পাদনা (Edit Question)
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                            <QuestionEdit
                                inlineId={selectedQuestion.id}
                                key={selectedQuestion.id}
                                onSaveComplete={() => {
                                    fetchQuestions();
                                    // Auto-select next question or stay
                                    const nextIdx = currentIndex < totalCount - 1 ? currentIndex + 1 : currentIndex;
                                    if (nextIdx < totalCount) {
                                        handleViewQuestion(questions[nextIdx]);
                                    }
                                }}
                            />
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    if (splitScreenMode && hasFullLangAccess) {
        return renderProfessionalReviewWorkspace();
    }

    return (
        <div className="relative min-h-screen w-full bg-slate-50 flex flex-col">
        {/* Portal Question Cart next to the Notification Bell */}
        {portalTarget && createPortal(
            <div className="flex items-center gap-2">
                {overviewStats && isDefaultOrSuperAdmin && (
                    <div className="hidden md:flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-3 duration-300">
                        {/* Total Questions Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalQuestions}</span>
                        </div>
                        {/* Approved Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Approved:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalApproved}</span>
                        </div>
                        {/* Pending Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Pending:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalPending}</span>
                        </div>
                        {/* Subjects Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg shadow-sm">
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Subjects:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalSubjects}</span>
                        </div>
                    </div>
                )}
                {renderQuestionCart()}
            </div>,
            portalTarget
        )}

        {/* Gorgeous Full-Screen Glassmorphic Subject Selector Modal */}
        {!hasSelectedOnce && !(selectedSubjectId || showAllOverride || viewMode === 'FAVORITES' || viewMode === 'REVISED') && !reviewItem && !searchParams.get('view') && (
            <SubjectSelectorModal
                levels={levels}
                streams={streams}
                classes={classes}
                filteredSubjects={filteredSubjects}
                selectedLevelId={selectedLevelId}
                setSelectedLevelId={setSelectedLevelId}
                selectedStreamId={selectedStreamId}
                setSelectedStreamId={setSelectedStreamId}
                selectedClassId={selectedClassId}
                setSelectedClassId={setSelectedClassId}
                selectedSubjectId={selectedSubjectId}
                setSelectedSubjectId={setSelectedSubjectId}
                handleExitMobileView={handleExitMobileView}
                isSuperAdmin={isSuperAdmin}
                setShowAllOverride={setShowAllOverride}
            />
        )}

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
            <div className={`px-3 md:px-6 pt-3 pb-2 flex flex-col items-start border-b border-slate-200 bg-white shadow-sm z-40 relative ${!isDefaultOrSuperAdmin && !isEmbedded ? 'hidden md:flex' : 'flex'}`}>
                {/* Desktop Version Viewport (> 768px) - Normal Badges */}
                {!portalTarget && overviewStats && isDefaultOrSuperAdmin && (
                    <div className="hidden sm:flex items-center gap-2 overflow-x-auto flex-nowrap pb-2 border-b border-slate-100 mb-2.5 w-full no-scrollbar select-none">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-sm shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalQuestions}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-sm shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Approved:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalApproved}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg shadow-sm shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">Pending:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalPending}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg shadow-sm shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Subjects:</span>
                            <span className="text-xs font-black text-slate-800">{overviewStats.totalSubjects}</span>
                        </div>
                    </div>
                )}

                {/* Mobile / WebView Viewport (< 768px) - Highly Compact minimalist header requested by user */}
                <div className="flex sm:hidden items-center justify-between w-full select-none py-1">
                    {/* Left: Selected Subject Name & total question stats */}
                    <div className="flex items-center gap-2 overflow-hidden mr-3">
                        <div className="flex items-center justify-center bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg text-indigo-700 shrink-0">
                            <Layers size={13} className="stroke-[2]" />
                        </div>
                        <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-xs font-black text-slate-800 truncate animate-fade-in" style={{ maxWidth: '210px' }}>
                                {activeSubjectName || 'সব বিষয়'} {activeClassName ? <span className="text-[10px] text-slate-500 font-bold ml-0.5">({activeClassName})</span> : ''}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                                সর্বমোট প্রশ্ন: {overviewStats?.totalQuestions ?? totalElements}টি
                            </span>
                        </div>
                    </div>
                    {/* Right: Exit / Back Button inside top-right header, hidden when scrolled */}
                    {!isScrolled && (
                        <button
                            onClick={handleExitMobileView}
                            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-750 border border-rose-150 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 shrink-0 shadow-sm animate-in fade-in zoom-in-95 duration-200"
                            title="Back"
                        >
                            <ArrowLeft size={11} className="stroke-[3]" />
                            <span>Back</span>
                        </button>
                    )}
                </div>
                
                <div className="flex items-center gap-2.5 w-full">
                    {/* Desktop "ফিরে যান" / filter icon */}
                    <div className="hidden sm:flex items-center gap-2">
                        {(isEmbedded || window.innerWidth < 768) && (
                            <button
                                onClick={handleExitMobileView}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 shrink-0 shadow-sm"
                                title="Back"
                            >
                                <ArrowLeft size={12} className="stroke-[2.5]" />
                                <span>Back</span>
                            </button>
                        )}
                        
                        <div className="flex items-center justify-center bg-indigo-50 border border-indigo-100/80 p-1.5 rounded-xl text-indigo-700 shrink-0 shadow-sm" title="একাডেমিক ফিল্টার">
                            <Filter size={13} className="text-indigo-650 animate-pulse" />
                        </div>
                    </div>
                    
                    {/* Compact Inline Academic Filters in premium scrollable row (Desktop ONLY!) */}
                    <div className="hidden sm:flex items-center gap-2 flex-nowrap pl-1 pr-4 shrink-0 overflow-x-auto no-scrollbar">
                        {/* Language Dropdown */}
                        {showLanguageFilter && (
                            <div className="relative group shrink-0">
                                <select 
                                    value={filterLanguage} 
                                    onChange={(e) => setFilterLanguage(e.target.value)} 
                                    className={`appearance-none h-9 pl-3 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${filterLanguage !== 'ALL' ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                >
                                    {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.length > 1 || uniqueInstituteMediums.includes('Bilingual')) && <option value="ALL">সব ভার্সন</option>}
                                    {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('Bangla') || uniqueInstituteMediums.includes('Bilingual')) && <option value="Bangla">Bangla</option>}
                                    {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('English') || uniqueInstituteMediums.includes('Bilingual')) && <option value="English">English</option>}
                                    {(hasFullLangAccess || !user?.instituteMedium || uniqueInstituteMediums.includes('Bilingual')) && <option value="Bilingual">Bilingual</option>}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        )}

                        {/* Level Dropdown */}
                        {levels.length > 1 && (
                            <div className="relative group shrink-0">
                                <select 
                                    value={selectedLevelId} 
                                    onChange={(e) => setSelectedLevelId(e.target.value)} 
                                    className={`appearance-none h-9 pl-3 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${selectedLevelId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                >
                                    <option value="">সব স্তর</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        )}

                        {/* Stream Dropdown */}
                        {streams.length > 1 && (
                            <div className="relative group shrink-0">
                                <select 
                                    value={selectedStreamId} 
                                    onChange={(e) => setSelectedStreamId(e.target.value)} 
                                    className={`appearance-none h-9 pl-3 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${selectedStreamId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                >
                                    <option value="">সব বিভাগ</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        )}

                        {/* Class Dropdown */}
                        {classes.length > 1 && (
                            <div className="relative group shrink-0">
                                <select 
                                    value={selectedClassId} 
                                    onChange={(e) => setSelectedClassId(e.target.value)} 
                                    className={`appearance-none h-9 pl-3 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 ${selectedClassId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                >
                                    <option value="">সব শ্রেণি</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        )}

                        {/* Subject Dropdown */}
                        <div className="relative group shrink-0">
                            <select 
                                value={selectedSubjectId} 
                                onChange={(e) => setSelectedSubjectId(e.target.value)} 
                                className={`appearance-none h-9 pl-3 pr-9 rounded-xl text-[11px] font-black transition-all duration-300 cursor-pointer shadow-md outline-none border-2 focus:ring-4 ${selectedSubjectId ? 'bg-gradient-to-r from-indigo-50 to-pink-50/30 border-primary text-primary focus:ring-primary/10 shadow-primary/5' : 'bg-white border-primary/30 text-indigo-955 focus:ring-primary/10 animate-pulse-slow'}`}
                                disabled={filteredSubjects.length === 0}
                            >
                                {filteredSubjects.length === 0 ? (
                                    <option value="">শ্রেণি নির্বাচন করুন</option>
                                ) : (
                                    <>
                                        <option value="">বিষয় সিলেক্ট করুন</option>
                                        {filteredSubjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                    </>
                                )}
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-primary transition-colors">
                                <ChevronDown size={12} className="stroke-[2.5]" />
                            </div>
                        </div>

                        {/* Chapter Dropdown */}
                        {chapters.length > 1 && (
                            <div className="relative group shrink-0">
                                <select 
                                    value={selectedChapterId} 
                                    onChange={(e) => setSelectedChapterId(e.target.value)} 
                                    className={`appearance-none h-9 pl-3 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 max-w-[130px] sm:max-w-[160px] truncate ${selectedChapterId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                >
                                    <option value="">সব অধ্যায়</option>
                                    {chapters.map(ch => {
                                        const count = getChapterQuestionCount(ch.id);
                                        return (
                                            <option key={ch.id} value={ch.id}>
                                                {ch.name} ({count})
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        )}

                        {/* Topic Dropdown */}
                        {visibleTopics.length > 1 && (
                            <div className="relative group shrink-0">
                                <select 
                                    value={selectedTopicId} 
                                    onChange={(e) => setSelectedTopicId(e.target.value)} 
                                    className={`appearance-none h-9 pl-3 pr-8 rounded-xl text-[11px] font-bold transition-all duration-300 cursor-pointer shadow-sm outline-none border focus:ring-4 max-w-[130px] sm:max-w-[160px] truncate ${selectedTopicId ? 'bg-indigo-50/70 border-indigo-500 text-indigo-800 focus:ring-indigo-500/10' : 'bg-slate-50/80 hover:bg-indigo-50/40 border-slate-200/80 hover:border-indigo-400 focus:ring-indigo-500/10 text-slate-700'}`}
                                >
                                    <option value="">সব টপিক</option>
                                    {visibleTopics.map(t => {
                                        const count = getTopicQuestionCount(t.id);
                                        return (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({count})
                                            </option>
                                        );
                                    })}
                                </select>
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={12} className="stroke-[2.5]" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
                        {/* STICKY COMPACT FILTER HEADER */}
            <QuestionFilterPanel
                viewMode={viewMode}
                setViewMode={setViewMode}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                setCurrentPage={setCurrentPage}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                splitScreenMode={splitScreenMode}
                setSplitScreenMode={setSplitScreenMode}
                showSourceFilters={showSourceFilters}
                setShowSourceFilters={setShowSourceFilters}
                renderQuestionCart={renderQuestionCart}
                showLanguageFilter={showLanguageFilter}
                filterLanguage={filterLanguage}
                setFilterLanguage={setFilterLanguage}
                levels={levels}
                selectedLevelId={selectedLevelId}
                setSelectedLevelId={setSelectedLevelId}
                streams={streams}
                selectedStreamId={selectedStreamId}
                setSelectedStreamId={setSelectedStreamId}
                classes={classes}
                selectedClassId={selectedClassId}
                setSelectedClassId={setSelectedClassId}
                filteredSubjects={filteredSubjects}
                selectedSubjectId={selectedSubjectId}
                setSelectedSubjectId={setSelectedSubjectId}
                chapters={chapters}
                selectedChapterId={selectedChapterId}
                setSelectedChapterId={setSelectedChapterId}
                getChapterQuestionCount={getChapterQuestionCount}
                visibleTopics={visibleTopics}
                selectedTopicId={selectedTopicId}
                setSelectedTopicId={setSelectedTopicId}
                getTopicQuestionCount={getTopicQuestionCount}
                selectedBoards={selectedBoards}
                setSelectedBoards={setSelectedBoards}
                selectedYears={selectedYears}
                setSelectedYears={setSelectedYears}
                selectedSchools={selectedSchools}
                setSelectedSchools={setSelectedSchools}
                sourceTags={sourceTags}
                resetFilters={resetFilters}
                fetchQuestions={fetchQuestions}
                typeTabs={typeTabs}
                filterType={filterType}
                setFilterType={setFilterType}
                isSuperAdmin={isSuperAdmin}
                overviewStats={overviewStats}
                filterUnanswered={filterUnanswered}
                setFilterUnanswered={setFilterUnanswered}
                totalElements={totalElements}
                questions={questions}
                handleSelectAllGlobal={handleSelectAllGlobal}
                isSelectingAll={isSelectingAll}
                selectedIds={selectedIds}
                handleCreateExamFromSelection={handleCreateExamFromSelection}
                handleUpdateStatusBulk={handleUpdateStatusBulk}
                handleBulkDelete={handleBulkDelete}
                hasPerm={hasPerm}
                isDefaultOrSuperAdmin={isDefaultOrSuperAdmin}
                hasFullLangAccess={hasFullLangAccess}
                uniqueInstituteMediums={uniqueInstituteMediums}
                user={user}
                portalTarget={portalTarget}
            />

            <div className={`flex gap-2 sm:gap-3 px-1 sm:px-3 md:px-6 py-1.5 sm:py-3 ${splitScreenMode ? 'flex-col md:flex-row h-[65vh] overflow-hidden' : 'flex-col'}`}>
                {/* List Side */}
                <div id="question-list-scroll-container" className={`${splitScreenMode ? 'w-full md:w-1/2 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex flex-col gap-2' : 'w-full flex flex-col gap-2'}`}>
                    {loading && currentPage === 1 ? (
                        <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-8 h-8 border-4 border-indigo-100 border-t-primary rounded-full animate-spin"></div>
                                <span className="text-slate-500 text-sm font-bold tracking-wide">Loading Questions...</span>
                            </div>
                        </div>
                    ) : !(selectedSubjectId || showAllOverride || viewMode === 'FAVORITES' || viewMode === 'REVISED') ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[32px] border border-slate-200/60 shadow-sm mt-4 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                <Layers size={32} className="stroke-[1.5]" />
                            </div>
                            <div className="max-w-sm">
                                <h3 className="text-sm font-black text-slate-700 tracking-tight">কোনো বিষয় সিলেক্ট করা নেই</h3>
                                <p className="text-slate-400 text-xs mt-1 font-bold">দয়া করে ওপরের নির্বাচক থেকে আপনার শ্রেণি ও বিষয় সিলেক্ট করুন।</p>
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
                        <div className="flex flex-col gap-1 sm:gap-1.5 pb-1 relative" style={{ overflowAnchor: 'none' }}>
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
                                    {/* Tabbed Header */}
                                    <div className="flex bg-slate-100 border-b border-slate-200 p-1 gap-1 shrink-0">
                                        <button
                                            onClick={() => setRightPanelTab('EDIT')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${rightPanelTab === 'EDIT' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            📝 প্রশ্ন সম্পাদনা (Edit)
                                        </button>
                                        <button
                                            onClick={() => setRightPanelTab('SOURCE')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${rightPanelTab === 'SOURCE' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            📖 উৎস পেজ ও OCR (Source)
                                        </button>
                                    </div>

                                    {/* Tab 1: Edit Question */}
                                    <div className={`flex-1 flex-col overflow-hidden w-full ${rightPanelTab === 'EDIT' ? 'flex' : 'hidden'}`}>
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

                                    {/* Tab 2: Original Book Source Context & Scanned Page Viewer */}
                                    {rightPanelTab === 'SOURCE' && (
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white flex flex-col gap-4 w-full">
                                            {loadingSource ? (
                                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                                                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                    <span className="text-xs font-bold">লোডিং সোর্স কন্টেন্ট...</span>
                                                </div>
                                            ) : sourceContext?.chunk ? (
                                                <>
                                                    {/* Book Info Header */}
                                                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/80 flex flex-col gap-1 shrink-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                                                                {sourceContext.chunk.sourceBook?.bookType || 'TEXTBOOK'}
                                                            </span>
                                                            {sourceContext.chunk.pageNumber && (
                                                                <span className="text-xs font-black text-slate-600">
                                                                    পৃষ্ঠা নম্বর: {sourceContext.chunk.pageNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-xs font-black text-slate-800 line-clamp-1">{sourceContext.chunk.sourceBook?.title}</h4>
                                                        {sourceContext.chunk.sourceBookIndex?.title && (
                                                            <p className="text-[11px] font-semibold text-slate-500">চ্যাপ্টার: {sourceContext.chunk.sourceBookIndex.title}</p>
                                                        )}
                                                    </div>

                                                    {/* Scanned Image or OCR Text */}
                                                    <div className="flex flex-col gap-4 flex-1">
                                                        {sourceContext.chunk.page?.imageUrl ? (
                                                            <div className="h-[250px] border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-inner">
                                                                <SourceDocumentViewer 
                                                                    remoteUrl={(sourceContext.chunk.page.imageUrl.startsWith('http') && sourceContext.chunk.page.imageUrl.includes('r2.dev'))
                                                                        ? `/api/v1/public/proxy-image?url=${encodeURIComponent(sourceContext.chunk.page.imageUrl)}`
                                                                        : sourceContext.chunk.page.imageUrl} 
                                                                    remoteType="image/jpeg" 
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 bg-slate-50 text-slate-500 text-xs font-bold text-center border border-dashed border-slate-350 rounded-xl shrink-0">
                                                                এই চাঙ্কের স্ক্যান করা পৃষ্ঠা চিত্র পাওয়া যায়নি।
                                                            </div>
                                                        )}

                                                        <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
                                                            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">মূল টেক্সট (OCR / Content Chunks)</h5>
                                                            <div className="flex-1 p-4 bg-slate-50/60 rounded-xl border border-slate-200 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-slate-700 select-text">
                                                                <MarkdownRenderer content={sourceContext.chunk.chunkText} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center justify-center gap-2">
                                                    <span className="text-3xl">📖</span>
                                                    <p className="text-xs">এই প্রশ্নের জন্য কোনো এআই বুক চ্যাপ্টার সোর্স চাঙ্ক পাওয়া যায়নি।</p>
                                                    <p className="text-[10px] text-slate-400 font-medium max-w-xs mt-1">এটি ম্যানুয়ালি তৈরি করা প্রশ্ন হতে পারে অথবা এতে সোর্স চাঙ্কের লিংক নেই।</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                <QuestionPreviewModal
                    selectedQuestion={selectedQuestion}
                    onClose={() => setSelectedQuestion(null)}
                    getStatusBadge={getStatusBadge}
                />
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

        {/* Sleek Floating dynamic Back/Exit Button on mobile when scrolled */}
        {(isEmbedded || window.innerWidth < 768) && isScrolled && (
            <button
                onClick={handleExitMobileView}
                className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-[0_8px_30px_rgba(233,30,140,0.4)] border border-white/20 active:scale-95 transition-all hover:scale-105 animate-in fade-in slide-in-from-bottom-6 duration-300 md:hidden cursor-pointer"
                title="Back"
            >
                <ArrowLeft size={20} className="stroke-[2.5]" />
                <span className="text-[8px] font-black tracking-widest mt-0.5 uppercase">Back</span>
            </button>
        )}
        </div>
    );
};

export default QuestionList;
