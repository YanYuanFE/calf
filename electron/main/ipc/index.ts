import { setupConnectionHandlers } from './connection'
import { setupQueryHandlers } from './query'
import { setupDiagramHandlers } from './diagram'

export function setupIpcHandlers(): void {
  setupConnectionHandlers()
  setupQueryHandlers()
  setupDiagramHandlers()
}
