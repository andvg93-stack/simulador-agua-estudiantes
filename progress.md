Original prompt: quita todo lo del modo retro del simulador, agrega iconos relacionados y colores a los parametros fisicoquimicos que se muestran arriba, añade tambien algun elemento grafico que indique si es alto, medio o bajo en cada parametro

- 2026-03-13: Revise `simulador_agua.html`, `simulador_agua_app.js` y `water_quality_model.js`.
- 2026-03-13: Se elimino el modo retro de HTML, CSS y JS.
- 2026-03-13: Las metricas superiores ahora se renderizan desde `simulador_agua_app.js` con iconos SVG, color por parametro y una barra segmentada que marca bajo, medio o alto.
- 2026-03-13: Validacion visual ejecutada con `web_game_playwright_client`; captura final en `output/web-game/shot-0.png`.
- 2026-03-13: La prueba por `file://` sigue reportando un `SecurityError` del canvas por origen cruzado al leer `getImageData`; no bloquea el rediseño visual.
- 2026-03-13: Se agrego un overlay SVG con turbulencia animada solo dentro de la escena acuática (`river`) y su opacidad ahora responde a claridad/turbidez.
- 2026-03-13: Se retiro el overlay/filtro SVG de la escena acuática por resultado visual no satisfactorio.
- 2026-03-13: Se implemento un filtro de refraccion real sobre un contenedor comun `underwater-stack`; ahora afecta la escena subacuatica completa mientras `background.webp` permanece por encima sin distorsion.
- 2026-03-13: Validacion visual repetida en `output/web-game/shot-0.png`; el efecto ya se aprecia sobre agua, peces y vegetacion sumergida.
