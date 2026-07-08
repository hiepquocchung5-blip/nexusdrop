import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { extractError } from "./lib/api";
import { useAuth } from "./lib/auth";
import {
  useCreateOrder,
  useGame,
  useGames,
  useLookupPlayer,
  useOrders,
  usePointRewards,
  useProfile,
  useRedeemPoints,
  useSubmitProof,
} from "./lib/queries";
import { identitySchema, loginSchema } from "./lib/validation";

const IMG = "/img/";

const HOME_GAMES = [
  ["mobile-legends", "Mobile Legend", "6.png"],
  ["pubg-mobile", "Pubg Mobile", "Pubg_Logo.jpg"],
  ["roblox", "Roblox", "Roblox_Logo.png"],
  ["free-fire", "Free Fire", "FreeFire_Logo.jpg"],
  ["magic-chess-gogo", "Magic Chess Go Go", "Roblox_Logo.png"],
  ["honor-of-kings", "Honor Of Kings", "Hok_Logo.jpg"],
];

const GAME_META = {
  "mobile-legends": {
    code: "mlbb",
    title: "Mobile Legends",
    heading: "Mobile Legends\nDiamonds",
    eyebrow: "MLBB TOP UP STORE",
    poster: "Diamond Car.png",
    unitLabel: "Diamonds",
    idLabel: "MLBB User ID",
    requiresZone: true,
    heroClass: "mlbb",
  },
  "pubg-mobile": {
    code: "pubg",
    title: "PUBG Mobile",
    heading: "PUBG Mobile\nUC",
    eyebrow: "PUBG TOP UP STORE",
    poster: "Pubg_Logo.jpg",
    unitLabel: "UC",
    idLabel: "PUBG Player ID",
    requiresZone: false,
  },
  roblox: {
    code: "roblox",
    title: "Roblox",
    heading: "Roblox\nRobux",
    eyebrow: "ROBLOX TOP UP STORE",
    poster: "Roblox_Logo.png",
    unitLabel: "Robux",
    idLabel: "Roblox Username",
    requiresZone: false,
  },
  "free-fire": {
    code: "freefire",
    title: "Free Fire",
    heading: "Free Fire\nDiamonds",
    eyebrow: "FREE FIRE TOP UP STORE",
    poster: "FreeFire_Logo.jpg",
    unitLabel: "Diamonds",
    idLabel: "Free Fire Player ID",
    requiresZone: false,
  },
  "magic-chess-gogo": {
    code: "magic",
    title: "Magic Chess",
    heading: "Magic Chess\nGo Go",
    eyebrow: "MAGIC CHESS TOP UP STORE",
    poster: "MGCGG.webp",
    unitLabel: "Diamonds",
    idLabel: "Magic Chess User ID",
    requiresZone: true,
  },
  "honor-of-kings": {
    code: "hok",
    title: "Honor of Kings",
    heading: "Honor of Kings\nTokens",
    eyebrow: "HOK TOP UP STORE",
    poster: "Hok_Logo.jpg",
    unitLabel: "Tokens",
    idLabel: "HOK Player ID",
    requiresZone: false,
  },
};

const PAYMENT = {
  kpay: ["KBZPay", "kpay.png"],
  wavepay: ["WavePay", "wave.logo.jpg"],
  ayapay: ["AYA Pay", "AYA.Logo.png"],
};

function formatKs(value) {
  return `${Number(value || 0).toLocaleString()} Ks`;
}

function packageImage(title, amount) {
  const text = `${title}`.toLowerCase();
  const price = Number(amount || 0);
  if (text.includes("weekly")) return "weeklypass.png";
  if (text.includes("prime") || text.includes("pack") || text.includes("pass")) return "TokenBag.png";
  if (price > 90000) return "Diamond Car.png";
  if (price > 12000) return "Diamond.png";
  return "Diamond_Bag.png";
}

function groupPackages(packages) {
  return packages.reduce((groups, pack) => {
    const key = pack.category === "Currency" ? "Currency Packages" : `${pack.category} Packs`;
    groups[key] = groups[key] || [];
    groups[key].push(pack);
    return groups;
  }, {});
}

