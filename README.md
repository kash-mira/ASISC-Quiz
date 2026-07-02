# ASISC Quiz Platform

A comprehensive quiz platform for Classes VI–XII, covering Current Affairs, Science & Technology, History & Civics, Geography, Literature & Language, Sports, Environment & Climate, Arts & Culture, and AI & Emerging Tech.

## Project Structure

```
ASISC-Quiz/
│
├── index.html              # Main HTML entry point
├── style.css                # All application styling
├── script.js                # React app logic (loaded as text/babel)
│
├── data/                    # Question banks, one JSON file per category
│   ├── current_affairs.json
│   ├── science.json
│   ├── history.json
│   ├── geography.json
│   ├── literature.json
│   ├── sports.json
│   ├── environment.json
│   ├── arts.json
│   └── ai.json
│
├── assets/
│   ├── images/               # Reserved for image-based questions
│   └── audio/                 # Reserved for audio-based questions
│
└── README.md
```

## How It Works

- `index.html` loads React, ReactDOM, and Babel from CDN, then links `style.css` and loads `script.js` as an in-browser JSX file (`type="text/babel"`).
- `script.js` fetches each JSON file in `data/` on startup, combines them into a single `questionBank` object keyed by category name, and renders the quiz app (dashboard, quiz, and results views).
- Each file in `data/` follows this shape:

```json
{
  "category": "Current Affairs",
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "text": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "B",
      "difficulty": "medium",
      "explanation": "..."
    }
  ]
}
```

### Supported Question Types

- `mcq` — single-answer multiple choice
- `true-false` — true/false
- `multiple-correct` — multi-select multiple choice
- `matching` — pair matching
- `assertion-reason` — assertion/reason logic questions
- `fill-blank` — free-text fill in the blank

## Running Locally

Because `script.js` fetches JSON files via `fetch()`, opening `index.html` directly from the filesystem (`file://`) will be blocked by the browser's CORS policy. Serve the folder with a local web server instead, for example:

```bash
# From the ASISC-Quiz/ folder
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Adding or Editing Questions

1. Open the relevant file in `data/` (e.g. `data/science.json` for Science & Technology).
2. Add a new object to the `questions` array, following the shape shown above. Use a unique `id`.
3. Save the file and refresh the page — no other code changes are needed.

To add a brand-new category, create a new JSON file in `data/` with the same `{ "category": ..., "questions": [...] }` shape, then add its path to the `DATA_FILES` array near the top of `script.js`.

## Assets

The `assets/images/` and `assets/audio/` folders are reserved for future image-based and audio-based question types. Reference files from these folders using relative paths (e.g. `assets/images/example.png`) inside a question's data.
