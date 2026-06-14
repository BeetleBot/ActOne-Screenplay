const QUOTES = [
  { text: "To make a great film, you need three things: the script, the script and the script.", author: "Alfred Hitchcock" },
  { text: "The hardest thing about writing is writing.", author: "Nora Ephron" },
  { text: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { text: "The screenwriter's job is to make the audience care.", author: "Billy Wilder" },
  { text: "Action is character. If we never show what a person does, we don't know who they are.", author: "Syd Field" },
  { text: "Don't write what you think people want to read. Write what you want to read.", author: "William Goldman" },
  { text: "Give me a good script, and I'll make a good movie.", author: "Akira Kurosawa" },
  { text: "The script is the outline of the dream.", author: "Jean-Luc Godard" },
  { text: "Write what you see, write what you hear. Everything else is decoration.", author: "David Mamet" },
  { text: "Audiences don't know what they want until you give it to them.", author: "Federico Fellini" },
  { text: "A story should have a beginning, a middle, and an end... but not necessarily in that order.", author: "Jean-Luc Godard" },
  { text: "Theme is the glue that holds the story together.", author: "Lajos Egri" },
  { text: "Plot is what happens. Story is who it happens to.", author: "Robert McKee" }
];

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle-btn");
  const quoteText = document.getElementById("dynamic-quote-text");
  const quoteAuthor = document.getElementById("dynamic-quote-author");
  const nextQuoteBtn = document.getElementById("next-quote-btn");

  themeToggle.addEventListener("click", () => {
    if (document.body.classList.contains("dark-theme")) {
      document.body.classList.replace("dark-theme", "light-theme");
    } else {
      document.body.classList.replace("light-theme", "dark-theme");
    }
  });

  const displayRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    const quote = QUOTES[randomIndex];
    quoteText.textContent = `“${quote.text}”`;
    quoteAuthor.textContent = `— ${quote.author}`;
  };

  nextQuoteBtn.addEventListener("click", displayRandomQuote);

  displayRandomQuote();
});
