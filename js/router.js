// обрано hash-based роутинг, бо він не потребує локального сервера
// (працює й з file://) і не дає 404 при оновленні сторінки на статичному
// хостингу. Маршрути варіанта №17 у вигляді хешу:
//   #/                      — останні транзакції та форма додавання
//   #/category/<категорія>  — витрати за конкретною категорією
//   #/stats                 — загальна агрегація витрат за категоріями (практикум 11)


// ---------- Крок 3: таблиця маршрутів ----------

// view-функції (Крок 5): кожна показує свою сторінку через showPage().
// Розмітку сторінок виводить Vue за полем page, дані беруться з IndexedDB
function homeView() {
    showPage('home', 'Останні транзакції');
}

function categoryView(params) {
    showPage('category', `Витрати: ${params.category}`, params);
}

function statsView() {
    showPage('stats', 'Статистика витрат');
}

// запасна сторінка для адрес, яким не відповідає жоден маршрут;
// path — адреса, яку не знайдено (показується користувачу)
function notFoundView(path) {
    showPage('not-found', 'Сторінку не знайдено', { path });
}

// «/transaction/:id» — сторінка деталей однієї операції (Крок 8)
function transactionView(params) {
    showPage('transaction', `Операція №${params.id}`, params);
}

// Таблиця маршрутів застосунку: шаблон шляху → view-функція.
// Частина шляху з двокрапки (:category, :id) — параметр, його значення
// потрапляє в params. Маршрути варіанта №17: «/», «/category/:category»,
// «/stats»; маршрут «/transaction/:id» відкриває сторінку деталей операції.
// Порядок має значення: matchRoute() бере перший збіг
const routes = [
    { path: '/', view: homeView },
    { path: '/category/:category', view: categoryView },
    { path: '/stats', view: statsView },
    { path: '/transaction/:id', view: transactionView }
];

// ---------- Крок 4: зіставлення шляху з маршрутом ----------

// перетворює шаблон шляху на регулярний вираз і список імен параметрів:
// '/category/:category' → regex /^\/category\/([^/]+)$/ та keys ['category']
function compilePattern(pattern) {
    const keys = [];

    const regexBody = pattern
        .split('/')
        .map(segment => {
            // сегмент з двокрапки — параметр: збираємо його ім'я
            // і дозволяємо будь-який непорожній текст без слеша
            if (segment.startsWith(':')) {
                keys.push(segment.slice(1));
                return '([^/]+)';
            }
            // звичайний сегмент має збігатися дослівно (спецсимволи екрануємо)
            return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/');

    return { regex: new RegExp('^' + regexBody + '$'), keys };
}

// у хеші кирилиця та пробіли закодовані (%D0%87…); якщо кодування пошкоджене,
// decodeURIComponent кидає помилку — тоді лишаємо значення як є
function decodeParam(value) {
    try {
        return decodeURIComponent(value);
    } catch (error) {
        return value;
    }
}

// порівнює шлях із таблицею маршрутів.
// Повертає { route, params } для першого збігу або null, якщо маршруту немає
function matchRoute(path) {
    // нормалізація: порожній шлях — це «/», кінцевий слеш ігноруємо
    let normalized = path === '' ? '/' : path;
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    for (const route of routes) {
        const { regex, keys } = compilePattern(route.path);
        const match = normalized.match(regex);

        if (match) {
            // match[0] — увесь рядок, значення параметрів починаються з match[1]
            const params = {};
            keys.forEach((key, index) => {
                params[key] = decodeParam(match[index + 1]);
            });
            return { route, params };
        }
    }

    // жоден шаблон не підійшов
    return null;
}

 // ---------- Крок 5: показ сторінок ----------

// поточна сторінка — реактивний стан: Vue-застосунок читає його
// і перемальовує вміст контейнера #app при кожній зміні
const currentPage = Vue.reactive({ page: 'home', title: '', params: {} });

// «очищує» контейнер: змінює поточну сторінку, а Vue прибирає розмітку
// попередньої сторінки й створює нову
function showPage(page, title, params = {}) {
    currentPage.page = page;
    currentPage.title = title;
    currentPage.params = params;
    document.title = `${title} — Трекер витрат`;
    window.scrollTo(0, 0);

    // підсвічуємо пункт меню (сторінка категорії належить до розділу «Статистика»)
    const activeKey = page === 'category' ? 'stats' : page;
    document.querySelectorAll('nav a[data-page]').forEach(link => {
        if (link.dataset.page === activeKey) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// поточний шлях із хешу: '#/stats' → '/stats'; порожній хеш — це '/'
function getCurrentPath() {
    const path = location.hash.slice(1);
    return path === '' ? '/' : path;
}

// знаходить маршрут за поточною адресою й викликає його view-функцію;
// якщо маршруту немає — показує сторінку «не знайдено».
// Викликається при завантаженні та при кожній зміні хешу, зокрема
// кнопками «Назад»/«Вперед» браузера
function renderRoute() {
    const path = getCurrentPath();
    const match = matchRoute(path);

    // запис у консоль для перевірки переходів
    console.log(`Маршрут: ${path} →`, match ? match.route.path : 'не знайдено', match ? match.params : {});

    if (match) {
        match.route.view(match.params);
    } else {
        notFoundView(path);
    }
}


// будь-яка зміна хешу (посилання, адресний рядок, «Назад»/«Вперед») перемальовує сторінку
window.addEventListener('hashchange', renderRoute);

// ---------- Крок 6: клієнтська навігація ----------

// переходить на маршрут зміною хешу; зміна хешу спричиняє hashchange → renderRoute().
// Якщо адреса вже поточна, нічого не робимо
function navigate(path) {
    if (getCurrentPath() === path) {
        return;
    }
    location.hash = path;
}

// делегування: один обробник на весь документ перехоплює клік по будь-якому
// елементу з data-link, у тому числі по посиланнях, створених Vue пізніше
document.addEventListener('click', event => {
    const link = event.target.closest('[data-link]');
    if (!link) {
        return;
    }

    // Ctrl/Cmd/Shift-клік і середня кнопка відкривають посилання у новій вкладці — не заважаємо
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
        return;
    }

    // скасовуємо стандартний перехід і викликаємо клієнтську навігацію
    event.preventDefault();
    navigate(link.getAttribute('href').replace(/^#/, ''));
});