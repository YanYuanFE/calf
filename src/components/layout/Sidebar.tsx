import { SchemaTree } from '@/components/tree/SchemaTree'

export function Sidebar() {
  return (
    <aside className="w-72 border-r border-gray-100 bg-[var(--color-sidebar)] flex flex-col">
      <SchemaTree />
    </aside>
  )
}
