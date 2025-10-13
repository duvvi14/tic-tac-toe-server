import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

// In-memory event store
let events = [];

// ---- SOCKET HANDLERS ----
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // C - Create Event
  socket.on("createEvent", (userName, callback) => {
    const eventId = `event-${userName}-${Date.now()}`;
    const newEvent = {
      id: eventId,
      players: [userName],
      stage: 0,
      currentMove: 0,
      history: [Array(9).fill(null)],
    };

    events.push(newEvent);
    socket.join(eventId);
    io.emit("listEvents", events);
    callback(eventId);
  });

  // R - Read: List all events
  socket.on("listEvents", () => {
    socket.emit("acquiringEvents", events);
  });

  // U - Join Event
  socket.on("joinEvent", ({ userName, id }, callback) => {
    try {
      const event = events.find((e) => e.id === id);
      if (!event) return callback(false);

      event.players.push(userName);
      event.players = Array.from(new Set(event.players));

      socket.join(id);
      io.to(id).emit("eventSubscribe", event);
      io.emit("listEvents", events);
      callback(true);
    } catch (err) {
      console.error(err);
      callback(false);
    }
  });

  // U - Update Event
  socket.on("updateEvent", (id, type, ...data) => {
    try {
      const event = events.find((e) => e.id === id);
      if (!event) return;

      switch (type) {
        case "playerReady":
          if (!event.playerReady) event.playerReady = [];
          event.playerReady.push(data[0]);

          if (event.playerReady.length === 2) {
            event.stage = 1;
            const _rand = Math.random() < 0.5;
            event.symbolMap = {
              [event.players[0]]: _rand ? "X" : "O",
              [event.players[1]]: _rand ? "O" : "X",
            };
          }
          break;

        case "playerMove":
          const nextHistory = data[0];
          event.history = nextHistory;
          event.currentMove = nextHistory.length - 1;
          break;

        case "playerLeave":
          const userName = data[0];
          const isOwner = event.players.indexOf(userName) === 0;
          event.players = event.players.filter((p) => p !== userName);

          if (isOwner) {
            const idx = events.findIndex((e) => e.id === event.id);
            events.splice(idx, 1);
            io.emit("listEvents", events);
          }
          break;

        default:
          break;
      }

      io.to(id).emit("eventSubscribe", event);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));