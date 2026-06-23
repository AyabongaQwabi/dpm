-- =============================================================
-- SEED: Provider categories, types, fields, form configs
-- South African multi-vertical service marketplace
--
-- Each category = one deployable directory site, e.g.:
--   cleaning.servicepros.co.za   → cat-cleaning
--   events.servicepros.co.za     → cat-events
--   legal.servicepros.co.za      → cat-legal
--   accountants.servicepros.co.za → cat-finance
--
-- Tenant resolution: proxy.ts reads hostname → tenant_domains →
-- sets NEXT_PUBLIC_CATEGORY_ID env override per deployment.
-- =============================================================


-- =============================================================
-- PROVIDER CATEGORIES
-- =============================================================
INSERT INTO provider_categories (id, name, slug) VALUES
  ('cat-events',    'Event Services',        'events'),
  ('cat-cleaning',  'Cleaning Services',     'cleaning'),
  ('cat-security',  'Security Services',     'security'),
  ('cat-home',      'Home & Maintenance',    'home'),
  ('cat-auto',      'Automotive Services',   'automotive'),
  ('cat-beauty',    'Beauty & Wellness',     'beauty'),
  ('cat-legal',     'Legal Services',        'legal'),
  ('cat-finance',   'Financial Services',    'finance'),
  ('cat-health',    'Health & Medical',      'health'),
  ('cat-education', 'Tutoring & Education',  'education'),
  ('cat-pets',      'Pet Services',          'pets'),
  ('cat-transport', 'Transport & Logistics', 'transport'),
  ('cat-property',  'Property Services',     'property'),
  ('cat-tech',      'IT & Technology',       'tech'),
  ('cat-media',     'Media & Creative',      'media')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- PROVIDER TYPES
-- =============================================================

-- ---- Events ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-dj',           'cat-events',   'DJ',                   'dj'),
  ('pt-mc',           'cat-events',   'MC / Emcee',           'mc'),
  ('pt-photographer', 'cat-events',   'Photographer',         'photographer'),
  ('pt-videographer', 'cat-events',   'Videographer',         'videographer'),
  ('pt-caterer',      'cat-events',   'Caterer',              'caterer'),
  ('pt-cake-baker',   'cat-events',   'Cake Baker',           'cake-baker'),
  ('pt-florist',      'cat-events',   'Florist',              'florist'),
  ('pt-decor',        'cat-events',   'Décor & Styling',      'decor-styling'),
  ('pt-sound-av',     'cat-events',   'Sound & AV',           'sound-av'),
  ('pt-photo-booth',  'cat-events',   'Photo Booth',          'photo-booth'),
  ('pt-event-coord',  'cat-events',   'Event Coordinator',    'event-coordinator'),
  ('pt-hair-makeup',  'cat-events',   'Hair & Makeup Artist', 'hair-makeup'),
  ('pt-bouncy-castle','cat-events',   'Kiddies Entertainment','kiddies-entertainment')
ON CONFLICT (id) DO NOTHING;

-- ---- Cleaning ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-residential-clean', 'cat-cleaning', 'Residential Cleaning', 'residential-cleaning'),
  ('pt-commercial-clean',  'cat-cleaning', 'Commercial Cleaning',  'commercial-cleaning'),
  ('pt-carpet-clean',      'cat-cleaning', 'Carpet & Upholstery',  'carpet-upholstery'),
  ('pt-pool-clean',        'cat-cleaning', 'Pool & Spa Cleaning',  'pool-spa'),
  ('pt-garden-clean',      'cat-cleaning', 'Garden Services',      'garden'),
  ('pt-pest-control',      'cat-cleaning', 'Pest Control',         'pest-control'),
  ('pt-waste-removal',     'cat-cleaning', 'Waste Removal',        'waste-removal'),
  ('pt-window-clean',      'cat-cleaning', 'Window Cleaning',      'window-cleaning')
ON CONFLICT (id) DO NOTHING;

-- ---- Security ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-guarding',      'cat-security', 'Security Guarding',  'guarding'),
  ('pt-armed',         'cat-security', 'Armed Response',     'armed-response'),
  ('pt-cctv',          'cat-security', 'CCTV & Surveillance','cctv'),
  ('pt-access-ctrl',   'cat-security', 'Access Control',     'access-control'),
  ('pt-alarm-inst',    'cat-security', 'Alarm Installation', 'alarm-installation'),
  ('pt-electric-fence','cat-security', 'Electric Fencing',   'electric-fencing'),
  ('pt-vip-protect',   'cat-security', 'VIP Protection',     'vip-protection')
ON CONFLICT (id) DO NOTHING;

-- ---- Home & Maintenance ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-plumber',     'cat-home', 'Plumber',              'plumber'),
  ('pt-electrician', 'cat-home', 'Electrician',          'electrician'),
  ('pt-painter',     'cat-home', 'Painter',              'painter'),
  ('pt-tiler',       'cat-home', 'Tiler',                'tiler'),
  ('pt-builder',     'cat-home', 'Builder / Contractor', 'builder'),
  ('pt-roofer',      'cat-home', 'Roofer',               'roofer'),
  ('pt-locksmith',   'cat-home', 'Locksmith',            'locksmith'),
  ('pt-handyman',    'cat-home', 'Handyman',             'handyman'),
  ('pt-ac-hvac',     'cat-home', 'AC & HVAC',            'ac-hvac'),
  ('pt-solar',       'cat-home', 'Solar & Renewable',    'solar'),
  ('pt-carpenter',   'cat-home', 'Carpenter',            'carpenter'),
  ('pt-glazier',     'cat-home', 'Glazier',              'glazier')
ON CONFLICT (id) DO NOTHING;

-- ---- Automotive ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-panel-beater',  'cat-auto', 'Panel Beater',         'panel-beater'),
  ('pt-mechanic',      'cat-auto', 'Mechanic',             'mechanic'),
  ('pt-car-wash',      'cat-auto', 'Car Wash & Detailing', 'car-wash-detailing'),
  ('pt-windscreen',    'cat-auto', 'Windscreen Repair',    'windscreen'),
  ('pt-towing',        'cat-auto', 'Towing & Recovery',    'towing'),
  ('pt-tyres',         'cat-auto', 'Tyre Fitment',         'tyres'),
  ('pt-auto-electric', 'cat-auto', 'Auto Electrician',     'auto-electrician'),
  ('pt-tinting',       'cat-auto', 'Window Tinting',       'window-tinting')
ON CONFLICT (id) DO NOTHING;

-- ---- Beauty & Wellness ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-hair-salon',      'cat-beauty', 'Hair Salon',          'hair-salon'),
  ('pt-nail-tech',       'cat-beauty', 'Nail Technician',     'nail-tech'),
  ('pt-massage',         'cat-beauty', 'Massage Therapist',   'massage'),
  ('pt-lash-artist',     'cat-beauty', 'Lash Artist',         'lash-artist'),
  ('pt-skin-therapist',  'cat-beauty', 'Skin Therapist',      'skin-therapist'),
  ('pt-tattoo',          'cat-beauty', 'Tattoo Artist',       'tattoo'),
  ('pt-personal-trainer','cat-beauty', 'Personal Trainer',    'personal-trainer'),
  ('pt-barber',          'cat-beauty', 'Barber',              'barber'),
  ('pt-makeup-artist',   'cat-beauty', 'Makeup Artist',       'makeup-artist')
ON CONFLICT (id) DO NOTHING;

-- ---- Legal ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-attorney',        'cat-legal', 'Attorney',                  'attorney'),
  ('pt-advocate',        'cat-legal', 'Advocate',                  'advocate'),
  ('pt-conveyancer',     'cat-legal', 'Conveyancer',               'conveyancer'),
  ('pt-notary',          'cat-legal', 'Notary Public',             'notary'),
  ('pt-labour-lawyer',   'cat-legal', 'Labour Law Attorney',       'labour-law'),
  ('pt-family-lawyer',   'cat-legal', 'Family Law Attorney',       'family-law'),
  ('pt-criminal-lawyer', 'cat-legal', 'Criminal Attorney',         'criminal-law'),
  ('pt-commercial-lawyer','cat-legal','Commercial Attorney',        'commercial-law'),
  ('pt-debt-collector',  'cat-legal', 'Debt Collector',            'debt-collection'),
  ('pt-legal-advisor',   'cat-legal', 'Legal Advisor / Consultant','legal-advisor')
ON CONFLICT (id) DO NOTHING;

