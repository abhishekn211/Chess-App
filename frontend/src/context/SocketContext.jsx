// src/context/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Always start as true

    const [activeGame, setActiveGame] = useState(() => {
        try {
            const savedGame = localStorage.getItem('activeGame');
            return savedGame ? JSON.parse(savedGame) : null;
        } catch (error) {
            return null;
        }
    });

    useEffect(() => {
        if (user) {
            // FIX: If we have a user but no socket, we are definitively in a loading state.
            setIsLoading(true);

            const newSocket = io('https://chess-app-v3vb.onrender.com', { withCredentials: true });

            newSocket.on("connect", () => {
                console.log("Socket connected, sending FIND_ACTIVE_GAMES");
                newSocket.emit('message', JSON.stringify({ type: 'find_active_games' }));
            });

            // FIX: isLoading is ONLY set to false when we get a definitive answer.
            newSocket.on('active_game_found', (payload) => {
                console.log("Active game found:", payload);
                setActiveGame(payload);
                localStorage.setItem('activeGame', JSON.stringify(payload));
                setIsLoading(false); // Process finished
            });

            newSocket.on('no_active_game_found', () => {
                console.log("No active game found for this user.");
                setActiveGame(null);
                localStorage.removeItem('activeGame');
                setIsLoading(false); // Process finished
            });

            setSocket(newSocket);

            return () => newSocket.disconnect();
        } else {
            // If there's no user, the "loading" phase for an authenticated session is over.
            // But we must also ensure state is clean.
            setActiveGame(null);
            localStorage.removeItem('activeGame');
            setIsLoading(false); 
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{
            socket,
            activeGame,
            setActiveGame,
            isLoading
        }}>
            {children}
        </SocketContext.Provider>
    );
};