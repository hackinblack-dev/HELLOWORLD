// Firebase Imports (CDN for browser usage without bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyIQk6PS7rvr9q3gqIW138FOrVMC8udd8",
  authDomain: "counter-72c46.firebaseapp.com",
  projectId: "counter-72c46",
  storageBucket: "counter-72c46.firebasestorage.app",
  messagingSenderId: "1065234354442",
  appId: "1:1065234354442:web:1a3a00a698c3e9114f6af3",
  measurementId: "G-01R4FK41PH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- ❤️ YOUR MESSAGE GOES HERE ❤️ ---
const myMessage = "I am missing you right now... also, try the 3 AM mode 😉";
// ----------------------------------------

// --- DB REFERENCES ---
// DB Path: counts/fromHim (was sent-by-girl)
// DB Path: counts/fromHer (was received-by-girl)
const fromHimRef = ref(db, "counts/fromHim");
const fromHerRef = ref(db, "counts/fromHer");

const receivedDisplay = document.getElementById("receivedDisplay");
const sentDisplay = document.getElementById("sentDisplay");

// --- NOTIFICATION STATE ---
let lastFromHer = null;
let lastFromHim = null;
let lastSelfAction = 0;
const TG_TOKEN = "8572505018:AAEzsHrB_5ypGRYlYxvEkyv_jlap4NInlI4";
const TG_CHAT_ID = "1369536118";

function askPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendTelegram(text) {
  // Send fire-and-forget request to Telegram
  fetch(
    `https://api.telegram.org/bot${TG_TOKEN}/sendMessage?chat_id=${TG_CHAT_ID}&text=${encodeURIComponent(
      text
    )}`
  ).catch((err) => console.error("TG Error:", err));
}

// --- REAL-TIME LISTENERS ---
onValue(fromHerRef, (snapshot) => {
  const val = snapshot.val() || 0;
  receivedDisplay.innerText = val;

  // Notify if: New Value > Old, Old exists, and NOT triggered by me recently (<500ms)
  if (
    lastFromHer !== null &&
    val > lastFromHer &&
    Date.now() - lastSelfAction > 500
  ) {
    // "From Her" updated -> Usually means SHE sent something (or I received it)
    if (Notification.permission === "granted")
      new Notification("💌 New Love!", {
        body: "She sent you a kiss!",
        icon: "https://fav.farm/💋",
      });
  }
  lastFromHer = val;
});

onValue(fromHimRef, (snapshot) => {
  const val = snapshot.val() || 0;
  sentDisplay.innerText = val;

  // Notify if: New Value > Old, Old exists, and NOT triggered by me recently
  if (
    lastFromHim !== null &&
    val > lastFromHim &&
    Date.now() - lastSelfAction > 500
  ) {
    // "From Him" updated -> Usually means HE sent something (or I received it)
    if (Notification.permission === "granted")
      new Notification("💌 New Love!", {
        body: "He sent you love!",
        icon: "https://fav.farm/💌",
      });
  }
  lastFromHim = val;
});

function sendToHer() {
  askPermission(); // Ask on first interaction
  animatePress();
  spawnBatch("💌", "#3b82f6");
  lastSelfAction = Date.now(); // Mark self-action

  // Telegram Notify
  sendTelegram("💌 He sent love to Her!");

  // Optimistic UI
  const current = (parseInt(sentDisplay.innerText) || 0) + 1;
  sentDisplay.innerText = current;

  runTransaction(fromHimRef, (currentCount) => {
    return (currentCount || 0) + 1;
  }).then(() => {
    const hype = ["Sent!", "Miss u!", "Love it!", "More!", "❤️"];
    showFloatingAnim(hype[Math.floor(Math.random() * hype.length)], "#3b82f6");
  });
}

function sendToHim() {
  askPermission(); // Ask on first interaction
  animatePress();
  spawnBatch("💋", "#ff6b81");
  lastSelfAction = Date.now(); // Mark self-action

  // Telegram Notify
  sendTelegram("💋 She sent a kiss to Him!");

  // Optimistic UI
  const current = (parseInt(receivedDisplay.innerText) || 0) + 1;
  receivedDisplay.innerText = current;

  runTransaction(fromHerRef, (currentCount) => {
    return (currentCount || 0) + 1;
  }).then(() => {
    const hype = ["Mwah!", "Kisses!", "Catch!", "Again!", "💋"];
    showFloatingAnim(hype[Math.floor(Math.random() * hype.length)], "#ff6b81");
  });
}

