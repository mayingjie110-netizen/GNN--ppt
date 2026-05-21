const slides = Array.from(document.querySelectorAll(".slide"));
let current = 0;
let editMode = false;
let selectedFrame = null;
const layoutStoreKey = "gnn-distill-layout-v2";
const savedLayouts = JSON.parse(localStorage.getItem(layoutStoreKey) || "{}");

const layoutPanel = document.createElement("div");
layoutPanel.className = "layout-panel";
layoutPanel.innerHTML = `
  <button type="button" data-layout-zoom-in>放大图</button>
  <button type="button" data-layout-zoom-out>缩小图</button>
  <button type="button" data-layout-fit>适配图</button>
  <button type="button" data-layout-reset-frame>重置当前图</button>
  <button type="button" data-layout-reset-slide>重置本页</button>
  <span class="layout-hint">选择图后：拖动画面，拖右下角改容器大小，自动保存</span>
`;
document.body.appendChild(layoutPanel);

function saveLayouts() {
  localStorage.setItem(layoutStoreKey, JSON.stringify(savedLayouts));
}

function frameKey(frame) {
  return frame.dataset.layoutKey;
}

function getLayout(frame) {
  const key = frameKey(frame);
  savedLayouts[key] ||= {};
  savedLayouts[key].zoom ??= 1;
  savedLayouts[key].panX ??= 0;
  savedLayouts[key].panY ??= 0;
  return savedLayouts[key];
}

function postLayout(frame, extra = {}) {
  const iframe = frame.querySelector("iframe");
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage({ type: "distill-layout", ...getLayout(frame), ...extra }, "*");
}

function applyFrameLayout(frame) {
  const layout = getLayout(frame);
  if (Number.isFinite(layout.width)) frame.style.width = `${layout.width}px`;
  else frame.style.width = "";
  if (Number.isFinite(layout.height)) {
    frame.style.height = `${layout.height}px`;
    frame.style.minHeight = "0";
  } else {
    frame.style.height = "";
    frame.style.minHeight = "";
  }
  postLayout(frame);
}

function selectFrame(frame) {
  if (selectedFrame) selectedFrame.classList.remove("is-selected");
  selectedFrame = frame;
  if (selectedFrame) {
    selectedFrame.classList.add("is-selected");
    postLayout(selectedFrame);
  }
}

function resetFrame(frame) {
  if (!frame) return;
  delete savedLayouts[frameKey(frame)];
  frame.style.width = "";
  frame.style.height = "";
  frame.style.minHeight = "";
  saveLayouts();
  postLayout(frame, { resetView: true });
}

function resetCurrentSlide() {
  slides[current].querySelectorAll(".distill-frame").forEach(resetFrame);
}

document.querySelectorAll(".distill-frame").forEach((frame, index) => {
  const slideIndex = slides.findIndex((slide) => slide.contains(frame)) + 1;
  const frameIndex = Array.from(slides[slideIndex - 1].querySelectorAll(".distill-frame")).indexOf(frame) + 1;
  frame.dataset.layoutKey = `slide-${slideIndex}-figure-${frameIndex}`;

  const overlay = document.createElement("div");
  overlay.className = "layout-overlay";
  const resize = document.createElement("div");
  resize.className = "layout-resize";
  frame.append(overlay, resize);

  applyFrameLayout(frame);
  frame.querySelector("iframe")?.addEventListener("load", () => setTimeout(() => postLayout(frame), 250));

  overlay.addEventListener("pointerdown", (event) => {
    if (!editMode) return;
    event.preventDefault();
    selectFrame(frame);
    overlay.setPointerCapture(event.pointerId);
    const layout = getLayout(frame);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = layout.panX;
    const originY = layout.panY;

    const move = (moveEvent) => {
      layout.panX = originX + moveEvent.clientX - startX;
      layout.panY = originY + moveEvent.clientY - startY;
      postLayout(frame);
    };
    const up = () => {
      overlay.removeEventListener("pointermove", move);
      overlay.removeEventListener("pointerup", up);
      saveLayouts();
    };
    overlay.addEventListener("pointermove", move);
    overlay.addEventListener("pointerup", up);
  });

  resize.addEventListener("pointerdown", (event) => {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    selectFrame(frame);
    resize.setPointerCapture(event.pointerId);
    const rect = frame.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    const move = (moveEvent) => {
      const layout = getLayout(frame);
      const slideRect = slides[current].getBoundingClientRect();
      layout.width = Math.max(260, Math.min(slideRect.width - 80, startWidth + moveEvent.clientX - startX));
      layout.height = Math.max(220, Math.min(slideRect.height - 150, startHeight + moveEvent.clientY - startY));
      applyFrameLayout(frame);
    };
    const up = () => {
      resize.removeEventListener("pointermove", move);
      resize.removeEventListener("pointerup", up);
      saveLayouts();
    };
    resize.addEventListener("pointermove", move);
    resize.addEventListener("pointerup", up);
  });
});