function Header() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const { isAuthenticated, signOut } = useAuth();
  const { data: profile } = useProfile({ enabled: isAuthenticated });
  const picture = profile?.profile_picture || "https://via.placeholder.com/75";

  return (
    <>
      <header className="header-container">
        <div className="header-brand-row">
          <Link className="logo-area" to="/" aria-label="Go to home">
            <h2>Shop Name</h2>
          </Link>
          <button className={`header-menu-toggle ${open ? "open" : ""}`} type="button" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className={`header-menu-panel ${open ? "open" : ""}`}>
          <nav className="nav-links" aria-label="Main navigation">
            <Link to="/">Home</Link>
            <Link to="/#games">Package</Link>
            {isAuthenticated ? <Link to="/order-history">History</Link> : <button onClick={() => setModal(true)}>History</button>}
          </nav>
          <div className="right-side">
            <div className="header-search">
              <input type="search" className="search-input" placeholder="Search games..." />
              <button className="search-btn" type="button">Search</button>
            </div>
            <select className="lang-select" aria-label="Language">
              <option>English</option>
              <option>Myanmar</option>
            </select>
            {isAuthenticated ? (
              <Link className="profile-section" to="/profile"><img src={picture} alt="Profile" /></Link>
            ) : (
              <button onClick={() => setModal(true)} className="login-btn" type="button">Login</button>
            )}
          </div>
        </div>
      </header>
      {modal && <LoginModal onClose={() => setModal(false)} />}
      {isAuthenticated && <button className="floating-logout" type="button" onClick={signOut}>Logout</button>}
    </>
  );
}

function LoginModal({ onClose }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    try {
      await signIn(form.username, form.password);
      onClose();
    } catch (err) {
      setError(extractError(err, "Login failed."));
    }
  }
  return (
    <div className="login-modal-overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="login-modal-box">
        <button className="login-close-btn" onClick={onClose} type="button">&times;</button>
        <h2>LOGIN</h2>
        <p>Sign in to view orders, points and your account.</p>
        <form onSubmit={submit}>
          <label className="login-input-group"><span>user</span><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username" /></label>
          <label className="login-input-group"><span>lock</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" /></label>
          <label className="login-input-group"><span>safe</span><input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm Password" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="login-modal-login-btn" type="submit">Login Now</button>
        </form>
        <div className="login-modal-divider"><span><b>Login</b> with Others</span></div>
        <a className="login-google-login-btn" href="/login/google">G Login with Google</a>
      </div>
    </div>
  );
}

