import axios from 'axios';
const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}/api` || 'http://localhost:3000/api';
axios.defaults.withCredentials = true;

export const fetchUser = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/auth/status`, {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to fetch user.";
    }
};

export const googleAuth = async (code)=>{
    try {
        console.log(code);
        const response = await axios.post(`${API_BASE_URL}/auth/google`, { 'code':code } , {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Google authentication failed.";
    }
}

export const registerUser = async (userData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Registration failed.";
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials, {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Login failed.";
    }
};

export const logoutUser = async () => {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Logout failed.";
    }
};
