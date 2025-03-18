const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const port = 3000;

// Configura body-parser para procesar datos enviados por formulario
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta que entrega la interfaz (frontend) del formulario
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Publicar Posteo</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2em; }
        label { display: block; margin: 10px 0 5px; }
        input, textarea { width: 300px; padding: 5px; }
        button { padding: 10px 20px; font-size: 1em; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Publicar tu Posteo</h1>
      <form method="post" action="/submit">
        <label for="email">Email:</label>
        <input type="email" name="email" id="email" required>
        
        <label for="password">Password:</label>
        <input type="password" name="password" id="password" required>
        
        <label for="content">Contenido del Post:</label>
        <textarea name="content" id="content" rows="5" required></textarea>
        
        <button type="submit">Publicar</button>
      </form>
    </body>
    </html>
  `);
});

// Ruta que procesa el formulario y ejecuta Puppeteer para logearse y postear
app.post('/submit', async (req, res) => {
  const { email, password, content } = req.body;
  try {
    // Inicia Puppeteer en modo headless (sin interfaz visible)
    const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

    const page = await browser.newPage();

    // Navega a la página de login y espera a que cargue completamente
    await page.goto('https://pikidiary.lol/login', { waitUntil: 'networkidle0' });

    // Rellena el formulario de login usando los datos recibidos
    await page.type('input[name="email"]', email, { delay: 100 });
    await page.type('input[name="password"]', password, { delay: 100 });

    // Envía el formulario haciendo clic en el botón y espera la navegación resultante
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Ejecuta el código fetch en el contexto de la página para publicar el post,
    // usando el valor de "content" enviado en el formulario
    await page.evaluate(async (postContent) => {
      try {
        await fetch("https://pikidiary.lol/post", {
          headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "content-type": "application/x-www-form-urlencoded"
          },
          referrer: "https://pikidiary.lol/@vda?tab=me",
          referrerPolicy: "strict-origin-when-cross-origin",
          body: "content=" + encodeURIComponent(postContent),
          method: "POST",
          mode: "cors",
          credentials: "include"
        });
      } catch (error) {
        console.error("Error en el fetch:", error);
      }
    }, content);

    // Cierra el navegador
    await browser.close();

    // Responde con el mensaje de éxito en la interfaz
    res.send(`
      <h2>Posteo publicado</h2>
      <p>El post se ha publicado exitosamente.</p>
      <p><a href="/">Volver</a></p>
    `);
  } catch (error) {
    console.error("Error al publicar el post:", error);
    res.status(500).send("Error al publicar el posteo");
  }
});

// Inicia el servidor Express
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
