const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\DILEEP\\OneDrive\\Documents\\Front-end (2)\\Front-end\\pages\\superuser';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const links = [
    {href: 'superuser_dashboard.html', icon: 'dashboard', text: 'Dashboard'},
    {href: 'superuser_users.html', icon: 'users', text: 'Users'},
    {href: 'superuser_trips.html', icon: 'plane', text: 'Trips'},
    {href: 'superuser_vendors.html', icon: 'briefcase', text: 'Vendors'},
    {href: 'superuser_guides.html', icon: 'map', text: 'Guides'},
    {href: 'superuser_support.html', icon: 'headphones', text: 'Support'},
    {href: 'superuser_reports.html', icon: 'filetext', text: 'Reports'},
    {href: 'superuser_settings.html', icon: 'settings', text: 'Settings'}
];

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // determine active base
    let activeBase = '';
    if (file.includes('user')) activeBase = 'superuser_users.html';
    if (file.includes('trip')) activeBase = 'superuser_trips.html';
    if (file.includes('vendor')) activeBase = 'superuser_vendors.html';
    if (file.includes('guide')) activeBase = 'superuser_guides.html';
    if (file.includes('support')) activeBase = 'superuser_support.html';
    if (file.includes('report')) activeBase = 'superuser_reports.html';
    if (file.includes('setting')) activeBase = 'superuser_settings.html';
    if (file.includes('dash') || file.includes('alert')) activeBase = 'superuser_dashboard.html';

    // Build new nav html
    let navHtml = '<nav class="sidebar-nav">\n';
    links.forEach(l => {
        let activeClass = (l.href === activeBase) ? ' active' : '';
        navHtml += `                <a href="${l.href}" class="nav-item${activeClass}"><i data-icon="${l.icon}"></i> ${l.text}</a>\n`;
    });
    navHtml += '            </nav>';

    content = content.replace(/<nav class="sidebar-nav">[\s\S]*?<\/nav>/, navHtml);
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated sidebar in ${file}`);
});
