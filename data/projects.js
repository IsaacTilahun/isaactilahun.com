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
          "I built mysh to understand what a command shell is doing beneath the prompt. It parses commands, expands shell variables, connects multi-stage pipelines, manages foreground and background processes, and exposes a TCP chat server and client as built-in commands.",
          "The simplest mental model is that mysh translates text into operating-system work. Parsing determines what the user requested; fork and execvp create and replace processes; dup2 rewires their input and output; waitpid collects finished children; and select keeps network sockets responsive without adding threads."
        ]
      },
      {
        heading: "Command lifecycle",
        paragraphs: [
          "The interactive loop first collects completed background processes, services the chat server, then reads and executes the next command. SIGINT returns control to the prompt instead of terminating the shell, while SIGPIPE is ignored so a disconnected client becomes a recoverable write failure."
        ],
        diagram: {
          label: "Command flow through the shell",
          items: [
            { title: "Read", description: "Collect one command line" },
            { title: "Parse", description: "Tokenize and identify syntax" },
            { title: "Expand", description: "Resolve shell variables" },
            { title: "Execute", description: "Run a builtin or process" },
            { title: "Clean up", description: "Wait, reap, close, and free" }
          ]
        },
        code: `while ((exited_pid = waitpid(-1, &stat, WNOHANG)) > 0) {
    if (get_process_num(exited_pid) != -1) {
        del_process(exited_pid);
    }
}

if (server_running) {
    handle_server();
}
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
        char *expanded_var = find_variable(early_dollar + 1);
        strncat(expanded_token, expanded_var, 128 - strlen(expanded_token));
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

struct timeval tv;
tv.tv_sec = 0;
tv.tv_usec = 100000;
int ready = select(max_fd + 1, &fds, NULL, NULL, &tv);

if (FD_ISSET(fd, &fds)) {
    ssize_t n = read(fd, msg, sizeof(msg) - 1);
}
if (FD_ISSET(STDIN_FILENO, &fds)) {
    expand_input(tmp_tokens, 1);
}`
      },
      {
        heading: "How the pieces fit together",
        paragraphs: [
          "A normal command is read, tokenized, expanded, and dispatched as either a builtin or an external program. A pipeline repeats that execution path across several child processes, with file descriptors connecting one stage's output to the next stage's input. A background command follows the same process model, but the parent returns to the prompt instead of waiting immediately.",
          "The chat feature applies the same file-descriptor thinking to sockets. select reports which descriptors are ready, so one loop can react to terminal input, new connections, client messages, and disconnects. The central systems lesson is that correct cleanup matters as much as execution: every process, allocation, pipe end, and socket needs a clear owner and lifetime."
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
          "The main design goal was to keep input handling, drawing state, and rendering independent. That separation made it possible to add tools and alternate input paths without turning the canvas into one large event handler.",
          "The simplest mental model is: controllers interpret input, strategies or commands decide what that input means, the model stores the result, and the observed canvas redraws the model. No mouse handler draws directly to the final canvas state."
        ]
      },
      {
        heading: "How an interaction moves through MVC",
        paragraphs: [
          "JavaFX events enter through small controllers. Mouse input selects a drawing strategy, menu and keyboard input execute shared commands, and prompt input delegates generation to the model. These paths update the same drawing state, after which the canvas redraws every stored Drawable in order. The canvas view never decides how a circle is resized or how undo works; it renders the resulting state."
        ],
        diagram: {
          label: "Input-to-render flow",
          items: [
            { title: "Input", description: "Mouse, keyboard, or menu" },
            { title: "Controller", description: "Translates the JavaFX event" },
            { title: "Behaviour", description: "Applies a strategy or command" },
            { title: "Model", description: "Owns drawables and history" },
            { title: "View", description: "Observes state and redraws" }
          ]
        }
      },
      {
        heading: "Extensible drawing tools",
        paragraphs: [
          "The Strategy pattern gives every tool the same mouse lifecycle: press, drag, move, and release. A factory chooses the active strategy from the selected mode, so the canvas controller does not need shape-specific branches. Adding another tool means implementing one strategy and one Drawable, then registering the new mode.",
          "Drag-based shapes create a provisional object on press, update their geometry while dragging, and become fixed on release. Freehand strokes use linked points with explicit endpoints, while polylines and triangles collect successive clicks and display a live hover preview before completion."
        ],
        code: `interface StrategyPaint {
    void mousePressed();
    void mouseDragged();
    void mouseMoved();
    void mouseReleased();
}

switch (mode) {
    case "circle" -> new StrategyCircle(activeModel, mouseEvent);
    case "squiggle" -> new StrategySquiggle(activeModel, mouseEvent);
    case "polyline" -> new StrategyPolyline(activeModel, mouseEvent);
}`
      },
      {
        heading: "Model-driven rendering",
        paragraphs: [
          "The model is the source of truth for the ordered drawable collection and active tool settings. Every Drawable owns its geometry and rendering behaviour; shape types also carry colour, opacity, thickness, and fill state where applicable. This polymorphic boundary lets the canvas render mixed objects through one loop.",
          "The canvas observes both drawing-state and palette changes. Either source triggers the same redraw routine: clear the canvas, restore the active background, then render the collection in order. This covers live previews, completed shapes, undo, theme changes, and generated drawings."
        ],
        code: `public void update(Observable source, Object event) {
    GraphicsContext g2d = this.getGraphicsContext2D();
    ColourPalette palette = ColourPalette.getInstance();
    String canvasColour = palette.getColour("canvas").getHex();

    g2d.clearRect(0, 0, this.getWidth(), this.getHeight());
    g2d.setFill(Color.web(canvasColour));
    g2d.fillRect(0, 0, this.getWidth(), this.getHeight());

    for (Drawable drawable : this.model.getDrawings()) {
        drawable.draw(g2d);
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
          "Generated shapes are scheduled as short JavaFX keyframes, creating a progressive drawing effect while keeping UI updates on the JavaFX application thread. Because generated and manual shapes share the same collection, they participate in redraw, undo, palette-aware rendering, and export without a second rendering path."
        ]
      },
      {
        heading: "Themes and accessible colour",
        paragraphs: [
          "A shared palette provides semantic colours for the canvas and controls. It supports multiple themes and protanopia, deuteranopia, and tritanopia variants, persists the selected preferences locally, and notifies observing views when the palette changes. A small builder keeps theme-specific colour definitions readable while the rest of the application requests colours by role rather than hard-coded hex values."
        ]
      },
      {
        heading: "How the pieces fit together",
        paragraphs: [
          "A mouse event reaches a controller, which asks the factory for the active drawing strategy. That strategy creates or updates a Drawable in the model. The model then notifies the canvas, which clears and redraws the ordered collection. Menu and keyboard actions reach the same model through Command objects, so actions such as undo and export behave consistently regardless of how they were triggered.",
          "Each pattern solves a specific problem: Strategy isolates tool behaviour, Factory selects the active tool, Command unifies application actions, Observer keeps views synchronized, and Singleton plus Builder centralize palette configuration. Prompt-generated shapes join the same Drawable collection, so the AI feature extends the existing architecture instead of creating a second canvas system."
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
