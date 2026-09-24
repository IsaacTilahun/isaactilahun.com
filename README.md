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
