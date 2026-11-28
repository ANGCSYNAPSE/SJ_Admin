import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo,
  Redo,
  AArrowUp,
  AArrowDown,
} from 'lucide-react'
import { useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

/** Word-style font sizes (px). The editor's base text size is 14px. */
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72]
const BASE_FONT_SIZE = 14

function currentFontSize(editor: Editor): number {
  const raw = editor.getAttributes('textStyle').fontSize as string | undefined
  const parsed = raw ? parseFloat(raw) : NaN
  return Number.isFinite(parsed) ? parsed : BASE_FONT_SIZE
}

function applyFontSize(editor: Editor, size: number) {
  const chain = editor.chain().focus()
  if (size === BASE_FONT_SIZE) chain.unsetFontSize().run()
  else chain.setFontSize(`${size}px`).run()
}

/** Step to the next/previous size in the list, like Word's Grow/Shrink Font. */
function stepFontSize(editor: Editor, direction: 1 | -1) {
  const size = currentFontSize(editor)
  const next =
    direction === 1
      ? FONT_SIZES.find((s) => s > size) ?? FONT_SIZES[FONT_SIZES.length - 1]
      : [...FONT_SIZES].reverse().find((s) => s < size) ?? FONT_SIZES[0]
  applyFontSize(editor, next)
  return true
}

/** Word shortcuts: Ctrl+Shift+> / Ctrl+Shift+< and Ctrl+] / Ctrl+[ to grow/shrink text. */
const FontSizeShortcuts = Extension.create({
  name: 'fontSizeShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-.': () => stepFontSize(this.editor as Editor, 1),
      'Mod-Shift-,': () => stepFontSize(this.editor as Editor, -1),
      'Mod-]': () => stepFontSize(this.editor as Editor, 1),
      'Mod-[': () => stepFontSize(this.editor as Editor, -1),
    }
  },
})

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      // Keep the text selection in the editor when a toolbar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex size-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-orange text-white' : 'text-heading hover:bg-white'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-card-border-alt" />
}

function FontSizeControl({ editor }: { editor: Editor }) {
  const size = currentFontSize(editor)
  const options = FONT_SIZES.includes(size) ? FONT_SIZES : [...FONT_SIZES, size].sort((a, b) => a - b)
  const disabled = editor.isActive('heading')

  return (
    <>
      <select
        value={size}
        disabled={disabled}
        onChange={(e) => applyFontSize(editor, Number(e.target.value))}
        title={disabled ? 'Font size (not available inside headings)' : 'Font size'}
        aria-label="Font size"
        className="h-7 w-16 cursor-pointer rounded border border-card-border-alt bg-white px-1.5 text-xs text-heading focus:border-orange focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ToolbarButton
        label="Increase font size (Ctrl+Shift+>)"
        disabled={disabled || size >= FONT_SIZES[FONT_SIZES.length - 1]}
        onClick={() => stepFontSize(editor, 1)}
      >
        <AArrowUp size={15} />
      </ToolbarButton>
      <ToolbarButton
        label="Decrease font size (Ctrl+Shift+<)"
        disabled={disabled || size <= FONT_SIZES[0]}
        onClick={() => stepFontSize(editor, -1)}
      >
        <AArrowDown size={15} />
      </ToolbarButton>
    </>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previous ?? '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-card-border bg-search-bg px-2 py-1.5">
      <FontSizeControl editor={editor} />

      <Divider />

      <ToolbarButton label="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton label="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Underline (Ctrl+U)"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
        <LinkIcon size={14} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo size={14} />
      </ToolbarButton>
      <ToolbarButton label="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo size={14} />
      </ToolbarButton>
    </div>
  )
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      // StarterKit v3 already bundles Underline and Link, so they are configured here.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TextStyle,
      FontSize,
      FontSizeShortcuts,
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content: value,
    // Tiptap v3 no longer re-renders on every change by default; the toolbar needs it
    // so active/disabled states (bold, lists, font size, undo…) follow the cursor.
    shouldRerenderOnTransaction: true,
    immediatelyRender: true,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'rich-text max-w-none px-3.5 py-3 text-sm text-heading focus:outline-none min-h-[220px]',
      },
    },
  })

  // Keep the editor in sync if `value` is replaced from outside (e.g. loading a post to edit).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value])

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-lg border border-card-border bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
