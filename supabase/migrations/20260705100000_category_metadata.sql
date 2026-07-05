-- Fill in descriptions and icons for the 9 categories missed in
-- 20260620000002_public_iteration.sql (only 6 of 15 were covered there).

UPDATE provider_categories SET
  description = 'Guards, armed response, CCTV, alarms, and access control specialists.',
  icon = 'Shield'
WHERE slug = 'security' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Plumbers, electricians, painters, builders, and home repair professionals.',
  icon = 'Wrench'
WHERE slug = 'home' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Mechanics, panel beaters, car wash, tyre fitment, and auto services.',
  icon = 'Car'
WHERE slug = 'automotive' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Accountants, tax practitioners, bookkeepers, auditors, and financial advisors.',
  icon = 'Calculator'
WHERE slug = 'finance' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'GPs, dentists, physiotherapists, psychologists, and specialist practitioners.',
  icon = 'Stethoscope'
WHERE slug = 'health' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Vets, groomers, dog walkers, pet sitters, and animal care professionals.',
  icon = 'PawPrint'
WHERE slug = 'pets' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Couriers, removal companies, shuttles, chauffeurs, and logistics providers.',
  icon = 'Truck'
WHERE slug = 'transport' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Estate agents, property managers, architects, and quantity surveyors.',
  icon = 'Building'
WHERE slug = 'property' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');

UPDATE provider_categories SET
  description = 'Web developers, IT support, software engineers, and tech specialists.',
  icon = 'Monitor'
WHERE slug = 'tech' AND (description IS NULL OR description = 'Trusted local professionals and specialist service providers.');
