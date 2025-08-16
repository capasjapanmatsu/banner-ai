export function drawEllipseShadow(
  ctx: any,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opacity = 0.35
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(w / 2, h / 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${opacity})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 床面に沿ったうっすら反射（簡易） */
export function drawFloorReflection(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity = 0.15
) {
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, `rgba(255,255,255,${opacity})`);
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}
