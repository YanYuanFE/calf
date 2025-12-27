import Editor from '@monaco-editor/react'
import { useQueryStore } from '@/stores/queryStore'
import { useConnectionStore } from '@/stores/connectionStore'

export function SqlEditor() {
  const { sql, setSql, execute, isExecuting } = useQueryStore()
  const { status } = useConnectionStore()

  const handleEditorMount = (editor: unknown) => {
    const monacoEditor = editor as {
      addCommand: (keybinding: number, handler: () => void) => void
    }
    // Ctrl/Cmd + Enter 执行查询
    monacoEditor.addCommand(
      // Monaco KeyMod.CtrlCmd | Monaco KeyCode.Enter
      2048 | 3, // CtrlCmd + Enter
      () => {
        if (status === 'connected' && !isExecuting) {
          execute()
        }
      }
    )
  }

  return (
    <div className="h-full w-full bg-white">
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme="vs"
        value={sql}
        onChange={(value) => setSql(value || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          automaticLayout: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'gutter',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
          },
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
        }}
      />
    </div>
  )
}
