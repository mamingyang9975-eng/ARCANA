import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { orderDeckCards } from './relationshipOrder';
import { promptTokenDelay, tokenizePrompt } from './promptTyping';
import promptPinyin from './promptPinyin.json';
import { selfCards } from './selfCards';

type Card = {
  id: string;
  index: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  soft: string;
  ink: string;
  fixedAtEnd?: boolean;
};

type Screen = 'select' | 'use' | 'journey' | 'deck';

type DeckLayoutPhase = 'showcase' | 'moving' | 'focused' | 'exiting';

const cards: Card[] = [
  {
    id: 'begin',
    index: '01',
    name: '启程',
    subtitle: 'THE BEGINNING',
    description: '向未知迈出一步。',
    accent: '#f0b84b',
    soft: '#fff3d8',
    ink: '#5f4000',
  },
  {
    id: 'balance',
    index: '02',
    name: '平衡',
    subtitle: 'THE BALANCE',
    description: '找到舒适与边界',
    accent: '#64aa8e',
    soft: '#e4f5ee',
    ink: '#1f5946',
  },
  {
    id: 'courage',
    index: '03',
    name: '勇气',
    subtitle: 'THE COURAGE',
    description: '探索心理的边界与欲望',
    accent: '#e77962',
    soft: '#ffebe6',
    ink: '#72291b',
  },
  {
    id: 'insight',
    index: '04',
    name: '洞察',
    subtitle: 'THE INSIGHT',
    description: '理解身体的真实反馈',
    accent: '#8c79dc',
    soft: '#eeeaff',
    ink: '#3d2c7a',
  },
  {
    id: 'new-moon',
    index: '05',
    name: '新月',
    subtitle: 'THE NEW MOON',
    description: '进入日常，享受当下的时光',
    accent: '#5f8fc5',
    soft: '#e6f1fb',
    ink: '#214c79',
  },
];

// Temporary deck labels and cards until the authored relationship content is added.
const relationshipCards: Card[] = [
  { id: 'relation-listen', index: '01', name: '关系卡组 A', subtitle: 'RELATION A', description: '关系探索占位卡组 · 10 张卡牌', accent: '#c98879', soft: '#f9eae5', ink: '#713d35' },
  { id: 'relation-boundary', index: '02', name: '关系卡组 B', subtitle: 'RELATION B', description: '关系探索占位卡组 · 10 张卡牌', accent: '#88a6a0', soft: '#e8f1ee', ink: '#365d56' },
  { id: 'relation-together', index: '03', name: '关系卡组 C', subtitle: 'RELATION C', description: '关系探索占位卡组 · 10 张卡牌', accent: '#9c8cbd', soft: '#f0ecf7', ink: '#51436d' },
];

const allCards = [...cards, ...relationshipCards];

function createPlaceholderDeck(deck: Card): Card[] {
  const isRelationship = relationshipCards.some((item) => item.id === deck.id);
  return Array.from({ length: isRelationship ? 10 : 5 }, (_, cardIndex) => {
    const number = String(cardIndex + 1).padStart(2, '0');

    return {
      id: `${deck.id}-placeholder-${number}`,
      index: number,
      name: `占位卡牌 ${number}`,
      subtitle: `${deck.subtitle.replace('THE ', '')} · CARD ${number}`,
      description: `${deck.name}卡组的第 ${cardIndex + 1} 张占位卡牌，内容将在后续补充。`,
      accent: deck.accent,
      soft: deck.soft,
      ink: deck.ink,
      fixedAtEnd: deck.id === 'relation-together' && cardIndex >= 8,
    };
  });
}

const deckCardsById: Record<string, Card[]> = Object.fromEntries(
  cards.map((group) => [group.id, selfCards.filter((item) => item.group === group.id).map((item) => ({
    ...group,
    id: `self-card-${item.number}`,
    index: String(item.number).padStart(2, '0'),
    name: `卡牌 ${String(item.number).padStart(2, '0')}`,
    subtitle: group.subtitle,
    description: item.text,
  }))]),
);

function getDeckCards(card: Card) {
  return deckCardsById[card.id] ?? createPlaceholderDeck(card);
}

function splitCardPrompt(text: string) {
  return text.split('\n');
}
function ProgressiveCardPrompt({
  parts,
  revealed = true,
}: {
  parts: string[];
  revealed?: boolean;
}) {
  const [typing, setTyping] = useState<{ text: string[]; composition: string; part: number }>({ text: parts.map(() => ''), composition: '', part: 0 });
  const promptKey = parts.join('\u0000');

  useEffect(() => {
    const currentParts = promptKey.split('\u0000');
    setTyping({ text: currentParts.map(() => ''), composition: '', part: 0 });
    if (!revealed) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyping({ text: currentParts, composition: '', part: 0 });
      return undefined;
    }

    const tokens = tokenizePrompt(currentParts, promptPinyin);
    const work = tokens.reduce((total, token, index) => total + (token.pinyin ? token.pinyin.length * 24 : 0) + promptTokenDelay(token, index, 1), 0);
    const speed = Math.min(1, 7000 / Math.max(work, 1));
    const committed = currentParts.map(() => '');
    let tokenIndex = 0;
    let letterIndex = 0;
    let timer = 0;
    const advance = () => {
      const token = tokens[tokenIndex];
      if (!token) return;
      if (token.pinyin && letterIndex < token.pinyin.length) {
        letterIndex += 1;
        setTyping({ text: [...committed], composition: token.pinyin.slice(0, letterIndex), part: token.part });
        timer = window.setTimeout(advance, (21 + (letterIndex % 4) * 2) * speed);
      } else {
        committed[token.part] += token.text;
        setTyping({ text: [...committed], composition: '', part: token.part });
        const delay = promptTokenDelay(token, tokenIndex, speed);
        tokenIndex += 1;
        letterIndex = 0;
        timer = window.setTimeout(advance, delay);
      }
    };
    timer = window.setTimeout(advance, 180);
    return () => window.clearTimeout(timer);
  }, [promptKey, revealed]);

  return (
    <div className="deck-card-prompt-copy" role="group" aria-label={parts.join(' ')}>
      <div className="deck-card-prompt-measure" aria-hidden="true">
        {parts.map((part, index) => (
          <p
            key={`measure-${index}`}
            className={index === 0 ? 'deck-card-prompt-lead' : 'deck-card-prompt-detail'}
          >
            {part}
          </p>
        ))}
      </div>

        <div className="deck-card-prompt-reveal" aria-hidden="true">
          {parts.map((_, partIndex) => (
            <p
              key={`reveal-${partIndex}`}
              className={partIndex === 0 ? 'deck-card-prompt-lead' : 'deck-card-prompt-detail'}
            >
              {typing.text[partIndex]}
              {typing.part === partIndex && typing.composition && <span className="deck-prompt-composition">{typing.composition}</span>}
            </p>
          ))}
        </div>
    </div>
  );
}

