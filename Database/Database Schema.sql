CREATE DATABASE TravelManagementSyatem;
USE TravelManagementSyatem;

CREATE TABLE Travel_Partner (
    travelPartner_id INT PRIMARY KEY,
    travelPartner_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    company_name VARCHAR(100),
    address VARCHAR(200)
);


CREATE TABLE Traveller (
    traveller_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    password VARCHAR(100),
    address VARCHAR(200),
);


CREATE TABLE Vendor (
    vendor_id INT PRIMARY KEY,
    vendor_name VARCHAR(100),
    service_type VARCHAR(100),
    contact_number VARCHAR(20),
    location VARCHAR(100),
    travelPartner_id INT,
    FOREIGN KEY (travelPartner_id) REFERENCES Travel_Partner(travelPartner_id)
);


CREATE TABLE Tour_Guide (
    guide_id INT PRIMARY KEY,
    guide_name VARCHAR(100),
    language VARCHAR(50),
    phone VARCHAR(20),
    travelPartner_id INT,
    FOREIGN KEY (travelPartner_id) REFERENCES Travel_Partner(travelPartner_id)
);


CREATE TABLE Trips (
    trip_id INT PRIMARY KEY,
    trip_name VARCHAR(100),
    destination VARCHAR(100),
    start_date DATE,
    end_date DATE,
    price DECIMAL(10,2),
    trip_status VARCHAR(50),
    travelPartner_id INT,
    guide_id INT,
    vendor_id INT,
    traveller_id INT,
    FOREIGN KEY (travelPartner_id) REFERENCES Travel_Partner(travelPartner_id),
    FOREIGN KEY (guide_id) REFERENCES Tour_Guide(guide_id),
    FOREIGN KEY (vendor_id) REFERENCES Vendor(vendor_id),
    FOREIGN KEY (traveller_id) REFERENCES Traveller(traveller_id)
);


CREATE TABLE Itinerary (
    itinerary_id INT PRIMARY KEY,
    trip_id INT,
    day_number INT,
    activity VARCHAR(200),
    location VARCHAR(100),
    description VARCHAR(300),
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id)
);


CREATE TABLE Support_Executive (
    support_id INT PRIMARY KEY,
    support_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    travelPartner_id INT,
    FOREIGN KEY (travelPartner_id) REFERENCES Travel_Partner(travelPartner_id)
);


CREATE TABLE Issue (
    issue_id INT PRIMARY KEY,
    issue_description VARCHAR(300),
    issue_status VARCHAR(50),
    created_date DATE,
    traveller_id INT,
    support_id INT,
    travelPartner_id INT,
    FOREIGN KEY (traveller_id) REFERENCES Traveller(traveller_id),
    FOREIGN KEY (support_id) REFERENCES Support_Executive(support_id),
    FOREIGN KEY (travelPartner_id) REFERENCES Travel_Partner(travelPartner_id)
);




