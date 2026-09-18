const allowedProjectActions = new Set(["readMore", "github", "liveDemo", "site"]);
const projectSlugs = new Set();

// Factory for project data. Defaults keep optional arrays safe to loop over,
// while validation turns configuration mistakes into useful build errors.
function createProject(project) {
  const requiredFields = ["slug", "title", "description", "cover"];
  const missingField = requiredFields.find((field) => !project[field]);

  if (missingField) {
    throw new Error(`Project "${project.title || "untitled"}" is missing ${missingField}.`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    throw new Error(`Project slug "${project.slug}" must be lowercase and hyphenated.`);
  }
  if (projectSlugs.has(project.slug)) {
    throw new Error(`Project slug "${project.slug}" is used more than once.`);
  }
  projectSlugs.add(project.slug);

  if (!project.cover.src || !project.cover.alt) {
    throw new Error(`Project "${project.title}" needs a cover src and alt description.`);
  }

  const actions = project.actions || [];
  actions.forEach((action) => {
    if (!allowedProjectActions.has(action.type)) {
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

module.exports = {
  // Site-level metadata used for browser titles, previews, and the footer.
  site: {
    name: "Isaac Tilahun",
    title: "Isaac Tilahun - Portfolio",
    description:
      "Personal portfolio for Isaac Tilahun: work, projects, and experience.",
    url: "https://isaactilahun.com",
    language: "en",
    locale: "en_US"
  },

  // Header navigation. Edit labels or paths here if the site structure changes.
  navigation: [
    { label: "Home", url: "/", drawing: "/assets/drawings/home.svg" },
    { label: "Work", url: "/work/", drawing: "/assets/drawings/work.svg" },
    { label: "Projects", url: "/projects/", drawing: "/assets/drawings/projects.svg" },
    { label: "Resume", url: "/resume/", drawing: "/assets/drawings/resume.svg" }
  ],

  // Identity details reused by the Resume page and contact links.
  author: {
    name: "Isaac Tilahun",
    role: "Software developer",
    location: "Toronto, Canada",
    email: "isaactilahunc@gmail.com"
  },

  // Social links shown on the home page.
  socials: [
    {
      label: "IsaacTilahun",
      href: "https://www.linkedin.com/in/isaactil/",
      icon: "/assets/icons/github.svg"
    },
    {
      label: "isaactil",
      href: "https://www.linkedin.com/in/isaactil/",
      icon: "/assets/icons/linkedin.svg"
    },
    {
      label: "Email",
      href: "mailto:isaactilahunc@gmail.com",
      icon: "/assets/icons/mail.svg"
    }
  ],

  // Hand-drawn artwork used throughout the interface.
  drawings: {
    identity: "/assets/drawings/name-and-bio.svg",
    homeJournal: "/assets/drawings/home-journal/1.0.svg",
    work: "/assets/drawings/work.svg",
    projects: "/assets/drawings/projects.svg",
    readMore: "/assets/drawings/read-more.svg",
    githubAction: "/assets/drawings/github-click.svg",
    liveDemo: "/assets/drawings/live-demo.svg",
    site: "/assets/drawings/site.svg",
    resume: "/assets/drawings/resume.svg",
    github: "/assets/drawings/github-at.svg",
    linkedin: "/assets/drawings/linkedin-at.svg",
    email: "/assets/drawings/email-at.svg",
    reachOut: "/assets/drawings/reach-out.svg",
    lightMode: "/assets/drawings/lightmode.svg",
    darkMode: "/assets/drawings/darkmode.svg",
    headerUnderline: "/assets/drawings/header-underline.svg",
    copyright: "/assets/drawings/2026-isaac-tilahun.svg",
    smiley: "/assets/drawings/smiley.svg"
  },

  // Work page content. Add, remove, or reorder roles in this array.
  work: [
    {
      title: "Software Developer",
      company: "Independent",
      dates: "2024 - Present",
      location: "Remote",
      description:
        "Designing and building small web products, portfolio systems, and internal tools for people who need reliable software without unnecessary complexity.",
      bullets: [
        "Ship static and dynamic web experiences with accessible, responsive front ends.",
        "Translate loose product ideas into scoped technical plans and maintainable interfaces.",
        "Keep content structures editable so non-technical updates stay low-friction."
      ]
    },
    {
      title: "Web Developer",
      company: "Selected client work",
      dates: "2022 - 2024",
      location: "Canada",
      description:
        "Built practical web presences and workflow improvements for early-stage teams, students, and local operators.",
      bullets: [
        "Created fast landing pages, dashboards, and content sites with simple deployment paths.",
        "Improved page performance, mobile layouts, and content organization across existing sites.",
        "Documented handoff steps so clients could keep sites current after launch."
      ]
    }
  ],

  // Projects work like reusable objects. Duplicate one object and edit its fields.
  // Action types can be "readMore", "github", "liveDemo", or "site".
  projects: [
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
  ]
};