const particles = Array.from({ length: 84 }, (_, index) => {
  const angle = (index * 137.508 * Math.PI) / 180;
  const reach = 34 + (index % 8) * 7;

  return {
    id: index,
    style: {
      '--particle-x': `${Math.cos(angle) * reach}vw`,
      '--particle-y': `${Math.sin(angle) * reach}vh`,
      '--particle-delay': `${-((index * 0.073) % 1.9)}s`,
      '--particle-duration': `${1.35 + (index % 7) * 0.12}s`,
      '--particle-size': `${1 + (index % 4) * 0.7}px`,
    } as CSSProperties,
  };
});

const deckMotes = Array.from({ length: 16 }, (_, index) => ({
  id: index,
  style: {
    left: `${7 + ((index * 37) % 88)}%`,
    top: `${8 + ((index * 53) % 82)}%`,
    '--mote-x': `${-28 + ((index * 19) % 58)}px`,
    '--mote-y': `${-34 + ((index * 23) % 70)}px`,
    '--mote-size': `${1.2 + (index % 4) * 0.75}px`,
    '--mote-blur': `${index % 5 === 0 ? 2.5 : index % 3 === 0 ? 1 : 0}px`,
    '--mote-opacity': `${0.24 + (index % 4) * 0.1}`,
    '--mote-delay': `${-(index * 1.7)}s`,
    '--mote-duration': `${13 + (index % 6) * 3}s`,
  } as CSSProperties,
}));

const journeyExitMotes = Array.from({ length: 132 }, (_, index) => {
  const left = 4 + ((index * 47) % 92);
  const top = 3 + ((index * 71) % 94);
  const angle = (index * 137.508 * Math.PI) / 180;
  const burstReach = 45 + (index % 9) * 4;

  return {
    id: index,
    style: {
      left: `${left}%`,
      top: `${top}%`,
      '--exit-mote-size': `${1.5 + (index % 5) * 0.72}px`,
      '--exit-mote-opacity': `${0.38 + (index % 6) * 0.1}`,
      '--exit-mote-delay': `${3.72 + (index % 19) * 0.045}s`,
      '--exit-gather-x': `${50 - left}vw`,
      '--exit-gather-y': `${50 - top}vh`,
      '--exit-burst-x': `${Math.cos(angle) * burstReach}vw`,
      '--exit-burst-y': `${Math.sin(angle) * burstReach}vh`,
    } as CSSProperties,
  };
});

function cardStyle(card: Card) {
  return {
    '--card-accent': card.accent,
    '--card-soft': card.soft,
    '--card-ink': card.ink,
  } as CSSProperties;
}

function deckCardStyle(card: Card, deckTheme: Card) {
  return {
    ...cardStyle(card),
    '--card-accent': deckTheme.accent,
  } as CSSProperties;
}

const artworkAnimationEpoch = typeof performance === 'undefined' ? 0 : performance.now();
const backgroundMusicUrl = '';
const musicIconUrl = '';

