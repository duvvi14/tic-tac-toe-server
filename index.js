import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// HTTP + Socket.IO server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // your React frontend
    methods: ["GET", "POST"]
  }
});

// In-memory sessions store
let sessions = [];

// Simple API route to check server
app.get("/", (req, res) => {
  res.send("🎮 Tic-Tac-Toe Server Running");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Send current sessions to new client
  socket.emit("sessions", sessions);

  // Create new session
  socket.on("createSession", (session) => {
    sessions.unshift(session);
    io.emit("sessions", sessions); // broadcast to all clients
    console.log(`➕ Session created: ${session.name}`);
  });

  // Join session (socket joins a room)
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
    console.log(`👥 ${socket.id} joined session ${sessionId}`);
  });

  // Optional: remove session
  socket.on("removeSession", (sessionId) => {
    sessions = sessions.filter(s => s.id !== sessionId);
    io.emit("sessions", sessions);
    console.log(`🗑 Session removed: ${sessionId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start server
const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
