import axios from '../utils/axios';

const API_URL = '/v1/questions/manage-sources';

const getSourceSummary = async () => {
    const response = await axios.get(`${API_URL}/summary`);
    return response.data;
};

const renameSource = async (oldName, newName, sourceType) => {
    const response = await axios.post(`${API_URL}/rename`, { oldName, newName, sourceType });
    return response.data;
};

const mergeSources = async (oldNames, targetName, sourceType) => {
    const response = await axios.post(`${API_URL}/merge`, { oldNames, targetName, sourceType });
    return response.data;
};
const getYearSummary = async () => {
    const response = await axios.get(`${API_URL}/year-summary`);
    return response.data;
};

const renameYear = async (oldYear, newYear, sourceType) => {
    const response = await axios.post(`${API_URL}/rename-year`, { oldYear, newYear, sourceType });
    return response.data;
};

const mergeYears = async (oldYears, targetYear, sourceType) => {
    const response = await axios.post(`${API_URL}/merge-years`, { oldYears, targetYear, sourceType });
    return response.data;
};

export default {
    getSourceSummary,
    renameSource,
    mergeSources,
    getYearSummary,
    renameYear,
    mergeYears
};
