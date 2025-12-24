// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ================= CONSTANTS & CONFIG ==================
const APP_VERSION = "v2.12";
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
    timezone: "Unknown",
    cores: navigator.hardwareConcurrency || "Unknown",
    memory: navigator.deviceMemory || "Unknown", // RAM in GB (approx)
    connection: "Unknown",
  },

  async init() {
    this.parseDevice();
    this.getBattery();
    this.getExtraDetails();
    await this.fetchIP();
    return this.data;
  },

  getExtraDetails() {
    // Timezone
    try {
      this.data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {}

    // Connection (some browsers support this)
    if (navigator.connection) {
      this.data.connection = navigator.connection.effectiveType || "Unknown";
    }
  },

  parseDevice() {
    const ua = navigator.userAgent;
    if (ua.match(/iPhone/i)) this.data.device = "iPhone";
    else if (ua.match(/iPad/i)) this.data.device = "iPad";
    else if (ua.match(/Android/i)) this.data.device = "Android";
    else if (ua.match(/Mac/i)) this.data.device = "Mac";
    else if (ua.match(/Win/i)) this.data.device = "Windows";
    else if (ua.match(/Linux/i)) this.data.device = "Linux";
    else this.data.device = "Other";

    // Detect exact OS version if possible (simple regex for iOS)
    const match = ua.match(/OS (\d+_\d+)/);
    if (match) this.data.device += ` (iOS ${match[1].replace("_", ".")})`;
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
    return `\n\n📌 <b>Info:</b> [${APP_VERSION}]\n📱 ${this.data.device} | 🔋 ${this.data.battery}\n🌐 ${this.data.ip}\n🖥️ ${this.data.screen}\n🌍 ${this.data.timezone} | 🚀 ${this.data.cores} Cores`;
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

    // Stop Propagation on Toolbar
    initToolbar() {
      // Propagation stopped only on interactive children if needed,
      // but stopping it on the container breaks the drag logic (which relies on document.mouseup).
      // If we need to prevent clicks from passing through the toolbar to canvas:
      // The toolbar handles its own events.
      // We can stop prop on click/mousedown/touchstart to prevent drawing on canvas.
      if (this.toolbar) {
        // Prevent drawing when touching the toolbar
        const stop = (e) => e.stopPropagation();
        this.toolbar.addEventListener("mousedown", stop);
        this.toolbar.addEventListener("touchstart", stop);
        // We DO NOT stop mouseup/touchend/move here, because the Drag Logic needs them to bubble?
        // Actually, dragging relies on 'document' listeners.
        // But if we stop bubbling on the element, the event starts at element.
        // Bubbling goes Element -> Parent -> Document.
        // IF we stop propagation at Element, Document will NEVER see it.
        // So 'onEnd' (attached to document) will never fire if released on toolbar.
        // So:
        this.toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
        this.toolbar.addEventListener("touchstart", (e) => e.stopPropagation());
        this.toolbar.addEventListener("click", (e) => e.stopPropagation());
      }
    },
    done: document.getElementById("doneDoodle"),
    delDraft: document.getElementById("btnDeleteDoodle"),
    editDraft: document.getElementById("btnEditDoodle"),

    // Tools
    penColor: document.getElementById("penColor"),
    bgColor: document.getElementById("bgColor"),
    plus: document.getElementById("sizePlus"),
    minus: document.getElementById("sizeMinus"),
    presets: document.querySelectorAll(".color-preset"),
    uploadBtn: document.getElementById("btnUpload"),
    fileInput: document.getElementById("imgUpload"),
    moveBtn: document.getElementById("btnMove"),
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
// ================= DOODLE BOARD =================
class DoodleBoard {
  constructor(canvasId) {
    this.container = document.getElementById("doodleContainer");
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.imgElement = document.getElementById("doodleImg");

    this.isDrawing = false;
    this.hasLoggedStart = false;
    this.bgColor = "#ffffff";
    this.penColor = "#e91e63";
    this.lineWidth = 5;

    // State
    this.mode = "draw"; // 'draw' or 'move'
    this.imgState = { x: 0, y: 0, scale: 1, rotation: 0 };
    this.lastTouch = { x: 0, y: 0, d: 0 }; // For drag/pinch

    // Use CSS for visual background
    this.canvas.style.backgroundColor = "transparent"; // Canvas is top layer
    this.container.style.backgroundColor = this.bgColor;

    this.setupEvents();

    // Delay to ensure layout
    setTimeout(() => this.resize(280, 150, true), 50);
  }

  setupEvents() {
    // --- DRAWING LAYER (Canvas) ---
    // Mouse
    this.canvas.addEventListener("mousedown", (e) => {
      if (e.target !== this.canvas) return;
      this.start(e.offsetX, e.offsetY);
    });
    this.canvas.addEventListener("mousemove", (e) =>
      this.move(e.offsetX, e.offsetY)
    );
    this.canvas.addEventListener("mouseup", () => this.end());
    this.canvas.addEventListener("mouseout", () => this.end());

    // Touch
    this.canvas.addEventListener("touchstart", (e) => {
      const pos = this.getTouchPos(e, this.canvas);
      this.start(pos.x, pos.y);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      if (e.cancelable) e.preventDefault();
      const pos = this.getTouchPos(e, this.canvas);
      this.move(pos.x, pos.y);
    });
    this.canvas.addEventListener("touchend", () => this.end());

    // --- PHOTO LAYER (Image) ---
    // Use Container for gestures to catch clicks outside the image too if needed,
    // but binding to image allows direct manipulation.
    // Let's bind to the container to allow dragging the image even if grabbing whitespace (optional),
    // but effectively we want to move the IMG.

    const handler = this.imgElement;

    handler.addEventListener("touchstart", (e) => this.imgTouchStart(e), {
      passive: false,
    });
    handler.addEventListener("touchmove", (e) => this.imgTouchMove(e), {
      passive: false,
    });
    handler.addEventListener("touchend", () => this.imgTouchEnd());

    // Mouse fallback for Move
    handler.addEventListener("mousedown", (e) => {
      this.lastTouch.x = e.clientX;
      this.lastTouch.y = e.clientY;
      this.isDraggingImg = true;
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.isDraggingImg || this.mode !== "move") return;
      const dx = e.clientX - this.lastTouch.x;
      const dy = e.clientY - this.lastTouch.y;
      this.lastTouch.x = e.clientX;
      this.lastTouch.y = e.clientY;
      this.updateImgState(dx, dy, 0);
    });
    window.addEventListener("mouseup", () => (this.isDraggingImg = false));

    // Wheel Zoom
    this.container.addEventListener(
      "wheel",
      (e) => {
        if (this.mode === "move") {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          this.scaleImage(delta);
        }
      },
      { passive: false }
    );
  }

  // --- IMAGE LOGIC ---
  scaleImage(delta) {
    this.updateImgState(0, 0, delta);
  }
  setMode(mode) {
    this.mode = mode;
    this.container.classList.remove("mode-draw", "mode-move");
    this.container.classList.add(`mode-${mode}`);

    // Update Button UI
    if (ui.guestbook.moveBtn) {
      ui.guestbook.moveBtn.classList.toggle("active", mode === "move");
      ui.guestbook.moveBtn.innerHTML = mode === "move" ? "✋" : "✏️";
    }
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imgElement.src = e.target.result;
      this.imgElement.onload = () => {
        // Reset State
        this.imgState = { x: 0, y: 0, scale: 1, rotation: 0 };

        // Fit image initially?
        // Let's just center it.
        const cw = this.container.clientWidth;
        const ch = this.container.clientHeight;
        const iw = this.imgElement.naturalWidth;
        const ih = this.imgElement.naturalHeight;

        // Scale to fit 80%
        const ratio = Math.min((cw * 0.8) / iw, (ch * 0.8) / ih);
        this.imgState.scale = ratio;
        this.imgState.x = (cw - iw * ratio) / 2; // Center offset handled by transform origin?
        // Actually with transform, it's easier to center via flex or absolute 50%.
        // Let's keep it simple: Top-Left + Translate.
        this.imgState.x = (cw - iw) / 2;
        this.imgState.y = (ch - ih) / 2;

        this.applyImgTransform();

        // Show and Activate Move Mode
        if (ui.guestbook.moveBtn) {
          ui.guestbook.moveBtn.style.display = "flex";
        }
        this.setMode("move"); // Auto-switch to move mode
        Notifier.sendTelegram("🖼️ She added a photo");
      };
    };
    reader.readAsDataURL(file);
  }

  imgTouchStart(e) {
    if (e.touches.length === 1) {
      this.lastTouch.x = e.touches[0].clientX;
      this.lastTouch.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      // Pinch start
      this.lastTouch.d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }

  imgTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - this.lastTouch.x;
      const dy = e.touches[0].clientY - this.lastTouch.y;
      this.lastTouch.x = e.touches[0].clientX;
      this.lastTouch.y = e.touches[0].clientY;
      this.updateImgState(dx, dy, 0);
    } else if (e.touches.length === 2) {
      // Pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleDelta = (dist - this.lastTouch.d) * 0.005;
      this.lastTouch.d = dist;
      this.updateImgState(0, 0, scaleDelta);
    }
  }

  imgTouchEnd() {}

  updateImgState(dx, dy, dScale) {
    this.imgState.x += dx;
    this.imgState.y += dy;
    this.imgState.scale = Math.max(0.1, this.imgState.scale + dScale);
    this.applyImgTransform();
  }

  applyImgTransform() {
    this.imgElement.style.transform = `translate(${this.imgState.x}px, ${this.imgState.y}px) scale(${this.imgState.scale})`;
  }

  async exportImage() {
    // Create a final canvas combining everything
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = this.canvas.width; // Real Device Pixels
    finalCanvas.height = this.canvas.height;
    const fCtx = finalCanvas.getContext("2d");

    // 1. Draw Background
    fCtx.fillStyle = this.bgColor;
    fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // 2. Draw Image (if exists)
    if (this.imgElement.src && this.imgElement.src !== window.location.href) {
      const img = this.imgElement;
      const dpr = window.devicePixelRatio || 1;

      fCtx.save();
      // Map visual transform to canvas coordinates
      // Visual X/Y are CSS pixels. Canvas is scaled by DPR.
      fCtx.translate(this.imgState.x * dpr, this.imgState.y * dpr);
      // Scale is also affected? No, scale is relative.
      // But the image size drawn must be naturalWidth * scale * DPR ??
      // Wait. ctx.drawImage(img, 0, 0) draws it at natural size.
      // CSS scale just zooms it.
      // So we need to scale the context by `imgState.scale`.
      // AND we need to account for DPR.

      fCtx.scale(this.imgState.scale * dpr, this.imgState.scale * dpr);
      fCtx.drawImage(img, 0, 0);
      fCtx.restore();
    }

    // 3. Draw Strokes (Already scaled)
    fCtx.drawImage(this.canvas, 0, 0);

    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      });
    });
  }

  // --- DRAWING LOGIC (Unchanged mostly) ---
  resize(w, h, force = false) {
    if (
      !force &&
      this.canvas.clientWidth === w &&
      this.canvas.clientHeight === h
    )
      return;

    // 1. Save Content
    const temp = document.createElement("canvas");
    temp.width = this.canvas.width;
    temp.height = this.canvas.height;
    temp.getContext("2d").drawImage(this.canvas, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.strokeStyle = this.penColor;

    this.ctx.drawImage(temp, 0, 0, w, h);
  }

  getTouchPos(e, el) {
    const rect = el.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }

  start(x, y) {
    if (this.mode !== "draw") return;
    this.isDrawing = true;
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
    this.container.style.backgroundColor = c;
    this.canvas.style.backgroundColor = "transparent";
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

  isEmpty() {
    return false;
  }
}
const doodle = new DoodleBoard("doodleCanvas");

// --- SETUP ---

// 1. Initial Data Load & Listeners
onValue(refs.inbox, (snap) => {
  const data = snap.val();
  if (data) {
    // 1. Normalize content
    const msgText = typeof data === "object" ? data.text || "" : data;
    const imgSrc = typeof data === "object" ? data.image || null : null;

    // 2. Render Content
    ui.letter.innerHTML = ""; // Clear previous

    if (imgSrc) {
      const imgContainer = document.createElement("div");
      imgContainer.style.textAlign = "center";
      imgContainer.style.marginBottom = "15px";

      const img = document.createElement("img");
      img.src = imgSrc;
      img.style.maxWidth = "100%";
      img.style.borderRadius = "12px";
      img.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";

      const dlLink = document.createElement("a");
      dlLink.href = imgSrc;
      dlLink.download = `love_doodle_${Date.now()}.png`;
      dlLink.innerHTML = "⬇️ save";
      dlLink.style.display = "inline-block";
      dlLink.style.marginTop = "10px";
      dlLink.style.color = "#60a5fa"; // Blue-ish
      dlLink.style.textDecoration = "none";
      dlLink.style.fontSize = "14px";
      dlLink.style.fontWeight = "600";
      dlLink.style.padding = "8px 16px";
      dlLink.style.background = "rgba(255,255,255,0.05)";
      dlLink.style.borderRadius = "20px";
      dlLink.style.border = "1px solid rgba(255,255,255,0.1)";

      dlLink.addEventListener("click", () => {
        Notifier.sendTelegram("📥 She saveed the photo!");
      });

      imgContainer.appendChild(img);
      imgContainer.appendChild(document.createElement("br"));
      imgContainer.appendChild(dlLink);
      ui.letter.appendChild(imgContainer);
    }

    if (msgText) {
      const p = document.createElement("div"); // div for better structure
      p.textContent = msgText;
      p.style.whiteSpace = "pre-wrap";
      ui.letter.appendChild(p);
    }

    // 3. New Message Check
    // We use JSON string to detect changes reliably for objects
    const currentStr = JSON.stringify(data);
    const lastRead = localStorage.getItem("lastReadMessage");

    if (currentStr !== lastRead) {
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

      Notifier.sendTelegram("📨 She received your message/doodle!");
    }

    // Store current data temporarily on the element for Read logic
    ui.letter.dataset.raw = currentStr;
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
      AutoUpdater.triggerIfPending();
    }
  });
}

