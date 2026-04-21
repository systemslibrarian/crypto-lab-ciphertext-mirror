export type InterpretationContent = {
  whatSeeing: string
  parameterChange: string
  whyMatters: string
  notProve: string
}

export function renderInterpretationBlock(content: InterpretationContent): HTMLElement {
  const section = document.createElement('section')
  section.className = 'interpretation-block'
  section.innerHTML = `
    <h3>Interpretation</h3>
    <h4>What you're seeing</h4>
    <p>${content.whatSeeing}</p>
    <h4>What changes when parameters change</h4>
    <p>${content.parameterChange}</p>
    <h4>Why this matters</h4>
    <p>${content.whyMatters}</p>
    <h4>What this does NOT prove</h4>
    <p>${content.notProve}</p>
  `
  return section
}
