import React from 'react';

const Dashboard = () => {
    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Total Questions</h3>
                    <p className="text-3xl font-bold text-primary">1,234</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Active Exams</h3>
                    <p className="text-3xl font-bold text-primary">56</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Users</h3>
                    <p className="text-3xl font-bold text-primary">892</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
