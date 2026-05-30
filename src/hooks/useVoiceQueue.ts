'use client'
// IndexedDB queue for voice recordings that failed to upload due to poor connectivity.
// On next `online` event, the queue drains automatically.
import { useEffect, useRef, useCallback, useState } from 'react'

interface QueuedRecording {
  id:       number
  blob:     Blob
  filename: string
  language: string
  queuedAt: number
}

const DB_NAME    = 'medintel-voice-queue'
const STORE_NAME = 'recordings'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function enqueue(entry: Omit<QueuedRecording, 'id'>): Promise<number> {
  const db  = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).add(entry)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror   = () => reject(req.error)
  })
}

async function dequeue(id: number): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

async function listQueue(): Promise<QueuedRecording[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as QueuedRecording[])
    req.onerror   = () => reject(req.error)
  })
}

type UploadFn = (blob: Blob, filename: string, language: string) => Promise<void>

export function useVoiceQueue(onUploaded: UploadFn) {
  const onUploadedRef = useRef(onUploaded)
  // React 19 forbids mutating refs during render. Sync via effect so callers
  // can pass a fresh closure on each render without us touching `.current`
  // until commit.
  useEffect(() => { onUploadedRef.current = onUploaded }, [onUploaded])

  const [queueLength, setQueueLength] = useState(0)
  const [draining,    setDraining]    = useState(false)

  const refreshCount = useCallback(async () => {
    try { setQueueLength((await listQueue()).length) } catch { /* IDB unavailable */ }
  }, [])

  const drain = useCallback(async () => {
    let items: QueuedRecording[]
    try { items = await listQueue() } catch { return }
    if (items.length === 0) return
    setDraining(true)
    try {
      for (const item of items) {
        try {
          await onUploadedRef.current(item.blob, item.filename, item.language)
          await dequeue(item.id)
        } catch {
          break // still offline — stop trying
        }
      }
    } finally {
      setDraining(false)
      refreshCount()
    }
  }, [refreshCount])

  // Auto-drain when browser goes online
  useEffect(() => {
    window.addEventListener('online', drain)
    refreshCount()
    return () => window.removeEventListener('online', drain)
  }, [drain, refreshCount])

  const addToQueue = useCallback(async (blob: Blob, filename: string, language: string) => {
    await enqueue({ blob, filename, language, queuedAt: Date.now() })
    refreshCount()
  }, [refreshCount])

  return { queueLength, draining, addToQueue, drain }
}
