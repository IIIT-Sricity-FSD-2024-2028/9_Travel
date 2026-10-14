/**
 * Domain constants ported verbatim from the original js/workflow.js.
 */
export const STORE_KEY = 'dd_workflow_state_v4';
export const SESSION_OWNER_KEY = 'dd_state_owner';
export const MESSAGE_TRIP_KEY = 'dd_message_trip_id';
export const SALARY_PAYOUTS_KEY = 'dd_salary_payouts_v1';
export const USER_SALARIES_KEY = 'dd_user_salaries_v1';
export const TRAVELER_ASSIGNMENTS_KEY = 'dd_traveler_assignments_v1';
export const SEEN_NOTIFS_KEY = 'dd_seen_notif_ids';

export const ROLE_LABELS = {
    superuser: 'Super User',
    partner: 'Travel Partner',
    traveler: 'Traveler',
    vendor: 'Vendor',
    guide: 'Tour Guide',
    support: 'Support Executive',
};

export const STAKEHOLDER_ROLES = ['traveler', 'partner', 'guide', 'vendor'];
export const MESSAGE_ROLES = ['all', 'traveler', 'partner', 'guide', 'vendor', 'support'];

export const PACKAGE_MIN_BUDGETS = {
    paris: 1200,
    tokyo: 1500,
    bali: 800,
    rome: 1000,
    'new york': 1100,
    london: 1300,
    swiss: 1600,
    alps: 1600,
};

/** Image presets offered by the package editors (paths kept identical to the original data). */
export const PACKAGE_IMAGE_PRESETS = [
    { value: '../../images/maldives_package.png', label: 'Maldives' },
    { value: '../../images/swiss_alps_package.png', label: 'Swiss Alps' },
    { value: '../../images/japan_package.png', label: 'Japan' },
    { value: '../../images/paris_package.png', label: 'Paris' },
    { value: '../../images/goa_package.png', label: 'Goa' },
    { value: '../../images/rome_package.png', label: 'Rome' },
];

export const DEFAULT_PACKAGE_IMAGE = '../../images/maldives_package.png';

