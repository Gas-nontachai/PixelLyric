type PickerPermissionMode = 'read' | 'readwrite'

type ProjectFileWritable = {
  write: (data: Blob | BufferSource | string) => Promise<void>
  close: () => Promise<void>
}

export type ProjectFileHandle = {
  kind?: 'file'
  name: string
  createWritable: () => Promise<ProjectFileWritable>
  getFile?: () => Promise<File>
  queryPermission?: (descriptor?: { mode?: PickerPermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: PickerPermissionMode }) => Promise<PermissionState>
}
