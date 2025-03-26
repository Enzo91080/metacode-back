const mongoose = require('mongoose');

const MetaphoreSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String },
    visible: { type: Boolean, default: true },
    downloadable: { type: Boolean, default: false },
  },
  {
    timestamps: true, // ⬅️ ajoute createdAt et updatedAt automatiquement
  }
);

module.exports = mongoose.model('Metaphore', MetaphoreSchema);
