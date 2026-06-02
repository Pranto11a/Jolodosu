import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";

const BASE = import.meta.env.BASE_URL;

export default function OnlineLobbyPage() {
  const [, navigate] = useLocation();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  function connect(): Promise<Socket> {
    if (socketRef.current?.connected) return Promise.resolve(socketRef.current);
    return new Promise((resolve, reject) => {
      const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.once("connect", () => resolve(socket));
      socket.once("connect_error", reject);
    });
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  async function handleCreate() {
    if (!playerName.trim()) { setError("নাম লিখুন"); return; }
    setError(""); setStatus("রুম তৈরি হচ্ছে...");
    try {
      const socket = await connect();
      socket.emit("create_room", { playerName: playerName.trim() });
      socket.on("room_created", ({ roomId, playerId }: { roomId: string; playerId: number }) => {
        sessionStorage.setItem("jd_online_room", roomId);
        sessionStorage.setItem("jd_online_player_id", String(playerId));
        sessionStorage.setItem("jd_online_name", playerName.trim());
        navigate("/online-game");
      });
      socket.on("error", (msg: string) => { setError(msg); setStatus(""); });
    } catch {
      setError("সংযোগ ব্যর্থ হয়েছে"); setStatus("");
    }
  }

  async function handleJoin() {
    if (!playerName.trim()) { setError("নাম লিখুন"); return; }
    if (!roomCode.trim()) { setError("রুম কোড লিখুন"); return; }
    setError(""); setStatus("যোগ দেওয়া হচ্ছে...");
    try {
      const socket = await connect();
      socket.emit("join_room", { roomId: roomCode.toUpperCase().trim(), playerName: playerName.trim() });
      socket.on("room_joined", ({ roomId, playerId }: { roomId: string; playerId: number }) => {
        sessionStorage.setItem("jd_online_room", roomId);
        sessionStorage.setItem("jd_online_player_id", String(playerId));
        sessionStorage.setItem("jd_online_name", playerName.trim());
        navigate("/online-game");
      });
      socket.on("error", (msg: string) => { setError(msg); setStatus(""); });
    } catch {
      setError("সংযোগ ব্যর্থ হয়েছে"); setStatus("");
    }
  }

  return (
    <div className="min-h-screen ocean-bg flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl"
      >
        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground mb-4 block hover:text-foreground">← বাড়ি</button>
        <h2 className="text-xl font-bold text-primary mb-5 text-center">🌐 অনলাইন মাল্টিপ্লেয়ার</h2>

        {mode === "menu" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode("create")}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent transition-all"
            >
              নতুন রুম তৈরি করুন
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-bold border border-border hover:bg-secondary/80 transition-all"
            >
              রুমে যোগ দিন
            </button>
          </div>
        )}

        {(mode === "create" || mode === "join") && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">আপনার নাম</label>
              <input
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="নাম লিখুন"
                className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {mode === "join" && (
              <div>
                <label className="text-sm text-muted-foreground block mb-1">রুম কোড</label>
                <input
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={6}
                  className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest text-lg"
                />
              </div>
            )}

            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            {status && <p className="text-muted-foreground text-sm text-center animate-pulse">{status}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setMode("menu"); setError(""); setStatus(""); }}
                className="flex-1 py-2 rounded-xl bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 transition-all"
              >
                বাতিল
              </button>
              <button
                onClick={mode === "create" ? handleCreate : handleJoin}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-accent transition-all"
              >
                {mode === "create" ? "তৈরি করুন" : "যোগ দিন"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
