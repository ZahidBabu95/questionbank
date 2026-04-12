import React, { useState, useEffect } from 'react';
import { Paperclip, Link, Trash2, Download, MoveVertical, X, Upload, FileText, File, Video, ExternalLink, RefreshCw } from 'lucide-react';
import lectureService from '../../../../services/lectureService';

const AttachmentPanel = ({ lectureId, isOpen, onClose }) => {
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);

    const [linkData, setLinkData] = useState({ title: '', url: '', description: '' });

    useEffect(() => {
        if (lectureId && isOpen) {
            fetchAttachments();
        }
    }, [lectureId, isOpen]);

    const fetchAttachments = async () => {
        setLoading(true);
        try {
            const data = await lectureService.getAttachments(lectureId);
            setAttachments(data);
        } catch (err) {
            console.error('Failed to fetch attachments:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lectureId', lectureId);
        formData.append('title', file.name);
        formData.append('description', '');

        try {
            await lectureService.uploadAttachment(formData);
            fetchAttachments();
        } catch (err) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleAddLink = async (e) => {
        e.preventDefault();
        try {
            await lectureService.addExternalLink({
                lectureId,
                ...linkData
            });
            setShowLinkForm(false);
            setLinkData({ title: '', url: '', description: '' });
            fetchAttachments();
        } catch (err) {
            alert('Failed to add link');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attachment?')) return;
        try {
            await lectureService.deleteAttachment(id);
            setAttachments(attachments.filter(a => a.id !== id));
        } catch (err) {
            alert('Delete failed');
        }
    };

    const getIcon = (type) => {
        if (type === 'URL') return <ExternalLink size={18} className="text-blue-500" />;
        if (type?.includes('pdf')) return <FileText size={18} className="text-red-500" />;
        if (type?.includes('video') || type?.includes('youtube')) return <Video size={18} className="text-purple-500" />;
        return <File size={18} className="text-slate-400" />;
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Paperclip size={18} className="text-secondary" />
                    <span>Attachments</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition">
                    <X size={20} className="text-slate-500" />
                </button>
            </div>

            <div className="p-4 flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700 transition">
                    <Upload size={14} />
                    <span>Upload</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <button
                    onClick={() => setShowLinkForm(!showLinkForm)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition"
                >
                    <Link size={14} />
                    <span>Add Link</span>
                </button>
            </div>

            {showLinkForm && (
                <form onSubmit={handleAddLink} className="p-4 bg-indigo-50 border-y border-indigo-100 space-y-3">
                    <input
                        type="text"
                        placeholder="Link Title"
                        value={linkData.title}
                        onChange={e => setLinkData({ ...linkData, title: e.target.value })}
                        className="w-full p-2 text-xs border border-indigo-200 rounded outline-none focus:ring-1 ring-indigo-500"
                        required
                    />
                    <input
                        type="url"
                        placeholder="URL (https://...)"
                        value={linkData.url}
                        onChange={e => setLinkData({ ...linkData, url: e.target.value })}
                        className="w-full p-2 text-xs border border-indigo-200 rounded outline-none focus:ring-1 ring-indigo-500"
                        required
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-1.5 bg-secondary text-white text-[10px] font-bold rounded">Add</button>
                        <button type="button" onClick={() => setShowLinkForm(false)} className="flex-1 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">Cancel</button>
                    </div>
                </form>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {uploading && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 animate-pulse">
                        <RefreshCw size={18} className="text-indigo-500 animate-spin" />
                        <span className="text-xs font-medium text-slate-500">Uploading file...</span>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-10 text-slate-400 text-xs">Loading resources...</div>
                ) : attachments.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <div className="mb-2 flex justify-center"><Paperclip size={32} strokeWidth={1} /></div>
                        <p className="text-xs">No attachments added yet.</p>
                    </div>
                ) : (
                    attachments.map((item) => (
                        <div key={item.id} className="group relative flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all">
                            <div className="flex-shrink-0 w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                {getIcon(item.fileType)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={item.title}>{item.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {item.fileType === 'URL' ? 'External Link' : formatSize(item.fileSize)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-1.5 text-slate-400 hover:text-secondary hover:bg-indigo-50 rounded-lg transition" title="Download/Open">
                                    <Download size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remove"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 text-center">
                    Attachment module for Lecture Sheet Builder
                </div>
            </div>
        </div>
    );
};

export default AttachmentPanel;
