import { CardId, GameState, Player, PlayStep } from './game-types.js';

export const CARD_COUNTS: Record<CardId, number> = {
  petty_thief: 1,
  guard: 6,
  ship_worker: 2,
  swordsman: 2,
  cannon: 2,
  merchant: 2,
  sailor: 1,
  captain: 1,
  spy: 2,
  pirate: 1,
};

export const CARD_VALUES: Record<CardId, number> = {
  petty_thief: 0,
  guard: 1,
  ship_worker: 2,
  swordsman: 3,
  cannon: 5,
  merchant: 6,
  sailor: 7,
  captain: 8,
  spy: 8,
  pirate: 9,
};

export const CARD_NAMES_BN: Record<CardId, string> = {
  petty_thief: 'ছিচকে চোর',
  guard: 'পাহারাদার',
  ship_worker: 'জাহাজ কর্মচারী',
  swordsman: 'তলোয়ারবাজ',
  cannon: 'কামান চালক',
  merchant: 'বণিক',
  sailor: 'নাবিক',
  captain: 'ক্যাপ্টেন',
  spy: 'গুপ্তচর',
  pirate: 'জলদস্যু',
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDeck(): CardId[] {
  const deck: CardId[] = [];
  for (const [id, count] of Object.entries(CARD_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id as CardId);
  }
  return deck;
}

export function getTokensToWin(n: number): number {
  return ({ 2: 7, 3: 5, 4: 4, 5: 3, 6: 3 } as Record<number, number>)[n] ?? 3;
}

export function mustPlayCaptain(hand: CardId[]): boolean {
  return hand.includes('captain') && (hand.includes('cannon') || hand.includes('sailor'));
}

export function getActivePlayers(players: Player[]): Player[] {
  return players.filter(p => !p.isEliminated);
}

function addLog(state: GameState, msg: string): GameState {
  return { ...state, log: [msg, ...state.log].slice(0, 40) };
}

export interface PlayerConfig {
  name: string;
  isHuman: boolean;
}

export function hasMultipleHumans(players: Player[]): boolean {
  return players.filter(p => p.isHuman).length > 1;
}

export function initGame(configs: PlayerConfig[], online?: boolean): GameState {
  const numPlayers = configs.length;
  const deck = shuffle(createDeck());
  const hiddenCard = deck.pop()!;
  if (numPlayers === 2) {
    deck.pop(); deck.pop(); deck.pop();
  }

  const players: Player[] = configs.map((cfg, i) => ({
    id: i,
    name: cfg.name,
    isHuman: cfg.isHuman,
    hand: [deck.pop()!],
    discardPile: [],
    tokens: 0,
    isEliminated: false,
    isProtected: false,
    playedThiefThisRound: false,
  }));

  const firstIsHuman = players[0].isHuman;
  const multiHuman = hasMultipleHumans(players);
  const usePassDevice = firstIsHuman && multiHuman && !online;

  return {
    phase: 'playing',
    playStep: usePassDevice ? 'pass_device' : 'start_turn',
    players,
    deck,
    hiddenCard,
    currentPlayerIndex: 0,
    cardBeingPlayed: null,
    targetPlayerIndex: null,
    guessedCardId: null,
    merchantOptions: null,
    peekCard: null,
    resultMessage: '',
    round: 1,
    tokensToWin: getTokensToWin(numPlayers),
    log: [`রাউন্ড ১ শুরু!`],
    isOnline: online ?? false,
  };
}

export function beginTurn(state: GameState): GameState {
  const idx = state.currentPlayerIndex;
  let players = state.players.map((p, i) => {
    if (i === idx && p.isProtected) return { ...p, isProtected: false };
    return p;
  });

  if (state.deck.length === 0) {
    return checkRoundEnd({ ...state, players });
  }

  const deck = [...state.deck];
  const drawn = deck.pop()!;
  players = players.map((p, i) =>
    i === idx ? { ...p, hand: [...p.hand, drawn] } : p
  );

  const player = players[idx];
  const step: PlayStep = player.isHuman ? 'select_card' : 'ai_turn';

  return addLog(
    {
      ...state,
      deck,
      players,
      cardBeingPlayed: null,
      targetPlayerIndex: null,
      guessedCardId: null,
      merchantOptions: null,
      peekCard: null,
      resultMessage: '',
      playStep: step,
    },
    `${player.name}-এর পালা।`
  );
}

export function getValidTargets(state: GameState, cardId: CardId): number[] {
  const active = getActivePlayers(state.players);
  const cardsThatNeedTarget: CardId[] = ['guard', 'ship_worker', 'swordsman', 'cannon', 'sailor'];
  if (!cardsThatNeedTarget.includes(cardId)) return [];

  return active
    .filter(p => {
      if (cardId === 'cannon') return true;
      return p.id !== state.currentPlayerIndex && !p.isProtected;
    })
    .map(p => p.id);
}

function eliminatePlayer(players: Player[], idx: number, discardedCard?: CardId): Player[] {
  return players.map((p, i) => {
    if (i !== idx) return p;
    const hand = p.hand;
    return {
      ...p,
      isEliminated: true,
      hand: [],
      discardPile: discardedCard
        ? [...p.discardPile, discardedCard, ...hand]
        : [...p.discardPile, ...hand],
    };
  });
}

export function playCard(state: GameState, cardIndex: number): GameState {
  const player = state.players[state.currentPlayerIndex];
  const cardId = player.hand[cardIndex];
  const newHand = player.hand.filter((_, i) => i !== cardIndex);

  let players = state.players.map((p, i) =>
    i === state.currentPlayerIndex
      ? { ...p, hand: newHand, discardPile: [...p.discardPile, cardId] }
      : p
  );

  let s: GameState = { ...state, players, cardBeingPlayed: cardId };

  if (cardId === 'pirate') {
    players = eliminatePlayer(players, state.currentPlayerIndex);
    s = addLog({ ...s, players }, `${player.name} জলদস্যু খেলেছেন এবং বাদ পড়েছেন!`);
    return resolveEndOfPlay(s);
  }

  const validTargets = getValidTargets(s, cardId);

  if (cardId === 'spy') {
    players = s.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, isProtected: true } : p
    );
    s = addLog({ ...s, players, resultMessage: `${player.name} পরবর্তী পালা পর্যন্ত সুরক্ষিত।` }, `${player.name} গুপ্তচর খেলেছেন — সুরক্ষিত!`);
    return { ...s, playStep: 'show_result' };
  }

  if (cardId === 'captain') {
    s = addLog({ ...s, resultMessage: `${player.name} ক্যাপ্টেন খেলেছেন — কোনো প্রভাব নেই।` }, `${player.name} ক্যাপ্টেন খেলেছেন।`);
    return { ...s, playStep: 'show_result' };
  }

  if (cardId === 'petty_thief') {
    players = s.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, playedThiefThisRound: true } : p
    );
    s = addLog({ ...s, players, resultMessage: `${player.name} ছিচকে চোর খেলেছেন — এই রাউন্ডে একমাত্র ছিচকে চোর হলে এবং টিকে থাকলে বোনাস টোকেন পাবেন!` }, `${player.name} ছিচকে চোর খেলেছেন।`);
    return { ...s, playStep: 'show_result' };
  }

  if (cardId === 'merchant') {
    const deck = [...s.deck];
    const extra: CardId[] = [];
    if (deck.length > 0) extra.push(deck.pop()!);
    if (deck.length > 0) extra.push(deck.pop()!);
    const merchantOptions: CardId[] = [...newHand, ...extra];
    s = { ...s, deck, merchantOptions };
    if (player.isHuman) {
      return { ...s, playStep: 'merchant_select' };
    } else {
      return aiMerchantSelect(s);
    }
  }

  if (validTargets.length === 0 && ['guard', 'ship_worker', 'swordsman', 'sailor'].includes(cardId)) {
    s = addLog({ ...s, resultMessage: `কোনো বৈধ লক্ষ্য নেই — ${CARD_NAMES_BN[cardId]} এর কোনো প্রভাব নেই।` }, `${player.name} ${CARD_NAMES_BN[cardId]} খেলেছেন — কোনো লক্ষ্য নেই।`);
    return { ...s, playStep: 'show_result' };
  }

  if (['guard', 'ship_worker', 'swordsman', 'cannon', 'sailor'].includes(cardId)) {
    if (player.isHuman) {
      return { ...s, playStep: 'select_target' };
    } else {
      return aiSelectTarget(s, validTargets);
    }
  }

  return resolveEndOfPlay(s);
}

