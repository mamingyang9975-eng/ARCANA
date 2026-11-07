export type PromptToken = { text: string; pinyin: string; part: number };

// These expressions appear in the card copy and should remain whole even on
// browsers whose word segmenter splits them into smaller words.
const fourCharacterExpressions = /一丝不挂|有所保留|接触面积|私密部位|面部肌肉|大腿内侧|说话方式|充分关注/gu;

export function tokenizePrompt(parts: string[], pinyin: Record<string, string>): PromptToken[] {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locale: string, options: { granularity: 'word' }) => { segment(input: string): Iterable<{ segment: string }> } }).Segmenter;
  const segmenter = Segmenter ? new Segmenter('zh-CN', { granularity: 'word' }) : null;
  return parts.flatMap((part, index) => {
    const segments: string[] = [];
    const appendWords = (text: string) => {
      const words = segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : Array.from(text);
      // A punctuation mark must have its own token so its pause cannot be
      // absorbed into a neighbouring space, quote, or other punctuation.
      segments.push(...words.flatMap((word) => word.split(/(\p{P})/u).filter(Boolean)));
    };
    let previousEnd = 0;
    for (const match of part.matchAll(fourCharacterExpressions)) {
      appendWords(part.slice(previousEnd, match.index));
      segments.push(match[0]);
      previousEnd = match.index + match[0].length;
    }
    appendWords(part.slice(previousEnd));
    return segments.map((text) => {
      const characters = Array.from(text, (character) => pinyin[character]);
      return {
        text,
        pinyin: /^[\u3400-\u9fff]+$/u.test(text)
          ? pinyin[text] || (characters.every(Boolean) ? characters.join('') : '')
          : '',
        part: index,
      };
    });
  });
}

export function promptTokenDelay(token: PromptToken, tokenIndex: number, speed: number): number {
  if (/^\p{P}$/u.test(token.text)) return 200;
  // A small variation between words keeps the composition moving naturally.
  return (token.pinyin ? 18 + (tokenIndex % 3) * 5 : 10) * speed;
}
