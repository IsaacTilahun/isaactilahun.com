// Lines for Type Fast: real commands and snippets a learner meets early on,
// each with a plain-English note on what it does.
//
// Rules for adding a line, so it types cleanly on any keyboard:
//   - code: 15-55 characters, plain ASCII, single spaces, no tabs
//   - explain: what it does, in under 70 characters
//   - lang: the tag shown above it (terminal commands are "Bash", git is "Git")

export const TYPING_LINES = [
  // Git
  { lang: "Git", code: "git status --short", explain: "Lists changed and new files, one line per file." },
  { lang: "Git", code: "git add src/index.js", explain: "Stages one file so it goes into the next commit." },
  { lang: "Git", code: 'git commit -m "Fix login bug"', explain: "Saves the staged changes as a commit with a short message." },
  { lang: "Git", code: "git checkout -b new-feature", explain: "Creates a new branch called new-feature and switches to it." },
  { lang: "Git", code: "git log --oneline -5", explain: "Shows the last five commits, one line each." },
  { lang: "Git", code: "git diff --staged", explain: "Shows what's staged for the next commit, line by line." },
  { lang: "Git", code: "git push origin main", explain: "Uploads your commits on main to the remote called origin." },
  { lang: "Git", code: "git clone https://github.com/user/repo.git", explain: "Downloads a copy of a repository, with its whole history." },
  { lang: "Git", code: "git stash && git pull", explain: "Sets your changes aside, then pulls the latest from the remote." },
  { lang: "Git", code: "git restore notes.txt", explain: "Throws away your unstaged edits to notes.txt." },

  // Bash
  { lang: "Bash", code: "ls -la ~/projects", explain: "Lists everything in ~/projects, hidden files too, with details." },
  { lang: "Bash", code: "cd ../src && pwd", explain: "Moves up one folder and into src, then prints where you are." },
  { lang: "Bash", code: 'grep -r "TODO" .', explain: "Searches every file under this folder for the text TODO." },
  { lang: "Bash", code: "mkdir -p src/components", explain: "Creates the folder, plus any missing folders above it." },
  { lang: "Bash", code: "chmod +x deploy.sh", explain: "Makes deploy.sh executable, so ./deploy.sh can run it." },
  { lang: "Bash", code: 'echo "hello" > notes.txt', explain: "Writes hello into notes.txt, replacing what was there." },
  { lang: "Bash", code: "tail -n 20 error.log", explain: "Prints the last 20 lines of error.log." },
  { lang: "Bash", code: "rm -rf node_modules", explain: "Deletes the node_modules folder and everything in it. No undo." },
  { lang: "Bash", code: "cp config.example.json config.json", explain: "Copies the example config into a new file, config.json." },
  { lang: "Bash", code: 'find . -name "*.py"', explain: "Lists every Python file in this folder and the ones inside it." },
  { lang: "Bash", code: "mv draft.md posts/hello.md", explain: "Moves draft.md into posts and renames it hello.md." },
  { lang: "Bash", code: "ps aux | grep node", explain: "Lists running programs and keeps only the lines with node." },
  { lang: "Bash", code: "curl -I https://example.com", explain: "Fetches just the HTTP headers that example.com sends back." },
  { lang: "Bash", code: "python3 -m venv .venv", explain: "Creates a Python virtual environment in a folder called .venv." },
  { lang: "Bash", code: "pip install requests", explain: "Downloads and installs the requests library for Python." },
  { lang: "Bash", code: "npm install express", explain: "Installs the express package and adds it to package.json." },

  // Python
  { lang: "Python", code: 'print("hello, world")', explain: "Prints hello, world to the console." },
  { lang: "Python", code: "squares = [n * n for n in range(10)]", explain: "Builds a list of the squares of 0 to 9 in one line." },
  { lang: "Python", code: "for i in range(3): print(i)", explain: "Prints 0, 1 and 2, each on its own line." },
  { lang: "Python", code: 'def greet(name): return "Hi " + name', explain: "Defines a function that returns a greeting for name." },
  { lang: "Python", code: 'with open("data.txt") as f: text = f.read()', explain: "Reads the whole file into text, then closes it for you." },
  { lang: "Python", code: 'if __name__ == "__main__": main()', explain: "Runs main() only when this file is run directly, not imported." },
  { lang: "Python", code: 'ages = {"ana": 31, "ben": 27}', explain: "Creates a dictionary that maps each name to an age." },
  { lang: "Python", code: "nums.sort(reverse=True)", explain: "Sorts the list in place, biggest number first." },
  { lang: "Python", code: 'name = input("Your name? ")', explain: "Asks the user to type something and keeps it in name." },

  // JavaScript
  { lang: "JavaScript", code: 'console.log("hello, world");', explain: "Prints hello, world to the console." },
  { lang: "JavaScript", code: "const sum = (a, b) => a + b;", explain: "Defines a short arrow function that adds two numbers." },
  { lang: "JavaScript", code: "for (let i = 0; i < 3; i++) console.log(i);", explain: "Logs 0, 1 and 2 with a classic counting loop." },
  { lang: "JavaScript", code: "const doubled = nums.map((n) => n * 2);", explain: "Makes a new array with every number doubled." },
  { lang: "JavaScript", code: "const evens = nums.filter((n) => n % 2 === 0);", explain: "Makes a new array that keeps only the even numbers." },
  { lang: "JavaScript", code: 'document.querySelector("#title")', explain: "Finds the element on the page whose id is title." },
  { lang: "JavaScript", code: 'button.addEventListener("click", save);', explain: "Runs the save function every time the button is clicked." },
  { lang: "JavaScript", code: "const data = await fetch(url).then((r) => r.json());", explain: "Downloads JSON from url and turns it into an object." },
  { lang: "JavaScript", code: 'localStorage.setItem("theme", "dark");', explain: "Remembers theme = dark in the browser, even after a reload." },
  { lang: "JavaScript", code: "const { name, age } = user;", explain: "Copies name and age out of the user object into variables." },
  { lang: "JavaScript", code: "const msg = `Hi ${name}!`;", explain: "Builds a string with name dropped in, using a template literal." },

  // TypeScript
  { lang: "TypeScript", code: "let count: number = 0;", explain: "A variable that TypeScript will only let hold numbers." },
  { lang: "TypeScript", code: 'type Status = "open" | "closed";', explain: "A type whose value can only be the text open or closed." },

  // SQL
  { lang: "SQL", code: "SELECT * FROM users WHERE age > 18;", explain: "Gets every column for the users older than 18." },
  { lang: "SQL", code: "SELECT name FROM users ORDER BY name;", explain: "Lists user names in alphabetical order." },
  { lang: "SQL", code: "INSERT INTO users (name) VALUES ('Ana');", explain: "Adds a new row to users with the name Ana." },
  { lang: "SQL", code: "UPDATE users SET active = 0 WHERE id = 7;", explain: "Marks the user with id 7 as inactive." },
  { lang: "SQL", code: "DELETE FROM sessions WHERE expired = 1;", explain: "Removes every row in sessions that has expired." },
  { lang: "SQL", code: "SELECT COUNT(*) FROM orders;", explain: "Counts how many rows the orders table has." },
  { lang: "SQL", code: "SELECT city, COUNT(*) FROM users GROUP BY city;", explain: "Counts how many users live in each city." },

  // CSS
  { lang: "CSS", code: "body { margin: 0; }", explain: "Removes the gap browsers add around the page by default." },
  { lang: "CSS", code: ".card { display: flex; gap: 1rem; }", explain: "Lines up a card's children in a row, 1rem apart." },
  { lang: "CSS", code: "a:hover { text-decoration: underline; }", explain: "Underlines a link while the mouse is over it." },
  { lang: "CSS", code: "img { max-width: 100%; }", explain: "Stops images from growing wider than their container." },
  { lang: "CSS", code: "* { box-sizing: border-box; }", explain: "Makes width and height include padding and border." },

  // HTML
  { lang: "HTML", code: '<a href="/about">About me</a>', explain: "A link that takes you to the /about page." },
  { lang: "HTML", code: '<img src="cat.jpg" alt="A sleepy cat">', explain: "Shows cat.jpg, with a description for screen readers." },
  { lang: "HTML", code: '<input type="email" required>', explain: "An email field; the form won't send until it has a valid email." },
  { lang: "HTML", code: '<button type="submit">Send</button>', explain: "A button that submits the form it sits in." },

  // C, Java, Go, Rust
  { lang: "C", code: 'printf("%d items\\n", count);', explain: "Prints count as a number, the word items, then a new line." },
  { lang: "C", code: "int main(void) { return 0; }", explain: "The smallest C program: it starts, then exits with success." },
  { lang: "Java", code: 'System.out.println("Hello, World");', explain: "Prints Hello, World and moves to a new line." },
  { lang: "Java", code: "int[] scores = new int[10];", explain: "Makes an array of ten whole numbers, all starting at 0." },
  { lang: "Go", code: "if err != nil { return err }", explain: "If something went wrong, stop and pass the error up." },
  { lang: "Rust", code: "let mut total = 0;", explain: "Declares a variable you're allowed to change later." },
  { lang: "Rust", code: 'println!("{} points", score);', explain: "Prints the score, then the word points, on its own line." },
];
