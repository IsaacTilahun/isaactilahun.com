// Words for Word Memory: common, family-friendly, 4 to 9 letters, no names.
// Grouped loosely by theme so it's easy to add more without repeating one.
// The game shuffles the whole list, so order here doesn't matter.

export const WORDS = [
  // Nature and weather
  "river", "forest", "meadow", "valley", "mountain", "island", "ocean", "desert",
  "canyon", "glacier", "volcano", "cloud", "thunder", "rainbow", "breeze", "storm",
  "puddle", "pebble", "boulder", "stone", "sand", "shell", "coral", "wave",
  "tide", "moon", "star", "planet", "comet", "galaxy", "sunrise", "sunset",
  "shadow", "winter", "summer", "autumn", "spring", "season", "snowflake", "blossom",
  "petal", "flower", "garden", "branch", "acorn", "maple", "willow", "cactus",
  "fern", "moss", "grass", "leaf", "root", "seed", "orchard", "harvest",
  "field", "hill", "cliff", "cave", "lake", "pond", "stream", "brook",
  "marsh", "jungle", "prairie", "tundra", "horizon", "weather", "lightning", "drizzle",
  "frost", "icicle", "mist", "meteor",

  // Animals
  "rabbit", "turtle", "dolphin", "penguin", "giraffe", "elephant", "kitten", "puppy",
  "falcon", "eagle", "sparrow", "parrot", "pelican", "octopus", "lobster", "salmon",
  "whale", "shark", "zebra", "tiger", "lion", "panda", "koala", "otter",
  "beaver", "badger", "hedgehog", "squirrel", "chipmunk", "raccoon", "moose", "camel",
  "donkey", "horse", "pony", "goat", "sheep", "lamb", "chicken", "duck",
  "goose", "swan", "frog", "toad", "lizard", "snail", "beetle", "spider",
  "butterfly", "dragonfly", "ladybug", "firefly", "jellyfish", "seahorse", "starfish", "crab",
  "walrus", "hamster", "gerbil", "ferret", "flamingo", "ostrich", "peacock", "toucan",
  "gorilla", "monkey", "leopard", "cheetah", "buffalo", "bison", "reindeer", "antelope",

  // Food and drink
  "apple", "banana", "cherry", "grape", "lemon", "mango", "orange", "peach",
  "pear", "plum", "melon", "berry", "carrot", "potato", "tomato", "onion",
  "garlic", "pepper", "celery", "lettuce", "cabbage", "pumpkin", "squash", "radish",
  "spinach", "broccoli", "cucumber", "avocado", "coconut", "pineapple", "walnut", "peanut",
  "almond", "cashew", "pretzel", "cookie", "muffin", "pancake", "waffle", "biscuit",
  "bagel", "toast", "butter", "cheese", "yogurt", "honey", "jelly", "sugar",
  "flour", "bread", "noodle", "pasta", "pizza", "salad", "soup", "stew",
  "sandwich", "taco", "popcorn", "candy", "cupcake", "dessert", "pudding", "cereal",
  "oatmeal", "omelet", "lemonade", "cocoa", "coffee", "juice", "milk", "water",

  // Around the house
  "window", "door", "chair", "table", "sofa", "pillow", "blanket", "carpet",
  "curtain", "ladder", "kettle", "teapot", "spoon", "fork", "knife", "plate",
  "bowl", "basket", "bucket", "candle", "lamp", "mirror", "closet", "drawer",
  "shelf", "attic", "cellar", "garage", "kitchen", "bedroom", "hallway", "chimney",
  "fireplace", "balcony", "porch", "fence", "gate", "mailbox", "doorbell", "lock",
  "bottle", "napkin", "towel", "soap", "sponge", "broom", "vacuum", "laundry",

  // Things to wear and carry
  "button", "zipper", "pocket", "jacket", "sweater", "scarf", "mitten", "glove",
  "boot", "slipper", "sandal", "sock", "umbrella", "backpack", "wallet", "suitcase",

  // Desk, toys and music
  "pencil", "eraser", "crayon", "marker", "notebook", "paper", "envelope", "stamp",
  "ribbon", "scissors", "glue", "tape", "puzzle", "marble", "kite", "balloon",
  "trophy", "medal", "compass", "lantern", "camera", "clock", "watch", "calendar",
  "piano", "guitar", "violin", "trumpet", "drum", "flute", "banjo", "harp",
  "whistle", "bell",

  // Places and getting around
  "bicycle", "scooter", "wagon", "train", "rocket", "airplane", "harbor", "bridge",
  "tunnel", "castle", "tower", "palace", "cottage", "cabin", "village", "city",
  "market", "bakery", "library", "museum", "school", "office", "station", "airport",
  "highway", "street", "avenue", "alley", "plaza", "stadium", "theater", "circus",
  "carnival", "festival", "picnic", "parade", "voyage", "journey", "ticket", "passport",
  "luggage", "sailboat", "canoe", "kayak", "anchor", "engine", "wheel", "motor",
  "tractor", "truck", "subway", "taxi", "ferry", "yacht",

  // Describing words
  "happy", "gentle", "brave", "clever", "quiet", "bright", "shiny", "fuzzy",
  "smooth", "rough", "golden", "silver", "purple", "yellow", "green", "crimson",
  "scarlet", "violet", "indigo", "little", "giant", "tiny", "hollow", "frozen",
  "warm", "cozy", "sleepy", "silly", "curious", "polite", "honest", "humble",
  "proud", "calm", "eager", "lively", "lucky", "noble", "rapid", "swift",
  "steady", "sturdy", "fragile", "ancient", "modern", "simple", "perfect", "magic",
  "secret", "hidden", "famous", "gigantic", "delicate", "cheerful", "grateful", "careful",
  "peaceful", "playful",

  // People and characters
  "friend", "family", "neighbor", "teacher", "student", "doctor", "farmer", "baker",
  "painter", "sailor", "pilot", "artist", "author", "singer", "dancer", "builder",
  "gardener", "captain", "wizard", "knight", "dragon", "unicorn", "pirate", "robot",

  // Doing words
  "jump", "dance", "laugh", "smile", "whisper", "wander", "gather", "build",
  "climb", "swim", "float", "glide", "sparkle", "twinkle", "shimmer", "borrow",
  "explore", "imagine", "discover", "listen", "travel", "juggle", "giggle", "tickle",
  "scribble", "doodle", "sketch", "paint", "bake", "cook", "stir", "knit",
  "plant", "carry", "throw", "catch", "kick", "bounce", "spin", "skip",
  "march", "wiggle", "stretch", "yawn", "sneeze", "shiver", "blink", "wink",

  // Ideas, shapes and time
  "answer", "question", "idea", "dream", "story", "chapter", "riddle", "poem",
  "letter", "number", "circle", "square", "triangle", "diamond", "arrow", "pattern",
  "stripe", "spiral", "rhythm", "melody", "music", "echo", "signal", "message",
  "gift", "present", "surprise", "holiday", "birthday", "weekend", "morning", "evening",
  "midnight", "minute", "moment", "century", "history", "science", "wonder", "courage",
  "kindness",

  // Materials and treasures
  "magnet", "crystal", "feather", "velvet", "cotton", "wooden", "metal", "plastic",
  "glass", "rubber", "copper", "bronze", "pearl", "jewel", "emerald", "sapphire",
  "treasure", "globe", "atlas",
];
