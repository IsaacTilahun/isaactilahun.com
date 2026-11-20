// Tiny synthesized sounds. Sound is off until the visitor turns it on with the
// switch in the game card's header, so calling these is always safe.

const SETTING_KEY = "games:sound";
let audio = null; // created lazily, on the first sound after a user gesture

export function isSoundOn() {
  try {
    return localStorage.getItem(SETTING_KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(SETTING_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the switch still works until the page reloads.
  }
}

/**
 * Play one short note with a soft attack and fade, so it never clicks.
 *
 *   tone(440)                                   // A4, 120ms
 *   tone(660, { duration: 0.2, type: "triangle" })
 */
export function tone(frequency, { duration = 0.12, type = "sine", volume = 0.08, delay = 0 } = {}) {
  if (!isSoundOn()) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();

    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  } catch {
    // Web Audio missing or blocked: sound is a nice-to-have.
  }
}

/** The shared sound vocabulary, so every game "sounds" the same. */
export const sfx = {
  good: () => tone(660, { duration: 0.1, type: "triangle" }),
  great: () => {
    tone(660, { duration: 0.09, type: "triangle" });
    tone(880, { duration: 0.14, type: "triangle", delay: 0.09 }); // scheduled by Web Audio, no timer to clean up
  },
  bad: () => tone(180, { duration: 0.22, type: "sawtooth", volume: 0.05 }),
  tick: () => tone(1200, { duration: 0.03, type: "square", volume: 0.03 }),
};
