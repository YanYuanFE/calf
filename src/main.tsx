import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useConnectionStore } from './stores/connectionStore'
import './styles/globals.css'

function ConnectionStatusListener() {
  const handleConnectionStatusChange = useConnectionStore.getState().handleConnectionStatusChange

  useEffect(() => {
    const handleStatusChange = (..._args: unknown[]) => {
      const status = _args[1] as { connected: boolean; serverVersion?: string; reason?: string }
      handleConnectionStatusChange(status)
    }

    window.electron.on('db:connection:status', handleStatusChange)

    return () => {
      window.electron.off('db:connection:status', handleStatusChange)
    }
  }, [])

  return null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConnectionStatusListener />
    <App />
  </React.StrictMode>
)
