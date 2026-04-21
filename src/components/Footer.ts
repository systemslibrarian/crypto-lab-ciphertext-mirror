export function renderFooter(): HTMLElement {
  const footer = document.createElement('footer')
  footer.className = 'cl-footer'
  footer.innerHTML = `<em>"So whether you eat or drink or whatever you do, do it all for the glory of God."</em> — <a href="https://www.bible.com/bible/111/1CO.10.31.NIV" target="_blank" rel="noreferrer">1 Corinthians 10:31</a>`
  return footer
}
