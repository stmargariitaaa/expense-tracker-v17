// URL ендпоінта винесено в окрему константу 
// зручно змінювати в одному місці, не шукаючи по всьому файлу
//const API_URL = 'https://doesnotexist';
const API_URL = 'https://jsonplaceholder.typicode.com/comments?postId=2';
// Видаляємо статичні li-приклади,
// щоб продемонструвати динамічне видалення через DOM
document.querySelectorAll('#transactions-list .transaction').forEach(el => el.remove());

// Масив операцій варіанта: сума та тип ('дохід' або 'витрата')
const operations = [
    { amount: 25, type: 'витрата' },
    { amount: 100, type: 'дохід' }
];

// Контейнер, у який програмно додаватимуться елементи операцій
const listContainer = document.querySelector('#transactions-list');

// Рендерить список операцій: циклом forEach проходить масив
// і для кожної операції створює li з сумою та типом (Кроки 4-7)
function renderOperations(ops) {
    ops.forEach(op => {
        const isIncome = op.type === 'дохід';
        const modifier = isIncome ? 'income' : 'expense';

        // головний елемент запису — li
        const li = document.createElement('li');
        li.className = 'transaction';

        // атрибут data-amount — через dataset, зберігає суму операції
        li.dataset.amount = op.amount;

        // умовний клас за типом операції ('дохід' → income, 'витрата' → expense)
        li.classList.add(modifier);

        // сума — текстовий вузол, колір дає клас income/expense на li
        li.appendChild(document.createTextNode(`${op.amount} грн (`));

        // тип — у наявному кольоровому бейджі .category
        const typeSpan = document.createElement('span');
        typeSpan.className = `category category--${modifier}`;
        typeSpan.textContent = op.type;
        li.appendChild(typeSpan);

        li.appendChild(document.createTextNode(')'));

        // li.textContent при цьому все одно дорівнює "25 грн (витрата)" —
        // властивість підсумовує текст усіх дочірніх вузлів

        // додаємо щойно створений li у контейнер —
        // усередині циклу, окремо для кожного елемента масиву
        listContainer.append(li);
    });
}

// виклик рендеру одразу після оголошення функції —
// список з'являється на сторінці при завантаженні
renderOperations(operations);

// Підсумовує баланс циклом for (дохід додає, витрата віднімає)
// і через if/else позначає, чи баланс додатний
function calculateBalance(ops) {
    let balance = 0;

    for (let i = 0; i < ops.length; i++) {
        if (ops[i].type === 'дохід') {
            balance += ops[i].amount;
        } else if (ops[i].type === 'витрата') {
            balance -= ops[i].amount;
        }
    }

    if (balance >= 0) {
        console.log(`Підсумковий баланс: ${balance} грн (додатний)`);
    } else {
        console.log(`Підсумковий баланс: ${balance} грн (від'ємний)`);
    }

    return balance;
}

const totalBalance = calculateBalance(operations);

// Стрілкова функція: обчислює, скільки відсотків становить
// частина (part) від загальної суми (total)
const toPercent = (part, total) => Math.round(part / total * 100);

// Приклад виклику toPercent з реальними даними:
// скільки відсотків витрата "25 грн" становить від доходу "100 грн"
const expensePercentOfIncome = toPercent(25, 100);
console.log(`Витрата становить ${expensePercentOfIncome}% від доходу`);

// оновлюємо вже наявний елемент #balance: текст і клас
// залежно від знаку підсумкового балансу
const balanceElement = document.querySelector('#balance');
balanceElement.textContent = `${totalBalance} грн`;
balanceElement.classList.toggle('balance--positive', totalBalance >= 0);
balanceElement.classList.toggle('balance--negative', totalBalance < 0);

// вибираємо форму додавання операції за її id
const form = document.querySelector('#transaction-form');

// власна перевірка поля amount понад стандартний required/min —
// спрацьовує на кожне введення (подія input), ще до спроби відправити форму
const amountInput = document.querySelector('#amount');
const amountError = document.querySelector('#amount-error');