function Home() {
  const { data: games = [] } = useGames();
  const gameMap = new Map(games.map((game) => [game.slug, game]));
  const [slide, setSlide] = useState(0);
  const posters = ["Greeting_Poster.jpg", "Pubg_Poster.jpg", "Roblox_Poster.jpg", "FreeFire_Poster.jpg", "Cod_Poster.jpg", "Hok_Poster.jpg"];
  useEffect(() => {
    const timer = setInterval(() => setSlide((value) => (value + 1) % posters.length), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    <main>
      <section className="Greeting">
        <div className="poster-slider">
          {posters.map((poster, index) => <img key={poster} className={`poster-slide ${slide === index ? "active" : ""}`} src={`${IMG}${poster}`} alt="" />)}
        </div>
        <p>Welcome to our Game Shop. You can buy game diamonds, UC, Robux, top-up services and game items easily.</p>
      </section>
      <section id="games" className="Show_Item_Container">
        <h3>Available Games</h3>
        <div className="Show_Item">
          {HOME_GAMES.map(([slug, name, image]) => (
            <Link key={slug} to={`/game/${slug}`} className="game-link">
              <div className="game-tile">
                <img src={`${IMG}${image}`} alt={name} />
                <p>{gameMap.get(slug)?.name || name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function GamePage() {
  const { slug } = useParams();
  const { data: game, isLoading } = useGame(slug);
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const meta = GAME_META[slug] || GAME_META["mobile-legends"];
  const groups = useMemo(() => groupPackages(game?.packages || []), [game]);
  if (isLoading) return <main className="page-message">Loading packages...</main>;
  if (!game) return <Navigate to="/" replace />;
  return (
    <>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      <section className="ff-hero">
        <div className="ff-hero-left">
          <p className="ff-eyebrow">{meta.eyebrow}</p>
          <h1>{meta.heading.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h1>
          <p>Best {meta.unitLabel} prices<br />Fast Top Up delivery<br />100% Safe & Trusted Service</p>
        </div>
        <div className="ff-hero-card">
          <img src={`${IMG}${meta.poster}`} alt={game.name} />
          <strong>Best Price<br />Instant Top Up<br />Trusted Seller</strong>
        </div>
      </section>
      {Object.entries(groups).map(([title, packages]) => (
        <section key={title} className="weekly-pass-section">
          <h2>{title}</h2>
          {packages.map((pack) => (
            <div key={pack.id} className="weekly-double">
              <p>{pack.title.match(/^[0-9]+$/) ? `${pack.title} ${meta.unitLabel}` : pack.title}</p>
              <img src={`${IMG}${packageImage(pack.title, pack.sell_price)}`} alt="" />
              <p>{formatKs(pack.sell_price)}</p>
              {isAuthenticated ? (
                <Link className="buy-btn" to="/checkout" state={{ slug, packageId: pack.id }}>BUY NOW</Link>
              ) : (
                <button className="buy-btn" type="button" onClick={() => setLoginOpen(true)}>BUY</button>
              )}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.state?.slug;
  const packageId = location.state?.packageId;
  const { data: game } = useGame(slug);
  const meta = GAME_META[slug] || {};
  const selected = game?.packages?.find((pack) => pack.id === packageId);
  const [form, setForm] = useState({ player_id: "", zone_id: "", paymentMethod: "" });
  const [lookupInput, setLookupInput] = useState({ player_id: "", zone_id: "" });
  const { data: lookup, isFetching } = useLookupPlayer(slug, lookupInput.player_id, lookupInput.zone_id);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLookupInput({ player_id: form.player_id.trim(), zone_id: form.zone_id.trim() }), 500);
    return () => clearTimeout(timer);
  }, [form.player_id, form.zone_id]);

  if (!slug || !packageId) return <Navigate to="/" replace />;
  if (!game || !selected) return <main className="page-message">Loading checkout...</main>;

  function submit(event) {
    event.preventDefault();
    setError("");
    const schema = identitySchema.extend({ paymentMethod: z.enum(["kpay", "wavepay", "ayapay"], { message: "Choose a payment method." }) });
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (selected.requires_zone && !form.zone_id.trim()) {
      setError("Please enter the Server ID.");
      return;
    }
    navigate(`/checkout/${form.paymentMethod}`, {
      state: {
        slug,
        packageId,
        playerId: form.player_id.trim(),
        serverId: form.zone_id.trim(),
        playerName: lookup?.player_name || lookup?.name || "",
      },
    });
  }

  const name = lookup?.player_name || lookup?.name || "";
  return (
    <main className="checkout-root">
      <section className="checkout-box">
        <div className="steps">STEP 1 OF 2</div>
        <h1>Order & Payment Method</h1>
        <div className="selected-package-card">
          <h3>Selected Package</h3>
          <p><strong>Package :</strong> {selected.title}</p>
          <p><strong>{meta.unitLabel} :</strong> {selected.amount_label}</p>
          <p><strong>Amount :</strong> {formatKs(selected.sell_price)}</p>
        </div>
        <form onSubmit={submit}>
          <div className="field-row">
            <input value={form.player_id} onChange={(e) => setForm({ ...form, player_id: e.target.value })} placeholder={meta.idLabel} />
            <input value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })} placeholder="Server ID" style={{ display: selected.requires_zone ? "block" : "none" }} />
          </div>
          <div className={`player-result ${name ? "ok" : ""}`}>{isFetching ? "Checking player name..." : name ? `Player Name: ${name}` : ""}</div>
          <h3>Choose Payment</h3>
          <div className="methods">
            {Object.entries(PAYMENT).map(([key, [label, image]]) => (
              <label key={key} className="method-card">
                <input type="radio" name="paymentMethod" value={key} checked={form.paymentMethod === key} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} />
                <span><img src={`${IMG}${image}`} alt={label} />{label}</span>
              </label>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="next-btn" type="submit">Next</button>
        </form>
      </section>
    </main>
  );
}

function PaymentPage() {
  const { method } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { slug, packageId, playerId, serverId, playerName } = location.state || {};
  const { data: game } = useGame(slug);
  const createOrder = useCreateOrder();
  const submitProof = useSubmitProof();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const selected = game?.packages?.find((pack) => pack.id === packageId);
  const provider = PAYMENT[method] || PAYMENT.kpay;
  if (!slug || !packageId || !selected) return <main className="page-message">Loading payment...</main>;

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!file) {
      setMessage("Please upload your payment receipt screenshot.");
      return;
    }
    try {
      const order = await createOrder.mutateAsync({
        package: selected.id,
        player_id: playerId,
        zone_id: serverId || "",
        player_name: playerName || "",
        payment_method: provider[0],
      });
      await submitProof.mutateAsync({ order: order.id, image: file });
      setMessage("Order submitted successfully.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setMessage(extractError(err, "Unable to submit order."));
    }
  }

  return (
    <main className="payment-root">
      <section className="payment-box">
        <button className="back" type="button" onClick={() => navigate(-1)}>Back</button>
        <div className="steps">STEP 2 OF 2</div>
        <h1>{provider[0]} Payment</h1>
        <div className="summary">
          <div className="card provider-card">
            <img src={`${IMG}${provider[1]}`} alt={provider[0]} />
            <h2>{provider[0]}</h2>
            <div>Paing Hto Khant</div>
            <button className="copy-line" type="button" onClick={() => navigator.clipboard?.writeText("09695212289")}>09695212289 Copy</button>
            <p>Phone number can be copied by pressing it.</p>
          </div>
          <div className="card">
            <h3>Selected Order</h3>
            <p><b>Game:</b> {game.name}</p>
            <p><b>Package:</b> {selected.title}</p>
            <p><b>Player:</b> {playerName || "-"}</p>
            <p><b>ID:</b> {playerId}</p>
            {serverId && <p><b>Server:</b> {serverId}</p>}
            <button className="amount" type="button" onClick={() => navigator.clipboard?.writeText(String(selected.sell_price))}>{formatKs(selected.sell_price)} Copy</button>
          </div>
        </div>
        <form className="receipt-form" onSubmit={submit}>
          <input type="text" value={formatKs(selected.sell_price)} readOnly />
          <label className="upload">Payment Receipt Screenshot<input type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
          {message && <div className={`message show ${message.includes("success") ? "success" : "error"}`}>{message}</div>}
          <button className="confirm" disabled={createOrder.isPending || submitProof.isPending} type="submit">Confirm Payment</button>
        </form>
      </section>
    </main>
  );
}

function Profile() {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  return (
    <div className="profile-page-root">
      <div className="profile-card-container">
        <div className="profile-card-box">
          <div className="profile-header-box">
            <img src={profile?.profile_picture || "https://via.placeholder.com/75"} alt="Profile" />
            <div className="user-info">
              <h3>{profile?.name || "User"}</h3>
              <p>{profile?.points || 0} point</p>
            </div>
          </div>
          <div className="btn-grid">
            <Link to="/point-exchange" className="btn-item point-redeem-box">Point Exchange</Link>
            <a href="tel:09695212289" className="btn-item">Phone: 09695212289</a>
            <a href="#" className="btn-item">Telegram Channel</a>
            <a href="#" className="btn-item">Personal Account</a>
            <a href="#" className="btn-item">Support Group</a>
          </div>
        </div>
        <button type="button" onClick={signOut} className="logout-btn-main">Logout</button>
      </div>
    </div>
  );
}

function OrderHistory() {
  const { data: orders = [] } = useOrders({ poll: true });
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="history-container">
      <h2 className="history-title">My Order History</h2>
      <table className="history-table">
        <thead><tr><th>Date</th><th>Game</th><th>Package / Item</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {orders.length === 0 && <tr><td colSpan="5" className="empty-cell">No orders found. You haven't made any purchases yet.</td></tr>}
          {orders.map((order) => (
            <tr key={order.id} className={expanded === order.id ? "expanded" : ""} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
              <td data-label="Date">{new Date(order.created_at).toLocaleDateString()}</td>
              <td data-label="Game">{order.game}</td>
              <td data-label="Package">{order.package.title}</td>
              <td data-label="Amount">{formatKs(order.quoted_price)}</td>
              <td data-label="Status"><span className={`status-badge status-${order.status}`}>{order.status.replace("_", " ")}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PointExchange() {
  const { data: profile } = useProfile();
  const { data: rewards = [] } = usePointRewards();
  const redeem = useRedeemPoints();
  const [form, setForm] = useState({ reward_code: "", player_id: "", zone_id: "" });
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    setMessage("");
    try {
      identitySchema.parse({ player_id: form.player_id, zone_id: form.zone_id });
      await redeem.mutateAsync(form);
      setMessage("Point exchange submitted successfully.");
    } catch (err) {
      setMessage(err.issues?.[0]?.message || extractError(err, "Unable to redeem points."));
    }
  }
  const grouped = rewards.reduce((acc, reward) => {
    acc[reward.game] = acc[reward.game] || [];
    acc[reward.game].push(reward);
    return acc;
  }, {});
  return (
    <main className="exchange-root">
      <section className="exchange-hero">
        <h1>Point Exchange</h1>
        <p>{profile?.points || 0} point</p>
      </section>
      {Object.entries(grouped).map(([game, list]) => (
        <section key={game} className="reward-section">
          <h2>{game}</h2>
          <div className="reward-grid">
            {list.map((reward) => (
              <label key={reward.code} className={`reward-card ${form.reward_code === reward.code ? "selected" : ""}`}>
                <input type="radio" name="reward" value={reward.code} onChange={(e) => setForm({ ...form, reward_code: e.target.value })} />
                <img src={`${IMG}${reward.image || "Diamond_Bag.png"}`} alt="" />
                <strong>{reward.package_title}</strong>
                <span>{reward.point_cost} points</span>
              </label>
            ))}
          </div>
        </section>
      ))}
      <form className="redeem-modal inline" onSubmit={submit}>
        <input value={form.player_id} onChange={(e) => setForm({ ...form, player_id: e.target.value })} placeholder="Player ID" />
        <input value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })} placeholder="Server ID if required" />
        {message && <p className="form-note">{message}</p>}
        <button className="redeem-btn" type="submit">Redeem</button>
      </form>
    </main>
  );
}

function LoginPage() {
  const [open, setOpen] = useState(true);
  return open ? <LoginModal onClose={() => setOpen(false)} /> : <Navigate to="/" replace />;
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { signInWithTokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access = params.get("access");
    const refresh = params.get("refresh");
    if (access && refresh) {
      signInWithTokens(access, refresh);
      window.history.replaceState(null, "", `${location.pathname}${location.search}`);
      navigate("/", { replace: true });
    }
  }, [location.pathname, location.search, navigate, signInWithTokens]);
  return (
    <>
      <Header />
      <Routes>
        <Route index element={<Home />} />
        <Route path="game/:slug" element={<GamePage />} />
        <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="checkout/:method" element={<RequireAuth><PaymentPage /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="order-history" element={<RequireAuth><OrderHistory /></RequireAuth>} />
        <Route path="point-exchange" element={<RequireAuth><PointExchange /></RequireAuth>} />
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </>
  );
}

function Footer() {
  return <footer className="site-footer">Game Shop</footer>;
}
