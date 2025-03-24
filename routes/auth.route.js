const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const router = express.Router();

// Inscription
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Unauthorized or token expired" });
  }
});

// Connexion
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      console.log("Utilisateur non trouvé.");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Mot de passe incorrect.");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id, role: user.role,
        username: user.username,
      }, // <--- ajoute le role ici
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );


    res.status(200).json({ token, user });
  } catch (err) {
    console.error("Erreur pendant le processus de connexion :", err.message);
    res.status(500).json({ error: "Erreur serveur, veuillez réessayer." });
  }
});



module.exports = router;
