import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronRight, Book, Layers, FileText, Link as LinkIcon, Building, Component, Settings, Home, ArrowLeft, Search, Check, FolderOpen, Folder } from 'lucide-react';
import academicService from '../../../services/academicService';

const AcademicStructure = () => {
    const [activeSession, setActiveSession] = useState(null);

    // Breadcrumbs arrays (for navigation)
    // path: [ { type: 'LEVEL', id: '..', name: 'Level 1', obj: {...} }, { type: 'STREAM', ... } ]
    const [path, setPath] = useState([]);
    
    // View state
    // currentType: 'LEVEL', 'STREAM', 'CLASS', 'SUBJECT', 'CHAPTER', 'TOPIC'
    const [currentType, setCurrentType] = useState('LEVEL');
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);

    // Data Dependencies
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const [newItemName, setNewItemName] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [globalSubjects, setGlobalSubjects] = useState([]);
    const [selectedGlobalSubjectId, setSelectedGlobalSubjectId] = useState('');

    const [editMode, setEditMode] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [editType, setEditType] = useState('');
    const [editValueName, setEditValueName] = useState('');
    const [editValueOrder, setEditValueOrder] = useState('');
    const [editValueGroup, setEditValueGroup] = useState('');
    const [editIsEnglishVersion, setEditIsEnglishVersion] = useState(false);

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [filterVersion, setFilterVersion] = useState('ALL'); // ALL, Bangla, English

    const academicTranslations = {
        // Levels
        "প্রাথমিক": "Primary",
        "নিম্ন মাধ্যমিক": "Lower Secondary",
        "মাধ্যমিক": "Secondary",
        "উচ্চ মাধ্যমিক": "Higher Secondary",
        "উচ্চশিক্ষা": "Higher Education",
        
        // Streams
        "সাধারণ": "General",
        "মাদ্রাসা": "Madrasah",
        "কারিগরি": "Technical",
        "ভোকেশনাল": "Vocational",
        
        // Classes
        "১ম শ্রেণি": "Class 1",
        "২য় শ্রেণি": "Class 2",
        "৩য় শ্রেণি": "Class 3",
        "৪র্থ শ্রেণি": "Class 4",
        "৫ম শ্রেণি": "Class 5",
        "৬ষ্ঠ শ্রেণি": "Class 6",
        "৭ম শ্রেণি": "Class 7",
        "৮ম শ্রেণি": "Class 8",
        "৯ম শ্রেণি": "Class 9",
        "১০ম শ্রেণি": "Class 10",
        "৯ম-১০ম শ্রেণি": "Class 9-10",
        "একাদশ শ্রেণি": "Class 11",
        "দ্বাদশ শ্রেণি": "Class 12",
        "একাদশ-দ্বাদশ শ্রেণি": "Class 11-12",
    };

    const formatAcademicName = (name) => {
        if (filterVersion === 'English') {
            return academicTranslations[name] || name;
        }
        return name;
    };

    useEffect(() => {
        fetchActiveSession();
        fetchGroups();
        loadItems('LEVEL', null);
    }, []);

    const fetchActiveSession = async () => {
        try {
            const data = await academicService.getActiveSession();
            setActiveSession(data);
        } catch (error) {
            console.error("Failed to fetch active session", error);
        }
    };

    const fetchGroups = async () => {
        try {
            const data = await academicService.getAllGroups();
            setGroups(data);
        } catch (error) {
            console.error("Failed to fetch groups", error);
        }
    };

    // Advanced dynamic loader based on view type
    const loadItems = async (type, parentObj, groupIdOverride = selectedGroupId) => {
        try {
            setSelectedItems([]);
            let data = [];
            if (type === 'LEVEL') {
                data = await academicService.getAllLevels();
            } else if (type === 'STREAM') {
                data = await academicService.getStreamsByLevel(parentObj.id);
            } else if (type === 'CLASS') {
                data = await academicService.getClassesByStream(parentObj.id);
            } else if (type === 'SUBJECT') {
                data = await academicService.getSubjectsByClass(parentObj.id, groupIdOverride || null, activeSession?.id);
            } else if (type === 'CHAPTER') {
                data = await academicService.getChaptersByClassSubject(parentObj.classSubjectId);
            } else if (type === 'TOPIC') {
                data = await academicService.getTopicsByChapter(parentObj.id);
            }
            setItems(data);
            setCurrentType(type);
        } catch (err) {
            console.error(`Failed to load items for ${type}`, err);
        }
    };

    const handleNavigate = (obj, targetType) => {
        const newPath = [...path, { type: currentType, name: obj.name || obj.subjectName, id: obj.id || obj.classSubjectId, obj: obj }];
        setPath(newPath);
        loadItems(targetType, obj);
    };

    const handleBreadcrumbClick = (index) => {
        if (index === -1) {
            setPath([]);
            loadItems('LEVEL', null);
            return;
        }
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        const targetObj = newPath[newPath.length - 1].obj;
        const targetType = getNextLevelType(newPath[newPath.length - 1].type); // load children of clicked path
        loadItems(targetType, targetObj);
    };

    const getNextLevelType = (current) => {
        const flow = ['LEVEL', 'STREAM', 'CLASS', 'SUBJECT', 'CHAPTER', 'TOPIC'];
        return flow[flow.indexOf(current) + 1];
    };

    // --- Actions ---
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        try {
            const parentObj = path.length > 0 ? path[path.length - 1].obj : null;
            if (currentType === 'LEVEL') {
                await academicService.createLevel({ name: newItemName });
            } else if (currentType === 'STREAM' && parentObj) {
                await academicService.createStream(parentObj.id, { name: newItemName });
            } else if (currentType === 'CLASS' && parentObj) {
                await academicService.createClass(parentObj.id, { name: newItemName });
            } else if (currentType === 'SUBJECT' && parentObj) {
                const code = newItemName.substring(0, 3).toUpperCase() + '-' + Date.now().toString().substring(8);
                await academicService.createClassSubject(parentObj.id, selectedGroupId || null, { name: newItemName, code: code });
            } else if (currentType === 'CHAPTER' && parentObj) {
                await academicService.createChapter(parentObj.classSubjectId, { name: newItemName, chapterNumber: items.length + 1, isActive: true });
            } else if (currentType === 'TOPIC' && parentObj) {
                await academicService.createTopic(parentObj.id, { name: newItemName });
            }
            setNewItemName('');
            loadItems(currentType, parentObj);
            // Added explicit success logic for better UX
        } catch (error) {
            console.error(`Failed to add`, error);
            const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error.message;
            alert(`সুপার অ্যাডমিন অ্যাড ফেইল্ড! কারণ: ${errorMsg}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Delete this item permanently?`)) return;
        try {
            if (currentType === 'LEVEL') await academicService.deleteLevel(id);
            else if (currentType === 'STREAM') await academicService.deleteStream(id);
            else if (currentType === 'CLASS') await academicService.deleteClass(id);
            else if (currentType === 'SUBJECT') await academicService.deleteClassSubject(id);
            else if (currentType === 'CHAPTER') await academicService.deleteChapter(id);
            else if (currentType === 'TOPIC') await academicService.deleteTopic(id);

            const parentObj = path.length > 0 ? path[path.length - 1].obj : null;
            loadItems(currentType, parentObj);
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete. It might contain dependent items.");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        if (!window.confirm(`Delete ${selectedItems.length} selected item(s) permanently?`)) return;
        
        try {
            // Bulk delete
            const deletePromises = selectedItems.map(id => {
                if (currentType === 'LEVEL') return academicService.deleteLevel(id);
                if (currentType === 'STREAM') return academicService.deleteStream(id);
                if (currentType === 'CLASS') return academicService.deleteClass(id);
                if (currentType === 'SUBJECT') return academicService.deleteClassSubject(id);
                if (currentType === 'CHAPTER') return academicService.deleteChapter(id);
                if (currentType === 'TOPIC') return academicService.deleteTopic(id);
                return Promise.resolve();
            });

            await Promise.all(deletePromises);
            
            setSelectedItems([]);
            const parentObj = path.length > 0 ? path[path.length - 1].obj : null;
            loadItems(currentType, parentObj);
        } catch (error) {
            console.error("Failed to bulk delete", error);
            alert("Failed to delete some items. They might be in use.");
            const parentObj = path.length > 0 ? path[path.length - 1].obj : null;
            loadItems(currentType, parentObj);
        }
    };

    // Modal Edit logic...
    const handleEditClick = (item) => {
        setEditType(currentType);
        setEditItem(item);
        setEditValueName(item.name || item.subjectName);
        setEditValueOrder(item.order || item.chapterNumber || '');
        if (currentType === 'SUBJECT') {
            setEditValueGroup(item.groupId || '');
            setEditIsEnglishVersion(item.isEnglishVersion || item.englishVersion || false);
        } else {
            setEditValueGroup('');
            setEditIsEnglishVersion(false);
        }
        setEditMode(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const id = editItem.id || editItem.classSubjectId;
            const updatedData = { name: editValueName };
            
            if (['LEVEL', 'STREAM', 'CLASS', 'SUBJECT'].includes(editType)) {
                updatedData.order = editValueOrder ? parseInt(editValueOrder) : null;
            } else if (editType === 'CHAPTER') {
                updatedData.chapterNumber = editValueOrder ? parseInt(editValueOrder) : null;
            }

            if (editType === 'LEVEL') await academicService.updateLevel(id, updatedData);
            else if (editType === 'STREAM') await academicService.updateStream(id, updatedData);
            else if (editType === 'CLASS') await academicService.updateClass(id, updatedData);
            else if (editType === 'SUBJECT') {
                const subjectUpdatePayload = {
                    subjectName: editValueName, order: updatedData.order,
                    groupId: editValueGroup === 'null' || editValueGroup === '' ? null : editValueGroup,
                    isEnglishVersion: editIsEnglishVersion,
                    englishVersion: editIsEnglishVersion
                };
                await academicService.updateClassSubject(id, subjectUpdatePayload);
            }
            else if (editType === 'CHAPTER') await academicService.updateChapter(id, updatedData);
            else if (editType === 'TOPIC') await academicService.updateTopic(id, updatedData);

            setEditMode(false);
            setEditItem(null);
            const parentObj = path.length > 0 ? path[path.length - 1].obj : null;
            loadItems(currentType, parentObj);
        } catch (error) {
            console.error("Failed to update item", error);
            alert("Failed to update item");
        }
    };

    const handleMapSelect = async () => {
        try {
            const data = await academicService.getAllSubjects();
            setGlobalSubjects(data.sort((a, b) => a.name.localeCompare(b.name)));
            setShowMapModal(true);
        } catch (error) {
            console.error("Failed to fetch global subjects", error);
        }
    };

    const handleMapSubject = async (e) => {
        e.preventDefault();
        if (!selectedGlobalSubjectId || !activeSession || path.length === 0) return;
        const parentClassObj = path[path.length - 1].obj;

        try {
            await academicService.assignSubjectToClass(parentClassObj.id, selectedGlobalSubjectId, selectedGroupId || null, activeSession.id);
            setShowMapModal(false);
            loadItems(currentType, parentClassObj);
        } catch (error) {
            console.error("Failed to map subject", error);
            alert("Failed to map subject. It might already be assigned.");
        }
    };

    const handleGroupFilterChange = (e) => {
        const gId = e.target.value;
        setSelectedGroupId(gId);
        const parentObj = path.length > 0 ? path[path.length - 1].obj : null;
        loadItems(currentType, parentObj, gId);
    };

    const handleAddGroup = async (e) => {
        e.preventDefault();
        try {
            await academicService.createGroup({ name: newGroupName });
            setNewGroupName('');
            fetchGroups();
        } catch (error) {
            alert("Failed to create group.");
        }
    };

    // View Renders
    const getTypeInfo = () => {
        const config = {
            'LEVEL': { title: 'Levels', icon: Building, next: 'STREAM', placeholder: 'Ex: মাধ্যমিক, উচ্চ মাধ্যমিক...' },
            'STREAM': { title: 'Streams', icon: Component, next: 'CLASS', placeholder: 'Ex: সাধারণ, মাদ্রাসা...' },
            'CLASS': { title: 'Classes', icon: FolderOpen, next: 'SUBJECT', placeholder: 'Ex: ৬ষ্ঠ, ৯ম-১০ম...' },
            'SUBJECT': { title: 'Subjects', icon: Book, next: 'CHAPTER', placeholder: 'Ex: বাংলা ১ম পত্র...' },
            'CHAPTER': { title: 'Chapters', icon: Layers, next: 'TOPIC', placeholder: 'Ex: গতিবিদ্যা...' },
            'TOPIC': { title: 'Topics', icon: FileText, next: null, placeholder: 'Ex: নিউটনের সূত্র...' }
        };
        return config[currentType];
    };

    const { title, icon: Icon, next, placeholder } = getTypeInfo();

    const displayedItems = items.filter(item => {
        if (currentType === 'SUBJECT') {
            const isEng = item.isEnglishVersion || item.englishVersion || false;
            if (filterVersion === 'English') return isEng;
            if (filterVersion === 'Bangla') return !isEng;
        }
        return true;
    });

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Curriculum Explorer</h1>
                    <p className="text-slate-500 text-sm">Design and manage your comprehensive 6-layer architecture.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Premium Segmented Version Controller */}
                    <div className="flex bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm gap-2">
                        <button
                            type="button"
                            onClick={() => setFilterVersion('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterVersion === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            All Versions
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterVersion('Bangla')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterVersion === 'Bangla' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        >
                            Bangla Version
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterVersion('English')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filterVersion === 'English' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            English Version
                        </button>
                    </div>

                    {/* Advanced Quick Actions */}
                    {currentType === 'SUBJECT' && (
                        <div className="flex bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm gap-2">
                            <select 
                                className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-1.5 outline-none focus:border-blue-500 font-medium text-slate-700"
                                value={selectedGroupId} onChange={handleGroupFilterChange}
                            >
                                <option value="">-- All Groups (Optional) --</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <button onClick={() => setShowGroupModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded hover:bg-slate-100 hover:text-blue-600 transition-colors text-sm font-medium">
                                <Settings size={15} /> Groups
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Breadcrumb Navigation Bar */}
            <div className="flex items-center flex-wrap gap-2 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <button 
                    onClick={() => handleBreadcrumbClick(-1)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors font-medium text-sm ${path.length === 0 ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Home size={16} /> Home
                </button>
                {path.map((segment, index) => (
                    <React.Fragment key={index}>
                        <ChevronRight className="text-slate-300" size={16} />
                        <button 
                            onClick={() => handleBreadcrumbClick(index)}
                            className={`px-3 py-1.5 rounded-md transition-colors font-medium text-sm ${index === path.length - 1 ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            {formatAcademicName(segment.name)}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Main Content Pane */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50/80 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {path.length > 0 && (
                            <button onClick={() => handleBreadcrumbClick(path.length - 2)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 bg-white border border-slate-200 rounded-md shadow-sm">
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Icon size={20} className="text-blue-500" />
                            {title}
                        </h2>
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{displayedItems.length} items</span>
                    </div>

                    <form onSubmit={handleAdd} className="flex gap-2 items-center">
                        {(currentType === 'TOPIC' || currentType === 'CHAPTER') && selectedItems.length > 0 && (
                            <button 
                                type="button"
                                onClick={handleBulkDelete}
                                className="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-1 font-medium text-sm shadow-sm whitespace-nowrap"
                            >
                                <Trash2 size={16} /> Delete Selected ({selectedItems.length})
                            </button>
                        )}
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="border border-slate-300 px-3 py-1.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
                        />
                        <button type="submit" disabled={!newItemName} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                            <Plus size={16} /> Add {title.slice(0,-1)}
                        </button>
                        {currentType === 'SUBJECT' && (
                            <button type="button" onClick={handleMapSelect} className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 text-sm font-medium">
                                <LinkIcon size={16} /> Map Global
                            </button>
                        )}
                    </form>
                </div>

                <div className="max-h-[65vh] overflow-y-auto w-full">
                    {displayedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                            <FolderOpen size={48} className="mb-4 text-slate-200" />
                            <p className="text-slate-500 font-medium">No items found in this directory.</p>
                            <p className="text-sm mt-1">Add a new {title.slice(0,-1).toLowerCase()} using the form above.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-white sticky top-0 z-10">
                                    {(currentType === 'TOPIC' || currentType === 'CHAPTER') && (
                                        <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                checked={items.length > 0 && selectedItems.length === items.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedItems(items.map(i => i.id || i.classSubjectId));
                                                    else setSelectedItems([]);
                                                }}
                                                disabled={items.length === 0}
                                            />
                                        </th>
                                    )}
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Sr.</th>
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name </th>
                                    {currentType === 'SUBJECT' && <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Group Category</th>}
                                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {/* Sorting Strategy applied: Selected -> Common -> Standard Order */}
                                {displayedItems.sort((a,b) => {
                                    if(currentType === 'SUBJECT') {
                                        const sgName = groups.find(g => g.id === selectedGroupId)?.name;
                                        const aGrp = a.groupName || 'Common (All Groups)';
                                        const bGrp = b.groupName || 'Common (All Groups)';
                                        if (sgName) {
                                            if (aGrp === sgName && bGrp !== sgName) return -1;
                                            if (bGrp === sgName && aGrp !== sgName) return 1;
                                        }
                                        if (aGrp === 'Common (All Groups)' && bGrp !== 'Common (All Groups)') return -1;
                                        if (bGrp === 'Common (All Groups)' && aGrp !== 'Common (All Groups)') return 1;
                                    }
                                    const aOrder = a.order !== null && a.order !== undefined ? a.order : (a.chapterNumber !== null && a.chapterNumber !== undefined ? a.chapterNumber : 999);
                                    const bOrder = b.order !== null && b.order !== undefined ? b.order : (b.chapterNumber !== null && b.chapterNumber !== undefined ? b.chapterNumber : 999);
                                    return aOrder - bOrder;
                                }).map((item) => {
                                    const id = item.id || item.classSubjectId;
                                    const name = formatAcademicName(item.name || item.subjectName);
                                    const orderVal = item.order ?? item.chapterNumber ?? '--';
                                    const gName = item.groupName || 'Common';

                                    return (
                                        <tr key={id} className="hover:bg-slate-50/50 transition-colors group">
                                            {(currentType === 'TOPIC' || currentType === 'CHAPTER') && (
                                                <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                        checked={selectedItems.includes(id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedItems(prev => [...prev, id]);
                                                            else setSelectedItems(prev => prev.filter(i => i !== id));
                                                        }}
                                                    />
                                                </td>
                                            )}
                                            <td className="py-3 px-6 font-medium text-slate-400 text-sm whitespace-nowrap">
                                                {orderVal}
                                            </td>
                                            <td className="py-3 px-6">
                                                <div 
                                                    className={`inline-flex items-center gap-2 font-medium ${next ? 'cursor-pointer px-2 py-1 -ml-2 rounded hover:bg-slate-100 text-slate-800 hover:text-blue-600' : 'text-slate-800'}`}
                                                    onClick={() => next && handleNavigate(item, next)}
                                                >
                                                    {currentType === 'TOPIC' ? <Check size={16} className="text-emerald-500"/> : <Folder className="text-blue-500" size={16}/>}
                                                    <span>{name}</span>
                                                    {currentType === 'SUBJECT' && (
                                                        (item.isEnglishVersion || item.englishVersion) ? (
                                                            <span className="px-1 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 ml-1">
                                                                EN
                                                            </span>
                                                        ) : (
                                                            <span className="px-1 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 ml-1">
                                                                BN
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                            {currentType === 'SUBJECT' && (
                                                <td className="py-3 px-6">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${gName === 'Common' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                                        {gName}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="py-3 px-6 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => handleEditClick(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Properties">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Entry">
                                                        <Trash2 size={16} />
                                                    </button>
                                                    {next && (
                                                        <button onClick={() => handleNavigate(item, next)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors ml-2 font-medium flex items-center" title="Open folder">
                                                            <span className="text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity">Open</span> <ChevronRight size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Same Modals Restructured Minimally */}
            
            {/* Edit Modal */}
            {editMode && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Edit Node Properties</h2>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Item Name</label>
                                <input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={editValueName} onChange={e => setEditValueName(e.target.value)} />
                            </div>
                            {['LEVEL', 'STREAM', 'CLASS', 'CHAPTER', 'SUBJECT'].includes(editType) && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sort Sequence / Order Number</label>
                                    <input type="number" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={editValueOrder} onChange={e => setEditValueOrder(e.target.value)} />
                                </div>
                            )}
                            {editType === 'SUBJECT' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic Group / Category</label>
                                        <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={editValueGroup} onChange={e => setEditValueGroup(e.target.value)} >
                                            <option value="null">-- Common Subject (All Groups) --</option>
                                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 py-1">
                                        <input
                                            type="checkbox"
                                            id="editIsEnglishVersion"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            checked={editIsEnglishVersion}
                                            onChange={e => setEditIsEnglishVersion(e.target.checked)}
                                        />
                                        <label htmlFor="editIsEnglishVersion" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                                            Is English Version (ইংরেজি সংস্করণ)
                                        </label>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setEditMode(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors">Update Items</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Map Subject Modal */}
            {showMapModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Establish Global Subject Mapping</h2>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">Select a predefined subject catalog to align with existing structure. {selectedGroupId ? 'Applied to selected group filter.' : ''}</p>
                        <form onSubmit={handleMapSubject} className="space-y-4">
                            <div>
                                <select required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={selectedGlobalSubjectId} onChange={e => setSelectedGlobalSubjectId(e.target.value)}>
                                    <option value="">-- Start Typing or Select --</option>
                                    {globalSubjects.filter(sub => !items.some(existing => existing.subjectId === sub.id)).map(sub => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.code} - {sub.name} {sub.paper ? `(${sub.paper})` : ''} {sub.isEnglishVersion || sub.englishVersion ? '[EN]' : '[BN]'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowMapModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm transition-colors" disabled={!activeSession}>Confirm Registration</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Groups Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Academic Groups Registry</h2>
                            <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {groups.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">No categoric groups present in system</p>
                            ) : (
                                groups.map(g => (
                                    <div key={g.id} className="flex justify-between items-center bg-white hover:bg-slate-50 p-3 rounded-lg border border-slate-200 transition-colors shadow-sm">
                                        <span className="font-semibold text-slate-700 text-sm">{g.name}</span>
                                        <button onClick={async () => {
                                            if(window.confirm(`Destruct element "${g.name}" completely from database?`)) {
                                                try { await academicService.deleteGroup(g.id); fetchGroups(); } catch(err) { alert("Dependency constraints blocked deletion."); }
                                            }
                                        }} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                ))
                            )}
                        </div>
                        <form onSubmit={handleAddGroup} className="mt-6 pt-6 border-t border-slate-100 flex gap-2">
                            <input type="text" required placeholder="Ex: Science, Commerce" className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-1 transition-colors whitespace-nowrap"><Plus size={16} /> Combine</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AcademicStructure;
