const allowedActions = new Set(["readMore", "github", "liveDemo", "site"]);
const usedSlugs = new Set();

// Applies safe defaults and reports common project-data mistakes during builds.
function createProject(project) {
  const requiredFields = ["slug", "title", "description", "cover"];
  const missingField = requiredFields.find((field) => !project[field]);

  if (missingField) {
    throw new Error(`Project "${project.title || "untitled"}" is missing ${missingField}.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    throw new Error(`Project slug "${project.slug}" must be lowercase and hyphenated.`);
  }
  if (usedSlugs.has(project.slug)) {
    throw new Error(`Project slug "${project.slug}" is used more than once.`);
  }
  usedSlugs.add(project.slug);

  if (!project.cover.src || !project.cover.alt) {
    throw new Error(`Project "${project.title}" needs a cover src and alt description.`);
  }

  const actions = project.actions || [];
  actions.forEach((action) => {
    if (!allowedActions.has(action.type)) {
      throw new Error(`Unknown action type "${action.type}" in ${project.title}.`);
    }
    if (action.type !== "readMore" && !action.href) {
      throw new Error(`${action.type} in ${project.title} needs an href.`);
    }
  });

  return {
    tech: [],
    details: [],
    actions: [],
    ...project,
    actions
  };
}

// Duplicate one createProject block to add another project.
module.exports = [
  createProject({
    slug: "mysh",
    title: "Unix Shell & Networked Chat",
    description:
      "Built a Unix-style shell from scratch in C with process management, multi-stage pipes, signals, and custom built-ins, then extended it with socket programming to support a client-server chat system.",
    cover: {
      src: "/assets/images/mysh.png",
      alt: "Mysh Unix shell project cover with a terminal prompt"
    },
    tech: ["C", "Linux"],
    details: [
      "This is the optional longer project description shown on the automatically generated Read More page.",
      "Add, remove, or reorder paragraphs in this array without changing any templates."
    ],
    actions: [
      { type: "readMore", label: "Read More" },
      {
        type: "liveDemo",
        label: "Live Demo",
        href: "https://isaactilahun.com"
      }
    ]
  }),

  createProject({
    slug: "asl-learning-hub",
    title: "Real-Time ASL Learning Platform",
    description:
      "Built an interactive ASL learning experience using MediaPipe to track 21 hand landmarks in real time, score gestures, and provide live visual feedback across letters and numbers.",
    cover: {
      src: "/assets/images/mysh.png",
      alt: "Mysh Unix shell project cover with a terminal prompt"
    },
    tech: ["JavaScript", "MediaPipe", "Computer Vision"],
    details: [
      "This is the optional longer project description shown on the automatically generated Read More page.",
      "Add, remove, or reorder paragraphs in this array without changing any templates."
    ],
    actions: [
      {
        type: "github",
        label: "GitHub",
        href: "https://github.com/isaactilahun"
      },
      {
        type: "liveDemo",
        label: "Live Demo",
        href: "https://isaactilahun.com"
      }
    ]
  }),

  createProject({
    slug: "heycare",
    title: "AI Clinical Documentation Platform",
    description:
      "Built a hackathon platform that transcribes patient-clinician conversations and uses AI to turn them into structured medical documentation, with persistent patient records and export workflows.",
    cover: {
      src: "/assets/images/mysh.png",
      alt: "Mysh Unix shell project cover with a terminal prompt"
    },
    tech: ["TypeScript", "CSS", "Supabase"],
    details: [
      "This is the optional longer project description shown on the automatically generated Read More page.",
      "Add, remove, or reorder paragraphs in this array without changing any templates."
    ],
    actions: [
      {
        type: "github",
        label: "GitHub",
        href: "https://github.com/isaactilahun"
      },
      {
        type: "site",
        label: "Site",
        href: "https://isaactilahun.com"
      }
    ]
  }),

  createProject({
    slug: "paint-app",
    title: "AI-Assisted Paint Application",
    description:
      "Built a JavaFX drawing application around MVC and object-oriented design patterns, with undo/redo, multiple drawing strategies, and AI-generated JSON instructions for rendering shapes to the canvas.",
    cover: {
      src: "/assets/images/mysh.png",
      alt: "Mysh Unix shell project cover with a terminal prompt"
    },
    tech: ["Java", "JavaFX", "MVC"],
    details: [
      "This is the optional longer project description shown on the automatically generated Read More page.",
      "Add, remove, or reorder paragraphs in this array without changing any templates."
    ],
    actions: [
      {
        type: "github",
        label: "GitHub",
        href: "https://github.com/isaactilahun"
      },
      {
        type: "site",
        label: "Site",
        href: "https://isaactilahun.com"
      }
    ]
  }),

  createProject({
    slug: "scared-of-the-dark",
    title: "RISC-V Assembly Game",
    description:
      "Built a grid-based game entirely in RISC-V Assembly, implementing game state, randomized board generation, player and enemy movement, win/loss conditions, and persistent leaderboard functionality through low-level memory and control flow.",
    cover: {
      src: "/assets/images/mysh.png",
      alt: "Mysh Unix shell project cover with a terminal prompt"
    },
    tech: ["RISC-V Assembly"],
    details: [
      "This is the optional longer project description shown on the automatically generated Read More page.",
      "Add, remove, or reorder paragraphs in this array without changing any templates."
    ],
    actions: [
      { type: "readMore", label: "Read More" },
      {
        type: "site",
        label: "Site",
        href: "https://isaactilahun.com"
      }
    ]
  })
];
