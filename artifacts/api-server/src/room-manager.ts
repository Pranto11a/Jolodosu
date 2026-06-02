import {
  GameState,
  PlayerConfig,
  initGame,
  beginTurn,
  playCard,
  resolveWithTarget,
  resolveGuard,
  acknowledgeResult,
  merchantSelect,
  startNewRound,
  aiTakeTurn,
  CardId,
} from "@workspace/game-engine";

export interface Room {
  id: string;
  players: Array<{ socketId: string; name: string; playerId: number }>;
  gameState: GameState | null;
  phase: "lobby" | "playing";
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function createRoom(socketId: string, playerName: string): Room {
  const roomId = generateRoomId();
  const room: Room = {
    id: roomId,
    players: [{ socketId, name: playerName, playerId: 0 }],
    gameState: null,
    phase: "lobby",
  };
  rooms.set(roomId, room);
  return room;
}

export function joinRoom(roomId: string, socketId: string, playerName: string): Room | null {
  const room = rooms.get(roomId);
  if (!room || room.phase === "playing") return null;
  if (room.players.length >= 6) return null;

  const playerId = room.players.length;
  room.players.push({ socketId, name: playerName, playerId });
  return room;
}

export function rejoinRoom(roomId: string, playerId: number, socketId: string, playerName: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const existing = room.players.find(p => p.playerId === playerId);
  if (existing) {
    existing.socketId = socketId;
  } else {
    room.players.push({ socketId, name: playerName, playerId });
  }
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function startGame(roomId: string): GameState | null {
  const room = rooms.get(roomId);
  if (!room || room.players.length < 2) return null;

  const configs: PlayerConfig[] = room.players.map(p => ({
    name: p.name,
    isHuman: true,
  }));

  let state = initGame(configs, true);
  state = beginTurn(state);
  state = runAiIfNeeded(state);
  room.gameState = state;
  room.phase = "playing";
  return state;
}

function runAiIfNeeded(state: GameState): GameState {
  let s = state;
  while (s.phase === "playing" && s.playStep === "ai_turn") {
    s = aiTakeTurn(s);
    if (s.phase === "playing" && s.playStep === "start_turn") {
      s = beginTurn(s);
    }
  }
  if (s.phase === "playing" && s.playStep === "start_turn") {
    s = beginTurn(s);
  }
  return s;
}

export type GameAction =
  | { action: "play_card"; cardIndex: number }
  | { action: "select_target"; targetId: number }
  | { action: "guard_guess"; cardId: CardId }
  | { action: "merchant_select"; keepIndex: number }
  | { action: "acknowledge" };

export function applyAction(
  roomId: string,
  playerId: number,
  actionData: GameAction
): GameState | null {
  const room = rooms.get(roomId);
  if (!room || !room.gameState) return null;

  let state = room.gameState;

  if (state.phase !== "playing") return null;
  if (state.currentPlayerIndex !== playerId) return null;

  try {
    if (actionData.action === "play_card") {
      state = playCard(state, actionData.cardIndex);
    } else if (actionData.action === "select_target") {
      state = resolveWithTarget(state, actionData.targetId);
    } else if (actionData.action === "guard_guess") {
      state = resolveGuard(state, actionData.cardId);
    } else if (actionData.action === "merchant_select") {
      state = merchantSelect(state, actionData.keepIndex);
    } else if (actionData.action === "acknowledge") {
      state = acknowledgeResult(state);
    }

    state = runAiIfNeeded(state);

    if (state.phase === "round_end") {
      const lastWinner = state.players.reduce((a, b) => b.tokens > a.tokens ? b : a);
      state = startNewRound(state, lastWinner.id);
      state = runAiIfNeeded(state);
    }
  } catch (e) {
    return null;
  }

  room.gameState = state;
  return state;
}

export function getPlayerNames(room: Room): string[] {
  return room.players.map(p => p.name);
}

export function removePlayerBySocket(socketId: string): { roomId: string; room: Room } | null {
  for (const [roomId, room] of rooms) {
    const idx = room.players.findIndex(p => p.socketId === socketId);
    if (idx !== -1) {
      return { roomId, room };
    }
  }
  return null;
}
