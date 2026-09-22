// Add experience bullets here. readMore controls whether a detail page exists.
module.exports = [
  {
    slug: "attendify",
    title: "Attendify",
    drawing: "/assets/drawings/attendify.svg",
    dates: "July 2026 - September 2026",
    bullets: [
      "Designed and built Attendify Wrapped, a year-end analytics dashboard for daycare franchises, driving the feature from proposal to production-ready implementation including an automated cron-based data pipeline in PHP/CodeIgniter",
      "Extended the subscription-renewal invoicing system with automated email delivery, payment-status tracking, and overdue detection; built a reusable mailer library and a franchise-facing Account Invoices page",
      "Built a role-scoped admin activity dashboard and expanded logging to record before-and-after values for field edits, improving platform auditability",
      "Audited controllers, models, and libraries for unsafe database calls and resolved SQL injection vulnerabilities by tracing user input through the application"
    ],
    readMore: false
  },
  {
    slug: "code-ninjas",
    title: "Code Ninjas",
    drawing: "/assets/drawings/code-ninjas.svg",
    dates: "April 2026 - Present",
    bullets: [
      "Instructed 100+ students from elementary to Grade 10 in JavaScript, C#, Unity, Scratch, and game development, progressing students from fundamentals to fully completed project builds",
      "Designed and led a 12-week Python course for children, writing all curriculum from scratch and taking students from zero programming experience to independently completed projects"
    ],
    readMore: false
  }
];
