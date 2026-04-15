import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { BrandingProvider } from './context/BrandingContext';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/admin/Dashboard';
import LandingPage from './pages/LandingPage';
import UserList from './pages/admin/Users/UserList';
import UserProfilePage from './pages/admin/Users/UserProfilePage';
import MyProfile from './pages/admin/Users/MyProfile';
import UserAnalyticsPage from './pages/admin/Users/UserAnalyticsPage';
import RoleManagement from './pages/admin/Users/RoleManagement';
import GeneralSettings from './pages/admin/Settings/GeneralSettings';
import SecuritySettings from './pages/admin/Settings/SecuritySettings';
import BackupSettings from './pages/admin/Settings/BackupSettings';
import AcademicStructure from './pages/admin/Academic/AcademicStructure';
import AcademicLayout from './pages/admin/Academic/AcademicLayout';
import MCQCreate from './pages/admin/QuestionBank/MCQCreate';
import CQCreate from './pages/admin/QuestionBank/CQCreate';
import ShortQuestionCreate from './pages/admin/QuestionBank/ShortQuestionCreate';
import QuestionEdit from './pages/admin/QuestionBank/QuestionEdit';
import ImportExcel from './pages/admin/QuestionBank/ImportExcel';
import ImportAI from './pages/admin/QuestionBank/ImportAI';
import ImportApi from './pages/admin/QuestionBank/ImportApi';
import QuestionList from './pages/admin/QuestionBank/QuestionList';
import InstituteList from './pages/admin/Institutes/InstituteList';
import InstituteForm from './pages/admin/Institutes/InstituteForm';
import InstituteDetails from './pages/admin/Institutes/InstituteDetails';
import InstituteAdminList from './pages/admin/Institutes/InstituteAdminList';
import SubscriptionManagement from './pages/admin/Institutes/SubscriptionManagement';
import AiUsageTracker from './pages/admin/Billing/AiUsageTracker';
import AcademicClassList from './pages/admin/Academic/AcademicClassList';
import SubjectList from './pages/admin/Academic/SubjectList';
import ChapterList from './pages/admin/Academic/ChapterList';
import TopicList from './pages/admin/Academic/TopicList';
import SessionList from './pages/admin/Academic/SessionList';
import CurriculumRules from './pages/admin/Academic/CurriculumRules';
import UnderDevelopment from './components/common/UnderDevelopment';
import AutoExamGenerator from './pages/admin/Exams/AutoExamGenerator';
import ManualExamBuilder from './pages/admin/Exams/ManualExamBuilder';
import ExamList from './pages/admin/Exams/ExamList';
import SavedExams from './pages/admin/Exams/SavedExams';
import ExamEditor from './pages/admin/Exams/ExamEditor';
import CurriculumLibrary from './pages/admin/CurriculumLibrary';
import AiUploadHistory from './pages/admin/AiUploadHistory';
import AiApiKeys from './pages/admin/QuestionBank/AiApiKeys';
import LectureBuilder from './pages/admin/Lectures/LectureBuilder';
import LectureList from './pages/admin/Lectures/LectureList';
import UsageAnalytics from './pages/admin/Reports/UsageAnalytics';
import PerformanceAnalytics from './pages/admin/Reports/PerformanceAnalytics';
import KnowledgeHubReport from './pages/admin/Reports/KnowledgeHubReport';
import PackageManagement from './pages/admin/Billing/PackageManagement';
import InvoiceManagement from './pages/admin/Billing/InvoiceManagement';
import BillingOverview from './pages/admin/Billing/BillingOverview';
import LandingEditor from './pages/admin/CMS/LandingEditor';
import BlogList from './pages/admin/CMS/Blog/BlogList';
import BlogEditor from './pages/admin/CMS/Blog/BlogEditor';
import CategoryManagement from './pages/admin/CMS/Blog/CategoryManagement';
import BlogListing from './pages/Public/Blog/BlogListing';
import BlogPostDetail from './pages/Public/Blog/BlogPostDetail';
import SupportDashboard from './pages/admin/Support/SupportDashboard';
import KnowledgeBaseManager from './pages/admin/Support/KnowledgeBaseManager';
import AllNotificationsPage from './pages/admin/Notifications/AllNotificationsPage';
import ResourceLibrary from './pages/admin/KnowledgeHub/ResourceLibrary';
import DigitizationWorkspace from './pages/admin/KnowledgeHub/DigitizationWorkspace';
import ProofreadingWorkspace from './pages/admin/KnowledgeHub/ProofreadingWorkspace';
import KnowledgeMapWorkspace from './pages/admin/KnowledgeHub/KnowledgeMapWorkspace';
import CurriculumMappingList from './pages/admin/KnowledgeHub/CurriculumMappingList';
import { useParams } from 'react-router-dom';


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