export function resolveWithTarget(state: GameState, targetIdx: number): GameState {
  const cardId = state.cardBeingPlayed!;
  const s = { ...state, targetPlayerIndex: targetIdx };

  if (cardId === 'guard') {
    if (s.players[s.currentPlayerIndex].isHuman) {
      return { ...s, playStep: 'select_guess' };
    } else {
      return aiGuardGuess(s, targetIdx);
    }
  }

  if (cardId === 'ship_worker') {
    const target = s.players[targetIdx];
    const peekCard = target.hand[0] ?? null;
    const msg = `${s.players[s.currentPlayerIndex].name} ${target.name}-এর কার্ড দেখেছেন।`;
    return addLog(
      { ...s, peekCard, resultMessage: `${target.name}-এর হাতে আছে: ${peekCard ? CARD_NAMES_BN[peekCard] : '???'}`, playStep: 'peek_result' },
      msg
    );
  }

  if (cardId === 'swordsman') {
    return resolveSwordsman(s, targetIdx);
  }

  if (cardId === 'cannon') {
    return resolveCannon(s, targetIdx);
  }

  if (cardId === 'sailor') {
    return resolveSailor(s, targetIdx);
  }

  return resolveEndOfPlay(s);
}

export function resolveGuard(state: GameState, guessedCard: CardId): GameState {
  const target = state.players[state.targetPlayerIndex!];
  const attacker = state.players[state.currentPlayerIndex];
  let players = state.players;
  let msg = '';

  if (target.hand.length > 0 && target.hand[0] === guessedCard) {
    players = eliminatePlayer(players, target.id);
    msg = `${attacker.name} ${CARD_NAMES_BN[guessedCard]} অনুমান করেছেন — সঠিক! ${target.name} বাদ পড়েছেন!`;
  } else {
    msg = `${attacker.name} ${CARD_NAMES_BN[guessedCard]} অনুমান করেছেন — ভুল। ${target.name} নিরাপদ।`;
  }

  const s = addLog({ ...state, players, guessedCardId: guessedCard, resultMessage: msg }, msg);
  return { ...s, playStep: 'show_result' };
}

