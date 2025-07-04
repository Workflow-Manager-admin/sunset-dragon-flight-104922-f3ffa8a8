import React, { useRef, useState, useEffect, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, PerspectiveCamera, Float } from "@react-three/drei";
import * as THREE from "three";
import styled from "styled-components";
// Removed import for BatchedMesh (if any), not compatible with three.js

// Path to dragon asset (You must place toothless.glb in public/assets/)
const DRAGON_MODEL_PATH = process.env.PUBLIC_URL + "/assets/toothless.glb";

const GAME_AREA = { width: 18, height: 13.5, depth: 100 };
const Z_START = -10;

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function randBetween(a, b) { return a + Math.random() * (b - a); }

// PUBLIC_INTERFACE
const Game = ({ onScore, onEnd }) => {
  // Game state
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  // Manage obstacles, fireballs as arrays of objects
  const [obstacles, setObstacles] = useState([]);
  const [fireballs, setFireballs] = useState([]);
  // Dragon controlled position and tilt
  const [dragon, setDragon] = useState({
    pos: [0, 2.55, Z_START],
    vel: [0, 0, 0],
    tilt: [0, 0, 0], // [pitch, yaw, roll] radians
  });

  // Controls
  const controlState = useRef({ left: false, right: false, up: false, down: false, fire: false });

  // Setup game loop: handle movement, collision, spawn, etc.
  useEffect(() => {
    let rafId, lastTime = performance.now();
    let gameActive = true;
    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.035);
      lastTime = now;
      // Move dragon
      setDragon((prev) => {
        let [x, y, z] = prev.pos;
        let [vx, vy, vz] = prev.vel;
        let speed = 7.9 + clamp(score / 100, 0, 5);
        // Control input for left/right/up/down
        if (controlState.current.left) vx = clamp(vx - 0.15, -2.5, 2.5);
        if (controlState.current.right) vx = clamp(vx + 0.15, -2.5, 2.5);
        if (!controlState.current.left && !controlState.current.right) vx *= 0.90;

        if (controlState.current.up) vy = clamp(vy + 0.13, -2.2, 2.8);
        if (controlState.current.down) vy = clamp(vy - 0.13, -2.8, 2.2);
        if (!controlState.current.up && !controlState.current.down) vy *= 0.90;
        vz = speed;

        // Apply pos changes (add a touch of gravity downward)
        x = clamp(x + vx * dt, -GAME_AREA.width / 2.2, GAME_AREA.width / 2.2);
        y = clamp(y + vy * dt - 0.13 * dt, 1.3, GAME_AREA.height - 1);

        // Visual tilt based on input (simple, not physical)
        let roll = clamp(-vx * 0.33, -0.41, 0.41);
        let pitch = clamp(vy * 0.21, -0.22, 0.33);

        // Slight yaw as wiggle
        let yaw = Math.sin(now / 500) * 0.095;

        return {
          pos: [x, y, z + vz * dt],
          vel: [vx, vy, vz],
          tilt: [pitch, yaw, roll],
        };
      });
      // Spawn new obstacles ("flying at us") ahead
      setObstacles((prevObs) => {
        let newObs = prevObs
          .filter((obs) => obs.position[2] > (dragon.pos[2] - 6)); // Only keep onscreen
        // Spawn rate scales with score
        if (
          Math.random() <
          (0.032 + clamp(score / 300, 0, 0.024))
        ) {
          const forms = ["cube", "sphere", "rock"];
          let type = forms[Math.floor(Math.random() * forms.length)];
          let px = randBetween(-GAME_AREA.width / 2 + 1.5, GAME_AREA.width / 2 - 1.6);
          let py = randBetween(1.5, GAME_AREA.height - 1.2);
          let pz = dragon.pos[2] + 32 + randBetween(0, 5);
          let size = randBetween(0.7, 1.55);
          let color = type === "cube"
            ? "#FFD740"
            : (type === "sphere" ? "#8E24AA" : "#B2A7DA");
          newObs.push({
            id: "obs" + Math.random().toString(36).slice(2),
            type,
            position: [px, py, pz],
            size,
            color,
            hit: false,
          });
        }
        return newObs.map((obs) => ({
          ...obs,
          position: [obs.position[0], obs.position[1], obs.position[2] - 0.17],
        }));
      });
      // Move fireballs
      setFireballs((prevBalls) =>
        prevBalls
          .filter((f) => f.position[2] < dragon.pos[2] + 40 && !f.hit)
          .map((f) => ({
            ...f,
            position: [
              f.position[0],
              f.position[1],
              f.position[2] + 0.38
            ],
          }))
      );
      // Score increases over time and for fire hits
      setScore((prev) => prev + 1);

      if (gameActive && !gameOver) {
        rafId = requestAnimationFrame(loop);
      }
    }
    rafId = requestAnimationFrame(loop);
    return () => {
      gameActive = false;
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line
  }, [gameOver, score]);

  // Collisions: Dragon with obstacles, fireballs with obstacles
  useEffect(() => {
    // Skip if not playing
    if (gameOver) return;
    // Check player collisions
    for (let obs of obstacles) {
      if (obs.hit) continue;
      const [ox, oy, oz] = obs.position;
      const [dx, dy, dz] = dragon.pos;
      if (
        Math.abs(oz - dz) < 1.48 &&
        Math.abs(ox - dx) < 1.41 + obs.size / 1.46 &&
        Math.abs(oy - dy) < 1.29 + obs.size / 1.55
      ) {
        // Game over
        setGameOver(true);
        setTimeout(() => { onEnd && onEnd(score); }, 900);
        return;
      }
    }
    // Fireball hit
    setObstacles((prevObstacles) =>
      prevObstacles.map((obs) => {
        if (obs.hit) return obs;
        for (let fire of fireballs) {
          const [fx, fy, fz] = fire.position;
          if (
            Math.abs(obs.position[2] - fz) < 1.1 &&
            Math.abs(obs.position[0] - fx) < obs.size + 0.7 &&
            Math.abs(obs.position[1] - fy) < obs.size + 0.7
          ) {
            setScore((prev) => prev + 25); // Bonus for hit
            fire.hit = true;
            return { ...obs, hit: true };
          }
        }
        return obs;
      })
    );
    // Remove obstacles that are hit
    setObstacles((obs) => obs.filter((o) => !o.hit));
    // Remove fireballs that have hit
    setFireballs((balls) => balls.filter((b) => !b.hit));
    // eslint-disable-next-line
  }, [obstacles, fireballs, dragon, gameOver]);

  // Upward score callback for App
  useEffect(() => { onScore && onScore(score); }, [score, onScore]);

  // Controls
  useEffect(() => {
    function handleDown(e) {
      if (e.repeat) return;
      switch (e.key) {
        case "ArrowLeft": controlState.current.left = true; break;
        case "ArrowRight": controlState.current.right = true; break;
        case "ArrowUp": controlState.current.up = true; break;
        case "ArrowDown": controlState.current.down = true; break;
        case " ": // Spacebar = fire
          controlState.current.fire = true;
          setFireballs((prev) => [
            ...prev,
            {
              id: "fire" + Math.random().toString(36).slice(2),
              position: [dragon.pos[0], dragon.pos[1] + 0.8, dragon.pos[2] + 2.2],
              hit: false,
            },
          ]);
          break;
        default: break;
      }
    }
    function handleUp(e) {
      switch (e.key) {
        case "ArrowLeft": controlState.current.left = false; break;
        case "ArrowRight": controlState.current.right = false; break;
        case "ArrowUp": controlState.current.up = false; break;
        case "ArrowDown": controlState.current.down = false; break;
        case " ": controlState.current.fire = false; break;
        default: break;
      }
    }
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
    // eslint-disable-next-line
  }, [dragon]);

  // End of game: fade out or flash effect
  useEffect(() => {
    if (gameOver) {
      // Fade or shake could be animated here
      setTimeout(() => {
        setGameOver(false);
        setObstacles([]);
        setFireballs([]);
      }, 1500);
    }
  }, [gameOver]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas
        style={{
          background:
            "linear-gradient(175deg, #FF6E4040 18%, #FFD740 64%, #8E24AA 100%)",
          width: "100vw",
          height: "100vh",
          filter: gameOver ? "blur(3px) grayscale(0.6)" : "none",
          transition: "filter 0.43s"
        }}
        shadows
        dpr={window.devicePixelRatio}
        camera={{ fov: 55, position: [0, 7, 15] }}
      >
        <ambientLight intensity={0.68} />
        <directionalLight position={[0, 16, 12]} intensity={1.12} castShadow color="#FFD740" />
        <pointLight position={[-12, 10, -5]} intensity={1.1} color="#FD3840" />
        <SunsetSky />
        <CameraFollower dragon={dragon.pos} />
        <Suspense fallback={<Html center style={{
          color: "#FFD740", fontSize: "3rem", textShadow: "0 2px 16px #1E2D7340"
        }}>Loading Toothless...</Html>}>
          <Dragon
            position={dragon.pos}
            tilt={dragon.tilt}
            gameOver={gameOver}
          />
        </Suspense>
        {fireballs.map((fb) => (
          <Fireball key={fb.id} position={fb.position} />
        ))}
        {obstacles.map((obs) => (
          <Obstacle key={obs.id} {...obs} />
        ))}
        {/* <OrbitControls /> */}
      </Canvas>
      {gameOver && (
        <div style={{
          position: "fixed",
          top: "40%",
          left: 0,
          right: 0,
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 10,
          fontSize: "3.15rem",
          color: "#fff",
          fontWeight: 900,
          textShadow: "0 4px 70px #8E24AA, 0 2px 18px #FF6E40, 0 0px 2px #FFD740"
        }}>
          Game Over
        </div>
      )}
    </div>
  );
};

