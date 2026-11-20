// Hand-drawn art for the games.
//
// Set a path to use your drawing (black ink on a transparent background, like
// every other drawing on the site; dark mode flips it automatically).
// Leave a slot as null and the games show a text placeholder instead.
//
// Each drawing is reused wherever it fits, so a few drawings cover every game.
// Ordered by how much they matter: the first five cover the most games.
export const art = {
  card: null,      // Empty card outline, portrait ~2:3            Higher or Lower, Memory Match
  fire: null,      // Small flame for streaks                       Higher or Lower, Tic-Tac-Toe
  arrow: null,     // Arrow pointing UP (down/left/right = rotated) Higher or Lower, Snake (touch pad)
  check: null,     // Tick mark for a right answer                  Higher or Lower, Word Memory, Number Memory, Bit Flip, Type Fast
  cross: null,     // Scribble/X for a wrong answer                 Higher or Lower, Word Memory, Tile Memory
  x: null,         // Hand-drawn X                                  Tic-Tac-Toe
  o: null,         // Hand-drawn O                                  Tic-Tac-Toe
  bug: null,       // A little bug                                  Squash the Bug
  splat: null,     // Squashed-bug splat                            Squash the Bug
  cardBack: null,  // Back of a card (pattern or squiggle)          Memory Match
  bit: null,       // A "1" or a dot for Snake food                 Snake
  bolt: null,      // Lightning bolt                                Reaction Time
};
