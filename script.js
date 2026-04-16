const STORAGE_KEY = "portfolio-items-v1";
const HOSTED_ITEMS_PATH = "./portfolio-items.json";
const AUDIO_OVERRIDES_BY_ID = {
  "img-5509": "./assets/audio/Detroit Rock City.mp3",
  "img-6036": "./assets/audio/Kiss - Rock And Roll All Nite (Remastered).mp3",
  "img-6044": "./assets/audio/Where Are You Now.mp3",
  "img-6048": "./assets/audio/Everything.mp3",
  "img-6049": "./assets/audio/Eagles - Hotel California (Official Audio).mp3",
  "img-6050": "./assets/audio/閉店後の滞在.mp3",
  "img-6051": "./assets/audio/Izzy Perri & Sun City - Next to You.mp3",
  "img-6052": "./assets/audio/Don't Be Afraid Of The Dark [w0YNPT6uprg].mp3",
  "img-6045": "./assets/audio/The Equaliser (Not Alone).mp3",
  "img-6047": "./assets/audio/Comfortably Numb.mp3",
  "img-6046": "./assets/audio/OutKast -  ATLiens  (HQ).mp3",
};
const AUDIO_OVERRIDES_BY_IMAGE = {
  "img_5509.gif": "./assets/audio/Detroit Rock City.mp3",
  "img_6034.jpg": "./assets/audio/2,000 Man.mp3",
  "img_6035.jpg": "./assets/audio/Fractured Mirror.mp3",
  "img_6037.jpg": "./assets/audio/Johnny Cash - The Ballad of Boot Hill (Official Audio).mp3",
  "img_6048.jpg": "./assets/audio/Everything.mp3",
  "img_6049.jpg": "./assets/audio/Eagles - Hotel California (Official Audio).mp3",
  "img_6050.jpg": "./assets/audio/閉店後の滞在.mp3",
  "img_6051.jpg": "./assets/audio/Izzy Perri & Sun City - Next to You.mp3",
  "img_6052.jpg": "./assets/audio/Don't Be Afraid Of The Dark [w0YNPT6uprg].mp3",
  "img_6045.jpg": "./assets/audio/The Equaliser (Not Alone).mp3",
  "img_6047.jpg": "./assets/audio/Comfortably Numb.mp3",
  "img_6053.jpg": "./assets/audio/Kiss - Turn On The Night (Remastered).mp3",
  "magik_touch_logo.jpg": "./assets/audio/Magic Touch.mp3",
};
const AUDIO_OVERRIDES_BY_TITLE = {
  "echoes promotional poster": "./assets/audio/Comfortably Numb.mp3",
  "olive oyl’s mixtape playlist thumbnail":
    "./assets/audio/Don't Be Afraid Of The Dark [w0YNPT6uprg].mp3",
  "olive oyl's mixtape playlist thumbnail":
    "./assets/audio/Don't Be Afraid Of The Dark [w0YNPT6uprg].mp3",
};
const DB_NAME = "portfolio-media-db";
const DB_VERSION = 1;
const IMAGE_STORE = "portfolio-images";

const addWorkForm = document.getElementById("add-work-form");
const workImageInput = document.getElementById("work-image");
const grid = document.getElementById("portfolio-grid");
const emptyState = document.getElementById("empty-state");
const cardTemplate = document.getElementById("card-template");

const previewDialog = document.getElementById("preview-dialog");
const closePreview = document.getElementById("close-preview");
const previewImage = document.getElementById("preview-image");
const previewCategory = document.getElementById("preview-category");
const previewTitle = document.getElementById("preview-title");
const previewDescription = document.getElementById("preview-description");
const previewAudioLabel = document.getElementById("preview-audio-label");
const previewAudio = document.getElementById("preview-audio");
const previewLink = document.getElementById("preview-link");

let works = loadWorks();
let dbPromise = null;

void bootstrap();

closePreview.addEventListener("click", () => previewDialog.close());
previewDialog.addEventListener("close", stopPreviewAudio);
if (addWorkForm) {
  addWorkForm.addEventListener("submit", handleAddWork);
}

async function bootstrap() {
  const hostedWorks = await loadHostedWorks();
  works = mergeHostedAndLocalWorks(hostedWorks, works);
  render();
  await hydrateWorks();
}

