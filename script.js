// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ================= CONSTANTS & CONFIG =================
const CONFIG = {
  firebase: {
    apiKey: "AIzaSyDyIQk6PS7rvr9q3gqIW138FOrVMC8udd8",
    authDomain: "counter-72c46.firebaseapp.com",
    projectId: "counter-72c46",
    storageBucket: "counter-72c46.firebasestorage.app",
    messagingSenderId: "1065234354442",
    appId: "1:1065234354442:web:1a3a00a698c3e9114f6af3",
    measurementId: "G-01R4FK41PH",
  },
  telegram: {
    token: "8572505018:AAEzsHrB_5ypGRYlYxvEkyv_jlap4NInlI4",
    chatId: "1369536118",
  },
  sounds: {
    pop: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
    success:
      "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3",
    volume: 0.2,
  },
  speeds: {
    chill: 0.03,
    angry: 0.12,
    mode3am: 0.15,
  },
  messages: {
    base: "I am missing you right now... also, try the 3 AM mode 😉",
    tips: [
      "You look so pretty today! ✨",
      "Drink some water! 💧",
      "Don't stress, you got this! 💪",
      "I love you! ❤️",
      "You are the CSS to my HTML 🎨",
      "Sending virtual hugs 🤗",
    ],
  },
};

// ================= SOUND MANAGER =================
class SoundManager {
  constructor() {
    this.enabled = true;
    this.sounds = {};
    this.init();
  }

  init() {
    this.loadSound("pop", CONFIG.sounds.pop);
    this.loadSound("success", CONFIG.sounds.success);
  }

  loadSound(name, url) {
    const audio = new Audio(url);
    audio.volume = CONFIG.sounds.volume;
    // Preload
    audio.load();
    this.sounds[name] = audio;
  }

  play(name) {
    if (!this.enabled || !this.sounds[name]) return;

    // Clone node to allow overlapping sounds (rapid interaction)
    const clone = this.sounds[name].cloneNode();
    clone.volume = CONFIG.sounds.volume;

    // Safety check for latency/interaction policies
    const promise = clone.play();
    if (promise !== undefined) {
      promise.catch((error) => {
        // Auto-play policy blocked or network error -> fail silently
        // console.warn("Sound play failed:", error);
      });
    }
  }
}

// ================= PARTICLE SYSTEM =================
class ParticleSystem {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  spawn(emoji, x, y, options = {}) {
    const el = document.createElement("div");
    el.textContent = emoji;
    el.style.position = "absolute";
    el.style.left =
      x - 12 + (options.burst ? (Math.random() - 0.5) * 80 : 0) + "px";
    el.style.top =
      y - 12 + (options.burst ? (Math.random() - 0.5) * 80 : 0) + "px";
    el.style.fontSize = 20 + Math.random() * 24 + "px";
    el.style.pointerEvents = "none";
    el.style.fontFamily = "monospace";
    el.style.zIndex = "10";

    this.container.appendChild(el);

    const rise = 80 + Math.random() * 120;
    const dur = 800 + Math.random() * 1000;

    const anim = el.animate(
      [
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { transform: `translateY(-${rise}px) scale(1.5)`, opacity: 0 },
      ],
      { duration: dur, easing: "ease-out" }
    );

    anim.onfinish = () => el.remove();
  }

  explode(emoji, x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.spawn(emoji, x, y, { burst: true }), i * 50);
    }
  }

  spawnBatch(emoji, count = 15, color = null) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawn(emoji, cx, cy, { burst: true });
      }, i * 40);
    }
  }
}

// ================= CHASER (CHARACTER) =================
class Chaser {
  constructor(el, particleSystem) {
    this.el = el;
    this.particles = particleSystem;
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mode = "chill"; // chill, angry, 3am
    this.heartsOn = false;
    this.baseFace = "👨🏻‍💻";

    this.setupBehavior();
  }

  setupBehavior() {
    this.pickWanderTarget();
  }

  setMode(mode) {
    this.mode = mode;
    this.updateFace();
  }

  toggleHearts() {
    this.heartsOn = !this.heartsOn;
  }

  randomizeFace() {
    // Just a fun feature
    const faces = ["👨🏻‍💻", "👽", "🤖", "🤠", "👻"];
    this.baseFace = faces[Math.floor(Math.random() * faces.length)];
    if (this.mode === "chill") this.updateFace();
  }

