import type { CSSProperties } from 'react';

export type Deck = {
  id: 'self' | 'relationship' | 'intimacy';
  index: string;
  name: string;
  englishName: string;
  description: string;
  detail: string;
  accent: string;
  soft: string;
  ink: string;
  available: boolean;
};

export function deckStyle(deck: Deck): CSSProperties {
  return {
    '--deck-accent': deck.accent,
    '--deck-soft': deck.soft,
    '--deck-ink': deck.ink,
  } as CSSProperties;
}

export function DeckArtwork({ deck }: { deck: Deck }) {
  return (
    <span className={`deck-art deck-art-${deck.id}`} aria-hidden="true">
      <span className="orbit orbit-outer">
        <span className="spark spark-one" />
        <span className="spark spark-two" />
      </span>
      <span className="orbit orbit-inner"><span className="spark spark-three" /></span>
      <span className="art-core"><span>{deck.index}</span></span>
    </span>
  );
}

export function DeckCover({ deck }: { deck: Deck }) {
  return (
    <>
      <span className="card-kicker"><span>{deck.index}</span><span>{deck.englishName}</span></span>
      <DeckArtwork deck={deck} />
      <span className="deck-card-copy"><strong>{deck.name}</strong><span>{deck.description}</span></span>
    </>
  );
}
