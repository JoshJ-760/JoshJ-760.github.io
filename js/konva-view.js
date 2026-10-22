import { CARD, COLORS, IONS, chargeLabel } from "./ions.js";
import { cardHeight, portOffset } from "./chemistry.js";

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

export class KonvaView {
  constructor(Konva, handlers) {
    this.Konva = Konva;
    this.handlers = handlers;
    this.hoverIndex = -1;
    this.paletteItems = [];
    this.cardNodes = new Map();
    this.resetBounds = null;
    this.themeBounds = null;
    this.model = { cards: [], bonds: [], compound: { neutral: false }, toast: null };
    this.layout = this.measureLayout();

    this.stage = new Konva.Stage({
      container: "lab",
      width: this.layout.width,
      height: this.layout.height
    });
    this.backgroundLayer = new Konva.Layer({ listening: true });
    this.previewLayer = new Konva.Layer({ listening: false });
    this.cardLayer = new Konva.Layer({ listening: true });
    this.stage.add(this.backgroundLayer, this.previewLayer, this.cardLayer);

    this.stage.on("pointerdown", event => this.handlePointerDown(event));
    this.stage.on("pointermove", () => this.handlePointerMove());
    this.stage.on("pointercancel", () => this.handlers.onDragCancel());
    window.addEventListener("resize", () => this.resize());
    this.render(this.model);
  }

