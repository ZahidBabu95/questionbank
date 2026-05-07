import React, { useState, useEffect } from 'react';
import { Merge, Edit2, RefreshCw, X } from 'lucide-react';
import questionSourceManagementService from '../../../services/questionSourceManagementService';
import clsx from 'clsx';

const SourceManagement = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [filterType, setFilterType] = useState('ALL');
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    
    // Rename state
    const [currentSource, setCurrentSource] = useState(null);
    const [newName, setNewName] = useState('');

    // Merge state
    const [targetName, setTargetName] = useState('');

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const summary = await questionSourceManagementService.getSourceSummary();
            const formatted = summary.map((item, index) => ({
                id: `${item.sourceType}-${item.organizationName}-${index}`,
                ...item
            }));
            setData(formatted);
            setSelectedRows([]);
        } catch (error) {
            console.error(error);
            alert('Failed to load sources summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const handleSelectRow = (id, sourceType) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(r => r !== id));
        } else {
            // Only allow selecting items of the same sourceType
            if (selectedRows.length > 0) {
                const firstSelected = data.find(d => d.id === selectedRows[0]);
                if (firstSelected && firstSelected.sourceType !== sourceType) {
                    alert('You can only merge sources of the same type!');
                    return;
                }
            }
            setSelectedRows([...selectedRows, id]);
        }
    };

    const handleRenameSubmit = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        
        try {
            await questionSourceManagementService.renameSource(
                currentSource.organizationName,
                newName.trim(),
                currentSource.sourceType
            );
            setIsRenameModalOpen(false);
            fetchSummary();
        } catch (error) {
            console.error(error);
            alert('Failed to rename source');
        }
    };

    const handleMergeSubmit = async (e) => {
        e.preventDefault();
        if (!targetName.trim()) return;

        try {
            const selectedSources = data.filter(item => selectedRows.includes(item.id));
            const oldNames = selectedSources.map(s => s.organizationName);
            const sourceType = selectedSources[0].sourceType;

            await questionSourceManagementService.mergeSources(
                oldNames,
                targetName.trim(),
                sourceType
            );
            setIsMergeModalOpen(false);
            fetchSummary();
        } catch (error) {
            console.error(error);
            alert('Failed to merge sources');
        }
    };

    const openRenameModal = (source) => {
        setCurrentSource(source);
        setNewName(source.organizationName);
        setIsRenameModalOpen(true);
    };

    const openMergeModal = () => {
        const selectedSources = data.filter(item => selectedRows.includes(item.id));
        setTargetName(selectedSources[0].organizationName);
        setIsMergeModalOpen(true);
    };

    const filteredData = filterType === 'ALL' ? data : data.filter(item => item.sourceType === filterType);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Source Management</h1>
                    <p className="text-slate-500">Manage, rename, and merge question sources (Boards, Schools, Universities).</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Type:</span>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="ALL">All Sources</option>
                            <option value="BOARD_EXAM">Board Exam</option>
                            <option value="UNIVERSITY_ADMISSION">University Admission</option>
                            <option value="INSTITUTION_TEST">Institution Test</option>
                            <option value="JOB_EXAM">Job Exam</option>
                            <option value="MODEL_TEST">Model Test</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <button 
                        onClick={fetchSummary} 
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                        Refresh
                    </button>
                    {selectedRows.length > 1 && (
                        <button 
                            onClick={openMergeModal}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Merge size={16} />
                            Merge Selected ({selectedRows.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
                                <th className="p-4 w-12 text-center">
                                    {/* Select all could go here if needed, but omitted for simplicity since cross-type selection is blocked */}
                                </th>
                                <th className="p-4">Source Type</th>
                                <th className="p-4">Organization Name</th>
                                <th className="p-4">Total Questions</th>
                                <th className="p-4 w-32 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        {loading ? 'Loading...' : 'No sources found.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => {
                                    const isSelected = selectedRows.includes(item.id);
                                    // Determine if row should be disabled (different type selected)
                                    const isDisabled = selectedRows.length > 0 && !selectedRows.includes(item.id) && data.find(d => d.id === selectedRows[0])?.sourceType !== item.sourceType;

                                    return (
                                        <tr key={item.id} className={clsx("hover:bg-slate-50 transition-colors", isSelected && "bg-blue-50/50")}>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    disabled={isDisabled}
                                                    onChange={() => handleSelectRow(item.id, item.sourceType)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium tracking-wide">
                                                    {item.sourceType}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-slate-900">{item.organizationName}</td>
                                            <td className="p-4 text-slate-500">{item.count}</td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => openRenameModal(item)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Rename Source</h3>
                            <button onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRenameSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Name</label>
                                <input 
                                    type="text" 
                                    value={currentSource?.organizationName} 
                                    disabled 
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">New Name</label>
                                <input 
                                    type="text" 
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter new organization name" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsRenameModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Merge Modal */}
            {isMergeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Merge Sources</h3>
                            <button onClick={() => setIsMergeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleMergeSubmit} className="p-5 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-yellow-800 mb-2">The following sources will be merged into a single name:</p>
                                <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
                                    {data.filter(item => selectedRows.includes(item.id)).map(s => (
                                        <li key={s.id}>{s.organizationName} ({s.count} questions)</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Target Name (Final Name)</label>
                                {/* We can use a datalist so they can either type a new name or pick one of the existing ones */}
                                <input 
                                    type="text" 
                                    value={targetName}
                                    onChange={(e) => setTargetName(e.target.value)}
                                    list="source-names"
                                    placeholder="Type or select the final name" 
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    required
                                    autoFocus
                                />
                                <datalist id="source-names">
                                    {data.filter(item => selectedRows.includes(item.id)).map(s => (
                                        <option key={s.id} value={s.organizationName} />
                                    ))}
                                </datalist>
                                <p className="text-xs text-slate-500 mt-1.5">You can select from the list or type a completely new name.</p>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsMergeModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                >
                                    Confirm Merge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SourceManagement;