function render() {
  grid.replaceChildren();
  const groupedWorks = groupWorksByCategory(works);

  groupedWorks.forEach(({ category, items }) => {
    const section = document.createElement("section");
    section.className = "category-group";

    const heading = document.createElement("h3");
    heading.className = "category-group__title";
    heading.textContent = category;
    section.append(heading);

    const groupGrid = document.createElement("div");
    groupGrid.className = "category-group__grid";

    items.forEach((work) => {
      const card = cardTemplate.content.firstElementChild.cloneNode(true);

      const image = card.querySelector(".work-card__image");
      const categoryLabel = card.querySelector(".work-card__category");
      const title = card.querySelector(".work-card__title");
      const description = card.querySelector(".work-card__description");
      const link = card.querySelector(".work-card__link");

      image.src = work.imagePreviewUrl || work.image || placeholderSvg(work.title || "Work");
      image.alt = work.title || "Portfolio work";
      categoryLabel.textContent = work.category || "Uncategorized";
      title.textContent = work.title || "Untitled project";
      description.textContent = work.description || "No description yet.";

      if (work.url) {
        link.href = work.url;
        link.hidden = false;
      } else {
        link.hidden = true;
      }

      image.addEventListener("click", () => openPreview(work));
      groupGrid.append(card);
    });

    section.append(groupGrid);
    grid.append(section);
  });

  emptyState.hidden = works.length > 0;
}

async function handleAddWork(event) {
  event.preventDefault();
  const formData = new FormData(addWorkForm);
  const imageFile = workImageInput.files?.[0];

  if (!imageFile) {
    window.alert("Please choose an image file.");
    return;
  }

  const imageId = crypto.randomUUID();
  try {
    await saveImageFile(imageId, imageFile);
  } catch (error) {
    console.error("Unable to store image file:", error);
    window.alert("Could not save that image permanently. Please try a smaller file.");
    return;
  }

  const work = {
    id: crypto.randomUUID(),
    title: `${formData.get("title") || ""}`.trim() || "Untitled project",
    category: `${formData.get("category") || ""}`.trim() || "Uncategorized",
    description: `${formData.get("description") || ""}`.trim() || "No description yet.",
    imageId,
    imagePreviewUrl: URL.createObjectURL(imageFile),
  };

  works.unshift(work);
  saveWorks();
  render();
  addWorkForm.reset();
}

function openPreview(work) {
  previewImage.src = work.imagePreviewUrl || work.image || placeholderSvg(work.title || "Work");
  previewImage.alt = work.title || "Portfolio work";
  previewCategory.textContent = work.category || "Uncategorized";
  previewTitle.textContent = work.title || "Untitled project";
  previewDescription.textContent = work.description || "No description yet.";
  configurePreviewAudio(work);
  if (work.url) {
    previewLink.href = work.url;
    previewLink.hidden = false;
  } else {
    previewLink.hidden = true;
  }
  previewDialog.showModal();
}

function configurePreviewAudio(work) {
  stopPreviewAudio();
  const audioSrc = resolveWorkAudio(work);

  if (!audioSrc) {
    previewAudio.hidden = true;
    previewAudioLabel.hidden = true;
    return;
  }

  previewAudio.hidden = false;
  previewAudioLabel.hidden = false;
  playPreviewAudio(audioSrc);
}

function resolveWorkAudio(work) {
  if (typeof work.id === "string" && AUDIO_OVERRIDES_BY_ID[work.id]) {
    return AUDIO_OVERRIDES_BY_ID[work.id];
  }

  const imageName = getImageFileName(work.image);
  if (imageName && AUDIO_OVERRIDES_BY_IMAGE[imageName]) {
    return AUDIO_OVERRIDES_BY_IMAGE[imageName];
  }

  const titleKey = getTitleKey(work.title);
  if (titleKey && AUDIO_OVERRIDES_BY_TITLE[titleKey]) {
    return AUDIO_OVERRIDES_BY_TITLE[titleKey];
  }

  if (typeof work.audio === "string" && work.audio.trim()) {
    return work.audio.trim();
  }
  return "";
}

function getTitleKey(title) {
  if (typeof title !== "string") return "";
  return title.trim().toLowerCase();
}

function getImageFileName(imagePath) {
  if (typeof imagePath !== "string") return "";
  const cleanPath = imagePath.split("?")[0].split("#")[0];
  const segments = cleanPath.split("/");
  const fileName = segments[segments.length - 1];
  return (fileName || "").trim().toLowerCase();
}

function playPreviewAudio(src) {
  const rawSrc = typeof src === "string" ? src.trim() : "";
  const candidates = buildAudioSourceCandidates(rawSrc);
  let candidateIndex = 0;

  previewAudio.onerror = () => {
    candidateIndex += 1;
    if (candidateIndex >= candidates.length) return;
    previewAudio.src = candidates[candidateIndex];
    previewAudio.load();
    void previewAudio.play().catch(() => {});
  };

  previewAudio.src = candidates[0] || "";
  previewAudio.load();

  void previewAudio.play().catch(() => {
    // Some browsers require pressing play manually.
  });
}

function stopPreviewAudio() {
  previewAudio.onerror = null;
  previewAudio.pause();
  previewAudio.currentTime = 0;
  previewAudio.removeAttribute("src");
  previewAudio.load();
}

