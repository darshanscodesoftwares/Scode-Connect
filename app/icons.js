const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  inbox: '<path d="m3 13 3-8h12l3 8v6H3z"/><path d="M3 13h5l2 3h4l2-3h5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m2 3c2 1 3 3 3 6"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  spark:
    '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3zM20 2v4m-2-2h4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  bell: '<path d="M5 16c2-2 2-3 2-7a5 5 0 0 1 10 0c0 4 0 5 2 7l1 1H4zM10 20a2 2 0 0 0 4 0"/>',
  chart: '<path d="M4 4v16h17M8 16v-4m5 4V7m5 9v-6"/>',
  settings:
    '<path d="m9 3-.7 2.2-2 .9-2.1-.4-1.7 3 1.5 1.6v2.6l-1.5 1.7 1.7 3 2.1-.4 2 .9L9 21h5l.7-2.3 2-.9 2.2.4 1.6-3-1.5-1.7v-2.6l1.5-1.6-1.6-3-2.2.4-2-.9L14 3z"/><circle cx="11.5" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  phone:
    '<path d="M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4c0 2-2 3-4 2A22 22 0 0 1 3 7c-.5-2 0-4 2-4z"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0m-7 7v4m-4 0h8"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
  building:
    '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 8h1m6 0h1m-8 4h1m6 0h1m-6 9v-5h4v5"/>',
  activity: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
  filter:
    '<path d="M3 7h8m5 0h5M3 17h3m6 0h9"/><circle cx="13" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  trash: '<path d="M4 6h16m-13 0 1 15h8l1-15M9 6V3h6v3"/>',
  edit: '<path d="m4 16 12-12 4 4L8 20l-5 1zM13 7l4 4"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12c5 3 13 3 18 0"/>',
};
export const icon = (key, size = 20) =>
  '<svg aria-hidden="true" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  (paths[key] || "") +
  "</svg>";
export const logo =
  '<img class="brandlogo" src="./assets/scodeconnect-logo-only.png" alt="ScodeConnect">';
export const desktopLogo =
  '<img class="desktopbrandlogo" src="./assets/scodeconnect-orbital-tech-logo.png" alt="ScodeConnect">';