-- ---- Financial Services ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-accountant',      'cat-finance', 'Accountant',          'accountant'),
  ('pt-tax-practitioner','cat-finance', 'Tax Practitioner',    'tax-practitioner'),
  ('pt-bookkeeper',      'cat-finance', 'Bookkeeper',          'bookkeeper'),
  ('pt-auditor',         'cat-finance', 'Auditor',             'auditor'),
  ('pt-fin-advisor',     'cat-finance', 'Financial Advisor',   'financial-advisor'),
  ('pt-bond-originator', 'cat-finance', 'Bond Originator',     'bond-originator'),
  ('pt-insurance-broker','cat-finance', 'Insurance Broker',    'insurance-broker'),
  ('pt-payroll',         'cat-finance', 'Payroll Specialist',  'payroll'),
  ('pt-biz-consultant',  'cat-finance', 'Business Consultant', 'business-consultant')
ON CONFLICT (id) DO NOTHING;

-- ---- Health & Medical ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-gp',                    'cat-health', 'General Practitioner',  'gp'),
  ('pt-dentist',               'cat-health', 'Dentist',               'dentist'),
  ('pt-physio',                'cat-health', 'Physiotherapist',       'physiotherapist'),
  ('pt-dietitian',             'cat-health', 'Dietitian',             'dietitian'),
  ('pt-psychologist',          'cat-health', 'Psychologist',          'psychologist'),
  ('pt-optometrist',           'cat-health', 'Optometrist',           'optometrist'),
  ('pt-chiropractor',          'cat-health', 'Chiropractor',          'chiropractor'),
  ('pt-biokineticist',         'cat-health', 'Biokineticist',         'biokineticist'),
  ('pt-occupational-therapist','cat-health', 'Occupational Therapist','occupational-therapist'),
  ('pt-nurse',                 'cat-health', 'Nurse / Sister',        'nurse')
ON CONFLICT (id) DO NOTHING;

-- ---- Tutoring & Education ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-maths-tutor',     'cat-education', 'Maths Tutor',        'maths-tutor'),
  ('pt-science-tutor',   'cat-education', 'Science Tutor',      'science-tutor'),
  ('pt-language-tutor',  'cat-education', 'Language Tutor',     'language-tutor'),
  ('pt-music-teacher',   'cat-education', 'Music Teacher',      'music-teacher'),
  ('pt-driving-school',  'cat-education', 'Driving School',     'driving-school'),
  ('pt-coding-teacher',  'cat-education', 'Coding & Tech Coach','coding-tech'),
  ('pt-remedial-teacher','cat-education', 'Remedial Teacher',   'remedial'),
  ('pt-life-skills',     'cat-education', 'Life Skills Coach',  'life-skills')
ON CONFLICT (id) DO NOTHING;

-- ---- Pet Services ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-vet',          'cat-pets', 'Veterinarian',  'vet'),
  ('pt-dog-groomer',  'cat-pets', 'Dog Groomer',   'dog-groomer'),
  ('pt-dog-walker',   'cat-pets', 'Dog Walker',    'dog-walker'),
  ('pt-pet-boarding', 'cat-pets', 'Pet Boarding',  'pet-boarding'),
  ('pt-pet-trainer',  'cat-pets', 'Animal Trainer','pet-trainer'),
  ('pt-pet-sitter',   'cat-pets', 'Pet Sitter',    'pet-sitter')
ON CONFLICT (id) DO NOTHING;

-- ---- Transport & Logistics ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-courier',          'cat-transport', 'Courier Service',     'courier'),
  ('pt-removals',         'cat-transport', 'Removal Company',     'removals'),
  ('pt-shuttle',          'cat-transport', 'Shuttle / Transfer',  'shuttle'),
  ('pt-chauffeur',        'cat-transport', 'Chauffeur Service',   'chauffeur'),
  ('pt-charter-bus',      'cat-transport', 'Bus & Coach Charter', 'charter-bus'),
  ('pt-motorbike-courier','cat-transport', 'Motorbike Courier',   'motorbike-courier'),
  ('pt-crane-truck',      'cat-transport', 'Crane & Flatbed Hire','crane-flatbed')
ON CONFLICT (id) DO NOTHING;

-- ---- Property ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-estate-agent',    'cat-property', 'Estate Agent',       'estate-agent'),
  ('pt-prop-manager',    'cat-property', 'Property Manager',   'property-manager'),
  ('pt-prop-valuer',     'cat-property', 'Property Valuer',    'property-valuer'),
  ('pt-bond-orig-prop',  'cat-property', 'Bond Originator',    'bond-originator-property'),
  ('pt-architect',       'cat-property', 'Architect',          'architect'),
  ('pt-quantity-surveyor','cat-property','Quantity Surveyor',  'quantity-surveyor'),
  ('pt-interior-designer','cat-property','Interior Designer',  'interior-designer')
ON CONFLICT (id) DO NOTHING;

-- ---- IT & Technology ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-web-dev',       'cat-tech', 'Web Developer',      'web-developer'),
  ('pt-it-support',    'cat-tech', 'IT Support',         'it-support'),
  ('pt-software-dev',  'cat-tech', 'Software Developer', 'software-developer'),
  ('pt-network-tech',  'cat-tech', 'Network Technician', 'network-tech'),
  ('pt-cctv-tech',     'cat-tech', 'CCTV Technician',   'cctv-tech'),
  ('pt-data-recovery', 'cat-tech', 'Data Recovery',      'data-recovery'),
  ('pt-cyber-security','cat-tech', 'Cyber Security',     'cyber-security'),
  ('pt-pos-systems',   'cat-tech', 'POS & Systems',      'pos-systems')
ON CONFLICT (id) DO NOTHING;

-- ---- Media & Creative ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-graphic-designer',  'cat-media', 'Graphic Designer',       'graphic-designer'),
  ('pt-video-editor',      'cat-media', 'Video Editor',           'video-editor'),
  ('pt-copywriter',        'cat-media', 'Copywriter',             'copywriter'),
  ('pt-social-media-mgr',  'cat-media', 'Social Media Manager',   'social-media'),
  ('pt-photographer-comm', 'cat-media', 'Commercial Photographer','commercial-photographer'),
  ('pt-animator',          'cat-media', 'Animator',               'animator'),
  ('pt-voice-artist',      'cat-media', 'Voice Artist',           'voice-artist'),
  ('pt-podcast-prod',      'cat-media', 'Podcast Producer',       'podcast-producer')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- SHARED FIELDS (used across all categories in Business Details)
-- =============================================================
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-biz-name',      'business_name',    'Business Name',             'short_text',   NULL, '{"required":true,"minLength":2,"maxLength":100}'),
  ('f-bio',           'bio',              'About Your Business',       'rich_text',    NULL, '{"required":true,"minLength":50}'),
  ('f-profile-img',   'profile_image',    'Profile / Logo Image',      'image_upload', NULL, '{"required":false}'),
  ('f-phone',         'phone',            'Contact Phone Number',      'short_text',   NULL, '{"required":true,"pattern":"phone"}'),
  ('f-website',       'website',          'Website URL',               'short_text',   NULL, '{"required":false,"pattern":"url"}'),
  ('f-service-areas', 'service_areas',    'Areas You Service',         'multi_select',
    '["Cape Town","Johannesburg","Durban","Pretoria","Gqeberha (PE)","Bloemfontein","East London","Nelspruit","Polokwane","Kimberley","Queenstown","George","Knysna","Stellenbosch","Somerset West","Paarl","Hermanus","Rustenburg","Witbank","Vereeniging","Midrand","Sandton","Randburg","Soweto","Centurion","Roodepoort"]',
    '{"required":true}'),
  ('f-gallery',       'gallery',          'Gallery / Portfolio Images','image_upload', NULL, '{"required":false}'),
  ('f-faqs',          'faqs',             'Frequently Asked Questions','rich_text',    NULL, '{"required":false}'),
  ('f-links',         'links',            'External Links',            'short_text',   NULL, '{"required":false}'),
  ('f-social',        'social_links',     'Social Media Links',        'short_text',   NULL, '{"required":false}'),
  ('f-tags',          'tags',             'Service Tags / Keywords',   'tag_picker',
    '["outdoor","indoor","corporate","private","family-friendly","LGBTQ-friendly","budget","mid-range","premium","eco-friendly","halaal","kosher","after-hours","same-day","weekend","emergency","mobile","on-site","remote","insured","registered","BBBEE"]',
    '{"required":false}'),
  ('f-years-exp',     'years_experience', 'Years in Business',         'number',       NULL, '{"required":false,"min":0,"max":80}')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- SPECIALIST FIELDS BY DOMAIN
-- =============================================================

