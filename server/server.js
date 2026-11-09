// Обрано Express: він спрощує опис маршрутів, розбір параметрів запиту
// та формування JSON-відповідей.
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Крок 7: тека з клієнтською частиною (index.html, CSS, JS з попередніх практикумів).
// '..' означає теку expense-tracker, що лежить на рівень вище за server/
const CLIENT_DIR = path.join(__dirname, '..');

// Крок 4: локальні дані читаємо з JSON-файлу один раз при старті сервера
const DATA_FILE = path.join(__dirname, 'data', 'transactions.json');
const transactions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Крок 6: GET /api/transactions?category=Їжа — фільтр за категорією на сервері.
// Без параметра повертається весь список (Крок 5)
app.get('/api/transactions', (req, res) => {
    const { category } = req.query;

    // параметра немає або він порожній — віддаємо все
    if (category === undefined || category === '') {
        return res.json(transactions);
    }

    // ?category=a&category=b дає масив — такий запит некоректний
    if (typeof category !== 'string') {
        return res.status(400).json({ error: 'Параметр category має бути одним значенням' });
    }

    // порівнюємо без урахування регістру й зайвих пробілів
    const wanted = category.trim().toLowerCase();
    const filtered = transactions.filter(
        item => item.category.toLowerCase() === wanted
    );

    // Якщо жодної транзакції цієї категорії немає, повертаємо 404 (вимога кроку 6)
    if (filtered.length === 0) {
        return res.status(404).json({ error: `Транзакцій категорії «${category}» не знайдено` });
    }

    res.json(filtered);
});

// Крок 7: статичні файли клієнта віддаються з того самого сервера, що й API.
// Підключаємо після API-маршрутів, щоб статика не перекривала ендпоінти
app.use(express.static(CLIENT_DIR));

// Невідомі адреси під /api повертають 404 у форматі JSON
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ресурс не знайдено' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущено: http://localhost:${PORT}`);
});