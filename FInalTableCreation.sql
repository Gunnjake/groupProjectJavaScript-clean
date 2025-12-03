-- Optional: drop tables if you're rebuilding
DROP TABLE IF EXISTS Donations       CASCADE;
DROP TABLE IF EXISTS Milestones      CASCADE;
DROP TABLE IF EXISTS Surveys         CASCADE;
DROP TABLE IF EXISTS EventRegistrations CASCADE;
DROP TABLE IF EXISTS EventOccurrences   CASCADE;
DROP TABLE IF EXISTS EventTemplate      CASCADE;
DROP TABLE IF EXISTS AdminDetails    CASCADE;
DROP TABLE IF EXISTS VolunteerDetails CASCADE;
DROP TABLE IF EXISTS ParticipantDetails CASCADE;
DROP TABLE IF EXISTS PeopleRoles     CASCADE;
DROP TABLE IF EXISTS Roles           CASCADE;
DROP TABLE IF EXISTS People          CASCADE;

--------------------------------------------------
-- PEOPLE & ROLES
--------------------------------------------------

CREATE TABLE People (
    PersonID      SERIAL PRIMARY KEY,
    Email         VARCHAR(80),
    FirstName     VARCHAR(30),
    LastName      VARCHAR(30),
    Birthdate     DATE,
    PhoneNumber   VARCHAR(12),
    City          VARCHAR(20),
    Country       VARCHAR(50),
    State         VARCHAR(2),
    Zip           VARCHAR(11)
);

CREATE TABLE Roles (
    RoleID     SERIAL PRIMARY KEY,
    RoleName   VARCHAR(11) NOT NULL
);

-- Junction table: many-to-many between People and Roles
CREATE TABLE PeopleRoles (
    PersonID   INT NOT NULL,
    RoleID     INT NOT NULL,
    PRIMARY KEY (PersonID, RoleID),
    CONSTRAINT fk_peopleroles_person
        FOREIGN KEY (PersonID) REFERENCES People(PersonID) ON DELETE CASCADE,
    CONSTRAINT fk_peopleroles_role
        FOREIGN KEY (RoleID)   REFERENCES Roles(RoleID)   ON DELETE CASCADE
);

--------------------------------------------------
-- ROLE DETAIL TABLES (1–1 with People)
--------------------------------------------------

CREATE TABLE ParticipantDetails (
    PersonID                      INT PRIMARY KEY,
    ParticipantSchoolOrEmployer   VARCHAR(50),
    ParticipantFieldOfInterest    VARCHAR(50),
    Password                      VARCHAR(20),
    NewsLetter                    SMALLINT,  -- 0/1 flag
    CONSTRAINT fk_participant_person
        FOREIGN KEY (PersonID) REFERENCES People(PersonID) ON DELETE CASCADE
);

CREATE TABLE VolunteerDetails (
    PersonID      INT PRIMARY KEY,
    Password      VARCHAR(20),
    VolunteerRole VARCHAR(11),
    CONSTRAINT fk_volunteer_person
        FOREIGN KEY (PersonID) REFERENCES People(PersonID) ON DELETE CASCADE
);

CREATE TABLE AdminDetails (
    PersonID  INT PRIMARY KEY,
    Password  VARCHAR(20),
    AdminRole VARCHAR(11),
    Salary    NUMERIC(12,2),
    CONSTRAINT fk_admin_person
        FOREIGN KEY (PersonID) REFERENCES People(PersonID) ON DELETE CASCADE
);

--------------------------------------------------
-- EVENTS
--------------------------------------------------

CREATE TABLE EventTemplate (
    EventTemplateID           SERIAL PRIMARY KEY,
    EventName                 VARCHAR(255) NOT NULL,
    EventType                 VARCHAR(100),
    EventDescription          TEXT,
    EventRecurrencePattern    VARCHAR(100),
    EventDefaultCapacity      INT
);

CREATE TABLE EventOccurrences (
    EventOccurrenceID         SERIAL PRIMARY KEY,
    EventTemplateID           INT NOT NULL,
    EventName                 VARCHAR(255) NOT NULL,
    EventDateTimeStart        TIMESTAMP,
    EventDateTimeEnd          TIMESTAMP,
    EventLocation             VARCHAR(255),
    EventCapacity             INT,
    EventRegistrationDeadline TIMESTAMP,
    CONSTRAINT fk_occurrence_template
        FOREIGN KEY (EventTemplateID) REFERENCES EventTemplate(EventTemplateID) ON DELETE CASCADE
);

--------------------------------------------------
-- REGISTRATIONS & SURVEYS
--------------------------------------------------

CREATE TABLE EventRegistrations (
    RegistrationID             SERIAL PRIMARY KEY,
    PersonID                   INT NOT NULL,
    EventOccurrenceID          INT NOT NULL,
    RegistrationStatus         VARCHAR(50),
    RegistrationAttendedFlag   SMALLINT,   -- 0/1 flag
    RegistrationCheckInTime    TIMESTAMP,
    RegistrationCreatedAt      TIMESTAMP,
    CONSTRAINT fk_registration_person
        FOREIGN KEY (PersonID)          REFERENCES People(PersonID)          ON DELETE CASCADE,
    CONSTRAINT fk_registration_occurrence
        FOREIGN KEY (EventOccurrenceID) REFERENCES EventOccurrences(EventOccurrenceID) ON DELETE CASCADE
);

CREATE TABLE Surveys (
    SurveyID                   SERIAL PRIMARY KEY,
    RegistrationID             INT NOT NULL,
    SurveySatisfactionScore    NUMERIC(3,2),
    SurveyUsefulnessScore      NUMERIC(3,2),
    SurveyInstructorScore      NUMERIC(3,2),
    SurveyRecommendationScore  NUMERIC(3,2),
    SurveyOverallScore         NUMERIC(3,2),
    SurveyNPSBucket            VARCHAR(50),  -- 'Promoter', 'Passive', 'Detractor', etc.
    SurveyComments             TEXT,
    SurveySubmissionDate       TIMESTAMP,
    CONSTRAINT fk_survey_registration
        FOREIGN KEY (RegistrationID) REFERENCES EventRegistrations(RegistrationID) ON DELETE CASCADE
);

--------------------------------------------------
-- MILESTONES & DONATIONS
--------------------------------------------------

CREATE TABLE Milestones (
    MilestoneID    SERIAL PRIMARY KEY,
    PersonID       INT NOT NULL,
    MilestoneTitle VARCHAR(255) NOT NULL,
    MilestoneDate  DATE,
    CONSTRAINT fk_milestone_person
        FOREIGN KEY (PersonID) REFERENCES People(PersonID) ON DELETE CASCADE
);

CREATE TABLE Donations (
    DonationID     SERIAL PRIMARY KEY,
    PersonID       INT NOT NULL,
    DonationDate   DATE,
    DonationAmount NUMERIC(10,2),
    CONSTRAINT fk_donation_person
        FOREIGN KEY (PersonID) REFERENCES People(PersonID) ON DELETE CASCADE
);
