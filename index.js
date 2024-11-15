const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(express.json());


mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
    console.log('Conectado a la base de datos MongoDB');
});


const vehiculoSchema = new mongoose.Schema({
    marca: { type: String, required: true },
    modelo: { type: String, required: true },
    anio: { type: Number, required: true },
    disponibilidad: { type: String, enum: ['si', 'no'], required: true }
});

const Vehiculo = mongoose.model('Vehiculo', vehiculoSchema);


const personaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    correo: { type: String, required: true, unique: true },
    contraseña: { type: String, required: true }
});

const Persona = mongoose.model('Persona', personaSchema);


app.get('/api/vehiculos', async (req, res) => {
    try {
        const vehiculos = await Vehiculo.find();
        res.json(vehiculos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener vehículos', error });
    }
});

app.get('/api/vehiculos/:id', async (req, res) => {
    try {
        const vehiculo = await Vehiculo.findById(req.params.id);
        if (vehiculo) {
            res.json(vehiculo);
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener vehículo', error });
    }
});

app.post('/api/vehiculos', async (req, res) => {
    try {
        const nuevoVehiculo = new Vehiculo(req.body);
        const resultado = await nuevoVehiculo.save();
        res.status(201).json(resultado);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear vehículo', error });
    }
});

app.put('/api/vehiculos/:id', async (req, res) => {
    try {
        const vehiculoActualizado = await Vehiculo.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (vehiculoActualizado) {
            res.json(vehiculoActualizado);
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar vehículo', error });
    }
});

app.delete('/api/vehiculos/:id', async (req, res) => {
    try {
        const vehiculoEliminado = await Vehiculo.findByIdAndDelete(req.params.id);
        if (vehiculoEliminado) {
            res.json({ message: 'Vehículo eliminado con éxito' });
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar vehículo', error });
    }
});

// Rutas CRUD para Personas
app.get('/api/personas', async (req, res) => {
    try {
        const personas = await Persona.find();
        res.json(personas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener personas', error });
    }
});

app.get('/api/personas/:id', async (req, res) => {
    try {
        const persona = await Persona.findById(req.params.id);
        if (persona) {
            res.json(persona);
        } else {
            res.status(404).json({ message: 'Persona no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener persona', error });
    }
});

app.post('/api/personas', async (req, res) => {
    try {
        const nuevaPersona = new Persona(req.body);
        const resultado = await nuevaPersona.save();
        res.status(201).json(resultado);
    } catch (error) {
        res.status(400).json({ message: 'Error al crear persona', error });
    }
});

app.put('/api/personas/:id', async (req, res) => {
    try {
        const personaActualizada = await Persona.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (personaActualizada) {
            res.json(personaActualizada);
        } else {
            res.status(404).json({ message: 'Persona no encontrada' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar persona', error });
    }
});

app.delete('/api/personas/:id', async (req, res) => {
    try {
        const personaEliminada = await Persona.findByIdAndDelete(req.params.id);
        if (personaEliminada) {
            res.json({ message: 'Persona eliminada con éxito' });
        } else {
            res.status(404).json({ message: 'Persona no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar persona', error });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en https://api-alquilermongodb-1.onrender.com/`);
});
