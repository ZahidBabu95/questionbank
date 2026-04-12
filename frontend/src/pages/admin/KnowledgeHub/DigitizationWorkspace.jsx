import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, Settings, Image as ImageIcon, X, AlertCircle, CheckCircle, Layers } from 'lucide-react';
import axios from '../../../utils/axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Configure the worker for pdf.js safely using Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DigitizationWorkspace = () => {
    const { bookId } = useParams();
    const [uploadMode, setUploadMode] = useState('IMAGES'); // IMAGES or PDF
    const [files, setFiles] = useState([]);
    
    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [isExtractingPdf, setIsExtractingPdf] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
    
    const fileInputRef = useRef(null);

    const extractImagesFromPdf = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const totalPages = pdf.numPages;
        const images = [];

        for (let i = 1; i <= totalPages; i++) {
            setProgress(Math.round((i / totalPages) * 100)); // Show extraction progress
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High res scale for OCR
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            const imageFile = new File([blob], `${file.name.replace('.pdf', '')}_p${i}.jpg`, { type: 'image/jpeg' });
            images.push(imageFile);
        }
        return images;
    };

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        const newFiles = [];
        setUploadStatus(null);
        setIsExtractingPdf(true);
        setProgress(0);

        for (let file of selectedFiles) {
            if (file.type === 'application/pdf') {
                try {
                    const extractedImages = await extractImagesFromPdf(file);
                    newFiles.push(...extractedImages);
                } catch (error) {
                    console.error("Failed to extract PDF", error);
                    alert("Failed to read PDF file.");
                }
            } else {
                newFiles.push(file);
            }
        }
        
        setIsExtractingPdf(false);
        setFiles(prev => [...prev, ...newFiles]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        
        setIsUploading(true);
        setProgress(0);
        setUploadStatus(null);

        const batchSize = 5; // Upload 5 pages at a time to avoid timeout
        let uploadedCount = 0;
        let hasError = false;

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const formData = new FormData();
            batch.forEach(file => {
                formData.append('files', file);
            });
            formData.append('startPage', uploadedCount + 1);

            try {
                const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/bulk`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (res.data.success) {
                    uploadedCount += batch.length;
                    // Update progress based on completed batches
                    setProgress(Math.round((uploadedCount / files.length) * 100));
                }
            } catch (error) {
                console.error("Batch upload failed", error);
                hasError = true;
                break; // Stop on first error
            }
        }
        
        setIsUploading(false);
        if (hasError) {
            setUploadStatus('error');
        } else {
            setUploadStatus('success');
            // Removed the setTimeout so the success UI stays visible with the redirect button!
        }
    };

    const getFilePreview = (file) => {
        if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file);
        }
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
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit shrink-0">
                    <button 
                        onClick={() => { setUploadMode('IMAGES'); setFiles([]); }}
                        className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-all ${uploadMode === 'IMAGES' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ImageIcon size={16}/> Raw Images
                    </button>
                    <button 
                        onClick={() => { setUploadMode('PDF'); setFiles([]); }}
                        className={`px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-lg transition-all ${uploadMode === 'PDF' ? 'bg-white shadow-sm text-red-500' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText size={16}/> PDF Document
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Dropzone Area */}
                <div className="lg:col-span-2 space-y-4">
                    <div 
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`bg-white rounded-2xl border-2 border-dashed ${isUploading ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50/50'} p-12 flex flex-col items-center justify-center min-h-[300px] transition-colors cursor-pointer group`}
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
                        <button disabled={isUploading} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/20 text-sm">
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
                                <button onClick={() => setFiles([])} disabled={isUploading} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">Clear All</button>
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
                                            
                                            {!isUploading && (
                                                <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={12} />
                                                </button>
                                            )}
                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] text-white font-medium truncate px-2">
                                                {file.name}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Upload Action Panel */}
                            <div className="mt-5 pt-5 border-t border-slate-100">
                                {isUploading ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-slate-700">
                                            <span>
                                                Uploading pages to R2 in batches...
                                            </span>
                                            <span className="text-primary">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ) : uploadStatus === 'success' ? (
                                    <div className="bg-emerald-50 p-4 rounded-xl flex flex-col items-center justify-center gap-3 text-sm border border-emerald-100">
                                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                                            <CheckCircle size={22} className="text-emerald-500" /> Upload Successful!
                                        </div>
                                        <p className="text-emerald-600 font-medium text-center">Files have been securely stored in the R2 bucket and queued as Knowledge Pages.</p>
                                        <Link to={`/knowledge-hub/proofreading/${bookId}`}>
                                            <button className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-bold transition-all transform hover:scale-105 active:scale-95">
                                                Go to Proofreading Workspace
                                            </button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500 font-medium">Pages will be numerically ordered based on file sequence.</p>
                                        <button onClick={handleUpload} className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-colors flex items-center gap-2">
                                            <UploadCloud size={16}/> Start Upload Pipeline
                                        </button>
                                    </div>
                                )}
                                {uploadStatus === 'error' && (
                                    <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold border border-red-100">
                                        <AlertCircle size={18} /> Upload failed. Ensure file sizes are under limits and try again.
                                    </div>
                                )}
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

            {/* PDF Extraction Overlay */}
            {isExtractingPdf && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <h3 className="text-xl font-bold text-slate-800 text-center">Parsing PDF Document</h3>
                        <p className="text-center text-slate-500 font-medium text-sm">We are converting the PDF into individual high-definition images for AI OCR compatibility.</p>
                        <div className="w-full mt-2">
                            <div className="flex justify-between text-xs font-bold text-indigo-700 mb-1">
                                <span>Extracting pages...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitizationWorkspace;
