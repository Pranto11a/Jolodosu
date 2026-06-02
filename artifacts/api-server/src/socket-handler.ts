import { Server } from "socket.io";
import {
  createRoom,
  joinRoom,
  rejoinRoom,
  getRoom,
  startGame,
  applyAction,
  getPlayerNames,
  GameAction,
} from "./room-manager.js";

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    socket.on("create_room", ({ playerName }: { playerName: string }) => {
      try {
        const room = createRoom(socket.id, playerName);
        socket.join(room.id);
        socket.emit("room_created", { roomId: room.id, playerId: 0 });
        io.to(room.id).emit("lobby_update", { players: getPlayerNames(room) });
      } catch (e) {
        socket.emit("error", "রুম তৈরি করতে ব্যর্থ হয়েছে");
      }
    });

    socket.on("join_room", ({ roomId, playerName }: { roomId: string; playerName: string }) => {
      const room = joinRoom(roomId, socket.id, playerName);
      if (!room) {
        socket.emit("error", "রুম পাওয়া যায়নি অথবা পূর্ণ হয়ে গেছে");
        return;
      }
      const playerId = room.players.find(p => p.socketId === socket.id)?.playerId ?? -1;
      socket.join(roomId);
      socket.emit("room_joined", { roomId, playerId });
      io.to(roomId).emit("lobby_update", { players: getPlayerNames(room) });
    });

    socket.on("rejoin_room", ({ roomId, playerId, playerName }: { roomId: string; playerId: number; playerName: string }) => {
      const room = rejoinRoom(roomId, playerId, socket.id, playerName);
      if (!room) {
        socket.emit("error", "রুম পাওয়া যায়নি");
        return;
      }
      socket.join(roomId);
      if (room.phase === "lobby") {
        io.to(roomId).emit("lobby_update", { players: getPlayerNames(room) });
      } else if (room.gameState) {
        socket.emit("game_state", { state: room.gameState });
      }
    });

    socket.on("start_game", ({ roomId, playerId }: { roomId: string; playerId: number }) => {
      const room = getRoom(roomId);
      if (!room) { socket.emit("error", "রুম পাওয়া যায়নি"); return; }
      if (playerId !== 0) { socket.emit("error", "শুধু হোস্ট খেলা শুরু করতে পারেন"); return; }
      if (room.players.length < 2) { socket.emit("error", "কমপক্ষে ২ জন খেলোয়াড় প্রয়োজন"); return; }

      const state = startGame(roomId);
      if (!state) { socket.emit("error", "খেলা শুরু করতে ব্যর্থ হয়েছে"); return; }

      io.to(roomId).emit("game_state", { state });
    });

    socket.on("game_action", ({ roomId, playerId, ...actionData }: { roomId: string; playerId: number } & GameAction) => {
      const state = applyAction(roomId, playerId, actionData as GameAction);
      if (!state) {
        socket.emit("error", "অবৈধ পদক্ষেপ");
        return;
      }
      io.to(roomId).emit("game_action_ack", { state });
    });

    socket.on("disconnect", () => {
    });
  });
}
