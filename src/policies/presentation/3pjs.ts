export function addScript (src: string) {
  if (document?.head?.appendChild) {
    const scriptEl = document.createElement("script")
    scriptEl.src = src
    document.head.appendChild(scriptEl)
  }
}
