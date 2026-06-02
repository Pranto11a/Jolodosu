import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import {
  GameState,
  CardId,
  CARD_NAMES_BN,
  CARD_VALUES,
  getActivePlayers,
  getValidTargets,
} from "@workspace/game-engine";

const CARD_IMAGE_FILENAMES: Record<string, string> = {
  pirate: "9_pirate.jpg",
  captain: "8_captain.jpg",
  spy: "7_spy.jpg",
  sailor: "6_sailor.jpg",
  merchant: "5_merchant.jpg",
  cannon: "4_cannon.jpg",
  swordsman: "3_swordsman.jpg",
  ship_worker: "2_ship_worker.jpg",
  guard: "1_guard.jpg",
  petty_thief: "0_petty_thief.jpg",
};

const BASE = import.meta.env.BASE_URL;

function getCardImage(key: string) {
  const filename = CARD_IMAGE_FILENAMES[key];
  return filename ? `${BASE}assets/${filename}` : "";
}

const GUESSABLE_CARDS: CardId[] = [
  "ship_worker", "swordsman", "cannon", "merchant", "sailor",
  "captain", "spy", "pirate", "petty_thief",
];

interface CardProps {
  cardId: CardId;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
}

function Card({ cardId, onClick, selected, disabled, small, faceDown }: CardProps) {
  return (
    <motion.div
      whileHover={!disabled && onClick ? { y: -10, scale: 1.03 } : {}}
      whileTap={!disabled && onClick ? { scale: 0.97 } : {}}
      onClick={!disabled && onClick ? onClick : undefined}
      className={`
        relative rounded-xl overflow-hidden border-2 transition-all select-none
        ${small ? "w-16 h-24" : "w-24 h-36 sm:w-28 sm:h-40"}
        ${selected ? "border-primary" : "border-border"}
        ${onClick && !disabled ? "cursor-pointer" : "cursor-default"}
        ${disabled ? "opacity-50" : ""}
        ${faceDown ? "bg-secondary" : "parchment"}
      `}
      style={selected ? { boxShadow: "0 0 24px hsl(35 85% 58% / 0.55)" } : {}}
    >
      {faceDown ? (
        <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🏴‍☠️</div>
      ) : (
        <>
          <img src={getCardImage(cardId)} alt={CARD_NAMES_BN[cardId]} className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1">
            <p className="text-white text-xs font-bold text-center leading-tight">{CARD_NAMES_BN[cardId]}</p>
            <p className="text-primary text-xs text-center">{CARD_VALUES[cardId]}</p>
          </div>
        </>
      )}
    </motion.div>
  );
}

function TokenDots({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`w-3 h-3 rounded-full border ${i < count ? "token border-primary" : "bg-muted border-border"}`} />
      ))}
    </div>
  );
}

