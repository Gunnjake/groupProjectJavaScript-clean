-- ======================================================================
-- HUUS DATABASE SCHEMA + SEED DATA (COMBINED SCRIPT)
-- ======================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ======================================================================
-- TABLES
-- ======================================================================

CREATE TABLE customers (
    customer_id      INT PRIMARY KEY,
    first_name       VARCHAR(100),
    last_name        VARCHAR(100),
    email            VARCHAR(255) UNIQUE,
    phone            VARCHAR(50),
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE properties (
    property_id      INT PRIMARY KEY,
    customer_id      INT REFERENCES customers(customer_id),
    address_line1    VARCHAR(255),
    address_line2    VARCHAR(255),
    city             VARCHAR(100),
    state            VARCHAR(50),
    zipcode          VARCHAR(20),
    bedrooms         INT,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cleaning_types (
    cleaning_type_id INT PRIMARY KEY,
    name             VARCHAR(200),
    description      TEXT
);

CREATE TABLE bedroom_options (
    bedroom_count    INT PRIMARY KEY,
    label            VARCHAR(50),
    icon             VARCHAR(10),
    display_order    INT
);

CREATE TABLE cleaning_prices (
    cleaning_type_id INT PRIMARY KEY REFERENCES cleaning_types(cleaning_type_id),
    price_1_bed      INT,
    price_2_bed      INT,
    price_3_bed      INT,
    price_4_bed      INT
);

CREATE TABLE add_on_services (
    add_on_id       INT PRIMARY KEY,
    name            VARCHAR(200),
    price           INT,
    description     TEXT
);

CREATE TABLE frequency (
    frequency_id     INT PRIMARY KEY,
    name             VARCHAR(200),
    description      TEXT,
    discount_percent INT
);

CREATE TABLE available_dates (
    date_id          INT PRIMARY KEY,
    available_date   DATE NOT NULL UNIQUE,
    is_available     BOOLEAN DEFAULT TRUE,
    max_bookings     INT DEFAULT 10,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE available_time_slots (
    time_slot_id     INT PRIMARY KEY,
    date_id          INT REFERENCES available_dates(date_id) ON DELETE CASCADE,
    time_slot        VARCHAR(50) NOT NULL,
    is_available     BOOLEAN DEFAULT TRUE,
    max_bookings     INT DEFAULT 2,
    created_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(date_id, time_slot)
);

CREATE TABLE bookings (
    booking_id       INT PRIMARY KEY,
    customer_id      INT REFERENCES customers(customer_id),
    property_id      INT REFERENCES properties(property_id),
    cleaning_type_id INT REFERENCES cleaning_types(cleaning_type_id),
    frequency_id     INT REFERENCES frequency(frequency_id),
    requested_date   DATE,
    requested_time   VARCHAR(50),
    total_due        NUMERIC(10,2),
    comments         TEXT,
    status           VARCHAR(50),
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE booking_add_ons (
    booking_id INT REFERENCES bookings(booking_id),
    add_on_id  INT REFERENCES add_on_services(add_on_id),
    PRIMARY KEY(booking_id, add_on_id)
);

CREATE TABLE payments (
    payment_id          INT PRIMARY KEY,
    booking_id          INT REFERENCES bookings(booking_id),
    provider            VARCHAR(50),
    provider_session_id VARCHAR(255),
    amount              NUMERIC(10,2),
    currency            VARCHAR(10),
    status              VARCHAR(50),
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admins (
    admin_id       INT PRIMARY KEY,
    username       VARCHAR(100) UNIQUE,
    password_hash  TEXT,
    email          VARCHAR(255)
);

CREATE TABLE testimonials (
    testimonial_id INT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    quote          TEXT NOT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    display_order  INT DEFAULT 0,
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_offerings (
    service_id     INT PRIMARY KEY,
    service_name   VARCHAR(200),
    description    TEXT,
    base_price     INT,
    is_active      BOOLEAN,
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_prices (
    service_price_id INT PRIMARY KEY,
    service_id       INT REFERENCES service_offerings(service_id),
    bedrooms         INT,
    price            INT
);

CREATE TABLE booking_status_history (
    history_id           INT PRIMARY KEY,
    booking_id           INT REFERENCES bookings(booking_id),
    previous_status      VARCHAR(50),
    new_status           VARCHAR(50),
    changed_by_admin_id  INT REFERENCES admins(admin_id),
    changed_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE booking_services (
    booking_id        INT REFERENCES bookings(booking_id),
    service_id        INT REFERENCES service_offerings(service_id),
    quantity          INT,
    price_at_booking  INT,
    PRIMARY KEY(booking_id, service_id)
);


-- ======================================================================
-- SEED DATA
-- ======================================================================

-- CUSTOMERS
INSERT INTO customers (customer_id, first_name, last_name, email, phone)
VALUES
(1000, 'Alex', 'Johnson', 'alex.johnson@example.com', '801-555-1234'),
(1001, 'Taylor', 'Smith', 'taylor.smith@example.com', '801-555-5678')
ON CONFLICT DO NOTHING;


-- PROPERTIES
INSERT INTO properties (property_id, customer_id, address_line1, address_line2, city, state, zipcode, bedrooms)
VALUES
(2000, 1000, '123 Main St', 'Unit 2', 'Heber City', 'UT', '84032', 3),
(2001, 1001, '45 Lakeview Dr', NULL, 'Midway', 'UT', '84049', 2)
ON CONFLICT DO NOTHING;


-- BEDROOM OPTIONS
INSERT INTO bedroom_options VALUES
(1, '1 Bedroom', '🏠', 1),
(2, '2 Bedrooms', '🏡', 2),
(3, '3 Bedrooms', '🏘️', 3),
(4, '4 Bedrooms', '🏘️+', 4)
ON CONFLICT DO NOTHING;

-- CLEANING TYPES
INSERT INTO cleaning_types VALUES
(3000, 'Residential Cleaning', 'Standard cleaning'),
(3001, 'Vacation Rental', 'Standard cleaning for Vacation Rental')
ON CONFLICT DO NOTHING;


-- CLEANING PRICES
INSERT INTO cleaning_prices VALUES
(3000, 240, 300, 360, 400),
(3001, 240, 300, 360, 400)
ON CONFLICT DO NOTHING;


-- ADD-ONS
INSERT INTO add_on_services VALUES
(5000, 'Inside Oven', 50, 'Deep Clean of Inside of Oven'),
(5001, 'Inside Fridge', 30, 'Deep Clean of Inside of Fridge'),
(5002, 'Clean Interior Windows', 50, 'Clean Inside Windows'),
(5003, 'Dish Washing (30 min)', 25, '30 Minutes of Washing Dishes'),
(5004, 'Load of Laundry (On Site)', 30, 'Load of Laundry on Site')
ON CONFLICT DO NOTHING;


-- FREQUENCY
INSERT INTO frequency VALUES
(9000, 'One-Time', 'One Time', 0),
(9001, 'Weekly', 'Once per Week', 10),
(9002, 'Bi-Weekly', 'Twice Per Week', 15),
(9003, 'Monthly', 'Once Per Month', 10)
ON CONFLICT DO NOTHING;

-- AVAILABLE DATES (Sample data - admin will manage these)
INSERT INTO available_dates VALUES
(1, CURRENT_DATE + INTERVAL '7 days', TRUE, 10),
(2, CURRENT_DATE + INTERVAL '8 days', TRUE, 10),
(3, CURRENT_DATE + INTERVAL '9 days', TRUE, 10),
(4, CURRENT_DATE + INTERVAL '10 days', TRUE, 10),
(5, CURRENT_DATE + INTERVAL '14 days', TRUE, 10)
ON CONFLICT DO NOTHING;

-- AVAILABLE TIME SLOTS
INSERT INTO available_time_slots VALUES
(1, 1, '9:00 AM', TRUE, 2),
(2, 1, '10:00 AM', TRUE, 2),
(3, 1, '11:00 AM', TRUE, 2),
(4, 1, '1:00 PM', TRUE, 2),
(5, 1, '2:00 PM', TRUE, 2),
(6, 2, '9:00 AM', TRUE, 2),
(7, 2, '10:00 AM', TRUE, 2),
(8, 2, '11:00 AM', TRUE, 2),
(9, 2, '1:00 PM', TRUE, 2),
(10, 2, '2:00 PM', TRUE, 2)
ON CONFLICT DO NOTHING;


-- BOOKINGS
INSERT INTO bookings (booking_id, customer_id, property_id, cleaning_type_id, frequency_id, requested_date, requested_time, total_due, comments, status)
VALUES
(6000, 1000, 2000, 3000, 9001, '2025-11-25', '10:00 AM', 300.00, 'Please focus on kitchen.', 'active'),
(6001, 1001, 2001, 3001, 9000, '2025-11-26', '2:00 PM', 240.00, 'Turnover clean.', 'completed')
ON CONFLICT DO NOTHING;


-- BOOKING ADD-ONS
INSERT INTO booking_add_ons VALUES
(6000, 5000),
(6000, 5001),
(6001, 5002)
ON CONFLICT DO NOTHING;


-- PAYMENTS
INSERT INTO payments VALUES
(8000, 6000, 'stripe', 'sess_6000', 300.00, 'USD', 'paid'),
(8001, 6001, 'stripe', 'sess_6001', 240.00, 'USD', 'paid')
ON CONFLICT DO NOTHING;


-- ADMINS
INSERT INTO admins VALUES
(1, 'admin', 'REPLACE_WITH_BCRYPT', 'admin@huus.test')
ON CONFLICT DO NOTHING;

-- TESTIMONIALS
INSERT INTO testimonials (testimonial_id, name, quote, is_active, display_order) VALUES
(1, 'Michelle', 'Process was straightforward and reliable.', TRUE, 1),
(2, 'Brandon', 'Great service and communication.', TRUE, 2),
(3, 'Sarah', 'Super easy booking and great cleaners!', TRUE, 3)
ON CONFLICT DO NOTHING;


-- SERVICE OFFERINGS
INSERT INTO service_offerings VALUES
(100, 'Residential Cleaning', 'Standard home cleaning service', 240, TRUE),
(101, 'Vacation Rental Cleaning', 'Turnover cleaning for Airbnb / VRBO', 240, TRUE)
ON CONFLICT DO NOTHING;


-- SERVICE PRICES
INSERT INTO service_prices VALUES
(200, 100, 1, 240),
(201, 100, 2, 300),
(202, 100, 3, 360),
(203, 100, 4, 400),
(204, 101, 1, 240),
(205, 101, 2, 300),
(206, 101, 3, 360),
(207, 101, 4, 400)
ON CONFLICT DO NOTHING;


-- STATUS HISTORY
INSERT INTO booking_status_history VALUES
(300, 6001, 'active', 'completed', 1, NOW())
ON CONFLICT DO NOTHING;


-- BOOKING SERVICES
INSERT INTO booking_services VALUES
(6000, 100, 1, 300),
(6001, 101, 1, 240)
ON CONFLICT DO NOTHING;
