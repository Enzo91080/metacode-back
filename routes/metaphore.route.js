const express = require('express');
const Metaphore = require('../models/metaphore.model');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const newFiche = await Metaphore.create(req.body);

    // Émettre un événement Socket.IO aux admins
    req.app.locals.io.emit('new-fiche', {
      title: newFiche.title,
      id: newFiche._id,
      createdAt: newFiche.createdAt,
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
      return res.status(400).json({ error: '$regex has to be a string' });
    }
    const metaphore = await Metaphore.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
      ]
    });

    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Lire une tâche
router.get('/:id', async (req, res) => {
  try {
    const metaphore = await Metaphore.findOne({ _id: req.params.id });
    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// changer la visibilité d'une tâche
router.patch('/:id/visibility', authMiddleware, async (req, res) => {
  try {
    const metaphore = await Metaphore.findOneAndUpdate(
      { _id: req.params.id },
      {
        visible: req.body.visible
      },
      { new: true }
    );
    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// permettre le téléchargement d'une tâche
router.patch('/:id/downloadable', authMiddleware, async (req, res) => {
  try {
    const metaphore = await Metaphore.findOneAndUpdate(
      { _id: req.params.id },
      {
        downloadable: req.body.downloadable
      },
      { new: true }
    );
    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const metaphores = req.body;

    if (!Array.isArray(metaphores) || metaphores.length === 0) {
      return res.status(400).json({ error: "La liste des métaphores est vide ou invalide." });
    }

    // Validation simple sur chaque élément
    const validMetaphores = metaphores.filter(m => m.title && m.content);

    if (validMetaphores.length === 0) {
      return res.status(400).json({ error: "Aucune métaphore valide à insérer." });
    }

    const inserted = await Metaphore.insertMany(validMetaphores);
    res.status(201).json(inserted);
  } catch (err) {
    console.error("Erreur lors de l'insertion multiple :", err);
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
    console.error("Erreur stats métaphores :", err);
    res.status(500).json({ error: "Erreur lors du calcul des stats." });
  }
});

// insérer plusieurs tâches
// router.post('/bulk', authMiddleware, async (req, res) => {
//   try {
//     // Vérifiez que chaque tâche a un titre
//     const tasks = req.body.map((task) => {
//       if (!task.title) throw new Error('Task validation failed: title is required');
//       return { ...task, user: req.user.id };
//     });

//     const insertedTasks = await Task.insertMany(tasks);
//     res.status(201).json(insertedTasks);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// Lire toutes les tâches
router.get('/', authMiddleware, async (req, res) => {
  try {
    const metaphores = await Metaphore.find({});
    res.json(metaphores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Mettre à jour une tâche
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const metaphore = await Metaphore.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );
    res.json(metaphore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer une tâche
// Supprimer une tâche (accessible uniquement aux administrateurs)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const task = await Metaphore.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting task.', error: err.message });
  }
});


module.exports = router;