  updateFace() {
    // Reset animations
    this.el.className = "chaser face";

    if (this.mode === "3am") {
      this.el.textContent = "😈";
    } else if (this.mode === "angry") {
      this.el.textContent = "😠";
      this.el.classList.add("angry-anim");
    } else {
      this.el.textContent = this.baseFace;
    }
  }

  handleInteract() {
    // Clicked on chaser
    if (this.mode === "3am") {
      const spicyReactions = ["👅", "😏", "😈", "🤤"];
      this.el.textContent =
        spicyReactions[Math.floor(Math.random() * spicyReactions.length)];
      this.particles.explode("🔥", this.pos.x, this.pos.y);

      // Return to base after delay
      setTimeout(() => {
        if (this.mode === "3am") this.el.textContent = "😈";
      }, 1200);
    } else if (this.mode === "angry") {
      this.el.textContent = "🤬";
      this.particles.explode("💢", this.pos.x, this.pos.y);
      setTimeout(() => {
        if (this.mode === "angry") this.el.textContent = "😠";
      }, 1000);
    } else {
      this.el.textContent = "🤓";
      this.el.classList.add("spin");
      this.particles.explode("💻", this.pos.x, this.pos.y);
      setTimeout(() => {
        this.el.classList.remove("spin");
        if (this.mode === "chill") this.el.textContent = this.baseFace;
      }, 600);
    }
  }

  update() {
    // Wander Logic
    if (this.mode === "chill") {
      const dist = Math.hypot(
        this.target.x - this.pos.x,
        this.target.y - this.pos.y
      );
      if (dist < 50) this.pickWanderTarget();
    }

    // Movement Logic
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.hypot(dx, dy) || 1;

    let speed = CONFIG.speeds.chill;
    if (this.mode === "angry") speed = CONFIG.speeds.angry;
    if (this.mode === "3am") speed = CONFIG.speeds.mode3am;

    const move = Math.min(dist * speed, 40); // Cap max speed

    this.pos.x += (dx / dist) * move;
    this.pos.y += (dy / dist) * move;

    // Boundary Constraint
    const pad = 40;
    this.pos.x = Math.max(pad, Math.min(window.innerWidth - pad, this.pos.x));
    this.pos.y = Math.max(pad, Math.min(window.innerHeight - pad, this.pos.y));

    // Render
    this.el.style.left = this.pos.x + "px";
    this.el.style.top = this.pos.y + "px";

    // Random Ambient Particles
    this.spawnAmbientParticles();
  }

  spawnAmbientParticles() {
    if (this.mode === "3am") {
      if (Math.random() < 0.1)
        this.particles.spawn(
          Math.random() > 0.5 ? "🔥" : "💋",
          this.pos.x,
          this.pos.y
        );
    } else if (this.mode === "angry") {
      if (Math.random() < 0.08)
        this.particles.spawn("💢", this.pos.x, this.pos.y);
    } else {
      if (this.heartsOn) {
        if (Math.random() < 0.05)
          this.particles.spawn("💖", this.pos.x, this.pos.y);
      } else {
        const symbols = ["{ }", "</>", ";", "&&", "#"];
        if (Math.random() < 0.03)
          this.particles.spawn(
            symbols[Math.floor(Math.random() * symbols.length)],
            this.pos.x,
            this.pos.y
          );
      }
    }
  }

  pickWanderTarget() {
    const pad = 100;
    this.target.x = pad + Math.random() * (window.innerWidth - pad * 2);
    this.target.y = pad + Math.random() * (window.innerHeight - pad * 2);
  }

  setTarget(x, y) {
    this.target.x = x;
    this.target.y = y;
  }
}

