import { Node, mergeAttributes } from '@tiptap/core'
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react'
import { MediaImage } from '../media/MediaImage'
function PhotoBlock({
  node,
  updateAttributes,
  deleteNode,
  editor,
}: NodeViewProps) {
  return (
    <NodeViewWrapper
      className="journal-image-block"
      data-align={node.attrs.align}
      data-width={node.attrs.width}
      contentEditable={false}
    >
      <MediaImage
        assetId={node.attrs.assetId ?? undefined}
        publicId={node.attrs.publicId ?? undefined}
        alt={node.attrs.alt}
      />
      {editor.isEditable && (
        <details className="image-block-controls">
          <summary>Photo options</summary>
          <label>
            Alt text
            <input
              maxLength={300}
              value={node.attrs.alt}
              onChange={(e) => updateAttributes({ alt: e.target.value })}
            />
          </label>
          <label>
            Photo width
            <select
              value={node.attrs.width}
              onChange={(e) => updateAttributes({ width: e.target.value })}
            >
              {['small', 'medium', 'wide'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Alignment
            <select
              value={node.attrs.align}
              onChange={(e) => updateAttributes({ align: e.target.value })}
            >
              {['left', 'center', 'right'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={deleteNode}>
            Remove photo
          </button>
        </details>
      )}
    </NodeViewWrapper>
  )
}
export const JournalImage = Node.create({
  name: 'journalImage',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      assetId: { default: null },
      publicId: { default: null },
      alt: { default: '' },
      width: { default: 'wide' },
      align: { default: 'center' },
    }
  },
  parseHTML() {
    return []
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-journal-image': '' }),
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(PhotoBlock)
  },
})
