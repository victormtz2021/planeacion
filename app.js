const express = require("express");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
require("dotenv").config();

const app = express();

// Layout EJS
app.use(expressLayouts);
app.set("layout", "layout");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 🔐 Sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// 🔐 Middleware: invalidar sesión si cambia la versión del sistema
app.use((req, res, next) => {
  const versionSistema = process.env.APP_VERSION;

  if (!req.session) return next();

  if (
    req.session.usuario &&
    typeof req.session.appVersion !== "undefined" &&
    req.session.appVersion !== versionSistema
  ) {
    console.log(`⚠️ Usuario ${req.session.usuario} tiene versión antigua. Cerrando sesión.`);
    return req.session.destroy(() => res.redirect("/login"));
  }

  if (req.session.usuario && typeof req.session.appVersion === "undefined") {
    req.session.appVersion = versionSistema;
  }

  next();
});

// 📌 Middleware para pasar datos de sesión a las vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session?.usuario || null;
  next();
});

// 🎨 Layout dinámico solo para login
app.use((req, res, next) => {
  if (req.path === "/login") {
    app.set("layout", false);
  } else {
    app.set("layout", "layout");
  }
  next();
});

// 🛣 Rutas
const authRoutes = require("./routes/authRoutes");
const planeacionesRoutes = require("./routes/planeacionesRoutes");
const usuariosRoutes = require("./routes/usuariosRoutes");
const reportesRoutes = require("./routes/reportesRoutes");

app.use("/", authRoutes);
app.use("/planeaciones", planeacionesRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/", reportesRoutes);

// 🧪 Ruta protegida de ejemplo
app.get("/dashboard", (req, res) => {
  if (!req.session.usuario) return res.redirect("/login");
  res.render("dashboard", {
    title: "Panel Principal",
  });
});

// 🔌 Socket.IO
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("🟢 Nuevo cliente conectado");

  socket.on("usuario_conectado", (usuario) => {
    console.log(`👤 Usuario conectado: ${usuario}`);
    socket.emit("mensaje_bienvenida", `¡Bienvenido ${usuario}! Estás conectado en tiempo real.`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado");
  });
});

// 🚀 Arranque del servidor
const PORT = process.env.PORT || 3080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
