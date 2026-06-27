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

async function saveGalleryImageToDB(dataUrl) {
  const db = await openGalleryDB();
  const transaction = db.transaction(GALLERY_STORE_NAME, "readwrite");
  const store = transaction.objectStore(GALLERY_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.add({ image: dataUrl });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadGalleryImagesFromDB() {
  const db = await openGalleryDB();
  const transaction = db.transaction(GALLERY_STORE_NAME, "readonly");
  const store = transaction.objectStore(GALLERY_STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function convertImageToDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
async function seedGalleryWithDefaultImages() {
  const defaultImages = ["ben.jpg", "ben2.jpg", "ben3.jpg", "ben4.jpg", "ben5.jpg"];

  for (const image of defaultImages) {
    const dataUrl = await convertImageToDataUrl(image);
    await saveGalleryImageToDB(dataUrl);
  }
}

function createPlaceholderGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  gallery.innerHTML = "";
  ["🐕", "🦴", "🐾"].forEach(icon => {
    const placeholder = document.createElement("div");
    placeholder.className = "gallery-placeholder";
    placeholder.textContent = icon;
    gallery.appendChild(placeholder);
  });
}

function renderGallery(images) {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  gallery.querySelectorAll("img").forEach(img => img.remove());
  gallery.querySelectorAll(".gallery-placeholder").forEach(p => p.remove());

  if (!images || images.length === 0) {
    createPlaceholderGallery();
    return;
  }

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
    if (images.length === 0) {
      await seedGalleryWithDefaultImages();
      const seededImages = await loadGalleryImagesFromDB();
      renderGallery(seededImages);
      return;
    }

    renderGallery(images);
  } catch (error) {
    console.error("Failed to load gallery images:", error);
    createPlaceholderGallery();
  }
}

async function addPhotos() {
  const input = document.getElementById("photo-input");
  if (!input) return;

  const files = Array.from(input.files || []);
  if (files.length === 0) {
    alert("Please choose at least one photo first!");
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const reader = new FileReader();
    reader.onload = async function(event) {
      const dataUrl = event.target?.result;
      if (typeof dataUrl !== "string") return;

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