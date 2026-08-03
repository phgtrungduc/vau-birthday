/* =========================================================
   Birthday Countdown — Script
   =========================================================
   CẤU HÌNH DỄ THAY ĐỔI (sửa các biến bên dưới):
   ========================================================= */

/**
 * Ngày sinh nhật mục tiêu.
 * Định dạng: "YYYY-MM-DDTHH:mm:ss" (giờ địa phương trình duyệt)
 *
 * Ví dụ:
 *   "2026-12-25T00:00:00"  → 00:00 ngày 25/12/2026
 *   "2027-03-15T09:30:00"  → 09:30 ngày 15/03/2027
 */
const TARGET_DATE = "2026-09-08T00:00:00";

/** Tên hiển thị trong lời tựa */
const BIRTHDAY_NAME = "Minh Phương";

/** Đường dẫn nhạc nền (đặt file tại assets/music.mp3) */
const MUSIC_SRC = "assets/music.mp3";

/**
 * Bắt đầu phát nhạc từ giây thứ mấy (0 = từ đầu bài).
 * Ví dụ: 13 → bỏ qua 13 giây đầu, phát từ giây thứ 13.
 */
const MUSIC_START_SECONDS = 13;

/** Âm lượng nhạc nền bình thường (0 → 1) */
const MUSIC_VOLUME = 0.45;

/** Âm lượng khi mở hộp quà / celebration */
const MUSIC_VOLUME_CELEBRATION = 1;

/** Bật/tắt hiệu ứng hạt bụi vàng (tsparticles) */
const PARTICLES_ENABLED = true;

/** Số lượng hạt (desktop; mobile sẽ tự giảm) */
const PARTICLES_COUNT = 70;

/**
 * Text động phía trên countdown — chọn theo số ngày còn lại.
 * Duyệt từ trên xuống: điều kiện maxDays đầu tiên thỏa (days <= maxDays) sẽ được dùng.
 * Ví dụ: còn 20 ngày → "Coming soon...", còn 5 ngày → "Almost there..."
 */
const STATUS_MESSAGES = [
  { maxDays: 0, text: "It's time!" },           // < 1 ngày (0 ngày đầy đủ)
  { maxDays: 1, text: "Final day..." },         // còn 1 ngày
  { maxDays: 7, text: "Almost there..." },      // ≤ 1 tuần
  { maxDays: 30, text: "Coming soon..." },      // ≤ 1 tháng
  { maxDays: Infinity, text: "Counting down..." }, // còn lâu hơn
];

/* =========================================================
   Logic chính — không cần sửa nếu chỉ muốn đổi ngày / tên
   ========================================================= */

const els = {
  subtitle: document.getElementById("subtitle"),
  statusLine: document.getElementById("status-line"),
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  message: document.getElementById("birthday-message"),
  card: document.getElementById("main-card"),
  countdown: document.getElementById("countdown"),
  musicBtn: document.getElementById("music-toggle"),
  music: document.getElementById("bg-music"),
  musicHint: document.getElementById("music-hint"),
  giftStage: document.getElementById("gift-stage"),
  giftBtn: document.getElementById("gift-btn"),
};

let giftRevealed = false;
let celebrationTriggered = false;
let confettiInterval = null;
let currentStatusText = "";

/** Pad số thành ít nhất 2 chữ số */
function pad(n) {
  const s = String(Math.max(0, n));
  return s.length < 2 ? s.padStart(2, "0") : s;
}

/** Cập nhật lời tựa theo tên đã cấu hình */
function initSubtitle() {
  if (!els.subtitle) return;
  els.subtitle.textContent = `Sắp đến ngày của ${BIRTHDAY_NAME}`;
}

/**
 * Tính khoảng thời gian còn lại đến TARGET_DATE.
 * @returns {{ total: number, days: number, hours: number, minutes: number, seconds: number }}
 */
function getTimeRemaining() {
  const target = new Date(TARGET_DATE).getTime();
  const now = Date.now();
  const total = target - now;

  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds };
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Tạo 1 slot chữ số với mặt hiện tại */
function createDigit(char) {
  const digit = document.createElement("span");
  digit.className = "digit";
  digit.dataset.char = char;

  const reel = document.createElement("span");
  reel.className = "digit__reel";

  const face = document.createElement("span");
  face.className = "digit__face";
  face.textContent = char;

  reel.appendChild(face);
  digit.appendChild(reel);
  return digit;
}