const RedirectToEditor = () => {
    const { id } = useParams();
    return <Navigate to={`/exams/generate/editor/${id}`} replace />;
};

function App() {
    return (
        <BrandingProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Public Blog Routes */}
                    <Route path="/blog" element={<BlogListing />} />
                    <Route path="/blog/:slug" element={<BlogPostDetail />} />
                    <Route path="/blog/category/:category" element={<BlogListing />} />
                    <Route path="/blog/tag/:tag" element={<BlogListing />} />


                    {/* Protected App Routes */}
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<MyProfile />} />

                        {/* User Management */}
                        <Route path="/users/profile/:id" element={<UserProfilePage />} />
                        <Route path="/users/analytics" element={<UserAnalyticsPage />} />
                        <Route path="/users/roles" element={<RoleManagement />} />
                        <Route path="/users/*" element={<UserList />} />

                        {/* Institute Management */}
                        <Route path="/institutes" element={<InstituteList />} />
                        <Route path="/institutes/add" element={<InstituteForm />} />
                        <Route path="/institutes/edit/:id" element={<InstituteForm />} />
                        <Route path="/institutes/admins" element={<InstituteAdminList />} />
                        <Route path="/institutes/:id" element={<InstituteDetails />} />

                        {/* Exam Management */}
                        <Route path="/exams/generate/auto" element={<AutoExamGenerator />} />
                        <Route path="/exams/generate/manual" element={<ManualExamBuilder />} />
                        <Route path="/exams/generate/saved" element={<SavedExams />} />
                        <Route path="/exams/generate/editor/:id?" element={<ExamEditor />} />
                        <Route path="/exams/edit/:id" element={<RedirectToEditor />} />
                        <Route path="/exams/download/pdf" element={<ExamList />} />
                        <Route path="/exams/download/word" element={<ExamList />} />
                        <Route path="/exams/*" element={<UnderDevelopment featureName="Exam Management" />} />

                        {/* Lecture Sheets */}
                        <Route path="/lectures/create" element={<LectureBuilder />} />
                        <Route path="/lectures/attach" element={<LectureList />} />
                        <Route path="/lectures/*" element={<UnderDevelopment featureName="Lecture Sheet Management" />} />

                        {/* Reports */}
                        <Route path="/reports/usage" element={<UsageAnalytics />} />
                        <Route path="/reports/performance" element={<PerformanceAnalytics />} />
                        <Route path="/reports/knowledge-hub" element={<KnowledgeHubReport />} />
                        <Route path="/reports/*" element={<UnderDevelopment featureName="Reports & Analytics" />} />

                        {/* Billing */}
                        <Route path="/billing/overview" element={<BillingOverview />} />
                        <Route path="/billing/packages" element={<PackageManagement />} />
                        <Route path="/billing/subscriptions" element={<SubscriptionManagement />} />
                        <Route path="/billing/ai-usage" element={<AiUsageTracker />} />
                        <Route path="/billing/invoices" element={<InvoiceManagement />} />
                        <Route path="/billing/*" element={<UnderDevelopment featureName="Billing" />} />

                        {/* Settings */}
                        <Route path="/settings/general" element={<GeneralSettings />} />
                        <Route path="/settings/security" element={<SecuritySettings />} />
                        <Route path="/settings/backup" element={<BackupSettings />} />
                        <Route path="/settings/*" element={<UnderDevelopment featureName="System Settings" />} />



                        {/* Knowledge Hub */}
                        <Route path="/knowledge-hub/library" element={<ResourceLibrary />} />
                        <Route path="/knowledge-hub/digitization/:bookId" element={<DigitizationWorkspace />} />
                        <Route path="/knowledge-hub/proofreading/:bookId" element={<ProofreadingWorkspace />} />
                        <Route path="/knowledge-hub/mapping" element={<CurriculumMappingList />} />
                        <Route path="/knowledge-hub/mapping/:id" element={<KnowledgeMapWorkspace />} />
                        <Route path="/knowledge-hub/*" element={<UnderDevelopment featureName="Knowledge Hub & AI Brain" />} />

                        {/* Academic */}
                        <Route path="/admin/academic" element={<AcademicLayout />}>
                            <Route index element={<Navigate to="structure" replace />} />
                            <Route path="sessions" element={<SessionList />} />
                            <Route path="structure" element={<AcademicStructure />} />
                            <Route path="classes" element={<AcademicClassList />} />
                            <Route path="subjects" element={<SubjectList />} />
                            <Route path="chapters" element={<ChapterList />} />
                            <Route path="topics" element={<TopicList />} />
                            <Route path="curriculum-rules" element={<CurriculumRules />} />
                        </Route>

                        {/* Curriculum Repository - SUPER_ADMIN only */}
                        <Route path="/admin/curriculum" element={<CurriculumLibrary />} />

                        {/* Question Bank */}
                        <Route path="/questions" element={<QuestionList />} />
                        <Route path="/questions/drafts" element={<QuestionList />} />
                        <Route path="/questions/pending" element={<QuestionList />} />
                        <Route path="/questions/approved" element={<QuestionList />} />
                        <Route path="/questions/rejected" element={<QuestionList />} />
                        <Route path="/questions/create/mcq" element={<MCQCreate />} />
                        <Route path="/questions/add/cq" element={<CQCreate />} />
                        <Route path="/questions/add/short" element={<ShortQuestionCreate />} />
                        <Route path="/questions/import/excel" element={<ImportExcel />} />
                        <Route path="/questions/import/ai" element={<ImportAI />} />
                        <Route path="/questions/import/api" element={<ImportApi />} />
                        <Route path="/questions/edit/:id" element={<QuestionEdit />} />
                        <Route path="/ai/upload-history" element={<AiUploadHistory />} />
                        <Route path="/ai/api-keys" element={<AiApiKeys />} />


                        {/* CMS */}
                        <Route path="/cms/landing" element={<LandingEditor />} />
                        <Route path="/cms/blog/posts" element={<BlogList />} />
                        <Route path="/cms/blog/create" element={<BlogEditor />} />
                        <Route path="/cms/blog/edit/:id" element={<BlogEditor />} />
                        <Route path="/cms/blog/categories" element={<CategoryManagement />} />
                        <Route path="/cms/*" element={<UnderDevelopment featureName="Content Management System" />} />


                        {/* Support */}
                        <Route path="/support/reports" element={<UnderDevelopment featureName="Question Reports" />} />
                        <Route path="/support/all" element={<SupportDashboard />} />
                        <Route path="/support/knowledge" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><KnowledgeBaseManager /></ProtectedRoute>} />
                        <Route path="/support/*" element={<Navigate to="/support/all" replace />} />
                        
                        {/* Notifications */}
                        <Route path="/notifications" element={<AllNotificationsPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </BrandingProvider>
    );
}

export default App;
