// обрано Vue, бо computed-властивість дозволяє автоматично перераховувати
// підсумковий баланс при зміні списку операцій без ручного виклику calculateBalance().

// масив операцій варіанта перенесено в реактивний стан застосунку —
// у data() кореневого компонента, а не у звичайну зовнішню змінну
const { createApp } = Vue;

// повідомлення користувачу, якщо базу відкрити не вдалося
// (IndexedDB недоступна, наприклад, у деяких режимах приватного перегляду)
const DB_ERROR_MESSAGE = 'Не вдалося відкрити локальну базу даних, тому операції не можна завантажити чи зберегти. Можливо, браузер блокує сховище (наприклад, у режимі приватного перегляду). Спробуйте звичайне вікно браузера.';

const app = createApp({
    data() {
        return {
            // джерело даних — IndexedDB; масив заповнює метод refresh()
            operations: [],
            // Крок 11: текст помилки бази для користувача (порожній — помилки немає)
            dbError: ''
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

    // після монтування чекаємо завершення міграції (js/db.js),
    // потім завантажуємо список з IndexedDB
    async mounted() {
        await migrationDone;
        await this.refresh();
    },

    methods: {

                async refresh() {
            try {
                this.operations = await getAllItems();
                this.dbError = '';
            } catch (error) {
                // користувачу — зрозуміле повідомлення, розробнику — деталі в консоль
                this.dbError = DB_ERROR_MESSAGE;
                console.error('Не вдалося прочитати дані з IndexedDB:', error);
            }
        },

        async removeOperation(id) {
            try {
                await deleteItem(id);
                await this.refresh();
                console.log('Видалено операцію з id:', id);
            } catch (error) {
                this.dbError = DB_ERROR_MESSAGE;
                console.error('Не вдалося видалити операцію:', error);
            }
        },

        async addOperation({ amount, type, category, date }) {
            const transaction = createTransaction({ amount, category, date });
            try {
                await addItem({ type, ...transaction });
                await this.refresh();
            } catch (error) {
                this.dbError = DB_ERROR_MESSAGE;
                // пробрасуємо далі: форма в script.js не очиститься,
                // і користувач не втратить введені дані
                throw error;
            }
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