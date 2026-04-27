import type { ProjectAudioTrack } from './audio'
import type { PageScript, ScreenPresetId } from './lcd'

export type CountdownOption = 0 | 3 | 5 | 10

export type SerializedProjectAudioTrack = {
  name: string
  mimeType: string
  lastModified: number
  durationMs: number
  trimStartMs: number
  trimEndMs: number
  volumePercent: number
  dataBase64: string
}

export type PixelLyricProjectDocument = {
  format: 'pixelyric-project'
  version: 1
  projectName: string
  savedAt: string
  screenType: ScreenPresetId
  countdownSeconds: CountdownOption
  includeCountdownInExport: boolean
  pages: PageScript[]
  audioTrack: SerializedProjectAudioTrack | null
}

export type PixelLyricProjectState = {
  projectName: string
  screenType: ScreenPresetId
  countdownSeconds: CountdownOption
  includeCountdownInExport: boolean
  pages: PageScript[]
  audioTrack: ProjectAudioTrack | null
}

export type ProjectActionResult = {
  ok: boolean
  message?: string
}

export type ProjectTextExportPreview = {
  content: string
  fileName: string
  mimeType: string
}
