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
            
            const SERVER_URL = import.meta.env.VITE_SERVER_URL ; 
            const newSocket = io(SERVER_URL, { 
                withCredentials: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
            
            // --- ADDED: More detailed event listeners for debugging ---
            newSocket.on("connect", () => {
                console.log(`%cSocket connected with ID: ${newSocket.id}`, 'color: green; font-weight: bold;');
                newSocket.emit('message', JSON.stringify({ type: 'find_active_games' }));
            });

            newSocket.on("disconnect", (reason) => {
                console.warn(`%cSocket disconnected: ${reason}`, 'color: orange;');
            });

            newSocket.on("connect_error", (err) => {
                console.error(`%cSocket connection error: ${err.message}`, 'color: red;');
            });
            // --- END OF ADDED LISTENERS ---
            
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

            const handleVisibilityChange = () => {
                if (document.visibilityState === 'visible') {
                    // --- CHANGE: Use a small timeout to allow the browser to fully resume ---
                    setTimeout(() => {
                        if (newSocket && !newSocket.connected) {
                            console.log('%cTab is visible and socket is not connected. Forcing connection...', 'color: blue; font-weight: bold;');
                            // The .connect() method is the correct way to manually initiate a connection.
                            newSocket.connect();
                        } else {
                             console.log('%cTab is visible and socket is already connected.', 'color: green;');
                        }
                    }, 250); // 250ms delay
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            return () => {
                console.log("Cleaning up socket and listeners.");
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
