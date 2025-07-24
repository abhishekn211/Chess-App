// src/pages/ProfilePage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { getMyProfile, getProfileByUsername, getGameHistory, updateUsername, getAllFriends } from '../api/userApi';
import { Award, Gamepad2, BarChart, Edit, Check, X, Users, History, Crown } from 'lucide-react';

const ProfilePage = () => {
    const { username } = useParams();
    const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);
    const [friends, setFriends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [activeTab, setActiveTab] = useState('history');

    const isOwnProfile = !username || (user && user.username.toLowerCase() === username.toLowerCase());

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                setError('');
                const profile = isOwnProfile ? await getMyProfile() : await getProfileByUsername(username);
                const history = await getGameHistory(profile._id);
                
                setProfileData(profile);
                setGameHistory(history);

                if (isOwnProfile) {
                    setNewUsername(profile.username);
                    const friendsData = await getAllFriends();
                    setFriends(friendsData);
                }
            } catch (err) {
                setError('Could not load profile. User may not exist.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        if (user || username) {
            fetchProfile();
        }
    }, [username, user]);
    
    const handleUpdateUsername = async () => {
        if (!newUsername || newUsername.trim().length < 3) {
            alert("Username must be at least 3 characters.");
            return;
        }
        try {
            const updatedUser = await updateUsername(user._id, newUsername);
            setUser({ ...user, username: updatedUser.username });
            setProfileData({ ...profileData, username: updatedUser.username });
            setIsEditing(false);
            navigate(`/profile`, { replace: true });
        } catch (err) {
            alert(`Error: ${err}`);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (error) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-red-500 text-2xl">{error}</div>;

    const renderTabContent = () => {
        if (activeTab === 'friends') {
            return (
                <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {friends.length > 0 ? friends.map(friend => (
                        <li key={friend._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg hover:bg-sky-100/50 transition">
                            <Link to={`/user/${friend.username}`} className="font-semibold text-gray-800 hover:text-sky-600">{friend.username}</Link>
                            <span className="text-sm text-gray-500 flex items-center gap-1"><Crown size={14} className="text-yellow-500"/> {friend.eloRating}</span>
                        </li>
                    )) : <p className="text-gray-500 text-center py-4">No friends to show.</p>}
                </ul>
            );
        }

        // Default to game history
        return (
            <div className="space-y-3">
                {gameHistory.length > 0 ? gameHistory.map(game => (
                    <GameHistoryItem key={game._id} game={game} />
                )) : <p className="text-gray-500 text-center py-4">No recent games to show.</p>}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 text-gray-800 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/home')} className="mb-8 text-sky-600 hover:text-sky-500 font-semibold transition">&larr; Back to Home</button>
                
                <div className="bg-white rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-lg border border-gray-200">
                    <img src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${profileData.username}`} alt="avatar" className="w-24 h-24 rounded-full border-4 border-sky-500" />
                    <div className="flex-1 text-center sm:text-left">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="text-3xl font-bold bg-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                                <button onClick={handleUpdateUsername} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"><Check size={18}/></button>
                                <button onClick={() => setIsEditing(false)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><X size={18}/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <h1 className="text-4xl font-bold">{profileData.username}</h1>
                                {isOwnProfile && <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-gray-700"><Edit size={20}/></button>}
                            </div>
                        )}
                        <p className="text-gray-500">{profileData.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <StatCard icon={<Award className="text-yellow-400" />} label="Elo Rating" value={profileData.eloRating} />
                    <StatCard icon={<Gamepad2 className="text-blue-400" />} label="Games Played" value={profileData.gamesPlayed} />
                    <StatCard icon={<BarChart className="text-green-400" />} label="Win Rate" value={profileData.gamesPlayed > 0 ? `${Math.round((profileData.gamesWin / profileData.gamesPlayed) * 100)}%` : 'N/A'} />
                    <div className="bg-white p-4 rounded-lg flex flex-col items-center justify-center border border-gray-200 shadow-sm">
                        <div className="flex gap-4 text-sm">
                            <span className="text-green-600 font-medium">W: {profileData.gamesWin}</span>
                            <span className="text-red-600 font-medium">L: {profileData.gamesLoss}</span>
                            <span className="text-gray-500 font-medium">D: {profileData.gamesDraw}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-10 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                    <div className="flex border-b border-gray-200 mb-6">
                         <TabButton icon={<History />} label="Game History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
                         {isOwnProfile && (
                            <TabButton icon={<Users />} label="Friends" active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} />
                         )}
                    </div>
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value }) => (
    <div className="bg-white p-4 rounded-lg flex items-center gap-4 border border-gray-200 shadow-sm">
        <div className="text-3xl">{icon}</div>
        <div>
            <p className="text-gray-500 text-sm">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const GameHistoryItem = ({ game }) => {
    const resultColor = game.result === 'Win' ? 'text-green-600' : game.result === 'Loss' ? 'text-red-600' : 'text-gray-500';
    return (
        <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center border border-gray-200 hover:bg-gray-100 transition">
            <div>
                <p className="font-semibold text-gray-700">vs {game.opponent}</p>
                <p className={`text-sm font-bold ${resultColor}`}>{game.result}</p>
            </div>
            <p className="text-gray-500 text-sm">{game.duration}</p>
        </div>
    );
};

const TabButton = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition relative border-b-2 ${
            active
                ? 'text-sky-600 border-sky-600'
                : 'text-gray-500 border-transparent hover:text-gray-800'
        }`}
    >
        {icon}
        {label}
    </button>
);

export default ProfilePage;