// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
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
  letters: {
    "Sad 😢": "It's okay to be sad. w meen sm3k ya5ty",
    "Happy 🥳": "Yay! I love seeing you happy! Keep smiling beautiful! ✨",
    "Miss You 🥺": "el 7al mn b3do :) 💖",
    "Mad 😡": "2eh el gdeed !!!",
  },
  speeds: {
    chill: 0.03,
    angry: 0.12,
    mode3am: 0.15,
  },
  messages: {
    base: "Check the Love Coupons (🎁) or open a letter (📂) ",
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

// ================= USER INFO & LOGGING =================
const UserInfo = {
  data: {
    ip: "Loading...",
    device: "Unknown",
    platform: navigator.platform || "Unknown",
    screen: `${window.innerWidth}x${window.innerHeight}`,
    lang: navigator.language || "en",
    userAgent: navigator.userAgent,
    battery: "Unknown",
  },

  async init() {
    this.parseDevice();
    this.getBattery();
    await this.fetchIP();
    return this.data;
  },

  parseDevice() {
    const ua = navigator.userAgent;
    if (ua.match(/iPhone/i)) this.data.device = "iPhone";
    else if (ua.match(/iPad/i)) this.data.device = "iPad";
    else if (ua.match(/Android/i)) this.data.device = "Android";
    else if (ua.match(/Mac/i)) this.data.device = "Mac";
    else if (ua.match(/Win/i)) this.data.device = "Windows";
    else if (ua.match(/Linux/i)) this.data.device = "Linux"; // Added Linux
    else this.data.device = "Other";
  },

  async fetchIP() {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const json = await res.json();
      this.data.ip = json.ip;
    } catch (e) {
      this.data.ip = "Failed to get IP";
    }
  },

  async getBattery() {
    if ("getBattery" in navigator) {
      try {
        const bat = await navigator.getBattery();
        this.data.battery = `${Math.round(bat.level * 100)}%${
          bat.charging ? " ⚡" : ""
        }`;
      } catch (e) {}
    }
  },

  getSignature() {
    return `\n\n📌 <b>Info:</b>\n📱 ${this.data.device} | 🔋 ${this.data.battery}\n🌐 ${this.data.ip}\n🖥️ ${this.data.screen}`;
  },
};

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
const Notifier = {
  lastHer: null,
  lastHim: null,
  lastSelfAction: 0,

  async init() {
    await UserInfo.init();

    // Visit Alert (Only once per session)
    const lastVisit = sessionStorage.getItem("lastVisit");
    if (!lastVisit) {
      sessionStorage.setItem("lastVisit", Date.now());
      this.sendTelegram(`🚨 <b>SHE OPENED THE SITE!</b> 🚨`);
    } else {
      // Just log a return visit silently or with a smaller alert
      // this.sendTelegram(`👀 She's back!`);
    }
  },

  ask() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  },

  sendTelegram(text) {
    // Append Info & Timestamp
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });

    // Support Bold (**text**) -> HTML
    text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    const fullText = `[${time}] ${text}` + UserInfo.getSignature();

    const url = `https://api.telegram.org/bot${
      CONFIG.telegram.token
    }/sendMessage?chat_id=${
      CONFIG.telegram.chatId
    }&parse_mode=HTML&text=${encodeURIComponent(fullText)}`;
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

  async sendPhoto(blob, caption) {
    const formData = new FormData();
    formData.append("chat_id", CONFIG.telegram.chatId);
    formData.append("photo", blob, "doodle.png");

    // Add time to caption
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });
    if (caption) {
      // Change ** to <b> for Telegram HTML mode if user uses markdown style
      caption = caption.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      formData.append(
        "caption",
        `[${time}] ${caption}` + UserInfo.getSignature()
      );
      formData.append("parse_mode", "HTML");
    }

    const url = `https://api.telegram.org/bot${CONFIG.telegram.token}/sendPhoto`;

    try {
      await fetch(url, { method: "POST", body: formData });
    } catch (e) {
      console.error("TG Photo Fail", e);
    }
  },
};

// ================= MAIN APP =================
const app = initializeApp(CONFIG.firebase);
const db = getDatabase(app);
const refs = {
  him: ref(db, "counts/fromHim"),
  her: ref(db, "counts/fromHer"),
  inbox: ref(db, "inbox/message"),
};

// State
let hasInteracted = false;

