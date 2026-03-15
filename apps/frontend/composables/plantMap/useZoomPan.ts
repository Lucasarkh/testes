import { ref, onUnmounted } from 'vue'

export interface Transform {
  x: number
  y: number
  scale: number
}

interface UseZoomPanOptions {
  minScale?: number
  maxScale?: number
  scaleFactor?: number
}

/**
 * Provides zoom (wheel + pinch) and pan (drag) behaviour for an element.
 * All event listeners are added to `containerEl` (the clipping viewport).
 * The transform is applied to `contentEl` (the content being zoomed).
 *
 * Coordinates returned/consumed use the content-element space.
 */
export const useZoomPan = (options: UseZoomPanOptions = {}) => {
  const { minScale = 0.5, maxScale = 8, scaleFactor = 0.15 } = options

  const transform = ref<Transform>({ x: 0, y: 0, scale: 1 })
  const containerEl = ref<HTMLElement | null>(null)
  const contentEl = ref<HTMLElement | null>(null)

  // ── Pan state ──────────────────────────────────────────
  let isPanning = false
  let panStart = { x: 0, y: 0 }
  let transformAtPanStart: Transform = { x: 0, y: 0, scale: 1 }

  // ── Pinch state ────────────────────────────────────────
  let lastPinchDist = 0

  // ── Helpers ────────────────────────────────────────────
  const clampScale = (s: number) => {
    if (!containerEl.value || !contentEl.value) return Math.min(maxScale, Math.max(minScale, s))
    
    // Calculate minimum scale to "cover" the viewport completely (no background gaps)
    const cw = containerEl.value.clientWidth
    const ch = containerEl.value.clientHeight
    const iw = contentEl.value.offsetWidth || 1
    const ih = contentEl.value.offsetHeight || 1
    
    const minS = Math.max(cw / iw, ch / ih)
    return Math.min(maxScale, Math.max(minS, s))
  }

  const clampOffset = (s: number, x: number, y: number) => {
    if (!containerEl.value || !contentEl.value) return { x, y }
    const cw = containerEl.value.clientWidth
    const ch = containerEl.value.clientHeight
    
    // We use the contentEl's actual rendered size
    const iw = contentEl.value.offsetWidth || 1
    const ih = contentEl.value.offsetHeight || 1
    
    const contentW = iw * s
    const contentH = ih * s
    let newX = x
    let newY = y

    // If content is larger than container, keep it within bounds (no gaps at edges)
    if (contentW > cw) {
      newX = Math.min(0, Math.max(cw - contentW, newX))
    } else {
      // If it should have been covered by clampScale, it will be >= cw
      newX = (cw - contentW) / 2
    }

    if (contentH > ch) {
      newY = Math.min(0, Math.max(ch - contentH, newY))
    } else {
      newY = (ch - contentH) / 2
    }

    return { x: newX, y: newY }
  }

  const applyZoom = (delta: number, originX: number, originY: number) => {
    const { x, y, scale } = transform.value
    const newScale = clampScale(scale + delta * scale)
    const ratio = newScale / scale
    
    const newX = originX - ratio * (originX - x)
    const newY = originY - ratio * (originY - y)

    const clamped = clampOffset(newScale, newX, newY)
    transform.value = {
      scale: newScale,
      ...clamped
    }
  }

  // ── Fitting ────────────────────────────────────────────
  const fitToContainer = () => {
    if (!containerEl.value || !contentEl.value) return
    const cw = containerEl.value.clientWidth
    const ch = containerEl.value.clientHeight
    const iw = contentEl.value.offsetWidth || 1
    const ih = contentEl.value.offsetHeight || 1
    
    if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) return

    const scaleX = cw / iw
    const scaleY = ch / ih
    const newScale = Math.max(scaleX, scaleY)
    
    const x = (cw - iw * newScale) / 2
    const y = (ch - ih * newScale) / 2
    
    transform.value = { scale: newScale, x, y }
  }

  // ── Wheel zoom ─────────────────────────────────────────
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    if (!containerEl.value) return
    const rect = containerEl.value.getBoundingClientRect()
    const ox = e.clientX - rect.left
    const oy = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -scaleFactor : scaleFactor
    applyZoom(delta, ox, oy)
  }

  // ── Mouse pan ──────────────────────────────────────────
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    isPanning = true
    panStart = { x: e.clientX, y: e.clientY }
    transformAtPanStart = { ...transform.value }
    if (containerEl.value) containerEl.value.style.cursor = 'grabbing'
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    const newX = transformAtPanStart.x + dx
    const newY = transformAtPanStart.y + dy
    
    const clamped = clampOffset(transform.value.scale, newX, newY)
    transform.value = {
      ...transform.value,
      ...clamped
    }
  }

  const onMouseUp = (e: MouseEvent) => {
    isPanning = false
    if (containerEl.value) containerEl.value.style.cursor = 'grab'
  }

  // ── Touch pan + pinch ──────────────────────────────────
  const getTouchDist = (t1: Touch, t2: Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

  const onTouchStart = (e: TouchEvent) => {
    const firstTouch = e.touches[0]
    const secondTouch = e.touches[1]

    if (e.touches.length === 1 && firstTouch) {
      isPanning = true
      panStart = { x: firstTouch.clientX, y: firstTouch.clientY }
      transformAtPanStart = { ...transform.value }
    } else if (e.touches.length === 2 && firstTouch && secondTouch) {
      isPanning = false
      lastPinchDist = getTouchDist(firstTouch, secondTouch)
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const firstTouch = e.touches[0]
    const secondTouch = e.touches[1]

    if (e.touches.length === 1 && isPanning && firstTouch) {
      const dx = firstTouch.clientX - panStart.x
      const dy = firstTouch.clientY - panStart.y
      const newX = transformAtPanStart.x + dx
      const newY = transformAtPanStart.y + dy
      const clamped = clampOffset(transform.value.scale, newX, newY)
      transform.value = {
        ...transform.value,
        ...clamped
      }
    } else if (e.touches.length === 2 && firstTouch && secondTouch && containerEl.value) {
      const dist = getTouchDist(firstTouch, secondTouch)
      const delta = (dist - lastPinchDist) / 200
      lastPinchDist = dist

      const rect = containerEl.value.getBoundingClientRect()
      const cx = ((firstTouch.clientX + secondTouch.clientX) / 2) - rect.left
      const cy = ((firstTouch.clientY + secondTouch.clientY) / 2) - rect.top
      applyZoom(delta, cx, cy)
    }
  }

  const onTouchEnd = () => {
    isPanning = false
  }

  // ── Reset ──────────────────────────────────────────────
  const resetTransform = () => {
    fitToContainer()
  }

  // ── Lifecycle ──────────────────────────────────────────
  const attach = () => {
    const el = containerEl.value
    if (!el) return
    el.style.cursor = 'grab'
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
  }

  const detach = () => {
    const el = containerEl.value
    if (!el) return
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  }

  onUnmounted(detach)

  return {
    transform,
    containerEl,
    contentEl,
    resetTransform,
    fitToContainer,
    clampOffset,
    clampScale,
    /** Programmatically re-attach events (call after containerEl is set) */
    attach,
    detach,
  }
}
