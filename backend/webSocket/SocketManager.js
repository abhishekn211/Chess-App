// backend/webSocket/SocketManager.js

class SocketManager {
  static instance; // Singleton instance
  interestedSockets; // Map<string, Socket[]> - Map: roomId -> Array of socket objects
  userRoomMapping; // Map<string, string> - Map: userId -> roomId (indicates which user is in which room)

  constructor() {
    this.interestedSockets = new Map();
    this.userRoomMapping = new Map();
  }

  static getInstance() {
    if (SocketManager.instance) {
      return SocketManager.instance;
    }
    SocketManager.instance = new SocketManager();
    return SocketManager.instance;
  }

  /**
   * Adds a socket (user connection) to a specific room.
   * @param {object} socket - The Socket.IO socket object (which has socket.id and socket.userId attached).
   * @param {string} roomId - The ID of the room (e.g., game ID) to join.
   */
  addUser(socket, roomId) {
    const socketSet = this.interestedSockets.get(roomId) || new Set();
    socketSet.add(socket);
    this.interestedSockets.set(roomId, socketSet);
    this.userRoomMapping.set(socket.userId, roomId); // Map the User ID to the Room ID

    console.log(`SocketManager: User ${socket.username} (${socket.id}) added to room ${roomId.slice(-4)}`);
    console.log(`SocketManager: Room ${roomId.slice(-4)} now has ${this.interestedSockets.get(roomId).length} connections.`);
  }

  /**
   * Broadcasts a message to all sockets in a specific room.
   * @param {string} roomId - The ID of the room to broadcast to.
   * @param {string} eventName - The name of the event to emit.
   * @param {any} payload - The data to send with the event.
   */
  broadcast(roomId, eventName, payload) {
    const socketsInRoom = this.interestedSockets.get(roomId);
    if (!socketsInRoom || socketsInRoom.size === 0) {
      console.warn(`SocketManager: No sockets found in room ${roomId} to broadcast event '${eventName}'.`);
      return;
    }

    socketsInRoom.forEach((socket) => {
      if (socket.connected) { // Ensure the socket is still connected
        socket.emit(eventName, payload);
      } else {
        console.warn(`SocketManager: Found disconnected socket ${socket.id} in Room: ${roomId.slice(-4)}.`);
      }
    });
    console.log(`SocketManager: Broadcasted event '${eventName}' to room ${roomId} with payload:`, payload);
  }

  /**
   * Removes a socket from its associated room and the manager.
   * This is typically called when a socket disconnects.
   * @param {string} socketId - The ID of the socket to remove.
   * @param {string} userId - The ID of the user associated with the socket.
   */
  removeUser(socketId, userId) {
    const roomId = this.userRoomMapping.get(userId); // Find the Room ID using the User ID
    if (!roomId) {
      console.warn(`SocketManager: User ${userId} was not mapped to any room, cannot remove.`);
      return;
    }

    const socketSet = this.interestedSockets.get(roomId);
    if (!socketSet || socketSet.size === 0) {
      console.warn(`SocketManager: Room ${roomId} is already empty or not found during removal.`);
      this.userRoomMapping.delete(userId); // Clean up mapping if room is already gone
      return;
    }

    // Filter out the specific socket that disconnected
for (const s of socketSet) {
    if (s.id === socketId) {
        socketSet.delete(s);
        console.log(`SocketManager: Socket ${socketId} removed from room ${roomId}.`);
        break; // Exit the loop once found and deleted
    }
}
    
    if (socketSet.size === 0) {
      // If no sockets are left in the room, delete the room
      this.interestedSockets.delete(roomId);
      console.log(`SocketManager: Room ${roomId} is now empty and deleted.`);
    } 

    console.log(`SocketManager: User ${userId} mapping removed.`);
  }

  /**
   * Gets the room ID a specific user is currently in.
   * @param {string} userId - The ID of the user.
   * @returns {string | undefined} The room ID or undefined if not found.
   */
  getRoomIdForUser(userId) {
    return this.userRoomMapping.get(userId);
  }

  /**
   * Gets all sockets in a specific room.
   * @param {string} roomId - The ID of the room.
   * @returns {Socket[] | undefined} An array of sockets in the room.
   */
  getSocketsInRoom(roomId) {
    const socketSet = this.interestedSockets.get(roomId);
        // Convert Set to Array for consumers of this method, which is often more convenient.
    return socketSet ? Array.from(socketSet) : [];
  }
}

export const socketManager = SocketManager.getInstance(); // Export the singleton instance