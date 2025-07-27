import React, { useState, useEffect, useContext, useRef } from "react";
import {
  useSearchParams,
  useNavigate,
  Link,
  useBlocker,
} from "react-router-dom";
import { Chess } from "chess.js";
import { useSocket } from "../context/SocketContext";
import AuthContext from "../context/AuthContext";
import CustomChessboard from "../components/CustomChessboard";
import {
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
  GameOverModal,
} from "../components/uiComponents";

const GamePage = () => {
  console.log("--- RENDER: GamePage Component ---");

  const soundsRef = useRef({});

  // + ADD: useEffect to preload all sounds once on component mount
  useEffect(() => {
    const soundNames = [
      'capture', 'castle', 'game-end', 'game-start', 'illegal',
      'move-check', 'move-self', 'promote', 'notify'
    ];
    soundNames.forEach(name => {
      const isMp3 = name === 'notify';
      const audio = new Audio(`/sounds/${name}.${isMp3 ? 'mp3' : 'webm'}`);
      soundsRef.current[name] = audio;
    });
  }, []);

  // + ADD: A helper function to safely play sounds
  const playSound = (soundName) => {
    const sound = soundsRef.current[soundName];
    if (sound) {
      sound.currentTime = 0; // Rewind to the start
      sound.play().catch(error => console.error(`Error playing sound: ${soundName}`, error));
    }
  };

  const { user } = useContext(AuthContext);
  const { socket, activeGame, setActiveGame, isLoading } = useSocket();
  console.log("Active Game:", activeGame);
  console.log(isLoading);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [gameStatus, _setGameStatus] = useState("waiting");
  const setGameStatus = (status) => {
    console.log(`%cSTATE CHANGE: gameStatus -> ${status}`, "color: #e67e22;");
    _setGameStatus(status);
  };

  const gameRef = useRef(new Chess());
  const [game, _setGame] = useState(gameRef.current);
  const setGame = (newGame) => {
    console.log(
      `%cSTATE CHANGE: game (FEN) -> ${newGame.fen()}`,
      "color: #e67e22;"
    );
    _setGame(newGame);
  };

  const [moveHistory, _setMoveHistory] = useState([]);
  const setMoveHistory = (history) => {
    console.log("%cSTATE CHANGE: moveHistory ->", "color: #e67e22;", history);
    _setMoveHistory(history);
  };

  const [players, _setPlayers] = useState({ white: null, black: null });
  const setPlayers = (newPlayers) => {
    console.log("%cSTATE CHANGE: players ->", "color: #e67e22;", newPlayers);
    _setPlayers(newPlayers);
  };

  const [boardOrientation, _setBoardOrientation] = useState("white");
  const setBoardOrientation = (orientation) => {
    console.log(
      `%cSTATE CHANGE: boardOrientation -> ${orientation}`,
      "color: #e67e22;"
    );
    _setBoardOrientation(orientation);
  };

  const [gameResult, _setGameResult] = useState(null);
  const setGameResult = (result) => {
    console.log("%cSTATE CHANGE: gameResult ->", "color: #e67e22;", result);
    _setGameResult(result);
  };

  const [copySuccess, _setCopySuccess] = useState(false);
  const setCopySuccess = (success) => {
    console.log(`%cSTATE CHANGE: copySuccess -> ${success}`, "color: #e67e22;");
    _setCopySuccess(success);
  };

  const [opponentConnected, _setOpponentConnected] = useState(true);
  const setOpponentConnected = (isConnected) => {
    console.log(
      `%cSTATE CHANGE: opponentConnected -> ${isConnected}`,
      "color: #e67e22;"
    );
    _setOpponentConnected(isConnected);
  };

  const [gameId, _setGameId] = useState(searchParams.get("gameId"));
  const setGameId = (id) => {
    console.log(`%cSTATE CHANGE: gameId -> ${id}`, "color: #e67e22;");
    _setGameId(id);
  };

  const [showNotFoundPopup, _setShowNotFoundPopup] = useState(false);
  const setShowNotFoundPopup = (show) => {
    console.log(
      `%cSTATE CHANGE: showNotFoundPopup -> ${show}`,
      "color: #e67e22;"
    );
    _setShowNotFoundPopup(show);
  };

  const [showPrivateWaitPopup, _setShowPrivateWaitPopup] = useState(false);
  const setShowPrivateWaitPopup = (show) => {
    console.log(
      `%cSTATE CHANGE: showPrivateWaitPopup -> ${show}`,
      "color: #e67e22;"
    );
    _setShowPrivateWaitPopup(show);
  };

  const [chatHistory, _setChatHistory] = useState([]);
    const setChatHistory = (history) => {
    console.log("%cSTATE CHANGE: chatHistory ->", "color: #e67e22;", history);
    _setChatHistory(history);
  };


  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (gameStatus === "in_progress" || gameStatus === "waiting") &&
      currentLocation.pathname !== nextLocation.pathname
  );
  console.log("Blocker state:", blocker.state);

  const handleConfirmExit = () => {
    console.log("HANDLER: handleConfirmExit called.");
    if (socket && gameId) {
      const payload = { type: "exit_game", payload: { gameId } };
      console.log("SOCKET EMIT (Outgoing): 'message'", payload);
      socket.emit("message", JSON.stringify(payload));
    }
    setActiveGame(null);
    if (blocker.state === "blocked") {
      console.log("Blocker: Proceeding with navigation after exit.");
      blocker.proceed();
    }
  };

  const handleConfirmCancelSearch = () => {
    console.log("HANDLER: handleConfirmCancelSearch called.");
    if (socket) {
      const payload = { type: "cancel_search" };
      console.log("SOCKET EMIT (Outgoing): 'message'", payload);
      socket.emit("message", JSON.stringify(payload));
      socket.once("search_cancelled", () => {
        console.log("SOCKET ONCE (Incoming): 'search_cancelled' received.");
        if (blocker.state === "blocked") {
          console.log(
            "Blocker: Proceeding with navigation after search cancel."
          );
          blocker.proceed();
        }
      });
    }
  };

  const handleCancelNavigation = () => {
    console.log("HANDLER: handleCancelNavigation called.");
    if (blocker.state === "blocked") {
      console.log("Blocker: Resetting blocker state.");
      blocker.reset();
    }
  };

  useEffect(() => {
    console.log("EFFECT: Active game check triggered.", {
      isLoading,
      activeGame: activeGame?.gameId,
      searchParams: searchParams.get("gameId"),
    });
    if (isLoading || !socket) {
      return;
    }
    if (!isLoading) {
      const gameIdFromUrl = searchParams.get("gameId");
      if (activeGame && activeGame.gameId !== gameIdFromUrl) {
        console.log(
          `Redirecting from ${gameIdFromUrl} to active game ${activeGame.gameId}`
        );
        navigate(`/game?gameId=${activeGame.gameId}`, { replace: true });
        return;
      }
    }
  }, [isLoading, navigate, searchParams]);

  useEffect(() => {
    console.log("EFFECT: Main game logic setup triggered.", {
      isLoading,
      socketConnected: socket?.connected,
      gameId,
      gameStatus,
    });
    if (isLoading || !socket) {
      console.log("Main Effect: Bailing out. isLoading or no socket.");
      return;
    }

    const gameIdFromUrl = searchParams.get("gameId");
    if (activeGame && gameIdFromUrl !== activeGame.gameId) {
      console.log(
        "Main Effect: Bailing out. URL gameId does not match active game."
      );
      navigate(`/game?gameId=${activeGame.gameId}`, { replace: true });
      return;
    }

    const gameIdToJoin = gameIdFromUrl || activeGame?.gameId;

    if (gameIdToJoin) {
      console.log(`Main Effect: Joining game room for gameId: ${gameIdToJoin}`);
      setGameId(gameIdToJoin);
      const payload = { type: "join_room", payload: { gameId: gameIdToJoin } };
      console.log("SOCKET EMIT (Outgoing): 'message'", payload);
      socket.emit("message", JSON.stringify(payload));
    } else {
      console.log("Main Effect: Initializing a new game.");
      const payload = { type: "init_game" };
      console.log("SOCKET EMIT (Outgoing): 'message'", payload);
      socket.emit("message", JSON.stringify(payload));
    }

    const handleGameAdded = (data) => {
      console.log("SOCKET ON (Incoming): 'game_added'", data);
      if (!gameIdFromUrl) {
        console.log("`game_added`: setting new gameId from server.");
        setGameId(data.gameId);
      }
    };

    const setupGame = (data, eventName) => {
      console.log(`Calling setupGame from '${eventName}' event`, data);
      setShowPrivateWaitPopup(false);
      const newGame = new Chess();
      if (data.fen) {
        console.log("setupGame: Loading FEN from server:", data.fen);
        newGame.load(data.fen);
      }
      gameRef.current = newGame;
      setGame(newGame);

      if (data.moves) {
        console.log("setupGame: Setting move history from server.");
        setMoveHistory(data.moves);
      } else {
        console.log("setupGame: Setting move history from new chess instance.");
        setMoveHistory(newGame.history({ verbose: true }));
      }

      setPlayers((prev) => ({
        white: { ...prev.white, ...data.whitePlayer },
        black: { ...prev.black, ...data.blackPlayer },
      }));

      if (data.whitePlayer?.id === user._id) {
        console.log(
          "setupGame: User is white player. Setting orientation to white."
        );
        setBoardOrientation("white");
      } else if (data.blackPlayer?.id === user._id) {
        console.log(
          "setupGame: User is black player. Setting orientation to black."
        );
        setBoardOrientation("black");
      }
      setGameStatus("in_progress");
      setOpponentConnected(true);
      setActiveGame({ gameId: data.gameId });
      setChatHistory(data.chatHistory || []);
      playSound('game-start');
    };

    const handleInitGame = (data) => {
      console.log("SOCKET ON (Incoming): 'init_game'", data);
      if (!gameIdFromUrl) setGameId(data.gameId);
      setupGame(data, "init_game");
    };

    const handleGameJoined = (data) => {
      console.log("SOCKET ON (Incoming): 'game_joined'", data);
      setupGame(data, "game_joined");
    };

    const handleBoardState = (data) => {
      console.log("SOCKET ON (Incoming): 'board_state'", data);
      gameRef.current.load(data.fen);
      setGame(new Chess(data.fen));
    };

    const handleMoveFromServer = (data) => {
      console.log(`%c--- handleMoveFromServer Initiated ---`, 'color: #f39c12; font-weight: bold;');
      const { move } = data;

      if (move) {
        // --- UPDATED: Sound logic without using deprecated .flags ---
        if (move.san.includes('+') || move.san.includes('#')) {
          playSound('move-check');
        } else if (move.promotion) { // Check for a promotion
          playSound('promote');
        } else if (move.san === 'O-O' || move.san === 'O-O-O') { // Check for castling
          playSound('castle');
        } else if (move.captured) { // Check for a capture
          playSound('capture');
        } else {
          playSound('move-self');
        }
        
        setMoveHistory((prev) => [...prev, data.move]);
      }
    };

    const handleGameEnded = (data) => {
      console.log("SOCKET ON (Incoming): 'game_ended'", data);
      playSound('game-end');
      setGameStatus("ended");
      setGameResult(data);
      setPlayers((prev) => ({
        white: { ...prev.white, ...data.whitePlayer },
        black: { ...prev.black, ...data.blackPlayer },
      }));
      setActiveGame(null);
    };

    const handleGameAlert = (data) => {
      console.log("SOCKET ON (Incoming): 'game_alert'", data);
      if (data.message === "You are Player 1. Waiting for opponent.") {
        setShowPrivateWaitPopup(true);
      } else {
        alert(data.message);
      }
    };

    const handleGameNotFound = () => {
      console.log("SOCKET ON (Incoming): 'game_not_found'");
      setShowNotFoundPopup(true);
    };

    const handlePlayerDisconnected = () => {
      console.log("SOCKET ON (Incoming): 'player_disconnected'");
      setOpponentConnected(false);
    };
    const handlePlayerReconnected = () => {
      console.log("SOCKET ON (Incoming): 'player_reconnected'");
      setOpponentConnected(true);
    };
    const handleNewChatMessage = (newMessage) => {
            console.log("SOCKET ON (Incoming): 'new_chat_message'", newMessage);
            if (newMessage.senderId !== user._id) {
              playSound('notify');
            }
            setChatHistory(prevHistory => [...prevHistory, newMessage]);
    };
    console.log("Main Effect: Attaching socket listeners.");
    socket.on("game_added", handleGameAdded);
    socket.on("init_game", handleInitGame);
    socket.on("board_state", handleBoardState);
    socket.on("game_ended", handleGameEnded);
    socket.on("game_alert", handleGameAlert);
    socket.on("game_joined", handleGameJoined);
    socket.on("player_disconnected", handlePlayerDisconnected);
    socket.on("player_reconnected", handlePlayerReconnected);
    socket.on("game_not_found", handleGameNotFound);
    socket.on("move", handleMoveFromServer);
    socket.on('new_chat_message', handleNewChatMessage);

    return () => {
      console.log("EFFECT CLEANUP: Removing all socket listeners.");
      socket.off("game_added", handleGameAdded);
      socket.off("init_game", handleInitGame);
      socket.off("board_state", handleBoardState);
      socket.off("game_ended", handleGameEnded);
      socket.off("game_alert", handleGameAlert);
      socket.off("game_joined", handleGameJoined);
      socket.off("player_disconnected", handlePlayerDisconnected);
      socket.off("player_reconnected", handlePlayerReconnected);
      socket.off("game_not_found", handleGameNotFound);
      socket.off("move", handleMoveFromServer);
      socket.off('new_chat_message', handleNewChatMessage);
    };
  }, [socket, isLoading, searchParams, navigate, user._id]);

  const handleSendMessage = (messageText) => {
    if(isLoading || !socket) {
      console.log("Socket is not connected. Cannot send message.");
      return;
    }
    console.log("Sending message:", messageText);
    if (socket && gameId) {
            socket.emit('message', JSON.stringify({ 
                type: 'chat_message', 
                payload: { text: messageText, gameId: gameId } 
            }));
    }
  };
