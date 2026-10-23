# AGENTS

- Whole app lives in `index.html` (no build step). Keep design, text and the Premium/membership flow unchanged unless asked.
- Navigation: sections are `.page.tab-section` with ids `ayuno|comida|agua|progreso|mas`; tab buttons are `.tab.nav-item` with ids `t-<id>`. `showTab(section, tabId)` and `go(page)` both switch screens. Comida/Agua/Progreso buttons use inline `showTab` onclick handlers (init doesn't overwrite them).
