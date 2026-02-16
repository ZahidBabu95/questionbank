import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UnderDevelopment = ({ featureName = "This Module" }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-700">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-white p-6 rounded-full shadow-lg border border-slate-100">
                    <Construction size={64} className="text-blue-600 animate-bounce" />
                </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-800 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Under Development
            </h2>

            <p className="text-lg text-slate-600 max-w-md mb-8 leading-relaxed">
                We're currently working hard on <strong>{featureName}</strong>.
                <br />
                Check back soon for updates!
            </p>

            <button
                onClick={() => navigate(-1)}
                className="flex items-center px-6 py-3 bg-white text-slate-700 font-medium rounded-full border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm hover:shadow-md group"
            >
                <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                Go Back
            </button>
        </div>
    );
};

export default UnderDevelopment;
