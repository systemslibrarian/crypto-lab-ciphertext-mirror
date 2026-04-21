import type { MirrorState } from '../../components/types'

export function mirrorMarkup(state: MirrorState): string {
  const crack = state === 'cracked' ? '<path d="M90 22 72 58 102 84 80 128 108 150" stroke="var(--mirror-crack)" stroke-width="5" fill="none" stroke-linecap="round"/>' : ''
  const cloud =
    state === 'clouded'
      ? '<ellipse cx="92" cy="86" rx="54" ry="24" fill="var(--mirror-cloud)" opacity="0.45"/><ellipse cx="96" cy="76" rx="38" ry="16" fill="var(--mirror-cloud)" opacity="0.4"/>'
      : ''
  const frame =
    state === 'hardened'
      ? '<rect x="18" y="8" width="148" height="156" rx="14" fill="none" stroke="color-mix(in oklab, var(--text) 70%, #9aa3ad)" stroke-width="10"/>'
      : ''

  return `<svg viewBox="0 0 184 172" width="180" height="168" role="img" aria-label="Mirror ${state}">
    <defs>
      <radialGradient id="g" cx="50%" cy="45%">
        <stop offset="0%" stop-color="var(--mirror-glow)" stop-opacity="0.58"/>
        <stop offset="100%" stop-color="var(--mirror-glow)" stop-opacity="0.14"/>
      </radialGradient>
    </defs>
    <rect x="26" y="16" width="132" height="142" rx="11" fill="url(#g)" stroke="var(--border-color)" stroke-width="3"/>
    <path d="M44 44 C78 24, 110 58, 142 38" stroke="color-mix(in oklab, var(--mirror-glow) 80%, white)" stroke-width="2" opacity="0.7"/>
    ${cloud}
    ${crack}
    ${frame}
  </svg>`
}

export function renderMirror(state: MirrorState): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'mirror-wrap'
  wrap.innerHTML = mirrorMarkup(state)
  return wrap
}