function showSlide(index) {
  current = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === current);
    slide.setAttribute("aria-hidden", i === current ? "false" : "true");
  });
  document.querySelector("[data-current]").textContent = String(current + 1).padStart(2, "0");
  location.hash = `slide-${current + 1}`;
  const firstFrame = slides[current].querySelector(".distill-frame");
  if (editMode) selectFrame(firstFrame);
  slides[current].querySelectorAll(".distill-frame").forEach((frame) => setTimeout(() => postLayout(frame), 120));
}

function fromHash() {
  const match = location.hash.match(/slide-(\d+)/);
  if (match) showSlide(Number(match[1]) - 1);
}

document.addEventListener("keydown", (event) => {
  const tag = event.target && event.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;

  if (["ArrowRight", "PageDown", " ", "Enter"].includes(event.key)) {
    event.preventDefault();
    showSlide(current + 1);
  }
  if (["ArrowLeft", "PageUp", "Backspace"].includes(event.key)) {
    event.preventDefault();
    showSlide(current - 1);
  }
  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
  if (event.key.toLowerCase() === "e") {
    event.preventDefault();
    toggleEditMode();
  }
});

document.querySelector("[data-prev]").addEventListener("click", () => showSlide(current - 1));
document.querySelector("[data-next]").addEventListener("click", () => showSlide(current + 1));
document.querySelector("[data-fullscreen]").addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

function toggleEditMode(force) {
  editMode = typeof force === "boolean" ? force : !editMode;
  document.body.classList.toggle("layout-editing", editMode);
  document.querySelector("[data-edit-layout]").textContent = editMode ? "Done layout" : "Edit layout";
  selectFrame(editMode ? slides[current].querySelector(".distill-frame") : null);
}

document.querySelector("[data-edit-layout]").addEventListener("click", () => toggleEditMode());

layoutPanel.querySelector("[data-layout-zoom-in]").addEventListener("click", () => {
  if (!selectedFrame) return;
  const layout = getLayout(selectedFrame);
  layout.zoom = Math.min(4, layout.zoom + 0.12);
  postLayout(selectedFrame);
  saveLayouts();
});

layoutPanel.querySelector("[data-layout-zoom-out]").addEventListener("click", () => {
  if (!selectedFrame) return;
  const layout = getLayout(selectedFrame);
  layout.zoom = Math.max(0.25, layout.zoom - 0.12);
  postLayout(selectedFrame);
  saveLayouts();
});

layoutPanel.querySelector("[data-layout-fit]").addEventListener("click", () => {
  if (!selectedFrame) return;
  const layout = getLayout(selectedFrame);
  layout.zoom = 1;
  layout.panX = 0;
  layout.panY = 0;
  postLayout(selectedFrame, { resetView: true });
  saveLayouts();
});

layoutPanel.querySelector("[data-layout-reset-frame]").addEventListener("click", () => resetFrame(selectedFrame));
layoutPanel.querySelector("[data-layout-reset-slide]").addEventListener("click", resetCurrentSlide);

window.addEventListener("hashchange", fromHash);
window.addEventListener("resize", () => {
  document.querySelectorAll(".distill-frame").forEach((frame) => postLayout(frame));
});
fromHash();
showSlide(current);