-- ---- Events: DJ ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-dj-genres',    'dj_music_genres',  'Music Genres',              'multi_select',
    '["Amapiano","House","Deep House","Tech House","Hip Hop","R&B","Afrobeats","Kwaito","Gospel","Pop","Rock","Jazz","Dancehall","Reggae","Drum and Bass","Electronic","Latin"]',
    '{"required":true}'),
  ('f-dj-event-types','dj_event_types',  'Event Types You DJ',        'multi_select',
    '["Weddings","Birthdays","Corporate Events","Year-End Functions","School Proms","Club Nights","Festivals","Private Parties","Funerals","Heritage Events"]',
    '{"required":true}'),
  ('f-dj-sample',    'dj_sample_mix',    'Sample Mix URL (SoundCloud / Mixcloud)', 'short_text', NULL, '{"required":false,"pattern":"url"}'),
  ('f-dj-equipment', 'dj_equipment',     'Equipment & Setup',         'short_text',   NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Events: Photographer / Videographer ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-photo-styles',  'photo_styles',      'Shooting Styles',          'multi_select',
    '["Candid","Documentary","Traditional","Fine Art","Lifestyle","Aerial / Drone","Black & White","Editorial","Commercial"]',
    '{"required":true}'),
  ('f-photo-events',  'photo_event_types', 'Event Types Covered',      'multi_select',
    '["Weddings","Engagements","Matric Balls","Corporate Events","Birthdays","Christenings","Graduations","Product Photography","Fashion","Sports","Concerts"]',
    '{"required":true}'),
  ('f-photo-turnaround','photo_turnaround','Typical Turnaround Time',  'single_select',
    '["24 hours","48 hours","1 week","2 weeks","3 weeks","4 weeks","6 weeks"]',
    '{"required":false}'),
  ('f-photo-raw',     'photo_raw_delivery','Raw Files Included',       'boolean',      NULL, '{"required":false}'),
  ('f-video-formats', 'video_formats',     'Deliverable Formats',      'multi_select',
    '["4K","1080p","Highlight Reel","Full Length Edit","Social Media Cuts","Drone Footage","Same-Day Edit"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Events: Caterer ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-cat-cuisines',  'caterer_cuisines',  'Cuisine Types',            'multi_select',
    '["South African","Braai / BBQ","International","Mediterranean","Asian","Indian","African","Halaal","Kosher","Vegetarian","Vegan","Seafood","Finger Foods","Fine Dining","Street Food"]',
    '{"required":true}'),
  ('f-cat-dietary',   'caterer_dietary',   'Dietary Accommodations',   'multi_select',
    '["Halaal","Kosher","Vegetarian","Vegan","Gluten-Free","Dairy-Free","Nut-Free"]',
    '{"required":false}'),
  ('f-cat-min-guests','caterer_min_guests','Minimum Guest Count',      'number',       NULL, '{"required":true,"min":1}'),
  ('f-cat-max-guests','caterer_max_guests','Maximum Guest Count',      'number',       NULL, '{"required":false,"min":1}'),
  ('f-cat-equipment', 'caterer_equipment', 'Equipment & Facilities Provided', 'short_text', NULL, '{"required":false}'),
  ('f-cat-serve-style','caterer_serve_style','Service Style',          'multi_select',
    '["Buffet","Plated","Cocktail / Canapes","Family Style","Food Stations","Braai"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Events: MC ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-mc-event-types','mc_event_types',   'Event Types You Host',     'multi_select',
    '["Weddings","Corporate Conferences","Award Ceremonies","Year-End Functions","Galas","Birthday Parties","Heritage Events","Funerals","School Events"]',
    '{"required":true}'),
  ('f-mc-languages',  'mc_languages',     'Languages You Host In',    'multi_select',
    '["English","Afrikaans","Zulu","Xhosa","Sotho","Tswana","Venda","Tsonga","Ndebele","Swati"]',
    '{"required":true}'),
  ('f-mc-demo',       'mc_demo_reel',     'Demo Reel / Video URL',    'short_text',   NULL, '{"required":false,"pattern":"url"}')
ON CONFLICT (id) DO NOTHING;

-- ---- Cleaning ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-clean-types',   'cleaning_types',   'Services Offered',         'multi_select',
    '["Regular Cleaning","Deep / Spring Cleaning","Move-in / Move-out","Post-Construction","After-Party","Steam Cleaning","Window Cleaning","Pressure Washing","Sanitisation","Disinfection"]',
    '{"required":true}'),
  ('f-clean-products','cleaning_products','Products & Equipment Used', 'short_text',   NULL, '{"required":false}'),
  ('f-clean-team-size','cleaning_team_size','Team Size',              'number',        NULL, '{"required":false,"min":1}'),
  ('f-clean-insured', 'cleaning_insured', 'Fully Insured',            'boolean',       NULL, '{"required":false}'),
  ('f-clean-frequency','cleaning_frequency','Available Frequencies',  'multi_select',
    '["Once-off","Weekly","Fortnightly","Monthly","Daily (commercial)"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Security ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-sec-psira',     'security_psira_no',   'PSIRA Registration Number', 'short_text', NULL, '{"required":true}'),
  ('f-sec-grade',     'security_grade',      'Security Grade',            'single_select',
    '["Grade A","Grade B","Grade C","Grade D","Grade E"]',
    '{"required":false}'),
  ('f-sec-services',  'security_services',   'Services Offered',         'multi_select',
    '["Guarding","Armed Response","CCTV Installation","CCTV Monitoring","Alarm Monitoring","Access Control","Risk Assessment","Event Security","VIP Protection","Patrols"]',
    '{"required":true}'),
  ('f-sec-vehicles',  'security_vehicles',   'Response Vehicles',        'number',     NULL, '{"required":false,"min":0}'),
  ('f-sec-response',  'security_avg_response','Average Response Time',   'single_select',
    '["Under 5 minutes","5-10 minutes","10-20 minutes","20-30 minutes","30+ minutes"]',
    '{"required":false}'),
  ('f-sec-24h',       'security_24h',        '24-Hour Service',          'boolean',    NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Home & Maintenance ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-home-trades',   'home_trades',      'Trade Specialisations',    'multi_select',
    '["Plumbing","Electrical","Painting","Tiling","Building & Renovation","Roofing","Waterproofing","Carpentry","Glazing","Welding","Plastering","Paving"]',
    '{"required":true}'),
  ('f-home-coc',      'home_coc',         'Issues Certificate of Compliance (CoC)', 'boolean', NULL, '{"required":false}'),
  ('f-home-registered','home_registered', 'Registered with Industry Body', 'short_text', NULL, '{"required":false}'),
  ('f-home-emergency','home_emergency',   'Available for Emergencies', 'boolean',      NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Automotive ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-auto-services', 'auto_services',    'Services Offered',         'multi_select',
    '["Panel Beating","Spray Painting","Dent Removal","Mechanical Repairs","Full Service","Major Service","Diagnostics","Windscreen Replacement","Chip Repair","Tyre Fitting","Wheel Alignment","Detailing","Polishing","Ceramic Coating","Window Tinting","Electrical Repairs"]',
    '{"required":true}'),
  ('f-auto-brands',   'auto_brands',      'Vehicle Brands Serviced',  'multi_select',
    '["All Brands","Toyota","Volkswagen","Ford","BMW","Mercedes-Benz","Audi","Hyundai","Kia","Nissan","Chevrolet","Renault","Peugeot","Jeep","Land Rover"]',
    '{"required":false}'),
  ('f-auto-warranty', 'auto_warranty',    'Warranty on Work',         'boolean',      NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Beauty & Wellness ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-beauty-services','beauty_services', 'Services Offered',         'multi_select',
    '["Haircuts","Colouring","Braids / Weaves","Relaxer","Natural Styles","Locs","Manicure","Pedicure","Acrylic Nails","Gel Nails","Nail Art","Classic Lashes","Volume Lashes","Lash Lift","Brow Shaping","Facials","Peels","Waxing","Massages","Tattoos","Piercings","Personal Training","Group Fitness","Online Coaching"]',
    '{"required":true}'),
  ('f-beauty-mobile', 'beauty_mobile',    'Mobile / On-Site Service', 'boolean',      NULL, '{"required":false}'),
  ('f-beauty-gender', 'beauty_gender',    'Clientele Served',         'multi_select',
    '["Women","Men","Children","All"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Legal ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-legal-areas',   'legal_practice_areas','Areas of Practice',     'multi_select',
    '["Contract Law","Labour Law","Family Law","Criminal Law","Property Law","Commercial Law","Intellectual Property","Immigration","Tax Law","Insolvency","Wills & Estates","Environmental Law","Human Rights"]',
    '{"required":true}'),
  ('f-legal-lpcsa',   'legal_lpcsa_no',   'LPCSA / SAICA Registration No.', 'short_text', NULL, '{"required":true}'),
  ('f-legal-consult', 'legal_consultation_type','Consultation Type',  'multi_select',
    '["In-Person","Video Call","Phone","Whatsapp"]',
    '{"required":false}'),
  ('f-legal-languages','legal_languages', 'Languages of Practice',    'multi_select',
    '["English","Afrikaans","Zulu","Xhosa","Sotho","Tswana"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Finance ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-fin-services',  'finance_services', 'Services Offered',         'multi_select',
    '["Annual Financial Statements","Management Accounts","Tax Returns (Individual)","Tax Returns (Company)","VAT Registration & Returns","PAYE Processing","Payroll","Bookkeeping","Audit","BEE Compliance","Company Registration","Business Plans","Financial Planning","Retirement Planning","Investment Advice","Home Loans","Insurance Brokering"]',
    '{"required":true}'),
  ('f-fin-reg-body',  'finance_reg_body', 'Registered With',          'multi_select',
    '["SAICA","SAIPA","ACCA","CIMA","SARS (Tax Practitioner)","FPI","FSCA","NCA"]',
    '{"required":false}'),
  ('f-fin-reg-no',    'finance_reg_no',   'Registration / Membership Number', 'short_text', NULL, '{"required":false}'),
  ('f-fin-software',  'finance_software', 'Software Used',            'multi_select',
    '["Xero","Sage","QuickBooks","Pastel","SimplePay","Microsoft 365","SARS eFiling","Draftworx"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Health ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-health-hpcsa',  'health_hpcsa_no',  'HPCSA / AHPCSA Registration No.', 'short_text', NULL, '{"required":true}'),
  ('f-health-speciality','health_speciality','Speciality / Discipline','short_text', NULL, '{"required":false}'),
  ('f-health-med-aid','health_medical_aids','Medical Aids Accepted',  'multi_select',
    '["Discovery","Momentum","Bonitas","Gems","Medihelp","Fedhealth","Bestmed","Profmed","Resolution Health","Cash Only"]',
    '{"required":false}'),
  ('f-health-consult','health_consult_type','Consultation Format',    'multi_select',
    '["In-Clinic","Home Visit","Telehealth / Video","Whatsapp Consult"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Education ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-edu-subjects',  'edu_subjects',     'Subjects / Skills Taught', 'multi_select',
    '["Mathematics","Maths Literacy","Physical Science","Life Science / Biology","Accounting","Economics","Business Studies","English","Afrikaans","Zulu","History","Geography","Computer Applications","Information Technology","Piano","Guitar","Vocals","Drums","Violin","Coding","Web Development","Driving"]',
    '{"required":true}'),
  ('f-edu-grades',    'edu_grades',       'Grade Levels Covered',     'multi_select',
    '["Grade 1-3","Grade 4-6","Grade 7-9","Grade 10-12 (Matric)","University","Adults"]',
    '{"required":false}'),
  ('f-edu-format',    'edu_format',       'Teaching Format',          'multi_select',
    '["In-Person (at your home)","In-Person (at my location)","Online / Video Call","Group Sessions","One-on-One"]',
    '{"required":true}')