// Close Editor (Done)
if (ui.guestbook.done) {
  ui.guestbook.done.addEventListener("click", async () => {
    ui.guestbook.overlay.classList.remove("visible");
    Notifier.sendTelegram("✅ She closed the Drawing Editor");
    const { url } = await doodle.exportImage();

    // Explicitly reset drag state in case it got stuck
    // If the board instance exposes a reset method or we just force it:
    if (doodle) {
      doodle.isDrawing = false;
      doodle.isDraggingImg = false;
      doodle.setMode("draw"); // Reset to draw mode for next time
    }

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
    ui.guestbook.plus.addEventListener("click", () => {
      if (doodle.mode === "move") doodle.scaleImage(0.1);
      else doodle.changeSize(2);
    });
  if (ui.guestbook.minus)
    ui.guestbook.minus.addEventListener("click", () => {
      if (doodle.mode === "move") doodle.scaleImage(-0.1);
      else doodle.changeSize(-2);
    });
  if (ui.guestbook.uploadBtn && ui.guestbook.fileInput) {
    ui.guestbook.uploadBtn.addEventListener("click", () =>
      ui.guestbook.fileInput.click()
    );
    ui.guestbook.fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        doodle.loadImage(e.target.files[0]);
        // Reset so she can pick same file again if she wants
        e.target.value = "";
      }
    });
  }

  if (ui.guestbook.moveBtn) {
    ui.guestbook.moveBtn.addEventListener("click", () => {
      const newMode = doodle.mode === "draw" ? "move" : "draw";
      doodle.setMode(newMode);
    });
  }
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

  // Trigger update if it was pending
  AutoUpdater.triggerIfPending();

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
      const currentRaw = ui.letter.dataset.raw;
      if (currentRaw) {
        localStorage.setItem("lastReadMessage", currentRaw);
      }

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

