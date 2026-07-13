let fieldCounter = 0

function nextId(prefix: string): string {
  fieldCounter += 1
  return `${prefix}-${fieldCounter}`
}

function ensureId(input: HTMLElement, prefix: string): string {
  if (!input.id) {
    input.id = nextId(prefix)
  }
  return input.id
}

/**
 * Wrap a text/number input in a visible, associated label. An optional `hint` renders a
 * small help line beneath the control and is wired via aria-describedby so screen readers
 * announce it after the field name.
 */
export function renderTextField(labelText: string, input: HTMLInputElement, hint?: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'control-field'
  const id = ensureId(input, 'field')
  const label = document.createElement('label')
  label.className = 'control-label'
  label.htmlFor = id
  label.textContent = labelText
  // A real <label> now provides the accessible name; drop the redundant aria-label.
  input.removeAttribute('aria-label')
  wrap.append(label, input)
  if (hint) {
    const hintEl = document.createElement('p')
    hintEl.className = 'control-hint'
    hintEl.id = `${id}-hint`
    hintEl.textContent = hint
    input.setAttribute('aria-describedby', hintEl.id)
    wrap.append(hintEl)
  }
  return wrap
}

/**
 * Wrap a range input in a visible label plus a live value readout, so the current
 * value is perceivable to sighted users (screen readers already announce slider values).
 */
export function renderSliderField(
  labelText: string,
  input: HTMLInputElement,
  format: (value: number) => string = (v) => v.toFixed(2),
): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'control-field control-field-slider'
  const id = ensureId(input, 'slider')

  const row = document.createElement('div')
  row.className = 'control-label-row'
  const label = document.createElement('label')
  label.className = 'control-label'
  label.htmlFor = id
  label.textContent = labelText

  const out = document.createElement('output')
  out.className = 'control-value'
  out.setAttribute('for', id)
  out.textContent = format(Number(input.value))

  input.removeAttribute('aria-label')
  input.addEventListener('input', () => {
    out.textContent = format(Number(input.value))
  })

  row.append(label, out)
  wrap.append(row, input)
  return wrap
}

/** A checkbox with an associated, clickable text label. */
export function renderCheckboxField(labelText: string, input: HTMLInputElement): HTMLElement {
  const wrap = document.createElement('label')
  wrap.className = 'control-check'
  wrap.append(input, document.createTextNode(labelText))
  return wrap
}
