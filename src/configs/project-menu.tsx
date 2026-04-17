import { Braces, Download, FileCode2, FolderOpen, Plus, Save } from 'lucide-react'

import type { IconDropdownMenuActionItem, IconDropdownMenuParentItem } from '@/types'

export type ProjectMenuActionId =
  | 'new-project'
  | 'open-project'
  | 'save-project'
  | 'save-project-as'
  | 'export-project'
  | 'export-project-json'
  | 'export-project-ino'

type ProjectMenuConfigItem = Omit<IconDropdownMenuActionItem, 'onSelect'>
  | (Omit<IconDropdownMenuParentItem, 'children'> & {
      children: Array<Omit<IconDropdownMenuActionItem, 'onSelect'>>
    })

export const PROJECT_MENU_ITEMS: ProjectMenuConfigItem[] = [
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
    label: 'Export',
    icon: <Download />,
    children: [
      {
        id: 'export-project-json',
        label: 'JSON',
        icon: <Braces />,
      },
      {
        id: 'export-project-ino',
        label: 'INO',
        icon: <FileCode2 />,
      },
    ],
  },
]
