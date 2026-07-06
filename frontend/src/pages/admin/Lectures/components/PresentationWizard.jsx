import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Settings, Palette, Maximize2, Minimize2, ChevronRight, ChevronLeft, Volume2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const THEMES = [
    { value: 'dracula', label: 'Dracula (Dark)' },
    { value: 'black', label: 'Midnight Black' },
    { value: 'sky', label: 'Sky Blue' },
    { value: 'serif', label: 'Classic Serif' },
    { value: 'solarized', label: 'Solarized Warm' },
    { value: 'league', label: 'League Academic' },
    { value: 'blood', label: 'Blood Red' }
];

const TRANSITIONS = [
    { value: 'slide', label: 'Slide' },
    { value: 'fade', label: 'Fade' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'convex', label: 'Convex' },
    { value: 'concave', label: 'Concave' },
    { value: 'none', label: 'None' }
];

const PresentationWizard = ({ isOpen, onClose, htmlContent, title = 'Lecture Presentation' }) => {
    const [theme, setTheme] = useState('dracula');
    const [transition, setTransition] = useState('slide');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const iframeRef = useRef(null);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error("Error enabling fullscreen:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            });
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const parseSlides = (rawHtml) => {
        if (!rawHtml) return '<section><h2>No Content Found</h2></section>';
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawHtml, 'text/html');
            const nodes = Array.from(doc.body.childNodes);

            let slides = [];
            let currentMainSlide = null;
            let currentSubslides = [];

            const finalizeMainSlide = () => {
                if (currentMainSlide) {
                    if (currentSubslides.length > 0) {
                        const subslidesHtml = currentSubslides.map(sub => `<section>${sub}</section>`).join('\n');
                        slides.push(`<section>${subslidesHtml}</section>`);
                    } else {
                        slides.push(`<section>${currentMainSlide}</section>`);
                    }
                }
                currentMainSlide = null;
                currentSubslides = [];
            };

            nodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.tagName.toLowerCase();

                    // If it is an h3 section header
                    if (tagName === 'h3') {
                        finalizeMainSlide();
                        const titleText = node.innerHTML || node.textContent;
                        currentMainSlide = `
                            <h2 style="color: #818cf8; font-weight: 800; font-family: 'Hind Siliguri', 'Outfit', sans-serif;">${titleText}</h2>
                            <div style="margin-top: 40px; font-size: 0.55em; color: #a1a1aa; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                                <span>📖 কী-বোর্ডের <strong>Down Arrow (↓)</strong> টিপুন পরবর্তী অংশ দেখতে</span>
                            </div>
                        `;
                        currentSubslides.push(currentMainSlide);
                    } else {
                        let contentHtml = '';

                        // Format question block
                        if (node.getAttribute('data-type') === 'question-block') {
                            const qText = node.getAttribute('questiontext') || '';
                            const qType = node.getAttribute('type') || 'MCQ';
                            const stimulus = node.getAttribute('stimulus') || '';
                            const explanation = node.getAttribute('explanation') || '';
                            const marks = node.getAttribute('marks') || '1';
                            
                            let options = [];
                            try {
                                options = JSON.parse(node.getAttribute('data-options') || '[]');
                            } catch (e) {}

                            let optionsHtml = '';
                            if (qType === 'MCQ' && options.length > 0) {
                                optionsHtml = `
                                    <div class="options-grid">
                                        ${options.map((opt, i) => {
                                            const prefix = String.fromCharCode(65 + i);
                                            const isCorrect = opt.isCorrect ? 'style="border-color: #10b981; background: rgba(16, 185, 129, 0.05);"' : '';
                                            return `
                                                <div class="option-item" ${isCorrect}>
                                                    <span style="font-weight: bold; color: #818cf8; margin-right: 8px;">${prefix}.</span>
                                                    <span>${opt.optionText || opt.text || ''}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                `;
                            }

                            const stimulusHtml = stimulus ? `<div class="stimulus-box">${stimulus}</div>` : '';
                            const explanationHtml = explanation ? `<div class="fragment explanation-box"><strong>ব্যাখ্যা:</strong> ${explanation}</div>` : '';

                            contentHtml = `
                                <div class="question-box">
                                    <div class="q-badge-row">
                                        <span class="q-badge">${qType} (${marks} Marks)</span>
                                    </div>
                                    ${stimulusHtml}
                                    <div class="q-title">${qText}</div>
                                    ${optionsHtml}
                                    ${explanationHtml}
                                </div>
                            `;
                        } else {
                            // Standard paragraph / headings
                            contentHtml = node.outerHTML;
                        }

                        if (!currentMainSlide) {
                            currentMainSlide = `<h2 style="color: #818cf8; font-family: 'Hind Siliguri', sans-serif;">ভূমিকা</h2>`;
                            currentSubslides.push(currentMainSlide);
                        }

                        currentSubslides.push(`
                            <div class="slide-content-wrapper">
                                ${contentHtml}
                            </div>
                        `);
                    }
                } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                    if (!currentMainSlide) {
                        currentMainSlide = `<h2 style="color: #818cf8; font-family: 'Hind Siliguri', sans-serif;">ভূমিকা</h2>`;
                        currentSubslides.push(currentMainSlide);
                    }
                    currentSubslides.push(`
                        <div class="slide-content-wrapper">
                            <p>${node.textContent}</p>
                        </div>
                    `);
                }
            });

            finalizeMainSlide();

            if (slides.length === 0) {
                slides.push(`<section><h2>কোনো কন্টেন্ট পাওয়া যায়নি</h2></section>`);
            }

            return slides.join('\n');
        } catch (err) {
            console.error("Error parsing HTML to slides:", err);
            return `<section><h2>কনটেন্ট পার্স করতে সমস্যা হয়েছে</h2></section>`;
        }
    };

    const slidesHtml = parseSlides(htmlContent);

    // Dynamic srcDoc template injecting Reveal.js stylesheet & libraries
    const getIframeSrcDoc = () => {
        const themeUrl = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/${theme}.min.css`;
        const isLightTheme = ['white', 'serif', 'sky', 'simple'].includes(theme);
        
        return `
            <!doctype html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <title>${title}</title>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reset.min.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css">
                    <link rel="stylesheet" href="${themeUrl}" id="theme-link">
                    
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Hind+Siliguri:wght@400;600;700&display=swap');
                        
                        body {
                            background-color: ${isLightTheme ? '#f8fafc' : '#1e1e2e'};
                            font-family: 'Hind Siliguri', 'Outfit', sans-serif;
                        }
                        
                        .reveal {
                            font-family: 'Hind Siliguri', 'Outfit', sans-serif;
                        }

                        /* Typography settings */
                        .reveal h1, .reveal h2, .reveal h3, .reveal h4 {
                            font-family: 'Hind Siliguri', 'Outfit', sans-serif;
                            font-weight: 800;
                            text-transform: none;
                            word-wrap: break-word;
                            color: ${isLightTheme ? '#0f172a' : '#f8fafc'};
                        }

                        .reveal p, .reveal li, .reveal span {
                            font-family: 'Hind Siliguri', sans-serif;
                            color: ${isLightTheme ? '#334155' : '#cbd5e1'};
                            line-height: 1.6;
                        }

                        .reveal pre code {
                            font-family: 'Outfit', monospace;
                            border-radius: 8px;
                        }

                        /* Slide wrapper layout */
                        .slide-content-wrapper {
                            max-width: 90% !important;
                            margin: 0 auto;
                            text-align: left;
                        }

                        .slide-content-wrapper p {
                            font-size: 0.8em;
                            margin-bottom: 1em;
                        }

                        .slide-content-wrapper ul, .slide-content-wrapper ol {
                            font-size: 0.75em;
                            margin-left: 1.5em;
                            margin-bottom: 1em;
                        }

                        .slide-content-wrapper li {
                            margin-bottom: 0.5em;
                        }

                        /* Question Block UI Stylings */
                        .question-box {
                            background: ${isLightTheme ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)'};
                            border-left: 6px solid #6366f1;
                            padding: 20px 30px;
                            border-radius: 16px;
                            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.15);
                            margin-top: 15px;
                            text-align: left;
                        }

                        .q-badge-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 12px;
                        }

                        .q-badge {
                            font-size: 0.4em;
                            font-weight: 800;
                            background: #6366f1;
                            color: white;
                            padding: 4px 10px;
                            border-radius: 8px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }

                        .q-title {
                            font-size: 0.75em;
                            font-weight: 700;
                            color: ${isLightTheme ? '#1e293b' : '#f1f5f9'};
                            line-height: 1.4;
                            margin-bottom: 20px;
                        }

                        .options-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 12px;
                            margin-top: 15px;
                        }

                        .option-item {
                            background: ${isLightTheme ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)'};
                            border: 1px solid ${isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'};
                            padding: 10px 16px;
                            border-radius: 10px;
                            font-size: 0.6em;
                            display: flex;
                            align-items: center;
                            transition: all 0.3s;
                        }

                        .stimulus-box {
                            font-size: 0.65em;
                            color: #94a3b8;
                            font-style: italic;
                            margin-bottom: 15px;
                            text-align: left;
                            background: ${isLightTheme ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.01)'};
                            padding: 12px 18px;
                            border-radius: 10px;
                            border-left: 3px solid #818cf8;
                        }

                        .explanation-box {
                            font-size: 0.55em;
                            color: #10b981;
                            margin-top: 20px;
                            border-top: 1px dashed ${isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'};
                            padding-top: 12px;
                            text-align: left;
                        }
                        
                        @media (max-width: 768px) {
                            .options-grid {
                                grid-template-columns: 1fr;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="reveal">
                        <div class="slides">
                            ${slidesHtml}
                        </div>
                    </div>
                    
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.js"></script>
                    <script>
                        Reveal.initialize({
                            hash: true,
                            controls: true,
                            progress: true,
                            center: true,
                            transition: '${transition}',
                            backgroundTransition: 'fade',
                            keyboard: true,
                            touch: true
                        });
                    </script>
                </body>
            </html>
        `;
    };

    // Keyboard events to close modal on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex flex-col overflow-hidden" ref={containerRef}>
                {/* Header Control Panel */}
                <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-slate-950/70 z-50 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                            <Play size={18} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-base font-extrabold text-white leading-tight truncate max-w-[200px] md:max-w-md">{title}</h2>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Slide Show Wizard</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Theme Select */}
                        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5">
                            <Palette size={14} className="text-slate-400" />
                            <select 
                                value={theme} 
                                onChange={e => setTheme(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-300 border-none outline-none focus:ring-0 cursor-pointer pr-5 py-0"
                            >
                                {THEMES.map(t => <option key={t.value} value={t.value} className="bg-slate-900 text-slate-300">{t.label}</option>)}
                            </select>
                        </div>

                        {/* Transition Select */}
                        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5">
                            <Settings size={14} className="text-slate-400" />
                            <select 
                                value={transition} 
                                onChange={e => setTransition(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-300 border-none outline-none focus:ring-0 cursor-pointer pr-5 py-0"
                            >
                                {TRANSITIONS.map(tr => <option key={tr.value} value={tr.value} className="bg-slate-900 text-slate-300">{tr.label}</option>)}
                            </select>
                        </div>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition active:scale-95 border border-white/5 shadow-inner"
                            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        <div className="h-6 w-[1px] bg-white/10"></div>

                        {/* Exit button */}
                        <button
                            onClick={onClose}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition duration-300 active:scale-95 border border-rose-500/20"
                            title="Close (Esc)"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </header>

                {/* Slides iframe Viewport */}
                <div className="flex-1 w-full bg-slate-950 relative flex items-center justify-center p-0 md:p-4">
                    <iframe
                        ref={iframeRef}
                        srcDoc={getIframeSrcDoc()}
                        className="w-full h-full border-0 md:rounded-2xl shadow-2xl bg-slate-900"
                        sandbox="allow-scripts allow-same-origin"
                        title="Presentation Slides"
                    />
                </div>
            </div>
        </AnimatePresence>
    );
};

export default PresentationWizard;
