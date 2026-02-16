import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/admin/Dashboard';
import LandingPage from './pages/LandingPage';
import UserList from './pages/admin/Users/UserList';
import GeneralSettings from './pages/admin/Settings/GeneralSettings';
import SecuritySettings from './pages/admin/Settings/SecuritySettings';
import BackupSettings from './pages/admin/Settings/BackupSettings';
import AcademicStructure from './pages/admin/Academic/AcademicStructure';
import AcademicLayout from './pages/admin/Academic/AcademicLayout';
import MCQCreate from './pages/admin/QuestionBank/MCQCreate';
import CQCreate from './pages/admin/QuestionBank/CQCreate';
import ShortQuestionCreate from './pages/admin/QuestionBank/ShortQuestionCreate';
import ImportExcel from './pages/admin/QuestionBank/ImportExcel';
import ImportApi from './pages/admin/QuestionBank/ImportApi';
import QuestionList from './pages/admin/QuestionBank/QuestionList';
import InstituteList from './pages/admin/Institutes/InstituteList';
import InstituteForm from './pages/admin/Institutes/InstituteForm';
import InstituteDetails from './pages/admin/Institutes/InstituteDetails';
import InstituteAdminList from './pages/admin/Institutes/InstituteAdminList';
import SubscriptionManagement from './pages/admin/Institutes/SubscriptionManagement';
import AcademicClassList from './pages/admin/Academic/AcademicClassList';
import SubjectList from './pages/admin/Academic/SubjectList';
import ChapterList from './pages/admin/Academic/ChapterList';
import TopicList from './pages/admin/Academic/TopicList';
import SessionList from './pages/admin/Academic/SessionList';
import UnderDevelopment from './components/common/UnderDevelopment';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// Layout wrapper for authenticated routes
const AppLayout = () => {
    return (
        <ProtectedRoute>
            <MainLayout />
        </ProtectedRoute>
    );
};

function App() {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected App Routes */}
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* User Management */}
                    <Route path="/users/*" element={<UserList />} />

                    {/* Institute Management */}
                    <Route path="/institutes" element={<InstituteList />} />
                    <Route path="/institutes/add" element={<InstituteForm />} />
                    <Route path="/institutes/edit/:id" element={<InstituteForm />} />
                    <Route path="/institutes/admins" element={<InstituteAdminList />} />
                    <Route path="/institutes/subscriptions" element={<SubscriptionManagement />} />
                    <Route path="/institutes/:id" element={<InstituteDetails />} />

                    {/* Exam Management */}
                    <Route path="/exams/*" element={<UnderDevelopment featureName="Exam Management" />} />

                    {/* Lecture Sheets */}
                    <Route path="/lectures/*" element={<UnderDevelopment featureName="Lecture Sheet Management" />} />

                    {/* Reports */}
                    <Route path="/reports/*" element={<UnderDevelopment featureName="Reports & Analytics" />} />

                    {/* Billing */}
                    <Route path="/billing/*" element={<UnderDevelopment featureName="Subscription & Billing" />} />

                    {/* Settings */}
                    <Route path="/settings/general" element={<GeneralSettings />} />
                    <Route path="/settings/security" element={<SecuritySettings />} />
                    <Route path="/settings/backup" element={<BackupSettings />} />
                    <Route path="/settings/*" element={<UnderDevelopment featureName="System Settings" />} />



                    {/* Academic */}
                    <Route path="/admin/academic" element={<AcademicLayout />}>
                        <Route index element={<Navigate to="structure" replace />} />
                        <Route path="sessions" element={<SessionList />} />
                        <Route path="structure" element={<AcademicStructure />} />
                        <Route path="classes" element={<AcademicClassList />} />
                        <Route path="subjects" element={<SubjectList />} />
                        <Route path="chapters" element={<ChapterList />} />
                        <Route path="topics" element={<TopicList />} />
                    </Route>

                    {/* Question Bank */}
                    <Route path="/questions" element={<QuestionList />} />
                    <Route path="/questions/pending" element={<QuestionList />} />
                    <Route path="/questions/approved" element={<QuestionList />} />
                    <Route path="/questions/rejected" element={<QuestionList />} />
                    <Route path="/questions/create/mcq" element={<MCQCreate />} />
                    <Route path="/questions/add/cq" element={<CQCreate />} />
                    <Route path="/questions/add/short" element={<ShortQuestionCreate />} />
                    <Route path="/questions/import/excel" element={<ImportExcel />} />
                    <Route path="/questions/import/api" element={<ImportApi />} />


                    {/* CMS */}
                    <Route path="/cms/*" element={<UnderDevelopment featureName="Content & CMS" />} />

                    {/* Support */}
                    <Route path="/support/*" element={<UnderDevelopment featureName="Support & Tickets" />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
