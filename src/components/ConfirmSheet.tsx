import { Sheet } from './Sheet'

interface Props {
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSheet({ title, message, confirmLabel = 'Delete', onConfirm, onClose }: Props) {
  return (
    <Sheet title={title} onClose={onClose}>
      {message && <p className="confirm-message">{message}</p>}
      <div className="row">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
