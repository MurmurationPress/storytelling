'use strict';
function revealDocument(progress, count) {
  for (const unit of progress.querySelectorAll('[data-janus-unit]')) unit.hidden = Number(unit.dataset.janusUnit) >= count;
  // Structural wrappers contribute neither empty space nor orphan bullets.
  for (const wrapper of [...progress.querySelectorAll('ul, ol, blockquote, table, .janus-table-scroll, p')].reverse())
    if (!wrapper.hasAttribute('data-janus-unit') && (wrapper.tagName !== 'P' || wrapper.querySelector('[data-janus-unit]'))) wrapper.hidden = ![...wrapper.querySelectorAll('[data-janus-unit]')].some(unit => !unit.hidden);
}
function prepareDocument(progress) {
  const document = progress.ownerDocument;
  for (const table of progress.querySelectorAll('table')) {
    const scroll = document.createElement('div');
    scroll.className = 'janus-table-scroll'; scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-label', 'Document table; scroll horizontally');
    table.before(scroll); scroll.append(table);
    for (const heading of table.querySelectorAll('th')) heading.setAttribute('scope', 'col');
    // Measure the COMPLETE table while it participates in layout, before any
    // row is hidden. A colgroup then holds widths as rows enter the document.
    const width = table.getBoundingClientRect().width;
    const cells = [...(table.rows[0]?.cells || [])];
    const widths = cells.map(cell => cell.getBoundingClientRect().width);
    const columns = document.createElement('colgroup');
    for (const value of widths) {
      const col = document.createElement('col'); col.style.width = `${value}px`; columns.append(col);
    }
    table.prepend(columns); table.style.width = `${width}px`; table.style.tableLayout = 'fixed';
  }
}
module.exports = { prepareDocument, revealDocument };
