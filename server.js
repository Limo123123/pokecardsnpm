const express = require('express');
const fs = require('fs');
const cors = require('cors'); // Importiere das CORS-Paket
const app = express();
const PORT = 3003;

app.use(cors()); // Aktiviere CORS für alle Routen
app.use(express.json());

const DATA_FILE = 'accounts.json';
const CARDS_FILE = 'cards.json';

let battles = {}; // Speicherung aktiver Kämpfe

// Hilfsfunktion zum Laden der JSON-Daten
function loadData(file, defaultData) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    }
    return JSON.parse(fs.readFileSync(file));
}

// Hilfsfunktion zum Speichern der JSON-Daten
function saveData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Initialisiere JSON-Dateien
const accountsData = loadData(DATA_FILE, { users: {} });
const cardsData = loadData(CARDS_FILE, {
    cards: [
        { name: 'Pikachu', attack: 20, health: 100, rarity: 'common', packImage: '/images/pack_common.png' },
        { name: 'Charmander', attack: 25, health: 90, rarity: 'common', packImage: '/images/pack_common.png' },
        { name: 'Bulbasaur', attack: 15, health: 110, rarity: 'common', packImage: '/images/pack_common.png' },
        // Füge hier weitere Karten hinzu
    ]
});

// Registrierung
app.post('/register', (req, res) => {
    const { username } = req.body;
    let data = loadData(DATA_FILE, { users: {} });
    
    if (data.users[username]) {
        return res.status(400).json({ message: 'Benutzer existiert bereits' });
    }
    
    data.users[username] = { pokeCoins: 100, cards: [] };
    saveData(DATA_FILE, data);
    res.json({ message: 'Registrierung erfolgreich', user: data.users[username] });
});

// Login
app.post('/login', (req, res) => {
    const { username } = req.body;
    let data = loadData(DATA_FILE, { users: {} });
    
    if (!data.users[username]) {
        return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }
    
    res.json({ message: 'Login erfolgreich', user: data.users[username] });
});

// Booster-Pack kaufen
app.post('/buy-booster', (req, res) => {
    const { username, packType } = req.body;
    let data = loadData(DATA_FILE, { users: {} });
    
    if (!data.users[username]) {
        return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }
    
    const packPrices = { common: 50, rare: 100, epic: 200, legendary: 500 };
    if (!packPrices[packType] || data.users[username].pokeCoins < packPrices[packType]) {
        return res.status(400).json({ message: 'Nicht genug PokeCoins oder ungültiges Pack' });
    }
    
    data.users[username].pokeCoins -= packPrices[packType];
    let availableCards = cardsData.cards.filter(card => card.rarity === packType);
    let newCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    data.users[username].cards.push(newCard);
    saveData(DATA_FILE, data);
    res.json({ message: 'Booster-Pack gekauft', packImage: newCard.packImage, user: data.users[username] });
});

// Booster-Pack verkaufen
app.post('/sell-booster', (req, res) => {
    const { username, packType } = req.body;
    let data = loadData(DATA_FILE, { users: {} });
    
    if (!data.users[username]) {
        return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }
    
    const packSellValues = { common: 25, rare: 50, epic: 100, legendary: 250 };
    const cardIndex = data.users[username].cards.findIndex(card => card.rarity === packType);
    
    if (cardIndex === -1) {
        return res.status(400).json({ message: 'Kein passendes Pack zum Verkaufen' });
    }
    
    data.users[username].cards.splice(cardIndex, 1);
    data.users[username].pokeCoins += packSellValues[packType];
    saveData(DATA_FILE, data);
    res.json({ message: 'Booster-Pack verkauft', user: data.users[username] });
});

// NEU: Karte verkaufen
app.post('/sell-card', (req, res) => {
    const { username, cardName } = req.body;
    let data = loadData(DATA_FILE, { users: {} });
    
    if (!data.users[username]) {
        return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }
    
    const cardIndex = data.users[username].cards.findIndex(card => card.name === cardName);
    
    if (cardIndex === -1) {
        return res.status(400).json({ message: 'Karte nicht gefunden' });
    }
    
    const cardValue = 25; // Beispielwert für den Verkauf
    data.users[username].cards.splice(cardIndex, 1);
    data.users[username].pokeCoins += cardValue;
    saveData(DATA_FILE, data);
    res.json({ message: 'Karte verkauft', user: data.users[username] });
});

// Kartenbuch: Alle Karten anzeigen
app.get('/cards/all', (req, res) => {
    let data = loadData(CARDS_FILE, { cards: [] });
    res.json({ cards: data.cards });
});

// Kartenbuch: Eigene Karten anzeigen
app.get('/cards/:username', (req, res) => {
    let data = loadData(DATA_FILE, { users: {} });
    const { username } = req.params;
    if (!data.users[username]) {
        return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }
    res.json({ cards: data.users[username].cards });
});

// NEU: Kampf-Logik
app.post('/battle', (req, res) => {
    const { playerCard, aiCard } = req.body;

    // Simuliere den Kampf
    while (playerCard.health > 0 && aiCard.health > 0) {
        const damageToAI = Math.floor(Math.random() * playerCard.attack);
        aiCard.health -= damageToAI;

        if (aiCard.health <= 0) {
            return res.json({ winner: 'player', message: `${playerCard.name} hat gewonnen!` });
        }

        const damageToPlayer = Math.floor(Math.random() * aiCard.attack);
        playerCard.health -= damageToPlayer;

        if (playerCard.health <= 0) {
            return res.json({ winner: 'ai', message: `${aiCard.name} hat gewonnen!` });
        }
    }
});

// Endpoint zum Aktualisieren der PokeCoins
app.post('/update-pokecoins', (req, res) => {
    const { username, amount } = req.body;
    let data = loadData(DATA_FILE, { users: {} });
    
    if (!data.users[username]) {
        return res.status(400).json({ message: 'Benutzer nicht gefunden' });
    }
    
    // Aktualisiere die PokeCoins
    data.users[username].pokeCoins += amount;
    saveData(DATA_FILE, data);
    res.json({ message: 'PokeCoins aktualisiert', user: data.users[username] });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});