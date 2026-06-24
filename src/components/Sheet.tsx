import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
}

/** A bottom sheet modal. Tap backdrop to dismiss.
 *  Uses visualViewport to stay above the iOS software keyboard. */
export function Sheet({ title, onClose, children }: Props) {
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ marginBottom: keyboardOffset }}
      >
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
