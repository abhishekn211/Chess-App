import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Chessboard } from 'react-chessboard';
import { getMyProfile, getAllFriends, getFriendRequests, respondToFriendRequest, searchUsers, sendFriendRequest } from '../api/userApi';
import { User, Users, UserPlus, LogOut, Search, Swords, Link as LinkIcon, X, Check, Crown, Gamepad2, AlertTriangle } from 'lucide-react';

// --- Reconnect Popup Component (Unchanged) ---
const ReconnectPopup = ({ onContinue, onQuit }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-xl text-center shadow-2xl max-w-sm w-full">
            <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Active Game Found</h2>
            <p className="text-gray-600 mb-6">You are already in a game. Do you want to continue or quit?</p>
            <div className="flex justify-center gap-4">
                <button
                    onClick={onContinue}
                    className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 transition"
                >
                    Continue
                </button>
                <button
                    onClick={onQuit}
                    className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
                >
                    Quit Game
                </button>
            </div>
        </div>
    </div>
);

// --- New Loading Component ---
const LoadingScreen = () => (
    <div className="fixed inset-0 bg-slate-100 flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-700 font-semibold mt-4">Loading Dashboard...</p>
    </div>
);


const Home = () => {
    const { user, logout } = useContext(AuthContext);
    // --- Consume isLoading from the context ---
    const { activeGame, setActiveGame, socket, isLoading } = useSocket();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('profile');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showReconnectPopup, setShowReconnectPopup] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileData, friendsData, requestsData] = await Promise.all([
                    getMyProfile(),
                    getAllFriends(),
                    getFriendRequests()
                ]);
                setProfile(profileData);
                setFriends(friendsData);
                setRequests(requestsData);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (socket) {
            const handlePrivateGameAdded = (data) => {
                navigate(`/game?gameId=${data.gameId}`);
            };
            socket.on('private_game_added', handlePrivateGameAdded);

            return () => {
                socket.off('private_game_added', handlePrivateGameAdded);
            };
        }
    }, [socket, navigate]);
    
    const handlePlayAttempt = (action) => {
        if (activeGame) {
            setShowReconnectPopup(true);
        } else {
            action();
        }
    };

    const handlePlayRandom = () => {
        handlePlayAttempt(() => navigate('/game'));
    };

    const handleCreatePrivateGame = () => {
        handlePlayAttempt(() => {
            socket?.emit('message', JSON.stringify({ type: 'create_private_game' }));
        });
    };

    const handleContinueGame = () => {
        if (activeGame?.gameId) {
            navigate(`/game?gameId=${activeGame.gameId}`);
        }
        setShowReconnectPopup(false);
    };

    const handleQuitGame = () => {
        if (socket && activeGame?.gameId) {
            socket.emit('message', JSON.stringify({
                type: 'exit_game',
                payload: { gameId: activeGame.gameId }
            }));
        }
        setActiveGame(null);
        setShowReconnectPopup(false);
        alert("You have left the active game.");
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };
    
    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.trim() === '') return;
        try {
            setSearchResults(await searchUsers(searchTerm));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await sendFriendRequest(userId);
            alert('Friend request sent!');
        } catch (error) {
            alert(error);
        }
    };

    const handleRequestResponse = async (senderId, action) => {
        try {
            await respondToFriendRequest(senderId, action);
            setRequests(requests.filter(req => req._id !== senderId));
            if (action === 'accept') {
                setFriends(await getAllFriends());
            }
        } catch (error) {
            alert(error);
        }
    };

    const renderActiveTab = () => {
        // (This function's content is unchanged)
        switch (activeTab) {
            case 'friends':
                return (
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Find & Manage Friends</h3>
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <input type="text" placeholder="Search by username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500" />
                            <button type="submit" className="p-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition"><Search size={20} /></button>
                        </form>
                        {searchResults.length > 0 && (
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-600">Search Results:</h4>
                                <ul className="space-y-2 mt-2">
                                    {searchResults.map(res => (
                                        <li key={res._id} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                                            <span className="text-gray-700">{res.username} <span className="text-gray-500 text-sm">(Elo: {res.eloRating})</span></span>
                                            <button onClick={() => handleSendRequest(res._id)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Add Friend</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <h4 className="font-semibold text-gray-600 mb-2">Your Friends:</h4>
                        <ul className="space-y-2 max-h-48 lg:max-h-60 overflow-y-auto pr-2">
                            {friends.length > 0 ? friends.map(friend => (
                                <li key={friend._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg hover:bg-sky-100/50 transition">
                                    <Link to={`/user/${friend.username}`} className="font-semibold text-gray-800 hover:text-sky-600">{friend.username}</Link>
                                    <span className="text-sm text-gray-500 flex items-center gap-1"><Crown size={14} className="text-yellow-500"/> {friend.eloRating}</span>
                                </li>
                            )) : <p className="text-gray-500">Search for users to add friends.</p>}
                        </ul>
                    </div>
                );
            case 'requests':
                return (
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-gray-800">Friend Requests</h3>
                        <ul className="space-y-3">
                            {requests.length > 0 ? requests.map(req => (
                                <li key={req._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                                    <span className="font-semibold text-gray-800">{req.username}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRequestResponse(req._id, 'accept')} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"><Check size={16} /></button>
                                        <button onClick={() => handleRequestResponse(req._id, 'reject')} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"><X size={16} /></button>
                                    </div>
                                </li>
                            )) : <p className="text-gray-500">No pending requests.</p>}
                        </ul>
                    </div>
                );
            case 'profile':
            default:
                return (
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-gray-800 capitalize">{profile?.username}'s Stats</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p className="text-2xl font-bold text-sky-600">{profile?.eloRating || 'N/A'}</p>
                                <p className="text-sm text-gray-500">Elo Rating</p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <p className="text-2xl font-bold text-gray-700">{profile?.gamesPlayed || 0}</p>
                                <p className="text-sm text-gray-500">Games Played</p>
                            </div>
                            <div className="bg-gray-100 p-4 rounded-lg col-span-2">
                                <p className="text-xl font-bold">
                                    <span className="text-green-600">{profile?.gamesWin || 0}</span> W / 
                                    <span className="text-red-600"> {profile?.gamesLoss || 0}</span> L / 
                                    <span className="text-gray-600"> {profile?.gamesDraw || 0}</span> D
                                </p>
                                <p className="text-sm text-gray-500">Record</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    // --- Render loading screen or the page ---
    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
    // 1. The root div now controls the background image for the whole page.
    // bg-cover and bg-center ensure it scales nicely. bg-fixed keeps it in place on scroll.
    <div 
        className="min-h-screen text-gray-800 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
            backgroundImage: "url('/home-bg1.webp')", 
            backgroundSize: 'cover',
        }}
    >
        {showReconnectPopup && <ReconnectPopup onContinue={handleContinueGame} onQuit={handleQuitGame} />}

        {/* This wrapper ensures the header and main content are stacked vertically */}
        <div className="flex flex-col min-h-screen">

            {/* 2. A single, unified header that is always visible */}
            <header className="w-full p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm shadow-md">
                <h1 className="text-2xl lg:text-3xl font-bold text-sky-400">ChessWarriors</h1>
                <div className="flex items-center gap-4">
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 border border-gray-200/50 rounded-md hover:bg-white transition text-sm font-medium">
                        <User size={18} />
                        {/* The label "My Profile" is hidden on very small screens for a cleaner look */}
                        <span className="hidden sm:inline">My Profile</span>
                    </Link>
                    <button onClick={handleLogout} className="p-2 bg-slate-100/80 border border-gray-200/50 rounded-full hover:bg-white transition">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* 3. The main content area now grows to fill the remaining space */}
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto gap-6">
                    
                    {/* Left Column */}
                    <div className="w-full lg:w-1/2 flex items-center justify-center">
                        {/* 4. Container for the chessboard with a semi-transparent background for readability */}
                        <div className="w-full max-w-md xl:max-w-lg p-6 sm:p-12  shadow-2xl  border border-white">
                            <Chessboard 
                                id="LobbyBoard" 
                                arePiecesDraggable={false} 
                                customBoardTheme={{ light: { backgroundColor: '#f0d9b5' }, dark: { backgroundColor: '#b58863' } }} 
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="w-full lg:w-1/2 flex flex-col gap-4">
                        {/* Container for the game start buttons */}
                        <footer className="w-full max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold mb-4 text-center text-white text-shadow-lg">Start a New Game</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={handlePlayRandom} className="flex items-center justify-center gap-3 p-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition text-lg font-semibold shadow-xl">
                                    <Swords /> Play Random
                                </button>
                                <button onClick={handleCreatePrivateGame} className="flex items-center justify-center gap-3 p-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-lg font-semibold shadow-xl">
                                    <LinkIcon /> Play with Friend
                                </button>
                            </div>
                        </footer>
                        
                        {/* Container for the tabbed panel */}
                        <div className="w-full max-w-2xl mx-auto mt-4 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-white/20">
                            <div className="flex flex-wrap justify-center sm:justify-start border-b border-gray-200 mb-6">
                                <TabButton icon={<User />} label="Profile" activeTab={activeTab} onClick={() => setActiveTab('profile')} />
                                <TabButton icon={<Users />} label="Friends" activeTab={activeTab} onClick={() => setActiveTab('friends')} />
                                <TabButton icon={<UserPlus />} label="Requests" activeTab={activeTab} onClick={() => setActiveTab('requests')} count={requests.length} />
                            </div>
                            {renderActiveTab()}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    </div>
);
};

const TabButton = ({ icon, label, activeTab, onClick, count }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold transition relative border-b-2 ${
            activeTab === label.toLowerCase()
                ? 'text-sky-600 border-sky-600'
                : 'text-gray-500 border-transparent hover:text-gray-800'
        }`}
    >
        {icon}
        {label}
        {count > 0 && (
            <span className="absolute top-1 right-1 -mt-1 -mr-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">
                {count}
            </span>
        )}
    </button>
);

export default Home;