function resolveSwordsman(state: GameState, targetIdx: number): GameState {
  const attacker = state.players[state.currentPlayerIndex];
  const target = state.players[targetIdx];

  const attackerCard = attacker.hand[0];
  const targetCard = target.hand[0];

  const attackerVal = attackerCard ? CARD_VALUES[attackerCard] : -1;
  const targetVal = targetCard ? CARD_VALUES[targetCard] : -1;

  let players = state.players;
  let msg = '';

  if (attackerVal > targetVal) {
    players = eliminatePlayer(players, targetIdx);
    msg = `${attacker.name} (${attackerCard ? CARD_NAMES_BN[attackerCard] : '?'}) বনাম ${target.name} (${targetCard ? CARD_NAMES_BN[targetCard] : '?'}) — ${target.name} হেরেছেন!`;
  } else if (targetVal > attackerVal) {
    players = eliminatePlayer(players, state.currentPlayerIndex);
    msg = `${attacker.name} (${attackerCard ? CARD_NAMES_BN[attackerCard] : '?'}) বনাম ${target.name} (${targetCard ? CARD_NAMES_BN[targetCard] : '?'}) — ${attacker.name} হেরেছেন!`;
  } else {
    msg = `${attacker.name} বনাম ${target.name} — টাই! কেউ বাদ পড়েননি।`;
  }

  const s = addLog({ ...state, players, resultMessage: msg }, msg);
  return { ...s, playStep: 'show_result' };
}

