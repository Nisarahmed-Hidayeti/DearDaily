// Public exports deliberately omit account IDs, mood, tags, category and entry date.
export function publicStoryHtml(title: string, body: string) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char]!,
    )
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(title || 'Untitled story')} · DearDaily</title><style>body{margin:0;background:#15121d;color:#eee9f4;font:18px/1.8 Georgia,serif}main{max-width:720px;margin:8vh auto;padding:28px}small{color:#b9a9cc}h1{line-height:1.2;font-size:clamp(2rem,6vw,3.5rem)}article{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><main><small>DearDaily · Every day has a story.</small><h1>${escape(title || 'Untitled story')}</h1><article>${escape(body)}</article></main></body></html>`
}
export function downloadPublicStory(title: string, body: string) {
  const url = URL.createObjectURL(
    new Blob([publicStoryHtml(title, body)], {
      type: 'text/html;charset=utf-8',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'deardaily-public-story.html'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
