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