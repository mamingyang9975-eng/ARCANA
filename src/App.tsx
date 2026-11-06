import { useCallback, useRef, useState } from 'react';
import { DeckCover, deckStyle, type Deck } from './DeckCard';
import Journey, { type DeckOrigin } from './Journey';

const decks: Deck[] = [
  {
    id: 'self',
    index: '01',
    name: '自我探索',
    englishName: 'SELF EXPLORATION',
    description: '从身体感受与安全感出发，慢慢认识自己。',
    detail: '一段只属于你的旅程，不需要昵称，也不需要做得正确。',
    accent: '#e7b64f',
    soft: '#fff2d4',
    ink: '#624800',
    available: true,
  },
  {
    id: 'relationship',
    index: '02',
    name: '关系探索',
    englishName: 'RELATIONSHIP EXPLORATION',
    description: '把未说清楚的期待，交给彼此慢慢看见。',
    detail: '两个人共同进入；之后会用昵称清楚标记每一张牌的对象。',
    accent: '#6ca48c',
    soft: '#e2f2e9',
    ink: '#235444',
    available: true,
  },
  {
    id: 'intimacy',
    index: '03',
    name: '性爱探索',
    englishName: 'INTIMACY EXPLORATION',
    description: '关于亲密、沟通与边界的双人探索。',
    detail: '建设中。首版将支持成年、不同生理性别的双人组合；其他性别组合会在后续置入。',
    accent: '#8f7fcd',
    soft: '#ede8ff',
    ink: '#42316f',
    available: false,
  },
];

function App() {
  const [selectedId, setSelectedId] = useState<Deck['id']>('self');
  const [origin, setOrigin] = useState<DeckOrigin | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const openRef = useRef<HTMLButtonElement>(null);
  const openingRef = useRef(false);
  const selectedDeck = decks.find((deck) => deck.id === selectedId) ?? decks[0];

  function chooseDeck(deck: Deck) {
    setSelectedId(deck.id);
  }

  function showNextStep() {
    if (openingRef.current || !selectedDeck.available) return;
    const bounds = cardRefs.current[selectedId]?.getBoundingClientRect();
    if (!bounds) return;
    openingRef.current = true;
    setOrigin({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height });
  }

  const returnHome = useCallback(() => {
    setOrigin(null);
    openingRef.current = false;
    requestAnimationFrame(() => openRef.current?.focus({ preventScroll: true }));
  }, []);

  return (
    <>
    <main className={`arcana-home${origin ? ' is-departing' : ''}`} inert={Boolean(origin)} aria-hidden={origin ? true : undefined}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ARCANA 首页">
          <span className="brand-dot" aria-hidden="true" />
          <span>ARCANA</span>
        </a>
        <p>让此刻的直觉，为你指引下一步</p>
        <span className="step-label">01 / SELECT</span>
      </header>

      <section className="home-intro" id="top" aria-labelledby="home-title">
        <div className="intro-copy">
          <span className="intro-note">三段旅程，三种靠近自己的方式</span>
          <span className="eyebrow">CHOOSE A CARD JOURNEY</span>
        </div>
        <h1 id="home-title">此刻，你想从哪里开始？</h1>
      </section>

      <section className="deck-grid" aria-label="选择一个 ARCANA 卡组">
        {decks.map((deck) => {
          const selected = deck.id === selectedDeck.id;

          return (
            <button
              key={deck.id}
              ref={(element) => { cardRefs.current[deck.id] = element; }}
              className={`deck-card ${selected ? 'is-selected' : ''} ${!deck.available ? 'is-coming-soon' : ''}`}
              style={deckStyle(deck)}
              type="button"
              aria-pressed={selected}
              onClick={() => chooseDeck(deck)}
            >
              {!deck.available && <span className="status-ribbon">建设中</span>}
              <DeckCover deck={deck} />
              <span className="selection-check" aria-hidden="true">✓</span>
            </button>
          );
        })}
      </section>

      <footer className="selection-footer">
        <div className="selected-summary" aria-live="polite">
          <span>当前选择</span>
          <strong>{selectedDeck.name}</strong>
          <span className="summary-description">{selectedDeck.detail}</span>
        </div>
        <div className="footer-action">
          <button
            className="primary-button"
            ref={openRef}
            type="button"
            onClick={showNextStep}
            disabled={!selectedDeck.available}
          >
            {selectedDeck.available ? `开启${selectedDeck.name}` : '即将开启'}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </footer>
    </main>
    {origin && <Journey deck={selectedDeck} origin={origin} onReturn={returnHome} />}
    </>
  );
}

export default App;
