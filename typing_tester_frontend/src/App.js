import React, { useEffect, useRef, useState } from 'react';
import './App.css';

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
// --- Configuration ---
const WORD_LIST = [
  'code', 'react', 'random', 'highlight', 'keyboard', 'app', 'speed',
  'accuracy', 'measure', 'display', 'summary', 'reset', 'logic', 'modern',
  'minimal', 'theme', 'palette', 'feature', 'test', 'typing', 'letter',
  'track', 'timer', 'dialog', 'simple', 'frontend', 'backend', 'project',
  'component', 'container'
];

// Set test constraints
const NUM_WORDS = 30; // Number of words per test

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

  // --- On mount: setup Supabase listeners for auth (also for invite link check) ---
  useEffect(() => {
    // Parse out invite param if available when app mounts
    const url = new URL(window.location.href);
    const invite = url.searchParams.get("invite");
    if (invite && typeof invite === "string") {
      getInviterProfile(invite).then(setInviter).catch(() => {});
    }

    // Check current session on init
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

  // --- Start typing on first key ---
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
      // Commit this word's result
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
    // Track char index for highlighting
    setCharIdx(e.target.value.length);
    setInput(e.target.value);
  };

  // --- Live per-letter correctness calculation for current word ---
  function computeCharResults(word, userInput) {
    const arr = [];
    for (let i = 0; i < Math.max(word.length, userInput.length); i++) {
      if (userInput[i] == null) {
        arr.push(null); // untyped
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

    // --- High Score Calculation (after state settles) ---
    setTimeout(async () => {
      const latestWpm = wpm; // WPM at test end (should be set via effect)
      if (latestWpm > highScore) {
        window.localStorage.setItem('highScore', String(latestWpm));
        setHighScore(latestWpm);
      }
      // Supabase high score & score persistence
      if (supabaseUser && userProfile && latestWpm > (supabaseHighScore || 0)) {
        try {
          await updateUserHighScore(latestWpm);
          setSupabaseHighScore(latestWpm);
        } catch (_e) {}
      }
      if (supabaseUser && userProfile) {
        try { await saveScore(latestWpm); } catch (_e) {}
      }
      // Update leaderboard after score save
      setLeaderboardLoading(true);
      fetchLeaderboard(10).then((d) => setLeaderboard(d || [])).catch(() => setLeaderboard([])).finally(() => setLeaderboardLoading(false));
    }, 0);
  }

  // --- Reset Functionality ---
  // PUBLIC_INTERFACE
  function resetTest() {
    // Shuffle and pick NUM_WORDS words
    const shuffled = [...WORD_LIST].sort(() => 0.5 - Math.random());
    setWordList(shuffled.slice(0, NUM_WORDS));
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
    // Reset high score from localStorage (handles manual reset)
    const saved = window.localStorage.getItem('highScore');
    setHighScore(saved !== null ? parseInt(saved, 10) : 0);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  }

  // --- UI helpers ---
  function renderWord(word, idx) {
    const isActive = idx === activeWordIdx;
    let rendered = [];
    if (isActive && !finished) {
      // Highlight each letter according to current input
      const charResults = computeCharResults(word, input);
      rendered = word.split('').map((char, i) => {
        let style = {};
        if (charResults[i] === 'correct') {
          style = { color: COLORS.correct, fontWeight: 'bold', background: 'rgba(113,222,244,0.08)' };
        } else if (charResults[i] === 'incorrect') {
          style = { color: COLORS.error, textDecoration: 'underline', background: 'rgba(249,98,98,0.10)' };
        }
        return <span key={i} style={style}>{char}</span>;
      });
      // Show any extra letters typed (overrun)
      if (input.length > word.length) {
        for (let j = word.length; j < input.length; j++) {
          rendered.push(
            <span key={'extra'+j} style={{
              color: COLORS.error,
              opacity: 0.5,
              fontStyle: 'italic'
            }}>{input[j]}</span>
          );
        }
      }
      // Add "cursor"
      rendered.push(<span key="cursor" className="blinking-cursor">|</span>);
    } else {
      // For completed words, show correct/incorrect
      if (typedWords[idx]) {
        rendered = word.split('').map((char, i) => {
          const res = typedWords[idx].charResults?.[i];
          let style = {};
          if (res === 'correct') style = { color: COLORS.correct, fontWeight: 'bold' };
          else if (res === 'incorrect') style = { color: COLORS.error, textDecoration: 'underline' };
          else style = {};
          return <span key={i} style={style}>{char}</span>;
        });
        // Show typo overrun if present
        const typed = typedWords[idx].typed || '';
        if (typed.length > word.length) {
          for (let k = word.length; k < typed.length; k++) {
            rendered.push(<span key={'typed'+k} style={{
              color: COLORS.error, opacity:0.5, fontStyle:'italic'
            }}>{typed[k]}</span>);
          }
        }
      } else {
        // Upcoming words
        rendered = word.split('').map((char, i) => <span key={i}>{char}</span>);
      }
    }
    return (
      <span
        className="word"
        style={{
          margin: '0 7px',
          padding: '2px 4px',
          borderRadius: 4,
          background: isActive ? 'rgba(113,222,244,.14)' : 'none',
          fontSize: isActive ? 20 : 18,
          fontWeight: isActive ? 500 : 400,
          border: isActive ? `1.5px solid ${COLORS.primary}` : 'none',
          boxShadow: isActive ? `0px 1.5px 0px 0px ${COLORS.primary}08` : 'none'
        }}>{rendered}</span>
    );
  }

  // --- Render Summary Dialog ---
  function SummaryDialog() {
    const timeSec = Math.round(elapsed / 1000);
    // Show invite prompt after each test if logged in
    return (
      <div className="summary-dialog" style={{
        position: 'fixed', left:0, top:0, width:'100%', height:'100%',
        background: 'rgba(255,255,255,0.8)', zIndex: 10,
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        <div style={{
          padding:32,
          background:'#fff',
          borderRadius:14,
          boxShadow: '0 6px 32px 0 rgba(0,0,0,0.08), 0 1.5px 8px 0 rgba(113,222,244,0.04)',
          minWidth:320,
          maxWidth:410
        }}>
          <h2 style={{color:COLORS.primary,marginTop:0,marginBottom:24, fontWeight: '700', letterSpacing: '0.05em'}}>Test Complete</h2>
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
                style={{ ...resetBtnStyles, fontSize:13, margin: '4px 0 0 0', padding: "7px 2vw", borderRadius:6 }}
                onClick={()=>{
                  navigator.clipboard.writeText(inviteLink);}}
              >Copy Link</button>
            </div>
          )}
          <button className="reset-btn" style={resetBtnStyles} onClick={resetTest}>New Test</button>
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
    borderRadius: 14,
    padding: '36px 40px 32px 40px',
    boxShadow: '0 2px 12px 0 rgba(113,222,244,0.10), 0 1.5px 8px 0 rgba(244,163,87,0.07)',
    maxWidth: 680,
    width: '95%',
    marginTop:60,
    marginBottom:30,
    display:'flex',
    flexDirection:'column',
    alignItems:'center',
    gap:20
  };

  const indicatorStyles = {
    display:'flex',
    flexDirection:'row',
    justifyContent:'center',
    gap:22,
    margin:'18px 0 0 0'
  };

  const metricLabel = {
    color: COLORS.accent,
    fontWeight: 600,
    fontSize:14,
    marginRight:6
  };

  const inputStyles = {
    fontSize:18,
    lineHeight:'26px',
    letterSpacing:'1.5px',
    minWidth:120,
    outline:'none',
    padding:'9px 14px',
    marginTop:12,
    border:`1.5px solid ${COLORS.primary}`,
    borderRadius:8,
    boxShadow:'0 1.5px 6px 0 rgba(113,222,244,0.05)',
    color:COLORS.text,
    background:'#f8f9fa'
  };

  const resetBtnStyles = {
    background: COLORS.primary,
    color:'#fff',
    border:'none',
    fontWeight:600,
    fontSize:16,
    letterSpacing:'0.09em',
    padding:'13px 36px',
    borderRadius:8,
    marginTop:18,
    cursor:'pointer',
    boxShadow: '0 2px 8px 0 rgba(113,222,244,0.08)',
    transition:'background 0.18s, transform 0.13s'
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
      <main style={cardStyles}>
        <h1 style={{
          color:COLORS.primary, fontWeight:900, letterSpacing:'0.07em', margin:'0 0 14px 0', fontSize:36
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
        <div style={{ fontSize:17, color: COLORS.accent, fontWeight:600, marginBottom: 7 }}>
          🏆 High Score: {supabaseHighScore != null && supabaseHighScore > highScore
            ? supabaseHighScore : highScore
          } WPM
        </div>
        <div style={{
          margin:'0 0 2px 0', color:'#888', fontWeight:400, letterSpacing:'0.02em',fontSize:16
        }}>How fast can you type?</div>
        <div className="words-row" tabIndex={-1}
          style={{
            padding:'18px 0', minHeight:40, marginBottom:14, display: 'flex',
            flexWrap:'wrap', justifyContent:'center',
            borderBottom:`1px solid #e9ecef`, userSelect: 'none'
          }}>
          {/* --- Word display --- */}
          {wordList.map((w, i) => (
            <span key={i}>
              {renderWord(w, i)}
            </span>
          ))}
        </div>
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
              // Allow Enter as space if not finished
              handleInput({target:{value: input + " "}})
              e.preventDefault();
            }
          }}
          aria-label="Typing test input"
        />
        <div style={indicatorStyles}>
          <span><span style={metricLabel}>WPM</span>{wpm}</span>
          <span><span style={metricLabel}>Accuracy</span>{accuracy}%</span>
          <span><span style={metricLabel}>Words</span>{typedWords.length}/{NUM_WORDS}</span>
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
          fontWeight:400, fontSize:13, opacity:0.8
        }}>Type each word and press space. Incorrect letters turn <span style={{color:COLORS.error}}>red</span>.</div>
        {/* --- Leaderboard Card --- */}
        <div style={{
          margin:'25px auto 3px auto',width:'100%',maxWidth:510,background:'#f7fafd',
          border:'1px solid #eef6fc',borderRadius:15,boxShadow:'0 2px 18px 0 rgba(113,222,244,0.07)',
          padding:'18px 10px 15px 10px'
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
      <footer style={{
        textAlign:'center', color:'#b0b0b0', fontSize:13,marginTop:18
      }}>
        Typing Speed Tester &middot; <a href="https://github.com/" style={{color:COLORS.primary,textDecoration:'none'}}>GitHub</a>
      </footer>
      {/* --- Summary Dialog --- */}
      {showSummary && <SummaryDialog />}
    </div>
  );
}

export default App;