// Camera that follows the dragon
function CameraFollower({ dragon }) {
  const { camera } = useThree();
  useFrame(() => {
    // target is a position trailing dragon and slightly above, looking forward
    let [x, y, z] = dragon;
    camera.position.x += (x - camera.position.x) * 0.1;
    camera.position.y += (y + 2.1 - camera.position.y) * 0.13;
    camera.position.z += (z + 12 - camera.position.z) * 0.08;
    camera.lookAt(x, y, z + 8);
  });
  return null;
}

// Dragon mesh loader with animation
function Dragon({ position, tilt, gameOver }) {
  const { scene, animations } = useGLTF(DRAGON_MODEL_PATH);
  const meshRef = useRef();

  // Animate basic up/down flying effect + small idle wiggle
  useFrame((state) => {
    if (meshRef.current && position) {
      meshRef.current.position.set(...position);
      meshRef.current.rotation.set(
        tilt[0] + Math.sin(state.clock.getElapsedTime() * 1.9) * 0.06,
        tilt[1],
        tilt[2]
      );
      if (!gameOver) {
        meshRef.current.position.y += Math.sin(state.clock.getElapsedTime() * 3.1) * 0.13;
      }
    }
  });

  return (
    <group ref={meshRef}>
      <primitive object={scene} scale={1.41} dispose={null} />
    </group>
  );
}

