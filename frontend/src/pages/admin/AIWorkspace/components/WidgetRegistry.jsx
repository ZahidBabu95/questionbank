import React from 'react';
import { FileText, Layers, BookOpen } from 'lucide-react';
import AutoExamWizardWidget from './AutoExamWizardWidget';
// Import other tools as they are created
// import LectureSheetWidget from './LectureSheetWidget';

// 1. Component Registry: Maps the tool/widget name to the actual React Component
export const WidgetRegistry = {
    'AUTO_EXAM_GENERATOR': AutoExamWizardWidget,
    'exam_config': AutoExamWizardWidget, // Alias for legacy parsing
    // 'LECTURE_SHEET_MAKER': LectureSheetWidget,
};

// 2. Initial static tool definitions (Will eventually come from the database API)
export const DEFAULT_WORKSPACE_TOOLS = [
    { 
        id: 'AUTO_EXAM_GENERATOR',
        title: 'Auto Exam Generator', 
        path: '/exams/generate/auto', 
        icon: <FileText size={14} />, 
        permId: 'EXAM_PAPER_GENERATOR_AUTO_GENERATE_PLUS_TOOL' 
    },
    { 
        id: 'NEXUS_PAPER_ENGINE',
        title: 'Nexus Paper Engine', 
        path: '/exams/generate/nexus-editor', 
        icon: <Layers size={14} />, 
        permId: 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2_PLUS_TOOL' 
    },
    { 
        id: 'LECTURE_SHEET_MAKER',
        title: 'Create Lecture Sheet', 
        path: '/lectures/create', 
        icon: <BookOpen size={14} />, 
        permId: 'LECTURES_CREATE_SHEET_PLUS_TOOL' 
    }
];
