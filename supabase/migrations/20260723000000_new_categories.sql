-- =============================================================
-- New categories: Funeral Services, Car Dealerships,
-- Construction & Civil, Gardening & Landscaping
-- (Real Estate/Legal/Security/Transport/Pets/Education already
-- exist as property/legal/security/transport/pets/education.)
-- =============================================================

INSERT INTO provider_categories (id, name, slug, description, icon) VALUES
  ('cat-funeral',      'Funeral Services',         'funeral',      'Funeral parlours, undertakers, cremation services, tombstones, and repatriation.', 'Flower'),
  ('cat-dealerships',  'Car Dealerships',          'dealerships',  'New and used vehicle dealers, bakkie and commercial sales, and vehicle sourcing.', 'CarProfile'),
  ('cat-construction', 'Construction & Civil',     'construction', 'Building contractors, renovations, paving, roofing, and civil works.', 'HardHat'),
  ('cat-gardening',    'Gardening & Landscaping',  'gardening',    'Garden services, landscaping, tree felling, and irrigation.', 'Plant')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- PROVIDER TYPES
-- =============================================================

-- ---- Funeral Services ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-funeral-parlour', 'cat-funeral', 'Funeral Parlour',        'funeral-parlour'),
  ('pt-undertaker',      'cat-funeral', 'Undertaker',             'undertaker'),
  ('pt-cremation',       'cat-funeral', 'Cremation Services',     'cremation'),
  ('pt-tombstone',       'cat-funeral', 'Tombstone & Memorial',   'tombstone'),
  ('pt-funeral-cover',   'cat-funeral', 'Funeral Cover Advisor',  'funeral-cover'),
  ('pt-repatriation',    'cat-funeral', 'Repatriation Services',  'repatriation')
ON CONFLICT (id) DO NOTHING;

-- ---- Car Dealerships ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-new-car-dealer',    'cat-dealerships', 'New Vehicle Dealer',      'new-car-dealer'),
  ('pt-used-car-dealer',   'cat-dealerships', 'Used Vehicle Dealer',     'used-car-dealer'),
  ('pt-bakkie-dealer',     'cat-dealerships', 'Bakkie & Commercial Dealer', 'bakkie-commercial-dealer'),
  ('pt-vehicle-sourcing',  'cat-dealerships', 'Vehicle Sourcing Agent',  'vehicle-sourcing'),
  ('pt-trade-in-broker',   'cat-dealerships', 'Trade-In Broker',         'trade-in-broker')
ON CONFLICT (id) DO NOTHING;

-- ---- Construction & Civil ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-building-contractor', 'cat-construction', 'Building Contractor',  'building-contractor'),
  ('pt-renovation',          'cat-construction', 'Renovation Specialist','renovation'),
  ('pt-paving',              'cat-construction', 'Paving Contractor',   'paving'),
  ('pt-roofing-civil',       'cat-construction', 'Roofing Contractor',  'roofing-civil'),
  ('pt-civil-works',         'cat-construction', 'Civil Works Contractor','civil-works'),
  ('pt-demolition',          'cat-construction', 'Demolition Contractor','demolition')
ON CONFLICT (id) DO NOTHING;

-- ---- Gardening & Landscaping ----
INSERT INTO provider_types (id, category_id, name, slug) VALUES
  ('pt-garden-services',   'cat-gardening', 'Garden Services',       'garden-services'),
  ('pt-landscaping',       'cat-gardening', 'Landscaper',            'landscaping'),
  ('pt-tree-felling',      'cat-gardening', 'Tree Felling',          'tree-felling'),
  ('pt-irrigation',        'cat-gardening', 'Irrigation Specialist', 'irrigation'),
  ('pt-lawn-care',         'cat-gardening', 'Lawn Care',             'lawn-care')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- SPECIALIST FIELDS BY DOMAIN
-- =============================================================

