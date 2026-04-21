import type { MlKemLevel } from './types'

export function renderParamSelector(initial: MlKemLevel, onChange: (level: MlKemLevel) => void): HTMLElement {
  const wrap = document.createElement('label')
  wrap.innerHTML = `
    <span>ML-KEM level:</span>
    <select>
      <option value="512">ML-KEM-512</option>
      <option value="768">ML-KEM-768</option>
      <option value="1024">ML-KEM-1024</option>
    </select>
  `

  const select = wrap.querySelector('select')
  if (select) {
    select.value = String(initial)
    select.addEventListener('change', () => {
      const value = Number(select.value)
      if (value === 512 || value === 768 || value === 1024) {
        onChange(value)
      }
    })
  }

  return wrap
}
