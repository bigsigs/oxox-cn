export function initializeMenuSelect() {
  document.querySelectorAll<HTMLElement>("[data-menu-select]").forEach(container => {
    if (container.dataset.selectReady) return;
    const select = container.querySelector<HTMLSelectElement>("select");
    const details = container.querySelector<HTMLDetailsElement>("[data-select-details]");
    const trigger = details?.querySelector<HTMLElement>("summary");
    const label = trigger?.querySelector<HTMLElement>("[data-select-label]");
    const options = Array.from(container.querySelectorAll<HTMLButtonElement>("[data-select-value]"));
    if (!select || !details || !trigger || !label) return;
    container.dataset.selectReady = "true";

    const close = (restoreFocus = false) => {
      details.open = false;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus({ preventScroll: true });
    };
    const sync = () => {
      label.textContent = select.selectedOptions[0]?.label ?? "";
      trigger.setAttribute("aria-label", `${select.getAttribute("aria-label")}：${label.textContent}`);
      trigger.setAttribute("aria-disabled", String(select.disabled));
      options.forEach(option => {
        option.disabled = select.disabled;
        option.setAttribute("aria-selected", String(option.dataset.selectValue === select.value));
      });
      if (select.disabled) close();
    };
    const choose = (option: HTMLButtonElement) => {
      if (select.disabled || option.disabled) return;
      const changed = select.value !== option.dataset.selectValue;
      select.value = option.dataset.selectValue ?? "";
      sync();
      close(true);
      if (changed) {
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    trigger.addEventListener("click", event => {
      event.preventDefault();
      if (select.disabled) return;
      details.open = !details.open;
      trigger.setAttribute("aria-expanded", String(details.open));
    });
    trigger.addEventListener("keydown", event => {
      if (select.disabled || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      details.open = true;
      trigger.setAttribute("aria-expanded", "true");
      const selectedIndex = options.findIndex(option => option.dataset.selectValue === select.value);
      const index = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, selectedIndex);
      options[index]?.focus();
    });
    options.forEach((option, index) => {
      option.addEventListener("click", () => choose(option));
      option.addEventListener("keydown", event => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[next]?.focus();
      });
    });
    details.addEventListener("toggle", () => {
      trigger.setAttribute("aria-expanded", String(details.open));
    });
    details.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "Tab") {
        close();
      }
    });
    document.addEventListener("click", event => {
      if (event.target instanceof Node && !container.contains(event.target)) close();
    });
    select.addEventListener("change", sync);
    select.addEventListener("input", sync);
    new MutationObserver(sync).observe(select, { attributes: true, subtree: true, childList: true, attributeFilter: ["disabled", "selected"] });
    window.addEventListener("pageshow", sync);
    sync();
    select.hidden = true;
    details.hidden = false;
  });
}
