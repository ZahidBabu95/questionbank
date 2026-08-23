import React from 'react';
import { X, Command, Keyboard, Zap, Sparkles, Printer, Save, Share2, FileDown, ZoomIn, Eye } from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';

const KeyboardShortcutsModal = () => {
    const { showShortcutsModal, setShowShortcutsModal, uiLang } = useNexusEditor();

    if (!showShortcutsModal) return null;

    const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    const shortcutCategories = [
        {
            category: uiLang === 'bn' ? 'ডকুমেন্ট ও ফাইল অ্যাকশন' : 'Document & File Actions',
            items: [
                {
                    keys: [modKey, 'S'],
                    desc: uiLang === 'bn' ? 'ডকুমেন্ট সংরক্ষণ করুন' : 'Save Document',
                    icon: Save,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
                },
                {
                    keys: [modKey, 'P'],
                    desc: uiLang === 'bn' ? 'ডকুমেন্ট প্রিন্ট করুন' : 'Print Document',
                    icon: Printer,
                    color: 'text-blue-600 bg-blue-50 border-blue-100'
                },
                {
                    keys: [modKey, 'Shift', 'S'],
                    desc: uiLang === 'bn' ? 'প্রশ্নপত্র শেয়ার মডাল খুলুন' : 'Open Share Modal',
                    icon: Share2,
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
                },
                {
                    keys: [modKey, 'Shift', 'D'],
                    desc: uiLang === 'bn' ? 'পিডিএফ ডাউনলোড ডায়ালগ' : 'Download PDF Dialog',
                    icon: FileDown,
                    color: 'text-rose-600 bg-rose-50 border-rose-100'
                }
            ]
        },
        {
            category: uiLang === 'bn' ? 'ক্যানভাস ও নেভিগেশন' : 'Canvas & Navigation',
            items: [
                {
                    keys: [modKey, '+'],
                    desc: uiLang === 'bn' ? 'ক্যানভাস জুম বাড়ান (+10%)' : 'Zoom In (+10%)',
                    icon: ZoomIn,
                    color: 'text-violet-600 bg-violet-50 border-violet-100'
                },
                {
                    keys: [modKey, '-'],
                    desc: uiLang === 'bn' ? 'ক্যানভাস জুম কমান (-10%)' : 'Zoom Out (-10%)',
                    icon: ZoomIn,
                    color: 'text-slate-600 bg-slate-50 border-slate-200'
                },
                {
                    keys: [modKey, '0'],
                    desc: uiLang === 'bn' ? '১০০% জুমে রিসেট করুন' : 'Reset Zoom to 100%',
                    icon: Eye,
                    color: 'text-amber-600 bg-amber-50 border-amber-100'
                }
            ]
        },
        {
            category: uiLang === 'bn' ? 'সহায়তা ও কন্ট্রোল' : 'Help & Controls',
            items: [
                {
                    keys: [modKey, '/'],
                    desc: uiLang === 'bn' ? 'শর্টকাট গাইড উইন্ডো চালু/বন্ধ' : 'Toggle Shortcuts Guide',
                    icon: Keyboard,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
                },
                {
                    keys: ['Esc'],
                    desc: uiLang === 'bn' ? 'যেকোনো ওপেন মডাল বন্ধ করুন' : 'Close Open Modals',
                    icon: X,
                    color: 'text-rose-600 bg-rose-50 border-rose-100'
                }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 font-outfit">
            <div 
                className="fixed inset-0" 
                onClick={() => setShowShortcutsModal(false)} 
            />

            <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-6 relative z-10 text-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-50">
                            <Keyboard size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">
                                {uiLang === 'bn' ? 'কীবোর্ড শর্টকাটস গাইড' : 'Keyboard Shortcuts Guide'}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                {uiLang === 'bn' 
                                    ? 'দ্রুত ও সহজে প্রশ্নপত্র সম্পাদনার শর্টকাটসমূহ।' 
                                    : 'Quick keystroke shortcuts for faster workflow.'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowShortcutsModal(false)}
                        className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors border border-slate-100"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Categories */}
                <div className="space-y-5">
                    {shortcutCategories.map((cat, idx) => (
                        <div key={idx} className="space-y-2.5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pl-1">
                                {cat.category}
                            </h4>
                            <div className="bg-slate-50/80 rounded-2xl p-2 border border-slate-200/60 divide-y divide-slate-100">
                                {cat.items.map((item, i) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <div key={i} className="flex items-center justify-between py-2 px-2.5 gap-3 hover:bg-white/80 rounded-xl transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${item.color}`}>
                                                    <IconComponent size={14} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 truncate">
                                                    {item.desc}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {item.keys.map((k, kIdx) => (
                                                    <React.Fragment key={kIdx}>
                                                        <kbd className="px-2.5 py-1 bg-white border border-slate-200/90 rounded-lg text-[11px] font-black font-mono text-slate-700 shadow-2xs">
                                                            {k}
                                                        </kbd>
                                                        {kIdx < item.keys.length - 1 && (
                                                            <span className="text-xs text-slate-400 font-bold">+</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-500" />
                        {uiLang === 'bn' ? 'যেকোনো সময় শর্টকাট দেখতে Ctrl + / চাপুন' : 'Press Ctrl + / anytime for shortcuts'}
                    </span>
                    <button
                        onClick={() => setShowShortcutsModal(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                        {uiLang === 'bn' ? 'ঠিক আছে' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsModal;
