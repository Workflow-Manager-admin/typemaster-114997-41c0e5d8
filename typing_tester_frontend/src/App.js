import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import errorBeep from './error-beep.mp3';

import {
  supabase,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  getCurrentUserProfile,
  updateUserHighScore,
  saveScore,
  fetchLeaderboard,
  generateInviteLink,
  getInviterProfile
} from "./supabaseClient";
/**
 * --- Kavia AI Fact Pool ---
 * A large collection of short sentences and facts to serve as fresh, varied
 * typing content. Each new test picks a random, non-repeated set per attempt.
 */
const KAVIA_FACTS = [
  "Kavia AI automates software development using advanced generative models.",
  "The Kavia platform translates natural language into functional source code.",
  "With Kavia AI, teams can deliver projects faster and with fewer bugs.",
  "Kavia's AI solutions reduce manual coding effort for product teams.",
  "Kavia supports multiple programming languages and frameworks.",
  "Kavia AI keeps software up to date with rapid code refactoring.",
  "Kavia’s platform explains every code change for full transparency.",
  "The Kavia Engine embraces continuous integration and delivery.",
  "Kavia helps onboard new developers faster with live documentation.",
  "Kavia AI analyzes code quality and test coverage automatically.",
  "Using Kavia, companies achieve better productivity and consistency.",
  "Kavia’s conversational interface makes complex automation accessible.",
  "Kavia AI learns from code patterns and user feedback.",
  "Kavia integrates with GitHub for seamless source control.",
  "Kavia’s test automation boosts software reliability.",
  "Kavia enables feature shipping at a fraction of previous cost.",
  "Kavia AI is privately hosted for maximum data security.",
  "Kavia excels at generating UI, backend, and API code automatically.",
  "Kavia’s mission is to make development creative and fast.",
  "Kavia AI cuts the time to deliver MVPs from weeks to hours.",
  "Kavia suggests architectural improvements to reduce technical debt.",
  "Kavia’s models are continuously trained on new codebases.",
  "Kavia offers intelligent bug fixing and regression tests.",
  "Kavia gives instant feedback on code changes before deployment.",
  "Kavia supports full-stack web, mobile, and cloud applications.",
  "Kavia’s brand color is a refreshing blue called Kavia Blue.",
  "Kavia understands dependencies between components and services.",
  "Kavia's documentation generator keeps project docs always up-to-date.",
  "Kavia’s interface integrates code suggestions and review together.",
  "Kavia helps teams comply with security and privacy requirements.",
  "Kavia offers visual QA and design system enforcement automatically.",
  "Kavia can modernize legacy apps with minimal disruption.",
  "Kavia makes it easy to analyze, refactor, and enhance codebases.",
  "Kavia’s AI can interpret complex user stories and acceptance criteria.",
  "Kavia generates functional tests to verify application behavior.",
  "Kavia’s platform can be used by both coders and business analysts.",
  "Kavia makes large-scale code migrations possible with one prompt.",
  "With Kavia AI, code is always explainable and reproducible.",
  "Kavia offers both cloud and on-premise deployment options.",
  "Kavia is trusted by technology leaders worldwide.",
  "Kavia's benefit is freeing engineers to focus on creativity.",
  "The Kavia developer console supports real-time code previews.",
  "Kavia’s insight engine recommends optimization opportunities.",
  "Kavia identifies unreachable or dead code and suggests actions.",
  "You can generate API docs instantly via Kavia.",
  "Kavia fosters better collaboration between teams and stakeholders.",
  "Kavia was founded by a team passionate about developer experience.",
  "Kavia helps reduce context switching and repetitive work.",
  "Kavia AI empowers product and engineering teams alike.",
  "Kavia’s AI audit can flag risky coding patterns early.",
  "Kavia reduces bottlenecks by automating routine engineering tasks.",
  "Kavia supports instant rollbacks with explainable change history.",
  "Kavia detects code smells and anti-patterns as you type.",
  "Kavia’s natural language interface is easy for everyone.",
  "Kavia can scaffold new projects with consistent architecture.",
  "Kavia tracks the evolution of your codebase over time.",
  "Kavia’s assistant can suggest code reviews and improvements.",
  "Kavia handles integration with modern API ecosystems.",
  "Kavia’s release management tools automate deployment steps.",
  "Kavia AI: Helping tomorrow’s software come alive, today.",
  "Kavia can be integrated with Slack, Jira, and popular developer tools.",
  "Kavia offers a demo sandbox for trying out AI-powered coding.",
  "Kavia’s output always includes in-code documentation and tips.",
  "Kavia adapts to project conventions and team style guides.",
  "Kavia makes setting up CI/CD pipelines fast and easy.",
  "Kavia is built to scale with startups and large enterprises alike.",
  "Kavia’s vision: Code creation, explained, accelerated, evolved."
];
// Each sample is 7-14 words so even short typing tests will be varied and on-brand.

