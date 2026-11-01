// IndexedDB, схема бази даних варіанта №17

// назва бази обрана довільно
const DB_NAME = 'expense-tracker-db';

// версія бази: починаємо з 1; збільшується на одиницю щоразу, коли змінюється
// структура (додається сховище чи індекс) — тоді браузер викличе onupgradeneeded
const DB_VERSION = 1;
//const DB_VERSION = 0;

// сховище (object store) та його ключ задає варіант:
// "transactions", keyPath 'id', autoIncrement: true
const STORE_NAME = 'transactions';
const STORE_OPTIONS = { keyPath: 'id', autoIncrement: true };

/*
 Схема:
   база        expense-tracker-db, версія 1
   сховище     transactions
   ключ        id — поле самого запису (keyPath), число; значення створює
               IndexedDB (autoIncrement), тому в новий запис id не передаємо
   записи      { id, amount, category, date } — модель з Кроку 1
   індекси     не потрібні: підрахунок сум за категоріями виконується на клієнті
               над масивом, отриманим усіх записів одразу
*/

/*
 Модель одного запису (транзакція — витрата), використовувалась у практикумах 6-9:
   id       — число, унікальний ідентифікатор. Його створює сама IndexedDB
              (сховище з keyPath: 'id' та autoIncrement: true), тому в новому
              об'єкті до збереження поля id немає — воно з'явиться після додавання
   amount   — число, сума витрати (більше нуля)
   category — рядок, категорія витрати (наприклад, 'Транспорт')
   date     — рядок у форматі 'YYYY-MM-DD' (так само, як value поля input type="date")

 Приклад запису після збереження:
   { id: 1, amount: 25, category: 'Транспорт', date: '2026-11-01' }
*/

// створює об'єкт нової транзакції за моделлю (без id — його присвоїть база)
function createTransaction({ amount, category, date }) {
    if (typeof amount !== 'number' || !(amount > 0)) {
        throw new Error('amount має бути числом більше нуля');
    }
    if (typeof category !== 'string' || category.trim() === '') {
        throw new Error('category має бути непорожнім рядком');
    }
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error("date має бути рядком у форматі 'YYYY-MM-DD'");
    }
    return { amount, category: category.trim(), date };
}

// збереження в localStorage
// localStorage зберігає лише рядки, тому масив об'єктів перетворюємо
// на JSON-рядок при записі й назад — при читанні
const LOCAL_STORAGE_KEY = 'expense-tracker-transactions';

// зберігає масив транзакцій у localStorage; повертає true при успіху.
// try/catch потрібен, бо setItem може кинути помилку (переповнене сховище,
// заборонений доступ до localStorage у режимі приватності тощо)
function saveToLocalStorage(items) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
        return true;
    } catch (error) {
        console.error('Не вдалося зберегти дані в localStorage:', error);
        return false;
    }
}

// читає масив транзакцій із localStorage;
// якщо даних ще немає або рядок пошкоджений — повертає порожній масив
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

        // ключа ще немає (перший запуск) — це не помилка
        if (raw === null) {
            return [];
        }

        // JSON.parse кидає SyntaxError, якщо рядок не є коректним JSON
        const parsed = JSON.parse(raw);

        // очікуємо саме масив; будь-що інше вважаємо пошкодженими даними
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Не вдалося прочитати дані з localStorage:', error);
        return [];
    }
}

// відкриття бази IndexedDB
// API IndexedDB працює через події (onsuccess, onerror), тому обгортаємо його
// в Promise — так результат можна чекати через then або await
function openDB() {

    // у частині браузерів IndexedDB відсутня або заблокована
    // (наприклад, у деяких режимах приватного перегляду)
    if (!window.indexedDB) {
        return Promise.reject(new Error('IndexedDB недоступна в цьому браузері'));
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // спрацьовує, коли бази ще немає або DB_VERSION більша за збережену:
        // єдине місце, де можна створювати й змінювати object store
        request.onupgradeneeded = () => {
            const db = request.result;

            // перевірка потрібна, щоб не створювати сховище вдруге при оновленні версії
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, STORE_OPTIONS);
            }
        };

        // база відкрита (і створена, якщо це був перший запуск) — віддаємо з'єднання
        request.onsuccess = () => {
            const db = request.result;

            // якщо в іншій вкладці вимагається нова версія схеми,
            // закриваємо це з'єднання, щоб не блокувати оновлення
            db.onversionchange = () => db.close();

            resolve(db);
        };

        // не вдалося відкрити базу (немає доступу, заборонено в приватному режимі тощо)
        request.onerror = () => reject(request.error);

        // інша вкладка тримає з'єднання зі старою версією — запит чекатиме,
        // поки її закриють; це лише попередження, а не помилка
        request.onblocked = () => {
            console.warn('Відкриття бази заблоковано іншою вкладкою зі старою версією.');
        };
    });
}