/** Build / rebuild toàn bộ chữ số trong một unit (lần đầu hoặc đổi số chữ số) */
function buildDigits(el, valueStr) {
  el.replaceChildren();
  for (const char of valueStr) {
    el.appendChild(createDigit(char));
  }
  el.dataset.value = valueStr;
  el.setAttribute("aria-label", valueStr);
}

/**
 * Flip từng chữ số khi giá trị đổi.
 * Chữ số không đổi → đứng yên; chữ số đổi → slide/flip dọc.
 */
function flipDigits(el, nextStr) {
  if (!el) return;

  const prevStr = el.dataset.value ?? "";
  if (prevStr === nextStr) return;

  // Lần đầu hoặc đổi độ dài (vd. 99 → 100 ngày) → dựng lại
  if (!prevStr || prevStr.length !== nextStr.length) {
    buildDigits(el, nextStr);
    return;
  }

  const digits = el.querySelectorAll(".digit");
  const reduceMotion = prefersReducedMotion();

  nextStr.split("").forEach((char, i) => {
    const digit = digits[i];
    if (!digit) return;

    if (digit.dataset.char === char) return;

    if (reduceMotion) {
      const face = digit.querySelector(".digit__face");
      if (face) face.textContent = char;
      digit.dataset.char = char;
      return;
    }

    const reel = digit.querySelector(".digit__reel");
    if (!reel) return;

    // Dọn animation cũ nếu tick chồng
    digit.classList.remove("is-flipping");
    const currentFace = reel.querySelector(".digit__face");
    if (currentFace) {
      reel.replaceChildren(currentFace);
      reel.style.animation = "none";
      void reel.offsetWidth;
      reel.style.animation = "";
    }

    const nextFace = document.createElement("span");
    nextFace.className = "digit__face";
    nextFace.textContent = char;
    reel.appendChild(nextFace);

    digit.dataset.char = char;

    const onDone = () => {
      reel.replaceChildren(nextFace);
      digit.classList.remove("is-flipping");
      reel.removeEventListener("animationend", onDone);
    };

    reel.addEventListener("animationend", onDone);
    digit.classList.add("is-flipping");
  });

  el.dataset.value = nextStr;
  el.setAttribute("aria-label", nextStr);
}

/** Gán giá trị vào DOM kèm flip animation */
function renderCountdown(time) {
  const map = [
    [els.days, time.days],
    [els.hours, time.hours],
    [els.minutes, time.minutes],
    [els.seconds, time.seconds],
  ];

  map.forEach(([el, value]) => flipDigits(el, pad(value)));
}

/**
 * Chọn câu status theo số ngày còn lại.
 * STATUS_MESSAGES đã sắp từ ngưỡng nhỏ → lớn.
 */
function getStatusMessage(time) {
  if (time.total <= 0) return "";

  const sorted = [...STATUS_MESSAGES].sort((a, b) => a.maxDays - b.maxDays);
  const match = sorted.find((item) => time.days <= item.maxDays);
  return match?.text ?? sorted[sorted.length - 1]?.text ?? "";
}

/** Cập nhật dòng text động (có fade khi đổi nội dung) */
function updateStatusLine(time) {
  if (!els.statusLine || giftRevealed) return;

  const next = getStatusMessage(time);
  if (!next || next === currentStatusText) return;

  const apply = () => {
    els.statusLine.textContent = next;
    currentStatusText = next;
    els.statusLine.classList.remove("is-swap");
  };

  if (!currentStatusText || prefersReducedMotion()) {
    apply();
    return;
  }

  els.statusLine.classList.add("is-swap");
  window.setTimeout(apply, 320);
}

/** Pháo hoa liên tục khi mở hộp quà */
function launchConfetti() {
  if (typeof confetti !== "function") return;

  const defaults = {
    startVelocity: 36,
    spread: 360,
    ticks: 90,
    zIndex: 100,
    colors: ["#e8d5a3", "#ffffff", "#f0c27a", "#c9a66b", "#ffd700"],
  };

  confetti({ ...defaults, particleCount: 140, origin: { x: 0.5, y: 0.55 } });
  confetti({ ...defaults, particleCount: 70, origin: { x: 0.2, y: 0.7 } });
  confetti({ ...defaults, particleCount: 70, origin: { x: 0.8, y: 0.7 } });

  const end = Date.now() + 8000;
  confettiInterval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(confettiInterval);
      confettiInterval = null;
      return;
    }
    confetti({
      ...defaults,
      particleCount: 28,
      origin: { x: Math.random(), y: Math.random() * 0.35 },
    });
  }, 350);
}

