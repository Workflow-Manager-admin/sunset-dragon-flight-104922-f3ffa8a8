import React, { useState } from "react";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import Game from "./Game";
// Removed any BatchedMesh import from three (was not present, safety measure)

// Theme colors for sunset style
const theme = {
  primary: "#FF6E40",
  secondary: "#8E24AA",
  accent: "#FFD740",
  sunsetGradient:
    "linear-gradient(135deg, #FF6E40 0%, #FFD740 75%, #8E24AA 100%)",
  text: "#fff",
};

const GlobalStyle = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.sunsetGradient};
    min-height: 100vh;
    margin: 0;
    font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
    overflow: hidden;
  }
`;

const CenteredContainer = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(0.5px);
  z-index: 1;
  position: relative;
`;

const FlyButton = styled.button`
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.text};
  font-size: 2.5rem;
  font-weight: bold;
  padding: 1rem 4rem;
  border: none;
  border-radius: 2rem;
  margin: 2rem 0 1.25rem 0;
  box-shadow: 0 0 20px 2px ${({ theme }) => theme.accent}, 0 2px 24px 0 rgba(0,0,0,0.35);
  cursor: pointer;
  letter-spacing: 2px;
  transition: background 0.15s, transform 0.07s, box-shadow 0.3s;
  text-shadow: 0 2px 8px #4b244a70;
  animation: glow 1.3s alternate infinite;
  @keyframes glow {
    to {
      box-shadow: 0 0 30px 8px ${({ theme }) => theme.secondary}, 0 2px 40px 0 #4b244a80;
    }
  }
  &:active {
    transform: scale(0.97);
    opacity: 0.97;
  }
`;

const LeaderboardButton = styled.button`
  background: ${({ theme }) => theme.secondary};
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  font-weight: 600;
  padding: 0.75rem 2.5rem;
  border: none;
  border-radius: 1rem;
  box-shadow: 0 0 10px 1px ${({ theme }) => theme.primary};
  margin-top: 1.1rem;
  cursor: pointer;
  transition: background 0.15s, transform 0.08s, box-shadow 0.29s;
  text-shadow: 0 1px 4px #00000050;
  &:hover { filter: brightness(1.15); }
  &:active { opacity: 0.96; }
`;

const ScoreBar = styled.div`
  position: fixed;
  top: 26px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.accent};
  background: rgba(30,27,57,0.18);
  padding: 0.73rem 2.2rem;
  border-radius: 1rem;
  box-shadow: 0 2px 16px 4px ${({ theme }) => theme.secondary}46;
  z-index: 10;
  text-shadow: 0 1px 20px ${({ theme }) => theme.accent}b0;
  pointer-events: none;
  user-select: none;
`;

const Overlay = styled.div`
  position: fixed;
  display: ${({ show }) => (show ? "flex" : "none")};
  left: 0;
  top: 0;
  width: 100vw; height: 100vh;
  z-index: 100;
  background: rgba(17,12,32,0.12);
  animation: fadeIn 0.6s;
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
`;

// PUBLIC_INTERFACE
function App() {
  // Game UI state
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Game over callback handler
  const handleGameEnd = (finalScore) => {
    setGameStarted(false);
    setScore(finalScore);
    // Could call server or update leaderboard here
  };

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {!gameStarted && (
        <CenteredContainer>
          <ScoreBar style={{ opacity: score > 0 ? 1 : 0.45 }}>
            🐉 Score: {score}
          </ScoreBar>
          <h1 style={{
            margin: 0,
            color: theme.text,
            fontSize: '3.3rem',
            textShadow: `0 4px 40px ${theme.accent}80, 0 3px 8px ${theme.secondary}A0`,
            fontWeight: 900,
            letterSpacing: ".02em"
          }}>
            Sunset Dragon Flight
          </h1>
          <div style={{
            marginBottom: "0.75rem",
            marginTop: "0.9rem",
            color: "#FFD740",
            fontWeight: 500,
            fontSize: "1.2rem",
            textShadow: "0 2px 9px #40218bbb"
          }}>
            Fly Toothless through the sunset sky. Dodge obstacles, fire fireballs, and score high!
          </div>
          <FlyButton onClick={() => { setGameStarted(true); setScore(0); }}>
            Fly
          </FlyButton>
          <LeaderboardButton
            style={{
              marginBottom: 24
            }}
            onClick={() => setShowLeaderboard(true)}
          >
            🏆 Leaderboard (soon)
          </LeaderboardButton>
          <div style={{
            position: "absolute",
            bottom: 22, left: 0, right: 0,
            fontSize: "1rem",
            color: "#fff8",
            textAlign: "center"
          }}>
            <span>
              Use Arrow keys to steer, <b>Spacebar</b> to shoot fireballs!
            </span>
          </div>
        </CenteredContainer>
      )}
      {gameStarted && (
        <Overlay show={gameStarted}>
          <ScoreBar>🐉 Score: {score}</ScoreBar>
          <Game
            onScore={setScore}
            onEnd={handleGameEnd}
          />
        </Overlay>
      )}
      {/* Simple leaderboard overlay placeholder */}
      {showLeaderboard && (
        <Overlay show={showLeaderboard}>
          <div style={{
            margin: "auto",
            background: "rgba(38,11,51,0.92)",
            borderRadius: "1.7rem",
            padding: "2.1rem 2.7rem",
            minWidth: "340px",
            color: "#FFD740",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "1.45rem",
            boxShadow: `0 8px 36px 0 ${theme.secondary}80`
          }}>
            Leaderboard coming soon! 🏆<br /><br />
            <button
              style={{
                background: theme.primary,
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                borderRadius: "1rem",
                padding: "0.6rem 2rem",
                marginTop: "1.9rem",
                boxShadow: `0 0 20px 4px ${theme.secondary}50`,
                cursor: "pointer"
              }}
              onClick={() => setShowLeaderboard(false)}
            >
              Close
            </button>
          </div>
        </Overlay>
      )}
    </ThemeProvider>
  );
}

export default App;
