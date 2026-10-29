import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import { safeWritingLink } from './document'
/** Shared by the writing surface and real ProseMirror integration checks. */
export function writingExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: false,
        isAllowedUri: (url) => safeWritingLink(url),
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({
      placeholder: 'Write something, or type / for commands…',
    }),
    Markdown,
  ]
}