ON CONFLICT (id) DO NOTHING;

-- ---- Pets ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-pet-services',  'pet_services',     'Services Offered',         'multi_select',
    '["Consultations","Vaccinations","Sterilisation","Surgery","Grooming","Bath & Dry","De-matting","Dog Walking","Puppy Training","Obedience Classes","Behaviour Therapy","Boarding","Doggy Day Care","Pet Sitting","Home Visits"]',
    '{"required":true}'),
  ('f-pet-animals',   'pet_animals',      'Animals Catered For',      'multi_select',
    '["Dogs","Cats","Birds","Reptiles","Rabbits","Small Animals","Exotic Pets","All Animals"]',
    '{"required":false}'),
  ('f-pet-vet-reg',   'pet_vet_reg',      'SAVC Registration Number (vets)', 'short_text', NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Transport ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-transport-services','transport_services','Services Offered',    'multi_select',
    '["Same-Day Delivery","Next-Day Delivery","Overnight Delivery","Long Distance","Household Removals","Office Removals","Piano / Specialty Removals","Airport Transfer","Corporate Shuttle","School Transport","Tour Charter","Crane / Flatbed Hire","Motorbike Courier"]',
    '{"required":true}'),
  ('f-transport-vehicles','transport_vehicles','Fleet / Vehicle Types','multi_select',
    '["Motorbike","Sedan","MPV / 7-Seater","Minibus (15-seater)","Midi Bus (22-seater)","Coach (45+ seater)","Bakkie","1-Ton Truck","3-Ton Truck","8-Ton Truck","Semi-Truck","Refrigerated Truck","Crane Truck","Flatbed"]',
    '{"required":false}'),
  ('f-transport-gdp',  'transport_gdp',   'PDP / GDP Holders',        'boolean',      NULL, '{"required":false}'),
  ('f-transport-tracking','transport_tracking','Real-Time Tracking Available', 'boolean', NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Property ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-prop-services', 'property_services','Services Offered',         'multi_select',
    '["Residential Sales","Commercial Sales","Industrial Sales","Residential Rentals","Commercial Rentals","Property Management","Valuations","Bond Origination","Interior Design","Architecture","Quantity Surveying","Project Management"]',
    '{"required":true}'),
  ('f-prop-reg-no',   'property_reg_no',  'PPRA / Firm Registration No.', 'short_text', NULL, '{"required":false}'),
  ('f-prop-areas',    'property_spec_areas','Specialist Areas / Suburbs', 'short_text', NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- IT & Tech ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-tech-services', 'tech_services',    'Services Offered',         'multi_select',
    '["Web Design","Web Development","E-Commerce","Mobile Apps","Software Development","IT Support (On-site)","IT Support (Remote)","Network Setup","Fibre Installation","Wi-Fi Setup","CCTV Installation","Server Setup","Cloud Migration","Cyber Security","Data Recovery","POS Setup","System Integration","SEO","Digital Marketing"]',
    '{"required":true}'),
  ('f-tech-stack',    'tech_stack',       'Technologies & Platforms', 'multi_select',
    '["WordPress","Shopify","React","Next.js","Vue","Angular","Laravel","Node.js","Python","Java",".NET","AWS","Azure","Google Cloud","Linux","Windows Server","Mikrotik","Ubiquiti","Hikvision","Dahua"]',
    '{"required":false}'),
  ('f-tech-remote',   'tech_remote',      'Offers Remote Support',    'boolean',      NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Media & Creative ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-media-services','media_services',   'Services Offered',         'multi_select',
    '["Logo Design","Brand Identity","Print Design","Social Media Graphics","Video Editing","Animation","Motion Graphics","Copywriting","Blog Content","Ad Scripts","Voice Over","Podcast Editing","Photography","Product Photography","Social Media Management","Influencer Marketing","SEO Content"]',
    '{"required":true}'),
  ('f-media-software','media_software',   'Software & Tools Used',    'multi_select',
    '["Adobe Photoshop","Illustrator","InDesign","Premiere Pro","After Effects","Lightroom","Canva","Figma","DaVinci Resolve","Final Cut Pro","CapCut","Audacity","Logic Pro","Pro Tools"]',
    '{"required":false}'),
  ('f-media-portfolio','media_portfolio_url','Portfolio / Behance / Website URL', 'short_text', NULL, '{"required":false,"pattern":"url"}')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- FORM CONFIGS — 3 shared category steps + 1 type-specific step
-- Pattern: Business Details → Gallery & Media → FAQs & Links → [Type Details]
-- =============================================================

