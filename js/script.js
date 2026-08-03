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
const BIRTHDAY_NAME = "Vau";

/** Đường dẫn nhạc nền (đặt file tại assets/music.mp3) */
const MUSIC_SRC = "assets/music.mp3";

/* =========================================================
   Logic chính — không cần sửa nếu chỉ muốn đổi ngày / tên
   ========================================================= */

const els = {
  subtitle: document.getElementById("subtitle"),
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  message: document.getElementById("birthday-message"),
  card: document.getElementById("main-card"),
  countdown: document.getElementById("countdown"),
  musicBtn: document.getElementById("music-toggle"),
  music: document.getElementById("bg-music"),
};

let celebrationTriggered = false;
let confettiInterval = null;

/** Pad số thành 2 chữ số */
function pad(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** Cập nhật lời tựa theo tên đã cấu hình */
function initSubtitle() {
  if (!els.subtitle) return;
  els.subtitle.textContent = `Đếm ngược đến ngày đặc biệt của ${BIRTHDAY_NAME}`;
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

/** Gán giá trị vào DOM; thêm pulse nhẹ khi giây đổi */
function renderCountdown(time) {
  const map = [
    [els.days, time.days],
    [els.hours, time.hours],
    [els.minutes, time.minutes],
    [els.seconds, time.seconds],
  ];

  map.forEach(([el, value]) => {
    if (!el) return;
    const next = pad(value);
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.remove("tick");
      // Force reflow để restart animation
      void el.offsetWidth;
      el.classList.add("tick");
    }
  });
}

/** Pháo hoa liên tục khi đến ngày sinh nhật */
function launchConfetti() {
  if (typeof confetti !== "function") return;

  const defaults = {
    startVelocity: 32,
    spread: 360,
    ticks: 80,
    zIndex: 100,
    colors: ["#e8d5a3", "#ffffff", "#f0c27a", "#c9a66b", "#ffd700"],
  };

  // Burst ngay lập tức
  confetti({ ...defaults, particleCount: 120, origin: { x: 0.5, y: 0.55 } });
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.2, y: 0.7 } });
  confetti({ ...defaults, particleCount: 60, origin: { x: 0.8, y: 0.7 } });

  // Tiếp tục rơi nhẹ trong ~8 giây
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

/** Khi đếm về 0: hiện thông điệp + pháo hoa */
function triggerCelebration() {
  if (celebrationTriggered) return;
  celebrationTriggered = true;

  els.card?.classList.add("is-birthday");
  if (els.message) {
    els.message.hidden = false;
    els.message.classList.add("is-visible");
  }

  launchConfetti();
}

/** Tick mỗi giây */
function tick() {
  const time = getTimeRemaining();
  renderCountdown(time);

  if (time.total <= 0) {
    triggerCelebration();
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

  els.music.volume = 0.45;

  els.musicBtn.addEventListener("click", async () => {
    try {
      if (els.music.paused) {
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
function init() {
  initSubtitle();
  initMusic();
  tick();
  setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", init);
