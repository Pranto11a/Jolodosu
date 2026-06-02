import { GameState, CardId } from './game-types.js';
import { CARD_VALUES, getValidTargets, mustPlayCaptain, playCard } from './game-logic.js';

const TARGET_CARDS: CardId[] = ['guard', 'ship_worker', 'swordsman', 'cannon', 'sailor'];

const PLAY_PRIORITY: CardId[] = [
  'guard', 'ship_worker', 'swordsman', 'cannon', 'merchant',
  'sailor', 'spy', 'captain', 'petty_thief',
];

export function aiTakeTurn(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  const hand = player.hand;

  if (mustPlayCaptain(hand)) {
    return playCard(state, hand.indexOf('captain'));
  }

  for (const cardId of PLAY_PRIORITY) {
    const idx = hand.indexOf(cardId);
    if (idx === -1) continue;

    if (TARGET_CARDS.includes(cardId)) {
      const targets = getValidTargets(state, cardId);
      if (targets.length > 0) return playCard(state, idx);
      if (cardId === 'cannon') return playCard(state, idx);
    } else {
      return playCard(state, idx);
    }
  }

  const best = hand.reduce<{ idx: number; val: number }>(
    (acc, c, i) => {
      if (c === 'pirate') return acc;
      const v = CARD_VALUES[c];
      return v < acc.val ? { idx: i, val: v } : acc;
    },
    { idx: 0, val: Infinity }
  );

  return playCard(state, best.val === Infinity ? 0 : best.idx);
}
