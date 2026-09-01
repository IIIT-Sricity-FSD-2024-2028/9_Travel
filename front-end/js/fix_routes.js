const fs = require('fs');
const path = 'c:\\\\Users\\\\DILEEP\\\\OneDrive\\\\Documents\\\\Front-end (2)\\\\Front-end\\\\js\\\\app.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('if (text.includes("get started") || text.includes("explore") || text.includes("register")) {', 
`if (text.includes("get started") || text.includes("explore")) {
                window.location.href = isInSubfolder ? "../../login.html" : "login.html";
                return;
            }
            if (text.includes("register")) {`);

fs.writeFileSync(path, content);
console.log('Fixed app.js routes.');
