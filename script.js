const STORAGE_KEY = "portfolio-items-v1";

const form = document.getElementById("project-form");
const grid = document.getElementById("portfolio-grid");
const emptyState = document.getElementById("empty-state");
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const clearAllBtn = document.getElementById("clear-all");
const cardTemplate = document.getElementById("card-template");

const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const cancelEdit = document.getElementById("cancel-edit");

const editTitle = document.getElementById("edit-title");
const editCategory = document.getElementById("edit-category");
const editDescription = document.getElementById("edit-description");
const editUrl = document.getElementById("edit-url");

let works = loadWorks();
let activeImage = "";
let editingId = null;

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);

  const work = {
    id: crypto.randomUUID(),
    title: `${data.get("title") || ""}`.trim(),
    category: `${data.get("category") || ""}`.trim(),
    description: `${data.get("description") || ""}`.trim(),
    url: `${data.get("url") || ""}`.trim(),
    image: activeImage,
  };

  works.unshift(work);
  activeImage = "";
  render();
  saveWorks();
  form.reset();
});

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = "";
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  addFiles(event.dataTransfer.files);
});

clearAllBtn.addEventListener("click", () => {
  if (!works.length) return;
  if (!window.confirm("Clear all projects?")) return;
  works = [];
  render();
  saveWorks();
});

cancelEdit.addEventListener("click", () => editDialog.close());

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!editingId) return;
  const idx = works.findIndex((item) => item.id === editingId);
  if (idx === -1) return;

  works[idx] = {
    ...works[idx],
    title: editTitle.value.trim(),
    category: editCategory.value.trim(),
    description: editDescription.value.trim(),
    url: editUrl.value.trim(),
  };

  render();
  saveWorks();
  editDialog.close();
  editingId = null;
});

function addFiles(fileList) {
  if (!fileList || !fileList.length) return;

  Array.from(fileList).forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = `${reader.result || ""}`;
      const title = file.name.replace(/\.[^.]+$/, "");
      const item = {
        id: crypto.randomUUID(),
        title: title || "Untitled work",
        category: "Uploaded Work",
        description: "Click edit to add project details.",
        url: "",
        image: imageData,
      };
      activeImage = imageData;
      works.unshift(item);
      render();
      saveWorks();
    };
    reader.readAsDataURL(file);
  });
}

function render() {
  grid.replaceChildren();

  works.forEach((work) => {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.id = work.id;

    const image = card.querySelector(".work-card__image");
    const category = card.querySelector(".work-card__category");
    const title = card.querySelector(".work-card__title");
    const description = card.querySelector(".work-card__description");
    const link = card.querySelector(".work-card__link");
    const deleteBtn = card.querySelector(".delete-btn");
    const editBtn = card.querySelector(".edit-btn");

    image.src = work.image || placeholderSvg(work.title || "Work");
    image.alt = work.title || "Portfolio work";
    category.textContent = work.category || "Uncategorized";
    title.textContent = work.title || "Untitled project";
    description.textContent = work.description || "No description yet.";

    if (work.url) {
      link.href = work.url;
      link.hidden = false;
    } else {
      link.hidden = true;
    }

    deleteBtn.addEventListener("click", () => {
      works = works.filter((item) => item.id !== work.id);
      render();
      saveWorks();
    });

    editBtn.addEventListener("click", () => openEditDialog(work));

    attachReorderHandlers(card);
    grid.append(card);
  });

  emptyState.hidden = works.length > 0;
}

function openEditDialog(work) {
  editingId = work.id;
  editTitle.value = work.title || "";
  editCategory.value = work.category || "";
  editDescription.value = work.description || "";
  editUrl.value = work.url || "";
  editDialog.showModal();
}

function attachReorderHandlers(card) {
  card.addEventListener("dragstart", () => {
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    syncOrderFromDom();
  });
}

grid.addEventListener("dragover", (event) => {
  event.preventDefault();
  const activeCard = grid.querySelector(".dragging");
  if (!activeCard) return;
  const nextCard = getCardAfterPointer(event.clientY, event.clientX);
  if (!nextCard) {
    grid.append(activeCard);
  } else {
    grid.insertBefore(activeCard, nextCard);
  }
});

function getCardAfterPointer(y, x) {
  const cards = [...grid.querySelectorAll(".work-card:not(.dragging)")];
  let nearest = null;
  let nearestOffset = Number.NEGATIVE_INFINITY;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const offset = x - rect.left - rect.width / 2 + (y - rect.top - rect.height / 2) * 0.1;
    if (offset < 0 && offset > nearestOffset) {
      nearestOffset = offset;
      nearest = card;
    }
  });

  return nearest;
}

function syncOrderFromDom() {
  const orderedIds = [...grid.querySelectorAll(".work-card")].map((card) => card.dataset.id);
  works.sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
  saveWorks();
}

function loadWorks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWorks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
  } catch (error) {
    console.error("Unable to save portfolio data:", error);
    window.alert(
      "Your browser storage is full, so this image can't be saved permanently. Try smaller images or clear some projects."
    );
  }
}

function placeholderSvg(label) {
  const text = encodeURIComponent(label.slice(0, 22));
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23dae5ff'/%3E%3Cstop offset='1' stop-color='%23f8efd8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' fill='%232f3f64' font-size='34' text-anchor='middle' font-family='Arial, sans-serif'%3E${text}%3C/text%3E%3C/svg%3E`;
}
