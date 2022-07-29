const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);

async function generateVersionNumFile() {
    const packageString = await readFile('./package.json', 'utf8');
    const package = JSON.parse(packageString);
    const versionNum = package?.version;
    if (versionNum == null) {
        console.log('versionNum is null');
        return;
    }

    const fileContent = `export const currentVersion = '${versionNum}';`;
    fs.writeFile(`./src/version.ts`, fileContent, ['utf8'], () => { });
}

generateVersionNumFile();