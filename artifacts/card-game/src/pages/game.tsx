import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  GameState,
  CardId,
  initGame,
  beginTurn,
  playCard,
  resolveWithTarget,
  resolveGuard,
  acknowledgeResult,
  confirmPassDevice,
  merchantSelect,
  startNewRound,
  getValidTargets,
  getActivePlayers,
  CARD_NAMES_BN,
  CARD_VALUES,
  mustPlayCaptain,
  aiTakeTurn,
} from "@workspace/game-engine";

const CARD_IMAGE_FILENAMES: Record<string, string> = {
  pirate: "9_pirate.jpg",
  captain: "8_captain.jpg",
  sailor: "7_spy.jpg",
  merchant: "6_sailor.jpg",
  cannon: "5_merchant.jpg",
  spy: "4_cannon.jpg",
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
        ${selected ? "border-primary shadow-[0_0_20px_hsl(35_85%_58%/0.6)]" : "border-border"}
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
          <img
            src={getCardImage(cardId)}
            alt={CARD_NAMES_BN[cardId]}
            className="w-full h-full object-cover"
          />
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
        <div
          key={i}
          className={`w-3 h-3 rounded-full border ${i < count ? "token border-primary" : "bg-muted border-border"}`}
        />
      ))}
    </div>
  );
}

