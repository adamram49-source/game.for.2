// ----- Firebase Setup -----
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";

// הקונפיג שלך:
const firebaseConfig = {
  apiKey: "AIzaSyAMp5-wqinWTl4z0ms6bmnXgm9EvqPcbug",
  authDomain: "mytwoplayergame.firebaseapp.com",
  projectId: "mytwoplayergame",
  storageBucket: "mytwoplayergame.firebasestorage.app",
  messagingSenderId: "1003705475156",
  appId: "1:1003705475156:web:0d56aeef31623413238dc1",
  measurementId: "G-1KN2B16XVG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ----- Game Variables -----
let gameCode = "";
let playerId = "";
let gameData = null;
let isMyTurn = false;
let mySelection = [];
let hearts = { player1: 3, player2: 3 };

const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const codeInput = document.getElementById("codeInput");
const gameContainer = document.getElementById("gameContainer");
const gameCodeDisplay = document.getElementById("gameCodeDisplay");

const player1BoardEl = document.getElementById("player1Board");
const player2BoardEl = document.getElementById("player2Board");

const player1HeartsEl = document.getElementById("player1Hearts");
const player2HeartsEl = document.getElementById("player2Hearts");

const chooseBombsBtn = document.getElementById("chooseBombsBtn");
const attackBtn = document.getElementById("attackBtn");

// ----- Helper Functions -----
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createGame() {
  gameCode = generateGameCode();
  playerId = "player1";

  const gameRef = ref(database, `games/${gameCode}`);
  set(gameRef, {
    player1: playerId,
    player2: null,
    status: "waiting",
    board: { player1: [], player2: [] },
    turn: playerId,
    hearts: { player1: 3, player2: 3 }
  });

  listenToGame();
  gameContainer.style.display = "block";
  gameCodeDisplay.textContent = gameCode;
}

function joinGame(code) {
  gameCode = code;
  playerId = "player2";

  const gameRef = ref(database, `games/${gameCode}`);
  get(gameRef).then(snapshot => {
    if (!snapshot.exists()) { alert("קוד לא קיים!"); return; }
    const data = snapshot.val();
    if (data.player2) { alert("משחק זה כבר מלא!"); return; }

    set(ref(database, `games/${gameCode}/player2`), playerId);
    set(ref(database, `games/${gameCode}/status`), "choosing");

    listenToGame();
    gameContainer.style.display = "block";
    gameCodeDisplay.textContent = gameCode;
  });
}

// ----- Listen to Firebase -----
function listenToGame() {
  const gameRef = ref(database, `games/${gameCode}`);
  onValue(gameRef, snapshot => {
    gameData = snapshot.val();
    if (!gameData) return;

    hearts = gameData.hearts;
    player1HeartsEl.textContent = hearts.player1;
    player2HeartsEl.textContent = hearts.player2;

    isMyTurn = gameData.turn === playerId;

    if (hearts.player1 === 0 || hearts.player2 === 0) {
      const winner = hearts.player1 === 0 ? "player2" : "player1";
      alert(`Game Over! Winner: ${winner}`);
      return;
    }

    renderBoards();
  });
}

// ----- Board Logic -----
function renderBoards() {
  player1BoardEl.innerHTML = "";
  player2BoardEl.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const cell1 = document.createElement("div");
    cell1.classList.add("cell");
    cell1.textContent = gameData.board.player1.includes(i) ? "X" : "";
    player1BoardEl.appendChild(cell1);

    const cell2 = document.createElement("div");
    cell2.classList.add("cell");
    cell2.textContent = gameData.board.player2.includes(i) ? "X" : "";
    player2BoardEl.appendChild(cell2);
  }
}

function chooseBombs(indices) {
  if (mySelection.length > 0) return;
  mySelection = indices;
  const boardPath = playerId === "player1" ? "player1" : "player2";
  set(ref(database, `games/${gameCode}/board/${boardPath}`), mySelection);

  const otherPlayer = playerId === "player1" ? "player2" : "player1";
  if (gameData.board[otherPlayer].length > 0) {
    set(ref(database, `games/${gameCode}/status`), "attacking");
    set(ref(database, `games/${gameCode}/turn`), otherPlayer);
  } else {
    alert("Waiting for opponent to choose bombs...");
  }
}

function attack(index) {
  if (!isMyTurn) { alert("It's not your turn!"); return; }
  const opponent = playerId === "player1" ? "player2" : "player1";
  const opponentSelection = gameData.board[opponent] || [];

  let hit = opponentSelection.includes(index);
  let newHearts = { ...hearts };
  if (hit) newHearts[playerId] -= 1;

  set(ref(database, `games/${gameCode}/hearts`), newHearts);

  const newBoard = { ...gameData.board };
  newBoard[opponent] = newBoard[opponent].filter(i => i !== index);
  set(ref(database, `games/${gameCode}/board`), newBoard);

  const nextTurn = opponent;
  set(ref(database, `games/${gameCode}/turn`), nextTurn);
}

// ----- Button Hooks -----
createGameBtn.onclick = createGame;
joinGameBtn.onclick = () => joinGame(codeInput.value);
chooseBombsBtn.onclick = () => {
  // Example: select first 3 cells
  chooseBombs([0,1,2]);
};
attackBtn.onclick = () => {
  // Example: attack first cell of opponent
  attack(0);
};
