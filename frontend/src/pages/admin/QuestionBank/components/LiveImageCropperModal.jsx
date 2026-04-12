import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Crop as CropIcon, UploadCloud, Check, RefreshCw, Loader, Settings } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const LiveImageCropperModal = ({ isOpen, onClose, sourceImage, pdfUrl, isPdf, pageNumber, onSave, onAdvancedEdit }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const fileInputRef = useRef(null);
    const imgRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPdfError(null);
            if (sourceImage && !imageSrc) {
                // Fetch the image via backend proxy (bypasses R2 CORS) then store as blob: URL
                const loadAsBlob = async () => {
                    try {
                        if (sourceImage.startsWith('blob:') || sourceImage.startsWith('data:')) {
                            setImageSrc(sourceImage);
                            return;
                        }
                        // Route through backend proxy so R2 CORS is never an issue
                        const proxyUrl = `/api/v1/knowledge-hub/proxy-image?url=${encodeURIComponent(sourceImage)}`;
                        const res = await fetch(proxyUrl, {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                        });
                        if (!res.ok) throw new Error(`Proxy ${res.status}`);
                        const blob = await res.blob();
                        setImageSrc(URL.createObjectURL(blob));
                    } catch {
                        // Fallback: load directly (canvas may taint but image still shows)
                        setImageSrc(sourceImage);
                    }
                };
                loadAsBlob();
            } else if (isPdf && pdfUrl && !imageSrc) {
                const loadPdfPage = async () => {
                    setIsLoadingPdf(true);
                    setPdfError(null);
                    try {
                        const loadingTask = pdfjsLib.getDocument({
                            url: pdfUrl,
                            httpHeaders: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`
                            }
                        });
                        const pdf = await loadingTask.promise;
                        const targetPageNum = Number(pageNumber) || 1;
                        const validPageNum = Math.min(Math.max(1, targetPageNum), pdf.numPages);
                        const page = await pdf.getPage(validPageNum);
                        
                        // 2.5 scale for very high-res zoomable crop
                        const viewport = page.getViewport({ scale: 2.5 }); 
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        if (!ctx) throw new Error("Canvas context not found");
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        
                        await page.render({ canvasContext: ctx, viewport }).promise;
                        // PDF renders to data: URL — always safe
                        setImageSrc(canvas.toDataURL('image/jpeg', 0.95));
                    } catch (e) {
                        console.error("Failed to render PDF page:", e);
                        setPdfError(e.message || "PDF প্রসেসিং এ সমস্যা হয়েছে");
                    } finally {
                        setIsLoadingPdf(false);
                    }
                };
                loadPdfPage();
            }
            setCrop(undefined);
            setCompletedCrop(null);
        } else {
            setImageSrc(null);
        }
    }, [isOpen, sourceImage, isPdf, pdfUrl, pageNumber]);

    useEffect(() => {
        const handlePaste = (e) => {
            if (!isOpen) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    const url = URL.createObjectURL(file);
                    setImageSrc(url);
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isOpen]);

    const handleCustomUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageSrc(URL.createObjectURL(file));
        }
    };

    // ── Backend-proxied fetch — bypasses R2 CORS restriction ──────────────────
    // External CDN (R2) URLs cannot be fetched directly due to CORS.
    // We route them through /api/v1/knowledge-hub/proxy-image which adds CORS headers.
    const toProxiedUrl = (url) => {
        if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;
        return `/api/v1/knowledge-hub/proxy-image?url=${encodeURIComponent(url)}`;
    };

    const fetchAsBlob = async (url) => {
        // blob: and data: URLs are already local — no CORS issue
        if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;
        // Route external URLs through the backend proxy
        const proxyUrl = toProxiedUrl(url);
        const res = await fetch(proxyUrl, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    };

    const getCroppedImg = async () => {
        const image = imgRef.current;
        if (!image || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) return null;

        // If the current src is still a remote URL, re-fetch it as a local blob first
        let safeSrc = imageSrc;
        if (imageSrc && !imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
            safeSrc = await fetchAsBlob(imageSrc);
        }

        // Draw on an off-screen image using the safe blob src
        const offscreenImg = await new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = safeSrc;
        });

        const canvas = document.createElement('canvas');
        const scaleX = offscreenImg.naturalWidth / image.width;
        const scaleY = offscreenImg.naturalHeight / image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        ctx.drawImage(
            offscreenImg,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0, 0,
            canvas.width,
            canvas.height
        );
        return canvas.toDataURL('image/jpeg', 0.95);
    };

    const handleSave = async () => {
        if (!imageSrc || !completedCrop || completedCrop.width === 0) return;
        setIsProcessing(true);
        try {
            const base64Image = await getCroppedImg();
            if(!base64Image) { setIsProcessing(false); return; }
            
            const res = await fetch(base64Image);
            const blob = await res.blob();
            const compressedFile = await imageCompression(blob, {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
                fileType: 'image/jpeg'
            });
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onloadend = () => {
                onSave(reader.result);
                setIsProcessing(false);
                onClose();
            };
        } catch (e) {
            console.error('Crop failed', e);
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col h-[90vh] overflow-hidden">
                
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <CropIcon size={18} className="text-emerald-500" /> 
                            ফ্রি-স্টাইল ইমেজ ক্রপিং
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">মাউস দিয়ে বক্স এঁকে যেকোনো জায়গা সিলেক্ট করুন (স্ক্রল করে নিচে/উপরে যেতে পারেন)</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-900 flex flex-col items-center justify-start p-4 custom-scrollbar">
                    {isLoadingPdf ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 my-auto">
                            <Loader size={48} className="animate-spin text-emerald-500 mb-4" />
                            <h3 className="font-bold text-white">PDF প্রসেস হচ্ছে...</h3>
                            <p className="text-sm">এই পেজটি মেমরিতে রেন্ডার করা হচ্ছে (পৃষ্ঠা: {pageNumber || 1})</p>
                        </div>
                    ) : !imageSrc ? (
                        <div className="h-full w-full max-w-lg flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-700 m-auto rounded-2xl bg-slate-800 text-white">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${pdfError ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {pdfError ? <X size={32} /> : <UploadCloud size={32} />}
                            </div>
                            <h3 className="text-sm font-bold mb-2">{pdfError ? 'PDF রেন্ডার করতে সমস্যা হয়েছে' : 'কোনো সোর্স ছবি পাওয়া যায়নি'}</h3>
                            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                                {pdfError ? (
                                    <>ত্রুটি: <span className="font-mono bg-slate-900 px-1 rounded">{pdfError}</span><br/>আপনি চাইলে স্ক্রিনশট নিয়ে <strong>Ctrl+V / Cmd+V</strong> চেপে পেস্ট করতে পারেন।</>
                                ) : (
                                    <>আপনি চাইলে ব্রাউজারে অন্য ট্যাব থেকে স্ক্রিনশট নিয়ে এখানে <strong>Ctrl+V / Cmd+V</strong> চেপে পেস্ট করতে পারেন।</>
                                )}
                            </p>
                            <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-slate-700 border border-slate-600 shadow-sm text-sm font-bold text-white rounded-xl hover:bg-slate-600 transition-all">
                                ছবি আপলোড করুন
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleCustomUpload} accept="image/*" className="hidden" />
                        </div>
                    ) : (
                        <div className="m-auto rounded-lg shadow-2xl border border-slate-700/50"
                             onWheel={(e) => {
                                 if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                     e.preventDefault();
                                     setZoom(prev => Math.min(Math.max(0.2, prev - e.deltaY * 0.002), 3));
                                 }
                             }}
                             style={{ 
                                transform: `scale(${zoom})`, 
                                transformOrigin: 'top center',
                                transition: 'transform 0.1s ease-out'
                             }}>
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                className="bg-black"
                            >
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="Source Document"
                                    style={{ display: 'block', maxWidth: '100%', maxHeight: 'none' }}
                                />
                            </ReactCrop>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input type="file" ref={fileInputRef} onChange={handleCustomUpload} accept="image/*" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5 shrink-0">
                            <RefreshCw size={14} /> ছবি বদলান
                        </button>
                        
                        {imageSrc && (
                            <div className="flex items-center gap-2 flex-1 sm:w-48 ml-4">
                                <span className="text-[10px] font-bold text-slate-400">জুম:</span>
                                <input 
                                    type="range" min="0.2" max="3" step="0.1" 
                                    value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <span className="text-[10px] font-mono font-bold text-slate-500 w-8">{(zoom * 100).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                            বাতিল
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={!imageSrc || isProcessing || !completedCrop || completedCrop.width === 0}
                            className={`px-6 py-2 rounded-xl text-sm font-bold text-white shadow-sm flex items-center gap-2 transition-all ${
                                !imageSrc || isProcessing || !completedCrop || completedCrop.width === 0 ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-200 hover:shadow-md active:scale-95'
                            }`}>
                            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                            {completedCrop?.width > 0 ? 'ক্রপ সেভ করুন' : 'অংশ সিলেক্ট করুন'}
                        </button>

                        {onAdvancedEdit && (
                            <button 
                                onClick={async () => {
                                    if (!imageSrc || !completedCrop || completedCrop.width === 0) return;
                                    setIsProcessing(true);
                                    try {
                                        const base64Image = await getCroppedImg();
                                        if(!base64Image) { setIsProcessing(false); return; }
                                        onAdvancedEdit(base64Image);
                                        setIsProcessing(false);
                                    } catch (e) {
                                        console.error('Advanced edit failed', e);
                                        setIsProcessing(false);
                                    }
                                }} 
                                disabled={!imageSrc || isProcessing || !completedCrop || completedCrop.width === 0}
                                className={`px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm flex items-center gap-2 transition-all ml-2 ${
                                    !imageSrc || isProcessing || !completedCrop || completedCrop.width === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-95'
                                }`}>
                                <Settings size={16} />
                                অ্যাডভান্স ক্রপ এডিট
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LiveImageCropperModal;