// ================= NOTIFICATIONS =================
// Simple wrapper to handle permission logic
const Notifier = {
  lastHer: null,
  lastHim: null,
  lastSelfAction: 0,

  init() {
    if ("Notification" in window && Notification.permission === "default") {
      // Can't request on load, must be user action.
    }
  },

  ask() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  },

  sendTelegram(text) {
    const url = `https://api.telegram.org/bot${
      CONFIG.telegram.token
    }/sendMessage?chat_id=${CONFIG.telegram.chatId}&text=${encodeURIComponent(
      text
    )}`;
    fetch(url, { mode: "no-cors" }).catch((e) => console.error("TG Fail", e));
  },

  checkIncoming(type, val) {
    if (Date.now() - this.lastSelfAction < 1000) return; // Ignore updates triggered by me

    let lastVal = type === "her" ? this.lastHer : this.lastHim;
    if (lastVal !== null && val > lastVal) {
      // New Value!
      if (Notification.permission === "granted") {
        new Notification("💌 New Update!", {
          body: type === "her" ? "She sent you a kiss!" : "He sent you love!",
          icon: "https://fav.farm/💌",
        });
      }
    }

    if (type === "her") this.lastHer = val;
    else this.lastHim = val;
  },
};

// ================= MAIN APP =================
const app = initializeApp(CONFIG.firebase);
const db = getDatabase(app);
const refs = {
  him: ref(db, "counts/fromHim"),
  her: ref(db, "counts/fromHer"),
};

// State
let hasInteracted = false;

// DOM Elements
const ui = {
  stage: document.getElementById("stage"),
  sent: document.getElementById("sentDisplay"),
  received: document.getElementById("receivedDisplay"),
  btns: {
    him: document.getElementById("sendToHimBtn"),
    her: document.getElementById("sendToHerBtn"),
    boody: document.getElementById("toggleBoody"),
    threeAm: document.getElementById("toggleThreeAM"),
    hearts: document.getElementById("toggleHearts"),
    random: document.getElementById("randomize"),
  },
  modals: {
    hint: document.getElementById("hintBox"),
    msg: document.getElementById("messageBox"),
    triggers: {
      hint: document.getElementById("openHint"),
      msg: document.getElementById("openMessage"),
      settings: document.getElementById("settingsTrigger"),
    },
    closers: {
      hint: document.getElementById("closeHint"),
      msg: document.getElementById("closeMessage"),
    },
  },
  marker: document.getElementById("targetMarker"),
  toast: document.getElementById("tipToast"),
  card: document.getElementById("card"),
  menu: document.getElementById("settingsMenu"),
  letter: document.getElementById("letterText"),
};

// Systems
const sound = new SoundManager();
const particles = new ParticleSystem("particles");
const chaser = new Chaser(document.getElementById("chaser"), particles);

// --- SETUP ---

// 1. Initial Data Load & Listeners
onValue(refs.her, (snap) => {
  const val = snap.val() || 0;
  ui.received.innerText = val;
  Notifier.checkIncoming("her", val);
});
onValue(refs.him, (snap) => {
  const val = snap.val() || 0;
  ui.sent.innerText = val;
  Notifier.checkIncoming("him", val);
});

// 2. Setup Message
if (CONFIG.messages.base) {
  ui.modals.triggers.msg.classList.add("visible", "has-new");
  ui.letter.textContent = CONFIG.messages.base;
}

// 3. User Interactions
function handleAction(type) {
  Notifier.ask();
  Notifier.lastSelfAction = Date.now();
  sound.play("pop");

  // UI Feedback
  animatePress();

  if (type === "him") {
    // Send TO Him
    particles.spawnBatch("💌", 12);
    Notifier.sendTelegram("💌 He sent love to Her!");

    // Optimistic
    ui.sent.innerText = (parseInt(ui.sent.innerText) || 0) + 1;
    runTransaction(refs.him, (c) => (c || 0) + 1).then(() => {
      sound.play("success");
      showFloatingAnim("Sent!", "#3b82f6");
    });
  } else {
    // Send TO Her
    particles.spawnBatch("💋", 12);
    Notifier.sendTelegram("💋 She sent a kiss to Him!");

    // Optimistic
    ui.received.innerText = (parseInt(ui.received.innerText) || 0) + 1;
    runTransaction(refs.her, (c) => (c || 0) + 1).then(() => {
      sound.play("success");
      showFloatingAnim("Mwah!", "#ff6b81");
    });
  }
}

// Bind Buttons
ui.btns.him.addEventListener("click", (e) => {
  e.stopPropagation();
  handleAction("him");
});
ui.btns.her.addEventListener("click", (e) => {
  e.stopPropagation();
  handleAction("her");
});

// Settings
ui.modals.triggers.settings.addEventListener("click", (e) => {
  e.stopPropagation();
  ui.menu.classList.toggle("open");
  ui.modals.triggers.settings.textContent = ui.menu.classList.contains("open")
    ? "✖"
    : "⚙️";
});