// DOM Elements
const ui = {
  stage: document.getElementById("stage"),
  sent: document.getElementById("sentDisplay"),
  received: document.getElementById("receivedDisplay"),
  guestbook: {
    input: document.getElementById("guestbookInput"),
    send: document.getElementById("sendNoteBtn"),
    clear: document.getElementById("clearDoodle"),

    // New Elements
    overlay: document.getElementById("doodleOverlay"),
    toolbar: document.getElementById("doodleToolbar"),
    toggleTools: document.getElementById("toggleTools"),
    launcher: document.getElementById("doodleLauncher"),
    thumb: document.getElementById("doodleThumbnail"),
    done: document.getElementById("doneDoodle"),
    delDraft: document.getElementById("btnDeleteDoodle"),
    editDraft: document.getElementById("btnEditDoodle"),

    // Tools
    penColor: document.getElementById("penColor"),
    bgColor: document.getElementById("bgColor"),
    plus: document.getElementById("sizePlus"),
    minus: document.getElementById("sizeMinus"),
    presets: document.querySelectorAll(".color-preset"),
  },
  btns: {
    him: document.getElementById("sendToHimBtn"),
    her: document.getElementById("sendToHerBtn"),
    boody: document.getElementById("toggleBoody"),
    threeAm: document.getElementById("toggleThreeAM"),
    hearts: document.getElementById("toggleHearts"),
    random: document.getElementById("randomize"),
    letters: document.getElementById("openLetters"),
    guestbook: document.getElementById("openGuestbook"),
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
  letterView: {
    box: document.getElementById("letterViewBox"),
    content: document.getElementById("letterContent"),
    close: document.querySelector("#letterViewBox .close-btn"),
  },
};

// Systems
// const sound = new SoundManager(); // Removed
const particles = new ParticleSystem("particles");
const chaser = new Chaser(document.getElementById("chaser"), particles);

// ================= DOODLE BOARD =================
// ================= DOODLE BOARD =================
class DoodleBoard {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.isDrawing = false;
    this.hasLoggedStart = false; // New Log flag
    this.bgColor = "#ffffff";
    this.penColor = "#e91e63";
    this.lineWidth = 5;

    // Use CSS for visual background (instant change)
    this.canvas.style.backgroundColor = this.bgColor;

    this.setupEvents();
    // Delay slightly to ensure layout is ready
    setTimeout(() => this.resize(280, 150, true), 50);
  }

  setupEvents() {
    // Mouse
    this.canvas.addEventListener("mousedown", (e) =>
      this.start(e.offsetX, e.offsetY)
    );
    this.canvas.addEventListener("mousemove", (e) =>
      this.move(e.offsetX, e.offsetY)
    );
    this.canvas.addEventListener("mouseup", () => this.end());
    this.canvas.addEventListener("mouseout", () => this.end());

    // Touch
    this.canvas.addEventListener("touchstart", (e) => {
      // Touch action handled in CSS
      const pos = this.getTouchPos(e);
      this.start(pos.x, pos.y);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      if (e.cancelable) e.preventDefault();
      const pos = this.getTouchPos(e);
      this.move(pos.x, pos.y);
    });
    this.canvas.addEventListener("touchend", () => this.end());
  }

  resize(w, h, force = false) {
    if (
      !force &&
      this.canvas.clientWidth === w &&
      this.canvas.clientHeight === h
    )
      return;

    // 1. Save Content (Transparent)
    const temp = document.createElement("canvas");
    temp.width = this.canvas.width;
    temp.height = this.canvas.height;
    temp.getContext("2d").drawImage(this.canvas, 0, 0);

    // 2. Handle DPI (High Resolution)
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;

    // Style matches logical size
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Scale context
    this.ctx.scale(dpr, dpr);

    // 3. Restore Config
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.strokeStyle = this.penColor;

    // 4. Restore Content (Scaled)
    this.ctx.drawImage(temp, 0, 0, w, h);
  }

  getTouchPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }

  start(x, y) {
    this.isDrawing = true;

    // Log start of drawing (once per session)
    if (!this.hasLoggedStart) {
      this.hasLoggedStart = true;
      Notifier.sendTelegram("✏️ She started drawing...");
    }

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  move(x, y) {
    if (!this.isDrawing) return;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  end() {
    this.isDrawing = false;
  }

  setColor(c) {
    this.penColor = c;
    this.ctx.strokeStyle = c;
  }

  setBg(c) {
    this.bgColor = c;
    this.canvas.style.backgroundColor = c;
  }

  changeSize(delta) {
    // 2 to 20 range
    this.lineWidth = Math.max(2, Math.min(20, this.lineWidth + delta));
    this.ctx.lineWidth = this.lineWidth;

    // Show temporary feedback (optional, but requested implicitly by 'visually more appearing')
    showFloatingAnim(`Size: ${this.lineWidth}`, this.penColor);
  }

  clear() {
    // Clear transparent canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Note: cleared in raw pixels
    this.hasLoggedStart = false; // Reset log on clear
    Notifier.sendTelegram("🗑️ She cleared her drawing");
  }

  async exportImage() {
    // Composite for Send
    const exp = document.createElement("canvas");
    exp.width = this.canvas.width;
    exp.height = this.canvas.height;
    const xCtx = exp.getContext("2d");

    // Fill BG color
    xCtx.fillStyle = this.bgColor;
    xCtx.fillRect(0, 0, exp.width, exp.height);

    // Draw content
    xCtx.drawImage(this.canvas, 0, 0);

    return new Promise((resolve) => {
      exp.toBlob((blob) => resolve({ blob, url: exp.toDataURL("image/png") }));
    });
  }

  isEmpty() {
    return false;
  }
}
const doodle = new DoodleBoard("doodleCanvas");

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
onValue(refs.inbox, (snap) => {
  const msg = snap.val();
  if (msg) {
    ui.letter.textContent = msg;

    // Check if truly new (not just a reload)
    const lastRead = localStorage.getItem("lastReadMessage");
    if (msg !== lastRead) {
      // It's new!
      const counter = document.getElementById("msgCounter");
      counter.textContent = "1";
      counter.classList.add("visible");

      // Shake Animation
      const btn = document.getElementById("openMessage");
      btn.classList.add("has-new");
      btn.classList.remove("shaking");
      void btn.offsetWidth; // Trigger reflow
      btn.classList.add("shaking");

      Notifier.sendTelegram("📨 She received your message update!");
    }
  }
});

// 2. Setup Message
if (CONFIG.messages.base) {
  ui.modals.triggers.msg.classList.add("visible", "has-new");
  ui.letter.textContent = CONFIG.messages.base;
  ui.letter.textContent = CONFIG.messages.base;
}

// Visit Notification
Notifier.init();

// Guestbook Logic
ui.guestbook.clear.addEventListener("click", () => {
  if (doodle.isEmpty()) return;
  if (confirm("Are you sure you want to clear your drawing? 🗑️")) {
    doodle.clear();
  }
});

// Toggle Toolbar & Draggable Logic
if (ui.guestbook.toolbar && ui.guestbook.toggleTools) {
  const el = ui.guestbook.toolbar;
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;
  let hasMoved = false;

  const onStart = (e) => {
    // Only drag if minimized
    if (!el.classList.contains("minimized")) return;

    isDragging = true;
    hasMoved = false;

    // Get client coordinates
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startX = clientX;
    startY = clientY;

    // Get current position
    const rect = el.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Ensure we are in absolute positioning mode for dragging
    el.style.left = initialLeft + "px";
    el.style.top = initialTop + "px";
    el.style.transform = "none";

    e.preventDefault(); // Stop scrolling
  };

  const onMove = (e) => {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    // Boundary Constraints
    const maxLeft = window.innerWidth - el.offsetWidth;
    const maxTop = window.innerHeight - el.offsetHeight;

    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));

    el.style.left = newLeft + "px";
    el.style.top = newTop + "px";
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;

    // If it was just a click (little movement), toggle
    if (!hasMoved) {
      toggleToolbar();
    }
  };

  // Attach events
  el.addEventListener("mousedown", onStart);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);

  el.addEventListener("touchstart", onStart, { passive: false });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);

  // Toggle Function
  function toggleToolbar() {
    el.classList.toggle("minimized");
    const isMin = el.classList.contains("minimized");
    ui.guestbook.toggleTools.textContent = isMin ? "🎨" : "🔽";

    // Reset Position when expanding
    if (!isMin) {
      el.style.left = "50%";
      el.style.top = "max(20px, env(safe-area-inset-top))";
      el.style.transform = "translateX(-50%)";
    }
  }

  // Bind click on toggle button (for when expanded)
  ui.guestbook.toggleTools.addEventListener("click", (e) => {
    if (!el.classList.contains("minimized")) {
      toggleToolbar();
      e.stopPropagation();
      Notifier.sendTelegram("🎨 She minimized the toolbar");
    }
  });
}

