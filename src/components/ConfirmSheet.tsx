import { Sheet } from './Sheet'

interface Props {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'accent'
  onConfirm: () => void
  // Fires only when the user explicitly taps the cancel button — not on
  // backdrop tap, swipe-to-dismiss, or Escape. Use for "no" actions that
  // need their own side effect (as opposed to just walking away).
  onCancel?: () => void
  onClose: () => void
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  onClose,
}: Props) {
  return (
    <Sheet title={title} onClose={onClose}>
      {message && <p className="confirm-message">{message}</p>}
      <div className="row">
        <button type="button" className="btn btn-outline" onClick={() => { onCancel?.(); onClose() }}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${tone === 'accent' ? 'btn-accent' : 'btn-danger'}`}
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
