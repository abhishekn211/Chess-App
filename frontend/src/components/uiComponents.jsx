import React, { useState,useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send,Copy, Wifi, WifiOff, ShieldAlert, Home, Flag, Clock, Share2, Hourglass, Users, SearchX } from 'lucide-react';

const LoadingScreen = () => {
    console.log("--- RENDER: LoadingScreen ---");
    return (
        <div className="fixed inset-0 bg-slate-100 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-semibold mt-4">Loading Game...</p>
        </div>
    );
};

const PlayerInfo = ({ player, isSelf, isConnected, isMyTurn }) => {
    console.log(`--- RENDER: PlayerInfo for ${player?.username || 'Waiting...'} ---`, { player, isSelf, isConnected, isMyTurn });
    return (
        <div className={`flex items-center gap-4 p-1.5  rounded-lg transition-all duration-300 shadow-sm  bg-white/0 ${isMyTurn ? 'border-2 border-white' : 'border-2 border-slate-600'}`}>
            <img
                src={`https://api.dicebear.com/8.x/pixel-art/svg?seed=${player?.username || 'default'}`}
                alt="avatar"
                className="w-10 h-8 rounded-full bg-white"
            />
            <div className="flex-grow">
                <h3 className="font-bold text-lg text-white truncate">{player?.username || 'Waiting...'}</h3>
                <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-white' : 'text-gray-400'}`}>
                    {isConnected ? <Wifi size={14}/> : <WifiOff size={14}/>}
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-lg font-bold text-white">
                <Clock size={18} />
                <span>10:00</span>
            </div>
        </div>
    );
};

// In uiComponents.js

