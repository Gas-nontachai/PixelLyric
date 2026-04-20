export const DEFAULT_PROJECT_NAME = 'Untitled'

export function getDefaultProjectName() {
  return DEFAULT_PROJECT_NAME
}

export function resolveLoadedProjectName(
  projectName: string | null | undefined,
  fallbackProjectName?: string | null,
) {
  return projectName || fallbackProjectName || getDefaultProjectName()
}
