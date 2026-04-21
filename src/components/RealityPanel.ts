import type { RealityContent } from './types'

export function renderRealityPanel(content: RealityContent): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'reality-panel'

  const modelsList = content.whatSimModels.map((item) => `<li>${item}</li>`).join('')
  const gapsList = content.whatSimDoesNotModel.map((item) => `<li>${item}</li>`).join('')

  panel.innerHTML = `
    <h3>Reality Panel</h3>
    <p><strong>Paper:</strong> ${content.paper}</p>
    <h4>What the paper shows</h4>
    <p>${content.whatPaperShows}</p>
    <h4>What this sim models</h4>
    <ul>${modelsList}</ul>
    <h4>What this sim does NOT model</h4>
    <ul>${gapsList}</ul>
  `

  return panel
}