const openEditor = () => {
  ui.guestbook.overlay.classList.add("visible");
  doodle.hasLoggedStart = false; // Reset log flag
  Notifier.sendTelegram("🎨 she opened the Doodle Editor");

  // Ensure toolbar is visible (not minimized) when opening
  if (ui.guestbook.toolbar) {
    ui.guestbook.toolbar.classList.remove("minimized");
    ui.guestbook.toolbar.style.left = "50%";
    ui.guestbook.toolbar.style.top = "max(20px, env(safe-area-inset-top))";
    ui.guestbook.toolbar.style.transform = "translateX(-50%)";

    if (ui.guestbook.toggleTools) ui.guestbook.toggleTools.textContent = "🔽";
  }
  doodle.resize(window.innerWidth, window.innerHeight, true);
};

// Launch Editor (Tap to Draw)
if (ui.guestbook.launcher) {
  ui.guestbook.launcher.addEventListener("click", (e) => {
    // Did we click the delete button?
    if (e.target.closest("#btnDeleteDoodle")) return;

    openEditor();
  });
}
// Edit Button (Explicit)
if (ui.guestbook.editDraft) {
  ui.guestbook.editDraft.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditor();
  });
}

// Delete Draft
if (ui.guestbook.delDraft) {
  ui.guestbook.delDraft.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Delete this doodle? 🗑️")) {
      doodle.clear();
      ui.guestbook.thumb.classList.remove("visible");
      // Launcher controls will auto-hide via CSS
      Notifier.sendTelegram("🗑️ She deleted her doodle draft");
    }
  });
}

