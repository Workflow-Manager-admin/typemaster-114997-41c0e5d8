# Typing Speed Tester App: Feature Description

This document provides a comprehensive overview of all features, behaviors, and user interface elements of the Typing Speed Tester app. The app is written in React and is designed to offer a smooth, engaging, and informative way for users to test and improve their typing speed and accuracy, all within a web browser.

---

## 1. Random Word Display

At the heart of the Typing Speed Tester is its ability to present users with a fresh and dynamic typing challenge each time a test is started or reset.

- **Randomized Content**: Each new typing test displays a series of words drawn from a pool of brand-related sentences ("Kavia Facts"). For each round, 10 sentences are sampled randomly and split into individual words, ensuring no repeats within a session.
- **Presentation**: The words are displayed in a centered block near the top of the interface. Each word is visually distinct and padded for readability.

---

## 2. Per-Letter Highlighting

The app provides instant visual feedback to help users recognize mistakes as they type:

- **Real-time Highlighting**: As the user types, each letter in the current word is checked against the corresponding letter in the expected word in real-time.
    - **Correct letters** are highlighted in green (`#64c672`) and shown in bold.
    - **Incorrect letters** are highlighted in red (`#f96262`), with an underline, and a light red background for extra emphasis.
    - Letters not yet typed remain with the default color for that word.
- **Extra Characters**: If users type more characters than the word contains, the extra characters appear in red with reduced opacity and italic style, indicating a typing overrun.
- **Active Word Focus**: The currently active word (the one being typed) is further highlighted with a subtle border and background.

---

## 3. Live WPM and Accuracy Tracking

To help users monitor their performance in real time:

- **WPM (Words Per Minute)**: The application tracks elapsed time from the first keystroke and recalculates the current WPM live, based on the number of completed words.
- **Accuracy**: The proportion of correct to total typed characters (correct + incorrect) is calculated and displayed as a percentage, updating instantly with each keystroke.
- **Live Indicators**: Below the input field, a set of live metrics displays:
    - WPM (rounded to nearest integer)
    - Accuracy (as a percent)
    - The number of words typed out of the total sequence

These indicators are visually grouped and styled for clarity and quick recognition.

---

## 4. Summary Display

Once the final word in the sequence is completed:

- **Modal Dialog**: A modal summary dialog overlays the page, with a clean, accessible design.
- **Summary Metrics**:
    - Final WPM
    - Accuracy
    - Total time taken (in seconds)
    - High Score (best-ever WPM for the user, using either local storage or the user's profile)
- **Actions**: A "New Test" button (styled as a prominent action) allows quick restart without page reload.
- **Optional**: If the user is signed in, an invite link to challenge friends is also provided.

---

## 5. Reset Functionality

At any time (except for a completed test), a **Reset** button is clearly available:

- Clicking this regenerates a new randomized sequence of words, resets all counters and indicators, clears the input, and readies the app for a new round.
- The input box regains focus automatically for a seamless restart.

---

## 6. Live Indicators & Input Guidance

- The input field is always placed just below the word display, auto-focused for instant typing.
- A blinking cursor and clearly visible prompts guide the user.
- Passive hints below the controls remind users to press <kbd>Space</kbd> after each word and explain the color-coding for mistakes (i.e., red letters mean incorrect).
- Words left to type are evident from the difference between the counter and the displayed word sequence.

---

## 7. Design Style and UI Layout

- **Modern and Minimalist**: The app makes use of a clean, modern palette with airy padding, rounded corners, and a consistent light background (`#fff`, `#f8f9fa`).
- **Brand Colors**: The design uses a distinctive blue (`#71def4`), orange accent (`#f4a357`), and error red (`#f96262`), which provide clarity of action and error states.
- **Centered Layout**: The main card is always centered both vertically and horizontally. The words row sits atop the card, with input and indicators stacked below.
- **Responsiveness**: The layout adapts smoothly down to mobile screen widths, with generous spacing and scaling for smaller devices.
- **Dialogs and Highlights**: Modals feature a frosted-glass effect and are sized for mobile accessibility; active words and buttons use subtle gradients and shadows for a friendly, modern touch.
- **Button Styles**: Reset and primary actions are colored with a linear gradient and lift on hover for visual feedback.

---

## 8. Additional Features

- **High Score Tracking**: The best-ever WPM is persistent, either per device (for guests) or per user (for signed-in users with Supabase).
- **Leaderboard**: A global leaderboard (integrated with Supabase) is displayed below the main card, showing the top high scores and usernames/email pseudonyms.
- **Auth & Social**: Optional sign-in/sign-up functionality allows competition and sharing via personal invite links.

---

## Summary

The Typing Speed Tester app contains all the essential features for an engaging and clear typing assessment, providing real-time feedback, motivational scores, and a modern, approachable interface suitable for users of all skill levels. Its UI layout and feature set have been carefully tailored for simplicity, effectivity, and a friendly user experience.

```
graph LR
    W(Random Word Display)
    H(Highlighting Letters)
    L(Live WPM/Accuracy)
    S(Summary Dialog)
    R(Reset Functionality)
    I(Live Indicators)
    D(Modern UI Layout & Styles)
    W --> H
    H --> L
    L --> S
    S --> R
    R --> W
    L --> I
    I --> D
    D --> W
```

---

*This document reflects the current implemented state of the Typing Speed Tester as found in the codebase's App.js and related CSS. For further adjustments or new features, please update this description accordingly.*
