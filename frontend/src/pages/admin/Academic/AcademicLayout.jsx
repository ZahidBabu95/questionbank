import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layers, Book, Folder, FileText, Layout, Calendar } from 'lucide-react';

const AcademicLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { name: 'Curriculum Hierarchy', path: '/admin/academic/structure', icon: <Layout size={18} /> },
        { name: 'Academic Sessions', path: '/admin/academic/sessions', icon: <Calendar size={18} /> },
        { name: 'Curriculum Rules (AI)', path: '/admin/academic/curriculum-rules', icon: <Book size={18} /> }
    ];

    const currentTab = tabs.find(tab => location.pathname === tab.path) || tabs[0];

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Academic Management</h1>
                <p className="text-slate-500">Configure and manage your academic curriculum hierarchy.</p>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white rounded-t-xl border-b border-slate-200 px-4 pt-2 shadow-sm">
                <div className="flex space-x-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => navigate(tab.path)}
                            className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-colors relative ${location.pathname === tab.path
                                ? 'text-primary'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.name}
                            {location.pathname === tab.path && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-slate-200 p-6 min-h-[500px]">
                <Outlet />
            </div>
        </div>
    );
};

export default AcademicLayout;
