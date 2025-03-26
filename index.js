const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const router = require("./routes");

const app = express();
const server = http.createServer(app); // Wrap Express dans HTTP server
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://metacode-front.vercel.app'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  }
});

// Injection de Socket.IO dans l'application Express
app.locals.io = io;

app.use(morgan('dev'));
app.use(express.json({ limit: "50mb" }));

app.use(cors({
  origin: ['http://localhost:5173', 'https://metacode-front.vercel.app'],
  credentials: true,
}));

app.use('/', router);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

app.get('/', (req, res) => res.send("Bienvenue sur l'API Metacode 🚀"));

// Lancer le serveur avec socket.io
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