-- ---- Funeral ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-fun-services',  'funeral_services',  'Services Offered',        'multi_select',
    '["Funeral Parlour Services","Undertaking","Cremation","Tombstones & Memorials","Funeral Cover Advice","Repatriation","Grief Counselling","Catering for Funerals"]',
    '{"required":true}'),
  ('f-fun-license',   'funeral_license_no','NFDA / Provincial License No.', 'short_text', NULL, '{"required":true}'),
  ('f-fun-religions', 'funeral_religions', 'Religious & Cultural Practices Catered For', 'multi_select',
    '["Christian","Muslim","Jewish","Hindu","Traditional African","Non-Denominational","All"]',
    '{"required":false}'),
  ('f-fun-24h',       'funeral_24h',       '24-Hour Availability',    'boolean',      NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Car Dealerships ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-deal-services',  'dealership_services',  'Services Offered',        'multi_select',
    '["New Vehicle Sales","Used Vehicle Sales","Bakkie & Commercial Sales","Vehicle Sourcing","Trade-Ins","Finance Facilitation","Extended Warranties","Vehicle Inspections"]',
    '{"required":true}'),
  ('f-deal-license',   'dealership_license_no','NADA / Dealer License No.', 'short_text', NULL, '{"required":true}'),
  ('f-deal-brands',    'dealership_brands',    'Brands Sold',           'multi_select',
    '["All Brands","Toyota","Volkswagen","Ford","BMW","Mercedes-Benz","Audi","Hyundai","Kia","Nissan","Chevrolet","Renault","Peugeot","Jeep","Land Rover","Suzuki","Isuzu"]',
    '{"required":false}'),
  ('f-deal-finance',   'dealership_finance',   'In-House Finance Available', 'boolean', NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Construction & Civil ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-con-services',  'construction_services', 'Services Offered',        'multi_select',
    '["New Builds","Renovations & Additions","Paving","Roofing","Civil Works","Demolition","Foundations","Waterproofing","Project Management"]',
    '{"required":true}'),
  ('f-con-nhbrc',     'construction_nhbrc_no', 'NHBRC Registration No.',  'short_text', NULL, '{"required":true}'),
  ('f-con-insured',   'construction_insured',  'Fully Insured',           'boolean',    NULL, '{"required":false}'),
  ('f-con-project-size','construction_project_size','Typical Project Size','single_select',
    '["Small (under R100k)","Medium (R100k-R1m)","Large (R1m+)","All sizes"]',
    '{"required":false}')
ON CONFLICT (id) DO NOTHING;

-- ---- Gardening & Landscaping ----
INSERT INTO fields (id, key, label, input_type, options, validator_config) VALUES
  ('f-gar-services',  'gardening_services', 'Services Offered',        'multi_select',
    '["Garden Maintenance","Landscaping Design","Tree Felling","Irrigation Installation","Lawn Care","Fertilising","Pest & Weed Control","Garden Clean-Ups"]',
    '{"required":true}'),
  ('f-gar-frequency', 'gardening_frequency','Available Frequencies',  'multi_select',
    '["Once-off","Weekly","Fortnightly","Monthly"]',
    '{"required":false}'),
  ('f-gar-insured',   'gardening_insured',  'Fully Insured',           'boolean',      NULL, '{"required":false}')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- FORM CONFIGS — 3 shared category steps + 1 type-specific step
-- =============================================================

INSERT INTO form_configs (id, provider_type_id, category_id, step_number, step_title) VALUES
  -- Funeral
  ('fc-funeral-1', NULL, 'cat-funeral', 1, 'Business Details'),
  ('fc-funeral-2', NULL, 'cat-funeral', 2, 'Gallery & Media'),
  ('fc-funeral-3', NULL, 'cat-funeral', 3, 'FAQs & Links'),
  -- Dealerships
  ('fc-dealerships-1', NULL, 'cat-dealerships', 1, 'Business Details'),
  ('fc-dealerships-2', NULL, 'cat-dealerships', 2, 'Gallery & Media'),
  ('fc-dealerships-3', NULL, 'cat-dealerships', 3, 'FAQs & Links'),
  -- Construction
  ('fc-construction-1', NULL, 'cat-construction', 1, 'Business Details'),
  ('fc-construction-2', NULL, 'cat-construction', 2, 'Gallery & Media'),
  ('fc-construction-3', NULL, 'cat-construction', 3, 'FAQs & Links'),
  -- Gardening
  ('fc-gardening-1', NULL, 'cat-gardening', 1, 'Business Details'),
  ('fc-gardening-2', NULL, 'cat-gardening', 2, 'Gallery & Media'),
  ('fc-gardening-3', NULL, 'cat-gardening', 3, 'FAQs & Links')