// --- ANIMATION HELPERS ---
function animatePress() {
  document.body.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(0.99)" },
      { transform: "scale(1)" },
    ],
    { duration: 150 }
  );
}

function showFloatingAnim(text, color) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.position = "fixed";
  el.style.left = 50 + (Math.random() - 0.5) * 40 + "%";
  el.style.top = 40 + (Math.random() - 0.5) * 20 + "%";
  el.style.color = color;
  el.style.fontWeight = "800";
  el.style.fontSize = "28px";
  el.style.zIndex = "999";
  el.style.pointerEvents = "none";
  el.style.textShadow = "0 4px 12px rgba(0,0,0,0.3)";
  el.style.fontFamily = "'Outfit', sans-serif";
  document.body.appendChild(el);

  el.animate(
    [
      { transform: "translateY(0) scale(0.5)", opacity: 0 },
      { transform: "translateY(-20px) scale(1.2)", opacity: 1, offset: 0.2 },
      { transform: "translateY(-100px) scale(1)", opacity: 0 },
    ],
    { duration: 1200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
  );

  setTimeout(() => el.remove(), 1200);
}

function spawnBatch(emoji, color) {
  const centerW = window.innerWidth / 2;
  const centerH = window.innerHeight / 2;
  for (let i = 0; i < 15; i++) {
    setTimeout(() => spawnParticle(emoji, centerW, centerH, true), i * 40);
  }
}

// --- GAME LOGIC ---
const chaser = document.getElementById("chaser");
const particles = document.getElementById("particles");
const card = document.getElementById("card");
const boodyBtn = document.getElementById("toggleBoody");
const threeAMBtn = document.getElementById("toggleThreeAM");
const heartsBtn = document.getElementById("toggleHearts");
const marker = document.getElementById("targetMarker");
const tipToast = document.getElementById("tipToast");
const settingsMenu = document.getElementById("settingsMenu");
const settingsTrigger = document.getElementById("settingsTrigger");

const sendToHerBtn = document.getElementById("sendToHerBtn");
const sendToHimBtn = document.getElementById("sendToHimBtn");

const hintBox = document.getElementById("hintBox");
const messageBox = document.getElementById("messageBox");
const openHintBtn = document.getElementById("openHint");
const closeHintBtn = document.getElementById("closeHint");
const openMsgBtn = document.getElementById("openMessage");
const closeMsgBtn = document.getElementById("closeMessage");
const letterText = document.getElementById("letterText");

let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let baseFace = "👨🏻‍💻";
let currentMode = "chill";
let hasInteracted = false;
let heartsOn = false;
let eggClicks = 0;
let eggTimer = null;

pickNewWanderTarget();

if (myMessage && myMessage.length > 0) {
  openMsgBtn.classList.add("visible");
  openMsgBtn.classList.add("has-new");
  letterText.textContent = myMessage;
}

// Settings Menu Toggle
settingsTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsMenu.classList.toggle("open");
  settingsTrigger.textContent = settingsMenu.classList.contains("open")
    ? "✖"
    : "⚙️";
});

// Modals
openMsgBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  messageBox.classList.add("visible");
  openMsgBtn.classList.remove("has-new");
});
closeMsgBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  messageBox.classList.remove("visible");
});
openHintBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  hintBox.classList.add("visible");
});
closeHintBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  hintBox.classList.remove("visible");
});

// Send Buttons
sendToHerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sendToHer();
});
sendToHimBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sendToHim();
});

window.addEventListener("click", (e) => {
  if (
    hintBox.classList.contains("visible") ||
    messageBox.classList.contains("visible")
  )
    return;
  if (!hasInteracted) {
    hasInteracted = true;
    card.style.opacity = "0";
    setTimeout(() => (card.style.display = "none"), 500);
  }
  if (e.target.id === "chaser") {
    handleChaserClick();
    return;
  }
  if (
    e.target.tagName !== "BUTTON" &&
    !e.target.closest(".settings-menu") &&
    !e.target.closest(".top-bar")
  ) {
    moveMarker(e.clientX, e.clientY);
    if (currentMode !== "chill") {
      target.x = e.clientX;
      target.y = e.clientY;
    }
  }
  // Close settings if clicked outside
  if (
    settingsMenu.classList.contains("open") &&
    !settingsMenu.contains(e.target) &&
    e.target !== settingsTrigger
  ) {
    settingsMenu.classList.remove("open");
    settingsTrigger.textContent = "⚙️";
  }
});

