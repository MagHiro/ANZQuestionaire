/* Embed helper: accepts messages only from the iframe's exact origin and source. */
;(() => {
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return
    for (const frame of document.querySelectorAll('iframe')) {
      let origin
      try {
        origin = new URL(frame.src).origin
      } catch {
        continue
      }
      if (event.source !== frame.contentWindow || event.origin !== origin) continue
      if (event.data.type === 'questionnaire:resize' && Number.isFinite(event.data.height)) {
        frame.style.height = `${Math.max(480, Math.min(20000, event.data.height))}px`
      }
      if (event.data.type === 'questionnaire:completed') {
        frame.dispatchEvent(
          new CustomEvent('questionnaire:completed', {
            detail: {
              responseId: event.data.responseId,
              releaseId: event.data.releaseId,
            },
          }),
        )
      }
    }
  })
})()