// Close Editor (Done)
if (ui.guestbook.done) {
  ui.guestbook.done.addEventListener("click", async () => {
    ui.guestbook.overlay.classList.remove("visible");
    Notifier.sendTelegram("✅ She closed the Drawing Editor");
    const { url } = await doodle.exportImage();
    ui.guestbook.thumb.src = url;
    ui.guestbook.thumb.classList.add("visible");
  });
}

// Controls
if (ui.guestbook.penColor) {
  ui.guestbook.penColor.addEventListener("change", (e) =>
    doodle.setColor(e.target.value)
  );
  ui.guestbook.bgColor.addEventListener("change", (e) =>
    doodle.setBg(e.target.value)
  );
  ui.guestbook.presets.forEach((btn) => {
    btn.addEventListener("click", () => {
      const c = btn.getAttribute("data-color");
      doodle.setColor(c);
      ui.guestbook.penColor.value = c;
    });
  });

  if (ui.guestbook.plus)
    ui.guestbook.plus.addEventListener("click", () => doodle.changeSize(2));
  if (ui.guestbook.minus)
    ui.guestbook.minus.addEventListener("click", () => doodle.changeSize(-2));
}

ui.guestbook.send.addEventListener("click", async () => {
  const msg = ui.guestbook.input.value.trim();
  const hasDoodle = ui.guestbook.thumb.classList.contains("visible");

  // Optimistic UI
  ui.guestbook.input.value = "";
  const box = document.getElementById("guestbookBox");
  box.classList.remove("visible");
  box.setAttribute("aria-hidden", "true");

  // Hide Thumbnail
  ui.guestbook.thumb.classList.remove("visible");

  showFloatingAnim("Sent!", "#a855f7");
  particles.spawnBatch("📝", 8);

  const timestamp = Date.now();
  let imageUrl = null;

  if (hasDoodle) {
    const { blob, url } = await doodle.exportImage();
    imageUrl = url;
    Notifier.sendPhoto(blob, msg ? `📝 Note: ${msg}` : "🎨 A doodle for you!");
    doodle.clear();
  } else if (msg) {
    Notifier.sendTelegram(`📝 **New Message:**\n"${msg}"`);
  }

  // Save to Firebase
  if (msg || imageUrl) {
    push(ref(db, "guestbook"), {
      text: msg,
      image: imageUrl,
      sentToTelegram: false,
      timestamp,
    });
  }
});

// Letters Logic
document.querySelectorAll(".mood-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mood = btn.getAttribute("data-mood");
    const text = CONFIG.letters[mood];
    if (text) {
      ui.letterView.content.textContent = text;
      ui.letterView.box.classList.add("visible");
      document.getElementById("lettersBox").classList.remove("visible"); // Close menu
      Notifier.sendTelegram(`💌 shee is reading:** ${mood}`);
    }
  });
});
ui.letterView.close.addEventListener("click", () => {
  ui.letterView.box.classList.remove("visible");
});

