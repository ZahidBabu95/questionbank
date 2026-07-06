import apiClient from './apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  instituteId?: string;
  instituteName?: string;
  instituteStatus?: string;
  subscriptionPackage?: string;
  permissions?: string[];
  instituteNameEn?: string;
  instituteNameBn?: string;
  profileImageUrl?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: string; // This holds the JWT access token string
  user: User;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
  };
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
};

export const signup = async (payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  instituteId?: string;
  roles: string[];
}): Promise<SignupResponse> => {
  const { data } = await apiClient.post('/auth/signup', payload);
  return data;
};

export interface Role {
  name: string;
  description: string;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
}

export const getRegistrationRoles = async (): Promise<RolesResponse> => {
  const { data } = await apiClient.get('/auth/roles');
  return data;
};

const authService = {
  login,
  signup,
  getRegistrationRoles,
};

export default authService;
