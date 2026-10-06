# Prompts de imagen para la demo — LICHTBILD

Concepto de la tienda demo: **un fotógrafo que vende copias de sus fotos en edición limitada**.

- Producto = una copia (*Fine-Art-Print*), no un objeto. Se vende por formato y por edición.
- Cada motivo tiene tirada numerada (3/25), papel Baryta, firmado a mano.
- Categorías naturales: Landschaft, Architektur, Portrait, Schwarzweiss, Reise.
- Es la demo que puedes enseñar a los fotógrafos que ya conoces.

Nombre propuesto: **Lichtbild** (la palabra alemana antigua para fotografía, literalmente
"imagen de luz"). Suena a galería, funciona en la Suiza alemana y no es de nadie.

---

## Un aviso importante antes de empezar

Esta demo tiene una particularidad que las otras no tenían: **el producto es la foto**.
En una tienda de salsas daba igual que las imágenes fueran generadas; aquí las imágenes
*son* el catálogo, y una foto generada por IA se nota bastante cuando el cliente que la
mira es fotógrafo profesional.

Mi recomendación: usa la IA para el ambiente (el atelier, las manos firmando, el marco en
la pared) y para los motivos del catálogo **pide a uno de esos fotógrafos que conoces tres
o cuatro fotos suyas**. Le cuesta cero, la demo gana muchísimo, y de paso ya has empezado
la conversación comercial enseñándole su propio trabajo montado en una tienda.

Si prefieres no depender de nadie para empezar, tienes abajo los prompts para generarlo
todo, pero cuenta con sustituir los motivos más adelante.

---

## Cómo usar esto con FLUX Schnell

Tres cosas de Schnell que cambian cómo hay que escribir los prompts:

1. **No hay prompt negativo.** Schnell está destilado y va con guidance 0, así que el CFG
   no actúa: un "no text, no logos" no lo obedece y encima puede invocar justo eso. Por eso
   los prompts de abajo están escritos **solo en positivo** — donde no quiero texto, describo
   una pared lisa o un margen vacío.
2. **Puedes pedir la proporción exacta.** A diferencia de ChatGPT, aquí eliges la resolución,
   así que el hero sale ya en 21:9 y no hay que recortar nada. Usa las medidas de cada
   sección, todas múltiplos de 16 y de aproximadamente 1 MP.
3. **Prosa, no etiquetas.** Schnell entiende frases naturales mucho mejor que listas de
   palabras sueltas separadas por comas.

Ajustes: `steps 4`, `guidance 0`, y **fija la semilla** cuando una te guste, para poder
repetir la misma luz en las siguientes.

### Bloque de estilo común (pégalo al final de todos los prompts)

```
Shot as fine-art photography on medium format, 80mm at f/4, with muted natural colour,
restrained contrast and fine film grain. The palette stays neutral and gallery-like:
off-white, warm grey and charcoal, with brass as the only warm note. Clean surfaces,
plain walls, quiet composition.
```

---

## 1. Hero — 3 imágenes (las más importantes)

El hero es un carrusel a pantalla completa con el titular encima, **a la izquierda**, sobre
un degradado oscuro que cubre casi la mitad izquierda. Por eso las tres imágenes necesitan
el peso visual **a la derecha** y la izquierda tranquila. Si el motivo va centrado, el texto
se lo come.

Medida: **1344×576** (21:9). Sale directa, sin recortar.

**Hero 1 — la copia en la pared** (vende el producto, no la foto)

```
Wide horizontal photograph of a large framed black-and-white landscape print hanging on a
plain off-white gallery wall, seen slightly from the side so the frame catches the light.
The print occupies the right half of the frame. The left half is bare wall in soft shadow,
empty. Raking natural light from a window out of shot. The composition is deliberately unbalanced, with the left third empty and in shadow.
[+ bloque de estilo]
```

**Hero 2 — el motivo** (un paisaje que podría ser el producto)

```
Wide horizontal landscape photograph of a misty alpine valley at dawn, layered ridges
fading into pale fog. The dramatic peaks and the strongest light are in the right half of
the frame. The left half is soft, dark, almost featureless mist. Cold muted palette,
minimal, contemplative. The composition is deliberately weighted to the right, with the left third empty.
[+ bloque de estilo]
```

**Hero 3 — el oficio** (la edición limitada, el valor)

```
Wide horizontal photograph of a photographer's studio table seen from above at an angle.
On the right, a stack of large fine-art prints on heavy cotton paper, a pair of white
cotton gloves, a pencil, and a loupe. A hand entering the frame from the right holds the
corner of a print. On the left, the bare dark wooden table surface, empty. Warm low light.
The composition is deliberately asymmetric, with the left third empty.
[+ bloque de estilo]
```

