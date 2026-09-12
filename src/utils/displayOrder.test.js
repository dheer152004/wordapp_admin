// import { calculateDisplayOrder, getReorderInsertionContext } from './displayOrder';

// describe('calculateDisplayOrder', () => {
//   it('returns the midpoint between two neighboring items', () => {
//     const previous = { displayOrder: 10000 };
//     const next = { displayOrder: 20000 };

//     expect(calculateDisplayOrder({ previousWord: previous, nextWord: next })).toBe(15000);
//   });

//   it('returns a top-of-list order when dropped at the top', () => {
//     const next = { displayOrder: 10000 };

//     expect(calculateDisplayOrder({ previousWord: null, nextWord: next })).toBe(5000);
//   });

//   it('returns a bottom-of-list order when dropped at the bottom', () => {
//     const previous = { displayOrder: 50000 };

//     expect(calculateDisplayOrder({ previousWord: previous, nextWord: null })).toBe(60000);
//   });

//   it('returns null when there is no available gap between neighbors', () => {
//     const previous = { displayOrder: 10000 };
//     const next = { displayOrder: 10001 };

//     expect(calculateDisplayOrder({ previousWord: previous, nextWord: next })).toBeNull();
//   });

//   it('uses the surrounding neighbors around the drop target when calculating order', () => {
//     const words = [
//       { id: 1, displayOrder: 10000 },
//       { id: 2, displayOrder: 20000 },
//       { id: 3, displayOrder: 30000 },
//     ];

//     const context = getReorderInsertionContext({ words, activeWordId: 3, overWordId: 2 });

//     expect(context).toEqual({
//       previousWord: { id: 1, displayOrder: 10000 },
//       nextWord: { id: 2, displayOrder: 20000 },
//     });
//   });
// });
