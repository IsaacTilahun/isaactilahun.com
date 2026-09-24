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
    tag: "",
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
    // Optional: tag: "TELUS Hackathon",
    description:
      "Built a Unix-style shell from scratch in C with process management, multi-stage pipes, signals, and custom built-ins, then extended it with socket programming to support a client-server chat system.",
    cover: {
      src: "/assets/images/mysh.png",
      alt: "Terminal connected to two network chat clients"
    },
    tech: ["C", "Linux", "Process Management", "Socket Programming"],
    details: [
      {
        heading: "Overview",
        paragraphs: [
          "I built mysh to understand what a command shell is doing beneath the prompt. It parses commands, expands shell variables, connects multi-stage pipelines, manages foreground and background processes, and exposes a TCP chat server and client as built-in commands."
        ]
      },
      {
        heading: "Command lifecycle",
        paragraphs: [
          "The interactive loop first collects completed background processes, services the chat server, then reads and executes the next command. SIGINT returns control to the prompt instead of terminating the shell, while SIGPIPE is ignored so a disconnected client becomes a recoverable write failure."
        ],
        code: `while ((pid = waitpid(-1, &status, WNOHANG)) > 0) {
    if (get_process_num(pid) != -1) {
        del_process(pid);
    }
}

handle_server();
get_input2(input_buf);`
      },
      {
        heading: "Parsing and variable expansion",
        paragraphs: [
          "Input is normalized and tokenized before execution. Variables live in a linked list and are expanded token by token, including chained expressions such as abc$first$second. Bounded appends keep each expanded token within its allocated buffer."
        ],
        code: `late_dollar = strchr(early_dollar + 1, '$');

while (early_dollar != NULL) {
    if (late_dollar != NULL) {
        *late_dollar = '\\0';
        char *value = find_variable(early_dollar + 1);
        strncat(expanded_token, value, 128 - strlen(expanded_token));
        early_dollar = late_dollar;
        late_dollar = strchr(late_dollar + 1, '$');
    } else {
        strncat(expanded_token, find_variable(early_dollar + 1),
                128 - strlen(expanded_token));
        early_dollar = NULL;
    }
}`
      },
      {
        heading: "Pipelines",
        paragraphs: [
          "For N commands, the shell creates N-1 pipes and forks one child per stage. Each child connects the correct pipe ends to standard input or output with dup2, then closes every inherited descriptor. Closing unused write ends is critical; otherwise downstream commands may wait forever for EOF."
        ],
        code: `if (i > 0) {
    dup2(pipes[i - 1][0], STDIN_FILENO);
}
if (i < nc - 1) {
    dup2(pipes[i][1], STDOUT_FILENO);
}

for (int j = 0; j < nc - 1; j++) {
    close(pipes[j][0]);
    close(pipes[j][1]);
}
execute_command(commands[i], 0, 0);`
      },
      {
        heading: "Background jobs",
        paragraphs: [
          "A trailing ampersand returns control to the prompt immediately. The parent records the PID, job number, and command in a linked list; the child redirects standard input to /dev/null so it cannot consume terminal input. Non-blocking waitpid calls later remove completed jobs without creating zombies."
        ],
        code: `pid_t pid = fork();

if (pid > 0) {
    add_process(token_arr, pid, processCount);
    free(finput_buf);
    continue;
}

int devnull = open("/dev/null", O_RDONLY);
dup2(devnull, STDIN_FILENO);
close(devnull);`
      },
      {
        heading: "Non-blocking network chat",
        paragraphs: [
          "The chat extension uses TCP sockets and select rather than threads. The server watches its listening socket and every connected client, then accepts, broadcasts, or removes clients without blocking the shell. A persistent client watches both the socket and standard input, allowing incoming messages and typed commands to share one loop."
        ],
        code: `FD_ZERO(&fds);
FD_SET(STDIN_FILENO, &fds);
FD_SET(fd, &fds);
int max_fd = STDIN_FILENO > fd ? STDIN_FILENO : fd;

struct timeval tv = { .tv_sec = 0, .tv_usec = 100000 };
int ready = select(max_fd + 1, &fds, NULL, NULL, &tv);

if (FD_ISSET(fd, &fds)) {
    ssize_t n = read(fd, msg, sizeof(msg) - 1);
}
if (FD_ISSET(STDIN_FILENO, &fds)) {
    expand_input(tmp_tokens, 1);
}`
      },
      {
        heading: "Project summary",
        paragraphs: [
          "This project brings command parsing, variable expansion, pipelines, background jobs, signal handling, and non-blocking TCP chat into one Unix-style shell. It demonstrates systems programming across process, memory, file descriptor, and socket management in C."
        ]
      }
    ],
    actions: [
      { type: "readMore", label: "Read More" },
      {
        type: "liveDemo",
        label: "Live Demo",
        href: "https://drive.google.com/drive/folders/1uFniwYgom5IU9cF5hLYqUx4Ssoe36fCm?usp=sharing"
      }
    ]
  }),

  createProject({
    slug: "asl-learning-hub",
    title: "Real-Time ASL Learning Platform",
    tag: "TELUS Hackathon",
    description:
      "Built a browser-based ASL practice app for the alphabet and numbers 1-10, using MediaPipe to track 21 hand landmarks, score finger patterns, provide live confidence feedback, and save progress locally.",
    cover: {
      src: "/assets/images/asl-learning.png",
      alt: "ASL learning interface tracking a gray illustrated learner with coily hair while teaching the letter C"
    },
    tech: ["JavaScript", "MediaPipe Hands", "Computer Vision", "HTML/CSS"],
    actions: [
      {
        type: "github",
        label: "GitHub",

        href: "https://github.com/IsaacTilahun/ASL-Learning-Hub"
      }
    ]
  }),

  createProject({
    slug: "heycare",
    title: "AI Clinical Documentation Platform",
    tag: "TechTO Hackathon",
    description:
      "Built a voice-first clinical documentation assistant that transcribes consultations in the browser, uses AI to structure them into editable patient notes, and supports persistent records, search, and export workflows.",
    cover: {
      src: "/assets/images/heycare.png",
      alt: "HeyCare voice recording dashboard with live clinical transcription"
    },
    tech: ["React", "TypeScript", "Supabase", "Web Speech API", "OpenRouter"],
    actions: [
      {
        type: "github",
        label: "GitHub",
        href: "https://github.com/vanshS66/HeyCare"
      },
      {
        type: "site",
        label: "Site",
        href: "https://cheerful-handbook-449618.framer.app/"
      }
    ]
  }),

  createProject({
    slug: "paint-app",
    title: "AI-Assisted Paint Application",
    description:
      "Built a JavaFX drawing application around MVC and object-oriented design patterns, with undo/redo, multiple drawing strategies, and AI-generated JSON instructions for rendering shapes to the canvas.",
    cover: {
      src: "/assets/images/paint.png",
      alt: "Vibrant digital paint canvas with drawing tools and AI-assisted controls"
    },
    tech: ["Java", "JavaFX", "MVC", "Design Patterns", "REST APIs"],
    details: [
      {
        heading: "Overview",
        paragraphs: [
          "I built this desktop paint application as a study in maintainable object-oriented design, not just canvas rendering. It supports seven drawing modes, fill and outline styles, line thickness and opacity controls, undo and redo, PNG export, persistent themes, colour-blind palettes, keyboard shortcuts, and prompt-generated drawings.",
          "The main design goal was to keep input handling, drawing state, and rendering independent. That separation made it possible to add tools and alternate input paths without turning the canvas into one large event handler."
        ]
      },
      {
        heading: "How an interaction moves through MVC",
        paragraphs: [
          "JavaFX events enter through small controllers. A controller selects either a drawing strategy or menu command, which updates the shared model. The model notifies its observers, and the canvas redraws every stored Drawable in order. The view never decides how a circle is resized or how undo works; it only renders the resulting state."
        ],
        diagram: {
          label: "Input-to-render flow",
          items: [
            { title: "Input", description: "Mouse, keyboard, menu, or prompt" },
            { title: "Controller", description: "Translates the JavaFX event" },
            { title: "Strategy / Command", description: "Applies tool-specific behaviour" },
            { title: "Model", description: "Owns drawables and history" },
            { title: "View", description: "Observes state and redraws" }
          ]
        }
      },
      {
        heading: "Extensible drawing tools",
        paragraphs: [
          "The Strategy pattern gives every tool the same mouse lifecycle: press, drag, move, and release. A factory chooses the active strategy from the selected mode, so the canvas controller does not need shape-specific branches. Adding another tool means implementing one strategy and one Drawable, then registering the new mode.",
          "Shape strategies create a provisional object on press, update its geometry while dragging, and plant it on release so it can no longer be edited accidentally. Freehand strokes use linked points with explicit endpoints, while geometric shapes calculate dimensions from the initial anchor and current pointer position."
        ],
        code: `interface StrategyPaint {
    void mousePressed();
    void mouseDragged();
    void mouseMoved();
    void mouseReleased();
}

switch (mode) {
    case "circle" -> new StrategyCircle(model, event);
    case "squiggle" -> new StrategySquiggle(model, event);
    case "polyline" -> new StrategyPolyline(model, event);
}`
      },
      {
        heading: "Model-driven rendering",
        paragraphs: [
          "The model is the source of truth for the ordered drawable collection and active tool settings. Every drawable owns its geometry, colour, opacity, thickness, fill state, and draw operation. This polymorphic boundary lets the canvas render mixed shapes through one loop.",
          "Model changes notify observers. The canvas clears itself, restores the active background, and redraws the collection in order. The same notification path handles live drag previews, completed shapes, undo, theme changes, and generated drawings."
        ],
        code: `public void update(Observable source, Object event) {
    GraphicsContext graphics = getGraphicsContext2D();
    ColourPalette palette = ColourPalette.getInstance();
    graphics.clearRect(0, 0, getWidth(), getHeight());
    graphics.setFill(Color.web(palette.getColour("canvas").getHex()));
    graphics.fillRect(0, 0, getWidth(), getHeight());

    for (Drawable drawable : model.getDrawings()) {
        drawable.draw(graphics);
    }
}`
      },
      {
        heading: "Undo, redo, and application commands",
        paragraphs: [
          "Menu actions and keyboard shortcuts share Command objects, so Ctrl/Cmd+Z and the Undo menu item execute the same behaviour. The model keeps active and removed drawables as lightweight history stacks. A freehand stroke is treated as one logical action by walking backward through its points until an endpoint is reached, rather than undoing one sampled point at a time.",
          "Clear Canvas is also reversible: the full drawing list moves into history, and the next undo restores it as one operation. Export snapshots the JavaFX canvas with its current background and writes a PNG selected through the native file chooser."
        ],
        code: `interface MenuCommand {
    void execute();
}

class UndoCommand implements MenuCommand {
    public void execute() {
        if (model.isPrevActionClear()) model.undoClearDrawings();
        else if (!model.getDrawings().isEmpty()) model.removeLast();
    }
}`
      },
      {
        heading: "AI-generated drawings",
        paragraphs: [
          "Prompt generation is an alternate producer of model objects, not a separate rendering system. The app requests structured JSON containing rectangles, ovals, triangles, and polylines, checks the response shape, and converts each entry into the same Drawable hierarchy used by manual tools.",
          "Generated shapes are scheduled as short JavaFX keyframes, creating a progressive drawing effect while keeping UI updates on the JavaFX application thread. Because generated and manual shapes share the same model, they automatically gain redraw, theme, undo, and export behaviour."
        ]
      },
      {
        heading: "Themes and accessible colour",
        paragraphs: [
          "A shared palette provides semantic colours for the canvas and controls. It supports multiple themes and protanopia, deuteranopia, and tritanopia variants, persists the selected preferences locally, and notifies observing views when the palette changes. A small builder keeps theme-specific colour definitions readable while the rest of the application requests colours by role rather than hard-coded hex values."
        ]
      },
      {
        heading: "Project summary",
        paragraphs: [
          "This project combines MVC, drawing strategies, application commands, model-driven rendering, undo and redo, accessible themes, and prompt-generated artwork in one JavaFX application. Mouse, keyboard, menu, and AI-generated input all flow through the same shared drawing model and rendering pipeline."
        ]
      }
    ],
    actions: [
      { type: "readMore", label: "Read More" }
    ]
  }),

  createProject({
    slug: "candles-and-monsters",
    title: "RISC-V Assembly Game",
    description:
      "Built a turn-based terminal game entirely in RISC-V Assembly with configurable grids, randomized item and enemy placement, one-to-four-player rounds, fear-based win/loss logic, and ranked standings.",
    cover: {
      src: "/assets/images/riscv.png",
      alt: "Terminal views showing gameplay, round setup, and player rankings for Scared of the Dark"
    },
    tech: ["RISC-V Assembly", "Register Management", "Xorshift RNG", "Terminal I/O"],
    actions: [
      {
        type: "github",
        label: "GitHub",
        href: "https://github.com/IsaacTilahun/Candles-and-Monsters"
      },
      {
        type: "site",
        label: "Site",
        href: "https://drive.google.com/file/d/1kD-z5RslUAVDx-sEmP45dfUvNEx7eiEV/view?usp=sharing"
      }
    ]
  })
];
