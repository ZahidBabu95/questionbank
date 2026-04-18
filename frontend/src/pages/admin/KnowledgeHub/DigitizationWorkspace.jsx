import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, Settings, Image as ImageIcon, X, AlertCircle, CheckCircle, Layers, PlayCircle } from 'lucide-react';
import { useUpload } from '../../../context/UploadContext';
import axios from '../../../utils/axios';

const DigitizationWorkspace = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { startUploadPipeline } = useUpload();
    const [uploadMode, setUploadMode] = useState('IMAGES'); // IMAGES or PDF
    const [files, setFiles] = useState([]);
    
    // Resume tracking
    const [resumeStatus, setResumeStatus] = useState(null);
    const [isFetchingStatus, setIsFetchingStatus] = useState(true);
    
    const fileInputRef = useRef(null);

    React.useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/pages/bulk/upload-status`);
                const data = res.data;
                if (data.uploadedCount > 0 && !data.isComplete) {
                    setResumeStatus(data);
                } else if (data.isComplete) {
                    setResumeStatus({ isComplete: true, ...data });
                }
            } catch (err) {
                console.error("Failed to fetch upload status", err);
            } finally {
                setIsFetchingStatus(false);
            }
        };
        checkStatus();
    }, [bookId]);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;
        
        // Validation for single PDF mode
        if (uploadMode === 'PDF' && selectedFiles.length > 1) {
            alert('Please select only 1 PDF file at a time.');
            return;
        }

        setFiles(prev => [...prev, ...selectedFiles].slice(0, uploadMode === 'PDF' ? 1 : 9999));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

    const handleUpload = () => {
        if (files.length === 0) return;
        let startIndex = resumeStatus && !resumeStatus.isComplete ? resumeStatus.uploadedCount : 0;
        
        // Dispatch to global upload manager
        startUploadPipeline(bookId, uploadMode, files, startIndex, () => {
             navigate(`/knowledge-hub/library`);
        });
        
        // Clear workspace
        setFiles([]);
        navigate(`/knowledge-hub/library`);
    };

    const getFilePreview = (file) => {
        if (file.type.startsWith('image/')) return URL.createObjectURL(file);
        return null;
    };

    return (
        <div className="p-4 md:p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <Link to="/knowledge-hub/library" className="inline-flex items-center gap-1 text-slate-400 hover:text-primary transition-colors text-sm font-semibold mb-2">
                        <ArrowLeft size={16} /> Back to Library
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <UploadCloud className="text-primary" size={26} />
                        Digitization Workspace
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Upload physical book scans or PDF chapters to process with AI and extract the Knowledge Index.
                    </p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-fit shrink-0">
                    <button 
                        onClick={() => { setUploadMode('IMAGES'); setFiles([]); }}
                        className={`flex-1 sm:flex-none justify-center px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 rounded-lg transition-all ${uploadMode === 'IMAGES' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ImageIcon size={16}/> <span className="whitespace-nowrap">Raw Images</span>
                    </button>
                    <button 
                        onClick={() => { setUploadMode('PDF'); setFiles([]); }}
                        className={`flex-1 sm:flex-none justify-center px-2 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 rounded-lg transition-all ${uploadMode === 'PDF' ? 'bg-white shadow-sm text-red-500' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText size={16}/> <span className="whitespace-nowrap">PDF Document</span>
                    </button>
                </div>
            </div>

            {/* Resume Banner */}
            {!isFetchingStatus && resumeStatus && !resumeStatus.isComplete && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-full text-orange-600"><AlertCircle size={20} /></div>
                        <div>
                            <h4 className="font-bold text-orange-800">Incomplete Upload Detected</h4>
                            <p className="text-sm text-orange-700">You previously uploaded {resumeStatus.uploadedCount} out of {resumeStatus.totalPages} pages. Select the exact same files to resume where you left off.</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Complete Banner */}
            {!isFetchingStatus && resumeStatus?.isComplete && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><CheckCircle size={20} /></div>
                        <div>
                            <h4 className="font-bold text-emerald-800">Knowledge Book Successfully Uploaded</h4>
                            <p className="text-sm text-emerald-700">All {resumeStatus.totalPages} pages are already present in the database. Please visit Proofreading.</p>
                        </div>
                    </div>
                    <Link to={`/knowledge-hub/proofreading/${bookId}`} className="shrink-0 bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 shadow flex items-center gap-2">
                        Start Proofreading <ArrowLeft className="rotate-180" size={16}/>
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Dropzone Area */}
                <div className="lg:col-span-2 space-y-4">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50/50 p-12 flex flex-col items-center justify-center min-h-[300px] transition-colors cursor-pointer group ${resumeStatus?.isComplete ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                            accept={uploadMode === 'IMAGES' ? 'image/*' : 'application/pdf'} 
                            className="hidden" 
                        />
                        
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <UploadCloud className="text-primary" size={32} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">
                            {uploadMode === 'IMAGES' ? 'Drop Scan Images Here' : 'Drop PDF Document Here'}
                        </h2>
                        <p className="text-slate-500 text-center max-w-sm font-medium text-sm mb-6">
                            Click to browse or drag and drop your {uploadMode === 'IMAGES' ? 'JPG/PNG' : 'PDF'} files here. High definition scans yield better OCR results.
                        </p>
                        <button className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/20 text-sm">
                            Browse Files
                        </button>
                    </div>

                    {/* Previews and Queue */}
                    {files.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Layers size={16} className="text-primary"/> 
                                    Upload Queue ({files.length} files)
                                </h3>
                                <button onClick={() => setFiles([])} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">Clear All</button>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {files.map((file, idx) => {
                                    const previewUrl = getFilePreview(file);
                                    return (
                                        <div key={idx} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50 aspect-[3/4] flex items-center justify-center">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 p-2">
                                                    <FileText size={24} className="text-slate-400" />
                                                    <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center">{file.name}</span>
                                                </div>
                                            )}
                                            
                                            
                                            <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={12} />
                                            </button>
                                            
                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] text-white font-medium truncate px-2">
                                                {file.name}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 pt-5 border-t border-slate-100">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                                        <p className="text-xs text-slate-500 font-medium whitespace-break-spaces">
                                            Pages will be queued for upload to Cloudflare R2.<br/>
                                            You can navigate away while the upload runs in the background.
                                        </p>
                                        <button onClick={handleUpload} className="w-full sm:w-auto bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shrink-0">
                                            <UploadCloud size={16}/> Push {files.length} pages to Background Upload
                                        </button>
                                    </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Processing Pipeline Info Sidebar */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><UploadCloud size={20} /></div>
                    <h3 className="font-bold text-slate-800">1. Raw Upload</h3>
                    <p className="text-sm text-slate-500 font-medium">Images are securely uploaded and stored in the R2 Bucket for fast retrieval.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Settings size={20} /></div>
                    <h3 className="font-bold text-slate-800">2. AI OCR Processing</h3>
                    <p className="text-sm text-slate-500 font-medium">Vision AI extracts the table of contents and internal page structures.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><FileText size={20} /></div>
                    <h3 className="font-bold text-slate-800">3. Create Tree B</h3>
                    <p className="text-sm text-slate-500 font-medium">The physical book's hierarchy is formed as Knowledge Index for mapping.</p>
                </div>
                </div>
            </div>

        </div>
    );
};

export default DigitizationWorkspace;
