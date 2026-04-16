import { Download, FolderOpen, Plus, Save } from 'lucide-react'

import type { IconDropdownMenuItem } from '@/types'

export type ProjectMenuActionId =
  | 'new-project'
  | 'open-project'
  | 'save-project'
  | 'save-project-as'
  | 'export-project'

export const PROJECT_MENU_ITEMS: Omit<IconDropdownMenuItem, 'onSelect'>[] = [
  {
    id: 'new-project',
    label: 'New project',
    icon: <Plus />,
  },
  {
    id: 'open-project',
    label: 'Open project',
    icon: <FolderOpen />,
  },
  {
    id: 'save-project',
    label: 'Save',
    icon: <Save />,
  },
  {
    id: 'save-project-as',
    label: 'Save As',
    icon: <Save />,
  },
  {
    id: 'export-project',
    label: 'Export JSON',
    icon: <Download />,
  },
]
