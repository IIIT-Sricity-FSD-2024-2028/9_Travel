const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../pages/travelPartner');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace notif-btn if it doesn't already have an onclick
    content = content.replace(/<button class="notif-btn">/g, '<button class="notif-btn" onclick="window.location.href=\'travelPartner_notifications.html\'">');
    
    // Replace user-pill if it doesn't already have an onclick
    content = content.replace(/<div class="user-pill">/g, '<div class="user-pill" onclick="window.location.href=\'travelPartner_profile.html\'" style="cursor: pointer;">');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
