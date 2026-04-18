import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from '../utils/axios';
import { X, UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
    const [uploadTasks, setUploadTasks] = useState([]);
    const [isWidgetMinimized, setIsWidgetMinimized] = useState(false);

    // Dynamic chunk processor that handles both Image File Arrays and native PDF files
    const startUploadPipeline = useCallback(async (bookId, uploadMode, files, resumeFromIndex = 0, onComplete) => {
        const taskId = Date.now().toString();
        setIsWidgetMinimized(false);

        // Basic validation
        if (!files || files.length === 0) return;

        let totalExpectedPages = 0;
        let pdfDocument = null;

        if (uploadMode === 'PDF') {
            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            const typedArray = new Uint8Array(arrayBuffer);
            pdfDocument = await pdfjsLib.getDocument(typedArray).promise;
            totalExpectedPages = pdfDocument.numPages;
        } else {
            totalExpectedPages = files.length + resumeFromIndex;
        }

        setUploadTasks(prev => [...prev, {
            id: taskId,
            bookId,
            totalFiles: totalExpectedPages,
            completed: resumeFromIndex,
            status: 'preparing', 
            errorText: null
        }]);

        try {
            // STEP 1: Register session with backend to ensure tracking
            await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/bulk/register-session`, { totalPages: totalExpectedPages });

            // STEP 2: Process in Chunks of 5 to protect Memory & Network
            const CHUNK_SIZE = 5;
            let currentCompleted = resumeFromIndex;

            setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'uploading' } : t));

            for (let i = resumeFromIndex; i < totalExpectedPages; i += CHUNK_SIZE) {
                const chunkLimit = Math.min(i + CHUNK_SIZE, totalExpectedPages);
                const chunkFiles = [];

                // 2A: Generate the Chunk Files (Canvas extraction for PDF, Array slice for Images)
                if (uploadMode === 'PDF') {
                    for (let pageNum = i + 1; pageNum <= chunkLimit; pageNum++) {
                        const page = await pdfDocument.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({ canvasContext: context, viewport }).promise;
                        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                        const imageFile = new File([blob], `${files[0].name.replace('.pdf', '')}_p${pageNum}.jpg`, { type: 'image/jpeg' });
                        chunkFiles.push(imageFile);
                        
                        // Explicitly clear memory
                        canvas.width = 0;
                        canvas.height = 0;
                    }
                } else {
                    // Raw images (offset by resume index)
                    const sliceStart = i - resumeFromIndex;
                    chunkFiles.push(...files.slice(sliceStart, sliceStart + CHUNK_SIZE));
                }

                // 2B: Prepare R2 URLs for this Chunk
                const filesData = chunkFiles.map(f => ({ name: f.name, type: f.type }));
                const prepRes = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/bulk/prepare-upload`, filesData);
                if (!prepRes.data.success) throw new Error(prepRes.data.error || "Failed to prepare URLs");
                
                const urlsData = prepRes.data.urls;

                // 2C: Upload directly to R2 in parallel
                await Promise.all(chunkFiles.map(async (file) => {
                    const urlInfo = urlsData.find(u => u.originalFileName === file.name);
                    if (!urlInfo) throw new Error(`URL missing for ${file.name}`);

                    const response = await fetch(urlInfo.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type }});
                    if (!response.ok) throw new Error(`R2 Upload Error: ${response.status}`);
                }));

                // 2D: Finalize this Chunk in the DB
                const finalizePayload = urlsData.map(u => ({ originalName: u.originalFileName, publicUrl: u.publicUrl }));
                const finalRes = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/bulk/finalize-upload`, finalizePayload);
                if (!finalRes.data.success) throw new Error("Failed to finalize chunk.");

                // 2E: Update UI
                currentCompleted += chunkFiles.length;
                setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: currentCompleted } : t));
            }

            // SUCCESS!
            setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success' } : t));
            if (onComplete) onComplete();
            setTimeout(() => dismissTask(taskId), 5000);

        } catch (error) {
            console.error("Resumable Upload pipeline failed", error);
            setUploadTasks(prev => prev.map(t => t.id === taskId ? { 
                ...t, 
                status: 'error', 
                errorText: error.message || 'Network disconnected' 
            } : t));
        }
    }, []);

    // Prevent data loss if tab is closed
    React.useEffect(() => {
        const handleBeforeUnload = (e) => {
            const hasActiveUploads = uploadTasks.some(t => t.status === 'uploading' || t.status === 'preparing');
            if (hasActiveUploads) {
                e.preventDefault();
                e.returnValue = ''; 
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [uploadTasks]);

    const dismissTask = (taskId) => setUploadTasks(prev => prev.filter(t => t.id !== taskId));

    return (
        <UploadContext.Provider value={{ startUploadPipeline, uploadTasks }}>
            {children}
            {uploadTasks.length > 0 && (
                <div className={`fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden transition-all duration-300 ${isWidgetMinimized ? 'h-12' : 'h-auto max-h-96'}`}>
                    <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setIsWidgetMinimized(!isWidgetMinimized)}>
                        <div className="flex items-center gap-2 text-white font-medium text-sm">
                            <UploadCloud size={18} />
                            Uploads ({uploadTasks.filter(t => t.status !== 'success' && t.status !== 'error').length} active)
                        </div>
                        <button className="text-white/80 hover:text-white transition" aria-label="Toggle">{isWidgetMinimized ? "▲" : "▼"}</button>
                    </div>

                    {!isWidgetMinimized && (
                        <div className="overflow-y-auto max-h-80 bg-gray-50 p-2 space-y-2">
                            {uploadTasks.map(task => (
                                <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">Book ID: {task.bookId.split('-')[0]}...</span>
                                        {(task.status === 'success' || task.status === 'error') && (
                                            <button onClick={() => dismissTask(task.id)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                        )}
                                    </div>

                                    {task.status === 'preparing' && <div className="text-xs text-indigo-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Preparing Streaming Session...</div>}
                                    {task.status === 'success' && <div className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Upload Complete</div>}
                                    {task.status === 'error' && <div className="text-xs text-red-600 flex items-start gap-1"><AlertCircle size={12} className="mt-0.5 shrink-0" /> <span className="line-clamp-2" title={task.errorText}>{task.errorText}</span></div>}
                                    
                                    {task.status === 'uploading' && (
                                        <>
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>{task.completed} of {task.totalFiles} uploaded</span>
                                                <span>{Math.round((task.completed / task.totalFiles) * 100)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden">
                                                <div className="bg-indigo-500 h-1.5 transition-all duration-300" style={{ width: `${(task.completed / task.totalFiles) * 100}%` }}></div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </UploadContext.Provider>
    );
};

export const useUpload = () => useContext(UploadContext);