const NUM_FACTS_PER_TEST = 10; // Number of sentences (samples) per test

// -- Helper function to draw a new shallow-random, non-repeating sample subset --
function pickRandomSamples(array, count) {
  // Fisher-Yates shuffle and slice
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

const COLORS = {
  primary: '#71def4',
  error: '#f96262',
  accent: '#f4a357',
  correct: '#64c672',
  text: '#282c34',
  background: '#fff',
};

/**
 * Typing Speed Tester main React component.
 * Records WPM, accuracy, and tracks & displays high score (highest WPM) using localStorage.
 */
// PUBLIC_INTERFACE
function App() {
  // --- Typing Test State ---
  const [wordList, setWordList] = useState([]);
  const [input, setInput] = useState('');
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Metrics
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [typedWords, setTypedWords] = useState([]);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // == Supabase User/Profile/Leaderboard ==
  const [supabaseUser, setSupabaseUser] = useState(null);    // supabase user object
  const [userProfile, setUserProfile] = useState(null);      // {id, email, username, high_score}
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authFormMode, setAuthFormMode] = useState("signin");  // or "signup"
  const [supabaseHighScore, setSupabaseHighScore] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [inviter, setInviter] = useState(null);

  // --- Local fallback high score (for anonymous users) ---
  const [highScore, setHighScore] = useState(() => {
    const saved = window.localStorage.getItem('highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const inputRef = useRef();
  const errorAudioRef = useRef(null);
  const [errorFlash, setErrorFlash] = useState(false);

  // --- On mount: setup Supabase listeners for auth (also for invite link check) ---
  useEffect(() => {
    const url = new URL(window.location.href);
    const invite = url.searchParams.get("invite");
    if (invite && typeof invite === "string") {
      getInviterProfile(invite).then(setInviter).catch(() => {});
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setSupabaseUser(user || null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user || null);
    });
    return () => subscription?.subscription?.unsubscribe();
    // eslint-disable-next-line
  }, []);

  // --- On Supabase user state change, load profile
  useEffect(() => {
    if (!supabaseUser) {
      setUserProfile(null);
      setSupabaseHighScore(null);
      setInviteLink(null);
      return;
    }
    (async () => {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
      setSupabaseHighScore(profile && profile.high_score ? profile.high_score : 0);
      setInviteLink(generateInviteLink(profile.id));
    })();
  }, [supabaseUser]);

  // --- Word Randomization (runs once at mount or reset) ---
  useEffect(() => {
    resetTest();
    // eslint-disable-next-line
  }, []);

  // --- Timer Update ---
  useEffect(() => {
    let interval = null;
    if (started && !finished) {
      interval = setInterval(() => {
        setElapsed((prev) => Date.now() - startTime);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [started, finished, startTime]);

  // --- Leaderboard fetch (when login or after score save) ---
  useEffect(() => {
    setLeaderboardLoading(true);
    fetchLeaderboard(10).then((d) => setLeaderboard(d || [])).catch(() => setLeaderboard([])).finally(() => setLeaderboardLoading(false));
  }, [supabaseUser]);

  // --- Update WPM & Accuracy on input ---
  useEffect(() => {
    // WPM: (correct words) / (elapsed min)
    const minutes = elapsed / 60000;
    const grossWPM = minutes > 0 ? (typedWords.length / minutes) : 0;
    setWpm(Math.round(grossWPM));
    const totalKey = correctChars + incorrectChars;
    setAccuracy(totalKey > 0 ? Math.round((correctChars / totalKey) * 100) : 100);
  }, [elapsed, typedWords, correctChars, incorrectChars]);

  // --- Start typing on first key + error feedback ---
  const handleInput = (e) => {
    if (finished) return;
    if (!started) {
      setStarted(true);
      setStartTime(Date.now());
      setElapsed(0);
      setInput(e.target.value);
      return;
    }
    // Disallow spaces and linebreaks outside end of word
    if (e.target.value.endsWith(' ') || e.target.value.endsWith('\n')) {
      const currWord = wordList[activeWordIdx];
      setTypedWords((tw) => [
        ...tw,
        {
          typed: input.trim(),
          correct: input.trim() === currWord,
          expected: currWord,
          charResults: computeCharResults(currWord, input.trim()),
        }
      ]);
      if (activeWordIdx + 1 >= wordList.length) {
        finishTest();
        return;
      }
      setActiveWordIdx((idx) => idx + 1);
      setInput('');
      setCharIdx(0);
      return;
    }

    // --- Error detect/sound/animation
    const currWord = wordList[activeWordIdx] || '';
    const newValue = e.target.value;
    let isError = false;
    if (newValue.length > 0) {
      if (currWord && currWord.length >= newValue.length) {
        if (
          newValue[newValue.length - 1] &&
          currWord[newValue.length - 1] !== newValue[newValue.length - 1]
        ) {
          isError = true;
        }
      }
      if (currWord && newValue.length > currWord.length) {
        isError = true;
      }
    }
    if (isError) {
      if (errorAudioRef.current) {
        errorAudioRef.current.currentTime = 0;
        errorAudioRef.current.play();
      }
      setErrorFlash(true);
      setTimeout(() => setErrorFlash(false), 110);
    }
    setCharIdx(e.target.value.length);
    setInput(e.target.value);
  };

  // --- Live per-letter correctness calculation for current word ---
  function computeCharResults(word, userInput) {
    const arr = [];
    for (let i = 0; i < Math.max(word.length, userInput.length); i++) {
      if (userInput[i] == null) {
        arr.push(null);
      } else if (userInput[i] === word[i]) {
        arr.push('correct');
      } else {
        arr.push('incorrect');
      }
    }
    return arr;
  }

  // --- On input change, update char correctness metrics ---
  useEffect(() => {
    if (finished || !started) return;
    const currWord = wordList[activeWordIdx] || '';
    let correct = 0, incorrect = 0;
    for (let i = 0; i < input.length; i++) {
      if (i < currWord.length) {
        if (input[i] === currWord[i]) correct++;
        else incorrect++;
      } else {
        incorrect++;
      }
    }
    setCorrectChars(
      typedWords.reduce((total, w) => total + w.charResults.filter(x => x === 'correct').length, 0) + correct
    );
    setIncorrectChars(
      typedWords.reduce((total, w) => total + w.charResults.filter(x => x === 'incorrect').length, 0) + incorrect
    );
    // eslint-disable-next-line
  }, [input, activeWordIdx]);

  // --- End test ---
  async function finishTest() {
    setFinished(true);
    setShowSummary(true);
    setElapsed(Date.now() - startTime);
    // Process last word (could be partial)
    const currWord = wordList[activeWordIdx];
    setTypedWords((tw) => [
      ...tw,
      {
        typed: input.trim(),
        correct: input.trim() === currWord,
        expected: currWord,
        charResults: computeCharResults(currWord, input.trim()),
      }
    ]);
    setInput('');
    setCharIdx(0);

    setTimeout(async () => {
      const latestWpm = wpm;
      if (latestWpm > highScore) {
        window.localStorage.setItem('highScore', String(latestWpm));
        setHighScore(latestWpm);
      }
      if (supabaseUser && userProfile && latestWpm > (supabaseHighScore || 0)) {
        try {
          await updateUserHighScore(latestWpm);
          setSupabaseHighScore(latestWpm);
        } catch (_e) {}
      }
      if (supabaseUser && userProfile) {
        try { await saveScore(latestWpm); } catch (_e) {}
      }
      setLeaderboardLoading(true);
      fetchLeaderboard(10).then((d) => setLeaderboard(d || [])).catch(() => setLeaderboard([])).finally(() => setLeaderboardLoading(false));
    }, 0);
  }

  // --- Reset Functionality ---
  // PUBLIC_INTERFACE
  function resetTest() {
    const newSamples = pickRandomSamples(KAVIA_FACTS, NUM_FACTS_PER_TEST)
      .flatMap(sentence => sentence.split(' '));
    setWordList(newSamples);
    setInput('');
    setActiveWordIdx(0);
    setCharIdx(0);
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setElapsed(0);
    setShowSummary(false);
    setCorrectChars(0);
    setIncorrectChars(0);
    setTypedWords([]);
    setWpm(0);
    setAccuracy(100);
    const saved = window.localStorage.getItem('highScore');
    setHighScore(saved !== null ? parseInt(saved, 10) : 0);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  }

  // --- UI helpers: Playful, Animated, Colorful
  function renderWord(word, idx) {
    const isActive = idx === activeWordIdx;
    let rendered = [];
    if (isActive && !finished) {
      const charResults = computeCharResults(word, input);
      rendered = word.split('').map((char, i) => {
        let style = {};
        if (charResults[i] === 'correct') {
          style = { color: COLORS.correct, fontWeight: 'bold', background: 'rgba(113,222,244,0.08)', transition: 'color 0.13s, background 0.13s'};
        } else if (charResults[i] === 'incorrect') {
          style = {
            color: COLORS.error,
            textDecoration: 'underline',
            background: 'rgba(249,98,98,0.12)',
            animation: errorFlash ? 'flashError 0.11s' : undefined,
            borderRadius: '4px',
            transition: 'color 0.11s, background 0.13s'
          };
        }
        return <span key={i} style={style}>{char}</span>;
      });
      if (input.length > word.length) {
        for (let j = word.length; j < input.length; j++) {
          rendered.push(
            <span key={'extra'+j} style={{
              color: COLORS.error,
              opacity: 0.5,
              fontStyle: 'italic',
              background: errorFlash ? 'rgba(249,98,98,0.15)' : 'none',
              padding: '0 2px',
              animation: errorFlash ? 'pulseShake 0.13s' : undefined
            }}>{input[j]}</span>
          );
        }
      }
      rendered.push(<span key="cursor" className="blinking-cursor">|</span>);
    } else {
      if (typedWords[idx]) {
        rendered = word.split('').map((char, i) => {
          const res = typedWords[idx].charResults?.[i];
          let style = {};
          if (res === 'correct') style = { color: COLORS.correct, fontWeight: 'bold'};
          else if (res === 'incorrect') style = { color: COLORS.error, textDecoration: 'underline'};
          else style = {};
          return <span key={i} style={style}>{char}</span>;
        });
        const typed = typedWords[idx].typed || '';
        if (typed.length > word.length) {
          for (let k = word.length; k < typed.length; k++) {
            rendered.push(<span key={'typed'+k} style={{
              color: COLORS.error, opacity:0.5, fontStyle:'italic'
            }}>{typed[k]}</span>);
          }
        }
      } else {
        rendered = word.split('').map((char, i) => <span key={i}>{char}</span>);
      }
    }
    return (
      <span
        className={'word'+(isActive?' activeWordAni':'')}
        style={{
          margin: '0 7px',
          padding: '2px 4px',
          borderRadius: 4,
          background: isActive ? (errorFlash?'rgba(249,98,98,.08)':'rgba(113,222,244,.14)') : 'none',
          fontSize: isActive ? 22 : 18,
          fontWeight: isActive ? 550 : 400,
          border: isActive ? `1.7px solid ${COLORS.primary}` : 'none',
          boxShadow: isActive
            ? (errorFlash
              ? `0 2px 8px 0 rgba(249,98,98,0.18)`
              : `0px 1.5px 0px 0px ${COLORS.primary}10`)
            : 'none',
          transition: 'background 0.17s, box-shadow 0.16s, border 0.14s, font-size 0.10s'
        }}>{rendered}</span>
    );
  }

  // --- Render Summary Dialog ---
  function SummaryDialog() {
    const timeSec = Math.round(elapsed / 1000);
    return (
      <div className="summary-dialog" style={{
        position: 'fixed', left:0, top:0, width:'100%', height:'100%',
        background: 'rgba(255,255,255,0.8)', zIndex: 10,
        display:'flex', alignItems:'center', justifyContent:'center',
        animation: 'fadein 0.27s cubic-bezier(0.72,0,0.24,1)'
      }}>
        <div style={{
          padding:42,
          background:'#fff',
          borderRadius:22,
          boxShadow: '0 6px 32px 0 rgba(0,0,0,0.09), 0 3px 12px 0 rgba(113,222,244,0.08)',
          minWidth:320,
          maxWidth:410,
          textAlign:'center',
          animation: 'bounceIn 0.48s cubic-bezier(.55,1.5,.45,1)'
        }}>
          <h2 style={{
            color:COLORS.primary,
            marginTop:0,
            marginBottom:24,
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>Test Complete</h2>
          <div className="summary-metrics" style={{marginBottom:24}}>
            <div style={{marginBottom:12}}>WPM: <b>{wpm}</b></div>
            <div style={{marginBottom:10, color: COLORS.accent, fontWeight:500}}>
              🏆 High Score: {supabaseHighScore != null && supabaseHighScore > highScore
                ? supabaseHighScore : highScore
              } WPM
            </div>
            <div style={{marginBottom:12}}>Accuracy: <b>{accuracy}%</b></div>
            <div>Time: <b>{timeSec}s</b></div>
          </div>
          {supabaseUser && inviteLink && (
            <div style={{margin:"9px 0 12px 0", textAlign:'center', fontSize:14}}>
              <strong>Invite a friend:</strong><br />
              <input type="text" value={inviteLink} onFocus={e=>e.target.select()} readOnly style={{width:"99%",fontSize:12,margin:"5px auto 5px auto"}} />
              <button
                className="primary-btn"
                style={{ fontSize:13, margin: '4px 0 0 0', padding: "7px 2vw", borderRadius:6 }}
                onClick={()=>{
                  navigator.clipboard.writeText(inviteLink);}}
              >Copy Link</button>
            </div>
          )}
          <button className="reset-btn"
            style={{
              background: 'linear-gradient(110deg,#71def4 66%,#f4a357 133%)',
              color:'#fff', border: 'none', fontWeight:600,
              fontSize:18, letterSpacing:'0.13em', padding:'15px 48px', borderRadius:10, marginTop:16, cursor:'pointer'
            }}
            onClick={resetTest}
          >New Test</button>
        </div>
      </div>
    );
  }

  // --- Styling ---
  const containerStyles = {
    minHeight: '100vh',
    background: COLORS.background,
    color: COLORS.text,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent:'center',
    fontFamily: 'system-ui,-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    padding: 0,
    transition: 'all 0.2s',
  };

  const cardStyles = {
    background:'#fff',
    borderRadius: 18,
    padding: '42px 52px 36px 52px',
    boxShadow: '0 10px 40px 0 rgba(113,222,244,0.090), 0 2px 8px 0 rgba(244,163,87,0.08)',
    maxWidth: 740,
    width: '98%',
    marginTop:70,
    marginBottom:36,
    display:'flex',
    flexDirection:'column',
    alignItems:'center',
    gap:24
  };

  const indicatorStyles = {
    display:'flex',
    flexDirection:'row',
    justifyContent:'center',
    gap:28,
    margin:'18px 0 0 0'
  };

  const metricLabel = {
    color: COLORS.accent,
    fontWeight: 700,
    fontSize:18,
    marginRight:6
  };

  const inputStyles = {
    fontSize:28,
    lineHeight:'34px',
    letterSpacing:'1.3px',
    minWidth:220,
    outline:'none',
    padding:'17px 22px',
    marginTop:8,
    marginBottom:0,
    border:`2.7px solid ${errorFlash ? COLORS.error : COLORS.primary}`,
    borderRadius:13,
    boxShadow: errorFlash
      ? '0 0 0 6px rgba(249,98,98,0.10),0 2px 18px 0 rgba(244,163,87,0.04)'
      : '0 2px 18px 0 rgba(113,222,244,0.07)',
    color:COLORS.text,
    background: errorFlash ? '#f9eff1' : '#f8fafd',
    textAlign: 'center',
    fontWeight: 600,
    width: '340px',
    transition: 'box-shadow 0.15s, border 0.18s, background 0.15s'
  };

  const resetBtnStyles = {
    background: 'linear-gradient(96deg,#71def4 55%,#f4a357 115%)',
    color:'#fff',
    border:'none',
    fontWeight:700,
    fontSize:17,
    letterSpacing:'0.12em',
    padding:'17px 40px',
    borderRadius:10,
    marginTop:14,
    cursor:'pointer',
    boxShadow: '0 4px 18px 0 rgba(113,222,244,0.13)',
    transition:'background 0.16s, transform 0.19s'
  };

  // --- Auth UI ---
  function AuthForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    async function handleSubmit(e) {
      e.preventDefault();
      setAuthLoading(true);
      setAuthError("");
      try {
        if (authFormMode === "signin") {
          const { error } = await signInWithEmail(email, password);
          if (error) throw error;
        } else {
          const { error } = await signUpWithEmail(email, password);
          if (error) throw error;
        }
        setShowAuthForm(false);
      } catch (e) {
        setAuthError(e?.message || "Auth failed.");
      }
      setAuthLoading(false);
    }

    return (
      <div style={{
        position:'fixed', left:0,top:0,width:'100vw',height:'100vh',zIndex:20,
        background:'rgba(255,255,255,0.6)', display:'flex',alignItems:'center',justifyContent:'center'
      }}>
        <form onSubmit={handleSubmit} style={{
          background:'#fafbfd',borderRadius:16,padding:"28px 30px 24px 30px",boxShadow:'0 4px 18px 0 rgba(113,222,244,0.11)',minWidth:320
        }}>
          <h3 style={{marginTop:0,color:COLORS.primary,marginBottom:12}}>{authFormMode === "signin" ? "Sign In" : "Sign Up"}</h3>
          <label style={{fontWeight:500,fontSize:15}}>
            Email:<br />
            <input required type="email" value={email}
              style={{width:'100%',margin:'5px 0 10px 0',padding:8,borderRadius:6,border:'1.3px solid #ddd'}}
              disabled={authLoading}
              onChange={e=>setEmail(e.target.value)} />
          </label>
          <label style={{fontWeight:500,fontSize:15}}>
            Password:<br />
            <input required type="password" value={password}
              style={{width:'100%',margin:'5px 0 10px 0',padding:8, borderRadius:6, border:'1.3px solid #ddd'}}
              disabled={authLoading}
              onChange={e=>setPassword(e.target.value)} />
          </label>
          {authError && (<div style={{color:COLORS.error, fontSize:14,marginBottom:10}}>{authError}</div>)}
          <button
            type="submit"
            className="primary-btn"
            style={{width:'96%', marginTop:8,marginBottom:2, fontSize:16,borderRadius:7}}
            disabled={authLoading}
          >{authFormMode === "signin" ? "Sign In" : "Sign Up"}</button>
          <button
            type="button"
            style={{background:"none",border:"none",marginTop:7,color:COLORS.primary,textDecoration:'underline',cursor:'pointer'}}
            onClick={()=>setAuthFormMode(authFormMode==="signin" ? "signup" : "signin")}
            disabled={authLoading}
          >{authFormMode === "signin" ? "Need an account? Sign Up" : "Have an account? Sign In"}</button>
          <button
            type="button"
            style={{background:"none",border:"none",marginTop:4, color: "#888",fontSize:13,cursor:"pointer",float:'right'}}
            onClick={()=>{setShowAuthForm(false);setAuthError("");}}
            disabled={authLoading}
          >Close</button>
        </form>
      </div>
    );
  }

  // --- Render ---
  return (
    <div style={containerStyles}>
      {showAuthForm && <AuthForm />}
      <main style={cardStyles} aria-label="Typing speed test main card">
        <h1 style={{
          color:COLORS.primary,
          background: 'linear-gradient(90deg,#71def4, #f4a357 38%, #f9626221 100%)',
          WebkitBackgroundClip:'text',
          WebkitTextFillColor: 'transparent',
          fontWeight:900,
          letterSpacing:'0.07em',
          margin:'0 0 14px 0',
          fontSize:40,
          filter: 'drop-shadow(0 5px 8px rgba(113,222,244,0.07))'
        }}>Typing Speed Tester</h1>
        {/* --- Supabase Auth/Profile -- */}
        <div style={{display:'flex',width:'100%',flexDirection:'row',justifyContent:'flex-end',marginBottom:-8}}>
          {!supabaseUser
            ? (
              <button className="primary-btn"
                style={{...resetBtnStyles,fontSize:13,padding:"7px 2vw",margin:0,borderRadius:6,float:'right'}}
                onClick={()=>{setShowAuthForm(true);setAuthFormMode("signin");}}>Sign In / Sign Up</button>
            ) : (
              <div style={{fontSize:14,display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
                {userProfile && (
                  <span>👤 {userProfile.username ? userProfile.username : userProfile.email}</span>
                )}
                <button className="reset-btn"
                  style={{...resetBtnStyles,fontSize:13,padding:"6px 2vw",background:COLORS.error,borderRadius:6}}
                  onClick={() => {signOut();}}>Sign Out</button>
              </div>
            )
          }
        </div>
        {supabaseUser && (
          <div style={{
            width:'100%',margin:"6px 0 5px 0",background:"rgba(113,222,244,0.048)",borderRadius:8,padding:"6px 2vw",fontSize:15,color:"#2f343a"
          }}>
            <span style={{fontWeight:700}}>Your Profile</span>
            <div>Email: <b>{userProfile?.email}</b></div>
            {userProfile && <div>🏆 High Score: <b>{supabaseHighScore != null ? supabaseHighScore : 0} WPM</b></div>}
          </div>
        )}
        {/* Show invited-by info if invite param in URL */}
        {inviter && (
          <div style={{
            width:'100%',margin:"10px 0 5px 0",background:"rgba(244,163,87,0.08)",borderRadius:8,padding:"7px 2vw",fontSize:15
          }}>
            <b>You were invited by:</b> {inviter.username || inviter.email}
            <span style={{fontWeight:400,fontSize:14,marginLeft:7}}>🏆 High Score: {inviter.high_score} WPM</span>
          </div>
        )}
        <div style={{
          fontSize:18,
          color: COLORS.accent,
          fontWeight:700,
          marginBottom: 8,
          textShadow: '0 1.5px 10px rgba(244,163,87,0.09)'
        }}>
          🏆 High Score: {supabaseHighScore != null && supabaseHighScore > highScore
            ? supabaseHighScore : highScore
          } WPM
        </div>
        <div style={{
          margin:'0 0 2px 0', color:'#888', fontWeight:400, letterSpacing:'0.02em',fontSize:17
        }}>How fast can you type?</div>
        <div
          className={errorFlash ? "words-row error-flash" : "words-row"}
          tabIndex={-1}
          aria-label="Current typing words"
          style={{
            padding:'26px 0', minHeight:48, marginBottom:20, display: 'flex',
            flexWrap:'wrap', justifyContent:'center',
            borderBottom:`1px solid #e9ecef`, userSelect: 'none',
            background: errorFlash
              ? 'linear-gradient(90deg,#fff 60%,#f9626218 100%)'
              : 'rgba(113,222,244,0.02)',
            transition: 'background 0.15s',
            animation: errorFlash ? 'pulseShake 0.20s' : undefined
          }}>
          {/* --- Word display --- */}
          {wordList.map((w, i) => (
            <span key={i} style={{display:'inline-block'}}>
              {renderWord(w, i)}
            </span>
          ))}
        </div>
        <div
          style={{
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            justifyContent:'center',
            width: '100%',
            minHeight: '88px', // input + indicators
            margin: '0 0 4px 0'
          }}
        >
          <input
            ref={inputRef}
            spellCheck={false}
            autoCorrect="off"
            autoFocus
            disabled={finished}
            type="text"
            value={input}
            onChange={handleInput}
            style={inputStyles}
            placeholder={started ? "" : "Start typing here..."}
            onKeyDown={e => {
              if (e.key === "Enter" && started && !finished) {
                handleInput({target:{value: input + " "}})
                e.preventDefault();
              }
            }}
            aria-label="Typing test input"
            tabIndex={0}
            aria-describedby="typing-tips"
          />
          <audio ref={errorAudioRef} src={errorBeep} preload="auto" tabIndex={-1}></audio>
          <div style={indicatorStyles}>
            <span><span style={metricLabel}>WPM</span>
              <span className="animated-value" aria-live="polite">{wpm}</span>
            </span>
            <span><span style={metricLabel}>Accuracy</span>
              <span className="animated-value" aria-live="polite">{accuracy}%</span>
            </span>
            <span><span style={metricLabel}>Words</span>
              <span className="animated-value" aria-live="polite">{typedWords.length}/{wordList.length}</span>
            </span>
          </div>
        </div>
        <button
          className="reset-btn"
          style={resetBtnStyles}
          onClick={resetTest}
          aria-label="Reset typing test"
        >
          🔄 Reset
        </button>
        <div style={{
          display:'block', marginTop:10, color:'#abb8b8',
          fontWeight:400, fontSize:14, opacity:0.92
        }} id="typing-tips">
          Type each word and press space. Incorrect letters turn
          <span style={{color:COLORS.error,fontWeight:600,padding:'0 2px',borderRadius:'4px',background:'#f9626214'}}>red</span>.
        </div>
        {/* --- Leaderboard Card --- */}
        <div
          aria-label="Global leaderboard"
          style={{
            margin:'29px auto 3px auto',width:'100%',maxWidth:510,background:'#f7fafd',
            border:'1px solid #eef6fc',borderRadius:19,boxShadow:'0 4px 16px 0 rgba(113,222,244,0.08)',
            padding:'18px 10px 15px 10px',
            animation: 'fadein 0.38s cubic-bezier(.8,.08,.6,1)'
          }}>
          <div style={{fontWeight:700,marginBottom:8, fontSize:18, color: COLORS.primary}}>🌎 Global Leaderboard</div>
          {leaderboardLoading ? <span>Loading...</span> : leaderboard.length === 0
            ? <span style={{color:"#bbb"}}>No scores yet.</span>
            : (
              <table style={{width:'99%',fontSize:15, background:"none", borderSpacing: 0, textAlign: 'left',marginTop:4}}>
                <thead>
                  <tr style={{color:COLORS.accent, fontSize:15}}>
                    <th style={{padding:"2px 7px 2px 3px"}}>#</th>
                    <th style={{padding:"2px 8px"}}>User</th>
                    <th style={{padding:"2px 8px"}}>High Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.id}>
                      <td style={{padding:"2px 7px 2px 3px",fontWeight:600}}>{idx+1}</td>
                      <td style={{padding:"2px 8px"}}>
                        {entry.username ? entry.username : entry.email}
                        {supabaseUser && supabaseUser.id === entry.id &&
                          <span style={{color:COLORS.primary, fontSize:12,paddingLeft:4,fontWeight:700}}> (You) </span>
                        }
                      </td>
                      <td style={{padding:"2px 8px",fontWeight:600,fontSize:15}}>{entry.high_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </main>
      <footer
        aria-label="App footer"
        style={{
          textAlign:'center', color:'#b0b0b0', fontSize:13,marginTop:18,
          animation: 'fadein 0.9s cubic-bezier(.5,0,.4,1)'
        }}>
        Typing Speed Tester &middot; <a href="https://github.com/" style={{color:COLORS.primary,textDecoration:'none'}}>GitHub</a>
      </footer>
      {/* --- Summary Dialog --- */}
      {showSummary && <SummaryDialog />}
      {/* --- Animations CSS (injected for visual feedback) --- */}
      <style>{`
        @keyframes flashError {
          0%   { background: rgba(249,98,98,0.19);}
          99%  { background: rgba(249,98,98,0.1);}
          100% { background: inherit;}
        }
        .words-row.error-flash {
          animation: pulseShake 0.18s;
          background: linear-gradient(90deg,#fff 80%,#f9626214 100%);
        }
        @keyframes pulseShake {
          0% { transform: translateX(0px);}
          16% { transform: translateX(-6px);}
          34% { transform: translateX(7px);}
          55% { transform: translateX(-4px);}
          75% { transform: translateX(4px);}
          100% { transform: translateX(0px);}
        }
        .activeWordAni {
          animation: bounceIn 0.41s cubic-bezier(.65,1.46,.58,1);
        }
        @keyframes bounceIn {
          0% {transform: scale(0.92) translateY(13px); opacity:0;}
          40%{transform: scale(1.07) translateY(-4px);}
          67%{transform: scale(0.96) translateY(1px);}
          87%{transform: scale(1.01);}
          100%{transform: scale(1.0) translateY(0); opacity:1;}
        }
        .reset-btn, .primary-btn {
          transition: all 0.16s cubic-bezier(.75,.04,.42,1.25);
        }
        .reset-btn:hover, .primary-btn:hover {
          transform: translateY(-2.5px) scale(1.05) rotateZ(-1deg);
          filter: brightness(1.12);
        }
        .animated-value {
          animation: popscale 0.24s cubic-bezier(.6,2,.42,.95);
        }
        @keyframes popscale {
          0% {transform:scale(1.29);}
          65%{transform:scale(0.97);}
          92%{transform:scale(1.04);}
          100%{transform:scale(1);}
        }
      `}</style>
    </div>
  );
}

export default App;