INSERT INTO form_configs (id, provider_type_id, category_id, step_number, step_title) VALUES
  -- Events
  ('fc-events-1', NULL, 'cat-events',    1, 'Business Details'),
  ('fc-events-2', NULL, 'cat-events',    2, 'Gallery & Media'),
  ('fc-events-3', NULL, 'cat-events',    3, 'FAQs & Links'),
  -- Cleaning
  ('fc-cleaning-1', NULL, 'cat-cleaning', 1, 'Business Details'),
  ('fc-cleaning-2', NULL, 'cat-cleaning', 2, 'Gallery & Media'),
  ('fc-cleaning-3', NULL, 'cat-cleaning', 3, 'FAQs & Links'),
  -- Security
  ('fc-security-1', NULL, 'cat-security', 1, 'Business Details'),
  ('fc-security-2', NULL, 'cat-security', 2, 'Gallery & Media'),
  ('fc-security-3', NULL, 'cat-security', 3, 'FAQs & Links'),
  -- Home
  ('fc-home-1', NULL, 'cat-home',       1, 'Business Details'),
  ('fc-home-2', NULL, 'cat-home',       2, 'Gallery & Media'),
  ('fc-home-3', NULL, 'cat-home',       3, 'FAQs & Links'),
  -- Automotive
  ('fc-auto-1', NULL, 'cat-auto',       1, 'Business Details'),
  ('fc-auto-2', NULL, 'cat-auto',       2, 'Gallery & Media'),
  ('fc-auto-3', NULL, 'cat-auto',       3, 'FAQs & Links'),
  -- Beauty
  ('fc-beauty-1', NULL, 'cat-beauty',   1, 'Business Details'),
  ('fc-beauty-2', NULL, 'cat-beauty',   2, 'Gallery & Media'),
  ('fc-beauty-3', NULL, 'cat-beauty',   3, 'FAQs & Links'),
  -- Legal
  ('fc-legal-1', NULL, 'cat-legal',     1, 'Business Details'),
  ('fc-legal-2', NULL, 'cat-legal',     2, 'Gallery & Media'),
  ('fc-legal-3', NULL, 'cat-legal',     3, 'FAQs & Links'),
  -- Finance
  ('fc-finance-1', NULL, 'cat-finance', 1, 'Business Details'),
  ('fc-finance-2', NULL, 'cat-finance', 2, 'Gallery & Media'),
  ('fc-finance-3', NULL, 'cat-finance', 3, 'FAQs & Links'),
  -- Health
  ('fc-health-1', NULL, 'cat-health',   1, 'Business Details'),
  ('fc-health-2', NULL, 'cat-health',   2, 'Gallery & Media'),
  ('fc-health-3', NULL, 'cat-health',   3, 'FAQs & Links'),
  -- Education
  ('fc-edu-1', NULL, 'cat-education',   1, 'Business Details'),
  ('fc-edu-2', NULL, 'cat-education',   2, 'Gallery & Media'),
  ('fc-edu-3', NULL, 'cat-education',   3, 'FAQs & Links'),
  -- Pets
  ('fc-pets-1', NULL, 'cat-pets',       1, 'Business Details'),
  ('fc-pets-2', NULL, 'cat-pets',       2, 'Gallery & Media'),
  ('fc-pets-3', NULL, 'cat-pets',       3, 'FAQs & Links'),
  -- Transport
  ('fc-transport-1', NULL, 'cat-transport', 1, 'Business Details'),
  ('fc-transport-2', NULL, 'cat-transport', 2, 'Gallery & Media'),
  ('fc-transport-3', NULL, 'cat-transport', 3, 'FAQs & Links'),
  -- Property
  ('fc-property-1', NULL, 'cat-property', 1, 'Business Details'),
  ('fc-property-2', NULL, 'cat-property', 2, 'Gallery & Media'),
  ('fc-property-3', NULL, 'cat-property', 3, 'FAQs & Links'),
  -- Tech
  ('fc-tech-1', NULL, 'cat-tech',       1, 'Business Details'),
  ('fc-tech-2', NULL, 'cat-tech',       2, 'Gallery & Media'),
  ('fc-tech-3', NULL, 'cat-tech',       3, 'FAQs & Links'),
  -- Media
  ('fc-media-1', NULL, 'cat-media',     1, 'Business Details'),
  ('fc-media-2', NULL, 'cat-media',     2, 'Gallery & Media'),
  ('fc-media-3', NULL, 'cat-media',     3, 'FAQs & Links')
ON CONFLICT (id) DO NOTHING;

-- ---- Provider-type-specific detail steps ----
INSERT INTO form_configs (id, provider_type_id, category_id, step_number, step_title) VALUES
  -- Events types
  ('fc-t-dj',           'pt-dj',             NULL, 1, 'DJ Details'),
  ('fc-t-mc',           'pt-mc',             NULL, 1, 'MC Details'),
  ('fc-t-photographer', 'pt-photographer',   NULL, 1, 'Photography Details'),
  ('fc-t-videographer', 'pt-videographer',   NULL, 1, 'Videography Details'),
  ('fc-t-caterer',      'pt-caterer',        NULL, 1, 'Catering Details'),
  ('fc-t-cake-baker',   'pt-cake-baker',     NULL, 1, 'Baking & Cake Details'),
  -- Cleaning types
  ('fc-t-res-clean',    'pt-residential-clean', NULL, 1, 'Cleaning Details'),
  ('fc-t-com-clean',    'pt-commercial-clean',  NULL, 1, 'Cleaning Details'),
  ('fc-t-carpet-clean', 'pt-carpet-clean',   NULL, 1, 'Specialist Cleaning Details'),
  -- Security types
  ('fc-t-guarding',     'pt-guarding',       NULL, 1, 'Security Details'),
  ('fc-t-armed',        'pt-armed',          NULL, 1, 'Armed Response Details'),
  ('fc-t-cctv',         'pt-cctv',           NULL, 1, 'CCTV Details'),
  -- Home types
  ('fc-t-plumber',      'pt-plumber',        NULL, 1, 'Trade Details'),
  ('fc-t-electrician',  'pt-electrician',    NULL, 1, 'Trade Details'),
  ('fc-t-painter',      'pt-painter',        NULL, 1, 'Trade Details'),
  ('fc-t-handyman',     'pt-handyman',       NULL, 1, 'Trade Details'),
  -- Automotive types
  ('fc-t-panel-beater', 'pt-panel-beater',   NULL, 1, 'Workshop Details'),
  ('fc-t-mechanic',     'pt-mechanic',       NULL, 1, 'Workshop Details'),
  -- Beauty types
  ('fc-t-hair-salon',   'pt-hair-salon',     NULL, 1, 'Salon Details'),
  ('fc-t-nail-tech',    'pt-nail-tech',      NULL, 1, 'Nail Details'),
  ('fc-t-massage',      'pt-massage',        NULL, 1, 'Treatment Details'),
  ('fc-t-personal-trainer', 'pt-personal-trainer', NULL, 1, 'Training Details'),
  -- Legal types
  ('fc-t-attorney',     'pt-attorney',       NULL, 1, 'Practice Details'),
  ('fc-t-conveyancer',  'pt-conveyancer',    NULL, 1, 'Practice Details'),
  -- Finance types
  ('fc-t-accountant',   'pt-accountant',     NULL, 1, 'Practice Details'),
  ('fc-t-tax-prac',     'pt-tax-practitioner', NULL, 1, 'Practice Details'),
  ('fc-t-fin-advisor',  'pt-fin-advisor',    NULL, 1, 'Advisory Details'),
  -- Health types
  ('fc-t-gp',           'pt-gp',             NULL, 1, 'Practice Details'),
  ('fc-t-dentist',      'pt-dentist',        NULL, 1, 'Practice Details'),
  ('fc-t-physio',       'pt-physio',         NULL, 1, 'Practice Details'),
  -- Education types
  ('fc-t-maths-tutor',  'pt-maths-tutor',    NULL, 1, 'Teaching Details'),
  ('fc-t-music-teacher','pt-music-teacher',  NULL, 1, 'Teaching Details'),
  ('fc-t-driving-school','pt-driving-school',NULL, 1, 'School Details'),
  -- Pets types
  ('fc-t-vet',          'pt-vet',            NULL, 1, 'Practice Details'),
  ('fc-t-dog-groomer',  'pt-dog-groomer',    NULL, 1, 'Grooming Details'),
  ('fc-t-dog-walker',   'pt-dog-walker',     NULL, 1, 'Service Details'),
  -- Transport types
  ('fc-t-courier',      'pt-courier',        NULL, 1, 'Fleet & Service Details'),
  ('fc-t-removals',     'pt-removals',       NULL, 1, 'Fleet & Service Details'),
  ('fc-t-shuttle',      'pt-shuttle',        NULL, 1, 'Fleet & Service Details'),
  -- Property types
  ('fc-t-estate-agent', 'pt-estate-agent',   NULL, 1, 'Agency Details'),
  ('fc-t-architect',    'pt-architect',      NULL, 1, 'Practice Details'),
  -- Tech types
  ('fc-t-web-dev',      'pt-web-dev',        NULL, 1, 'Technical Details'),
  ('fc-t-it-support',   'pt-it-support',     NULL, 1, 'Technical Details'),
  ('fc-t-software-dev', 'pt-software-dev',   NULL, 1, 'Technical Details'),
  -- Media types
  ('fc-t-graphic-designer', 'pt-graphic-designer', NULL, 1, 'Creative Details'),
  ('fc-t-video-editor', 'pt-video-editor',   NULL, 1, 'Creative Details'),
  ('fc-t-copywriter',   'pt-copywriter',     NULL, 1, 'Creative Details'),
  ('fc-t-social-media', 'pt-social-media-mgr', NULL, 1, 'Creative Details')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- FORM CONFIG FIELDS — shared step field assignments
-- All categories share the same field IDs for steps 1-3
-- =============================================================