/** Tăng âm lượng + đảm bảo nhạc đang phát */
async function boostMusic() {
  if (!els.music) return;

  els.music.volume = Math.min(1, Math.max(0, MUSIC_VOLUME_CELEBRATION));
  els.musicHint?.classList.add("is-hidden");

  try {
    if (els.music.paused) {
      if (els.music.currentTime < 0.5) {
        const start = Math.max(0, Number(MUSIC_START_SECONDS) || 0);
        const duration = els.music.duration;
        if (!(Number.isFinite(duration) && duration > 0 && start >= duration)) {
          els.music.currentTime = start;
        }
      }
      await els.music.play();
    }
    els.musicBtn?.classList.add("is-playing");
    els.musicBtn?.setAttribute("aria-pressed", "true");
    els.musicBtn?.setAttribute("aria-label", "Tắt nhạc nền");
  } catch (err) {
    console.warn("Không tăng/phát được nhạc celebration.", err);
  }
}

/**
 * Khi countdown về 0: ẩn bộ đếm, hiện hộp quà.
 * Chưa confetti / chưa tăng nhạc — chờ user mở quà.
 */
function revealGift() {
  if (giftRevealed) return;
  giftRevealed = true;

  els.card?.classList.add("is-birthday");

  if (els.giftStage) {
    els.giftStage.hidden = false;
    els.giftStage.classList.add("is-visible");
  }

  if (els.subtitle) {
    els.subtitle.textContent = `Một món quà dành cho ${BIRTHDAY_NAME}`;
  }
}

/** Click mở hộp quà → confetti + lời chúc + nhạc lớn */
function openGift() {
  if (celebrationTriggered || !els.giftBtn) return;
  celebrationTriggered = true;

  els.giftBtn.classList.add("is-opening");
  els.giftStage?.classList.add("is-opened");
  els.giftBtn.setAttribute("aria-label", "Đã mở hộp quà");
  els.giftBtn.disabled = true;

  // Đợi nắp hộp bay lên rồi mới bung confetti + lời chúc
  const revealDelay = prefersReducedMotion() ? 0 : 520;

  window.setTimeout(() => {
    els.card?.classList.add("is-celebrating");

    if (els.message) {
      els.message.hidden = false;
      els.message.classList.add("is-visible");
    }

    if (els.subtitle) {
      els.subtitle.textContent = `Chúc mừng sinh nhật ${BIRTHDAY_NAME}`;
    }

    launchConfetti();
    boostMusic();

    // Ẩn hẳn hộp quà sau khi nắp mở + fade xong
    window.setTimeout(() => {
      if (els.giftStage) {
        els.giftStage.hidden = true;
        els.giftStage.classList.remove("is-visible");
      }
    }, prefersReducedMotion() ? 0 : 700);
  }, revealDelay);
}

function initGift() {
  if (!els.giftBtn) return;
  els.giftBtn.addEventListener("click", openGift);
}

/** Tick mỗi giây */
function tick() {
  const time = getTimeRemaining();
  renderCountdown(time);
  updateStatusLine(time);

  if (time.total <= 0) {
    revealGift();
  }
}

