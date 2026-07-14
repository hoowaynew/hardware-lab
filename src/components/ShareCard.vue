<template>
  <div v-if="visible" class="share-card-overlay" @click.self="$emit('close')">
    <div class="share-card-modal">
      <button class="sc-close" @click="$emit('close')">✕</button>
      <h3 class="sc-title">📸 生成分享卡片</h3>
      <canvas ref="canvasRef" class="sc-canvas" :width="600" :height="800"></canvas>
      <div class="sc-actions">
        <button class="sc-btn sc-download" @click="downloadImage">💾 保存图片</button>
        <button class="sc-btn sc-copy" @click="copyImage">📋 复制到剪贴板</button>
      </div>
      <p class="sc-tip">保存图片后可分享到朋友圈 / 社群 / 公众号读者群</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: Boolean,
  experimentId: String,
  experimentTitle: String,
  experimentIcon: String,
  category: String,
  difficulty: String,
  stars: { type: Number, default: 0 },
  params: { type: Object, default: () => ({}) },
  statusText: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const canvasRef = ref(null)

watch(() => props.visible, async (v) => {
  if (v) {
    await nextTick()
    drawCard()
  }
})

function drawCard() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = 600, H = 800

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0f0f1e')
  grad.addColorStop(0.5, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Decorative top accent
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0)
  accentGrad.addColorStop(0, '#3498db')
  accentGrad.addColorStop(0.5, '#2ecc71')
  accentGrad.addColorStop(1, '#f39c12')
  ctx.fillStyle = accentGrad
  ctx.fillRect(0, 0, W, 6)

  // Title area
  ctx.fillStyle = '#3498db'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🔬 硬件实验室', W / 2, 50)

  ctx.fillStyle = '#888'
  ctx.font = '13px sans-serif'
  ctx.fillText('互动电路实验 · 犯错即学习', W / 2, 72)

  // Experiment icon (large)
  ctx.font = '64px sans-serif'
  ctx.fillText(props.experimentIcon || '🔬', W / 2, 170)

  // Experiment title
  ctx.fillStyle = '#e0e0e0'
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText(props.experimentTitle || '实验', W / 2, 215)

  // Category + difficulty badges
  const catText = props.category || ''
  const diffText = props.difficulty || ''
  ctx.font = '14px sans-serif'
  const badgeY = 250
  const catW = ctx.measureText(catText).width + 24
  const diffW = ctx.measureText(diffText).width + 24
  const badgeGap = 12
  const totalBadgeW = catW + diffW + badgeGap
  const badgeStartX = (W - totalBadgeW) / 2

  // Category badge
  ctx.fillStyle = '#252539'
  roundRect(ctx, badgeStartX, badgeY - 16, catW, 28, 14)
  ctx.fill()
  ctx.fillStyle = '#888'
  ctx.fillText(catText, badgeStartX + catW / 2, badgeY)

  // Difficulty badge
  ctx.fillStyle = '#252539'
  roundRect(ctx, badgeStartX + catW + badgeGap, badgeY - 16, diffW, 28, 14)
  ctx.fill()
  const diffColor = diffText.includes('入门') ? '#2ecc71' : diffText.includes('进阶') ? '#f1c40f' : '#e74c3c'
  ctx.fillStyle = diffColor
  ctx.fillText(diffText, badgeStartX + catW + badgeGap + diffW / 2, badgeY)

  // Stars
  const stars = props.stars || 0
  ctx.font = '36px sans-serif'
  let starStr = ''
  for (let i = 0; i < 3; i++) starStr += i < stars ? '⭐' : '☆'
  ctx.fillText(starStr, W / 2, 310)

  // Divider
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(60, 340)
  ctx.lineTo(W - 60, 340)
  ctx.stroke()

  // Parameters section
  ctx.fillStyle = '#888'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('⚙️ 当前参数', 60, 370)

  const params = props.params || {}
  const paramEntries = Object.entries(params).slice(0, 6)
  ctx.fillStyle = '#e0e0e0'
  ctx.font = '15px monospace'
  let y = 400
  for (const [key, val] of paramEntries) {
    const displayVal = typeof val === 'number' ? val.toLocaleString() : String(val)
    const label = formatParamLabel(key)
    ctx.fillStyle = '#888'
    ctx.fillText(label + ':', 80, y)
    ctx.fillStyle = '#3498db'
    const labelW = ctx.measureText(label + ':').width
    ctx.fillText(displayVal, 80 + labelW + 8, y)
    y += 30
  }

  // Status text
  if (props.statusText) {
    y += 10
    ctx.fillStyle = '#2ecc71'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    const truncated = props.statusText.length > 40 ? props.statusText.slice(0, 40) + '…' : props.statusText
    ctx.fillText(truncated, W / 2, y)
    y += 10
  }

  // Divider before footer
  ctx.strokeStyle = '#333'
  ctx.beginPath()
  ctx.moveTo(60, 680)
  ctx.lineTo(W - 60, 680)
  ctx.stroke()

  // Footer: URL + QR placeholder
  ctx.fillStyle = '#3498db'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('hardware-lab.pages.dev', W / 2, 720)

  ctx.fillStyle = '#666'
  ctx.font = '12px sans-serif'
  const expLink = `?exp=${props.experimentId}`
  ctx.fillText(`扫码或访问 ↑ 深链接: ${expLink}`, W / 2, 745)

  // Draw simple QR-like decorative pattern
  drawQRPattern(ctx, W / 2 - 50, 600, 100)

  // Bottom watermark
  ctx.fillStyle = '#444'
  ctx.font = '11px sans-serif'
  ctx.fillText('Generated by 硬件实验室 H5 · 15个实验 · 11大分类', W / 2, 775)
}

