export type CardId =
  | 'petty_thief'
  | 'guard'
  | 'ship_worker'
  | 'swordsman'
  | 'cannon'
  | 'merchant'
  | 'sailor'
  | 'captain'
  | 'spy'
  | 'pirate';

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  hand: CardId[];
  discardPile: CardId[];
  tokens: number;
  isEliminated: boolean;
  isProtected: boolean;
  playedThiefThisRound: boolean;
}

export type PlayStep =
  | 'pass_device'
  | 'start_turn'
  | 'select_card'
  | 'select_target'
  | 'select_guess'
  | 'merchant_select'
  | 'peek_result'
  | 'show_result'
  | 'ai_turn';

export type GamePhase = 'setup' | 'playing' | 'round_end' | 'game_end';

export interface GameState {
  phase: GamePhase;
  playStep: PlayStep;
  players: Player[];
  deck: CardId[];
  hiddenCard: CardId | null;
  currentPlayerIndex: number;
  cardBeingPlayed: CardId | null;
  targetPlayerIndex: number | null;
  guessedCardId: CardId | null;
  merchantOptions: CardId[] | null;
  peekCard: CardId | null;
  resultMessage: string;
  round: number;
  tokensToWin: number;
  log: string[];
  isOnline?: boolean;
}
