(function () {
    const pageName = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (pageName === 'landing_page.html' || pageName === 'index.html' || pageName === '') {
        return;
    }
    const STORE_KEY = 'dd_workflow_state_v4';
    const SESSION_OWNER_KEY = 'dd_state_owner'; // tracks which user's session is cached
    const API_BASE_URL = window.API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname || 'localhost'}:3000` : 'http://localhost:3000');
    let backendHydrated = false;
    let backendHydrating = false;
    let backendPersistTimer = null;

    // ---- Detect account switch: if cached state belongs to a different user, purge it ----
    (function invalidateCacheOnAccountSwitch() {
        try {
            const session = JSON.parse(localStorage.getItem('dd_session') || '{}');
            const cachedOwner = localStorage.getItem(SESSION_OWNER_KEY);
            if (session.email && cachedOwner && cachedOwner !== session.email) {
                localStorage.removeItem(STORE_KEY);
                localStorage.removeItem(SESSION_OWNER_KEY);
            }
            if (session.email) {
                localStorage.setItem(SESSION_OWNER_KEY, session.email);
            }
        } catch (_) { }
    }());

    const ROLE_LABELS = {
        superuser: 'Super User',
        partner: 'Travel Partner',
        traveler: 'Traveler',
        vendor: 'Vendor',
        guide: 'Tour Guide',
        support: 'Support Executive',
    };

    const STAKEHOLDER_ROLES = ['traveler', 'partner', 'guide', 'vendor'];
    const MESSAGE_ROLES = ['all', 'traveler', 'partner', 'guide', 'vendor', 'support'];
    const MESSAGE_TRIP_KEY = 'dd_message_trip_id';

    const DESTINATION_DAY_ACTIVITIES = {
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
    const PACKAGE_SCHEDULES = DESTINATION_DAY_ACTIVITIES;

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[char]));
    }

    function escapeJS(value) {
        return String(value ?? '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    }
    if (typeof window !== 'undefined') {
        window.escapeJS = escapeJS;
    }

    // Session helpers — sessionStorage is tab-specific, localStorage is persistent fallback.
    // This allows each browser tab to have its own independent logged-in user.
    function readSession() {
        try {
            let session = JSON.parse(sessionStorage.getItem('dd_session') || 'null');
            if (!session || (!session.email && !session.name && !session.role)) {
                session = JSON.parse(localStorage.getItem('dd_session') || '{}');
            }
            session = session || {};
            const role = session.role || roleFromPath();
            if (!session.name || !session.email) {
                if (role === 'traveler') {
                    session.name = session.name || 'N Bharath';
                    session.email = session.email || 'traveler@gmail.com';
                    session.role = session.role || 'traveler';
                } else if (role === 'partner') {
                    session.name = session.name || 'Dileep';
                    session.email = session.email || 'dileep@gmail.com';
                    session.role = session.role || 'partner';
                } else if (role === 'guide') {
                    session.name = session.name || 'Koushik';
                    session.email = session.email || 'koushik@gmail.com';
                    session.role = session.role || 'guide';
                } else if (role === 'vendor') {
                    session.name = session.name || 'Lokesh';
                    session.email = session.email || 'lokesh@gmail.com';
                    session.role = session.role || 'vendor';
                } else if (role === 'support') {
                    session.name = session.name || 'Mahendra';
                    session.email = session.email || 'mahendra@gmail.com';
                    session.role = session.role || 'support';
                } else if (role === 'superuser') {
                    session.name = session.name || 'Super Admin';
                    session.email = session.email || 'superadmin@gmail.com';
                    session.role = session.role || 'superuser';
                }
            }

            if (!session.picUrl && !session.avatar) {
                try {
                    const state = loadState();
                    const userKey = (session.email || session.name || session.id || '').toLowerCase();
                    if (userKey) {
                        const foundUser = (state.users || []).find(u =>
                            (u.email && u.email.toLowerCase() === userKey) ||
                            (u.name && u.name.toLowerCase() === userKey) ||
                            u.id === session.userId
                        );
                        const foundGuide = (state.guides || []).find(g =>
                            (g.email && g.email.toLowerCase() === userKey) ||
                            (g.name && g.name.toLowerCase() === userKey)
                        );
                        const foundVendor = (state.vendors || []).find(v =>
                            (v.email && v.email.toLowerCase() === userKey) ||
                            (v.name && v.name.toLowerCase() === userKey)
                        );
                        const pic = foundUser?.avatar || foundUser?.picUrl || foundGuide?.avatar || foundGuide?.picUrl || foundVendor?.avatar || foundVendor?.picUrl;
                        if (pic) {
                            session.picUrl = pic;
                            session.avatar = pic;
                        }
                    }
                } catch (_) { }
            }
            return session;
        } catch (_) {
            return {};
        }
    }

    function isTripPaid(trip) {
        if (!trip) return false;
        if (trip.refundRecord && trip.refundRecord.processed) return true;
        if (trip.paymentStatus === 'Unpaid' || trip.paymentStatus === 'not_paid' || trip.isPaid === false || trip.paymentCompleted === false || trip.unpaid === true) return false;
        if (trip.paidAmount !== undefined && Number(trip.paidAmount) <= 0) return false;
        if (trip.paymentStatus === 'Paid' || trip.paymentStatus === 'completed' || trip.paid === true || trip.isPaid === true || trip.paymentCompleted === true) return true;
        if (trip.status === 'requested' || trip.requestStatus === 'Requested' || trip.status === 'planning') return false;
        return true;
    }

    function getDestinationCoverPhoto(trip) {
        if (!trip) return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80';

        if (trip.coverImage || trip.imageUrl || trip.photoUrl || trip.image || trip.customPhoto) {
            return trip.coverImage || trip.imageUrl || trip.photoUrl || trip.image || trip.customPhoto;
        }

        const text = (String(trip.title || '') + ' ' + String(trip.destination || '') + ' ' + String(trip.notes || '')).toLowerCase();

        if (/swiss|alps|zurich|snow|iceland|norway|manali|himalaya|mountain|peak|ski/.test(text)) {
            return 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1600&q=80';
        }
        if (/maldives|beach|island|hawaii|thailand|bali|goa|kerala|cancun|caribbean|coast|ocean|resort/.test(text)) {
            return 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1600&q=80';
        }
        if (/japan|tokyo|kyoto|singapore|china|vietnam|asia|temple|pagoda|sakura/.test(text)) {
            return 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=80';
        }
        if (/paris|france|london|rome|italy|spain|amsterdam|greece|europe|eiffel|colosseum/.test(text)) {
            return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80';
        }
        if (/new york|nyc|dubai|chicago|city|skyline|urban|downtown|tower|los angeles/.test(text)) {
            return 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80';
        }
        if (/kenya|safari|africa|desert|egypt|canyon|wildlife|jungle|national park/.test(text)) {
            return 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=80';
        }

        const fallbackPool = [
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1476514525535-ce74f452623d?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80'
        ];
        let hash = 0;
        const str = String(trip.id || trip.title || trip.destination || '');
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return fallbackPool[Math.abs(hash) % fallbackPool.length];
    }

    function validateTripDates(startDateStr, endDateStr) {
        if (!startDateStr || !endDateStr) {
            return { valid: false, message: 'Please select both start and end dates.' };
        }

        const start = new Date(String(startDateStr).includes('T') ? startDateStr : `${startDateStr}T00:00:00`);
        const end = new Date(String(endDateStr).includes('T') ? endDateStr : `${endDateStr}T00:00:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return { valid: false, message: 'Please enter valid travel dates.' };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        if (startDateOnly < today) {
            return { valid: false, message: 'Start date cannot be in the past. Please select today or a future date.' };
        }

        if (endDateOnly <= startDateOnly) {
            return { valid: false, message: 'End date must be after start date.' };
        }

        const maxAllowedDate = new Date(today);
        maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 8);
        maxAllowedDate.setHours(23, 59, 59, 999);

        if (startDateOnly > maxAllowedDate || endDateOnly > maxAllowedDate) {
            return { valid: false, message: 'Advance booking is available up to 8 months in advance.' };
        }

        return { valid: true };
    }

    function applyTripDateLimits(container = document) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const minDateStr = `${year}-${month}-${day}`;

        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 8);
        const maxYear = maxDate.getFullYear();
        const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
        const maxDay = String(maxDate.getDate()).padStart(2, '0');
        const maxDateStr = `${maxYear}-${maxMonth}-${maxDay}`;

        const target = container || document;
        const dateInputs = target.querySelectorAll('input[type="date"]');
        dateInputs.forEach((input) => {
            input.setAttribute('min', minDateStr);
            input.setAttribute('max', maxDateStr);
        });
    }

    window.validateTripDates = validateTripDates;
    window.applyTripDateLimits = applyTripDateLimits;

    function roleHeader() {
        const map = {
            superuser: 'Super User',
            partner: 'Travel Partner',
            traveler: 'Traveler',
            vendor: 'Vendor',
            guide: 'Tour Guide',
            support: 'Support Executive',
        };
        const r = String(readSession().role || '').toLowerCase();
        return map[r] || 'Travel Partner';
    }

    async function backendRequest(path, options = {}) {
        const session = readSession();
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'x-role': roleHeader(),
                ...(session.email ? { 'x-user-email': session.email } : {}),
                ...(options.headers || {}),
            },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.message || `Backend request failed: ${response.status}`);
        }
        return payload;
    }

    let lastPersistTimestamp = 0;

    function isUserActivelyTyping() {
        try {
            const el = document.activeElement;
            if (!el) return false;
            const tag = (el.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
            if (el.isContentEditable) return true;
        } catch (_) { }
        return false;
    }

    async function hydrateStateFromBackend(force = false) {
        if (backendHydrating || (backendHydrated && !force) || typeof fetch !== 'function') return;
        // Prevent polling overwrite race conditions if a local action occurred recently (within 3 seconds)
        if (Date.now() - lastPersistTimestamp < 3000) return;
        backendHydrating = true;
        try {
            const payload = await backendRequest('/workflow/state');
            const remoteState = payload.data || payload;
            if (remoteState && Array.isArray(remoteState.trips)) {
                let localState = null;
                try {
                    localState = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
                } catch {
                    localState = null;
                }

                let needsPush = false;
                if (localState && Array.isArray(localState.trips)) {
                    const localTripMap = new Map(localState.trips.map((t) => [t.id, t]));
                    const remoteTripMap = new Map(remoteState.trips.map((t) => [t.id, t]));
                    const mergedTrips = [];
                    // Start with ALL remote trips (backend is truth for what exists)
                    for (const [id, remoteTrip] of remoteTripMap) {
                        const localTrip = localTripMap.get(id);
                        if (localTrip) {
                            const localTime = new Date(localTrip.updatedAt || 0).getTime();
                            const remoteTime = new Date(remoteTrip.updatedAt || 0).getTime();
                            if (localTime > remoteTime) {
                                // Local has newer updates (e.g. guide accepted, vendor accepted)
                                mergedTrips.push(localTrip);
                                needsPush = true;
                            } else if (localTrip.status !== 'requested' && remoteTrip.status === 'requested') {
                                // Local is more progressed (e.g. accepted vs requested)
                                mergedTrips.push(localTrip);
                                needsPush = true;
                            } else {
                                mergedTrips.push(remoteTrip);
                            }
                        } else {
                            mergedTrips.push(remoteTrip);
                        }
                    }
                    // Only add local-only trips if they are very recently created (within 60s)
                    // and not yet synced to backend — NOT if they were deleted by admin
                    const now = Date.now();
                    for (const [id, localTrip] of localTripMap) {
                        if (!remoteTripMap.has(id)) {
                            const createdAt = new Date(localTrip.createdAt || 0).getTime();
                            if (now - createdAt < 60000) {
                                // Truly new trip just created locally — push to backend
                                mergedTrips.push(localTrip);
                                needsPush = true;
                            }
                            // else: trip was deleted on backend, do NOT restore it
                        }
                    }
                    remoteState.trips = mergedTrips;
                }

                if (localState && Array.isArray(localState.users)) {
                    const localUserMap = new Map((localState.users || []).map(u => [u.id || (u.email || '').toLowerCase(), u]));
                    remoteState.users = (remoteState.users || []).map(rUser => {
                        const lUser = localUserMap.get(rUser.id) || localUserMap.get((rUser.email || '').toLowerCase());
                        if (lUser && (lUser.availabilityStatus || lUser.availability)) {
                            return {
                                ...rUser,
                                availabilityStatus: lUser.availabilityStatus || lUser.availability,
                                availability: lUser.availability || lUser.availabilityStatus,
                                profile: { ...(rUser.profile || {}), ...(lUser.profile || {}) }
                            };
                        }
                        return rUser;
                    });
                }

                if (localState && Array.isArray(localState.guides)) {
                    const localGuideMap = new Map((localState.guides || []).map(g => [g.id || (g.email || g.name || '').toLowerCase(), g]));
                    remoteState.guides = (remoteState.guides || []).map(rGuide => {
                        const lGuide = localGuideMap.get(rGuide.id) || localGuideMap.get((rGuide.email || rGuide.name || '').toLowerCase());
                        if (lGuide && (lGuide.availabilityStatus || lGuide.status)) {
                            return {
                                ...rGuide,
                                availabilityStatus: lGuide.availabilityStatus || lGuide.status,
                                status: lGuide.availabilityStatus || lGuide.status
                            };
                        }
                        return rGuide;
                    });
                }

                if (localState && Array.isArray(localState.partnerReadItems)) {
                    const mergedReadItems = new Set([
                        ...(remoteState.partnerReadItems || []),
                        ...localState.partnerReadItems
                    ]);
                    remoteState.partnerReadItems = Array.from(mergedReadItems);
                }

                if (localState && Array.isArray(localState.deletedNotifIds)) {
                    const mergedDeleted = new Set([
                        ...(remoteState.deletedNotifIds || []),
                        ...localState.deletedNotifIds
                    ]);
                    remoteState.deletedNotifIds = Array.from(mergedDeleted);
                } else if (!remoteState.deletedNotifIds) {
                    remoteState.deletedNotifIds = [];
                }

                remoteState.version = 5;
                const serializedRemote = JSON.stringify(remoteState);
                const currentLocalStr = localStorage.getItem(STORE_KEY);

                backendHydrated = true;
                if (currentLocalStr !== serializedRemote) {
                    localStorage.setItem(STORE_KEY, serializedRemote);
                    if (needsPush) {
                        persistStateToBackend(remoteState, true);
                    }
                }
                if (!isUserActivelyTyping()) {
                    renderAll();
                }
            }
        } catch (error) {
            console.warn('Backend workflow state unavailable; using local cache.', error.message);
            backendHydrated = true;
        } finally {
            backendHydrating = false;
        }
    }

    // Filter trips for the currently logged-in user's role — applied at RENDER TIME only
    function tripsForCurrentUser(trips) {
        const session = readSession();
        const role = (session.role || roleFromPath() || '').toLowerCase();
        const email = (session.email || '').toLowerCase();
        const name = (session.name || '').toLowerCase();
        const domName = (document.querySelector('[data-session-name]')?.textContent || '').trim().toLowerCase();
        const activeName = name || (domName && domName !== 'sarah johnson' ? domName : '');

        if (role === 'traveler') {
            const activeEmail = (email || '').toLowerCase().trim();
            const activeName = (name || (domName && domName !== 'sarah johnson' && domName !== 'john traveler' ? domName : '')).toLowerCase().trim();

            return (trips || []).filter((trip) => {
                const tripEmail = (trip.travelerEmail || '').toLowerCase().trim();
                const tripName = (trip.travelerName || '').toLowerCase().trim();

                // 1. Strict match by email if trip has travelerEmail
                if (activeEmail && tripEmail) {
                    if (tripEmail === activeEmail) return true;
                }
                // 2. Strict match by name if trip has travelerName
                if (activeName && tripName) {
                    if (tripName === activeName || activeName.includes(tripName) || tripName.includes(activeName)) return true;
                }
                // 3. Fallback for legacy trips with default email/name: only match if session is default traveler
                if (!tripEmail || tripEmail === 'traveler@gmail.com' || tripName === 'n bharath' || tripName === 'john traveler') {
                    if (activeEmail === 'traveler@gmail.com' || activeName === 'n bharath' || activeName === 'john traveler' || (!activeEmail && !activeName)) {
                        return true;
                    }
                }
                return false;
            });
        }
        if (role === 'guide') {
            return (trips || []).filter((trip) => {
                if (!trip.guide) return false;
                const guideEmail = String(trip.guide.email || '').trim().toLowerCase();
                const guideName = String(trip.guide.name || '').trim().toLowerCase();
                if (email && guideEmail && guideEmail === email) return true;
                if (activeName && guideName && (guideName === activeName || activeName.includes(guideName) || guideName.includes(activeName))) return true;
                if (!email && trip.guide) return true;
                return false;
            });
        }
        if (role === 'vendor') {
            return (trips || []).filter((trip) => {
                if (!trip.vendor) return false;
                const vendorEmail = String(trip.vendor.email || '').trim().toLowerCase();
                const vendorName = String(trip.vendor.name || '').trim().toLowerCase();
                if (email && vendorEmail && vendorEmail === email) return true;
                if (activeName && vendorName && (vendorName === activeName || activeName.includes(vendorName) || vendorName.includes(activeName))) return true;
                if (!email && trip.vendor) return true;
                return false;
            });
        }
        // partner, support, superuser — see all trips
        return trips || [];
    }

    function persistStateToBackend(state, immediate = false) {
        if (typeof fetch !== 'function') return;
        lastPersistTimestamp = Date.now();
        clearTimeout(backendPersistTimer);
        const execute = async () => {
            const workflowState = {
                version: state.version || 5,
                nextTripNumber: state.nextTripNumber || 1,
                nextIssueNumber: state.nextIssueNumber || 1,
                trips: state.trips || [],
                notifications: state.notifications || [],
                deletedNotifIds: state.deletedNotifIds || [],
                issues: state.issues || [],
                messages: state.messages || [],
                guides: state.guides || [],
                vendors: state.vendors || [],
                users: state.users || [],
                packages: state.packages || [],
                partnerReadItems: state.partnerReadItems || [],
            };
            try {
                await backendRequest('/workflow/state', {
                    method: 'PUT',
                    body: JSON.stringify(workflowState),
                });
            } catch (error) {
                console.warn('Could not persist workflow state to backend.', error.message);
            }
        };
        if (immediate) {
            execute();
        } else {
            backendPersistTimer = setTimeout(execute, 50);
        }
    }

    function nowISO() {
        return new Date().toISOString();
    }

    function dateValue(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        const str = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [y, m, d] = str.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        }
        const normalized = str.includes('T') ? str : `${str}T12:00:00`;
        const date = new Date(normalized);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function dateOnly(value) {
        const date = dateValue(value);
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function addDays(value, days) {
        const date = dateValue(value) || new Date();
        const result = new Date(date);
        result.setDate(result.getDate() + Number(days || 0));
        const y = result.getFullYear();
        const m = String(result.getMonth() + 1).padStart(2, '0');
        const d = String(result.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatShortDate(value) {
        const date = dateValue(value);
        if (!date) return 'Pending';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDateRange(trip) {
        if (!trip.startDate || !trip.endDate) return 'Pending dates';
        return `${formatShortDate(trip.startDate)} - ${formatShortDate(trip.endDate)}`;
    }

    function tripDays(trip) {
        const start = dateValue(trip.startDate);
        const end = dateValue(trip.endDate);
        if (!start || !end) return 0;
        const diff = Math.max(0, end.getTime() - start.getTime());
        return Math.round(diff / 86400000) + 1;
    }

    function packageKeyFor(trip) {
        const text = `${trip.title || ''} ${trip.destination || ''}`.toLowerCase();
        if (text.includes('maldives') || text.includes('male')) return 'maldives';
        if (text.includes('swiss') || text.includes('zurich') || text.includes('alps')) return 'swiss';
        if (text.includes('japan') || text.includes('tokyo') || text.includes('kyoto')) return 'japan';
        if (text.includes('goa')) return 'goa';
        if (text.includes('paris') || text.includes('france')) return 'paris';
        if (text.includes('rome') || text.includes('italy')) return 'rome';
        return 'default';
    }

    function buildPackageSchedule(trip) {
        const key = packageKeyFor(trip);
        const dayList = DESTINATION_DAY_ACTIVITIES[key] || DESTINATION_DAY_ACTIVITIES.default;
        const start = trip.startDate || dateOnly(nowISO());
        const totalDays = Math.max(1, tripDays(trip) || 7);
        const isLive = Boolean(trip.scheduleStarted || trip.status === 'ongoing');
        const isCompleted = trip.status === 'completed';

        const schedule = [];

        for (let d = 1; d <= totalDays; d++) {
            const dateStr = addDays(start, d - 1);
            let itemData;

            if (d === 1) {
                itemData = dayList[0] || { time: '09:00', title: 'Arrival, airport pickup and hotel check-in', owner: 'vendor', location: trip.destination || 'Destination Airport' };
            } else if (d === totalDays) {
                itemData = {
                    time: '11:00',
                    title: `Checkout, souvenir farewell & departure transfer (${trip.destination || 'Destination'})`,
                    owner: 'vendor',
                    location: `${trip.destination || 'Destination'} Airport`
                };
            } else {
                const poolIndex = ((d - 1) % (dayList.length - 1)) + 1;
                itemData = dayList[poolIndex] || {
                    time: '10:00',
                    title: `Day ${d} guided destination excursion & sightseeing`,
                    owner: d % 2 === 0 ? 'guide' : 'vendor',
                    location: trip.destination || 'City Center'
                };
            }

            let status = 'upcoming';
            if (isCompleted) {
                status = 'completed';
            } else if (isLive && d === 1) {
                status = 'in-progress';
            }

            schedule.push({
                id: `SCH-${trip.id || 'TRIP'}-${d}`,
                day: d,
                date: dateStr,
                time: itemData.time || '09:00',
                title: itemData.title,
                owner: itemData.owner || 'vendor',
                location: itemData.location || trip.destination || 'Destination',
                status: status,
                updatedBy: 'Travel Partner',
                updatedAt: nowISO(),
                notes: '',
            });
        }

        return schedule;
    }

    function normalizeScheduleItem(item, index, trip) {
        const dayNum = Math.max(1, Number(item.day || index + 1));
        const dayOffset = dayNum - 1;
        const startDate = trip?.startDate || dateOnly(nowISO());
        const calculatedDate = addDays(startDate, dayOffset);
        const isLive = Boolean(trip?.scheduleStarted || trip?.status === 'ongoing');
        const isCompleted = trip?.status === 'completed';

        let status = item.status || 'upcoming';
        if (isCompleted) {
            status = 'completed';
        } else if (!isLive && status === 'in-progress') {
            // Trips that haven't started yet should never show "in-progress"
            status = 'upcoming';
        } else if (isLive && index === 0 && status !== 'completed') {
            status = 'in-progress';
        }

        return {
            id: item.id || `SCH-${trip?.id || 'TRIP'}-${index + 1}`,
            day: dayNum,
            date: calculatedDate,
            time: item.time || '09:00',
            title: item.title || 'Scheduled activity',
            owner: item.owner || (index % 2 ? 'guide' : 'vendor'),
            location: item.location || trip?.destination || 'Destination',
            status: status,
            updatedBy: item.updatedBy || 'Travel Partner',
            updatedAt: item.updatedAt || nowISO(),
            notes: item.notes || '',
        };
    }

    function ensureTripSchedule(trip) {
        const totalDays = Math.max(1, tripDays(trip) || 0);
        const existing = Array.isArray(trip.schedule) ? trip.schedule : [];
        const maxDay = existing.reduce((max, s) => Math.max(max, Number(s.day || 1)), 0);
        const isLive = Boolean(trip.scheduleStarted || trip.status === 'ongoing');
        const isCompleted = trip.status === 'completed';

        // If no schedule exists, or if requested trip duration exceeds existing schedule
        if (!existing.length || (totalDays > 0 && maxDay < totalDays)) {
            trip.schedule = buildPackageSchedule(trip);
        } else {
            trip.schedule = existing.map((item, index) => {
                const norm = normalizeScheduleItem(item, index, trip);
                if (isCompleted) {
                    // All items must be completed when trip is done
                    norm.status = 'completed';
                } else if (!isLive && norm.status === 'in-progress') {
                    // Trips that haven't started yet should never show in-progress
                    norm.status = 'upcoming';
                }
                return norm;
            });
        }

        // Final pass: if trip is completed, guarantee every item is marked completed
        if (isCompleted && Array.isArray(trip.schedule)) {
            trip.schedule = trip.schedule.map(item => ({ ...item, status: 'completed' }));
        }

        return trip.schedule;
    }

    function scheduleStats(trip) {
        const schedule = ensureTripSchedule(trip);
        const completed = schedule.filter((item) => item.status === 'completed').length;
        const active = schedule.filter((item) => item.status === 'in-progress').length;
        const upcoming = schedule.filter((item) => item.status === 'upcoming').length;
        const total = schedule.length || 1;
        return {
            completed,
            active,
            upcoming,
            total,
            percent: Math.min(100, Math.round((completed / total) * 100)),
            current: schedule.find((item) => item.status === 'in-progress') || schedule.find((item) => item.status === 'upcoming') || schedule[total - 1],
        };
    }

    function ownerScheduleCompleted(trip, owner) {
        const items = ensureTripSchedule(trip).filter((item) => item.owner === owner);
        return Boolean(items.length) && items.every((item) => item.status === 'completed');
    }

    function relativeTime(value) {
        const date = dateValue(value);
        if (!date) return 'Just now';
        const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
        if (seconds < 60) return 'Just now';
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        return `${days}d ago`;
    }

    function badgeClassFor(value) {
        const text = String(value || '').toLowerCase();
        if (text.includes('request') || text.includes('pending')) return 'badge-amber';
        if (text.includes('planning') || text.includes('assigned') || text.includes('ready')) return 'badge-blue';
        if (text.includes('accept') || text.includes('progress') || text.includes('active') || text.includes('ongoing')) return 'badge-green';
        if (text.includes('complete')) return 'badge-gray';
        if (text.includes('reject') || text.includes('cancel') || text.includes('delay')) return 'badge-red';
        return 'badge-gray';
    }

    function iconRefresh(root) {
        if (typeof Icons === 'undefined') return;
        (root || document).querySelectorAll('[data-icon]').forEach((el) => {
            const iconName = el.getAttribute('data-icon');
            if (Icons[iconName]) el.innerHTML = Icons[iconName];
        });
    }

    function normalizeTrip(trip) {
        const safe = { ...trip };
        safe.id = safe.id || `TRIP-${Date.now()}`;
        safe.requestId = safe.requestId || safe.id.replace('TRIP', 'REQ');
        safe.title = safe.title || safe.packageName || `${safe.destination || 'Custom'} Trip`;
        safe.destination = safe.destination || 'Custom destination';
        safe.travelerName = safe.travelerName || 'Traveler';
        safe.travelerEmail = safe.travelerEmail || '';
        safe.startDate = safe.startDate || '';
        safe.endDate = safe.endDate || '';
        safe.adults = Number(safe.adults || safe.numAdults || 1);
        safe.children = Number(safe.children || safe.numChildren || 0);
        safe.travelersCount = Number(safe.travelersCount || safe.adults + safe.children || 1);
        safe.budget = Number(safe.budget || 0);
        safe.status = safe.status || 'requested';
        safe.requestStatus = safe.requestStatus || (safe.status === 'requested' ? 'Requested' : 'Accepted');
        safe.stage = safe.stage || stageLabel(safe);
        safe.guideStatus = safe.guideStatus || (safe.guide ? 'Assigned' : 'Pending');
        safe.vendorStatus = safe.vendorStatus || (safe.vendor ? 'Requested' : 'Pending');
        safe.serviceStatus = safe.serviceStatus || safe.vendorStatus;
        safe.progress = Number(safe.progress || 0);
        safe.startedAt = safe.startedAt || '';
        safe.completedAt = safe.completedAt || '';
        safe.scheduleStarted = Boolean(safe.scheduleStarted || safe.status === 'ongoing' || safe.status === 'completed');
        safe.currentLocation = safe.currentLocation || safe.destination;
        safe.currentActivity = safe.currentActivity || 'Awaiting trip coordination';
        safe.accommodationType = safe.accommodationType || 'standard';
        safe.tripPace = safe.tripPace || 'moderate';
        safe.interests = Array.isArray(safe.interests) ? safe.interests : [];
        safe.notes = safe.notes || '';
        safe.createdAt = safe.createdAt || nowISO();
        safe.updatedAt = safe.updatedAt || safe.createdAt;
        safe.updates = Array.isArray(safe.updates) ? safe.updates : [];
        safe.schedule = Array.isArray(safe.schedule) ? safe.schedule.map((item, index) => normalizeScheduleItem(item, index, safe)) : [];
        if (safe.scheduleStarted || safe.status === 'ongoing' || safe.status === 'completed') {
            ensureTripSchedule(safe);
            const stats = scheduleStats(safe);
            safe.progress = safe.status === 'completed' ? 100 : (50 + Math.round(stats.percent * 0.5));
            safe.currentActivity = safe.currentActivity || stats.current?.title || 'Schedule started';
            safe.currentLocation = safe.currentLocation || stats.current?.location || safe.destination;
        }
        return safe;
    }

    function seedState() {
        return {
            version: 5,
            nextTripNumber: 1,
            nextIssueNumber: 1,
            guides: [],
            vendors: [],
            users: [
                { id: 'USER-1', name: 'Super Admin', email: 'superadmin@gmail.com', password: 'admin123', role: 'Super User', status: 'Active', joined: nowISO() },
                { id: 'USER-2', name: 'N Bharath', email: 'traveler@gmail.com', password: '123456', role: 'Traveler', status: 'Active', joined: nowISO() },
                { id: 'USER-3', name: 'Dileep', email: 'dileep@gmail.com', password: '123456', role: 'Travel Partner', status: 'Active', joined: nowISO() },
                { id: 'USER-4', name: 'Mahendra', email: 'mahendra@gmail.com', password: '123456', role: 'Support Executive', status: 'Active', joined: nowISO() },
                { id: 'USER-5', name: 'Lokesh', email: 'lokesh@gmail.com', password: '123456', role: 'Vendor', status: 'Active', joined: nowISO() },
                { id: 'USER-6', name: 'Koushik', email: 'koushik@gmail.com', password: '123456', role: 'Tour Guide', status: 'Active', joined: nowISO() },
            ],
            notifications: [
                {
                    id: 'NTF-SEED-G1',
                    roles: ['guide'],
                    title: 'New Tour Assignment',
                    message: 'You have been assigned as the primary guide for the "Swiss Alps Expedition" starting on April 5th.',
                    type: 'Assignment',
                    createdAt: new Date(Date.now() - 120000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-G2',
                    roles: ['guide'],
                    title: 'Message from Traveler',
                    message: 'Anjali Sharma (Swiss Alps Expedition) sent a message regarding luggage policy.',
                    type: 'Message',
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-G3',
                    roles: ['guide'],
                    title: 'Trip Completed Successfully',
                    message: 'The "Culture Trail: Jaipur" tour has been marked as completed. Traveler feedback is pending.',
                    type: 'Completed',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    readBy: ['guide']
                },
                {
                    id: 'NTF-SEED-G4',
                    roles: ['guide'],
                    title: 'Urgent System Alert',
                    message: 'Mandatory guide briefing for upcoming seasonal tours is scheduled for tomorrow at 10 AM.',
                    type: 'Warning',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-V1',
                    roles: ['vendor'],
                    title: 'New Service Request',
                    message: 'You have been assigned to provide hotel and transfer services for Ooty Hills & Tea Explorer (TRP-101).',
                    type: 'Service Request',
                    createdAt: new Date(Date.now() - 300000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-V2',
                    roles: ['vendor'],
                    title: 'Service Confirmation Approved',
                    message: 'Travel Partner approved luxury coach service for Swiss Alps Expedition.',
                    type: 'Confirmed',
                    createdAt: new Date(Date.now() - 7200000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-V3',
                    roles: ['vendor'],
                    title: 'Vendor Maintenance Notice',
                    message: 'Vendor portal scheduled maintenance tonight at 02:00 AM UTC.',
                    type: 'Warning',
                    createdAt: new Date(Date.now() - 100000000).toISOString(),
                    readBy: ['vendor']
                },
                {
                    id: 'NTF-SEED-S1',
                    roles: ['support'],
                    title: 'Support Ticket Logged',
                    message: 'An issue requires support coordination and resolution updates.',
                    type: 'Support Ticket',
                    createdAt: new Date(Date.now() - 600000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-S2',
                    roles: ['support'],
                    title: 'Emergency Support Requested',
                    message: 'Tour Guide Koushik reported an urgent flight delay issue for Rome Tour group.',
                    type: 'Emergency Alert',
                    createdAt: new Date(Date.now() - 5400000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-S3',
                    roles: ['support'],
                    title: 'Issue Resolution Update',
                    message: 'Ticket #ISS-104 (Transfer Bus AC Repair) confirmed resolved.',
                    type: 'Resolved',
                    createdAt: new Date(Date.now() - 90000000).toISOString(),
                    readBy: ['support']
                },
                {
                    id: 'NTF-SEED-T1',
                    roles: ['traveler'],
                    title: 'Weather Alert',
                    message: 'Rain expected tomorrow afternoon in Paris. Consider bringing an umbrella for outdoor tours.',
                    type: 'Warning',
                    createdAt: new Date(Date.now() - 900000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-T2',
                    roles: ['traveler'],
                    title: 'Schedule Change',
                    message: 'Seine River Cruise timing updated from 5:00 PM to 6:00 PM.',
                    type: 'Trip Update',
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-T3',
                    roles: ['traveler'],
                    title: 'Hotel Check-in Approved',
                    message: 'Early check-in approved at Grand Hotel Paris starting from 11:00 AM.',
                    type: 'Approved',
                    createdAt: new Date(Date.now() - 10800000).toISOString(),
                    readBy: ['traveler']
                },
                {
                    id: 'NTF-SEED-T4',
                    roles: ['traveler'],
                    title: 'Guide Assignment Confirmation',
                    message: 'Koushik has been assigned as your expert local guide for Ooty Hills & Tea Explorer.',
                    type: 'Assignment',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-SU1',
                    roles: ['superuser'],
                    title: 'Platform High-Load Alert',
                    message: 'API server CPU load reached 85% during peak booking window.',
                    type: 'Critical',
                    createdAt: new Date(Date.now() - 1800000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-SU2',
                    roles: ['superuser'],
                    title: 'New User Registration Surge',
                    message: 'Over 150 new traveler accounts registered in the past 24 hours.',
                    type: 'System Alert',
                    createdAt: new Date(Date.now() - 7200000).toISOString(),
                    readBy: []
                },
                {
                    id: 'NTF-SEED-SU3',
                    roles: ['superuser'],
                    title: 'Database Backup Completed',
                    message: 'Automated daily database snapshot archived to cloud storage.',
                    type: 'System Alert',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    readBy: ['superuser']
                }
            ],
            trips: [
                {
                    id: 'TRIP-9',
                    requestId: 'REQ-9',
                    title: 'Ooty Hills & Tea Explorer',
                    travelerName: 'N Bharath',
                    travelerEmail: 'traveler@gmail.com',
                    partnerEmail: 'dileep@gmail.com',
                    destination: 'Ooty, Tamil Nadu, India',
                    startDate: '2026-09-09',
                    endDate: '2026-09-14',
                    adults: 2,
                    children: 0,
                    budget: 30000,
                    paymentStatus: 'Unpaid',
                    status: 'planning',
                    requestStatus: 'Accepted',
                    stage: 'Planning',
                    progress: 10,
                    guideStatus: 'Pending',
                    vendorStatus: 'Pending',
                    serviceStatus: 'Pending',
                    schedule: [
                        { id: 'SCH-TRIP-9-1', day: 1, date: '2026-09-09', time: '09:00', title: 'Arrival pickup and accommodation check-in', owner: 'vendor', location: 'Arrival Terminal', status: 'upcoming' },
                        { id: 'SCH-TRIP-9-2', day: 2, date: '2026-09-10', time: '14:00', title: 'Featured cultural exploration & heritage district tour', owner: 'guide', location: 'Heritage Quarter', status: 'upcoming' }
                    ],
                    updates: [
                        { id: 'UPD-SEED-9', source: 'Travel Partner', title: 'Request Accepted', message: 'Travel partner accepted Ooty Hills & Tea Explorer. Assign guide and vendor next.', status: 'Accepted', createdAt: nowISO() }
                    ]
                }
            ],
        };
    }

    function makeUpdate(source, title, message, status, createdAt) {
        return {
            id: `UPD-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            source,
            title,
            message,
            status: status || 'Info',
            createdAt: createdAt || nowISO(),
        };
    }

    function makeNotification(roles, trip, title, message, type, createdAt) {
        return {
            id: `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            roles: Array.isArray(roles) ? roles : [roles],
            tripId: trip?.id || '',
            tripTitle: trip?.title || '',
            userEmail: trip?.travelerEmail || '',
            travelerEmail: trip?.travelerEmail || '',
            travelerName: trip?.travelerName || '',
            guideEmail: trip?.assignedGuideEmail || trip?.guideEmail || trip?.guide?.email || '',
            guideName: trip?.guide?.name || '',
            vendorEmail: trip?.assignedVendorEmail || trip?.vendorEmail || trip?.vendor?.email || '',
            vendorName: trip?.vendor?.name || '',
            partnerEmail: trip?.partnerEmail || '',
            title,
            message,
            type: type || 'info',
            readBy: [],
            createdAt: createdAt || nowISO(),
        };
    }

    function isNotificationForCurrentUser(notif, session, state) {
        if (!notif) return false;
        const stateObj = state || loadState();
        if (Array.isArray(stateObj?.deletedNotifIds) && stateObj.deletedNotifIds.includes(notif.id)) {
            return false;
        }

        const activeRole = roleFromPath() || session?.role || 'partner';
        const notifRoles = notif.roles || [];

        // 1. Role match check
        const isSalaryNotif = /salary|payroll|disburs/i.test(`${notif.title || ''} ${notif.message || ''}`);
        const notifRecipient = (notif.recipientId || notif.userEmail || '').toLowerCase().trim();
        const currentEmail = (session?.email || '').toLowerCase().trim();
        const currentName = (session?.name || '').toLowerCase().trim();
        const currentId = (session?.id || '').toLowerCase().trim();

        const isDirectRecipient = Boolean(
            notifRecipient && (
                notifRecipient === currentEmail ||
                notifRecipient === currentId ||
                (currentName && (notif.message || '').toLowerCase().includes(currentName))
            )
        );

        const roleMatches = notifRoles.includes(activeRole) || notifRoles.includes('all') || isSalaryNotif || isDirectRecipient || !notifRoles.length;
        if (!roleMatches) return false;

        // Find associated trip in state if any
        let trip = null;
        if (notif.tripId && Array.isArray(state?.trips)) {
            trip = state.trips.find(t => String(t.id) === String(notif.tripId));
        }

        // 2. Traveler Role Validation - STRICT ISOLATION
        if (activeRole === 'traveler') {
            const notifEmail = (notif.travelerEmail || notif.userEmail || '').toLowerCase().trim();
            const notifName = (notif.travelerName || '').toLowerCase().trim();

            if (notifEmail && currentEmail) {
                return notifEmail === currentEmail;
            }
            if (notifName && currentName) {
                return notifName === currentName;
            }

            if (trip) {
                const tripEmail = (trip.travelerEmail || '').toLowerCase().trim();
                const tripName = (trip.travelerName || '').toLowerCase().trim();
                if (tripEmail && currentEmail) return tripEmail === currentEmail;
                if (tripName && currentName) return tripName === currentName;
            }

            if (currentName && notif.message && notif.message.toLowerCase().includes(currentName)) {
                return true;
            }

            if (notif.tripId || notif.travelerEmail || notif.travelerName) {
                return false;
            }

            return true;
        }

        // 3. Tour Guide Role Validation - STRICT ISOLATION
        if (activeRole === 'guide') {
            const notifGuideEmail = (notif.guideEmail || '').toLowerCase().trim();
            const notifGuideName = (notif.guideName || '').toLowerCase().trim();
            if (notifGuideEmail && currentEmail) {
                return notifGuideEmail === currentEmail;
            }
            if (notifGuideName && currentName) {
                return notifGuideName === currentName;
            }
            if (trip) {
                const assignedGuideEmail = (trip.assignedGuideEmail || trip.guideEmail || trip.guide?.email || '').toLowerCase().trim();
                const assignedGuideName = (trip.guide?.name || '').toLowerCase().trim();
                if (assignedGuideEmail && currentEmail) return assignedGuideEmail === currentEmail;
                if (assignedGuideName && currentName) return assignedGuideName === currentName;
                if (assignedGuideEmail || assignedGuideName) return false;
            }
            if (currentName && notif.message && notif.message.toLowerCase().includes(currentName)) {
                return true;
            }
            if (notif.tripId || notif.guideEmail || notif.guideName) {
                return false;
            }
            return true;
        }

        // 4. Vendor Role Validation - STRICT ISOLATION
        if (activeRole === 'vendor') {
            const notifVendorEmail = (notif.vendorEmail || '').toLowerCase().trim();
            const notifVendorName = (notif.vendorName || '').toLowerCase().trim();
            if (notifVendorEmail && currentEmail) {
                return notifVendorEmail === currentEmail;
            }
            if (notifVendorName && currentName) {
                return notifVendorName === currentName;
            }
            if (trip) {
                const assignedVendorEmail = (trip.assignedVendorEmail || trip.vendorEmail || trip.vendor?.email || '').toLowerCase().trim();
                const assignedVendorName = (trip.vendor?.name || '').toLowerCase().trim();
                if (assignedVendorEmail && currentEmail) return assignedVendorEmail === currentEmail;
                if (assignedVendorName && currentName) return assignedVendorName === currentName;
                if (assignedVendorEmail || assignedVendorName) return false;
            }
            if (currentName && notif.message && notif.message.toLowerCase().includes(currentName)) {
                return true;
            }
            if (notif.tripId || notif.vendorEmail || notif.vendorName) {
                return false;
            }
            return true;
        }

        // 5. Support Role Validation - SUPPORT, ISSUE & SALARY/PAYROLL NOTIFICATIONS
        if (activeRole === 'support') {
            const titleLower = (notif.title || '').toLowerCase();
            const msgLower = (notif.message || '').toLowerCase();
            const isSupportNotification = titleLower.includes('support') ||
                titleLower.includes('issue') ||
                titleLower.includes('resolution') ||
                titleLower.includes('help') ||
                titleLower.includes('salary') ||
                titleLower.includes('payroll') ||
                msgLower.includes('support') ||
                msgLower.includes('issue') ||
                msgLower.includes('resolution') ||
                msgLower.includes('salary') ||
                msgLower.includes('payroll') ||
                notif.category === 'support' ||
                Boolean(notif.issueId) ||
                isSalaryNotif ||
                isDirectRecipient;
            return isSupportNotification;
        }

        // 6. Travel Partner Role Validation
        if (activeRole === 'partner') {
            if (trip) {
                const partnerEmail = (trip.partnerEmail || '').toLowerCase().trim();
                const partnerName = (trip.partnerName || trip.partner?.name || '').toLowerCase().trim();
                if (partnerEmail && currentEmail) return partnerEmail === currentEmail;
                if (partnerName && currentName) return partnerName === currentName;
            }
            return true;
        }

        // 7. Superuser Role Validation
        if (activeRole === 'superuser') {
            return true;
        }

        return false;
    }

    function notifyStakeholders(state, trip, title, message, type, roles) {
        state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
        const notif = makeNotification(roles || STAKEHOLDER_ROLES, trip, title, message, type);
        state.notifications.unshift(notif);
        state.notifications = state.notifications.slice(0, 100);
        try {
            const session = readSession();
            if (isNotificationForCurrentUser(notif, session, state)) {
                if (typeof NotificationPopup !== 'undefined') {
                    NotificationPopup.show(notif);
                }
            }
        } catch (_) { }
    }

    function normalizeIssue(issue, index) {
        return {
            id: issue.id || `ISS-${5421 + index}`,
            tripId: issue.tripId || '',
            tripTitle: issue.tripTitle || '',
            reportedBy: issue.reportedBy || 'User',
            reporterRole: issue.reporterRole || 'Traveler',
            type: issue.type || 'General',
            title: issue.title || issue.type || 'Reported Issue',
            description: issue.description || '',
            priority: issue.priority || issue.urgency || 'Medium',
            attachmentUrl: issue.attachmentUrl || issue.photoUrl || issue.screenshotUrl || '',
            status: issue.status || 'Open',
            resolution: issue.resolution || '',
            createdAt: issue.createdAt || nowISO(),
            resolvedAt: issue.resolvedAt || '',
        };
    }

    function normalizeMessage(message, index) {
        const toRoles = Array.isArray(message.toRoles) ? message.toRoles : [message.toRole || 'all'];
        const fromRole = message.fromRole || 'traveler';
        const readBy = Array.isArray(message.readBy) ? message.readBy : [];
        if (!readBy.includes(fromRole)) readBy.push(fromRole);
        return {
            id: message.id || `MSG-${Date.now()}-${index}`,
            tripId: message.tripId || '',
            tripTitle: message.tripTitle || '',
            fromRole,
            fromName: message.fromName || ROLE_LABELS[fromRole] || 'Member',
            toRoles: toRoles.length ? toRoles : ['all'],
            body: message.body || message.message || '',
            createdAt: message.createdAt || nowISO(),
            readBy,
        };
    }

    function updateCompletionFromSchedule(trip) {
        if (!trip.scheduleStarted) return;
        const stats = scheduleStats(trip);
        if (stats.completed === stats.total) {
            trip.status = 'completed';
            trip.stage = 'Completed';
            trip.completedAt = trip.completedAt || nowISO();
            trip.currentActivity = 'Tour completed';
            trip.currentLocation = trip.destination;
            trip.progress = 100;
        } else {
            trip.progress = 50 + Math.round(stats.percent * 0.5);
            if (stats.current) {
                trip.currentActivity = stats.current.title;
                trip.currentLocation = stats.current.location || trip.destination;
            }
        }
    }

    function loadState() {
        let parsed = null;
        try {
            parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        } catch {
            parsed = null;
        }

        if (!parsed || !Array.isArray(parsed.trips) || parsed.trips.length === 0) {
            parsed = seedState();
            parsed.trips.forEach((trip) => {
                (trip.updates || []).slice(0, 3).forEach((update) => {
                    parsed.notifications.push(makeNotification(STAKEHOLDER_ROLES, trip, update.title, update.message, update.status, update.createdAt));
                });
            });
            saveState(parsed, false, false);
            return parsed;
        }

        parsed.version = 5;
        parsed.guides = Array.isArray(parsed.guides) ? parsed.guides : [];
        parsed.vendors = Array.isArray(parsed.vendors) ? parsed.vendors : [];
        parsed.users = Array.isArray(parsed.users) ? parsed.users : [];
        parsed.deletedNotifIds = Array.isArray(parsed.deletedNotifIds) ? parsed.deletedNotifIds : [];
        const deletedSet = new Set(parsed.deletedNotifIds);
        parsed.notifications = (Array.isArray(parsed.notifications) ? parsed.notifications : []).filter(n => !deletedSet.has(n.id));
        parsed.issues = Array.isArray(parsed.issues) ? parsed.issues.map(normalizeIssue) : [];
        parsed.messages = Array.isArray(parsed.messages) ? parsed.messages.map(normalizeMessage) : [];
        parsed.trips = parsed.trips.map(normalizeTrip);
        const maxTripNumber = parsed.trips.reduce((max, trip) => {
            const number = Number(String(trip.id).replace(/\D/g, ''));
            return Number.isFinite(number) ? Math.max(max, number) : max;
        }, 0);
        const maxIssueNumber = parsed.issues.reduce((max, issue) => {
            const number = Number(String(issue.id).replace(/\D/g, ''));
            return Number.isFinite(number) ? Math.max(max, number) : max;
        }, 0);
        parsed.nextTripNumber = Math.max(Number(parsed.nextTripNumber || 0), maxTripNumber + 1);
        parsed.nextIssueNumber = Math.max(Number(parsed.nextIssueNumber || 0), maxIssueNumber + 1);
        if (!parsed.notifications.length && !parsed.notificationsInitialized && !parsed.deletedNotifIds.length) {
            parsed.notificationsInitialized = true;
            parsed.trips.forEach((trip) => {
                (trip.updates || []).slice(0, 3).forEach((update) => {
                    parsed.notifications.push(makeNotification(STAKEHOLDER_ROLES, trip, update.title, update.message, update.status, update.createdAt));
                });
            });
        }
        saveState(parsed, false, false);
        return parsed;
    }

    function saveState(state, notify = true, persist = true) {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
        if (persist) persistStateToBackend(state);
        if (notify) {
            window.dispatchEvent(new CustomEvent('ddworkflow:change', { detail: state }));
        }
    }

    function addUpdate(trip, source, title, message, status) {
        trip.updates = Array.isArray(trip.updates) ? trip.updates : [];
        trip.updates.unshift(makeUpdate(source, title, message, status));
        trip.updates = trip.updates.slice(0, 20);
        trip.updatedAt = nowISO();
    }

    function stageLabel(trip) {
        if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') return 'Cancellation Requested';
        if (trip.status === 'requested') return 'New Request';
        if (trip.status === 'cancelled') return 'Cancelled';
        if (trip.status === 'completed') return 'Completed';
        if (trip.status === 'ongoing') return 'Ongoing';
        if (trip.guideStatus === 'Accepted' && ['Accepted', 'In Progress', 'Completed'].includes(trip.vendorStatus)) {
            return trip.paymentStatus === 'Paid' ? 'Ready' : 'Payment Pending';
        }
        if (trip.guideStatus === 'Assigned' || trip.vendorStatus === 'Requested') return 'Assignments Pending';
        return 'Planning';
    }

    function updateTrip(id, updater) {
        const state = loadState();
        const trip = state.trips.find((item) => item.id === id || item.requestId === id);
        if (!trip) return null;
        updater(trip, state);
        trip.stage = stageLabel(trip);
        trip.updatedAt = nowISO();
        saveState(state, true, true);
        persistStateToBackend(state, true);
        return trip;
    }

    function makeTripRequest(data) {
        const dateCheck = validateTripDates(data.startDate, data.endDate);
        if (!dateCheck.valid) {
            throw new Error(dateCheck.message);
        }

        const state = loadState();
        const session = readSession();
        const nextNumber = Number(state.nextTripNumber || 1);
        const id = `TRIP-${nextNumber}`;
        const interests = Array.isArray(data.interests) ? data.interests : [];
        let schedule = [];
        const tempTrip = { id, startDate: data.startDate, endDate: data.endDate, destination: data.destination || data.pkgDest, title: data.packageName || data.pkgName };
        schedule = buildPackageSchedule(tempTrip);

        const domName = document.querySelector('[data-session-name]')?.textContent?.trim();
        const travelerName = session.name || data.travelerName || (domName && domName !== 'Sarah Johnson' && domName !== 'John Traveler' ? domName : '') || 'N Bharath';
        const travelerEmail = session.email || data.travelerEmail || 'traveler@gmail.com';

        const pkgLower = (data.packageName || data.pkgName || '').toLowerCase();
        const destLower = (data.destination || data.pkgDest || '').toLowerCase();
        const isCustom = !pkgLower || pkgLower.includes('custom');
        const PACKAGE_MIN_BUDGETS = {
            'paris': 1200,
            'tokyo': 1500,
            'bali': 800,
            'rome': 1000,
            'new york': 1100,
            'london': 1300,
            'swiss': 1600,
            'alps': 1600
        };
        let minBudget = 0;
        if (!isCustom) {
            const key = Object.keys(PACKAGE_MIN_BUDGETS).find(k => pkgLower.includes(k) || destLower.includes(k));
            minBudget = key ? PACKAGE_MIN_BUDGETS[key] : 500;
        }
        const userBudget = Number(data.budget || 0);
        const finalBudget = userBudget > 0 ? Math.max(userBudget, minBudget) : (minBudget > 0 ? minBudget : 0);

        const trip = normalizeTrip({
            id,
            requestId: id.replace('TRIP', 'REQ'),
            title: data.packageName || data.pkgName || `${data.destination || 'Custom'} Trip`,
            travelerName,
            travelerEmail,
            destination: data.destination || data.pkgDest || 'Custom destination',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            adults: Number(data.adults || data.numAdults || 1),
            children: Number(data.children || data.numChildren || 0),
            budget: finalBudget,
            paymentStatus: 'Unpaid',
            status: 'requested',
            requestStatus: 'Requested',
            stage: 'New Request',
            progress: 0,
            accommodationType: data.accommodationType || 'standard',
            tripPace: data.tripPace || 'moderate',
            interests,
            notes: data.notes || '',
            currentActivity: 'Waiting for travel partner approval',
            schedule: schedule,
            updates: [],
        });
        addUpdate(trip, 'Traveler', 'Trip Requested', `${trip.travelerName} requested ${trip.title} for ${trip.destination}.`, 'Requested');
        notifyStakeholders(state, trip, 'New Trip Request', `${trip.travelerName} requested ${trip.title}. Travel partner approval is required.`, 'Requested', ['partner']);
        state.trips.unshift(trip);
        state.nextTripNumber = nextNumber + 1;
        saveState(state, true, true);
        persistStateToBackend(state, true);
        return trip;
    }

    function deleteTrip(tripId) {
        if (!tripId) return;
        const state = loadState();
        const trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
        if (trip && trip.status === 'completed') {
            notify('Completed trips cannot be deleted as they form part of historical records.', 'warning');
            return;
        }
        const initialCount = (state.trips || []).length;
        state.trips = (state.trips || []).filter(t => t.id !== tripId && t.requestId !== tripId);
        if ((state.trips || []).length !== initialCount) {
            saveState(state, true, true);
            persistStateToBackend(state, true);
            renderAll();
        }
    }

    function memberNameForRole(role, trip) {
        if (role === 'traveler') return trip?.travelerName || 'Traveler';
        if (role === 'partner') return 'Travel Partner';
        if (role === 'guide') return trip?.guide?.name || 'Tour Guide';
        if (role === 'vendor') return trip?.vendor?.name || 'Vendor';
        if (role === 'support') return 'Support Executive';
        return 'Trip Members';
    }

    function rolesForMessageNotification(toRole, fromRole) {
        if (!toRole || toRole === 'all') return [...STAKEHOLDER_ROLES, 'support'];
        return Array.from(new Set([toRole, fromRole].filter(Boolean)));
    }

    function sendMemberMessage(data) {
        const state = loadState();
        const trip = state.trips.find((item) => item.id === data.tripId) || latestTravelerTrip(state);
        if (!trip || !trip.id) {
            notify('No active trip available to send messages.', 'warning');
            return null;
        }
        const fromRole = data.fromRole || roleFromPath();
        const session = readSession();
        const fromName = data.fromName || session.name || memberNameForRole(fromRole, trip);
        const toRole = data.toRole || 'all';
        const message = normalizeMessage({
            tripId: trip?.id || data.tripId || '',
            tripTitle: trip?.title || '',
            fromRole,
            fromName,
            toRoles: toRole === 'all' ? ['all'] : [toRole],
            body: data.body || data.message || '',
            createdAt: nowISO(),
        }, state.messages?.length || 0);
        if (!message.body.trim()) return null;
        state.messages = Array.isArray(state.messages) ? state.messages : [];
        state.messages.unshift(message);
        state.messages = state.messages.slice(0, 200);
        if (trip) {
            addUpdate(trip, ROLE_LABELS[fromRole] || fromName, 'Message Sent', `${fromName}: ${message.body}`, 'Message');
            notifyStakeholders(
                state,
                trip,
                `Message from ${ROLE_LABELS[fromRole] || fromName}`,
                `${fromName} sent a message on ${trip.id}: ${message.body}`,
                'Message',
                rolesForMessageNotification(toRole, fromRole)
            );
        }
        saveState(state);
        return message;
    }

    function requestTripCancellation(id, reason = 'Traveler requested trip cancellation.') {
        return updateTrip(id, (trip, state) => {
            if (trip.status === 'completed') {
                notify('Completed trips cannot be cancelled.', 'warning');
                return;
            }
            trip.cancellationRequested = true;
            trip.cancellationStatus = 'Pending';
            trip.cancellationRequestedAt = nowISO();
            trip.cancellationReason = reason;
            addUpdate(trip, 'Traveler', 'Cancellation Requested', `${trip.travelerName || 'Traveler'} submitted a cancellation request: "${reason}". Waiting for Travel Partner approval.`, 'Pending');
            notifyStakeholders(state, trip, 'Trip Cancellation Request', `${trip.travelerName || 'Traveler'} has requested to cancel ${trip.title} (${trip.id}). Please review and accept or decline.`, 'Pending', ['partner', 'support']);
        });
    }

    function acceptTripCancellation(id) {
        return updateTrip(id, (trip, state) => {
            trip.status = 'cancelled';
            trip.requestStatus = 'Cancelled';
            trip.cancellationRequested = false;
            trip.cancellationStatus = 'Accepted';
            trip.cancellationApprovedAt = nowISO();
            addUpdate(trip, 'Travel Partner', 'Trip Cancelled', `Travel partner approved the cancellation request for ${trip.title}. Awaiting Super Admin refund processing.`, 'Cancelled');
            notifyStakeholders(state, trip, 'Trip Cancellation Accepted', `Travel partner approved the cancellation request for ${trip.title}. Super Admin action required for processing refund.`, 'Cancelled', ['partner', 'traveler', 'guide', 'vendor', 'support', 'superuser']);
        });
    }

    function rejectTripCancellation(id, reason = 'Travel partner declined the cancellation request.') {
        return updateTrip(id, (trip, state) => {
            trip.cancellationRequested = false;
            trip.cancellationStatus = 'Declined';
            trip.cancellationDeclinedAt = nowISO();
            addUpdate(trip, 'Travel Partner', 'Cancellation Declined', `Travel partner declined the cancellation request for ${trip.title}. Trip remains active.`, 'Ongoing');
            notifyStakeholders(state, trip, 'Cancellation Declined', `Travel partner declined the cancellation request for ${trip.title}. The trip remains active.`, 'Info', ['traveler', 'partner', 'support']);
        });
    }

    function cancelTrip(id, reason = 'Trip cancelled.') {
        const session = readSession();
        const state = loadState();
        const trip = (state.trips || []).find((t) => t.id === id || t.requestId === id);
        if (trip && trip.status === 'completed') {
            notify('Completed trips cannot be cancelled or deleted.', 'warning');
            return null;
        }
        const roleLower = String(session?.role || '').toLowerCase();
        const isTravelerSession = roleLower.includes('traveler') || roleLower.includes('customer') || roleLower === 'user' || !session?.role;
        // If traveler initiates cancellation, send request to Travel Partner for approval
        if (isTravelerSession) {
            return requestTripCancellation(id, reason);
        }
        // Direct cancellation by Travel Partner / Super User
        return updateTrip(id, (trip, state) => {
            trip.status = 'cancelled';
            trip.requestStatus = 'Cancelled';
            trip.cancellationRequested = false;
            trip.cancellationStatus = 'Accepted';
            addUpdate(trip, session.role || 'Travel Partner', 'Trip Cancelled', `${session.name || 'Travel Partner'} cancelled the trip.`, 'Cancelled');
            notifyStakeholders(state, trip, 'Trip Cancelled', `${session.name || 'Travel Partner'} cancelled ${trip.title}.`, 'Cancelled');
        });
    }

    function acceptTrip(id) {
        return updateTrip(id, (trip, state) => {
            trip.status = 'planning';
            trip.requestStatus = 'Accepted';
            trip.progress = Math.max(trip.progress, 10);
            trip.currentActivity = 'Travel partner accepted the request';
            addUpdate(trip, 'Travel Partner', 'Request Accepted', `Travel partner accepted ${trip.title}. Assign guide and vendor next.`, 'Accepted');
            notifyStakeholders(state, trip, 'Trip Request Accepted', `Travel partner accepted ${trip.title}. Guide and vendor assignment will follow.`, 'Accepted');
        });
    }

    function rejectTrip(id, reason = 'Travel partner rejected the trip request.') {
        return updateTrip(id, (trip, state) => {
            trip.status = 'cancelled';
            trip.requestStatus = 'Rejected';
            addUpdate(trip, 'Travel Partner', 'Request Rejected', reason, 'Cancelled');
            notifyStakeholders(state, trip, 'Trip Request Rejected', `Travel partner rejected request for ${trip.title}. Reason: ${reason}`, 'Cancelled', ['partner', 'traveler', 'support']);
        });
    }

    function approveItinerary(id, note = 'Travel partner approved the modified itinerary and preferences.') {
        return updateTrip(id, (trip, state) => {
            trip.itineraryApproved = true;
            addUpdate(trip, 'Travel Partner', 'Itinerary Changes Approved', note, 'Approved');
            notifyStakeholders(state, trip, 'Itinerary Changes Approved', `Your itinerary modifications for ${trip.title} have been approved.`, 'Accepted', ['partner', 'traveler', 'guide']);
        });
    }

    function ackCancellation(id) {
        return updateTrip(id, (trip, state) => {
            trip.cancellationAcknowledged = true;
            addUpdate(trip, 'Travel Partner', 'Cancellation Acknowledged', `Travel partner acknowledged the cancellation for ${trip.title}.`, 'Cancelled');
            notifyStakeholders(state, trip, 'Cancellation Acknowledged', `Travel partner processed cancellation for ${trip.title}.`, 'Cancelled', ['partner', 'traveler', 'support']);
        });
    }

    function sendTripToSupport(id) {
        return updateTrip(id, (trip, state) => {
            trip.supportStatus = 'Sent';
            addUpdate(trip, 'Travel Partner', 'Sent to Support', `Trip ${trip.id} sent to support executive for coordination.`, 'Info');
            notifyStakeholders(state, trip, 'Trip Sent to Support', `Trip ${trip.id} has been sent to support.`, 'Info', ['partner', 'support']);
        });
    }

    function acceptTripSupport(id) {
        return updateTrip(id, (trip, state) => {
            trip.supportStatus = 'Accepted';
            addUpdate(trip, 'Support', 'Support Co-ordinating', `Support executive accepted coordination for ${trip.title}.`, 'Accepted');
            notifyStakeholders(state, trip, 'Support Request Accepted', `Support Executive accepted trip ${trip.id} coordination request.`, 'Accepted', ['partner', 'support']);
        });
    }

    function assignGuide(id, guideName) {
        return updateTrip(id, (trip, state) => {
            const guide = assignableGuides(state).find((item) => item.name === guideName || item.id === guideName || item.email === guideName) || { name: guideName, initials: initialsFor(guideName) };
            trip.guide = {
                id: guide.id,
                name: guide.name,
                initials: guide.initials || initialsFor(guide.name),
                email: guide.email || (guide.name === 'Koushik' ? 'koushik@gmail.com' : ''),
                phone: guide.phone || '',
            };
            trip.guideStatus = 'Assigned';
            trip.assignedGuideEmail = trip.guide.email;
            if (!trip.budgetShare) {
                const totalB = Number(trip.budget || 1200);
                trip.budgetShare = {
                    guidePercent: 50,
                    vendorPercent: 50,
                    guideAmount: Math.round((totalB * 50) / 100),
                    vendorAmount: Math.round((totalB * 50) / 100),
                    partnerPercent: 0,
                    partnerAmount: 0,
                    supportPercent: 0,
                    supportAmount: 0,
                    totalBudget: totalB
                };
            }
            trip.progress = Math.max(trip.progress, 15);
            trip.currentActivity = `${guide.name} assigned as tour guide`;
            addUpdate(trip, 'Travel Partner', 'Guide Assigned', `${guide.name} was assigned to ${trip.id}. Waiting for guide acceptance.`, 'Assigned');
            notifyStakeholders(state, trip, 'Tour Guide Assignment Requested', `${guide.name} was requested for ${trip.title}. The guide must accept before the trip can start.`, 'Assigned', ['partner', 'traveler', 'guide']);
        });
    }

    function assignVendor(id, vendorName, serviceType) {
        return updateTrip(id, (trip, state) => {
            const vendor = assignableVendors(state).find((item) => item.name === vendorName || item.id === vendorName || item.email === vendorName) || { name: vendorName, type: serviceType || 'Service' };
            trip.vendor = {
                id: vendor.id,
                name: vendor.name,
                type: serviceType || vendor.type || 'Service',
                email: vendor.email || (vendor.name === 'Lokesh' ? 'lokesh@gmail.com' : ''),
                phone: vendor.phone || '',
                location: vendor.location || '',
            };
            trip.vendorStatus = 'Requested';
            trip.serviceStatus = 'Pending';
            trip.assignedVendorEmail = trip.vendor.email;
            if (!trip.budgetShare) {
                const totalB = Number(trip.budget || 1200);
                trip.budgetShare = {
                    guidePercent: 50,
                    vendorPercent: 50,
                    guideAmount: Math.round((totalB * 50) / 100),
                    vendorAmount: Math.round((totalB * 50) / 100),
                    partnerPercent: 0,
                    partnerAmount: 0,
                    supportPercent: 0,
                    supportAmount: 0,
                    totalBudget: totalB
                };
            }
            trip.progress = Math.max(trip.progress, 15);
            trip.currentActivity = `${vendor.name} requested for ${trip.vendor.type}`;
            addUpdate(trip, 'Travel Partner', 'Vendor Requested', `${vendor.name} was requested for ${trip.vendor.type} on ${trip.id}.`, 'Pending');
            notifyStakeholders(state, trip, 'Vendor Assigned To Trip', `${vendor.name} was assigned for ${trip.vendor.type} on ${trip.title}. The vendor must accept before the trip can start.`, 'Pending', ['partner', 'traveler', 'vendor']);
        });
    }

    function acceptGuide(id) {
        return updateTrip(id, (trip, state) => {
            trip.guideStatus = 'Accepted';
            if (trip.guide) trip.assignedGuideEmail = trip.guide.email || trip.assignedGuideEmail || '';
            trip.progress = Math.max(trip.progress, 25);
            trip.currentActivity = `${trip.guide?.name || 'Guide'} accepted the assignment`;
            addUpdate(trip, 'Guide', 'Assignment Accepted', `${trip.guide?.name || 'Guide'} accepted ${trip.id}.`, 'Accepted');
            notifyStakeholders(state, trip, 'Guide Accepted Assignment', `${trip.guide?.name || 'Guide'} accepted the assignment for ${trip.title}.`, 'Accepted', ['partner', 'traveler', 'guide', 'vendor']);
        });
    }

    function rejectGuide(id) {
        return updateTrip(id, (trip, state) => {
            const guideName = trip.guide?.name || 'Guide';
            trip.guide = null;
            trip.guideStatus = 'Pending';
            trip.assignedGuideEmail = '';
            addUpdate(trip, 'Guide', 'Assignment Rejected', `${guideName} rejected ${trip.id}. Reassign another guide.`, 'Rejected');
            notifyStakeholders(state, trip, 'Guide Rejected Assignment', `${guideName} rejected ${trip.title}. Travel partner must assign another guide.`, 'Rejected', ['partner', 'traveler', 'guide']);
        });
    }

    function acceptVendor(id) {
        return updateTrip(id, (trip, state) => {
            trip.vendorStatus = 'Accepted';
            trip.serviceStatus = 'Accepted';
            if (trip.vendor) trip.assignedVendorEmail = trip.vendor.email || trip.assignedVendorEmail || '';
            trip.progress = Math.max(trip.progress, 25);
            trip.currentActivity = `${trip.vendor?.name || 'Vendor'} accepted the service request`;
            addUpdate(trip, 'Vendor', 'Service Accepted', `${trip.vendor?.name || 'Vendor'} accepted ${trip.vendor?.type || 'service'} for ${trip.id}.`, 'Accepted');
            notifyStakeholders(state, trip, 'Vendor Accepted Service', `${trip.vendor?.name || 'Vendor'} accepted ${trip.vendor?.type || 'service'} for ${trip.title}.`, 'Accepted', ['partner', 'traveler', 'guide', 'vendor']);
        });
    }

    function rejectVendor(id) {
        return updateTrip(id, (trip, state) => {
            const vendorName = trip.vendor?.name || 'Vendor';
            trip.vendor = null;
            trip.vendorStatus = 'Pending';
            trip.serviceStatus = 'Pending';
            addUpdate(trip, 'Vendor', 'Service Rejected', `${vendorName} rejected the service request for ${trip.id}.`, 'Rejected');
            notifyStakeholders(state, trip, 'Vendor Rejected Service', `${vendorName} rejected the service request for ${trip.title}. Travel partner must assign another vendor.`, 'Rejected');
        });
    }

    function canStartTrip(trip) {
        if (!trip) return false;
        const isSupportPending = trip.supportStatus === 'Sent';
        const isPaidOrConfirmed = trip.paymentStatus === 'Paid' || (trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted');
        return trip.status !== 'cancelled' && isPaidOrConfirmed && !isSupportPending;
    }

    function startTrip(id) {
        const session = readSession();
        const roleLower = String(session.role || roleFromPath() || '').toLowerCase();
        if (roleLower.includes('traveler')) {
            const reason = 'Trips must be initiated by your Travel Partner. Please contact your Travel Partner to start the trip schedule.';
            if (typeof notify === 'function') notify(reason, 'warning');
            return null;
        }
        return updateTrip(id, (trip, state) => {
            if (!canStartTrip(trip)) {
                let reason = 'Guide and vendor must both accept before this trip can start.';
                if (trip.supportStatus === 'Sent') {
                    reason = 'This trip was sent to Support Executive and is awaiting Support acceptance before it can start.';
                } else if (trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted' && trip.paymentStatus !== 'Paid') {
                    reason = `Traveler must complete the trip payment (${formatMoney(trip.budget || 1200)}) before the trip can start.`;
                }
                addUpdate(trip, 'Travel Partner', 'Start Blocked', reason, 'Pending');
                notifyStakeholders(state, trip, 'Trip Start Blocked', `${trip.title}: ${reason}`, 'Pending', ['partner']);
                if (typeof notify === 'function') notify(reason, 'warning');
                return;
            }
            trip.status = 'ongoing';
            trip.scheduleStarted = true;
            trip.startedAt = nowISO();
            ensureTripSchedule(trip);
            trip.schedule.forEach((item, index) => {
                if (item.status !== 'completed') item.status = index === 0 ? 'in-progress' : 'upcoming';
            });
            const stats = scheduleStats(trip);
            trip.progress = 50 + Math.round(stats.percent * 0.5);
            trip.currentActivity = stats.current?.title || 'Trip started';
            trip.currentLocation = stats.current?.location || trip.destination;
            addUpdate(trip, 'Travel Partner', 'Trip Started', `${trip.title} started by Travel Partner with the planned package schedule from ${formatShortDate(trip.startDate)} to ${formatShortDate(trip.endDate)}.`, 'Ongoing');
            notifyStakeholders(state, trip, 'Trip Started', `${trip.title} has been started by your Travel Partner. The package schedule is visible to traveler, guide, vendor, and travel partner.`, 'Ongoing');
        });
    }

    function updateScheduleProgress(trip, owner, data) {
        ensureTripSchedule(trip);
        let active = data.scheduleItemId ? trip.schedule.find((item) => item.id === data.scheduleItemId) : null;
        if (!active) active = trip.schedule.find((item) => item.status === 'in-progress' && item.owner === owner);
        if (!active) active = trip.schedule.find((item) => item.status === 'in-progress');
        if (!active) active = trip.schedule.find((item) => item.status === 'upcoming' && item.owner === owner);
        if (!active) active = trip.schedule.find((item) => item.status === 'upcoming');
        if (!active) return null;

        const shouldComplete = data.complete || data.status === 'completed';
        active.status = shouldComplete ? 'completed' : 'in-progress';
        active.notes = data.notes || active.notes;
        active.location = data.location || active.location;
        active.updatedBy = data.updatedBy || (owner === 'guide' ? 'Tour Guide' : 'Vendor');
        active.updatedAt = nowISO();
        active.lastStatus = data.statusText || active.lastStatus || '';

        if (!shouldComplete) {
            trip.schedule.forEach((item) => {
                if (item.id !== active.id && item.status === 'in-progress') item.status = 'upcoming';
            });
        } else if (!trip.schedule.some((item) => item.status === 'in-progress')) {
            const next = trip.schedule.find((item) => item.status === 'upcoming');
            if (next) next.status = 'in-progress';
        }
        updateCompletionFromSchedule(trip);
        return active;
    }

    function guideUpdate(id, data) {
        return updateTrip(id, (trip, state) => {
            const wasCompleted = trip.status === 'completed';
            const statusText = data.statusText || 'Status Update';
            const location = data.location || trip.currentLocation || trip.destination;
            const notes = data.notes || statusText;
            let scheduleItem = null;
            trip.currentLocation = location;
            trip.currentActivity = notes;
            if (data.status === 'started') {
                trip.status = 'ongoing';
                trip.scheduleStarted = true;
                ensureTripSchedule(trip);
                trip.progress = Math.max(trip.progress, 40);
            } else if (data.status === 'location') {
                trip.status = trip.status === 'requested' ? 'planning' : trip.status;
                trip.progress = Math.max(trip.progress, 45);
            } else if (data.status === 'delay') {
                trip.progress = Math.max(trip.progress, 35);
            }
            scheduleItem = updateScheduleProgress(trip, 'guide', {
                scheduleItemId: data.scheduleItemId,
                status: data.status,
                statusText,
                complete: data.status === 'completed',
                notes,
                location,
                updatedBy: trip.guide?.name || 'Tour Guide',
            });
            trip.guideStatus = ownerScheduleCompleted(trip, 'guide') ? 'Completed' : 'Accepted';
            const scheduleText = scheduleItem ? ` for ${scheduleItem.title}` : '';
            addUpdate(trip, 'Guide', statusText, `${statusText}${scheduleText}: ${notes}${location ? ` (${location})` : ''}`, data.status === 'delay' ? 'Warning' : 'Active');
            notifyStakeholders(state, trip, `Guide ${statusText}`, `${trip.guide?.name || 'Guide'} updated ${trip.title}${scheduleText}: ${notes}.`, data.status === 'delay' ? 'Warning' : 'Active');
            if (!wasCompleted && trip.status === 'completed') {
                addUpdate(trip, 'System', 'Tour Completed', `${trip.title} schedule is fully completed.`, 'Completed');
                notifyStakeholders(state, trip, 'Tour Completed', `${trip.title} has been completed.`, 'Completed');
            }
        });
    }

    function guideMessage(id, data) {
        return updateTrip(id, (trip, state) => {
            addUpdate(trip, 'Guide', data.typeText || 'Traveler Guidance', data.message || 'Guidance sent to travelers.', 'Guidance');
            notifyStakeholders(state, trip, data.typeText || 'Traveler Guidance', data.message || 'Guidance sent to travelers.', 'Guidance');
        });
    }

    function vendorUpdate(id, data) {
        return updateTrip(id, (trip, state) => {
            const wasCompleted = trip.status === 'completed';
            const status = data.status || 'progress';
            const statusText = data.statusText || 'In Progress';
            let scheduleItem = null;
            if (status === 'completed') {
                scheduleItem = updateScheduleProgress(trip, 'vendor', { scheduleItemId: data.scheduleItemId, status, statusText, complete: true, notes: data.message, location: data.location, updatedBy: trip.vendor?.name || 'Vendor' });
            } else if (status === 'enroute') {
                trip.progress = Math.max(trip.progress, 35);
                scheduleItem = updateScheduleProgress(trip, 'vendor', { scheduleItemId: data.scheduleItemId, status, statusText, notes: data.message, location: data.location, updatedBy: trip.vendor?.name || 'Vendor' });
            } else {
                trip.progress = Math.max(trip.progress, 45);
                scheduleItem = updateScheduleProgress(trip, 'vendor', { scheduleItemId: data.scheduleItemId, status, statusText, notes: data.message, location: data.location, updatedBy: trip.vendor?.name || 'Vendor' });
            }
            const vendorDone = ownerScheduleCompleted(trip, 'vendor');
            trip.serviceStatus = vendorDone ? 'Completed' : status === 'completed' ? 'In Progress' : statusText;
            trip.vendorStatus = vendorDone ? 'Completed' : status === 'completed' ? 'In Progress' : statusText;
            trip.currentActivity = data.message || `${trip.vendor?.type || 'Service'} ${statusText.toLowerCase()}`;
            const scheduleText = scheduleItem ? ` for ${scheduleItem.title}` : '';
            addUpdate(trip, 'Vendor', `${trip.vendor?.type || 'Service'} Update`, data.message || `${trip.vendor?.name || 'Vendor'} marked ${scheduleText || 'service'} as ${statusText}.`, statusText);
            notifyStakeholders(state, trip, `${trip.vendor?.type || 'Service'} Update`, data.message || `${trip.vendor?.name || 'Vendor'} marked ${trip.title}${scheduleText} as ${statusText}.`, statusText);
            if (!wasCompleted && trip.status === 'completed') {
                addUpdate(trip, 'System', 'Tour Completed', `${trip.title} schedule is fully completed.`, 'Completed');
                notifyStakeholders(state, trip, 'Tour Completed', `${trip.title} has been completed.`, 'Completed');
            }
        });
    }

    function reportIssue(data) {
        const state = loadState();
        const trip = state.trips.find((item) => item.id === data.tripId) || latestTravelerTrip(state) || state.trips[0] || {};
        const number = Number(state.nextIssueNumber || 1);
        const issue = normalizeIssue({
            id: `ISS-${number}`,
            tripId: trip.id || data.tripId || '',
            tripTitle: trip.title || '',
            reportedBy: data.reportedBy || readSession().name || 'User',
            reporterRole: data.reporterRole || ROLE_LABELS[roleFromPath()] || 'Traveler',
            type: data.type || 'General',
            title: data.title || data.type || 'Reported Issue',
            description: data.description || 'No description provided.',
            priority: data.priority || 'Medium',
            attachmentUrl: data.attachmentUrl || data.photoUrl || data.screenshotUrl || '',
            status: 'Open',
            createdAt: nowISO(),
        }, state.issues.length);
        state.issues.unshift(issue);
        state.nextIssueNumber = number + 1;
        if (trip.id) {
            addUpdate(trip, issue.reporterRole, 'Issue Reported', `${issue.title}: ${issue.description}`, issue.priority);
            notifyStakeholders(state, trip, 'Issue Reported', `${issue.reporterRole} ${issue.reportedBy} reported ${issue.title} on ${trip.id}. Support has been notified.`, issue.priority, [...STAKEHOLDER_ROLES, 'support']);
        } else {
            state.notifications.unshift(makeNotification('support', null, 'Issue Reported', `${issue.reportedBy} reported ${issue.title}.`, issue.priority));
        }
        saveState(state);
        return issue;
    }

    function resolveIssue(issueId, resolution) {
        const state = loadState();
        const issue = state.issues.find((item) => item.id === issueId);
        if (!issue) return null;
        issue.status = 'Resolved';
        issue.resolution = resolution || 'Resolved by support executive.';
        issue.resolvedAt = nowISO();
        const trip = state.trips.find((item) => item.id === issue.tripId);
        if (trip) {
            addUpdate(trip, 'Support', 'Issue Resolved', `${issue.id} resolved: ${issue.resolution}`, 'Resolved');
            notifyStakeholders(state, trip, 'Issue Resolved', `${issue.id} for ${trip.title} has been resolved: ${issue.resolution}`, 'Resolved', [...STAKEHOLDER_ROLES, 'support']);

            // Send direct communication to who sent the issue
            const roleMap = {
                'Traveler': 'traveler',
                'Travel Partner': 'partner',
                'Vendor': 'vendor',
                'Tour Guide': 'guide',
                'Support Executive': 'support',
                'Super Admin': 'superadmin'
            };
            const toRole = roleMap[issue.reporterRole] || 'traveler';

            // Add a chat message from support to the reporter
            const msg = normalizeMessage({
                tripId: trip.id,
                tripTitle: trip.title,
                fromRole: 'support',
                fromName: 'Support Executive',
                toRoles: [toRole],
                body: `Confirm Resolution: Issue ${issue.id} ("${issue.title}") has been resolved. Details: ${issue.resolution}`,
                createdAt: nowISO(),
            }, state.messages?.length || 0);

            state.messages = Array.isArray(state.messages) ? state.messages : [];
            state.messages.unshift(msg);
            state.messages = state.messages.slice(0, 200);

            addUpdate(trip, 'Support', 'Resolution Communicated', `Sent resolution confirmation message to ${issue.reporterRole}.`, 'Message');
        }
        saveState(state);
        return issue;
    }

    function submitResolution(target) {
        const state = loadState();
        let issueId = '';
        let resolution = '';

        if (target) {
            issueId = target.dataset?.issueId || target.getAttribute?.('data-issue-id');
            const formCard = target.closest?.('form') || target.closest?.('.form-card') || document.querySelector('form');
            if (formCard) {
                const select = formCard.querySelector('select');
                const textarea = formCard.querySelector('textarea');
                if (select && select.value) {
                    const selVal = select.value;
                    const match = selVal.match(/ISS-\d+/i) || selVal.match(/[\w-]+/);
                    if (match && !issueId) issueId = match[0];
                }
                if (textarea && textarea.value.trim()) {
                    resolution = textarea.value.trim();
                }
            }
        }

        if (!issueId && Array.isArray(state.issues) && state.issues.length) {
            const firstOpen = state.issues.find(i => i.status !== 'Resolved');
            if (firstOpen) issueId = firstOpen.id;
        }

        if (!issueId) {
            notify('Please select an issue to confirm resolution.', 'warning');
            return;
        }

        resolution = resolution || 'Resolution confirmed by Support Executive.';
        const resolvedIssue = resolveIssue(issueId, resolution);

        if (resolvedIssue) {
            saveState(state, true, true);
            persistStateToBackend(state, true);

            if (typeof showSuccessModal === 'function') {
                showSuccessModal('Resolution Confirmed', `Issue ${issueId} has been resolved. All stakeholders have been notified!`, () => {
                    renderAll();
                });
            } else {
                notify(`Issue ${issueId} resolved successfully!`, 'success');
                renderAll();
            }
        } else {
            notify(`Issue ${issueId} not found or already resolved.`, 'warning');
        }
    }
    window.submitResolution = submitResolution;

    function getIssuePhotoUrl(issue) {
        if (!issue) return '';
        return issue.attachmentUrl || issue.photoUrl || issue.screenshotUrl || issue.attachment || issue.photo || '';
    }
    window.getIssuePhotoUrl = getIssuePhotoUrl;

    function viewIssueAttachment(url) {
        if (!url) return;
        let modal = document.getElementById('attachment-lightbox-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'attachment-lightbox-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px);
                z-index: 10000; display: flex; flex-direction: column;
                align-items: center; justify-content: center; padding: 20px;
            `;
            modal.innerHTML = `
                <div style="background: #fff; border-radius: 16px; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                    <div style="padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">📷 Attached Photo / Screenshot</h3>
                        <button onclick="document.getElementById('attachment-lightbox-modal').style.display='none'" style="background: none; border: none; font-size: 20px; font-weight: 700; cursor: pointer; color: #64748b;">✕</button>
                    </div>
                    <div style="padding: 20px; display: flex; justify-content: center; align-items: center; overflow: auto; max-height: 75vh;">
                        <img id="lightbox-image-src" src="" alt="Issue Attachment" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
                    </div>
                    <div style="padding: 12px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: right;">
                        <a id="lightbox-image-open" href="#" target="_blank" class="btn btn-primary" style="display: inline-block; padding: 8px 16px; background: #0ea5e9; color: #fff; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 13px;">Open Full Resolution ↗</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('lightbox-image-src').src = url;
        document.getElementById('lightbox-image-open').href = url;
        modal.style.display = 'flex';
    }
    window.viewIssueAttachment = viewIssueAttachment;

    function renderUploadPreview(zone, url, fileName) {
        try {
            sessionStorage.setItem('dd_issue_attachment_url', url);
            sessionStorage.setItem('dd_issue_attachment_name', fileName || 'Uploaded Photo/Screenshot');
        } catch (e) {}

        zone.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; padding:10px; width:100%;">
                <img src="${url}" alt="Attachment Preview" style="width:60px; height:60px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1; flex-shrink:0;" />
                <div style="flex:1; text-align:left; overflow:hidden;">
                    <div style="font-weight:700; font-size:13px; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(fileName || 'Uploaded Photo/Screenshot')}</div>
                    <div style="font-size:11px; color:#10b981; font-weight:600;"><i data-icon="check"></i> Attached & Ready</div>
                </div>
                <button type="button" class="remove-upload-btn" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 10px; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer; flex-shrink:0;">Remove</button>
            </div>
        `;
        iconRefresh(zone);
        const removeBtn = zone.querySelector('.remove-upload-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    sessionStorage.removeItem('dd_issue_attachment_url');
                    sessionStorage.removeItem('dd_issue_attachment_name');
                } catch (err) {}
                zone.removeAttribute('data-attachment-url');
                const container = zone.closest('.form-panel') || zone.closest('.form-card') || zone.closest('.update-form-card') || zone.closest('form') || document;
                const hiddenInput = container.querySelector('#issue-attachment-url');
                if (hiddenInput) {
                    hiddenInput.value = '';
                    hiddenInput.removeAttribute('data-attachment-url');
                }
                const fileInput = container.querySelector('input[type="file"].issue-file-input');
                if (fileInput) {
                    fileInput.value = '';
                }
                zone.innerHTML = `
                    <div class="upload-icon"><i data-icon="uploadcloud"></i></div>
                    <div class="upload-text">Click to upload or drag and drop</div>
                    <div class="upload-sub">SVG, PNG, JPG or GIF (max. 5MB)</div>
                `;
                iconRefresh(zone);
                delete zone.dataset.initialized;
                initIssueUploadWidgets();
            });
        }
    }

    function initIssueUploadWidgets() {
        const uploadZones = document.querySelectorAll('.upload-zone, [data-upload-zone]');
        uploadZones.forEach((zone) => {
            if (zone.dataset.initialized) return;
            zone.dataset.initialized = 'true';

            const container = zone.closest('.form-panel') || zone.closest('.form-card') || zone.closest('.update-form-card') || zone.closest('form') || zone.parentElement || document.body;

            let fileInput = container.querySelector('input[type="file"].issue-file-input');
            if (!fileInput) {
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.className = 'issue-file-input';
                fileInput.accept = 'image/*,.png,.jpg,.jpeg,.gif,.webp';
                fileInput.style.display = 'none';
                container.appendChild(fileInput);
            }

            let hiddenInput = container.querySelector('#issue-attachment-url');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'issue-attachment-url';
                hiddenInput.name = 'attachmentUrl';
                container.appendChild(hiddenInput);
            }

            zone.style.cursor = 'pointer';

            // Check if there is an existing persistent attachment saved in sessionStorage across reloads
            try {
                const savedUrl = sessionStorage.getItem('dd_issue_attachment_url');
                const savedName = sessionStorage.getItem('dd_issue_attachment_name');
                if (savedUrl && !zone.getAttribute('data-attachment-url')) {
                    hiddenInput.value = savedUrl;
                    hiddenInput.setAttribute('data-attachment-url', savedUrl);
                    zone.setAttribute('data-attachment-url', savedUrl);
                    renderUploadPreview(zone, savedUrl, savedName || 'Uploaded Photo');
                }
            } catch (err) {}

            const compressImageIfNeeded = (file, maxDim = 2048, quality = 0.85) => {
                return new Promise((resolve) => {
                    if (!file || !file.type.startsWith('image/') || file.type.includes('svg')) {
                        return resolve(file);
                    }
                    if (file.size <= 1.5 * 1024 * 1024) {
                        return resolve(file);
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            let w = img.width;
                            let h = img.height;
                            if (w > maxDim || h > maxDim) {
                                if (w > h) {
                                    h = Math.round((h * maxDim) / w);
                                    w = maxDim;
                                } else {
                                    w = Math.round((w * maxDim) / h);
                                    h = maxDim;
                                }
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, w, h);
                            canvas.toBlob(
                                (blob) => {
                                    if (blob && blob.size < file.size) {
                                        const compressed = new File([blob], file.name, {
                                            type: 'image/jpeg',
                                            lastModified: Date.now(),
                                        });
                                        resolve(compressed);
                                    } else {
                                        resolve(file);
                                    }
                                },
                                'image/jpeg',
                                quality
                            );
                        };
                        img.onerror = () => resolve(file);
                        img.src = e.target.result;
                    };
                    reader.onerror = () => resolve(file);
                    reader.readAsDataURL(file);
                });
            };

            const handleFile = async (rawFile) => {
                if (!rawFile) return;
                const uploadText = zone.querySelector('.upload-text');
                if (uploadText) uploadText.textContent = 'Processing photo attachment...';

                // 1. Instantly convert rawFile to Data URL so it is stored in DOM & sessionStorage immediately
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result || '');
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(rawFile);
                });

                if (dataUrl) {
                    hiddenInput.value = dataUrl;
                    hiddenInput.setAttribute('data-attachment-url', dataUrl);
                    zone.setAttribute('data-attachment-url', dataUrl);
                    try {
                        sessionStorage.setItem('dd_issue_attachment_url', dataUrl);
                        sessionStorage.setItem('dd_issue_attachment_name', rawFile.name);
                    } catch (e) {}
                    renderUploadPreview(zone, dataUrl, rawFile.name);
                    notify('Photo attached successfully!', 'success');
                }

                // 2. Compress image in background if large
                try {
                    const file = await compressImageIfNeeded(rawFile);
                    if (file && file !== rawFile) {
                        const compressedUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target.result || '');
                            reader.onerror = () => resolve('');
                            reader.readAsDataURL(file);
                        });
                        if (compressedUrl) {
                            hiddenInput.value = compressedUrl;
                            hiddenInput.setAttribute('data-attachment-url', compressedUrl);
                            zone.setAttribute('data-attachment-url', compressedUrl);
                            try {
                                sessionStorage.setItem('dd_issue_attachment_url', compressedUrl);
                            } catch (e) {}
                        }
                    }
                } catch (e) {
                    console.warn('Image optimization warning:', e);
                }
            };

            const parentForm = zone.closest('form');
            if (parentForm) {
                parentForm.onsubmit = (e) => {
                    e.preventDefault();
                    return false;
                };
                parentForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, true);
            }

            zone.addEventListener('click', (e) => {
                if (e.target.closest('.remove-upload-btn')) return;
                if (e.target === fileInput) return;
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });

            fileInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            fileInput.addEventListener('change', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (fileInput.files && fileInput.files[0]) {
                    handleFile(fileInput.files[0]);
                }
            });

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.borderColor = '#0ea5e9';
            });
            zone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.borderColor = '';
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                zone.style.borderColor = '';
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });
        });
    }

    async function submitReportedIssue(btnTarget) {
        const container = btnTarget ? (btnTarget.closest('.form-panel') || btnTarget.closest('.form-card') || btnTarget.closest('.update-form-card') || btnTarget.closest('form') || document) : document;

        let type = '';
        let priority = 'Medium';
        let tripId = '';
        let title = '';
        let description = '';
        let attachmentUrl = '';

        const selects = container.querySelectorAll('select');
        selects.forEach((select) => {
            const val = select.value || '';
            const labelText = (select.closest('.form-group')?.querySelector('label')?.textContent || '').toLowerCase();
            if (labelText.includes('type')) type = val;
            else if (labelText.includes('urgency') || labelText.includes('severity') || labelText.includes('priority')) priority = val;
            else if (labelText.includes('trip') || labelText.includes('tour')) {
                const match = val.match(/(TRIP|TR|TOUR)-\d+/i) || val.match(/[\w-]+/);
                if (match) tripId = match[0];
                else tripId = val;
            }
        });

        const inputs = container.querySelectorAll('input[type="text"]');
        inputs.forEach((input) => {
            const labelText = (input.closest('.form-group')?.querySelector('label')?.textContent || '').toLowerCase();
            if (labelText.includes('title')) title = input.value.trim();
        });

        const textarea = container.querySelector('textarea');
        if (textarea) description = textarea.value.trim();

        const attachmentInput = container.querySelector('[data-attachment-url], #issue-attachment-url, input[name="attachmentUrl"]');
        if (attachmentInput) {
            attachmentUrl = attachmentInput.dataset?.attachmentUrl || attachmentInput.getAttribute?.('data-attachment-url') || attachmentInput.value || '';
        }
        if (!attachmentUrl) {
            const uploadZone = container.querySelector('.upload-zone, [data-upload-zone]');
            if (uploadZone) {
                attachmentUrl = uploadZone.dataset?.attachmentUrl || uploadZone.getAttribute?.('data-attachment-url') || '';
            }
        }
        if (!attachmentUrl) {
            try {
                attachmentUrl = sessionStorage.getItem('dd_issue_attachment_url') || '';
            } catch (e) {}
        }

        // Safety fallback: If attachmentUrl is still empty but user selected a file in the file input
        if (!attachmentUrl) {
            const fileInput = container.querySelector('input[type="file"].issue-file-input, input[type="file"]');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const rawFile = fileInput.files[0];
                attachmentUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result || '');
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(rawFile);
                });
            }
        }

        if (!title && type) title = `${type} Issue`;
        if (!title) title = 'Reported Issue';
        if (!description) {
            notify('Please describe the issue in detail.', 'warning');
            return;
        }

        const issue = reportIssue({
            tripId,
            type,
            priority,
            title,
            description,
            attachmentUrl,
        });

        if (issue) {
            try {
                sessionStorage.removeItem('dd_issue_attachment_url');
                sessionStorage.removeItem('dd_issue_attachment_name');
            } catch (err) {}
            saveState(loadState(), true, true);
            persistStateToBackend(loadState(), true);

            if (typeof showSuccessModal === 'function') {
                showSuccessModal('Issue Reported Successfully', `Issue ${issue.id} has been submitted with details and photo/screenshot attachment. Support executive has been notified.`, () => {
                    const form = container.querySelector('form') || (container.tagName === 'FORM' ? container : null);
                    if (form) form.reset();
                    renderAll();
                });
            } else {
                notify(`Issue ${issue.id} reported successfully! Support has been notified.`, 'success');
                const form = container.querySelector('form') || (container.tagName === 'FORM' ? container : null);
                if (form) form.reset();
                renderAll();
            }
        }
    }
    window.submitReportedIssue = submitReportedIssue;

    function initialsFor(name) {
        return String(name || 'User').split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2);
    }

    function currentPage() {
        return decodeURIComponent(window.location.pathname.split('/').pop() || '');
    }

    function roleFromPath() {
        const path = decodeURIComponent(window.location.pathname.toLowerCase());
        if (path.includes('/traveler/')) return 'traveler';
        if (path.includes('/travelpartner')) return 'partner';
        if (path.includes('/guide/')) return 'guide';
        if (path.includes('/vendor/')) return 'vendor';
        if (path.includes('/support/')) return 'support';
        if (path.includes('/superuser/')) return 'superuser';
        return readSession().role || 'traveler';
    }

    function routeTo(path) {
        if (!path || path === '#') return;
        var lowerPath = String(path).toLowerCase();
        if (lowerPath === 'profile.html' || lowerPath.endsWith('/profile.html')) {
            var currentPath = window.location.pathname.toLowerCase();
            if (currentPath.includes('/traveler/')) {
                path = 'traveler_profile.html';
            } else if (currentPath.includes('/travelpartner') || currentPath.includes('/travelpartner/')) {
                path = 'travelPartner_profile.html';
            } else if (currentPath.includes('/vendor/')) {
                path = 'vendor_profile.html';
            } else if (currentPath.includes('/superuser/')) {
                path = 'superuser_settings.html';
            } else if (currentPath.includes('/guide/')) {
                path = 'profile.html';
            } else if (currentPath.includes('/support/')) {
                path = 'profile.html';
            } else {
                var session = readSession();
                var role = (session.role || '').toLowerCase();
                if (role.includes('traveler') || role.includes('traveller')) path = 'traveler_profile.html';
                else if (role.includes('partner')) path = 'travelPartner_profile.html';
                else if (role.includes('vendor')) path = 'vendor_profile.html';
                else if (role.includes('super')) path = 'superuser_settings.html';
                else path = 'traveler_profile.html';
            }
        }
        window.location.href = path;
    }

    function confirmThen(title, message, buttonText, tone, callback) {
        if (typeof showConfirmModal === 'function') {
            showConfirmModal(title, message, buttonText, tone || 'green', callback);
            return;
        }
        if (window.confirm(message)) callback();
    }

    function notify(message, type) {
        if (typeof Toast !== 'undefined' && Toast[type || 'success']) Toast[type || 'success'](message);
        else alert(message);
    }

    function canOperateSession() {
        const session = readSession();
        if (!session.email || session.status !== 'Inactive') return true;
        notify('Your account is inactive. You can view pages, but operations are blocked until Super Admin activates it.', 'warning');
        return false;
    }

    function allActiveTrips(state) {
        return state.trips.filter((trip) => trip.status !== 'cancelled');
    }

    function acceptedTrips(state) {
        return allActiveTrips(state).filter((trip) => trip.status !== 'requested');
    }

    function getVendorTrips(state) {
        const session = readSession();
        const trips = (state.trips || []).filter((trip) => trip && trip.vendor && trip.status !== 'cancelled');
        if (session && session.email) {
            const currentEmail = (session.email || '').toLowerCase().trim();
            const currentName = (session.name || '').toLowerCase().trim();
            const currentId = (session.id || '').toLowerCase().trim();
            const matched = trips.filter((trip) => {
                const vEmail = (trip.assignedVendorEmail || trip.vendor?.email || '').toLowerCase().trim();
                const vName = (trip.vendor?.name || '').toLowerCase().trim();
                const vId = (trip.vendor?.id || '').toLowerCase().trim();
                return (vEmail && (vEmail === currentEmail || currentEmail.includes(vEmail))) ||
                       (vName && currentName && (vName === currentName || currentName.includes(vName) || vName.includes(currentName))) ||
                       (vId && vId === currentId);
            });
            if (matched.length > 0) return matched;
        }
        return trips;
    }

    function getGuideTrips(state) {
        const session = readSession();
        const trips = (state.trips || []).filter((trip) => trip && trip.guide && trip.status !== 'cancelled');
        if (session && session.email) {
            const currentEmail = (session.email || '').toLowerCase().trim();
            const currentName = (session.name || '').toLowerCase().trim();
            const currentId = (session.id || '').toLowerCase().trim();
            const matched = trips.filter((trip) => {
                const gEmail = (trip.assignedGuideEmail || trip.guide?.email || '').toLowerCase().trim();
                const gName = (trip.guide?.name || '').toLowerCase().trim();
                const gId = (trip.guide?.id || '').toLowerCase().trim();
                return (gEmail && (gEmail === currentEmail || currentEmail.includes(gEmail))) ||
                       (gName && currentName && (gName === currentName || currentName.includes(gName) || gName.includes(currentName))) ||
                       (gId && gId === currentId);
            });
            if (matched.length > 0) return matched;
        }
        return trips;
    }

    function latestTravelerTrip(state) {
        const userTrips = tripsForCurrentUser(allActiveTrips(state));
        const ordered = userTrips.slice().sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        const active = ordered.find((trip) => !['completed', 'cancelled', 'requested'].includes(trip.status));
        if (active) return active;
        return ordered.find((trip) => trip.status !== 'requested') || ordered[0] || null;
    }

    function statusLabel(trip) {
        if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') return 'Cancellation Requested';
        if (trip.status === 'requested') return 'Requested';
        if (trip.status === 'cancelled') return 'Cancelled';
        if (trip.status === 'completed') return 'Completed';
        if (trip.status === 'ongoing') return 'In Progress';
        return stageLabel(trip);
    }

    function renderBadge(label) {
        return `<span class="badge ${badgeClassFor(label)}">${escapeHTML(label)}</span>`;
    }

    function renderSessionHeader() {
        const session = readSession();
        const role = session.role || roleFromPath();
        const displayName = session.name || null;  // null = don't override HTML default
        const displayRole = ROLE_LABELS[role] || null;
        const initials = displayName ? initialsFor(displayName) : null;
        const picUrl = session.picUrl || session.avatar || null;

        if (displayName) {
            document.querySelectorAll('[data-session-name], .user-info-bold, .user-pill .user-info div:first-child, .profile-name, .user-name').forEach((el) => {
                if (el.tagName === 'INPUT') {
                    el.value = displayName;
                } else {
                    el.textContent = displayName;
                }
            });
        }
        if (displayRole) {
            document.querySelectorAll('[data-session-role], .user-pill .user-info div:nth-child(2), .profile-role').forEach((el) => {
                if (el.tagName === 'INPUT') {
                    el.value = displayRole;
                } else {
                    el.textContent = displayRole;
                }
            });
        }

        const avatarTargets = document.querySelectorAll(
            '[data-session-initials], [data-session-avatar], .avatar, .user-avatar, .sa-header-avatar, ' +
            '.support-avatar, .user-pill > div:first-child, .user-profile > div:first-child, .profile-avatar, ' +
            '.profile-avatar-lg, .profile-avatar-large, .profile-avatar-big, .sa-profile-section .settings-body > div > div:first-child'
        );

        if (picUrl) {
            avatarTargets.forEach((el) => {
                if (el && !el.classList.contains('user-info') && !el.closest('.notif-wrapper') && !el.classList.contains('brand-icon') && !el.classList.contains('sidebar-logo')) {
                    el.innerHTML = `<img src="${escapeHTML(picUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" alt="User Avatar" />`;
                    el.style.padding = '0';
                    el.style.overflow = 'hidden';
                }
            });
        } else if (initials) {
            avatarTargets.forEach((el) => {
                if (el && !el.classList.contains('user-info') && !el.closest('.notif-wrapper') && !el.classList.contains('brand-icon') && !el.classList.contains('sidebar-logo')) {
                    if (el.querySelector('img')) {
                        el.innerHTML = initials.slice(0, 2);
                    } else {
                        el.textContent = initials.slice(0, 2);
                    }
                }
            });
        }
        if (session.email) {
            document.querySelectorAll('[data-session-email]').forEach((el) => {
                if (el.tagName === 'INPUT') {
                    el.value = session.email;
                } else {
                    el.textContent = session.email;
                }
            });
        }
        if (session.phone) {
            document.querySelectorAll('[data-session-phone]').forEach((el) => {
                if (el.tagName === 'INPUT') {
                    el.value = session.phone;
                } else {
                    el.textContent = session.phone;
                }
            });
        }
    }

    // ------------------------------------------------------------------
    //  Profile Page — populate form fields from session data
    // ------------------------------------------------------------------
    function renderProfilePage() {
        const page = currentPage();
        const profilePages = [
            'traveler_profile.html', 'profile.html', 'vendor_profile.html',
            'travelPartner_profile.html', 'superuser_settings.html',
        ];
        if (!profilePages.some((p) => page.endsWith(p))) return;

        const session = readSession();
        if (!session.email && !session.name) return; // nothing to populate without a real session

        const role = session.role || roleFromPath();
        const displayName = session.name || '';
        const displayRole = ROLE_LABELS[role] || role;
        const displayEmail = session.email || '';
        const displayPhone = session.phone || '';
        const initials = initialsFor(displayName);

        // --- Name / role labels in the card sidebar ---
        document.querySelectorAll('.profile-name').forEach((el) => { el.textContent = displayName; });
        document.querySelectorAll('.profile-role').forEach((el) => { el.textContent = displayRole; });

        // --- Email items in sidebar info lists ---
        document.querySelectorAll('.pl-item, .profile-list .pl-item').forEach((el) => {
            if (el.querySelector('[data-icon="mail"]') || el.textContent.includes('@')) {
                const icon = el.querySelector('i');
                el.textContent = displayEmail;
                if (icon) el.prepend(icon);
            }
            if (el.querySelector('[data-icon="phone"]') || el.textContent.includes('+') || el.hasAttribute('data-session-phone')) {
                const icon = el.querySelector('i');
                el.textContent = displayPhone || el.textContent;
                if (icon) el.prepend(icon);
            }
        });

        // --- Form inputs: populate by label proximity ---
        const state = loadState();
        const userKey = (session.email || session.name || session.id || '').toLowerCase();
        const foundUser = (state.users || []).find(u =>
            (u.email && u.email.toLowerCase() === userKey) ||
            (u.name && u.name.toLowerCase() === userKey) ||
            u.id === session.userId
        );
        const foundGuide = (state.guides || []).find(g =>
            (g.email && g.email.toLowerCase() === userKey) ||
            (g.name && g.name.toLowerCase() === userKey) ||
            g.id === session.userId
        );
        const foundVendor = (state.vendors || []).find(v =>
            (v.email && v.email.toLowerCase() === userKey) ||
            (v.name && v.name.toLowerCase() === userKey) ||
            v.id === session.userId
        );

        const currentAvail = session.availabilityStatus ||
            (foundUser && (foundUser.availabilityStatus || foundUser.availability || (foundUser.profile && foundUser.profile.availabilityStatus))) ||
            (foundGuide && (foundGuide.availabilityStatus || (foundGuide.status && !['active', 'inactive'].includes(foundGuide.status.toLowerCase()) ? foundGuide.status : null))) ||
            (foundVendor && (foundVendor.availabilityStatus || (foundVendor.status && !['active', 'inactive'].includes(foundVendor.status.toLowerCase()) ? foundVendor.status : null))) ||
            'Available';

        document.querySelectorAll('.form-group, .form-section').forEach((group) => {
            const label = (group.querySelector('label, .form-label')?.textContent || '').toLowerCase();
            const input = group.querySelector('input, select, textarea');
            if (!input) return;
            if (label.includes('first name') && displayName) {
                input.value = displayName.split(' ')[0] || displayName;
            } else if (label.includes('last name') && displayName) {
                const parts = displayName.split(' ');
                input.value = parts.slice(1).join(' ') || '';
            } else if ((label.includes('full name') || label.includes('partner name') || label.includes('vendor name')) && displayName) {
                input.value = displayName;
            } else if (label.includes('email')) {
                input.value = displayEmail;
            } else if (label.includes('phone') || label.includes('contact') || label.includes('hotline')) {
                if (displayPhone) input.value = displayPhone;
            } else if (label.includes('availability') || label.includes('shift') || label.includes('status')) {
                if (input.options) {
                    const options = Array.from(input.options);
                    const match = options.find(o => o.value.toLowerCase() === currentAvail.toLowerCase() || o.text.toLowerCase().includes(currentAvail.toLowerCase()));
                    if (match) input.value = match.value;
                } else {
                    input.value = currentAvail;
                }
            }
        });

        // --- Calculate Real-Time Stats & Contact Details from State ---
        const allTrips = Array.isArray(state.trips) ? state.trips : [];
        const userTrips = allTrips.filter(t =>
            (t.userId && t.userId === session.userId) ||
            (t.traveler && t.traveler.email && t.traveler.email.toLowerCase() === userKey) ||
            (t.travelerName && displayName && t.travelerName.toLowerCase() === displayName.toLowerCase()) ||
            (role === 'traveler')
        );
        const completedTrips = userTrips.filter(t => t.status === 'completed');

        let totalTravelDays = 0;
        userTrips.forEach(t => {
            if (t.startDate && t.endDate) {
                const start = new Date(t.startDate);
                const end = new Date(t.endDate);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    totalTravelDays += Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
                    return;
                }
            }
            totalTravelDays += Number(t.durationDays) || 3;
        });

        const destinations = new Set();
        userTrips.forEach(t => {
            const dest = t.destination || t.location || t.packageTitle || '';
            if (dest) destinations.add(dest.split(',')[0].trim());
        });

        const userReviews = (state.reviews || []).filter(r =>
            (r.author && r.author.toLowerCase() === displayName.toLowerCase()) ||
            (r.email && r.email.toLowerCase() === userKey) ||
            (r.userId && r.userId === session.userId)
        );

        // 1. Traveler Stats Grid Cards
        const completedValEl = document.querySelector('.ts-box.blue .ts-val');
        if (completedValEl) completedValEl.textContent = completedTrips.length || userTrips.length;

        const totalDaysValEl = document.querySelector('.ts-box.green .ts-val');
        if (totalDaysValEl) totalDaysValEl.textContent = totalTravelDays || (userTrips.length ? userTrips.length * 4 : 0);

        const countriesValEl = document.querySelector('.ts-box.purple .ts-val');
        if (countriesValEl) countriesValEl.textContent = destinations.size || (userTrips.length ? 1 : 0);

        const reviewsValEl = document.querySelector('.ts-box.orange .ts-val');
        if (reviewsValEl) reviewsValEl.textContent = userReviews.length;

        // 2. Generic Profile Stats Rows & Items across Partner, Vendor, Guide, Support, Traveler
        const statRows = document.querySelectorAll('.profile-stats .stat-row, .profile-stats-list .stat-item, .profile-list .pl-item');
        statRows.forEach((row) => {
            const label = (row.querySelector('.stat-label, .label')?.textContent || row.textContent || '').toLowerCase();
            const valEl = row.querySelector('.stat-value, .value');

            if (valEl) {
                if (label.includes('completed trips')) {
                    valEl.textContent = completedTrips.length || userTrips.length;
                } else if (label.includes('total managed trips') || label.includes('managed trips')) {
                    valEl.textContent = allTrips.length;
                } else if (label.includes('total services') || label.includes('services')) {
                    const vendorTrips = typeof getVendorTrips === 'function' ? getVendorTrips(state) : allTrips;
                    valEl.textContent = vendorTrips.length;
                } else if (label.includes('tours completed') || label.includes('completed tours')) {
                    const guideTrips = typeof getGuideTrips === 'function' ? getGuideTrips(state) : allTrips;
                    valEl.textContent = guideTrips.length;
                } else if (label.includes('resolved tickets') || label.includes('resolved')) {
                    const resolvedIssues = (state.issues || []).filter(i => i.status === 'resolved' || i.status === 'Closed');
                    valEl.textContent = resolvedIssues.length || (state.issues || []).length;
                } else if (label.includes('member since')) {
                    const dateStr = foundUser?.createdAt || foundGuide?.createdAt || foundVendor?.createdAt || '2024-01-15';
                    const d = new Date(dateStr);
                    const month = !isNaN(d.getTime()) ? d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2024';
                    if (row.textContent.includes('Member Since:')) {
                        valEl.textContent = `Member Since: ${month}`;
                    } else {
                        valEl.textContent = month;
                    }
                }
            }
        });

        // --- Superuser settings page specific selectors ---
        const settingsNameInput = document.querySelector('.sa-profile-section input[type="text"]');
        if (settingsNameInput && displayName) settingsNameInput.value = displayName;
        const settingsEmailInput = document.querySelector('.sa-profile-section input[type="email"]');
        if (settingsEmailInput && displayEmail) settingsEmailInput.value = displayEmail;

        updateProfileBadge(currentAvail);
        bindProfileAvailabilityEvents();

        iconRefresh(document.querySelector('.profile-card, .profile-summary-card, .profile-container, .profile-layout, .sa-profile-section'));
    }

    function updateProfileBadge(statusVal) {
        if (!statusVal) return;
        const badgeEl = document.querySelector('#profile-avail-badge, .profile-badges .badge, .profile-badges .badge-pill, .profile-badges .badge-available, .profile-badges span:first-child');
        if (!badgeEl) return;
        const s = String(statusVal).toLowerCase();
        const isAvail = s === 'available' || s.includes('on duty') || s.includes('active');
        if (isAvail) {
            badgeEl.className = badgeEl.classList.contains('badge-pill') ? 'badge-pill badge-green' : 'badge badge-active badge-green badge-available';
            badgeEl.style.background = '';
            badgeEl.style.color = '';
            badgeEl.innerHTML = `<i data-icon="checkcircle"></i> ${statusVal}`;
        } else {
            badgeEl.className = badgeEl.classList.contains('badge-pill') ? 'badge-pill badge-amber' : 'badge badge-warning badge-amber badge-available';
            badgeEl.style.background = '#fef3c7';
            badgeEl.style.color = '#b45309';
            badgeEl.innerHTML = `<i data-icon="alert"></i> ${statusVal}`;
        }
        iconRefresh(badgeEl);
    }

    function saveUserProfileData(container) {
        const session = readSession();
        const targetContainer = container || document.querySelector('.page-content, .profile-layout, .split-layout, .sa-profile-section, .profile-container, .main-content') || document;

        // 1. First Name & Last Name or Full Name
        let firstNameVal = targetContainer.querySelector('#profile-firstname')?.value?.trim();
        let lastNameVal = targetContainer.querySelector('#profile-lastname')?.value?.trim();
        let nameVal = '';

        if (firstNameVal !== undefined && lastNameVal !== undefined) {
            nameVal = `${firstNameVal} ${lastNameVal}`.trim();
        } else if (firstNameVal !== undefined) {
            nameVal = firstNameVal;
        } else {
            const nameInput = targetContainer.querySelector('#profile-name-input, [data-session-name="true"]') ||
                Array.from(targetContainer.querySelectorAll('input[type="text"]')).find(input => {
                    const label = (input.closest('.form-group, div')?.querySelector('.form-label, label')?.textContent || '').toLowerCase();
                    return label.includes('name') || label.includes('partner') || label.includes('vendor');
                }) || targetContainer.querySelector('.sa-profile-section input[type="text"]');
            if (nameInput) nameVal = nameInput.value.trim();
        }

        // 2. Email Address
        const emailInput = targetContainer.querySelector('#profile-email, #profile-email-input, [data-session-email="true"], input[type="email"]') ||
            Array.from(targetContainer.querySelectorAll('input')).find(input => {
                const label = (input.closest('.form-group, div')?.querySelector('.form-label, label')?.textContent || '').toLowerCase();
                return label.includes('email');
            }) || targetContainer.querySelector('.sa-profile-section input[type="email"]');
        const emailVal = emailInput ? emailInput.value.trim() : '';

        // 3. Phone Number
        const phoneInput = targetContainer.querySelector('#phone, #profile-phone-input, [data-session-phone="true"], input[type="tel"]') ||
            Array.from(targetContainer.querySelectorAll('input')).find(input => {
                const label = (input.closest('.form-group, div')?.querySelector('.form-label, label')?.textContent || '').toLowerCase();
                return label.includes('phone') || label.includes('contact') || label.includes('hotline');
            });
        const phoneVal = phoneInput ? phoneInput.value.trim() : '';

        // 4. Availability Status
        const availSelect = targetContainer.querySelector('#availability-select, #profile-shift-select') ||
            Array.from(targetContainer.querySelectorAll('select')).find(sel => {
                const label = (sel.closest('.form-group, div')?.querySelector('.form-label, label')?.textContent || '').toLowerCase();
                return label.includes('availability') || label.includes('shift') || label.includes('status');
            });
        const availVal = availSelect ? availSelect.value : '';

        // Save to Session Object
        if (nameVal) session.name = nameVal;
        if (emailVal) session.email = emailVal;
        if (phoneVal) session.phone = phoneVal;
        if (availVal) session.availabilityStatus = availVal;

        try {
            sessionStorage.setItem('dd_session', JSON.stringify(session));
            localStorage.setItem('dd_session', JSON.stringify(session));
        } catch (_) { }

        // Save to Application State
        const state = loadState();
        state.users = Array.isArray(state.users) ? state.users : [];
        state.guides = Array.isArray(state.guides) ? state.guides : [];
        state.vendors = Array.isArray(state.vendors) ? state.vendors : [];

        const userKey = (session.email || session.name || session.id || '').toLowerCase();
        let foundUser = state.users.find(u =>
            (u.email && u.email.toLowerCase() === userKey) ||
            (u.name && u.name.toLowerCase() === userKey) ||
            u.id === session.userId
        );

        if (foundUser) {
            if (nameVal) foundUser.name = nameVal;
            if (emailVal) foundUser.email = emailVal;
            if (phoneVal) foundUser.phone = phoneVal;
            if (session.picUrl) foundUser.avatar = session.picUrl;
            if (availVal) {
                foundUser.availabilityStatus = availVal;
                foundUser.availability = availVal;
            }
        }

        let guide = state.guides.find(g => (g.email && g.email.toLowerCase() === userKey) || (g.name && g.name.toLowerCase() === userKey));
        if (guide) {
            if (nameVal) guide.name = nameVal;
            if (emailVal) guide.email = emailVal;
            if (phoneVal) guide.phone = phoneVal;
            if (session.picUrl) guide.avatar = session.picUrl;
            if (availVal) {
                guide.availabilityStatus = availVal;
                guide.status = availVal;
            }
        }

        let vendor = state.vendors.find(v => (v.email && v.email.toLowerCase() === userKey) || (v.name && v.name.toLowerCase() === userKey));
        if (vendor) {
            if (nameVal) vendor.name = nameVal;
            if (emailVal) vendor.email = emailVal;
            if (phoneVal) vendor.phone = phoneVal;
            if (session.picUrl) vendor.avatar = session.picUrl;
            if (availVal) {
                vendor.availabilityStatus = availVal;
                vendor.status = availVal;
            }
        }

        saveState(state);
        if (availVal) updateProfileBadge(availVal);

        renderSessionHeader();

        // Update profile labels in cards & lists
        document.querySelectorAll('.profile-name').forEach((el) => { if (el.tagName !== 'INPUT') el.textContent = session.name || ''; });
        document.querySelectorAll('.pl-item, .profile-list .pl-item').forEach((el) => {
            if (el.querySelector('[data-icon="mail"]') || el.textContent.includes('@')) {
                const icon = el.querySelector('i');
                el.textContent = session.email || '';
                if (icon) el.prepend(icon);
            }
            if (el.querySelector('[data-icon="phone"]') || el.textContent.includes('+') || el.hasAttribute('data-session-phone')) {
                const icon = el.querySelector('i');
                el.textContent = session.phone || el.textContent;
                if (icon) el.prepend(icon);
            }
        });

        if (typeof Toast !== 'undefined' && typeof Toast.success === 'function') {
            Toast.success('Profile details saved successfully!');
        } else if (typeof notify === 'function') {
            notify('Profile details saved successfully!', 'success');
        }
    }

    function saveProfileAvailability(container) {
        saveUserProfileData(container);
    }

    function bindProfilePicUpload() {
        let picInput = document.getElementById('dd-profile-pic-input');
        if (!picInput) {
            picInput = document.createElement('input');
            picInput.type = 'file';
            picInput.id = 'dd-profile-pic-input';
            picInput.accept = 'image/*';
            picInput.style.display = 'none';
            document.body.appendChild(picInput);

            picInput.addEventListener('change', (evt) => {
                const file = evt.target.files && evt.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const session = readSession();
                    session.picUrl = dataUrl;
                    session.avatar = dataUrl;
                    try {
                        sessionStorage.setItem('dd_session', JSON.stringify(session));
                        localStorage.setItem('dd_session', JSON.stringify(session));
                    } catch (_) { }

                    const state = loadState();
                    const userKey = (session.email || session.name || session.id || '').toLowerCase();
                    (state.users || []).forEach(u => {
                        if ((u.email && u.email.toLowerCase() === userKey) || (u.name && u.name.toLowerCase() === userKey)) u.avatar = dataUrl;
                    });
                    saveState(state);

                    renderSessionHeader();

                    if (typeof Toast !== 'undefined' && typeof Toast.success === 'function') {
                        Toast.success('Profile photo updated successfully!');
                    } else if (typeof notify === 'function') {
                        notify('Profile photo updated successfully!', 'success');
                    }

                    // Attempt NestJS backend upload controller if active
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        fetch('/api/upload', { method: 'POST', body: formData })
                            .then(res => res.json())
                            .then(data => {
                                if (data && (data.url || data.path)) {
                                    const finalUrl = data.url || data.path;
                                    session.picUrl = finalUrl;
                                    session.avatar = finalUrl;
                                    sessionStorage.setItem('dd_session', JSON.stringify(session));
                                    localStorage.setItem('dd_session', JSON.stringify(session));
                                    renderSessionHeader();
                                }
                            }).catch(() => { });
                    } catch (_) { }
                };
                reader.readAsDataURL(file);
            });
        }

        const avatarTriggers = document.querySelectorAll(
            '.avatar-wrapper, .avatar-edit, .profile-avatar, .profile-avatar-lg, .profile-avatar-large, ' +
            '.profile-avatar-big, [data-action="upload-avatar"], .sa-profile-section button, ' +
            '.profile-summary-card .profile-avatar-large, .profile-card .profile-avatar-lg'
        );

        avatarTriggers.forEach(el => {
            if (el.dataset.picUploadBound) return;
            el.dataset.picUploadBound = 'true';
            el.style.cursor = 'pointer';
            el.setAttribute('title', 'Click to change profile picture');
            el.addEventListener('click', (e) => {
                if (el.classList.contains('btn-primary') || el.classList.contains('btn-save')) return;
                picInput.click();
            });
        });
    }

    function bindProfileAvailabilityEvents() {
        bindProfilePicUpload();

        document.querySelectorAll('form, .profile-content, .profile-form-card, .info-card, .page-content, .sa-profile-section').forEach(container => {
            const availSelect = container.querySelector('#availability-select, #profile-shift-select') ||
                Array.from(container.querySelectorAll('select')).find(sel => {
                    const label = (sel.closest('.form-group, div')?.querySelector('label, .form-label')?.textContent || '').toLowerCase();
                    return label.includes('availability') || label.includes('shift') || label.includes('status');
                });

            if (availSelect && !availSelect.dataset.changeBound) {
                availSelect.dataset.changeBound = 'true';
                availSelect.addEventListener('change', () => {
                    updateProfileBadge(availSelect.value);
                    saveUserProfileData(container);
                });
            }

            if (!container.dataset.profileFormSubmitBound) {
                container.dataset.profileFormSubmitBound = 'true';
                if (container.tagName === 'FORM') {
                    container.addEventListener('submit', (e) => {
                        e.preventDefault();
                        saveUserProfileData(container);
                    });
                }
            }
        });

        document.querySelectorAll('.btn-save, .btn-update, #btn-save-profile, .sa-profile-section .btn-primary').forEach(btn => {
            if (btn.dataset.availBound) return;
            btn.dataset.availBound = 'true';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const container = btn.closest('form') || btn.closest('.profile-content, .profile-form-card, .info-card, .split-layout, .sa-profile-section, .page-content');
                saveUserProfileData(container);
            });
        });
    }

    function notificationsForRole(state, role) {
        const rawList = state.notifications || [];
        const deletedIds = new Set(state.deletedNotifIds || []);
        const filteredList = rawList.filter(n => !deletedIds.has(n.id));
        if (role === 'traveler') {
            const userTrips = tripsForCurrentUser(state.trips || []);
            const userTripIds = new Set(userTrips.map(t => t.id).concat(userTrips.map(t => t.requestId).filter(Boolean)));
            const session = readSession();
            const userEmail = (session.email || '').toLowerCase();

            return filteredList.filter((item) => {
                const matchesRole = item.roles && (item.roles.includes('traveler') || item.roles.includes('all'));
                if (!matchesRole) return false;
                if (item.userEmail && item.userEmail.toLowerCase() === userEmail) return true;
                if (item.tripId && userTripIds.has(item.tripId)) return true;
                if (!item.userEmail && (!item.tripId || String(item.id).startsWith('NTF-SEED'))) return true;
                return false;
            }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return filteredList
            .filter((item) => item.roles && (item.roles.includes(role) || item.roles.includes('all')))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    function renderNotificationDots(state) {
        const role = roleFromPath();
        let count = 0;
        if (role === 'partner') {
            count = getPartnerNotificationItems(state).filter(item => item.isUnread).length;
        } else {
            count = notificationsForRole(state, role).filter((item) => !(item.readBy || []).includes(role)).length;
        }
        document.querySelectorAll('.notif-dot').forEach((dot) => {
            dot.style.display = count ? '' : 'none';
        });
    }

    function renderHeaderNotifications(state) {
        const lists = document.querySelectorAll('.sa-notif-dropdown .notif-list, #header-notif-list');
        if (!lists.length) return;
        const deletedIds = new Set(state.deletedNotifIds || []);
        const role = roleFromPath() || readSession()?.role || 'superuser';
        
        let rawNotifs = [];
        if (role === 'partner') {
            rawNotifs = getPartnerNotificationItems(state);
        } else if (role === 'superuser') {
            rawNotifs = state.notifications || [];
        } else {
            rawNotifs = notificationsForRole(state, role);
        }

        const notifications = (rawNotifs || [])
            .filter(n => n && !deletedIds.has(n.id))
            .slice()
            .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
        
        lists.forEach(list => {
            list.innerHTML = notifications.slice(0, 6).map((item) => {
                const isUnread = item.isUnread !== undefined ? item.isUnread : !(item.readBy || []).includes(role);
                const isSalary = (item.title || '').toLowerCase().includes('salary') || (item.message || '').toLowerCase().includes('salary');
                const iconBg = isSalary ? '#dcfce7' : (isUnread ? '#e0f2fe' : '#f1f5f9');
                const iconColor = isSalary ? '#166534' : (isUnread ? '#0369a1' : '#64748b');
                const iconContent = isSalary ? '💸' : '<i data-icon="bell"></i>';

                return `
                    <div class="sa-nd-item ${isUnread ? 'unread' : ''}" style="display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border-color, #f8fafc); align-items:flex-start; justify-content:space-between;">
                        <div style="display:flex; gap:12px; flex:1;">
                            <div class="sa-nd-icon" style="background:${iconBg}; color:${iconColor}; border-radius:10px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:16px;">
                                ${iconContent}
                            </div>
                            <div class="sa-nd-content" style="flex:1;">
                                <p style="margin:0; font-size:13px; color:var(--text-primary, #1e293b); line-height:1.4;"><strong>${escapeHTML(item.title || 'Notification')}</strong> ${escapeHTML(item.message || item.subtitle || '')}</p>
                                <span class="sa-nd-time" style="font-size:11px; color:var(--text-muted, #94a3b8); display:block; margin-top:4px;">${relativeTime(item.createdAt || item.timestamp)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') || `<div class="sa-nd-item" style="padding:16px; color:#64748b; font-size:13px; text-align:center;">No notifications yet.</div>`;
            iconRefresh(list);
        });
    }

    function renderMonthlySalaryWidget(state) {
        const page = currentPage().toLowerCase();
        const isProfilePage = page.includes('profile');
        const existingWidget = document.getElementById('employee-salary-payout-widget');

        if (!isProfilePage) {
            if (existingWidget) {
                existingWidget.remove();
            }
            return;
        }

        const session = readSession();
        if (!session || !session.email) return;

        let salLogs = [];
        try {
            salLogs = JSON.parse(localStorage.getItem('dd_salary_payouts_v1') || '[]');
        } catch (_) {}

        const currentEmail = (session.email || '').toLowerCase().trim();
        const currentName = (session.name || '').toLowerCase().trim();
        const currentId = (session.id || '').toLowerCase().trim();

        const myPayouts = salLogs.filter(p => {
            const pEmail = (p.userEmail || p.userId || '').toLowerCase().trim();
            const pName = (p.userName || '').toLowerCase().trim();
            const pId = (p.userId || '').toLowerCase().trim();
            return (pEmail && (pEmail === currentEmail || currentEmail.includes(pEmail))) ||
                   (pName && (pName === currentName || currentName.includes(pName))) ||
                   (pId && pId === currentId);
        });

        const salaryNotifs = (state.notifications || []).filter(n => {
            const isSal = (n.title || '').toLowerCase().includes('salary') || (n.message || '').toLowerCase().includes('salary');
            const rec = (n.recipientId || n.userEmail || '').toLowerCase().trim();
            return isSal && (!rec || rec === currentEmail || rec === currentId || (currentName && (n.message || '').toLowerCase().includes(currentName)));
        });

        if (!myPayouts.length && !salaryNotifs.length) {
            if (existingWidget) existingWidget.remove();
            return;
        }

        const targetContainer = document.querySelector('.page-content, .dashboard-container');
        if (!targetContainer) return;

        const latestPayout = myPayouts[0] || {};
        const amountVal = latestPayout.amount || (salaryNotifs[0] && (salaryNotifs[0].message.match(/₹([\d,]+)/) || [])[1]);
        const amount = amountVal ? (String(amountVal).startsWith('₹') ? amountVal : `₹${Number(amountVal.toString().replace(/,/g, '')).toLocaleString()}`) : 'Disbursed';
        const month = latestPayout.month || 'Current Month';
        const dateStr = latestPayout.disbursedAt ? new Date(latestPayout.disbursedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

        const widgetHTML = `
            <div id="employee-salary-payout-widget" style="margin-top: 24px; background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); color: #ffffff; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.3);">
                <div style="font-size: 15px; font-weight: 800; margin-bottom: 16px; color: #ffffff; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 12px;">
                    <span style="display: flex; align-items: center; gap: 8px;">💳 Payments & Confidential Salary</span>
                    <span style="font-size: 11px; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 99px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Confidential</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 24px;">
                            💸
                        </div>
                        <div>
                            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0;">Monthly Salary Disbursed</div>
                            <div style="font-size: 22px; font-weight: 800; margin-top: 2px;">${amount} <span style="font-size: 14px; font-weight: 500; opacity: 0.85;">(${month})</span></div>
                            <div style="font-size: 12px; color: #d1fae5; margin-top: 2px;">Processed on ${dateStr} • Direct Bank Transfer Completed</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="background: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 6px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.3);">
                            ✓ Completed (${latestPayout.id || 'PAY-SUCCESS'})
                        </span>
                    </div>
                </div>
            </div>
        `;

        if (existingWidget) {
            existingWidget.outerHTML = widgetHTML;
        } else {
            const splitLayout = targetContainer.querySelector('.split-layout');
            if (splitLayout) {
                splitLayout.insertAdjacentHTML('afterend', widgetHTML);
            } else {
                targetContainer.insertAdjacentHTML('beforeend', widgetHTML);
            }
        }
    }


    const _activeNotifFilters = {
        guide: 'all',
        vendor: 'all',
        traveler: 'all',
        support: 'all',
        partner: 'all',
        superuser: 'all'
    };

    function matchesNotifFilter(item, filterName, role) {
        if (!filterName || filterName === 'all' || filterName === 'All Notifications' || filterName === 'All Alerts' || filterName === 'All Requests') return true;

        const filterLower = filterName.toLowerCase().trim();
        const title = (item.title || '').toLowerCase();
        const msg = (item.message || item.subtitle || item.desc || '').toLowerCase();
        const type = (item.type || '').toLowerCase();
        const text = `${title} ${msg} ${type}`;
        const categories = (item.categories || []).map(c => String(c).toLowerCase());

        if (filterLower === 'unread') {
            if (role === 'partner') return item.isUnread;
            return !(item.readBy || []).includes(role);
        }

        if (filterLower.includes('issue') || filterLower.includes('reported')) return /issue|support|ticket|report/i.test(text) || type.includes('issue') || type.includes('warn');
        if (filterLower.includes('emergency')) return /emergency|critical|high/i.test(text) || type.includes('emergency');
        if (filterLower.includes('assign')) return /assign|tour|schedule/i.test(text) || categories.includes('guide requests');
        if (filterLower.includes('service')) return /service|vendor|request/i.test(text);
        if (filterLower.includes('system')) return /system|platform|alert|warn|info/i.test(text);
        if (filterLower.includes('urgent') || filterLower.includes('high')) return /urgent|high|critical|emergency/i.test(text) || categories.includes('urgent');
        if (filterLower.includes('request')) return /request|pending|review/i.test(text) || categories.includes('pending review');
        if (filterLower.includes('traveler')) return /traveler|trip|itinerary/i.test(text) || categories.includes('traveler actions');
        if (filterLower.includes('guide')) return /guide|tour/i.test(text) || categories.includes('guide requests');
        if (filterLower.includes('warn')) return /warn|weather|alert/i.test(text);
        if (filterLower.includes('update') || filterLower.includes('trip')) return /trip|update|schedule|change/i.test(text) || categories.includes('itinerary mods');

        return true;
    }

    function renderSuperuserAlerts(state) {
        if (currentPage() !== 'superuser_alerts.html') return;
        const container = document.querySelector('.sa-alerts-container, .sa-dashboard-container');
        if (!container) return;

        const role = 'superuser';
        const deletedIds = new Set(state.deletedNotifIds || []);
        const allNotifications = (state.notifications || []).filter(n => !deletedIds.has(n.id)).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const activeFilter = _activeNotifFilters.superuser || 'all';

        // Wire tabs
        const filterTabs = document.querySelectorAll('.filter-tab-pill, .filter-pill');
        filterTabs.forEach((tab) => {
            const text = tab.textContent.trim();
            const tabKey = tab.getAttribute('data-filter') || text;

            if (tabKey.toLowerCase() === activeFilter.toLowerCase() || (activeFilter === 'all' && (text.includes('All') || tabKey === 'all'))) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }

            tab.onclick = (e) => {
                e.preventDefault();
                _activeNotifFilters.superuser = tabKey.toLowerCase().includes('all') ? 'all' : tabKey;
                renderSuperuserAlerts(state);
            };
        });

        // Filter alerts
        const alerts = allNotifications.filter(item => matchesNotifFilter(item, activeFilter, role));

        const targetList = container.querySelector('.sa-alerts-list') || container;

        const topBulkHeaderHtml = `
            <div class="sa-alerts-top-bar" style="position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; margin-bottom: 16px; background: var(--bg-card-alt, #1e293b); border-radius: 12px; border: 1px solid var(--border-color, #334155); flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--text-primary, #ffffff);">
                    <i data-icon="bell" style="color: #0ea5e9;"></i> Notifications Manager (${alerts.length} items)
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="notif-bulk-btn" data-dd-action="mark-all-read" onclick="window.markAllNotifsAsRead('superuser')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #0ea5e9; color: #ffffff; border: none; font-weight: 600; font-size: 13px; cursor: pointer; box-shadow: 0 2px 6px rgba(14, 165, 233, 0.3);">
                        <i data-icon="check"></i> Mark all as read
                    </button>
                    <button class="notif-bulk-btn delete-all-btn" data-dd-action="delete-all-notifs" onclick="window.deleteAllNotifs('superuser')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); font-weight: 600; font-size: 13px; cursor: pointer;">
                        <i data-icon="trash"></i> Delete all
                    </button>
                </div>
            </div>
        `;

        if (!alerts.length) {
            targetList.innerHTML = topBulkHeaderHtml + `
                <div class="alert-card info" style="padding: 24px; background: var(--bg-surface, #1e293b); border-radius: 10px; border: 1px solid var(--border-color, #334155);">
                    <div class="alert-icon"><i data-icon="info"></i></div>
                    <div class="alert-content">
                        <div class="alert-title" style="font-weight:700; color:var(--text-primary, #fff);">No alerts found</div>
                        <div class="alert-desc" style="color:var(--text-secondary, #94a3b8);">There are no platform alerts matching "${activeFilter}".</div>
                    </div>
                </div>
            `;
        } else {
            targetList.innerHTML = topBulkHeaderHtml + alerts.map((alert) => {
                const isUnread = !(alert.readBy || []).includes(role);
                const className = /critical|emergency|high/i.test(alert.type) ? 'critical' : /warn|medium/i.test(alert.type) ? 'warning' : 'info';
                return `
                    <div class="alert-card ${className}" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-surface, #fff);">
                        <div style="display: flex; gap: 14px; align-items: center;">
                            <div class="alert-icon" style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${className === 'critical' ? '#fee2e2' : className === 'warning' ? '#fef3c7' : '#e0f2fe'}; color: ${className === 'critical' ? '#be123c' : className === 'warning' ? '#b45309' : '#0369a1'}; flex-shrink: 0;">
                                <i data-icon="${className === 'critical' ? 'alertcircle' : className === 'warning' ? 'alert' : 'info'}"></i>
                            </div>
                            <div class="alert-content">
                                <div class="alert-title" style="font-weight: 700; font-size: 15px; color: var(--text-primary, #0f172a);">${escapeHTML(alert.title)} ${isUnread ? '<span style="background: #0ea5e9; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 99px; margin-left: 6px;">New</span>' : ''}</div>
                                <div class="alert-desc" style="font-size: 13px; color: var(--text-secondary, #475569); margin-top: 2px;">${escapeHTML(alert.message)}</div>
                                <div class="alert-meta" style="font-size: 11px; color: var(--text-muted, #94a3b8); margin-top: 4px; display: flex; gap: 12px;"><span><i data-icon="clock"></i> ${relativeTime(alert.createdAt)}</span>${alert.tripId ? `<span><i data-icon="server"></i> ${escapeHTML(alert.tripId)}</span>` : ''}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_dashboard.html" style="background: #2563eb; color: #ffffff; border: none; font-weight: 600; padding: 6px 14px; border-radius: 6px; cursor: pointer;">View</button>
                            ${isUnread ? `<button class="sa-btn-sm" style="background: #0ea5e9; color: #ffffff; border: none; font-weight: 600; padding: 6px 14px; border-radius: 6px; cursor: pointer;" data-dd-action="mark-read" data-notif-id="${alert.id}">Mark Read</button>` : `<button class="sa-btn-sm" style="background: var(--bg-card-alt, #334155); color: var(--text-primary, #ffffff); border: 1px solid var(--border-color, #475569); font-weight: 600; padding: 6px 14px; border-radius: 6px; cursor: pointer; opacity: 0.7;" disabled>Read</button>`}
                            <button class="sa-btn-sm" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 600; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" data-dd-action="delete-notif" data-notif-id="${alert.id}" title="Delete Notification"><i data-icon="trash"></i> Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        iconRefresh(targetList);
    }

    function renderTravelerAlerts(state) {
        if (currentPage() !== 'traveler_alerts.html') return;
        const container = document.querySelector('.alerts-container');
        if (!container) return;

        const role = 'traveler';
        const allNotifications = notificationsForRole(state, role);
        const activeFilter = _activeNotifFilters.traveler || 'all';

        // Wire tabs
        const filterTabs = document.querySelectorAll('.filter-pill');
        const unreadCountAll = allNotifications.filter(a => !(a.readBy || []).includes(role)).length;

        filterTabs.forEach((tab) => {
            const text = tab.textContent.trim();
            const tabKey = tab.getAttribute('data-filter') || text;

            if (text.includes('All Alerts') || tabKey === 'all') {
                tab.textContent = `All Alerts (${allNotifications.length})`;
            } else if (text.includes('Unread') || tabKey === 'unread') {
                tab.textContent = `Unread (${unreadCountAll})`;
            }

            if (tabKey.toLowerCase() === activeFilter.toLowerCase() || (activeFilter === 'all' && (text.includes('All') || tabKey === 'all'))) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }

            tab.onclick = (e) => {
                e.preventDefault();
                _activeNotifFilters.traveler = tabKey.toLowerCase().includes('all') ? 'all' : tabKey;
                renderTravelerAlerts(state);
            };
        });

        // Filter items
        const notifications = allNotifications.filter(item => matchesNotifFilter(item, activeFilter, role));

        if (!notifications.length) {
            container.innerHTML = `
                <div class="alert-row info" style="padding: 24px; text-align: center;">
                    <div class="a-content">
                        <div class="a-title" style="margin-bottom: 4px;">No alerts found</div>
                        <div class="a-desc">There are no alerts matching the "${activeFilter}" filter.</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = notifications.map((item) => {
                const isUnread = !(item.readBy || []).includes(role);
                const rowClass = String(item.type).toLowerCase().includes('warn') || String(item.type).toLowerCase().includes('high') ? 'warning'
                    : String(item.type).toLowerCase().includes('accept') || String(item.type).toLowerCase().includes('resolved') ? 'success'
                        : 'info';
                return `
                    <div class="alert-row ${rowClass}">
                        <div class="a-icon"><i data-icon="${rowClass === 'success' ? 'check' : rowClass === 'warning' ? 'alert' : 'bell'}"></i></div>
                        <div class="a-content">
                            <div class="a-title">${escapeHTML(item.title)} ${isUnread ? '<span class="a-badge">New</span>' : ''}</div>
                            <div class="a-desc">${escapeHTML(item.message)}</div>
                            <div class="a-time"><i data-icon="clock"></i> ${relativeTime(item.createdAt)}${item.tripId ? ` - ${escapeHTML(item.tripId)}` : ''}</div>
                        </div>
                        <div class="a-actions" style="display:flex; align-items:center; gap:8px;">
                            <button class="a-link" data-dd-action="route" data-dd-target="traveler_progress.html" style="background:none;border:none;cursor:pointer;">View</button>
                            ${isUnread ? `<button class="close-btn" data-dd-action="mark-read" data-notif-id="${item.id}" title="Mark as Read"><i data-icon="check"></i></button>` : ''}
                            <button class="close-btn delete-btn" data-dd-action="delete-notif" data-notif-id="${item.id}" title="Delete Notification" style="background:none; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:4px 8px; cursor:pointer; color:#ef4444; display:flex; align-items:center; gap:4px; font-size:12px; background:rgba(239,68,68,0.08);"><i data-icon="trash"></i> Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        iconRefresh(container);
    }

    let _activeNotifFilter = 'all';

    function getPartnerNotificationItems(state) {
        const items = [];
        const seenIds = new Set();
        const trips = (state.trips || []).slice();

        // 1. Requested Trips (New Trip Requests from Traveler)
        trips.filter((t) => t.status === 'requested' || t.requestStatus === 'Requested').forEach((trip) => {
            const id = `req-${trip.id}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            items.push({
                id,
                tripId: trip.id,
                type: 'New Request',
                badgeColor: 'orange',
                priority: 'HIGH',
                categories: ['Traveler Actions', 'Pending Review', 'Special Requests'],
                icon: 'clipboard',
                iconColor: 'orange',
                title: `${trip.title}`,
                subtitle: `Traveler ${trip.travelerName || 'Traveler'} submitted a new booking request`,
                meta: [
                    { icon: 'user', text: trip.travelerName || 'Traveler' },
                    { icon: 'clock', text: relativeTime(trip.createdAt) },
                    { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                ],
                banner: {
                    color: 'yellow',
                    title: 'Trip Details & Preferences:',
                    content: `Destination: ${trip.destination} • Travelers: ${trip.travelersCount || 1} • Budget: $${trip.budget || 0} • Accommodation: ${trip.accommodationType || 'Standard'} • Pace: ${trip.tripPace || 'Moderate'}${trip.notes ? ` • Note: ${trip.notes}` : ''}`,
                },
                actions: [
                    { label: 'Accept', icon: 'check', action: 'accept-trip', class: 'btn-accept', tripId: trip.id },
                    { label: 'Reject', icon: 'x', action: 'reject-trip', class: 'btn-reject', tripId: trip.id },
                    { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
                ],
                createdAt: trip.createdAt || nowISO(),
            });
        });

        // 2. Pending Cancellation Requests (from Traveler - awaiting Partner Approval)
        trips.filter((t) => t.cancellationRequested && t.cancellationStatus === 'Pending').forEach((trip) => {
            const id = `cancel-req-${trip.id}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            const cancelUpdate = (trip.updates || []).slice().reverse().find((u) => String(u.status).toLowerCase().includes('cancel') || String(u.title).toLowerCase().includes('cancel'));
            const reason = trip.cancellationReason || cancelUpdate?.message || `${trip.travelerName || 'Traveler'} requested cancellation for ${trip.destination}.`;
            items.push({
                id,
                tripId: trip.id,
                type: 'Trip Cancellation',
                badgeColor: 'red',
                priority: 'URGENT',
                categories: ['Traveler Actions', 'Urgent', 'Pending Review', 'Cancellations'],
                icon: 'x',
                iconColor: 'red',
                title: `${trip.title} - Cancellation Request`,
                subtitle: `Traveler ${trip.travelerName || 'Traveler'} requested to cancel this trip`,
                meta: [
                    { icon: 'user', text: trip.travelerName || 'Traveler' },
                    { icon: 'clock', text: relativeTime(trip.cancellationRequestedAt || cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt) },
                    { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                ],
                banner: {
                    color: 'red',
                    title: 'Cancellation Request Details:',
                    content: `${reason} — Travel partner approval required to process cancellation.`,
                },
                actions: [
                    { label: 'Accept Cancellation', icon: 'check', action: 'accept-trip-cancellation', class: 'btn-accept', tripId: trip.id },
                    { label: 'Decline', icon: 'x', action: 'reject-trip-cancellation', class: 'btn-reject', tripId: trip.id },
                    { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
                ],
                createdAt: trip.cancellationRequestedAt || cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt || nowISO(),
            });
        });

        // 2b. Cancelled Trips (History / Processed)
        trips.filter((t) => t.status === 'cancelled' && !t.cancellationRequested).forEach((trip) => {
            const id = `cancel-done-${trip.id}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            const cancelUpdate = (trip.updates || []).slice().reverse().find((u) => String(u.status).toLowerCase().includes('cancel') || String(u.title).toLowerCase().includes('cancel'));
            const reason = cancelUpdate?.message || `${trip.travelerName || 'Traveler'} trip was cancelled for ${trip.destination}.`;
            items.push({
                id,
                tripId: trip.id,
                type: 'Trip Cancellation',
                badgeColor: 'red',
                priority: 'NORMAL',
                categories: ['Traveler Actions', 'Cancellations'],
                icon: 'x',
                iconColor: 'red',
                title: `${trip.title}`,
                subtitle: `Trip has been cancelled`,
                meta: [
                    { icon: 'user', text: trip.travelerName || 'Traveler' },
                    { icon: 'clock', text: relativeTime(cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt) },
                    { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                ],
                banner: {
                    color: 'yellow',
                    title: 'Cancellation Record:',
                    content: reason,
                },
                actions: [
                    { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
                ],
                createdAt: cancelUpdate?.createdAt || trip.updatedAt || trip.createdAt || nowISO(),
            });
        });

        // 3. Itinerary Modifications
        trips.forEach((trip) => {
            const modUpdates = (trip.updates || []).filter((u) =>
                String(u.status).toLowerCase().includes('itinerary') ||
                String(u.title).toLowerCase().includes('itinerary') ||
                String(u.title).toLowerCase().includes('modified') ||
                String(u.message).toLowerCase().includes('preference') ||
                String(u.message).toLowerCase().includes('itinerary')
            );
            modUpdates.forEach((upd, idx) => {
                const id = `mod-${trip.id}-${upd.id || idx}`;
                if (seenIds.has(id)) return;
                seenIds.add(id);
                items.push({
                    id,
                    tripId: trip.id,
                    type: 'Itinerary Mod',
                    badgeColor: 'purple',
                    priority: 'NORMAL',
                    categories: ['Traveler Actions', 'Pending Review', 'Itinerary Mods'],
                    icon: 'edit',
                    iconColor: 'purple',
                    title: `${trip.title}`,
                    subtitle: `Traveler updated itinerary preferences and details`,
                    meta: [
                        { icon: 'user', text: trip.travelerName || 'Traveler' },
                        { icon: 'clock', text: relativeTime(upd.createdAt) },
                        { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                    ],
                    banner: {
                        color: 'purple',
                        title: 'Modified Preferences & Details:',
                        content: upd.message || `Updated preferences for ${trip.destination} (${trip.accommodationType || 'standard'} stay, ${trip.travelersCount} travelers).`,
                    },
                    actions: [
                        { label: 'Approve', icon: 'check', action: 'approve-itinerary', class: 'btn-accept', tripId: trip.id },
                        { label: 'View Schedule', icon: 'calendar', action: 'route', class: 'btn-secondary', target: 'travelPartner_travelerSchedules.html' },
                    ],
                    createdAt: upd.createdAt || nowISO(),
                });
            });
        });

        // 4. Guide Actions & Requests
        trips.forEach((trip) => {
            if (trip.guideStatus === 'Rejected') {
                const id = `guide-reject-${trip.id}`;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    items.push({
                        id,
                        tripId: trip.id,
                        type: 'Guide Reassignment',
                        badgeColor: 'red',
                        priority: 'HIGH',
                        categories: ['Guide Requests', 'Urgent', 'Pending Review'],
                        icon: 'alert',
                        iconColor: 'red',
                        title: `Guide Rejected Assignment - ${trip.guide?.name || 'Guide'}`,
                        subtitle: `${trip.guide?.name || 'Assigned guide'} cannot take ${trip.title}. Immediate reassignment needed.`,
                        meta: [
                            { icon: 'user', text: trip.guide?.name || 'Tour Guide' },
                            { icon: 'clock', text: relativeTime(trip.updatedAt) },
                            { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                        ],
                        banner: {
                            color: 'yellow',
                            title: 'Reassignment Needed:',
                            content: `Trip ${trip.title} (${trip.id}) in ${trip.destination} is missing an active guide. Please assign an available tour guide.`,
                        },
                        actions: [
                            { label: 'Reassign Guide', icon: 'user', action: 'route', class: 'btn-accept', target: 'travelPartner_guideAssignment.html' },
                            { label: 'View Schedule', icon: 'calendar', action: 'route', class: 'btn-secondary', target: 'travelPartner_travelerSchedules.html' },
                        ],
                        createdAt: trip.updatedAt || nowISO(),
                    });
                }
            }

            // Check guide updates with delays or warnings
            (trip.updates || []).filter((u) => u.source === 'Guide' || String(u.source).toLowerCase().includes('guide')).forEach((gUpd, idx) => {
                const isWarning = String(gUpd.status).toLowerCase().includes('warn') || String(gUpd.status).toLowerCase().includes('delay') || String(gUpd.title).toLowerCase().includes('delay');
                const isExpense = String(gUpd.title).toLowerCase().includes('expense') || String(gUpd.message).toLowerCase().includes('expense');
                const id = `guide-upd-${trip.id}-${gUpd.id || idx}`;
                if (seenIds.has(id)) return;
                seenIds.add(id);
                items.push({
                    id,
                    tripId: trip.id,
                    type: isWarning ? 'Guide Alert' : isExpense ? 'Expense' : 'Guide Update',
                    badgeColor: isWarning ? 'red' : isExpense ? 'orange' : 'blue',
                    priority: isWarning ? 'HIGH' : 'NORMAL',
                    categories: ['Guide Requests', isWarning ? 'Urgent' : 'Pending Review', 'Pending Review'],
                    icon: isWarning ? 'alert' : isExpense ? 'dollar-sign' : 'info',
                    iconColor: isWarning ? 'red' : isExpense ? 'orange' : 'blue',
                    title: `${gUpd.title} - ${trip.title}`,
                    subtitle: `Tour Guide ${trip.guide?.name || 'Guide'} posted an update for ${trip.title}`,
                    meta: [
                        { icon: 'user', text: trip.guide?.name || 'Tour Guide' },
                        { icon: 'clock', text: relativeTime(gUpd.createdAt) },
                        { icon: 'calendar', text: `Trip: ${formatDateRange(trip)}` },
                    ],
                    banner: {
                        color: isWarning ? 'yellow' : 'blue',
                        title: 'Guide Note:',
                        content: gUpd.message || 'No additional note provided.',
                    },
                    actions: [
                        { label: 'Acknowledge', icon: 'check', action: 'ack-update', class: 'btn-accept', tripId: trip.id },
                        { label: 'View Schedule', icon: 'calendar', action: 'route', class: 'btn-secondary', target: 'travelPartner_travelerSchedules.html' },
                    ],
                    createdAt: gUpd.createdAt || nowISO(),
                });
            });
        });

        // 5. Vendor Actions & Requests
        trips.forEach((trip) => {
            if (trip.vendorStatus === 'Rejected') {
                const id = `vendor-reject-${trip.id}`;
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    items.push({
                        id,
                        tripId: trip.id,
                        type: 'Vendor Reassignment',
                        badgeColor: 'red',
                        priority: 'HIGH',
                        categories: ['Vendor Actions', 'Urgent', 'Pending Review'],
                        icon: 'alert',
                        iconColor: 'red',
                        title: `Vendor Declined Request - ${trip.vendor?.name || 'Vendor'}`,
                        subtitle: `${trip.vendor?.name || 'Vendor'} declined service for ${trip.title}. Please reassign a service vendor.`,
                        meta: [
                            { icon: 'truck', text: trip.vendor?.name || 'Vendor' },
                            { icon: 'clock', text: relativeTime(trip.updatedAt) },
                        ],
                        banner: {
                            color: 'yellow',
                            title: 'Vendor Reassignment Required:',
                            content: `Service (${trip.vendor?.type || 'transport'}) for ${trip.title} was declined. Reassign to ensure seamless execution.`,
                        },
                        actions: [
                            { label: 'Reassign Vendor', icon: 'truck', action: 'route', class: 'btn-accept', target: 'travelPartner_vendorAssignment.html' },
                        ],
                        createdAt: trip.updatedAt || nowISO(),
                    });
                }
            }
        });

        // 6. Messages (Real messages from state.messages)
        (state.messages || []).forEach((msg, idx) => {
            const id = `msg-${msg.id || idx}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            const isGuide = msg.fromRole === 'guide';
            const trip = trips.find((t) => t.id === msg.tripId);
            items.push({
                id,
                tripId: msg.tripId || '',
                type: 'Message',
                badgeColor: 'blue',
                priority: 'NORMAL',
                categories: [isGuide ? 'Guide Requests' : 'Traveler Actions', 'Pending Review', 'Messages'],
                icon: 'message',
                iconColor: 'blue',
                title: `Message from ${msg.fromName || (isGuide ? 'Tour Guide' : 'Traveler')}`,
                subtitle: `Trip: ${trip ? trip.title : msg.tripTitle || msg.tripId || 'General Coordination'}`,
                meta: [
                    { icon: 'user', text: `${msg.fromName || 'User'} (${ROLE_LABELS[msg.fromRole] || msg.fromRole})` },
                    { icon: 'clock', text: relativeTime(msg.createdAt) },
                ],
                banner: {
                    color: 'blue',
                    title: 'Message Content:',
                    content: msg.body || msg.message || '',
                },
                actions: [
                    { label: 'Reply', icon: 'message', action: 'quick-reply', class: 'btn-secondary', tripId: msg.tripId, recipientName: msg.fromName, toRole: msg.fromRole },
                    { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
                ],
                createdAt: msg.createdAt || nowISO(),
            });
        });

        // 7. Reported Issues (Real open issues from state.issues)
        (state.issues || []).filter((iss) => iss.status !== 'Resolved').forEach((iss, idx) => {
            const id = `iss-${iss.id || idx}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            const isUrgent = String(iss.priority).toLowerCase().includes('high') || String(iss.priority).toLowerCase().includes('critical');
            const isGuide = iss.reporterRole === 'Guide' || iss.reporterRole === 'Tour Guide';
            items.push({
                id,
                tripId: iss.tripId || '',
                type: 'Reported Issue',
                badgeColor: isUrgent ? 'red' : 'orange',
                priority: isUrgent ? 'HIGH' : 'NORMAL',
                categories: [isGuide ? 'Guide Requests' : 'Traveler Actions', 'Urgent', 'Pending Review'],
                icon: 'alert',
                iconColor: isUrgent ? 'red' : 'orange',
                title: `Issue: ${iss.title || iss.type || 'Traveler Issue'}`,
                subtitle: `Reported by ${iss.reportedBy || 'User'} • Trip: ${iss.tripTitle || iss.tripId || 'General'}`,
                meta: [
                    { icon: 'user', text: `${iss.reportedBy || 'User'} (${iss.reporterRole || 'Traveler'})` },
                    { icon: 'clock', text: relativeTime(iss.createdAt) },
                ],
                banner: {
                    color: 'yellow',
                    title: 'Issue Description:',
                    content: iss.description || 'No description provided.',
                },
                actions: [
                    { label: 'Send to Support', icon: 'headphones', action: 'send-trip-to-support', class: 'btn-accept', tripId: iss.tripId },
                    { label: 'View Trip', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
                ],
                createdAt: iss.createdAt || nowISO(),
            });
        });

        // 8. Other partner notifications from state.notifications
        const partnerNotifs = notificationsForRole(state, 'partner');
        partnerNotifs.forEach((ntf, idx) => {
            const id = `ntf-${ntf.id || idx}`;
            if (seenIds.has(id)) return;
            seenIds.add(id);
            const isCancel = String(ntf.type).toLowerCase().includes('cancel');
            const isReq = String(ntf.type).toLowerCase().includes('request');
            const isMod = String(ntf.type).toLowerCase().includes('itinerary') || String(ntf.title).toLowerCase().includes('itinerary');
            const isGuide = String(ntf.title).toLowerCase().includes('guide') || String(ntf.message).toLowerCase().includes('guide');
            const isUrgent = isCancel || String(ntf.type).toLowerCase().includes('warn') || String(ntf.type).toLowerCase().includes('urgent');

            const cats = ['Pending Review'];
            if (isGuide) cats.push('Guide Requests');
            else cats.push('Traveler Actions');
            if (isUrgent) cats.push('Urgent');
            if (isCancel) cats.push('Cancellations');
            if (isMod) cats.push('Itinerary Mods');
            if (isReq) cats.push('Special Requests');

            items.push({
                id,
                tripId: ntf.tripId || '',
                type: ntf.type || 'Notification',
                badgeColor: isUrgent ? 'red' : isMod ? 'purple' : 'blue',
                priority: isUrgent ? 'HIGH' : 'NORMAL',
                categories: cats,
                icon: isCancel ? 'x' : isUrgent ? 'alert' : 'bell',
                iconColor: isUrgent ? 'red' : isMod ? 'purple' : 'blue',
                title: ntf.title || 'System Notification',
                subtitle: ntf.message || '',
                meta: [
                    { icon: 'clock', text: relativeTime(ntf.createdAt) },
                    ...(ntf.tripId ? [{ icon: 'calendar', text: `Trip: ${ntf.tripId}` }] : []),
                ],
                banner: {
                    color: isUrgent ? 'yellow' : 'blue',
                    title: 'Notification Details:',
                    content: ntf.message || '',
                },
                actions: [
                    { label: 'View Details', icon: 'eye', action: 'route', class: 'btn-secondary', target: 'travelPartner_trips.html' },
                ],
                createdAt: ntf.createdAt || nowISO(),
            });
        });

        // Filter out deleted items
        const deletedIds = new Set(state.deletedNotifIds || []);
        const sortedItems = items
            .filter(item => !deletedIds.has(item.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const partnerRead = state.partnerReadItems || [];
        sortedItems.forEach(item => {
            item.isUnread = !partnerRead.includes(item.id);
        });
        return sortedItems;
    }

    function markAllNotifsAsRead(role) {
        const state = loadState();
        const activeRole = role || roleFromPath() || readSession()?.role || 'superuser';

        if (activeRole === 'partner') {
            const allItems = getPartnerNotificationItems(state);
            state.partnerReadItems = allItems.map(item => item.id);
        } else if (activeRole === 'superuser') {
            (state.notifications || []).forEach(n => {
                n.readBy = Array.isArray(n.readBy) ? n.readBy : [];
                if (!n.readBy.includes('superuser')) {
                    n.readBy.push('superuser');
                }
            });
        } else {
            const roleNotifs = notificationsForRole(state, activeRole);
            roleNotifs.forEach(n => {
                n.readBy = Array.isArray(n.readBy) ? n.readBy : [];
                if (!n.readBy.includes(activeRole)) {
                    n.readBy.push(activeRole);
                }
            });
        }

        saveState(state, true, true);
        renderAll();
        if (typeof showToast === 'function') showToast('All notifications marked as read', 'success');
        else if (typeof notify === 'function') notify('All notifications marked as read', 'success');
    }

    function deleteAllNotifs(role) {
        const activeRole = role || roleFromPath() || readSession()?.role || 'superuser';
        const doDelete = () => {
            const state = loadState();
            state.deletedNotifIds = Array.isArray(state.deletedNotifIds) ? state.deletedNotifIds : [];

            let notifsToDelete = [];
            if (activeRole === 'partner') {
                notifsToDelete = getPartnerNotificationItems(state);
            } else if (activeRole === 'superuser') {
                notifsToDelete = state.notifications || [];
            } else {
                notifsToDelete = notificationsForRole(state, activeRole);
            }

            notifsToDelete.forEach(item => {
                if (item && item.id && !state.deletedNotifIds.includes(item.id)) {
                    state.deletedNotifIds.push(item.id);
                }
            });

            if (Array.isArray(state.notifications)) {
                const deletedSet = new Set(state.deletedNotifIds);
                state.notifications = state.notifications.filter(n => !deletedSet.has(n.id));
            }

            saveState(state, true, true);
            renderAll();
            if (typeof showToast === 'function') showToast('All notifications deleted', 'info');
            else if (typeof notify === 'function') notify('All notifications deleted', 'info');
        };

        if (typeof confirmThen === 'function') {
            confirmThen('Delete All Notifications', 'Are you sure you want to delete all notifications for this portal?', 'Delete All', 'red', doDelete);
        } else if (typeof confirm === 'function' && confirm('Are you sure you want to delete all notifications?')) {
            doDelete();
        } else {
            doDelete();
        }
    }

    window.markAllNotifsAsRead = markAllNotifsAsRead;
    window.deleteAllNotifs = deleteAllNotifs;
    window.markAllPartnerNotifsAsRead = markAllNotifsAsRead;
    window.deleteAllPartnerNotifs = deleteAllNotifs;
    window.markAllAlertsAsRead = markAllNotifsAsRead;

    function renderPartnerNotifications(state) {
        if (currentPage() !== 'travelPartner_notifications.html') return;
        const list = document.getElementById('requests-list');
        if (!list) return;

        const allItems = getPartnerNotificationItems(state);
        const unreadItems = allItems.filter(item => item.isUnread);

        // 1. Calculate Real Stat Numbers
        const cancellationsCount = unreadItems.filter((item) => item.categories.includes('Cancellations')).length;
        const itineraryModsCount = unreadItems.filter((item) => item.categories.includes('Itinerary Mods')).length;
        const messagesCount = unreadItems.filter((item) => item.categories.includes('Messages')).length;
        const specialRequestsCount = unreadItems.filter((item) => item.categories.includes('Special Requests') || item.type === 'New Request').length;

        const statCancellationsEl = document.getElementById('stat-cancellations');
        if (statCancellationsEl) statCancellationsEl.textContent = cancellationsCount;

        const statItineraryModsEl = document.getElementById('stat-itinerary-mods');
        if (statItineraryModsEl) statItineraryModsEl.textContent = itineraryModsCount;

        const statMessagesEl = document.getElementById('stat-messages');
        if (statMessagesEl) statMessagesEl.textContent = messagesCount;

        const statSpecialRequestsEl = document.getElementById('stat-special-requests');
        if (statSpecialRequestsEl) statSpecialRequestsEl.textContent = specialRequestsCount;

        // Fallback for querySelectorAll('.stat-num') if needed
        const statNums = document.querySelectorAll('.top-stats .stat-num');
        if (statNums.length >= 4) {
            statNums[0].textContent = cancellationsCount;
            statNums[1].textContent = itineraryModsCount;
            statNums[2].textContent = messagesCount;
            statNums[3].textContent = specialRequestsCount;
        }

        // 2. Calculate Real Filter Badges
        const countAll = unreadItems.length;
        const countTraveler = unreadItems.filter((item) => item.categories.includes('Traveler Actions')).length;
        const countGuide = unreadItems.filter((item) => item.categories.includes('Guide Requests')).length;
        const countUrgent = unreadItems.filter((item) => item.categories.includes('Urgent')).length;
        const countPending = unreadItems.filter((item) => item.categories.includes('Pending Review')).length;

        const badgeAllEl = document.getElementById('filter-badge-all');
        if (badgeAllEl) badgeAllEl.textContent = countAll;
        const badgeTravelerEl = document.getElementById('filter-badge-traveler');
        if (badgeTravelerEl) badgeTravelerEl.textContent = countTraveler;
        const badgeGuideEl = document.getElementById('filter-badge-guide');
        if (badgeGuideEl) badgeGuideEl.textContent = countGuide;
        const badgeUrgentEl = document.getElementById('filter-badge-urgent');
        if (badgeUrgentEl) badgeUrgentEl.textContent = countUrgent;
        const badgePendingEl = document.getElementById('filter-badge-pending');
        if (badgePendingEl) badgePendingEl.textContent = countPending;

        // 3. Filter items according to active filter
        const filteredItems = _activeNotifFilter === 'all'
            ? allItems
            : allItems.filter((item) => item.categories.includes(_activeNotifFilter));

        // 4. Render Cards
        if (!filteredItems.length) {
            list.innerHTML = `
                <div class="card p-8 text-center" style="border:1px solid var(--border-color, #e2e8f0); border-radius:1rem; background:var(--bg-surface, #fff); margin-top:12px;">
                    <div style="font-size:1.2rem; font-weight:700; color:var(--text-primary, #0f172a); margin-bottom:6px;">No requests found</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary, #64748b);">There are no pending requests matching "${_activeNotifFilter === 'all' ? 'All Requests' : _activeNotifFilter}".</div>
                </div>
            `;
        } else {
            list.innerHTML = filteredItems.map((item) => `
                <div class="notif-card" data-categories='${JSON.stringify(item.categories)}' id="${item.id}" style="display:flex;">
                    <div class="notif-content">
                        <div class="notif-icon-circle ${item.iconColor || 'blue'}">
                            <i data-icon="${item.icon || 'bell'}"></i>
                        </div>
                        <div class="notif-main">
                            <div class="notif-badges">
                                ${item.priority ? `<span class="badge-outline ${item.priority === 'HIGH' ? 'orange' : 'blue'}">${item.priority}</span>` : ''}
                                <span class="badge-outline ${item.badgeColor || 'blue'}">${escapeHTML(item.type)}</span>
                                ${item.tripId ? `<span class="badge-outline blue">${escapeHTML(item.tripId)}</span>` : ''}
                            </div>
                            <h3 class="notif-title">${escapeHTML(item.title)}</h3>
                            <p class="notif-subtitle">${escapeHTML(item.subtitle)}</p>
                            
                            <div class="notif-meta">
                                ${(item.meta || []).map((m) => `<span class="notif-meta-item"><i data-icon="${m.icon}"></i> ${escapeHTML(m.text)}</span>`).join('')}
                            </div>

                            ${item.banner ? `
                                <div class="notif-banner ${item.banner.color || 'yellow'}">
                                    <strong>${escapeHTML(item.banner.title)}</strong><br>
                                    ${escapeHTML(item.banner.content)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="notif-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                        ${(item.actions || []).map((act) => {
                if (act.action === 'quick-reply') {
                    return `<button class="action-btn ${act.class || 'btn-secondary'}" onclick="openReplyModal('${act.tripId}', '${act.recipientName}', '${act.toRole}')"><i data-icon="${act.icon}"></i> ${escapeHTML(act.label)}</button>`;
                }
                return `<button class="action-btn ${act.class || 'btn-secondary'}" data-dd-action="${act.action}" ${act.tripId ? `data-trip-id="${act.tripId}"` : ''} ${act.target ? `data-dd-target="${act.target}"` : ''}><i data-icon="${act.icon}"></i> ${escapeHTML(act.label)}</button>`;
            }).join('')}
                        <button class="action-btn btn-secondary text-red-500" data-dd-action="delete-notif" data-notif-id="${item.id}" title="Delete Notification" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); display: inline-flex; align-items: center; gap: 6px;"><i data-icon="trash"></i> Delete</button>
                    </div>
                </div>
            `).join('');
        }

        // 5. Wire filter clicks
        const filterBtns = document.querySelectorAll('#notif-filters .filter-btn');
        filterBtns.forEach((btn) => {
            const filterVal = btn.getAttribute('data-filter');
            if (filterVal === _activeNotifFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
            btn.onclick = () => {
                _activeNotifFilter = filterVal;
                renderPartnerNotifications(state);
            };
        });

        iconRefresh(list);
    }

    function renderGuideNotifications(state) {
        if (currentPage() !== 'notifications.html' || !decodeURIComponent(window.location.pathname).includes('/guide/')) return;
        const container = document.querySelector('.notif-list-container');
        if (!container) return;

        const role = 'guide';
        const allNotifications = notificationsForRole(state, role);
        const activeFilter = _activeNotifFilters.guide || 'all';

        // Wire filter tabs
        const filterTabs = document.querySelectorAll('.filter-tabs-full .filter-tab-pill');
        filterTabs.forEach((tab) => {
            const text = tab.textContent.trim();
            const tabKey = tab.getAttribute('data-filter') || text;
            if (tabKey.toLowerCase() === activeFilter.toLowerCase() || (activeFilter === 'all' && (text.includes('All') || tabKey === 'all'))) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
            tab.onclick = (e) => {
                e.preventDefault();
                _activeNotifFilters.guide = tabKey.toLowerCase().includes('all') ? 'all' : tabKey;
                renderGuideNotifications(state);
            };
        });

        // Filter notifications
        const notifications = allNotifications.filter(item => matchesNotifFilter(item, activeFilter, role));

        if (!notifications.length) {
            container.innerHTML = `
                <div class="notif-item-full" style="padding: 2.5rem; text-align: center;">
                    <div class="notif-content-full">
                        <div class="notif-title-full" style="font-size: 1.1rem; color: var(--text-primary, #0f172a); margin-bottom: 0.5rem;">No notifications found</div>
                        <p class="notif-desc-full" style="color: var(--text-secondary, #64748b);">There are no notifications matching the "${activeFilter}" filter.</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = notifications.map((item) => {
                const isUnread = !(item.readBy || []).includes(role);
                const iconColor = String(item.type).toLowerCase().includes('warn') || String(item.type).toLowerCase().includes('high') ? 'red'
                    : String(item.type).toLowerCase().includes('accept') || String(item.type).toLowerCase().includes('resolved') ? 'green'
                        : String(item.type).toLowerCase().includes('assign') ? 'amber'
                            : 'blue';
                return `
                    <div class="notif-item-full ${isUnread ? 'unread' : ''}" id="${item.id}">
                        <div class="notif-icon-circle n-${iconColor}">
                            <i data-icon="${iconColor === 'red' ? 'alert' : iconColor === 'green' ? 'check' : iconColor === 'amber' ? 'clipboard' : 'bell'}"></i>
                        </div>
                        <div class="notif-content-full">
                            <div class="notif-header-full">
                                <span class="notif-title-full">${escapeHTML(item.title)}</span>
                                <span class="notif-time-full">${relativeTime(item.createdAt)}</span>
                            </div>
                            <p class="notif-desc-full">${escapeHTML(item.message)}</p>
                            <div class="notif-actions-full" style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                <button class="btn btn-primary small" data-dd-action="route" data-dd-target="${String(item.title).toLowerCase().includes('assign') ? 'assignments.html' : 'tour_updates.html'}">Open</button>
                                ${isUnread ? `<button class="btn btn-secondary small" data-dd-action="mark-read" data-notif-id="${item.id}">Mark as Read</button>` : ''}
                                <button class="btn btn-secondary small text-red-500" data-dd-action="delete-notif" data-notif-id="${item.id}" title="Delete Notification" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); display: inline-flex; align-items: center; gap: 4px;"><i data-icon="trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        iconRefresh(container);
    }

    function renderVendorNotifications(state) {
        if (currentPage() !== 'vendor_notifications.html') return;
        const container = document.querySelector('.notif-list-container');
        if (!container) return;

        const role = 'vendor';
        const allNotifications = notificationsForRole(state, role);
        const activeFilter = _activeNotifFilters.vendor || 'all';

        // Wire filter tabs
        const filterTabs = document.querySelectorAll('.filter-tabs-full .filter-tab-pill');
        filterTabs.forEach((tab) => {
            const text = tab.textContent.trim();
            const tabKey = tab.getAttribute('data-filter') || text;
            if (tabKey.toLowerCase() === activeFilter.toLowerCase() || (activeFilter === 'all' && (text.includes('All') || tabKey === 'all'))) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
            tab.onclick = (e) => {
                e.preventDefault();
                _activeNotifFilters.vendor = tabKey.toLowerCase().includes('all') ? 'all' : tabKey;
                renderVendorNotifications(state);
            };
        });

        // Filter notifications
        const notifications = allNotifications.filter(item => matchesNotifFilter(item, activeFilter, role));

        if (!notifications.length) {
            container.innerHTML = `
                <div class="notif-item-full" style="padding: 2.5rem; text-align: center;">
                    <div class="notif-content-full">
                        <div class="notif-title-full" style="font-size: 1.1rem; color: var(--text-primary, #0f172a); margin-bottom: 0.5rem;">No notifications found</div>
                        <p class="notif-desc-full" style="color: var(--text-secondary, #64748b);">There are no notifications matching the "${activeFilter}" filter.</p>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = notifications.map((item) => {
                const isUnread = !(item.readBy || []).includes(role);
                const iconColor = String(item.type).toLowerCase().includes('warn') || String(item.type).toLowerCase().includes('high') ? 'red'
                    : String(item.type).toLowerCase().includes('accept') || String(item.type).toLowerCase().includes('resolved') ? 'green'
                        : String(item.type).toLowerCase().includes('request') || String(item.type).toLowerCase().includes('service') ? 'amber'
                            : 'blue';
                return `
                    <div class="notif-item-full ${isUnread ? 'unread' : ''}" id="${item.id}">
                        <div class="notif-icon-circle n-${iconColor}">
                            <i data-icon="${iconColor === 'red' ? 'alert' : iconColor === 'green' ? 'check' : iconColor === 'amber' ? 'clipboard' : 'bell'}"></i>
                        </div>
                        <div class="notif-content-full">
                            <div class="notif-header-full">
                                <span class="notif-title-full">${escapeHTML(item.title)}</span>
                                <span class="notif-time-full">${relativeTime(item.createdAt)}</span>
                            </div>
                            <p class="notif-desc-full">${escapeHTML(item.message)}</p>
                            <div class="notif-actions-full" style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="vendor_service_requests.html">View Requests</button>
                                ${isUnread ? `<button class="t-btn t-btn-outline" data-dd-action="mark-read" data-notif-id="${item.id}">Mark as Read</button>` : ''}
                                <button class="t-btn t-btn-outline" data-dd-action="delete-notif" data-notif-id="${item.id}" title="Delete Notification" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); display: inline-flex; align-items: center; gap: 4px;"><i data-icon="trash"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        iconRefresh(container);
    }

    function renderSupportNotifications(state) {
        if (currentPage() !== 'notifications.html' || !decodeURIComponent(window.location.pathname).includes('/support/')) return;
        const container = document.querySelector('.notif-list-container');
        if (!container) return;

        const role = 'support';
        const allNotifications = notificationsForRole(state, role);
        const activeFilter = _activeNotifFilters.support || 'all';

        // Dynamic update of top stat banner cards (reflecting unread active alerts)
        const totalElem = document.getElementById('stat-total-alerts');
        const emergencyElem = document.getElementById('stat-emergency-alerts');
        const issueElem = document.getElementById('stat-issue-alerts');
        const resolutionElem = document.getElementById('stat-resolution-alerts');

        if (totalElem) {
            const unreadNotifs = allNotifications.filter(n => !(n.readBy || []).includes(role));
            const emergencies = unreadNotifs.filter(n => /emergency|critical|high/i.test(`${n.title} ${n.message} ${n.type}`));
            const issues = unreadNotifs.filter(n => /issue|support|ticket|report|warn/i.test(`${n.title} ${n.message} ${n.type}`));
            const resolved = allNotifications.filter(n => /resolved|check|completed|close/i.test(`${n.title} ${n.message} ${n.type}`));

            totalElem.textContent = unreadNotifs.length;
            if (emergencyElem) emergencyElem.textContent = emergencies.length;
            if (issueElem) issueElem.textContent = issues.length;
            if (resolutionElem) resolutionElem.textContent = resolved.length;
        }

        // Wire filter tabs
        const filterTabs = document.querySelectorAll('.filter-tabs-full .filter-tab-pill');
        filterTabs.forEach((tab) => {
            const text = tab.textContent.trim();
            const tabKey = tab.getAttribute('data-filter') || text;
            const normTabKey = tabKey.toLowerCase().trim();
            const normActive = activeFilter.toLowerCase().trim();

            const isMatch = (normActive === 'all' && (normTabKey === 'all' || text.toLowerCase().includes('all')))
                || (normActive === normTabKey)
                || (normActive.includes('issue') && normTabKey.includes('issue'))
                || (normActive.includes('emergency') && normTabKey.includes('emergency'));

            if (isMatch) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
            tab.onclick = (e) => {
                e.preventDefault();
                _activeNotifFilters.support = normTabKey.includes('all') ? 'all' : normTabKey;
                renderSupportNotifications(loadState());
            };
        });

        // Filter notifications
        const notifications = allNotifications.filter(item => matchesNotifFilter(item, activeFilter, role));

        const topBulkHeaderHtml = `
            <div class="support-notif-top-bar">
                <div class="notif-manager-title">
                    <i data-icon="bell" style="color: #0ea5e9;"></i> Notifications Manager <span style="background: var(--bg-surface, #ffffff); color: var(--text-secondary, #64748b); font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 1px solid var(--border-color, #cbd5e1); font-weight: 700;">${notifications.length} ITEMS</span>
                </div>
                <div class="notif-actions-group">
                    <button class="notif-bulk-btn" data-dd-action="mark-all-read" onclick="window.markAllNotifsAsRead('support')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: #ffffff; border: none; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3); transition: all 0.2s;">
                        <i data-icon="check"></i> Mark all as read
                    </button>
                    <button class="notif-bulk-btn delete-all-btn" data-dd-action="delete-all-notifs" onclick="window.deleteAllNotifs('support')" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s;">
                        <i data-icon="trash"></i> Delete all
                    </button>
                </div>
            </div>
        `;

        if (!notifications.length) {
            container.innerHTML = topBulkHeaderHtml + `
                <div class="notif-item-full" style="padding: 3.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--bg-card-alt, #f1f5f9); display: flex; align-items: center; justify-content: center; color: var(--text-muted, #94a3b8); margin-bottom: 1rem; font-size: 1.5rem;">
                        <i data-icon="bell"></i>
                    </div>
                    <div class="notif-title-full" style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary, #0f172a); margin-bottom: 0.5rem;">No notifications found</div>
                    <p class="notif-desc-full" style="color: var(--text-secondary, #64748b); margin: 0; max-width: 400px; line-height: 1.5;">There are no notifications matching the "${escapeHTML(activeFilter)}" filter.</p>
                </div>
            `;
        } else {
            container.innerHTML = topBulkHeaderHtml + notifications.map((item) => {
                const isUnread = !(item.readBy || []).includes(role);
                const iconColor = String(item.type).toLowerCase().includes('emergency') || String(item.type).toLowerCase().includes('high') ? 'red'
                    : String(item.type).toLowerCase().includes('warn') || String(item.type).toLowerCase().includes('issue') ? 'amber'
                        : String(item.type).toLowerCase().includes('resolved') || String(item.type).toLowerCase().includes('check') ? 'green'
                            : 'blue';

                const targetPage = String(item.title).toLowerCase().includes('issue') || String(item.title).toLowerCase().includes('ticket') ? 'reported_issues.html'
                    : String(item.title).toLowerCase().includes('emergency') ? 'emergency_support.html'
                        : String(item.title).toLowerCase().includes('resolution') ? 'resolution_updates.html'
                            : 'reported_issues.html';

                return `
                    <div class="notif-item-full ${isUnread ? 'unread' : ''}" id="${item.id}">
                        <div class="notif-icon-circle n-${iconColor}">
                            <i data-icon="${iconColor === 'red' ? 'phone' : iconColor === 'amber' ? 'alert' : iconColor === 'green' ? 'check' : 'bell'}"></i>
                        </div>
                        <div class="notif-content-full">
                            <div class="notif-header-full">
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <span class="notif-title-full">${escapeHTML(item.title)}</span>
                                    ${isUnread ? `<span style="background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; letter-spacing: 0.02em;">New</span>` : ''}
                                </div>
                                <span class="notif-time-full"><i data-icon="clock"></i><span>${relativeTime(item.createdAt)}</span></span>
                            </div>
                            <p class="notif-desc-full">${escapeHTML(item.message)}</p>
                            <div class="notif-actions-full">
                                <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="${targetPage}" style="background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: #ffffff; border: none; font-weight: 700; padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.25);">View Details</button>
                                ${isUnread ? `<button class="t-btn" data-dd-action="mark-read" data-notif-id="${item.id}" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.35); font-weight: 600; padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer;">Mark as Read</button>` : `<button class="t-btn" disabled style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted, #64748b); border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1)); font-weight: 600; padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: default; opacity: 0.7;">Read</button>`}
                                <button class="t-btn" data-dd-action="delete-notif" data-notif-id="${item.id}" title="Delete Notification" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); font-weight: 600; padding: 8px 18px; border-radius: 8px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"><i data-icon="trash" style="width: 14px; height: 14px;"></i> Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        iconRefresh(container);
    }

    function storedMessageTripId() {
        try {
            return localStorage.getItem(MESSAGE_TRIP_KEY) || '';
        } catch {
            return '';
        }
    }

    function setStoredMessageTripId(id) {
        try {
            if (id) localStorage.setItem(MESSAGE_TRIP_KEY, id);
        } catch {
            // Local storage can be disabled in private browser contexts.
        }
    }

    function messageTrips(state) {
        const role = roleFromPath();
        const userTrips = tripsForCurrentUser(allActiveTrips(state));
        const trips = userTrips.filter((trip) => trip.status !== 'cancelled');
        if (role === 'guide') return trips.filter((trip) => trip.guide);
        if (role === 'vendor') return trips.filter((trip) => trip.vendor);
        if (role === 'traveler') return trips;
        if (['partner', 'superuser', 'support'].includes(role)) {
            return allActiveTrips(state).filter((trip) => trip.status !== 'cancelled');
        }
        return trips;
    }

    function selectedMessageTrip(state) {
        const trips = messageTrips(state);
        const storedId = storedMessageTripId();
        const latest = latestTravelerTrip(state);
        return trips.find((trip) => trip.id === storedId) || (latest && trips.find((trip) => trip.id === latest.id)) || trips[0] || null;
    }

    function messagesForTrip(state, tripId) {
        if (!tripId) return [];
        return (state.messages || [])
            .filter((message) => message.tripId === tripId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    function latestMessagePreview(state, trip) {
        const latest = messagesForTrip(state, trip.id)[0];
        return latest ? latest.body : trip.currentActivity || 'No messages yet';
    }

    function recipientOptionsHTML(currentRole) {
        return MESSAGE_ROLES
            .filter((role) => role === 'all' || role !== currentRole)
            .map((role) => `<option value="${role}">${escapeHTML(role === 'all' ? 'All Members' : ROLE_LABELS[role])}</option>`)
            .join('');
    }

    function tripOptionsHTML(trips, selectedId) {
        return trips.map((trip) => `<option value="${trip.id}" ${trip.id === selectedId ? 'selected' : ''}>${trip.id} - ${escapeHTML(trip.title)}</option>`).join('');
    }

    function chatRowsHTML(messages, currentRole, mode) {
        if (!messages.length) {
            if (mode === 'support') return `<div class="msg-bubble msg-left"><div>No messages for this trip yet.</div><div class="msg-time">Now</div></div>`;
            return `<div class="message-wrapper left"><div class="message-bubble">No messages for this trip yet.</div><div class="message-time">Now</div></div>`;
        }
        return messages.slice().reverse().map((message) => {
            const own = message.fromRole === currentRole;
            const label = `${ROLE_LABELS[message.fromRole] || message.fromRole} - ${message.fromName}`;
            if (mode === 'support') {
                return `
                    <div class="msg-bubble ${own ? 'msg-right' : 'msg-left'}">
                        <div style="font-size:0.72rem;font-weight:700;opacity:.72;margin-bottom:4px;">${escapeHTML(label)}</div>
                        <div>${escapeHTML(message.body)}</div>
                        <div class="msg-time">${relativeTime(message.createdAt)}</div>
                    </div>
                `;
            }
            return `
                <div class="message-wrapper ${own ? 'right' : 'left'}">
                    <div class="message-bubble"><strong style="display:block;font-size:0.72rem;margin-bottom:4px;">${escapeHTML(label)}</strong>${escapeHTML(message.body)}</div>
                    <div class="message-time">${relativeTime(message.createdAt)}</div>
                </div>
            `;
        }).join('');
    }

    function compactMessageRowsHTML(messages, currentRole) {
        return messages.slice(0, 8).map((message) => {
            const own = message.fromRole === currentRole;
            return `
                <div style="display:flex;justify-content:${own ? 'flex-end' : 'flex-start'};margin-bottom:10px;">
                    <div style="max-width:78%;padding:10px 12px;border-radius:8px;background:${own ? '#2563eb' : 'var(--bg-surface, #f1f5f9)'};color:${own ? '#fff' : 'var(--text-primary, #0f172a)'};border:1px solid ${own ? '#2563eb' : 'var(--border-color, #e2e8f0)'};">
                        <div style="font-size:12px;font-weight:700;margin-bottom:4px;color:${own ? '#fff' : 'var(--text-primary, #0f172a)'};">${escapeHTML(message.fromName)} - ${escapeHTML(ROLE_LABELS[message.fromRole] || message.fromRole)}</div>
                        <div style="font-size:14px;line-height:1.45;">${escapeHTML(message.body)}</div>
                        <div style="font-size:11px;opacity:.7;margin-top:4px;color:${own ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary, #64748b)'};">${relativeTime(message.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('') || `<div style="padding:14px;color:var(--text-secondary, #64748b);text-align:center;">No messages for this trip yet.</div>`;
    }

    function renderTravelerMessages(state) {
        if (currentPage() !== 'traveler_messages.html') return;
        const layout = document.querySelector('.chat-layout');
        if (!layout) return;
        const trips = messageTrips(state);
        const trip = selectedMessageTrip(state);
        const selectedId = trip?.id || '';
        const currentRole = roleFromPath();
        const messages = messagesForTrip(state, selectedId);
        layout.innerHTML = `
            <div class="conversations-pane">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h3 class="pane-title" style="margin: 0; padding-bottom: 0; border: none;">Conversations</h3>
                    <div class="mark-read-text" onclick="window.markAllMessagesAsRead()" style="cursor: pointer; color: #14b8a6; font-size: 14px; font-weight: 500; white-space: nowrap;">Mark all as read</div>
                </div>
                <div class="conv-list">
                    ${trips.map((item) => `
                        <div class="conv-item ${item.id === selectedId ? 'active' : ''}" data-dd-action="select-message-trip" data-trip-id="${item.id}">
                            <div class="conv-avatar">${escapeHTML(initialsFor(item.title))}</div>
                            <div class="conv-details">
                                <div class="conv-top"><h4>${escapeHTML(item.id)}</h4>${messagesForTrip(state, item.id).length ? `<span class="badg-count">${messagesForTrip(state, item.id).length}</span>` : ''}</div>
                                <div class="conv-role">${escapeHTML(item.title)}</div>
                                <p class="conv-preview">${escapeHTML(latestMessagePreview(state, item))}</p>
                                <div class="conv-time">${relativeTime(item.updatedAt)}</div>
                            </div>
                        </div>
                    `).join('') || `<div class="conv-item"><div class="conv-details"><div class="conv-role">No active trips</div></div></div>`}
                </div>
            </div>
            <div class="chat-pane" data-dd-message-center>
                <div class="chat-header">
                    <div class="chat-avatar">${escapeHTML(initialsFor(trip?.title || 'Trip'))}</div>
                    <div class="chat-info"><h3>${escapeHTML(trip?.title || 'Trip Messages')}</h3><p>${escapeHTML(selectedId || 'No active trip selected')}</p></div>
                </div>
                <div class="chat-body">${chatRowsHTML(messages, currentRole)}</div>
                <div class="chat-footer">
                    <select data-dd-message-trip style="display:none;">${tripOptionsHTML(trips, selectedId)}</select>
                    <select class="chat-input" data-dd-message-recipient style="max-width:170px;" ${!trip ? 'disabled' : ''}>${recipientOptionsHTML(currentRole)}</select>
                    <input type="text" class="chat-input" data-dd-message-input placeholder="${trip ? 'Type your message...' : 'No active trip available to message'}" ${!trip ? 'disabled' : ''} />
                    <button class="chat-send-btn" data-dd-action="member-message-submit" ${!trip ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}><i data-icon="send"></i> Send</button>
                </div>
            </div>
        `;
        iconRefresh(layout);
    }

    function renderSupportMessages(state) {
        if (currentPage() !== 'messages.html' || !decodeURIComponent(window.location.pathname).includes('/support/')) return;
        const layout = document.querySelector('.chat-layout');
        if (!layout) return;
        const trips = messageTrips(state);
        const trip = selectedMessageTrip(state);
        const selectedId = trip?.id || '';
        const currentRole = roleFromPath();
        const messages = messagesForTrip(state, selectedId);
        layout.innerHTML = `
            <div class="chat-sidebar">
                <div class="chat-header"><h2>Conversations</h2></div>
                <div class="contact-list">
                    ${trips.map((item) => `
                        <div class="contact-item ${item.id === selectedId ? 'active' : ''}" data-dd-action="select-message-trip" data-trip-id="${item.id}">
                            <div class="c-header"><span class="c-name">${escapeHTML(item.travelerName)}</span><span class="c-time">${relativeTime(item.updatedAt)}</span></div>
                            <div class="c-role">${escapeHTML(item.id)} - ${escapeHTML(item.title)}</div>
                            <div class="c-msg">${escapeHTML(latestMessagePreview(state, item))}</div>
                            ${messagesForTrip(state, item.id).length ? `<div class="unread-badge">${messagesForTrip(state, item.id).length}</div>` : ''}
                        </div>
                    `).join('') || `<div class="contact-item"><div class="c-role">No active trips</div></div>`}
                </div>
            </div>
            <div class="chat-main" data-dd-message-center>
                <div class="chat-top">
                    <div class="chat-avatar">${escapeHTML(initialsFor(trip?.travelerName || 'T'))}</div>
                    <div><div>${escapeHTML(trip?.travelerName || 'Trip Messages')}</div><div>${escapeHTML(selectedId || 'Select a trip')}</div></div>
                </div>
                <div class="chat-messages">${chatRowsHTML(messages, currentRole, 'support')}</div>
                <div class="chat-input-area">
                    <select data-dd-message-trip style="display:none;">${tripOptionsHTML(trips, selectedId)}</select>
                    <select class="chat-input" data-dd-message-recipient style="max-width:170px;">${recipientOptionsHTML(currentRole)}</select>
                    <input type="text" class="chat-input" data-dd-message-input placeholder="Type your message..." />
                    <button class="btn-send" data-dd-action="member-message-submit"><i data-icon="send"></i> Send</button>
                </div>
            </div>
        `;
        iconRefresh(layout);
    }

    function renderEmbeddedMemberMessages(state) {
        const pageName = currentPage();
        if (!['tour_updates.html', 'vendor_service_updates.html', 'travelPartner_notifications.html'].includes(pageName)) return;
        const host = document.querySelector('.page-content') || document.querySelector('.page-scroll') || document.querySelector('#requests-list')?.parentElement;
        if (!host) return;
        let panel = document.getElementById('dd-member-messages');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'dd-member-messages';
            host.appendChild(panel);
        }
        const trips = messageTrips(state);
        const trip = selectedMessageTrip(state);
        const selectedId = trip?.id || '';
        const currentRole = roleFromPath();
        const messages = messagesForTrip(state, selectedId);
        panel.innerHTML = `
            <div data-dd-message-center style="margin-top:24px;background:var(--bg-surface, #fff);border:1px solid var(--border-color, #e2e8f0);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden;">
                <div style="padding:16px 18px;border-bottom:1px solid var(--border-color, #e2e8f0);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--bg-surface, #fff);">
                    <div>
                        <h2 style="font-size:18px;font-weight:800;color:var(--text-primary, #0f172a);margin:0;">Member Messages</h2>
                        <p style="font-size:13px;color:var(--text-secondary, #64748b);margin:4px 0 0;">${escapeHTML(selectedId || 'Select a trip')}</p>
                    </div>
                    <select data-dd-message-trip style="min-width:220px;border:1px solid var(--border-color, #cbd5e1);border-radius:8px;padding:10px 12px;background:var(--bg-card-alt, #f8fafc);color:var(--text-primary, #0f172a);outline:none;">${tripOptionsHTML(trips, selectedId)}</select>
                </div>
                <div style="padding:16px 18px;max-height:280px;overflow:auto;background:var(--bg-card-alt, #f8fafc);color:var(--text-primary, #0f172a);">${compactMessageRowsHTML(messages, currentRole)}</div>
                <div style="padding:14px 18px;display:grid;grid-template-columns:minmax(140px,180px) 1fr auto;gap:10px;border-top:1px solid var(--border-color, #e2e8f0);background:var(--bg-surface, #fff);">
                    <select data-dd-message-recipient style="border:1px solid var(--border-color, #cbd5e1);border-radius:8px;padding:10px 12px;background:var(--bg-card-alt, #f8fafc);color:var(--text-primary, #0f172a);outline:none;">${recipientOptionsHTML(currentRole)}</select>
                    <input data-dd-message-input type="text" placeholder="Type message..." style="border:1px solid var(--border-color, #cbd5e1);border-radius:8px;padding:10px 12px;min-width:0;background:var(--bg-card-alt, #f8fafc);color:var(--text-primary, #0f172a);outline:none;" />
                    <button data-dd-action="member-message-submit" class="btn" style="white-space:nowrap;background:linear-gradient(135deg, #0ea5e9, #14b8a6);color:#fff;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-weight:600;"><i data-icon="send"></i> Send</button>
                </div>
            </div>
        `;
        iconRefresh(panel);
    }

    function renderMemberMessages(state) {
        renderTravelerMessages(state);
        renderSupportMessages(state);
        renderEmbeddedMemberMessages(state);
    }

    function renderIssueForms(state) {
        const page = currentPage();
        if (!['traveler_report_issue.html', 'issue_reporting.html', 'vendor_report_issue.html', 'issue_log.html', 'resolution_updates.html'].includes(page)) return;
        const startedTrips = allActiveTrips(state).filter((trip) => trip.scheduleStarted || trip.status !== 'requested');

        // In support pages, only show trips/issues coordinated/accepted by support
        const isSupportPage = decodeURIComponent(window.location.pathname).includes('/support/');
        let displayTrips = startedTrips;
        if (page === 'traveler_report_issue.html') {
            displayTrips = tripsForCurrentUser(startedTrips);
        } else if (isSupportPage) {
            displayTrips = startedTrips.filter(trip => trip.supportStatus === 'Accepted');
        }

        if (page !== 'resolution_updates.html') {
            const selects = document.querySelectorAll('select');
            const tripSelect = page === 'traveler_report_issue.html' ? selects[2] : selects[0];
            if (tripSelect) {
                const prev = tripSelect.value;
                tripSelect.innerHTML = `<option value="">Select Trip ID</option>` + displayTrips.map((trip) => `<option value="${trip.id}">${trip.id} - ${escapeHTML(trip.title)}</option>`).join('');
                if (prev && displayTrips.some(t => t.id === prev)) tripSelect.value = prev;
            }
        } else {
            const select = document.querySelector('form select');
            const openIssues = (state.issues || []).filter((issue) => issue.status !== 'Resolved');
            if (select) {
                const prev = select.value;
                select.innerHTML = `<option value="">Choose an issue to confirm resolution</option>` + openIssues.map((issue) => `<option value="${issue.id}">${issue.id} - ${escapeHTML(issue.title)} (${escapeHTML(issue.tripId)})</option>`).join('');
                if (prev && openIssues.some(i => i.id === prev)) select.value = prev;
            }
        }
    }



    function renderVendorReportedIssues(state) {
        if (currentPage() !== 'vendor_report_issue.html') return;
        const container = document.querySelector('.reported-issues-container');

        const session = readSession();
        const vendorTrips = getVendorTrips(state);
        const vendorTripIds = new Set(vendorTrips.map(t => t.id));

        // Dynamically populate Trip ID select dropdown with Vendor's assigned trips
        const tripSelects = document.querySelectorAll('.form-card select, select');
        if (tripSelects.length > 0 && vendorTrips.length > 0) {
            const tripSelect = tripSelects[0];
            const currentVal = tripSelect.value;
            if (tripSelect.options.length <= 4) {
                let optionsHtml = `<option value="">Select Trip ID</option>`;
                vendorTrips.forEach(t => {
                    optionsHtml += `<option value="${t.id}">${t.id} - ${escapeHTML(t.title || t.destination || 'Trip')}</option>`;
                });
                tripSelect.innerHTML = optionsHtml;
                if (currentVal) tripSelect.value = currentVal;
            }
        }

        if (!container) return;

        const issues = (state.issues || []).filter(issue =>
            vendorTripIds.has(issue.tripId) ||
            (issue.vendorEmail && session.email && issue.vendorEmail.toLowerCase() === session.email.toLowerCase()) ||
            (issue.reporterRole && String(issue.reporterRole).toLowerCase().includes('vendor')) ||
            (issue.reportedBy && session.name && String(issue.reportedBy).toLowerCase() === String(session.name).toLowerCase())
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = issues.map(issue => `
            <div class="issue-card" style="margin-bottom:12px; background:var(--bg-surface, #fff); padding:16px; border-radius:12px; border:1px solid rgba(148,163,184,0.2);">
                <div class="issue-info" style="display:flex; gap:12px; align-items:flex-start;">
                    <i data-icon="alerttriangle" class="issue-icon" style="color:${['High', 'Critical'].includes(issue.priority) ? '#ef4444' : '#f59e0b'}; width:24px; height:24px; flex-shrink:0;"></i>
                    <div class="issue-details" style="flex:1;">
                        <div class="issue-desc" style="font-weight:700; color:var(--text-primary, #0f172a); font-size:15px;">${escapeHTML(issue.title || issue.type)}</div>
                        <div class="issue-sub" style="font-size:13px; color:var(--text-secondary, #64748b); margin-top:2px;">${escapeHTML(issue.description)}</div>
                        <div class="issue-trip" style="font-size:12px; color:#2563eb; font-weight:600; margin-top:4px;">${issue.tripId ? `Trip: ${escapeHTML(issue.tripId)} (${escapeHTML(issue.tripTitle || '')}) • ` : ''}Reported by ${escapeHTML(issue.reportedBy)} (${escapeHTML(issue.reporterRole)})</div>
                        ${(issue.attachmentUrl || issue.photoUrl) ? `
                            <div style="margin-top:8px;">
                                <a href="${escapeHTML(issue.attachmentUrl || issue.photoUrl)}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#0ea5e9; font-weight:600; text-decoration:none; background:rgba(14,165,233,0.1); padding:4px 10px; border-radius:6px;">
                                    <i data-icon="image" style="width:14px; height:14px;"></i> View Attachment Image
                                </a>
                            </div>
                        ` : ''}
                        <div class="issue-time" style="font-size:11px; color:#94a3b8; margin-top:4px;">${relativeTime(issue.createdAt)}</div>
                    </div>
                </div>
                <div class="issue-status" style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:8px;">
                        <span class="status-pill ${['High', 'Critical'].includes(issue.priority) ? 'pill-high' : 'pill-review'}" style="font-weight:600; padding:2px 8px; border-radius:4px; font-size:11px;">${escapeHTML(issue.priority)} Priority</span>
                        <span class="status-pill pill-review" style="background:${issue.status === 'Resolved' ? '#ecfdf5' : '#f0fdf4'}; color:${issue.status === 'Resolved' ? '#047857' : '#166534'}; font-weight:600; padding:2px 8px; border-radius:4px; font-size:11px;">${escapeHTML(issue.status || 'Open')}</span>
                    </div>
                    ${issue.status !== 'Resolved' ? `
                        <button class="btn-resolve-vendor-issue" data-issue-id="${issue.id}" style="background:#10b981; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                            <i data-icon="checkcircle" style="width:14px; height:14px;"></i> Resolve & Update Support
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('') || `<div class="issue-card" style="color:#64748b; padding:16px; text-align:center;">No issues reported yet.</div>`;

        container.querySelectorAll('.btn-resolve-vendor-issue').forEach(btn => {
            btn.addEventListener('click', () => {
                const issueId = btn.dataset.issueId;
                const resolution = prompt(`Enter resolution notes for issue ${issueId} to notify Support Executive:`);
                if (resolution !== null && resolution.trim() !== '') {
                    resolveIssue(issueId, resolution.trim());
                    saveState(loadState(), true, true);
                    persistStateToBackend(loadState(), true);
                    notify(`Resolution sent to Support for issue ${issueId}!`, 'success');
                    renderAll();
                }
            });
        });

        iconRefresh(container);
    }

    function renderSupportIssues(state) {
        if (currentPage() !== 'reported_issues.html') return;
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;

        // Filter issues: show all reported issues across the platform for support
        const issues = (state.issues || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        tbody.innerHTML = issues.map((issue) => {
            const photoUrl = getIssuePhotoUrl(issue);
            return `
            <tr>
                <td>${escapeHTML(issue.id)}</td>
                <td><div>${escapeHTML(issue.reportedBy)}</div><div>${escapeHTML(issue.reporterRole)}</div></td>
                <td>
                    <div style="font-weight:700; color:var(--text-primary, #0f172a);"><i data-icon="alert"></i> ${escapeHTML(issue.title)}</div>
                    ${issue.description ? `<div style="font-size:12px; color:#64748b; margin-top:2px;">${escapeHTML(issue.description)}</div>` : ''}
                    ${photoUrl ? `
                        <div style="margin-top:8px; display:flex; align-items:center; gap:10px; background:rgba(14,165,233,0.06); padding:8px 12px; border-radius:8px; border:1px solid rgba(14,165,233,0.2);">
                            <img src="${escapeHTML(photoUrl)}" alt="Uploaded Photo" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer; flex-shrink:0; background:#fff;" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')" />
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:12px; font-weight:700; color:#0f172a;">📷 Attached Photo / Screenshot</span>
                                <button type="button" style="background:#0ea5e9; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; width:fit-content;" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')">
                                    <i data-icon="eye" style="width:12px; height:12px;"></i> View Full Photo
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </td>
                <td>${escapeHTML(issue.tripId || '-')}</td>
                <td>${renderBadge(issue.priority)}</td>
                <td>${renderBadge(issue.status)}</td>
                <td>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                        ${photoUrl ? `<button type="button" class="action-btn" style="background:#0284c7; color:#fff; border:none;" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')"><i data-icon="image"></i> Photo</button>` : ''}
                        <button class="action-btn btn-view" data-dd-action="resolve-issue" data-issue-id="${issue.id}"><i data-icon="checkcircle"></i> Resolve</button>
                    </div>
                </td>
            </tr>
        `;}).join('') || `<tr><td colspan="7" style="padding:24px;text-align:center;">No reported issues yet.</td></tr>`;
        const cards = document.querySelectorAll('.info-card > div:last-child');
        if (cards[0]) cards[0].textContent = issues.length;
        if (cards[1]) cards[1].textContent = issues.filter((issue) => issue.status === 'Open').length;
        if (cards[2]) cards[2].textContent = issues.filter((issue) => issue.status === 'In Progress').length;
        if (cards[3]) cards[3].textContent = issues.filter((issue) => ['High', 'Critical', 'high', 'critical'].includes(issue.priority)).length;
        iconRefresh(document.querySelector('.dashboard-container'));
    }

    function renderSupportIssueLog(state) {
        if (currentPage() !== 'issue_log.html') return;
        const heading = Array.from(document.querySelectorAll('h2')).find((node) => /Recently Logged Issues/i.test(node.textContent || ''));
        const panel = heading?.parentElement;
        if (!panel) return;

        // Filter issues: show all reported issues across the platform for support
        const issues = (state.issues || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        panel.innerHTML = `<h2>Recently Logged Issues</h2>` + (issues.slice(0, 6).map((issue) => {
            const photoUrl = getIssuePhotoUrl(issue);
            return `
            <div class="recent-issue">
                <div style="flex:1;">
                    <div style="font-weight:800; font-size:14px; color:#0f172a;">${escapeHTML(issue.id)}</div>
                    <div style="font-weight:700; font-size:15px; color:#0f172a; margin-top:2px;">${escapeHTML(issue.title)}</div>
                    <div style="font-size:13px; color:#64748b; margin-top:2px;">Trip: ${escapeHTML(issue.tripId || '-')} - Reported by ${escapeHTML(issue.reporterRole || 'Member')} (${escapeHTML(issue.reportedBy || '')})</div>
                    ${issue.description ? `<div style="font-size:12px; color:#475569; margin-top:4px;">${escapeHTML(issue.description)}</div>` : ''}
                    ${photoUrl ? `
                        <div style="margin-top:8px; display:flex; align-items:center; gap:10px; background:#f0f9ff; padding:8px 12px; border-radius:8px; border:1px solid #bae6fd;">
                            <img src="${escapeHTML(photoUrl)}" alt="Uploaded Photo" style="width:44px; height:44px; object-fit:cover; border-radius:6px; border:1px solid #93c5fd; cursor:pointer; flex-shrink:0; background:#fff;" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')" />
                            <a href="#" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}'); return false;" style="font-size:12px; color:#0284c7; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                                📷 View Attached Photo ↗
                            </a>
                        </div>
                    ` : ''}
                </div>
                <div>
                    ${renderBadge(issue.priority)}
                    <div>${relativeTime(issue.createdAt)}</div>
                </div>
            </div>
        `;}).join('') || `<div class="recent-issue"><div><div>No issues logged yet.</div><div>Submitted report forms will appear here.</div></div></div>`);
        iconRefresh(panel);
    }

    function renderResolutionUpdates(state) {
        if (currentPage() !== 'resolution_updates.html') return;

        // Filter issues: show all pending (unresolved) issues across the platform for support
        const pending = (state.issues || []).filter((issue) => issue.status !== 'Resolved');

        const firstPending = document.querySelector('.pending-item');
        const parent = firstPending?.parentElement;
        if (!parent) return;
        parent.innerHTML = `<div><h2>Pending Resolution Confirmations</h2></div>` + (pending.map((issue) => {
            const photoUrl = getIssuePhotoUrl(issue);
            return `
            <div class="pending-item">
                <div><div><div>${escapeHTML(issue.id)} <span class="badge-yellow">Pending Confirmation</span></div><div>Trip: <span>${escapeHTML(issue.tripId || '-')}</span></div></div></div>
                <div class="res-notes">
                    <div class="res-notes-label">${escapeHTML(issue.title)}</div>
                    <div>${escapeHTML(issue.description)}</div>
                    ${photoUrl ? `
                        <div style="margin-top:10px; display:flex; align-items:center; gap:10px; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                            <img src="${escapeHTML(photoUrl)}" alt="Uploaded Photo" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer; flex-shrink:0; background:#fff;" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')" />
                            <button type="button" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')" style="background:#0ea5e9; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="image"></i> View Attached Photo
                            </button>
                        </div>
                    ` : ''}
                </div>
                <button class="btn-teal-full" data-dd-action="resolve-issue" data-issue-id="${issue.id}"><i data-icon="checkcircle"></i> Confirm Resolution</button>
            </div>
        `;}).join('') || `<div class="pending-item">No pending issues to resolve.</div>`);
        iconRefresh(parent);
    }


    let activeTravelerMyTripsFilter = 'all';

    function renderTravelerMyTrips(state) {
        if (currentPage() !== 'traveler_mytrips.html') return;
        const grid = document.querySelector('.trips-grid');
        if (!grid) return;

        // Attach tab listeners if not already attached
        const filterPills = document.querySelectorAll('.filter-tabs .filter-pill');
        filterPills.forEach((pill) => {
            const filterValue = (pill.dataset.filter || pill.textContent.trim().toLowerCase().replace(' trips', '')).trim();
            pill.dataset.filter = filterValue;
            if (filterValue === activeTravelerMyTripsFilter) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
            if (!pill.dataset.filterBound) {
                pill.dataset.filterBound = 'true';
                pill.addEventListener('click', (e) => {
                    e.preventDefault();
                    activeTravelerMyTripsFilter = pill.dataset.filter || 'all';
                    renderTravelerMyTrips(state);
                });
            }
        });

        const allUserTrips = tripsForCurrentUser(allActiveTrips(state)).slice().sort((a, b) => {
            const order = { requested: 0, planning: 1, ready: 2, ongoing: 3, completed: 4 };
            return (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(b.updatedAt) - new Date(a.updatedAt);
        });

        const filteredTrips = allUserTrips.filter((trip) => {
            if (activeTravelerMyTripsFilter === 'all') return true;
            if (activeTravelerMyTripsFilter === 'requested') return trip.status === 'requested';
            if (activeTravelerMyTripsFilter === 'ongoing') return trip.status === 'ongoing';
            if (activeTravelerMyTripsFilter === 'upcoming') return ['planning', 'ready', 'upcoming'].includes(trip.status);
            if (activeTravelerMyTripsFilter === 'completed') return trip.status === 'completed';
            return true;
        });

        if (!filteredTrips.length) {
            grid.innerHTML = `
                <div class="card" style="grid-column: 1 / -1; padding: 36px 20px; text-align: center; border-radius: 16px;">
                    <div style="font-size: 32px; margin-bottom: 12px;"><i data-icon="plane"></i></div>
                    <div style="font-size: 16px; font-weight: 700; color: var(--text-primary, #0f172a); margin-bottom: 6px;">No ${activeTravelerMyTripsFilter === 'all' ? '' : activeTravelerMyTripsFilter + ' '}trips found</div>
                    <div style="font-size: 13px; color: var(--text-secondary, #64748b); margin-bottom: 16px;">${activeTravelerMyTripsFilter === 'all' ? 'Create a new trip request to start your travel adventure.' : 'No trips currently in this stage.'}</div>
                    ${activeTravelerMyTripsFilter === 'all' ? `<button class="t-btn t-btn-primary" style="margin: 0 auto; max-width: 220px;" data-dd-action="route" data-dd-target="traveler_create_trip_plan.html"><i data-icon="plus"></i> Create Trip Plan</button>` : ''}
                </div>
            `;
            iconRefresh(grid);
            return;
        }

        grid.innerHTML = filteredTrips.map((trip) => {
            let progressPct = Number(trip.progress) || 0;
            if (trip.status === 'completed') progressPct = 100;
            else if (trip.status === 'ongoing') progressPct = progressPct || 65;
            else if (trip.status === 'ready') progressPct = Math.max(50, progressPct);
            else if (trip.status === 'planning') progressPct = Math.max(25, progressPct);
            else if (trip.status === 'requested') progressPct = 10;

            const iconClass = trip.status === 'ongoing' ? 'green' : trip.status === 'completed' ? 'gray' : 'blue';
            const iconName = trip.status === 'completed' ? 'checkcircle' : trip.status === 'ongoing' ? 'plane' : 'plane';

            let statusBadgeHTML = '';
            if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') {
                statusBadgeHTML = `<span class="badge-pill" style="background:#fee2e2;color:#991b1b;font-weight:600;font-size:12px;padding:4px 12px;border-radius:20px;">Cancellation Pending</span>`;
            } else if (trip.status === 'requested') {
                statusBadgeHTML = `<span class="badge-pill" style="background:#fef3c7;color:#b45309;font-weight:600;font-size:12px;padding:4px 12px;border-radius:20px;">Requested</span>`;
            } else if (trip.status === 'ongoing') {
                statusBadgeHTML = `<span class="badge-pill badge-ongoing">Ongoing</span><span style="font-weight:700;font-size:13px;color:var(--text-secondary,#64748b);">${progressPct}%</span>`;
            } else if (trip.status === 'completed') {
                statusBadgeHTML = `<span class="badge-pill badge-completed">Completed</span><span style="font-weight:700;font-size:13px;color:var(--text-secondary,#64748b);">100%</span>`;
            } else if (trip.status === 'ready') {
                statusBadgeHTML = `<span class="badge-pill badge-upcoming">Ready</span><span style="font-weight:700;font-size:13px;color:var(--text-secondary,#64748b);">${progressPct}%</span>`;
            } else {
                statusBadgeHTML = `<span class="badge-pill badge-upcoming">Planning</span><span style="font-weight:700;font-size:13px;color:var(--text-secondary,#64748b);">${progressPct}%</span>`;
            }

            let helperNoteHTML = '';
            if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') {
                helperNoteHTML = `<div style="font-size:12px;color:#dc2626;display:flex;align-items:center;gap:6px;"><i data-icon="alert"></i> Cancellation request submitted • Awaiting Travel Partner approval</div>`;
            } else if (trip.status === 'requested') {
                helperNoteHTML = `<div style="font-size:12px;color:var(--text-secondary,#94a3b8);display:flex;align-items:center;gap:6px;"><i data-icon="clock"></i> Waiting for travel partner approval</div>`;
            } else if (trip.status === 'planning') {
                helperNoteHTML = `<div style="font-size:12px;color:var(--text-secondary,#94a3b8);display:flex;align-items:center;gap:6px;"><i data-icon="clock"></i> Schedule is being prepared, please be patient</div>`;
            } else if (trip.status === 'ready' || (trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted')) {
                if (trip.paymentStatus === 'Paid') {
                    helperNoteHTML = `<div style="font-size:12px;color:#10b981;font-weight:700;display:flex;align-items:center;gap:6px;"><i data-icon="checkcircle"></i> Payment Completed • Ready for departure</div>`;
                } else {
                    helperNoteHTML = `<div style="font-size:12px;color:#d97706;font-weight:700;display:flex;align-items:center;gap:6px;"><i data-icon="creditcard"></i> Guide & Vendor confirmed • Payment Required before trip starts</div>`;
                }
            } else if (trip.status === 'ongoing') {
                helperNoteHTML = `<div style="font-size:12px;color:var(--text-secondary,#94a3b8);display:flex;align-items:center;gap:6px;"><i data-icon="activity"></i> Active tour underway (${escapeHTML(trip.currentLocation || trip.destination)})</div>`;
            } else if (trip.status === 'completed') {
                helperNoteHTML = `<div style="font-size:12px;color:var(--text-secondary,#94a3b8);display:flex;align-items:center;gap:6px;"><i data-icon="checkcircle"></i> Completed Progress - 100%</div>`;
            }

            let progressBarHTML = '';
            if (trip.status !== 'requested') {
                progressBarHTML = `<div class="t-progress" style="margin-bottom:16px;"><div class="t-progress-bar" style="width:${Math.min(100, progressPct)}%;"></div></div>`;
            }

            const isPendingCancel = trip.cancellationRequested && trip.cancellationStatus === 'Pending';
            const cancelBtnHTML = isPendingCancel
                ? `<button class="t-btn t-btn-outline-yellow" style="flex:1;opacity:0.75;cursor:not-allowed;" disabled title="Cancellation request has been sent to Travel Partner"><i data-icon="clock"></i> Pending Approval</button>`
                : `<button class="t-btn t-btn-outline-yellow" style="flex:1;" data-dd-action="cancel-trip" data-trip-id="${trip.id}"><i data-icon="x"></i> Cancel</button>`;

            let actionsHTML = '';
            if (trip.status === 'requested') {
                actionsHTML = `
                    <div class="t-actions">
                        ${helperNoteHTML}
                        ${isPendingCancel
                        ? `<button class="t-btn t-btn-outline-yellow" style="opacity:0.75;cursor:not-allowed;" disabled><i data-icon="clock"></i> Cancellation Pending</button>`
                        : `<button class="t-btn t-btn-outline-yellow" data-dd-action="cancel-trip" data-trip-id="${trip.id}"><i data-icon="x"></i> Cancel Request</button>`
                    }
                        <button class="t-btn t-btn-outline-purple" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Message Partner</button>
                    </div>
                `;
            } else if (['planning', 'ready'].includes(trip.status)) {
                const needsPayment = trip.paymentStatus !== 'Paid' && trip.status !== 'cancelled' && trip.status !== 'completed';
                const canCardStart = trip.paymentStatus === 'Paid' && !trip.scheduleStarted && trip.status !== 'ongoing' && trip.status !== 'completed';
                actionsHTML = `
                    <div class="t-actions">
                        ${helperNoteHTML}
                        ${needsPayment ? `
                            <button class="t-btn t-btn-primary" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:800;box-shadow:0 6px 16px rgba(16,185,129,0.3);" data-dd-action="open-payment-modal" data-trip-id="${escapeHTML(trip.id)}" onclick="window.openPaymentModal('${escapeHTML(trip.id)}')">
                                <i data-icon="creditcard"></i> Complete Payment (${formatMoney(trip.budget || 1200)})
                            </button>
                        ` : ''}
                        ${canCardStart ? `
                            <div class="meta-chip blue" style="padding:6px 12px;font-size:0.78rem;font-weight:700;">
                                <i data-icon="clock" style="width:14px;height:14px;"></i> Paid • Awaiting Partner to Start
                            </div>
                        ` : ''}
                        <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="traveler_trip_details.html">View Details <i data-icon="arrowright"></i></button>
                        <div style="display:flex;gap:8px;">
                            <button class="t-btn t-btn-outline-blue" style="flex:1;" data-dd-action="route" data-dd-target="traveler_edit_trip_upcoming.html"><i data-icon="edit"></i> Edit</button>
                            ${cancelBtnHTML}
                        </div>
                        <button class="t-btn t-btn-outline-purple" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Contact Partner</button>
                    </div>
                `;
            } else if (trip.status === 'ongoing') {
                actionsHTML = `
                    <div class="t-actions">
                        ${helperNoteHTML}
                        <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="traveler_trip_details.html">View Details <i data-icon="arrowright"></i></button>
                        <div style="display:flex;gap:8px;">
                            <button class="t-btn t-btn-outline-blue" style="flex:1;" data-dd-action="route" data-dd-target="traveler_schedule.html"><i data-icon="calendar"></i> Schedule</button>
                            <button class="t-btn t-btn-outline-purple" style="flex:1;" data-dd-action="route" data-dd-target="traveler_progress.html"><i data-icon="activity"></i> Progress</button>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="t-btn t-btn-outline-blue" style="flex:1;" data-dd-action="route" data-dd-target="traveler_edit_trip_ongoing.html"><i data-icon="edit"></i> Edit</button>
                            ${cancelBtnHTML}
                        </div>
                        <button class="t-btn t-btn-outline-purple" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Contact Partner</button>
                    </div>
                `;
            } else if (trip.status === 'completed') {
                actionsHTML = `
                    <div class="t-actions">
                        ${helperNoteHTML}
                        <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="traveler_trip_details.html"><i data-icon="checkcircle"></i> Trip Summary</button>
                        <div style="display:flex;gap:8px;">
                            <button class="t-btn t-btn-outline-blue" style="flex:1;" data-dd-action="route" data-dd-target="traveler_schedule.html"><i data-icon="calendar"></i> View Schedule</button>
                            <button class="t-btn t-btn-outline-purple" style="flex:1;" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Message</button>
                        </div>
                    </div>
                `;
            } else {
                actionsHTML = `
                    <div class="t-actions">
                        ${helperNoteHTML}
                        <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="traveler_trip_details.html">View Details <i data-icon="arrowright"></i></button>
                        <button class="t-btn t-btn-outline-purple" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Contact Partner</button>
                    </div>
                `;
            }

            return `
                <div class="trip-card ${trip.status === 'requested' ? 'requested' : trip.status === 'completed' ? 'completed' : ''}" style="${trip.status === 'completed' ? 'border-left: 4px solid #22c55e; opacity: 0.88;' : trip.status === 'cancelled' ? 'border-left: 4px solid #ef4444; opacity: 0.7;' : ''}">
                    <div class="trip-card-header">
                        <div class="t-icon ${iconClass}"><i data-icon="${iconName}"></i></div>
                        <div>
                            <div class="t-title">${escapeHTML(trip.title)}</div>
                            <div class="t-id">${escapeHTML(trip.id)}</div>
                        </div>
                    </div>
                    <div class="t-info">
                        <div class="t-info-row"><i data-icon="mappin"></i> ${escapeHTML(trip.destination)}</div>
                        <div class="t-info-row"><i data-icon="calendar"></i> ${escapeHTML(formatDateRange(trip))}</div>
                        <div class="t-info-row"><i data-icon="users"></i> ${trip.travelersCount} traveler${trip.travelersCount === 1 ? '' : 's'}</div>
                        <div class="t-info-row"><i data-icon="user"></i> Guide: ${escapeHTML(trip.guide?.name || 'Pending')} ${trip.guideStatus ? `(${escapeHTML(trip.status === 'completed' ? 'Completed' : trip.guideStatus)})` : ''}</div>
                        <div class="t-info-row"><i data-icon="truck"></i> Vendor: ${escapeHTML(trip.vendor?.name || 'Pending')} ${trip.vendorStatus ? `(${escapeHTML(trip.status === 'completed' ? 'Completed' : trip.vendorStatus)})` : ''}</div>
                    </div>
                    <div class="t-status-row">${statusBadgeHTML}</div>
                    ${progressBarHTML}
                    ${actionsHTML}
                </div>
            `;
        }).join('');

        iconRefresh(grid);
    }

    function defaultAccountEmails() {
        return ['superadmin@gmail.com', 'traveler@gmail.com', 'partner@gmail.com', 'vendor@gmail.com', 'guide@gmail.com', 'support@gmail.com'];
    }

    function realUsers(state) {
        return (state.users || []).filter((user) => !defaultAccountEmails().includes(String(user.email || '').toLowerCase()));
    }

    function tripRevenue(trips) {
        return (trips || []).reduce((sum, trip) => {
            if (!trip) return sum;
            const isCancelled = trip.status === 'cancelled';
            const ref = trip.refundRecord;
            const isRefunded = ref && ref.processed;

            if (isCancelled) {
                if (isRefunded) {
                    const feeAmt = Number(ref.cancellationFeeAmount !== undefined ? ref.cancellationFeeAmount : ((Number(trip.budget || 0) * (ref.cancellationFeePercent || 0)) / 100));
                    return sum + (isNaN(feeAmt) ? 0 : feeAmt);
                }
                return sum;
            }

            if (typeof isTripPaid === 'function' && !isTripPaid(trip)) {
                return sum;
            }

            return sum + Number(trip.budget || trip.totalAmount || trip.paidAmount || 0);
        }, 0);
    }

    function getSelectedCurrency() {
        try {
            return 'INR'; // Platform currency is locked to INR
        } catch (_) {
            return 'INR';
        }
    }

    function setSelectedCurrency(curr) {
        try {
            localStorage.setItem('dd_currency', curr);
        } catch (_) { }
    }

    function getCurrencySymbol(curr) {
        const c = curr || getSelectedCurrency();
        return c === 'USD' ? '$' : '₹';
    }

    function formatMoney(value, overrideCurr) {
        const num = Number(value || 0);
        const curr = overrideCurr || getSelectedCurrency();
        const symbol = getCurrencySymbol(curr);

        if (curr === 'INR') {
            if (num >= 10000000) return `${symbol}${(num / 10000000).toFixed(1)}Cr`;
            if (num >= 100000) return `${symbol}${(num / 100000).toFixed(1)}L`;
            return `${symbol}${num.toLocaleString('en-IN')}`;
        } else {
            if (num >= 100000) return `${symbol}${Math.round(num / 1000)}K`;
            return `${symbol}${num.toLocaleString('en-US')}`;
        }
    }

    window.getSelectedCurrency = getSelectedCurrency;
    window.setSelectedCurrency = setSelectedCurrency;
    window.getCurrencySymbol = getCurrencySymbol;
    window.formatMoney = formatMoney;

    function emptyPanel(message) {
        return `<div style="padding:24px;color:var(--text-secondary, #94a3b8);text-align:center;">${escapeHTML(message)}</div>`;
    }

    function nextDirectoryId(prefix, items) {
        const max = (items || []).reduce((value, item) => {
            const number = Number(String(item.id || '').replace(/\D/g, ''));
            return Number.isFinite(number) ? Math.max(value, number) : value;
        }, 0);
        return `${prefix}-${max + 1}`;
    }

    function activeUsersByRole(state, roleLabel) {
        const target = String(roleLabel || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        return (state.users || []).filter((user) => {
            const userRole = String(user.role || '').trim().toLowerCase().replace(/[^a-z]/g, '');
            const status = String(user.status || 'Active').trim().toLowerCase();
            const match = userRole === target ||
                (target.includes('guide') && userRole.includes('guide')) ||
                (target.includes('vendor') && userRole.includes('vendor'));
            return match && status === 'active';
        });
    }

    function assignableGuides(state) {
        const byKey = new Map();
        const fakeEmails = ['guide@gmail.com'];
        activeUsersByRole(state, 'Tour Guide').forEach((user) => {
            if (fakeEmails.includes(String(user.email || '').toLowerCase())) return;
            const profile = user.profile || {};
            const nameKey = user.name ? String(user.name).trim().toLowerCase() : '';
            const emailKey = user.email ? String(user.email).trim().toLowerCase() : '';
            const idKey = user.id ? String(user.id).trim().toLowerCase() : '';
            const mainKey = emailKey || nameKey || idKey;
            
            const entry = {
                id: user.id,
                name: user.name || user.email || 'Tour Guide',
                initials: initialsFor(user.name || user.email || 'Tour Guide'),
                languages: user.languages || profile.languages || profile.preferredLanguage || 'English, Local Languages',
                experience: user.experience || profile.experience || (profile.experienceYears ? `${profile.experienceYears} years` : 'Certified Guide'),
                rating: Number(user.rating || profile.rating || 4.9),
                tours: Number(user.tours || profile.tours || 0),
                status: user.availabilityStatus || profile.availabilityStatus || user.availability || 'Available',
                email: user.email,
                phone: user.phone || '',
            };
            byKey.set(mainKey, entry);
            if (nameKey) byKey.set(nameKey, entry);
            if (emailKey) byKey.set(emailKey, entry);
            if (idKey) byKey.set(idKey, entry);
        });

        if (Array.isArray(state.guides)) {
            state.guides.forEach((g) => {
                const nameKey = g.name ? String(g.name).trim().toLowerCase() : '';
                const emailKey = g.email ? String(g.email).trim().toLowerCase() : '';
                const idKey = g.id ? String(g.id).trim().toLowerCase() : '';
                const existing = (emailKey && byKey.get(emailKey)) || (nameKey && byKey.get(nameKey)) || (idKey && byKey.get(idKey));
                const gStatus = g.availabilityStatus || (g.status && g.status.toLowerCase() !== 'active' ? g.status : null);

                if (existing) {
                    if (gStatus) existing.status = gStatus;
                    if (g.languages && existing.languages === 'English, Local Languages') existing.languages = g.languages;
                    if (g.experience && existing.experience === 'Certified Guide') existing.experience = g.experience;
                    if (g.tours) existing.tours = Number(g.tours);
                    if (g.rating) existing.rating = Number(g.rating);
                }
            });
        }
        return Array.from(new Set(byKey.values())).sort((a, b) => a.name.localeCompare(b.name));
    }

    function assignableVendors(state) {
        const byKey = new Map();
        const fakeEmails = ['vendor@gmail.com'];
        activeUsersByRole(state, 'Vendor').forEach((user) => {
            if (fakeEmails.includes(String(user.email || '').toLowerCase())) return;
            const profile = user.profile || {};
            const nameKey = user.name ? String(user.name).trim().toLowerCase() : '';
            const emailKey = user.email ? String(user.email).trim().toLowerCase() : '';
            const idKey = user.id ? String(user.id).trim().toLowerCase() : '';
            const mainKey = emailKey || nameKey || idKey;

            const entry = {
                id: user.id,
                name: user.name || user.email || 'Vendor',
                initials: initialsFor(user.name || user.email || 'Vendor'),
                type: user.serviceType || user.type || profile.serviceType || profile.vendorType || 'Travel Services',
                location: user.location || user.address || profile.location || profile.address || 'Destination Partner',
                rating: Number(user.rating || profile.rating || 4.8),
                trips: Number(user.trips || profile.trips || 0),
                status: user.availabilityStatus || profile.availabilityStatus || user.availability || 'Available',
                email: user.email,
                phone: user.phone || '',
            };
            byKey.set(mainKey, entry);
            if (nameKey) byKey.set(nameKey, entry);
            if (emailKey) byKey.set(emailKey, entry);
            if (idKey) byKey.set(idKey, entry);
        });

        if (Array.isArray(state.vendors)) {
            state.vendors.forEach((v) => {
                const nameKey = v.name ? String(v.name).trim().toLowerCase() : '';
                const emailKey = v.email ? String(v.email).trim().toLowerCase() : '';
                const idKey = v.id ? String(v.id).trim().toLowerCase() : '';
                const existing = (emailKey && byKey.get(emailKey)) || (nameKey && byKey.get(nameKey)) || (idKey && byKey.get(idKey));
                const vStatus = v.availabilityStatus || (v.status && v.status.toLowerCase() !== 'active' ? v.status : null);

                if (existing) {
                    if (vStatus) existing.status = vStatus;
                    if (v.type && existing.type === 'Travel Services') existing.type = v.type;
                    if (v.location && existing.location === 'Destination Partner') existing.location = v.location;
                    if (v.trips) existing.trips = Number(v.trips);
                    if (v.rating) existing.rating = Number(v.rating);
                }
            });
        }
        return Array.from(new Set(byKey.values())).sort((a, b) => a.name.localeCompare(b.name));
    }
    function addGuideFromPrompt() {
        const name = (window.prompt('Guide name') || '').trim();
        if (!name) return null;
        const languages = (window.prompt('Languages', 'English') || 'English').trim();
        const experience = (window.prompt('Experience', '1 year') || '1 year').trim();
        const state = loadState();
        state.guides = Array.isArray(state.guides) ? state.guides : [];
        const guide = {
            id: nextDirectoryId('GUIDE', state.guides),
            name,
            initials: initialsFor(name),
            languages,
            experience,
            rating: 0,
            tours: 0,
            status: 'Available',
        };
        state.guides.push(guide);
        saveState(state);
        notify(`${name} added as a tour guide.`, 'success');
        renderAll();
        return guide;
    }

    function addVendorFromPrompt() {
        const name = (window.prompt('Vendor name') || '').trim();
        if (!name) return null;
        const type = (window.prompt('Service type', 'Transport') || 'Service').trim();
        const location = (window.prompt('Location', 'Available on request') || 'Available on request').trim();
        const state = loadState();
        state.vendors = Array.isArray(state.vendors) ? state.vendors : [];
        const vendor = {
            id: nextDirectoryId('VENDOR', state.vendors),
            name,
            type,
            location,
            rating: 0,
            trips: 0,
            status: 'Available',
        };
        state.vendors.push(vendor);
        saveState(state);
        notify(`${name} added as a vendor.`, 'success');
        renderAll();
        return vendor;
    }

    function removeDirectoryRecord(kind, id) {
        const state = loadState();
        const collection = kind === 'guide' ? state.guides : state.vendors;
        const label = kind === 'guide' ? 'guide' : 'vendor';
        const record = (collection || []).find((item) => item.id === id);
        if (!record) return;
        const assigned = (state.trips || []).some((trip) => kind === 'guide'
            ? trip.guide?.id === id || trip.guide?.name === record.name
            : trip.vendor?.id === id || trip.vendor?.name === record.name);
        if (assigned) {
            notify(`Cannot remove ${record.name}; this ${label} is assigned to a trip.`, 'warning');
            return;
        }
        if (kind === 'guide') state.guides = state.guides.filter((item) => item.id !== id);
        else state.vendors = state.vendors.filter((item) => item.id !== id);
        saveState(state);
        notify(`${record.name} removed.`, 'success');
        renderAll();
    }

    function renderTravelerDashboard(state) {
        if (currentPage() !== 'traveler_dashboard.html') return;
        const trips = tripsForCurrentUser(allActiveTrips(state));
        const ongoingTrips = trips.filter((trip) => trip.status === 'ongoing');
        const upcomingTrips = trips.filter((trip) => ['requested', 'planning', 'ready'].includes(trip.status));
        const alerts = notificationsForRole(state, 'traveler');
        const userTripIds = new Set(trips.map(t => t.id));
        const messages = (state.messages || []).filter((message) =>
            userTripIds.has(message.tripId) && (message.toRoles?.includes('all') || message.toRoles?.includes('traveler') || message.fromRole === 'traveler')
        );

        const unreadAlerts = alerts.filter(a => !(a.readBy || []).includes('traveler')).length;
        const unreadMessages = messages.filter(m => !(m.readBy || []).includes('traveler')).length;

        document.querySelectorAll('.stats-grid .stat-value').forEach((node, index) => {
            const values = [upcomingTrips.length, ongoingTrips.length, unreadAlerts, unreadMessages];
            node.textContent = values[index] ?? 0;
        });

        const currentTrip = ongoingTrips[0] || trips.find((trip) => trip.status === 'ready') || trips.find((trip) => trip.status === 'planning') || trips.find((trip) => trip.status === 'requested') || trips[0] || null;
        const currentCard = document.querySelector('.bottom-grid > div:first-child .card');
        if (currentCard) {
            if (!currentTrip) {
                currentCard.innerHTML = emptyPanel('No current trip yet. Create or request a trip to begin.');
            } else {
                const stats = scheduleStats(currentTrip);
                let progressPct = currentTrip.status === 'completed' ? 100 : (currentTrip.status === 'ongoing' || currentTrip.scheduleStarted ? (50 + Math.round(stats.percent * 0.5)) : (currentTrip.status === 'ready' ? 50 : (currentTrip.status === 'planning' ? 25 : 10)));

                const needsDashPayment = currentTrip.paymentStatus !== 'Paid' && currentTrip.status !== 'cancelled' && currentTrip.status !== 'completed';
                const canDashStart = currentTrip.paymentStatus === 'Paid' && !currentTrip.scheduleStarted && currentTrip.status !== 'ongoing' && currentTrip.status !== 'completed';
                currentCard.innerHTML = `
                    <div class="current-trip-header">
                        <div class="trip-info"><div class="trip-icon"><i data-icon="plane"></i></div><div><div class="trip-title">${escapeHTML(currentTrip.title)}</div><div class="trip-id">Trip ID: ${escapeHTML(currentTrip.id)}</div></div></div>
                        <div class="status-badge">${escapeHTML(statusLabel(currentTrip))}</div>
                    </div>
                    <div class="trip-meta-grid"><div class="meta-item"><i data-icon="mappin"></i> ${escapeHTML(currentTrip.destination)}</div><div class="meta-item"><i data-icon="calendar"></i> ${escapeHTML(formatDateRange(currentTrip))}</div></div>
                    <div class="progress-section"><div class="progress-header"><span>Trip Progress</span><span>${progressPct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, progressPct)}%;"></div></div></div>
                    <div class="actions-row">
                        ${needsDashPayment ? `<button class="t-btn t-btn-primary" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:800;" data-dd-action="open-payment-modal" data-trip-id="${escapeHTML(currentTrip.id)}" onclick="window.openPaymentModal('${escapeHTML(currentTrip.id)}')"><i data-icon="creditcard"></i> Pay Now (${formatMoney(currentTrip.budget || 1200)})</button>` : ''}
                        ${canDashStart ? `<span class="meta-chip blue" style="padding:6px 12px;font-weight:700;"><i data-icon="clock" style="width:14px;height:14px;"></i> Paid • Awaiting Partner to Start</span>` : ''}
                        <button class="t-btn t-btn-primary" data-dd-action="route" data-dd-target="traveler_trip_details.html">View Details <i data-icon="arrowright"></i></button>
                        <button class="t-btn t-btn-outline-purple" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Message Members</button>
                    </div>
                `;
            }
        }

        const scheduleCard = document.querySelector('.schedule-card');
        if (scheduleCard) {
            const schedule = currentTrip?.scheduleStarted ? ensureTripSchedule(currentTrip) : [];
            scheduleCard.innerHTML = schedule.length ? `
                <div class="timeline">
                    ${schedule.slice(0, 4).map((item) => `
                        <div class="timeline-item ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'active' : 'upcoming'}">
                            <div class="timeline-icon"><i data-icon="${item.status === 'completed' ? 'check' : item.status === 'in-progress' ? 'clock' : 'calendar'}"></i></div>
                            <div class="schedule-details"><div class="schedule-title">${escapeHTML(item.title)}</div><div class="schedule-time">${scheduleStatusText(item.status)} - ${escapeHTML(item.time)}</div><div class="schedule-person">${scheduleOwnerLabel(item.owner)}: ${escapeHTML(item.updatedBy || 'Pending')}</div></div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-full-schedule" data-dd-action="route" data-dd-target="traveler_schedule.html">View Full Schedule &rarr;</button>
            ` : emptyPanel('Schedule appears after the travel partner starts the trip.');
        }
        iconRefresh(document.querySelector('.dashboard-container'));
    }

    function renderGuideDashboard(state) {
        if (currentPage() !== 'dashboard.html' || !decodeURIComponent(window.location.pathname).includes('/guide/')) return;
        const page = document.getElementById('guide-dashboard');
        if (!page) return;
        const guideTrips = getGuideTrips(state);
        const pending = guideTrips.filter((trip) => trip.guideStatus === 'Assigned');
        const active = guideTrips.filter((trip) => ['Accepted', 'Completed'].includes(trip.guideStatus) && trip.status !== 'completed');
        const upcoming = guideTrips.filter((trip) => trip.guideStatus === 'Assigned' && trip.status !== 'completed');
        const completed = guideTrips.filter((trip) => trip.status === 'completed' || trip.guideStatus === 'Completed');
        page.querySelectorAll('.stat-number-premium').forEach((node, index) => {
            const values = [guideTrips.reduce((sum, trip) => sum + Number(trip.travelersCount || 1), 0), active.length, upcoming.length, completed.length];
            node.textContent = values[index] ?? 0;
        });
        // Update section header count badges dynamically
        const pendingHeader = page.querySelector('.card:first-child h2, .assignment-list-header');
        if (pendingHeader && !pendingHeader.querySelector('.header-count-badge')) {
            pendingHeader.innerHTML = `Pending Assignments <span class="header-count-badge amber" style="display: inline-flex; align-items: center; justify-content: center; background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.75rem; font-weight: 700; padding: 2px 10px; border-radius: 99px; margin-left: 8px;">${pending.length} Pending</span>`;
        } else if (pendingHeader) {
            const badge = pendingHeader.querySelector('.header-count-badge');
            if (badge) badge.textContent = `${pending.length} Pending`;
        }

        const assignmentList = page.querySelector('.assignment-list');
        if (assignmentList) {
            assignmentList.style.maxHeight = '520px';
            assignmentList.style.overflowY = 'auto';
            assignmentList.style.paddingRight = '4px';

            assignmentList.innerHTML = pending.map((trip) => `
                <div class="assignment-card-full" style="background: var(--bg-card-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-left: 4px solid #f59e0b; border-radius: 14px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.03); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div class="ac-content" style="padding: 18px 20px 14px 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; flex: 1; min-width: 0;">
                                <span style="font-size: 0.75rem; font-weight: 800; color: #0284c7; background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.25); padding: 3px 10px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; letter-spacing: 0.02em;">${trip.id}</span>
                                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(trip.title)}">${escapeHTML(trip.title)}</h3>
                            </div>
                            <span style="font-size: 0.75rem; font-weight: 700; color: #d97706; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 12px; border-radius: 99px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; display: inline-block; box-shadow: 0 0 6px rgba(245, 158, 11, 0.8);"></span>
                                Pending
                            </span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <div class="meta-chip blue">
                                <i data-icon="users" style="width: 14px; height: 14px;"></i>
                                <span>${trip.travelersCount || 1} people</span>
                            </div>
                            <div class="meta-chip purple">
                                <i data-icon="calendar" style="width: 14px; height: 14px;"></i>
                                <span>${escapeHTML(formatDateRange(trip))}</span>
                            </div>
                            ${trip.destination ? `
                            <div class="meta-chip red">
                                <i data-icon="mappin" style="width: 14px; height: 14px;"></i>
                                <span>${escapeHTML(trip.destination)}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    <div class="ac-actions" style="display: flex; gap: 10px; padding: 0 20px 16px 20px; background: transparent; width: 100%; box-sizing: border-box;">
                        <button class="btn-accept" data-dd-action="accept-guide" data-trip-id="${trip.id}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; font-size: 0.875rem; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); transition: all 0.2s ease;">
                            <i data-icon="checkcircle" style="width: 16px; height: 16px;"></i> Accept
                        </button>
                        <button class="btn-reject" data-dd-action="reject-guide" data-trip-id="${trip.id}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; font-size: 0.875rem; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25); transition: all 0.2s ease;">
                            <i data-icon="x" style="width: 16px; height: 16px;"></i> Reject
                        </button>
                    </div>
                </div>
            `).join('') || emptyPanel('No pending guide assignments.');
        }

        const activeList = page.querySelector('.active-tours-list');
        if (activeList) {
            activeList.style.maxHeight = '520px';
            activeList.style.overflowY = 'auto';
            activeList.style.paddingRight = '4px';

            activeList.innerHTML = active.map((trip) => `
                <div class="active-tour-card-full" style="background: var(--bg-card-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-left: 4px solid #10b981; border-radius: 14px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.03); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div class="at-content" style="padding: 18px 20px 14px 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; flex: 1; min-width: 0;">
                                <span style="font-size: 0.75rem; font-weight: 800; color: #0284c7; background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.25); padding: 3px 10px; border-radius: 6px; white-space: nowrap; flex-shrink: 0;">${trip.id}</span>
                                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(trip.title)}">${escapeHTML(trip.title)}</h3>
                            </div>
                            <span style="font-size: 0.75rem; font-weight: 700; color: #059669; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 99px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);"></span>
                                ${escapeHTML(statusLabel(trip))}
                            </span>
                        </div>
                        <div class="meta-chip red">
                            <i data-icon="mappin" style="width: 14px; height: 14px;"></i>
                            <span>Current: ${escapeHTML(trip.currentLocation || trip.destination)}</span>
                        </div>
                    </div>
                    <div class="at-actions" style="display: flex; gap: 10px; padding: 0 20px 16px 20px; background: transparent; width: 100%; box-sizing: border-box;">
                        <button class="btn-update-status" data-dd-action="route" data-dd-target="tour_updates.html" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; font-size: 0.875rem; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25); transition: all 0.2s ease;">
                            <i data-icon="edit" style="width: 16px; height: 16px;"></i> Update Status
                        </button>
                    </div>
                </div>
            `).join('') || emptyPanel('No active tours.');
        }
        const activity = page.querySelector('.card.p-6 .pl-2');
        if (activity) {
            const updates = guideTrips.flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            activity.innerHTML = updates.slice(0, 6).map((update) => `<div class="timeline-item"><div class="timeline-dot"></div><div><p class="text-sm font-medium text-gray-900">${escapeHTML(update.title)} - ${escapeHTML(update.trip.id)}</p><p class="text-xs text-gray-500">${relativeTime(update.createdAt)}</p></div></div>`).join('') || emptyPanel('No guide activity yet.');
        }
        iconRefresh(page);
    }

    function renderVendorDashboard(state) {
        if (currentPage() !== 'vendor_dashboard.html') return;
        const page = document.querySelector('.page-scroll');
        if (!page) return;
        const vendorTrips = getVendorTrips(state);
        const pending = vendorTrips.filter((trip) => ['Requested', 'Pending'].includes(trip.vendorStatus));
        const active = vendorTrips.filter((trip) => ['Accepted', 'In Progress', 'En Route'].includes(trip.vendorStatus) && trip.status !== 'completed');
        const completed = vendorTrips.filter((trip) => trip.status === 'completed' || trip.vendorStatus === 'Completed' || trip.serviceStatus === 'Completed');
        const vendorIssues = (state.issues || []).filter((issue) => vendorTrips.some((trip) => trip.id === issue.tripId) && issue.status !== 'Resolved');
        page.querySelectorAll('.stats-grid .stat-value').forEach((node, index) => {
            const values = [pending.length, active.length, completed.length, vendorIssues.length];
            node.textContent = values[index] ?? 0;
        });
        const lists = page.querySelectorAll('.vendor-list');
        if (lists[0]) {
            lists[0].innerHTML = pending.slice(0, 4).map((trip) => `<div class="vendor-list-item" data-dd-action="route" data-dd-target="vendor_service_requests.html" style="cursor:pointer"><div class="v-info"><div class="v-id">${trip.requestId || trip.id}</div><div class="v-meta">${trip.id} • ${escapeHTML(trip.vendor?.type || 'Service')}</div><div class="v-sub">${escapeHTML(trip.destination)}</div></div><div class="v-pill pending">Pending</div></div>`).join('') || emptyPanel('No pending service requests.');
        }
        if (lists[1]) {
            lists[1].innerHTML = active.slice(0, 4).map((trip) => `<div class="vendor-list-item" data-dd-action="route" data-dd-target="vendor_active_services.html" style="cursor:pointer"><div class="v-info"><div class="v-id">${trip.id}</div><div class="v-meta">${escapeHTML(trip.vendor?.type || 'Service')} • ${escapeHTML(trip.travelerName)}</div><div class="v-sub">${escapeHTML(trip.destination)}</div></div><div class="v-pill progress">${escapeHTML(trip.serviceStatus || trip.vendorStatus)}</div></div>`).join('') || emptyPanel('No active services.');
        }
        iconRefresh(page);
    }

    function renderSupportDashboard(state) {
        if (currentPage() !== 'dashboard.html' || !decodeURIComponent(window.location.pathname).includes('/support/')) return;
        const page = document.querySelector('.dashboard-container');
        if (!page) return;

        // All non-cancelled trips visible to support
        const allTrips = allActiveTrips(state).filter((trip) => !['completed', 'cancelled'].includes(trip.status));
        // Trips support is actively coordinating
        const activeTrips = allTrips.filter((trip) => trip.supportStatus === 'Accepted');
        // Pending requests: trips sent by partner
        const pendingFromPartner = allTrips.filter((trip) => trip.supportStatus === 'Sent');

        // All reported issues in the platform for support dashboard
        const issues = state.issues || [];

        const inProgress = issues.filter((issue) => issue.status === 'In Progress' || issue.status === 'Open');
        const resolved = issues.filter((issue) => issue.status === 'Resolved');
        const emergencies = issues.filter((issue) => issue.status !== 'Resolved' && /high|critical|emergency/i.test(`${issue.priority} ${issue.type}`));
        const activity = [
            ...issues.map((issue) => ({ title: `${issue.status} issue`, desc: `${issue.title}${issue.tripId ? ` - ${issue.tripId}` : ''}`, createdAt: issue.createdAt })),
            ...activeTrips.flatMap((trip) => (trip.updates || []).map((update) => ({ title: update.title, desc: `${trip.id} - ${update.message}`, createdAt: update.createdAt }))),
        ].sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));

        // --- PATCH stat card values in-place (preserve CSS-styled HTML structure) ---
        const statValues = page.querySelectorAll('.stat-card .stat-value');
        const statData = [allTrips.length, inProgress.length, resolved.length, emergencies.length];
        statValues.forEach((el, i) => { if (statData[i] !== undefined) el.textContent = statData[i]; });

        const statLinks = page.querySelectorAll('.stat-card .stat-link');
        if (statLinks[0]) statLinks[0].textContent = `${activeTrips.length} coordinated by support`;
        if (statLinks[1]) statLinks[1].textContent = 'Currently being resolved';
        if (statLinks[2]) statLinks[2].textContent = 'Successfully resolved';
        if (statLinks[3]) statLinks[3].textContent = 'Requires immediate attention';

        const statTitles = page.querySelectorAll('.stat-card .stat-title');
        if (statTitles[0]) statTitles[0].textContent = 'All Trips';

        // --- Today's Overview Dynamic Stats ---
        const totalIssuesEl = document.getElementById('support-stat-total-issues');
        if (totalIssuesEl) totalIssuesEl.textContent = issues.length;

        const avgResEl = document.getElementById('support-stat-avg-res');
        if (avgResEl) {
            let totalHours = 0;
            let resolvedCount = 0;
            resolved.forEach(issue => {
                if (issue.resolvedAt && issue.createdAt) {
                    const diffMs = new Date(issue.resolvedAt).getTime() - new Date(issue.createdAt).getTime();
                    totalHours += (diffMs / (1000 * 60 * 60));
                    resolvedCount++;
                }
            });
            const avg = resolvedCount > 0 ? (totalHours / resolvedCount) : (issues.length > 0 ? 2.5 : 0);
            avgResEl.textContent = avg > 0 ? avg.toFixed(1) + 'h' : '0h';
        }

        const csatEl = document.getElementById('support-stat-csat');
        if (csatEl) {
            const score = issues.length === 0 ? 100 : Math.max(0, 100 - (emergencies.length * 10) - (inProgress.length * 2));
            csatEl.textContent = score + '%';
        }

        // --- Alert banner: inject before stats-grid if partner sent trips ---
        let banner = page.querySelector('#dd-support-alert-banner');
        if (pendingFromPartner.length) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'dd-support-alert-banner';
                const statsGrid = page.querySelector('.stats-grid');
                if (statsGrid) page.insertBefore(banner, statsGrid);
                else page.prepend(banner);
            }
            banner.style.cssText = 'background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
            banner.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;">
                    <i data-icon="alertcircle" style="color:#f97316;width:22px;height:22px;flex-shrink:0;"></i>
                    <div>
                        <div style="font-weight:700;color:#c2410c;font-size:0.95rem;">${pendingFromPartner.length} trip${pendingFromPartner.length > 1 ? 's' : ''} sent for support coordination</div>
                        <div style="font-size:0.82rem;color:#9a3412;">Travel partner has requested support assistance. Go to Trip Status to accept.</div>
                    </div>
                </div>
                <button class="btn-outline" style="background:#f97316;color:#fff;border-color:#f97316;white-space:nowrap;padding:6px 14px;font-size:0.85rem;" data-dd-action="route" data-dd-target="trip_status.html">
                    <i data-icon="activity"></i> View Requests
                </button>
            `;
        } else if (banner) {
            banner.remove();
        }

        // --- Quick actions: update dynamic sub-text ---
        const quickActions = page.querySelectorAll('.quick-action-btn');
        if (quickActions[0]) {
            const sub = quickActions[0].querySelector('div > div:last-child');
            if (sub) sub.textContent = `${issues.filter(i => i.status !== 'Resolved').length} pending assignments`;
        }
        if (quickActions[1]) {
            const sub = quickActions[1].querySelector('div > div:last-child');
            if (sub) sub.textContent = `${emergencies.length} active emergencies`;
        }
        if (quickActions[2]) {
            const sub = quickActions[2].querySelector('div > div:last-child');
            if (sub) sub.textContent = `${activeTrips.length} active trips`;
        }

        // --- Recent activity: update timeline ---
        const recentDiv = Array.from(page.children).find(el =>
            el.querySelector && el.querySelector('h2') &&
            (el.querySelector('h2').textContent || '').includes('Recent Activity')
        );
        if (recentDiv) {
            let activityContainer = recentDiv.querySelector('#dd-support-activity');
            if (!activityContainer) {
                activityContainer = document.createElement('div');
                activityContainer.id = 'dd-support-activity';
                const h2 = recentDiv.querySelector('h2');
                // Remove all children after h2
                while (h2 && h2.nextSibling) h2.nextSibling.remove();
                recentDiv.appendChild(activityContainer);
            }
            activityContainer.innerHTML = activity.slice(0, 6).map((item) => `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div>
                        <div><span>${escapeHTML(item.title)}</span><span>${relativeTime(item.createdAt)}</span></div>
                        <div>${escapeHTML(item.desc)}</div>
                    </div>
                </div>
            `).join('') || `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div>
                        <div><span>No recent activity</span><span>Now</span></div>
                        <div>Accept a trip request to start coordinating.</div>
                    </div>
                </div>
            `;
        }

        iconRefresh(page);
        renderAssignedTravelersWidget(state);
    }

    function renderSupportTripStatus(state) {
        if (currentPage() !== 'trip_status.html' || !decodeURIComponent(window.location.pathname).includes('/support/')) return;
        const page = document.querySelector('.dashboard-container');
        if (!page) return;

        // Support sees ALL trips (including requested ones) - not just accepted
        const allTrips = allActiveTrips(state).filter((trip) => !['completed', 'cancelled'].includes(trip.status));
        const issues = state.issues || [];
        const openIssues = issues.filter((issue) => issue.status !== 'Resolved');
        const destinations = new Set(allTrips.map((trip) => trip.destination).filter(Boolean));
        const travelerCount = allTrips.reduce((sum, trip) => sum + Number(trip.travelersCount || 1), 0);

        // Trips explicitly sent to support by partner (priority queue)
        const sentToSupport = allTrips.filter(trip => trip.supportStatus === 'Sent');
        // Trips support has accepted coordination for
        const coordinatedTrips = allTrips.filter(trip => trip.supportStatus === 'Accepted');
        // All other trips (visible but not yet coordinated)
        const otherTrips = allTrips.filter(trip => trip.supportStatus !== 'Sent' && trip.supportStatus !== 'Accepted');

        const renderTripCard = (trip, canAccept = false) => {
            const tripIssues = openIssues.filter((issue) => issue.tripId === trip.id);
            const shortId = String(trip.id).replace(/\D/g, '') || trip.id;
            const isSent = trip.supportStatus === 'Sent';
            const isCoordinated = trip.supportStatus === 'Accepted';
            const accentColor = isSent ? '#f59e0b' : isCoordinated ? '#10b981' : '#0ea5e9';
            return `
                <div class="support-trip-card" style="display: grid; grid-template-columns: 1.4fr 1.1fr 1fr auto; gap: 16px; align-items: center; padding: 18px 22px; background: var(--bg-card-alt, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-left: 4px solid ${accentColor}; border-radius: 14px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.03); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);">
                    <!-- Col 1: Short ID, Title, Status Badges & Location -->
                    <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
                        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.25); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 800; color: #0ea5e9; flex-shrink: 0;">
                            ${escapeHTML(shortId)}
                        </div>
                        <div style="min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary, #0f172a); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(trip.title)}</h3>
                                <span class="meta-chip ${isSent ? 'amber' : isCoordinated ? 'green' : 'blue'}" style="padding: 2px 8px; font-size: 0.72rem;">
                                    ${escapeHTML(isSent ? 'Sent to Support' : isCoordinated ? 'Coordinated' : statusLabel(trip))}
                                </span>
                                ${tripIssues.length ? `<span class="meta-chip red" style="padding: 2px 8px; font-size: 0.72rem;"><i data-icon="alertcircle" style="width: 12px; height: 12px;"></i> ${tripIssues.length} Issue${tripIssues.length > 1 ? 's' : ''}</span>` : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-secondary, #64748b); flex-wrap: wrap;">
                                <span><strong>${escapeHTML(trip.id)}</strong></span>
                                <span>•</span>
                                <span>📍 ${escapeHTML(trip.destination || 'Unspecified')}</span>
                                <span>•</span>
                                <span><i data-icon="clock" style="width: 12px; height: 12px;"></i> ${relativeTime(trip.updatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Col 2: Traveler & Guide Meta -->
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; padding: 0 10px; border-left: 1px solid var(--border-color, rgba(226,232,240,0.5)); border-right: 1px solid var(--border-color, rgba(226,232,240,0.5));">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-secondary, #64748b); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Traveler</span>
                            <span style="font-weight: 700; color: var(--text-primary, #0f172a);">${escapeHTML(trip.travelerName)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-secondary, #64748b); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">Guide</span>
                            <span style="font-weight: 600; color: var(--text-primary, #0f172a);">${escapeHTML(trip.guide?.name || 'Unassigned')}</span>
                        </div>
                    </div>

                    <!-- Col 3: Trip Progress -->
                    <div style="display: flex; flex-direction: column; gap: 6px; padding: 0 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; font-weight: 700;">
                            <span style="color: var(--text-secondary, #64748b);">Progress</span>
                            <span style="color: #0ea5e9;">${Math.min(100, trip.progress)}%</span>
                        </div>
                        <div style="height: 6px; width: 100%; background: rgba(148, 163, 184, 0.2); border-radius: 99px; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(100, trip.progress)}%; background: linear-gradient(90deg, #0ea5e9, #10b981); border-radius: 99px; transition: width 0.3s ease;"></div>
                        </div>
                    </div>

                    <!-- Col 4: Action Buttons -->
                    <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
                        ${canAccept ? `
                            <button class="btn-accept-coord" data-dd-action="accept-trip-support" data-trip-id="${trip.id}" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.8rem; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25); white-space: nowrap; transition: all 0.2s ease;">
                                <i data-icon="checkcircle" style="width: 14px; height: 14px;"></i> Accept Coordination
                            </button>
                        ` : ''}
                        <button class="btn-card-action" data-dd-action="route" data-dd-target="trip_details.html" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-primary, #0f172a); background: var(--bg-card-alt, rgba(255,255,255,0.06)); border: 1px solid var(--border-color, #cbd5e1); border-radius: 8px; cursor: pointer; white-space: nowrap;">
                            <i data-icon="eye" style="width: 14px; height: 14px;"></i> View Details
                        </button>
                        <button class="btn-card-action" data-dd-action="route" data-dd-target="messages.html" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-primary, #0f172a); background: var(--bg-card-alt, rgba(255,255,255,0.06)); border: 1px solid var(--border-color, #cbd5e1); border-radius: 8px; cursor: pointer; white-space: nowrap;">
                            <i data-icon="message" style="width: 14px; height: 14px;"></i> Contact Members
                        </button>
                        ${tripIssues.length && isCoordinated ? `
                            <button class="btn-card-issue" data-dd-action="route" data-dd-target="reported_issues.html" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; font-size: 0.8rem; font-weight: 700; color: #ef4444; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; cursor: pointer; white-space: nowrap;">
                                <i data-icon="alertcircle" style="width: 14px; height: 14px;"></i> View Issues
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        };

        page.innerHTML = `
            <div><h1>Trip Status Monitor</h1><p>All trips are visible below. Accept coordination to manage issues and send resolutions.</p></div>
            <div>
                <div class="info-card"><div><div><i data-icon="activity"></i></div><div>Total Trips</div><div>All non-cancelled</div></div><div class="stat-val">${allTrips.length}</div></div>
                <div class="info-card"><div><div><i data-icon="users"></i></div><div>Active Travelers</div><div>On active trips</div></div><div class="stat-val">${travelerCount}</div></div>
                <div class="info-card"><div><div><i data-icon="alertcircle"></i></div><div>Open Issues</div><div>Requiring attention</div></div><div class="stat-val">${openIssues.length}</div></div>
                <div class="info-card"><div><div><i data-icon="mappin"></i></div><div>Destinations</div><div>Currently active</div></div><div class="stat-val">${destinations.size}</div></div>
            </div>

            ${sentToSupport.length ? `
                <h2 style="color:#f97316;margin-top:24px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                    <i data-icon="alertcircle" style="color:#f97316;"></i>
                    Sent by Partner — Awaiting Your Acceptance (${sentToSupport.length})
                </h2>
                ${sentToSupport.map(trip => renderTripCard(trip, true)).join('')}
            ` : ''}

            <h2 style="margin-top:${sentToSupport.length ? '32px' : '24px'};margin-bottom:12px;">Trips You Are Coordinating (${coordinatedTrips.length})</h2>
            ${coordinatedTrips.map(trip => renderTripCard(trip, false)).join('') || `
                <div class="empty-coordination-card" style="display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: var(--bg-card-alt, #f8fafc); border: 1px dashed var(--border-color, #cbd5e1); border-left: 4px solid #94a3b8; border-radius: 14px; gap: 16px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(148, 163, 184, 0.15); display: flex; align-items: center; justify-content: center; color: var(--text-secondary, #64748b);">
                            <i data-icon="compass" style="width: 20px; height: 20px;"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0 0 2px 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary, #0f172a);">No coordinated trips yet</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary, #64748b);">Accept a trip below or from partner to start managing issues and member communications.</p>
                        </div>
                    </div>
                    <span class="meta-chip amber" style="padding: 4px 12px;">
                        <i data-icon="info" style="width: 14px; height: 14px;"></i>
                        <span>Accept to Start</span>
                    </span>
                </div>
            `}

            ${otherTrips.length ? `
                <h2 style="margin-top:32px;margin-bottom:12px;display:flex;align-items:center;gap:8px;opacity:0.9;">
                    All Other Active Trips (${otherTrips.length})
                    <span style="font-size:0.8rem;font-weight:400;opacity:0.7;">— accept to coordinate issues</span>
                </h2>
                <div>
                    ${otherTrips.map(trip => renderTripCard(trip, true)).join('')}
                </div>
            ` : ''}
        `;
        iconRefresh(page);
    }

    function renderSupportCoordinationPanel(state) {
        if (currentPage() !== 'coordination_panel.html') return;
        const page = document.querySelector('.dashboard-container');
        if (!page) return;

        // Filter trips coordinated by support
        const trips = allActiveTrips(state).filter((trip) => !['completed', 'cancelled'].includes(trip.status) && trip.supportStatus === 'Accepted');

        const vendorTrips = trips.filter((trip) => trip.vendor);
        const guideTrips = trips.filter((trip) => trip.guide);
        const contactCard = (title, subtitle, status, icon, target) => `
            <div class="contact-card"><div class="contact-card-inner"><div class="contact-avatar">${escapeHTML(initialsFor(title).slice(0, 1))}</div><div><div>${escapeHTML(title)}</div><div>${escapeHTML(subtitle)}</div><div class="contact-status"><div class="contact-status-dot"></div> ${escapeHTML(status)}</div></div></div><button class="btn-full" data-dd-action="route" data-dd-target="${target}"><i data-icon="${icon}"></i> Contact</button></div>
        `;
        page.innerHTML = `
            <div><h1>Coordination Panel</h1><p>Coordinate with travel partners, vendors, and tour guides</p></div>
            <div><div class="info-card"><div>Active Trips</div><div>${trips.length}</div></div><div class="info-card"><div>Active Vendors</div><div>${vendorTrips.length}</div></div><div class="info-card"><div>Active Guides</div><div>${guideTrips.length}</div></div></div>
            <h2 class="section-title">Travel Partner Contact</h2>
            <div>${trips.map((trip) => contactCard('Travel Partner', `Trip: ${trip.id}`, statusLabel(trip), 'phone', 'messages.html')).join('') || emptyPanel('No accepted trips to coordinate yet.')}</div>
            <h2 class="section-title">Vendor Coordination</h2>
            <div>${vendorTrips.map((trip) => contactCard(trip.vendor.name, `${trip.vendor.type} - ${trip.id}`, trip.vendorStatus || 'Assigned', 'message', 'messages.html')).join('') || emptyPanel('No vendors assigned yet.')}</div>
            <h2 class="section-title">Tour Guide Coordination</h2>
            <div>${guideTrips.map((trip) => contactCard(trip.guide.name, `Trip: ${trip.id} - ${trip.progress}% complete`, trip.guideStatus || 'Assigned', 'phone', 'messages.html')).join('') || emptyPanel('No guides assigned yet.')}</div>
        `;
        iconRefresh(page);
    }

    function renderSupportEmergencySupport(state) {
        if (currentPage() !== 'emergency_support.html') return;
        const page = document.querySelector('.dashboard-container');
        if (!page) return;

        // Filter active emergency cases across the platform for support
        const emergencies = (state.issues || []).filter((issue) => {
            if (issue.status === 'Resolved') return false;
            return /high|critical|emergency/i.test(`${issue.priority} ${issue.type}`);
        });

        page.innerHTML = `
            <div><h1>Emergency Support</h1><p>Handle high-priority traveler support issues</p></div>
            <div class="emergency-banner"><div><div>Emergency Hotline</div><div>Direct line for critical situations</div><div class="emergency-number">1-800-TRAVEL</div></div><div><i data-icon="phone"></i></div></div>
            <h2>Active Emergency Cases</h2>
            ${emergencies.map((issue) => {
                const photoUrl = getIssuePhotoUrl(issue);
                return `
                <div class="emergency-card">
                    <div class="e-card-header"><div class="e-icon"><i data-icon="phone"></i></div><div><div><h3>${escapeHTML(issue.title)} <span class="active-badge">Active</span></h3><span>${relativeTime(issue.createdAt)}</span></div><div>${escapeHTML(issue.id)} - Trip: ${escapeHTML(issue.tripId || '-')}</div></div></div>
                    <div class="e-info-grid"><div><div class="e-label">Reporter</div><div class="e-value"><i data-icon="user"></i> ${escapeHTML(issue.reportedBy)}</div></div><div><div class="e-label">Priority</div><div class="e-value"><i data-icon="alert"></i> ${escapeHTML(issue.priority)}</div></div></div>
                    ${photoUrl ? `
                        <div style="margin-top:10px; display:flex; align-items:center; gap:10px; background:rgba(239, 68, 68, 0.08); padding:8px 12px; border-radius:8px; border:1px solid rgba(239, 68, 68, 0.2);">
                            <img src="${escapeHTML(photoUrl)}" alt="Emergency Photo" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid #fca5a5; cursor:pointer; flex-shrink:0; background:#fff;" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')" />
                            <button type="button" onclick="window.viewIssueAttachment('${escapeHTML(photoUrl)}')" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="image"></i> View Emergency Photo
                            </button>
                        </div>
                    ` : ''}
                    <div class="e-actions"><button class="btn-red-solid" data-dd-action="route" data-dd-target="messages.html"><i data-icon="phone"></i> Contact Members</button><button class="btn-red-outline" data-dd-action="route" data-dd-target="reported_issues.html"><i data-icon="alert"></i> View Issue</button></div>
                </div>
            `;}).join('') || `<div class="emergency-card"><div class="e-card-header"><div class="e-icon"><i data-icon="checkcircle"></i></div><div><div><h3>No active emergency cases</h3></div><div>High-priority issue reports will appear here.</div></div></div></div>`}
            <h2>Emergency Response Guidelines</h2>
            <div><div class="guideline-card"><div class="g-title">Medical Emergencies</div><ul class="g-list"><li>Contact traveler immediately</li><li>Coordinate with local services</li><li>Notify travel partner</li></ul></div><div class="guideline-card"><div class="g-title">Safety Concerns</div><ul class="g-list"><li>Assess the situation</li><li>Contact authorities if needed</li><li>Coordinate guide and vendor support</li></ul></div></div>
        `;
        iconRefresh(page);
    }

    function renderSupportTripDetails(state) {
        if (currentPage() !== 'trip_details.html') return;
        const page = document.querySelector('.dashboard-container');
        if (!page) return;

        // Prioritize coordinated/accepted trips
        const trip = allActiveTrips(state).find((item) => !['completed', 'cancelled'].includes(item.status) && item.supportStatus === 'Accepted') ||
            allActiveTrips(state).find((item) => !['completed', 'cancelled'].includes(item.status));

        if (!trip) {
            page.innerHTML = `<div class="page-title-area"><div><button class="back-btn" data-dd-action="route" data-dd-target="trip_status.html"><i data-icon="chevronleft"></i> Back to Monitor</button><div class="title-with-badge"><h1>No Trip Selected</h1><span class="badge-ss">Fresh Start</span></div></div></div><div class="detail-card"><div class="detail-card-title">Trip Information</div><p style="color:#64748b;">There are no trips yet. Trip details will appear after a real traveler request is created.</p></div>`;
            iconRefresh(page);
            return;
        }
        const tripIssues = (state.issues || []).filter((issue) => issue.tripId === trip.id && issue.status !== 'Resolved');
        const schedule = ensureTripSchedule(trip);
        page.innerHTML = `
            <div class="page-title-area"><div><button class="back-btn" data-dd-action="route" data-dd-target="trip_status.html"><i data-icon="chevronleft"></i> Back to Monitor</button><div class="title-with-badge"><h1>${escapeHTML(trip.title)}</h1><span class="badge-ip">${escapeHTML(statusLabel(trip))}</span></div></div><div><button class="ab-btn bg-teal" data-dd-action="route" data-dd-target="coordination_panel.html"><i data-icon="users"></i> Coordinate Trip</button></div></div>
            <div class="trip-details-grid">
                <div class="details-left">
                    <div class="detail-card"><div class="detail-card-title">Trip Information</div><div class="info-row"><div class="info-label">Trip ID</div><div class="info-value">${escapeHTML(trip.id)}</div></div><div class="info-row"><div class="info-label">Destination</div><div class="info-value">${escapeHTML(trip.destination)}</div></div><div class="info-row"><div class="info-label">Duration</div><div class="info-value">${escapeHTML(formatDateRange(trip))}</div></div><div class="info-row"><div class="info-label">Traveler</div><div class="info-value">${escapeHTML(trip.travelerName)}</div></div></div>
                    <div class="detail-card">
                        <div class="detail-card-title">Current Status (Full Itinerary)</div>
                        <div class="v-list" style="max-height: 380px; overflow-y: auto; padding-right: 8px;">
                            ${schedule.map((item) => `
                                <div class="v-item ${item.status !== 'upcoming' ? 'active' : ''}">
                                    <div class="v-icon"><i data-icon="${item.status === 'completed' ? 'check' : item.status === 'in-progress' ? 'activity' : 'clock'}"></i></div>
                                    <div class="v-content">
                                        <div class="v-title">Day ${item.day} - ${escapeHTML(item.title)}</div>
                                        <div class="v-desc">${escapeHTML(scheduleStatusText(item.status))} - ${escapeHTML(item.location)} (${escapeHTML(item.time)})</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="detail-card"><div class="detail-card-title">Active Support Items</div><div class="issue-pill-row">${tripIssues.map((issue) => `<div class="issue-pill"><div><div class="ip-title">${escapeHTML(issue.id)} - ${escapeHTML(issue.title)}</div><div class="ip-desc">${escapeHTML(issue.description)}</div></div></div>`).join('') || `<p style="color:#64748b;">No active support issues for this trip.</p>`}</div></div>
                </div>
                <div class="details-right"><div class="widget-grad w-gradient-pink"><div class="detail-card-title">Travel Partner</div><p>Travel partner coordination is available through messages.</p><button class="w-btn" data-dd-action="route" data-dd-target="messages.html"><i data-icon="message"></i> Contact Partner</button></div><div class="detail-card"><div class="detail-card-title">Tour Guide</div>${trip.guide ? `<div class="w-contact"><div class="w-avatar">${escapeHTML(trip.guide.initials || initialsFor(trip.guide.name))}</div><div class="w-details"><h4>${escapeHTML(trip.guide.name)}</h4><p>${escapeHTML(trip.guideStatus)}</p></div></div>` : `<p style="color:#64748b;">No guide assigned yet.</p>`}</div><div class="detail-card"><div class="detail-card-title">Vendor Services</div>${trip.vendor ? `<div class="vendor-row"><div class="v-left"><div class="v-icon"><i data-icon="truck"></i></div><div><div class="v-name">${escapeHTML(trip.vendor.name)}</div><div class="v-desc">${escapeHTML(trip.vendor.type || 'Service')}</div></div></div><span class="v-status">${escapeHTML(trip.vendorStatus)}</span></div>` : `<p style="color:#64748b;">No vendor assigned yet.</p>`}</div></div>
            </div>
        `;
        iconRefresh(page);
    }

    function renderSuperuserDashboard(state) {
        if (currentPage() !== 'superuser_dashboard.html') return;
        const page = document.querySelector('.sa-dashboard');
        if (!page) return;
        const users = state.users || [];
        const trips = allActiveTrips(state);
        const activeTrips = trips.filter((trip) => !['completed', 'cancelled'].includes(trip.status));
        const activeTravelers = new Set(activeTrips.map((trip) => trip.travelerEmail || trip.travelerName).filter(Boolean)).size;
        const openIssues = (state.issues || []).filter((issue) => issue.status !== 'Resolved');
        const pendingVendors = trips.filter((trip) => trip.vendor && ['Requested', 'Pending'].includes(trip.vendorStatus));
        const updates = trips.flatMap((trip) => (trip.updates || []).map((update) => ({
            title: update.title,
            desc: `${trip.id} - ${update.message}`,
            createdAt: update.createdAt,
            icon: update.source === 'Vendor' ? 'truck' : update.source === 'Guide' ? 'user' : 'activity',
        })));
        const activity = [
            ...updates,
            ...(state.notifications || []).map((item) => ({ title: item.title, desc: item.message, createdAt: item.createdAt, icon: 'bell' })),
            ...openIssues.map((issue) => ({ title: `Open issue: ${issue.id}`, desc: issue.title, createdAt: issue.createdAt, icon: 'alertcircle' })),
        ].sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));

        page.innerHTML = `
            <div class="welcome-banner" style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#6366f1,#c084fc)!important;padding:28px 30px!important;border-radius:14px!important;margin-bottom:22px!important;color:#fff;">
                <div><h1 style="color:#fff!important;font-size:22px!important;margin:0 0 8px;">Dream Destination Platform Control</h1><p style="color:rgba(255,255,255,.92)!important;margin:0;font-size:13px!important;">Complete platform overview and management from live backend state</p></div>
                <div style="display:flex;gap:10px;"><button class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_reports.html"><i data-icon="filetext"></i> Reports</button><button class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_settings.html"><i data-icon="settings"></i> Settings</button></div>
            </div>
            <div class="sa-stats-grid-5">
                <div class="sa-stat-card sa-stat-blue" data-dd-action="route" data-dd-target="superuser_users.html" style="cursor: pointer;"><div class="sa-stat-icon-wrap"><i data-icon="users"></i></div><div class="sa-stat-number">${users.length}</div><div class="sa-stat-label">Total Users</div><div class="sa-stat-trend">Real data</div></div>
                <div class="sa-stat-card sa-stat-green" data-dd-action="route" data-dd-target="superuser_trips.html" style="cursor: pointer;"><div class="sa-stat-icon-wrap"><i data-icon="plane"></i></div><div class="sa-stat-number">${trips.length}</div><div class="sa-stat-label">Total Trips</div><div class="sa-stat-trend">Real data</div></div>
                <div class="sa-stat-card sa-stat-orange" data-dd-action="route" data-dd-target="superuser_reports.html" style="cursor: pointer;"><div class="sa-stat-icon-wrap"><i data-icon="dollar"></i></div><div class="sa-stat-number">${formatMoney(tripRevenue(trips))}</div><div class="sa-stat-label">Total Revenue</div><div class="sa-stat-trend">Real data</div></div>
                <div class="sa-stat-card sa-stat-pink" data-dd-action="route" data-dd-target="superuser_users.html" style="cursor: pointer;"><div class="sa-stat-icon-wrap"><i data-icon="activity"></i></div><div class="sa-stat-number">${activeTravelers}</div><div class="sa-stat-label">Active Travelers</div><div class="sa-stat-trend">Real data</div></div>
                <div class="sa-stat-card sa-stat-purple" data-dd-action="route" data-dd-target="superuser_guides.html" style="cursor: pointer;"><div class="sa-stat-icon-wrap"><i data-icon="compass"></i></div><div class="sa-stat-number">${(state.guides || []).length}</div><div class="sa-stat-label">Tour Guides</div><div class="sa-stat-trend">Real data</div></div>
            </div>
            <div class="sa-content-grid">
                <div class="sa-main-panel"><div class="sa-section-card"><div class="sa-section-header"><div><h3>Active Trips (${activeTrips.length})</h3><p>Real-time trip monitoring</p></div><button class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_trips.html">View All</button></div><div class="sa-trips-table">
                    ${activeTrips.slice(0, 6).map((trip) => `
                        <div class="sa-trip-card-wide" style="display:flex;flex-direction:column;gap:12px;padding:18px;background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                            <div class="sa-tcw-top" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <div class="sa-tcw-title" style="font-size:16px;font-weight:800;color:var(--foreground,#0f172a);">${escapeHTML(trip.title)} <span class="sa-tcw-id" style="font-size:12px;color:#64748b;font-weight:600;">#${escapeHTML(trip.id)}</span></div>
                                    <div class="sa-tcw-loc" style="font-size:13px;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:4px;"><i data-icon="mappin" style="color:#0ea5e9;"></i> ${escapeHTML(trip.destination)}</div>
                                </div>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <div class="sa-tcw-price" style="font-size:16px;font-weight:800;color:#0ea5e9;">${formatMoney(Number(trip.budget || 0))}</div>
                                    <button type="button" class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_view_trip.html?id=${encodeURIComponent(trip.id)}" style="background:#0ea5e9;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(14,165,233,0.25);">
                                        <i data-icon="eye"></i> View Details
                                    </button>
                                </div>
                            </div>
                            <div class="sa-tcw-mid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;background:var(--bg-card-alt,#f8fafc);padding:10px 14px;border-radius:8px;">
                                <div><span class="sa-tcw-label" style="font-size:11px;color:#94a3b8;font-weight:600;display:block;">TRAVELER</span><span class="sa-tcw-val" style="font-size:13px;font-weight:700;color:var(--foreground,#0f172a);">${escapeHTML(trip.travelerName)}</span></div>
                                <div><span class="sa-tcw-label" style="font-size:11px;color:#94a3b8;font-weight:600;display:block;">GUIDE</span><span class="sa-tcw-val" style="font-size:13px;font-weight:700;color:var(--foreground,#0f172a);">${escapeHTML(trip.guide?.name || 'Pending')}</span></div>
                                <div><span class="sa-tcw-label" style="font-size:11px;color:#94a3b8;font-weight:600;display:block;">DURATION</span><span class="sa-tcw-val" style="font-size:13px;font-weight:700;color:var(--foreground,#0f172a);">${escapeHTML(formatDateRange(trip))}</span></div>
                            </div>
                            <div class="sa-tcw-bot">
                                <div class="sa-tcw-prog-text" style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;"><span>Trip Progress</span><span>${trip.progress}%</span></div>
                                <div class="sa-tcw-prog-bar" style="height:6px;background:#e2e8f0;border-radius:99px;overflow:hidden;"><div class="sa-tcw-prog-fill" style="width:${Math.min(100, trip.progress)}%;height:100%;background:#14b8a6;"></div></div>
                            </div>
                        </div>
                    `).join('') || emptyPanel('No active trips yet. New traveler requests will appear after they are created and accepted.')}
                </div></div></div>
                <div class="sa-side-panel"><div class="sa-section-card"><div class="sa-section-header"><div><h3>Recent Activity</h3><p>Platform events in real-time</p></div></div><div class="sa-activity-list">
                    ${activity.slice(0, 4).map((item) => `<div class="sa-activity-item"><div class="sa-activity-icon sa-ai-blue"><i data-icon="${escapeHTML(item.icon)}"></i></div><div class="sa-activity-content"><div class="sa-act-title">${escapeHTML(item.title)}</div><div class="sa-act-desc">${escapeHTML(item.desc)}</div><div class="sa-act-time">${relativeTime(item.createdAt)}</div></div></div>`).join('') || emptyPanel('No platform activity yet.')}
                </div></div></div>
            </div>
            <div class="sa-dual-grid">
                <div class="sa-section-card"><div class="sa-section-header"><div><h3 style="margin-bottom:2px;">Pending Vendor Requests</h3><p style="font-size:12px;color:#64748b;">${pendingVendors.length} awaiting approval</p></div><button class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_vendors.html">Manage</button></div><div class="sa-vendor-list" style="padding-top:12px;">
                    ${pendingVendors.slice(0, 5).map((trip) => `<div class="sa-vendor-item-v2"><div class="sa-vicon-box purple"><i data-icon="truck"></i></div><div class="sa-vinfo"><div class="sa-vinfo-title">${escapeHTML(trip.vendor?.name || 'Vendor')}</div><div class="sa-vinfo-sub">${escapeHTML(trip.vendor?.type || 'Service')}<br><span style="opacity:.6">Trip: ${escapeHTML(trip.id)}</span></div></div><div class="sa-vright"><div class="sa-vright-val">${escapeHTML(trip.vendorStatus)}</div><div class="sa-vright-time">${relativeTime(trip.updatedAt)}</div></div></div>`).join('') || emptyPanel('No pending vendor requests.')}
                </div></div>
                <div class="sa-section-card"><div class="sa-section-header"><div><h3 style="margin-bottom:2px;">Open Support Issues</h3><p style="font-size:12px;color:#64748b;">${openIssues.length} require attention</p></div><button class="sa-btn-sm" data-dd-action="route" data-dd-target="superuser_support.html">Manage</button></div><div class="sa-issues-list" style="padding-top:12px;">
                    ${openIssues.slice(0, 5).map((issue) => `<div class="sa-vendor-item-v2"><div class="sa-vicon-box sa-issue-box-alert"><i data-icon="alertcircle"></i></div><div class="sa-vinfo"><div class="sa-vinfo-title">${escapeHTML(issue.id)} <span class="sa-badge-high" style="margin-left:4px;">${escapeHTML(issue.priority)}</span></div><div class="sa-vinfo-sub">${escapeHTML(issue.type)}<br><span style="opacity:.8">${escapeHTML(issue.title)}</span></div></div><div class="sa-vright"><div class="sa-vright-time" style="margin-top:20px;">${relativeTime(issue.createdAt)}</div></div></div>`).join('') || emptyPanel('No open support issues.')}
                </div></div>
            </div>
            <div class="sa-section-card sa-health-section"><div class="sa-section-header"><h3>System Health Status</h3><p>Backend is connected and serving live in-memory data</p></div><div class="sa-health-grid"><div class="sa-health-item"><div class="sa-health-icon sa-health-good"><i data-icon="server"></i></div><div class="sa-health-label">API Services</div><div class="sa-health-value">Live</div></div><div class="sa-health-item"><div class="sa-health-icon sa-health-good"><i data-icon="database"></i></div><div class="sa-health-label">In-Memory Store</div><div class="sa-health-value">Live</div></div><div class="sa-health-item"><div class="sa-health-icon sa-health-good"><i data-icon="users"></i></div><div class="sa-health-label">Users</div><div class="sa-health-value">${users.length}</div></div><div class="sa-health-item"><div class="sa-health-icon sa-health-good"><i data-icon="activity"></i></div><div class="sa-health-label">Workflow</div><div class="sa-health-value">${trips.length}</div></div></div></div>
            <div class="sa-section-card sa-quick-actions"><div class="sa-section-header"><h3>Quick Actions</h3></div><div class="sa-actions-grid"><button class="sa-action-btn" data-dd-action="route" data-dd-target="superuser_users.html"><i data-icon="users"></i><span>Manage Users</span></button><button class="sa-action-btn" data-dd-action="route" data-dd-target="superuser_trips.html"><i data-icon="plane"></i><span>Manage Trips</span></button><button class="sa-action-btn" data-dd-action="route" data-dd-target="superuser_vendors.html"><i data-icon="truck"></i><span>View Vendors</span></button><button class="sa-action-btn" data-dd-action="route" data-dd-target="superuser_guides.html"><i data-icon="compass"></i><span>Tour Guides</span></button></div></div>
        `;
        iconRefresh(page);
    }

    function renderSuperuserDirectoryPages(state) {
        const pageName = currentPage();
        const isVendorPage = pageName === 'superuser_vendors.html';
        const isGuidePage = pageName === 'superuser_guides.html';
        if (!isVendorPage && !isGuidePage) return;
        const page = document.querySelector('.sa-dashboard');
        if (!page) return;

        if (isVendorPage) {
            const vendors = assignableVendors(state);
            const assignedTrips = acceptedTrips(state).filter((trip) => trip.vendor);
            const requestedTrips = acceptedTrips(state).filter((trip) => trip.vendor && ['Requested', 'Pending'].includes(trip.vendorStatus));
            const avg = vendors.length ? (vendors.reduce((sum, vendor) => sum + Number(vendor.rating || 0), 0) / vendors.length).toFixed(1) : '0';
            page.querySelectorAll('.sa-sw-count').forEach((node, index) => {
                const values = [vendors.length, vendors.filter((vendor) => vendor.status !== 'Inactive').length, requestedTrips.length, avg];
                node.textContent = values[index] ?? 0;
            });
            const count = page.querySelector('.sa-table-count');
            if (count) count.textContent = `Showing ${vendors.length} of ${vendors.length} vendors`;
            const container = page.querySelector('#sa-vendors-container');
            if (container) {
                container.innerHTML = vendors.map((vendor) => {
                    const vendorTripCount = assignedTrips.filter((trip) => trip.vendor?.id === vendor.id || trip.vendor?.name === vendor.name).length;
                    return `
                        <div class="sa-vcard">
                            <div class="sa-vcard-header">
                                <div class="sa-vcard-avatar" style="background:#2563eb;">${escapeHTML(initialsFor(vendor.name))}</div>
                                <div class="sa-vcard-info"><h3>${escapeHTML(vendor.name)}</h3><div class="sa-vcard-badges"><span class="sa-vb-active">${escapeHTML(vendor.status || 'Available')}</span><span class="sa-vb-service">${escapeHTML(vendor.type || 'Service')}</span></div></div>
                                <input type="checkbox" class="sa-vcard-check" />
                            </div>
                            <div class="sa-vcard-body">
                                <div class="sa-vcard-detail"><i data-icon="briefcase"></i> ${escapeHTML(vendor.type || 'Service')}</div>
                                <div class="sa-vcard-detail"><i data-icon="mappin"></i> ${escapeHTML(vendor.location || 'Location pending')}</div>
                                <div class="sa-vcard-detail"><i data-icon="star"></i> ${Number(vendor.rating || 0).toFixed(1)}/5</div>
                            </div>
                            <div class="sa-vcard-stats"><div class="sa-vcard-stat"><div class="sa-vs-label">Trips</div><div class="sa-vs-value">${vendorTripCount}</div></div><div class="sa-vcard-stat"><div class="sa-vs-label">Status</div><div class="sa-vs-value">${escapeHTML(vendor.status || 'Available')}</div></div></div>
                            <div class="sa-vcard-footer"><button class="sa-vf-btn sa-vf-view" data-dd-action="view-directory-record" data-type="vendor" data-id="${escapeHTML(vendor.id)}" data-name="${escapeHTML(vendor.name)}"><i data-icon="eye"></i> View</button><button class="sa-vf-btn sa-vf-delete" data-dd-action="remove-vendor" data-id="${escapeHTML(vendor.id)}"><i data-icon="trash"></i></button></div>
                        </div>
                    `;
                }).join('') || emptyPanel('No registered vendors yet. When users create accounts with role Vendor, they will appear here.');
            }
        }

        if (isGuidePage) {
            const guides = assignableGuides(state);
            const assignedTrips = acceptedTrips(state).filter((trip) => trip.guide);
            const onTour = assignedTrips.filter((trip) => trip.scheduleStarted && trip.status === 'ongoing');
            const avg = guides.length ? (guides.reduce((sum, guide) => sum + Number(guide.rating || 0), 0) / guides.length).toFixed(1) : '0';
            page.querySelectorAll('.sa-sw-count').forEach((node, index) => {
                const values = [guides.length, guides.filter((guide) => guide.status !== 'Inactive').length, onTour.length, avg];
                node.textContent = values[index] ?? 0;
            });
            const count = page.querySelector('.sa-table-count');
            if (count) count.textContent = `Showing ${guides.length} of ${guides.length} guides`;
            const container = page.querySelector('#sa-guides-container');
            if (container) {
                container.innerHTML = guides.map((guide) => {
                    const guideTripCount = assignedTrips.filter((trip) => trip.guide?.id === guide.id || trip.guide?.name === guide.name).length;
                    return `
                        <div class="sa-vcard sa-guide-card">
                            <div class="sa-vcard-header">
                                <div class="sa-vcard-avatar" style="background:#7c3aed;">${escapeHTML(guide.initials || initialsFor(guide.name))}</div>
                                <div class="sa-vcard-info"><h3>${escapeHTML(guide.name)}</h3><div class="sa-vcard-badges"><span class="sa-vb-active">${escapeHTML(guide.status || 'Available')}</span><span class="sa-vb-specialty">${escapeHTML(guide.experience || 'Experience pending')}</span></div></div>
                                <input type="checkbox" class="sa-vcard-check" />
                            </div>
                            <div class="sa-vcard-body">
                                <div class="sa-vcard-detail"><i data-icon="message"></i> ${escapeHTML(guide.languages || 'Languages pending')}</div>
                                <div class="sa-vcard-detail"><i data-icon="calendar"></i> ${escapeHTML(guide.experience || 'Experience pending')}</div>
                                <div class="sa-vcard-detail"><i data-icon="star"></i> ${Number(guide.rating || 0).toFixed(1)}/5</div>
                            </div>
                            <div class="sa-vcard-stats"><div class="sa-vcard-stat"><div class="sa-vs-label">Active Trips</div><div class="sa-vs-value">${guideTripCount}</div></div><div class="sa-vcard-stat"><div class="sa-vs-label">Completed</div><div class="sa-vs-value">${Number(guide.tours || 0)}</div></div></div>
                            <div class="sa-vcard-footer"><button class="sa-vf-btn sa-vf-view" data-dd-action="view-directory-record" data-type="guide" data-id="${escapeHTML(guide.id)}" data-name="${escapeHTML(guide.name)}"><i data-icon="eye"></i> View</button><button class="sa-vf-btn sa-vf-delete" data-dd-action="remove-guide" data-id="${escapeHTML(guide.id)}"><i data-icon="trash"></i></button></div>
                        </div>
                    `;
                }).join('') || emptyPanel('No registered tour guides yet. When users create accounts with role Tour Guide, they will appear here.');
            }
        }
        iconRefresh(page);
    }

    function openDirectoryRecordModal(type, recordId, recordName) {
        const state = loadState();
        let modalTitle = 'Directory Record Details';
        let sections = [];

        if (type === 'vendor') {
            const vendors = assignableVendors(state);
            const vendor = vendors.find(v => String(v.id) === String(recordId) || String(v.name).toLowerCase() === String(recordName).toLowerCase())
                || { name: recordName || 'Vendor', type: 'Travel Services', status: 'Available', rating: 4.8, location: 'Destination Partner' };

            const allTrips = acceptedTrips(state);
            const assignedTrips = allTrips.filter(t => t.vendor?.id === vendor.id || t.vendor?.name === vendor.name || (t.vendor && String(t.vendor.name).toLowerCase() === String(vendor.name).toLowerCase()));

            modalTitle = `Vendor Profile — ${vendor.name}`;
            sections = [
                {
                    name: 'Company & Service Details',
                    icon: 'briefcase',
                    data: {
                        'Vendor Name': vendor.name,
                        'Service Type': vendor.type || 'Travel Services',
                        'Email Address': vendor.email || `${String(vendor.name).toLowerCase().replace(/\s+/g,'')}@vendor.com`,
                        'Phone Number': vendor.phone || '+91 98765 43210',
                        'Base Location': vendor.location || 'Pan-India Destination Partner',
                        'Status': vendor.status || 'Available'
                    }
                },
                {
                    name: 'Performance & Rating',
                    icon: 'trending-up',
                    data: {
                        'Customer Rating': `${Number(vendor.rating || 4.8).toFixed(1)} / 5.0 ★`,
                        'Active Assignments': `${assignedTrips.length} active trips`,
                        'Service Quality Score': '98% Excellent',
                        'Verification Status': 'Verified Super Admin Vendor'
                    }
                }
            ];

            if (assignedTrips.length > 0) {
                const tripData = {};
                assignedTrips.slice(0, 5).forEach((t) => {
                    tripData[`Trip #${t.id}`] = `${t.title || t.destination} (${t.travelerName || 'Traveler'}) — ${formatMoney(Number(t.budget || 0))}`;
                });
                sections.push({
                    name: `Assigned Trips (${assignedTrips.length})`,
                    icon: 'plane',
                    data: tripData
                });
            }
        } else if (type === 'guide') {
            const guides = assignableGuides(state);
            const guide = guides.find(g => String(g.id) === String(recordId) || String(g.name).toLowerCase() === String(recordName).toLowerCase())
                || { name: recordName || 'Tour Guide', experience: '5+ Years Certified', status: 'Available', rating: 4.9, languages: 'English, Local' };

            const allTrips = acceptedTrips(state);
            const assignedTrips = allTrips.filter(t => t.guide?.id === guide.id || t.guide?.name === guide.name || (t.guide && String(t.guide.name).toLowerCase() === String(guide.name).toLowerCase()));

            modalTitle = `Tour Guide Profile — ${guide.name}`;
            sections = [
                {
                    name: 'Guide Profile Information',
                    icon: 'user',
                    data: {
                        'Full Name': guide.name,
                        'Email Address': guide.email || `${String(guide.name).toLowerCase().replace(/\s+/g,'')}@guide.com`,
                        'Phone Number': guide.phone || '+91 98765 43211',
                        'Languages Spoken': guide.languages || 'English, Regional Languages',
                        'Experience Level': guide.experience || 'Certified Tour Guide',
                        'Availability': guide.status || 'Available'
                    }
                },
                {
                    name: 'Performance & Stats',
                    icon: 'star',
                    data: {
                        'Overall Rating': `${Number(guide.rating || 4.9).toFixed(1)} / 5.0 ★`,
                        'Active Tours': `${assignedTrips.length} active tours`,
                        'Completed Tours': `${Number(guide.tours || 12)} completed tours`,
                        'Satisfaction Rate': '99% Positive Feedback'
                    }
                }
            ];

            if (assignedTrips.length > 0) {
                const tripData = {};
                assignedTrips.slice(0, 5).forEach((t) => {
                    tripData[`Tour #${t.id}`] = `${t.title || t.destination} (${t.travelerName || 'Traveler'}) — ${formatDateRange(t)}`;
                });
                sections.push({
                    name: `Assigned Tours (${assignedTrips.length})`,
                    icon: 'map',
                    data: tripData
                });
            }
        }

        if (typeof window.showDetailsModal === 'function') {
            window.showDetailsModal(modalTitle, sections);
        } else {
            renderWorkflowModal(modalTitle, sections);
        }
    }

    function renderWorkflowModal(title, sections) {
        let overlay = document.getElementById('sa-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sa-modal-overlay';
            overlay.className = 'sa-modal-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity 0.3s ease;padding:20px;';
            overlay.innerHTML = `
                <div class="sa-modal-container" style="background:var(--bg-surface,#ffffff);border-radius:20px;width:100%;max-width:620px;max-height:85vh;overflow-y:auto;border:1px solid var(--border-color,#e2e8f0);box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);padding:28px;">
                    <div class="sa-modal-header" style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color,#f1f5f9);padding-bottom:16px;margin-bottom:20px;">
                        <h2 id="sa-modal-title" style="margin:0;font-size:20px;font-weight:800;color:var(--text-primary,#0f172a);">${escapeHTML(title)}</h2>
                        <button class="sa-modal-close" id="sa-modal-close-btn" style="background:none;border:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;">&times;</button>
                    </div>
                    <div class="sa-modal-body" id="sa-modal-body"></div>
                    <div class="sa-modal-footer" style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-color,#f1f5f9);text-align:right;">
                        <button class="sa-btn-primary" id="sa-modal-ok-btn" style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;font-weight:700;padding:10px 24px;border-radius:10px;border:none;cursor:pointer;">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const closeFn = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
            overlay.querySelector('#sa-modal-close-btn').addEventListener('click', closeFn);
            overlay.querySelector('#sa-modal-ok-btn').addEventListener('click', closeFn);
        }

        const bodyEl = overlay.querySelector('#sa-modal-body');
        let bodyHtml = '';
        sections.forEach(section => {
            bodyHtml += `
                <div style="margin-bottom:20px;background:var(--bg-card-alt,#f8fafc);padding:16px 20px;border-radius:14px;border:1px solid var(--border-color,#e2e8f0);">
                    <h4 style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#0ea5e9;display:flex;align-items:center;gap:6px;">
                        <i data-icon="${section.icon || 'info'}"></i> ${escapeHTML(section.name)}
                    </h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            `;
            for (const [key, val] of Object.entries(section.data || {})) {
                bodyHtml += `
                    <div>
                        <span style="font-size:11px;font-weight:700;color:#94a3b8;display:block;text-transform:uppercase;">${escapeHTML(key)}</span>
                        <span style="font-size:14px;font-weight:700;color:var(--text-primary,#0f172a);">${escapeHTML(String(val))}</span>
                    </div>
                `;
            }
            bodyHtml += `</div></div>`;
        });
        bodyEl.innerHTML = bodyHtml;
        iconRefresh(overlay);
        setTimeout(() => overlay.style.opacity = '1', 10);
    }

    function exportVendorsCsv() {
        const state = loadState();
        const vendors = assignableVendors(state);
        const trips = acceptedTrips(state);

        const lines = [
            ['Vendor ID', 'Vendor Name', 'Service Type', 'Operating Status', 'Rating', 'Location', 'Email Address', 'Phone Number', 'Active Trips Count', 'Assigned Trip IDs'],
            ...vendors.map((vendor) => {
                const assigned = trips.filter(t => t.vendor?.id === vendor.id || t.vendor?.name === vendor.name || (t.vendor && String(t.vendor.name).toLowerCase() === String(vendor.name).toLowerCase()));
                const tripIds = assigned.map(t => `#${t.id} (${t.title || 'Trip'})`).join('; ');
                return [
                    vendor.id || 'N/A',
                    vendor.name || 'Vendor',
                    vendor.type || vendor.specialty || 'Travel Services',
                    vendor.status || 'Available',
                    Number(vendor.rating || 4.8).toFixed(1),
                    vendor.location || vendor.base || 'Destination Partner',
                    vendor.email || `${String(vendor.name).toLowerCase().replace(/\s+/g,'')}@vendor.com`,
                    vendor.phone || '+91 98765 43210',
                    assigned.length,
                    tripIds || 'None'
                ];
            })
        ];

        const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dream-destination-vendors-report-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        if (typeof showToast === 'function') showToast('Vendor Details CSV Report downloaded successfully!', 'success');
        else if (typeof notify === 'function') notify('Vendor Details CSV Report downloaded successfully!', 'success');
    }

    function exportGuidesCsv() {
        const state = loadState();
        const guides = assignableGuides(state);
        const trips = acceptedTrips(state);

        const lines = [
            ['Guide ID', 'Guide Name', 'Experience Level', 'Status', 'Rating', 'Languages Spoken', 'Email Address', 'Phone Number', 'Completed Tours', 'Active Tours Count', 'Assigned Trip IDs'],
            ...guides.map((guide) => {
                const assigned = trips.filter(t => t.guide?.id === guide.id || t.guide?.name === guide.name || (t.guide && String(t.guide.name).toLowerCase() === String(guide.name).toLowerCase()));
                const tripIds = assigned.map(t => `#${t.id} (${t.title || 'Trip'})`).join('; ');
                return [
                    guide.id || 'N/A',
                    guide.name || 'Tour Guide',
                    guide.experience || 'Certified Tour Guide',
                    guide.status || 'Available',
                    Number(guide.rating || 4.9).toFixed(1),
                    guide.languages || 'English, Regional',
                    guide.email || `${String(guide.name).toLowerCase().replace(/\s+/g,'')}@guide.com`,
                    guide.phone || '+91 98765 43211',
                    guide.tours || 12,
                    assigned.length,
                    tripIds || 'None'
                ];
            })
        ];

        const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dream-destination-guides-report-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        if (typeof showToast === 'function') showToast('Guide Details CSV Report downloaded successfully!', 'success');
        else if (typeof notify === 'function') notify('Guide Details CSV Report downloaded successfully!', 'success');
    }

    function exportTripsCsv() {
        const state = loadState();
        const trips = state.trips || [];
        const lines = [
            ['Trip ID', 'Title', 'Destination', 'Status', 'Traveler', 'Guide', 'Vendor', 'Start Date', 'End Date', 'Budget (INR)', 'Progress'],
            ...trips.map((trip) => [
                trip.id,
                trip.title,
                trip.destination,
                tripDisplayStatus(trip),
                trip.travelerName || 'N/A',
                trip.guide?.name || 'Unassigned',
                trip.vendor?.name || 'Unassigned',
                trip.startDate || 'N/A',
                trip.endDate || 'N/A',
                trip.budget || 0,
                `${trip.progress || 0}%`
            ])
        ];
        const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dream-destination-trips-report-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        if (typeof showToast === 'function') showToast('Trips CSV Report downloaded successfully!', 'success');
        else if (typeof notify === 'function') notify('Trips CSV Report downloaded successfully!', 'success');
    }

    function exportUsersCsv() {
        const state = loadState();
        const users = state.users || [];
        const lines = [
            ['ID', 'Name', 'Email', 'Role', 'Status', 'Phone', 'Joined Date'],
            ...users.map((u) => [u.id || 'N/A', u.name, u.email, u.role, u.status || 'Active', u.phone || 'N/A', u.joined || 'N/A'])
        ];
        const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dream-destination-users-report-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        if (typeof showToast === 'function') showToast('Users CSV Report downloaded successfully!', 'success');
        else if (typeof notify === 'function') notify('Users CSV Report downloaded successfully!', 'success');
    }

    function downloadSuperuserReportPdf() {
        const page = currentPage();
        if (page.includes('vendor')) {
            exportVendorsCsv();
        } else if (page.includes('guide')) {
            exportGuidesCsv();
        } else if (page.includes('user')) {
            if (typeof CRUD !== 'undefined' && CRUD.exportUsersCsv) CRUD.exportUsersCsv();
            else exportUsersCsv();
        } else if (page.includes('trip')) {
            exportTripsCsv();
        } else {
            const state = loadState();
            const vendors = assignableVendors(state);
            const guides = assignableGuides(state);
            const trips = state.trips || [];
            const totalRev = trips.reduce((acc, t) => acc + Number(t.budget || 0), 0);

            const lines = [
                ['=== PLATFORM SUMMARY REPORT ==='],
                ['Report Generated Date', new Date().toLocaleString()],
                ['Total Revenue (INR)', totalRev],
                ['Total Trips', trips.length],
                ['Total Vendors', vendors.length],
                ['Total Tour Guides', guides.length],
                [],
                ['=== VENDORS MASTER LIST ==='],
                ['Vendor ID', 'Vendor Name', 'Type', 'Status', 'Rating', 'Email', 'Phone', 'Location'],
                ...vendors.map(v => [v.id || '', v.name, v.type || 'Travel', v.status || 'Available', v.rating || 4.8, v.email || '', v.phone || '', v.location || '']),
                [],
                ['=== TOUR GUIDES MASTER LIST ==='],
                ['Guide ID', 'Guide Name', 'Experience', 'Status', 'Rating', 'Email', 'Phone', 'Languages'],
                ...guides.map(g => [g.id || '', g.name, g.experience || '', g.status || 'Available', g.rating || 4.9, g.email || '', g.phone || '', g.languages || ''])
            ];

            const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `dream-destination-master-report-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            if (typeof showToast === 'function') showToast('Master Super Admin Report downloaded successfully!', 'success');
            else if (typeof notify === 'function') notify('Master Super Admin Report downloaded successfully!', 'success');
        }
    }

    function renderSuperuserTripDetails(state) {
        if (currentPage() !== 'superuser_view_trip.html') return;
        const page = document.querySelector('.sa-dashboard');
        if (!page) return;
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get('id') || params.get('trip') || params.get('requestId');
        const trips = state.trips || [];
        let trip = null;
        if (requestedId) {
            const reqLower = String(requestedId).toLowerCase().trim().replace(/^#/, '');
            trip = trips.find((item) => {
                const idLower = String(item.id || '').toLowerCase().trim().replace(/^#/, '');
                const reqIdLower = String(item.requestId || '').toLowerCase().trim().replace(/^#/, '');
                return idLower === reqLower || reqIdLower === reqLower || idLower.endsWith(reqLower) || reqIdLower.endsWith(reqLower);
            });
        }
        if (!trip && trips.length > 0) {
            trip = trips[0];
        }

        if (!trip) {
            page.innerHTML = `
                <div class="sa-form-layout" style="padding:32px;">
                    <div class="sa-form-main">
                        <a href="superuser_trips.html" class="sa-back-link" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:20px;font-weight:700;color:#0ea5e9;text-decoration:none;"><i data-icon="arrowleft"></i> Back to Trips</a>
                        <div class="sa-form-header">
                            <h1 style="font-size:24px;font-weight:800;color:var(--text-primary,#0f172a);">Trip Not Found</h1>
                            <p style="color:var(--text-secondary,#64748b);">No trip record matching ID "${escapeHTML(requestedId || 'None')}".</p>
                        </div>
                        <div class="sa-form-card" style="margin-top:20px;padding:24px;color:var(--text-secondary,#64748b);">Please return to the Trips page and select a valid trip to view details.</div>
                    </div>
                </div>
            `;
            iconRefresh(page);
            return;
        }
        const stats = scheduleStats(trip);
        const isCancelled = trip.status === 'cancelled';
        const ref = trip.refundRecord;
        const isRefunded = ref && ref.processed;
        const paid = isTripPaid(trip);

        let cancellationBannerHTML = '';
        if (isCancelled) {
            if (!paid) {
                cancellationBannerHTML = `
                    <div style="background:rgba(241,245,249,0.9);border:1.5px solid #cbd5e1;border-radius:14px;padding:18px 24px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                        <div>
                            <div style="font-weight:800;font-size:15px;color:#334155;display:flex;align-items:center;gap:8px;">
                                <i data-icon="xcircle"></i> Trip Cancelled — No Payout or Refund Required
                            </div>
                            <div style="font-size:13px;color:#64748b;margin-top:4px;">
                                This trip was cancelled before payment was completed by the traveler. Zero funds were collected, so no monetary refund is necessary.
                            </div>
                        </div>
                        <div>
                            <span class="sa-tc-badge" style="background:#e2e8f0;color:#475569;font-weight:700;padding:8px 16px;border-radius:8px;">Unpaid Trip</span>
                        </div>
                    </div>
                `;
            } else {
                cancellationBannerHTML = `
                    <div style="background:${isRefunded ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)'};border:1.5px solid ${isRefunded ? '#10b981' : '#f59e0b'};border-radius:14px;padding:18px 24px;margin-top:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
                        <div>
                            <div style="font-weight:800;font-size:15px;color:${isRefunded ? '#065f46' : '#92400e'};display:flex;align-items:center;gap:8px;">
                                <i data-icon="${isRefunded ? 'check' : 'creditcard'}"></i>
                                ${isRefunded ? 'Trip Cancelled & Refund Processed' : 'Trip Cancelled — Refund Authorization Pending'}
                            </div>
                            <div style="font-size:13px;color:${isRefunded ? '#047857' : '#b45309'};margin-top:4px;">
                                ${isRefunded 
                                    ? `Refund of ${formatMoney(ref.refundAmount)} (${ref.refundPercent}%) was issued to ${ref.destinationAccount}.` 
                                    : 'Traveler cancellation request approved. Super Admin authorization is required to process the refund.'
                                }
                            </div>
                        </div>
                        <div>
                            ${isRefunded ? `
                                <button type="button" class="sa-btn-primary" style="background:#10b981;color:#fff;border-radius:10px;font-size:13px;padding:9px 18px;font-weight:700;" onclick="window.openCancellationRefundModal('${trip.id}')">
                                    <i data-icon="check"></i> View Refund Details
                                </button>
                            ` : `
                                <button type="button" class="sa-btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:10px;font-size:14px;padding:10px 22px;font-weight:800;box-shadow:0 4px 14px rgba(245,158,11,0.35);" onclick="window.openCancellationRefundModal('${trip.id}')">
                                    <i data-icon="creditcard"></i> Process Refund Now
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }
        }

        const coverUrl = getDestinationCoverPhoto(trip);
        const statusStr = (trip.status || 'planned').toLowerCase();
        let badgeBg = 'rgba(59, 130, 246, 0.3)';
        let badgeColor = '#93c5fd';
        let badgeBorder = 'rgba(59, 130, 246, 0.6)';

        if (statusStr === 'cancelled') {
            badgeBg = 'rgba(239, 68, 68, 0.3)';
            badgeColor = '#fca5a5';
            badgeBorder = 'rgba(244, 63, 94, 0.6)';
        } else if (statusStr === 'completed') {
            badgeBg = 'rgba(16, 185, 129, 0.3)';
            badgeColor = '#6ee7b7';
            badgeBorder = 'rgba(16, 185, 129, 0.6)';
        } else if (statusStr === 'ongoing' || statusStr === 'in-progress') {
            badgeBg = 'rgba(14, 165, 233, 0.3)';
            badgeColor = '#7dd3fc';
            badgeBorder = 'rgba(14, 165, 233, 0.6)';
        } else if (statusStr === 'requested' || statusStr === 'planning') {
            badgeBg = 'rgba(245, 158, 11, 0.3)';
            badgeColor = '#fde68a';
            badgeBorder = 'rgba(245, 158, 11, 0.6)';
        }

        page.innerHTML = `
            <div class="sa-form-layout">
                <div class="sa-form-main">
                    <a href="superuser_trips.html" class="sa-back-link" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#38bdf8;text-decoration:none;margin-bottom:16px;"><i data-icon="arrowleft"></i> Back to Trips</a>
                    
                    <div class="trip-hero-section" style="position:relative;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px -15px rgba(0,0,0,0.5);min-height:300px;display:flex;align-items:flex-end;margin-bottom:24px;">
                        <img src="${coverUrl}" alt="${escapeHTML(trip.title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;filter:brightness(0.85);" />
                        <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.1) 100%);z-index:2;"></div>
                        <div class="trip-hero-content" style="position:relative;z-index:3;padding:32px;width:100%;box-sizing:border-box;">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                                <span style="background:${badgeBg};color:${badgeColor};border:1px solid ${badgeBorder};backdrop-filter:blur(8px);padding:6px 16px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeHTML(statusLabel(trip))}</span>
                                ${isCancelled ? (isRefunded 
                                    ? `<span style="background:rgba(16,185,129,0.25);color:#a7f3d0;border:1px solid rgba(16,185,129,0.5);backdrop-filter:blur(8px);padding:6px 16px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.06em;"><i data-icon="check"></i> REFUNDED</span>`
                                    : (paid 
                                        ? `<span style="background:rgba(245,158,11,0.25);color:#fde68a;border:1px solid rgba(245,158,11,0.5);backdrop-filter:blur(8px);padding:6px 16px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.06em;"><i data-icon="alertcircle"></i> REFUND ACTION PENDING</span>`
                                        : `<span style="background:rgba(148,163,184,0.25);color:#cbd5e1;border:1px solid rgba(148,163,184,0.4);backdrop-filter:blur(8px);padding:6px 16px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.06em;"><i data-icon="xcircle"></i> UNPAID TRIP</span>`
                                      )
                                ) : ''}
                            </div>
                            <h1 class="th-title" style="font-size:36px;font-weight:900;color:#fff;margin:0 0 10px;text-shadow:0 4px 14px rgba(0,0,0,0.6);letter-spacing:-0.02em;line-height:1.2;">${escapeHTML(trip.title)}</h1>
                            <div class="th-location" style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.95);font-size:16px;font-weight:600;"><i data-icon="mappin" style="color:#38bdf8;"></i> ${escapeHTML(trip.destination)} &bull; <span style="color:rgba(255,255,255,0.75);">Trip ID: #${escapeHTML(trip.id)}</span></div>
                        </div>
                    </div>

                    ${cancellationBannerHTML}

                    <div class="sa-stats-grid-4" style="margin-top:24px;">
                        <div class="sa-stat-card sa-stat-blue"><div class="sa-stat-icon-wrap"><i data-icon="calendar"></i></div><div class="sa-stat-number" style="font-size:14px;line-height:1.4;">${escapeHTML(formatDateRange(trip))}</div><div class="sa-stat-label">Duration</div></div>
                        <div class="sa-stat-card sa-stat-green"><div class="sa-stat-icon-wrap"><i data-icon="users"></i></div><div class="sa-stat-number">${trip.travelersCount || 1}</div><div class="sa-stat-label">Travelers</div></div>
                        <div class="sa-stat-card sa-stat-purple"><div class="sa-stat-icon-wrap"><i data-icon="dollar"></i></div><div class="sa-stat-number">${formatMoney(Number(trip.budget || 0))}</div><div class="sa-stat-label">Budget</div></div>
                        <div class="sa-stat-card sa-stat-orange"><div class="sa-stat-icon-wrap"><i data-icon="activity"></i></div><div class="sa-stat-number">${trip.progress || 0}%</div><div class="sa-stat-label">Progress</div></div>
                    </div>

                    <div class="sa-form-card" style="margin-top:24px;">
                        <h2 class="sa-section-title">Trip Overview</h2>
                        <p class="sa-section-desc">${escapeHTML(trip.notes || 'Live trip record from backend workflow state.')}</p>
                        <div class="sa-info-grid">
                            <div class="sa-info-item"><div class="sai-icon bg-blue"><i data-icon="mappin"></i></div><div class="sai-text"><div class="sai-label">Destination</div><div class="sai-value">${escapeHTML(trip.destination)}</div></div></div>
                            <div class="sa-info-item"><div class="sai-icon bg-green"><i data-icon="user"></i></div><div class="sai-text"><div class="sai-label">Traveler</div><div class="sai-value">${escapeHTML(trip.travelerName)}</div></div></div>
                            <div class="sa-info-item"><div class="sai-icon bg-purple"><i data-icon="compass"></i></div><div class="sai-text"><div class="sai-label">Guide</div><div class="sai-value">${escapeHTML(trip.guide?.name || 'Pending')}</div></div></div>
                            <div class="sa-info-item"><div class="sai-icon bg-orange"><i data-icon="briefcase"></i></div><div class="sai-text"><div class="sai-label">Vendor</div><div class="sai-value">${escapeHTML(trip.vendor?.name || 'Pending')}</div></div></div>
                        </div>
                    </div>

                    <div class="sa-btn-row" style="margin-top:24px;">
                        <button class="sa-btn-primary" data-dd-action="route" data-dd-target="superuser_trips.html">Back to Trips</button>
                        ${isCancelled && paid ? (isRefunded ? `<button type="button" class="sa-btn-primary" style="background:#10b981;font-weight:700;" onclick="window.openCancellationRefundModal('${trip.id}')"><i data-icon="check"></i> View Refund (${formatMoney(ref.refundAmount)})</button>` : `<button type="button" class="sa-btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);font-weight:800;box-shadow:0 4px 14px rgba(245,158,11,0.35);" onclick="window.openCancellationRefundModal('${trip.id}')"><i data-icon="creditcard"></i> Process Refund</button>`) : ''}
                        <button class="sa-btn-secondary" onclick="window.print()"><i data-icon="printer"></i> Print Details</button>
                    </div>
                </div>

                <div class="sa-info-card">
                    <h3 class="sa-section-title" style="font-size:15px;">Schedule Progress</h3>
                    <div style="margin-top:12px;">
                        <div class="sa-stat-label" style="margin-bottom:8px;">Completion</div>
                        <div class="sa-trip-progress-bar" style="height:8px;"><div class="sa-trip-progress-fill" style="width:${stats.percent}%;"></div></div>
                        <div class="sa-act-time" style="margin-top:8px;text-align:right;">${stats.completed}/${stats.total} completed</div>
                    </div>
                    <div class="sa-activity-list" style="padding:16px 0;">
                        ${ensureTripSchedule(trip).slice(0, 5).map((item) => `<div class="sa-activity-item"><div class="sa-activity-icon sa-ai-blue"><i data-icon="${item.owner === 'vendor' ? 'truck' : 'user'}"></i></div><div class="sa-activity-content"><div class="sa-act-title">${escapeHTML(item.title)}</div><div class="sa-act-desc">${escapeHTML(scheduleStatusText(item.status))} - ${escapeHTML(item.location)}</div></div></div>`).join('')}
                    </div>
                </div>
            </div>
        `;
        iconRefresh(page);
    }

    function renderSuperuserSupport(state) {
        if (currentPage() !== 'superuser_support.html') return;
        const page = document.querySelector('.sa-dashboard');
        if (!page) return;
        const supportUsers = (state.users || []).filter((user) => user.role === ROLE_LABELS.support || user.role === 'Support Executive');
        const issues = state.issues || [];
        const openIssues = issues.filter((issue) => issue.status !== 'Resolved');
        const resolved = issues.filter((issue) => issue.status === 'Resolved');
        page.innerHTML = `
            <div class="page-header"><div><h1>Support Team Management</h1><p>Manage support executives and real support workload</p></div><button class="sa-btn-primary" data-dd-action="route" data-dd-target="superuser_add_user.html"><i data-icon="plus"></i> Add Executive</button></div>
            <div class="stats-top"><div class="stat-card" style="background:linear-gradient(135deg,#f97316,#ea580c);min-height:100px;"><div style="display:flex;justify-content:space-between;"><div class="stat-bottom"><i data-icon="headphones"></i><span class="stat-title">Support Team</span></div><div class="stat-value">${supportUsers.length}</div></div></div><div class="stat-card" style="background:linear-gradient(135deg,#22c55e,#16a34a);min-height:100px;"><div style="display:flex;justify-content:space-between;"><div class="stat-bottom"><i data-icon="checkcircle"></i><span class="stat-title">Active Now</span></div><div class="stat-value">${supportUsers.filter((user) => user.status === 'Active').length}</div></div></div><div class="stat-card" style="background:linear-gradient(135deg,#3b82f6,#2563eb);min-height:100px;"><div style="display:flex;justify-content:space-between;"><div class="stat-bottom"><i data-icon="flag"></i><span class="stat-title">Active Tickets</span></div><div class="stat-value">${openIssues.length}</div></div></div><div class="stat-card" style="background:linear-gradient(135deg,#a855f7,#9333ea);min-height:100px;"><div style="display:flex;justify-content:space-between;"><div class="stat-bottom"><i data-icon="clock"></i><span class="stat-title">Resolved</span></div><div class="stat-value">${resolved.length}</div></div></div></div>
            <div class="filter-bar"><div class="search-inner"><i data-icon="search"></i><input type="text" placeholder="Search support executives..." /></div><div><button class="btn-primary" style="background:var(--bg-card-alt, #fff);color:var(--text-primary, #475569);border:1px solid var(--border-color, #e2e8f0);" data-dd-action="route" data-dd-target="superuser_users.html"><i data-icon="users"></i> Manage Users</button></div></div>
            <div class="support-grid">${supportUsers.map((user) => `<div class="support-card"><div class="support-header"><div style="display:flex;gap:12px;"><div class="support-avatar orange">${escapeHTML(initialsFor(user.name))}</div><div><div class="support-name">${escapeHTML(user.name)}</div><span class="support-status ${user.status === 'Active' ? 'active' : ''}">${escapeHTML(user.status || 'Active')}</span></div></div><button class="sa-btn-icon-danger" data-dd-action="route" data-dd-target="superuser_users.html"><i data-icon="edit"></i></button></div><div class="support-dept">Support Executive</div><div class="support-contact"><div><i data-icon="mail"></i> ${escapeHTML(user.email)}</div><div><i data-icon="phone"></i> ${escapeHTML(user.phone || '-')}</div><div><i data-icon="clock"></i> Joined: ${escapeHTML(formatShortDate(user.joined))}</div></div><div class="support-stats-row border-bottom"><div>Open Tickets<span class="val" style="color:#3b82f6;">${openIssues.length}</span></div><div style="text-align:right;">Resolved<span class="val" style="color:#22c55e;">${resolved.length}</span></div></div><div class="support-last-active">Live backend user</div><div class="action-buttons" style="margin-top:14px;display:flex;gap:8px;"><button class="btn-view" style="flex:1;" data-dd-action="route" data-dd-target="superuser_users.html"><i data-icon="eye"></i> Manage</button></div></div>`).join('') || emptyPanel('No support executives yet. Add one from User Management.')}</div>
        `;
        iconRefresh(page);
    }

    function userRoleCounts(users) {
        return (users || []).reduce((acc, user) => {
            acc[user.role || 'Unknown'] = (acc[user.role || 'Unknown'] || 0) + 1;
            return acc;
        }, {});
    }

    function tripStatusCounts(trips) {
        return (trips || []).reduce((acc, trip) => {
            const label = statusLabel(trip);
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {});
    }

    function monthKey(value) {
        const date = dateValue(value) || new Date();
        return date.toLocaleDateString('en-US', { month: 'short' });
    }

    function lastSixMonthLabels() {
        const labels = [];
        const date = new Date();
        date.setDate(1);
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(date);
            d.setMonth(date.getMonth() - i);
            labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
        }
        return labels;
    }

    function renderSuperuserReports(state) {
        if (currentPage() !== 'superuser_reports.html') return;
        const page = document.querySelector('.sa-dashboard');
        if (!page) return;
        const users = state.users || [];
        const trips = allActiveTrips(state);
        const issues = state.issues || [];
        const activeUsers = users.filter((user) => (user.status || 'Active') === 'Active');
        const resolvedIssues = issues.filter((issue) => issue.status === 'Resolved').length;
        const satisfaction = issues.length ? Math.round((resolvedIssues / issues.length) * 100) : 0;
        const revenue = tripRevenue(trips);
        const roleCounts = userRoleCounts(users);
        const statusCounts = tripStatusCounts(trips);
        const months = lastSixMonthLabels();
        const monthly = months.map((label) => {
            const monthTrips = trips.filter((trip) => monthKey(trip.createdAt || trip.startDate) === label);
            return {
                label,
                revenue: tripRevenue(monthTrips),
                bookings: monthTrips.length,
            };
        });
        const maxRevenue = Math.max(1, ...monthly.map((item) => item.revenue));
        const maxBookings = Math.max(1, ...monthly.map((item) => item.bookings));
        const roleEntries = Object.entries(roleCounts);
        const statusEntries = Object.entries(statusCounts);
        const roleTotal = Math.max(1, users.length);
        const roleColors = ['#0ea5e9', '#f97316', '#8b5cf6', '#84cc16', '#14b8a6', '#ef4444'];
        let cursor = 0;
        const conic = roleEntries.map(([role, count], index) => {
            const start = cursor;
            const end = cursor + Math.round((count / roleTotal) * 100);
            cursor = end;
            return `${roleColors[index % roleColors.length]} ${start}% ${end}%`;
        }).join(', ') || '#e2e8f0 0% 100%';

        page.innerHTML = `
            <div class="welcome-banner" style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#0ea5e9,#3b82f6)!important;padding:24px!important;border-radius:14px!important;margin-bottom:24px!important;color:#fff;">
                <div style="display:flex;align-items:center;gap:16px;"><div style="width:48px;height:48px;background:rgba(255,255,255,.2);border-radius:10px;display:flex;align-items:center;justify-content:center;"><i data-icon="activity"></i></div><div><h1 style="color:#fff!important;font-size:20px!important;">Analytics & Reports</h1><p style="color:rgba(255,255,255,.9)!important;font-size:13px!important;">Real-time platform performance insights</p></div></div>
                <button class="btn-primary" data-dd-action="download-super-report" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);color:#fff;box-shadow:none;"><i data-icon="download"></i> Download PDF</button>
            </div>
            <div class="stats-top">
                <div class="stat-card-mini"><div class="icon-badge" style="background:#e0f2fe;color:#0ea5e9;"><i data-icon="dollar"></i></div><div class="label">Total Revenue</div><div class="value">${formatMoney(revenue)}</div><div class="trend">Real data</div></div>
                <div class="stat-card-mini"><div class="icon-badge" style="background:#d1fae5;color:#10b981;"><i data-icon="map"></i></div><div class="label">Total Trips</div><div class="value">${trips.length}</div><div class="trend">Live</div></div>
                <div class="stat-card-mini"><div class="icon-badge" style="background:#f3e8ff;color:#a855f7;"><i data-icon="users"></i></div><div class="label">Active Users</div><div class="value">${activeUsers.length}</div><div class="trend">${users.length} total</div></div>
                <div class="stat-card-mini"><div class="icon-badge" style="background:#ffedd5;color:#f97316;"><i data-icon="zap"></i></div><div class="label">Issue Resolution</div><div class="value">${satisfaction}%</div><div class="trend">${resolvedIssues}/${issues.length || 0} resolved</div></div>
            </div>
            <div class="chart-card-full"><div class="chart-title">Revenue Trend</div><div class="chart-subtitle">Revenue from real trips over the last 6 months</div><div class="rev-trend-chart" style="padding-top:10px;display:flex;align-items:flex-end;gap:14px;height:180px;">${monthly.map((item) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;height:100%;justify-content:flex-end;"><div style="width:100%;max-width:58px;height:${Math.max(4, Math.round((item.revenue / maxRevenue) * 100))}%;background:#38bdf8;border-radius:6px 6px 0 0;"></div><div style="font-size:11px;color:var(--text-secondary, #64748b);">${item.label}</div></div>`).join('')}</div></div>
            <div class="charts-row">
                <div class="chart-card"><div class="chart-title">User Distribution</div><div class="chart-subtitle">Platform breakdown by role</div><div style="display:flex;align-items:center;gap:36px;justify-content:center;margin-top:20px;flex-wrap:wrap;"><div class="pie-chart-container" style="margin:0;width:130px;height:130px;background:conic-gradient(${conic});position:relative;"><div style="position:absolute;inset:25px;background:var(--bg-surface, #fff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--text-primary, #0f172a);flex-direction:column;"><span>${users.length}</span><span>Users</span></div></div><div style="display:flex;flex-direction:column;gap:12px;font-size:12px;color:var(--text-secondary, #475569);font-weight:500;">${roleEntries.map(([role, count], index) => `<div style="display:flex;align-items:center;gap:8px;min-width:180px;"><span style="width:12px;height:12px;border-radius:50%;background:${roleColors[index % roleColors.length]};"></span>${escapeHTML(role)}<span style="font-weight:700;color:var(--text-primary, #0f172a);margin-left:auto;">${Math.round((count / roleTotal) * 100)}%</span></div>`).join('') || '<div>No users yet</div>'}</div></div></div>
                <div class="chart-card"><div class="chart-title">Trip Status Overview</div><div class="chart-subtitle">Current trip statuses platform-wide</div><div class="chart-layout-wrapper" style="height:150px;margin-top:24px;"><div class="chart-grid-area" style="gap:20px;padding-left:10px;">${statusEntries.map(([label, count], index) => `<div class="bar-col"><div class="bar-tooltip">${escapeHTML(label)}: ${count}</div><div class="bar" style="height:${Math.max(4, Math.round((count / Math.max(1, trips.length)) * 100))}%;background:${roleColors[index % roleColors.length]};width:70px;"></div></div>`).join('') || '<div style="color:var(--text-secondary, #64748b);">No trips yet</div>'}</div></div><div class="x-axis-labels" style="padding-left:38px;gap:20px;font-size:10.5px;">${statusEntries.map(([label]) => `<div>${escapeHTML(label)}</div>`).join('')}</div></div>
            </div>
            <div class="chart-card-full"><div class="chart-title">Monthly Performance Comparison</div><div class="chart-subtitle">Revenue vs bookings from real trip records</div><div class="month-chart-wrapper">${monthly.map((item) => `<div class="month-bar-group"><div class="month-bar rev" style="height:${Math.max(3, Math.round((item.revenue / maxRevenue) * 100))}%;"></div><div class="month-bar book" style="height:${Math.max(3, Math.round((item.bookings / maxBookings) * 100))}%;"></div></div>`).join('')}</div><div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#64748b;font-weight:500;padding:0 4%;">${monthly.map((item) => `<div>${item.label}</div>`).join('')}</div><div style="display:flex;justify-content:center;gap:16px;margin-top:20px;font-size:12px;color:#475569;"><div style="display:flex;align-items:center;gap:6px;"><span class="legend-dot c-cyan" style="width:10px;height:10px;border-radius:2px;"></span> Revenue</div><div style="display:flex;align-items:center;gap:6px;"><span class="legend-dot c-teal" style="width:10px;height:10px;border-radius:2px;"></span> Bookings</div></div></div>
            
            <!-- Completed Trip Budget Share & Stakeholder Payout Matrix -->
            <div class="chart-card-full" style="margin-top:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <div>
                        <div class="chart-title">Completed Trips Budget Share & Stakeholder Payout Matrix</div>
                        <div class="chart-subtitle">Allocate and disburse revenue shares to Travel Partners, Tour Guides, Vendors, and Support Executives</div>
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">
                        <thead>
                            <tr style="border-bottom:2px solid var(--border-color,#e2e8f0);color:var(--text-secondary,#64748b);">
                                <th style="padding:10px 12px;">Trip ID & Title</th>
                                <th style="padding:10px 12px;">Total Budget</th>
                                <th style="padding:10px 12px;">Partner Share</th>
                                <th style="padding:10px 12px;">Guide Share</th>
                                <th style="padding:10px 12px;">Vendor Share</th>
                                <th style="padding:10px 12px;">Support Share</th>
                                <th style="padding:10px 12px;">Status</th>
                                <th style="padding:10px 12px;text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(trips.filter(t => t.status === 'completed')).map(trip => {
                                const shares = trip.budgetShare || {};
                                const totalB = Number(trip.budget || 0);
                                const pAmt = 0;
                                const gPct = shares.guidePercent !== undefined ? shares.guidePercent : 50;
                                const vPct = shares.vendorPercent !== undefined ? shares.vendorPercent : 50;
                                const gAmt = shares.guideAmount ?? Math.round((totalB * gPct) / 100);
                                const vAmt = shares.vendorAmount ?? Math.round((totalB * vPct) / 100);
                                const sAmt = 0;
                                const isDisbursed = !!shares.disbursed;
                                return `
                                    <tr style="border-bottom:1px solid var(--border-color,#e2e8f0);">
                                        <td style="padding:12px;"><strong>${escapeHTML(trip.id)}</strong><br><span style="color:var(--text-secondary,#64748b);font-size:12px;">${escapeHTML(trip.title)}</span></td>
                                        <td style="padding:12px;font-weight:700;color:#10b981;">${formatMoney(totalB)}</td>
                                        <td style="padding:12px;color:#64748b;font-weight:600;font-size:12px;">₹0 <span style="font-size:11px;opacity:0.8;">(Salaried)</span></td>
                                        <td style="padding:12px;color:#7e22ce;font-weight:600;">${formatMoney(gAmt)} <span style="font-size:11px;opacity:0.8;">(${gPct}%)</span></td>
                                        <td style="padding:12px;color:#c2410c;font-weight:600;">${formatMoney(vAmt)} <span style="font-size:11px;opacity:0.8;">(${vPct}%)</span></td>
                                        <td style="padding:12px;color:#64748b;font-weight:600;font-size:12px;">₹0 <span style="font-size:11px;opacity:0.8;">(Salaried)</span></td>
                                        <td style="padding:12px;">
                                            <span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:99px;background:${isDisbursed ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};color:${isDisbursed ? '#10b981' : '#d97706'};">
                                                ${isDisbursed ? '✓ Paid Out' : '⏱ Pending'}
                                            </span>
                                        </td>
                                        <td style="padding:12px;text-align:right;">
                                            <button onclick="window.openBudgetShareModal('${escapeHTML(trip.id)}')" style="padding:6px 14px;border:none;border-radius:8px;background:${isDisbursed ? '#e0f2fe' : 'linear-gradient(135deg,#10b981,#059669)'};color:${isDisbursed ? '#0369a1' : '#fff'};font-weight:700;font-size:12px;cursor:pointer;">
                                                ${isDisbursed ? 'Edit Shares' : 'Disburse Shares'}
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('') || `<tr><td colspan="8" style="padding:20px;text-align:center;color:var(--text-secondary,#64748b);">No completed trips found yet. Complete a trip to disburse budget shares.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="custom-report-btn"><div><div class="custom-report-icon"><i data-icon="filetext"></i></div><div><div class="cr-title">Generate Custom Report</div><div class="cr-desc">Download current real-time analytics as a PDF file</div></div></div><div style="display:flex;gap:10px;"><button class="btn-primary" data-dd-action="download-super-report" style="font-size:13px;"><i data-icon="download"></i> Generate PDF</button></div></div>
        `;
        iconRefresh(page);
    }

    function pdfEscape(value) {
        return String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, ' ');
    }

    function buildSimplePdf(lines) {
        const commands = ['BT', '/F1 18 Tf', '72 760 Td', `(${pdfEscape(lines[0] || 'Dream Destination Report')}) Tj`, '/F1 10 Tf', '0 -26 Td'];
        lines.slice(1).forEach((line) => {
            commands.push(`(${pdfEscape(line).slice(0, 95)}) Tj`, '0 -15 Td');
        });
        commands.push('ET');
        const content = commands.join('\n');
        const objects = [
            '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
            '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
            '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
            '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
            `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
        ];
        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        objects.forEach((object) => {
            offsets.push(pdf.length);
            pdf += `${object}\n`;
        });
        const xref = pdf.length;
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach((offset) => {
            pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
        });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
        return new Blob([pdf], { type: 'application/pdf' });
    }

    function downloadSuperuserReportPdf() {
        const state = loadState();
        const users = state.users || [];
        const trips = allActiveTrips(state);
        const issues = state.issues || [];
        const roleCounts = userRoleCounts(users);
        const statusCounts = tripStatusCounts(trips);
        const lines = [
            'Dream Destination Super Admin Report',
            `Generated: ${new Date().toLocaleString()}`,
            `Total Users: ${users.length}`,
            `Active Users: ${users.filter((user) => (user.status || 'Active') === 'Active').length}`,
            `Inactive Users: ${users.filter((user) => user.status === 'Inactive').length}`,
            `Suspended Users: ${users.filter((user) => user.status === 'Suspended').length}`,
            `Total Trips: ${trips.length}`,
            `Total Revenue: ${formatMoney(tripRevenue(trips))}`,
            `Open Issues: ${issues.filter((issue) => issue.status !== 'Resolved').length}`,
            '',
            'Users By Role:',
            ...Object.entries(roleCounts).map(([role, count]) => `${role}: ${count}`),
            '',
            'Trips By Status:',
            ...Object.entries(statusCounts).map(([status, count]) => `${status}: ${count}`),
        ];
        const link = document.createElement('a');
        link.href = URL.createObjectURL(buildSimplePdf(lines));
        link.download = `dream-destination-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function renderAssignedTravelersWidget(state) {
        let asgStore = {};
        try {
            asgStore = JSON.parse(localStorage.getItem('dd_traveler_assignments_v1') || '{}');
        } catch (_) {}

        const workflowState = state || (typeof readWorkflowState === 'function' ? readWorkflowState() : {});
        const workflowUsers = workflowState.users || [];
        const travelers = workflowUsers.filter(u => u.role === 'Traveler');

        const curUser = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) || { name: 'Dileep', email: 'partner@example.com', role: 'Travel Partner' };
        const curId = (curUser.id || curUser.email || '').toLowerCase();
        const curName = (curUser.name || '').toLowerCase();
        const isSupport = (curUser.role === 'Support Executive' || curUser.role === 'Support' || window.location.pathname.includes('/support/'));

        // Filter assigned travelers for active user context
        const assigned = travelers.map(tr => {
            const key = tr.id || tr.email?.toLowerCase();
            let asg = asgStore[key] || (tr.email ? asgStore[tr.email.toLowerCase()] : null);
            if (!asg && typeof window.autoAssignTraveler === 'function') {
                asg = window.autoAssignTraveler(key, workflowUsers);
            }
            return { traveler: tr, assignment: asg };
        }).filter(({ traveler: tr, assignment: asg }) => {
            if (!asg) return true;
            if (isSupport) {
                if (!asg.supportId && !asg.supportName) return true;
                return (
                    (asg.supportId && (asg.supportId.toLowerCase() === curId || asg.supportId.toLowerCase() === curName)) ||
                    (asg.supportName && (asg.supportName.toLowerCase() === curName || curName.includes(asg.supportName.toLowerCase()))) ||
                    true
                );
            } else {
                if (!asg.partnerId && !asg.partnerName) return true;
                return (
                    (asg.partnerId && (asg.partnerId.toLowerCase() === curId || asg.partnerId.toLowerCase() === curName)) ||
                    (asg.partnerName && (asg.partnerName.toLowerCase() === curName || curName.includes(asg.partnerName.toLowerCase()))) ||
                    true
                );
            }
        });

        // 1. Travel Partner Dashboard Table
        const tpTbody = document.getElementById('tp-assigned-travelers-tbody');
        const tpBadge = document.getElementById('assigned-travelers-count-badge');
        if (tpTbody) {
            if (tpBadge) tpBadge.textContent = `${assigned.length} Assigned`;
            tpTbody.innerHTML = assigned.length ? assigned.map(({ traveler: tr, assignment: asg }) => {
                const sName = asg ? (asg.supportName || 'Assigned Support') : 'Support Exec';
                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td class="p-4">
                            <div style="font-weight:700; color:#0f172a; font-size:14px;">${escapeHTML(tr.name)}</div>
                            <div style="font-size:11px; color:#64748b;">ID: ${escapeHTML(tr.id)}</div>
                        </td>
                        <td class="p-4">
                            <div style="font-size:13px; color:#334155; font-weight:500;">${escapeHTML(tr.email)}</div>
                            <div style="font-size:12px; color:#64748b;">${escapeHTML(tr.phone || 'No phone')}</div>
                        </td>
                        <td class="p-4">
                            <span style="font-size:12px; font-weight:600; background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="user" style="width:12px;height:12px;"></i> ${escapeHTML(sName)}
                            </span>
                        </td>
                        <td class="p-4">
                            <span style="font-size:12px; font-weight:600; background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="check" style="width:12px;height:12px;"></i> Assigned
                            </span>
                        </td>
                    </tr>
                `;
            }).join('') : `<tr><td colspan="4" class="p-4 text-center text-gray-500">No assigned travelers found.</td></tr>`;
            iconRefresh(tpTbody);
        }

        // 2. Travel Partner Schedules Page Table
        const schedTbody = document.getElementById('schedules-assigned-travelers-tbody');
        const schedBadge = document.getElementById('schedules-assigned-count-badge');
        if (schedTbody) {
            if (schedBadge) schedBadge.textContent = `${assigned.length} Assigned`;
            schedTbody.innerHTML = assigned.length ? assigned.map(({ traveler: tr, assignment: asg }) => {
                const sName = asg ? (asg.supportName || 'Assigned Support') : 'Support Exec';
                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:12px;">
                            <div style="font-weight:700; color:#0f172a; font-size:14px;">${escapeHTML(tr.name)}</div>
                            <div style="font-size:11px; color:#64748b;">ID: ${escapeHTML(tr.id)}</div>
                        </td>
                        <td style="padding:12px;">
                            <div style="font-size:13px; color:#334155;">${escapeHTML(tr.email)}</div>
                            <div style="font-size:12px; color:#64748b;">${escapeHTML(tr.phone || '-')}</div>
                        </td>
                        <td style="padding:12px;">
                            <span style="font-size:12px; font-weight:600; background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="user" style="width:12px;height:12px;"></i> ${escapeHTML(sName)}
                            </span>
                        </td>
                        <td style="padding:12px;">
                            <span style="font-size:12px; font-weight:600; background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="check" style="width:12px;height:12px;"></i> Active
                            </span>
                        </td>
                    </tr>
                `;
            }).join('') : `<tr><td colspan="4" style="padding:16px; text-align:center; color:#64748b;">No assigned travelers found.</td></tr>`;
            iconRefresh(schedTbody);
        }

        // 3. Support Executive Dashboard Table
        const supTbody = document.getElementById('support-assigned-travelers-tbody');
        const supBadge = document.getElementById('support-assigned-travelers-count-badge');
        if (supTbody) {
            if (supBadge) supBadge.textContent = `${assigned.length} Assigned`;
            supTbody.innerHTML = assigned.length ? assigned.map(({ traveler: tr, assignment: asg }) => {
                const pName = asg ? (asg.partnerName || 'Assigned Partner') : 'Travel Partner';
                return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:12px;">
                            <div style="font-weight:700; color:#0f172a; font-size:14px;">${escapeHTML(tr.name)}</div>
                            <div style="font-size:11px; color:#64748b;">ID: ${escapeHTML(tr.id)}</div>
                        </td>
                        <td style="padding:12px;">
                            <div style="font-size:13px; color:#334155;">${escapeHTML(tr.email)}</div>
                            <div style="font-size:12px; color:#64748b;">${escapeHTML(tr.phone || '-')}</div>
                        </td>
                        <td style="padding:12px;">
                            <span style="font-size:12px; font-weight:600; background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="user" style="width:12px;height:12px;"></i> ${escapeHTML(pName)}
                            </span>
                        </td>
                        <td style="padding:12px;">
                            <span style="font-size:12px; font-weight:600; background:#f0fdf4; color:#166534; padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
                                <i data-icon="checkcircle" style="width:12px;height:12px;"></i> Active
                            </span>
                        </td>
                    </tr>
                `;
            }).join('') : `<tr><td colspan="4" style="padding:16px; text-align:center; color:#64748b;">No assigned travelers found.</td></tr>`;
            iconRefresh(supTbody);
        }

        // 4. Support Executive Coordination Panel Grid
        const supCoordGrid = document.getElementById('support-coordination-travelers-grid');
        if (supCoordGrid) {
            supCoordGrid.innerHTML = assigned.length ? assigned.map(({ traveler: tr, assignment: asg }) => {
                const pName = asg ? (asg.partnerName || 'Assigned Partner') : 'Travel Partner';
                const initial = tr.name ? tr.name.charAt(0).toUpperCase() : 'T';
                return `
                    <div class="contact-card" style="background:var(--bg-surface,#fff); border:1px solid var(--border-color,#e2e8f0); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px;">
                        <div class="contact-card-inner" style="display:flex; gap:12px; align-items:center;">
                            <div class="contact-avatar" style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg, #06b6d4, #0ea5e9); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; flex-shrink:0;">${initial}</div>
                            <div>
                                <div style="font-weight:700; font-size:14px; color:var(--text-primary,#0f172a);">${escapeHTML(tr.name)}</div>
                                <div style="font-size:12px; color:#0284c7; font-weight:600;">Partner: ${escapeHTML(pName)}</div>
                                <div style="font-size:11px; color:#64748b; margin-top:2px;">${escapeHTML(tr.email)}</div>
                            </div>
                        </div>
                        <button class="btn-full" style="background:linear-gradient(135deg,#06b6d4,#0ea5e9); color:white; border:none; border-radius:8px; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;" onclick="alert('Traveler Details:\\nName: ${escapeHTML(tr.name)}\\nEmail: ${escapeHTML(tr.email)}\\nPhone: ${escapeHTML(tr.phone || 'N/A')}\\nPartner: ${escapeHTML(pName)}')">
                            <i data-icon="phone"></i> Contact Traveler
                        </button>
                    </div>
                `;
            }).join('') : `<div style="grid-column:1/-1; padding:16px; text-align:center; color:#64748b;">No assigned travelers found.</div>`;
            iconRefresh(supCoordGrid);
        }
    }

    function renderPartnerDashboard(state) {
        if (currentPage() !== 'travelPartner_dashboard.html') return;
        const trips = allActiveTrips(state);
        // Only count ACTIVE (non-completed, non-cancelled) trips for assignment stats
        const activeOnly = trips.filter((trip) => !['completed', 'cancelled'].includes(trip.status));
        const activeTrips = activeOnly.length;
        const vendorsAssigned = activeOnly.filter((trip) => trip.vendor && trip.vendorStatus !== 'Rejected').length;
        const guidesAssigned = activeOnly.filter((trip) => trip.guide && trip.guideStatus !== 'Rejected').length;
        const allItems = getPartnerNotificationItems(state);
        const unreadItems = allItems.filter(item => item.isUnread);
        const issuesCount = unreadItems.filter((i) => i.categories.includes('Urgent') || i.type === 'Reported Issue' || i.type === 'Trip Cancellation').length;

        const elActive = document.getElementById('tp-stat-active-trips');
        if (elActive) elActive.textContent = String(activeTrips).padStart(2, '0');

        const elVendors = document.getElementById('tp-stat-vendors');
        if (elVendors) elVendors.textContent = String(vendorsAssigned).padStart(2, '0');

        const elGuides = document.getElementById('tp-stat-guides');
        if (elGuides) elGuides.textContent = String(guidesAssigned).padStart(2, '0');

        const elIssues = document.getElementById('tp-stat-issues');
        if (elIssues) elIssues.textContent = String(issuesCount).padStart(2, '0');

        const statValues = document.querySelectorAll('.stats-grid .stat-value');
        [activeTrips, vendorsAssigned, guidesAssigned, issuesCount].forEach((value, index) => {
            if (statValues[index]) statValues[index].textContent = String(value).padStart(2, '0');
        });

        const tbody = document.querySelector('.tp-recent-section tbody');
        if (tbody) {
            tbody.innerHTML = trips.slice(0, 8).map((trip) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td class="p-4"><span class="font-semibold" style="color:#2563eb;">${trip.id}</span></td>
                    <td class="p-4 font-medium" style="color:#0f172a;">${escapeHTML(trip.travelerName)}</td>
                    <td class="p-4" style="color:#475569;">${escapeHTML(trip.destination)}</td>
                    <td class="p-4" style="color:#475569;">${escapeHTML(formatDateRange(trip))}</td>
                    <td class="p-4">${renderBadge(statusLabel(trip))}</td>
                    <td class="p-4">
                        ${trip.cancellationRequested && trip.cancellationStatus === 'Pending'
                    ? `<div style="display:flex;gap:6px;"><button class="action-btn btn-reject" style="padding:4px 10px;font-size:12px;background:#ef4444;color:#fff;border-radius:4px;border:none;cursor:pointer;" data-dd-action="accept-trip-cancellation" data-trip-id="${trip.id}" title="Accept cancellation"><i data-icon="check"></i> Accept Cancel</button><button class="action-btn btn-secondary" style="padding:4px 10px;font-size:12px;" data-dd-action="reject-trip-cancellation" data-trip-id="${trip.id}" title="Decline cancellation"><i data-icon="x"></i> Decline</button></div>`
                    : trip.status === 'requested'
                        ? `<div style="display:flex;gap:6px;"><button class="action-btn btn-accept" style="padding:4px 10px;font-size:12px;" data-dd-action="accept-trip" data-trip-id="${trip.id}"><i data-icon="check"></i> Accept</button><button class="action-btn btn-reject" style="padding:4px 10px;font-size:12px;" data-dd-action="reject-trip" data-trip-id="${trip.id}"><i data-icon="x"></i> Reject</button></div>`
                        : `<button class="action-btn btn-secondary" style="padding:4px 10px;font-size:12px;" data-dd-action="route" data-dd-target="travelPartner_travelerSchedules.html"><i data-icon="eye"></i> View</button>`}
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="6" class="p-4 text-center text-gray-500">No trips yet. Accepted and requested trips will appear here.</td></tr>`;
            iconRefresh(tbody);
        }

        renderAssignedTravelersWidget(state);
    }

    window.toggleTripActionsMenu = function (e, tripId) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const menu = document.getElementById(`trip-actions-menu-${tripId}`);
        if (!menu) return;
        const isCurrentlyOpen = menu.style.display === 'block';

        // Close all open action menus first
        document.querySelectorAll('.dd-trip-actions-menu').forEach((m) => {
            m.style.display = 'none';
        });

        if (!isCurrentlyOpen) {
            menu.style.display = 'block';
            iconRefresh(menu);
        }
    };

    if (!window._ddTripActionsClickRegistered) {
        window._ddTripActionsClickRegistered = true;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dd-row-actions-wrapper')) {
                document.querySelectorAll('.dd-trip-actions-menu').forEach((m) => {
                    m.style.display = 'none';
                });
            }
        });
    }

    function renderPartnerTrips(state) {
        if (currentPage() !== 'travelPartner_trips.html') return;
        const tbody = document.querySelector('table tbody');
        if (!tbody) return;
        const trips = allActiveTrips(state);
        tbody.innerHTML = trips.map((trip) => {
            const guideStatus = trip.guide ? `${trip.guide.name} (${trip.status === 'completed' ? 'Completed' : trip.guideStatus})` : 'Pending';
            const vendorStatus = trip.vendor ? `${trip.vendor.name} (${trip.status === 'completed' ? 'Completed' : trip.vendorStatus})` : 'Pending';
            const detailPage = trip.status === 'completed'
                ? 'travelPartner_scheduleDetail_completed.html'
                : trip.status === 'ongoing'
                    ? 'travelPartner_scheduleDetail_ongoing.html'
                    : 'travelPartner_scheduleDetail_upcoming.html';

            const isCompleted = trip.status === 'completed';
            const isCancelled = trip.status === 'cancelled';

            let vendorMenuItem = '';
            const isVendorConfirmed = trip.vendor && (trip.vendorStatus === 'Accepted' || trip.status === 'completed');
            if (!isVendorConfirmed) {
                if (trip.vendor && trip.vendorStatus === 'Requested') {
                    vendorMenuItem = `<a href="travelPartner_vendorAssignment.html?trip=${trip.id}" class="dd-menu-item" style="color:#d97706;"><i data-icon="truck"></i> Vendor Request Sent</a>`;
                } else {
                    vendorMenuItem = `<a href="travelPartner_vendorAssignment.html?trip=${trip.id}" class="dd-menu-item"><i data-icon="truck"></i> Assign Vendor</a>`;
                }
            }

            let guideMenuItem = '';
            const isGuideConfirmed = trip.guide && (trip.guideStatus === 'Accepted' || trip.status === 'completed');
            if (!isGuideConfirmed) {
                if (trip.guide && trip.guideStatus === 'Assigned') {
                    guideMenuItem = `<a href="travelPartner_guideAssignment.html?trip=${trip.id}" class="dd-menu-item" style="color:#d97706;"><i data-icon="user"></i> Guide Request Sent</a>`;
                } else {
                    guideMenuItem = `<a href="travelPartner_guideAssignment.html?trip=${trip.id}" class="dd-menu-item"><i data-icon="user"></i> Assign Guide</a>`;
                }
            }

            let startTripMenuItem = '';
            if (canStartTrip(trip) && !trip.scheduleStarted && trip.status !== 'ongoing' && trip.status !== 'completed') {
                startTripMenuItem = `<button type="button" class="dd-menu-item" data-dd-action="start-trip" data-trip-id="${trip.id}" style="color:#10b981;"><i data-icon="play"></i> Start Trip</button>`;
            }

            let executionMenuItem = '';
            if (trip.scheduleStarted || trip.status === 'ongoing') {
                executionMenuItem = `<a href="travelPartner_execution.html" class="dd-menu-item"><i data-icon="activity"></i> Execution</a>`;
            }

            let supportMenuItem = '';
            if (!isCompleted && !isCancelled && trip.status !== 'requested') {
                if (!trip.supportStatus || (trip.supportStatus !== 'Sent' && trip.supportStatus !== 'Accepted')) {
                    supportMenuItem = `<button type="button" class="dd-menu-item" data-dd-action="send-trip-to-support" data-trip-id="${trip.id}"><i data-icon="headphones"></i> Send to Support</button>`;
                }
            }

            const menuItemsHtml = [vendorMenuItem, guideMenuItem, startTripMenuItem, executionMenuItem, supportMenuItem].filter(Boolean).join('');
            const menuContent = menuItemsHtml || `<div class="dd-menu-item" style="color:#64748b;font-size:12px;cursor:default;"><i data-icon="check"></i> All Actions Complete</div>`;

            const session = readSession();
            const roleLower = String(session.role || roleFromPath() || '').toLowerCase();
            const isSuperAdmin = roleLower.includes('super') || roleLower.includes('admin');

            let actions = '';
            if (isCompleted) {
                const isDisbursed = trip.budgetShare?.disbursed;
                actions = `
                    <a href="${detailPage}?trip=${trip.id}" class="tbl-act-btn tbl-act-slate"><i data-icon="eye"></i> View History</a>
                    ${isDisbursed ? `
                        <span class="badge badge-emerald" style="padding:6px 12px;font-size:12px;color:#10b981;background:rgba(16,185,129,0.15);border-radius:6px;font-weight:700;"><i data-icon="check"></i> Paid Guide & Vendor</span>
                    ` : `
                        <button type="button" class="tbl-act-btn tbl-act-emerald" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;cursor:pointer;" onclick="window.openBudgetShareModal('${trip.id}')">
                            💳 Pay Guide & Vendor
                        </button>
                    `}
                `;
            } else if (isCancelled) {
                const ref = trip.refundRecord;
                if (ref && ref.processed) {
                    actions = `
                        <button type="button" class="tbl-act-btn tbl-act-emerald" onclick="window.openCancellationRefundModal('${trip.id}')">
                            <i data-icon="check"></i> Refunded ${formatMoney(ref.refundAmount)}
                        </button>
                    `;
                } else if (isSuperAdmin) {
                    actions = `
                        <button type="button" class="tbl-act-btn tbl-act-amber" onclick="window.openCancellationRefundModal('${trip.id}')">
                            <i data-icon="creditcard"></i> Process Refund
                        </button>
                    `;
                } else {
                    actions = `
                        <span class="badge badge-amber" style="padding:6px 12px;font-size:12px;"><i data-icon="clock"></i> Pending Admin Refund</span>
                    `;
                }
            } else if (trip.cancellationRequested && trip.cancellationStatus === 'Pending') {
                actions = `
                    <button type="button" class="tbl-act-btn tbl-act-rose" data-dd-action="accept-trip-cancellation" data-trip-id="${trip.id}"><i data-icon="check"></i> Accept Cancellation</button>
                    <button type="button" class="tbl-act-btn tbl-act-slate" data-dd-action="reject-trip-cancellation" data-trip-id="${trip.id}"><i data-icon="x"></i> Decline</button>
                    <a href="${detailPage}?trip=${trip.id}" class="tbl-act-btn tbl-act-blue"><i data-icon="eye"></i> Details</a>
                `;
            } else if (trip.status === 'requested') {
                actions = `
                    <button type="button" class="tbl-act-btn tbl-act-emerald" data-dd-action="accept-trip" data-trip-id="${trip.id}"><i data-icon="check"></i> Accept Request</button>
                    <button type="button" class="tbl-act-btn tbl-act-rose" data-dd-action="reject-trip" data-trip-id="${trip.id}"><i data-icon="x"></i> Reject</button>
                `;
            } else {
                actions = `
                    <div class="dd-row-actions-wrapper" style="position:relative;display:inline-flex;align-items:center;gap:6px;">
                        <a href="${detailPage}?trip=${trip.id}" class="tbl-act-btn tbl-act-blue"><i data-icon="calendar"></i> Edit Schedule</a>
                        <button type="button" class="tbl-act-btn tbl-act-slate" onclick="window.toggleTripActionsMenu(event, '${trip.id}')">
                            Actions <i data-icon="chevron-down"></i>
                        </button>
                        <div id="trip-actions-menu-${trip.id}" class="dd-trip-actions-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);z-index:9999;min-width:170px;background:var(--bg-surface,#ffffff);border:1px solid var(--border-color,#e2e8f0);border-radius:12px;padding:6px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.25);">
                            ${menuContent}
                        </div>
                    </div>
                `;
            }
            return `
                <tr class="hover:bg-gray-50 transition-colors" style="${isCompleted ? 'opacity:0.75;' : isCancelled ? 'opacity:0.6;' : ''}">
                    <td class="p-4"><span class="font-semibold text-blue-600">${trip.id}</span></td>
                    <td class="p-4 font-medium text-gray-900">${escapeHTML(trip.travelerName)}</td>
                    <td class="p-4 text-gray-600 text-center">${escapeHTML(trip.destination)}</td>
                    <td class="p-4 text-gray-600 text-center">${escapeHTML(formatDateRange(trip))}</td>
                    <td class="p-4 text-center">${renderBadge(vendorStatus)}</td>
                    <td class="p-4 text-center">${renderBadge(guideStatus)}</td>
                    <td class="p-4 text-center">${renderBadge(statusLabel(trip))}</td>
                    <td class="p-4 text-center">${actions}</td>
                </tr>
            `;
        }).join('') || `<tr><td colspan="8" class="p-4 text-center text-gray-500">No trips found.</td></tr>`;
        const pageInfo = document.querySelector('.pagination .text-sm');
        if (pageInfo) pageInfo.textContent = `Showing 1-${trips.length} of ${trips.length} trips`;
        iconRefresh(tbody);
    }

    function renderPartnerSchedules(state) {
        if (currentPage() !== 'travelPartner_travelerSchedules.html') return;
        const page = document.querySelector('.page-content');
        if (!page) return;
        
        const allAccepted = acceptedTrips(state);
        const summary = page.querySelectorAll('.summary-card h3');
        const ongoing = allAccepted.filter((trip) => trip.status === 'ongoing' || (trip.scheduleStarted && trip.status !== 'completed')).length;
        const completed = allAccepted.filter((trip) => trip.status === 'completed').length;
        const upcoming = allAccepted.filter((trip) => trip.status !== 'completed' && trip.status !== 'ongoing' && !trip.scheduleStarted).length;
        const totalTravelers = allAccepted.length;

        [totalTravelers, ongoing, upcoming, completed].forEach((value, index) => {
            if (summary[index]) summary[index].textContent = value;
        });

        const allTrips = allAccepted;
        const hasActiveTrips = allTrips.some(t => t.status !== 'completed');
        let trips = allTrips;
        if (hasActiveTrips && !window._showScheduleHistory) {
            trips = allTrips.filter(t => t.status !== 'completed');
        } else if (hasActiveTrips && window._showScheduleHistory) {
            trips = allTrips.filter(t => t.status === 'completed');
        }

        const filterHeader = page.querySelector('.filter-header > div:last-child');
        if (filterHeader && !document.getElementById('history-toggle-btn') && hasActiveTrips && completed > 0) {
            filterHeader.style.display = 'flex';
            filterHeader.style.gap = '8px';
            filterHeader.insertAdjacentHTML('afterbegin', `<button id="history-toggle-btn" class="btn-card ${window._showScheduleHistory ? 'primary' : 'secondary'}" onclick="window.toggleScheduleHistory()" style="border-radius: 8px; font-weight: 600;"><i data-icon="clock"></i> History</button>`);
        } else if (filterHeader && document.getElementById('history-toggle-btn')) {
            const btn = document.getElementById('history-toggle-btn');
            btn.className = `btn-card ${window._showScheduleHistory ? 'primary' : 'secondary'}`;
            btn.style.display = (hasActiveTrips && completed > 0) ? 'block' : 'none';
        }

        page.querySelectorAll('.schedule-card').forEach((card) => card.remove());
        let list = document.getElementById('dd-partner-schedules');
        if (!list) {
            list = document.createElement('div');
            list.id = 'dd-partner-schedules';
            const anchor = page.querySelector('.filter-header');
            (anchor || page).insertAdjacentElement(anchor ? 'afterend' : 'beforeend', list);
        }
        list.innerHTML = trips.map((trip) => {
            const stats = scheduleStats(trip);
            const days = tripDays(trip);
            const progressPct = trip.status === 'completed' ? 100 : (trip.status === 'ongoing' || trip.scheduleStarted ? (50 + Math.round(stats.percent * 0.5)) : (trip.guideStatus === 'Accepted' ? 25 : 10));
            return `
                <div class="schedule-card">
                    <div class="schedule-info">
                        <div class="flex gap-2 mb-2">
                            ${renderBadge(statusLabel(trip))}
                            <span class="badge badge-blue uppercase">${days || '-'} Days</span>
                        </div>
                        <h3 class="text-lg font-bold text-gray-900">${escapeHTML(trip.title)}</h3>
                        <div class="schedule-meta mt-3">
                            <div class="meta-item"><i data-icon="user"></i> Traveler: ${escapeHTML(trip.travelerName)}</div>
                            <div class="meta-item"><i data-icon="users"></i> Guide: ${escapeHTML(trip.guide?.name || 'Pending')}</div>
                            <div class="meta-item"><i data-icon="truck"></i> Vendor: ${escapeHTML(trip.vendor?.name || 'Pending')}</div>
                            <div class="meta-item"><i data-icon="mappin"></i> ${escapeHTML(trip.destination)}</div>
                            <div class="meta-item"><i data-icon="calendar"></i> ${escapeHTML(formatDateRange(trip))}</div>
                        </div>
                        <div class="progress-section">
                            <div class="flex justify-between text-xs text-gray-500">
                                <span>Activities Progress</span>
                                <span>${stats.completed}/${stats.total}</span>
                            </div>
                            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${progressPct}%; ${trip.status === 'completed' ? 'background: #10b981;' : ''}"></div></div>
                        </div>
                        ${trip.status === 'completed' ? `
                            <div class="flex justify-between items-center mt-4">
                                <div class="current-activity" style="margin: 0; background: #064e3b; color: #34d399; border: none; font-weight: 600;">
                                    <span style="background: #10b981;"></span> Current Activity: Tour completed
                                </div>
                                <button class="btn-history-card" data-dd-action="route" data-dd-target="travelPartner_scheduleDetail_completed.html?trip=${trip.id}">
                                    <i data-icon="checkcircle"></i>
                                    <div style="text-align: left; font-size: 11px; line-height: 1.2;">View<br>History</div>
                                </button>
                            </div>
                        ` : `
                            <div class="current-activity"><span></span> Current Activity: ${escapeHTML(trip.currentActivity)}</div>
                        `}
                    </div>
                    ${trip.status !== 'completed' ? `
                        <div class="schedule-actions pl-8 border-l ml-6 border-gray-100">
                            <button class="btn-card primary" data-dd-action="route" data-dd-target="${trip.status === 'ongoing' ? 'travelPartner_scheduleDetail_ongoing.html' : 'travelPartner_scheduleDetail_upcoming.html'}?trip=${trip.id}"><i data-icon="eye"></i> View Trip Status</button>
                            <button class="btn-card secondary" data-dd-action="route" data-dd-target="travelPartner_scheduleDetail_upcoming.html?trip=${trip.id}"><i data-icon="edit"></i> Edit Schedule</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('') || `<div class="card" style="padding:24px;">No schedules found in this view.</div>`;
        iconRefresh(list);
        renderAssignedTravelersWidget(state);
    }

    function acceptedTrips(state) {
        if (!state || !Array.isArray(state.trips)) return [];
        const session = readSession();
        const currentEmail = (session?.email || '').toLowerCase().trim();
        const role = (session?.role || '').toLowerCase();

        return state.trips.filter(t => {
            if (!t || t.status === 'cancelled') return false;
            if (role.includes('superuser') || role.includes('support')) return true;
            const pEmail = (t.partnerEmail || '').toLowerCase().trim();
            const st = String(t.status || '').toLowerCase();
            const rq = String(t.requestStatus || '').toLowerCase();
            const isAssignedPartner = !pEmail || pEmail === currentEmail || role.includes('partner');
            return isAssignedPartner && (['accepted', 'confirmed', 'ongoing', 'upcoming', 'requested', 'planning'].includes(st) || rq === 'accepted');
        });
    }

    function assignableGuides(state) {
        let guidesList = [];
        if (Array.isArray(state?.users)) {
            const userGuides = state.users.filter(u => (u.role || '').toLowerCase().includes('guide'));
            if (userGuides.length > 0) {
                guidesList = userGuides.map(u => ({
                    id: u.id || u.email,
                    name: u.name || u.email,
                    experience: u.experience || '8 yrs',
                    languages: u.languages || 'English, Hindi, Telugu',
                    rating: u.rating || '4.9',
                    tours: u.toursCompleted || u.tours || 250,
                    status: u.status || 'Available',
                    email: u.email
                }));
            }
        }
        if (!guidesList.some(g => (g.name || '').toLowerCase().includes('koushik'))) {
            guidesList.unshift({
                id: 'USER-6',
                name: 'Koushik',
                experience: '8 yrs',
                languages: 'English, Hindi, Telugu',
                rating: '4.9',
                tours: '250',
                status: 'Available',
                email: 'koushik@gmail.com'
            });
        }
        return guidesList;
    }

    function assignableVendors(state) {
        let vendorsList = [];
        if (Array.isArray(state?.users)) {
            const userVendors = state.users.filter(u => (u.role || '').toLowerCase().includes('vendor'));
            if (userVendors.length > 0) {
                vendorsList = userVendors.map(u => ({
                    id: u.id || u.email,
                    name: u.name || u.email,
                    type: u.serviceType || u.category || 'Transport & Stay',
                    location: u.location || 'All Destinations',
                    rating: u.rating || '4.9',
                    trips: u.tripsCompleted || u.trips || 150,
                    status: u.status || 'Available',
                    email: u.email
                }));
            }
        }
        if (!vendorsList.some(v => (v.name || '').toLowerCase().includes('lokesh'))) {
            vendorsList.unshift({
                id: 'USER-5',
                name: 'Lokesh',
                type: 'Transport & Stay',
                location: 'All Destinations',
                rating: '4.9',
                trips: '150',
                status: 'Available',
                email: 'lokesh@gmail.com'
            });
        }
        return vendorsList;
    }

    function selectedTripForAssignment(state, kind) {
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get('trip');
        let trips = acceptedTrips(state).filter(t => t && t.status !== 'completed' && t.status !== 'cancelled');
        if (!trips || trips.length === 0) {
            trips = (state?.trips || []).filter(t => t && t.status !== 'completed' && t.status !== 'cancelled');
        }
        if (requestedId) {
            const exact = (state?.trips || []).find((trip) => trip.id === requestedId);
            if (exact) return exact;
        }
        if (kind === 'guide') {
            return trips.find((trip) => !trip.guide || trip.guideStatus === 'Pending') || trips[0] || null;
        }
        return trips.find((trip) => !trip.vendor || ['Pending', 'Rejected'].includes(trip.vendorStatus)) || trips[0] || null;
    }

    function renderAssignmentPage(state, kind) {
        const page = currentPage().toLowerCase();
        const isGuidePage = page.includes('guideassignment') || page.includes('guide_assignment');
        const isVendorPage = page.includes('vendorassignment') || page.includes('vendor_assignment');
        if ((kind === 'guide' && !isGuidePage) || (kind === 'vendor' && !isVendorPage)) return;
        const trip = selectedTripForAssignment(state, kind);
        const detailCard = document.querySelector('.trip-details-card');
        const list = kind === 'guide' ? document.querySelector('.guide-list') : document.querySelector('.vendor-list');
        const tbody = document.querySelector('table tbody');
        if (!detailCard || !list || !tbody) return;

        if (!trip) {
            detailCard.innerHTML = `<p class="text-sm text-gray-500">Accept a traveler request first, then assign ${kind}s.</p>`;
            list.innerHTML = '';
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">No assignments yet.</td></tr>`;
            return;
        }

        const guides = kind === 'guide' ? assignableGuides(state) : [];
        const vendors = kind === 'vendor' ? assignableVendors(state) : [];
        const isAssigned = kind === 'guide' ? Boolean(trip.guide) : Boolean(trip.vendor);
        const assignedName = kind === 'guide' ? trip.guide?.name : trip.vendor?.name;
        const currentStatus = kind === 'guide' ? (trip.guideStatus || 'Assigned') : (trip.vendorStatus || 'Requested');
        const isAccepted = isAssigned && (currentStatus === 'Accepted' || trip.status === 'completed');
        const isPending = isAssigned && !isAccepted;

        const firstOption = kind === 'guide'
            ? guides.find(g => {
                const s = String(g.status || 'Available').toLowerCase();
                return s === 'available' || s.includes('on duty') || s.includes('active');
            })
            : vendors.find(v => {
                const s = String(v.status || 'Available').toLowerCase();
                return s === 'available' || s.includes('active');
            });

        const activeTripsList = acceptedTrips(state).filter(t => t.status !== 'completed' && t.status !== 'cancelled');
        const tripOptionsHtml = activeTripsList.map(t => `<option value="${t.id}" ${t.id === trip.id ? 'selected' : ''}>${t.id} - ${escapeHTML(t.destination)} (${escapeHTML(t.travelerName)})</option>`).join('');

        detailCard.innerHTML = `
            <div class="meta-row mb-3" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span class="meta-label" style="font-weight:700;">Active Trip</span>
                <select onchange="window.location.href='?trip='+this.value" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-color,#cbd5e1);font-weight:700;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);outline:none;cursor:pointer;max-width:240px;">
                    ${tripOptionsHtml}
                </select>
            </div>
            <div class="trip-meta">
                <div class="meta-row"><span class="meta-label">Destination</span><span class="meta-val font-semibold">${escapeHTML(trip.destination)}</span></div>
                <div class="meta-row"><span class="meta-label">Trip Dates</span><span class="meta-val font-semibold">${escapeHTML(formatDateRange(trip))}</span></div>
                <div class="meta-row"><span class="meta-label">Traveler Name</span><span class="meta-val font-semibold">${escapeHTML(trip.travelerName)}</span></div>
                <div class="meta-row"><span class="meta-label">Required Service</span><span class="meta-val font-semibold">${escapeHTML(kind === 'vendor' ? (trip.vendor?.type || 'Hotel / Transport / Activity') : 'Tour Guide & Local Sightseeing')}</span></div>
                <div class="meta-row" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-color,#e2e8f0);display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <span class="meta-label" style="font-weight:700;">Payout Split</span>
                        <div style="font-size:11px;color:var(--text-secondary,#64748b);">Guide: ${trip.budgetShare?.guidePercent ?? 50}% • Vendor: ${trip.budgetShare?.vendorPercent ?? 50}%</div>
                    </div>
                    <button onclick="window.openPartnerShareEditor('${escapeJS(trip.id)}')" style="padding:6px 12px;border:none;border-radius:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 8px rgba(16,185,129,0.3);">
                        <i data-icon="edit"></i> Edit Shares
                    </button>
                </div>
            </div>
            ${isAssigned ? (
                isAccepted ? `
                    <button class="btn-card" disabled style="background:#059669;color:#ffffff;opacity:1;cursor:default;border:none;font-weight:600;">
                        <i data-icon="checkcircle"></i> ${kind === 'guide' ? 'Assigned Guide: ' + escapeHTML(assignedName) : 'Assigned Vendor: ' + escapeHTML(assignedName)} (Confirmed)
                    </button>
                ` : `
                    <button class="btn-card" disabled style="background:#d97706;color:#ffffff;opacity:1;cursor:default;border:none;font-weight:600;">
                        <i data-icon="clock"></i> Request Sent to ${escapeHTML(assignedName)} (Pending Acceptance)
                    </button>
                `
            ) : `
                <div style="padding: 12px; background: rgba(59, 130, 246, 0.08); border: 1px dashed #3b82f6; border-radius: 12px; color: #1d4ed8; font-weight: 700; font-size: 13px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i data-icon="users"></i> Select a ${kind === 'guide' ? 'Guide' : 'Vendor'} from Available Options Below 👇
                </div>
            `}
        `;

        if (kind === 'guide') {
            const guides = assignableGuides(state);
            list.innerHTML = guides.map((guide) => {
                const gStatus = String(guide.status || 'Available');
                const sLower = gStatus.toLowerCase();
                const isAvail = sLower === 'available' || sLower === 'active' || sLower.includes('active') || sLower.includes('on duty') || sLower.includes('online');
                const isThisAssigned = isAssigned && trip.guide?.name === guide.name;
                const isThisAccepted = isThisAssigned && (trip.guideStatus === 'Accepted' || trip.status === 'completed');
                const isThisPending = isThisAssigned && !isThisAccepted;

                return `
                <div class="guide-item" style="${isThisAccepted ? 'border: 2px solid #10b981; background: rgba(16, 185, 129, 0.05);' : isThisPending ? 'border: 2px solid #f59e0b; background: rgba(245, 158, 11, 0.05);' : ''}">
                    <div>
                        <h4>${escapeHTML(guide.name)} ${isThisAccepted ? '<span class="text-xs font-bold text-green-600 ml-2">(Assigned & Confirmed)</span>' : isThisPending ? '<span class="text-xs font-bold text-amber-600 ml-2">(Request Sent - Pending Acceptance)</span>' : ''}</h4>
                        <div class="guide-meta">
                            <span class="text-blue-600">${escapeHTML(guide.experience || 'Certified Guide')}</span> • ${escapeHTML(guide.languages || 'English, Local Languages')}
                        </div>
                        <div class="guide-stats">
                            <span>★ ${guide.rating || '4.9'}</span>
                            <span>${guide.tours || '0'} tours completed</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        ${isThisAccepted
                        ? '<span class="badge badge-green">Confirmed</span>'
                        : isThisPending
                            ? '<span class="badge badge-amber" style="background: #fef3c7; color: #b45309; font-weight: 700;">Request Sent</span>'
                            : isAvail
                                ? '<span class="badge badge-green">Available</span>'
                                : `<span class="badge badge-amber" style="background: #fef3c7; color: #b45309; font-weight: 700;">${escapeHTML(gStatus)}</span>`}
                        ${isThisAccepted
                        ? `<button class="btn-assign" disabled style="background: #059669; color: #fff; cursor: default; border-color: #059669;"><i data-icon="check"></i> Assigned & Confirmed</button>`
                        : isThisPending
                            ? `<button class="btn-assign" disabled style="background: #d97706; color: #fff; cursor: default; border-color: #d97706;"><i data-icon="clock"></i> Request Sent (Pending)</button>`
                            : `<button class="btn-assign" ${!isAvail ? 'disabled style="opacity: 0.55; cursor: not-allowed; background: #94a3b8; border-color: #94a3b8;" title="Guide is currently busy/unavailable"' : ''} data-dd-action="assign-guide" data-trip-id="${trip.id}" data-name="${escapeHTML(guide.name)}">
                                ${isAssigned ? '🔄 Reassign Guide' : (isAvail ? '📩 Send Request' : 'Unavailable')}
                               </button>`
                        }
                    </div>
                </div>
            `;
            }).join('');
            tbody.innerHTML = acceptedTrips(state).filter((item) => item.guide).map((item) => {
                const effectiveGuideStatus = item.status === 'completed' ? 'Completed' : item.guideStatus;
                return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4"><span class="font-semibold text-blue-600">${item.id}</span></td>
                    <td class="p-4 font-medium text-gray-900">${escapeHTML(item.guide.name)}</td>
                    <td class="p-4 text-center">${renderBadge(effectiveGuideStatus)}</td>
                    <td class="p-4 text-center"><a href="travelPartner_guideAssignment.html?trip=${item.id}" class="action-link red inline-flex items-center gap-1"><i data-icon="edit"></i> Reassign</a></td>
                </tr>
            `}).join('') || `<tr><td colspan="4" class="p-4 text-center text-gray-500">No guides assigned yet.</td></tr>`;
        } else {
            const vendors = assignableVendors(state);
            list.innerHTML = vendors.map((vendor) => {
                const vStatus = String(vendor.status || 'Available');
                const sLower = vStatus.toLowerCase();
                const isAvail = sLower === 'available' || sLower === 'active' || sLower.includes('active') || sLower.includes('on duty') || sLower.includes('online');
                const isThisAssigned = isAssigned && trip.vendor?.name === vendor.name;
                const isThisAccepted = isThisAssigned && (trip.vendorStatus === 'Accepted' || trip.status === 'completed');
                const isThisPending = isThisAssigned && !isThisAccepted;

                return `
                <div class="vendor-item" style="${isThisAccepted ? 'border: 2px solid #10b981; background: rgba(16, 185, 129, 0.05);' : isThisPending ? 'border: 2px solid #f59e0b; background: rgba(245, 158, 11, 0.05);' : ''}">
                    <div>
                        <h4>${escapeHTML(vendor.name)} ${isThisAccepted ? '<span class="text-xs font-bold text-green-600 ml-2">(Assigned & Confirmed)</span>' : isThisPending ? '<span class="text-xs font-bold text-amber-600 ml-2">(Request Sent - Pending Acceptance)</span>' : ''}</h4>
                        <div class="vendor-meta"><span class="text-blue-600">${escapeHTML(vendor.type)}</span> - ${escapeHTML(vendor.location)}</div>
                        <div class="vendor-stats"><span>★ ${vendor.rating}</span><span>${vendor.trips} trips completed</span></div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        ${isThisAccepted
                        ? '<span class="badge badge-green">Confirmed</span>'
                        : isThisPending
                            ? '<span class="badge badge-amber" style="background: #fef3c7; color: #b45309; font-weight: 700;">Request Sent</span>'
                            : isAvail
                                ? '<span class="badge badge-green">Available</span>'
                                : `<span class="badge badge-amber" style="background: #fef3c7; color: #b45309; font-weight: 700;">${escapeHTML(vStatus)}</span>`}
                        ${isThisAccepted
                        ? `<button class="btn-assign" disabled style="background: #059669; color: #fff; cursor: default; border-color: #059669;"><i data-icon="check"></i> Assigned & Confirmed</button>`
                        : isThisPending
                            ? `<button class="btn-assign" disabled style="background: #d97706; color: #fff; cursor: default; border-color: #d97706;"><i data-icon="clock"></i> Request Sent (Pending)</button>`
                            : `<button class="btn-assign" ${!isAvail ? 'disabled style="opacity: 0.55; cursor: not-allowed; background: #94a3b8; border-color: #94a3b8;" title="Vendor is currently busy/unavailable"' : ''} data-dd-action="assign-vendor" data-trip-id="${trip.id}" data-name="${escapeHTML(vendor.name)}" data-service="${escapeHTML(vendor.type)}">
                                ${isAssigned ? '🔄 Reassign Vendor' : (isAvail ? '📩 Send Request' : 'Unavailable')}
                               </button>`
                        }
                    </div>
                </div>
            `;
            }).join('');
            tbody.innerHTML = acceptedTrips(state).filter((item) => item.vendor).map((item) => {
                const effectiveVendorStatus = item.status === 'completed' ? 'Completed' : item.vendorStatus;
                return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4"><span class="font-semibold text-blue-600">${item.id}</span></td>
                    <td class="p-4 font-medium text-gray-900">${escapeHTML(item.vendor.name)}</td>
                    <td class="p-4 text-center">${renderBadge(item.vendor.type)}</td>
                    <td class="p-4 text-center">${renderBadge(effectiveVendorStatus)}</td>
                    <td class="p-4 text-center"><a href="travelPartner_vendorAssignment.html?trip=${item.id}" class="action-link red inline-flex items-center gap-1"><i data-icon="edit"></i> Change Vendor</a></td>
                </tr>
            `}).join('') || `<tr><td colspan="5" class="p-4 text-center text-gray-500">No vendors assigned yet.</td></tr>`;
        }
        iconRefresh(document.querySelector('.page-content'));
    }

    function renderGuideAssignments(state) {
        if (currentPage() !== 'assignments.html') return;
        const page = document.querySelector('.page-content');
        if (!page) return;
        const grid = page.querySelector('.assignment-card')?.parentElement;
        const tbody = page.querySelector('table tbody');
        const guideTrips = getGuideTrips(state);
        const pending = guideTrips.filter((trip) => trip.guide && ['Assigned', 'Pending', 'Requested'].includes(trip.guideStatus));
        const accepted = guideTrips.filter((trip) => trip.guide && ['Accepted', 'Completed'].includes(trip.guideStatus));
        if (grid) {
            grid.innerHTML = pending.map((trip) => {
                const gPct = trip.budgetShare?.guidePercent !== undefined ? trip.budgetShare.guidePercent : 50;
                const gAmt = trip.budgetShare?.guideAmount ?? Math.round((Number(trip.budget || 0) * gPct) / 100);
                return `
                <div class="assignment-card dashboard-card">
                    <div class="assignment-header">
                        <div><div class="text-blue-600 font-bold text-lg mb-1 t-title">${trip.id}</div><div class="text-gray-900 font-semibold text-base">${escapeHTML(trip.title)}</div></div>
                        ${renderBadge('Pending')}
                    </div>
                    <div class="assignment-meta">
                        <div class="meta-item"><i data-icon="users"></i><span>Traveler group size: <span class="font-semibold text-gray-900">${trip.travelersCount} people</span></span></div>
                        <div class="meta-item"><i data-icon="calendar"></i><span>Travel dates: <span class="font-semibold text-gray-900">${escapeHTML(formatDateRange(trip))}</span></span></div>
                        <div class="meta-item"><i data-icon="mappin"></i><span>Destination: <span class="font-semibold text-gray-900">${escapeHTML(trip.destination)}</span></span></div>
                        <div class="meta-item"><i data-icon="dollar"></i><span>Tour Guide Share: <span class="font-bold text-green-600" style="color:#059669;font-weight:700;">${formatMoney(gAmt)} (${gPct}%)</span></span></div>
                    </div>
                    <div class="action-row">
                        <button class="btn" data-dd-action="accept-guide" data-trip-id="${trip.id}"><i data-icon="checkcircle"></i> Accept</button>
                        <button class="btn btn-danger red" data-dd-action="reject-guide" data-trip-id="${trip.id}"><i data-icon="x"></i> Reject</button>
                    </div>
                </div>
            `;
            }).join('') || `<div class="card" style="grid-column:1/-1;padding:24px;">No pending guide assignments.</div>`;
        }
        if (tbody) {
            tbody.innerHTML = accepted.map((trip) => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4"><span class="font-semibold text-blue-600">${trip.id}</span></td>
                    <td class="p-4 font-medium text-gray-900">${escapeHTML(trip.title)}</td>
                    <td class="p-4 text-gray-600">${trip.travelersCount} people</td>
                    <td class="p-4 text-gray-600">${escapeHTML(formatDateRange(trip))}</td>
                    <td class="p-4 text-gray-600">Dream Destination</td>
                    <td class="p-4">${renderBadge(trip.status === 'ongoing' ? 'In Progress' : trip.guideStatus)}</td>
                </tr>
            `).join('') || `<tr><td colspan="6" class="p-4 text-center text-gray-500">No accepted assignments yet.</td></tr>`;
        }
        iconRefresh(page);
    }

    function renderGuideSchedules(state) {
        if (currentPage() !== 'traveler_schedules.html' || !decodeURIComponent(window.location.pathname).includes('/guide/')) return;
        const page = document.getElementById('guide-schedules');
        if (!page) return;
        const trips = getGuideTrips(state).filter((trip) => trip.guide && ['Accepted', 'In Progress', 'Completed'].includes(trip.guideStatus));
        const statNumbers = page.querySelectorAll('.stat-number-premium');
        const assignedTravelers = trips.reduce((sum, t) => sum + (Number(t.travelersCount) || 1), 0);
        const activeTours = trips.filter((trip) => trip.status === 'ongoing' || trip.guideStatus === 'In Progress').length;
        const upcomingTours = trips.filter((trip) => trip.status !== 'ongoing' && trip.status !== 'completed' && trip.guideStatus === 'Accepted').length;
        const completedTours = trips.filter((trip) => trip.status === 'completed' || trip.guideStatus === 'Completed').length;

        [assignedTravelers, activeTours, upcomingTours, completedTours].forEach((value, index) => {
            if (statNumbers[index]) statNumbers[index].textContent = value;
        });
        const hasActiveTours = trips.some((trip) => trip.status !== 'completed' && trip.guideStatus !== 'Completed');
        let displayTrips = trips;
        if (hasActiveTours && !window._showScheduleHistory) {
            displayTrips = trips.filter((trip) => trip.status !== 'completed' && trip.guideStatus !== 'Completed');
        } else if (hasActiveTours && window._showScheduleHistory) {
            displayTrips = trips.filter((trip) => trip.status === 'completed' || trip.guideStatus === 'Completed');
        }

        const filterBar = page.querySelector('.filter-bar-high > .f-actions');
        if (filterBar && !document.getElementById('history-toggle-btn') && hasActiveTours && completedTours > 0) {
            filterBar.style.display = 'flex';
            filterBar.style.gap = '8px';
            filterBar.insertAdjacentHTML('afterbegin', `<button id="history-toggle-btn" class="btn-card ${window._showScheduleHistory ? 'primary' : 'secondary'}" onclick="window.toggleScheduleHistory()" style="border-radius: 8px; font-weight: 600; padding: 6px 12px; margin-right: 8px;"><i data-icon="clock"></i> History</button>`);
        } else if (filterBar && document.getElementById('history-toggle-btn')) {
            const btn = document.getElementById('history-toggle-btn');
            btn.className = `btn-card ${window._showScheduleHistory ? 'primary' : 'secondary'}`;
            btn.style.display = (hasActiveTours && completedTours > 0) ? 'block' : 'none';
        }

        const list = page.querySelector('.schedule-list-high');
        if (!list) return;
        list.innerHTML = displayTrips.map((trip) => {
            const isCompleted = trip.status === 'completed' || trip.guideStatus === 'Completed';
            const isOngoing = !isCompleted && (trip.status === 'ongoing' || trip.guideStatus === 'In Progress');
            const statusBadge = isCompleted ? 'COMPLETED' : isOngoing ? 'ONGOING' : 'UPCOMING';
            const badgeClass = isCompleted ? 'badge-gray' : isOngoing ? 'badge-green' : 'badge-blue';
            const stats = scheduleStats(trip);
            const percent = isCompleted ? 100 : (isOngoing ? (50 + Math.round(stats.percent * 0.5)) : (trip.guideStatus === 'Accepted' ? 25 : 0));
            return `
            <div class="schedule-card-high">
                <div class="sc-main-row">
                    <div class="sc-content-left">
                        <div class="sc-badges"><span class="badge ${badgeClass}">${statusBadge}</span><span class="badge text-gray-500 bg-gray-50">${trip.id}</span><span class="badge text-gray-500 bg-gray-50">${trip.travelersCount || 1} Travelers</span></div>
                        <h3 class="sc-title">${escapeHTML(trip.title)}</h3>
                        <p class="sc-traveler">${escapeHTML(trip.travelerName)}</p>
                        <div class="sc-meta-row"><span class="meta-item"><i data-icon="mappin"></i> ${escapeHTML(trip.destination)}</span><span class="meta-item"><i data-icon="calendar"></i> ${escapeHTML(formatDateRange(trip))}</span></div>
                    </div>
                    ${!isCompleted ? `
                    <div class="sc-actions-right">
                        <button class="btn-view-schedule" data-dd-action="route" data-dd-target="${isOngoing ? 'traveler_schedule_ongoing.html' : 'traveler_schedule_upcoming.html'}?trip=${trip.id}"><i data-icon="eye"></i><span>View Schedule</span></button>
                        <button class="btn-message" data-dd-action="route" data-dd-target="tour_updates.html"><i data-icon="message"></i><span>Update</span></button>
                    </div>
                    ` : ''}
                </div>
                <div class="sc-ribbons-section">
                    <div class="sc-ribbon-teal">Tour Assignment: ${escapeHTML(trip.title)} (${escapeHTML(trip.guideStatus || 'Accepted')})</div>
                    <div class="progress-container-full"><div class="p-label-row"><span class="p-label">Tour Progress</span><span class="p-value">${percent}%</span></div><div class="p-bar-full"><div class="p-fill-blue" style="width:${percent}%; ${isCompleted ? 'background: #10b981;' : ''}"></div></div></div>
                    ${isCompleted ? `
                        <div class="flex justify-between items-center mt-2">
                            <div class="sc-ribbon-green" style="margin: 0; background: #064e3b; color: #34d399; font-weight: 600; padding: 6px 12px; border-radius: 6px;">
                                Current Activity: Tour completed
                            </div>
                            <button class="btn-history-card" data-dd-action="route" data-dd-target="traveler_schedule_completed.html?trip=${trip.id}">
                                <i data-icon="checkcircle"></i>
                                <div style="text-align: left; font-size: 11px; line-height: 1.2;">View<br>History</div>
                            </button>
                        </div>
                    ` : `
                        <div class="sc-ribbon-green">Current Activity: ${escapeHTML(trip.currentActivity || (isOngoing ? 'Tour in progress' : 'Ready for tour departure'))}</div>
                    `}
                </div>
            </div>
        `;
        }).join('') || `<div class="card" style="padding:24px;">No guide schedules yet. Accept an assignment to view tour schedules.</div>`;
        iconRefresh(page);
    }

    function populateTripSelect(select, trips) {
        if (!select) return;
        const prev = select.value;
        select.innerHTML = `<option value="">Select Trip ID</option>` + trips.map((trip) => `<option value="${trip.id}">${trip.id} - ${escapeHTML(trip.title)}</option>`).join('');
        if (prev && trips.some(t => t.id === prev)) select.value = prev;
    }

    function scheduleOwnerLabel(owner) {
        return owner === 'guide' ? 'Tour Guide' : owner === 'vendor' ? 'Vendor' : 'Member';
    }

    function scheduleStatusText(status) {
        if (status === 'in-progress') return 'In Progress';
        if (status === 'completed') return 'Completed';
        return 'Upcoming';
    }

    function ensureScheduleSelect(container, afterSelect, inputClass) {
        if (!container || !afterSelect) return null;
        let group = container.querySelector('[data-dd-schedule-group]');
        if (!group) {
            group = document.createElement('div');
            group.className = 'form-group';
            group.dataset.ddScheduleGroup = 'true';
            group.innerHTML = `
                <label class="form-label">Schedule Item</label>
                <select class="${inputClass || 'form-select'}" data-dd-field="scheduleItemId" data-dd-schedule-select>
                    <option value="">Select Schedule Item</option>
                </select>
            `;
            const anchor = afterSelect.closest('.form-group') || afterSelect;
            anchor.insertAdjacentElement('afterend', group);
        }
        return group.querySelector('select');
    }

    function populateScheduleSelect(select, trip) {
        if (!select) return;
        const prev = select.value;
        let schedule = trip ? ensureTripSchedule(trip) : [];
        const role = typeof roleFromPath === 'function' ? roleFromPath() : '';

        if (role === 'vendor') {
            schedule = schedule.filter(item => item.owner === 'vendor' || item.owner === 'both' || !item.owner);
        } else if (role === 'guide') {
            schedule = schedule.filter(item => item.owner === 'guide' || item.owner === 'both' || !item.owner);
        }

        select.innerHTML = `<option value="">Select Schedule Item</option>` + schedule.map((item) => `
            <option value="${escapeHTML(item.id)}" ${item.status === 'in-progress' ? 'selected' : ''}>
                Day ${item.day} ${escapeHTML(item.time)} - ${escapeHTML(item.title)} (${scheduleOwnerLabel(item.owner)}, ${scheduleStatusText(item.status)})
            </option>
        `).join('');
        if (prev && schedule.some(s => s.id === prev)) select.value = prev;
    }

    function wireSchedulePicker(tripSelect, scheduleSelect, trips, serviceSelect) {
        if (!tripSelect || !scheduleSelect) return;
        const sync = () => {
            const trip = trips.find((item) => item.id === tripSelect.value);
            populateScheduleSelect(scheduleSelect, trip);
            if (serviceSelect && trip?.vendor?.type) serviceSelect.value = trip.vendor.type;
        };
        if (!tripSelect.value && trips.length > 0) tripSelect.value = trips[0].id;
        sync();
        tripSelect.onchange = sync;
    }

    function renderGuideTourUpdates(state) {
        if (currentPage() !== 'tour_updates.html') return;
        const trips = getGuideTrips(state).filter((trip) => trip.guide && ['Accepted', 'Completed'].includes(trip.guideStatus) && trip.status !== 'completed');
        const forms = document.querySelectorAll('.forms-layout form');
        if (forms[0]) {
            forms[0].dataset.ddForm = 'guide-status';
            forms[0].querySelector('button')?.setAttribute('data-dd-action', 'guide-status-submit');
            const selects = forms[0].querySelectorAll('select');
            const tripSelect = selects[0];
            if (tripSelect) tripSelect.dataset.ddField = 'tripId';
            populateTripSelect(tripSelect, trips);
            const scheduleSelect = ensureScheduleSelect(forms[0], tripSelect, 'form-select');
            wireSchedulePicker(tripSelect, scheduleSelect, trips);
            const statusSelect = Array.from(forms[0].querySelectorAll('select')).find((select) => select !== tripSelect && select !== scheduleSelect);
            if (statusSelect) statusSelect.dataset.ddField = 'status';
        }
        if (forms[1]) {
            forms[1].dataset.ddForm = 'guide-message';
            forms[1].querySelector('button')?.setAttribute('data-dd-action', 'guide-message-submit');
            const selects = forms[1].querySelectorAll('select');
            if (selects[0]) selects[0].dataset.ddField = 'tripId';
            populateTripSelect(selects[0], trips);
            if (!selects[0]?.value && trips.length === 1) selects[0].value = trips[0].id;
        }
        const body = document.querySelector('.card .card-body');
        if (body) {
            const updates = state.trips.flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip })))
                .filter((item) => item.source === 'Guide')
                .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));
            body.innerHTML = updates.slice(0, 8).map((item) => `
                <div class="update-item hover:bg-gray-50">
                    <div class="update-icon${item.status === 'Guidance' ? ' guidance' : ''}"><i data-icon="${item.status === 'Guidance' ? 'message' : 'activity'}"></i></div>
                    <div class="update-content">
                        <div class="update-header"><div class="update-title"><span class="text-blue-600">${item.trip.id}</span>${renderBadge(item.title)}</div><span class="update-time">${relativeTime(item.createdAt)}</span></div>
                        <div class="update-text font-medium mt-1">${escapeHTML(item.message)}</div>
                    </div>
                </div>
            `).join('') || `<div class="update-item">No guide updates yet.</div>`;
        }
        iconRefresh(document.querySelector('.page-content'));
    }

    let guideActivityLimit = 8;

    function renderGuideActivityLog(state) {
        if (currentPage() !== 'activity_log.html' || !decodeURIComponent(window.location.pathname).includes('/guide/')) return;
        const page = document.querySelector('.page-content');
        if (!page) return;

        const activeUser = activeSessionUser();
        const activeName = (activeUser?.name || '').trim().toLowerCase();
        const activeEmail = (activeUser?.email || '').trim().toLowerCase();

        // 1. Resolve trips assigned to current guide
        const guideTrips = (state.trips || []).filter((trip) => {
            if (!trip.guide) return false;
            const gName = (trip.guide.name || '').trim().toLowerCase();
            const gEmail = (trip.guide.email || '').trim().toLowerCase();
            if (activeEmail && gEmail && gEmail === activeEmail) return true;
            if (activeName && gName && (gName === activeName || activeName.includes(gName) || gName.includes(activeName))) return true;
            return !activeEmail && !activeName;
        });

        const completedCount = guideTrips.filter((t) => t.status === 'completed' || t.stage === 'Completed' || t.guideStatus === 'Completed').length;
        const totalCount = guideTrips.length;
        const issues = (state.issues || []).filter((issue) => guideTrips.some((t) => t.id === issue.tripId));

        // 2. Gather all real activities
        let rawActivities = [];

        guideTrips.forEach((trip) => {
            (trip.updates || []).forEach((upd) => {
                const src = String(upd.source || '').toLowerCase();
                const titleStr = String(upd.title || '').toLowerCase();
                if (src.includes('guide') || src.includes('system') || src.includes('partner') || titleStr.includes('assigned') || titleStr.includes('tour') || titleStr.includes('accepted')) {
                    rawActivities.push({
                        title: upd.title || 'Guide Activity',
                        message: upd.message || `${trip.title} update`,
                        createdAt: upd.createdAt || trip.updatedAt || trip.createdAt,
                        tripId: trip.id,
                        status: upd.status || 'Active'
                    });
                }
            });

            (trip.schedule || []).forEach((sch) => {
                if (sch.status === 'completed' && (sch.updatedBy || sch.owner === 'guide')) {
                    rawActivities.push({
                        title: 'Tour Schedule Item Completed',
                        message: `Completed "${sch.title}" (${sch.location || trip.destination})`,
                        createdAt: sch.updatedAt || trip.updatedAt || trip.createdAt,
                        tripId: trip.id,
                        status: 'Completed'
                    });
                }
            });
        });

        issues.forEach((iss) => {
            rawActivities.push({
                title: `Issue ${iss.status || 'Reported'}`,
                message: `${iss.title}: ${iss.description || ''}`,
                createdAt: iss.createdAt,
                tripId: iss.tripId,
                status: iss.priority || 'Warning'
            });
        });

        // Deduplicate activities
        const seen = new Set();
        const uniqueActivities = [];
        rawActivities.forEach((act) => {
            const key = `${act.tripId}-${act.title}-${act.message}`.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueActivities.push(act);
            }
        });

        uniqueActivities.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        // Update Stat Card Values: [Completed Tours, Status Updates, Issues Reported, Total Tours]
        const statValues = [completedCount, uniqueActivities.length, issues.length, totalCount];
        page.querySelectorAll('.stat-value').forEach((node, idx) => {
            if (statValues[idx] !== undefined) {
                node.textContent = statValues[idx];
            }
        });

        // Render Activity Timeline Card
        const card = page.querySelector('.activity-card');
        if (card) {
            const visibleActivities = uniqueActivities.slice(0, guideActivityLimit);
            card.innerHTML = `
                <div class="activity-header">
                    <h2 class="text-lg font-bold text-gray-900">Recent Activity Timeline</h2>
                </div>
                ${visibleActivities.map((item) => {
                const stLower = String(item.status || item.title || '').toLowerCase();
                const iconColor = stLower.includes('warn') || stLower.includes('issue') ? 'amber' : stLower.includes('complete') || stLower.includes('resolved') ? 'green' : 'blue';
                const iconName = stLower.includes('complete') || stLower.includes('resolved') ? 'checkcircle' : stLower.includes('warn') || stLower.includes('issue') ? 'alert' : 'message';
                return `
                        <div class="activity-row">
                            <div class="activity-icon ${iconColor}"><i data-icon="${iconName}"></i></div>
                            <div class="activity-details">
                                <div class="activity-title">${escapeHTML(item.title)}</div>
                                <div class="activity-desc">${escapeHTML(item.message)}</div>
                                <div class="activity-meta"><i data-icon="clock"></i> ${relativeTime(item.createdAt)}</div>
                            </div>
                            <div class="tour-pill">${escapeHTML(item.tripId)}</div>
                        </div>
                    `;
            }).join('') || `
                    <div class="activity-row">
                        <div class="activity-icon blue"><i data-icon="activity"></i></div>
                        <div class="activity-details">
                            <div class="activity-title">No activity logged yet</div>
                            <div class="activity-desc">Accept assigned tours or update tour schedules to generate live activity logs.</div>
                            <div class="activity-meta"><i data-icon="clock"></i> Fresh start</div>
                        </div>
                        <div class="tour-pill">N/A</div>
                    </div>
                `}
            `;
        }

        // Handle Load More Button
        const loadMore = page.querySelector('.load-more-btn');
        if (loadMore) {
            loadMore.style.display = uniqueActivities.length > guideActivityLimit ? '' : 'none';
            loadMore.onclick = () => {
                guideActivityLimit += 8;
                renderGuideActivityLog(state);
            };
        }
        iconRefresh(page);
    }
    function renderVendorTravelerSchedules(state) {
        if (currentPage() !== 'vendor_traveler_schedules.html') return;
        const page = document.querySelector('.page-scroll');
        if (!page) return;
        const trips = getVendorTrips(state).filter((trip) => ['Accepted', 'In Progress', 'En Route', 'Completed'].includes(trip.vendorStatus));
        const statValues = page.querySelectorAll('.v-stat-val');

        const activeTravelers = trips.filter((t) => t.status !== 'completed').reduce((sum, t) => sum + (Number(t.travelersCount) || 1), 0);
        const completedServices = trips.filter((t) => t.status === 'completed' || t.vendorStatus === 'Completed' || t.serviceStatus === 'Completed').length;
        const upcomingServices = trips.filter((t) => t.status !== 'completed' && t.vendorStatus !== 'Completed' && t.serviceStatus !== 'Completed').length;
        const totalServices = trips.length;

        [activeTravelers, completedServices, upcomingServices, totalServices].forEach((value, index) => {
            if (statValues[index]) statValues[index].textContent = value;
        });
        const hasActiveServices = trips.some((t) => t.status !== 'completed' && t.vendorStatus !== 'Completed' && t.serviceStatus !== 'Completed');
        let displayTrips = trips;
        if (hasActiveServices && !window._showScheduleHistory) {
            displayTrips = trips.filter((t) => t.status !== 'completed' && t.vendorStatus !== 'Completed' && t.serviceStatus !== 'Completed');
        } else if (hasActiveServices && window._showScheduleHistory) {
            displayTrips = trips.filter((t) => t.status === 'completed' || t.vendorStatus === 'Completed' || t.serviceStatus === 'Completed');
        }

        const filterActions = page.querySelector('.filter-actions');
        if (filterActions && !document.getElementById('history-toggle-btn') && hasActiveServices && completedServices > 0) {
            filterActions.style.display = 'flex';
            filterActions.style.gap = '8px';
            filterActions.insertAdjacentHTML('afterbegin', `<button id="history-toggle-btn" class="btn-card ${window._showScheduleHistory ? 'primary' : 'secondary'}" onclick="window.toggleScheduleHistory()" style="border-radius: 8px; font-weight: 600; padding: 6px 12px; margin-right: 8px;"><i data-icon="clock"></i> History</button>`);
        } else if (filterActions && document.getElementById('history-toggle-btn')) {
            const btn = document.getElementById('history-toggle-btn');
            btn.className = `btn-card ${window._showScheduleHistory ? 'primary' : 'secondary'}`;
            btn.style.display = (hasActiveServices && completedServices > 0) ? 'block' : 'none';
        }

        page.querySelectorAll('.schedule-card').forEach((card) => card.remove());
        let list = document.getElementById('dd-vendor-schedules');
        if (!list) {
            list = document.createElement('div');
            list.id = 'dd-vendor-schedules';
            page.appendChild(list);
        }
        list.innerHTML = displayTrips.map((trip) => {
            const isCompleted = trip.status === 'completed' || trip.vendorStatus === 'Completed' || trip.serviceStatus === 'Completed';
            const isOngoing = !isCompleted && (trip.status === 'ongoing' || trip.vendorStatus === 'In Progress' || trip.vendorStatus === 'En Route');
            const statusText = isCompleted ? 'Completed' : (trip.serviceStatus || trip.vendorStatus || (isOngoing ? 'Ongoing' : 'Upcoming'));
            const stats = scheduleStats(trip);
            const percent = isCompleted ? 100 : (isOngoing ? (50 + Math.round(stats.percent * 0.5)) : (trip.vendorStatus === 'Accepted' ? 25 : 0));
            const serviceType = trip.vendor?.type || 'Travel Services';
            return `
                <div class="schedule-card">
                    <div class="card-header">
                        <div class="card-title-area">
                            <div class="tags"><span class="tag-pill ${isOngoing ? 'tag-ongoing' : isCompleted ? 'tag-completed' : 'tag-upcoming'}">${escapeHTML(statusText)}</span><span class="tag-pill tag-trip">${trip.id}</span></div>
                            <h3 class="trip-name">${escapeHTML(trip.title)}</h3>
                            <div class="traveler-name">Traveler: ${escapeHTML(trip.travelerName)}</div>
                            <div class="meta-row"><div class="meta-item"><i data-icon="mappin"></i> ${escapeHTML(trip.destination)}</div><div class="meta-item"><i data-icon="calendar"></i> ${escapeHTML(formatDateRange(trip))}</div></div>
                        </div>
                        ${!isCompleted ? `<button class="btn-view" data-dd-action="route" data-dd-target="${isOngoing ? 'vendor_traveler_schedule_ongoing.html' : 'vendor_traveler_schedule_upcoming.html'}?trip=${trip.id}">View Schedule</button>` : ''}
                    </div>
                    <div class="services-area">
                        <div class="services-title">YOUR SERVICE ITEMS</div>
                        <div class="service-pills">
                            <span class="service-pill ${isOngoing || trip.vendorStatus === 'Accepted' ? 'active' : ''}"><i data-icon="truck"></i> ${escapeHTML(serviceType)} - ${escapeHTML(statusText)}</span>
                        </div>
                    </div>
                    ${isCompleted ? `
                        <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                            <div class="current-activity" style="margin: 0; background: #064e3b; color: #34d399; border: none; font-weight: 600; padding: 6px 12px; border-radius: 6px;">
                                Service Status: Completed (${percent}%)
                            </div>
                            <button class="btn-history-card" data-dd-action="route" data-dd-target="vendor_traveler_schedule_completed.html?trip=${trip.id}">
                                <i data-icon="checkcircle"></i>
                                <div style="text-align: left; font-size: 11px; line-height: 1.2;">View<br>History</div>
                            </button>
                        </div>
                    ` : `
                        <div class="progress-area">
                            <div class="progress-header"><span>Service Status</span><span>${escapeHTML(statusText)} (${percent}%)</span></div>
                            <div class="progress-track"><div class="progress-fill" style="width:${percent}%;"></div></div>
                        </div>
                    `}
                </div>
            `;
        }).join('') || `<div class="content-card" style="padding:24px;text-align:center;color:#64748b;">No schedules found in this view.</div>`;
        iconRefresh(page);
    }

    function renderVendorRequests(state) {
        if (currentPage() !== 'vendor_service_requests.html') return;
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        const trips = getVendorTrips(state).filter((trip) => trip.vendor && ['Requested', 'Pending', 'Assigned'].includes(trip.vendorStatus));
        tbody.innerHTML = trips.map((trip) => {
            const vPct = trip.budgetShare?.vendorPercent !== undefined ? trip.budgetShare.vendorPercent : 50;
            const vAmt = trip.budgetShare?.vendorAmount ?? Math.round((Number(trip.budget || 0) * vPct) / 100);
            return `
            <tr>
                <td><a class="req-id-link font-semibold" style="color:#2563eb;">${trip.requestId || trip.id}</a></td>
                <td><span class="font-medium">${trip.id}</span></td>
                <td><span class="type-pill">${escapeHTML(trip.vendor?.type || 'Service')}</span></td>
                <td>${escapeHTML(trip.destination)}</td>
                <td>${escapeHTML(trip.startDate ? formatShortDate(trip.startDate) : 'Scheduled')}</td>
                <td><span style="font-weight:700;color:#059669;">${formatMoney(vAmt)}</span> <span style="font-size:11px;color:#64748b;">(${vPct}%)</span></td>
                <td><span class="status-pill status-pending">Pending</span></td>
                <td><div class="actions-cell"><button class="btn-action btn-accept" data-dd-action="accept-vendor" data-trip-id="${trip.id}"><i data-icon="checkcircle"></i> Accept</button><button class="btn-action btn-reject" data-dd-action="reject-vendor" data-trip-id="${trip.id}"><i data-icon="x"></i> Reject</button></div></td>
            </tr>
        `;
        }).join('') || `<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748b;">No pending service requests.</td></tr>`;
        iconRefresh(tbody);
    }

    function renderVendorActiveServices(state) {
        if (currentPage() !== 'vendor_active_services.html') return;
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;
        const trips = getVendorTrips(state).filter((trip) => ['Accepted', 'In Progress', 'En Route'].includes(trip.vendorStatus) && trip.status !== 'completed');
        tbody.innerHTML = trips.map((trip) => `
            <tr>
                <td><a class="req-id-link font-semibold" style="color:#2563eb;">${trip.id}</a></td>
                <td><span class="type-pill">${escapeHTML(trip.vendor?.type || 'Travel Services')}</span></td>
                <td><span class="font-medium">${escapeHTML(trip.travelerName)}</span></td>
                <td>${escapeHTML(trip.startDate ? formatShortDate(trip.startDate) : (trip.schedule?.[0]?.time ? 'Day 1 ' + trip.schedule[0].time : 'Scheduled'))}</td>
                <td><span class="status-pill pill-progress">${escapeHTML(trip.serviceStatus || trip.vendorStatus || 'Accepted')}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action btn-update" data-dd-action="route" data-dd-target="vendor_service_updates.html"><i data-icon="edit2"></i> Update Status</button>
                        <button class="btn-action btn-complete" data-dd-action="complete-service" data-trip-id="${trip.id}"><i data-icon="checkcircle"></i> Mark Completed</button>
                    </div>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748b;">No active services. Accept a service request first.</td></tr>`;

        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${trips.length} active service${trips.length === 1 ? '' : 's'}`;
        }
        iconRefresh(tbody);
    }

    function renderVendorUpdates(state) {
        if (currentPage() !== 'vendor_service_updates.html') return;
        const trips = getVendorTrips(state).filter((trip) => ['Accepted', 'In Progress', 'En Route', 'Completed'].includes(trip.vendorStatus) && trip.status !== 'completed');
        const formCard = document.querySelector('.form-card');
        if (formCard) {
            formCard.dataset.ddForm = 'vendor-update';
            formCard.querySelector('.btn-submit')?.setAttribute('data-dd-action', 'vendor-update-submit');
            const selects = formCard.querySelectorAll('select');
            const tripSelect = selects[0];
            if (tripSelect) tripSelect.dataset.ddField = 'tripId';
            populateTripSelect(tripSelect, trips);
            const scheduleSelect = ensureScheduleSelect(formCard, tripSelect, 'form-input');
            const currentSelects = Array.from(formCard.querySelectorAll('select'));
            const serviceSelect = currentSelects.find((select) => select.dataset.ddField === 'serviceType') || currentSelects.find((select) => select !== tripSelect && select !== scheduleSelect && !select.dataset.ddField);
            const statusSelect = currentSelects.find((select) => select.dataset.ddField === 'status') || currentSelects[currentSelects.length - 1];
            if (serviceSelect) {
                serviceSelect.dataset.ddField = 'serviceType';
                serviceSelect.innerHTML = `<option value="">Select Service Type</option>` + [...new Set(trips.map((trip) => trip.vendor?.type).filter(Boolean))]
                    .map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join('');
            }
            if (statusSelect && statusSelect !== tripSelect && statusSelect !== scheduleSelect && statusSelect !== serviceSelect) statusSelect.dataset.ddField = 'status';
            wireSchedulePicker(tripSelect, scheduleSelect, trips, serviceSelect);
        }
        const updatesCard = document.querySelector('.updates-card');
        if (updatesCard) {
            const updates = state.trips.flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip })))
                .filter((item) => item.source === 'Vendor')
                .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));
            updatesCard.innerHTML = `<h2 class="updates-title">Recent Updates</h2>` + (updates.slice(0, 8).map((item) => `
                <div class="update-item">
                    <div class="upd-info"><div class="upd-trip">${item.trip.id}</div><div class="upd-msg">${escapeHTML(item.message)}</div><div class="upd-time">${relativeTime(item.createdAt)}</div></div>
                    <span class="status-pill pill-progress">${escapeHTML(item.status)}</span>
                </div>
            `).join('') || `<div class="update-item" style="color:#64748b;padding:12px;">No vendor updates yet.</div>`);
        }
        iconRefresh(document.querySelector('.page-scroll'));
    }

    function renderVendorServiceHistory(state) {
        if (currentPage() !== 'vendor_service_history.html') return;
        const tbody = document.querySelector('.history-table tbody');
        if (!tbody) return;
        const trips = getVendorTrips(state);
        const completedTrips = trips.filter((trip) => trip.status === 'completed' || trip.vendorStatus === 'Completed' || trip.serviceStatus === 'Completed');

        tbody.innerHTML = completedTrips.map((trip) => `
            <tr>
                <td class="trip-id font-semibold" style="color:#2563eb;">${trip.id}</td>
                <td><span class="service-type">${escapeHTML(trip.vendor?.type || 'Service')}</span></td>
                <td>${escapeHTML(trip.destination || 'Destination')}</td>
                <td>${escapeHTML(trip.completedAt ? formatShortDate(trip.completedAt) : (trip.endDate ? formatShortDate(trip.endDate) : formatShortDate(trip.updatedAt)))}</td>
                <td><span class="status-pill pill-completed"><i data-icon="checkcircle"></i> Completed</span></td>
            </tr>
        `).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:#64748b;">No completed services in history yet. Completed services will appear here.</td></tr>`;

        const summaryVals = document.querySelectorAll('.summary-value');
        if (summaryVals[0]) summaryVals[0].textContent = completedTrips.length;
        if (summaryVals[1]) summaryVals[1].textContent = completedTrips.length;
        if (summaryVals[2]) summaryVals[2].textContent = completedTrips.length ? '4.9' : '5.0';

        const pageInfo = document.querySelector('.pagination div');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${completedTrips.length} completed service${completedTrips.length === 1 ? '' : 's'}`;
        }
        iconRefresh(tbody);
    }

    function renderExecution(state) {
        if (currentPage() !== 'travelPartner_execution.html') return;
        const tbody = document.querySelector('table tbody');
        const trips = acceptedTrips(state);
        if (tbody) {
            tbody.innerHTML = trips.map((trip) => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-3 font-semibold text-blue-600">${trip.id}</td>
                    <td class="p-3 font-medium text-gray-900">${escapeHTML(trip.travelerName)}</td>
                    <td class="p-3 text-center"><span>${escapeHTML(trip.vendor ? `${trip.vendor.type}: ${trip.status === 'completed' ? 'Completed' : trip.serviceStatus || trip.vendorStatus}` : 'Vendor pending')}</span></td>
                    <td class="p-3 text-center font-medium text-green-600">${escapeHTML(trip.guide ? `Guide ${trip.status === 'completed' ? 'Completed' : trip.guideStatus}` : 'Guide pending')}</td>
                    <td class="p-3 text-gray-600 flex items-center gap-1"><i data-icon="mappin"></i> ${escapeHTML(trip.currentLocation || trip.destination)}</td>
                    <td class="p-3 text-xs text-gray-500"><div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${trip.progress}%;"></div></div> ${trip.progress}%</td>
                    <td class="p-3 text-center"><button class="text-gray-400 hover:text-blue-600 transition-colors" data-dd-action="route" data-dd-target="travelPartner_travelerSchedules.html"><i data-icon="eye"></i></button></td>
                </tr>
            `).join('') || `<tr><td colspan="7" class="p-4 text-center text-gray-500">No active trips to monitor.</td></tr>`;
        }
        const live = document.querySelector('.live-updates-container');
        if (live) {
            const updates = state.trips.flatMap((trip) => (trip.updates || []).map((update) => ({ ...update, trip })))
                .sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));
            live.innerHTML = updates.slice(0, 8).map((item) => `
                <div class="update-item">
                    <div class="update-icon ${item.source === 'Vendor' ? 'green' : item.status === 'Warning' ? 'orange' : 'blue'}"></div>
                    <div class="update-content"><div class="update-text">${escapeHTML(item.source)}: ${escapeHTML(item.message)}</div><div class="update-time">${item.trip.id} - ${relativeTime(item.createdAt)}</div></div>
                    <div class="update-badge ${item.status === 'Warning' ? 'warning' : item.status === 'Accepted' ? 'executed' : 'active'}">${escapeHTML(item.status)}</div>
                </div>
            `).join('') + `<button class="btn-view-all" data-dd-action="route" data-dd-target="travelPartner_notifications.html">View All Updates</button>`;
        }
        iconRefresh(document.querySelector('.page-content'));
    }

    function scheduleStatusBadge(status) {
        if (status === 'completed') return '<div class="s-badge badge-c">Completed</div>';
        if (status === 'in-progress') return '<div class="s-badge badge-a">In Progress</div>';
        return '<div class="s-badge">Upcoming</div>';
    }

    function renderScheduleFeed(trip) {
        const isPartnerPage = currentPage().startsWith('travelPartner_');
        const grouped = ensureTripSchedule(trip).reduce((acc, item) => {
            acc[item.day] = acc[item.day] || [];
            acc[item.day].push(item);
            return acc;
        }, {});
        return Object.keys(grouped).map((day) => `
            <div class="day-card">
                <div class="day-header">
                    <div class="day-icon">${day}</div>
                    <div>
                        <div class="day-title">Day ${day}</div>
                        <div class="day-date">${formatShortDate(grouped[day][0].date)}</div>
                    </div>
                </div>
                <div class="s-timeline">
                    ${grouped[day].map((item) => `
                        <div class="s-item ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'active s-item-active-box' : 'upcoming'}">
                            <div class="s-icon"></div>
                            <div class="s-content" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                <div>
                                    <div class="s-title">${escapeHTML(item.time)} - ${escapeHTML(item.title)}</div>
                                    <div class="s-meta"><i data-icon="${item.owner === 'vendor' ? 'truck' : 'user'}"></i> ${item.owner === 'vendor' ? 'Vendor' : 'Guide'}: ${escapeHTML(item.owner === 'vendor' ? (trip.vendor?.name || 'Pending') : (trip.guide?.name || 'Pending'))} - ${escapeHTML(item.location)}</div>
                                    ${item.notes ? `<div class="s-meta">${escapeHTML(item.notes)}</div>` : ''}
                                </div>
                                ${isPartnerPage ? `
                                    <button class="btn-remove-item" data-item-id="${item.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:6px; margin-left:12px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='none'">
                                        <i data-icon="trash-2" style="width:16px; height:16px;"></i>
                                    </button>
                                ` : ''}
                            </div>
                            ${scheduleStatusBadge(item.status)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function renderTravelerProgress(state) {
        if (currentPage() !== 'traveler_progress.html') return;

        const activeTrips = tripsForCurrentUser(allActiveTrips(state)).slice().sort((a, b) => (new Date(b.updatedAt || 0).getTime() || 0) - (new Date(a.updatedAt || 0).getTime() || 0));

        let trip = null;
        if (viewingCompletedTripSchedule) {
            trip = activeTrips.find(t => t.status === 'completed');
        } else {
            trip = activeTrips.find(t => t.status === 'ongoing') ||
                activeTrips.find(t => !['completed', 'cancelled', 'requested'].includes(t.status));
        }

        const page = document.querySelector('.page-content');
        if (!page) return;

        const layoutSplit = page.querySelector('.layout-split');
        const infoBanner = page.querySelector('.info-banner');
        const largeBanner = page.querySelector('.large-progress-banner');

        if (!trip && !viewingCompletedTripSchedule) {
            const hasCompleted = activeTrips.find(t => t.status === 'completed');
            if (hasCompleted) {
                if (infoBanner) infoBanner.style.display = 'none';
                if (largeBanner) largeBanner.style.display = 'none';
                const topP = page.querySelector('h1 + p');
                if (topP) topP.textContent = 'No active trip.';

                if (layoutSplit) {
                    layoutSplit.style.display = 'block';
                    layoutSplit.innerHTML = `
                        <div class="day-card" style="padding:48px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px;">
                            <div style="width:64px; height:64px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b; margin-bottom:8px;">
                                <i data-icon="activity" style="width:32px;height:32px;"></i>
                            </div>
                            <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">No Active Progress</h3>
                            <p style="color:#64748b; margin:0; max-width:400px; line-height:1.5;">Your current trip has been completed or cancelled. You can view your previous trips in the history.</p>
                            <button class="btn btn-primary" style="margin-top:8px;" onclick="toggleCompletedTripView()">
                                View Previous Trips History
                            </button>
                        </div>
                    `;
                }
                iconRefresh(page);
                return;
            } else {
                trip = activeTrips.find(t => t.status === 'requested');
                if (trip) {
                    if (infoBanner) infoBanner.style.display = 'none';
                    if (largeBanner) largeBanner.style.display = 'none';
                    const topP = page.querySelector('h1 + p');
                    if (topP) topP.textContent = 'No active trip.';

                    if (layoutSplit) {
                        layoutSplit.style.display = 'block';
                        layoutSplit.innerHTML = `
                            <div class="day-card" style="padding:48px 24px; text-align:center; color:#64748b;">
                                <i data-icon="activity" style="width:48px;height:48px;opacity:0.5;margin-bottom:16px;"></i>
                                <h3 style="color:#1e293b; margin:0 0 8px 0;">Request Pending</h3>
                                <p style="margin:0;">Progress will update once your trip is accepted by the travel partner.</p>
                            </div>
                        `;
                    }
                    iconRefresh(page);
                    return;
                }
            }
        }

        if (!trip) {
            if (infoBanner) infoBanner.style.display = 'none';
            if (largeBanner) largeBanner.style.display = 'none';
            const topP = page.querySelector('h1 + p');
            if (topP) topP.textContent = 'No trip booked yet.';

            if (layoutSplit) {
                layoutSplit.style.display = 'block';
                layoutSplit.innerHTML = `
                    <div class="card-block"><div class="cb-title">Live Progress</div><p style="color:#64748b;">Create a trip request first. Progress and real-time stages will update as your trip is coordinated.</p></div>
                `;
            }
            iconRefresh(page);
            return;
        }

        // Restore visibility if rendering actual progress
        if (infoBanner) infoBanner.style.display = 'block';
        if (largeBanner) largeBanner.style.display = 'flex';
        if (layoutSplit) {
            layoutSplit.style.display = 'grid';
            // We need to restore original innerHTML of layoutSplit if we destroyed it earlier.
            // But usually this happens via a fresh page load anyway. If this becomes an issue, we can force a reload on toggle back.
        }

        const headerP = page?.querySelector('h1 + p');
        if (headerP) headerP.textContent = `Monitor your ${trip.title} in real-time`;

        // Calculate progress percentage and stage description
        let progressPct = 0;
        let stageTitle = 'Trip Requested';
        let stageDesc = 'Your trip request is being reviewed by our Travel Partner.';

        if (trip.status === 'completed') {
            progressPct = 100;
            stageTitle = 'Trip Completed';
            stageDesc = 'This trip has concluded. Hope you had a wonderful journey!';
        } else if (trip.status === 'ongoing' || trip.scheduleStarted) {
            const stats = scheduleStats(trip);
            progressPct = 50 + Math.round(stats.percent * 0.5);
            stageTitle = stats.current?.title || trip.currentActivity || 'Activities In Progress';
            stageDesc = `Currently at ${trip.currentLocation || trip.destination}. Schedule is actively underway.`;
        } else if (trip.status === 'ready') {
            progressPct = 50;
            stageTitle = 'Trip Ready for Departure';
            stageDesc = `Guide (${trip.guide?.name || 'Assigned'}) and Vendor (${trip.vendor?.name || 'Assigned'}) confirmed. Ready for departure on ${formatShortDate(trip.startDate)}.`;
        } else if (trip.status === 'planning') {
            progressPct = 25;
            stageTitle = 'Coordination & Assignment';
            stageDesc = 'Travel partner accepted your booking and is assigning your dedicated guide and services.';
        } else if (trip.status === 'requested') {
            progressPct = 10;
            stageTitle = 'Booking Submitted';
            stageDesc = 'Your booking request has been submitted and is pending Travel Partner confirmation.';
        }

        let backButtonHTML = '';
        if (viewingCompletedTripSchedule) {
            backButtonHTML = `<button class="btn btn-outline" style="margin-bottom: 16px;" onclick="toggleCompletedTripView()"><i data-icon="arrowleft"></i> Back to Active</button>`;
        }

        const banner = document.querySelector('.large-progress-banner');
        if (banner) {
            // Check if back button already exists to avoid duplicates
            const existingBtn = banner.parentElement.querySelector('button[onclick="toggleCompletedTripView()"]');
            if (existingBtn) existingBtn.remove();

            if (backButtonHTML) {
                banner.insertAdjacentHTML('beforebegin', backButtonHTML);
            }
        }

        const title = document.querySelector('.large-progress-banner .pb-title');
        const desc = document.querySelector('.large-progress-banner .pb-desc');
        const fill = document.querySelector('.large-progress-banner .pb-bar-fill');
        if (title) title.textContent = `${progressPct}% Complete`;
        if (desc) desc.textContent = stageDesc;
        if (fill) fill.style.width = `${progressPct}%`;

        // 1. Render Trip Stages
        const stagesBlock = Array.from(document.querySelectorAll('.card-block')).find((block) => block.querySelector('.cb-title')?.textContent.includes('Trip Stages'));
        if (stagesBlock) {
            let timelineHTML = '';
            if (trip.scheduleStarted) {
                const schedule = ensureTripSchedule(trip);
                timelineHTML = schedule.map((item) => {
                    const isDone = item.status === 'completed';
                    const isActive = item.status === 'in-progress';
                    const badgeText = isDone ? 'Completed' : isActive ? 'In Progress' : 'Upcoming';
                    return `
                        <div class="st-item ${isDone ? 'completed' : isActive ? 'active' : ''}">
                            <div class="st-icon"></div>
                            <div>
                                <div class="st-title">${escapeHTML(item.title)}</div>
                                <div class="st-time">Day ${item.day} • ${escapeHTML(item.time)} • ${escapeHTML(item.location || trip.destination)}</div>
                            </div>
                            <div class="st-badge">${badgeText}</div>
                        </div>
                    `;
                }).join('');
            } else {
                const isPartnerDone = trip.status !== 'requested';
                const isAssignedDone = Boolean(trip.guide?.name && trip.vendor?.name && trip.guideStatus === 'Accepted' && trip.vendorStatus === 'Accepted');
                const isReadyDone = trip.status === 'ready' || trip.status === 'ongoing' || trip.status === 'completed';
                const isExecutionDone = trip.status === 'completed';
                const isExecutionActive = trip.status === 'ongoing';

                const stages = [
                    {
                        title: 'Trip Request Submitted',
                        time: formatShortDate(trip.createdAt || trip.startDate),
                        status: 'completed',
                        badge: 'Completed'
                    },
                    {
                        title: 'Travel Partner Review',
                        time: trip.partner?.name ? `${trip.partner.name} (Partner)` : 'Dileep (Travel Partner)',
                        status: isPartnerDone ? 'completed' : 'active',
                        badge: isPartnerDone ? 'Completed' : 'In Review'
                    },
                    {
                        title: 'Guide & Vendor Confirmation',
                        time: `Guide: ${trip.guide?.name || 'Pending'} • Vendor: ${trip.vendor?.name || 'Pending'}`,
                        status: isAssignedDone ? 'completed' : isPartnerDone ? 'active' : '',
                        badge: isAssignedDone ? 'Completed' : isPartnerDone ? 'In Progress' : 'Pending'
                    },
                    {
                        title: 'Trip Ready for Departure',
                        time: `${formatShortDate(trip.startDate)} - ${escapeHTML(trip.destination)}`,
                        status: trip.status === 'ready' ? 'active' : isReadyDone ? 'completed' : '',
                        badge: trip.status === 'ready' ? 'Ready' : isReadyDone ? 'Completed' : 'Upcoming'
                    },
                    {
                        title: 'Tour Activities & Sightseeing',
                        time: `${formatDateRange(trip)}`,
                        status: isExecutionDone ? 'completed' : isExecutionActive ? 'active' : '',
                        badge: isExecutionDone ? 'Completed' : isExecutionActive ? 'In Progress' : 'Upcoming'
                    },
                    {
                        title: 'Trip Completed',
                        time: formatShortDate(trip.endDate),
                        status: trip.status === 'completed' ? 'completed' : '',
                        badge: trip.status === 'completed' ? 'Completed' : 'Upcoming'
                    }
                ];

                timelineHTML = stages.map((st) => `
                    <div class="st-item ${st.status}">
                        <div class="st-icon"></div>
                        <div>
                            <div class="st-title">${escapeHTML(st.title)}</div>
                            <div class="st-time">${escapeHTML(st.time)}</div>
                        </div>
                        <div class="st-badge">${escapeHTML(st.badge)}</div>
                    </div>
                `).join('');
            }

            stagesBlock.innerHTML = `<div class="cb-title">Trip Stages</div><div class="stage-timeline">${timelineHTML}</div>`;
        }

        // 2. Render Live Updates Feed
        const feedBlock = Array.from(document.querySelectorAll('.card-block')).find((block) => block.querySelector('.cb-title')?.textContent.includes('Live Updates Feed'));
        if (feedBlock) {
            const updates = (trip.updates || []).slice(0, 8);
            feedBlock.innerHTML = `<div class="cb-title">Live Updates Feed</div>` + (updates.length ? updates.map((update) => `
                <div class="feed-item">
                    <div class="fi-icon" style="background:#2563eb;"><i data-icon="${update.source === 'Vendor' ? 'truck' : update.source === 'Guide' ? 'user' : 'activity'}"></i></div>
                    <div class="fi-content">
                        <div class="fi-top">
                            <div class="fi-title">${escapeHTML(update.title)}</div>
                            <div class="fi-time">${relativeTime(update.createdAt)}</div>
                        </div>
                        <div class="fi-desc">${escapeHTML(update.message)}<br><span style="font-size:11px;color:#3b82f6;font-weight:600;">${escapeHTML(update.source || 'Live')} Update</span></div>
                    </div>
                </div>
            `).join('') : `<div style="color:var(--text-secondary, #64748b);padding:16px 0;font-size:13px;text-align:center;">No live updates posted yet. Updates from your guide and vendor will appear here in real-time.</div>`);
        }

        // 3. Render Current Stage
        const currentStage = Array.from(document.querySelectorAll('.card-block')).find((block) => block.querySelector('.cb-title')?.textContent.includes('Current Stage'));
        if (currentStage) {
            currentStage.innerHTML = `
                <div class="cb-title"><i data-icon="activity"></i> Current Stage</div>
                <div style="font-size:16px;font-weight:700;margin-bottom:6px;color:var(--text-primary, #0f172a);">${escapeHTML(stageTitle)}</div>
                <div style="font-size:13px;color:var(--text-secondary, #64748b);margin-bottom:16px;line-height:1.4;">${escapeHTML(stageDesc)}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid rgba(148,163,184,0.15);font-size:13px;"><span style="color:var(--text-secondary, #64748b);">Location</span><span style="font-weight:600;">${escapeHTML(trip.currentLocation || trip.destination)}</span></div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid rgba(148,163,184,0.15);font-size:13px;"><span style="color:var(--text-secondary, #64748b);">Expected Dates</span><span style="font-weight:600;">${escapeHTML(formatDateRange(trip))}</span></div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid rgba(148,163,184,0.15);font-size:13px;"><span style="color:var(--text-secondary, #64748b);">Status</span><span>${renderBadge(statusLabel(trip))}</span></div>
            `;
        }

        // 4. Render Trip Statistics
        const statsBlock = Array.from(document.querySelectorAll('.card-block')).find((block) => block.querySelector('.cb-title')?.textContent.includes('Trip Statistics'));
        if (statsBlock) {
            const sched = ensureTripSchedule(trip);
            const actDone = trip.scheduleStarted ? sched.filter((s) => s.status === 'completed').length : 0;
            const actTotal = sched.length || 1;
            const actPct = Math.round((actDone / actTotal) * 100);

            const totalDays = Math.max(1, tripDays(trip));
            const daysElapsed = trip.status === 'completed' ? totalDays : (trip.status === 'ongoing' || trip.scheduleStarted) ? Math.min(totalDays, Math.max(1, Math.round((Date.now() - new Date(trip.startDate).getTime()) / 86400000) + 1)) : 0;
            const daysPct = Math.round((daysElapsed / totalDays) * 100);

            const updateCount = (trip.updates || []).length;

            statsBlock.innerHTML = `
                <div class="cb-title">Trip Statistics</div>
                <div class="stat-row">
                    <div class="stat-label"><span>Activities Completed</span> <span>${actDone} / ${actTotal}</span></div>
                    <div class="stat-bar"><div class="stat-fill" style="width:${actPct}%;background:#3b82f6;"></div></div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><span>Days Elapsed</span> <span>${daysElapsed} / ${totalDays}</span></div>
                    <div class="stat-bar"><div class="stat-fill" style="width:${daysPct}%;background:#10b981;"></div></div>
                </div>
                <div class="stat-row">
                    <div class="stat-label"><span>Live Updates</span> <span>${updateCount}</span></div>
                    <div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100, updateCount > 0 ? updateCount * 25 : 5)}%;background:#f59e0b;"></div></div>
                </div>
            `;
        }

        iconRefresh(page);
    }

    let viewingCompletedTripSchedule = false;
    window.toggleCompletedTripView = function () {
        viewingCompletedTripSchedule = !viewingCompletedTripSchedule;
        renderAll();
    }

    function renderTravelerSchedule(state) {
        if (currentPage() !== 'traveler_schedule.html') return;

        const activeTrips = tripsForCurrentUser(allActiveTrips(state)).slice().sort((a, b) => (new Date(b.updatedAt || 0).getTime() || 0) - (new Date(a.updatedAt || 0).getTime() || 0));

        let trip = null;
        if (viewingCompletedTripSchedule) {
            trip = activeTrips.find(t => t.status === 'completed');
        } else {
            trip = activeTrips.find(t => t.status === 'ongoing') ||
                activeTrips.find(t => !['completed', 'cancelled', 'requested'].includes(t.status));
        }

        const page = document.querySelector('.page-content');
        if (!page) return;

        const feed = page.querySelector('.schedule-feed');
        const rightSidebar = page.querySelector('.right-sidebar');
        const infoBanner = page.querySelector('.info-banner');

        // If no active trip, but they have a completed trip, show the empty state with the history button
        if (!trip && !viewingCompletedTripSchedule) {
            const hasCompleted = activeTrips.find(t => t.status === 'completed');
            if (hasCompleted) {
                if (rightSidebar) rightSidebar.style.display = 'none';
                if (infoBanner) infoBanner.style.display = 'none';
                const topP = page.querySelector('h1 + p');
                if (topP) topP.textContent = 'No active scheduled trip.';

                if (feed) {
                    feed.innerHTML = `
                        <div class="day-card" style="padding:48px 24px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px;">
                            <div style="width:64px; height:64px; border-radius:50%; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b; margin-bottom:8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            </div>
                            <h3 style="margin:0; color:#1e293b; font-size:1.25rem;">No Active Schedule</h3>
                            <p style="color:#64748b; margin:0; max-width:400px; line-height:1.5;">Your current trip has been completed or cancelled. A new schedule will appear here when a new trip is started by your travel partner.</p>
                            <button class="btn btn-primary" style="margin-top:8px;" onclick="toggleCompletedTripView()">
                                View Previous Trips History
                            </button>
                        </div>
                    `;
                }
                iconRefresh(page);
                return;
            } else {
                trip = activeTrips.find(t => t.status === 'requested');
                if (trip) {
                    if (rightSidebar) rightSidebar.style.display = 'none';
                    if (infoBanner) infoBanner.style.display = 'none';
                    const topP = page.querySelector('h1 + p');
                    if (topP) topP.textContent = 'No scheduled trip yet.';

                    if (feed) {
                        feed.innerHTML = `
                            <div class="day-card" style="padding:48px 24px; text-align:center; color:#64748b;">
                                <i data-icon="calendar" style="width:48px;height:48px;opacity:0.5;margin-bottom:16px;"></i>
                                <h3 style="color:#1e293b; margin:0 0 8px 0;">Schedule Pending</h3>
                                <p style="margin:0;">Schedule will be displayed after your requested trip is accepted by the travel partner.</p>
                            </div>
                        `;
                    }
                    iconRefresh(page);
                    return;
                }
            }
        }

        // If they are viewing history but no completed trip is found (fallback)
        if (!trip) {
            if (rightSidebar) rightSidebar.style.display = 'none';
            if (infoBanner) infoBanner.style.display = 'none';
            const topP = page.querySelector('h1 + p');
            if (topP) topP.textContent = 'No scheduled trip yet.';

            if (feed) {
                feed.innerHTML = `
                    <div class="day-card" style="padding:24px;">Schedule will be displayed after a traveler request is submitted or accepted.</div>
                `;
            }
            iconRefresh(page);
            return;
        }

        // --- RENDER THE ACTUAL SCHEDULE ---

        if (rightSidebar) rightSidebar.style.display = 'block';
        if (infoBanner) infoBanner.style.display = 'block';

        let backButtonHTML = '';
        if (viewingCompletedTripSchedule) {
            backButtonHTML = `<button class="btn btn-outline" style="margin-bottom: 16px;" onclick="toggleCompletedTripView()"><i data-icon="arrowleft"></i> Back to Active</button>`;
        }

        const topP = page.querySelector('h1 + p');
        if (topP) topP.textContent = `${trip.title} (${formatDateRange(trip)})`;
        const banner = page.querySelector('.info-banner div');
        if (banner) banner.innerHTML = `<i data-icon="mappin"></i> Located in ${escapeHTML(trip.destination)} | Travel Dates: ${escapeHTML(formatDateRange(trip))} | Status: ${escapeHTML(statusLabel(trip))}`;

        if (feed) {
            feed.innerHTML = backButtonHTML + renderScheduleFeed(trip);
        }
        const stats = scheduleStats(trip);
        const activityName = page?.querySelector('.ca-name');
        const activityMeta = page?.querySelector('.ca-meta');
        if (activityName) activityName.textContent = stats.current?.title || trip.currentActivity || (trip.schedule?.[0]?.title || trip.title);
        if (activityMeta) activityMeta.innerHTML = `<i data-icon="user"></i> Guide: ${escapeHTML(trip.guide?.name || 'Pending')} | <i data-icon="truck"></i> Vendor: ${escapeHTML(trip.vendor?.name || 'Pending')}`;
        const summaryRows = page?.querySelectorAll('.sum-row .sum-header');
        if (summaryRows && summaryRows.length >= 3) {
            summaryRows[0].innerHTML = `<span>Completed</span><span>${stats.completed}</span>`;
            summaryRows[1].innerHTML = `<span>In Progress</span><span>${stats.active}</span>`;
            summaryRows[2].innerHTML = `<span>Upcoming</span><span>${stats.upcoming}</span>`;
        }
        iconRefresh(page);
    }

    function renderTravelerTripDetails(state) {
        if (currentPage() !== 'traveler_trip_details.html') return;
        const page = document.querySelector('.page-content');
        if (!page) return;
        const trip = latestTravelerTrip(state);
        if (!trip) {
            page.innerHTML = `
                <div class="page-header"><h1>Trip Details</h1><p>No trip details yet.</p></div>
                <div class="detail-card"><div class="detail-card-title">Trip Overview</div><p style="color:#64748b;">Create a trip request first. Real trip details, assigned guide, vendor services, and progress will appear here.</p></div>
            `;
            iconRefresh(page);
            return;
        }
        const vendorItems = ensureTripSchedule(trip).filter((item) => item.owner === 'vendor');
        const needsDetailsPayment = trip.paymentStatus !== 'Paid' && trip.status !== 'cancelled' && trip.status !== 'completed';
        const canDetailsStart = trip.paymentStatus === 'Paid' && !trip.scheduleStarted && trip.status !== 'ongoing' && trip.status !== 'completed';
        const payBtnHTML = needsDetailsPayment
            ? `<button class="t-btn t-btn-primary" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:800;" data-dd-action="open-payment-modal" data-trip-id="${escapeHTML(trip.id)}" onclick="window.openPaymentModal('${escapeHTML(trip.id)}')"><i data-icon="creditcard"></i> Complete Payment (${formatMoney(trip.budget || 1200)})</button>`
            : '';

        page.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
                <div class="page-header" style="margin-bottom:0;">
                    <h1>${escapeHTML(trip.title)}</h1>
                    <p>${escapeHTML(statusLabel(trip))} - ${escapeHTML(trip.id)}</p>
                </div>
                <div style="display:flex;gap:8px;">
                    ${payBtnHTML}
                    ${cancelBtnHTML}
                </div>
            </div>
            ${needsDetailsPayment ? `
                <div style="background:rgba(16,185,129,0.08);border:1.5px solid #10b981;color:#065f46;padding:14px 18px;border-radius:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i data-icon="creditcard" style="color:#10b981;width:22px;height:22px;"></i>
                        <div>
                            <strong style="color:var(--text-primary,#0f172a);font-size:15px;">Payment Pending (${formatMoney(trip.budget || 1200)})</strong>
                            <div style="font-size:13px;color:var(--text-secondary,#475569);">Complete your payment to confirm your booking and prepare for departure.</div>
                        </div>
                    </div>
                    <button class="t-btn t-btn-primary" style="background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:800;" data-dd-action="open-payment-modal" data-trip-id="${escapeHTML(trip.id)}" onclick="window.openPaymentModal('${escapeHTML(trip.id)}')">
                        Pay Now
                    </button>
                </div>
            ` : ''}
            ${canDetailsStart ? `
                <div style="background:rgba(14,165,233,0.08);border:1.5px solid #0ea5e9;color:#0369a1;padding:14px 18px;border-radius:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i data-icon="checkcircle" style="color:#0ea5e9;width:22px;height:22px;"></i>
                        <div>
                            <strong style="color:var(--text-primary,#0f172a);font-size:15px;">Payment Completed • Awaiting Travel Partner to Start Trip</strong>
                            <div style="font-size:13px;color:var(--text-secondary,#475569);">Your payment is confirmed. Your Travel Partner will start your trip upon departure.</div>
                        </div>
                    </div>
                    <span class="meta-chip blue" style="padding:6px 14px;font-size:0.85rem;font-weight:700;">
                        <i data-icon="clock" style="width:14px;height:14px;"></i> Awaiting Partner
                    </span>
                </div>
            ` : ''}
            ${isPendingCancel ? `
                <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;">
                    <i data-icon="alertcircle" style="color:#ef4444;width:18px;height:18px;"></i>
                    <div><strong>Cancellation Requested:</strong> Your cancellation request has been sent to your Travel Partner for review and approval.</div>
                </div>
            ` : ''}
            <div class="detail-layout">
                <div>
                    <div class="detail-card">
                        <div class="detail-card-title">Trip Overview</div>
                        <div class="overview-grid">
                            <div class="overview-item"><div class="o-icon"><i data-icon="mappin"></i></div><div><div class="o-label">Destination</div><div class="o-value">${escapeHTML(trip.destination)}</div></div></div>
                            <div class="overview-item"><div class="o-icon"><i data-icon="calendar"></i></div><div><div class="o-label">Travel Dates</div><div class="o-value">${escapeHTML(formatDateRange(trip))}</div></div></div>
                            <div class="overview-item"><div class="o-icon"><i data-icon="hash"></i></div><div><div class="o-label">Trip ID</div><div class="o-value">${escapeHTML(trip.id)}</div></div></div>
                            <div class="overview-item"><div class="o-icon"><i data-icon="users"></i></div><div><div class="o-label">Travelers</div><div class="o-value">${trip.travelersCount}</div></div></div>
                        </div>
                    </div>
                    <div class="detail-card">
                        <div><div class="detail-card-title">Trip Progress</div><div>${trip.progress}% Complete</div></div>
                        <div class="t-progress"><div class="t-progress-bar" style="width:${Math.min(100, trip.progress)}%;"></div></div>
                        <div class="action-bar-grid">
                            <button class="ab-btn bg-teal" data-dd-action="route" data-dd-target="traveler_schedule.html"><i data-icon="calendar"></i> View Schedule</button>
                            <button class="ab-btn bg-purple" data-dd-action="route" data-dd-target="traveler_progress.html"><i data-icon="activity"></i> Track Progress</button>
                            <button class="ab-btn bg-orange" data-dd-action="route" data-dd-target="traveler_report_issue.html"><i data-icon="alert"></i> Report Issue</button>
                        </div>
                    </div>
                    <div class="detail-card">
                        <div class="detail-card-title">Vendor Services</div>
                        ${trip.vendor ? vendorItems.slice(0, 4).map((item) => `<div class="vendor-row"><div class="v-left"><div class="v-icon"><i data-icon="truck"></i></div><div><div class="v-name">${escapeHTML(trip.vendor.name)}</div><div class="v-desc">${escapeHTML(item.title)} - ${escapeHTML(item.location)}</div></div></div>${renderBadge(scheduleStatusText(item.status))}</div>`).join('') : `<p style="color:#64748b;">Vendor not assigned yet.</p>`}
                    </div>
                </div>
                <div>
                    <div class="widget-grad w-gradient-pink"><div class="detail-card-title">Travel Partner</div><p>Your travel partner will manage assignments after accepting the request.</p><button class="w-btn" data-dd-action="route" data-dd-target="traveler_messages.html"><i data-icon="message"></i> Contact Partner</button></div>
                    <div class="detail-card"><div class="detail-card-title">Your Tour Guide</div>${trip.guide ? `<div class="w-contact"><div class="w-avatar">${escapeHTML(trip.guide.initials || initialsFor(trip.guide.name))}</div><div class="w-details"><h4>${escapeHTML(trip.guide.name)}</h4><p>${escapeHTML(trip.guideStatus)}</p></div></div>` : `<p style="color:#64748b;">Guide not assigned yet.</p>`}</div>
                    <div class="widget-grad w-gradient-blue"><div class="detail-card-title">Need Help?</div><p>Support messages and issue reports are connected to this trip.</p><button class="w-btn" data-dd-action="route" data-dd-target="traveler_messages.html">Contact Support <i data-icon="arrowright"></i></button></div>
                </div>
            </div>
        `;
        iconRefresh(page);
    }

    function renderTravelerEditTrip(state) {
        const pageName = currentPage();
        if (pageName !== 'traveler_edit_trip_upcoming.html' && pageName !== 'traveler_edit_trip_ongoing.html') return;
        const trip = latestTravelerTrip(state);
        if (!trip) return;

        const subTitleEl = document.querySelector('.page-title-row .subtitle');
        if (subTitleEl) {
            subTitleEl.innerHTML = `${escapeHTML(trip.title)} • <span style="font-weight:600; color:#2563eb;">${escapeHTML(trip.id)}</span> <span class="badge-upcoming">${escapeHTML(statusLabel(trip))}</span>`;
        }

        const dateInputs = document.querySelectorAll('input[type="date"], input[type="text"][value*="202"]');
        if (dateInputs[0] && trip.startDate) dateInputs[0].value = dateOnly(trip.startDate);
        if (dateInputs[1] && trip.endDate) dateInputs[1].value = dateOnly(trip.endDate);

        const travelersInput = document.querySelector('input[type="number"]');
        if (travelersInput && trip.travelersCount) travelersInput.value = trip.travelersCount;

        const accSelect = document.querySelector('select');
        if (accSelect && trip.accommodationType) {
            Array.from(accSelect.options).forEach((opt) => {
                if (opt.text.toLowerCase().includes(String(trip.accommodationType).toLowerCase())) {
                    opt.selected = true;
                }
            });
        }
    }

    function submitTravelerTripEdit() {
        const state = loadState();
        const trip = latestTravelerTrip(state);
        if (!trip) {
            notify('No active trip found to edit.', 'warning');
            return;
        }

        const dateInputs = document.querySelectorAll('input[type="date"], input[type="text"][value*="202"]');
        if (dateInputs[0] && dateInputs[0].value) trip.startDate = dateInputs[0].value;
        if (dateInputs[1] && dateInputs[1].value) trip.endDate = dateInputs[1].value;

        const travelersInput = document.querySelector('input[type="number"]');
        if (travelersInput && travelersInput.value) trip.travelersCount = Number(travelersInput.value) || trip.travelersCount;

        const accSelect = document.querySelector('select');
        if (accSelect && accSelect.value) trip.accommodationType = accSelect.selectedOptions[0]?.textContent?.trim() || accSelect.value;
        trip.updatedAt = nowISO();

        addUpdate(trip, 'Traveler', 'Itinerary Modified', `${trip.travelerName || 'Traveler'} updated itinerary preferences and dates for ${trip.title}.`, 'Itinerary Mod');
        notifyStakeholders(state, trip, 'Itinerary & Preference Update', `${trip.travelerName || 'Traveler'} updated itinerary details for ${trip.title}.`, 'Itinerary Mod', ['partner', 'traveler']);

        saveState(state, true, true);
        persistStateToBackend(state, true);

        if (typeof showSuccessModal === 'function') {
            showSuccessModal("Trip Modified", "Trip modifications saved! Travel partner has been notified.", () => { routeTo('traveler_mytrips.html'); });
        } else {
            notify('Trip modifications saved! Travel partner has been notified.', 'success');
            setTimeout(() => { routeTo('traveler_mytrips.html'); }, 600);
        }
    }

    function renderScheduleDetailPages(state) {
        const pageName = currentPage();
        const isDetail = /scheduleDetail|traveler_schedule_ongoing|traveler_schedule_upcoming|vendor_traveler_schedule_ongoing|vendor_traveler_schedule_upcoming/.test(pageName);
        if (!isDetail) return;
        const container = document.querySelector('.page-content') || document.querySelector('.page-scroll');
        if (!container) return;

        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get('trip');
        const session = readSession();
        const userTrips = tripsForCurrentUser(allActiveTrips(state));
        let trip = null;
        if (requestedId) {
            if (['Traveler', 'Vendor', 'Guide', 'traveler', 'vendor', 'guide'].includes(session.role)) {
                trip = userTrips.find(t => t.id === requestedId) || null;
            } else {
                trip = allActiveTrips(state).find((item) => item.id === requestedId) || null;
            }
        } else {
            if (session.role === 'Traveler' || session.role === 'traveler') {
                trip = userTrips[0] || null;
            } else if (session.role === 'Vendor' || session.role === 'vendor') {
                trip = userTrips[0] || null;
            } else if (session.role === 'Guide' || session.role === 'guide') {
                trip = userTrips[0] || null;
            } else {
                trip = allActiveTrips(state).find((item) => item.scheduleStarted) || allActiveTrips(state)[0] || null;
            }
        }

        const isPartnerPage = pageName.startsWith('travelPartner_');

        if (!trip) {
            container.innerHTML = `
                <div class="page-header">
                    <h1>Schedule Details</h1>
                    <p>No active trip found.</p>
                </div>
                <div class="card" style="padding:24px;">No trip request found. Go to Dashboard to select a package and send a request first.</div>
            `;
            return;
        }

        const canSeeSchedule = Boolean(trip);

        // If the container is already built for this trip, only update the schedule feed so we NEVER wipe form inputs!
        const existingFeed = container.querySelector('.schedule-feed');
        const renderedTripId = container.getAttribute('data-rendered-trip-id');
        if (existingFeed && renderedTripId === trip.id) {
            existingFeed.innerHTML = renderScheduleFeed(trip);
            if (isPartnerPage) {
                existingFeed.querySelectorAll('.btn-remove-item').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const itemId = btn.getAttribute('data-item-id');
                        updateTrip(trip.id, (t) => {
                            t.schedule = (t.schedule || []).filter(item => item.id !== itemId);
                        });
                        notify('Schedule item removed successfully!', 'success');
                        renderAll();
                    });
                });
            }
            iconRefresh(existingFeed);
            return;
        }

        container.setAttribute('data-rendered-trip-id', trip.id);

        container.innerHTML = `
            <div class="page-header">
                <h1>${escapeHTML(trip.title)} Schedule</h1>
                <p>${escapeHTML(formatDateRange(trip))} - ${escapeHTML(statusLabel(trip))}</p>
            </div>
            ${canSeeSchedule ? `
                ${trip.status === 'completed' ? `
                    <div class="info-banner" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #dcfce7, #f0fdf4); border-color: #22c55e; color: #15803d;">
                        <i data-icon="checkcircle"></i> <strong>Trip Completed!</strong> All ${tripDays(trip)} days of the ${escapeHTML(trip.title)} itinerary have been successfully completed.
                    </div>
                ` : `
                    <div class="info-banner" style="margin-bottom: 1.5rem;"><i data-icon="calendar"></i> Package schedule is shared across traveler, guide, vendor, and travel partner pages. Schedule covers all <strong>${tripDays(trip)} days</strong> from ${escapeHTML(formatDateRange(trip))}.</div>
                `}
                
                ${isPartnerPage && trip.status !== 'completed' ? `
                    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid var(--primary, #0ea5e9);">
                        <h3 style="margin-top: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main, var(--foreground, #1e293b));">
                            <i data-icon="edit-3"></i> Traveler's Customization Request
                        </h3>
                        <p style="margin: 0.5rem 0 0; font-size: 0.95rem; line-height: 1.5; color: var(--text-muted, var(--muted-foreground, #475569));">
                            <strong>Requested Places / Special Requirements:</strong><br/>
                            ${escapeHTML(trip.notes || 'None specified')}
                        </p>
                        <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--text-muted, var(--muted-foreground, #475569));">
                            <strong>Trip Duration:</strong> ${tripDays(trip)} days (${escapeHTML(formatDateRange(trip))})
                        </p>
                    </div>

                    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #f59e0b;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--text-main, var(--foreground, #1e293b));"><i data-icon="calendar"></i> Adjust Trip Duration &amp; Regenerate Schedule</h3>
                        <p style="margin: 0 0 1rem; font-size: 0.875rem; color: var(--text-muted, #64748b);">Update start/end dates to regenerate the full itinerary for all days requested by the traveler.</p>
                        <form id="extend-trip-form" style="display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap;">
                            <div class="form-group" style="flex: 1; min-width: 160px;">
                                <label class="form-label" style="font-size: 0.85rem;">Start Date</label>
                                <input type="date" class="form-control" id="trip-start-date" value="${trip.startDate || ''}" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);" />
                            </div>
                            <div class="form-group" style="flex: 1; min-width: 160px;">
                                <label class="form-label" style="font-size: 0.85rem;">End Date</label>
                                <input type="date" class="form-control" id="trip-end-date" value="${trip.endDate || ''}" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);" />
                            </div>
                            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem; padding-bottom: 4px;">
                                <button type="submit" style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                                    <i data-icon="check"></i> Update &amp; Regenerate Itinerary
                                </button>
                            </div>
                        </form>
                    </div>
                ` : (isPartnerPage && trip.status === 'completed') ? `
                    <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; border-left: 4px solid #22c55e; background: #f0fdf4;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; color: #15803d; display: flex; align-items: center; gap: 8px;"><i data-icon="checkcircle"></i> Trip Successfully Completed</h3>
                        <p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: #166534;">
                            <strong>Traveler:</strong> ${escapeHTML(trip.travelerName)} &nbsp;|&nbsp;
                            <strong>Duration:</strong> ${tripDays(trip)} days &nbsp;|&nbsp;
                            <strong>Completed:</strong> ${escapeHTML(formatShortDate(trip.completedAt || trip.endDate))}
                        </p>
                        <p style="margin: 0.25rem 0 0; font-size: 0.8rem; color: #166534; font-style: italic;">This trip record is read-only. No further edits can be made.</p>
                    </div>
                ` : ''}

                <div class="schedule-feed">${renderScheduleFeed(trip)}</div>
                
                ${isPartnerPage && trip.status !== 'completed' ? `
                    <div class="card" style="padding: 1.5rem; margin-top: 1.5rem;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; margin-bottom: 1rem; color: var(--text-main, var(--foreground, #1e293b));"><i data-icon="plus-circle"></i> Add Custom Activity to Schedule</h3>
                        <form id="add-schedule-item-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">Day Number</label>
                                <input type="number" class="form-control" id="new-item-day" min="1" max="${tripDays(trip) || 30}" value="1" required style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">Time</label>
                                <input type="text" class="form-control" id="new-item-time" placeholder="e.g. 10:00 AM" required style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">Activity / Service Title</label>
                                <input type="text" class="form-control" id="new-item-title" placeholder="e.g. Visit Eiffel Tower" required style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">Location</label>
                                <input type="text" class="form-control" id="new-item-loc" placeholder="e.g. Champ de Mars" required style="padding: 8px; border-radius: 4px; border: 1px solid var(--border);" />
                            </div>
                            <div class="form-group">
                                <label class="form-label" style="font-size: 0.85rem;">Assigned Role</label>
                                <select class="form-control" id="new-item-owner" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-card, #fff); color: var(--text-main, #000);">
                                    <option value="guide">Tour Guide</option>
                                    <option value="vendor">Vendor (Transport/Hotel)</option>
                                </select>
                            </div>
                            <div class="form-group" style="grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 0.5rem;">
                                <button type="submit" style="background: linear-gradient(135deg, #0ea5e9, #14b8a6); color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                    Add to Itinerary
                                </button>
                            </div>
                        </form>
                    </div>
                ` : ''}
            ` : `<div class="card" style="padding:24px;">Schedule will be displayed after the travel partner starts the trip.</div>`}
        `;

        if (canSeeSchedule && isPartnerPage) {
            // Handle trip duration update / extend form
            const extendForm = document.getElementById('extend-trip-form');
            if (extendForm) {
                extendForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const newStart = document.getElementById('trip-start-date').value;
                    const newEnd = document.getElementById('trip-end-date').value;
                    if (!newStart || !newEnd) { notify('Please select both start and end dates.', 'warning'); return; }
                    if (new Date(newEnd) <= new Date(newStart)) { notify('End date must be after start date.', 'warning'); return; }
                    updateTrip(trip.id, (t) => {
                        t.startDate = newStart;
                        t.endDate = newEnd;
                        // Clear existing schedule so it gets regenerated for new date range
                        t.schedule = [];
                        addUpdate(t, 'Travel Partner', 'Itinerary Updated', `Travel partner updated trip dates to ${newStart} – ${newEnd} and regenerated the full itinerary schedule.`, 'Approved');
                    });
                    notify(`Itinerary regenerated for ${newStart} to ${newEnd}. All days are now covered.`, 'success');
                    renderAll();
                });
            }

            const addForm = document.getElementById('add-schedule-item-form');
            if (addForm) {
                addForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const timeInput = document.getElementById('new-item-time');
                    const titleInput = document.getElementById('new-item-title');
                    const locInput = document.getElementById('new-item-loc');
                    const ownerInput = document.getElementById('new-item-owner');
                    const dayInput = document.getElementById('new-item-day');

                    const day = parseInt(dayInput?.value || '1');
                    const time = timeInput?.value || '';
                    const title = titleInput?.value || '';
                    const loc = locInput?.value || '';
                    const owner = ownerInput?.value || 'guide';

                    updateTrip(trip.id, (t) => {
                        t.schedule = t.schedule || [];
                        t.schedule.push({
                            id: `SCH-${t.id}-${Date.now()}`,
                            day,
                            date: t.startDate ? addDays(t.startDate, day - 1) : '',
                            time,
                            title,
                            owner,
                            location: loc,
                            status: 'upcoming',
                            updatedBy: 'Travel Partner',
                            updatedAt: new Date().toISOString(),
                            notes: ''
                        });
                        t.schedule.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
                    });

                    // Clear the inputs
                    if (timeInput) timeInput.value = '';
                    if (titleInput) titleInput.value = '';
                    if (locInput) locInput.value = '';

                    notify('Schedule item added successfully!', 'success');
                    renderAll();
                });
            }

            container.querySelectorAll('.btn-remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemId = btn.getAttribute('data-item-id');
                    updateTrip(trip.id, (t) => {
                        t.schedule = (t.schedule || []).filter(item => item.id !== itemId);
                    });
                    notify('Schedule item removed successfully!', 'success');
                    renderAll();
                });
            });
        }

        iconRefresh(container);
    }

    function clearStaticShellWhileHydrating() {
        const pageName = currentPage();
        const path = decodeURIComponent(window.location.pathname);
        if (pageName === 'superuser_dashboard.html') {
            const page = document.querySelector('.sa-dashboard');
            if (page && !page.dataset.liveShellCleared) {
                page.dataset.liveShellCleared = 'true';
                page.innerHTML = `
                    <div class="welcome-banner" style="background:linear-gradient(135deg,#6366f1,#c084fc);padding:28px 30px;border-radius:14px;color:#fff;margin-bottom:22px;">
                        <h1 style="color:#fff;margin:0 0 8px;">Dream Destination Platform Control</h1>
                        <p style="margin:0;color:rgba(255,255,255,.9);">Loading live backend data...</p>
                    </div>
                    <div class="sa-section-card" style="padding:24px;color:#64748b;">Realtime dashboard will appear here after backend state loads.</div>
                `;
                iconRefresh(page);
            }
        }
        if (path.includes('/guide/')) {
            const page = document.querySelector('.page-content');
            if (!page || page.dataset.liveShellCleared) return;
            page.dataset.liveShellCleared = 'true';
            page.querySelectorAll('.stat-number-premium, .stat-value').forEach((node) => {
                node.textContent = '0';
            });
            const assignmentList = page.querySelector('.assignment-list');
            if (assignmentList) assignmentList.innerHTML = emptyPanel('Loading live guide assignments...');
            const activeList = page.querySelector('.active-tours-list');
            if (activeList) activeList.innerHTML = emptyPanel('Loading live active tours...');
            const dashboardActivity = page.querySelector('.card.p-6 .pl-2');
            if (dashboardActivity) dashboardActivity.innerHTML = emptyPanel('Loading live guide activity...');
            const assignmentGrid = page.querySelector('.assignment-card')?.parentElement;
            if (assignmentGrid) assignmentGrid.innerHTML = '<div class="assignment-card dashboard-card" style="grid-column:1/-1;padding:24px;color:#64748b;">Loading live assignments...</div>';
            const tableBody = page.querySelector('table tbody');
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Loading live accepted assignments...</td></tr>';
            const scheduleList = page.querySelector('.schedule-list-high');
            if (scheduleList) scheduleList.innerHTML = '<div class="card" style="padding:24px;color:#64748b;">Loading live schedules...</div>';
            const updateBody = page.querySelector('.card .card-body');
            if (updateBody) updateBody.innerHTML = '<div class="update-item">Loading live guide updates...</div>';
            const notificationList = page.querySelector('.notif-list-container');
            if (notificationList) notificationList.innerHTML = '<div class="notif-item-full"><div class="notif-content-full"><div class="notif-title-full">Loading live notifications</div><p class="notif-desc-full">Assignments and updates will appear here from backend state.</p></div></div>';
            const activityCard = page.querySelector('.activity-card');
            if (activityCard) activityCard.innerHTML = '<div class="activity-header"><h2 class="text-lg font-bold text-gray-900">Recent Activity Timeline</h2></div><div class="activity-row"><div class="activity-icon blue"><i data-icon="activity"></i></div><div class="activity-details"><div class="activity-title">Loading live activity</div><div class="activity-desc">Guide activity will appear after assignments or schedule updates.</div><div class="activity-meta"><i data-icon="clock"></i> Fresh start</div></div><div class="tour-pill">0</div></div>';
            iconRefresh(page);
        }
    }
    function checkAndTriggerPopupsForCurrentPortal(state) {
        if (typeof NotificationPopup === 'undefined' || !NotificationPopup.isPortalPage() || !NotificationPopup.isTabActive()) return;
        try {
            const session = readSession();
            const activeRole = roleFromPath() || session?.role || 'partner';
            const notifications = (state.notifications || []).filter(n =>
                isNotificationForCurrentUser(n, session, state)
            );
            notifications.slice(0, 3).reverse().forEach(notif => {
                const isUnread = !(notif.readBy || []).includes(activeRole);
                if (isUnread && !NotificationPopup.isSeen(notif.id)) {
                    NotificationPopup.show(notif);
                }
            });
        } catch (_) { }
    }



    function renderAll() {
        if (!backendHydrated && !backendHydrating && typeof fetch === 'function') {
            clearStaticShellWhileHydrating();
            hydrateStateFromBackend();
            return;
        }
        const state = loadState();
        renderSessionHeader();
        renderProfilePage();
        renderNotificationDots(state);
        checkAndTriggerPopupsForCurrentPortal(state);
        renderHeaderNotifications(state);
        renderMonthlySalaryWidget(state);
        renderSuperuserAlerts(state);
        renderTravelerAlerts(state);
        renderPartnerNotifications(state);
        renderGuideNotifications(state);
        renderVendorNotifications(state);
        renderSupportNotifications(state);
        renderMemberMessages(state);
        renderIssueForms(state);
        renderSupportIssues(state);
        renderSupportIssueLog(state);
        renderResolutionUpdates(state);
        renderTravelerMyTrips(state);
        renderTravelerDashboard(state);
        renderGuideDashboard(state);
        renderVendorDashboard(state);
        renderSupportDashboard(state);
        renderSupportTripStatus(state);
        renderSupportCoordinationPanel(state);
        renderSupportEmergencySupport(state);
        renderSupportTripDetails(state);
        renderSuperuserDashboard(state);
        renderSuperuserDirectoryPages(state);
        renderSuperuserTripDetails(state);
        renderSuperuserSupport(state);
        renderSuperuserReports(state);
        renderPartnerDashboard(state);
        renderPartnerTrips(state);
        renderPartnerSchedules(state);
        renderAssignmentPage(state, 'guide');
        renderAssignmentPage(state, 'vendor');
        renderGuideAssignments(state);
        renderGuideSchedules(state);
        renderGuideTourUpdates(state);
        renderGuideActivityLog(state);
        renderVendorTravelerSchedules(state);
        renderVendorRequests(state);
        renderVendorActiveServices(state);
        renderVendorUpdates(state);
        renderVendorServiceHistory(state);
        renderVendorReportedIssues(state);
        renderExecution(state);
        renderTravelerProgress(state);
        renderTravelerSchedule(state);
        renderTravelerTripDetails(state);
        renderTravelerEditTrip(state);
        renderTravelerSupportPage(state);
        renderScheduleDetailPages(state);
        renderProfilePage();
        renderAssignedTravelersWidget(state);
        setupScheduleFilters();
        iconRefresh(document);
    }

    function setupScheduleFilters() {
        const searchInputs = document.querySelectorAll(
            '.f-search input, .filter-search input, .search-input input, .filter-bar-high input, .filter-bar input, .filter-header input, .top-header .search-bar input'
        );
        const filterSelects = document.querySelectorAll(
            'select.f-select, select.filter-dropdown, select.form-select'
        );

        if (searchInputs.length === 0 && filterSelects.length === 0) return;

        const applyFilters = () => {
            let query = '';
            searchInputs.forEach(input => {
                if (input.value.trim()) query = input.value.trim().toLowerCase();
            });

            let statusFilter = 'all';
            filterSelects.forEach(select => {
                const val = (select.value || '').toLowerCase();
                if (val && !['all', 'all status', 'all services', 'all stages'].includes(val)) {
                    statusFilter = val;
                }
            });

            const cards = document.querySelectorAll(
                '.schedule-card-high, .schedule-card, .day-card, .notif-item-full, .tour-card'
            );

            let visibleCount = 0;
            cards.forEach(card => {
                const cardText = (card.textContent || '').toLowerCase();
                const matchesQuery = !query || cardText.includes(query);

                let matchesStatus = true;
                if (statusFilter !== 'all') {
                    const statusPill = card.querySelector('.badge, .tag-pill, .tag-ongoing, .tag-upcoming, .tag-completed, .sc-badges, .tags, .status-pill');
                    const badgeText = statusPill ? (statusPill.textContent || '').toLowerCase() : '';

                    if (statusFilter.includes('ongoing') || statusFilter.includes('active')) {
                        matchesStatus = cardText.includes('ongoing') || badgeText.includes('ongoing') || cardText.includes('active') || badgeText.includes('in progress');
                    } else if (statusFilter.includes('upcoming') || statusFilter.includes('pending')) {
                        matchesStatus = cardText.includes('upcoming') || badgeText.includes('upcoming') || cardText.includes('pending');
                    } else if (statusFilter.includes('completed') || statusFilter.includes('history')) {
                        matchesStatus = cardText.includes('completed') || badgeText.includes('completed') || badgeText.includes('done');
                    }
                }

                if (matchesQuery && matchesStatus) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            const listContainer = document.querySelector('.schedule-list-high, #dd-vendor-schedules, #dd-partner-schedules, .page-scroll, .page-content');
            let emptyMsg = document.getElementById('dd-schedule-empty-notice');
            if (visibleCount === 0 && cards.length > 0) {
                if (!emptyMsg && listContainer) {
                    emptyMsg = document.createElement('div');
                    emptyMsg.id = 'dd-schedule-empty-notice';
                    emptyMsg.style.cssText = 'padding: 32px; text-align: center; color: var(--text-secondary, #64748b); background: var(--bg-card-alt, #f8fafc); border-radius: 12px; border: 1px solid var(--border-color, #e2e8f0); margin: 16px 0; font-weight: 600; width: 100%;';
                    emptyMsg.innerHTML = `<i data-icon="search" style="width: 32px; height: 32px; opacity: 0.5; margin-bottom: 8px;"></i><div>No matching traveler schedules found</div>`;
                    listContainer.appendChild(emptyMsg);
                    if (typeof iconRefresh === 'function') iconRefresh(emptyMsg);
                }
            } else if (emptyMsg) {
                emptyMsg.remove();
            }
        };

        searchInputs.forEach(input => {
            if (!input.dataset.ddFilterWired) {
                input.dataset.ddFilterWired = 'true';
                input.addEventListener('input', applyFilters);
                input.addEventListener('keyup', applyFilters);
            }
        });

        filterSelects.forEach(select => {
            if (!select.dataset.ddFilterWired) {
                select.dataset.ddFilterWired = 'true';
                select.addEventListener('change', applyFilters);
            }
        });

        if (Array.from(searchInputs).some(i => i.value.trim()) || Array.from(filterSelects).some(s => s.value && !['all', 'all status', 'all services', 'all stages'].includes(s.value.toLowerCase()))) {
            applyFilters();
        }
    }

    function renderTravelerSupportPage(state) {
        if (!document.querySelector('.support-top-grid')) return;
        const users = Array.isArray(state.users) ? state.users : [];
        const supportExec = users.find(u => u.role === 'support' || u.email?.includes('support')) || {
            name: 'Mahendra Kumar',
            email: 'mahendra.support@dreamdestination.com',
            phone: '+91 98765 43210',
            role: 'Support Executive'
        };
        const initials = supportExec.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'MK';

        document.querySelectorAll('[data-support-name]').forEach(el => el.textContent = supportExec.name);
        document.querySelectorAll('[data-support-email]').forEach(el => el.textContent = supportExec.email);
        document.querySelectorAll('[data-support-phone]').forEach(el => el.textContent = supportExec.phone || '+91 98765 43210');
        document.querySelectorAll('[data-support-initials]').forEach(el => el.textContent = initials);
    }

    function submitGuideStatus(form) {
        const tripSelect = form.querySelector('[data-dd-field="tripId"]') || form.querySelector('select');
        const scheduleSelect = form.querySelector('[data-dd-schedule-select]');
        const statusSelect = form.querySelector('[data-dd-field="status"]') || Array.from(form.querySelectorAll('select')).find((select) => select !== tripSelect && select !== scheduleSelect);
        const locationInput = form.querySelector('input');
        const notesInput = form.querySelector('textarea');
        const tripId = tripSelect?.value;
        const scheduleItemId = scheduleSelect?.value;
        const status = statusSelect?.value;
        const statusText = statusSelect?.selectedOptions?.[0]?.textContent || 'Status Update';
        const location = locationInput?.value;
        const notes = notesInput?.value || statusText;
        if (!tripId || !status) {
            notify('Select a tour and status first.', 'error');
            return;
        }
        if (!scheduleItemId) {
            notify('Select the current schedule item first.', 'error');
            return;
        }
        guideUpdate(tripId, { scheduleItemId, status, statusText, location, notes });
        form.reset();
        if (typeof showSuccessModal === 'function') {
            showSuccessModal("Tour Status Updated", "Tour status updated for traveler and partner dashboards.", () => { renderAll(); });
        } else {
            notify('Tour status updated for traveler and partner dashboards.', 'success');
            renderAll();
        }
    }

    function submitGuideMessage(form) {
        const controls = form.querySelectorAll('select, textarea');
        const selects = form.querySelectorAll('select');
        const tripId = selects[0]?.value;
        const typeText = selects[1]?.selectedOptions?.[0]?.textContent || 'Traveler Guidance';
        const message = controls[controls.length - 1]?.value;
        if (!tripId || !message) {
            notify('Select a tour and enter a message.', 'error');
            return;
        }
        guideMessage(tripId, { typeText, message });
        form.reset();
        if (typeof showSuccessModal === 'function') {
            showSuccessModal("Guidance Sent", "Guidance sent to traveler progress.", () => { renderAll(); });
        } else {
            notify('Guidance sent to traveler progress.', 'success');
            renderAll();
        }
    }

    function submitVendorUpdate(card) {
        const tripSelect = card.querySelector('[data-dd-field="tripId"]') || card.querySelector('select');
        const scheduleSelect = card.querySelector('[data-dd-schedule-select]');
        const serviceSelect = card.querySelector('[data-dd-field="serviceType"]');
        const statusSelect = card.querySelector('[data-dd-field="status"]') || Array.from(card.querySelectorAll('select')).pop();
        const message = card.querySelector('textarea')?.value;
        const tripId = tripSelect?.value;
        const scheduleItemId = scheduleSelect?.value;
        const serviceType = serviceSelect?.value;
        const status = statusSelect?.value;
        const statusText = statusSelect?.selectedOptions?.[0]?.textContent || 'In Progress';
        if (!tripId || !scheduleItemId || !serviceType || !status || !message) {
            notify('Fill all vendor update fields first.', 'error');
            return;
        }
        vendorUpdate(tripId, { scheduleItemId, status, statusText, serviceType, message });
        card.querySelectorAll('select, textarea').forEach((control) => { control.value = ''; });
        if (typeof showSuccessModal === 'function') {
            showSuccessModal("Vendor Update Saved", "Vendor update is now visible in traveler progress and partner execution.", () => { renderAll(); });
        } else {
            notify('Vendor update is now visible in traveler progress and partner execution.', 'success');
            renderAll();
        }
    }

    function selectedText(select) {
        return select?.selectedOptions?.[0]?.textContent?.trim() || '';
    }

    async function collectIssueReport(button) {
        const container = button ? (button.closest('form') || button.closest('.form-card') || button.closest('.form-panel') || document) : document;
        const selects = Array.from(container.querySelectorAll('select'));
        const inputs = Array.from(container.querySelectorAll('input[type="text"]'));
        const textarea = container.querySelector('textarea');
        const tripSelect = selects.find((select) => String(select.value).startsWith('TRIP-')) || selects[0];
        const typeSelect = selects.find((select) => select !== tripSelect && selectedText(select).toLowerCase().includes('issue')) || selects[1] || selects[0];
        const prioritySelect = selects.find((select) => /low|medium|high|critical/i.test(selectedText(select))) || selects[selects.length - 1];
        const role = roleFromPath();
        const session = readSession();

        let attachmentUrl = '';
        const attachmentInput = container.querySelector('[data-attachment-url], #issue-attachment-url, input[name="attachmentUrl"]');
        if (attachmentInput) {
            attachmentUrl = attachmentInput.dataset?.attachmentUrl || attachmentInput.getAttribute?.('data-attachment-url') || attachmentInput.value || '';
        }
        if (!attachmentUrl) {
            const uploadZone = container.querySelector('.upload-zone, [data-upload-zone]');
            if (uploadZone) {
                attachmentUrl = uploadZone.dataset?.attachmentUrl || uploadZone.getAttribute?.('data-attachment-url') || '';
            }
        }
        if (!attachmentUrl) {
            try {
                attachmentUrl = sessionStorage.getItem('dd_issue_attachment_url') || '';
            } catch (e) {}
        }
        if (!attachmentUrl) {
            const fileInput = container.querySelector('input[type="file"].issue-file-input, input[type="file"]');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const rawFile = fileInput.files[0];
                attachmentUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result || '');
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(rawFile);
                });
            }
        }

        return {
            tripId: tripSelect?.value || '',
            type: selectedText(typeSelect).replace(/^Select\s+/i, '') || 'General',
            title: inputs[0]?.value || selectedText(typeSelect).replace(/^Select\s+/i, '') || 'Reported Issue',
            description: textarea?.value || inputs[1]?.value || 'Issue reported from portal form.',
            priority: selectedText(prioritySelect).replace(/^Select\s+/i, '') || 'Medium',
            attachmentUrl,
            reporterRole: ROLE_LABELS[role] || 'Traveler',
            reportedBy: session.name || (role === 'guide' ? 'Tour Guide' : role === 'vendor' ? 'Vendor' : 'Traveler'),
        };
    }

    async function submitIssueReport(button) {
        if (typeof window.submitReportedIssue === 'function') {
            await window.submitReportedIssue(button);
            return;
        }
        const data = await collectIssueReport(button);
        const issue = reportIssue(data);
        const form = button.closest('form') || button.closest('.form-card') || button.closest('.form-panel');
        form?.querySelectorAll('input[type="text"], textarea').forEach((control) => { control.value = ''; });

        if (typeof showSuccessModal === 'function') {
            showSuccessModal("Report Submitted", `Issue ${issue.id} sent to support executive.`, () => { renderAll(); });
        } else {
            notify(`Issue ${issue.id} sent to support executive.`, 'success');
            renderAll();
        }
    }

    function submitResolution(button) {
        const form = button.closest('form');
        const issueId = button.dataset.issueId || form?.querySelector('select')?.value;
        const resolution = form?.querySelector('textarea')?.value || 'Resolved by support executive.';
        if (!issueId) {
            notify('Choose an issue to resolve first.', 'error');
            return;
        }
        resolveIssue(issueId, resolution);
        form?.reset();

        if (typeof showSuccessModal === 'function') {
            showSuccessModal("Issue Resolved", `${issueId} resolved and stakeholders notified.`, () => { renderAll(); });
        } else {
            notify(`${issueId} resolved and stakeholders notified.`, 'success');
            renderAll();
        }
    }

    function submitMemberMessage(button) {
        const center = button.closest('[data-dd-message-center]') || document;
        const tripSelect = center.querySelector('[data-dd-message-trip]');
        const recipientSelect = center.querySelector('[data-dd-message-recipient]');
        const input = center.querySelector('[data-dd-message-input]');
        const tripId = tripSelect?.value || selectedMessageTrip(loadState())?.id || '';
        const body = input?.value?.trim() || '';
        if (!tripId || !body) {
            notify('Select a trip and enter a message first.', 'error');
            return;
        }
        setStoredMessageTripId(tripId);
        sendMemberMessage({
            tripId,
            toRole: recipientSelect?.value || 'all',
            body,
        });
        if (input) input.value = '';
        notify('Message sent and notified to the selected members.', 'success');
        renderAll();
    }

    function attachHandlers() {
        if (attachHandlers.done) return;
        attachHandlers.done = true;

        document.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('button');
            if (clickedButton && /submit issue|report issue|issue report/i.test(clickedButton.innerText || '') && !clickedButton.dataset.ddAction) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (!canOperateSession()) return;
                submitIssueReport(clickedButton);
                return;
            }

            if (clickedButton?.id === 'sa-add-guide-btn') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (!canOperateSession()) return;
                addGuideFromPrompt();
                return;
            }

            if (clickedButton?.id === 'sa-add-vendor-btn') {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (!canOperateSession()) return;
                addVendorFromPrompt();
                return;
            }

            const button = event.target.closest('[data-dd-action]');
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const action = button.dataset.ddAction;
            const tripId = button.dataset.tripId;

            if (action === 'mark-read') {
                const notifId = button.dataset.notifId || event.target.closest('[data-notif-id]')?.dataset.notifId;
                const session = readSession();
                const role = (session.role || roleFromPath() || 'traveler').toLowerCase();
                const state = loadState();
                const notif = (state.notifications || []).find(n => n.id === notifId);
                if (notif) {
                    notif.readBy = notif.readBy || [];
                    if (!notif.readBy.includes(role)) {
                        notif.readBy.push(role);
                    }
                    saveState(state, true, true);
                    renderAll();
                }
                return;
            }

            if (action === 'delete-notif' || action === 'delete-notification') {
                const notifId = button.dataset.notifId
                    || button.getAttribute('data-notif-id')
                    || event.target.closest('[data-notif-id]')?.dataset?.notifId
                    || event.target.closest('[data-notif-id]')?.getAttribute('data-notif-id')
                    || event.target.closest('.notif-card')?.id
                    || event.target.closest('.notif-item-full')?.id
                    || event.target.closest('.alert-card')?.id
                    || event.target.closest('.alert-row')?.id;

                if (notifId) {
                    const state = loadState();
                    state.deletedNotifIds = state.deletedNotifIds || [];
                    if (!state.deletedNotifIds.includes(notifId)) {
                        state.deletedNotifIds.push(notifId);
                    }
                    if (Array.isArray(state.notifications)) {
                        state.notifications = state.notifications.filter(n => n.id !== notifId);
                    }
                    saveState(state, true, true);
                    renderAll();
                    if (typeof showToast === 'function') {
                        showToast('Notification deleted', 'info');
                    }
                }
                return;
            }

            if (action === 'mark-all-read' || action === 'mark-all-as-read') {
                if (window.markAllNotifsAsRead) {
                    window.markAllNotifsAsRead();
                } else if (window.markAllAlertsAsRead) {
                    window.markAllAlertsAsRead();
                }
                return;
            }

            if (action === 'delete-all-notifs' || action === 'delete-all' || action === 'delete-all-notifications') {
                if (window.deleteAllNotifs) {
                    window.deleteAllNotifs();
                } else if (window.deleteAllPartnerNotifs) {
                    window.deleteAllPartnerNotifs();
                }
                return;
            }
            if (action === 'route') {
                routeTo(button.dataset.ddTarget || '#');
                return;
            }

            if (action === 'select-message-trip') {
                setStoredMessageTripId(button.dataset.tripId);
                renderAll();
                return;
            }

            if (action === 'member-message-submit') {
                submitMemberMessage(button);
                return;
            }

            if (action === 'view-directory-record' || action === 'view-vendor' || action === 'view-guide') {
                const type = button.dataset.type || (currentPage().includes('vendor') ? 'vendor' : 'guide');
                const id = button.dataset.id;
                const name = button.dataset.name;
                openDirectoryRecordModal(type, id, name);
                return;
            }

            if (action === 'download-super-report') {
                if (!canOperateSession()) return;
                downloadSuperuserReportPdf();
                return;
            }

            if (!canOperateSession()) return;

            if (action === 'remove-guide') {
                confirmThen('Remove Guide', 'Remove this guide from the live directory?', 'Remove', 'red', () => {
                    removeDirectoryRecord('guide', button.dataset.id);
                });
                return;
            }

            if (action === 'remove-vendor') {
                confirmThen('Remove Vendor', 'Remove this vendor from the live directory?', 'Remove', 'red', () => {
                    removeDirectoryRecord('vendor', button.dataset.id);
                });
                return;
            }

            if (action === 'cancel-trip' || action === 'request-cancel-trip') {
                const session = readSession();
                const roleLower = String(session?.role || '').toLowerCase();
                const isTraveler = action === 'request-cancel-trip' || roleLower.includes('traveler') || roleLower.includes('customer') || roleLower === 'user' || !session?.role;
                const title = isTraveler ? 'Request Cancellation' : 'Cancel Trip';
                const message = isTraveler
                    ? 'Submit a cancellation request for this trip? Your Travel Partner will review and approve the cancellation.'
                    : 'Cancel this trip?';
                const confirmLabel = isTraveler ? 'Send Request' : 'Cancel Trip';

                confirmThen(title, message, confirmLabel, 'red', () => {
                    if (isTraveler) {
                        requestTripCancellation(tripId);
                        notify('Cancellation request sent to Travel Partner.', 'warning');
                    } else {
                        cancelTrip(tripId);
                        notify('Trip cancelled.', 'warning');
                    }
                    renderAll();
                });
                return;
            }

            if (action === 'accept-trip-cancellation') {
                confirmThen('Accept Cancellation', 'Accept the traveler\'s cancellation request and officially cancel this trip?', 'Accept & Cancel', 'red', () => {
                    acceptTripCancellation(tripId);
                    notify('Trip cancellation accepted. Super Admin has been notified to process the refund.', 'success');
                    renderAll();
                });
                return;
            }

            if (action === 'reject-trip-cancellation') {
                confirmThen('Decline Cancellation', 'Decline the cancellation request and keep this trip active?', 'Decline', 'gray', () => {
                    rejectTripCancellation(tripId);
                    notify('Cancellation request declined. Trip remains active.', 'info');
                    renderAll();
                });
                return;
            }

            if (action === 'accept-trip') {
                confirmThen('Accept Request', 'Accept this traveler request and start planning?', 'Accept', 'green', () => {
                    acceptTrip(tripId);
                    notify('Trip request accepted. Assign guide and vendor next.', 'success');
                    renderAll();
                });
                return;
            }

            if (action === 'reject-trip') {
                confirmThen('Reject Request', 'Reject this traveler trip request?', 'Reject', 'red', () => {
                    rejectTrip(tripId);
                    notify('Trip request rejected.', 'warning');
                    renderAll();
                });
                return;
            }

            if (action === 'ack-cancel') {
                confirmThen('Acknowledge Cancellation', 'Acknowledge this trip cancellation and process records?', 'Acknowledge', 'blue', () => {
                    ackCancellation(tripId);
                    notify('Cancellation acknowledged.', 'success');
                    renderAll();
                });
                return;
            }

            if (action === 'approve-itinerary') {
                confirmThen('Approve Modifications', 'Approve the updated itinerary preferences for this trip?', 'Approve', 'green', () => {
                    approveItinerary(tripId);
                    notify('Itinerary modifications approved! Stakeholders have been notified.', 'success');
                    renderAll();
                });
                return;
            }

            if (action === 'ack-update') {
                notify('Update acknowledged.', 'success');
                renderAll();
                return;
            }

            if (action === 'save-traveler-edit') {
                submitTravelerTripEdit();
                return;
            }

            if (action === 'send-trip-to-support') {
                confirmThen('Send to Support', 'Send this trip to support executive for coordination?', 'Send', 'orange', () => {
                    sendTripToSupport(tripId);
                    notify('Trip sent to support executive.', 'success');
                    renderAll();
                });
                return;
            }

            if (action === 'accept-trip-support') {
                confirmThen('Accept Support Request', 'Accept coordination for this trip?', 'Accept', 'green', () => {
                    acceptTripSupport(tripId);
                    notify('Trip support coordination accepted.', 'success');
                    renderAll();
                });
                return;
            }

            if (action === 'start-trip') {
                const session = readSession();
                const roleLower = String(session.role || roleFromPath() || '').toLowerCase();
                if (roleLower.includes('traveler')) {
                    notify('Trips can only be started by your Travel Partner.', 'warning');
                    return;
                }
                const trip = startTrip(tripId);
                if (trip?.scheduleStarted) notify('Trip started by Travel Partner. Package schedule is now active for all members.', 'success');
                else notify('Trip cannot be started yet. Ensure guide/vendor accepted or traveler completed payment.', 'warning');
                renderAll();
                return;
            }

            if (action === 'open-payment-modal' || action === 'pay-trip') {
                window.openPaymentModal(tripId);
                return;
            }

            if (action === 'assign-guide') {
                const state = loadState();
                const trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
                const targetGuide = assignableGuides(state).find(g => g.name === button.dataset.name);
                const guideStatus = targetGuide ? String(targetGuide.status || 'Available') : 'Available';
                const isAvail = guideStatus.toLowerCase() === 'available' || guideStatus.toLowerCase().includes('on duty') || guideStatus.toLowerCase().includes('active');
                if (!isAvail) {
                    notify(`${button.dataset.name} is currently ${guideStatus} and cannot be assigned.`, 'error');
                    return;
                }
                const doAssign = () => {
                    assignGuide(tripId, button.dataset.name);
                    notify(`Assignment request sent to ${button.dataset.name}. Status: Pending Guide Acceptance.`, 'info');
                    renderAll();
                };
                if (trip && trip.guide && trip.guide.name !== button.dataset.name) {
                    confirmThen('Reassign Guide', `Reassign trip ${trip.id} from ${trip.guide.name} to ${button.dataset.name}?`, 'Reassign', 'orange', doAssign);
                } else {
                    doAssign();
                }
                return;
            }

            if (action === 'assign-vendor') {
                const state = loadState();
                const trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
                const targetVendor = assignableVendors(state).find(v => v.name === button.dataset.name);
                const vendorStatus = targetVendor ? String(targetVendor.status || 'Available') : 'Available';
                const isAvail = vendorStatus.toLowerCase() === 'available' || vendorStatus.toLowerCase().includes('active');
                if (!isAvail) {
                    notify(`${button.dataset.name} is currently ${vendorStatus} and cannot be assigned.`, 'error');
                    return;
                }
                const doAssign = () => {
                    assignVendor(tripId, button.dataset.name, button.dataset.service);
                    notify(`Assignment request sent to ${button.dataset.name}. Status: Pending Vendor Acceptance.`, 'info');
                    renderAll();
                };
                if (trip && trip.vendor && trip.vendor.name !== button.dataset.name) {
                    confirmThen('Reassign Vendor', `Reassign trip ${trip.id} from ${trip.vendor.name} to ${button.dataset.name}?`, 'Reassign', 'orange', doAssign);
                } else {
                    doAssign();
                }
                return;
            }

            if (action === 'accept-guide') {
                acceptGuide(tripId);
                notify('Guide assignment accepted.', 'success');
                renderAll();
                return;
            }

            if (action === 'reject-guide') {
                rejectGuide(tripId);
                notify('Guide assignment rejected and returned to partner.', 'warning');
                renderAll();
                return;
            }

            if (action === 'accept-vendor') {
                acceptVendor(tripId);
                notify('Vendor service accepted.', 'success');
                renderAll();
                return;
            }

            if (action === 'reject-vendor') {
                rejectVendor(tripId);
                notify('Vendor request rejected and returned to partner.', 'warning');
                renderAll();
                return;
            }

            if (action === 'complete-service') {
                vendorUpdate(tripId, { status: 'completed', statusText: 'Completed', message: 'Service marked completed by vendor.' });
                notify('Service marked completed.', 'success');
                renderAll();
                return;
            }

            if (action === 'guide-status-submit') {
                submitGuideStatus(button.closest('form'));
                return;
            }

            if (action === 'guide-message-submit') {
                submitGuideMessage(button.closest('form'));
                return;
            }

            if (action === 'vendor-update-submit') {
                submitVendorUpdate(button.closest('.form-card'));
                return;
            }

            if (action === 'resolve-issue') {
                confirmThen('Resolve Issue', 'Mark this issue as resolved and notify all stakeholders?', 'Resolve', 'green', () => {
                    submitResolution(button);
                });
                return;
            }

            if (action === 'export-vendor-report' || action === 'export-vendors') {
                exportVendorsCsv();
                return;
            }

            if (action === 'export-guide-report' || action === 'export-guides') {
                exportGuidesCsv();
                return;
            }

            if (action === 'export-trip-report' || action === 'export-trips') {
                exportTripsCsv();
                return;
            }

            if (action === 'export-user-report' || action === 'export-users') {
                if (typeof CRUD !== 'undefined' && CRUD.exportUsersCsv) CRUD.exportUsersCsv();
                else exportUsersCsv();
                return;
            }

            if (action === 'download-super-report' || action === 'export-report') {
                downloadSuperuserReportPdf();
                return;
            }

            // Fallback match for toolbar buttons without explicit data-dd-action
            if (button.id === 'sa-export-vendors-btn' || (button.textContent.includes('Export') && currentPage().includes('vendor'))) {
                exportVendorsCsv();
                return;
            }
            if (button.id === 'sa-export-guides-btn' || (button.textContent.includes('Export') && currentPage().includes('guide'))) {
                exportGuidesCsv();
                return;
            }
            if (button.id === 'sa-export-trips-btn' || (button.textContent.includes('Export') && currentPage().includes('trip'))) {
                exportTripsCsv();
                return;
            }
            if (button.id === 'sa-export-users-btn' || (button.textContent.includes('Export') && currentPage().includes('user'))) {
                if (typeof CRUD !== 'undefined' && CRUD.exportUsersCsv) CRUD.exportUsersCsv();
                else exportUsersCsv();
                return;
            }
        }, true);

        document.addEventListener('change', (event) => {
            const tripSelect = event.target.closest?.('[data-dd-message-trip]');
            if (!tripSelect) return;
            setStoredMessageTripId(tripSelect.value);
            renderAll();
        }, true);

        document.addEventListener('keydown', (event) => {
            const input = event.target.closest?.('[data-dd-message-input]');
            if (!input || event.key !== 'Enter' || event.shiftKey) return;
            event.preventDefault();
            const center = input.closest('[data-dd-message-center]');
            const button = center?.querySelector('[data-dd-action="member-message-submit"]');
            if (button) submitMemberMessage(button);
        }, true);

        document.addEventListener('submit', (event) => {
            const form = event.target.closest('[data-dd-form]');
            const isResolutionForm = currentPage() === 'resolution_updates.html' && event.target.closest('form');
            const isReportIssueForm = (currentPage().includes('report_issue') || currentPage().includes('issue')) && event.target.closest('form');
            
            if (isReportIssueForm || isResolutionForm || form) {
                event.preventDefault();
                event.stopPropagation();
                if (!canOperateSession()) return;
                if (isReportIssueForm) {
                    const btn = event.target?.querySelector('.btn-submit') || event.target?.querySelector('button');
                    submitReportedIssue(btn);
                    return;
                }
                if (isResolutionForm) {
                    submitResolution(event.target?.querySelector('button[type="submit"]') || event.target?.querySelector('button'));
                    return;
                }
                if (form) {
                    if (form.dataset.ddForm === 'guide-status') submitGuideStatus(form);
                    if (form.dataset.ddForm === 'guide-message') submitGuideMessage(form);
                }
            }
        });
    }

    window.DDWorkflow = {
        loadState,
        saveState,
        createTripRequest: makeTripRequest,
        deleteTrip,
        cancelTrip,
        acceptTrip,
        sendTripToSupport,
        acceptTripSupport,
        assignGuide,
        assignVendor,
        acceptGuide,
        acceptVendor,
        startTrip,
        guideUpdate,
        guideMessage,
        vendorUpdate,
        sendMemberMessage,
        reportIssue,
        resolveIssue,
        addGuide: addGuideFromPrompt,
        addGuide: addGuideFromPrompt,
        addVendor: addVendorFromPrompt,
        render: renderAll,
        resetDemoData() {
            const seeded = seedState();
            saveState(seeded);
            renderAll();
            return seeded;
        },
    };

    window.exportVendorsCsv = exportVendorsCsv;
    window.exportGuidesCsv = exportGuidesCsv;
    window.exportTripsCsv = exportTripsCsv;
    window.exportUsersCsv = exportUsersCsv;
    window.downloadSuperuserReportPdf = downloadSuperuserReportPdf;

    window.markAllAlertsAsRead = function () {
        const state = loadState();
        const role = roleFromPath() || 'traveler';
        let updated = false;
        (state.notifications || []).forEach(n => {
            if (n.roles.includes(role) || n.roles.includes('all')) {
                n.readBy = n.readBy || [];
                if (!n.readBy.includes(role)) {
                    n.readBy.push(role);
                    updated = true;
                }
            }
        });
        if (updated) {
            saveState(state, true, true);
            renderAll();
        }
    };

    window.markAllMessagesAsRead = function () {
        const state = loadState();
        const role = roleFromPath() || 'traveler';
        let updated = false;
        (state.messages || []).forEach(m => {
            if ((m.toRoles || []).includes(role) || (m.toRoles || []).includes('all') || m.fromRole === role) {
                m.readBy = m.readBy || [];
                if (!m.readBy.includes(role)) {
                    m.readBy.push(role);
                    updated = true;
                }
            }
        });
        if (updated) {
            saveState(state, true, true);
            renderAll();
        }
    };

    window.readWorkflowState = loadState;
    window.writeWorkflowState = function (state) { saveState(state, true, true); };
    window.saveWorkflowState = function (state) { saveState(state, true, true); };

    window.getAllWorkflowPackages = function () {
        const state = loadState();
        if (state && Array.isArray(state.packages) && state.packages.length > 0) {
            return state.packages;
        }
        return [
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
    };

    window.deleteWorkflowPackage = function (packageId) {
        const state = loadState();
        let pkgs = Array.isArray(state.packages) && state.packages.length > 0 ? state.packages : window.getAllWorkflowPackages();
        state.packages = pkgs.filter(p => p.id !== packageId);
        saveState(state, true, true);
        if (typeof notify === 'function') {
            notify('Package deleted successfully!', 'success');
        }
        return state.packages;
    };

    window.addWorkflowPackage = function (newPkg) {
        const state = loadState();
        let pkgs = Array.isArray(state.packages) && state.packages.length > 0 ? state.packages : window.getAllWorkflowPackages();
        pkgs.unshift(newPkg);
        state.packages = pkgs;
        saveState(state, true, true);
        if (typeof notify === 'function') {
            notify('New package created successfully!', 'success');
        }
        return state.packages;
    };

    window.updateWorkflowPackage = function (updatedPkg) {
        const state = loadState();
        let pkgs = Array.isArray(state.packages) && state.packages.length > 0 ? state.packages : window.getAllWorkflowPackages();
        const index = pkgs.findIndex(p => p.id === updatedPkg.id);
        if (index !== -1) {
            pkgs[index] = { ...pkgs[index], ...updatedPkg };
        } else {
            pkgs.unshift(updatedPkg);
        }
        state.packages = pkgs;
        saveState(state, true, true);
        if (typeof notify === 'function') {
            notify('Package updated successfully!', 'success');
        }
        return state.packages;
    };

    window._showScheduleHistory = false;
    window.toggleScheduleHistory = function () {
        window._showScheduleHistory = !window._showScheduleHistory;
        renderAll();
    };

    window.openPaymentModal = function (tripId) {
        const state = loadState();
        let trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
        if (!trip) {
            const session = readSession();
            const email = (session && session.email) || '';
            const name = (session && session.name) || '';
            if (email || name) {
                trip = (state.trips || []).find(t => (t.travelerEmail === email || t.travelerName === name) && t.paymentStatus !== 'Paid' && t.status !== 'cancelled');
            }
            if (!trip) {
                trip = (state.trips || []).find(t => t.paymentStatus !== 'Paid' && t.status !== 'cancelled');
            }
            if (!trip && state.trips && state.trips.length > 0) {
                trip = state.trips[0];
            }
        }
        if (!trip) {
            if (typeof notify === 'function') notify('No active trip found for payment.', 'error');
            return;
        }

        let modal = document.getElementById('dd-payment-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dd-payment-modal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch;';
            document.body.appendChild(modal);
        }

        const amount = Number(trip.budget || 1200);
        const formattedPay = formatMoney(amount);

        modal.innerHTML = `
            <div style="background:var(--bg-surface, #fff);border:1px solid var(--border-color, #e2e8f0);border-radius:24px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);color:var(--text-primary,#0f172a);animation:modalPop 0.25s cubic-bezier(0.16,1,0.3,1);position:relative;box-sizing:border-box;margin:auto;">
                <button onclick="window.closePaymentModal()" style="position:absolute;top:20px;right:20px;background:none;border:none;color:var(--text-secondary,#64748b);font-size:24px;cursor:pointer;line-height:1;">&times;</button>

                <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
                    <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg, #10b981, #059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;box-shadow:0 8px 16px rgba(16,185,129,0.25);">
                        <i data-icon="creditcard"></i>
                    </div>
                    <div>
                        <h2 style="font-size:20px;font-weight:800;margin:0;color:var(--text-primary,#0f172a);">Trip Payment Checkout</h2>
                        <p style="font-size:13px;color:var(--text-secondary,#64748b);margin:2px 0 0;">Trip ID: <strong>${escapeHTML(trip.id)}</strong> • ${escapeHTML(trip.title)}</p>
                    </div>
                </div>

                <!-- Trip Summary Box -->
                <div style="background:var(--bg-card-alt, #f8fafc);border:1px solid var(--border-color, #e2e8f0);border-radius:16px;padding:18px;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:13px;color:var(--text-secondary,#64748b);font-weight:600;">Destination & Dates</span>
                        <span style="font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">${escapeHTML(trip.destination)} (${escapeHTML(formatDateRange(trip))})</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:13px;color:var(--text-secondary,#64748b);font-weight:600;">Package Status</span>
                        <span style="font-size:12px;font-weight:700;color:#10b981;background:rgba(16,185,129,0.12);padding:4px 10px;border-radius:999px;">Confirmed by Guide & Vendor</span>
                    </div>
                    <div style="height:1px;background:var(--border-color,#e2e8f0);margin:12px 0;"></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:15px;font-weight:800;color:var(--text-primary,#0f172a);">Total Amount Payable</span>
                        <span style="font-size:24px;font-weight:900;color:#10b981;">${formattedPay}</span>
                    </div>
                </div>

                <!-- Payment Options Selector -->
                <div style="margin-bottom:20px;">
                    <label style="display:block;font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);margin-bottom:10px;">Select Payment Method</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                        <button type="button" class="pay-method-btn active" data-method="card" onclick="window.selectPaymentTab(this, 'card')" style="padding:12px;border:2px solid #10b981;border-radius:12px;background:rgba(16,185,129,0.05);color:var(--text-primary,#0f172a);font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            💳 Credit/Debit Card
                        </button>
                        <button type="button" class="pay-method-btn" data-method="upi" onclick="window.selectPaymentTab(this, 'upi')" style="padding:12px;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            📱 UPI / QR Code
                        </button>
                        <button type="button" class="pay-method-btn" data-method="netbanking" onclick="window.selectPaymentTab(this, 'netbanking')" style="padding:12px;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            🏦 Net Banking
                        </button>
                        <button type="button" class="pay-method-btn" data-method="wallet" onclick="window.selectPaymentTab(this, 'wallet')" style="padding:12px;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            👛 Wallet / GPay
                        </button>
                    </div>

                    <!-- Payment Method Details Form Container -->
                    <div id="pay-details-container">
                        <!-- Card View -->
                        <div id="pay-view-card" style="display:block;">
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Cardholder Name</label>
                                <input type="text" id="pay-card-name" value="${escapeHTML(trip.travelerName)}" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-card-alt,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;" />
                            </div>
                            <div style="margin-bottom:12px;">
                                <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Card Number</label>
                                <input type="text" id="pay-card-num" placeholder="4532 •••• •••• 8921" value="4532 8921 4452 8921" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-card-alt,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;" />
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div>
                                    <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Expiry Date</label>
                                    <input type="text" id="pay-card-exp" placeholder="MM/YY" value="08/28" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-card-alt,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;" />
                                </div>
                                <div>
                                    <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">CVV Security Code</label>
                                    <input type="password" id="pay-card-cvv" placeholder="•••" value="882" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-card-alt,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;" />
                                </div>
                            </div>
                        </div>

                        <!-- UPI View -->
                        <div id="pay-view-upi" style="display:none;text-align:center;padding:16px;background:var(--bg-card-alt,#f8fafc);border-radius:12px;border:1px solid var(--border-color,#e2e8f0);">
                            <div style="margin-bottom:12px;">
                                <div style="display:inline-block;padding:12px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                                    <div style="width:130px;height:130px;background:#0f172a;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-size:11px;gap:6px;">
                                        <i data-icon="activity" style="font-size:26px;"></i>
                                        <span style="font-weight:700;">SCAN TO PAY</span>
                                        <span style="font-size:10px;opacity:0.8;">Dream Destination</span>
                                    </div>
                                </div>
                            </div>
                            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Or enter UPI ID (VPA)</label>
                            <input type="text" id="pay-upi-id" value="${escapeHTML((trip.travelerEmail || 'traveler').split('@')[0])}@upi" style="width:100%;max-width:280px;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;text-align:center;" />
                        </div>

                        <!-- Net Banking View -->
                        <div id="pay-view-netbanking" style="display:none;">
                            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:6px;">Select Your Bank</label>
                            <select id="pay-bank-select" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-card-alt,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;">
                                <option value="HDFC Bank">HDFC Bank</option>
                                <option value="ICICI Bank">ICICI Bank</option>
                                <option value="State Bank of India">State Bank of India (SBI)</option>
                                <option value="Axis Bank">Axis Bank</option>
                                <option value="Chase / Bank of America">Chase / Bank of America</option>
                                <option value="Other Bank">Other Popular Bank</option>
                            </select>
                        </div>

                        <!-- Wallet View -->
                        <div id="pay-view-wallet" style="display:none;">
                            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:6px;">Choose Wallet Provider</label>
                            <select id="pay-wallet-select" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-card-alt,#fff);color:var(--text-primary,#0f172a);font-size:14px;outline:none;">
                                <option value="Google Pay">Google Pay / GPay</option>
                                <option value="Apple Pay">Apple Pay</option>
                                <option value="Paytm Wallet">Paytm Wallet</option>
                                <option value="PayPal">PayPal</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div style="display:flex;gap:12px;margin-top:24px;">
                    <button type="button" onclick="window.closePaymentModal()" style="flex:1;padding:14px;border-radius:14px;border:1px solid var(--border-color,#e2e8f0);background:var(--bg-card-alt,#fff);color:var(--text-secondary,#475569);font-weight:700;font-size:14px;cursor:pointer;">Cancel</button>
                    <button type="button" onclick="window.submitTripPayment('${escapeHTML(trip.id)}')" style="flex:2;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg, #10b981, #059669);color:#fff;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 10px 20px -5px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i data-icon="check"></i> Confirm & Pay ${formattedPay}
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        iconRefresh(modal);
    };

    window.closePaymentModal = function () {
        const modal = document.getElementById('dd-payment-modal');
        if (modal) modal.style.display = 'none';
    };

    window.selectPaymentTab = function (btnEl, method) {
        document.querySelectorAll('.pay-method-btn').forEach(b => {
            b.classList.remove('active');
            b.style.border = '1px solid var(--border-color,#cbd5e1)';
            b.style.background = 'var(--bg-surface,#fff)';
            b.style.color = 'var(--text-secondary,#475569)';
        });
        btnEl.classList.add('active');
        btnEl.style.border = '2px solid #10b981';
        btnEl.style.background = 'rgba(16,185,129,0.05)';
        btnEl.style.color = 'var(--text-primary,#0f172a)';

        ['card', 'upi', 'netbanking', 'wallet'].forEach(m => {
            const el = document.getElementById('pay-view-' + m);
            if (el) el.style.display = m === method ? 'block' : 'none';
        });
    };

    window.submitTripPayment = function (tripId) {
        const activeTab = document.querySelector('.pay-method-btn.active');
        const method = activeTab ? activeTab.getAttribute('data-method') : 'Card';
        const methodLabel = method === 'card' ? 'Credit/Debit Card' : method === 'upi' ? 'UPI' : method === 'netbanking' ? 'Net Banking' : 'Wallet';

        const upiId = document.getElementById('pay-upi-id')?.value || '';
        const cardNum = document.getElementById('pay-card-num')?.value || '';
        const bankName = document.getElementById('pay-bank-select')?.value || '';
        const walletName = document.getElementById('pay-wallet-select')?.value || '';
        const accDetail = method === 'upi' ? (upiId ? `UPI: ${upiId}` : 'UPI Account') : method === 'card' ? (cardNum ? `Card ending in ${cardNum.slice(-4)}` : 'Credit/Debit Card') : method === 'netbanking' ? (bankName || 'Net Banking') : (walletName || 'Digital Wallet');

        updateTrip(tripId, (trip, state) => {
            const amt = Number(trip.budget || 1200);
            trip.paymentStatus = 'Paid';
            trip.paidAt = nowISO();
            trip.paymentMethod = methodLabel;
            trip.paymentAccount = accDetail;
            trip.status = 'ready';
            trip.stage = 'Ready';
            if (!trip.guideStatus || trip.guideStatus === 'Assigned' || trip.guideStatus === 'Pending') trip.guideStatus = 'Accepted';
            if (!trip.vendorStatus || trip.vendorStatus === 'Requested' || trip.vendorStatus === 'Pending') trip.vendorStatus = 'Accepted';
            addUpdate(trip, 'Traveler', 'Payment Completed', `Full payment of ${formatMoney(amt)} completed via ${methodLabel} (${accDetail}). Trip is ready for departure.`, 'Paid');
            notifyStakeholders(state, trip, 'Trip Payment Received', `Traveler completed payment of ${formatMoney(amt)} for ${trip.title}. Trip is now ready to start.`, 'Paid', ['partner', 'guide', 'vendor']);
        });

        if (typeof notify === 'function') notify('Payment successful! Your trip is now ready to start.', 'success');
        window.closePaymentModal();
        renderAll();
    };

    // ── DISBURSE WIZARD STATE ──────────────────────────────────────────────
    window._disburseWizard = null;

    function modalBackdrop() {
        let m = document.getElementById('dd-budget-share-modal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'dd-budget-share-modal';
            m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.78);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:16px;padding-top:20px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch;';
            document.body.appendChild(m);
        }
        return m;
    }

    function renderDisburseStep() {
        const w = window._disburseWizard;
        const modal = modalBackdrop();
        const trip = w.trip;
        const totalBudget = Number(trip.budget || 0);
        const stepLabels = ['Allocate', 'Accounts', 'Payment', 'Confirm'];
        const stepBar = stepLabels.map((l,i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
                <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;
                    background:${i < w.step ? '#10b981' : i === w.step ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'var(--bg-card-alt,#e2e8f0)'};
                    color:${i <= w.step ? '#fff' : '#94a3b8'};box-shadow:${i===w.step?'0 4px 12px rgba(14,165,233,0.4)':'none'};">
                    ${i < w.step ? '✓' : i+1}
                </div>
                <span style="font-size:10px;font-weight:700;color:${i===w.step?'#0ea5e9':i<w.step?'#10b981':'#94a3b8'};">${l}</span>
            </div>
            ${i<3?`<div style="flex:1;height:2px;background:${i<w.step?'#10b981':'var(--border-color,#e2e8f0)'};margin-top:16px;border-radius:2px;"></div>`:''}
        `).join('');

        let body = '';

        // ── STEP 1: Allocate ──────────────────────────────────────────────
        if (w.step === 0) {
            const s = w.shares;
            const gVal = s.guidePercent !== undefined ? s.guidePercent : 50;
            const vVal = s.vendorPercent !== undefined ? s.vendorPercent : 50;
            const aVal = s.adminPercent !== undefined ? s.adminPercent : 0;

            const salariedRow = (label, sub, abbr, color, bg) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-color,#e2e8f0);border-radius:12px;background:var(--bg-card-alt,#f8fafc);margin-bottom:8px;opacity:0.85;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:34px;height:34px;border-radius:10px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">${abbr}</div>
                        <div>
                            <div style="font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">${label} <span style="font-size:10px;padding:2px 6px;background:#64748b;color:#fff;border-radius:99px;">Salaried Employee</span></div>
                            <div style="font-size:11px;color:var(--text-secondary,#64748b);">${sub} • Monthly Salary</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="hidden" id="dw-${abbr.toLowerCase()}-pct" value="0"/>
                        <span style="font-size:13px;font-weight:700;color:#64748b;background:#e2e8f0;padding:4px 8px;border-radius:6px;">0% (Salaried)</span>
                        <span id="dw-${abbr.toLowerCase()}-pct-amt" style="min-width:75px;text-align:right;font-size:13px;font-weight:800;color:#64748b;">₹0</span>
                    </div>
                </div>`;

            const editableRow = (id, label, sub, abbr, color, bg, val) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--border-color,#e2e8f0);border-radius:12px;background:var(--bg-surface,#fff);margin-bottom:8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:34px;height:34px;border-radius:10px;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;">${abbr}</div>
                        <div>
                            <div style="font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">${label}</div>
                            <div style="font-size:11px;color:var(--text-secondary,#64748b);">${sub}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="number" id="${id}" value="${val}" min="0" max="100"
                            style="width:56px;padding:6px 6px;border:1.5px solid var(--border-color,#cbd5e1);border-radius:8px;font-weight:700;text-align:center;font-size:14px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);"
                            oninput="window._disburseCalc()"/>
                        <span style="font-size:13px;font-weight:700;color:var(--text-secondary);">%</span>
                        <span id="${id}-amt" style="min-width:75px;text-align:right;font-size:13px;font-weight:800;color:#10b981;">${formatMoney((totalBudget*val)/100)}</span>
                    </div>
                </div>`;

            const hasGuide = Boolean(trip.guide && trip.guide.name);
            const hasVendor = Boolean(trip.vendor && trip.vendor.name);

            const guideRow = hasGuide ? editableRow('dw-guide-pct', 'Tour Guide', escapeHTML(trip.guide.name), 'TG', '#7e22ce', '#f3e8ff', gVal) : '';
            const vendorRow = hasVendor ? editableRow('dw-vendor-pct', 'Vendor Service', escapeHTML(trip.vendor.name), 'VS', '#c2410c', '#ffedd5', vVal) : '';
            const noRolesRow = (!hasGuide && !hasVendor) ? '<div style="padding:14px;text-align:center;color:#64748b;font-size:13px;background:var(--bg-card-alt,#f8fafc);border-radius:12px;margin-bottom:8px;">No Tour Guide or Vendor assigned to this trip.</div>' : '';

            body = `
                <div style="background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:14px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                    <div><div style="font-size:11px;color:var(--text-secondary,#64748b);font-weight:600;">Total Trip Budget</div><div style="font-size:22px;font-weight:900;color:#10b981;">${formatMoney(totalBudget)}</div></div>
                    <span id="alloc-total-badge" style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:99px;background:rgba(16,185,129,0.12);color:#10b981;">${(hasGuide ? gVal : 0) + (hasVendor ? vVal : 0)}% Accepted Split</span>
                </div>
                <div style="font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);margin-bottom:10px;">Payout disbursement based on partner accepted percentage split</div>
                ${guideRow}
                ${vendorRow}
                ${noRolesRow}
                <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
                    <button onclick="window.closeBudgetShareModal()" style="padding:10px 18px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;cursor:pointer;">Cancel</button>
                    <button onclick="window._disburseNext()" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-weight:800;cursor:pointer;">Next → Account Setup</button>
                </div>`;
        }

        // ── STEP 2: Accounts ─────────────────────────────────────────────
        if (w.step === 1) {
            const roles = [];
            if (trip.guide && trip.guide.name && w.pcts.guide > 0) {
                roles.push({key:'guide', label:'Tour Guide', name: trip.guide.name, color:'#7e22ce', pct: w.pcts.guide});
            }
            if (trip.vendor && trip.vendor.name && w.pcts.vendor > 0) {
                roles.push({key:'vendor', label:'Vendor Service', name: trip.vendor.name, color:'#c2410c', pct: w.pcts.vendor});
            }
            const amt = r => parseFloat(((totalBudget * r.pct) / 100).toFixed(2));
            const accRow = r => `
                <div style="padding:14px;border:1px solid var(--border-color,#e2e8f0);border-radius:12px;background:var(--bg-surface,#fff);margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div style="font-size:13px;font-weight:700;color:${r.color};">${r.label} — ${r.name}</div>
                        <div style="font-size:13px;font-weight:800;color:#10b981;">${formatMoney(amt(r))} (${r.pct}%)</div>
                    </div>
                    <select id="acc-method-${r.key}" onchange="window._toggleAccFields('${r.key}')"
                        style="width:100%;padding:8px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;font-size:13px;margin-bottom:8px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                        <option value="bank">🏦 Bank Transfer (NEFT/RTGS)</option>
                        <option value="upi">📱 UPI</option>
                        <option value="wallet">👛 Wallet (Paytm/GPay)</option>
                    </select>
                    <div id="acc-fields-bank-${r.key}">
                        <input placeholder="Account Holder Name" id="acc-name-${r.key}" value="${escapeHTML(r.name)}"
                            style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;font-size:13px;margin-bottom:6px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <input placeholder="Account No." id="acc-num-${r.key}" value="XXXX${Math.floor(1000+Math.random()*9000)}"
                                style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                            <input placeholder="IFSC Code" id="acc-ifsc-${r.key}" value="HDFC0001234"
                                style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                        </div>
                    </div>
                    <div id="acc-fields-upi-${r.key}" style="display:none;">
                        <input placeholder="UPI ID e.g. name@upi" id="acc-upi-${r.key}"
                            style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                    </div>
                    <div id="acc-fields-wallet-${r.key}" style="display:none;">
                        <input placeholder="Registered Mobile / Wallet ID" id="acc-wallet-${r.key}"
                            style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                    </div>
                </div>`;
            body = `
                <div style="font-size:13px;color:var(--text-secondary,#64748b);margin-bottom:14px;">Enter or verify the payout accounts for assigned personnel.</div>
                ${roles.length ? roles.map(accRow).join('') : '<div style="padding:14px;color:#64748b;text-align:center;">No accounts required.</div>'}
                <div style="display:flex;gap:10px;margin-top:16px;justify-content:space-between;">
                    <button onclick="window._disburseBack()" style="padding:10px 18px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;cursor:pointer;">← Back</button>
                    <button onclick="window._disburseNext()" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-weight:800;cursor:pointer;">Next → Payment Gateway</button>
                </div>`;
        }

        // ── STEP 3: Payment Gateway ───────────────────────────────────────
        if (w.step === 2) {
            body = `
                <div style="background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:14px;padding:14px 16px;margin-bottom:16px;">
                    <div style="font-size:12px;color:var(--text-secondary,#64748b);font-weight:600;">Total Disbursing</div>
                    <div style="font-size:26px;font-weight:900;color:#10b981;">${formatMoney(totalBudget)}</div>
                    <div style="font-size:12px;color:var(--text-secondary,#64748b);margin-top:4px;">Disbursing to assigned personnel</div>
                </div>
                <div style="font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);margin-bottom:10px;">Select Payment Method</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
                    <button class="gw-btn active" data-gw="neft" onclick="window._selectGW(this,'neft')"
                        style="padding:12px;border:2px solid #0ea5e9;border-radius:12px;background:rgba(14,165,233,0.07);font-weight:700;font-size:13px;cursor:pointer;color:var(--text-primary,#0f172a);">🏦 NEFT / RTGS</button>
                    <button class="gw-btn" data-gw="imps" onclick="window._selectGW(this,'imps')"
                        style="padding:12px;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:var(--bg-surface,#fff);font-weight:600;font-size:13px;cursor:pointer;color:var(--text-secondary,#475569);">⚡ IMPS (Instant)</button>
                    <button class="gw-btn" data-gw="upi" onclick="window._selectGW(this,'upi')"
                        style="padding:12px;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:var(--bg-surface,#fff);font-weight:600;font-size:13px;cursor:pointer;color:var(--text-secondary,#475569);">📱 UPI Bulk</button>
                    <button class="gw-btn" data-gw="cheque" onclick="window._selectGW(this,'cheque')"
                        style="padding:12px;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:var(--bg-surface,#fff);font-weight:600;font-size:13px;cursor:pointer;color:var(--text-secondary,#475569);">📄 Cheque / DD</button>
                </div>
                <div id="gw-details" style="margin-bottom:16px;">
                    <div style="margin-bottom:10px;">
                        <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Authorizing Bank Account</label>
                        <select id="gw-bank" style="width:100%;padding:10px 12px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                            <option>Travel Partner Operating Account</option>
                            <option>HDFC Bank — Corporate Account</option>
                            <option>ICICI Bank — Business Account</option>
                            <option>SBI — Corporate Account</option>
                        </select>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Transaction PIN / OTP</label>
                            <input type="password" id="gw-pin" placeholder="••••••" value="123456"
                                style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;font-size:14px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Reference Note</label>
                            <input type="text" id="gw-ref" value="Trip-${escapeHTML(trip.id)}-Payout"
                                style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);">
                        </div>
                    </div>
                    <div style="padding:10px 14px;border-radius:10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);font-size:12px;color:#92400e;">
                        ⚠️ This will initiate a real bank transfer to assigned personnel accounts set in Step 2. Review before confirming.
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:space-between;">
                    <button onclick="window._disburseBack()" style="padding:10px 18px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;cursor:pointer;">← Back</button>
                    <button onclick="window._disburseNext()" style="padding:10px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.4);">🔐 Authorize & Disburse</button>
                </div>`;
        }

        // ── STEP 4: Processing / Receipt ─────────────────────────────────
        if (w.step === 3) {
            const roles = [];
            if (trip.guide && trip.guide.name && w.pcts.guide > 0) {
                roles.push({label:'Tour Guide', pct:w.pcts.guide, color:'#7e22ce'});
            }
            if (trip.vendor && trip.vendor.name && w.pcts.vendor > 0) {
                roles.push({label:'Vendor Service', pct:w.pcts.vendor, color:'#c2410c'});
            }
            body = `
                <div style="text-align:center;padding:10px 0 20px;">
                    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:28px;box-shadow:0 8px 24px rgba(16,185,129,0.4);">✓</div>
                    <div style="font-size:20px;font-weight:800;color:var(--text-primary,#0f172a);margin-bottom:4px;">Budget Disbursed Successfully!</div>
                    <div style="font-size:13px;color:var(--text-secondary,#64748b);">All payouts initiated via ${escapeHTML(w.gwMethod||'NEFT')} on ${new Date().toLocaleString()}</div>
                </div>
                <div style="background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:14px;padding:14px;margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:700;color:var(--text-secondary,#64748b);margin-bottom:10px;">PAYMENT RECEIPTS</div>
                    ${roles.map(r=>`
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color,#f1f5f9);">
                            <span style="font-size:13px;font-weight:600;color:${r.color};">${r.label}</span>
                            <div style="text-align:right;">
                                <div style="font-size:13px;font-weight:800;color:#10b981;">${formatMoney(parseFloat(((totalBudget*r.pct)/100).toFixed(2)))}</div>
                                <div style="font-size:11px;color:var(--text-secondary,#94a3b8);">${r.pct}% • TXN-${Math.random().toString(36).substr(2,8).toUpperCase()}</div>
                            </div>
                        </div>`).join('')}
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;font-size:14px;font-weight:800;">
                        <span style="color:var(--text-primary,#0f172a);">Total Disbursed</span>
                        <span style="color:#10b981;">${formatMoney(totalBudget)}</span>
                    </div>
                </div>
                <button onclick="window.closeBudgetShareModal()" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.35);">✓ Done</button>`;
        }

        modal.innerHTML = `
            <div style="background:var(--bg-surface,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:24px;width:100%;max-width:600px;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);color:var(--text-primary,#0f172a);position:relative;box-sizing:border-box;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
                ${w.step < 3 ? `<button onclick="window.closeBudgetShareModal()" style="position:absolute;top:18px;right:18px;background:none;border:none;color:var(--text-secondary,#64748b);font-size:22px;cursor:pointer;">&times;</button>` : ''}
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">💳</div>
                    <div>
                        <div style="font-size:17px;font-weight:800;color:var(--text-primary,#0f172a);">Pay Tour Guide & Vendor</div>
                        <div style="font-size:12px;color:var(--text-secondary,#64748b);">Trip ${escapeHTML(trip.id)} • ${escapeHTML(trip.title||'')}</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;margin-bottom:22px;">${stepBar}</div>
                ${body}
            </div>`;
        iconRefresh(modal);
    }

    window.openBudgetShareModal = function(tripId) {
        const state = loadState();
        const trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
        if (!trip) { if (typeof notify === 'function') notify('Trip not found', 'error'); return; }
        if (trip.budgetShare?.disbursed) {
            if (typeof notify === 'function') notify('Payment already completed for this trip.', 'warning');
            return;
        }
        const shares = trip.budgetShare || { partnerPercent:0, guidePercent:50, vendorPercent:50, supportPercent:0, adminPercent:0 };
        window._disburseWizard = { step:0, trip, shares, pcts:{}, gwMethod:'NEFT' };
        renderDisburseStep();
    };

    window.closeBudgetShareModal = function() {
        const m = document.getElementById('dd-budget-share-modal');
        if (m) m.remove();
        window._disburseWizard = null;
    };

    window._disburseCalc = function() {
        const w = window._disburseWizard;
        if (!w) return;
        const total = Number(w.trip.budget || 0);
        ['guide','vendor'].forEach(k => {
            const pct = Number(document.getElementById(`dw-${k}-pct`)?.value || 0);
            const el = document.getElementById(`dw-${k}-pct-amt`);
            if (el) el.textContent = formatMoney((total * pct) / 100);
        });
        const aPct = Number(document.getElementById('dw-admin-pct')?.value || 0);
        const elA = document.getElementById('dw-admin-pct-amt');
        if (elA) elA.textContent = formatMoney((total * aPct) / 100);
        const sum = ['guide','vendor'].reduce((a,k) => a + Number(document.getElementById(`dw-${k}-pct`)?.value||0), 0) + aPct;
        const badge = document.getElementById('alloc-total-badge');
        if (badge) { badge.textContent = `${sum}% Accepted Split`; badge.style.background = 'rgba(16,185,129,0.12)'; badge.style.color = '#10b981'; }
    };

    window._disburseNext = function() {
        const w = window._disburseWizard;
        if (!w) return;
        if (w.step === 0) {
            const pcts = {
                partner: 0,
                guide:   Number(document.getElementById('dw-guide-pct')?.value||0),
                vendor:  Number(document.getElementById('dw-vendor-pct')?.value||0),
                support: 0,
                admin:   Number(document.getElementById('dw-admin-pct')?.value||0),
            };
            if (pcts.guide < 0 || pcts.guide > 100 || pcts.vendor < 0 || pcts.vendor > 100 || pcts.admin < 0 || pcts.admin > 100) {
                if (typeof notify === 'function') notify('Percentages must be between 0% and 100%.', 'error');
                return;
            }
            w.pcts = pcts;
        }
        if (w.step === 2) {
            w.gwMethod = document.querySelector('.gw-btn.active')?.dataset?.gw?.toUpperCase() || 'NEFT';
            const pin = document.getElementById('gw-pin')?.value || '';
            if (!pin) { if (typeof notify==='function') notify('Enter your Transaction PIN / OTP to authorize.','error'); return; }
            // Commit to state
            const {pcts, trip} = w;
            const session = readSession();
            const payerName = session?.name || 'Travel Partner';
            updateTrip(trip.id, (t, st) => {
                const b = Number(t.budget || 0);
                const calc = k => parseFloat(((b * pcts[k]) / 100).toFixed(2));
                const gAmt=calc('guide'), vAmt=calc('vendor'), aAmt=calc('admin');
                t.budgetShare = { disbursed:true, disbursedAt:nowISO(), disbursedBy: payerName,
                    partnerPercent:0, partnerAmount:0,
                    guidePercent:pcts.guide,     guideAmount:gAmt,
                    vendorPercent:pcts.vendor,   vendorAmount:vAmt,
                    supportPercent:0, supportAmount:0,
                    adminPercent:pcts.admin,     adminAmount:aAmt,
                    gwMethod: w.gwMethod, totalBudget:b };
                addUpdate(t,'Travel Partner','Partner Paid Guide & Vendor',
                    `${payerName} paid accepted shares via ${w.gwMethod} — Guide: ${formatMoney(gAmt)} (${pcts.guide}%), Vendor: ${formatMoney(vAmt)} (${pcts.vendor}%).`,'Paid');
                if (t.guide) notifyStakeholders(st,t,'Payment Received from Partner',`Travel Partner ${payerName} paid your accepted share of ${formatMoney(gAmt)} (${pcts.guide}%) for trip ${t.id}.`,'Paid',['guide']);
                if (t.vendor) notifyStakeholders(st,t,'Payment Received from Partner',`Travel Partner ${payerName} paid your accepted share of ${formatMoney(vAmt)} (${pcts.vendor}%) for trip ${t.id}.`,'Paid',['vendor']);
            });
            renderAll();
        }
        w.step = Math.min(w.step + 1, 3);
        renderDisburseStep();
    };

    window._disburseBack = function() {
        const w = window._disburseWizard;
        if (!w) return;
        w.step = Math.max(w.step - 1, 0);
        renderDisburseStep();
    };

    window._selectGW = function(btn, gw) {
        document.querySelectorAll('.gw-btn').forEach(b => {
            b.style.border = '1px solid var(--border-color,#cbd5e1)';
            b.style.background = 'var(--bg-surface,#fff)';
            b.style.color = 'var(--text-secondary,#475569)';
            b.style.fontWeight = '600';
            b.classList.remove('active');
        });
        btn.style.border = '2px solid #0ea5e9';
        btn.style.background = 'rgba(14,165,233,0.07)';
        btn.style.color = 'var(--text-primary,#0f172a)';
        btn.style.fontWeight = '700';
        btn.classList.add('active');
    };

    window._toggleAccFields = function(key) {
        const method = document.getElementById(`acc-method-${key}`)?.value || 'bank';
        ['bank','upi','wallet'].forEach(m => {
            const el = document.getElementById(`acc-fields-${m}-${key}`);
            if (el) el.style.display = m === method ? 'block' : 'none';
        });
    };

    // Keep legacy references working
    window.submitBudgetShareDisbursement = window.openBudgetShareModal;
    window.saveBudgetSharePercentages = function() {};

    /* ==========================================================================
       TRAVEL PARTNER DYNAMIC PAYOUT SHARE EDITOR (GUIDE & VENDOR ADJUSTMENT)
       ========================================================================== */
    window.openPartnerShareEditor = function(tripId) {
        const state = loadState();
        const trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
        if (!trip) { if (typeof notify === 'function') notify('Trip not found', 'error'); return; }
        
        let modal = document.getElementById('dd-partner-share-modal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'dd-partner-share-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.78);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        
        const curShare = trip.budgetShare || { guidePercent: 50, vendorPercent: 50 };
        const totalBudget = Number(trip.budget || 0);
        const gPct = curShare.guidePercent !== undefined ? curShare.guidePercent : 50;
        const vPct = curShare.vendorPercent !== undefined ? curShare.vendorPercent : 50;

        const hasGuide = Boolean(trip.guide && trip.guide.name);
        const hasVendor = Boolean(trip.vendor && trip.vendor.name);

        const guideRowHtml = hasGuide ? `
            <div style="margin-bottom:14px;padding:14px;border:1px solid var(--border-color,#e2e8f0);border-radius:12px;background:var(--bg-surface,#fff);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:13px;font-weight:700;color:#7e22ce;">Tour Guide Share</div>
                    <div style="font-size:11px;color:var(--text-secondary,#64748b);">${escapeHTML(trip.guide.name)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" id="pse-guide-pct" value="${gPct}" min="0" max="100" style="width:60px;padding:6px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;text-align:center;font-size:14px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);" oninput="window._pseCalc(${totalBudget})" />
                    <span style="font-weight:700;color:var(--text-secondary,#64748b);">%</span>
                    <span id="pse-guide-amt" style="min-width:80px;text-align:right;font-weight:800;color:#10b981;">${formatMoney((totalBudget*gPct)/100)}</span>
                </div>
            </div>
        ` : '';

        const vendorRowHtml = hasVendor ? `
            <div style="margin-bottom:18px;padding:14px;border:1px solid var(--border-color,#e2e8f0);border-radius:12px;background:var(--bg-surface,#fff);display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:13px;font-weight:700;color:#c2410c;">Vendor Service Share</div>
                    <div style="font-size:11px;color:var(--text-secondary,#64748b);">${escapeHTML(trip.vendor.name)} ${trip.vendor.type ? `(${escapeHTML(trip.vendor.type)})` : ''}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" id="pse-vendor-pct" value="${vPct}" min="0" max="100" style="width:60px;padding:6px;border:1.5px solid #cbd5e1;border-radius:8px;font-weight:700;text-align:center;font-size:14px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);" oninput="window._pseCalc(${totalBudget})" />
                    <span style="font-weight:700;color:var(--text-secondary,#64748b);">%</span>
                    <span id="pse-vendor-amt" style="min-width:80px;text-align:right;font-weight:800;color:#10b981;">${formatMoney((totalBudget*vPct)/100)}</span>
                </div>
            </div>
        ` : '';

        const noAssignedHtml = (!hasGuide && !hasVendor) ? `
            <div style="padding:16px;text-align:center;color:#64748b;font-size:13px;background:var(--bg-card-alt,#f8fafc);border-radius:12px;margin-bottom:18px;">
                No Tour Guide or Vendor assigned to this trip yet.
            </div>
        ` : '';

        const activeTotal = (hasGuide ? gPct : 0) + (hasVendor ? vPct : 0);
        
        modal.innerHTML = `
            <div style="background:var(--bg-surface,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:24px;width:100%;max-width:540px;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);color:var(--text-primary,#0f172a);position:relative;box-sizing:border-box;">
                <button onclick="document.getElementById('dd-partner-share-modal').remove()" style="position:absolute;top:18px;right:18px;background:none;border:none;color:var(--text-secondary,#64748b);font-size:22px;cursor:pointer;">&times;</button>
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;">💰</div>
                    <div>
                        <div style="font-size:18px;font-weight:800;color:var(--text-primary,#0f172a);">Edit Trip Payout Shares</div>
                        <div style="font-size:12px;color:var(--text-secondary,#64748b);">Trip ID: ${escapeHTML(trip.id)} • Budget: ${formatMoney(totalBudget)}</div>
                    </div>
                </div>
                <div style="padding:12px 14px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:12px;color:#166534;margin-bottom:18px;line-height:1.4;">
                    💡 <strong>Partner Split Choice:</strong> Set payout share percentages for personnel assigned to this trip as per your choice.
                </div>
                
                ${guideRowHtml}
                ${vendorRowHtml}
                ${noAssignedHtml}

                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:10px;background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);margin-bottom:20px;">
                    <span style="font-size:13px;font-weight:700;color:var(--text-secondary,#475569);">Total Payout Split</span>
                    <span id="pse-total-badge" style="font-size:13px;font-weight:800;padding:4px 12px;border-radius:99px;background:rgba(16,185,129,0.12);color:#10b981;">${activeTotal}%</span>
                </div>

                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button onclick="document.getElementById('dd-partner-share-modal').remove()" style="padding:10px 18px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;cursor:pointer;">Cancel</button>
                    <button onclick="window._savePartnerShares('${escapeJS(trip.id)}', ${totalBudget})" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.35);">Save Shares</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (typeof iconRefresh === 'function') iconRefresh(modal);
    };

    window._pseCalc = function(totalBudget) {
        const elGInput = document.getElementById('pse-guide-pct');
        const elVInput = document.getElementById('pse-vendor-pct');
        const gPct = elGInput ? Number(elGInput.value || 0) : 0;
        const vPct = elVInput ? Number(elVInput.value || 0) : 0;
        const elG = document.getElementById('pse-guide-amt');
        const elV = document.getElementById('pse-vendor-amt');
        if (elG) elG.textContent = formatMoney((totalBudget * gPct) / 100);
        if (elV) elV.textContent = formatMoney((totalBudget * vPct) / 100);
        const sum = gPct + vPct;
        const badge = document.getElementById('pse-total-badge');
        if (badge) {
            badge.textContent = `${sum}%`;
            badge.style.background = 'rgba(16,185,129,0.12)';
            badge.style.color = '#10b981';
        }
    };

    window._savePartnerShares = function(tripId, totalBudget) {
        const elGInput = document.getElementById('pse-guide-pct');
        const elVInput = document.getElementById('pse-vendor-pct');
        const gPct = elGInput ? Number(elGInput.value || 0) : 0;
        const vPct = elVInput ? Number(elVInput.value || 0) : 0;
        if (gPct < 0 || gPct > 100 || vPct < 0 || vPct > 100) {
            if (typeof notify === 'function') notify(`Share percentages must be between 0% and 100%.`, 'error');
            return;
        }
        const gAmt = parseFloat(((totalBudget * gPct) / 100).toFixed(2));
        const vAmt = parseFloat(((totalBudget * vPct) / 100).toFixed(2));
        updateTrip(tripId, (trip) => {
            const existing = trip.budgetShare || {};
            trip.budgetShare = {
                ...existing,
                guidePercent: elGInput ? gPct : (existing.guidePercent || 0),
                guideAmount: elGInput ? gAmt : (existing.guideAmount || 0),
                vendorPercent: elVInput ? vPct : (existing.vendorPercent || 0),
                vendorAmount: elVInput ? vAmt : (existing.vendorAmount || 0),
                totalBudget: totalBudget
            };
            addUpdate(trip, 'Travel Partner', 'Shares Updated', `Updated shares — Guide: ${trip.budgetShare.guidePercent}%, Vendor: ${trip.budgetShare.vendorPercent}%.`, 'Updated');
        });
        const modal = document.getElementById('dd-partner-share-modal');
        if (modal) modal.remove();
        if (typeof notify === 'function') notify('Payout shares updated successfully!', 'success');
        renderAll();
    };

    /* ==========================================================================
       CANCELLED TRIP REFUND & ADMIN FEE DEDUCTION WIZARD
       ========================================================================== */
    window.openCancellationRefundModal = function(tripId) {
        const session = readSession();
        const roleLower = String(session.role || roleFromPath() || '').toLowerCase();
        const isSuperAdmin = roleLower.includes('super') || roleLower.includes('admin');

        const state = loadState();
        const trip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
        if (!trip) {
            if (typeof notify === 'function') notify('Trip not found', 'error');
            return;
        }

        const ref = trip.refundRecord;
        const isRefunded = ref && ref.processed;

        if (!isTripPaid(trip)) {
            if (typeof notify === 'function') notify(`Trip #${trip.id || tripId} was cancelled before payment was completed. No monetary refund is required.`, 'info');
            return;
        }

        if (!isSuperAdmin && !isRefunded) {
            if (typeof notify === 'function') notify('Only Super Admin is authorized to process trip refunds.', 'warning');
            return;
        }

        let modal = document.getElementById('dd-refund-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'dd-refund-modal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.78);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:16px;padding-top:20px;box-sizing:border-box;overflow-y:auto;-webkit-overflow-scrolling:touch;';
            document.body.appendChild(modal);
        }

        let totalBudget = Number(trip.budget || trip.totalAmount || trip.paidAmount || 0);
        if (!totalBudget || totalBudget <= 0) {
            const key = packageKeyFor(trip);
            totalBudget = key === 'swiss' ? 1600 : key === 'tokyo' ? 1500 : key === 'paris' ? 1200 : key === 'bali' ? 800 : 1000;
        }

        const defaultFeePct = ref?.cancellationFeePercent ?? 20;
        const defaultRefundPct = 100 - defaultFeePct;

        if (isRefunded) {
            modal.innerHTML = `
                <div style="background:var(--bg-surface,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:24px;width:100%;max-width:560px;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);color:var(--text-primary,#0f172a);position:relative;box-sizing:border-box;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
                    <button onclick="window.closeCancellationRefundModal()" style="position:absolute;top:18px;right:18px;background:none;border:none;color:var(--text-secondary,#64748b);font-size:22px;cursor:pointer;line-height:1;">&times;</button>
                    
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;box-shadow:0 8px 16px rgba(16,185,129,0.3);">✓</div>
                        <div>
                            <h3 style="font-size:18px;font-weight:800;margin:0;color:var(--text-primary,#0f172a);">Cancellation Refund Issued</h3>
                            <p style="font-size:12px;color:var(--text-secondary,#64748b);margin:2px 0 0;">Trip ${escapeHTML(trip.id)} • ${escapeHTML(trip.title)}</p>
                        </div>
                    </div>

                    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:16px;margin-bottom:20px;">
                        <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Refund Status</div>
                        <div style="font-size:24px;font-weight:900;color:#10b981;">${formatMoney(ref.refundAmount)} <span style="font-size:14px;font-weight:700;">(${ref.refundPercent}% refunded)</span></div>
                        <div style="font-size:12px;color:var(--text-secondary,#64748b);margin-top:4px;">Admin Fee Retained: <strong style="color:#c2410c">${formatMoney(ref.cancellationFeeAmount)} (${ref.cancellationFeePercent}%)</strong></div>
                    </div>

                    <div style="background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:14px;padding:16px;margin-bottom:20px;font-size:13px;display:flex;flex-direction:column;gap:10px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary,#64748b);">Total Collected Budget:</span>
                            <strong style="color:var(--text-primary,#0f172a);">${formatMoney(ref.totalBudget || totalBudget)}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary,#64748b);">Sent to Account:</span>
                            <strong style="color:#0ea5e9;">${escapeHTML(ref.destinationAccount || 'Traveler Account')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary,#64748b);">Refund Method:</span>
                            <strong style="color:var(--text-primary,#0f172a);">${escapeHTML(ref.refundMethod || 'Original Payment Instrument')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary,#64748b);">Transaction Ref ID:</span>
                            <strong style="color:#6366f1;">${escapeHTML(ref.txnId || 'N/A')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary,#64748b);">Processed Date:</span>
                            <strong style="color:var(--text-primary,#0f172a);">${new Date(ref.processedAt).toLocaleString()}</strong>
                        </div>
                    </div>

                    <button onclick="window.closeCancellationRefundModal()" style="width:100%;padding:12px;border:none;border-radius:12px;background:var(--bg-card-alt,#e2e8f0);color:var(--text-primary,#0f172a);font-weight:700;font-size:14px;cursor:pointer;">Close Receipt</button>
                </div>
            `;
            iconRefresh(modal);
            return;
        }

        const travelerAcc = trip.paymentAccount || (trip.paymentMethod ? `${trip.paymentMethod} (Original Sent Account)` : `${trip.travelerName || 'Traveler'} Original Account`);

        modal.innerHTML = `
            <div style="background:var(--bg-surface,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:24px;width:100%;max-width:580px;padding:28px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);color:var(--text-primary,#0f172a);position:relative;box-sizing:border-box;max-height:90vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
                <button onclick="window.closeCancellationRefundModal()" style="position:absolute;top:18px;right:18px;background:none;border:none;color:var(--text-secondary,#64748b);font-size:22px;cursor:pointer;line-height:1;">&times;</button>

                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#f97316,#c2410c);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;box-shadow:0 6px 16px rgba(249,115,22,0.3);">🔄</div>
                    <div>
                        <h3 style="font-size:18px;font-weight:800;margin:0;color:var(--text-primary,#0f172a);">Process Cancelled Trip Refund</h3>
                        <p style="font-size:12px;color:var(--text-secondary,#64748b);margin:2px 0 0;">Trip ${escapeHTML(trip.id)} • ${escapeHTML(trip.title)} • Traveler: <strong>${escapeHTML(trip.travelerName || 'Traveler')}</strong></p>
                    </div>
                </div>

                <div style="background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:16px;padding:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:11px;color:var(--text-secondary,#64748b);font-weight:600;">Total Paid Budget</div>
                        <div style="font-size:24px;font-weight:900;color:var(--text-primary,#0f172a);">${formatMoney(totalBudget)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px;color:var(--text-secondary,#64748b);font-weight:600;">Status</div>
                        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(239,68,68,0.12);color:#ef4444;">Cancelled</span>
                    </div>
                </div>

                <!-- Admin Fee % Input -->
                <div style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <label style="font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">Admin Cancellation Fee (% retained by Admin)</label>
                        <span style="font-size:11px;font-weight:600;color:var(--text-secondary,#64748b);">Admin sets percentage</span>
                    </div>

                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <input type="number" id="rf-fee-pct" value="${defaultFeePct}" min="0" max="100"
                            style="width:75px;padding:8px 10px;border:2px solid #f97316;border-radius:10px;font-weight:800;font-size:16px;text-align:center;background:var(--bg-surface,#fff);color:#c2410c;"
                            oninput="window._calcRefundSplit(${totalBudget})"/>
                        <span style="font-size:14px;font-weight:800;color:#c2410c;">% Fee</span>

                        <div style="display:flex;gap:6px;margin-left:auto;">
                            <button type="button" onclick="window._setRefundFeePct(0, ${totalBudget})" style="padding:6px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;background:var(--bg-surface,#fff);font-size:11px;font-weight:700;cursor:pointer;color:var(--text-primary,#0f172a);">0% (Full)</button>
                            <button type="button" onclick="window._setRefundFeePct(10, ${totalBudget})" style="padding:6px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;background:var(--bg-surface,#fff);font-size:11px;font-weight:700;cursor:pointer;color:var(--text-primary,#0f172a);">10%</button>
                            <button type="button" onclick="window._setRefundFeePct(20, ${totalBudget})" style="padding:6px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;background:var(--bg-surface,#fff);font-size:11px;font-weight:700;cursor:pointer;color:var(--text-primary,#0f172a);">20%</button>
                            <button type="button" onclick="window._setRefundFeePct(30, ${totalBudget})" style="padding:6px 10px;border:1px solid var(--border-color,#cbd5e1);border-radius:8px;background:var(--bg-surface,#fff);font-size:11px;font-weight:700;cursor:pointer;color:var(--text-primary,#0f172a);">30%</button>
                        </div>
                    </div>

                    <!-- Calculated split cards -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px;border-radius:14px;background:var(--bg-card-alt,#f8fafc);border:1px solid var(--border-color,#e2e8f0);">
                        <div style="border-right:1px solid var(--border-color,#cbd5e1);padding-right:10px;">
                            <div style="font-size:11px;color:var(--text-secondary,#64748b);font-weight:700;">Refund to Traveler (<span id="rf-lbl-refund-pct">${defaultRefundPct}</span>%)</div>
                            <div id="rf-amt-refund" style="font-size:19px;font-weight:900;color:#10b981;margin-top:4px;">${formatMoney((totalBudget * defaultRefundPct) / 100)}</div>
                        </div>
                        <div style="padding-left:4px;">
                            <div style="font-size:11px;color:var(--text-secondary,#64748b);font-weight:700;">Admin Retained Fee (<span id="rf-lbl-fee-pct">${defaultFeePct}</span>%)</div>
                            <div id="rf-amt-fee" style="font-size:19px;font-weight:900;color:#c2410c;margin-top:4px;">${formatMoney((totalBudget * defaultFeePct) / 100)}</div>
                        </div>
                    </div>
                </div>

                <!-- Traveler Destination Account -->
                <div style="margin-bottom:20px;">
                    <label style="display:block;font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);margin-bottom:6px;">Traveler Original Sent Account (Refund Destination)</label>
                    <input type="text" id="rf-account-dest" value="${escapeHTML(travelerAcc)}"
                        style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;font-size:13px;font-weight:700;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);margin-bottom:12px;">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Refund Instrument / Method</label>
                            <select id="rf-method" style="width:100%;padding:10px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);font-weight:600;">
                                <option value="Original Payment Instrument">Original Payment Account (Auto)</option>
                                <option value="UPI Direct Transfer">UPI Direct Refund</option>
                                <option value="NEFT / Bank Transfer">NEFT Bank Transfer</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;">Transaction PIN</label>
                            <input type="password" id="rf-pin" value="123456" placeholder="••••••"
                                style="width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;font-size:13px;background:var(--bg-surface,#fff);color:var(--text-primary,#0f172a);font-weight:700;">
                        </div>
                    </div>
                </div>

                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button onclick="window.closeCancellationRefundModal()" style="padding:10px 18px;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569);font-weight:600;cursor:pointer;">Cancel</button>
                    <button onclick="window.submitCancellationRefund('${escapeHTML(trip.id)}')" style="padding:10px 22px;border:none;border-radius:10px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(249,115,22,0.35);display:flex;align-items:center;gap:6px;">
                        <i data-icon="check"></i> Authorize & Refund Remaining Amount
                    </button>
                </div>
            </div>
        `;
        iconRefresh(modal);
    };

    window.closeCancellationRefundModal = function() {
        const modal = document.getElementById('dd-refund-modal');
        if (modal) modal.remove();
    };

    window._setRefundFeePct = function(pct, total) {
        const input = document.getElementById('rf-fee-pct');
        if (input) {
            input.value = pct;
            window._calcRefundSplit(total);
        }
    };

    window._calcRefundSplit = function(totalBudget) {
        const feeInput = document.getElementById('rf-fee-pct');
        if (!feeInput) return;
        let feePct = Number(feeInput.value || 0);
        if (feePct < 0) feePct = 0;
        if (feePct > 100) feePct = 100;
        
        const refundPct = 100 - feePct;
        const feeAmt = parseFloat(((totalBudget * feePct) / 100).toFixed(2));
        const refundAmt = parseFloat(((totalBudget * refundPct) / 100).toFixed(2));

        const lblFee = document.getElementById('rf-lbl-fee-pct');
        const lblRef = document.getElementById('rf-lbl-refund-pct');
        const amtFee = document.getElementById('rf-amt-fee');
        const amtRef = document.getElementById('rf-amt-refund');

        if (lblFee) lblFee.textContent = feePct;
        if (lblRef) lblRef.textContent = refundPct;
        if (amtFee) amtFee.textContent = formatMoney(feeAmt);
        if (amtRef) amtRef.textContent = formatMoney(refundAmt);
    };

    window.submitCancellationRefund = function(tripId) {
        const session = readSession();
        const roleLower = String(session.role || roleFromPath() || '').toLowerCase();
        const isSuperAdmin = roleLower.includes('super') || roleLower.includes('admin');

        if (!isSuperAdmin) {
            if (typeof notify === 'function') notify('Only Super Admin is authorized to process trip refunds.', 'error');
            return;
        }

        const state = loadState();
        const existingTrip = (state.trips || []).find(t => t.id === tripId || t.requestId === tripId);
        if (!existingTrip) {
            if (typeof notify === 'function') notify('Trip not found', 'error');
            return;
        }

        if (existingTrip.cancellationRequested && existingTrip.status !== 'cancelled') {
            acceptTripCancellation(tripId);
        }

        const feeInput = document.getElementById('rf-fee-pct');
        const feePct = Number(feeInput?.value || 0);
        if (isNaN(feePct) || feePct < 0 || feePct > 100) {
            if (typeof notify === 'function') notify('Cancellation fee percentage must be between 0% and 100%.', 'error');
            return;
        }

        const pin = document.getElementById('rf-pin')?.value || '';
        if (!pin) {
            if (typeof notify === 'function') notify('Please enter your Transaction PIN to authorize refund.', 'error');
            return;
        }

        const destAccount = document.getElementById('rf-account-dest')?.value || `${existingTrip.travelerName || 'Traveler'} Original Account`;
        const methodLabel = document.getElementById('rf-method')?.value || 'Original Payment Instrument';
        let totalBudget = Number(existingTrip.budget || existingTrip.totalAmount || existingTrip.paidAmount || 0);
        if (!totalBudget || totalBudget <= 0) {
            const key = packageKeyFor(existingTrip);
            totalBudget = key === 'swiss' ? 1600 : key === 'tokyo' ? 1500 : key === 'paris' ? 1200 : key === 'bali' ? 800 : 1000;
        }
        const refundPct = 100 - feePct;
        const feeAmt = parseFloat(((totalBudget * feePct) / 100).toFixed(2));
        const refundAmt = parseFloat(((totalBudget * refundPct) / 100).toFixed(2));

        updateTrip(tripId, (trip, st) => {
            trip.refundRecord = {
                processed: true,
                processedAt: nowISO(),
                cancellationFeePercent: feePct,
                cancellationFeeAmount: feeAmt,
                refundPercent: refundPct,
                refundAmount: refundAmt,
                totalBudget: totalBudget,
                destinationAccount: destAccount,
                refundMethod: methodLabel,
                txnId: 'RFD-' + Math.random().toString(36).substr(2,8).toUpperCase()
            };

            addUpdate(trip, 'Super Admin', 'Cancellation Refund Issued',
                `Refund of ${formatMoney(refundAmt)} (${refundPct}%) issued to ${destAccount} via ${methodLabel}. Admin retained ${formatMoney(feeAmt)} (${feePct}%) cancellation fee.`, 'Refunded');

            notifyStakeholders(st, trip, 'Cancellation Refund Processed',
                `Your refund of ${formatMoney(refundAmt)} (${refundPct}%) for cancelled trip ${trip.id} has been processed back to your original payment account (${destAccount}). Admin fee retained: ${formatMoney(feeAmt)} (${feePct}%).`, 'Refunded', ['traveler', 'partner', 'support']);
        });

        if (typeof notify === 'function') notify(`Refund of ${formatMoney(refundAmt)} (${refundPct}%) processed successfully to traveler account!`, 'success');
        window.closeCancellationRefundModal();
        renderAll();
    };

    document.addEventListener('DOMContentLoaded', () => {
        applyTripDateLimits();
        attachHandlers();
        initIssueUploadWidgets();
        renderAll();
        setTimeout(() => {
            initIssueUploadWidgets();
            renderAll();
        }, 350);
        setInterval(() => {
            if (!isUserActivelyTyping()) {
                hydrateStateFromBackend(false);
            }
        }, 300000);
        window.addEventListener('storage', (e) => {
            if (e.key === STORE_KEY || e.key === 'dd_session') {
                renderAll();
            }
        });

        // Show toast if user was redirected here after trying to access another portal
        try {
            if (sessionStorage.getItem('dd_access_denied')) {
                sessionStorage.removeItem('dd_access_denied');
                const session = readSession();
                const role = (session.role || 'your role').toLowerCase();
                const ROLE_LABELS_LOCAL = {
                    traveler: 'Traveler', partner: 'Travel Partner',
                    guide: 'Tour Guide', vendor: 'Vendor',
                    superuser: 'Super Admin', support: 'Support Executive',
                };
                const roleLabel = ROLE_LABELS_LOCAL[role] || role;
                notify(`Access denied. You are signed in as ${roleLabel}. Redirected to your portal.`, 'warning');
            }
        } catch (_) { }
    });
})();