-- Helper macro pattern: repeat business details fields for every category
-- Step 1 — Business Details
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-ev1-1','fc-events-1','f-biz-name',1,true), ('fcf-ev1-2','fc-events-1','f-bio',2,true), ('fcf-ev1-3','fc-events-1','f-phone',3,true), ('fcf-ev1-4','fc-events-1','f-website',4,false), ('fcf-ev1-5','fc-events-1','f-years-exp',5,false), ('fcf-ev1-6','fc-events-1','f-service-areas',6,true), ('fcf-ev1-7','fc-events-1','f-tags',7,false),
  ('fcf-cl1-1','fc-cleaning-1','f-biz-name',1,true), ('fcf-cl1-2','fc-cleaning-1','f-bio',2,true), ('fcf-cl1-3','fc-cleaning-1','f-phone',3,true), ('fcf-cl1-4','fc-cleaning-1','f-website',4,false), ('fcf-cl1-5','fc-cleaning-1','f-years-exp',5,false), ('fcf-cl1-6','fc-cleaning-1','f-service-areas',6,true), ('fcf-cl1-7','fc-cleaning-1','f-tags',7,false),
  ('fcf-sc1-1','fc-security-1','f-biz-name',1,true), ('fcf-sc1-2','fc-security-1','f-bio',2,true), ('fcf-sc1-3','fc-security-1','f-phone',3,true), ('fcf-sc1-4','fc-security-1','f-website',4,false), ('fcf-sc1-5','fc-security-1','f-years-exp',5,false), ('fcf-sc1-6','fc-security-1','f-service-areas',6,true), ('fcf-sc1-7','fc-security-1','f-tags',7,false),
  ('fcf-hm1-1','fc-home-1','f-biz-name',1,true), ('fcf-hm1-2','fc-home-1','f-bio',2,true), ('fcf-hm1-3','fc-home-1','f-phone',3,true), ('fcf-hm1-4','fc-home-1','f-website',4,false), ('fcf-hm1-5','fc-home-1','f-years-exp',5,false), ('fcf-hm1-6','fc-home-1','f-service-areas',6,true), ('fcf-hm1-7','fc-home-1','f-tags',7,false),
  ('fcf-au1-1','fc-auto-1','f-biz-name',1,true), ('fcf-au1-2','fc-auto-1','f-bio',2,true), ('fcf-au1-3','fc-auto-1','f-phone',3,true), ('fcf-au1-4','fc-auto-1','f-website',4,false), ('fcf-au1-5','fc-auto-1','f-years-exp',5,false), ('fcf-au1-6','fc-auto-1','f-service-areas',6,true), ('fcf-au1-7','fc-auto-1','f-tags',7,false),
  ('fcf-be1-1','fc-beauty-1','f-biz-name',1,true), ('fcf-be1-2','fc-beauty-1','f-bio',2,true), ('fcf-be1-3','fc-beauty-1','f-phone',3,true), ('fcf-be1-4','fc-beauty-1','f-website',4,false), ('fcf-be1-5','fc-beauty-1','f-years-exp',5,false), ('fcf-be1-6','fc-beauty-1','f-service-areas',6,true), ('fcf-be1-7','fc-beauty-1','f-tags',7,false),
  ('fcf-lg1-1','fc-legal-1','f-biz-name',1,true), ('fcf-lg1-2','fc-legal-1','f-bio',2,true), ('fcf-lg1-3','fc-legal-1','f-phone',3,true), ('fcf-lg1-4','fc-legal-1','f-website',4,false), ('fcf-lg1-5','fc-legal-1','f-years-exp',5,false), ('fcf-lg1-6','fc-legal-1','f-service-areas',6,true), ('fcf-lg1-7','fc-legal-1','f-tags',7,false),
  ('fcf-fi1-1','fc-finance-1','f-biz-name',1,true), ('fcf-fi1-2','fc-finance-1','f-bio',2,true), ('fcf-fi1-3','fc-finance-1','f-phone',3,true), ('fcf-fi1-4','fc-finance-1','f-website',4,false), ('fcf-fi1-5','fc-finance-1','f-years-exp',5,false), ('fcf-fi1-6','fc-finance-1','f-service-areas',6,true), ('fcf-fi1-7','fc-finance-1','f-tags',7,false),
  ('fcf-hl1-1','fc-health-1','f-biz-name',1,true), ('fcf-hl1-2','fc-health-1','f-bio',2,true), ('fcf-hl1-3','fc-health-1','f-phone',3,true), ('fcf-hl1-4','fc-health-1','f-website',4,false), ('fcf-hl1-5','fc-health-1','f-years-exp',5,false), ('fcf-hl1-6','fc-health-1','f-service-areas',6,true), ('fcf-hl1-7','fc-health-1','f-tags',7,false),
  ('fcf-ed1-1','fc-edu-1','f-biz-name',1,true), ('fcf-ed1-2','fc-edu-1','f-bio',2,true), ('fcf-ed1-3','fc-edu-1','f-phone',3,true), ('fcf-ed1-4','fc-edu-1','f-website',4,false), ('fcf-ed1-5','fc-edu-1','f-years-exp',5,false), ('fcf-ed1-6','fc-edu-1','f-service-areas',6,true), ('fcf-ed1-7','fc-edu-1','f-tags',7,false),
  ('fcf-pt1-1','fc-pets-1','f-biz-name',1,true), ('fcf-pt1-2','fc-pets-1','f-bio',2,true), ('fcf-pt1-3','fc-pets-1','f-phone',3,true), ('fcf-pt1-4','fc-pets-1','f-website',4,false), ('fcf-pt1-5','fc-pets-1','f-years-exp',5,false), ('fcf-pt1-6','fc-pets-1','f-service-areas',6,true), ('fcf-pt1-7','fc-pets-1','f-tags',7,false),
  ('fcf-tr1-1','fc-transport-1','f-biz-name',1,true), ('fcf-tr1-2','fc-transport-1','f-bio',2,true), ('fcf-tr1-3','fc-transport-1','f-phone',3,true), ('fcf-tr1-4','fc-transport-1','f-website',4,false), ('fcf-tr1-5','fc-transport-1','f-years-exp',5,false), ('fcf-tr1-6','fc-transport-1','f-service-areas',6,true), ('fcf-tr1-7','fc-transport-1','f-tags',7,false),
  ('fcf-pr1-1','fc-property-1','f-biz-name',1,true), ('fcf-pr1-2','fc-property-1','f-bio',2,true), ('fcf-pr1-3','fc-property-1','f-phone',3,true), ('fcf-pr1-4','fc-property-1','f-website',4,false), ('fcf-pr1-5','fc-property-1','f-years-exp',5,false), ('fcf-pr1-6','fc-property-1','f-service-areas',6,true), ('fcf-pr1-7','fc-property-1','f-tags',7,false),
  ('fcf-tc1-1','fc-tech-1','f-biz-name',1,true), ('fcf-tc1-2','fc-tech-1','f-bio',2,true), ('fcf-tc1-3','fc-tech-1','f-phone',3,true), ('fcf-tc1-4','fc-tech-1','f-website',4,false), ('fcf-tc1-5','fc-tech-1','f-years-exp',5,false), ('fcf-tc1-6','fc-tech-1','f-service-areas',6,true), ('fcf-tc1-7','fc-tech-1','f-tags',7,false),
  ('fcf-md1-1','fc-media-1','f-biz-name',1,true), ('fcf-md1-2','fc-media-1','f-bio',2,true), ('fcf-md1-3','fc-media-1','f-phone',3,true), ('fcf-md1-4','fc-media-1','f-website',4,false), ('fcf-md1-5','fc-media-1','f-years-exp',5,false), ('fcf-md1-6','fc-media-1','f-service-areas',6,true), ('fcf-md1-7','fc-media-1','f-tags',7,false)
ON CONFLICT (id) DO NOTHING;

-- Step 2 — Gallery & Media (all categories)
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-ev2-1','fc-events-2','f-profile-img',1,true), ('fcf-ev2-2','fc-events-2','f-gallery',2,false),
  ('fcf-cl2-1','fc-cleaning-2','f-profile-img',1,true), ('fcf-cl2-2','fc-cleaning-2','f-gallery',2,false),
  ('fcf-sc2-1','fc-security-2','f-profile-img',1,true), ('fcf-sc2-2','fc-security-2','f-gallery',2,false),
  ('fcf-hm2-1','fc-home-2','f-profile-img',1,true), ('fcf-hm2-2','fc-home-2','f-gallery',2,false),
  ('fcf-au2-1','fc-auto-2','f-profile-img',1,true), ('fcf-au2-2','fc-auto-2','f-gallery',2,false),
  ('fcf-be2-1','fc-beauty-2','f-profile-img',1,true), ('fcf-be2-2','fc-beauty-2','f-gallery',2,false),
  ('fcf-lg2-1','fc-legal-2','f-profile-img',1,true), ('fcf-lg2-2','fc-legal-2','f-gallery',2,false),
  ('fcf-fi2-1','fc-finance-2','f-profile-img',1,true), ('fcf-fi2-2','fc-finance-2','f-gallery',2,false),
  ('fcf-hl2-1','fc-health-2','f-profile-img',1,true), ('fcf-hl2-2','fc-health-2','f-gallery',2,false),
  ('fcf-ed2-1','fc-edu-2','f-profile-img',1,true), ('fcf-ed2-2','fc-edu-2','f-gallery',2,false),
  ('fcf-pt2-1','fc-pets-2','f-profile-img',1,true), ('fcf-pt2-2','fc-pets-2','f-gallery',2,false),
  ('fcf-tr2-1','fc-transport-2','f-profile-img',1,true), ('fcf-tr2-2','fc-transport-2','f-gallery',2,false),
  ('fcf-pr2-1','fc-property-2','f-profile-img',1,true), ('fcf-pr2-2','fc-property-2','f-gallery',2,false),
  ('fcf-tc2-1','fc-tech-2','f-profile-img',1,true), ('fcf-tc2-2','fc-tech-2','f-gallery',2,false),
  ('fcf-md2-1','fc-media-2','f-profile-img',1,true), ('fcf-md2-2','fc-media-2','f-gallery',2,false)
