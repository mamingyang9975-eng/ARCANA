import assert from 'node:assert/strict';
import test from 'node:test';
import { promptTokenDelay, tokenizePrompt } from '../src/promptTyping.ts';

const pinyin = { 一: 'yi', 丝: 'si', 不: 'bu', 挂: 'gua', 有: 'you', 所: 'suo', 保: 'bao', 留: 'liu' };

test('four-character expressions are committed together without losing surrounding text', () => {
  const parts = ['如果你已经一丝不挂，慢慢呼吸。', '不要有所保留！'];
  const tokens = tokenizePrompt(parts, pinyin);
  assert.equal(tokens.filter((token) => token.part === 0).map((token) => token.text).join(''), parts[0]);
  assert.equal(tokens.filter((token) => token.part === 1).map((token) => token.text).join(''), parts[1]);
  assert.equal(tokens.find((token) => token.text === '一丝不挂')?.pinyin, 'yisibugua');
  assert.equal(tokens.find((token) => token.text === '有所保留')?.pinyin, 'yousuobaoliu');
});

test('punctuation pauses for 200ms even when the typing speed changes', () => {
  const tokens = tokenizePrompt(['好，“继续”！'], pinyin);
  const punctuation = tokens.filter((token) => /^\p{P}$/u.test(token.text));
  assert.deepEqual(punctuation.map((token) => token.text), ['，', '“', '”', '！']);
  for (const token of punctuation) assert.equal(promptTokenDelay(token, 0, 0.25), 200);
});