export default function OnlineGamePage() {
  const [, navigate] = useLocation();
  const [game, setGame] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState("");
  const [myPlayerId, setMyPlayerId] = useState(-1);
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);
  const [phase, setPhase] = useState<"lobby" | "playing">("lobby");
  const [statusMsg, setStatusMsg] = useState("অপেক্ষা করছেন...");
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const room = sessionStorage.getItem("jd_online_room") ?? "";
    const pid = Number(sessionStorage.getItem("jd_online_player_id") ?? "-1");
    const name = sessionStorage.getItem("jd_online_name") ?? "";

    if (!room || pid < 0) { navigate("/lobby"); return; }

    setRoomId(room);
    setMyPlayerId(pid);

    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.emit("rejoin_room", { roomId: room, playerId: pid, playerName: name });

    socket.on("lobby_update", ({ players }: { players: string[] }) => {
      setLobbyPlayers(players);
      setPhase("lobby");
      setStatusMsg(`${players.length} জন অপেক্ষা করছেন…`);
    });

    socket.on("game_state", ({ state }: { state: GameState }) => {
      setGame(state);
      setPhase("playing");
      setSelectedCardIdx(null);
    });

    socket.on("game_action_ack", ({ state }: { state: GameState }) => {
      setGame(state);
      setSelectedCardIdx(null);
    });

    socket.on("error", (msg: string) => {
      setStatusMsg(`ত্রুটি: ${msg}`);
    });

    socket.on("disconnect", () => setStatusMsg("সংযোগ বিচ্ছিন্ন হয়েছে"));

    return () => { socket.disconnect(); };
  }, [navigate]);

  const emit = useCallback((event: string, data?: object) => {
    socketRef.current?.emit(event, { roomId, playerId: myPlayerId, ...data });
  }, [roomId, myPlayerId]);

  function handleStartGame() {
    emit("start_game");
  }

  function handlePlayCard(idx: number) {
    setSelectedCardIdx(idx);
  }

  function handleConfirmPlay() {
    if (selectedCardIdx === null) return;
    emit("game_action", { action: "play_card", cardIndex: selectedCardIdx });
    setSelectedCardIdx(null);
  }

  function handleTargetSelect(targetId: number) {
    emit("game_action", { action: "select_target", targetId });
  }

  function handleGuardGuess(cardId: CardId) {
    emit("game_action", { action: "guard_guess", cardId });
  }

  function handleMerchantSelect(idx: number) {
    emit("game_action", { action: "merchant_select", keepIndex: idx });
  }

  function handleAcknowledge() {
    emit("game_action", { action: "acknowledge" });
  }

  function handleNewGame() {
    sessionStorage.removeItem("jd_online_room");
    sessionStorage.removeItem("jd_online_player_id");
    sessionStorage.removeItem("jd_online_name");
    navigate("/");
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-screen ocean-bg flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl text-center">
          <h2 className="text-xl font-bold text-primary mb-2">লবি</h2>
          <p className="font-mono text-2xl tracking-widest text-foreground mb-4">{roomId}</p>
          <p className="text-sm text-muted-foreground mb-4">{statusMsg}</p>
          <div className="flex flex-col gap-2 mb-5">
            {lobbyPlayers.map((name, i) => (
              <div key={i} className="py-2 px-4 rounded-lg bg-secondary text-foreground text-sm font-bold flex items-center gap-2">
                <span className="text-primary">⚓</span> {name}
                {i === myPlayerId && <span className="ml-auto text-xs text-muted-foreground">(আপনি)</span>}
              </div>
            ))}
          </div>
          {myPlayerId === 0 && lobbyPlayers.length >= 2 && (
            <button onClick={handleStartGame}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent transition-all">
              খেলা শুরু করুন ▶
            </button>
          )}
          {myPlayerId === 0 && lobbyPlayers.length < 2 && (
            <p className="text-sm text-muted-foreground">আরো খেলোয়াড়ের জন্য অপেক্ষা করছেন…</p>
          )}
          {myPlayerId !== 0 && (
            <p className="text-sm text-muted-foreground">হোস্টের জন্য অপেক্ষা করছেন…</p>
          )}
          <button onClick={handleNewGame} className="mt-4 text-sm text-muted-foreground hover:text-foreground">← বেরিয়ে যান</button>
        </motion.div>
      </div>
    );
  }

  if (!game) return (
    <div className="min-h-screen ocean-bg flex items-center justify-center">
      <p className="text-muted-foreground animate-pulse">লোড হচ্ছে...</p>
    </div>
  );

  const currentPlayer = game.players[game.currentPlayerIndex];
  const myPlayer = game.players[myPlayerId];
  const isMyTurn = game.currentPlayerIndex === myPlayerId && game.phase === "playing";
  const active = getActivePlayers(game.players);
  const validTargets = game.cardBeingPlayed ? getValidTargets(game, game.cardBeingPlayed) : [];

  return (
    <div className="min-h-screen ocean-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 backdrop-blur">
        <button onClick={handleNewGame} className="text-muted-foreground text-sm hover:text-foreground">← বেরিয়ে যান</button>
        <h1 className="font-bold text-primary text-lg">জলদস্যু</h1>
        <span className="font-mono text-xs text-muted-foreground">{roomId}</span>
      </header>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-3 py-4 gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {game.players.map(p => (
            <div key={p.id}
              className={`rounded-xl border p-2 text-center transition-all ${p.id === game.currentPlayerIndex && game.phase === "playing" ? "border-primary bg-primary/10" : "border-border bg-card/50"} ${p.isEliminated ? "opacity-40" : ""}`}>
              <p className="text-xs font-bold text-foreground truncate">
                {p.name} {p.id === myPlayerId ? "(আপনি)" : ""}
              </p>
              {p.isProtected && <span className="text-xs text-blue-400">🛡️</span>}
              <TokenDots count={p.tokens} max={game.tokensToWin} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground bg-card/40 rounded-lg px-3 py-1 border border-border">
          <span>ডেকে: {game.deck.length}</span>
          <span>{isMyTurn ? "✨ আপনার পালা!" : `${currentPlayer.name}-এর পালা`}</span>
          <span>সক্রিয়: {active.length}</span>
        </div>

        {myPlayer && !myPlayer.isEliminated && myPlayer.hand.length > 0 && (
          <div className="bg-card/50 border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 text-center">আপনার হাত</p>
            <div className="flex justify-center gap-3">
              {myPlayer.hand.map((c, i) => (
                <Card key={i} cardId={c}
                  onClick={isMyTurn && game.playStep === "select_card" ? () => handlePlayCard(i) : undefined}
                  selected={selectedCardIdx === i}
                />
              ))}
            </div>
            {isMyTurn && game.playStep === "select_card" && selectedCardIdx !== null && (
              <div className="flex justify-center mt-3">
                <button onClick={handleConfirmPlay}
                  className="px-8 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent">
                  খেলুন ▶
                </button>
              </div>
            )}
          </div>
        )}

        {myPlayer?.isEliminated && (
          <div className="bg-card/40 border border-border rounded-xl p-4 text-center">
            <p className="text-muted-foreground text-sm">আপনি বাদ পড়েছেন। দেখতে থাকুন...</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {game.phase === "game_end" && (
            <motion.div key="game-end" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 text-center py-4">
              <div className="text-5xl">🏆</div>
              <h2 className="text-xl font-bold text-primary">{game.resultMessage}</h2>
              <button onClick={handleNewGame}
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent">
                বেরিয়ে যান
              </button>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "select_target" && isMyTurn && (
            <motion.div key="select-target" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">একটি লক্ষ্য বেছে নিন</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {active.filter(p => {
                  if (!game.cardBeingPlayed) return false;
                  if (game.cardBeingPlayed === "cannon") return true;
                  return validTargets.includes(p.id);
                }).map(p => (
                  <button key={p.id} onClick={() => handleTargetSelect(p.id)}
                    className="px-5 py-2 rounded-xl bg-secondary border border-border hover:border-primary font-bold transition-all">
                    {p.name} {p.isProtected && "🛡️"}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "select_guess" && isMyTurn && (
            <motion.div key="guess" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">কার্ড অনুমান করুন</p>
              <div className="grid grid-cols-3 gap-2 max-w-xs">
                {GUESSABLE_CARDS.map(c => (
                  <button key={c} onClick={() => handleGuardGuess(c)}
                    className="flex flex-col items-center p-2 rounded-xl border border-border bg-secondary hover:border-primary transition-all">
                    <img src={getCardImage(c)} alt={CARD_NAMES_BN[c]} className="w-10 h-14 object-cover rounded mb-1" />
                    <span className="text-xs font-bold text-center leading-tight">{CARD_NAMES_BN[c]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "merchant_select" && isMyTurn && game.merchantOptions && (
            <motion.div key="merchant" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">একটি কার্ড রাখুন</p>
              <div className="flex gap-3 flex-wrap justify-center">
                {game.merchantOptions.map((c, i) => (
                  <Card key={i} cardId={c} onClick={() => handleMerchantSelect(i)} />
                ))}
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && (game.playStep === "show_result" || game.playStep === "peek_result") && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 text-center">
              <div className="bg-card border border-border rounded-2xl p-4 max-w-sm w-full">
                <p className="text-foreground font-semibold text-sm">{game.resultMessage}</p>
                {game.playStep === "peek_result" && game.peekCard && isMyTurn && (
                  <div className="flex justify-center mt-3">
                    <Card cardId={game.peekCard} />
                  </div>
                )}
              </div>
              {isMyTurn && (
                <button onClick={handleAcknowledge}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent">
                  পরবর্তী ▶
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {game.log.length > 0 && (
          <div className="bg-card/40 border border-border rounded-xl p-3 max-h-28 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-1 font-bold">গেম লগ</p>
            {game.log.map((e, i) => (
              <p key={i} className={`text-xs ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{e}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