ON CONFLICT (id) DO NOTHING;

-- Step 3 — FAQs & Links (all categories)
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-ev3-1','fc-events-3','f-faqs',1,false), ('fcf-ev3-2','fc-events-3','f-links',2,false), ('fcf-ev3-3','fc-events-3','f-social',3,false),
  ('fcf-cl3-1','fc-cleaning-3','f-faqs',1,false), ('fcf-cl3-2','fc-cleaning-3','f-links',2,false), ('fcf-cl3-3','fc-cleaning-3','f-social',3,false),
  ('fcf-sc3-1','fc-security-3','f-faqs',1,false), ('fcf-sc3-2','fc-security-3','f-links',2,false), ('fcf-sc3-3','fc-security-3','f-social',3,false),
  ('fcf-hm3-1','fc-home-3','f-faqs',1,false), ('fcf-hm3-2','fc-home-3','f-links',2,false), ('fcf-hm3-3','fc-home-3','f-social',3,false),
  ('fcf-au3-1','fc-auto-3','f-faqs',1,false), ('fcf-au3-2','fc-auto-3','f-links',2,false), ('fcf-au3-3','fc-auto-3','f-social',3,false),
  ('fcf-be3-1','fc-beauty-3','f-faqs',1,false), ('fcf-be3-2','fc-beauty-3','f-links',2,false), ('fcf-be3-3','fc-beauty-3','f-social',3,false),
  ('fcf-lg3-1','fc-legal-3','f-faqs',1,false), ('fcf-lg3-2','fc-legal-3','f-links',2,false), ('fcf-lg3-3','fc-legal-3','f-social',3,false),
  ('fcf-fi3-1','fc-finance-3','f-faqs',1,false), ('fcf-fi3-2','fc-finance-3','f-links',2,false), ('fcf-fi3-3','fc-finance-3','f-social',3,false),
  ('fcf-hl3-1','fc-health-3','f-faqs',1,false), ('fcf-hl3-2','fc-health-3','f-links',2,false), ('fcf-hl3-3','fc-health-3','f-social',3,false),
  ('fcf-ed3-1','fc-edu-3','f-faqs',1,false), ('fcf-ed3-2','fc-edu-3','f-links',2,false), ('fcf-ed3-3','fc-edu-3','f-social',3,false),
  ('fcf-pt3-1','fc-pets-3','f-faqs',1,false), ('fcf-pt3-2','fc-pets-3','f-links',2,false), ('fcf-pt3-3','fc-pets-3','f-social',3,false),
  ('fcf-tr3-1','fc-transport-3','f-faqs',1,false), ('fcf-tr3-2','fc-transport-3','f-links',2,false), ('fcf-tr3-3','fc-transport-3','f-social',3,false),
  ('fcf-pr3-1','fc-property-3','f-faqs',1,false), ('fcf-pr3-2','fc-property-3','f-links',2,false), ('fcf-pr3-3','fc-property-3','f-social',3,false),
  ('fcf-tc3-1','fc-tech-3','f-faqs',1,false), ('fcf-tc3-2','fc-tech-3','f-links',2,false), ('fcf-tc3-3','fc-tech-3','f-social',3,false),
  ('fcf-md3-1','fc-media-3','f-faqs',1,false), ('fcf-md3-2','fc-media-3','f-links',2,false), ('fcf-md3-3','fc-media-3','f-social',3,false)
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- FORM CONFIG FIELDS — type-specific detail step assignments
-- =============================================================

-- DJ
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-dj-1','fc-t-dj','f-dj-event-types',1,true),
  ('fcf-t-dj-2','fc-t-dj','f-dj-genres',2,true),
  ('fcf-t-dj-3','fc-t-dj','f-dj-sample',3,false),
  ('fcf-t-dj-4','fc-t-dj','f-dj-equipment',4,false)
ON CONFLICT (id) DO NOTHING;

-- MC
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-mc-1','fc-t-mc','f-mc-event-types',1,true),
  ('fcf-t-mc-2','fc-t-mc','f-mc-languages',2,true),
  ('fcf-t-mc-3','fc-t-mc','f-mc-demo',3,false)
ON CONFLICT (id) DO NOTHING;

-- Photographer
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-ph-1','fc-t-photographer','f-photo-styles',1,true),
  ('fcf-t-ph-2','fc-t-photographer','f-photo-events',2,true),
  ('fcf-t-ph-3','fc-t-photographer','f-photo-turnaround',3,false),
  ('fcf-t-ph-4','fc-t-photographer','f-photo-raw',4,false)
ON CONFLICT (id) DO NOTHING;

-- Videographer
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-vid-1','fc-t-videographer','f-photo-events',1,true),
  ('fcf-t-vid-2','fc-t-videographer','f-video-formats',2,true),
  ('fcf-t-vid-3','fc-t-videographer','f-photo-turnaround',3,false)
ON CONFLICT (id) DO NOTHING;

-- Caterer
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-cat-1','fc-t-caterer','f-cat-cuisines',1,true),
  ('fcf-t-cat-2','fc-t-caterer','f-cat-serve-style',2,false),
  ('fcf-t-cat-3','fc-t-caterer','f-cat-dietary',3,false),
  ('fcf-t-cat-4','fc-t-caterer','f-cat-min-guests',4,true),
  ('fcf-t-cat-5','fc-t-caterer','f-cat-max-guests',5,false),
  ('fcf-t-cat-6','fc-t-caterer','f-cat-equipment',6,false)
ON CONFLICT (id) DO NOTHING;

-- Cleaning types (residential, commercial, carpet share same fields)
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-rcl-1','fc-t-res-clean','f-clean-types',1,true), ('fcf-t-rcl-2','fc-t-res-clean','f-clean-frequency',2,false), ('fcf-t-rcl-3','fc-t-res-clean','f-clean-products',3,false), ('fcf-t-rcl-4','fc-t-res-clean','f-clean-team-size',4,false), ('fcf-t-rcl-5','fc-t-res-clean','f-clean-insured',5,false),
  ('fcf-t-ccl-1','fc-t-com-clean','f-clean-types',1,true), ('fcf-t-ccl-2','fc-t-com-clean','f-clean-frequency',2,false), ('fcf-t-ccl-3','fc-t-com-clean','f-clean-products',3,false), ('fcf-t-ccl-4','fc-t-com-clean','f-clean-team-size',4,false), ('fcf-t-ccl-5','fc-t-com-clean','f-clean-insured',5,false),
  ('fcf-t-kcp-1','fc-t-carpet-clean','f-clean-products',1,false), ('fcf-t-kcp-2','fc-t-carpet-clean','f-clean-insured',2,false)
ON CONFLICT (id) DO NOTHING;

-- Security types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-grd-1','fc-t-guarding','f-sec-psira',1,true), ('fcf-t-grd-2','fc-t-guarding','f-sec-grade',2,false), ('fcf-t-grd-3','fc-t-guarding','f-sec-services',3,true), ('fcf-t-grd-4','fc-t-guarding','f-sec-24h',4,false),
  ('fcf-t-arm-1','fc-t-armed','f-sec-psira',1,true), ('fcf-t-arm-2','fc-t-armed','f-sec-services',2,true), ('fcf-t-arm-3','fc-t-armed','f-sec-vehicles',3,false), ('fcf-t-arm-4','fc-t-armed','f-sec-response',4,false), ('fcf-t-arm-5','fc-t-armed','f-sec-24h',5,false),
  ('fcf-t-ccv-1','fc-t-cctv','f-sec-psira',1,false), ('fcf-t-ccv-2','fc-t-cctv','f-sec-services',2,true)
ON CONFLICT (id) DO NOTHING;

-- Home trades (plumber, electrician, painter, handyman share same fields)
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-pl-1','fc-t-plumber','f-home-trades',1,true), ('fcf-t-pl-2','fc-t-plumber','f-home-coc',2,false), ('fcf-t-pl-3','fc-t-plumber','f-home-registered',3,false), ('fcf-t-pl-4','fc-t-plumber','f-home-emergency',4,false),
  ('fcf-t-el-1','fc-t-electrician','f-home-trades',1,true), ('fcf-t-el-2','fc-t-electrician','f-home-coc',2,false), ('fcf-t-el-3','fc-t-electrician','f-home-registered',3,false), ('fcf-t-el-4','fc-t-electrician','f-home-emergency',4,false),
  ('fcf-t-pa-1','fc-t-painter','f-home-trades',1,true), ('fcf-t-pa-2','fc-t-painter','f-home-emergency',2,false),
  ('fcf-t-hm-1','fc-t-handyman','f-home-trades',1,true), ('fcf-t-hm-2','fc-t-handyman','f-home-emergency',2,false)