ON CONFLICT (id) DO NOTHING;

-- ---- Provider-type-specific detail steps (main type per category) ----
INSERT INTO form_configs (id, provider_type_id, category_id, step_number, step_title) VALUES
  ('fc-t-funeral-parlour', 'pt-funeral-parlour', NULL, 1, 'Funeral Home Details'),
  ('fc-t-tombstone',       'pt-tombstone',       NULL, 1, 'Memorial Details'),
  ('fc-t-new-car-dealer',  'pt-new-car-dealer',  NULL, 1, 'Dealership Details'),
  ('fc-t-used-car-dealer', 'pt-used-car-dealer', NULL, 1, 'Dealership Details'),
  ('fc-t-building-contractor', 'pt-building-contractor', NULL, 1, 'Contractor Details'),
  ('fc-t-renovation',      'pt-renovation',      NULL, 1, 'Contractor Details'),
  ('fc-t-garden-services', 'pt-garden-services', NULL, 1, 'Garden Service Details'),
  ('fc-t-landscaping',     'pt-landscaping',     NULL, 1, 'Garden Service Details')
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- FORM CONFIG FIELDS — shared step field assignments
-- =============================================================

-- Step 1 — Business Details
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-fu1-1','fc-funeral-1','f-biz-name',1,true), ('fcf-fu1-2','fc-funeral-1','f-bio',2,true), ('fcf-fu1-3','fc-funeral-1','f-phone',3,true), ('fcf-fu1-4','fc-funeral-1','f-website',4,false), ('fcf-fu1-5','fc-funeral-1','f-years-exp',5,false), ('fcf-fu1-6','fc-funeral-1','f-service-areas',6,true), ('fcf-fu1-7','fc-funeral-1','f-tags',7,false),
  ('fcf-de1-1','fc-dealerships-1','f-biz-name',1,true), ('fcf-de1-2','fc-dealerships-1','f-bio',2,true), ('fcf-de1-3','fc-dealerships-1','f-phone',3,true), ('fcf-de1-4','fc-dealerships-1','f-website',4,false), ('fcf-de1-5','fc-dealerships-1','f-years-exp',5,false), ('fcf-de1-6','fc-dealerships-1','f-service-areas',6,true), ('fcf-de1-7','fc-dealerships-1','f-tags',7,false),
  ('fcf-co1-1','fc-construction-1','f-biz-name',1,true), ('fcf-co1-2','fc-construction-1','f-bio',2,true), ('fcf-co1-3','fc-construction-1','f-phone',3,true), ('fcf-co1-4','fc-construction-1','f-website',4,false), ('fcf-co1-5','fc-construction-1','f-years-exp',5,false), ('fcf-co1-6','fc-construction-1','f-service-areas',6,true), ('fcf-co1-7','fc-construction-1','f-tags',7,false),
  ('fcf-ga1-1','fc-gardening-1','f-biz-name',1,true), ('fcf-ga1-2','fc-gardening-1','f-bio',2,true), ('fcf-ga1-3','fc-gardening-1','f-phone',3,true), ('fcf-ga1-4','fc-gardening-1','f-website',4,false), ('fcf-ga1-5','fc-gardening-1','f-years-exp',5,false), ('fcf-ga1-6','fc-gardening-1','f-service-areas',6,true), ('fcf-ga1-7','fc-gardening-1','f-tags',7,false)
ON CONFLICT (id) DO NOTHING;

-- Step 2 — Gallery & Media
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-fu2-1','fc-funeral-2','f-profile-img',1,true), ('fcf-fu2-2','fc-funeral-2','f-gallery',2,false),
  ('fcf-de2-1','fc-dealerships-2','f-profile-img',1,true), ('fcf-de2-2','fc-dealerships-2','f-gallery',2,false),
  ('fcf-co2-1','fc-construction-2','f-profile-img',1,true), ('fcf-co2-2','fc-construction-2','f-gallery',2,false),
  ('fcf-ga2-1','fc-gardening-2','f-profile-img',1,true), ('fcf-ga2-2','fc-gardening-2','f-gallery',2,false)