---

## 2. Banner de novedades (`/neuheiten`)

Ancho, 200–240 px de alto, texto abajo a la izquierda sobre degradado oscuro.
Medida: **1360×544** (5:2).

```
Wide horizontal photograph of a gallery wall with five framed photographic prints of
different sizes hung in an irregular grid, seen at a slight angle so the wall recedes.
Off-white wall, thin black frames, generous white space between them. The bottom-left area of the frame is plain wall in shadow.
[+ bloque de estilo]
```

---

## 3. Banners de blog y galería

Van uno al lado del otro, 200 px de alto. Medida: **1216×608** (2:1).

**Blog**

```
Wide horizontal photograph, overhead, of a photographer's desk: contact sheets, a loupe,
an open notebook, and a few 35mm negative strips laid out on a pale
surface. Hands entering from the top of the frame, one holding a red grease pencil.
[+ bloque de estilo]
```

**Galería**

```
Wide horizontal photograph of a bright minimal studio seen from the doorway: white walls,
a print drying rack, a wide-format printer, a roll of heavy paper, one framed print leaning
against the wall. Nobody in shot. Quiet, ordered, documentary feel.
[+ bloque de estilo]
```

---

## 4. Categorías (5 imágenes cuadradas)

Medida: **1024×1024**. Se ven pequeñas: motivo claro, poco detalle, mucho contraste.

```
A photograph of MOTIVO. Minimal composition with one strong subject and generous empty
space around it.
[+ bloque de estilo]
```

Cambia `MOTIVO` por:

| Categoría | MOTIVO |
|---|---|
| Landschaft | `a lone tree on a snow-covered ridge under a pale sky` |
| Architektur | `the corner of a brutalist concrete building against an overcast sky` |
| Portrait | `a weathered elderly man's face in soft window light, looking away from camera` |
| Schwarzweiss | `high-contrast black-and-white study of sand dune ridges` |
| Reise | `an empty coastal road disappearing into morning haze` |

---

## 5. Los motivos del catálogo (el producto)

Aquí es donde de verdad se juega la demo. Cada producto es una foto. Genera 8–12 y súbelas
desde el panel, o mejor aún, pide fotos reales prestadas.

Medida: **896×1152** (4:5, que es la proporción de la ficha de producto).

**Plantilla:**

```
A fine-art photograph suitable for a limited-edition gallery print, showing MOTIVO.
One strong subject, quiet composition, muted natural colour and plenty of empty space.
[+ bloque de estilo]
```

Variantes de `MOTIVO` para llenar el catálogo:

- `a long wooden pier extending into still water at dawn`
- `bare winter birch trunks in dense fog`
- `the geometric shadow of a staircase on a white wall`
- `a solitary stone farmhouse in a wide green valley`
- `storm clouds gathering over a flat empty plain`
- `close study of cracked dry earth, abstract, near-monochrome`
- `a single sailing boat on a vast calm lake, tiny in the frame`
- `snow-covered pine forest seen from above, near-abstract`
- `weathered concrete wall texture with a single rusted bolt`
- `a mountain ridge silhouette in layered evening haze`

Consejo: cuando una salga con la luz que te gusta, **reutiliza esa semilla** para las
siguientes cambiando solo el motivo. La retícula queda mucho más coherente que generando
cada una desde cero.

---

## 6. Galería del atelier (4 imágenes, documental)

Medida: **1216×832** (3:2).

```
An unposed documentary photograph of ESCENA, lit only by daylight, candid and natural.
[+ bloque de estilo]
```

`ESCENA`:

- `a hand in a white cotton glove signing the lower margin of a large print in pencil`
- `a print emerging from a wide-format printer, seen close`
- `prints being wrapped in tissue paper and slid into a flat cardboard mailer`
- `a framed print being levelled on a wall with a spirit level`

---

## Cómo está la web ahora

Ya está montada con esta identidad, así que las fotos y la interfaz van a juego:

| | |
|---|---|
| Interfaz | `#171717` negro copia (botones, precios) |
| Acento | `#A8763E` latón (ediciones limitadas, destacados) |
| Fondo | `#F7F7F5` papel, y neutros de galería |
| Titulares | Cormorant Garamond (serif de museo) |
| Interfaz | Archivo |
| Números de edición | JetBrains Mono |

La paleta del bloque de estilo de arriba — blanco roto, gris cálido, carbón y latón — es
justo la de la web: las imágenes encajarán sin retoques.

Todo eso vive en un solo bloque de `tailwind.config.ts`. Si quieres probar otra gama,
es editar ese bloque y nada más.