function formatParamLabel(key) {
  // Convert keys like "R1_value" to "R1"
  if (key.endsWith('_value')) return key.replace('_value', '')
  if (key.endsWith('_gpioMode')) return 'GPIO模式'
  if (key.endsWith('_dutyCycle')) return '占空比'
  if (key.endsWith('_frequency')) return '频率'
  // Generic: strip prefix before underscore if it looks like component_id_property
  const parts = key.split('_')
  if (parts.length >= 2) return parts[parts.length - 1]
  return key
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawQRPattern(ctx, x, y, size) {
  // Draw a decorative QR-like pattern (not a real QR code, but visually evocative)
  const cells = 10
  const cellSize = size / cells
  // Seed-based pseudo-random for consistency
  let seed = 42
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  ctx.fillStyle = '#fff'
  ctx.fillRect(x - 4, y - 4, size + 8, size + 8)
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      if (rand() > 0.5) {
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize)
      }
    }
  }
  // Corner markers (top-left, top-right, bottom-left)
  const drawCorner = (cx, cy) => {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(cx, cy, cellSize * 3, cellSize * 3)
    ctx.fillStyle = '#fff'
    ctx.fillRect(cx + cellSize, cy + cellSize, cellSize, cellSize)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(cx + cellSize, cy + cellSize, cellSize, cellSize)
  }
  drawCorner(x, y)
  drawCorner(x + (cells - 3) * cellSize, y)
  drawCorner(x, y + (cells - 3) * cellSize)
}

function downloadImage() {
  const canvas = canvasRef.value
  if (!canvas) return
  const link = document.createElement('a')
  link.download = `hardware-lab-${props.experimentId}-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function copyImage() {
  const canvas = canvasRef.value
  if (!canvas) return
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (blob && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      emit('close')
    }
  } catch (e) {
    // Fallback: download
    downloadImage()
  }
}
</script>

<style scoped>
.share-card-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 16px;
}
.share-card-modal {
  background: var(--surface);
  border-radius: 16px;
  padding: 20px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}
.sc-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: var(--text);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-title {
  font-size: 16px;
  color: var(--text);
  margin-bottom: 12px;
  text-align: center;
}
.sc-canvas {
  width: 100%;
  max-width: 400px;
  display: block;
  margin: 0 auto;
  border-radius: 12px;
}
.sc-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  justify-content: center;
  flex-wrap: wrap;
}
.sc-btn {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.sc-download {
  background: var(--primary);
  color: #fff;
}
.sc-download:hover { background: var(--primary-dark); }
.sc-copy {
  background: var(--surface-light);
  border: 1px solid var(--border);
  color: var(--text);
}
.sc-copy:hover { border-color: var(--primary); color: var(--primary); }
.sc-tip {
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
  margin-top: 10px;
}
</style>
