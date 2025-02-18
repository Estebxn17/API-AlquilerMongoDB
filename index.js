const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken"); // Importa la librería jwt
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error de conexión:", err));

// Schema para Vehículos
const vehiculoSchema = new mongoose.Schema({
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  anio: { type: Number, required: true },
  disponibilidad: { type: String, enum: ["si", "no"], required: true },
});

const Vehiculo = mongoose.model("Vehiculo", vehiculoSchema);

// Schema para Personas (Usuarios)
const personaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
});

const Persona = mongoose.model("Persona", personaSchema);

// Middleware de Autenticación (JWT)
function autenticarToken(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso denegado, no se proporcionó token" });
  }

  jwt.verify(token, "tu_clave_secreta", (err, usuario) => {
    if (err) {
      return res.status(403).json({ message: "Token no válido" });
    }
    req.usuario = usuario; // Guardar el usuario decodificado en la solicitud
    next(); // Continuar con la siguiente función
  });
}

// Rutas CRUD para Vehículos
app.get("/api/vehiculos", autenticarToken, async (req, res) => {
  try {
    const vehiculos = await Vehiculo.find();
    res.json(vehiculos);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener vehículos", error });
  }
});

app.get("/api/vehiculos/:id", autenticarToken, async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findById(req.params.id);
    if (vehiculo) {
      res.json(vehiculo);
    } else {
      res.status(404).json({ message: "Vehículo no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error al obtener vehículo", error });
  }
});

app.post("/api/vehiculos", autenticarToken, async (req, res) => {
  try {
    const nuevoVehiculo = new Vehiculo(req.body);
    const resultado = await nuevoVehiculo.save();
    res.status(201).json(resultado);
  } catch (error) {
    res.status(400).json({ message: "Error al crear vehículo", error });
  }
});

app.put("/api/vehiculos/:id", autenticarToken, async (req, res) => {
  try {
    const vehiculoActualizado = await Vehiculo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (vehiculoActualizado) {
      res.json(vehiculoActualizado);
    } else {
      res.status(404).json({ message: "Vehículo no encontrado" });
    }
  } catch (error) {
    res.status(400).json({ message: "Error al actualizar vehículo", error });
  }
});

app.delete("/api/vehiculos/:id", autenticarToken, async (req, res) => {
  try {
    const vehiculoEliminado = await Vehiculo.findByIdAndDelete(req.params.id);
    if (vehiculoEliminado) {
      res.json({ message: "Vehículo eliminado con éxito" });
    } else {
      res.status(404).json({ message: "Vehículo no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar vehículo", error });
  }
});

// Rutas CRUD para Personas (Usuarios)
app.get("/api/personas", autenticarToken, async (req, res) => {
  try {
    const personas = await Persona.find();
    res.json(personas);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener personas", error });
  }
});

app.get("/api/personas/:id", autenticarToken, async (req, res) => {
  try {
    const persona = await Persona.findById(req.params.id);
    if (persona) {
      res.json(persona);
    } else {
      res.status(404).json({ message: "Persona no encontrada" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error al obtener persona", error });
  }
});

// Registro de Persona
app.post("/api/personas/registro", async (req, res) => {
  try {
    const { nombre, correo, contraseña } = req.body;

    // Verificar que todos los campos necesarios estén presentes
    if (!nombre || !correo || !contraseña) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    // Verificar si el correo ya está registrado
    const personaExistente = await Persona.findOne({ correo });
    if (personaExistente) {
      return res.status(400).json({ message: "Correo ya registrado" });
    }

    // Cifrar la contraseña antes de almacenarla
    const hashedPassword = await bcrypt.hash(contraseña, 10); // Cifrado con salt de 10 rondas

    // Crear la persona con la contraseña cifrada
    const persona = new Persona({ nombre, correo, contraseña: hashedPassword });
    await persona.save();
    res.status(201).json({ message: "Persona registrada con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar persona", error });
  }
});

// Login de Persona (Generar Token JWT)
app.post("/api/personas/login", async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    // Buscar la persona por correo
    const persona = await Persona.findOne({ correo });
    if (!persona) {
      return res.status(400).json({ message: "Credenciales incorrectas" });
    }

    // Comparar la contraseña proporcionada con la cifrada
    const esValida = await bcrypt.compare(contraseña, persona.contraseña);
    if (!esValida) {
      return res.status(400).json({ message: "Credenciales incorrectas" });
    }

    // Crear y firmar el token JWT
    const token = jwt.sign(
      { _id: persona._id, nombre: persona.nombre },
      "tu_clave_secreta",
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
