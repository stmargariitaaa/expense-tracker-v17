// обрано Vue, бо computed-властивість дозволяє автоматично перераховувати
// підсумковий баланс при зміні списку операцій без ручного виклику calculateBalance().

// масив операцій варіанта перенесено в реактивний стан застосунку —
// у data() кореневого компонента, а не у звичайну зовнішню змінну
const { createApp } = Vue;

const app = createApp({
    // data() — функція, що повертає об'єкт стану; Vue робить його реактивним
    data() {
        return {
            // поля відповідають props компонента ExpenseRow: amount, type, category
            // id — унікальний ідентифікатор для :key у v-for
            operations: [
                { id: 1, amount: 25, type: 'витрата', category: 'Транспорт' },
                { id: 2, amount: 100, type: 'дохід', category: 'Зарплата' }
            ]
        };
    },

    // похідне значення: підсумковий баланс = доходи − витрати;
    // перераховується автоматично при будь-якій зміні operations
    computed: {
        balance() {
            const total = this.operations.reduce(
                (sum, op) => op.type === 'дохід' ? sum + op.amount : sum - op.amount,
                0
            );
            // округлення до копійок, щоб уникнути артефактів дробових чисел
            return Math.round(total * 100) / 100;
        }
    },
    
    methods: {
        // обробник події delete від дочірнього компонента:
        // замість мутації масиву на місці присвоюємо стану новий масив без видаленої операції
        removeOperation(id) {
            this.operations = this.operations.filter(op => op.id !== id);
            console.log('Видалено операцію з id:', id);
        }
    }
});

// компонент ExpenseRow — один рядок операції.
// Дані отримує лише через props і не звертається до глобальних змінних
// (operations, listContainer тощо) — усе потрібне йому передає батьківський компонент.
// Реєструємо до mount(), інакше Vue не знатиме про цей компонент.
app.component('ExpenseRow', {
    props: {
        amount: { type: Number, required: true },
        type: {
            type: String,
            required: true,
            // допустимі лише два типи операції варіанта
            validator: value => ['дохід', 'витрата'].includes(value)
        },
        category: { type: String, required: true }
    },
    // оголошуємо події, які компонент може надсилати батьківському
    emits: ['delete'],
    computed: {
        // модифікатор класу за типом: 'дохід' → income, 'витрата' → expense
        modifier() {
            return this.type === 'дохід' ? 'income' : 'expense';
        }
    },
    
    // повторно використано наявні класи з style.css:
    // .transaction.income/.expense і бейдж .category--income/.category--expense
    template: `
        <li class="transaction" :class="modifier">
            {{ amount }} грн
            (<span class="category" :class="'category--' + modifier">{{ type }}</span>)
            — {{ category }}
            <button type="button" class="expense-row__delete" @click="$emit('delete')">Видалити</button>
        </li>
    `
});

// монтуємо застосунок у контейнер #app; mount повертає екземпляр кореневого компонента
const vm = app.mount('#app');

// перевірка: стан доступний через екземпляр і є реактивним
console.log('Реактивний стан:', vm.operations);