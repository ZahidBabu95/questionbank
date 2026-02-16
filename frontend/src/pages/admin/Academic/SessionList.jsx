import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, CheckCircle, XCircle, Edit } from 'lucide-react';
import axios from 'axios';
import academicService from '../../../services/academicService';

// Note: We need to extend academicService to support sessions, or call axios directly here for now.
// For best practice, I should add these to academicService.js first. 
// But given the tool constraints, I'll use axios with a helper or assume academicService update in next step.
// consistently using the service pattern is better.

const SessionList = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', startDate: '', endDate: '', isActive: false });
    const [isEditing, setIsEditing] = useState(false);

    // Helper to get auth header (duplicating from service for now, or import if exported)
    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return { headers: { Authorization: `Bearer ${token}` } };
    };
    const API_URL = 'http://localhost:8080/api/v1/academic/sessions';

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL, getAuthHeader());
            setSessions(response.data);
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`${API_URL}/${formData.id}`, formData, getAuthHeader());
            } else {
                await axios.post(API_URL, formData, getAuthHeader());
            }
            setShowModal(false);
            setFormData({ id: null, name: '', startDate: '', endDate: '', isActive: false });
            setIsEditing(false);
            fetchSessions();
        } catch (error) {
            console.error("Failed to save session", error);
            alert("Failed to save session.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this session?")) return;
        try {
            await axios.delete(`${API_URL}/${id}`, getAuthHeader());
            fetchSessions();
        } catch (error) {
            console.error("Failed to delete session", error);
            alert("Failed to delete session.");
        }
    };

    const handleActivate = async (session) => {
        if (session.isActive) return; // Already active
        if (!window.confirm(`Set "${session.name}" as the ACTIVE session? This will deactivate the current session.`)) return;
        try {
            await axios.put(`${API_URL}/${session.id}/activate`, {}, getAuthHeader());
            fetchSessions();
        } catch (error) {
            console.error("Failed to activate session", error);
            alert("Failed to activate session.");
        }
    };

    const openEditModal = (session) => {
        setFormData({
            id: session.id,
            name: session.name,
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: session.isActive
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const openAddModal = () => {
        setFormData({ id: null, name: '', startDate: '', endDate: '', isActive: false });
        setIsEditing(false);
        setShowModal(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Academic Sessions</h2>
                    <p className="text-sm text-slate-500">Manage academic years and terms. Only one session can be active at a time.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all shadow-sm"
                >
                    <Plus size={18} /> New Session
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map(session => (
                    <div key={session.id} className={`bg-white rounded-xl border p-4 shadow-sm relative transition-all ${session.isActive ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-blue-300'}`}>
                        {session.isActive && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                <CheckCircle size={12} /> ACTIVE
                            </div>
                        )}

                        <div className="mb-3">
                            <h3 className="text-lg font-bold text-slate-800">{session.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <Calendar size={14} />
                                <span>{session.startDate} - {session.endDate}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                            <div className="flex gap-2">
                                <button onClick={() => openEditModal(session)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(session.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {!session.isActive && (
                                <button
                                    onClick={() => handleActivate(session)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    Set as Active
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Session' : 'New Academic Session'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Session Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. 2024-2025"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            {!isEditing && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="isActive" className="text-sm text-slate-700">Set as Active Session immediately</label>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                                >
                                    {isEditing ? 'Update Session' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionList;
