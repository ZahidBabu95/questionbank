import React, { useState } from 'react';
import { Tag, Plus, X, ChevronDown } from 'lucide-react';

/**
 * Reusable component for adding exam source labels to questions.
 * Used in MCQ, CQ, and Short Question creation pages.
 * 
 * Props:
 *   sources: array of source objects [{ sourceType, examYear, organizationName, examName, session, note }]
 *   onChange: callback when sources change
 */

const SOURCE_TYPES = [
    {
        value: 'BOARD_EXAM',
        label: '📋 বোর্ড পরীক্ষা',
        orgLabel: 'বোর্ডের নাম',
        orgPlaceholder: 'যেমন: ঢাকা বোর্ড, রাজশাহী বোর্ড',
        examLabel: 'পরীক্ষার নাম',
        examPlaceholder: 'যেমন: SSC পরীক্ষা, HSC পরীক্ষা',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        badgeColor: 'bg-blue-100 text-blue-700',
        suggestions: ['ঢাকা বোর্ড', 'রাজশাহী বোর্ড', 'কুমিল্লা বোর্ড', 'চট্টগ্রাম বোর্ড', 'যশোর বোর্ড', 'বরিশাল বোর্ড', 'সিলেট বোর্ড', 'দিনাজপুর বোর্ড', 'ময়মনসিংহ বোর্ড', 'মাদ্রাসা বোর্ড', 'কারিগরি বোর্ড'],
    },
    {
        value: 'UNIVERSITY_ADMISSION',
        label: '🎓 বিশ্ববিদ্যালয় ভর্তি',
        orgLabel: 'বিশ্ববিদ্যালয়ের নাম',
        orgPlaceholder: 'যেমন: ঢাকা বিশ্ববিদ্যালয়, বুয়েট',
        examLabel: 'পরীক্ষার নাম',
        examPlaceholder: 'যেমন: A ইউনিট, GST ভর্তি, IBA MBA',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        badgeColor: 'bg-purple-100 text-purple-700',
        suggestions: ['ঢাকা বিশ্ববিদ্যালয়', 'বুয়েট', 'মেডিকেল ভর্তি', 'রাজশাহী বিশ্ববিদ্যালয়', 'চট্টগ্রাম বিশ্ববিদ্যালয়', 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', 'জগন্নাথ বিশ্ববিদ্যালয়', 'কুয়েট', 'রুয়েট', 'চুয়েট'],
    },
    {
        value: 'INSTITUTION_TEST',
        label: '🏫 প্রাতিষ্ঠানিক টেস্ট',
        orgLabel: 'প্রতিষ্ঠানের নাম',
        orgPlaceholder: 'যেমন: নটরডেম কলেজ, ভিকারুননিসা',
        examLabel: 'পরীক্ষার ধরন',
        examPlaceholder: 'যেমন: Test Exam, Model Test, Half Yearly',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        suggestions: [],
    },
    {
        value: 'JOB_EXAM',
        label: '💼 চাকরির পরীক্ষা',
        orgLabel: 'সংস্থার নাম',
        orgPlaceholder: 'যেমন: PSC, Bangladesh Bank, NTRCA',
        examLabel: 'পরীক্ষার নাম',
        examPlaceholder: 'যেমন: ৩৮তম BCS, প্রভাষক নিবন্ধন',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-700',
        suggestions: ['PSC (BCS)', 'Bangladesh Bank', 'NTRCA', 'প্রাথমিক শিক্ষক নিয়োগ', 'রেলওয়ে', 'ব্যাংক'],
    },
    {
        value: 'MODEL_TEST',
        label: '📝 মডেল টেস্ট',
        orgLabel: 'প্রকাশনা/উৎস',
        orgPlaceholder: 'যেমন: দিনাজপুর বোর্ড মডেল, নিজস্ব',
        examLabel: 'পরীক্ষার বিবরণ',
        examPlaceholder: 'যেমন: SSC মডেল টেস্ট - ১',
        color: 'bg-teal-50 text-teal-700 border-teal-200',
        badgeColor: 'bg-teal-100 text-teal-700',
        suggestions: [],
    },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => currentYear - i);

const QuestionSourceTagger = ({ sources = [], onChange }) => {
    const [showForm, setShowForm] = useState(false);
    const [newSource, setNewSource] = useState({
        sourceType: 'BOARD_EXAM',
        examYear: currentYear,
        organizationName: '',
        examName: '',
    });

    const selectedType = SOURCE_TYPES.find(t => t.value === newSource.sourceType);

    const addSource = () => {
        if (!newSource.organizationName.trim()) return;
        onChange([...sources, { ...newSource }]);
        setNewSource({
            sourceType: 'BOARD_EXAM',
            examYear: currentYear,
            organizationName: '',
            examName: '',
        });
        setShowForm(false);
    };

    const removeSource = (index) => {
        onChange(sources.filter((_, i) => i !== index));
    };

    const getTypeConfig = (type) => SOURCE_TYPES.find(t => t.value === type) || SOURCE_TYPES[0];

    return (
        <div>
            {/* Existing Sources as Chips */}
            {sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {sources.map((src, idx) => {
                        const typeConfig = getTypeConfig(src.sourceType);
                        return (
                            <div key={idx} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${typeConfig.color} group transition-all`}>
                                <span>{src.organizationName}</span>
                                {src.examName && <span className="opacity-60">• {src.examName}</span>}
                                <span className="opacity-50">'{String(src.examYear).slice(-2)}</span>
                                <button type="button" onClick={() => removeSource(idx)}
                                    className="w-3.5 h-3.5 rounded-full bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 ml-0.5">
                                    <X size={8} strokeWidth={3} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Button / Form */}
            {!showForm ? (
                <button type="button" onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 border border-dashed border-slate-300 rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-all w-full justify-center">
                    <Plus size={14} /> পরীক্ষার উৎস যোগ করুন
                </button>
            ) : (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2.5 animate-in fade-in">
                    {/* Source Type */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {SOURCE_TYPES.map(type => (
                            <button key={type.value} type="button"
                                onClick={() => setNewSource({ ...newSource, sourceType: type.value, organizationName: '' })}
                                className={`text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${newSource.sourceType === type.value
                                    ? type.color + ' shadow-sm ring-1 ring-offset-1 ring-current/20'
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    {/* Organization + Year Row */}
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                            <input type="text" value={newSource.organizationName}
                                onChange={(e) => setNewSource({ ...newSource, organizationName: e.target.value })}
                                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                                placeholder={selectedType?.orgPlaceholder}
                                list={`org-suggestions-${newSource.sourceType}`}
                            />
                            {selectedType?.suggestions.length > 0 && (
                                <datalist id={`org-suggestions-${newSource.sourceType}`}>
                                    {selectedType.suggestions.map(s => <option key={s} value={s} />)}
                                </datalist>
                            )}
                        </div>
                        <select value={newSource.examYear}
                            onChange={(e) => setNewSource({ ...newSource, examYear: parseInt(e.target.value) })}
                            className="w-[90px] p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white">
                            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    {/* Exam Name */}
                    <input type="text" value={newSource.examName}
                        onChange={(e) => setNewSource({ ...newSource, examName: e.target.value })}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                        placeholder={selectedType?.examPlaceholder}
                    />

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button type="button" onClick={addSource} disabled={!newSource.organizationName.trim()}
                            className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1">
                            <Plus size={14} /> যোগ করুন
                        </button>
                        <button type="button" onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                            বাতিল
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionSourceTagger;
