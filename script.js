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

        // Крок 5: головний елемент запису — li
        const li = document.createElement('li');
        li.className = 'transaction';

        // Крок 6: атрибут data-amount — через dataset, зберігає суму операції
        li.dataset.amount = op.amount;

        // Крок 6: умовний клас за типом операції ('дохід' → income, 'витрата' → expense)
        li.classList.add(modifier);

        // Крок 5: сума — текстовий вузол, колір дає клас income/expense на li
        li.appendChild(document.createTextNode(`${op.amount} грн (`));

        // Крок 5: тип — у наявному кольоровому бейджі .category
        const typeSpan = document.createElement('span');
        typeSpan.className = `category category--${modifier}`;
        typeSpan.textContent = op.type;
        li.appendChild(typeSpan);

        li.appendChild(document.createTextNode(')'));

        // li.textContent при цьому все одно дорівнює "25 грн (витрата)" —
        // властивість підсумовує текст усіх дочірніх вузлів

        // Крок 7: додаємо щойно створений li у контейнер —
        // усередині циклу, окремо для кожного елемента масиву
        listContainer.append(li);
    });
}

// Крок 8: виклик рендеру одразу після оголошення функції —
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

// Крок 9: оновлюємо вже наявний елемент #balance: текст і клас
// залежно від знаку підсумкового балансу
const balanceElement = document.querySelector('#balance');
balanceElement.textContent = `${totalBalance} грн`;
balanceElement.classList.toggle('balance--positive', totalBalance >= 0);
balanceElement.classList.toggle('balance--negative', totalBalance < 0);