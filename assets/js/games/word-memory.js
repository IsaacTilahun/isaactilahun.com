// Word Memory
//
// Words appear one at a time. If a word has already come up this run, the
// player taps "Seen"; if it's the first time, "New". A right answer scores a
// point, a wrong one costs a life. Three lives; the score is how many they
// got right.
//
// The first few words are always new. After that, about two in five are
// repeats of words already shown, so the pile to remember keeps growing.
//
//   word ──answer──▶ right ──▶ next word …
//                      │
//                      └─▶ wrong ──(pause to read why)──▶ next word
//                                          │
//                                          └── no lives left ──▶ result

import { h, art, button, statBar, lives, introScreen, resultScreen, sfx, flash, pick, shuffle } from "./kit/index.js";
import { WORDS } from "./data/word-memory.js";

const LIVES = 3;
const NEW_WORDS_FIRST = 3; // repeats only make sense once there's something to repeat
const REPEAT_CHANCE = 0.4;
const ANSWER_LOCK_MS = 180; // a double tap can't answer two words at once
const WRONG_PAUSE_MS = 1300; // long enough to read what the word really was
const SLIDE_IN_MS = 220;

export default {
  mount(stage, ctx) {
    introScreen(ctx, { onStart: play });

    function play() {
      ctx.reset();

      const deck = shuffle(WORDS); // unseen words, drawn from the end
      const seen = []; // every word shown so far this run
      let current = null; // { word, isSeen }
      let livesLeft = LIVES;
      let score = 0;
      let acceptingAnswers = false;

      /* ----- Build the round ----- */

      const stats = statBar([
        { key: "lives", label: "Lives", value: lives(LIVES, LIVES) },
        { key: "score", label: "Score", value: 0 },
      ]);
      const wordText = h("p", { class: "wm-word" });
      const mark = h("span", { class: "wm-mark-slot", "aria-hidden": "true" });
      const card = h("div", { class: "wm-card", "aria-live": "polite", "aria-atomic": "true" }, mark, wordText);
      const feedback = h("p", { class: "wm-feedback", role: "status" });
      const buttons = {
        seen: answerButton("Seen", "S", () => answer("seen")),
        new: answerButton("New", "N", () => answer("new")),
      };

      stage.replaceChildren(
        h("div", { class: "wm" },
          stats.el,
          card,
          feedback,
          h("div", { class: "wm-answers" }, buttons.seen, buttons.new)
        )
      );

      /* ----- Rules ----- */

      function showNextWord() {
        current = drawWord(deck, seen, current?.word);
        if (!current.isSeen) seen.push(current.word);

        wordText.textContent = current.word;
        delete card.dataset.result;
        say(seen.length === 1 ? "Seen it before, or new?" : "");
        if (!ctx.reducedMotion) slideIn(wordText);

        acceptingAnswers = false;
        ctx.timeout(() => { acceptingAnswers = true; }, ANSWER_LOCK_MS);
      }

      function answer(choice) {
        if (!acceptingAnswers) return;
        acceptingAnswers = false;

        const saidSeen = choice === "seen";
        if (saidSeen === current.isSeen) rightAnswer();
        else wrongAnswer();
      }

      function rightAnswer() {
        score += 1;
        stats.set("score", score);
        sfx.good();
        flash(card, "good");
        showMark("check", "✓", "good");
        showNextWord();
      }

      function wrongAnswer() {
        livesLeft -= 1;
        stats.set("lives", lives(livesLeft, LIVES));
        sfx.bad();
        flash(card, "bad");
        showMark("cross", "✕", "bad");
        card.dataset.result = "bad";
        say(current.isSeen ? "You'd seen that one." : "That one was new.", "bad");

        // ctx.timeout is cancelled if the player leaves, so no staleness check needed.
        ctx.timeout(livesLeft > 0 ? showNextWord : finish, WRONG_PAUSE_MS);
      }

      function finish() {
        resultScreen(ctx, {
          score,
          display: String(score),
          caption: score === 1 ? "word" : "words",
          message: verdict(score),
          onAgain: play,
        });
      }

      /* ----- Feedback ----- */

      function say(text, tone = "hint") {
        feedback.textContent = text;
        feedback.dataset.tone = tone;
      }

      // A fresh element each time restarts its pop-and-fade animation.
      function showMark(artName, fallback, tone) {
        mark.replaceChildren(art(artName, fallback, { className: `wm-mark wm-mark--${tone}` }));
      }

      /* ----- Input ----- */

      const choiceForKey = { s: "seen", arrowleft: "seen", n: "new", arrowright: "new" };

      ctx.on(document, "keydown", (event) => {
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
        // Chrome can fire keydown with no key (autofill), so guard before lowercasing.
        const choice = choiceForKey[event.key?.toLowerCase()];
        if (!choice) return;

        event.preventDefault();
        flash(buttons[choice], "pop");
        answer(choice);
      });

      showNextWord();
    }
  },
};

/** A big answer button, with its keyboard shortcut shown on desktop. */
function answerButton(label, key, onClick) {
  return button(
    [label, h("kbd", { class: "wm-key", "aria-hidden": "true" }, key)],
    onClick,
    { variant: "ghost", className: "wm-answer" }
  );
}

/**
 * The next word to show. Takes a new word from the deck, or (once a few words
 * are in play) sometimes repeats one already seen — never the word just shown.
 */
function drawWord(deck, seen, lastWord) {
  const repeats = seen.filter((word) => word !== lastWord);
  const canRepeat = seen.length >= NEW_WORDS_FIRST && repeats.length > 0;
  const outOfNewWords = deck.length === 0;

  if (canRepeat && (outOfNewWords || Math.random() < REPEAT_CHANCE)) {
    return { word: pick(repeats), isSeen: true };
  }
  return { word: deck.pop(), isSeen: false };
}

function slideIn(el) {
  el.animate(
    [{ opacity: 0, translate: "0 12px" }, { opacity: 1, translate: "0 0" }],
    { duration: SLIDE_IN_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
  );
}

function verdict(score) {
  if (score < 10) return "A warm-up. Go again?";
  if (score < 25) return "Not bad. The pile gets big fast.";
  if (score < 50) return "Great memory.";
  if (score < 80) return "Seriously impressive recall.";
  return "An elephant would be jealous!";
}
