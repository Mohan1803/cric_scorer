const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('import.meta.env')) {
                // Replace safely, e.g. import.meta.env ? import.meta.env.MODE : void 0
                // becomes (typeof process !== "undefined" && process.env ? process.env : {})
                // We'll just replace 'import.meta.env' with 'undefined' or '(undefined)'
                content = content.replace(/import\.meta\.env/g, '(undefined)');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Patched', fullPath);
            }
        }
    }
}

replaceInDir(path.join(__dirname, 'node_modules', 'zustand'));