// Fireball mesh
function Fireball({ position }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(...position);
    }
  });
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <sphereGeometry args={[0.28, 16, 14]} />
      <meshStandardMaterial
        emissive="#FFD740"
        color="#FF6E40"
        transparent
        opacity={0.95}
        emissiveIntensity={0.77}
      />
      <pointLight color="#FF6E40" intensity={0.54} position={[0, 0, 0]} distance={2.3} />
    </mesh>
  );
}

// Obstacles generator
function Obstacle({ position, size, type, color }) {
  switch (type) {
    case "rock":
      return (
        <mesh position={position} castShadow receiveShadow>
          <icosahedronGeometry args={[size, 1]} />
          <meshStandardMaterial
            color={color}
            wireframe={false}
            roughness={0.65}
            metalness={0.16}
          />
        </mesh>
      );
    case "cube":
      return (
        <mesh position={position} castShadow receiveShadow>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial color={color} roughness={0.77} metalness={0.20} />
        </mesh>
      );
    case "sphere":
    default:
      return (
        <mesh position={position} castShadow receiveShadow>
          <sphereGeometry args={[size * 0.85, 15, 12]} />
          <meshStandardMaterial color={color} roughness={0.38} metalness={0.48} />
        </mesh>
      );
  }
}

// Sunset colored sky dome
function SunsetSky() {
  return (
    <mesh scale={[100, 100, 100]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        side={THREE.BackSide}
        color="#FFD740"
      >
        <GradientTexture />
      </meshBasicMaterial>
    </mesh>
  );
}

// Use custom ShaderMaterial for proper gradient, fallback to gold for mobile
function GradientTexture() {
  const { gl } = useThree();
  const materialRef = useRef();
  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.needsUpdate = true;
  }, []);
  return null;
}

export default Game;