// CRUD-функції для сховища transactions
// Кожна операція виконується у власній транзакції:
// 'readwrite' — для змін (add, put, delete), 'readonly' — лише для читання.

// відкриває базу, виконує одну операцію над сховищем і повертає її результат
// після завершення транзакції (oncomplete) — тоді зміни вже гарантовано збережені
async function runTransaction(mode, operation) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = operation(tx.objectStore(STORE_NAME));

        tx.oncomplete = () => {
            db.close();
            resolve(request.result);
        };
        // помилка запиту спливає до транзакції; abort — транзакцію скасовано
        tx.onerror = () => {
            db.close();
            reject(tx.error || request.error);
        };
        tx.onabort = () => {
            db.close();
            reject(tx.error);
        };
    });
}

// додає новий запис; id не передаємо — його створює autoIncrement.
// Повертає присвоєний id. Якщо запис з таким id уже є — помилка ConstraintError
function addItem(item) {
    return runTransaction('readwrite', store => store.add(item));
}

// оновлює наявний запис за id (put замінює запис із тим самим ключем).
// Без id put створив би новий запис, тому вимагаємо id явно
function updateItem(item) {
    if (item.id === undefined) {
        return Promise.reject(new Error('updateItem: потрібне поле id'));
    }
    return runTransaction('readwrite', store => store.put(item));
}

// повертає масив усіх записів сховища (для клієнтської агрегації за категоріями)
function getAllItems() {
    return runTransaction('readonly', store => store.getAll());
}

// видаляє запис за id
function deleteItem(id) {
    return runTransaction('readwrite', store => store.delete(id));
}

// одноразова міграція даних із localStorage в IndexedDB
// Прапорець у localStorage означає: IndexedDB уже основне сховище,
// і старі дані повторно не переносяться
const MIGRATION_FLAG_KEY = 'expense-tracker-migrated';

// повертає кількість перенесених записів (0 — міграція не виконувалась)
async function migrateFromLocalStorage() {
    // уже мігрували раніше — виходимо
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
        return 0;
    }

    // у сховищі вже є дані: переносити нічого, але ставимо прапорець,
    // щоб старі дані з localStorage не повернулися, якщо сховище потім спорожніє
    const existing = await getAllItems();
    if (existing.length > 0) {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
        return 0;
    }

    // сховище порожнє: дивимось, чи є що переносити
    const legacyItems = loadFromLocalStorage();
    if (legacyItems.length === 0) {
        return 0;
    }

    try {
        // записи переносяться як є (разом з id), id продовжить autoIncrement
        for (const item of legacyItems) {
            await addItem(item);
        }
    } catch (error) {
        // частковий перенос не лишаємо: очищаємо сховище,
        // щоб наступний запуск почав міграцію з нуля
        await runTransaction('readwrite', store => store.clear());
        throw error;
    }

    // позначаємо, що міграцію виконано; дані в localStorage лишаємо як резервну копію
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return legacyItems.length;
}

// запуск міграції при завантаженні сторінки; проміс зберігаємо в migrationDone,
// щоб інтерфейс (Крок 9) міг дочекатися її завершення перед читанням списку
const migrationDone = migrateFromLocalStorage()
    .then(count => {
        console.log(count > 0
            ? `Міграція: перенесено записів — ${count}`
            : 'Міграція не потрібна або вже виконана');
    })
    .catch(error => console.error('Помилка міграції:', error));


// запуск міграції при завантаженні сторінки
migrateFromLocalStorage()
    .then(count => {
        console.log(count > 0
            ? `Міграція: перенесено записів — ${count}`
            : 'Міграція не потрібна або вже виконана');
    })
    .catch(error => console.error('Помилка міграції:', error));