export default function GamePage() {
  const [, navigate] = useLocation();
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("jd_players");
    if (!raw) { navigate("/"); return; }
    const players = JSON.parse(raw) as { name: string; isHuman: boolean }[];
    const g = initGame(players);
    setGame(g);
  }, [navigate]);

  const update = useCallback((g: GameState) => {
    setGame(g);
    setSelectedCardIdx(null);
  }, []);

  useEffect(() => {
    if (!game) return;
    if (game.phase === "playing" && game.playStep === "ai_turn") {
      const timer = setTimeout(() => {
        update(aiTakeTurn(game));
      }, 800);
      return () => clearTimeout(timer);
    }
    if (game.phase === "playing" && game.playStep === "start_turn") {
      const timer = setTimeout(() => {
        update(beginTurn(game));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [game, update]);

  if (!game) return (
    <div className="min-h-screen ocean-bg flex items-center justify-center">
      <p className="text-muted-foreground animate-pulse">লোড হচ্ছে...</p>
    </div>
  );

  const currentPlayer = game.players[game.currentPlayerIndex];
  const active = getActivePlayers(game.players);

  function handleCardSelect(idx: number) {
    if (!game) return;
    const hand = currentPlayer.hand;
    if (hand.length === 2 && mustPlayCaptain(hand) && hand[idx] !== "captain") return;
    setSelectedCardIdx(idx);
  }

  function handlePlaySelected() {
    if (game && selectedCardIdx !== null) {
      update(playCard(game, selectedCardIdx));
    }
  }

  function handleTargetSelect(targetId: number) {
    if (game) update(resolveWithTarget(game, targetId));
  }

  function handleGuardGuess(cardId: CardId) {
    if (game) update(resolveGuard(game, cardId));
  }

  function handleMerchantSelect(idx: number) {
    if (game) update(merchantSelect(game, idx));
  }

  function handleAcknowledge() {
    if (game) update(acknowledgeResult(game));
  }

  function handlePassDevice() {
    if (game) update(confirmPassDevice(game));
  }

  function handleNewRound() {
    if (!game) return;
    const lastWinner = game.players.reduce((a, b) => b.tokens > a.tokens ? b : a);
    update(startNewRound(game, lastWinner.id));
  }

  function handleNewGame() {
    sessionStorage.removeItem("jd_players");
    navigate("/");
  }

  const validTargets = game.cardBeingPlayed
    ? getValidTargets(game, game.cardBeingPlayed)
    : [];

  return (
    <div className="min-h-screen ocean-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/60 backdrop-blur">
        <button onClick={handleNewGame} className="text-muted-foreground text-sm hover:text-foreground">← বাড়ি</button>
        <h1 className="font-bold text-primary text-lg">জলদস্যু</h1>
        <span className="text-sm text-muted-foreground">রাউন্ড {game.round}</span>
      </header>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-3 py-4 gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {game.players.map(p => (
            <div
              key={p.id}
              className={`
                rounded-xl border p-2 text-center transition-all
                ${p.id === game.currentPlayerIndex && game.phase === "playing" ? "border-primary bg-primary/10" : "border-border bg-card/50"}
                ${p.isEliminated ? "opacity-40" : ""}
              `}
            >
              <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
              {p.isProtected && <span className="text-xs text-blue-400">🛡️</span>}
              <TokenDots count={p.tokens} max={game.tokensToWin} />
              <div className="flex justify-center gap-1 mt-1">
                {p.discardPile.slice(-3).map((c, i) => (
                  <img key={i} src={getCardImage(c)} alt={CARD_NAMES_BN[c]} className="w-5 h-7 rounded object-cover opacity-60" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground bg-card/40 rounded-lg px-3 py-1 border border-border">
          <span>ডেকে: {game.deck.length} কার্ড</span>
          <span>সক্রিয়: {active.length} জন</span>
        </div>

        <AnimatePresence mode="wait">
          {game.phase === "game_end" && (
            <motion.div
              key="game-end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="text-6xl">🏆</div>
              <h2 className="text-2xl font-bold text-primary">{game.resultMessage}</h2>
              <div className="flex gap-3">
                <button onClick={handleNewGame} className="px-6 py-2 rounded-xl bg-secondary text-secondary-foreground font-bold border border-border hover:bg-secondary/80">
                  নতুন খেলা
                </button>
              </div>
            </motion.div>
          )}

          {game.phase === "round_end" && (
            <motion.div
              key="round-end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="text-4xl">⚓</div>
              <h2 className="text-xl font-bold text-primary">{game.resultMessage}</h2>
              <div className="flex gap-3">
                <button onClick={handleNewRound} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent">
                  পরবর্তী রাউন্ড
                </button>
                <button onClick={handleNewGame} className="px-6 py-2 rounded-xl bg-secondary text-secondary-foreground font-bold border border-border">
                  নতুন খেলা
                </button>
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "pass_device" && (
            <motion.div
              key="pass"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="bg-card border border-border rounded-2xl p-8 max-w-xs w-full">
                <p className="text-muted-foreground text-sm mb-2">ডিভাইসটি দিন</p>
                <h2 className="text-xl font-bold text-foreground mb-4">{currentPlayer.name}</h2>
                <button
                  onClick={handlePassDevice}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent"
                >
                  আমি প্রস্তুত 👁️
                </button>
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && (game.playStep === "start_turn" || game.playStep === "ai_turn") && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground animate-pulse text-sm">{currentPlayer.name}-এর পালা চলছে…</p>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "select_card" && (
            <motion.div key="select-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-sm">{currentPlayer.name} — একটি কার্ড খেলুন</p>
              <div className="flex gap-4 justify-center flex-wrap">
                {currentPlayer.hand.map((c, i) => {
                  const isForced = mustPlayCaptain(currentPlayer.hand);
                  const isDisabled = isForced && c !== "captain";
                  return (
                    <Card
                      key={i}
                      cardId={c}
                      onClick={() => handleCardSelect(i)}
                      selected={selectedCardIdx === i}
                      disabled={isDisabled}
                    />
                  );
                })}
              </div>
              {selectedCardIdx !== null && (
                <button
                  onClick={handlePlaySelected}
                  className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-accent transition-all"
                >
                  খেলুন ▶
                </button>
              )}
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "select_target" && (
            <motion.div key="select-target" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-sm">একটি লক্ষ্য বেছে নিন ({game.cardBeingPlayed ? CARD_NAMES_BN[game.cardBeingPlayed] : ""})</p>
              <div className="flex gap-3 flex-wrap justify-center">
                {active.filter(p => {
                  if (!game.cardBeingPlayed) return false;
                  if (game.cardBeingPlayed === "cannon") return true;
                  return validTargets.includes(p.id);
                }).map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleTargetSelect(p.id)}
                    className="px-5 py-3 rounded-xl bg-secondary border border-border hover:border-primary hover:bg-secondary/80 font-bold transition-all"
                  >
                    {p.name}
                    {p.isProtected && " 🛡️"}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "select_guess" && (
            <motion.div key="select-guess" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-3">
              <p className="text-muted-foreground text-sm">{game.players[game.targetPlayerIndex!]?.name}-এর কার্ড অনুমান করুন</p>
              <div className="grid grid-cols-3 gap-2 max-w-sm">
                {GUESSABLE_CARDS.map(c => (
                  <button
                    key={c}
                    onClick={() => handleGuardGuess(c)}
                    className="flex flex-col items-center p-2 rounded-xl border border-border bg-secondary hover:border-primary hover:bg-secondary/80 transition-all"
                  >
                    <img src={getCardImage(c)} alt={CARD_NAMES_BN[c]} className="w-12 h-16 object-cover rounded-lg mb-1" />
                    <span className="text-xs font-bold text-center leading-tight">{CARD_NAMES_BN[c]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "merchant_select" && game.merchantOptions && (
            <motion.div key="merchant" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-sm">একটি কার্ড রাখুন, বাকিগুলো ফিরে যাবে</p>
              <div className="flex gap-3 flex-wrap justify-center">
                {game.merchantOptions.map((c, i) => (
                  <Card key={i} cardId={c} onClick={() => handleMerchantSelect(i)} />
                ))}
              </div>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "peek_result" && (
            <motion.div key="peek" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-muted-foreground text-sm">{game.resultMessage}</p>
              {game.peekCard && (
                <Card cardId={game.peekCard} />
              )}
              <button onClick={handleAcknowledge} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent">
                ঠিক আছে
              </button>
            </motion.div>
          )}

          {game.phase === "playing" && game.playStep === "show_result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full">
                <p className="text-foreground font-semibold text-base">{game.resultMessage}</p>
              </div>
              <button onClick={handleAcknowledge} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent">
                পরবর্তী ▶
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {game.log.length > 0 && (
          <div className="bg-card/40 border border-border rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-1 font-bold">গেম লগ</p>
            {game.log.map((entry, i) => (
              <p key={i} className={`text-xs ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                {entry}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
