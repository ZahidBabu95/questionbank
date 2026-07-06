import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Camera, Upload, FileArchive, RefreshCw, AlertTriangle, 
    CheckCircle2, Play, Square, Loader2, ArrowLeft, Cpu, 
    Terminal, FileImage, ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';

const OmrScanner = () => {
    const [scanMode, setScanMode] = useState('UPLOAD'); // UPLOAD vs CAMERA
    const [dragging, setDragging] = useState(false);
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [logs, setLogs] = useState([
        { time: "00:00:00", text: "OMR Scanner Engine initialized.", type: "info" }
    ]);

    // Webcam states
    const [cameraActive, setCameraActive] = useState(false);
    const [scannedResult, setScannedResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const addLog = (text, type = "info") => {
        const time = new Date().toTimeString().split(' ')[0];
        setLogs(prev => [...prev, { time, text, type }]);
    };

    // Camera control
    const startCamera = async () => {
        setScannedResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment", width: 1280, height: 720 } 
            });
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setCameraActive(true);
            addLog("Webcam stream started successfully.", "success");
        } catch (err) {
            console.error("Camera access error:", err);
            addLog("Failed to access camera. Check permissions.", "error");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
        setIsScanning(false);
        addLog("Webcam stream stopped.", "info");
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Simulate scanning from Webcam
    const triggerScan = () => {
        if (isScanning) return;
        setIsScanning(true);
        setScannedResult(null);
        addLog("Scanning OMR sheet from camera viewport...", "info");

        // Step-by-step log updates
        setTimeout(() => addLog("Searching for 4 corner anchor marks...", "info"), 600);
        setTimeout(() => addLog("Anchors detected. Warping perspective to 800x1200...", "success"), 1200);
        setTimeout(() => addLog("Scanning QR Code...", "info"), 1800);
        setTimeout(() => addLog("QR Code successfully decoded: Exam ID: EXAM-1012, Student ID: STU-982105", "success"), 2400);
        setTimeout(() => addLog("Reading MCQ Bubbles: Option intensity scan completed.", "info"), 3000);
        
        setTimeout(() => {
            setIsScanning(false);
            setScannedResult({
                success: true,
                studentId: "STU-982105",
                studentName: "তাহমিদ হাসান রনি",
                roll: "১০০২৫",
                className: "১০ম শ্রেণী",
                score: "২৪/৩০",
                grade: "A",
                mcqCorrect: 24,
                mcqTotal: 30
            });
            addLog("OMR evaluation completed. Results saved in database.", "success");
        }, 3600);
    };

    // File Drag & Drop Handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragging(true);
        } else if (e.type === "dragleave") {
            setDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (fileList) => {
        const newFiles = Array.from(fileList);
        setFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach(f => {
            addLog(`File added: ${f.name} (${(f.size/1024).toFixed(1)} KB)`, "info");
        });
    };

    const clearFiles = () => {
        setFiles([]);
        addLog("File queue cleared.", "info");
    };

    const uploadAndProcess = async () => {
        if (files.length === 0) return;
        setUploading(true);
        addLog(`Starting OMR upload and processing pipeline for ${files.length} file(s)...`, "info");

        // Iterate files and mock process
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            addLog(`Uploading file: ${f.name}...`, "info");
            
            // Artificial delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, 1500));
            addLog(`OMR parsed successfully: ${f.name} -> Roll matched. Score graded.`, "success");
        }

        setUploading(false);
        addLog("All queue files processed successfully.", "success");
        setFiles([]);
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-slate-100 font-outfit pb-20 p-4 md:p-8 flex flex-col gap-6">
            
            {/* Top Bar */}
            <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="p-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">OMR Scanner</h1>
                            <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white tracking-wider flex items-center gap-1 shadow-sm">
                                <Cpu size={10} /> OpenCV Engine
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">ছবি আপলোড অথবা ব্রাউজার ক্যামেরা দিয়ে সরাসরি ওএমআর খাতা স্ক্যান করুন</p>
                    </div>
                </div>

                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button 
                        onClick={() => { setScanMode('UPLOAD'); stopCamera(); }}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            scanMode === 'UPLOAD' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Upload size={14} /> ZIP / Image Upload
                    </button>
                    <button 
                        onClick={() => { setScanMode('CAMERA'); }}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            scanMode === 'CAMERA' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Camera size={14} /> Live Webcam Scan
                    </button>
                </div>
            </div>

            {/* Main grid */}
            <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left panel: Scanning viewport / uploader */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Viewport Frame */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden min-h-[480px] flex flex-col items-center justify-center">
                        
                        {scanMode === 'UPLOAD' ? (
                            /* ZIP / Image Uploader */
                            <div 
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                                    dragging 
                                        ? 'border-emerald-500 bg-emerald-500/5' 
                                        : 'border-slate-700 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/40'
                                }`}
                            >
                                <input 
                                    type="file" 
                                    id="omr-file" 
                                    multiple 
                                    accept=".zip,image/*" 
                                    onChange={handleFileSelect}
                                    className="hidden" 
                                />
                                <label htmlFor="omr-file" className="flex flex-col items-center gap-3 cursor-pointer w-full text-center">
                                    <div className="w-16 h-16 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-center text-slate-400 shadow-md">
                                        <FileArchive size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Upload OMR sheets</h3>
                                        <p className="text-xs text-slate-400 mt-1">Drag and drop ZIP files or single scans here, or browse files</p>
                                    </div>
                                    <span className="text-[10px] bg-slate-800 px-3 py-1 rounded text-slate-500 mt-2 font-bold font-mono border border-slate-700">ZIP, JPG, PNG up to 50MB</span>
                                </label>
                            </div>
                        ) : (
                            /* Live Webcam Scanner */
                            <div className="w-full flex flex-col items-center gap-4">
                                <div className="relative border-4 border-slate-800 rounded-2xl w-full max-w-2xl aspect-[16/9] bg-black overflow-hidden flex items-center justify-center">
                                    
                                    {cameraActive ? (
                                        <video 
                                            ref={videoRef} 
                                            autoPlay 
                                            playsInline 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-center p-6 space-y-3">
                                            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                                <Camera size={24} />
                                            </div>
                                            <p className="text-xs text-slate-400">ক্যামেরা ভিউ দেখার জন্য স্টার্ট বাটন ক্লিক করুন</p>
                                        </div>
                                    )}

                                    {/* Overlay guides for OMR detection */}
                                    {cameraActive && (
                                        <div className="absolute inset-0 border-[30px] border-black/30 pointer-events-none flex items-center justify-center">
                                            <div className="w-[85%] h-[85%] border-2 border-emerald-500/50 border-dashed rounded relative flex items-center justify-center">
                                                {/* Corner guides */}
                                                <span className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-emerald-500"></span>
                                                <span className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-emerald-500"></span>
                                                <span className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-emerald-500"></span>
                                                <span className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-emerald-500"></span>
                                                
                                                {/* Scanning horizontal line */}
                                                {isScanning && (
                                                    <motion.div 
                                                        initial={{ y: "-100%" }}
                                                        animate={{ y: "100%" }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                        className="absolute left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_#10B981]"
                                                    />
                                                )}

                                                <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-slate-900/80 px-2.5 py-1 rounded border border-emerald-500/20 uppercase">
                                                    Align OMR Sheet Inside Box
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex gap-4">
                                    {!cameraActive ? (
                                        <button 
                                            onClick={startCamera}
                                            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all active:scale-95"
                                        >
                                            <Play size={14} /> Start Camera
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={triggerScan}
                                                disabled={isScanning}
                                                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                                            >
                                                {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} 
                                                {isScanning ? "Processing..." : "Scan Sheet"}
                                            </button>
                                            <button 
                                                onClick={stopCamera}
                                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all active:scale-95"
                                            >
                                                <Square size={14} /> Stop Camera
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Queued files display */}
                    {files.length > 0 && (
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-white text-xs">Queued Scans ({files.length})</h3>
                                <button onClick={clearFiles} className="text-xs text-rose-400 hover:underline">Clear Queue</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto custom-scrollbar">
                                {files.map((file, idx) => (
                                    <div key={idx} className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {file.type.includes('image') ? <FileImage className="text-emerald-500 shrink-0" size={16} /> : <FileArchive className="text-amber-500 shrink-0" size={16} />}
                                            <span className="text-xs font-bold text-slate-300 truncate">{file.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-bold">{(file.size/1024).toFixed(0)} KB</span>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={uploadAndProcess}
                                disabled={uploading}
                                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />} 
                                {uploading ? "Uploading & Grading..." : "Upload & Grade OMR Sheets"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right panel: Scanned Result & Live logs */}
                <div className="lg:col-span-4 flex flex-col gap-6 w-full">
                    
                    {/* Live Scanned Result Card */}
                    <AnimatePresence mode="wait">
                        {scannedResult && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-4 shadow-xl"
                            >
                                <div className="flex items-center gap-2 text-emerald-400 border-b border-emerald-500/20 pb-3">
                                    <ShieldCheck size={18} />
                                    <h3 className="font-bold text-xs uppercase tracking-wider">OMR Result Decoded</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Name:</span>
                                            <span className="font-bold text-white">{scannedResult.studentName}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Roll:</span>
                                            <span className="font-bold text-white">{scannedResult.roll}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Class:</span>
                                            <span className="font-bold text-white">{scannedResult.className}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Grade:</span>
                                            <span className="font-bold text-emerald-400 text-sm">{scannedResult.grade}</span>
                                        </div>
                                    </div>

                                    {/* Score display */}
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">MCQ Correct Answers</span>
                                            <span className="text-xs text-slate-200 font-semibold mt-0.5">{scannedResult.mcqCorrect} out of {scannedResult.mcqTotal}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] text-emerald-400 font-black block uppercase tracking-wide">Score</span>
                                            <span className="text-xl font-black text-emerald-400 leading-none">{scannedResult.score}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Terminal console logs */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 font-mono text-xs flex flex-col gap-3 h-[300px]">
                        <div className="flex items-center gap-2 text-slate-400 border-b border-slate-900 pb-2.5">
                            <Terminal size={14} className="text-emerald-500" />
                            <span className="font-bold text-[10px] uppercase tracking-wider">OMR Engine Console</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {logs.map((log, idx) => (
                                <div key={idx} className="flex gap-2.5 items-start">
                                    <span className="text-[10px] text-slate-600 font-bold shrink-0">{log.time}</span>
                                    <span className={`leading-relaxed text-[11px] ${
                                        log.type === 'success' ? 'text-emerald-400' : 
                                        log.type === 'error' ? 'text-rose-400 font-semibold' : 'text-slate-300'
                                    }`}>
                                        {log.type === 'error' && <AlertTriangle size={12} className="inline mr-1 text-rose-400 shrink-0" />}
                                        {log.type === 'success' && <CheckCircle2 size={12} className="inline mr-1 text-emerald-400 shrink-0" />}
                                        {log.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OmrScanner;