export const DESTINATION_DAY_ACTIVITIES = {
    maldives: [
        { time: '09:00', title: 'Airport pickup and speedboat transfer', owner: 'vendor', location: 'Male Airport' },
        { time: '13:00', title: 'Resort check-in, welcome briefing & ocean villa setup', owner: 'vendor', location: 'Island Resort' },
        { time: '10:00', title: 'Snorkeling lagoon tour & coral reef discovery', owner: 'guide', location: 'House Reef' },
        { time: '15:00', title: 'Water sports session (Jet Ski & Parasailing)', owner: 'vendor', location: 'Water Sports Center' },
        { time: '11:00', title: 'Island culture walk & local village exploration', owner: 'guide', location: 'Local Island' },
        { time: '18:00', title: 'Sunset cruise & dolphin watching expedition', owner: 'vendor', location: 'Resort Jetty' },
        { time: '10:00', title: 'Scuba diving & underwater marine photography', owner: 'guide', location: 'Banana Reef' },
        { time: '13:00', title: 'Private sandbank picnic & crystal lagoon kayaking', owner: 'vendor', location: 'Private Sandbank' },
        { time: '16:00', title: 'Overwater luxury spa & wellness rejuvenation', owner: 'vendor', location: 'Resort Spa' },
        { time: '09:00', title: 'Deep sea fishing & catamaran sailing', owner: 'guide', location: 'Atoll Waters' },
        { time: '17:00', title: 'Candlelight beachside dinner & Maldivian music', owner: 'vendor', location: 'Beachfront' },
    ],
    swiss: [
        { time: '09:00', title: 'Zurich arrival, airport pickup and hotel check-in', owner: 'vendor', location: 'Zurich Airport' },
        { time: '10:00', title: 'Zurich Old Town walking tour & Bahnhofstrasse exploration', owner: 'guide', location: 'Zurich Old Town' },
        { time: '08:30', title: 'Glacier Express scenic panoramic train segment', owner: 'vendor', location: 'Rail Station' },
        { time: '10:00', title: 'Skiing & Snowboarding adventure in Swiss Alps', owner: 'guide', location: 'Swiss Alps' },
        { time: '11:00', title: 'Mount Titlis revolving cable car & Cliff Walk excursion', owner: 'guide', location: 'Mount Titlis' },
        { time: '14:00', title: 'Lake Lucerne steamboat cruise & Chapel Bridge walk', owner: 'vendor', location: 'Lake Lucerne' },
        { time: '09:30', title: 'Jungfraujoch Top of Europe mountain summit tour', owner: 'guide', location: 'Jungfraujoch' },
        { time: '11:00', title: 'Interlaken adventure sports & Swiss chocolate workshop', owner: 'vendor', location: 'Interlaken' },
        { time: '10:30', title: 'Bern UNESCO historic heritage walk & Bear Park visit', owner: 'guide', location: 'Bern Old Town' },
        { time: '15:00', title: 'Alpine village leisure & authentic Swiss cheese fondue dinner', owner: 'vendor', location: 'Grindelwald' },
        { time: '10:00', title: 'Matterhorn Zermatt viewpoint & alpine photography excursion', owner: 'guide', location: 'Zermatt' },
        { time: '14:00', title: 'Swiss souvenir shopping & handcrafted watchmaking tour', owner: 'vendor', location: 'Zurich Center' },
    ],
    japan: [
        { time: '09:00', title: 'Tokyo airport pickup and hotel check-in', owner: 'vendor', location: 'Tokyo' },
        { time: '10:00', title: 'Asakusa, Senso-ji Temple & Tokyo Skytree guided tour', owner: 'guide', location: 'Asakusa' },
        { time: '14:00', title: 'Meiji Shrine, Harajuku fashion & Shibuya Crossing walk', owner: 'guide', location: 'Shibuya' },
        { time: '09:00', title: 'Shinkansen bullet train to Kyoto & traditional Ryokan check-in', owner: 'vendor', location: 'Kyoto Station' },
        { time: '11:00', title: 'Fushimi Inari Shrine & Kinkaku-ji (Golden Pavilion) tour', owner: 'guide', location: 'Kyoto' },
        { time: '10:00', title: 'Arashiyama Bamboo Grove & traditional Japanese tea ceremony', owner: 'guide', location: 'Arashiyama' },
        { time: '14:00', title: 'Bullet train to Osaka & Dotonbori street food walk', owner: 'vendor', location: 'Osaka' },
        { time: '10:00', title: 'Osaka Castle & Umeda Sky Building floating garden observatory', owner: 'guide', location: 'Osaka Castle' },
        { time: '11:00', title: 'Nara deer park & Todai-ji giant Buddha day trip', owner: 'guide', location: 'Nara' },
        { time: '15:00', title: 'Akihabara anime & electronics district shopping support', owner: 'vendor', location: 'Tokyo' },
    ],
    goa: [
        { time: '09:00', title: 'Goa Airport pickup and beach resort check-in', owner: 'vendor', location: 'Goa Airport' },
        { time: '11:00', title: 'North Goa beach tour & historic Fort Aguada lighthouse', owner: 'guide', location: 'Calangute' },
        { time: '15:00', title: 'Water sports coordination (Parasailing, Jet ski & Banana ride)', owner: 'vendor', location: 'Baga Beach' },
        { time: '10:00', title: 'Old Goa churches heritage walk & Sahakari spice plantation', owner: 'guide', location: 'Old Goa' },
        { time: '18:00', title: 'Mandovi River luxury sunset cruise & Goan cultural dinner', owner: 'vendor', location: 'Mandovi River' },
        { time: '09:30', title: 'Dudhsagar Waterfalls trek & Bhagwan Mahaveer jungle safari', owner: 'guide', location: 'Dudhsagar' },
        { time: '14:00', title: 'South Goa serene beaches (Palolem, Colva & Cabo de Rama)', owner: 'vendor', location: 'Palolem Beach' },
        { time: '16:00', title: 'Anjuna flea market shopping & authentic Goan seafood tasting', owner: 'guide', location: 'Anjuna' },
    ],
    paris: [
        { time: '08:00', title: 'Charles de Gaulle Airport pickup & boutique hotel check-in', owner: 'vendor', location: 'Paris Hotel' },
        { time: '10:00', title: 'Eiffel Tower guided summit tour & Champ de Mars stroll', owner: 'guide', location: 'Eiffel Tower' },
        { time: '14:00', title: 'Louvre Museum guided masterpiece tour (Mona Lisa & Venus)', owner: 'guide', location: 'Louvre Museum' },
        { time: '18:00', title: 'Seine River evening illuminations cruise & Notre-Dame view', owner: 'vendor', location: 'Seine River' },
        { time: '10:00', title: 'Versailles Palace & Royal Gardens full-day royal excursion', owner: 'guide', location: 'Versailles' },
        { time: '11:00', title: 'Montmartre, Sacré-Cœur Basilica & Bohemian artists square', owner: 'guide', location: 'Montmartre' },
        { time: '15:00', title: 'Champs-Élysées & Arc de Triomphe culinary patisserie walk', owner: 'vendor', location: 'Champs-Élysées' },
        { time: '10:30', title: 'Musée d\'Orsay impressionist art & Latin Quarter historic tour', owner: 'guide', location: 'Musée d\'Orsay' },
        { time: '14:00', title: 'Le Marais fashion boutiques & French wine tasting session', owner: 'vendor', location: 'Le Marais' },
    ],
    rome: [
        { time: '09:00', title: 'Rome Fiumicino Airport transfer and central hotel check-in', owner: 'vendor', location: 'Rome Airport' },
        { time: '10:00', title: 'Colosseum, Roman Forum & Palatine Hill imperial tour', owner: 'guide', location: 'Colosseum' },
        { time: '15:00', title: 'Vatican Museums, Sistine Chapel & St. Peter\'s Basilica', owner: 'guide', location: 'Vatican City' },
        { time: '18:00', title: 'Trevi Fountain, Pantheon & Piazza Navona evening stroll', owner: 'vendor', location: 'Rome Center' },
        { time: '11:00', title: 'Trastevere authentic food tasting & fresh pasta-making workshop', owner: 'guide', location: 'Trastevere' },
        { time: '14:00', title: 'Borghese Gallery art collection & Villa Borghese park carriage', owner: 'vendor', location: 'Villa Borghese' },
        { time: '10:00', title: 'Catacombs of Rome & historic Appian Way cycling/walking tour', owner: 'guide', location: 'Appian Way' },
        { time: '16:00', title: 'Spanish Steps leisure, Via Condotti shopping & Italian gelato', owner: 'vendor', location: 'Piazza di Spagna' },
    ],
    default: [
        { time: '09:00', title: 'Arrival pickup and accommodation check-in', owner: 'vendor', location: 'Arrival Terminal' },
        { time: '10:00', title: 'Destination orientation tour and iconic city landmarks', owner: 'guide', location: 'City Center' },
        { time: '14:00', title: 'Featured cultural exploration & heritage district tour', owner: 'guide', location: 'Heritage Quarter' },
        { time: '15:00', title: 'Scenic nature, landscapes and outdoor activities', owner: 'vendor', location: 'Nature Reserve' },
        { time: '11:00', title: 'Local gastronomy, food market and culinary tasting', owner: 'guide', location: 'Food District' },
        { time: '14:00', title: 'Artisan craft workshops and authentic local markets', owner: 'vendor', location: 'Artisan Center' },
        { time: '10:00', title: 'Panoramic viewpoint and photography excursion', owner: 'guide', location: 'Scenic Viewpoint' },
        { time: '16:00', title: 'Leisure, wellness and personal destination exploration', owner: 'vendor', location: 'City Center' },
    ],
};