const handleMove = (from, to) => {
    console.log(`%c--- handleMove Initiated ---`, 'color: #2980b9; font-weight: bold;');
    if (
      gameStatus !== "in_progress" ||
      gameRef.current.turn() !== boardOrientation[0]
    ) {
      console.error(" M-2: Move BLOCKED by guard clause.");
      return;
    }
    const moveData = { from, to, promotion: "q" };
    const move = gameRef.current.move(moveData);

    if (!move) {
      console.error(" M-4: Move is ILLEGAL. Playing sound and stopping.");
      playSound('illegal');
      return;
    }

    console.log("%c M-4: Move is LEGAL. Proceeding...", 'color: #27ae60;');

    // --- UPDATED: Sound logic without using deprecated .flags ---
    if (gameRef.current.isCheck()) {
      playSound('move-check');
    } else if (move.promotion) { // Check for a promotion
      playSound('promote');
    } else if (move.san === 'O-O' || move.san === 'O-O-O') { // Check for castling
      playSound('castle');
    } else if (move.captured) { // Check for a capture
      playSound('capture');
    } else {
      playSound('move-self');
    }

    setGame(new Chess(gameRef.current.fen()));

    const payload = {
      type: "move",
      payload: { gameId: gameId, move },
    };
    socket?.emit("message", JSON.stringify(payload));
  };

  const handleCopyLink = () => {
    console.log("HANDLER: handleCopyLink called.");
    const link = `${window.location.origin}/game?gameId=${gameId}`;
    navigator.clipboard.writeText(link);
    console.log("Copied to clipboard:", link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  console.log("PRE-RENDER LOGIC: Formatting move history.");
  const formattedMoveHistory = moveHistory.reduce((acc, move, index) => {
    if (index % 2 === 0) {
      acc.push({ w: move.san, b: null });
    } else {
      acc[acc.length - 1].b = move.san;
    }
    return acc;
  }, []);
  console.log(
    "PRE-RENDER LOGIC: Formatted move history is:",
    formattedMoveHistory
  );

  const isMyTurn =
    gameStatus === "in_progress" && game.turn() === boardOrientation[0];
  const opponent = boardOrientation === "white" ? players.black : players.white;
  const self = boardOrientation === "white" ? players.white : players.black;
  const isPrivateLobby =
    gameStatus === "in_progress" && gameId && !players.black;

  console.log("PRE-RENDER LOGIC: Calculated values:", {
    isMyTurn,
    opponent,
    self,
    isPrivateLobby,
    isLoading,
  });

  if (isLoading) {
    console.log("RENDER: Showing LoadingScreen.");
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen  text-gray-800 flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: "url('/wooden-bg.webp')", backgroundSize: 'cover' }}>
      {console.log("RENDER: Main JSX body.")}
      {blocker.state === "blocked" &&
        (gameStatus === "in_progress" ? (
          <ExitConfirmationPopup
            onConfirm={handleConfirmExit}
            onCancel={handleCancelNavigation}
          />
        ) : (
          <CancelSearchPopup
            onConfirm={handleConfirmCancelSearch}
            onCancel={handleCancelNavigation}
          />
        ))}

      {gameStatus === "waiting" && (
        <StatusModal
          message={
            searchParams.get("gameId")
              ? "Joining room..."
              : "Finding opponent..."
          }
        />
      )}
      {gameStatus === "ended" && (
        <GameOverModal
          resultData={gameResult}
          players={players}
          selfId={user._id}
        />
      )}
      {showNotFoundPopup && <NotFoundPopup />}
      {(isPrivateLobby || showPrivateWaitPopup) && (
        <PrivateGameLobbyModal
          onCopyLink={handleCopyLink}
          copySuccess={copySuccess}
        />
      )}

      <div className="w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-6 lg:h-[calc(100vh-2rem)]">
          {/* Left Column (Chessboard) */}
          <div className="lg:col-span-2 flex flex-col gap-2 lg:gap-4 justify-center">
            <PlayerInfo
              player={opponent}
              isConnected={opponentConnected}
              isMyTurn={!isMyTurn && gameStatus === "in_progress"}
            />
            <div className="w-full max-w-[calc(100vh-220px)] mx-auto aspect-square relative">
              <CustomChessboard
                game={game}
                boardOrientation={boardOrientation}
                onMove={handleMove}
              />
            </div>
            <PlayerInfo
              player={self}
              isSelf={true}
              isConnected={socket?.connected}
              isMyTurn={isMyTurn}
            />
          </div>

          {/* Right Column (The New Layout) */}
          <div className="flex flex-col overflow-hidden gap-2 h-[70vh] lg:h-full p-2">
            {/* 3. The percentage heights are now applied to flex items, which is more stable. */}
            <div className="h-[40%] min-h-0">
              <MovesPanel history={formattedMoveHistory} />
            </div>

            <div className="h-[55%]  min-h-0">
              <ChatPanel
                messages={chatHistory}
                onSendMessage={handleSendMessage}
                selfUsername={user?.username}
              />
            </div>

            <div className="h-[5%] flex-shrink-0">
              <GamePanel
                onForfeit={handleConfirmExit}
                onCopyLink={handleCopyLink}
                copySuccess={copySuccess}
                isWaiting={!players.black}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
