import { IONS, CARD, clamp, setColorTheme } from "./ions.js";
import { cardHeight, compoundStatus, connectedGroup, findSnapCandidate } from "./chemistry.js";
import { KonvaView } from "./konva-view.js";

const savedTheme = window.localStorage.getItem("ion-cards-theme");
const state = {
  cards: [],
  bonds: [],
  nextId: 1,
  pointer: null,
  snapCandidate: null,
  toast: null,
  toastUntil: 0,
  layout: null,
  theme: savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
};

setColorTheme(state.theme);

function syncThemeMetadata() {
  const background = state.theme === "dark" ? "#151d1b" : "#f5f4ef";
  document.documentElement.style.colorScheme = state.theme;
  document.documentElement.style.backgroundColor = background;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
}

syncThemeMetadata();

let view;

function viewModel() {
  return {
    cards: state.cards,
    bonds: state.bonds,
    compound: compoundStatus(state.cards, state.bonds),
    snapCandidate: state.snapCandidate,
    toast: state.toast,
    toastUntil: state.toastUntil,
    theme: state.theme
  };
}

function render() {
  view.render(viewModel());
}

function showToast(message) {
  state.toast = message;
  state.toastUntil = Date.now() + 1900;
  render();
  window.setTimeout(() => {
    if (Date.now() >= state.toastUntil) {
      state.toast = null;
      render();
    }
  }, 1900);
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  window.localStorage.setItem("ion-cards-theme", state.theme);
  setColorTheme(state.theme);
  syncThemeMetadata();
  render();
}

function resetBoard() {
  state.cards = [];
  state.bonds = [];
  state.snapCandidate = null;
  state.pointer = null;
  render();
  showToast("Workspace cleared.");
}

function addCard(ion) {
  const { mobile, sidebarWidth, headerHeight, paletteHeight, width, height } = state.layout;
  const margin = mobile ? 8 : 18;
  const ionHeight = cardHeight(ion);
  const boardLeft = sidebarWidth + CARD.width / 2 + margin;
  const boardRight = width - CARD.width / 2 - margin;
  const boardTop = headerHeight + ionHeight / 2 + 22;
  const boardBottom = height - paletteHeight - ionHeight / 2 - 22;
  if (boardRight < boardLeft || boardBottom < boardTop) {
    showToast("Make the window larger to add more ions.");
    return;
  }

  const count = state.cards.length;
  const boardWidth = width - sidebarWidth;
  const columns = mobile
    ? Math.max(1, Math.floor((boardWidth - CARD.width - 16) / (CARD.width + 2)) + 1)
    : Math.max(1, Math.floor((boardWidth - CARD.width - 36) / (CARD.width + 34)) + 1);
  const spacing = mobile ? CARD.width + 2 : CARD.width + 34;
  state.cards.push({
    id: state.nextId++,
    ion,
    x: clamp(
      sidebarWidth + CARD.width / 2 + (mobile ? 8 : 24) + (count % columns) * spacing,
      boardLeft,
      boardRight
    ),
    y: clamp(
      headerHeight + 250 + Math.floor(count / columns) * (CARD.unitHeight * 2 + 32),
      boardTop,
      boardBottom
    )
  });
  render();
}

function startCardDrag(id) {
  const group = connectedGroup(state.cards, state.bonds, id);
  const groupIds = new Set(group);
  state.cards = state.cards.filter(card => !groupIds.has(card.id))
    .concat(state.cards.filter(card => groupIds.has(card.id)));
  state.pointer = { cardId: id, group };
  view.raiseCards(group);
}

function moveCardDrag(id, x, y) {
  const pointer = state.pointer;
  if (!pointer) return;
  const card = state.cards.find(item => item.id === id);
  if (!card) return;

  const dx = x - card.x;
  const dy = y - card.y;
  card.x = x;
  card.y = y;
  pointer.group.forEach(memberId => {
    if (memberId === id) return;
    const member = state.cards.find(item => item.id === memberId);
    if (!member) return;
    member.x += dx;
    member.y += dy;
  });

  view.syncCards(state.cards);
  state.snapCandidate = findSnapCandidate(state.cards, state.bonds, pointer.group);
  view.drawPreview(state.snapCandidate);
}

function finishCardDrag() {
  const candidate = state.snapCandidate;
  state.pointer = null;
  state.snapCandidate = null;
  if (candidate) {
    candidate.groupIds.forEach(id => {
      const card = state.cards.find(item => item.id === id);
      if (!card) return;
      card.x += candidate.dx;
      card.y += candidate.dy;
    });
    state.bonds.push({
      a: candidate.aId,
      aPort: candidate.aPort,
      b: candidate.bId,
      bPort: candidate.bPort
    });
    showToast("Connected! Opposite charges attract.");
  } else {
    render();
  }
}

view = new KonvaView(Konva, {
  onAddIon(index) {
    addCard(IONS[index]);
  },
  onReset: resetBoard,
  onToggleTheme: toggleTheme,
  onDragStart: startCardDrag,
  onDragMove: moveCardDrag,
  onDragEnd: finishCardDrag,
  onDragCancel() {
    state.pointer = null;
    state.snapCandidate = null;
    render();
  },
  onResize(layout) {
    state.layout = layout;
    render();
  }
});
state.layout = view.layout;
render();