ON CONFLICT (id) DO NOTHING;

-- Automotive types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-pb-1','fc-t-panel-beater','f-auto-services',1,true), ('fcf-t-pb-2','fc-t-panel-beater','f-auto-warranty',2,false),
  ('fcf-t-me-1','fc-t-mechanic','f-auto-services',1,true), ('fcf-t-me-2','fc-t-mechanic','f-auto-brands',2,false), ('fcf-t-me-3','fc-t-mechanic','f-auto-warranty',3,false)
ON CONFLICT (id) DO NOTHING;

-- Beauty types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-hs-1','fc-t-hair-salon','f-beauty-services',1,true), ('fcf-t-hs-2','fc-t-hair-salon','f-beauty-mobile',2,false), ('fcf-t-hs-3','fc-t-hair-salon','f-beauty-gender',3,false),
  ('fcf-t-nt-1','fc-t-nail-tech','f-beauty-services',1,true), ('fcf-t-nt-2','fc-t-nail-tech','f-beauty-mobile',2,false),
  ('fcf-t-ms-1','fc-t-massage','f-beauty-services',1,true), ('fcf-t-ms-2','fc-t-massage','f-beauty-mobile',2,false),
  ('fcf-t-pt-1','fc-t-personal-trainer','f-beauty-services',1,true), ('fcf-t-pt-2','fc-t-personal-trainer','f-beauty-mobile',2,false)
ON CONFLICT (id) DO NOTHING;

-- Legal types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-at-1','fc-t-attorney','f-legal-lpcsa',1,true), ('fcf-t-at-2','fc-t-attorney','f-legal-areas',2,true), ('fcf-t-at-3','fc-t-attorney','f-legal-languages',3,false), ('fcf-t-at-4','fc-t-attorney','f-legal-consult',4,false),
  ('fcf-t-cv-1','fc-t-conveyancer','f-legal-lpcsa',1,true), ('fcf-t-cv-2','fc-t-conveyancer','f-legal-areas',2,false), ('fcf-t-cv-3','fc-t-conveyancer','f-legal-consult',3,false)
ON CONFLICT (id) DO NOTHING;

-- Finance types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-ac-1','fc-t-accountant','f-fin-reg-body',1,false), ('fcf-t-ac-2','fc-t-accountant','f-fin-reg-no',2,false), ('fcf-t-ac-3','fc-t-accountant','f-fin-services',3,true), ('fcf-t-ac-4','fc-t-accountant','f-fin-software',4,false),
  ('fcf-t-tp-1','fc-t-tax-prac','f-fin-reg-body',1,false), ('fcf-t-tp-2','fc-t-tax-prac','f-fin-reg-no',2,false), ('fcf-t-tp-3','fc-t-tax-prac','f-fin-services',3,true), ('fcf-t-tp-4','fc-t-tax-prac','f-fin-software',4,false),
  ('fcf-t-fa-1','fc-t-fin-advisor','f-fin-reg-body',1,false), ('fcf-t-fa-2','fc-t-fin-advisor','f-fin-reg-no',2,false), ('fcf-t-fa-3','fc-t-fin-advisor','f-fin-services',3,true)
ON CONFLICT (id) DO NOTHING;

-- Health types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-gp-1','fc-t-gp','f-health-hpcsa',1,true), ('fcf-t-gp-2','fc-t-gp','f-health-med-aid',2,false), ('fcf-t-gp-3','fc-t-gp','f-health-consult',3,false),
  ('fcf-t-dn-1','fc-t-dentist','f-health-hpcsa',1,true), ('fcf-t-dn-2','fc-t-dentist','f-health-med-aid',2,false), ('fcf-t-dn-3','fc-t-dentist','f-health-consult',3,false),
  ('fcf-t-ph-h-1','fc-t-physio','f-health-hpcsa',1,true), ('fcf-t-ph-h-2','fc-t-physio','f-health-med-aid',2,false), ('fcf-t-ph-h-3','fc-t-physio','f-health-consult',3,false)
ON CONFLICT (id) DO NOTHING;

-- Education types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-mt-1','fc-t-maths-tutor','f-edu-subjects',1,true), ('fcf-t-mt-2','fc-t-maths-tutor','f-edu-grades',2,false), ('fcf-t-mt-3','fc-t-maths-tutor','f-edu-format',3,true),
  ('fcf-t-mst-1','fc-t-music-teacher','f-edu-subjects',1,true), ('fcf-t-mst-2','fc-t-music-teacher','f-edu-grades',2,false), ('fcf-t-mst-3','fc-t-music-teacher','f-edu-format',3,true),
  ('fcf-t-ds-1','fc-t-driving-school','f-edu-format',1,true), ('fcf-t-ds-2','fc-t-driving-school','f-edu-grades',2,false)
ON CONFLICT (id) DO NOTHING;

-- Pet types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-vt-1','fc-t-vet','f-pet-vet-reg',1,true), ('fcf-t-vt-2','fc-t-vet','f-pet-services',2,true), ('fcf-t-vt-3','fc-t-vet','f-pet-animals',3,false),
  ('fcf-t-dg-1','fc-t-dog-groomer','f-pet-services',1,true), ('fcf-t-dg-2','fc-t-dog-groomer','f-pet-animals',2,false),
  ('fcf-t-dw-1','fc-t-dog-walker','f-pet-services',1,true), ('fcf-t-dw-2','fc-t-dog-walker','f-pet-animals',2,false)
ON CONFLICT (id) DO NOTHING;

-- Transport types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-co-1','fc-t-courier','f-transport-services',1,true), ('fcf-t-co-2','fc-t-courier','f-transport-vehicles',2,false), ('fcf-t-co-3','fc-t-courier','f-transport-tracking',3,false),
  ('fcf-t-rm-1','fc-t-removals','f-transport-services',1,true), ('fcf-t-rm-2','fc-t-removals','f-transport-vehicles',2,false),
  ('fcf-t-sh-1','fc-t-shuttle','f-transport-services',1,true), ('fcf-t-sh-2','fc-t-shuttle','f-transport-vehicles',2,false), ('fcf-t-sh-3','fc-t-shuttle','f-transport-gdp',3,false)
ON CONFLICT (id) DO NOTHING;

-- Property types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-ea-1','fc-t-estate-agent','f-prop-reg-no',1,false), ('fcf-t-ea-2','fc-t-estate-agent','f-prop-services',2,true), ('fcf-t-ea-3','fc-t-estate-agent','f-prop-areas',3,false),
  ('fcf-t-ar-1','fc-t-architect','f-prop-services',1,true), ('fcf-t-ar-2','fc-t-architect','f-prop-reg-no',2,false)
ON CONFLICT (id) DO NOTHING;

-- Tech types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-wd-1','fc-t-web-dev','f-tech-services',1,true), ('fcf-t-wd-2','fc-t-web-dev','f-tech-stack',2,false), ('fcf-t-wd-3','fc-t-web-dev','f-tech-remote',3,false),
  ('fcf-t-it-1','fc-t-it-support','f-tech-services',1,true), ('fcf-t-it-2','fc-t-it-support','f-tech-stack',2,false), ('fcf-t-it-3','fc-t-it-support','f-tech-remote',3,false),
  ('fcf-t-sd-1','fc-t-software-dev','f-tech-services',1,true), ('fcf-t-sd-2','fc-t-software-dev','f-tech-stack',2,false), ('fcf-t-sd-3','fc-t-software-dev','f-tech-remote',3,false)
ON CONFLICT (id) DO NOTHING;

-- Media types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-gd-1','fc-t-graphic-designer','f-media-services',1,true), ('fcf-t-gd-2','fc-t-graphic-designer','f-media-software',2,false), ('fcf-t-gd-3','fc-t-graphic-designer','f-media-portfolio',3,false),
  ('fcf-t-ve-1','fc-t-video-editor','f-media-services',1,true), ('fcf-t-ve-2','fc-t-video-editor','f-media-software',2,false), ('fcf-t-ve-3','fc-t-video-editor','f-media-portfolio',3,false),
  ('fcf-t-cw-1','fc-t-copywriter','f-media-services',1,true), ('fcf-t-cw-2','fc-t-copywriter','f-media-portfolio',2,false),
  ('fcf-t-sm-1','fc-t-social-media','f-media-services',1,true), ('fcf-t-sm-2','fc-t-social-media','f-media-software',2,false), ('fcf-t-sm-3','fc-t-social-media','f-media-portfolio',3,false)
ON CONFLICT (id) DO NOTHING;