const tips = [
  "You look so pretty today! ✨",
  "Drink some water! 💧",
  "Don't stress, you got this! 💪",
  "I love you! ❤️",
  "You are the CSS to my HTML 🎨",
  "Sending virtual hugs 🤗",
];
setInterval(() => {
  if (
    currentMode === "3am" ||
    hintBox.classList.contains("visible") ||
    messageBox.classList.contains("visible")
  )
    return;
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  tipToast.textContent = randomTip;
  tipToast.classList.add("show");
  setTimeout(() => tipToast.classList.remove("show"), 4000);
}, 12000);

function moveMarker(x, y) {
  marker.style.left = x + "px";
  marker.style.top = y + "px";
  marker.classList.remove("active");
  void marker.offsetWidth;
  marker.classList.add("active");
}

function handleChaserClick() {
  if (currentMode === "3am") {
    const spicyReactions = ["👅", "😏", "😈", "🤤"];
    const reaction =
      spicyReactions[Math.floor(Math.random() * spicyReactions.length)];
    chaser.textContent = reaction;
    explodeParticles("🔥");
    explodeParticles("💋");
    setTimeout(() => {
      if (currentMode === "3am") chaser.textContent = "😈";
    }, 1200);
  } else if (currentMode === "angry") {
    chaser.textContent = "🤬";
    explodeParticles("💢");
    setTimeout(() => {
      if (currentMode === "angry") chaser.textContent = "😠";
    }, 1000);
  } else {
    chaser.textContent = "🤓";
    chaser.classList.add("spin");
    explodeParticles("💻");
    setTimeout(() => {
      chaser.classList.remove("spin");
      if (currentMode === "chill") chaser.textContent = baseFace;
    }, 600);
  }
}

function pickNewWanderTarget() {
  if (currentMode !== "chill") return;
  const pad = 100;
  target.x = pad + Math.random() * (window.innerWidth - pad * 2);
  target.y = pad + Math.random() * (window.innerHeight - pad * 2);
}

function spawnParticle(type, x, y, burst = false) {
  const el = document.createElement("div");
  el.textContent = type;
  el.style.position = "absolute";
  const rX = burst ? (Math.random() - 0.5) * 80 : 0;
  const rY = burst ? (Math.random() - 0.5) * 80 : 0;
  el.style.left = x - 12 + rX + "px";
  el.style.top = y - 12 + rY + "px";
  el.style.fontSize = 20 + Math.random() * 24 + "px";
  el.style.pointerEvents = "none";
  el.style.color = "#fff";
  el.style.fontFamily = "monospace";
  particles.appendChild(el);
  const rise = 80 + Math.random() * 120;
  const dur = 800 + Math.random() * 1000;
  el.animate(
    [
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { transform: `translateY(-${rise}px) scale(1.5)`, opacity: 0 },
    ],
    { duration: dur, easing: "ease-out" }
  );
  setTimeout(() => el.remove(), dur + 50);
}
function explodeParticles(emoji) {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => spawnParticle(emoji, pos.x, pos.y, true), i * 50);
  }
}

function loop() {
  // Smoother wander
  if (currentMode === "chill") {
    const dist = Math.hypot(target.x - pos.x, target.y - pos.y);
    if (dist < 50) pickNewWanderTarget();
  }
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const d = Math.hypot(dx, dy) || 1;
  let moveSpeed = 0.03;
  if (currentMode === "angry") moveSpeed = 0.12;
  if (currentMode === "3am") moveSpeed = 0.15;
  const move = Math.min(d * moveSpeed, 40);
  pos.x += (dx / d) * move;
  pos.y += (dy / d) * move;

  // Bounds Check
  const pad = 40;
  pos.x = Math.max(pad, Math.min(window.innerWidth - pad, pos.x));
  pos.y = Math.max(pad, Math.min(window.innerHeight - pad, pos.y));

  chaser.style.left = pos.x + "px";
  chaser.style.top = pos.y + "px";

  if (currentMode === "3am") {
    if (Math.random() < 0.1)
      spawnParticle(Math.random() > 0.5 ? "🔥" : "💋", pos.x, pos.y);
  } else if (currentMode === "angry") {
    if (Math.random() < 0.08) spawnParticle("💢", pos.x, pos.y);
  } else {
    if (heartsOn) {
      if (Math.random() < 0.05) spawnParticle("💖", pos.x, pos.y);
    } else {
      const codeSymbols = ["{ }", "</>", ";", "&&", "#"];
      if (Math.random() < 0.03)
        spawnParticle(
          codeSymbols[Math.floor(Math.random() * codeSymbols.length)],
          pos.x,
          pos.y
        );
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
