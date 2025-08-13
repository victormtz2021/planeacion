const sql = require("mssql");
const dbConfig = require("../db/config");
const bcrypt = require("bcrypt");

// 📄 Mostrar todos los usuarios activos
exports.mostrarUsuarios = async (req, res) => {
  try {
    // Nueva conexión aislada a la base "Planeacion"
    const pool = await new sql.ConnectionPool(dbConfig).connect();
    const result = await pool.request().query("SELECT * FROM login WHERE estatus = 1");

    await pool.close(); // Cierra conexión limpia
    res.render("usuarios", { usuarios: result.recordset });
  } catch (error) {
    console.error("❌ Error al mostrar usuarios:", error);
    res.status(500).send("Error al obtener usuarios");
  }
};

// 📄 Agregar nuevo usuario
exports.agregarUsuario = async (req, res) => {
  const { nombre_completo, correo, usuario, contrasena, rol } = req.body;
  const hash = await bcrypt.hash(contrasena, 10); // Encripta la contraseña

  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();

    await pool.request()
      .input("nombre_completo", sql.NVarChar, nombre_completo)
      .input("correo", sql.NVarChar, correo)
      .input("usuario", sql.NVarChar, usuario)
      .input("contrasena", sql.NVarChar, hash)
      .input("rol", sql.NVarChar, rol)
      .input("estatus", sql.Bit, 1)
      .query(`
        INSERT INTO login (nombre_completo, correo, usuario, contrasena, rol, estatus, fecha_registro)
        VALUES (@nombre_completo, @correo, @usuario, @contrasena, @rol, @estatus, GETDATE())
      `);

    await pool.close();
    res.status(200).json({ mensaje: "Usuario guardado correctamente" });
  } catch (error) {
    if (error.number === 2627) {
      res.status(400).json({ error: "Ya existe un usuario con ese correo o nombre de usuario" });
    } else {
      console.error("❌ Error al agregar usuario:", error);
      res.status(500).json({ error: "Error interno al agregar usuario" });
    }
  }
};

// 📄 Editar usuario (vista general)
exports.editarUsuario = async (req, res) => {
  const { id, nombre_completo, correo, rol } = req.body;

  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();

    await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_completo", sql.NVarChar, nombre_completo)
      .input("correo", sql.NVarChar, correo)
      .input("rol", sql.NVarChar, rol)
      .query(`
        UPDATE login 
        SET nombre_completo = @nombre_completo, correo = @correo, rol = @rol
        WHERE id = @id
      `);

    await pool.close();
    res.redirect("/usuarios");
  } catch (error) {
    console.error("❌ Error al editar usuario (formulario):", error);
    res.status(500).send("Error al editar usuario");
  }
};

// 📄 Editar usuario (modal o AJAX)
exports.editarUsuarioAjax = async (req, res) => {
  const { id, nombre_completo, rol } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    await pool.request()
      .input("id", sql.Int, id)
      .input("nombre_completo", sql.NVarChar, nombre_completo)
      .input("rol", sql.NVarChar, rol)
      .query(`
        UPDATE login SET nombre_completo = @nombre_completo, rol = @rol
        WHERE id = @id
      `);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("❌ Error al editar usuario AJAX:", error);
    res.status(500).json({ error: "Error al editar usuario" });
  }
};


// 📄 Eliminar usuario (cambia estatus a 0)
exports.eliminarUsuario = async (req, res) => {
  const { id } = req.body;

  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();

    await pool.request()
      .input("id", sql.Int, id)
      .query("UPDATE login SET estatus = 0, fecha_baja = GETDATE() WHERE id = @id");

    await pool.close();
    res.redirect("/usuarios");
  } catch (error) {
    console.error("❌ Error al eliminar usuario:", error);
    res.status(500).send("Error al eliminar usuario");
  }
};

// 📄 Mostrar usuarios eliminados (para modal)
exports.mostrarUsuariosEliminados = async (req, res) => {
  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();

    const result = await pool.request()
      .query("SELECT nombre_completo, usuario, correo, rol, fecha_baja FROM login WHERE estatus = 0 ORDER BY fecha_baja DESC");

    await pool.close();
    res.json(result.recordset);
  } catch (error) {
    console.error("❌ Error al obtener usuarios eliminados:", error);
    res.status(500).json({ error: "Error al cargar usuarios eliminados" });
  }
};


exports.guardarPermisos = async (req, res) => {
  const { idUsuario, permisos } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Elimina permisos actuales del usuario
    await pool.request()
      .input("idUsuario", sql.Int, idUsuario)
      .query("DELETE FROM permisos_usuarios WHERE id_usuario = @idUsuario");

    // Inserta nuevos permisos
    for (let modulo of permisos) {
      await pool.request()
        .input("idUsuario", sql.Int, idUsuario)
        .input("modulo", sql.VarChar, modulo)
        .query("INSERT INTO permisos_usuarios (id_usuario, modulo) VALUES (@idUsuario, @modulo)");
    }

    res.json({ ok: true, mensaje: "Permisos guardados correctamente" });

  } catch (err) {
    console.error("❌ Error al guardar permisos:", err);
    res.status(500).json({ error: "Error al guardar permisos" });
  }
};


exports.listaUsuarios = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .query("SELECT id, nombre_completo, usuario, rol FROM login");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error listaUsuarios:", err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
};


// Obtener permisos de un usuario
exports.obtenerPermisosUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await sql.connect(dbConfig);

    const result = await pool.request()
      .input("id_usuario", sql.Int, id)
      .query("SELECT modulo FROM permisos_usuarios WHERE id_usuario = @id_usuario");

    // Enviar array de strings
    res.json(result.recordset.map(r => r.modulo));
  } catch (err) {
    console.error("Error al obtener permisos:", err);
    res.status(500).json({ error: "Error obteniendo permisos" });
  }
};

// Guardar permisos de un usuario
exports.actualizarPermisosUsuario = async (req, res) => {
  try {
    const { id_usuario, permisos } = req.body;

    // Validar que haya usuario seleccionado
    if (!id_usuario) {
      return res.status(400).json({ error: "Debes seleccionar un usuario" });
    }

    const pool = await sql.connect(dbConfig);

    // Eliminar permisos actuales
    await pool.request()
      .input("id_usuario", sql.Int, id_usuario)
      .query("DELETE FROM permisos_usuarios WHERE id_usuario = @id_usuario");

    // Insertar nuevos permisos
    for (let modulo of permisos) {
      await pool.request()
        .input("id_usuario", sql.Int, id_usuario)
        .input("modulo", sql.NVarChar, modulo)
        .query(`
          INSERT INTO permisos_usuarios (id_usuario, modulo)
          VALUES (@id_usuario, @modulo)
        `);
    }

    // Si el usuario editado es el mismo de la sesión → refrescar permisos
    if (req.session.id_usuario == id_usuario) {
      req.session.permisos = permisos;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error actualizarPermisosUsuario:", err);
    res.status(500).json({ error: "Error actualizando permisos" });
  }
};
