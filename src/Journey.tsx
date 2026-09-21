import { useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { DeckCover, deckStyle, type Deck } from './DeckCard';
import { createDrawBag, initialJourney, journeyReducer, MOTION } from './journeyState';
import { previewCards } from './previewCards';
import JourneyTunnel from './JourneyTunnel';
import './journey.css';
import './journeyNight.css';

export type DeckOrigin = { left: number; top: number; width: number; height: number };

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export default function Journey({ deck, origin, onReturn }: { deck: Deck; origin: DeckOrigin; onReturn: () => void }) {
  const [state, dispatch] = useReducer(journeyReducer, initialJourney);
  const { phase, card } = state;
  const reducedMotion = useReducedMotion();
  const centerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const drawRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const busyRef = useRef(false);
  const [nextCard] = useState(() => createDrawBag(previewCards[deck.id === 'relationship' ? 'relationship' : 'self']));
  const [movement, setMovement] = useState<CSSProperties>({});
  const phrase = deck.id === 'relationship' ? '重新看见彼此' : '向未知再进一步';
  const entering = phase === 'ritual' || phase === 'tunnel';
  const dark = phase === 'ready' || phase === 'drawing' || phase === 'revealed';

  useLayoutEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, []);

  useLayoutEffect(() => {
    const target = centerRef.current?.getBoundingClientRect();
    if (!target) return;
    setMovement({
      '--origin-x': `${origin.left + origin.width / 2 - target.left - target.width / 2}px`,
      '--origin-y': `${origin.top + origin.height / 2 - target.top - target.height / 2}px`,
      '--origin-scale-x': origin.width / target.width,
      '--origin-scale-y': origin.height / target.height,
    } as CSSProperties);
  }, [origin]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onReturn();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onReturn]);

  useEffect(() => {
    const timed = phase === 'centering'
      ? { delay: MOTION.center, type: 'CENTERED' as const }
      : phase === 'ritual'
        ? { delay: MOTION.ritual, type: reducedMotion ? 'ENTERED' as const : 'TUNNEL' as const }
        : phase === 'tunnel'
          ? { delay: MOTION.tunnel, type: 'ENTERED' as const }
          : phase === 'drawing'
          ? { delay: MOTION.draw, type: 'REVEAL' as const }
          : null;
    if (!timed) return;
    const timer = window.setTimeout(() => dispatch({ type: timed.type }), reducedMotion ? 30 : timed.delay);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, state.drawKey]);

  useEffect(() => {
    busyRef.current = phase === 'centering' || phase === 'ritual' || phase === 'tunnel' || phase === 'drawing';
    if (phase === 'centered') startRef.current?.focus({ preventScroll: true });
    if (phase === 'ready') drawRef.current?.focus({ preventScroll: true });
    if (phase === 'revealed') titleRef.current?.focus({ preventScroll: true });
  }, [phase]);

  function draw(replace = false) {
    if (busyRef.current || (phase !== 'ready' && phase !== 'revealed')) return;
    busyRef.current = true;
    dispatch({ type: 'DRAW', card: nextCard(), replace });
  }

  const status = phase === 'ritual' ? phrase
    : phase === 'tunnel' ? '光点正在汇聚，旅程即将开始。'
    : phase === 'centered' ? `${deck.name}已就位，可以开始旅程。`
      : phase === 'ready' ? '牌堆已准备好，抽一张牌。'
        : phase === 'revealed' ? `第${state.turn}张，${card?.title}` : '';

  return (
    <section
      className="journey-scene"
      data-phase={phase}
      data-theme={dark ? 'dark' : 'light'}
      style={{ ...deckStyle(deck), ...movement, '--center-duration': `${MOTION.center}ms`, '--ritual-duration': `${MOTION.ritual}ms`, '--tunnel-duration': `${MOTION.tunnel}ms`, '--draw-duration': `${MOTION.draw}ms` } as CSSProperties}
      role="region"
      aria-label={`${deck.name}旅程`}
    >
      <div className="journey-atmosphere" aria-hidden="true" />
      <div className="journey-halo" aria-hidden="true" />
      {phase === 'tunnel' && !reducedMotion && <JourneyTunnel duration={MOTION.tunnel} />}

      {phase !== 'centering' && !entering && (
        <header className="journey-topbar">
          <button className="journey-back" type="button" onClick={onReturn}><span aria-hidden="true">←</span> 返回卡组</button>
          <span className="journey-deck-label">ARCANA <span>／ {deck.name}</span></span>
        </header>
      )}

      <div className="journey-center" ref={centerRef}>
        <div className="journey-stack-motion">
          <div className="journey-stack" aria-hidden="true">
            {[3, 2, 1].map((depth) => <span key={depth} className="stack-sheet" style={{ '--sheet-index': depth } as CSSProperties} />)}
            <div className="stack-cover deck-card is-selected"><DeckCover deck={deck} /></div>
          </div>
          {card && (phase === 'drawing' || phase === 'revealed') && (
            <article className="drawn-card" key={state.drawKey} aria-busy={phase === 'drawing'}>
              <div className="card-rotator">
                <div className="card-face card-back" aria-hidden="true"><DeckCover deck={deck} /></div>
                <div className="card-face card-front" aria-hidden={phase !== 'revealed'}>
                  <div className="drawn-card-meta"><span>ARCANA</span><span>{String(state.turn).padStart(2, '0')}</span></div>
                  <div className="drawn-card-content">
                    <span className="drawn-card-eyebrow">{deck.id === 'relationship' ? '开放题共同回答' : '此刻，只需要感受'}</span>
                    <h1 ref={titleRef} tabIndex={-1}>{card.title}</h1>
                    <p>{card.prompt}</p>
                  </div>
                  <div className="drawn-card-footer"><span>{deck.name}</span><span aria-hidden="true">✧</span></div>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>

      {phase === 'ritual' && <div className="journey-copy" aria-hidden="true"><p>{phrase}</p></div>}

      <div className="journey-controls">
        {phase === 'centered' && <button ref={startRef} className="primary-button journey-start" onClick={() => dispatch({ type: 'START' })} type="button">开始旅程 <span aria-hidden="true">→</span></button>}
        {entering && <button className="journey-skip" onClick={() => dispatch({ type: 'ENTERED' })} type="button">跳过动画</button>}
        {(phase === 'ready' || phase === 'drawing') && (
          <>
            <p className="journey-hint">{phase === 'drawing' ? '让下一张牌，慢慢展开。' : '准备好了，就抽出第一张牌。'}</p>
            <button ref={drawRef} className="primary-button" disabled={phase === 'drawing'} onClick={() => draw()} type="button">{phase === 'drawing' ? '正在翻开' : '抽一张牌'} <span aria-hidden="true">↑</span></button>
          </>
        )}
        {phase === 'revealed' && (
          <>
            <p className="journey-hint">你可以停留，也可以换一张。</p>
            <div className="journey-action-row">
              <button className="journey-secondary" onClick={() => draw(true)} type="button">换一张牌</button>
              <button className="primary-button" onClick={() => draw()} type="button">下一张 <span aria-hidden="true">→</span></button>
            </div>
          </>
        )}
      </div>
      <p className="journey-sr-only" role="status" aria-live="polite">{status}</p>
    </section>
  );
}
