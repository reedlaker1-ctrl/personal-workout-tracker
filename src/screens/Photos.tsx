import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addPhoto, deletePhoto } from '../db/db'
import { shortDate } from '../util/format'

export function Photos() {
  const photos =
    useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), []) ?? []
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const touchStartX = useRef(0)

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

      <div className="photo-grid">
        {photos.map((p, i) => (
          <button key={p.id} className="photo-cell" onClick={() => setViewingIndex(i)}>
            <img src={urls.get(p.id!)} alt={shortDate(p.date)} />
            <span className="photo-date">{shortDate(p.date)}</span>
          </button>
        ))}
      </div>

      <button
        className="btn btn-full fab-row"
        style={{ marginTop: 14 }}
        onClick={() => fileRef.current?.click()}
      >
        + Add photo
      </button>

      {viewingPhoto && viewingIndex !== null && (
        <div
          className="photo-view-backdrop"
          onTouchStart={onLightboxTouchStart}
          onTouchEnd={onLightboxTouchEnd}
        >
          <div className="photo-view-bar">
            <button
              className="del-link"
              onClick={async () => {
                if (confirm('Delete this photo?')) {
                  await deletePhoto(viewingPhoto.id!)
                  setViewingIndex(null)
                }
              }}
            >
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
    </>
  )
}
