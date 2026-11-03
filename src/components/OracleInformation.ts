import { renderSliderField } from './Field'
import { channelInformation, majorityErrors } from '../lib/leakage/information'

export function renderOracleInformation(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'output-block'
  section.id = 'oracle-information'
  section.innerHTML = `<h3 class="card-section-title">Information per answer — and why bursts matter</h3>
    <p>This separate calculation does not change the replay above. Let X be the true query bit, P(X=1)=q, and let an independent flip produce Y with accuracy ρ. H₂ is binary entropy in bits.</p>
    <p><code>I(X;Y) = H₂((1−ρ) + q(2ρ−1)) − H₂(ρ)</code>. Balanced queries (q=0.5) attain the one-answer ceiling <code>1−H₂(ρ)</code>.</p>`
  const controls = document.createElement('div')
  controls.className = 'card-controls'
  const slider = (value: string, min: string, max: string, step: string) => {
    const input = document.createElement('input')
    input.type = 'range'
    Object.assign(input, { min, max, step, value })
    return input
  }
  const accuracy = slider('0.95', '0.5', '1', '0.01')
  const bias = slider('0.5', '0', '1', '0.05')
  const repeats = slider('5', '1', '15', '2')
  controls.append(
    renderSliderField('Channel accuracy ρ', accuracy),
    renderSliderField('True query probability q', bias),
    renderSliderField('Repeated answers for one bit', repeats, (n) => String(n)),
  )
  const result = document.createElement('div')
  result.setAttribute('role', 'status')
  result.setAttribute('aria-atomic', 'true')
  const render = () => {
    const rho = Number(accuracy.value)
    const n = Number(repeats.value)
    const errors = majorityErrors(rho, n)
    result.innerHTML = `<p><strong data-info="selected">${channelInformation(rho, Number(bias.value)).toFixed(4)} bits per answer</strong> for the chosen bias; <span data-info="balanced">${channelInformation(rho, 0.5).toFixed(4)}</span> for a balanced query.</p>
      <p>Repeat the same bit ${n} times and majority vote. With the same per-answer accuracy:</p>
      <ul><li>Independent flips: <strong data-error="iid">${(errors.iid * 100).toFixed(4)}%</strong> majority error.</li>
      <li>One shared flip across the entire block: <strong data-error="burst">${(errors.sharedBurst * 100).toFixed(4)}%</strong> majority error.</li></ul>`
  }
  for (const control of [accuracy, bias, repeats]) control.addEventListener('input', render)
  render()
  section.append(controls, result)
  const notes = document.createElement('div')
  notes.innerHTML = `<p>The burst example is an extreme correlated model, not a fit to hardware. Each block is either all correct or all wrong. Repetitions add no evidence in that model. These are exact probability calculations, not sampled traces or recovery guarantees. Other correlations can behave differently.</p>
    <p>At 50% accuracy the information is zero. Below 50%, a known systematic inversion can be corrected by relabeling answers; this control uses 50–100%. Individually balanced queries need not be independent. Do not multiply the one-answer ceiling into a guaranteed finite-query recovery rate.</p>
    <h4>Keep the experiment accounts separate</h4>
    <ul><li><strong>Simulation:</strong> 2,950 oracle queries at 95% accuracy for ML-KEM-768.</li>
      <li><strong>Physical traces:</strong> about 6,048 measurements for the successful ML-KEM-512 runs; not the simulation's query count. Success allowed Hamming distance up to 4 (73/100 trials).</li>
      <li><strong>Calibration:</strong> excluded from that trace total. Setup and profiling require additional work.</li>
      <li><strong>Elapsed time:</strong> about 25 minutes in the reported setup, nearly half spent calibrating.</li></ul>
    <p>The physical experiment uses native code and timing access on Apple M1; browser attacks are outside its scope. Our browser lesson collects no hardware traces.</p>
    <p>Source: <a href="https://www.usenix.org/system/files/usenixsecurity26-guo-qian.pdf">Guo, Nabokov and Johansson, USENIX Security 2026</a>, §§3.1, 3.4 and 4.1–4.2 (Table 3). Related: <a href="https://systemslibrarian.github.io/crypto-lab-kem-trap/">KEM Trap</a>.</p>`
  section.append(notes)
  return section
}
