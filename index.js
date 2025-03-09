const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error de conexión:", err));

const vehiculoSchema = new mongoose.Schema({
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  anio: { type: Number, required: true },
  disponibilidad: { type: String, enum: ["si", "no"], required: true },
  alquiladoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Persona",
    default: null,
  },
});

const Vehiculo = mongoose.model("Vehiculo", vehiculoSchema);

const personaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
});

const Persona = mongoose.model("Persona", personaSchema);

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
    req.usuario = usuario;
    next();
  });
}

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

app.post("/api/personas/registro", async (req, res) => {
  try {
    const { nombre, correo, contraseña } = req.body;

    if (!nombre || !correo || !contraseña) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const personaExistente = await Persona.findOne({ correo });
    if (personaExistente) {
      return res.status(400).json({ message: "Correo ya registrado" });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const persona = new Persona({ nombre, correo, contraseña: hashedPassword });
    await persona.save();
    res.status(201).json({ message: "Persona registrada con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar persona", error });
  }
});

app.post("/api/personas/login", async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    const persona = await Persona.findOne({ correo });
    if (!persona) {
      return res.status(400).json({ message: "Credenciales incorrectas" });
    }

    const esValida = await bcrypt.compare(contraseña, persona.contraseña);
    if (!esValida) {
      return res.status(400).json({ message: "Credenciales incorrectas" });
    }

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

app.post("/api/vehiculos/alquilar/:id", autenticarToken, async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findById(req.params.id);

    if (!vehiculo) {
      return res.status(404).json({ message: "Vehículo no encontrado" });
    }

    // Verifica si el usuario ya está en el token
    if (!req.usuario?._id) {
      return res.status(403).json({ message: "Usuario no autenticado" });
    }

    
    vehiculo.disponibilidad = "no";
    vehiculo.alquiladoPor = req.usuario._id;
    await vehiculo.save();

    res.json({
      message: "Vehículo alquilado con éxito",
      vehiculo: vehiculo,
    });
  } catch (error) {
    console.error("🔥 Error en el servidor:", error); // Log crítico
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/vehiculos/devolver/:id", autenticarToken, async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findById(req.params.id);

    if (!vehiculo) {
      return res.status(404).json({ message: "Vehículo no encontrado" });
    }

    if (vehiculo.alquiladoPor?.toString() !== req.usuario._id) {
      return res
        .status(403)
        .json({ message: "No puedes devolver este vehículo" });
    }

    vehiculo.disponibilidad = "si";
    vehiculo.alquiladoPor = null;
    await vehiculo.save();

    res.json({ message: "Vehículo devuelto con éxito", vehiculo });
  } catch (error) {
    res.status(500).json({ message: "Error al devolver vehículo", error });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
