# Isaac Tilahun's portfolio

A small portfolio site built with Eleventy. The content is in `data/`, and the drawings are in `assets/drawings/`.

## Run it locally

```bash
npm install
npm run dev
```

Open [localhost:8080](http://localhost:8080). To make a production build, run `npm run build`; the finished site is written to `_site/`.

## Update the content

- Edit your bio, links, navigation, and drawing paths in `data/site.js`.
- Edit work history in `data/work.js`.
- Add projects in `data/projects.js`. Copy an existing entry and update its title, description, cover, technologies, and links.
- Change the page layout in the `.njk` templates and the appearance in `assets/css/styles.css`.

The project details page is generated for projects with a `readMore` action. Other available action types are `github`, `liveDemo`, and `site`.

## Games

The Games page (`/games/`) is a shelf of banner cards, one per game. Clicking a banner grows a game card out of it to play in (on phones it fills the screen). A game can be linked to directly by its slug, e.g. `/games/#snake`.

Where things live:

- `data/games.js`: the list of games, their menu text, and how best scores are shown.
- `assets/js/games/<slug>.js` + `assets/css/games/<slug>.css`: one game. Long content lists (words, facts, code lines) sit in `assets/js/games/data/<slug>.js`.
- `assets/js/games/kit/`: the shared building blocks (start/result screens, buttons, stat bar, sounds, saved scores). `kit/index.js` explains how a game is put together.
- `assets/js/games/context.js`: the `ctx` each game gets, which cleans up timers and listeners when a round ends or the player leaves.
- `assets/js/games/arcade.js`: the page itself: the banners, opening and leaving games, the Back button.
- `assets/css/games.css`: the banners, the game card, and the shared game styles.

Best scores are saved in the visitor's browser only.

### Adding your drawings

1. Save the drawing (black ink, transparent background) in `assets/drawings/games/`.
2. Put its path in the matching slot in `assets/js/games/art.js`, for example `fire: "/assets/drawings/games/fire.svg"`. Every game that uses that slot picks it up; empty slots show a text stand-in.
3. For a game's banner, draw it wide (about 5:2, title included) and set `banner` for that game in `data/games.js`. It replaces the lettered title and doodles.
4. For the nav link, set `drawing` on the Games entry in `data/site.js` (until then the nav shows the word "Games").
