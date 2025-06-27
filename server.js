const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.static('.'));

app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const limit = req.query.limit || 12;
    
    if (!query) {
        return res.status(400).json({ error: 'Query parameter q is required' });
    }

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from Deezer:', error);
        res.status(500).json({ error: 'Failed to fetch from Deezer API' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎵 Topify server running on http://localhost:${PORT}`);
});