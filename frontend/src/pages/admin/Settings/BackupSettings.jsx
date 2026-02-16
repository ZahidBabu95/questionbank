import React, { useState, useEffect } from 'react';
import {
    Database, Clock, History, RotateCcw, Download, Trash2,
    Play, Check, AlertTriangle, Shield, Archive, FileText
} from 'lucide-react';
import backupService from '../../../services/backupService';

const BackupSettings = () => {
    const [activeTab, setActiveTab] = useState('MANUAL');
    const [loading, setLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (activeTab === 'HISTORY' || activeTab === 'RESTORE') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await backupService.getBackupHistory();
            setBackups(data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualBackup = async (type) => {
        setLoading(true);
        setMessage(null);
        try {
            await backupService.triggerManualBackup(type);
            setMessage({ type: 'success', text: `Backup (${type}) initiated successfully.` });
            if (activeTab === 'HISTORY') fetchHistory();
        } catch (error) {
            setMessage({ type: 'error', text: 'Backup failed to start.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this backup?")) return;
        try {
            await backupService.deleteBackup(id);
            fetchHistory();
            setMessage({ type: 'success', text: 'Backup deleted.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete backup.' });
        }
    };

    const handleRestore = async (id) => {
        const password = prompt("DANGER: This will overwrite the current database. Enter 'CONFIRM' to proceed:");
        if (password !== 'CONFIRM') return;

        setLoading(true);
        try {
            await backupService.restoreBackup(id);
            setMessage({ type: 'success', text: 'Restore process initiated.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Restore failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id, fileName) => {
        try {
            const response = await backupService.downloadBackup(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || `backup_${id}.sql`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download failed", error);
            setMessage({ type: 'error', text: 'Download failed.' });
        }
    };

    const renderTabs = () => (
        <div className="w-64 border-r border-slate-200 bg-slate-50/50 p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-6 px-2">Backup & Restore</h2>
            <nav className="space-y-1">
                <button
                    onClick={() => setActiveTab('MANUAL')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'MANUAL' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                    <Database size={18} /> Manual Backup
                </button>
                <button
                    onClick={() => setActiveTab('SCHEDULE')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'SCHEDULE' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                    <Clock size={18} /> Schedule
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'HISTORY' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                    <History size={18} /> Backup History
                </button>
                <button
                    onClick={() => setActiveTab('RESTORE')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'RESTORE' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}`}
                >
                    <RotateCcw size={18} /> Restore
                </button>
            </nav>
        </div>
    );

    const renderManualTab = () => (
        <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Manual Backup</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleManualBackup('FULL')}>
                    <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                        <Database size={20} />
                    </div>
                    <h3 className="font-semibold text-blue-900">Full System Backup</h3>
                    <p className="text-sm text-blue-700 mt-1">Backup entire database including all tenants and settings.</p>
                </div>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer opacity-60">
                    <div className="bg-slate-200 w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 mb-4">
                        <Archive size={20} />
                    </div>
                    <h3 className="font-semibold text-slate-900">Tenant Backup</h3>
                    <p className="text-sm text-slate-600 mt-1">Backup specific institute data only (Coming Soon).</p>
                </div>
            </div>
        </div>
    );

    const renderHistoryTable = (showRestore = false) => (
        <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Size</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {backups.length === 0 ? (
                        <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No backups found</td></tr>
                    ) : (
                        backups.map(backup => (
                            <tr key={backup.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">{new Date(backup.startedAt).toLocaleDateString()}</div>
                                    <div className="text-xs text-slate-500">{new Date(backup.startedAt).toLocaleTimeString()}</div>
                                </td>
                                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">{backup.type}</span></td>
                                <td className="px-4 py-3 text-slate-600">{(backup.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${backup.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' :
                                            backup.status === 'FAILED' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                                        }`}>
                                        {backup.status === 'SUCCESS' && <Check size={12} />}
                                        {backup.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <button
                                        onClick={() => handleDownload(backup.id, `backup_${new Date(backup.startedAt).getTime()}.sql`)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
                                    {showRestore ? (
                                        <button
                                            onClick={() => handleRestore(backup.id)}
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                            title="Restore"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(backup.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
            {renderTabs()}
            <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            {activeTab === 'MANUAL' && 'Manual Backup'}
                            {activeTab === 'SCHEDULE' && 'Backup Schedule'}
                            {activeTab === 'HISTORY' && 'Backup History'}
                            {activeTab === 'RESTORE' && 'System Restore'}
                        </h1>
                        <p className="text-slate-500 mt-1">Manage database backups and recovery points</p>
                    </div>
                    {loading && <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse"><RotateCcw className="animate-spin" size={16} /> Processing...</div>}
                </div>

                {message && (
                    <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                        {message.text}
                    </div>
                )}

                {activeTab === 'MANUAL' && renderManualTab()}
                {activeTab === 'SCHEDULE' && <div className="text-slate-500 italic">Scheduling automation coming soon... (Backend Scheduler Configured)</div>}
                {activeTab === 'HISTORY' && renderHistoryTable(false)}
                {activeTab === 'RESTORE' && (
                    <div className="space-y-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
                            <AlertTriangle className="shrink-0" size={20} />
                            <div>
                                <p className="font-bold">Warning: System Restore</p>
                                <p>Restoring a backup will overwrite all current data. This action cannot be undone. Please ensure you have a recent backup of the current state before proceeding.</p>
                            </div>
                        </div>
                        {renderHistoryTable(true)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackupSettings;
