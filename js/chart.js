// Крок 1: обрано Canvas. Варіант №17 вимагає кругову діаграму розподілу витрат
// за категоріями, сектори якої малюються програмно через ctx.arc() за даними
// агрегації з практикуму 11. CSS-анімація не підходить, бо не вміє будувати
// діаграму з довільних даних.

// ---------- налаштування ----------

// кольори секторів; береться за індексом категорії, а коли категорій більше,
// ніж кольорів, палітра повторюється (index % довжина)
const CHART_COLORS = ['#0f766e', '#f97316', '#be123c', '#4f46e5',
                      '#ca8a04', '#0891b2', '#9333ea', '#65a30d'];

const ANIMATION_DURATION = 800;   // тривалість появи діаграми, мс

// ---------- стан модуля ----------

let animationId = null;           // id запланованого кадру (null — анімація не йде)
let currentItems = [];            // дані, показані на діаграмі зараз (для пошуку сектора мишею)
let lastOperations = [];          // останній масив операцій (для відновлення анімації)
let chartVisible = true;          // чи видно полотно на екрані
let chartInterrupted = false;     // чи була анімація зупинена виходом полотна з екрана
let chartObserver = null;         // IntersectionObserver, що стежить за видимістю полотна

// ---------- допоміжні функції ----------

// колір категорії за її позицією в списку; один і той самий для сектора
// діаграми й для позначки в легенді, тому вони завжди збігаються
function chartColor(index) {
    return CHART_COLORS[index % CHART_COLORS.length];
}

// Крок 3: отримує 2D-контекст малювання; повертає null, якщо Canvas недоступний.
// Контекст (ctx) — об'єкт, через який виконуються всі команди малювання
function getChartContext(canvas) {
    if (!canvas || !canvas.getContext) {
        console.error('Елемент canvas недоступний або не підтримується');
        return null;
    }
    return canvas.getContext('2d');
}

// центр і радіус кола; використовуються і для малювання, і для пошуку сектора мишею
function getChartGeometry(canvas) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return { cx, cy, radius: Math.min(cx, cy) - 16 };
}

// ---------- малювання ----------

// малює один кадр кругової діаграми за масивом [{ category, total }, ...].
// progress (0..1) — яка частина кола вже намальована: 0 — порожньо, 1 — повне коло.
// highlightIndex — індекс сектора, який виділяється (−1 — жодного).
// Полотно тут не очищується: це робить код, що викликає функцію
function drawPieChart(canvas, items, progress = 1, highlightIndex = -1) {
    const ctx = getChartContext(canvas);
    if (!ctx) {
        return;
    }

    // сума всіх витрат визначає, яку частку кола займає кожна категорія
    const total = items.reduce((sum, item) => sum + item.total, 0);

    // даних немає: замість діаграми показуємо напис
    if (total <= 0) {
        ctx.fillStyle = '#736D64';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Немає витрат для діаграми', canvas.width / 2, canvas.height / 2);
        return;
    }

    const { cx, cy, radius } = getChartGeometry(canvas);

    // скільки радіан кола дозволено намалювати в цьому кадрі
    const maxAngle = progress * 2 * Math.PI;
    let drawn = 0;

    // перший сектор починається вгорі (−90°), далі йдемо за годинниковою стрілкою
    let startAngle = -Math.PI / 2;

    items.forEach((item, index) => {
        // повний кут сектора пропорційний частці категорії: частка × 2π
        const fullAngle = (item.total / total) * 2 * Math.PI;
        // у поточному кадрі сектор може бути намальований лише частково
        const angle = Math.min(fullAngle, maxAngle - drawn);
        if (angle <= 0) {
            return;
        }

        // виділений сектор виступає на 6 пікселів
        const r = index === highlightIndex ? radius + 6 : radius;

        ctx.beginPath();
        ctx.moveTo(cx, cy);                                  // від центру кола
        ctx.arc(cx, cy, r, startAngle, startAngle + angle);  // дуга сектора
        ctx.closePath();                                     // назад до центру

        ctx.fillStyle = chartColor(index);
        ctx.fill();

        // білий контур відділяє сусідні сектори
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        drawn += angle;
        startAngle += angle;   // наступний сектор починається там, де закінчився цей
    });
}

// ---------- анімація ----------