  measureLayout() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width < 680;
    return {
      width,
      height,
      mobile,
      sidebarWidth: mobile ? 0 : 252,
      paletteHeight: mobile ? 138 : 0,
      headerHeight: mobile ? 70 : 84
    };
  }

  resize() {
    this.layout = this.measureLayout();
    this.stage.size({ width: this.layout.width, height: this.layout.height });
    this.render(this.model);
    this.handlers.onResize(this.layout);
  }

  addRect(layer, x, y, width, height, radius, fill, stroke, strokeWidth = 1, listening = false) {
    const shape = new this.Konva.Rect({
      x, y, width, height, cornerRadius: radius, fill, stroke, strokeWidth, listening
    });
    layer.add(shape);
    return shape;
  }

  addText(layer, value, x, y, size, color, weight = "400", align = "left", width = 0) {
    const text = new this.Konva.Text({
      x, y, text: value, fontFamily: FONT,
      fontSize: size, fontStyle: weight, fill: color, align, verticalAlign: "middle",
      width: width || undefined, listening: false
    });
    layer.add(text);
    return text;
  }

  addLine(layer, points, stroke, strokeWidth = 1, dash = []) {
    const line = new this.Konva.Line({ points, stroke, strokeWidth, dash, listening: false });
    layer.add(line);
    return line;
  }

  render(model) {
    this.model = model;
    this.drawChrome();
    this.drawCards();
    this.drawPreview(model.snapCandidate);
  }

  drawChrome() {
    const { width, height, mobile, sidebarWidth, paletteHeight, headerHeight } = this.layout;
    this.backgroundLayer.destroyChildren();
    this.drawHeader();
    this.drawSidebar();

    const x = sidebarWidth;
    const y = headerHeight;
    const boardWidth = width - x;
    const boardHeight = height - y - paletteHeight;
    this.addRect(this.backgroundLayer, x, y, boardWidth, boardHeight, 0, COLORS.canvas);

    const dots = [];
    for (let dx = x + 20; dx < width; dx += 24) {
      for (let dy = y + 20; dy < height - paletteHeight; dy += 24) dots.push(dx, dy);
    }
    if (dots.length) {
      this.backgroundLayer.add(new this.Konva.Shape({
        listening: false,
        sceneFunc(context) {
          context.fillStyle = COLORS.dots;
          for (let i = 0; i < dots.length; i += 2) {
            context.beginPath();
            context.arc(dots[i], dots[i + 1], 1, 0, Math.PI * 2);
            context.fill();
          }
        }
      }));
    }

    if (this.model.cards.length === 0) {
      const centerX = x + boardWidth * 0.52;
      const centerY = y + boardHeight * 0.52;
      this.addRect(this.backgroundLayer, centerX - 35, centerY - 72, 70, 70, 20, COLORS.empty);
      this.addText(this.backgroundLayer, "＋", centerX - 35, centerY - 58, 34, COLORS.green, "400", "center", 70);
      this.addText(this.backgroundLayer, "Your workspace is ready", centerX - 180, centerY + 11, 16, COLORS.ink, "650", "center", 360);
      this.addText(this.backgroundLayer, mobile ? "Tap an ion to add it" : "Click an ion in the sidebar to start", centerX - 160, centerY + 36, 12, COLORS.muted, "400", "center", 320);
    }

    if (boardWidth > 340) {
      const countWidth = 148;
      this.addRect(this.backgroundLayer, x + 22, y + 20, countWidth, 38, 11, COLORS.paper, COLORS.line);
      this.addText(this.backgroundLayer, "BOARD", x + 35, y + 28, 9, COLORS.faint, "750");
      this.addText(this.backgroundLayer, `${this.model.cards.length} ${this.model.cards.length === 1 ? "ion" : "ions"}`, x + 82, y + 28, 11, COLORS.ink, "600");
      if (this.model.compound.neutral) {
        const formula = this.model.compound.formula;
        const formulaWidth = Math.min(boardWidth - countWidth - 48, Math.max(132, 88 + formula.length * 12));
        const formulaX = x + boardWidth - formulaWidth - 16;
        this.addRect(this.backgroundLayer, formulaX, y + 20, formulaWidth, 38, 11, COLORS.paleGreen);
        this.addText(this.backgroundLayer, "NEUTRAL", formulaX + 9, y + 11, 9, COLORS.darkGreen, "750");
        this.addText(this.backgroundLayer, formula, formulaX + 9, y + 19, 18, COLORS.darkGreen, "700");
      }
    }

    if (this.model.toast && Date.now() < this.model.toastUntil) {
      const toastWidth = Math.min(310, boardWidth - 32);
      const toastY = height - paletteHeight - 66;
      this.addRect(this.backgroundLayer, x + (boardWidth - toastWidth) / 2, toastY, toastWidth, 42, 12, COLORS.ink);
      this.addText(this.backgroundLayer, this.model.toast, x + (boardWidth - toastWidth) / 2, toastY + 12, 12, COLORS.paper, "550", "center", toastWidth);
    }
    this.backgroundLayer.batchDraw();
  }

  drawHeader() {
    const { width, mobile, headerHeight } = this.layout;
    this.addRect(this.backgroundLayer, 0, 0, width, headerHeight, 0, COLORS.paper);
    this.addLine(this.backgroundLayer, [0, headerHeight - 0.5, width, headerHeight - 0.5], COLORS.line);

    this.addRect(this.backgroundLayer, 22, (headerHeight - 38) / 2, 38, 38, 12, COLORS.darkGreen);
    this.addText(this.backgroundLayer, "I", 22, headerHeight / 2 - 10, 20, COLORS.paper, "700", "center", 38);
    this.addText(this.backgroundLayer, "ION", 72, headerHeight / 2 - 17, 15, COLORS.ink, "750");
    this.addText(this.backgroundLayer, "CARDS", 72, headerHeight / 2 + 1, 10, COLORS.green, "750");

    const titleX = mobile ? 142 : 176;
    if (!mobile || width >= 460) {
      this.addLine(this.backgroundLayer, [titleX - 18, 23, titleX - 18, headerHeight - 23], COLORS.line);
      this.addText(this.backgroundLayer, "IONIC BONDING LAB", titleX, headerHeight / 2 - 15, 11, COLORS.muted, "700");
      if (!mobile) this.addText(this.backgroundLayer, "Build a neutral compound", titleX, headerHeight / 2 + 3, 12, COLORS.faint);
    }

    const buttonWidth = width < 480 ? 80 : 102;
    const buttonX = width - buttonWidth - 20;
    const buttonY = (headerHeight - 36) / 2;
    this.addRect(this.backgroundLayer, buttonX, buttonY, buttonWidth, 36, 10, COLORS.control, null, 0, true);
    this.addText(this.backgroundLayer, "↺", buttonX + 8, buttonY + 8, 17, COLORS.muted, "600", "center", 20);
    this.addText(this.backgroundLayer, "Reset", buttonX + 35, buttonY + 9, 12, COLORS.ink, "600", "center", 44);
    this.resetBounds = { x: buttonX, y: buttonY, width: buttonWidth, height: 36 };

    const themeWidth = 64;
    const themeX = buttonX - themeWidth - 8;
    const themeLabel = this.model.theme === "dark" ? "Light" : "Dark";
    const themeIcon = this.model.theme === "dark" ? "☀" : "☾";
    this.addRect(this.backgroundLayer, themeX, buttonY, themeWidth, 36, 10, COLORS.control, null, 0, true);
    this.addText(this.backgroundLayer, themeIcon, themeX + 5, buttonY + 8, 16, COLORS.muted, "600", "center", 20);
    this.addText(this.backgroundLayer, themeLabel, themeX + 27, buttonY + 10, 10, COLORS.ink, "600", "center", 32);
    this.themeBounds = { x: themeX, y: buttonY, width: themeWidth, height: 36 };
  }

  drawSidebar() {
    const { width, height, mobile, sidebarWidth, paletteHeight, headerHeight } = this.layout;
    this.paletteItems = [];
    if (mobile) {
      const y = height - paletteHeight;
      this.addRect(this.backgroundLayer, 0, y, width, paletteHeight, 0, COLORS.sidebar);
      this.addLine(this.backgroundLayer, [0, y + 0.5, width, y + 0.5], COLORS.line);
      this.addText(this.backgroundLayer, "TAP AN ION TO ADD IT", 16, y + 9, 9, COLORS.muted, "750");
      const gap = 6;
      const itemWidth = (width - 32 - gap * 4) / 5;
      IONS.forEach((ion, index) => {
        const col = index % 5;
        const row = Math.floor(index / 5);
        this.drawPaletteItem(ion, index, 16 + col * (itemWidth + gap), y + 27 + row * 54, itemWidth, 49, true);
      });
      return;
    }

    this.addRect(this.backgroundLayer, 0, headerHeight, sidebarWidth, height - headerHeight, 0, COLORS.sidebar);
    this.addLine(this.backgroundLayer, [sidebarWidth - 0.5, headerHeight, sidebarWidth - 0.5, height], COLORS.line);
    this.addText(this.backgroundLayer, "ELEMENT IONS", 22, headerHeight + 22, 10, COLORS.muted, "750");
    this.addText(this.backgroundLayer, "Click an ion to add it", 22, headerHeight + 43, 11, COLORS.faint);

    const gap = 8;
    const itemWidth = (sidebarWidth - 32 - gap) / 2;
    const itemHeight = 66;
    const startY = headerHeight + 75;
    IONS.forEach((ion, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.drawPaletteItem(ion, index, 16 + col * (itemWidth + gap), startY + row * (itemHeight + gap), itemWidth, itemHeight, false);
    });

    const rows = Math.ceil(IONS.length / 2);
    const noteY = startY + rows * (itemHeight + gap) + 9;
    if (noteY + 78 < height) {
      this.addRect(this.backgroundLayer, 16, noteY, sidebarWidth - 32, 66, 12, COLORS.subtle);
      this.addText(this.backgroundLayer, "QUICK TIP", 28, noteY + 9, 9, COLORS.darkGreen, "750");
      this.addText(this.backgroundLayer, "Match opposite charges to", 28, noteY + 28, 10, COLORS.muted);
      this.addText(this.backgroundLayer, "make a neutral compound.", 28, noteY + 43, 10, COLORS.muted);
    }

    const dividerY = height - 104;
    if (dividerY > noteY + 78) {
      this.addLine(this.backgroundLayer, [16, dividerY, sidebarWidth - 16, dividerY], COLORS.line);
      this.addText(this.backgroundLayer, "PORT KEY", 22, dividerY + 11, 9, COLORS.muted, "750");
      this.backgroundLayer.add(new this.Konva.Circle({ x: 30, y: dividerY + 51, radius: 7, fill: COLORS.green, listening: false }));
      this.addText(this.backgroundLayer, "+", 23, dividerY + 43, 11, COLORS.paper, "700", "center", 14);
      this.backgroundLayer.add(new this.Konva.Circle({ x: 30, y: dividerY + 76, radius: 7, fill: COLORS.paper, stroke: "#8c9993", strokeWidth: 1.5, listening: false }));
      this.addText(this.backgroundLayer, "−", 23, dividerY + 68, 11, COLORS.muted, "700", "center", 14);
      this.addText(this.backgroundLayer, "socket · negative", 44, dividerY + 69, 10, COLORS.muted);
      this.addText(this.backgroundLayer, "tooth · positive", 44, dividerY + 44, 10, COLORS.muted);
    }
  }

  drawPaletteItem(ion, index, x, y, width, height, compact) {
    const group = new this.Konva.Group({ x, y, listening: true, name: "palette-item", index });
    const hovered = this.hoverIndex === index;
    group.add(new this.Konva.Rect({
      width, height, cornerRadius: compact ? 10 : 12,
      fill: hovered ? (COLORS.paletteHover ?? ion.tint) : COLORS.paper,
      stroke: hovered ? ion.color : COLORS.line,
      strokeWidth: hovered ? 1.5 : 1,
      listening: true
    }));
    group.add(new this.Konva.Text({
      x: compact ? 9 : 12, y: compact ? 7 : 9, text: ion.symbol,
      fontFamily: FONT, fontSize: compact ? 14 : 17, fontStyle: "700",
      fill: ion.color, listening: false
    }));
    group.add(new this.Konva.Text({
      x: 0, y: compact ? 7 : 9, width: width - (compact ? 7 : 11),
      text: chargeLabel(ion.charge), align: "right",
      fontFamily: FONT, fontSize: compact ? 10 : 12, fontStyle: "700",
      fill: ion.color, listening: false
    }));
    group.add(new this.Konva.Text({
      x: compact ? 9 : 12, y: compact ? 28 : 37, text: ion.name,
      fontFamily: FONT, fontSize: compact ? 8 : 10, fill: COLORS.muted, listening: false
    }));
    this.backgroundLayer.add(group);
    this.paletteItems.push({ x, y, width, height, index });
  }

  traceCardPath(context, ion) {
    const height = cardHeight(ion);
    const left = -CARD.width / 2;
    const right = CARD.width / 2;
    const top = -height / 2;
    const bottom = height / 2;
    const radius = 13;
    const offsets = Array.from({ length: Math.abs(ion.charge) }, (_, index) => portOffset(ion, index));
    context.beginPath();
    context.moveTo(left + radius, top);
    context.lineTo(right - radius, top);
    context.quadraticCurveTo(right, top, right, top + radius);
    if (ion.charge > 0) {
      offsets.forEach(offset => {
        context.lineTo(right, offset - 7);
        context.lineTo(right + 13, offset - 7);
        context.quadraticCurveTo(right + 17, offset - 7, right + 17, offset - 3);
        context.lineTo(right + 17, offset + 3);
        context.quadraticCurveTo(right + 17, offset + 7, right + 13, offset + 7);
        context.lineTo(right, offset + 7);
      });
    }
    context.lineTo(right, bottom - radius);
    context.quadraticCurveTo(right, bottom, right - radius, bottom);
    context.lineTo(left + radius, bottom);
    context.quadraticCurveTo(left, bottom, left, bottom - radius);
    if (ion.charge < 0) {
      [...offsets].reverse().forEach(offset => {
        context.lineTo(left, offset + 7);
        context.lineTo(left + 11, offset + 7);
        context.quadraticCurveTo(left + 15, offset + 7, left + 15, offset + 3);
        context.lineTo(left + 15, offset - 3);
        context.quadraticCurveTo(left + 15, offset - 7, left + 11, offset - 7);
        context.lineTo(left, offset - 7);
      });
    }
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
  }

  portX(card) {
    return card.ion.charge > 0 ? CARD.width / 2 + 17 : -CARD.width / 2 + 15;
  }

  drawCards() {
    this.cardLayer.destroyChildren();
    this.cardNodes.clear();
    this.model.cards.forEach(card => this.createCardNode(card));
    this.cardLayer.batchDraw();
  }

  createCardNode(card) {
    const ion = card.ion;
    const height = cardHeight(ion);
    const group = new this.Konva.Group({
      x: card.x, y: card.y, name: "ion-card", cardId: card.id,
      listening: true, draggable: true
    });
    group.on("dragstart", () => this.handlers.onDragStart(card.id));
    group.on("dragmove", () => this.handlers.onDragMove(card.id, group.x(), group.y()));
    group.on("dragend", () => this.handlers.onDragEnd());
    group.add(new this.Konva.Shape({
      name: "card-body",
      sceneFunc: (context, shape) => {
        this.traceCardPath(context, ion);
        context.fillStrokeShape(shape);
      },
      fill: COLORS.paper, stroke: ion.color, strokeWidth: 1.5,
      listening: true
    }));

    for (let index = 0; index < Math.abs(ion.charge); index++) {
      const connected = this.model.bonds.some(bond =>
        (bond.a === card.id && bond.aPort === index) ||
        (bond.b === card.id && bond.bPort === index)
      );
      group.add(new this.Konva.Circle({
        x: this.portX(card), y: portOffset(ion, index), radius: 3.1,
        fill: ion.charge > 0
          ? (connected ? COLORS.paper : ion.color)
          : (connected ? ion.color : COLORS.paper),
        stroke: ion.charge < 0 ? ion.color : undefined,
        strokeWidth: ion.charge < 0 ? 1.3 : 0,
        listening: true
      }));
    }

    const compact = height === CARD.unitHeight;
    const badgeSize = compact ? 32 : 54;
    const badgeY = compact ? -25 : -45;
    group.add(new this.Konva.Rect({
      x: -badgeSize / 2, y: badgeY, width: badgeSize, height: badgeSize,
      cornerRadius: compact ? 10 : 15, fill: ion.tint, listening: true
    }));
    group.add(new this.Konva.Text({
      x: -42, y: badgeY + (compact ? 7 : 13), width: 84,
      text: ion.symbol, align: "center",
      fontFamily: FONT, fontSize: compact ? 17 : 24, fontStyle: "700",
      fill: ion.color, listening: true
    }));
    group.add(new this.Konva.Text({
      x: 20, y: -height / 2 + 7, width: 30,
      text: chargeLabel(ion.charge), align: "center",
      fontFamily: FONT, fontSize: 13, fontStyle: "700",
      fill: ion.color, listening: true
    }));
    group.add(new this.Konva.Text({
      x: -70, y: 17, width: 140, text: ion.name, align: "center",
      fontFamily: FONT, fontSize: 12, fontStyle: "600",
      fill: COLORS.ink, listening: true
    }));
    this.cardLayer.add(group);
    this.cardNodes.set(card.id, group);
  }

  syncCards(cards) {
    cards.forEach(card => this.cardNodes.get(card.id)?.position({ x: card.x, y: card.y }));
    this.cardLayer.batchDraw();
  }

  raiseCards(ids) {
    ids.forEach(id => this.cardNodes.get(id)?.moveToTop());
    this.cardLayer.batchDraw();
  }

  drawPreview(candidate) {
    this.previewLayer.destroyChildren();
    if (!candidate) {
      this.previewLayer.batchDraw();
      return;
    }
    const moving = this.model.cards.find(card => card.id === candidate.movingId);
    const fixed = this.model.cards.find(card => card.id === (candidate.movingId === candidate.aId ? candidate.bId : candidate.aId));
    if (!moving || !fixed) return;
    const movingPort = candidate.movingId === candidate.aId ? candidate.aPort : candidate.bPort;
    const fixedPort = candidate.movingId === candidate.aId ? candidate.bPort : candidate.aPort;
    if (Math.abs(candidate.targetX - moving.x) < 0.1 && Math.abs(candidate.targetY - moving.y) < 0.1) return;

    this.previewLayer.add(new this.Konva.Shape({
      x: candidate.targetX, y: candidate.targetY,
      sceneFunc: (context, shape) => {
        this.traceCardPath(context, moving.ion);
        context.fillStrokeShape(shape);
      },
      fill: COLORS.paper, opacity: 0.35, stroke: COLORS.green,
      strokeWidth: 1.5, dash: [5, 5], listening: false
    }));
    this.previewLayer.add(new this.Konva.Line({
      points: [
        moving.x + this.portX(moving), moving.y + portOffset(moving.ion, movingPort),
        fixed.x + this.portX(fixed), fixed.y + portOffset(fixed.ion, fixedPort)
      ],
      stroke: COLORS.green, strokeWidth: 1.5, dash: [5, 5], opacity: 0.6, listening: false
    }));
    this.previewLayer.batchDraw();
  }

  getCardFromTarget(target) {
    let node = target;
    while (node && node !== this.stage) {
      const id = node.getAttr("cardId");
      if (id !== undefined) return this.model.cards.find(card => card.id === id) ?? null;
      node = node.getParent();
    }
    return null;
  }

  handlePointerDown(event) {
    const point = this.stage.getPointerPosition();
    if (!point) return;
    if (this.pointIn(point, this.resetBounds)) {
      this.handlers.onReset();
      return;
    }
    if (this.pointIn(point, this.themeBounds)) {
      this.handlers.onToggleTheme();
      return;
    }
    const item = this.paletteItems.find(candidate => this.pointIn(point, candidate));
    if (item) {
      this.handlers.onAddIon(item.index);
      return;
    }
    if (this.getCardFromTarget(event.target) || this.getCardFromTarget(this.cardLayer.getIntersection(point))) return;
  }

  handlePointerMove() {
    const point = this.stage.getPointerPosition();
    if (!point) return;
    const paletteIndex = this.paletteItems.find(item => this.pointIn(point, item))?.index ?? -1;
    if (paletteIndex !== this.hoverIndex) {
      this.hoverIndex = paletteIndex;
      this.drawChrome();
    }
    const card = this.getCardFromTarget(this.cardLayer.getIntersection(point));
    this.stage.container().style.cursor = paletteIndex >= 0 ? "pointer" : card ? "grab" :
      this.pointIn(point, this.resetBounds) || this.pointIn(point, this.themeBounds) ? "pointer" : "default";
  }

  pointIn(point, bounds) {
    return bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y && point.y <= bounds.y + bounds.height;
  }
}
