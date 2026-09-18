# Isaac Tilahun Portfolio

Minimal portfolio site built with Eleventy. Personal content is kept in [content.js](content.js), and hand-drawn artwork lives in [assets/drawings](assets/drawings).

## Tech stack

This is a static website with no backend or database:

- **Eleventy (11ty)** is the static-site generator. It reads the source files, combines templates with data, and writes ordinary HTML into `_site/`.
- **Nunjucks** is the HTML templating language used by Eleventy. Its files end in `.njk`. It provides variables, loops, conditions, layouts, and reusable macros.
- **Vanilla CSS** controls all layout, responsive behavior, themes, and animation. There is no CSS framework.
- **Vanilla JavaScript** controls the light/dark theme switch and subtle project-card sway. There is no frontend framework.
- **SVG assets** contain the hand-drawn visual identity.

Visitors never download Eleventy or Nunjucks. Those tools run only during development and deployment. The deployed `_site/` folder contains plain HTML, CSS, JavaScript, and images.

## How the site builds

```text
content.js + .njk templates + assets
                 |
              Eleventy
                 |
              _site/
```

When you run `npm run dev`, Eleventy watches the source files and rebuilds the site whenever you save. When you run `npm run build`, it creates the production version once.

## Nunjucks basics

Nunjucks looks like HTML with a few special markers:

```njk
{# This is a template-only comment. #}

{{ project.title }}
{# Double braces print a value into the HTML. #}

{% if project.tech %}
  <p>This project has a technology list.</p>
{% endif %}
{# Percent markers contain logic such as conditions. #}

{% for project in siteContent.projects %}
  <h2>{{ project.title }}</h2>
{% endfor %}
{# A loop repeats markup for every item in an array. #}
```

The block between `---` markers at the top of a `.njk` file is called front matter. It tells Eleventy which layout to use, what URL to create, and other page settings.

## File map

- `content.js`: all editable personal data, work history, navigation, drawing paths, and projects.
- `index.njk`, `work.njk`, `projects.njk`, `resume.njk`: the four main page templates.
- `project.njk`: runs once per project and generates `/projects/{slug}/` detail pages.
- `_includes/layouts/base.njk`: shared HTML shell containing the `<head>`, header, navigation, theme button, and footer.
- `_includes/components/project-card.njk`: reusable project-card and project-action components.
- `assets/css/styles.css`: all visual styling, organized into labeled sections.
- `assets/js/main.js`: light/dark theme selection and persistence.
- `.eleventy.js`: small Eleventy configuration file.
- `scripts/clean-site.js`: removes the previous `_site/` output before a production build.
- `_site/`: generated output. Do not edit files here because the next build replaces them.

## Edit content

- Update identity details, socials, work history, drawing paths, and projects in `content.js`.
- Adjust the visual design in the single stylesheet at `assets/css/styles.css`.
- Edit `.njk` files only when you want to change page structure or markup.

## Add a project

Every project is one `createProject({...})` entry inside the `projects` array in `content.js`. The factory validates your fields during the build, the reusable component at `_includes/components/project-card.njk` turns the data into a card, and the generic `project.njk` template creates its Read More page at `/projects/{slug}/`.

Duplicate any existing project object and edit the copy:

```js
createProject({
  // Required: unique, lowercase, and hyphenated.
  slug: "my-project",
  title: "My Project",
  description: "A short description shown on the project card.",

  // Put cover images in assets/images/.
  cover: {
    src: "/assets/images/my-project-cover.png",
    alt: "Describe what is visible in the project cover"
  },

  // Add as many technologies as needed.
  tech: ["TypeScript", "React", "PostgreSQL"],

  // Optional paragraphs for the generated Read More page.
  details: [
    "Explain the problem and your approach.",
    "Describe the result or something you learned."
  ],

  // Include any combination, in any order. Actions are optional.
  actions: [
    { type: "readMore", label: "Read More" },
    {
      type: "github",
      label: "GitHub",
      href: "https://github.com/your-name/your-project"
    },
    {
      type: "liveDemo",
      label: "Live Demo",
      href: "https://your-project.example.com"
    },
    {
      type: "site",
      label: "Website",
      href: "https://your-project.example.com"
    }
  ]
})
```

Available action types are `readMore`, `github`, `liveDemo`, and `site`. You can use one, several, repeated types, or none. `readMore` automatically links to the generated page, so it does not need an `href`. All other actions require an `href`. The `site` action uses `assets/drawings/site.svg`.

After editing `content.js`, run `npm run dev`. The project card and detail page update automatically.

## Run locally

```bash
npm install
npm run dev
```

The local site is served at `http://localhost:8080/` by default.

## Build

```bash
npm run build
```

The static output is written to `_site/`.

## Deploy

GitHub Pages can use the included workflow in `.github/workflows/deploy.yml`. For Vercel, set the build command to `npm run build` and the output directory to `_site`.
