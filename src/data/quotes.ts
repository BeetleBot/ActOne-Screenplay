export interface Quote {
  text: string;
  author: string;
}

export const quotes: Quote[] = [
  { text: "A blank page is a beautiful thing!", author: "Anonymous" },
  { text: "The first draft is just you telling yourself the story.", author: "Terry Pratchett" },
  { text: "Get it down. Take chances. It may be bad, but it's the only way you can do anything really good.", author: "Anne Lamott" },
  { text: "Start writing, no matter what. The water does not flow until the faucet is turned on.", author: "Louis L'Amour" },
  { text: "I love the blank page. I'm terrified of the blank page.", author: "Billy Wilder" },
  { text: "Writing is rewriting. No one gets it right the first time.", author: "Anonymous" },
  { text: "The hard part is starting. Once you start, the words will come.", author: "Anonymous" },
  { text: "A screenplay is a blueprint for a movie, not a novel.", author: "Anonymous" },
  { text: "Every great screenplay starts with a single word on a blank page.", author: "Anonymous" },
  { text: "Write what you know, but more importantly, write what you feel.", author: "Anonymous" },
  { text: "The only rule is don't be boring.", author: "Billy Wilder" },
  { text: "Structure is the most important thing in a screenplay.", author: "Anonymous" },
  { text: "If you can write a good sentence, you can write a good screenplay.", author: "Anonymous" },
  { text: "Don't wait for inspiration. It comes while you're working.", author: "Henri Matisse" },
  { text: "The secret to finishing is starting, every single day.", author: "Anonymous" },
];

let lastIndex = -1;

export function getRandomQuote(): Quote {
  let index: number;
  do {
    index = Math.floor(Math.random() * quotes.length);
  } while (index === lastIndex && quotes.length > 1);
  lastIndex = index;
  return quotes[index];
}
