// Масив операцій варіанта: сума та тип ('дохід' або 'витрата')
const operations = [
    { amount: 25, type: 'витрата' },
    { amount: 100, type: 'дохід' }
];

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
        console.log(`Підсумковий баланс: ${balance} € (додатний)`);
    } else {
        console.log(`Підсумковий баланс: ${balance} € (від'ємний)`);
    }

    return balance;
}

// Стрілкова функція: обчислює, скільки відсотків становить
// частина (part) від загальної суми (total)
const toPercent = (part, total) => Math.round(part / total * 100);

calculateBalance(operations);

// Приклад виклику toPercent з реальними даними:
// скільки відсотків витрата "25 €" становить від доходу "100 €"
const expensePercentOfIncome = toPercent(25, 100);
console.log(`Витрата становить ${expensePercentOfIncome}% від доходу`);