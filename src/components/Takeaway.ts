export type TakeawayContent = {
  /** The single sentence a learner should leave with. */
  takeaway: string
  /** Concrete parameter experiments that reveal the lesson. */
  experiments: string[]
}

export function renderTakeaway(content: TakeawayContent): HTMLElement {
  const section = document.createElement('section')
  section.className = 'takeaway'

  const heading = document.createElement('p')
  heading.className = 'takeaway-heading'
  heading.innerHTML = '<span aria-hidden="true">🎯</span> Key takeaway'

  const body = document.createElement('p')
  body.className = 'takeaway-body'
  body.textContent = content.takeaway

  const expTitle = document.createElement('p')
  expTitle.className = 'takeaway-exp-title'
  expTitle.textContent = 'Experiments to try'

  const list = document.createElement('ul')
  list.className = 'takeaway-list'
  content.experiments.forEach((exp) => {
    const li = document.createElement('li')
    li.textContent = exp
    list.append(li)
  })

  section.append(heading, body, expTitle, list)
  return section
}