// Крок 8: зупиняє цикл анімації; повертає true, якщо анімація справді йшла
function stopChartAnimation() {
    if (animationId === null) {
        return false;
    }
    cancelAnimationFrame(animationId);
    animationId = null;
    return true;
}

// Кроки 4–5: відображає поточний стан застосунку на полотні.
// Бере масив операцій (практикуми 6, 9, 11), агрегує витрати за категоріями
// і запускає цикл анімації через requestAnimationFrame;
// жодних захардкоджених чисел у функції немає
function renderChart(canvas, operations) {
    const ctx = getChartContext(canvas);
    if (!ctx) {
        return;
    }

    // нова анімація скасовує попередню, інакше два цикли малювали б одночасно
    stopChartAnimation();
    chartInterrupted = false;

    // дані беремо один раз на старті анімації
    lastOperations = operations;
    const items = getCategoryTotals(operations);
    currentItems = items;

    // Крок 8: полотна не видно — не витрачаємо ресурси на кадри,
    // одразу малюємо готову діаграму (вона буде актуальною, коли полотно з'явиться)
    if (!chartVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPieChart(canvas, items, 1);
        return;
    }

    // користувачам, які вимкнули анімацію в системі, показуємо одразу готове коло
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let startTime = null;

    // один кадр: timestamp передає браузер
    function frame(timestamp) {
        if (startTime === null) {
            startTime = timestamp;
        }

        // 1. оновлення стану: частка завершеності анімації (0..1) із плавним уповільненням
        const t = reduceMotion ? 1 : Math.min((timestamp - startTime) / ANIMATION_DURATION, 1);
        const progress = 1 - Math.pow(1 - t, 3);

        // 2. очищення попереднього кадру
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 3. перемальовування кадру
        drawPieChart(canvas, items, progress);

        // 4. планування наступного кадру, доки анімація не завершена;
        //    після завершення цикл сам зупиняється і ресурси не витрачаються
        if (t < 1) {
            animationId = requestAnimationFrame(frame);
        } else {
            animationId = null;
        }
    }

    animationId = requestAnimationFrame(frame);
}

// ---------- взаємодія ----------

// Крок 7: повертає індекс сектора під курсором або −1.
// Під час анімації не працює, бо діаграма ще не повна
function getSectorIndexAt(canvas, event) {
    if (animationId !== null || currentItems.length === 0) {
        return -1;
    }

    // координати миші в пікселях полотна (враховуємо CSS-масштабування)
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    const { cx, cy, radius } = getChartGeometry(canvas);
    const dx = x - cx;
    const dy = y - cy;

    // курсор поза колом
    if (Math.hypot(dx, dy) > radius) {
        return -1;
    }

    // кут від верхньої точки за годинниковою стрілкою, 0..2π
    // (сектори малюються саме від верхньої точки)
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) {
        angle += 2 * Math.PI;
    }

    // знаходимо сектор, у який потрапляє кут
    const total = currentItems.reduce((sum, item) => sum + item.total, 0);
    let accumulated = 0;
    for (let i = 0; i < currentItems.length; i++) {
        accumulated += (currentItems[i].total / total) * 2 * Math.PI;
        if (angle < accumulated) {
            return i;
        }
    }
    return -1;
}

// перемальовує діаграму повністю з виділеним сектором (без анімації)
function highlightSector(canvas, index) {
    const ctx = getChartContext(canvas);
    if (!ctx || animationId !== null) {
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPieChart(canvas, currentItems, 1, index);
}

// ---------- керування життєвим циклом ----------

// Крок 8: стежить за видимістю полотна через IntersectionObserver.
// Полотно залишило екран — зупиняємо незавершену анімацію (cancelAnimationFrame);
// повернулося — запускаємо анімацію заново
function watchChartVisibility(canvas) {
    if (!('IntersectionObserver' in window)) {
        return;
    }
    unwatchChart();

    chartObserver = new IntersectionObserver(entries => {
        chartVisible = entries[0].isIntersecting;

        if (!chartVisible) {
            if (stopChartAnimation()) {
                chartInterrupted = true;
            }
        } else if (chartInterrupted) {
            chartInterrupted = false;
            renderChart(canvas, lastOperations);
        }
    });
    chartObserver.observe(canvas);
}

// Крок 8: вимикає спостерігача й зупиняє анімацію (викликається при знищенні застосунку)
function unwatchChart() {
    stopChartAnimation();
    if (chartObserver) {
        chartObserver.disconnect();
        chartObserver = null;
    }
}