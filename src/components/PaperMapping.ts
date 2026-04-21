export type PaperMappingContent = {
  paperClaim: string
  demoModels: string
  demoOmits: string
}

export function renderPaperMapping(content: PaperMappingContent): HTMLElement {
  const section = document.createElement('section')
  section.className = 'paper-mapping'
  section.innerHTML = `
    <h3>Paper to Demo Mapping</h3>
    <h4>Paper claim</h4>
    <p>${content.paperClaim}</p>
    <h4>This demo models</h4>
    <p>${content.demoModels}</p>
    <h4>This demo omits</h4>
    <p>${content.demoOmits}</p>
  `
  return section
}
