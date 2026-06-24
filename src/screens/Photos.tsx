import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addPhoto, deletePhoto, type ProgressPhoto } from '../db/db'
import { shortDate } from '../util/format'

export function Photos() {
  const photos =
    useLiveQuery(() => db.photos.orderBy('date').reverse().toArray(), []) ?? []
  const fileRef = useRef<HTMLInputElement>(null)
  const [viewing, setViewing] = useState<number | null>(null)

  // Build (and clean up) object URLs for each photo blob.
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
    e.target.value = '' // allow re-picking the same file
  }

  const viewingPhoto: ProgressPhoto | undefined =
    viewing != null ? photos.find((p) => p.id === viewing) : undefined

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
        {photos.map((p) => (
          <button key={p.id} className="photo-cell" onClick={() => setViewing(p.id!)}>
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

      {viewingPhoto && (
        <div className="photo-view-backdrop">
          <div className="photo-view-bar">
            <button
              className="del-link"
              onClick={async () => {
                if (confirm('Delete this photo?')) {
                  await deletePhoto(viewingPhoto.id!)
                  setViewing(null)
                }
              }}
            >
              Delete
            </button>
            <span className="subtle">{shortDate(viewingPhoto.date)}</span>
            <button className="btn-ghost" onClick={() => setViewing(null)}>
              Done
            </button>
          </div>
          <img src={urls.get(viewingPhoto.id!)} alt={shortDate(viewingPhoto.date)} />
        </div>
      )}
    </>
  )
}