function resolveCannon(state: GameState, targetIdx: number): GameState {
  const attacker = state.players[state.currentPlayerIndex];
  const target = state.players[targetIdx];
  let players = state.players;
  let deck = [...state.deck];
  let msg = '';

  if (target.isProtected && targetIdx !== state.currentPlayerIndex) {
    msg = `${target.name} সুরক্ষিত — কামান চালকের কোনো প্রভাব নেই!`;
  } else {
    const discarded = target.hand[0];
    const isPirate = discarded === 'pirate';

    if (deck.length > 0) {
      const newCard = deck.pop()!;
      if (isPirate) {
        players = eliminatePlayer(players, targetIdx, discarded);
        msg = `${attacker.name} ${target.name}-এর উপর কামান চালিয়েছেন — তিনি জলদস্যু ডিসকার্ড করে বাদ পড়েছেন!`;
      } else {
        players = players.map((p, i) =>
          i === targetIdx
            ? { ...p, hand: [newCard], discardPile: discarded ? [...p.discardPile, discarded] : p.discardPile }
            : p
        );
        msg = `${attacker.name} ${target.name}-এর উপর কামান চালিয়েছেন — ${discarded ? CARD_NAMES_BN[discarded] : '?'} ডিসকার্ড করে নতুন কার্ড নিয়েছেন।`;
      }
    } else {
      msg = `${attacker.name} ${target.name}-এর উপর কামান চালিয়েছেন — ডেক খালি! নতুন কার্ড নেই।`;
      if (isPirate) {
        players = eliminatePlayer(players, targetIdx, discarded);
        msg += ` ${target.name} জলদস্যু ডিসকার্ড করে বাদ পড়েছেন!`;
      } else {
        players = players.map((p, i) =>
          i === targetIdx
            ? { ...p, hand: [], discardPile: discarded ? [...p.discardPile, discarded] : p.discardPile }
            : p
        );
      }
    }
  }

  const s = addLog({ ...state, players, deck, resultMessage: msg }, msg);
  return { ...s, playStep: 'show_result' };
}

function resolveSailor(state: GameState, targetIdx: number): GameState {
  const attacker = state.players[state.currentPlayerIndex];
  const target = state.players[targetIdx];

  const attackerHand = attacker.hand;
  const targetHand = target.hand;

  const players = state.players.map((p, i) => {
    if (i === state.currentPlayerIndex) return { ...p, hand: targetHand };
    if (i === targetIdx) return { ...p, hand: attackerHand };
    return p;
  });

  const msg = `${attacker.name} ${target.name}-এর সাথে হাত বদল করেছেন!`;
  const s = addLog({ ...state, players, resultMessage: msg }, msg);
  return { ...s, playStep: 'show_result' };
}

function aiMerchantSelect(state: GameState): GameState {
  const options = state.merchantOptions!;
  const best = options.reduce((a, b) => CARD_VALUES[a] >= CARD_VALUES[b] ? a : b);
  const keptIdx = options.indexOf(best);
  return merchantSelect(state, keptIdx);
}

export function merchantSelect(state: GameState, keepIndex: number): GameState {
  const options = state.merchantOptions!;
  const kept = options[keepIndex];
  const rest = options.filter((_, i) => i !== keepIndex);
  const deck = shuffle([...rest, ...state.deck]);

  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, hand: [kept] } : p
  );

  const player = state.players[state.currentPlayerIndex];
  const msg = `${player.name} বণিক ব্যবহার করে একটি কার্ড রেখেছেন।`;
  const s = addLog({ ...state, players, deck, merchantOptions: null, resultMessage: msg }, msg);
  return { ...s, playStep: 'show_result' };
}

function aiSelectTarget(state: GameState, validTargets: number[]): GameState {
  const targetIdx = validTargets[Math.floor(Math.random() * validTargets.length)];
  const s = { ...state, targetPlayerIndex: targetIdx };

  if (state.cardBeingPlayed === 'guard') {
    return aiGuardGuess(s, targetIdx);
  }
  return resolveWithTarget(s, targetIdx);
}

function aiGuardGuess(state: GameState, targetIdx: number): GameState {
  const guessable: CardId[] = ['ship_worker', 'swordsman', 'cannon', 'merchant', 'sailor', 'captain', 'spy', 'pirate', 'petty_thief'];
  const guess = guessable[Math.floor(Math.random() * guessable.length)];
  return resolveGuard({ ...state, targetPlayerIndex: targetIdx }, guess);
}

export function acknowledgeResult(state: GameState): GameState {
  return resolveEndOfPlay(state);
}

function resolveEndOfPlay(state: GameState): GameState {
  const roundEnd = checkRoundEnd(state);
  if (roundEnd.phase !== 'playing') return roundEnd;
  return advanceToNextPlayer(roundEnd);
}