function CardArtwork({ card }: { card: Card }) {
  const [animationDelay] = useState(() => {
    if (typeof performance === 'undefined') return 0;
    return -(performance.now() - artworkAnimationEpoch);
  });

  return (
    <div
      className="card-art"
      style={{ '--art-animation-delay': `${animationDelay}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="orbit-layer orbit-layer-large">
        <span className="orbit" />
        <span className="spark spark-one" />
        <span className="spark spark-three" />
      </span>
      <span className="orbit-layer orbit-layer-small">
        <span className="orbit" />
        <span className="spark spark-two" />
      </span>
      <span className="art-core">
        <span>{card.index}</span>
      </span>
    </div>
  );
}

function ContactControl() {
  const [isOpen, setIsOpen] = useState(false);
  const contactRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !contactRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="contact-control" ref={contactRef}>
      <button
        className="contact-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls="contact-details"
        onClick={() => setIsOpen((value) => !value)}
      >
        联系我们
      </button>

      {isOpen && (
        <div id="contact-details" className="contact-panel" aria-label="联系方式">
          <div className="contact-item">
            <span className="contact-label">邮箱</span>
            <a className="contact-value" href="mailto:mamingyang9975@gmail.com">
              mamingyang9975@gmail.com
            </a>
          </div>
          <div className="contact-item">
            <span className="contact-label">微信</span>
            <span className="contact-value">Yao11Jiu</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MusicControl() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.volume = 0.42;

    const syncPlayingState = () => setIsPlaying(!audio.paused);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', syncPlayingState);
    audio.addEventListener('playing', syncPlayingState);
    audio.addEventListener('pause', handlePause);

    void audio.play().then(
      () => setAutoplayBlocked(false),
      () => setAutoplayBlocked(true),
    );

    return () => {
      audio.removeEventListener('play', syncPlayingState);
      audio.removeEventListener('playing', syncPlayingState);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  useEffect(() => {
    if (!autoplayBlocked || isPlaying) return undefined;

    const startOnFirstInteraction = (event: Event) => {
      if (userPausedRef.current) return;
      if (event.target instanceof Element && event.target.closest('.music-toggle')) return;

      void audioRef.current?.play().then(
        () => setAutoplayBlocked(false),
        () => setAutoplayBlocked(true),
      );
    };

    document.addEventListener('pointerdown', startOnFirstInteraction, true);
    document.addEventListener('keydown', startOnFirstInteraction, true);

    return () => {
      document.removeEventListener('pointerdown', startOnFirstInteraction, true);
      document.removeEventListener('keydown', startOnFirstInteraction, true);
    };
  }, [autoplayBlocked, isPlaying]);

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      userPausedRef.current = false;
      void audio.play().then(
        () => setAutoplayBlocked(false),
        () => setAutoplayBlocked(true),
      );
      return;
    }

    userPausedRef.current = true;
    setAutoplayBlocked(false);
    audio.pause();
  }

  return (
    <div className="music-control">
      <audio
        ref={audioRef}
        src={backgroundMusicUrl}
        autoPlay
        loop
        preload="auto"
        playsInline
      />
      <button
        className={`music-toggle ${isPlaying ? 'is-playing' : 'is-paused'}`}
        type="button"
        aria-label={isPlaying ? '关闭背景音乐' : '播放背景音乐'}
        aria-pressed={isPlaying}
        title={isPlaying ? '关闭背景音乐' : '播放背景音乐'}
        onClick={toggleMusic}
      >
        <span className="music-icon-wrap" aria-hidden="true">
          <img className="music-icon" src={musicIconUrl} alt="" />
        </span>
      </button>
    </div>
  );
}

function Journey({ card, onComplete }: { card: Card; onComplete: () => void }) {
  const [phase, setPhase] = useState<'words' | 'lights'>('words');
  const needsEntering = card.id === 'courage' || card.id === 'new-moon';

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lightTimer = window.setTimeout(() => setPhase('lights'), reduceMotion ? 350 : 2200);
    const completeTimer = window.setTimeout(onComplete, reduceMotion ? 900 : 5700);

    return () => {
      window.clearTimeout(lightTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <main className={`journey-page journey-${phase}`} style={cardStyle(card)}>
      <div className="journey-ambient" aria-hidden="true" />

      <section className="journey-words" aria-live="polite">
        <p>
          现在，我们一起{needsEntering ? '进入' : ''}
          <strong>【{card.name}】</strong>
        </p>
      </section>

      <div className="light-tunnel" aria-hidden="true">
        <span className="tunnel-ring tunnel-ring-one" />
        <span className="tunnel-ring tunnel-ring-two" />
        <span className="tunnel-ring tunnel-ring-three" />
        <span className="tunnel-core" />
        {particles.map((particle) => (
          <span key={particle.id} className="light-particle" style={particle.style} />
        ))}
      </div>

      <button className="skip-journey" type="button" onClick={onComplete}>
        跳过动画 <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}

function JourneyExit({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const completeTimer = window.setTimeout(onComplete, reduceMotion ? 1050 : 8300);

    return () => window.clearTimeout(completeTimer);
  }, [onComplete]);

  return (
    <section className="journey-exit" role="status" aria-live="polite" aria-label="旅程正在结束">
      <p className="journey-exit-words">现在，享受你自己的时刻。</p>
      <div className="journey-exit-motes" aria-hidden="true">
        {journeyExitMotes.map((mote) => (
          <span key={mote.id} className="journey-exit-mote" style={mote.style} />
        ))}
        <span className="journey-exit-core" />
        <span className="journey-exit-wash" />
      </div>
    </section>
  );
}

function Deck({ card, onReturn }: { card: Card; onReturn: () => void }) {
  const [journeyDeck] = useState(() => {
    const groupSource = relationshipCards.some((item) => item.id === card.id) ? relationshipCards : cards;
    const initialGroupIndex = Math.max(groupSource.findIndex((item) => item.id === card.id), 0);
    const journeyGroups = [...groupSource.slice(initialGroupIndex), ...groupSource.slice(0, initialGroupIndex)];
    return journeyGroups.flatMap((group) => {
      const groupCards = getDeckCards(group);
      const orderedCards = groupSource === relationshipCards ? orderDeckCards(groupCards) : groupCards;
      return orderedCards.map((journeyCard, cardIndex) => ({ group, card: journeyCard, cardIndex }));
    });
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [cardMotion, setCardMotion] = useState(0);
  const [isMobileDrawing, setIsMobileDrawing] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  const [layoutPhase, setLayoutPhase] = useState<DeckLayoutPhase>(() => {
    const shouldAnimate = window.matchMedia('(min-width: 721px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return shouldAnimate ? 'showcase' : 'focused';
  });
  const [isTransitioning, setIsTransitioning] = useState(() => (
    window.matchMedia('(min-width: 721px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));
  const transitionTimers = useRef<number[]>([]);
  const activeGroup = journeyDeck[stepIndex].group;
  const deckCards = journeyDeck.filter((item) => item.group.id === activeGroup.id).map((item) => item.card);
  const activeCard = deckCards[activeIndex];
  const isLastCard = stepIndex === journeyDeck.length - 1;
  const journeyProgress = ((stepIndex + 1) / journeyDeck.length) * 100;
  const promptParts = splitCardPrompt(activeCard.description);

  function finishJourney() {
    if (isEnding) return;
    setIsEnding(true);
  }

  useEffect(() => {
    return () => {
      transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
      transitionTimers.current = [];
    };
  }, []);

  useEffect(() => {
    const shouldAnimate = window.matchMedia('(min-width: 721px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!shouldAnimate) {
      setLayoutPhase('focused');
      setIsTransitioning(false);
      return;
    }

    setLayoutPhase('showcase');
    setIsTransitioning(true);

    const moveTimer = window.setTimeout(() => setLayoutPhase('moving'), 1420);
    const focusTimer = window.setTimeout(() => {
      setLayoutPhase('focused');
      setIsTransitioning(false);
    }, 2400);
    transitionTimers.current.push(moveTimer, focusTimer);

    return undefined;
  }, []);

  function showCard(nextIndex: number, note: string, nextStepIndex = stepIndex) {
    if (isTransitioning || isEnding) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = window.matchMedia('(min-width: 721px)').matches && !reducedMotion;

    if (!shouldAnimate) {
      setActiveIndex(nextIndex);
      setStepIndex(nextStepIndex);
      setCardMotion((value) => value + 1);
      setActionNote(note);
      setLayoutPhase('focused');
      if (!reducedMotion) {
        setIsMobileDrawing(true);
        setIsTransitioning(true);
        const drawTimer = window.setTimeout(() => {
          setIsMobileDrawing(false);
          setIsTransitioning(false);
        }, 1400);
        transitionTimers.current.push(drawTimer);
      }
      return;
    }

    setIsTransitioning(true);
    setActionNote('');
    setLayoutPhase('exiting');

    const swapTimer = window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setStepIndex(nextStepIndex);
      setCardMotion((value) => value + 1);
      setActionNote(note);
      setLayoutPhase('showcase');

      const moveTimer = window.setTimeout(() => setLayoutPhase('moving'), 1420);
      const focusTimer = window.setTimeout(() => {
        setLayoutPhase('focused');
        setIsTransitioning(false);
      }, 2400);

      transitionTimers.current.push(moveTimer, focusTimer);
    }, 520);

    transitionTimers.current.push(swapTimer);
  }

  function exchangeCard() {
    if (activeCard.fixedAtEnd) return;
    const exchangeableCount = deckCards.filter((item) => !item.fixedAtEnd).length;
    if (exchangeableCount < 2) {
      setActionNote('当前卡组暂时只有这一张牌');
      return;
    }

    const offset = 1 + (cardMotion % (exchangeableCount - 1));
    const nextIndex = (activeIndex + offset) % exchangeableCount;
    showCard(nextIndex, '已为你换上一张不同的牌');
  }

  function skipCard() {
    const nextStep = journeyDeck[stepIndex + 1];
    showCard(nextStep.cardIndex, '已跳过，旅程继续', stepIndex + 1);
  }

  function nextCard() {
    if (isLastCard) {
      finishJourney();
      return;
    }

    const nextStep = journeyDeck[stepIndex + 1];
    showCard(nextStep.cardIndex, '已进入下一张牌', stepIndex + 1);
  }

  return (
    <main
      className={`deck-page deck-layout-${layoutPhase} ${isEnding ? 'is-ending' : ''}`}
      style={cardStyle(activeGroup)}
    >
      <div className="deck-atmosphere" aria-hidden="true">
        <span className="deck-ambient-glow" />
        {deckMotes.map((mote) => (
          <span key={mote.id} className="deck-mote" style={mote.style} />
        ))}
      </div>

      <header className="topbar deck-topbar">
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <span>ARCANA</span>
        </div>
        <span className="brand-mark">今日旅程</span>
        <div className="topbar-meta">
          <span className="step-label">
            {String(stepIndex + 1).padStart(2, '0')} / {String(journeyDeck.length).padStart(2, '0')}
          </span>
          <ContactControl />
        </div>
      </header>

      <section
        className="deck-stage"
        aria-label={`${activeGroup.name}卡组，当前卡牌为${activeCard.name}`}
        aria-busy={isTransitioning}
      >
        <div className="deck-card-slot">
          <article className={`deck-reading-card ${isMobileDrawing ? 'is-mobile-drawing' : ''}`} key={cardMotion} style={deckCardStyle(activeCard, activeGroup)}>
            <div className="deck-reading-inner">
              <div className="card-kicker">
                <span>{activeCard.index}</span>
                <span>{activeCard.subtitle}</span>
              </div>
              <CardArtwork card={activeCard} />
              <div className="deck-card-prompt">
                <ProgressiveCardPrompt parts={promptParts} revealed={!isMobileDrawing} />
              </div>
              <div className="active-card-copy">
                <h1>{activeCard.name}</h1>
              </div>
            </div>
            <div className="deck-reading-inner deck-reading-cover" aria-hidden="true">
              <div className="card-kicker">
                <span>{activeCard.index}</span>
                <span>{activeCard.subtitle}</span>
              </div>
              <CardArtwork card={activeCard} />
              <div className="active-card-copy"><h1>{activeCard.name}</h1></div>
            </div>
          </article>
        </div>

        <aside className="deck-actions">
          <div className="deck-guidance">
            <span className="eyebrow">{activeGroup.name} · CARD DECK</span>
            <div className="deck-guidance-copy">
              <ProgressiveCardPrompt
                key={`guidance-${cardMotion}`}
                parts={promptParts}
                revealed={layoutPhase === 'focused'}
              />
            </div>
          </div>

          <button
            className="deck-exchange-button"
            type="button"
            onClick={exchangeCard}
            disabled={isTransitioning || isEnding || Boolean(activeCard.fixedAtEnd)}
          >
            <span aria-hidden="true">↻</span> 换一张牌
          </button>

          <div
            className="deck-progress"
            role="progressbar"
            aria-label="卡牌旅程进度"
            aria-valuemin={1}
            aria-valuemax={journeyDeck.length}
            aria-valuenow={stepIndex + 1}
          >
            <span
              className="deck-progress-fill"
              style={{ '--deck-progress': `${journeyProgress}%` } as CSSProperties}
            />
          </div>

          <div className="deck-forward-actions">
            <button
              className="deck-next-button"
              type="button"
              onClick={nextCard}
              disabled={isTransitioning || isEnding}
            >
              {isLastCard ? '结束这次旅程' : '下一步'} <span aria-hidden="true">→</span>
            </button>
            {!isLastCard && !activeCard.fixedAtEnd && (
              <button
                className="deck-skip-button"
                type="button"
                onClick={skipCard}
                disabled={isTransitioning || isEnding}
              >
                跳过这张牌
              </button>
            )}
          </div>

          <p className="deck-action-note" aria-live="polite">{actionNote || '\u00a0'}</p>
        </aside>
      </section>

      <footer className="deck-footer">
        <button type="button" onClick={finishJourney}>结束这次旅程</button>
      </footer>

      {isEnding && <JourneyExit onComplete={onReturn} />}
    </main>
  );
}

function AppContent() {
  const [selectedId, setSelectedId] = useState(cards[0].id);
  const [selectedBySection, setSelectedBySection] = useState({ self: cards[0].id, relationship: relationshipCards[0].id });
  const [activeSection, setActiveSection] = useState<'self' | 'relationship'>(() =>
    window.location.hash === '#relationship' ? 'relationship' : 'self',
  );
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [recommendationTipKey, setRecommendationTipKey] = useState(0);
  const [descriptionMessageCardId, setDescriptionMessageCardId] = useState<string | null>(null);
  const [descriptionMessageKey, setDescriptionMessageKey] = useState(0);
  const [journeyEndMessageKey, setJourneyEndMessageKey] = useState(0);
  const [screen, setScreen] = useState<Screen>('select');
  const [used, setUsed] = useState(false);
  const activationTimer = useRef<number | null>(null);
  const recommendationTipTimer = useRef<number | null>(null);
  const descriptionMessageTimer = useRef<number | null>(null);
  const journeyEndTimer = useRef<number | null>(null);
  const selfGridRef = useRef<HTMLElement | null>(null);
  const relationshipGridRef = useRef<HTMLElement | null>(null);
  const restoringCarouselsRef = useRef(false);
  const carouselScrollRef = useRef<{ timer: number; section: 'self' | 'relationship'; initialId: string } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; scrollTop: number; maxScroll: number } | null>(null);
  const directoryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const directoryPanelRef = useRef<HTMLElement | null>(null);
  const directoryCloseRef = useRef<HTMLButtonElement | null>(null);

  const selectedCard = allCards.find((card) => card.id === selectedId) ?? cards[0];
  const selectedSelfCard = cards.find((card) => card.id === selectedBySection.self) ?? cards[0];
  const selectedRelationshipCard = relationshipCards.find((card) => card.id === selectedBySection.relationship) ?? relationshipCards[0];

  function selectCard(card: Card, section: 'self' | 'relationship') {
    if (carouselScrollRef.current) {
      window.clearTimeout(carouselScrollRef.current.timer);
      carouselScrollRef.current = null;
    }
    if (section === 'self' && card.id === 'new-moon') {
      hideRecommendationTip();
      showJourneyEndMessage();
      return;
    }
    setSelectedBySection((current) => ({ ...current, [section]: card.id }));
    setSelectedId(card.id);
    setActiveSection(section);
    if (section === 'self') {
      if (card.id === 'begin') showRecommendationTip();
      else hideRecommendationTip();
      showCardDescription(card);
    }
  }

  function syncCarouselSelection(container: HTMLElement, section: 'self' | 'relationship', sectionCards: Card[]) {
    if (restoringCarouselsRef.current || !window.matchMedia('(max-width: 720px)').matches) return;
    const center = container.getBoundingClientRect().left + container.clientWidth / 2;
    const children = Array.from(container.querySelectorAll<HTMLElement>('.choice-card'));
    const closest = children.reduce((best, child, index) => {
      const bounds = child.getBoundingClientRect();
      const distance = Math.abs(bounds.left + bounds.width / 2 - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity });
    const card = sectionCards[closest.index];
    if (card && card.id !== selectedBySection[section]) {
      setSelectedBySection((current) => ({ ...current, [section]: card.id }));
      setSelectedId(card.id);
    }
    if (!card) return;
    const previousScroll = carouselScrollRef.current;
    if (previousScroll) window.clearTimeout(previousScroll.timer);
    const initialId = previousScroll?.section === section ? previousScroll.initialId : selectedBySection[section];
    const timer = window.setTimeout(() => {
      carouselScrollRef.current = null;
      if (card.id !== initialId) {
        hideRecommendationTip();
        showCardDescription(card);
      }
    }, 200);
    carouselScrollRef.current = { timer, section, initialId };
  }

  function navigateSection(section: 'self' | 'relationship') {
    if (section === activeSection) return;
    setActiveSection(section);
    if (window.location.hash !== `#${section}`) window.history.pushState(null, '', `#${section}`);
    requestAnimationFrame(() => document.getElementById(`${section}-title`)?.focus({ preventScroll: true }));
  }

  function closeDirectory(restoreFocus = true) {
    setDirectoryOpen(false);
    if (restoreFocus) requestAnimationFrame(() => directoryTriggerRef.current?.focus({ preventScroll: true }));
  }

  function chooseDirectorySection(section: 'self' | 'relationship') {
    const isCurrent = section === activeSection;
    closeDirectory(isCurrent);
    if (!isCurrent) navigateSection(section);
  }

  useEffect(() => {
    if (!directoryOpen) return;
    directoryCloseRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDirectory();
      } else if (event.key === 'Tab') {
        const items = directoryPanelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [directoryOpen]);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 720px)');
    const closeOnMobile = () => { if (mobile.matches) setDirectoryOpen(false); };
    mobile.addEventListener('change', closeOnMobile);
    return () => mobile.removeEventListener('change', closeOnMobile);
  }, []);

  function handlePanelWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) < 15 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const panel = event.currentTarget.querySelector<HTMLElement>(`#${activeSection}`);
    if (!panel) return;
    const atTop = panel.scrollTop <= 2;
    const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
    if (event.deltaY > 0 && atBottom && activeSection === 'self') navigateSection('relationship');
    if (event.deltaY < 0 && atTop && activeSection === 'relationship') navigateSection('self');
  }

  function handlePanelTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    const panel = event.currentTarget.querySelector<HTMLElement>(`#${activeSection}`);
    if (!touch || !panel) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, scrollTop: panel.scrollTop, maxScroll: panel.scrollHeight - panel.clientHeight };
  }

  function handlePanelTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) < 55 || Math.abs(dy) < Math.abs(dx) * 1.35) return;
    if (dy < 0 && start.scrollTop >= start.maxScroll - 2 && activeSection === 'self') navigateSection('relationship');
    if (dy > 0 && start.scrollTop <= 2 && activeSection === 'relationship') navigateSection('self');
  }

  useEffect(() => {
    const syncHash = () => setActiveSection(window.location.hash === '#relationship' ? 'relationship' : 'self');
    window.addEventListener('popstate', syncHash);
    window.addEventListener('hashchange', syncHash);
    return () => { window.removeEventListener('popstate', syncHash); window.removeEventListener('hashchange', syncHash); };
  }, []);

  useLayoutEffect(() => {
    if (screen !== 'select') return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { document.body.style.overflow = bodyOverflow; document.documentElement.style.overflow = rootOverflow; };
  }, [screen]);

  useLayoutEffect(() => {
    if (screen !== 'select' || !window.matchMedia('(max-width: 720px)').matches) return;
    restoringCarouselsRef.current = true;
    for (const [container, sectionCards, selected] of [
      [selfGridRef.current, cards, selectedBySection.self],
      [relationshipGridRef.current, relationshipCards, selectedBySection.relationship],
    ] as const) {
      const index = sectionCards.findIndex((card) => card.id === selected);
      const target = container?.querySelectorAll<HTMLElement>('.choice-card')[index];
      if (container && target) {
        const offset = target.getBoundingClientRect().left - container.getBoundingClientRect().left;
        container.scrollTo({ left: container.scrollLeft + offset - 2, behavior: 'instant' });
      }
    }
    const timer = window.setTimeout(() => { restoringCarouselsRef.current = false; }, 200);
    return () => { window.clearTimeout(timer); restoringCarouselsRef.current = false; };
  }, [screen]);

  useEffect(() => {
    return () => {
      if (activationTimer.current !== null) {
        window.clearTimeout(activationTimer.current);
      }
      if (recommendationTipTimer.current !== null) {
        window.clearTimeout(recommendationTipTimer.current);
      }
      if (descriptionMessageTimer.current !== null) {
        window.clearTimeout(descriptionMessageTimer.current);
      }
      if (journeyEndTimer.current !== null) {
        window.clearTimeout(journeyEndTimer.current);
      }
      if (carouselScrollRef.current) {
        window.clearTimeout(carouselScrollRef.current.timer);
      }
    };
  }, []);

  function openCard(card = selectedCard) {
    setSelectedId(card.id);
    setActiveSection(relationshipCards.some((item) => item.id === card.id) ? 'relationship' : 'self');
    setUsed(false);
    setScreen('use');
  }

  function hideRecommendationTip() {
    if (recommendationTipTimer.current !== null) {
      window.clearTimeout(recommendationTipTimer.current);
      recommendationTipTimer.current = null;
    }
    setRecommendationTipKey(0);
  }

  function showRecommendationTip() {
    if (recommendationTipTimer.current !== null) {
      window.clearTimeout(recommendationTipTimer.current);
    }

    setRecommendationTipKey((value) => value + 1);
    recommendationTipTimer.current = window.setTimeout(() => {
      recommendationTipTimer.current = null;
      setRecommendationTipKey(0);
    }, 3720);
  }

  function showJourneyEndMessage() {
    if (descriptionMessageTimer.current !== null) {
      window.clearTimeout(descriptionMessageTimer.current);
      descriptionMessageTimer.current = null;
    }
    if (journeyEndTimer.current !== null) {
      window.clearTimeout(journeyEndTimer.current);
    }

    setDescriptionMessageCardId(null);
    setDescriptionMessageKey(0);
    setJourneyEndMessageKey((value) => value + 1);
    journeyEndTimer.current = window.setTimeout(() => {
      journeyEndTimer.current = null;
      setJourneyEndMessageKey(0);
    }, 3000);
  }

  function showCardDescription(card: Card) {
    if (journeyEndTimer.current !== null) {
      window.clearTimeout(journeyEndTimer.current);
      journeyEndTimer.current = null;
    }
    if (descriptionMessageTimer.current !== null) {
      window.clearTimeout(descriptionMessageTimer.current);
    }

    setJourneyEndMessageKey(0);
    setDescriptionMessageCardId(card.id);
    setDescriptionMessageKey((value) => value + 1);
    descriptionMessageTimer.current = window.setTimeout(() => {
      descriptionMessageTimer.current = null;
      setDescriptionMessageCardId(null);
      setDescriptionMessageKey(0);
    }, 3000);
  }

  function returnToCards() {
    if (activationTimer.current !== null) {
      window.clearTimeout(activationTimer.current);
      activationTimer.current = null;
    }
    setUsed(false);
    setScreen('select');
  }

  function activateCard() {
    if (used) return;

    setUsed(true);
    activationTimer.current = window.setTimeout(() => {
      activationTimer.current = null;
      setScreen('journey');
    }, 900);
  }

  if (screen === 'journey') {
    return <Journey card={selectedCard} onComplete={() => setScreen('deck')} />;
  }

  if (screen === 'deck') {
    return <Deck card={selectedCard} onReturn={returnToCards} />;
  }

  if (screen === 'use') {
    return (
      <main
        className="use-page"
        style={cardStyle(selectedCard)}
      >
        <header className="topbar use-topbar">
          <button className="text-button" type="button" onClick={returnToCards}>
            <span aria-hidden="true">←</span> 返回选择
          </button>
          <span className="brand-mark">ARC / 05</span>
          <div className="topbar-meta">
            <span className="step-label">02 / USE</span>
            <ContactControl />
          </div>
        </header>

        <section className="use-stage" aria-live="polite">
          <div className={`active-card ${used ? 'is-used' : ''}`}>
            <div className="active-card-inner">
              <div className="card-kicker">
                <span>{selectedCard.index}</span>
                <span>{selectedCard.subtitle}</span>
              </div>
              <CardArtwork card={selectedCard} />
              <div className="active-card-copy">
                <h1>{selectedCard.name}</h1>
                <p>{selectedCard.description}</p>
              </div>
            </div>
          </div>

          <div className="use-copy">
            <span className="eyebrow">当前卡牌</span>
            <h2>{used ? '卡牌已生效' : `准备使用「${selectedCard.name}」`}</h2>
            <p>
              {used
                ? '正在为你开启这组卡牌……'
                : selectedCard.id === 'new-moon'
                  ? '新月模块暂时没有卡牌，将从启程模块开始旅程。'
                  : `确认后，这张卡牌将带你进入对应的${relationshipCards.some((item) => item.id === selectedCard.id) ? '十张' : '多张'}卡牌卡组。`}
            </p>
            <button
              className="primary-button use-button"
              type="button"
              onClick={activateCard}
              disabled={used}
            >
              {used ? '已使用' : '使用这张卡牌'}
              {!used && <span aria-hidden="true">↗</span>}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`select-page section-${activeSection}`}
    >
      <header className="topbar" inert={directoryOpen}>
        <div className="brand">
          <span className="brand-dot" aria-hidden="true" />
          <span>ARCANA</span>
          <button ref={directoryTriggerRef} className="directory-trigger" type="button" aria-expanded={directoryOpen} aria-controls="exploration-directory" onClick={() => setDirectoryOpen(true)}>目录</button>
        </div>
        <p>让此刻的直觉，为你指引下一步</p>
        <div className="topbar-meta">
          <nav className="exploration-nav" aria-label="探索主题">
            <a href="#self" aria-current={activeSection === 'self' ? 'location' : undefined} onClick={(event) => { event.preventDefault(); navigateSection('self'); }}>自我探索</a>
            <a href="#relationship" aria-current={activeSection === 'relationship' ? 'location' : undefined} onClick={(event) => { event.preventDefault(); navigateSection('relationship'); }}>关系探索</a>
          </nav>
          <ContactControl />
        </div>
      </header>

      <div className="exploration-viewport" inert={directoryOpen} onWheel={handlePanelWheel} onTouchStart={handlePanelTouchStart} onTouchEnd={handlePanelTouchEnd}>
      <div className="exploration-track">
      <section className="exploration-section" id="self" aria-labelledby="self-title" inert={activeSection !== 'self'} aria-hidden={activeSection !== 'self'}>
      <section className="selection-intro">
        <div className="selection-copy">
          <span className="selection-note">整个旅程从左至右依次推进，强度也会逐步提升</span>
          <span className="eyebrow">你可以从任意一个节点进入旅程</span>
        </div>
        <h1 id="self-title" tabIndex={-1}>此刻，你的身体想要什么？</h1>
      </section>

      <section ref={selfGridRef} className="card-grid" aria-label="自我探索卡组" onScroll={(event) => syncCarouselSelection(event.currentTarget, 'self', cards)}>
        {cards.map((card) => {
          const selected = card.id === selectedBySection.self;
          const isShowingDescription =
            card.id === descriptionMessageCardId && descriptionMessageKey > 0;

          return (
            <button
              key={card.id}
              className={`choice-card ${selected ? 'is-selected' : ''}`}
              style={cardStyle(card)}
              type="button"
              aria-pressed={selected}
              aria-describedby={
                isShowingDescription
                  ? `card-description-message-${card.id}`
                  : card.id === 'begin' && selected && recommendationTipKey > 0
                    ? 'begin-recommendation-tip'
                  : card.id === 'new-moon' && journeyEndMessageKey > 0
                    ? 'journey-end-message'
                  : undefined
              }
              onClick={() => selectCard(card, 'self')}
              onDoubleClick={() => {
                if (card.id !== 'new-moon') openCard(card);
              }}
            >
              {card.id === 'begin' && (
                <span className="recommendation-badge">推荐</span>
              )}
              {card.id === 'begin' && selected && recommendationTipKey > 0 && (
                <span
                  key={`recommendation-tip-${recommendationTipKey}`}
                  id="begin-recommendation-tip"
                  className="recommendation-tip"
                  role="status"
                >
                  最深度的体验
                </span>
              )}
              {isShowingDescription && (
                <span
                  key={descriptionMessageKey}
                  id={`card-description-message-${card.id}`}
                  className="card-description-message"
                  role="status"
                >
                  {card.description}
                </span>
              )}
              {card.id === 'new-moon' && journeyEndMessageKey > 0 && (
                <span
                  key={journeyEndMessageKey}
                  id="journey-end-message"
                  className="journey-end-message"
                  role="status"
                >
                  这趟旅程到这里就结束啦
                </span>
              )}
              <span className="card-kicker">
                <span>{card.index}</span>
                <span>{card.subtitle}</span>
              </span>
              <CardArtwork card={card} />
              <span className="choice-card-copy">
                <strong>{card.name}</strong>
                <span>{card.description}</span>
              </span>
              <span className="selection-check" aria-hidden="true">✓</span>
            </button>
          );
        })}
      </section>

      <a className="section-next" href="#relationship" onClick={(event) => { event.preventDefault(); navigateSection('relationship'); }}>关系探索<span aria-hidden="true">↓</span></a>

      <footer className="selection-footer">
        <div className="selected-summary">
          <span>当前选择</span>
          <strong>{selectedSelfCard.name}</strong>
          <span className="summary-description">{selectedSelfCard.description}</span>
        </div>
        <button className="primary-button" type="button" onClick={() => openCard(selectedSelfCard)}>
          进入卡牌 <span aria-hidden="true">→</span>
        </button>
      </footer>
      </section>

      <section className="exploration-section relationship-section" id="relationship" aria-labelledby="relationship-title" inert={activeSection !== 'relationship'} aria-hidden={activeSection !== 'relationship'}>
        <a className="section-previous" href="#self" onClick={(event) => { event.preventDefault(); navigateSection('self'); }}>自我探索<span aria-hidden="true">↑</span></a>
        <section className="selection-intro">
          <div className="selection-copy">
            <span className="selection-note">从相遇、靠近到彼此理解，按照自己的节奏探索</span>
            <span className="eyebrow">你可以从任意一个卡组进入</span>
          </div>
          <h1 id="relationship-title" tabIndex={-1}>关系中，你想看见什么？</h1>
        </section>
        <section ref={relationshipGridRef} className="card-grid relationship-grid" aria-label="关系探索卡组" onScroll={(event) => syncCarouselSelection(event.currentTarget, 'relationship', relationshipCards)}>
          {relationshipCards.map((card) => (
            <button key={card.id} className={`choice-card ${selectedBySection.relationship === card.id ? 'is-selected' : ''}`}
              style={cardStyle(card)} type="button" aria-pressed={selectedBySection.relationship === card.id}
              aria-describedby={card.id === descriptionMessageCardId && descriptionMessageKey > 0 ? `card-description-message-${card.id}` : undefined}
              onClick={() => selectCard(card, 'relationship')} onDoubleClick={() => openCard(card)}>
              {card.id === descriptionMessageCardId && descriptionMessageKey > 0 && (
                <span key={descriptionMessageKey} id={`card-description-message-${card.id}`} className="card-description-message" role="status">{card.description}</span>
              )}
              <span className="card-kicker"><span>{card.index}</span><span>{card.subtitle}</span></span>
              <CardArtwork card={card} />
              <span className="choice-card-copy"><strong>{card.name}</strong><span>{card.description}</span></span>
              <span className="selection-check" aria-hidden="true">✓</span>
            </button>
          ))}
        </section>
        <footer className="selection-footer">
          <div className="selected-summary"><span>当前选择</span><strong>{selectedRelationshipCard.name}</strong><span className="summary-description">{selectedRelationshipCard.description}</span></div>
          <button className="primary-button" type="button" onClick={() => openCard(selectedRelationshipCard)}>进入卡牌 <span aria-hidden="true">→</span></button>
        </footer>
      </section>
      </div>
      </div>
      <div className={`directory-layer ${directoryOpen ? 'is-open' : ''}`} inert={!directoryOpen} aria-hidden={!directoryOpen}>
        <button className="directory-backdrop" type="button" tabIndex={-1} aria-label="关闭目录" onClick={() => closeDirectory()} />
        <aside className="directory-panel" id="exploration-directory" ref={directoryPanelRef} role="dialog" aria-modal="true" aria-labelledby="directory-title">
          <div className="directory-heading">
            <h2 id="directory-title">目录</h2>
            <button ref={directoryCloseRef} className="directory-close" type="button" aria-label="关闭目录" onClick={() => closeDirectory()}>×</button>
          </div>
          <nav className="directory-links" aria-label="探索主题">
            <a href="#self" aria-current={activeSection === 'self' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); chooseDirectorySection('self'); }}><span>自我探索</span><span aria-hidden="true">↗</span></a>
            <a href="#relationship" aria-current={activeSection === 'relationship' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); chooseDirectorySection('relationship'); }}><span>关系探索</span><span aria-hidden="true">↗</span></a>
          </nav>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(() => (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    if (!showIntro) return undefined;
    const timer = window.setTimeout(() => setShowIntro(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  return (
    <>
      <div className={showIntro ? 'intro-home' : undefined} inert={showIntro}>
        <AppContent />
      </div>
      {showIntro && (
        <div className="intro-screen" role="status">
          <p>关于自己，关于关系</p>
        </div>
      )}
    </>
  );
}
