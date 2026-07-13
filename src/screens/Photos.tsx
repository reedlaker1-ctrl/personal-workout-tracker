import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addPhoto, deletePhoto } from '../db/db'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { shortDate } from '../util/format'

export function Photos() {
  const photos =
    useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), []) ?? []
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const touchStartX = useRef(0)

  // Select mode for sharing
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const enterSelectMode = () => { setSelectMode(true); setSelected(new Set()) }
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()) }

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const shareSelected = async () => {
    const toShare = photos.filter((p) => p.id != null && selected.has(p.id!))
    const files = toShare.map(
      (p, i) => new File([p.blob], `progress-${p.date}-${i + 1}.jpg`, {
        type: p.blob.type || 'image/jpeg',
      })
    )
    try {
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, title: 'Progress photos' })
      } else if (navigator.share) {
        await navigator.share({ title: 'Progress photos', text: `${files.length} progress photo(s)` })
      }
    } catch {
      // user cancelled share sheet — ignore
    }
  }

  const urls = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of photos) if (p.id != null) map.set(p.id, URL.createObjectURL(p.blob))
    return map
  }, [photos])

  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [urls])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await addPhoto(file)
    e.target.value = ''
  }

  const viewingPhoto = viewingIndex !== null ? photos[viewingIndex] : undefined

  const onLightboxTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onLightboxTouchEnd = (e: React.TouchEvent) => {
    if (viewingIndex === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) setViewingIndex(Math.min(photos.length - 1, viewingIndex + 1))
    else if (dx > 50) setViewingIndex(Math.max(0, viewingIndex - 1))
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onPick}
      />

      {photos.length === 0 && (
        <div className="empty">Snap progress photos to see your changes over time.</div>
      )}

      {photos.length > 0 && (
        <div className="photo-toolbar">
          {selectMode ? (
            <>
              <button className="btn-ghost" style={{ fontSize: 14 }} onClick={exitSelectMode}>
                Cancel
              </button>
              <span className="subtle" style={{ fontSize: 14 }}>
                {selected.size > 0 ? `${selected.size} selected` : 'Tap to select'}
              </span>
              <button
                className="btn btn-accent"
                style={{ fontSize: 14, padding: '8px 16px', opacity: selected.size > 0 ? 1 : 0.4 }}
                disabled={selected.size === 0}
                onClick={shareSelected}
              >
                Share {selected.size > 0 ? `(${selected.size})` : ''}
              </button>
            </>
          ) : (
            <>
              <span />
              <button className="btn-ghost" style={{ fontSize: 14 }} onClick={enterSelectMode}>
                Select
              </button>
            </>
          )}
        </div>
      )}

      <div className="photo-grid">
        {photos.map((p, i) => {
          const isSelected = p.id != null && selected.has(p.id!)
          return (
            <button
              key={p.id}
              className={`photo-cell${isSelected ? ' selected' : ''}`}
              onClick={() => {
                if (selectMode) toggleSelect(p.id!)
                else setViewingIndex(i)
              }}
            >
              <img src={urls.get(p.id!)} alt={shortDate(p.date)} />
              <span className="photo-date">{shortDate(p.date)}</span>
              {selectMode && (
                <span className={`photo-check${isSelected ? ' on' : ''}`}>✓</span>
              )}
            </button>
          )
        })}
      </div>

      {!selectMode && (
        <button
          className="btn btn-full fab-row"
          style={{ marginTop: 14 }}
          onClick={() => fileRef.current?.click()}
        >
          + Add photo
        </button>
      )}

      {viewingPhoto && viewingIndex !== null && (
        <div
          className="photo-view-backdrop"
          onTouchStart={onLightboxTouchStart}
          onTouchEnd={onLightboxTouchEnd}
        >
          <div className="photo-view-bar">
            <button className="del-link" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
            <span className="photo-position">{viewingIndex + 1} / {photos.length}</span>
            <button className="btn-ghost" onClick={() => setViewingIndex(null)}>
              Done
            </button>
          </div>

          <img src={urls.get(viewingPhoto.id!)} alt={shortDate(viewingPhoto.date)} />

          <div className="photo-nav-overlay">
            <button
              className="photo-nav-btn"
              onClick={() => setViewingIndex(Math.max(0, viewingIndex - 1))}
              disabled={viewingIndex === 0}
              aria-label="Newer photo"
            >
              ‹
            </button>
            <button
              className="photo-nav-btn"
              onClick={() => setViewingIndex(Math.min(photos.length - 1, viewingIndex + 1))}
              disabled={viewingIndex === photos.length - 1}
              aria-label="Older photo"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {confirmingDelete && viewingPhoto && (
        <ConfirmSheet
          title="Delete photo?"
          message={`The photo from ${shortDate(viewingPhoto.date)} will be removed.`}
          onConfirm={async () => {
            await deletePhoto(viewingPhoto.id!)
            setViewingIndex(null)
          }}
          onClose={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
