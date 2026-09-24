// Add experience bullets here. readMore controls whether a detail page exists.
module.exports = [
  {
    slug: "attendify",
    title: "Attendify",
    drawing: "/assets/drawings/attendify.svg",
    dates: "July 2026 - September 2026",
    bullets: [
      "Led Attendify Wrapped, a year-end recap for daycare franchises, from architecture proposal to full build: presented the design to the engineering team, prototyped a demo branch, then built the data model, a cron job computing 17 stats per franchise (care hours, billing totals) without modifying source data, and the dashboard in PHP (CodeIgniter).",
      "Audited controllers, models, and libraries for SQL injection, tracing user input to database calls; fixed all high- and medium-severity findings with parameterized queries.",
      "Extended subscription-renewal invoicing with automated email delivery, mark-paid tracking, and overdue detection; refactored it into a mailer library and built the Account Invoices page.",
      "Built a role-scoped admin activity dashboard with before-and-after field-change logging; fixed the app-wide \"Confirm Form Resubmission\" error with a Post-Redirect-Get shim."
    ],
    readMore: false
  },
  {
    slug: "code-ninjas",
    title: "Code Ninjas",
    drawing: "/assets/drawings/code-ninjas.svg",
    dates: "April 2026 - Present",
    bullets: [
      "Teach 100+ students (elementary to Grade 10) programming and game development; designed and led a 12-week intro Python course from scratch."
    ],
    readMore: false
  }
];
