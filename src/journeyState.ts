export const MOTION = { center: 1200, ritual: 3000, tunnel: 4000, draw: 820 } as const;

export type PromptCard = { id: string; title: string; prompt: string };
export type Phase = 'centering' | 'centered' | 'ritual' | 'tunnel' | 'ready' | 'drawing' | 'revealed';
export type JourneyState = {
  phase: Phase;
  card: PromptCard | null;
  turn: number;
  drawKey: number;
};
export type JourneyEvent =
  | { type: 'CENTERED' | 'START' | 'TUNNEL' | 'ENTERED' | 'REVEAL' }
  | { type: 'DRAW'; card: PromptCard; replace: boolean };

export const initialJourney: JourneyState = { phase: 'centering', card: null, turn: 0, drawKey: 0 };

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  if (event.type === 'CENTERED' && state.phase === 'centering') return { ...state, phase: 'centered' };
  if (event.type === 'START' && state.phase === 'centered') return { ...state, phase: 'ritual' };
  if (event.type === 'TUNNEL' && state.phase === 'ritual') return { ...state, phase: 'tunnel' };
  if (event.type === 'ENTERED' && (state.phase === 'ritual' || state.phase === 'tunnel')) return { ...state, phase: 'ready' };
  if (event.type === 'DRAW' && (state.phase === 'ready' || state.phase === 'revealed')) {
    return {
      phase: 'drawing', card: event.card, drawKey: state.drawKey + 1,
      turn: state.turn + (event.replace && state.turn > 0 ? 0 : 1),
    };
  }
  if (event.type === 'REVEAL' && state.phase === 'drawing') return { ...state, phase: 'revealed' };
  return state;
}

// Exhaust the unseen cards before replenishing. Replacement counts as having seen a card.
export function createDrawBag(cards: readonly PromptCard[], random: () => number = Math.random) {
  if (cards.length === 0) throw new Error('A draw bag needs at least one card.');
  let unseen = [...cards];
  let previousId: string | null = null;
  return () => {
    if (unseen.length === 0) unseen = [...cards];
    const candidates = unseen.length > 1 ? unseen.filter((card) => card.id !== previousId) : unseen;
    const card = candidates[Math.floor(random() * candidates.length)];
    unseen = unseen.filter((candidate) => candidate.id !== card.id);
    previousId = card.id;
    return card;
  };
}
