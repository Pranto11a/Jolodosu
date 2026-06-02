import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const CARD_IMAGE_FILENAMES: Record<string, string> = {
  pirate: "9_pirate.jpg",
  captain: "8_captain.jpg",
  spy: "4_cannon.jpg",
  sailor: "7_spy.jpg",
  merchant: "6_sailor.jpg",
  cannon: "5_merchant.jpg",
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

const CARDS_SHOWCASE = [
  { key: "pirate", name: "জলদস্যু", value: "৯", count: "×১", desc: "যে খেলবেন তিনি বাদ পড়বেন" },
  { key: "captain", name: "ক্যাপ্টেন", value: "৮", count: "×১", desc: "সাথে বণিক বা নাবিক থাকলে অবশ্যই খেলতে হবে" },
  { key: "sailor", name: "নাবিক", value: "৭", count: "×১", desc: "যেকোনো খেলোয়াড়ের সাথে হাত বদল করুন" },
  { key: "merchant", name: "বণিক", value: "৬", count: "×২", desc: "ডেক থেকে অতিরিক্ত কার্ড নিন, একটি রাখুন" },
  { key: "cannon", name: "কামান চালক", value: "৫", count: "×২", desc: "লক্ষ্যের কার্ড ফেলে নতুন কার্ড নিতে বাধ্য করুন" },
  { key: "spy", name: "গুপ্তচর", value: "৪", count: "×২", desc: "পরবর্তী পালা পর্যন্ত সুরক্ষিত থাকুন" },
  { key: "swordsman", name: "তলোয়ারবাজ", value: "৩", count: "×২", desc: "কার্ড তুলনা করুন — যার বেশি তিনি টিকবেন" },
  { key: "ship_worker", name: "জাহাজ কর্মচারী", value: "২", count: "×২", desc: "একজনের কার্ড দেখুন" },
  { key: "guard", name: "পাহারাদার", value: "১", count: "×৬", desc: "একটি কার্ড অনুমান করুন — সঠিক হলে বাদ পড়বেন" },
  { key: "petty_thief", name: "ছিচকে চোর", value: "০", count: "×২", desc: "রাউন্ড শেষে একমাত্র বাঁচলে বোনাস টোকেন পান" },
];

export default function HomePage() {
  const [, navigate] = useLocation();
  const [playerCount, setPlayerCount] = useState(2);
  const [botCount, setBotCount] = useState(1);
  const [names, setNames] = useState<string[]>(["খেলোয়াড় ১", "খেলোয়াড় ২"]);
  const [showRules, setShowRules] = useState(false);

  const humanCount = playerCount - botCount;

  function handlePlayerCountChange(n: number) {
    setPlayerCount(n);
    const bots = Math.min(botCount, n - 1);
    setBotCount(bots);
    const humans = n - bots;
    setNames(prev => {
      const next: string[] = [];
      for (let i = 0; i < humans; i++) next.push(prev[i] ?? `খেলোয়াড় ${i + 1}`);
      return next;
    });
  }

  function handleBotCountChange(b: number) {
    setBotCount(b);
    const humans = playerCount - b;
    setNames(prev => {
      const next: string[] = [];
      for (let i = 0; i < humans; i++) next.push(prev[i] ?? `খেলোয়াড় ${i + 1}`);
      return next;
    });
  }

  function handleStartGame() {
    const botNames = ["Blackbeard", "Redbeard", "Ironhook", "Bluecoat", "Silversail"];
    const players = [
      ...names.map((name, i) => ({ name: name || `খেলোয়াড় ${i + 1}`, isHuman: true })),
      ...Array.from({ length: botCount }, (_, i) => ({ name: botNames[i] ?? `Bot ${i + 1}`, isHuman: false })),
    ];
    sessionStorage.setItem("jd_players", JSON.stringify(players));
    navigate("/game");
  }

  return (
    <div className="min-h-screen ocean-bg flex flex-col">
      <header className="py-6 px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-primary drop-shadow-lg mb-1"
          style={{ textShadow: "0 2px 12px hsl(35 85% 40% / 0.7)" }}
        >
          জলদস্যু
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="text-muted-foreground text-sm tracking-widest uppercase"
        >
          Pirate Card Game
        </motion.p>
      </header>

      <main className="flex-1 flex flex-col items-center gap-6 px-4 pb-10 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          className="w-full bg-card border border-border rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-lg font-semibold mb-4 text-foreground">নতুন খেলা</h2>

          <div className="mb-4">
            <label className="block text-sm text-muted-foreground mb-2">মোট খেলোয়াড়</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => handlePlayerCountChange(n)}
                  className={`w-10 h-10 rounded-lg font-bold transition-all ${
                    playerCount === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-muted-foreground mb-2">বট খেলোয়াড় ({botCount}টি)</label>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: playerCount }, (_, i) => i).map(n => (
                <button
                  key={n}
                  onClick={() => handleBotCountChange(n)}
                  className={`w-10 h-10 rounded-lg font-bold transition-all ${
                    botCount === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {humanCount > 0 && (
            <div className="mb-5">
              <label className="block text-sm text-muted-foreground mb-2">মানুষ খেলোয়াড়দের নাম</label>
              <div className="flex flex-col gap-2">
                {Array.from({ length: humanCount }, (_, i) => (
                  <input
                    key={i}
                    value={names[i] ?? ""}
                    onChange={e => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                    placeholder={`খেলোয়াড় ${i + 1}`}
                    className="w-full px-4 py-2 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleStartGame}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-accent transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            ⚓ খেলা শুরু করুন
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
          className="w-full"
        >
          <button
            onClick={() => navigate("/lobby")}
            className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-base hover:bg-secondary/80 transition-all border border-border"
          >
            🌐 অনলাইনে খেলুন
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          className="w-full"
        >
          <button
            onClick={() => setShowRules(v => !v)}
            className="w-full py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            {showRules ? "▲ নিয়ম লুকান" : "▼ খেলার নিয়ম দেখুন"}
          </button>

          {showRules && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-card border border-border rounded-2xl p-5 mt-2 shadow-xl"
            >
              <h3 className="font-bold text-primary mb-3 text-lg">খেলার নিয়ম</h3>
              <p className="text-sm text-muted-foreground mb-4">
                প্রতিটি পালায় একটি কার্ড তুলুন এবং দুটির মধ্যে একটি খেলুন। শেষ পর্যন্ত বেঁচে থাকলে অথবা ডেক শেষ হলে সবচেয়ে বেশি মূল্যের কার্ড যার হাতে থাকবে, তিনি টোকেন পাবেন।
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                <strong className="text-foreground">জয়ের শর্ত:</strong> নির্দিষ্ট সংখ্যক টোকেন পেলে গেম জেতা হয় (২ জন → ৭টি, ৩ জন → ৫টি, ৪ জন → ৪টি, ৫-৬ জন → ৩টি)।
              </p>
              <div className="grid grid-cols-1 gap-2">
                {CARDS_SHOWCASE.map(c => (
                  <div key={c.key} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                    <img
                      src={getCardImage(c.key)}
                      alt={c.name}
                      className="w-10 h-14 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-primary text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground">({c.value}) {c.count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
