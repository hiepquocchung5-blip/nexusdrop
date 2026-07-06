const now = new Date();

const games = [
  {
    id: 1,
    name: "Mobile Legends",
    slug: "mobile-legends",
    region_hint: "Server ID required",
    packages: [
      { id: 101, title: "86 Diamonds", sku: "MLBB-86", amount_label: "86 + 8 bonus", sell_price: "2.49", reseller_price: "2.25", margin: "0.2570" },
      { id: 102, title: "172 Diamonds", sku: "MLBB-172", amount_label: "172 + 16 bonus", sell_price: "4.79", reseller_price: "4.35", margin: "0.2443" },
      { id: 103, title: "257 Diamonds", sku: "MLBB-257", amount_label: "257 + 23 bonus", sell_price: "6.99", reseller_price: "6.30", margin: "0.2518" },
    ],
  },
  {
    id: 2,
    name: "PUBG Mobile",
    slug: "pubg-mobile",
    region_hint: "Character ID only",
    packages: [
      { id: 201, title: "60 UC", sku: "PUBG-60", amount_label: "60 UC", sell_price: "1.19", reseller_price: "1.05", margin: "0.3445" },
      { id: 202, title: "325 UC", sku: "PUBG-325", amount_label: "300 + 25 UC", sell_price: "5.49", reseller_price: "4.95", margin: "0.2987" },
      { id: 203, title: "660 UC", sku: "PUBG-660", amount_label: "600 + 60 UC", sell_price: "10.49", reseller_price: "9.60", margin: "0.2841" },
    ],
  },
  {
    id: 3,
    name: "Free Fire",
    slug: "free-fire",
    region_hint: "Player UID only",
    packages: [
      { id: 301, title: "100 Diamonds", sku: "FF-100", amount_label: "100 diamonds", sell_price: "1.39", reseller_price: "1.20", margin: "0.3381" },
      { id: 302, title: "310 Diamonds", sku: "FF-310", amount_label: "310 diamonds", sell_price: "3.99", reseller_price: "3.60", margin: "0.3208" },
      { id: 303, title: "520 Diamonds", sku: "FF-520", amount_label: "520 diamonds", sell_price: "6.49", reseller_price: "5.95", margin: "0.3074" },
    ],
  },
];

const orders = [
  {
    id: "0f50fc88-b3e1-438a-bd48-1f4f1f385a01",
    game: "Mobile Legends",
    package: games[0].packages[1],
    player_id: "84930211",
    zone_id: "2214",
    status: "processing",
    quoted_price: "4.79",
    supplier_reference: "",
    failure_reason: "",
    created_at: minutesAgo(7),
    updated_at: minutesAgo(1),
  },
  {
    id: "9aa191d1-b9f8-4d60-ae2f-378641490b8e",
    game: "PUBG Mobile",
    package: games[1].packages[0],
    player_id: "PUBG889100",
    zone_id: "",
    status: "completed",
    quoted_price: "1.19",
    supplier_reference: "mock-supplier-UC-66119",
    failure_reason: "",
    created_at: minutesAgo(84),
    updated_at: minutesAgo(82),
  },
];

const proofs = [
  {
    id: 1,
    order: orders[0].id,
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%230a0a14'/%3E%3Crect x='80' y='72' width='640' height='306' rx='28' fill='%2315152a' stroke='%237c5cff'/%3E%3Ctext x='400' y='185' fill='%23f4f5ff' font-family='Arial' font-size='44' text-anchor='middle'%3EPayment Receipt%3C/text%3E%3Ctext x='400' y='250' fill='%2322d3ee' font-family='Arial' font-size='30' text-anchor='middle'%3EOrder verified in mock mode%3C/text%3E%3C/svg%3E",
    submitted_note: "KPay TXN-8841",
    is_approved: null,
    created_at: minutesAgo(5),
  },
];

const ledger = [
  { kind: "credit", amount: "125.00", reference: "topup-KPAY-7701", note: "Manual reseller balance top-up", created_at: minutesAgo(180) },
  { kind: "debit", amount: "4.79", reference: "order-0f50fc88", note: "Mobile Legends 172 Diamonds", created_at: minutesAgo(7) },
  { kind: "debit", amount: "1.19", reference: "order-9aa191d1", note: "PUBG Mobile 60 UC", created_at: minutesAgo(84) },
];

export const mockMode = (import.meta.env.VITE_API_MODE || "auto").toLowerCase();

export function shouldUseMock(error) {
  if (mockMode === "mock") return true;
  if (mockMode !== "auto") return false;
  return !error?.response;
}

