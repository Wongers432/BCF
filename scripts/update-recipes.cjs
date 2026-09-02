const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

const ZIP_URL = 'https://codeload.github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/zip/refs/heads/master';
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'recipes.json');

async function updateRecipes() {
  console.log('Fetching NEU repo...');
  const recipes = [];
  
  const request = https.get(ZIP_URL, (response) => {
    if (response.statusCode !== 200) {
      console.error(`Failed to download, status code: ${response.statusCode}`);
      return;
    }

    response
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const fileName = entry.path;
        if (fileName.includes('/items/') && fileName.endsWith('.json')) {
          const content = await entry.buffer();
          try {
            const data = JSON.parse(content.toString('utf-8'));
            if (data.recipe) {
              recipes.push({
                internalname: data.internalname,
                displayname: data.displayname,
                itemid: data.itemid,
                texture: data.texture || (data.nbttag ? (data.nbttag.match(/Value:\\?"(.*?)\\?"/)?.[1] || null) : null) || null,
                recipe: data.recipe,
              });
            }
          } catch (err) {
            console.warn(`Failed to parse ${fileName}: ${err.message}`);
          }
        } else {
          entry.autodrain();
        }
      })
      .on('close', () => {
        console.log(`Extracted ${recipes.length} recipes.`);
        if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
          fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        }
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(recipes, null, 2));
        console.log(`Saved to ${OUTPUT_FILE}`);
      });
  });

  request.on('error', (err) => {
    console.error(`Request error: ${err.message}`);
  });
}

updateRecipes();
