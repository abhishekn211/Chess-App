// src/api/userApi.js

import axios from 'axios';
const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}/api` ; // Use environment variable or default to localhost
axios.defaults.withCredentials = true;

// Apni profile fetch karna
export const getMyProfile = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`);
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to fetch profile.";
    }
};

// Dusre user ki profile username se fetch karna
export const getProfileByUsername = async (username) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/u/${username}`);
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to fetch user profile.";
    }
};

// User ki game history fetch karna
export const getGameHistory = async (userId) => {
    try {
        // NOTE: Iske liye backend mein ek naya route (e.g., GET /api/games/history/:userId) banana hoga.
        // Jab tak woh nahi banta, yeh dummy data istemal hoga.
        await new Promise(res => setTimeout(res, 500));
        return [
            { _id: 1, opponent: 'DeepBlue', result: 'Win', duration: '15:23' },
            { _id: 2, opponent: 'Kasparov', result: 'Loss', duration: '30:10' },
            { _id: 3, opponent: 'Carlsen', result: 'Draw', duration: '45:00' },
            { _id: 4, opponent: 'Anand', result: 'Win', duration: '22:45' },
        ];
    } catch (error) {
        throw error?.response?.data?.message || "Failed to fetch game history.";
    }
};

// Username update karna
export const updateUsername = async (userId, newUsername) => {
    try {
        const response = await axios.patch(`${API_BASE_URL}/user/${userId}`, { username: newUsername });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to update username.";
    }
};


// Friends
export const getAllFriends = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/friends`);
        return response.data.friends;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to fetch friends.";
    }
};

// Friend Requests
export const getFriendRequests = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/friend-requests`);
        return response.data.friendRequests;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to fetch friend requests.";
    }
};

export const respondToFriendRequest = async (senderId, action) => {
    try {
        const response = await axios.patch(`${API_BASE_URL}/user/friend-request/${senderId}`, { action });
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to respond to request.";
    }
};

// Search Users & Send Request
export const searchUsers = async (username) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/user/search?username=${username}`);
        return response.data.users;
    } catch (error) {
        // Handle 404 "No users found" gracefully
        if (error.response && error.response.status === 404) {
            return [];
        }
        throw error?.response?.data?.message || "Failed to search users.";
    }
};

export const sendFriendRequest = async (userId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/user/friend/${userId}`);
        return response.data;
    } catch (error) {
        throw error?.response?.data?.message || "Failed to send friend request.";
    }
};