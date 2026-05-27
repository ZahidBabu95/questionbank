import React, { useEffect, useState } from 'react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { FileDown, CheckCircle2, CloudLightning } from 'lucide-react';

const DownloadProgressOverlay = () => {
    const { isDownloadingPdf, downloadProgress, downloadStatus, uiLang } = useNexusEditor();
    const [shouldRender, setShouldRender] = useState(false);
    const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');

    useEffect(() => {
        if (isDownloadingPdf) {
            setShouldRender(true);
            // Small timeout to allow mount before transition animation
            const timer = setTimeout(() => {
                setAnimationClass('opacity-100 scale-100');
            }, 30);
            return () => clearTimeout(timer);
        } else {
            setAnimationClass('opacity-0 scale-95');
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // match transition duration
            return () => clearTimeout(timer);
        }
    }, [isDownloadingPdf]);

    if (!shouldRender) return null;

    const isComplete = downloadProgress >= 100;

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-md transition-opacity duration-300 ${isDownloadingPdf ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Custom Premium Styles */}
            <style>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-6px) rotate(3deg); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.4), 0 0 5px rgba(99, 102, 241, 0.2); }
                    50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.7), 0 0 10px rgba(99, 102, 241, 0.4); }
                }
                @keyframes shimmer-move {
                    0% { background-position: -200px 0; }
                    100% { background-position: 200px 0; }
                }
                .glow-bar {
                    animation: pulse-glow 2s infinite ease-in-out;
                }
                .float-icon {
                    animation: float-slow 4s infinite ease-in-out;
                }
                .shimmer-bg {
                    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%);
                    background-size: 200px 100%;
                    animation: shimmer-move 1.5s infinite linear;
                }
            `}</style>

            {/* Modal Container */}
            <div className={`w-[90%] max-w-sm bg-white/80 dark:bg-slate-900/85 border border-white/40 dark:border-slate-800/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 ease-out transform ${animationClass}`}>
                {/* Decorative Colorful Ambient Glow behind card */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex flex-col items-center text-center gap-5">
                    {/* Animated Icon Header */}
                    <div className="relative">
                        {isComplete ? (
                            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-100 transition-transform duration-500 ease-out">
                                <CheckCircle2 size={32} className="stroke-[2.5] animate-bounce" />
                            </div>
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.15)] float-icon">
                                <FileDown size={30} className="stroke-[2] text-indigo-500 dark:text-indigo-400" />
                                <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500"></span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Progress Text / Status */}
                    <div className="space-y-1 z-10">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">
                            {isComplete 
                                ? (uiLang === 'bn' ? 'পিডিএফ ডাউনলোড সম্পন্ন!' : 'PDF Download Complete!') 
                                : (uiLang === 'bn' ? 'পিডিএফ প্রস্তুত হচ্ছে' : 'Generating PDF')}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium min-h-[16px] max-w-[250px] mx-auto leading-relaxed">
                            {downloadStatus || (uiLang === 'bn' ? 'অনুগ্রহ করে অপেক্ষা করুন...' : 'Please wait...')}
                        </p>
                    </div>

                    {/* Percentage Counter */}
                    <div className="relative flex items-baseline justify-center font-bold text-indigo-600 dark:text-indigo-400">
                        <span className="text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums transition-all">
                            {downloadProgress}
                        </span>
                        <span className="text-lg md:text-xl font-bold ml-0.5">%</span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full space-y-2 z-10">
                        <div className="w-full h-3 bg-slate-100/90 dark:bg-slate-800/80 rounded-full overflow-hidden relative border border-slate-200/10 shadow-inner">
                            {/* Colorful Animated Progress Bar */}
                            <div 
                                style={{ width: `${downloadProgress}%` }}
                                className={`h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out relative shadow-[0_0_8px_rgba(99,102,241,0.4)] ${!isComplete ? 'glow-bar' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`}
                            >
                                {/* Shimmer Effect on Moving Progress Bar */}
                                {!isComplete && (
                                    <div className="absolute inset-0 shimmer-bg rounded-full opacity-60"></div>
                                )}
                            </div>
                        </div>

                        {/* Motivational Info / Hint */}
                        <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                            <CloudLightning size={10} className="text-amber-500" />
                            <span>
                                {uiLang === 'bn' 
                                    ? 'ডাউনলোড চলাকালীন ট্যাব বা অ্যাপ বন্ধ করবেন না' 
                                    : 'Do not close the editor during PDF generation'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadProgressOverlay;