function advanceToNextPlayer(state: GameState): GameState {
  const active = getActivePlayers(state.players);
  if (active.length <= 1) return checkRoundEnd(state);

  let next = (state.currentPlayerIndex + 1) % state.players.length;
  while (state.players[next].isEliminated) {
    next = (next + 1) % state.players.length;
  }

  const nextPlayer = state.players[next];
  const multiHuman = hasMultipleHumans(state.players);
  const step = nextPlayer.isHuman && multiHuman && !state.isOnline ? 'pass_device' : 'start_turn';

  return { ...state, currentPlayerIndex: next, playStep: step };
}

export function confirmPassDevice(state: GameState): GameState {
  return { ...state, playStep: 'start_turn' };
}

export function checkRoundEnd(state: GameState): GameState {
  const active = getActivePlayers(state.players);

  if (active.length === 1) {
    return endRound(state, active[0].id);
  }

  if (state.deck.length === 0) {
    const winner = active.reduce((a, b) => {
      const aVal = a.hand[0] ? CARD_VALUES[a.hand[0]] : -1;
      const bVal = b.hand[0] ? CARD_VALUES[b.hand[0]] : -1;
      return aVal >= bVal ? a : b;
    });
    return endRound(state, winner.id);
  }

  return state;
}

function endRound(state: GameState, winnerId: number): GameState {
  const thiefPlayers = state.players.filter(p => p.playedThiefThisRound && !p.isEliminated);
  let players = state.players.map(p => {
    if (p.id === winnerId) return { ...p, tokens: p.tokens + 1 };
    return p;
  });

  let extraMsg = '';
  if (thiefPlayers.length === 1 && thiefPlayers[0].id === winnerId) {
    extraMsg = ` ${state.players[winnerId].name} ছিচকে চোরের জন্য বোনাস টোকেনও পেয়েছেন!`;
    players = players.map(p => p.id === winnerId ? { ...p, tokens: p.tokens + 1 } : p);
  } else if (thiefPlayers.length === 1) {
    const thief = thiefPlayers[0];
    extraMsg = ` ${thief.name} ছিচকে চোরের জন্য বোনাস টোকেন পেয়েছেন!`;
    players = players.map(p => p.id === thief.id ? { ...p, tokens: p.tokens + 1 } : p);
  }

  const winnerName = state.players[winnerId]?.name ?? 'কেউ একজন';
  const resultMsg = `${winnerName} রাউন্ড জিতেছেন!${extraMsg}`;

  const updatedPlayers = players.map(p => ({ ...p, tokens: p.tokens }));
  const gameWinner = updatedPlayers.find(p => p.tokens >= state.tokensToWin);

  const s = addLog(
    { ...state, players: updatedPlayers, resultMessage: resultMsg },
    resultMsg
  );

  if (gameWinner) {
    return { ...s, phase: 'game_end', resultMessage: `${gameWinner.name} ${gameWinner.tokens} টোকেন দিয়ে গেম জিতেছেন!` };
  }

  return { ...s, phase: 'round_end' };
}

export function startNewRound(state: GameState, firstPlayerIdx: number): GameState {
  const deck = shuffle(createDeck());
  const hiddenCard = deck.pop()!;
  if (state.players.length === 2) {
    deck.pop(); deck.pop(); deck.pop();
  }

  const players: Player[] = state.players.map(p => ({
    ...p,
    isEliminated: false,
    isProtected: false,
    hand: [deck.pop()!],
    discardPile: [],
    playedThiefThisRound: false,
  }));

  const firstPlayer = players[firstPlayerIdx];
  const multiHuman = hasMultipleHumans(players);
  const step = firstPlayer.isHuman && multiHuman && !state.isOnline ? 'pass_device' : 'start_turn';

  const round = state.round + 1;
  return {
    ...state,
    phase: 'playing',
    playStep: step,
    players,
    deck,
    hiddenCard,
    currentPlayerIndex: firstPlayerIdx,
    cardBeingPlayed: null,
    targetPlayerIndex: null,
    guessedCardId: null,
    merchantOptions: null,
    peekCard: null,
    resultMessage: '',
    round,
    log: [`রাউন্ড ${round} শুরু!`, ...state.log],
  };
}
