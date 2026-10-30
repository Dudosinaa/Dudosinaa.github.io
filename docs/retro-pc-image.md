# Изображение первого экрана — 30 октября 2026

Исходник: предоставленный владельцем `RetroPC.png`. Обработка выполнена встроенным imagegen, без CLI/API-ключа. Удалены фон, пол, клавиатура и кабель; сохранены монитор и системный блок. Цвет согласован с существующей палитрой: бирюзовые тени, светлый корпус, оранжевые индикаторы.

Готовый файл: [assets/images/orbit.webp](../assets/images/orbit.webp), 960 × 960 px, 58 138 байт, прозрачный фон. WebP получен из результата imagegen с уменьшением размера; альфа-канал сохранён. Исходный пользовательский файл не изменён.

В HTML подключён новый вариант изображения; CSS вписывает весь компьютер между верхней строкой и нижней подписью. Версия в URL изображения и CSS обновлена, чтобы браузер загрузил замену из кэша корректно. Все ссылки сайта относительные.

## Проверки

- Браузер: 375, 768 и 1440 px — компьютер целиком виден, подписи не перекрываются, горизонтального переполнения нет.
- Мобильное меню: Enter открывает девять ссылок; Escape закрывает меню и возвращает фокус кнопке.
- Пустые списки: шесть состояний отсутствующего контента показаны, изображение загружается.
- Reduced motion: в существующем изолированном QA-сценарии изображение видно, `animation: none`, `transform: none`, обычная прокрутка. Системная настройка Windows не менялась.
- Подпапка `/repository/`: изображение загружается по относительному адресу.
- `node --test`: 19 / 20. Существующая запись «Ассистент - наставник» начинается с «Пример задачи», но имеет `isExample: false`, что нарушает проверку демонстрационных данных. Файлы контента этой правкой не изменялись.

## Промпты imagegen

Первый проход, исходное прикреплённое изображение:

```text
Use case: background-extraction. Asset type: transparent hero illustration for an existing dark teal portfolio website. Input image 1 is the EDIT TARGET, not just a style reference. Carefully extract ONLY the original retro desktop system unit WITH the CRT monitor stacked on top. REMOVE the separate keyboard, curly cable, all floor, backdrop and all cast shadows on the floor. Preserve the exact original computer design, proportions, perspective, camera angle, silhouette, monitor screen, knobs, disk bays, side panels and fine details. Do not redesign or add any hardware. Color grade the extracted computer gently to harmonize with this website palette: background #002626, surfaces #0e4749, lime accent #95c623, warm ivory #efe7da, orange accent #e55812. Keep the front and monitor frame warm light ivory with subtle teal reflected shadows, darker right and top surfaces tinted deep muted teal, screen softly off-white with a very slight pale lime tint, change the two bright red indicator lights to warm burnt-orange #e55812 with restrained glow. Maintain readable contrast and realistic original 3D lighting. No oversaturated full green recoloring. Fully transparent background with clean accurate alpha edges, no opaque matte, no rectangle. Center the complete monitor AND complete system unit in a square canvas with a small consistent transparent margin, entire object visible, no parts cropped. No keyboard, no cable, no floor, no scenery, no text or logos.
```

Второй проход, уточнение краёв результата первого прохода:

```text
Use case: background-extraction. EDIT THIS EXACT IMAGE. Only refine its alpha silhouette edges. The current cutout has unwanted jagged chalk-white fringe and scattered white opaque pixels OUTSIDE the silhouette, especially the left edge of the CRT monitor and left and lower edges of the system unit. Remove ALL this exterior white halo, all stray pixels and noisy light remnants, producing a clean smooth precise alpha edge that will look professional on a dark teal #002626 web background. Actual background must remain fully transparent, do not paint a teal background. Preserve the complete computer exactly as shown: identical geometry, silhouette, proportions, perspective, screen, ivory front, teal sides, orange indicator lights and internal lighting. Do not recolor or redesign. Preserve original square framing and scale. Only clean the alpha along the outside edge, no outer shadows or outer glow. NO keyboard, NO cable, NO floor, NO additional elements. Ensure the cream-colored body itself remains solid opaque and all background becomes truly clear.
```
