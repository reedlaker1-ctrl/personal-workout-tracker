import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

// How long the slide-down-and-fade takes before the sheet actually unmounts.
const DISMISS_MS = 200
const DRAG_CLOSE_THRESHOLD = 90

export function Sheet({ title, onClose, children }: Props) {
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const dragStartY = useRef(0)
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const requestClose = () => {
    if (dismissing) return
    setDragging(false)
    setDismissing(true)
    dismissTimeout.current = setTimeout(onClose, DISMISS_MS)
  }

  useEffect(() => () => {
    if (dismissTimeout.current) clearTimeout(dismissTimeout.current)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.classList.add('sheet-open')
    return () => document.body.classList.remove('sheet-open')
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  const onHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setDragging(true)
  }

  const onHandleTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - dragStartY.current
    if (dy > 0) setDragY(dy)
  }

  const onHandleTouchEnd = () => {
    setDragging(false)
    if (dragY > DRAG_CLOSE_THRESHOLD) {
      requestClose()
    } else {
      setDragY(0)
    }
  }

  const translateY = dismissing ? '100%' : `${dragY}px`

  return (
    <div
      className="sheet-backdrop"
      onClick={requestClose}
      style={{ opacity: dismissing ? 0 : 1, transition: `opacity ${DISMISS_MS}ms ease` }}
    >
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          marginBottom: keyboardOffset,
          transform: `translateY(${translateY})`,
          transition: dragging ? 'none' : `transform ${DISMISS_MS}ms ease`,
        }}
      >
        <div
          className="sheet-handle-area"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="sheet-handle" />
        </div>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
