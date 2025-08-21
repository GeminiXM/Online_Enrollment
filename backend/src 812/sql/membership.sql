-- Membership-related SQL queries

-- Get all membership types
SELECT 
    membership_type_id,
    name,
    description,
    base_price,
    age_restriction_min,
    age_restriction_max,
    allows_family_members,
    max_family_members
FROM membership_types
ORDER BY base_price;

-- Get membership type by ID
SELECT 
    membership_type_id,
    name,
    description,
    base_price,
    age_restriction_min,
    age_restriction_max,
    allows_family_members,
    max_family_members
FROM membership_types
WHERE membership_type_id = ?;

-- Get all clubs
SELECT 
    club_id,
    name,
    address,
    city,
    state,
    zip_code,
    phone,
    email,
    is_active
FROM clubs
WHERE is_active = 1
ORDER BY name;

-- Get club by ID
SELECT 
    club_id,
    name,
    address,
    city,
    state,
    zip_code,
    phone,
    email,
    is_active
FROM clubs
WHERE club_id = ? AND is_active = 1;

-- Get additional services
SELECT 
    service_id,
    name,
    description,
    price,
    is_active
FROM additional_services
WHERE is_active = 1
ORDER BY name;

-- Get service by ID
SELECT 
    service_id,
    name,
    description,
    price,
    is_active
FROM additional_services
WHERE service_id = ? AND is_active = 1;

-- Insert new enrollment
INSERT INTO enrollments (
    club_id,
    membership_type_id,
    first_name,
    middle_initial,
    last_name,
    date_of_birth,
    gender,
    email,
    phone,
    address,
    city,
    state,
    zip_code,
    created_at,
    status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT, 'pending');

-- Insert family member
INSERT INTO family_members (
    enrollment_id,
    first_name,
    middle_initial,
    last_name,
    date_of_birth,
    gender,
    relationship,
    created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT);

-- Insert selected services
INSERT INTO enrollment_services (
    enrollment_id,
    service_id,
    created_at
) VALUES (?, ?, CURRENT);

-- Get enrollment by ID with all related information
SELECT 
    e.*,
    mt.name as membership_type_name,
    mt.base_price as membership_base_price,
    c.name as club_name,
    c.address as club_address,
    c.city as club_city,
    c.state as club_state,
    c.zip_code as club_zip_code,
    c.phone as club_phone,
    c.email as club_email
FROM enrollments e
JOIN membership_types mt ON e.membership_type_id = mt.membership_type_id
JOIN clubs c ON e.club_id = c.club_id
WHERE e.enrollment_id = ?;

-- Get family members for an enrollment
SELECT 
    fm.*
FROM family_members fm
WHERE fm.enrollment_id = ?
ORDER BY fm.created_at;

-- Get selected services for an enrollment
SELECT 
    es.*,
    s.name as service_name,
    s.description as service_description,
    s.price as service_price
FROM enrollment_services es
JOIN additional_services s ON es.service_id = s.service_id
WHERE es.enrollment_id = ?
ORDER BY s.name; 