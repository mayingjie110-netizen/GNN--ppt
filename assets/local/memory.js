const canvas = document.getElementById("memoryCanvas");
const ctx = canvas.getContext("2d");
const layerInput = document.getElementById("layerCount");
const degreeInput = document.getElementById("degreeCount");
const layersLabel = document.getElementById("layersLabel");
const degreeLabel = document.getElementById("degreeLabel");
const samplingToggle = document.getElementById("samplingToggle");

function drawNode(x, y, r, color, label) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (label) {
    ctx.fillStyle = "#f4f0e8";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }
}

function draw() {
  const width = canvas.width;
  const height = canvas.height;
  const layers = Number(layerInput.value);
  const degree = Number(degreeInput.value);
  const sampled = samplingToggle.checked;
  const fanout = sampled ? Math.min(2, degree) : degree;

  layersLabel.textContent = layers;
  degreeLabel.textContent = degree;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f172b";
  ctx.fillRect(0, 0, width, height);

  const startX = 88;
  const gapX = (width - 176) / layers;
  let previous = [{ x: startX, y: height / 2, active: true }];
  drawNode(startX, height / 2, 15, "#ef6f6c", "B");

  let total = 1;
  for (let l = 1; l <= layers; l += 1) {
    const count = Math.min(34, Math.pow(fanout, l));
    const x = startX + gapX * l;
    const top = 76;
    const bottom = height - 84;
    const nodes = Array.from({ length: count }, (_, i) => {
      const y = count === 1 ? height / 2 : top + (bottom - top) * (i / (count - 1));
      return { x, y };
    });
    total += count;

    ctx.strokeStyle = sampled ? "rgba(139,209,124,.45)" : "rgba(115,210,222,.28)";
    ctx.lineWidth = 1.2;
    for (const p of previous) {
      const links = nodes.slice(0, Math.min(nodes.length, fanout * 3));
      links.forEach((n, idx) => {
        if (idx % Math.max(1, Math.floor(links.length / Math.max(1, fanout))) === 0) {
          ctx.beginPath();
          ctx.moveTo(p.x + 15, p.y);
          ctx.lineTo(n.x - 10, n.y);
          ctx.stroke();
        }
      });
    }

    nodes.forEach((n, i) => {
      const color = sampled ? "#8bd17c" : (i % 3 === 0 ? "#73d2de" : "#f6c85f");
      drawNode(n.x, n.y, 8, color);
    });

    ctx.fillStyle = "#aeb7c7";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${l}-hop: ${count} nodes`, x, height - 36);
    previous = nodes;
  }

  const raw = Math.pow(degree, layers);
  const shown = Math.pow(fanout, layers);
  ctx.fillStyle = "#f4f0e8";
  ctx.font = "700 19px Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(sampled ? "Neighbor sampling controls the backward graph" : "Full neighborhood expansion grows quickly", 24, 34);
  ctx.fillStyle = "#aeb7c7";
  ctx.font = "14px Segoe UI, sans-serif";
  ctx.fillText(`Activation footprint around a mini-batch: ~ O(|B| x ${sampled ? fanout : degree}^K), current leaf scale ${shown.toLocaleString()} vs full ${raw.toLocaleString()}`, 24, 58);

  ctx.fillStyle = sampled ? "#8bd17c" : "#ef6f6c";
  ctx.fillRect(width - 230, 24, Math.min(190, 24 + total * 2.2), 12);
  ctx.fillStyle = "#aeb7c7";
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("saved activations", width - 24, 34);
}

[layerInput, degreeInput, samplingToggle].forEach((input) => input.addEventListener("input", draw));
draw();
