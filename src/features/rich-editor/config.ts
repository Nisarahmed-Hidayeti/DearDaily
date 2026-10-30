// Requires the reviewed writing-document migration plus real hosted tests.
export const richEditorEnabled =
  import.meta.env.VITE_ENABLE_RICH_EDITOR === 'true'
export const richPublicFields = richEditorEnabled
  ? ',writing_document,page_icon,cover_preset'
  : ''