export async function mockRequest(config) {
  await delay(180);

  const method = (config.method || "get").toLowerCase();
  const url = normalizeUrl(config.url);
  const body = parseBody(config.data);

  if (method === "post" && url === "/auth/token/") {
    if (!body.username || !body.password) return reject(config, 400, { detail: "Username and password are required." });
    return ok(config, {
      access: fakeJwt({ user_id: body.username === "admin" ? 1 : 2, username: body.username, is_staff: body.username === "admin" }),
      refresh: fakeJwt({ token_type: "refresh", user_id: body.username === "admin" ? 1 : 2 }),
    });
  }

  if (method === "post" && url === "/auth/token/refresh/") {
    return ok(config, { access: fakeJwt({ user_id: 2, username: "demo" }) });
  }

  if (method === "get" && url === "/games/") return ok(config, games);
  if (method === "get" && url.startsWith("/games/") && url.includes("/lookup/")) {
    const slug = url.split("/").filter(Boolean)[1];
    const game = games.find((item) => item.slug === slug);
    if (!game) return reject(config, 404, { detail: "Game not found." });
    const urlObj = new URL(config.url, "http://localhost");
    const player_id = urlObj.searchParams.get("player_id") || "";
    const zone_id = urlObj.searchParams.get("zone_id") || "";
    if (!player_id) return reject(config, 400, { detail: "player_id is required." });
    let hash = 0;
    const str = `${slug}-${player_id}-${zone_id}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    hash = Math.abs(hash);
    const nicknames = {
      "mobile-legends": ["AlucardPro", "LaylaGod", "FannyGod", "TigrealKing", "GusionMain", "MiyaQueen"],
      "pubg-mobile": ["SniperGhost", "ShroudClon", "PochinkiKing", "AWM_Slayer", "WinnerDinner"],
      "free-fire": ["AlokBooyah", "ChronoGod", "HeadshotOP", "FF_Master", "RushKing"]
    };
    const gameNicks = nicknames[slug] || ["GamerPro", "NexusWarrior", "AlphaZero"];
    const nickname = gameNicks[hash % gameNicks.length] + `_${player_id.slice(0, 4)}`;
    return ok(config, { player_name: nickname });
  }
  if (method === "get" && url.startsWith("/games/")) {
    const slug = url.split("/").filter(Boolean)[1];
    const game = games.find((item) => item.slug === slug);
    return game ? ok(config, game) : reject(config, 404, { detail: "Not found." });
  }


  if (method === "get" && url === "/orders/") return ok(config, orders);
  if (method === "get" && url.startsWith("/orders/")) {
    const id = url.split("/").filter(Boolean)[1];
    const order = orders.find((item) => item.id === id);
    return order ? ok(config, order) : reject(config, 404, { detail: "Not found." });
  }

  if (method === "post" && url === "/orders/") {
    const pkg = games.flatMap((game) => game.packages.map((pack) => ({ ...pack, game: game.name }))).find((pack) => pack.id === Number(body.package));
    if (!pkg) return reject(config, 400, { package: ["Invalid package."] });
    const order = {
      id: crypto.randomUUID(),
      game: pkg.game,
      package: stripGame(pkg),
      player_id: body.player_id,
      zone_id: body.zone_id || "",
      status: "pending_payment",
      quoted_price: pkg.sell_price,
      supplier_reference: "",
      failure_reason: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    orders.unshift(order);
    return ok(config, order, 201);
  }

  if (method === "get" && url === "/payment-proofs/") return ok(config, proofs);
  if (method === "post" && url === "/payment-proofs/") {
    const form = config.data;
    const orderId = readForm(form, "order");
    const order = orders.find((item) => item.id === orderId);
    if (!order) return reject(config, 400, { order: ["Invalid order."] });
    order.status = "verifying";
    order.updated_at = new Date().toISOString();
    const imageFile = readForm(form, "image");
    const proof = {
      id: proofs.length + 1,
      order: order.id,
      image: imageFile instanceof File ? URL.createObjectURL(imageFile) : "",
      submitted_note: readForm(form, "submitted_note") || "",
      is_approved: null,
      created_at: new Date().toISOString(),
    };
    proofs.unshift(proof);
    return ok(config, proof, 201);
  }

  const reviewMatch = url.match(/^\/payment-proofs\/(\d+)\/(approve|reject)\/$/);
  if (method === "post" && reviewMatch) {
    const proof = proofs.find((item) => item.id === Number(reviewMatch[1]));
    if (!proof) return reject(config, 404, { detail: "Not found." });
    const order = orders.find((item) => item.id === proof.order);
    proof.is_approved = reviewMatch[2] === "approve";
    if (order) {
      order.status = proof.is_approved ? "completed" : "failed";
      order.failure_reason = proof.is_approved ? "" : body.reason || "Payment proof rejected.";
      order.supplier_reference = proof.is_approved ? `mock-supplier-${order.id.slice(0, 8)}` : "";
      order.updated_at = new Date().toISOString();
    }
    return ok(config, { status: order?.status || "ok" });
  }

  if (method === "get" && url === "/wallet/me/") {
    return ok(config, { balance: "119.02", updated_at: minutesAgo(6) });
  }

  if (method === "get" && url === "/wallet/ledger/") return ok(config, ledger);

  return reject(config, 404, { detail: "Mock endpoint not implemented." });
}

function ok(config, data, status = 200) {
  return { data, status, statusText: "OK", headers: {}, config };
}

function reject(config, status, data) {
  const error = new Error(data.detail || "Request failed.");
  error.config = config;
  error.response = { data, status, statusText: "Error", headers: {}, config };
  return Promise.reject(error);
}

function normalizeUrl(url = "") {
  try {
    return new URL(url, "http://mock.local").pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function parseBody(data) {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function readForm(form, key) {
  return typeof form?.get === "function" ? form.get(key) : undefined;
}

function stripGame(pkg) {
  const { game, ...rest } = pkg;
  return rest;
}

function minutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fakeJwt(payload) {
  const header = { alg: "none", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return `${base64url(header)}.${base64url({ ...payload, exp })}.mock`;
}

function base64url(value) {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
