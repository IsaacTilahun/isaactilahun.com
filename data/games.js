// Games shown on the Games page, in this order.
//
// slug      Used in the URL (/games/#slug) and for the game's files:
//           assets/js/games/<slug>.js and assets/css/games/<slug>.css
// title     Name on the banner card and in the card header
// blurb     One line under the title on the banner card
// how       One line on the game's start screen
// glyph     The big doodle on the game's banner card
// doodles   A few small doodles scattered around the banner
// banner    Path to a hand-drawn banner (wide, about 5:2, title included), or
//           null. When set, it replaces the glyph, doodles and title.
// best      better: "high" | "low" decides which scores count as a best;
//           format: how the best is shown, {value} is the number
module.exports = [
  {
    slug: "reaction",
    title: "Reaction Time",
    blurb: "Wait for it, then tap as fast as you can.",
    how: "When the box turns green, tap it (or press Space) as fast as you can. Five rounds.",
    glyph: "ϟ",
    doodles: ["!", "0.2s", "ϟ"],
    banner: null,
    best: { better: "low", format: "Best {value} ms" }
  },
  {
    slug: "pattern",
    title: "Pattern",
    blurb: "Watch the tiles light up, then repeat them.",
    how: "Watch the tiles light up, then tap them back in the same order. One more each round.",
    glyph: "▦",
    doodles: ["▢", "▣", "▢"],
    banner: null,
    best: { better: "high", format: "Best {value} long" }
  },
  {
    slug: "bugs",
    title: "Squash the Bug",
    blurb: "An aim trainer. Squash 30 bugs as fast as you can.",
    how: "Bugs appear one at a time. Squash each one as fast as you can. 30 bugs.",
    glyph: "ж",
    doodles: ["✱", "ж", "·"],
    banner: null,
    best: { better: "low", format: "Best {value} ms" }
  },
  {
    slug: "number-memory",
    title: "Number Memory",
    blurb: "Remember the number. It gets longer.",
    how: "A number appears for a few seconds. Remember it, then type it back. One digit longer each round.",
    glyph: "123",
    doodles: ["7", "42", "9"],
    banner: null,
    best: { better: "high", format: "Best {value} digits" }
  },
  {
    slug: "word-memory",
    title: "Word Memory",
    blurb: "Seen this word before, or is it new?",
    how: "Words appear one at a time. Say if you've seen each one already. Three lives.",
    glyph: "Aa",
    doodles: ["seen?", "new", "abc"],
    banner: null,
    best: { better: "high", format: "Best {value} words" }
  },
  {
    slug: "chimp",
    title: "Chimp Test",
    blurb: "Tap the numbers in order after they hide.",
    how: "Tap 1 first. The other numbers hide, so remember where they were and tap them in order.",
    glyph: "1·2·3",
    doodles: ["4", "2", "5"],
    banner: null,
    best: { better: "high", format: "Best {value} numbers" }
  },
  {
    slug: "tile-memory",
    title: "Tile Memory",
    blurb: "Remember which tiles flashed.",
    how: "Some tiles flash. Tap the same tiles once they hide. The grid grows as you go. Three lives.",
    glyph: "◰",
    doodles: ["▢", "▣", "▢"],
    banner: null,
    best: { better: "high", format: "Best level {value}" }
  },
  {
    slug: "typing",
    title: "Type Fast",
    blurb: "Type real commands and learn what they do.",
    how: "Type each line exactly as shown. A note under it explains what it does. The clock starts on your first key.",
    glyph: "_|",
    doodles: ["$ ls", "{ }", ">_"],
    banner: null,
    best: { better: "high", format: "Best {value} wpm" }
  },
  {
    slug: "colour",
    title: "Colour Memory",
    blurb: "Memorise a colour, then find it again.",
    how: "Memorise the colour, then find it on the colour picker. Five colours; the closer, the better.",
    glyph: "◐",
    doodles: ["●", "◑", "○"],
    banner: null,
    best: { better: "high", format: "Best {value}%" }
  },
  {
    slug: "higher-lower",
    title: "Higher or Lower",
    blurb: "Which number is bigger? Keep the streak alive.",
    how: "Is the second number higher or lower than the first?",
    glyph: "↑↓",
    doodles: ["↑", "↓", "?"],
    banner: null,
    best: { better: "high", format: "Best streak {value}" }
  },
  {
    slug: "memory",
    title: "Memory Match",
    blurb: "Flip cards and match the code symbols.",
    how: "Flip two cards at a time and match all eight pairs in as few moves as you can.",
    glyph: "{ }",
    doodles: ["=>", "&&", "[ ]"],
    banner: null,
    best: { better: "low", format: "Best {value} moves" }
  },
  {
    slug: "snake",
    title: "Snake",
    blurb: "Eat the bits. Don't bite yourself.",
    how: "Arrow keys, WASD, or swipe. Eat bits to grow. Don't hit the walls or yourself.",
    glyph: "~~•",
    doodles: ["1", "0", "·"],
    banner: null,
    best: { better: "high", format: "Best {value}" }
  },
  {
    slug: "bits",
    title: "Bit Flip",
    blurb: "Flip bits to make the number. Race the clock.",
    how: "Flip the bits until they add up to the target number. Solve as many as you can in 60 seconds.",
    glyph: "0101",
    doodles: ["1", "0", "128"],
    banner: null,
    best: { better: "high", format: "Best {value} solved" }
  },
  {
    slug: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    blurb: "You versus the computer. Good luck.",
    how: "Get three in a row before the computer does. You go first.",
    glyph: "✕○",
    doodles: ["✕", "○", "#"],
    banner: null,
    best: { better: "high", format: "Best streak {value}" }
  }
];