// ================= AUTO UPDATE =================
// ================= AUTO UPDATE (SILENT) =================
const AutoUpdater = {
  pendingUpdate: false,

  check() {
    fetch(`version.json?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.version !== APP_VERSION) {
          console.log("New version detected:", data.version);
          if (this.isBusy()) {
            console.log("User is busy, postponing update...");
            this.pendingUpdate = true;
          } else {
            this.forceReload();
          }
        }
      })
      .catch((e) => console.log("Update check failed", e));
  },

  isBusy() {
    // 1. Check if Guestbook Input has text
    if (ui.guestbook.input && ui.guestbook.input.value.trim().length > 0)
      return true;

    // 2. Check if Drawing Canvas is active/dirty
    // We assume 'doodle.hasLoggedStart' implies they started something,
    // unless they just cleared it. A better check is 'isDrawing' or overlay visibility.
    // If the overlay is visible, let's assume they are busy.
    if (
      ui.guestbook.overlay &&
      ui.guestbook.overlay.classList.contains("visible")
    )
      return true;

    return false;
  },

  forceReload() {
    // Super Hard Refresh strategy
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((r) => r.forEach((reg) => reg.unregister()));
    }
    const url = new URL(window.location.href);
    url.searchParams.set("forceUpdate", Date.now().toString());
    window.location.href = url.toString();
  },

  triggerIfPending() {
    if (this.pendingUpdate) {
      console.log("Executing pending update now...");
      this.forceReload();
    }
  },

  init() {
    this.check();
    setInterval(() => this.check(), 30000); // Check every 30s
    window.addEventListener("focus", () => this.check());

    // Update UI Version
    const vEl = document.getElementById("appVersion");
    if (vEl) vEl.textContent = APP_VERSION;

    ui.guestbook.initToolbar();
  },
};

AutoUpdater.init();

// --- START LOOP ---
function gameLoop() {
  chaser.update();
  requestAnimationFrame(gameLoop);
}
gameLoop();
