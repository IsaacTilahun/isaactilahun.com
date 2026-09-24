module.exports = {
  // Browser metadata used by the shared page layout.
  site: {
    name: "Isaac Tilahun",
    title: "Isaac Tilahun - Portfolio",
    description:
      "Personal portfolio for Isaac Tilahun: work, projects, and experience.",
    url: "https://isaactilahun.com",
    language: "en",
    locale: "en_US"
  },

  // Header links appear in this order.
  navigation: [
    { label: "Home", url: "/", drawing: "/assets/drawings/home.svg" },
    { label: "Work", url: "/work/", drawing: "/assets/drawings/work.svg" },
    { label: "Projects", url: "/projects/", drawing: "/assets/drawings/projects.svg" },
    {
      label: "Resume",
      url: "/assets/pdf/Isaac_Tilahun_Resume.pdf",
      drawing: "/assets/drawings/resume.svg",
      prefetch: false
    }
  ],

  author: {
    name: "Isaac Tilahun",
    role: "Software developer",
    location: "Toronto, Canada",
    email: "isaactilahunc@gmail.com"
  },

  // Home-page contact links.
  socials: [
    {
      label: "IsaacTilahun",
      href: "https://github.com/IsaacTilahun",
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

  // Central map of hand-drawn assets used by the templates.
  drawings: {
    mobileBrand: "/assets/drawings/isaac-tilahun.svg",
    notFound: "/assets/drawings/404-message.svg",
    identity: "/assets/drawings/name-and-bio.svg",
    homeJournal: "/assets/drawings/home-journal/note1.svg",
    expandNote: "/assets/drawings/expand.svg",
    contractNote: "/assets/drawings/contract.svg",
    noPastNotes: "/assets/drawings/no-past-notes.svg",
    work: "/assets/drawings/work.svg",
    projects: "/assets/drawings/projects.svg",
    back: "/assets/drawings/back.svg",
    readMore: "/assets/drawings/read-more.svg",
    readMoreWork: "/assets/drawings/read-more-work.svg",
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
    smiley: "/assets/drawings/smiley.svg",
    throwHint: "/assets/drawings/throw-me-around.svg"
  }
};