/** Default catalog shown while the workflow state has no packages (getAllWorkflowPackages). */
export const DEFAULT_PACKAGES = [
  {
    id: "PKG-1",
    title: "Maldives Escape",
    destination: "Male, Maldives",
    description: "A beautiful escape to the Maldives with luxury overwater resort stays and snorkeling.",
    durationDays: 7,
    budget: 5000,
    highlights: ["7 Days Premium Resort stay", "Snorkeling & Water Sports", "Daily breakfast & spa included"],
    imageUrl: "../../images/maldives_package.png",
    schedule: [
      { day: 1, time: "09:00", title: "Airport pickup and speedboat transfer", owner: "vendor", location: "Male Airport", notes: "" },
      { day: 1, time: "13:00", title: "Resort check-in and welcome briefing", owner: "vendor", location: "Island Resort", notes: "" },
      { day: 2, time: "10:00", title: "Snorkeling lagoon tour", owner: "guide", location: "House Reef", notes: "" },
      { day: 3, time: "15:00", title: "Water sports session", owner: "vendor", location: "Water Sports Center", notes: "" },
      { day: 4, time: "11:00", title: "Island culture walk", owner: "guide", location: "Local Island", notes: "" },
      { day: 5, time: "18:00", title: "Sunset cruise", owner: "vendor", location: "Resort Jetty", notes: "" },
      { day: 6, time: "10:00", title: "Spa and leisure day", owner: "vendor", location: "Resort Spa", notes: "" },
      { day: 7, time: "09:00", title: "Checkout and airport transfer", owner: "vendor", location: "Male Airport", notes: "" }
    ]
  },
  {
    id: "PKG-2",
    title: "Swiss Alps Adventure",
    destination: "Zurich, Switzerland",
    description: "An adventurous trip to the Swiss Alps featuring scenic railway passes and alpine skiing.",
    durationDays: 5,
    budget: 4000,
    highlights: ["5 Days Alpine Lodge stay", "Skiing & Snowboarding passes", "Glacier Express train ride"],
    imageUrl: "../../images/swiss_alps_package.png",
    schedule: [
      { day: 1, time: "09:00", title: "Arrival and Lodge check-in", owner: "vendor", location: "Zurich Airport", notes: "" },
      { day: 2, time: "10:00", title: "Skiing Adventure", owner: "guide", location: "Swiss Alps", notes: "" },
      { day: 3, time: "14:00", title: "Snowboarding coordination", owner: "vendor", location: "Ski Slopes", notes: "" },
      { day: 4, time: "11:00", title: "Glacier Express scenic ride", owner: "guide", location: "Train Station", notes: "" },
      { day: 5, time: "12:00", title: "Checkout and departure transfer", owner: "vendor", location: "Zurich Airport", notes: "" }
    ]
  },
  {
    id: "PKG-3",
    title: "Japan Expedition",
    destination: "Tokyo, Japan",
    description: "Explore the wonders of Japan from ancient Kyoto temples to modern Tokyo skyscrapers.",
    durationDays: 9,
    budget: 6000,
    highlights: ["9 Days Multi-city Tour", "Shinkansen (Bullet Train) passes", "Historic Temples & Modern Cities"],
    imageUrl: "../../images/japan_package.png",
    schedule: [
      { day: 1, time: "09:00", title: "Airport transfer & hotel check-in", owner: "vendor", location: "Tokyo Airport", notes: "" },
      { day: 2, time: "10:00", title: "Temple Tour & Cultural Walk", owner: "guide", location: "Senso-ji Temple", notes: "" },
      { day: 3, time: "13:00", title: "Akihabara tech exploration", owner: "guide", location: "Tokyo", notes: "" },
      { day: 4, time: "09:00", title: "Bullet train to Kyoto & check-in", owner: "vendor", location: "Kyoto Station", notes: "" },
      { day: 5, time: "10:00", title: "Kinkaku-ji (Golden Pavilion) tour", owner: "guide", location: "Kyoto", notes: "" },
      { day: 6, time: "14:00", title: "Arashiyama Bamboo Grove walk", owner: "guide", location: "Kyoto", notes: "" },
      { day: 7, time: "09:00", title: "Bullet train to Osaka & food walk", owner: "vendor", location: "Dotonbori", notes: "" },
      { day: 8, time: "10:00", title: "Osaka Castle guided tour", owner: "guide", location: "Osaka Castle", notes: "" },
      { day: 9, time: "09:00", title: "Checkout & Kansai Airport transfer", owner: "vendor", location: "Kansai Airport", notes: "" }
    ]
  },
  {
    id: "PKG-4",
    title: "Paris Romance & Culture",
    destination: "Paris, France",
    description: "Immerse yourself in Parisian art, gastronomy, and historic architecture.",
    durationDays: 7,
    budget: 4500,
    highlights: ["7 Days Boutique Hotel Stay", "Eiffel Tower & Louvre Guided Access", "Seine River Sunset Dinner Cruise"],
    imageUrl: "../../images/paris_package.png",
    schedule: [
      { day: 1, time: "08:00", title: "Airport pickup & hotel check-in", owner: "vendor", location: "Paris Airport", notes: "" },
      { day: 2, time: "10:00", title: "Eiffel Tower guided tour", owner: "guide", location: "Eiffel Tower", notes: "" },
      { day: 3, time: "14:00", title: "Louvre Museum tour", owner: "guide", location: "Louvre Museum", notes: "" },
      { day: 4, time: "18:00", title: "Seine River dinner cruise", owner: "vendor", location: "Seine River", notes: "" },
      { day: 5, time: "10:00", title: "Versailles Palace excursion", owner: "guide", location: "Versailles", notes: "" },
      { day: 6, time: "11:00", title: "Montmartre heritage stroll", owner: "guide", location: "Montmartre", notes: "" },
      { day: 7, time: "09:00", title: "Checkout & airport transfer", owner: "vendor", location: "Paris Airport", notes: "" }
    ]
  },
  {
    id: "PKG-5",
    title: "Goa Sun & Spice Beach Tour",
    destination: "Goa, India",
    description: "Relax on sun-kissed beaches, enjoy water sports, and explore vibrant Goan culture.",
    durationDays: 5,
    budget: 1500,
    highlights: ["5 Days Beach Resort Stay", "Water Sports & Beach BBQ", "Spice Plantation & Heritage Tour"],
    imageUrl: "../../images/goa_package.png",
    schedule: [
      { day: 1, time: "09:00", title: "Airport transfer & resort check-in", owner: "vendor", location: "Goa Airport", notes: "" },
      { day: 2, time: "11:00", title: "North Goa beach tour", owner: "guide", location: "Calangute", notes: "" },
      { day: 3, time: "15:00", title: "Water sports session", owner: "vendor", location: "Baga Beach", notes: "" },
      { day: 4, time: "10:00", title: "Old Goa heritage walk", owner: "guide", location: "Old Goa", notes: "" },
      { day: 5, time: "09:00", title: "Checkout & departure transfer", owner: "vendor", location: "Goa Airport", notes: "" }
    ]
  },
  {
    id: "PKG-6",
    title: "Rome Heritage & Imperial Walk",
    destination: "Rome, Italy",
    description: "Walk through ancient Roman history, visit the Vatican, and savor culinary delights.",
    durationDays: 6,
    budget: 3800,
    highlights: ["6 Days Historic Center Hotel", "Colosseum & Vatican Priority Tickets", "Trastevere Food & Wine Walk"],
    imageUrl: "../../images/rome_package.png",
    schedule: [
      { day: 1, time: "09:00", title: "Airport transfer & hotel check-in", owner: "vendor", location: "Rome Airport", notes: "" },
      { day: 2, time: "10:00", title: "Colosseum & Roman Forum tour", owner: "guide", location: "Colosseum", notes: "" },
      { day: 3, time: "15:00", title: "Vatican Museums visit", owner: "guide", location: "Vatican City", notes: "" },
      { day: 4, time: "18:00", title: "Food & wine walk", owner: "vendor", location: "Trastevere", notes: "" },
      { day: 5, time: "11:00", title: "Catacombs & Appian Way walk", owner: "guide", location: "Appian Way", notes: "" },
      { day: 6, time: "09:00", title: "Checkout & airport transfer", owner: "vendor", location: "Rome Airport", notes: "" }
    ]
  }
];
