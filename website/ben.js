const barks = [
  "Woof! 🐶", "WOOF WOOF! 🐕", "Arf arf! 🦴",
  "Bork! 🎾", "*tail wagging intensifies* 🐾",
  "Awoooo! 🌕", "Henlo fren! 👋🐶"
];

const GALLERY_DB_NAME = "benGalleryDB";
const GALLERY_STORE_NAME = "images";
const GALLERY_DB_VERSION = 1;

function bark() {
  const msg = document.getElementById("bark-msg");
  if (!msg) return;
  msg.textContent = barks[Math.floor(Math.random() * barks.length)];
  setTimeout(() => { msg.textContent = ""; }, 2500);
}

// ---- COMMENTS ----
function submitComment() {
  const input = document.getElementById("comment-input");
  const display = document.getElementById("comments-display");
  if (!input || !display) return;
  const text = input.value.trim();
  if (!text) { alert("Please write something for Ben! 🐾"); return; }
  const bubble = document.createElement("div");
  bubble.className = "comment-bubble";
  bubble.textContent = "🐾 " + text;
  display.prepend(bubble);
  input.value = "";
}

// ---- GALLERY ----
function openGalleryDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GALLERY_DB_NAME, GALLERY_DB_VERSION);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(GALLERY_STORE_NAME)) {
        db.createObjectStore(GALLERY_STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveGalleryImageToDB(dataUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openGalleryDB();
      const transaction = db.transaction(GALLERY_STORE_NAME, "readwrite");
      const store = transaction.objectStore(GALLERY_STORE_NAME);
      const request = store.add({ image: dataUrl });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function loadGalleryImagesFromDB() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openGalleryDB();
      const transaction = db.transaction(GALLERY_STORE_NAME, "readonly");
      const store = transaction.objectStore(GALLERY_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

function renderGallery(images) {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  gallery.querySelectorAll(".gallery-placeholder").forEach(p => p.remove());
  gallery.querySelectorAll("img").forEach(img => img.remove());

  images.forEach(item => {
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = "Photo of Ben";
    gallery.appendChild(img);
  });
}

async function loadGalleryImages() {
  try {
    const images = await loadGalleryImagesFromDB();
    renderGallery(images);
  } catch (error) {
    console.error("Failed to load gallery images:", error);
  }
}

async function addPhotos() {
  const input = document.getElementById("photo-input");
  const gallery = document.getElementById("gallery");
  if (!input || !gallery) return;
  const files = input.files;
  if (files.length === 0) { alert("Please choose at least one photo first!"); return; }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith("image/")) continue;

    const reader = new FileReader();
    reader.onload = async function(e) {
      const dataUrl = e.target.result;
      try {
        await saveGalleryImageToDB(dataUrl);
        await loadGalleryImages();
      } catch (error) {
        console.error("Failed to save image:", error);
      }
    };
    reader.readAsDataURL(file);
  }
  input.value = "";
}

loadGalleryImages();

// ---- QUIZ ----
let score = 0;
const answered = {};

function answer(button, isCorrect, questionId) {
  if (answered[questionId]) return;
  answered[questionId] = true;
  const feedback = document.getElementById(questionId + "-feedback");
  const allOptions = button.parentElement.querySelectorAll(".quiz-option");
  allOptions.forEach(btn => btn.disabled = true);
  if (isCorrect) {
    button.classList.add("correct");
    score++;
    if (feedback) { feedback.textContent = "✅ Correct! Good job!"; feedback.style.color = "green"; }
  } else {
    button.classList.add("wrong");
    if (feedback) { feedback.textContent = "❌ Not quite! Try again next time."; feedback.style.color = "red"; }
    allOptions.forEach(btn => {
      if (btn.getAttribute("onclick").includes("true")) btn.classList.add("correct");
    });
  }
  const box = document.getElementById("score-box");
  if (box) box.textContent = score === 5
    ? "🎉 Perfect Score! 5 / 5 — You know Ben so well!"
    : `Score: ${score} / 5`;
}

function resetQuiz() {
  score = 0;
  for (let key in answered) delete answered[key];
  document.querySelectorAll(".quiz-option").forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("correct", "wrong");
  });
  document.querySelectorAll(".quiz-feedback").forEach(f => f.textContent = "");
  const box = document.getElementById("score-box");
  if (box) box.textContent = "Score: 0 / 5";
}