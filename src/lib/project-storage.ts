import type { PixelLyricProjectDocument } from '@/types'

const PROJECT_DB_NAME = 'pixelyric-projects'
const PROJECT_STORE_NAME = 'projects'
const WAVEFORM_STORE_NAME = 'waveforms'
const PROJECT_AUTOSAVE_KEY = 'autosave'
const PROJECT_DB_VERSION = 2

type WaveformCacheRecord = {
  key: string
  bars: number
  data: number[]
  updatedAt: string
}

function openProjectDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        database.createObjectStore(PROJECT_STORE_NAME)
      }

      if (!database.objectStoreNames.contains(WAVEFORM_STORE_NAME)) {
        database.createObjectStore(WAVEFORM_STORE_NAME)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Could not open the project database'))
    }
  })
}

function withObjectStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openProjectDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = operation(store)

        request.onsuccess = () => {
          resolve(request.result)
        }

        request.onerror = () => {
          reject(request.error ?? new Error('The project database request failed'))
        }

        transaction.oncomplete = () => {
          database.close()
        }

        transaction.onerror = () => {
          reject(transaction.error ?? new Error('The project database transaction failed'))
        }

        transaction.onabort = () => {
          reject(transaction.error ?? new Error('The project database transaction was aborted'))
        }
      }),
  )
}

export function loadAutosavedProject() {
  return withObjectStore<PixelLyricProjectDocument | undefined>(PROJECT_STORE_NAME, 'readonly', (store) =>
    store.get(PROJECT_AUTOSAVE_KEY),
  ).then((value) => value ?? null)
}

export function saveAutosavedProject(document: PixelLyricProjectDocument) {
  return withObjectStore<IDBValidKey>(PROJECT_STORE_NAME, 'readwrite', (store) =>
    store.put(document, PROJECT_AUTOSAVE_KEY),
  ).then(() => undefined)
}

function getWaveformStorageKey(key: string, bars: number) {
  return `${key}::${bars}`
}

export function getWaveformCacheKey(file: File) {
  return [file.name, file.size, file.lastModified, file.type || 'unknown'].join(':')
}

export function getCachedWaveform(key: string, bars: number) {
  return withObjectStore<WaveformCacheRecord | undefined>(WAVEFORM_STORE_NAME, 'readonly', (store) =>
    store.get(getWaveformStorageKey(key, bars)),
  ).then((value) => value?.data ?? null)
}

export function saveCachedWaveform(key: string, bars: number, data: number[]) {
  const record: WaveformCacheRecord = {
    key,
    bars,
    data,
    updatedAt: new Date().toISOString(),
  }

  return withObjectStore<IDBValidKey>(WAVEFORM_STORE_NAME, 'readwrite', (store) =>
    store.put(record, getWaveformStorageKey(key, bars)),
  ).then(() => undefined)
}
