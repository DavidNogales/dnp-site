// Served ONLY by Playwright interception, never included in production assets.
(() => {
window.__turnstileMock = window.__turnstileMock || { widgets: [], removed: [], loads: 0 };
const mock = window.__turnstileMock;
mock.loads++;
window.turnstile = {
  ready(callback) { callback(); },
  render(container, options) {
    const id = String(mock.widgets.length);
    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.textContent = 'Mock verification';
    checkbox.style.cssText = 'width:150px;height:140px';
    checkbox.onclick = () => options.callback('fixture-token-' + id);
    container.append(checkbox);
    mock.widgets.push({ id, options, container });
    return id;
  },
  remove(id) {
    mock.removed.push(id);
    mock.widgets[Number(id)].container.replaceChildren();
  },
};
})();
