import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Network, BookOpen, GitMerge, ChevronRight, ChevronDown, Folder, Layers, Bookmark, FileText } from 'lucide-react';
import academicService from '../../../services/academicService';

// Dynamically Loading Node Component
const DynamicNode = ({ node, type }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Node Display Properties
    const id = node.id || node.classSubjectId;
    const name = node.name || node.subjectName || node.topicName || node.chapterName;
    
    const childNodeTypes = {
        'LEVEL': 'STREAM',
        'STREAM': 'CLASS',
        'CLASS': 'SUBJECT',
        'SUBJECT': 'CHAPTER',
        'CHAPTER': 'TOPIC',
        'TOPIC': null
    };
    const childType = childNodeTypes[type];
    const canExpand = childType !== null;

    const toggleOpen = async () => {
        if (!isOpen && children.length === 0 && canExpand) {
            setIsLoading(true);
            try {
                let data = [];
                if (childType === 'STREAM') data = await academicService.getStreamsByLevel(id);
                else if (childType === 'CLASS') data = await academicService.getClassesByStream(id);
                else if (childType === 'SUBJECT') {
                    const session = await academicService.getActiveSession();
                    data = await academicService.getSubjectsByClass(id, null, session?.id);
                }
                else if (childType === 'CHAPTER') data = await academicService.getChaptersByClassSubject(id);
                else if (childType === 'TOPIC') data = await academicService.getTopicsByChapter(id);
                
                setChildren(data || []);
            } catch (err) {
                console.error(`Failed to fetch ${childType}`, err);
            } finally {
                setIsLoading(false);
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="mt-1">
            <div 
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${type === 'TOPIC' ? 'hover:bg-slate-50' : 'hover:bg-slate-100'} transition-colors group`}
                onClick={toggleOpen}
            >
                {canExpand ? (
                    isLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></div>
                    ) : isOpen ? (
                        <ChevronDown size={14} className="text-slate-400 group-hover:text-emerald-500"/>
                    ) : (
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-500"/>
                    )
                ) : (
                    <div className="w-3.5"/>
                )}
                
                {type === 'LEVEL' || type === 'STREAM' ? <Folder size={14} className="text-slate-400" /> : null}
                {type === 'CLASS' ? <Layers size={14} className="text-slate-400" /> : null}
                {type === 'SUBJECT' || type === 'CHAPTER' ? <Bookmark size={14} className={type === 'CHAPTER' ? 'text-emerald-500' : 'text-blue-500'} /> : null}
                {type === 'TOPIC' ? <FileText size={14} className="text-slate-400" /> : null}
                
                <span className={`text-sm ${['CHAPTER', 'TOPIC'].includes(type) ? 'font-medium text-slate-700' : 'font-semibold text-slate-600'}`}>{name}</span>
            </div>
            
            {isOpen && children.length > 0 && (
                <div className="border-l border-slate-200 ml-4 mt-1 pl-2">
                    {children.map((child, idx) => (
                        <DynamicNode key={child.id || child.classSubjectId || idx} node={child} type={childType} />
                    ))}
                </div>
            )}
            {isOpen && children.length === 0 && !isLoading && canExpand && (
                <div className="border-l border-slate-200 ml-4 mt-1 pl-4 py-1 text-xs text-slate-400 italic">
                    No {childType.toLowerCase()}s found
                </div>
            )}
        </div>
    );
};

const ProofreadingBase = () => {
    const { bookId } = useParams();
    
    const [levels, setLevels] = useState([]);
    const [isLoadingLevels, setIsLoadingLevels] = useState(true);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const data = await academicService.getAllLevels();
                setLevels(data || []);
            } catch (err) {
                console.error("Failed to fetch levels", err);
            } finally {
                setIsLoadingLevels(false);
            }
        };
        fetchLevels();
    }, []);

    return (
        <div className="h-[calc(100vh-72px)] flex flex-col w-full bg-[#f8f9fc]">
            
            {/* Header Section */}
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/knowledge-hub/library" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                            <Network className="text-primary" size={24} />
                            Context Mapping Workspace
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                            Link physical book index (Tree B) to universal academic structure (Tree A)
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
                        Total Mapped: 0%
                    </span>
                    <button className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors">
                        Save Mapping
                    </button>
                </div>
            </div>

            {/* Split Screen Workspace */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left Panel: Tree B (Source Book Index) */}
                <div className="flex-1 border-r border-slate-200 bg-slate-50/50 flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10 shrink-0 flex items-center justify-between">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-500"/>
                            1. Source Book Index (Tree B)
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                        <BookOpen size={48} className="text-slate-300 mb-4"/>
                        <h3 className="text-slate-600 font-bold mb-2">No Index Available</h3>
                        <p className="text-sm text-slate-400 max-w-sm text-center font-medium">
                            This book hasn't been digitized yet. Please upload scan images and run the OCR pipeline first.
                        </p>
                        <Link to={`/knowledge-hub/digitization/${bookId}`} className="mt-6 text-sm font-bold text-primary underline underline-offset-4">
                            Go to Digitization Workspace
                        </Link>
                    </div>
                </div>

                {/* Processing Middle Hub */}
                <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center pt-20 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] z-20">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-8 border border-slate-200">
                        <GitMerge size={18} />
                    </div>
                </div>

                {/* Right Panel: Tree A (Academic Structure) */}
                <div className="flex-[1.2] bg-white flex flex-col z-10">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2 grow">
                            <Network size={18} className="text-emerald-500"/>
                            2. Academic Target (Tree A)
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                        {isLoadingLevels ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-semibold">
                                Loading Global Hierarchy...
                            </div>
                        ) : levels.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <Network size={48} className="text-slate-200 mb-4"/>
                                <h3 className="text-slate-500 font-bold">No Levels Found</h3>
                            </div>
                        ) : (
                            <div className="pr-2">
                                {levels.map(lvl => (
                                    <DynamicNode key={lvl.id} node={lvl} type="LEVEL" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProofreadingBase;
