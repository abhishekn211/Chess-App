// backend/webSocket/messages.js

// Game initialization and joining messages
export const INIT_GAME = 'init_game';
export const JOIN_ROOM = 'join_room';
// add alongside your other message constants
export const CREATE_PRIVATE_GAME = 'create_private_game';


// Game state update messages
export const MOVE = 'move';
export const BOARD_STATE = 'board_state';
export const PLAYER_ROLE = 'player_role';
export const GAME_UPDATE = 'game_update';
export const OPPONENT_MOVE = 'opponent_move';

// Game status messages
export const GAME_ADDED = 'game_added';
export const PRIVATE_GAME_ADDED='private_game_added'
export const GAME_JOINED = 'game_joined';
export const GAME_ENDED = 'game_ended';
export const GAME_OVER = 'game_over';
export const GAME_NOT_FOUND = 'game_not_found';
export const GAME_ALERT = 'game_alert';
export const INVALID_MOVE = 'invalid_move';

// Player status messages
export const PLAYER_DISCONNECTED = 'player_disconnected';
export const SPECTATOR_ROLE = 'spectator_role';
export const PLAYER_RECONNECTED = "player_reconnected";

// Game actions
export const EXIT_GAME = 'exit_game';
export const CHAT_MESSAGE = 'chat_message';
export const NEW_CHAT_MESSAGE = 'new_chat_message';

export const CANCEL_SEARCH='cancel_search';
// --- New Messages for Finding Active Games ---
export const FIND_ACTIVE_GAMES = 'find_active_games';
export const ACTIVE_GAME_FOUND = 'active_game_found';
export const NO_ACTIVE_GAME_FOUND = 'no_active_game_found';