const MovesPanel = ({ history }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);
    console.log("--- RENDER: MovesPanel ---", { history });

    return (
        // 1. This is now a flex container that fills its parent (the h-[40%] div)
        <div className="bg-white/0  border border-white rounded-lg p-4 py-1 h-full flex flex-col">
            <h3 className="text font-semibold font-serif text-white pb-1 border-b border-white">
                Move History
            </h3>
            {/* 2. CRITICAL FIX: Removed h-64 and added flex-grow. This makes the scrollable
                area expand to fill the available space inside the panel. */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto pr-2">
                <table className="w-full text-white text-xs">
                    <tbody>
                        {history.map((turn, index) => (
                            <tr key={index} className='border-b border-white/20 last:border-0'>
                                <td className="p-2 text-center font-bold text-white w-8">{index + 1}.</td>
                                <td className="p-2 font-semibold">{turn.w}</td>
                                <td className="p-2 font-semibold">{turn.b || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// In your UI components file

const GamePanel = ({ onForfeit, onCopyLink, copySuccess, isWaiting }) => {
    return (
        // The container is now simpler, just a flexbox for the buttons.
        <div className="h-full flex items-center justify-around gap-1 p-3 mb-2">
            <button
                onClick={onCopyLink}
                disabled={isWaiting}
                className="flex-grow flex items-center justify-center gap-2 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-semibold shadow-md disabled:bg-gray-400"
            >
                <Share2 size={18} /> {copySuccess ? 'Copied!' : 'Invite'}
            </button>
            <button
                onClick={onForfeit}
                disabled={isWaiting}
                className="flex-grow flex items-center justify-center gap-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold shadow-md disabled:bg-gray-400"
            >
                <Flag size={18} /> Forfeit
            </button>
            <Link
                to="/home"
                className="flex-grow flex items-center justify-center gap-2 p-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-semibold shadow-md"
            >
                <Home size={18} /> Home
            </Link>
        </div>
    );
};

const ExitConfirmationPopup = ({ onConfirm, onCancel }) => {
    console.log("--- RENDER: ExitConfirmationPopup ---");
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white p-8 rounded-xl text-center shadow-2xl max-w-sm w-full">
                <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Leave Game?</h2>
                <p className="text-gray-600 mb-6">If you leave now, you will forfeit the match. Are you sure?</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Exit Game</button>
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const CancelSearchPopup = ({ onConfirm, onCancel }) => {
    console.log("--- RENDER: CancelSearchPopup ---");
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white p-8 rounded-xl text-center shadow-2xl max-w-sm w-full">
                <Hourglass size={48} className="mx-auto text-sky-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Stop Searching?</h2>
                <p className="text-gray-600 mb-6">Do you want to cancel the search for an opponent?</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">Stop Search</button>
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">Wait</button>
                </div>
            </div>
        </div>
    );
};

const StatusModal = ({ message }) => {
    console.log("--- RENDER: StatusModal ---", { message });
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-2xl font-bold mt-6 text-white">{message}</h2>
            </div>
        </div>
    );
};

const NotFoundPopup = () => {
    console.log("--- RENDER: NotFoundPopup ---");
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl text-center shadow-2xl max-w-sm w-full">
                <SearchX size={48} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Game Not Found</h2>
                <p className="text-gray-600 mb-6">The game you are looking for does not exist or has been completed.</p>
                <button onClick={() => navigate('/home')} className="px-8 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition font-semibold">
                    Back to Home
                </button>
            </div>
        </div>
    );
};

const PrivateGameLobbyModal = ({ onCopyLink, copySuccess }) => {
    console.log("--- RENDER: PrivateGameLobbyModal ---", { copySuccess });
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl text-center shadow-2xl max-w-md w-full">
                <Users size={48} className="mx-auto text-emerald-500 mb-4" />
                <h2 className="text-3xl font-bold mb-2 text-gray-800">Private Lobby</h2>
                <p className="text-gray-600 mb-6">Your private game is ready. Share the link with a friend to begin!</p>
                <div className="relative">
                    <button
                        onClick={onCopyLink}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-lg font-semibold shadow-md"
                    >
                        <Copy size={20} /> Copy Invite Link
                    </button>
                    {copySuccess && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm text-green-600 font-semibold">Link Copied!</span>}
                </div>
                <div className="mt-8 flex items-center justify-center gap-3 text-gray-500">
                    <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Waiting for opponent to join...</span>
                </div>
            </div>
        </div>
    );
};

const GameOverModal = ({ resultData, players, selfId }) => {
    console.log("--- RENDER: GameOverModal ---", { resultData, players, selfId });

    if (!resultData || !players.white || !players.black) {
        console.log("GameOverModal: Missing data, rendering null.", { resultData, players });
        return null;
    }
    const { result } = resultData;
    const isWinner = (result === 'WHITE_WINS' && players.white.id === selfId) || (result === 'BLACK_WINS' && players.black.id === selfId);
    const message = result === 'DRAW' ? "It's a Draw!" : isWinner ? "You Won!" : "You Lost";
    const messageColor = result === 'DRAW' ? 'text-yellow-500' : isWinner ? 'text-green-600' : 'text-red-600';

    console.log("GameOverModal: Displaying result -", message);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white p-10 rounded-lg text-center shadow-2xl">
                <h2 className={`text-5xl font-extrabold mb-4 ${messageColor}`}>{message}</h2>
                <p className="text-gray-600 mb-8">{result.replace(/_/g, ' ')}</p>
                <Link to="/home" className="px-8 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition font-semibold text-lg">Back to Home</Link>
            </div>
        </div>
    );
};

const ChatPanel = ({ messages, onSendMessage, selfUsername }) => {
    const [message, setMessage] = useState('');
    const scrollRef = useRef(null);

    // Effect to auto-scroll to the latest message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message);
            setMessage('');
        }
    };

    return (
        <div className="bg-white/0 border border-white rounded-lg p-4 py-1 h-full flex flex-col ">
            <h3 className="text font-semibold font-serif text-white mb-1 pb-1 border-b border-white">Chat</h3>
            
            {/* Message Display Area */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto pr-2 mb-1">
                <div className="flex flex-col gap-3">
                    {messages.map((msg, index) => (
                        <div 
                            key={index} 
                            className={`flex flex-col ${msg.senderUsername === selfUsername ? 'items-end' : 'items-start'}`}
                        >
                            <div 
                                className={`max-w-xs md:max-w-sm rounded-lg px-3 py-1 ${
                                    msg.senderUsername === selfUsername 
                                    ? 'bg-sky-500/0 border-1 text-white' 
                                    : 'bg-slate-200/0 border-1 text-white'
                                }`}
                            >
                                <p className="text-xs font-bold text-black font-serif mb-0.5">{msg.senderUsername}</p>
                                <p className="text-xs font-serif">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSend} className="flex items-center gap-2  pt-1">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="  Type a message..."
                    className="flex-grow font-serif p-1 border border-white text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button 
                    type="submit" 
                    className="p-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-md"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};



export {
    ChatPanel,
    LoadingScreen,
    PlayerInfo,
    MovesPanel,
    GamePanel,
    ExitConfirmationPopup,
    CancelSearchPopup,
    StatusModal,
    NotFoundPopup,
    PrivateGameLobbyModal,
    GameOverModal
}