ON CONFLICT (id) DO NOTHING;

-- Step 3 — FAQs & Links
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-fu3-1','fc-funeral-3','f-faqs',1,false), ('fcf-fu3-2','fc-funeral-3','f-links',2,false), ('fcf-fu3-3','fc-funeral-3','f-social',3,false),
  ('fcf-de3-1','fc-dealerships-3','f-faqs',1,false), ('fcf-de3-2','fc-dealerships-3','f-links',2,false), ('fcf-de3-3','fc-dealerships-3','f-social',3,false),
  ('fcf-co3-1','fc-construction-3','f-faqs',1,false), ('fcf-co3-2','fc-construction-3','f-links',2,false), ('fcf-co3-3','fc-construction-3','f-social',3,false),
  ('fcf-ga3-1','fc-gardening-3','f-faqs',1,false), ('fcf-ga3-2','fc-gardening-3','f-links',2,false), ('fcf-ga3-3','fc-gardening-3','f-social',3,false)
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- FORM CONFIG FIELDS — type-specific detail step assignments
-- =============================================================

-- Funeral types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-fp-1','fc-t-funeral-parlour','f-fun-license',1,true), ('fcf-t-fp-2','fc-t-funeral-parlour','f-fun-services',2,true), ('fcf-t-fp-3','fc-t-funeral-parlour','f-fun-religions',3,false), ('fcf-t-fp-4','fc-t-funeral-parlour','f-fun-24h',4,false),
  ('fcf-t-tb-1','fc-t-tombstone','f-fun-services',1,true), ('fcf-t-tb-2','fc-t-tombstone','f-fun-religions',2,false)
ON CONFLICT (id) DO NOTHING;

-- Dealership types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-nd-1','fc-t-new-car-dealer','f-deal-license',1,true), ('fcf-t-nd-2','fc-t-new-car-dealer','f-deal-services',2,true), ('fcf-t-nd-3','fc-t-new-car-dealer','f-deal-brands',3,false), ('fcf-t-nd-4','fc-t-new-car-dealer','f-deal-finance',4,false),
  ('fcf-t-ud-1','fc-t-used-car-dealer','f-deal-license',1,true), ('fcf-t-ud-2','fc-t-used-car-dealer','f-deal-services',2,true), ('fcf-t-ud-3','fc-t-used-car-dealer','f-deal-brands',3,false), ('fcf-t-ud-4','fc-t-used-car-dealer','f-deal-finance',4,false)
ON CONFLICT (id) DO NOTHING;

-- Construction types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-bc-1','fc-t-building-contractor','f-con-nhbrc',1,true), ('fcf-t-bc-2','fc-t-building-contractor','f-con-services',2,true), ('fcf-t-bc-3','fc-t-building-contractor','f-con-insured',3,false), ('fcf-t-bc-4','fc-t-building-contractor','f-con-project-size',4,false),
  ('fcf-t-rn-1','fc-t-renovation','f-con-services',1,true), ('fcf-t-rn-2','fc-t-renovation','f-con-insured',2,false), ('fcf-t-rn-3','fc-t-renovation','f-con-project-size',3,false)
ON CONFLICT (id) DO NOTHING;

-- Gardening types
INSERT INTO form_config_fields (id, form_config_id, field_id, display_order, is_required) VALUES
  ('fcf-t-gs-1','fc-t-garden-services','f-gar-services',1,true), ('fcf-t-gs-2','fc-t-garden-services','f-gar-frequency',2,false), ('fcf-t-gs-3','fc-t-garden-services','f-gar-insured',3,false),
  ('fcf-t-ls-1','fc-t-landscaping','f-gar-services',1,true), ('fcf-t-ls-2','fc-t-landscaping','f-gar-insured',2,false)
ON CONFLICT (id) DO NOTHING;
