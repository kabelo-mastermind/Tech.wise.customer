import io from "socket.io-client";
import config from "./config"; // Import backend URL from config.js

let socket;

export const connectSocket = (userId, userType) => {
  if (socket && socket.connected) return
  socket = io(config.SOCKET_URL, {
    transports: ["websocket"], // Use WebSocket for real-time communication
    forceNew: true, // Ensures a new connection is established
    reconnectionAttempts: 5, // Number of reconnection attempts
    timeout: 10000, // Connection timeout (in ms)
  });

  socket.on("connect", () => {
    // console.log("✅ Connected to Socket.IO server");

    if (userId && userType) {
      socket.emit("joinRoom", userId, userType);
      // console.log("🚗 Joining room with userId:", userId, "and userType:", userType);
    }
  });



  socket.on("connect_error", (err) => {
    console.warn("⚠️ Socket connection error: retrying")
    setTimeout(() => socket.connect(), 5000);
  })
  socket.on("disconnect", () => console.log("❌ Disconnected from Socket.IO server"));
}
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
//listen to trip accepted
export const listenToTripAccepted = (callback) => {
  if (socket) {
    socket.on("tripAccepted", (data) => {
      // console.log("📥 Received tripAccepted event:", data); // Debugging log
      callback(data); // Pass the data to the callback function
    });
  }
};
//listen to driver arival
export const listenToDriverArrival = (callback) => {
  if (socket) {
    socket.on("driverArrived", (data) => {
      console.log("📥 Received driverArrival event:", data); // Debugging log
      callback(data); // Pass the data to the callback function
    });
  }
};
//listen to trip started
export const listenToTripStarted = (callback) => {
  if (socket) {
    socket.on("tripStarted", (data) => {
      // console.log("📥 Received tripStarted event:", data); // Debugging log
      callback(data); // Pass the data to the callback function
    });
  }
};
//listen to trip ended
export const listenToTripEnded = (callback) => {
  if (socket) {
    socket.on("tripEnded", (data) => {
      // console.log("📥 Received tripEnded event:", data); // Debugging log
      callback(data); // Pass the data to the callback function
    });
  }
};
//listen to trip cancelled
export const listenToTripDeclined = (callback) => {
  if (socket) {
    socket.on("tripDeclined", (data) => { // Listen for "tripDeclined" event
      console.log("📥 Received tripDeclined event:", data); // Debugging log
      callback(data); // Pass the data to the callback function
    });
  }
};


export const stopListeningToTripAccepted = () => {
  if (socket) {
    socket.off("accepted");  // Stop listening to the "accepted" status
  }
};

export const stopListeningToTripDeclined = () => {
  if (socket) {
    socket.off("declined");  // Stop listening to the "declined" status
  }
};


export const listenToTripStatus = (callback) => {
  if (socket) {
    socket.on("tripStatus", callback);
  }
};

export const stopListeningToTripStatus = () => {
  if (socket) {
    socket.off("tripStatus");
  }
};

export const emitTripRequestToDrivers = (tripData, driverId) => {
  if (socket) {
    // console.log("📢 Sending trip request to drivers:", tripData, driverId);
    socket.emit("newTripRequest", { tripData, driverId }); // Ensure that both tripData and driverId are passed
  } else {
    console.error("❌ Socket not initialized");
  }
};

export const emitTripCanceltToDrivers = (tripData, driverId) => {
  if (socket) {
    socket.emit("newTripCancel", { tripData, driverId }); // Ensure that both tripData and driverId are passed
  } else {
    console.error("❌ Socket not initialized");
  }
};


// Listen for multiple trip statuses
export const listenToMultipleTripStatuses = (callback) => {
  if (socket) {
    ["accepted", "declined", "ongoing", "completed", "start", "end"].forEach((status) => {
      socket.on(status, (data) => callback(status, data));
    });
  }
};

export const stopListeningToMultipleTripStatuses = () => {
  if (socket) {
    ["accepted", "declined", "ongoing", "completed", "start", "end"].forEach((status) => {
      socket.off(status);
    });
  }
};
// Listen for incoming chat messages
export const listenToChatMessages = (callback) => {
  if (!socket) {
    console.error("❌ Socket is not initialized");
    return;
  }

  socket.on("chatMessage", (messageData) => {
    console.log("📩 New message for customer:", messageData);
    callback(messageData);
  });
};

// Emit a new chat message from the customer
export const emitChatMessage = (messageData) => {
  if (!socket) {
    console.error("❌ Socket is not initialized");
    return;
  }

  if (!socket.connected) {
    console.error("❌ Socket is not connected");
    return;
  }

  console.log("📨 Emitting message:", messageData); // Log the message data to ensure it's correct

  socket.emit("sendMessage", messageData);  // Ensure you're emitting the right data
};


// Stop listening to customer chat messages
export const stopListeningToChatMessages = () => {
  if (!socket) return;
  socket.off("chatMessage");
};

// Emit Edit Message
export const emitEditMessage = (messageData) => {
  if (!socket) return console.error("❌ Socket not initialized");

  socket.emit("editMessage", messageData);
};

// Listen for Edited Message
export const listenToEditedMessages = (callback) => {
  if (!socket) return;

  socket.on("messageEdited", (messageData) => {
    console.log("✏️ Message Edited:", messageData);
    callback(messageData);
  });
};

// Emit Delete Message
export const emitDeleteMessage = (messageData) => {
  if (!socket) return console.error("❌ Socket not initialized");

  socket.emit("deleteMessage", messageData);
};

// Listen for Deleted Message
export const listenToDeletedMessages = (callback) => {
  if (!socket) return;

  socket.on("messageDeleted", (messageData) => {
    console.log("🗑️ Message Deleted:", messageData);
    callback(messageData);
  });
};

export default socket;
