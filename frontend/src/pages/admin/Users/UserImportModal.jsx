import React, { useState, useRef } from 'react';
import { Upload, Download, X, Check, AlertTriangle, FileText, Users, Loader2, RefreshCw } from 'lucide-react';
import userService from '../../../services/userService';

const ROLES = [
    { value: 'STUDENT',          label: 'শিক্ষার্থী (Student)'   },
    { value: 'TEACHER',          label: 'শিক্ষক (Teacher)'       },
    { value: 'INSTITUTE_ADMIN',  label: 'Institute Admin'         },
];

const UserImportModal = ({ onClose, onSuccess }) => {
    const [file,          setFile]          = useState(null);
    const [defaultRole,   setDefaultRole]   = useState('STUDENT');
    const [dragging,      setDragging]      = useState(false);
    const [loading,       setLoading]       = useState(false);
    const [result,        setResult]        = useState(null);
    const [error,         setError]         = useState('');
    const fileRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) validateAndSetFile(f);
    };

    const validateAndSetFile = (f) => {
        const name = f.name.toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            setError('শুধুমাত্র CSV বা Excel (.xlsx, .xls) ফাইল গ্রহণযোগ্য।');
            return;
        }
        setError('');
        setFile(f);
        setResult(null);
    };

    const handleImport = async () => {
        if (!file) { setError('একটি ফাইল select করুন।'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await userService.importUsers(file, defaultRole);
            if (res.success) {
                setResult(res.data);
                if (res.data.created > 0 && onSuccess) onSuccess();
            } else {
                setError(res.message || 'Import failed');
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try { await userService.downloadImportTemplate(); }
        catch (e) { setError('Template download failed'); }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        setError('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <Users size={18} />
                        </div>
                        <div>
                            <h2 className="font-black text-lg">Bulk User Import</h2>
                            <p className="text-indigo-200 text-xs">CSV বা Excel ফাইল দিয়ে একসাথে অনেক user যোগ করুন</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"><X size={16}/></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Template download */}
                    <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <div className="text-sm">
                            <p className="font-bold text-indigo-700">📋 Template দরকার?</p>
                            <p className="text-indigo-500 text-xs">Sample CSV ফাইল download করুন</p>
                        </div>
                        <button onClick={handleDownloadTemplate}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">
                            <Download size={12} /> Template
                        </button>
                    </div>

                    {/* Role selector */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Default Role</label>
                        <div className="flex gap-2 flex-wrap">
                            {ROLES.map(r => (
                                <button key={r.value} onClick={() => setDefaultRole(r.value)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${defaultRole === r.value ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* File drop zone */}
                    {!result && (
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-indigo-400 bg-indigo-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                                onChange={e => { if (e.target.files[0]) validateAndSetFile(e.target.files[0]); }} />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                        <FileText size={22} className="text-emerald-600" />
                                    </div>
                                    <p className="font-bold text-emerald-700">{file.name}</p>
                                    <p className="text-xs text-emerald-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    <button onClick={e => { e.stopPropagation(); handleReset(); }}
                                        className="mt-1 px-3 py-1 text-xs text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all">
                                        ✕ Remove
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <Upload size={32} className="opacity-40" />
                                    <p className="font-bold">ফাইল drag & drop করুন বা click করুন</p>
                                    <p className="text-xs">CSV, XLSX, XLS ফাইল সমর্থিত</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-emerald-700">{result.created}</p>
                                    <p className="text-xs text-emerald-500 font-bold">তৈরি হয়েছে</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-amber-700">{result.skipped}</p>
                                    <p className="text-xs text-amber-500 font-bold">Skip হয়েছে</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-slate-700">{result.total}</p>
                                    <p className="text-xs text-slate-500 font-bold">মোট Rows</p>
                                </div>
                            </div>
                            {result.defaultPassword && (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
                                    <span className="text-indigo-600 font-bold">Default Password:</span>
                                    <span className="font-mono ml-2 text-indigo-800 font-bold">{result.defaultPassword}</span>
                                    <p className="text-indigo-400 mt-1">সকল নতুন user কে এই পাসওয়ার্ড জানান।</p>
                                </div>
                            )}
                            {result.errors?.length > 0 && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl max-h-32 overflow-y-auto">
                                    <p className="text-xs font-bold text-rose-700 mb-2">Errors ({result.errors.length}):</p>
                                    {result.errors.map((e, i) => (
                                        <p key={i} className="text-[11px] text-rose-600">{e}</p>
                                    ))}
                                </div>
                            )}
                            <button onClick={handleReset}
                                className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                                <RefreshCw size={14}/> আরেকটি ফাইল Import করুন
                            </button>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!result && (
                        <div className="flex justify-end gap-3">
                            <button onClick={onClose}
                                className="px-4 py-2 text-slate-600 font-bold text-sm hover:text-slate-900 transition-colors">
                                বাতিল
                            </button>
                            <button onClick={handleImport} disabled={!file || loading}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm shadow-indigo-200 disabled:opacity-50">
                                {loading ? <><Loader2 size={14} className="animate-spin"/> Importing...</> : <><Upload size={14}/> Import করুন</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserImportModal;
