import type { PixelLyricProjectDocument } from '@/types'

const PROJECT_DB_NAME = 'pixelyric-projects'
const PROJECT_STORE_NAME = 'projects'
const PROJECT_AUTOSAVE_KEY = 'autosave'
const PROJECT_DB_VERSION = 1

function openProjectDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(PROJECT_STORE_NAME)) {
        database.createObjectStore(PROJECT_STORE_NAME)
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
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return openProjectDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(PROJECT_STORE_NAME, mode)
        const store = transaction.objectStore(PROJECT_STORE_NAME)
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
  return withObjectStore<PixelLyricProjectDocument | undefined>('readonly', (store) =>
    store.get(PROJECT_AUTOSAVE_KEY),
  ).then((value) => value ?? null)
}

export function saveAutosavedProject(document: PixelLyricProjectDocument) {
  return withObjectStore<IDBValidKey>('readwrite', (store) =>
    store.put(document, PROJECT_AUTOSAVE_KEY),
  ).then(() => undefined)
}
