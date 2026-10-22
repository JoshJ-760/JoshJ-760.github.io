import { CARD, IONS } from "./ions.js";

export function cardHeight(ion) {
  return Math.abs(ion.charge) * CARD.unitHeight;
}

export function portOffset(ion, index) {
  return (index - (Math.abs(ion.charge) - 1) / 2) * CARD.unitHeight;
}

export function connectedGroup(cards, bonds, id) {
  const found = new Set([id]);
  const todo = [id];
  while (todo.length) {
    const current = todo.pop();
    bonds.forEach(bond => {
      const neighbor = bond.a === current ? bond.b : bond.b === current ? bond.a : null;
      if (neighbor !== null && !found.has(neighbor)) {
        found.add(neighbor);
        todo.push(neighbor);
      }
    });
  }
  return [...found];
}

export function portConnected(bonds, cardId, port) {
  return bonds.some(bond =>
    (bond.a === cardId && bond.aPort === port) ||
    (bond.b === cardId && bond.bPort === port)
  );
}

export function findSnapCandidate(cards, bonds, group) {
  const members = new Set(group);
  let best = null;

  for (const movingId of group) {
    const moving = cards.find(card => card.id === movingId);
    if (!moving) continue;
    for (const fixed of cards) {
      if (members.has(fixed.id) || moving.ion.charge * fixed.ion.charge >= 0) continue;
      for (let movingPort = 0; movingPort < Math.abs(moving.ion.charge); movingPort++) {
        if (portConnected(bonds, moving.id, movingPort)) continue;
        for (let fixedPort = 0; fixedPort < Math.abs(fixed.ion.charge); fixedPort++) {
          if (portConnected(bonds, fixed.id, fixedPort)) continue;
          const targetX = fixed.x + (fixed.ion.charge > 0 ? 1 : -1) * (CARD.width + 2);
          const targetY = fixed.y + portOffset(fixed.ion, fixedPort) - portOffset(moving.ion, movingPort);
          const distance = Math.hypot(moving.x - targetX, moving.y - targetY);
          if (distance > 56 || (best && distance >= best.distance)) continue;

          const movingPositive = moving.ion.charge > 0;
          best = {
            aId: movingPositive ? moving.id : fixed.id,
            bId: movingPositive ? fixed.id : moving.id,
            aPort: movingPositive ? movingPort : fixedPort,
            bPort: movingPositive ? fixedPort : movingPort,
            distance, targetX, targetY, movingId: moving.id
          };
        }
      }
    }
  }

  if (!best) return null;
  const moving = cards.find(card => card.id === best.movingId);
  return {
    ...best,
    groupIds: connectedGroup(cards, bonds, moving.id),
    dx: best.targetX - moving.x,
    dy: best.targetY - moving.y
  };
}

export function chemicalFormula(cards) {
  const counts = new Map();
  cards.forEach(card => {
    counts.set(card.ion.symbol, (counts.get(card.ion.symbol) ?? 0) + 1);
  });
  const divisor = [...counts.values()].reduce(greatestCommonDivisor);
  const symbols = [...counts.keys()].sort((a, b) => {
    const ionA = IONS.find(ion => ion.symbol === a);
    const ionB = IONS.find(ion => ion.symbol === b);
    if (ionA.charge > 0 && ionB.charge < 0) return -1;
    if (ionA.charge < 0 && ionB.charge > 0) return 1;
    return IONS.indexOf(ionA) - IONS.indexOf(ionB);
  });
  const subscripts = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
  return symbols.map(symbol => {
    const count = counts.get(symbol) / divisor;
    const subscript = count === 1
      ? ""
      : String(count).split("").map(digit => subscripts[Number(digit)] ?? digit).join("");
    return `${symbol}${subscript}`;
  }).join("");
}

export function compoundStatus(cards, bonds) {
  const totalCharge = cards.reduce((sum, card) => sum + card.ion.charge, 0);
  const oneCompound = cards.length > 1 &&
    connectedGroup(cards, bonds, cards[0].id).length === cards.length;
  const neutral = oneCompound && totalCharge === 0;
  return { neutral, formula: neutral ? chemicalFormula(cards) : "" };
}

function greatestCommonDivisor(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