function buildAudioSourceCandidates(src) {
  if (!src) return [""];
  const noDotSlash = src.replace(/^\.\//, "");
  const strictEncodedSrc = encodePathPreservingSlashes(src);
  const strictEncodedNoDotSlash = encodePathPreservingSlashes(noDotSlash);
  const candidates = [
    src,
    encodeURI(src),
    strictEncodedSrc,
    noDotSlash,
    encodeURI(noDotSlash),
    strictEncodedNoDotSlash,
  ];
  return [...new Set(candidates.filter(Boolean))];
}

function encodePathPreservingSlashes(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

function groupWorksByCategory(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const label = item.category?.trim() || "Uncategorized";
    const key = label.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, { category: label, items: [] });
    }
    grouped.get(key).items.push(item);
  });

  return [...grouped.values()].sort((a, b) => a.category.localeCompare(b.category));
}

function loadWorks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

async function loadHostedWorks() {
  try {
    const response = await fetch(HOSTED_ITEMS_PATH, { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((item, index) => normalizeHostedWork(item, index))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeHostedWork(item, index) {
  if (!item || typeof item !== "object") return null;
  const image = typeof item.image === "string" ? item.image.trim() : "";
  if (!image) return null;

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `hosted-${index + 1}`,
    title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Untitled project",
    category:
      typeof item.category === "string" && item.category.trim() ? item.category.trim() : "Uncategorized",
    description:
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim()
        : "No description yet.",
    image,
    audio: typeof item.audio === "string" ? item.audio.trim() : "",
    url: typeof item.url === "string" ? item.url.trim() : "",
  };
}

function mergeHostedAndLocalWorks(hostedWorks, localWorks) {
  const merged = [...hostedWorks];
  const seenIds = new Set(hostedWorks.map((work) => work.id));

  localWorks.forEach((work) => {
    if (seenIds.has(work.id)) return;
    merged.push(work);
  });

  return merged;
}

function saveWorks() {
  try {
    const serializableWorks = works.map(({ imagePreviewUrl, image, ...work }) => {
      // Keep metadata small in localStorage; image files are stored in IndexedDB.
      if (typeof image === "string" && !image.startsWith("data:")) {
        return { ...work, image };
      }
      return work;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableWorks));
  } catch (error) {
    console.error("Unable to save portfolio data:", error);
    window.alert("Could not save portfolio details. Try shorter descriptions or fewer items.");
  }
}

async function hydrateWorks() {
  let changed = false;

  await Promise.all(
    works.map(async (work) => {
      if (work.imageId) {
        const blob = await getImageFile(work.imageId);
        if (!blob) return;
        work.imagePreviewUrl = URL.createObjectURL(blob);
        return;
      }

      if (typeof work.image === "string" && work.image.startsWith("data:")) {
        try {
          const migratedImageId = crypto.randomUUID();
          const blob = dataUrlToBlob(work.image);
          await saveImageFile(migratedImageId, blob);
          work.imageId = migratedImageId;
          delete work.image;
          work.imagePreviewUrl = URL.createObjectURL(blob);
          changed = true;
        } catch (error) {
          console.error("Could not migrate image to permanent storage:", error);
        }
      }
    })
  );

  if (changed) {
    saveWorks();
  }

  render();
}

function dataUrlToBlob(dataUrl) {
  const [metadata, content] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function getDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveImageFile(imageId, file) {
  const db = await getDatabase();
  const tx = db.transaction(IMAGE_STORE, "readwrite");
  const store = tx.objectStore(IMAGE_STORE);
  await requestToPromise(store.put(file, imageId));
}

async function getImageFile(imageId) {
  const db = await getDatabase();
  const tx = db.transaction(IMAGE_STORE, "readonly");
  const store = tx.objectStore(IMAGE_STORE);
  return requestToPromise(store.get(imageId));
}

async function deleteImageFile(imageId) {
  const db = await getDatabase();
  const tx = db.transaction(IMAGE_STORE, "readwrite");
  const store = tx.objectStore(IMAGE_STORE);
  await requestToPromise(store.delete(imageId));
}

async function clearAllImages() {
  const db = await getDatabase();
  const tx = db.transaction(IMAGE_STORE, "readwrite");
  const store = tx.objectStore(IMAGE_STORE);
  await requestToPromise(store.clear());
}

function placeholderSvg(label) {
  const text = encodeURIComponent(label.slice(0, 22));
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23dae5ff'/%3E%3Cstop offset='1' stop-color='%23f8efd8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' fill='%232f3f64' font-size='34' text-anchor='middle' font-family='Arial, sans-serif'%3E${text}%3C/text%3E%3C/svg%3E`;
}
