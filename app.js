// app.js
const express = require("express");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
require("dotenv").config();

const app = express();

/* -------------------------- EJS -------------------------- */
app.use(expressLayouts);
app.set("layout", "layout");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ----------------------- Middlewares base ----------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* --------------------------- Sesión ---------------------------- */
// ★ confía en proxy (útil ahora o si luego pones HTTPS/reverse proxy)
app.set('trust proxy', 1);





app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret', // ★ fallback seguro en dev
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,              // ★ HTTP en LAN (pon true solo con HTTPS)
      maxAge: 1000 * 60 * 60 * 8  // 8h
    },
    name: 'sid' // ★ nombre corto y claro para la cookie
  })
);

// Log útil: verifica si la cookie regresa y si la sesión ya tiene usuario
app.use((req, res, next) => {
  console.log("🔎 SID:", req.sessionID, "| usuario:", req.session?.usuario);
  next();
});

// 🔐 Invalidar sesión si cambia APP_VERSION (solo si está definida)
app.use((req, res, next) => {
  const versionSistema = process.env.APP_VERSION;
  if (!req.session) return next();

  if (
    versionSistema &&
    req.session.usuario &&
    typeof req.session.appVersion !== "undefined" &&
    req.session.appVersion !== versionSistema
  ) {
    console.log(`⚠️ Usuario ${req.session.usuario} tiene versión antigua. Cerrando sesión.`);
    return req.session.destroy(() => res.redirect("/login"));
  }

  if (versionSistema && req.session.usuario && typeof req.session.appVersion === "undefined") {
    req.session.appVersion = versionSistema;
  }

  next();
});

/* ✅ Exponer datos de sesión a TODAS las vistas (EJS) */
app.use((req, res, next) => {
  res.locals.usuario  = req.session?.usuario || null;
  res.locals.permisos = Array.isArray(req.session?.permisos)
    ? req.session.permisos.map(p => String(p).trim().toLowerCase())
    : [];
  next();
});

/* 🎨 Layout dinámico para /login */
app.use((req, res, next) => {
  app.set("layout", req.path === "/login" ? false : "layout");
  next();
});

/* ❌ Evitar cacheo (post-logout back button) */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

/* ----------------------- Rutas y permisos ---------------------- */
const authRoutes = require("./routes/authRoutes");
const planeacionesRoutes = require("./routes/planeacionesRoutes");
const usuariosRoutes = require("./routes/usuariosRoutes");
const reportesRoutes = require("./routes/reportesRoutes");
const modulosRoutes = require("./routes/modulosRoutes");
const factCobRoutes = require("./routes/factCobRoutes");
// 👇 cuida el nombre real del archivo en sistemas case-sensitive
const { permisoAuto } = require("./controllers/authcontroller");

/* 🔒 Aplica permisoAuto a todo, excepto login/logout y rutas de debug */
app.use((req, res, next) => {
  const skip = ["/login", "/logout", "/test-permisos", "/debug-session", "/cookie-check"];
  if (skip.some(p => req.path.startsWith(p))) return next();
  return permisoAuto(req, res, next);
});

/* --- Rutas de diagnóstico (JSON) --- */
app.get("/debug-session", (req, res) => res.json(req.session));
app.get("/test-permisos", (req, res) => {
  res.json({ usuario: req.session?.usuario, permisos: req.session?.permisos });
});
app.get("/cookie-check", (req, res) => {
  res.json({ cookieHeader: req.headers.cookie || null, sid: req.sessionID, usuario: req.session?.usuario || null });
});

/* ---------------------------- Montar rutas ---------------------------- */
app.use("/", authRoutes);       // auth primero
app.use("/planeaciones", planeacionesRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/modulos", modulosRoutes);
app.use("/", reportesRoutes);
app.use("/factcob", factCobRoutes);

/* Dashboard (requiere login) */
app.get("/dashboard", (req, res) => {
  if (!req.session.usuario) return res.redirect("/login");
  res.render("dashboard", { title: "Panel Principal" });
});

/* Raíz -> login */
app.get("/", (req, res) => res.redirect("/login"));

/* ----------------------------- Socket.IO ----------------------------- */
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server); // mismo origen → no necesita CORS

io.on("connection", (socket) => {
  console.log("🟢 Nuevo cliente conectado");
  socket.on("usuario_conectado", (usuario) => {
    console.log(`👤 Usuario conectado: ${usuario}`);
    socket.emit("mensaje_bienvenida", `¡Bienvenido ${usuario}! Estás conectado en tiempo real.`);
  });
  socket.on("disconnect", () => console.log("🔴 Cliente desconectado"));
});

/* --------------------------- Arranque HTTP --------------------------- */
const isProd = process.env.NODE_ENV === "production";
const PORT = isProd ? 3080 : 3060;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Servidor ${isProd ? "producción" : "desarrollo"} corriendo en http://10.0.0.20:${PORT}`
  );
});