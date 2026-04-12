import axios from '../utils/axios';

/**
 * Triggers a PDF download via browser.
 * Opens in new tab or saves as file.
 */
export const downloadExamPdf = async (examId, options = {}) => {
    const params = new URLSearchParams({
        includeAnswers: options.includeAnswers ?? false,
        includeAnswerSheet: options.includeAnswerSheet ?? false,
        includeWatermark: options.includeWatermark ?? false,
        shuffleQuestions: options.shuffleQuestions ?? false,
        shuffleOptions: options.shuffleOptions ?? false,
        paperSize: options.paperSize ?? 'A4',
        template: options.template ?? 'default',
        fontSize: options.fontSize ?? 11,
    });

    const response = await axios.get(
        `/v1/exams/download/pdf/${examId}?${params.toString()}`,
        { responseType: 'blob' }
    );

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `exam-${examId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/**
 * Triggers a Word document download via browser.
 */
export const downloadExamWord = async (examId, options = {}) => {
    const params = new URLSearchParams({
        includeAnswers: options.includeAnswers ?? false,
        includeAnswerSheet: options.includeAnswerSheet ?? false,
        includeWatermark: options.includeWatermark ?? false,
        shuffleQuestions: options.shuffleQuestions ?? false,
        shuffleOptions: options.shuffleOptions ?? false,
        paperSize: options.paperSize ?? 'A4',
        template: options.template ?? 'default',
        fontSize: options.fontSize ?? 11,
    });

    const response = await axios.get(
        `/v1/exams/download/word/${examId}?${params.toString()}`,
        { responseType: 'blob' }
    );

    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `exam-${examId}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export default { downloadExamPdf, downloadExamWord };