amountInput.addEventListener('input', function () {
    const currentValue = Number(amountInput.value);

    if (currentValue <= 0) {
        const message = 'Сума має бути більшою за нуль';
        amountInput.setCustomValidity(message);
        amountError.textContent = message;
    } else {
        amountInput.setCustomValidity('');
        amountError.textContent = '';
    }
});

form.addEventListener('submit', function (event) {
    // скасовуємо стандартну поведінку браузера (перезавантаження сторінки),
    // бо дані форми обробляються власним JS, а не надсилаються на сервер
    event.preventDefault();

    // зчитуємо значення полів форми через .value;
    // amount приводимо до числа через Number(), бо .value завжди рядок
    const amountValue = Number(form.querySelector('#amount').value);
    const typeValue = form.querySelector('#type').value;
    const categoryValue = form.querySelector('#category').value;

    // формуємо новий об'єкт тієї самої форми {amount, type},
    // що й елементи масиву operations (практикум 6), і додаємо його в масив;
    // category зберігаємо в даних для повноти, навіть якщо в li вона не відображається
    const newOperation = { amount: amountValue, type: typeValue, category: categoryValue };
    operations.push(newOperation);

    // перемальовуємо список — очищуємо контейнер, щоб уникнути
    // дублювання вже показаних li, і викликаємо renderOperations
    // повторно з оновленим масивом operations
    listContainer.innerHTML = '';
    renderOperations(operations);

    // очищуємо форму після успішного додавання операції —
    // усі поля повертаються до початкового (порожнього) стану
    form.reset();

    // перераховуємо й одразу оновлюємо підсумковий баланс
    // після додавання нової операції (той самий принцип, що в практикумі 7)
    const updatedBalance = calculateBalance(operations);
    balanceElement.textContent = `${updatedBalance} грн`;
    balanceElement.classList.toggle('balance--positive', updatedBalance >= 0);
    balanceElement.classList.toggle('balance--negative', updatedBalance < 0);
});

// вибираємо select фільтра списку операцій за типом
const filterSelect = document.querySelector('#filter-type');

// подія change на select — друга подія варіанта, фільтрація списку за типом
filterSelect.addEventListener('change', function () {
    const selectedType = filterSelect.value;

    // якщо вибрано "Усі" — показуємо весь масив, інакше лишаємо
    // лише операції з типом, що відповідає вибраному фільтру
    const filteredOperations = selectedType === 'all'
        ? operations
        : operations.filter(op => op.type === selectedType);

    listContainer.innerHTML = '';
    renderOperations(filteredOperations);
});


// вибираємо елемент-індикатор завантаження та помилки, перезавантаження
const loadingIndicator = document.querySelector('#loading-indicator');
const loadError = document.querySelector('#load-error');
const retryButton = document.querySelector('#retry-button');
const refreshButton = document.querySelector('#refresh-button');


// async-функція запиту даних з API 
// містить увесь цикл: fetch -> очікування відповіді -> парсинг JSON -> виведення результату
async function loadData() {

    // показуємо індикатор одразу перед початком запиту,
    // до виклику fetch — користувач бачить, що завантаження почалося
    loadingIndicator.hidden = false;
    // перед новою спробою ховаємо попереднє повідомлення про помилку —
    // якщо раніше був збій, а зараз запит повторюється, старе повідомлення не має лишатись
    loadError.hidden = true;
    loadError.textContent = '';
    retryButton.hidden = true;

    try {
        // виконуємо запит і чекаємо відповідь усередині try
        const response = await fetch(API_URL);

        // fetch не кидає помилку сам на 404/500 — перевіряємо response.ok вручну;
        // якщо статус не в діапазоні 200-299, кидаємо власну помилку з описовим повідомленням
        if (!response.ok) {
            throw new Error(`Помилка завантаження даних: HTTP ${response.status}`);
        }

        // розбираємо тіло відповіді як JSON
        // отримуємо масив об'єктів-коментарів зі структурою { postId, id, name, email, body }
        const data = await response.json();

        // адаптуємо поля відповіді API під форму об'єкта операції
        // яку очікує renderOperations (amount, type) з практикуму 7
        // Варіант визначає: name - призначення витрати, body - коментар
        // власного числового поля "сума" API не повертає, тому як умовну суму
        // використано id запису (унікальне ціле число) - прийнятно для мок-даних
        const apiOperations = data.map(comment => ({
            amount: comment.id,
            type: 'витрата',
            category: comment.name,
            comment: comment.body
        }));

        listContainer.innerHTML = '';
        renderOperations(apiOperations);
            } catch (error) {
                // користувачу — зрозуміле повідомлення без технічних деталей винятку
                // розробнику — повний текст помилки в консоль
                loadError.textContent = 'Не вдалося завантажити операції. Спробуйте оновити сторінку пізніше.';
                loadError.hidden = false;
                retryButton.hidden = false;
                console.error('Помилка завантаження даних:', error);
            } finally {
        // ховаємо індикатор у finally — цей блок виконується
        // завжди, незалежно від того, чи try завершився успішно, чи впав у catch
        loadingIndicator.hidden = true;
    }
}

