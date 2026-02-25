const express = require('express');
const PageData = require('../models/PageData');

const router = express.Router();

router.get('/:page', async (req, res) => {
  try {
    const record = await PageData.findOne({ page: req.params.page });
    res.json(record?.payload || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch page data', message: error.message });
  }
});

router.put('/:page', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const record = await PageData.findOneAndUpdate(
      { page: req.params.page },
      { page: req.params.page, payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ message: 'Page data saved', page: record.page, payload: record.payload });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save page data', message: error.message });
  }
});

module.exports = router;
