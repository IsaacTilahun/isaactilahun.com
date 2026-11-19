// Add experience bullets here. readMore controls whether a detail page exists.
// Optional `links` render as buttons under the bullets (supported types: "github").
module.exports = [
  {
    slug: "amd-uoft",
    title: "AMD & UofT",
    drawing: "/assets/drawings/amd-uoft.png",
    dates: "September 2026 - Present",
    bullets: [
      "Porting AMD Schola’s reinforcement-learning toolkit from Unreal Engine to Godot as a CSC301 capstone, adapting agent and environment tooling to a new engine runtime.",
      "Mapping feature parity across environment creation, agent configuration, and training-framework integration, keeping simulation and training logic separate; working with a seven-person team and two AMD engineers."
    ],
    links: [
      { type: "github", label: "GitHub", href: "https://github.com/csc301-2026-f/20-AMD-Schola/" }
    ],
    readMore: false
  },
  {
    slug: "attendify",
    title: "Attendify",
    drawing: "/assets/drawings/attendify.svg",
    dates: "July 2026 - September 2026",
    bullets: [
      "Led Attendify Wrapped, a year-end franchise recap: presented the architecture, then built the data model, a batch job computing 17 stats per franchise without modifying source data, and an animated slide-deck front end in jQuery and CSS. Validated on production data for 18 franchises.",
      "Traced user input through controllers, models, and libraries to find SQL injection risks; replaced vulnerable queries with parameterized queries.",
      "Added automated email delivery, mark-paid tracking, and overdue detection to subscription-renewal invoicing; moved the mailing logic into a reusable library and built the Account Invoices page.",
      "Built a role-scoped admin activity dashboard that logs before-and-after values for field changes; fixed the app-wide “Confirm Form Resubmission” error with a Post-Redirect-Get shim."
    ],
    readMore: false
  },
  {
    slug: "code-ninjas",
    title: "Code Ninjas",
    drawing: "/assets/drawings/code-ninjas.svg",
    dates: "April 2026 - Present",
    bullets: [
      "Teach JavaScript and C# to 30+ students weekly, from elementary school through Grade 10, guiding them through game development projects and debugging.",
      "Designed and ran a 12-week introductory Python course with original lesson plans and a capstone game project completed by every student."
    ],
    readMore: false
  }
];
