export type OrderedCard = { fixedAtEnd?: boolean };

// Draw the flexible cards once per journey, then play authored ending cards in order.
export function orderDeckCards<T extends OrderedCard>(cards: readonly T[], random: () => number = Math.random): T[] {
  const flexible = cards.filter((card) => !card.fixedAtEnd);
  const ending = cards.filter((card) => card.fixedAtEnd);
  for (let index = flexible.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [flexible[index], flexible[swapIndex]] = [flexible[swapIndex], flexible[index]];
  }
  return [...flexible, ...ending];
}
