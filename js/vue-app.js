// обрано Vue, бо computed-властивість дозволяє автоматично перераховувати
// підсумковий баланс при зміні списку операцій без ручного виклику calculateBalance().

// масив операцій варіанта перенесено в реактивний стан застосунку —
// у data() кореневого компонента, а не у звичайну зовнішню змінну
const { createApp } = Vue;

// повідомлення користувачу, якщо базу відкрити не вдалося
// (IndexedDB недоступна, наприклад, у деяких режимах приватного перегляду)
const DB_ERROR_MESSAGE = 'Не вдалося відкрити локальну базу даних, тому операції не можна завантажити чи зберегти. Можливо, браузер блокує сховище (наприклад, у режимі приватного перегляду). Спробуйте звичайне вікно браузера.';

// скільки останніх операцій показувати на головній сторінці
const RECENT_LIMIT = 10;

const app = createApp({
    data() {
        return {
            // чи завершилось перше читання з IndexedDB (щоб до цього не показувати «не знайдено»)
            loaded: false,
            // джерело даних — IndexedDB; масив заповнює метод refresh()
            operations: [],
            // текст помилки бази для користувача (порожній — помилки немає)
            dbError: '',
            // індекс сектора під курсором (−1 — курсор не на секторі)
            hoveredIndex: -1
            
        };
    },

    computed: {
        // Крок 5: поточна сторінка з js/router.js (реактивний об'єкт currentPage)
        route() {
            return currentPage;
        },

        // похідне значення: підсумковий баланс = доходи − витрати;
        // перераховується автоматично при будь-якій зміні operations
        balance() {
            const total = this.operations.reduce(
                (sum, op) => op.type === 'дохід' ? sum + op.amount : sum - op.amount,
                0
            );
            // округлення до копійок, щоб уникнути артефактів дробових чисел
            return Math.round(total * 100) / 100;
        },

        // суми витрат за категоріями; перераховується автоматично при зміні operations
        categoryTotals() {
            return getCategoryTotals(this.operations);
        },

        // Крок 5, маршрут «/»: найновіші операції (більший id — пізніше додана)
        recentOperations() {
            return [...this.operations]
                .sort((a, b) => b.id - a.id)
                .slice(0, RECENT_LIMIT);
        },

        // Крок 5, маршрут «/category/:category»: витрати категорії з параметра маршруту
        categoryOperations() {
            return this.operations
                .filter(op => op.type === 'витрата' && op.category === this.route.params.category)
                .sort((a, b) => b.id - a.id);
        },

        // сума витрат поточної категорії
        categorySum() {
            const total = this.categoryOperations.reduce((sum, op) => sum + op.amount, 0);
            return Math.round(total * 100) / 100;
        },

        // Крок 8, маршрут «/transaction/:id»: запис, id якого збігається з параметром
        // маршруту (параметр — рядок, тому порівнюємо як рядки); undefined — запису немає
        currentTransaction() {
            return this.operations.find(op => String(op.id) === this.route.params.id);
        },

        // підпис під діаграмою: категорія, сума й частка від усіх витрат
        hoverText() {
            const item = this.categoryTotals[this.hoveredIndex];
            if (!item) {
                return 'Наведіть курсор на сектор, щоб побачити категорію.';
            }
            const total = this.categoryTotals.reduce((sum, i) => sum + i.total, 0);
            const percent = Math.round((item.total / total) * 100);
            return `${item.category}: ${item.total} грн (${percent}%)`;
        }
    },

    watch: {
        // Крок 5: при зміні сторінки дані перечитуються з IndexedDB;
        // полотно діаграми існує лише на сторінці статистики, тому спостерігач
        // за його видимістю підключається при вході на неї й знімається при виході
        'route.page'(page) {
            this.refresh();
            if (page === 'stats') {
                // чекаємо, поки Vue створить <canvas>
                this.$nextTick(() => {
                    watchChartVisibility(this.$refs.chart);
                    this.drawChart();
                });
            } else {
                unwatchChart();
            }
        },

        // анімація прив'язана до змін даних застосунку.
        // Ланцюжок: подія користувача (додавання чи видалення операції)
        //   → refresh() оновлює operations → перераховується categoryTotals
        //   → цей спостерігач запускає анімацію діаграми.
        // Нове й старе значення порівнюємо за змістом: computed щоразу повертає новий
        // масив, тому без порівняння анімація грала б і тоді, коли суми не змінились
        categoryTotals(newTotals, oldTotals) {
            if (JSON.stringify(newTotals) === JSON.stringify(oldTotals)) {
                return;
            }
            console.log('Розподіл витрат змінився, діаграму перемальовано:', newTotals);
            this.drawChart();
        }
    },

    // після монтування чекаємо завершення міграції (js/db.js),
    // потім завантажуємо список з IndexedDB
    async mounted() {
        await migrationDone;
        await this.refresh();
    },

    // при знищенні застосунку зупиняємо анімацію й знімаємо спостерігача
    beforeUnmount() {
        unwatchChart();
    },

    methods: {

        // діаграма будується з актуального масиву операцій;
        // полотно є лише на сторінці статистики — на інших сторінках нічого не робимо
        drawChart() {
            if (!this.$refs.chart) {
                return;
            }
            // нова анімація: виділення скидається
            this.hoveredIndex = -1;
            renderChart(this.$refs.chart, this.operations);
        },

        // рух миші над полотном — виділяємо сектор під курсором
        onChartMove(event) {
            const index = getSectorIndexAt(this.$refs.chart, event);
            // перемальовуємо лише коли курсор перейшов на інший сектор
            if (index === this.hoveredIndex) {
                return;
            }
            this.hoveredIndex = index;
            highlightSector(this.$refs.chart, index);
        },

        // курсор залишив полотно — прибираємо виділення
        onChartLeave() {
            if (this.hoveredIndex === -1) {
                return;
            }
            this.hoveredIndex = -1;
            highlightSector(this.$refs.chart, -1);
        },

        // читає всі записи з IndexedDB й оновлює стан — сторінки перемальовуються самі
        async refresh() {
            try {
                this.operations = await getAllItems();
                this.dbError = '';
            } catch (error) {
                // користувачу — зрозуміле повідомлення, розробнику — деталі в консоль
                this.dbError = DB_ERROR_MESSAGE;
                console.error('Не вдалося прочитати дані з IndexedDB:', error);
            } finally {
                this.loaded = true;
            }
        },
        
        // колір для позначки в легенді; шаблон Vue не бачить глобальних функцій
        colorFor(index) {
            return chartColor(index);
        },

        // обробник події delete від дочірнього компонента:
        // видаляємо запис у базі, потім оновлюємо список
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

        // додавання: поля amount, category, date перевіряє createTransaction() з моделі даних;
        // type потрібен списку й балансу. id не передаємо — його створить autoIncrement
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
// Дані отримує лише через props і не звертається до глобальних змінних —
// усе потрібне йому передає батьківський компонент.
// Реєструємо до mount(), інакше Vue не знатиме про цей компонент.
app.component('ExpenseRow', {
    props: {
        // id запису потрібен для посилання на сторінку деталей
        transactionId: { type: Number, required: true },
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

    // повторно використано наявні класи з style.css.
    // Категорія витрати — посилання на сторінку цієї категорії (data-link)
    template: `
        <li class="transaction" :class="modifier">
            {{ amount }} грн
            (<span class="category" :class="'category--' + modifier">{{ type }}</span>)
            — <a v-if="type === 'витрата'" :href="'#/category/' + encodeURIComponent(category)" 
            data-link>{{ category }}</a><span v-else>{{ category }}</span>
            <a :href="'#/transaction/' + transactionId" class="expense-row__details" data-link>Деталі</a>
            <button type="button" class="expense-row__delete" @click="$emit('delete')">Видалити</button>
        </li>
    `
});

// монтуємо застосунок у контейнер #app; mount повертає екземпляр кореневого компонента
const vm = app.mount('#app');

// Крок 5: показуємо сторінку, що відповідає адресі при завантаженні
renderRoute();

// перевірка: стан доступний через екземпляр і є реактивним
console.log('Реактивний стан:', vm.operations);