retryButton.addEventListener('click', loadData);

// кнопка "Оновити" — дозволяє користувачу повторно
// викликати loadData() вручну в будь-який момент, без перезавантаження сторінки
refreshButton.addEventListener('click', loadData);

// викликаємо функцію одразу, щоб перевірити роботу запиту
loadData();

// Бонус: конвертація суми в іншу валюту через Frankfurter API
// Документація: https://api.frankfurter.app/
const CONVERT_API_URL = 'https://api.frankfurter.dev/v1/latest';

const convertForm = document.querySelector('#convert-form');
const convertAmount = document.querySelector('#convert-amount');
const convertFrom = document.querySelector('#convert-from');
const convertTo = document.querySelector('#convert-to');
const convertLoading = document.querySelector('#convert-loading');
const convertResult = document.querySelector('#convert-result');
const convertError = document.querySelector('#convert-error');


// Frankfurter не підтримує гривню, тому для пар з UAH беремо офіційний курс НБУ
const NBU_API_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange';

// повертає курс іноземної валюти до гривні: { rate, date }
async function getNbuRate(code) {
    const response = await fetch(`${NBU_API_URL}?valcode=${code}&json`);
    if (!response.ok) {
        throw new Error(`Помилка НБУ: HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.length === 0) {
        throw new Error(`НБУ не повернув курс для ${code}`);
    }
    return { rate: data[0].rate, date: data[0].exchangedate };
}


async function convertCurrency(event) {
    event.preventDefault();

    const amount = convertAmount.value;
    const from = convertFrom.value;
    const to = convertTo.value;

    // очищаємо попередній результат і помилку
    convertResult.textContent = '';
    convertError.hidden = true;

    // API повертає помилку, якщо валюти однакові, — перевіряємо наперед
    if (from === to) {
        convertError.textContent = 'Оберіть різні валюти для конвертації.';
        convertError.hidden = false;
        return;
    }

    convertLoading.hidden = false;

        try {
            if (from === 'UAH' || to === 'UAH') {
                // пара з гривнею: курс НБУ (скільки гривень коштує одиниця іноземної валюти)
                const foreign = from === 'UAH' ? to : from;
                const { rate, date } = await getNbuRate(foreign);
                const converted = from === 'UAH'
                    ? Number(amount) / rate
                    : Number(amount) * rate;

                convertResult.textContent =
                    `${amount} ${from} = ${converted.toFixed(2)} ${to} (курс НБУ на ${date})`;
            } else {
                // решта пар: Frankfurter API
                const url = `${CONVERT_API_URL}?amount=${amount}&from=${from}&to=${to}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Помилка конвертації: HTTP ${response.status}`);
                }

                const data = await response.json();
                const converted = data.rates[to];

                convertResult.textContent =
                    `${data.amount} ${data.base} = ${converted} ${to} (курс на ${data.date})`;
            }
        } catch (error) {
            convertError.textContent = 'Не вдалося виконати конвертацію. Спробуйте пізніше.';
            convertError.hidden = false;
            console.error('Помилка конвертації:', error);
        } finally {
            convertLoading.hidden = true;
        }
}

convertForm.addEventListener('submit', convertCurrency);
