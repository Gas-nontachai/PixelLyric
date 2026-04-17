import type { ProjectFileHandle } from '@/types'

type PickerPermissionMode = 'read' | 'readwrite'

type FilePickerAcceptType = {
  description?: string
  accept: Record<string, string[]>
}

type BrowserFilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    excludeAcceptAllOption?: boolean
    multiple?: boolean
    types?: FilePickerAcceptType[]
  }) => Promise<ProjectFileHandle[]>
  showSaveFilePicker?: (options?: {
    excludeAcceptAllOption?: boolean
    suggestedName?: string
    types?: FilePickerAcceptType[]
  }) => Promise<ProjectFileHandle>
}

const browserWindow = window as BrowserFilePickerWindow

const PROJECT_FILE_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: 'PixelLyric project',
    accept: {
      'application/vnd.pixelyric.project+json': ['.pixelyric'],
      'application/json': ['.json'],
    },
  },
]

const PROJECT_SAVE_PICKER_TYPES: FilePickerAcceptType[] = [
  {
    description: 'PixelLyric project',
    accept: {
      'application/vnd.pixelyric.project+json': ['.pixelyric'],
    },
  },
]

async function ensureHandlePermission(handle: ProjectFileHandle, mode: PickerPermissionMode) {
  const permissionDescriptor = { mode }
  const currentPermission = await handle.queryPermission?.(permissionDescriptor)

  if (currentPermission === 'granted') {
    return true
  }

  const nextPermission = await handle.requestPermission?.(permissionDescriptor)
  return nextPermission === 'granted' || (!handle.queryPermission && !handle.requestPermission)
}

export function supportsProjectFileSystemAccess() {
  return typeof browserWindow.showOpenFilePicker === 'function' && typeof browserWindow.showSaveFilePicker === 'function'
}

export function isProjectFilePickerAbort(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

export async function openProjectFileWithPicker() {
  if (!browserWindow.showOpenFilePicker) {
    return null
  }

  const [fileHandle] = await browserWindow.showOpenFilePicker({
    excludeAcceptAllOption: true,
    multiple: false,
    types: PROJECT_FILE_PICKER_TYPES,
  })

  if (!fileHandle?.getFile) {
    throw new Error('The selected file could not be opened')
  }

  return {
    fileHandle,
    file: await fileHandle.getFile(),
  }
}

export async function pickProjectSaveFileHandle(suggestedName: string) {
  if (!browserWindow.showSaveFilePicker) {
    return null
  }

  return browserWindow.showSaveFilePicker({
    excludeAcceptAllOption: true,
    suggestedName,
    types: PROJECT_SAVE_PICKER_TYPES,
  })
}

export async function writeProjectFile(handle: ProjectFileHandle, content: string) {
  const hasPermission = await ensureHandlePermission(handle, 'readwrite')

  if (!hasPermission) {
    throw new Error('File access was not granted')
  }

  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}