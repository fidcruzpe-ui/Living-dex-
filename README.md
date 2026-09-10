# Mi Living Dex — PWA

Aplicación web instalable (PWA) para iPhone y Windows. Funciona offline después de la primera carga y guarda el progreso en el dispositivo.

## Contenido
- Pokémon Diamante Brillante — Pokédex Nacional: 493
- Pokémon Leyendas: Arceus — Pokédex de Hisui: 242 + control Alfa
- Pokémon Espada — Galar 400, formas regionales 19, Isla de la Armadura 211, Nieves de la Corona 210
- Pokémon Let's Go, Pikachu! — Living Dex: 171
- Pokémon Leyendas: Z-A — Luminalia 232 + Hiperespacio 132
- Total de entradas de seguimiento: 2.110

## Colores
- Verde: capturado y eres su OT.
- Naranja: capturado y no eres su OT.
- Blanco: pendiente.

## Instalar en iPhone
La PWA debe estar publicada mediante HTTPS. Una vez publicada:
1. Abre la dirección en Safari en el iPhone.
2. Pulsa Compartir.
3. Pulsa “Añadir a pantalla de inicio”.
4. Pulsa “Añadir”.

## Publicarla desde Windows
### Opción sencilla: GitHub Pages
1. Crea un repositorio nuevo en GitHub.
2. Sube **el contenido de esta carpeta** a la raíz del repositorio.
3. En GitHub entra en Settings > Pages.
4. En Source selecciona “Deploy from a branch”.
5. Selecciona la rama `main` y la carpeta `/ (root)`.
6. Guarda y abre la dirección HTTPS que GitHub te indique.

También sirve cualquier hosting estático HTTPS (por ejemplo, Netlify, Cloudflare Pages o un servidor propio).

## Uso local en Windows
No abras `index.html` con doble clic si quieres probar todas las funciones PWA. Inicia un servidor local en esta carpeta. Si tienes Python instalado:

```bash
python -m http.server 8080
```

Después abre `http://localhost:8080`.

## Copias de seguridad
En el menú `•••` puedes exportar el progreso a JSON e importarlo en otro dispositivo. Es recomendable conservar copias periódicas.
