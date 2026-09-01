const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../pages/travelPartner');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the sidebar already has the profile link
    if (!content.includes('href="travelPartner_profile.html"')) {
        // Replace the closing </nav> tag with the Profile link + </nav>
        content = content.replace(/<\/nav>/i, 
`                <a href="travelPartner_profile.html" class="nav-item">
                    <i data-icon="user"></i> Profile
                </a>
            </nav>`);
        fs.writeFileSync(filePath, content);
        console.log(`Updated sidebar in ${file}`);
    }
});