// Mode Toggles
ui.btns.boody.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.setMode("chill");
  highlightBtn(ui.btns.boody);
});
ui.btns.threeAm.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.setMode("3am");
  highlightBtn(ui.btns.threeAm);
});
ui.btns.hearts.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.toggleHearts();
  ui.btns.hearts.textContent = `Hearts: ${chaser.heartsOn ? "ON" : "OFF"}`;
});
ui.btns.random.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.randomizeFace();
});

function highlightBtn(btn) {
  // Remove active from all mode buttons
  [ui.btns.boody, ui.btns.threeAm].forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// Modal Handling
Object.entries(ui.modals.triggers).forEach(([key, btn]) => {
  if (key === "settings") return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const box = key === "hint" ? ui.modals.hint : ui.modals.msg;
    box.classList.add("visible");
    box.setAttribute("aria-hidden", "false");

    if (key === "msg") btn.classList.remove("has-new");
  });
});
Object.values(ui.modals.closers).forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const box = btn.closest(".modal-box");
    box.classList.remove("visible");
    box.setAttribute("aria-hidden", "true");
  });
});

// Global Click (Movement)
window.addEventListener("click", (e) => {
  // Check if modal open
  if (
    ui.modals.hint.classList.contains("visible") ||
    ui.modals.msg.classList.contains("visible")
  )
    return;

  // Intro Card Dismiss
  if (!hasInteracted) {
    hasInteracted = true;
    ui.card.style.opacity = "0";
    setTimeout(() => (ui.card.style.display = "none"), 500);
    sound.init(); // Just to be sure, trying to unlock audio context
  }

  if (e.target.id === "chaser") {
    chaser.handleInteract();
    sound.play("pop");
    return;
  }

  // Move Chaser logic
  if (
    e.target.tagName !== "BUTTON" &&
    !e.target.closest(".settings-menu") &&
    !e.target.closest(".top-bar")
  ) {
    // Move marker
    ui.marker.style.left = e.clientX + "px";
    ui.marker.style.top = e.clientY + "px";
    ui.marker.classList.remove("active");
    void ui.marker.offsetWidth; // Trigger reflow
    ui.marker.classList.add("active");

    // Set target
    if (chaser.mode !== "chill") {
      chaser.setTarget(e.clientX, e.clientY);
    }
  }

  // Close settings if outside
  if (
    ui.menu.classList.contains("open") &&
    !e.target.closest(".settings-menu") &&
    e.target !== ui.modals.triggers.settings
  ) {
    ui.menu.classList.remove("open");
    ui.modals.triggers.settings.textContent = "⚙️";
  }
});

// --- HELPERS ---
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
  Object.assign(el.style, {
    position: "fixed",
    left: 50 + (Math.random() - 0.5) * 40 + "%",
    top: 40 + (Math.random() - 0.5) * 20 + "%",
    color: color,
    fontWeight: "800",
    fontSize: "28px",
    zIndex: "999",
    pointerEvents: "none",
    textShadow: "0 4px 12px rgba(0,0,0,0.3)",
    fontFamily: "'Outfit', sans-serif",
  });
  document.body.appendChild(el);

  const anim = el.animate(
    [
      { transform: "translateY(0) scale(0.5)", opacity: 0 },
      { transform: "translateY(-20px) scale(1.2)", opacity: 1, offset: 0.2 },
      { transform: "translateY(-100px) scale(1)", opacity: 0 },
    ],
    { duration: 1200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
  );
  anim.onfinish = () => el.remove();
}

// Toast Loop
setInterval(() => {
  if (
    chaser.mode === "3am" ||
    ui.modals.hint.classList.contains("visible") ||
    ui.modals.msg.classList.contains("visible")
  )
    return;

  const randomTip =
    CONFIG.messages.tips[
      Math.floor(Math.random() * CONFIG.messages.tips.length)
    ];
  ui.toast.textContent = randomTip;
  ui.toast.classList.add("show");
  setTimeout(() => ui.toast.classList.remove("show"), 4000);
}, 12000);

// --- START LOOP ---
function gameLoop() {
  chaser.update();
  requestAnimationFrame(gameLoop);
}
gameLoop();