// 3. User Interactions
function handleAction(type) {
  Notifier.ask();
  Notifier.lastSelfAction = Date.now();
  // sound.play("pop");

  // UI Feedback
  animatePress();

  if (type === "him") {
    // Send TO Him
    particles.spawnBatch("💌", 12);
    Notifier.sendTelegram("💌 He sent love to Her!");

    // Optimistic
    ui.sent.innerText = (parseInt(ui.sent.innerText) || 0) + 1;
    runTransaction(refs.him, (c) => (c || 0) + 1).then(() => {
      // sound.play("success");
      showFloatingAnim("Sent!", "#3b82f6");
    });
  } else {
    // Send TO Her
    particles.spawnBatch("💋", 12);
    Notifier.sendTelegram("💋 She sent a kiss to Him!");

    // Optimistic
    ui.received.innerText = (parseInt(ui.received.innerText) || 0) + 1;
    runTransaction(refs.her, (c) => (c || 0) + 1).then(() => {
      // sound.play("success");
      showFloatingAnim("Mwah!", "#ff6b81");
    });
  }
}

// Bind Buttons
// "Send to Him" implies action FROM HER
ui.btns.him.addEventListener("click", (e) => {
  e.stopPropagation();
  handleAction("her");
});

// "Send to Her" implies action FROM HIM
ui.btns.her.addEventListener("click", (e) => {
  e.stopPropagation();
  handleAction("him");
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
  Notifier.sendTelegram("😌 She switched to Chill Mode");
});
ui.btns.threeAm.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.setMode("3am");
  highlightBtn(ui.btns.threeAm);
  Notifier.sendTelegram("😈 shee switched to 3 A.M. Mode!**");
});
ui.btns.hearts.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.toggleHearts();
  ui.btns.hearts.textContent = `Hearts: ${chaser.heartsOn ? "ON" : "OFF"}`;
  Notifier.sendTelegram(
    `💖 She toggled Hearts ${chaser.heartsOn ? "ON" : "OFF"}`
  );
});
ui.btns.random.addEventListener("click", (e) => {
  e.stopPropagation();
  chaser.randomizeFace();
  Notifier.sendTelegram("🎲 She clicked Randomize Face");
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

    if (key === "hint")
      Notifier.sendTelegram("🎁 She opened the Love Coupons!");
    if (key === "msg") {
      btn.classList.remove("has-new");

      // Reset Counter & Mark as Read
      const counter = document.getElementById("msgCounter");
      counter.classList.remove("visible");
      counter.textContent = "";

      // Save to storage so it doesn't pop up again on reload
      const currentMsg = ui.letter.textContent;
      localStorage.setItem("lastReadMessage", currentMsg);

      Notifier.sendTelegram("📨 She opened her Inbox");
    }
  });
});

// Open Letters Modal
ui.btns.letters.addEventListener("click", (e) => {
  e.stopPropagation();
  const box = document.getElementById("lettersBox");
  box.classList.add("visible");
  box.setAttribute("aria-hidden", "false");
  Notifier.sendTelegram("📂 She opened the Letters Menu");
});

// Open Guestbook Modal
ui.btns.guestbook.addEventListener("click", (e) => {
  e.stopPropagation();
  const box = document.getElementById("guestbookBox");
  box.classList.add("visible");
  box.setAttribute("aria-hidden", "false");
  Notifier.sendTelegram("✏️ She opened the Guestbook");
});

// Generic Close Logic (Handles all modals)
document.querySelectorAll(".close-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const box = btn.closest(".modal-box");
    if (box) {
      box.classList.remove("visible");
      box.setAttribute("aria-hidden", "true");
    }
  });
});

// Global Click (Movement)
window.addEventListener("click", (e) => {
  // Check if any modal is open
  if (document.querySelector(".modal-box.visible")) return;

  // Intro Card Dismiss
  if (!hasInteracted) {
    hasInteracted = true;
    ui.card.style.opacity = "0";
    setTimeout(() => (ui.card.style.display = "none"), 500);
    // sound.init();
  }

  if (e.target.id === "chaser") {
    chaser.handleInteract();
    // sound.play("pop");
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
