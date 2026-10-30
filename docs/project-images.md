# Обложки проектов — 30 октября 2026

Созданы встроенным imagegen, без CLI/API-ключа. Все обложки — концептуальные иллюстрации по имеющимся описаниям, а не снимки работающих интерфейсов. Промпты сохранены в [project-image-prompts.json](project-image-prompts.json).

Финальные файлы, подключённые через `content/projects.json`:

| Проект | Файл | Размер |
| --- | --- | --- |
| Ассистент — наставник | [pc-assistant.webp](../assets/images/projects/pc-assistant.webp) | 144 588 байт |
| PostcodeSpace | [postcode-space.webp](../assets/images/projects/postcode-space.webp) | 106 724 байта |
| Weather Agent | [weather-agent.webp](../assets/images/projects/weather-agent.webp) | 80 184 байта |
| Science Research Bot | [science-research-bot.webp](../assets/images/projects/science-research-bot.webp) | 74 054 байта |
| Научный ассистент | [scientific-assistant.webp](../assets/images/projects/scientific-assistant.webp) | 60 698 байт |

WebP 1200 × 800 px, качество 85. Оптимизация выполнена локальным Sharp из среды инструментов; сайт не получил новых зависимостей. Добавлены описательные alt. Для проекта мониторинга Proxmox / TrueNAS генерация не выполнялась, прежняя обложка сохранена. Остальные сведения проектов и существующие изображения сохранены.

Проверки: `node --test` — 21/21 (с разрешёнными локальными HTTP-подключениями). Браузер: ширины 375, 768 и 1440 px, горизонтального переполнения нет. Обложки визуально осмотрены. Enter открывает мобильное меню, Escape закрывает и возвращает фокус кнопке. Пустой список проектов в изолированном сценарии показывает «Проекты скоро появятся». Reduced motion покрыт существующими автоматическими тестами, системная настройка не менялась. Превью сохранено в `.qa/project-images-desktop.png`.