/* ---------- Music toggle ---------- */
function initMusic() {
  if (!els.music || !els.musicBtn) return;

  // Đồng bộ src nếu bạn đổi MUSIC_SRC ở đầu file
  const source = els.music.querySelector("source");
  if (source && MUSIC_SRC) {
    source.src = MUSIC_SRC;
    els.music.load();
  }

  els.music.volume = Math.min(1, Math.max(0, MUSIC_VOLUME));
  // Tự loop thủ công để mỗi vòng vẫn bắt đầu từ MUSIC_START_SECONDS
  els.music.loop = false;

  /** Nhảy tới điểm bắt đầu đã cấu hình */
  function seekToMusicStart() {
    const start = Math.max(0, Number(MUSIC_START_SECONDS) || 0);
    const duration = els.music.duration;
    if (Number.isFinite(duration) && duration > 0 && start >= duration) {
      els.music.currentTime = 0;
      return;
    }
    els.music.currentTime = start;
  }

  /** Ẩn mũi tên guide sau khi user đã tương tác với nút nhạc */
  function hideMusicHint() {
    els.musicHint?.classList.add("is-hidden");
  }

  // Khi hết bài → quay lại điểm bắt đầu và phát tiếp
  els.music.addEventListener("ended", async () => {
    seekToMusicStart();
    try {
      await els.music.play();
    } catch (err) {
      console.warn("Không phát lại được nhạc.", err);
    }
  });

  els.musicBtn.addEventListener("click", async () => {
    hideMusicHint();
    try {
      if (els.music.paused) {
        // Chỉ seek khi mới bắt đầu / đang ở đầu bài (không reset khi resume giữa chừng)
        if (els.music.currentTime < 0.5) {
          seekToMusicStart();
        }
        await els.music.play();
        els.musicBtn.classList.add("is-playing");
        els.musicBtn.setAttribute("aria-pressed", "true");
        els.musicBtn.setAttribute("aria-label", "Tắt nhạc nền");
      } else {
        els.music.pause();
        els.musicBtn.classList.remove("is-playing");
        els.musicBtn.setAttribute("aria-pressed", "false");
        els.musicBtn.setAttribute("aria-label", "Bật nhạc nền");
      }
    } catch (err) {
      console.warn("Không phát được nhạc. Kiểm tra file assets/music.mp3", err);
    }
  });
}

/* ---------- Boot ---------- */
/**
 * Hạt bụi vàng lấp lánh rơi nhẹ + tương tác chuột (tsparticles).
 * detectsOn: "window" → vẫn tương tác dù canvas pointer-events: none.
 */
async function initParticles() {
  if (!PARTICLES_ENABLED) return;
  if (prefersReducedMotion()) return;
  if (typeof tsParticles === "undefined") {
    console.warn("tsparticles chưa tải được.");
    return;
  }

  const isMobile = window.matchMedia("(max-width: 480px)").matches;
  const count = isMobile ? Math.max(28, Math.floor(PARTICLES_COUNT * 0.45)) : PARTICLES_COUNT;

  try {
    // Bundle full: đăng ký plugins nếu chưa (CDN UMD)
    if (typeof loadFull === "function") {
      await loadFull(tsParticles);
    }

    await tsParticles.load({
      id: "golden-dust",
      options: {
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        fpsLimit: 60,
        detectRetina: true,
        particles: {
          number: {
            value: count,
            density: { enable: true, width: 900, height: 900 },
          },
          color: {
            value: ["#e8d5a3", "#f0e0b0", "#ffd700", "#fff6d8", "#c9a66b"],
          },
          shape: { type: "circle" },
          opacity: {
            value: { min: 0.15, max: 0.85 },
            animation: {
              enable: true,
              speed: 0.9,
              sync: false,
              startValue: "random",
            },
          },
          size: {
            value: { min: 0.6, max: 2.6 },
            animation: {
              enable: true,
              speed: 1.6,
              sync: false,
              startValue: "random",
            },
          },
          move: {
            enable: true,
            direction: "bottom",
            speed: { min: 0.25, max: 0.9 },
            straight: false,
            random: true,
            drift: { min: -0.4, max: 0.4 },
            gravity: {
              enable: true,
              acceleration: 0.18,
              maxSpeed: 1.1,
            },
            outModes: { default: "out" },
            attract: { enable: false },
          },
          shadow: {
            enable: true,
            color: "#e8d5a3",
            blur: 4,
            offset: { x: 0, y: 0 },
          },
          twinkle: {
            particles: {
              enable: true,
              frequency: 0.08,
              opacity: 1,
            },
          },
        },
        interactivity: {
          detectsOn: "window",
          events: {
            onHover: {
              enable: true,
              mode: ["repulse", "bubble"],
            },
            onClick: { enable: false },
            resize: { enable: true },
          },
          modes: {
            repulse: {
              distance: 90,
              duration: 0.45,
              speed: 0.35,
              factor: 0.6,
            },
            bubble: {
              distance: 110,
              size: 4,
              duration: 1.4,
              opacity: 1,
            },
          },
        },
        pauseOnBlur: true,
        pauseOnOutsideViewport: true,
      },
    });
  } catch (err) {
    console.warn("Không khởi tạo được tsparticles.", err);
  }
}

function init() {
  initSubtitle();
  initMusic();
  initGift();
  initParticles();
  tick();
  setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", init);
