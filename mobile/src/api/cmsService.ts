import apiClient from './apiClient';

export interface CmsContent {
  id: string;
  contentKey: string;
  contentValue: string;
}

export interface CmsSection {
  id: string;
  sectionKey: string;
  sectionName: string;
  contents: CmsContent[];
}

export interface BillingPackage {
  id: string;
  name: string;
  displayName?: string;
  price: number;
  description: string;
  billingCycle: string;
  maxStudents: number;
  maxTeachers: number;
  aiLimitPerMonth: number;
  highlightBadge?: string;
  sortOrder?: number;
  featureFlags?: Record<string, boolean>;
}

export interface PublicLanguagesResponse {
  defaultLanguage: string;
  enabledLanguages: string;
}

export const getPublicLanding = async (): Promise<CmsSection[]> => {
  const { data } = await apiClient.get('/public/landing');
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

export const getPublicPackages = async (): Promise<BillingPackage[]> => {
  const { data } = await apiClient.get('/public/packages');
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

export const getPublicLanguages = async (): Promise<PublicLanguagesResponse> => {
  const { data } = await apiClient.get('/public/settings/languages');
  return data;
};

const cmsService = {
  getPublicLanding,
  getPublicPackages,
  getPublicLanguages,
};

export default cmsService;
