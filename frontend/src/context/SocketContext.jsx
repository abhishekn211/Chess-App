// src/context/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [activeGame, setActiveGame] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const newSocket = io('https://chess-app-v3vb.onrender.com/api', { 
                withCredentials: true,
                // Standard reconnection options
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
            
            newSocket.on("connect", () => {
                console.log("Socket connected, sending FIND_ACTIVE_GAMES");
                newSocket.emit('message', JSON.stringify({ type: 'find_active_games' }));
            });

            newSocket.on('active_game_found', (payload) => {
                console.log("Active game found:", payload);
                setActiveGame(payload);
                setIsLoading(false);
            });

            newSocket.on('no_active_game_found', () => {
                console.log("No active game found for this user.");
                setActiveGame(null);
                setIsLoading(false);
            });

            setSocket(newSocket);

            // --- CHANGE: Add Page Visibility API handler ---
            const handleVisibilityChange = () => {
                // When the tab becomes visible again...
                if (document.visibilityState === 'visible') {
                    // ...check if the socket is disconnected.
                    if (newSocket && newSocket.disconnected) {
                        console.log('Tab is visible and socket is disconnected. Attempting to reconnect...');
                        // Manually trigger a connection attempt.
                        newSocket.connect();
                    }
                }
            };

            // Add the event listener to the document
            document.addEventListener('visibilitychange', handleVisibilityChange);
            // --- END OF CHANGE ---

            return () => {
                console.log("Cleaning up socket and listeners.");
                // --- CHANGE: Clean up the visibility listener ---
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                newSocket.disconnect();
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            setIsLoading(false);
        }
    }, [user]); 
    
    const value = useMemo(() => ({
        socket,
        activeGame,
        setActiveGame,
        isLoading
    }), [socket, activeGame, isLoading]);
    
    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
