const express = require('express');
const Metaphore = require('../models/metaphore.model');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const newFiche = await Metaphore.create(req.body);

    req.app.locals.io.emit('new-fiche', {
      _id: newFiche._id,
      title: newFiche.title,
      content: newFiche.content,
      createdAt: newFiche.createdAt,
      visible: newFiche.visible,
      downloadable: newFiche.downloadable,
    });

    res.status(201).json(newFiche);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la fiche' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (typeof q !== 'string') {
      return res.status(400).json({ error: '$regex must be a string' });
    }

    const metaphore = await Metaphore.find({
      $or: [{ title: { $regex: q, $options: 'i' } }],
    });

    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const metaphore = await Metaphore.findById(req.params.id);
    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/visibility', authMiddleware, async (req, res) => {
  try {
    const metaphore = await Metaphore.findByIdAndUpdate(
      req.params.id,
      { visible: req.body.visible },
      { new: true }
    );

    req.app.locals.io.emit('visibility-changed', {
      id: metaphore._id,
      visible: metaphore.visible,
    });

    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/downloadable', authMiddleware, async (req, res) => {
  try {
    const metaphore = await Metaphore.findByIdAndUpdate(
      req.params.id,
      { downloadable: req.body.downloadable },
      { new: true }
    );

    req.app.locals.io.emit('downloadable-changed', {
      id: metaphore._id,
      downloadable: metaphore.downloadable,
    });

    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updatedFiche = await Metaphore.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    req.app.locals.io.emit('update-fiche', updatedFiche);

    res.json(updatedFiche);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fiche = await Metaphore.findById(req.params.id);
    if (!fiche) {
      return res.status(404).json({ error: "Fiche non trouvée" });
    }

    await fiche.deleteOne();

    req.app.locals.io.emit('delete-fiche', { id: req.params.id });

    res.json({ message: "Fiche supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const metaphores = req.body;

    if (!Array.isArray(metaphores) || metaphores.length === 0) {
      return res.status(400).json({ error: "Liste vide ou invalide." });
    }

    const validMetaphores = metaphores.filter(m => m.title && m.content);
    if (validMetaphores.length === 0) {
      return res.status(400).json({ error: "Aucune fiche valide." });
    }

    const inserted = await Metaphore.insertMany(validMetaphores);

    inserted.forEach(fiche => {
      req.app.locals.io.emit('new-fiche', fiche);
    });

    res.status(201).json(inserted);
  } catch (err) {
    console.error("Erreur bulk insert :", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats/added", authMiddleware, async (req, res) => {
  const { period = "week" } = req.query;

  try {
    let groupStage;
    let projectStage = {
      createdAt: 1,
    };

    switch (period) {
      case "day":
        projectStage.date = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        groupStage = {
          _id: "$date",
          total: { $sum: 1 },
        };
        break;

      case "week":
        projectStage.week = { $isoWeek: "$createdAt" };
        projectStage.year = { $isoWeekYear: "$createdAt" };
        groupStage = {
          _id: { week: "$week", year: "$year" },
          total: { $sum: 1 },
        };
        break;

      case "month":
        projectStage.month = { $month: "$createdAt" };
        projectStage.year = { $year: "$createdAt" };
        groupStage = {
          _id: { month: "$month", year: "$year" },
          total: { $sum: 1 },
        };
        break;

      case "year":
        projectStage.year = { $year: "$createdAt" };
        groupStage = {
          _id: "$year",
          total: { $sum: 1 },
        };
        break;

      default:
        return res.status(400).json({ error: "Période invalide." });
    }

    const result = await Metaphore.aggregate([
      { $project: projectStage },
      { $group: groupStage },
      { $sort: { "_id.year": -1, "_id.week": -1, "_id.month": -1, "_id": -1 } },
    ]);

    res.json(result);
  } catch (err) {
    console.error("Erreur stats :", err);
    res.status(500).json({ error: "Erreur lors du calcul des stats." });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const metaphores = await Metaphore.find({});
    res.json(metaphores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
