-- ============================================================================
-- CORRECTED SQL QUERIES BASED ON ERD
-- ============================================================================
-- This file contains corrected SQL queries matching the ERD structure
-- ERD Structure: People -> PeopleRoles -> Roles
--                People -> ParticipantDetails/VolunteerDetails/AdminDetails (1:1)
--                People -> Milestones, Donations, EventRegistrations (1:many)
--                EventTemplate -> EventOccurrences -> EventRegistrations
--                EventRegistrations -> Surveys (1:1)
-- ============================================================================

-- ============================================================================
-- 1. GET UPCOMING EVENTS (Homepage)
-- ============================================================================
-- ERD shows: EventTemplate -> EventOccurrences
--            EventOccurrences: EventOccurrenceID, EventName, EventDateTimeStart, 
--            EventDateTimeEnd, EventLocation, EventCapacity, EventRegistrationDeadline
-- CORRECTED:

SELECT 
    eo.EventOccurrenceID as event_id,
    eo.EventName as event_name,
    eo.EventDateTimeStart as event_date,
    eo.EventLocation as location,
    eo.EventDescription as description,
    et.EventType as event_type,
    eo.EventCapacity as capacity
FROM EventOccurrences eo
INNER JOIN EventTemplate et ON eo.EventTemplateID = et.EventTemplateID
WHERE eo.EventDateTimeStart >= CURRENT_TIMESTAMP
ORDER BY eo.EventDateTimeStart ASC
LIMIT 5;

-- ============================================================================
-- 2. GET USER REGISTRATIONS (Dashboard)
-- ============================================================================
-- ERD shows: EventRegistrations with EventOccurrenceID (FK), PersonID (FK)
--            RegistrationStatus, RegistrationAttendedFlag, RegistrationCheckInTime, 
--            RegistrationCreationAt
-- CORRECTED:

SELECT 
    er.RegistrationID,
    er.RegistrationCreationAt as RegistrationDate,
    er.RegistrationStatus,
    er.RegistrationAttendedFlag,
    er.RegistrationCheckInTime,
    eo.EventOccurrenceID,
    eo.EventName,
    eo.EventDateTimeStart,
    eo.EventDateTimeEnd,
    eo.EventLocation,
    et.EventType
FROM EventRegistrations er
INNER JOIN EventOccurrences eo ON er.EventOccurrenceID = eo.EventOccurrenceID
INNER JOIN EventTemplate et ON eo.EventTemplateID = et.EventTemplateID
WHERE er.PersonID = :userId
ORDER BY er.RegistrationCreationAt DESC;

-- ============================================================================
-- 3. GET USER SURVEYS (Dashboard)
-- ============================================================================
-- ERD shows: Surveys linked to RegistrationID (FK)
--            SurveySatisfactionScore, SurveyUsefulnessScore, SurveyInstructorScore,
--            SurveyRecommendationScore, SurveyOverallScore, SurveyNPSBucket,
--            SurveyComments, SurveySubmissionDate
-- CORRECTED:

SELECT 
    s.SurveyID,
    s.SurveySatisfactionScore,
    s.SurveyUsefulnessScore,
    s.SurveyInstructorScore,
    s.SurveyRecommendationScore,
    s.SurveyOverallScore,
    s.SurveyNPSBucket,
    s.SurveyComments,
    s.SurveySubmissionDate,
    eo.EventName as eventName
FROM Surveys s
INNER JOIN EventRegistrations er ON s.RegistrationID = er.RegistrationID
INNER JOIN EventOccurrences eo ON er.EventOccurrenceID = eo.EventOccurrenceID
WHERE er.PersonID = :userId
ORDER BY s.SurveySubmissionDate DESC;

-- ============================================================================
-- 4. GET ALL PARTICIPANTS (Manager View)
-- ============================================================================
-- ERD shows: People -> ParticipantDetails (1:1 via PersonID)
--            ParticipantDetails: PersonID (PK/FK), ParticipantSchoolOrEmployer,
--            ParticipantFieldOfInterest, Password, NewsLetter
-- CORRECTED:

SELECT 
    p.PersonID,
    p.Email,
    p.FirstName,
    p.LastName,
    p.Birthdate,
    p.PhoneNumber,
    p.City,
    p.Country,
    p.State,
    p.Zip,
    pd.ParticipantSchoolOrEmployer,
    pd.ParticipantFieldOfInterest,
    pd.NewsLetter
FROM People p
INNER JOIN ParticipantDetails pd ON p.PersonID = pd.PersonID
ORDER BY p.PersonID DESC;

-- ============================================================================
-- 5. GET ALL EVENTS (Manager View)
-- ============================================================================
-- ERD shows: EventTemplate -> EventOccurrences
-- CORRECTED:

SELECT 
    eo.EventOccurrenceID,
    eo.EventName,
    eo.EventDateTimeStart,
    eo.EventDateTimeEnd,
    eo.EventLocation,
    eo.EventCapacity,
    eo.EventRegistrationDeadline,
    et.EventTemplateID,
    et.EventType,
    et.EventDescription,
    et.EventRecurrencePattern,
    et.EventDefaultCapacity,
    COUNT(er.RegistrationID) as registered_count
FROM EventOccurrences eo
INNER JOIN EventTemplate et ON eo.EventTemplateID = et.EventTemplateID
LEFT JOIN EventRegistrations er ON eo.EventOccurrenceID = er.EventOccurrenceID
GROUP BY eo.EventOccurrenceID, eo.EventName, eo.EventDateTimeStart, eo.EventDateTimeEnd,
         eo.EventLocation, eo.EventCapacity, eo.EventRegistrationDeadline,
         et.EventTemplateID, et.EventType, et.EventDescription, 
         et.EventRecurrencePattern, et.EventDefaultCapacity
ORDER BY eo.EventDateTimeStart DESC;

-- ============================================================================
-- 6. GET ALL DONATIONS (Manager View)
-- ============================================================================
-- ERD shows: Donations with DonationID (PK), PersonID (FK), DonationDate, DonationAmount
-- CORRECTED:

SELECT 
    d.DonationID,
    d.DonationAmount,
    d.DonationDate,
    p.PersonID,
    p.FirstName,
    p.LastName,
    p.Email,
    p.PhoneNumber
FROM Donations d
INNER JOIN People p ON d.PersonID = p.PersonID
ORDER BY d.DonationDate DESC;

-- ============================================================================
-- 7. GET USER DONATIONS (User View)
-- ============================================================================
-- CORRECTED:

SELECT 
    d.DonationID,
    d.DonationAmount,
    d.DonationDate
FROM Donations d
WHERE d.PersonID = :userId
ORDER BY d.DonationDate DESC;

-- ============================================================================
-- 8. GET USER MILESTONES (User View)
-- ============================================================================
-- ERD shows: Milestones with MilestoneID (PK), PersonID (FK), MilestoneTitle, MilestoneDate
-- CORRECTED:

SELECT 
    m.MilestoneID,
    m.MilestoneTitle,
    m.MilestoneDate
FROM Milestones m
WHERE m.PersonID = :userId
ORDER BY m.MilestoneDate DESC;

-- ============================================================================
-- 9. LOGIN QUERY (Authentication)
-- ============================================================================
-- ERD shows: People -> PeopleRoles -> Roles (many-to-many)
--            People -> AdminDetails/VolunteerDetails/ParticipantDetails (1:1)
--            Detail tables have PersonID as PK/FK and Password field
-- CORRECTED:

-- Step 1: Find person by email and get their roles
SELECT 
    p.PersonID,
    p.Email,
    p.FirstName,
    p.LastName,
    r.RoleID,
    r.RoleName
FROM People p
INNER JOIN PeopleRoles pr ON p.PersonID = pr.PersonID
INNER JOIN Roles r ON pr.RoleID = r.RoleID
WHERE p.Email = :email;

-- Step 2: Check password in appropriate detail table based on role
-- For Admin:
SELECT 
    ad.PersonID,
    ad.Password,
    ad.AdminRole,
    ad.Salary
FROM AdminDetails ad
WHERE ad.PersonID = :personId AND ad.Password = :password;

-- For Volunteer:
SELECT 
    vd.PersonID,
    vd.Password,
    vd.VolunteerRole
FROM VolunteerDetails vd
WHERE vd.PersonID = :personId AND vd.Password = :password;

-- For Participant:
SELECT 
    pd.PersonID,
    pd.Password,
    pd.ParticipantSchoolOrEmployer,
    pd.ParticipantFieldOfInterest,
    pd.NewsLetter
FROM ParticipantDetails pd
WHERE pd.PersonID = :personId AND pd.Password = :password;

-- ============================================================================
-- 10. GET ALL PEOPLE WITH ROLES (Manager View)
-- ============================================================================
-- ERD shows: People -> PeopleRoles -> Roles (many-to-many)
-- CORRECTED:

SELECT 
    p.PersonID,
    p.Email,
    p.FirstName,
    p.LastName,
    p.Birthdate,
    p.PhoneNumber,
    p.City,
    p.Country,
    p.State,
    p.Zip,
    STRING_AGG(r.RoleName, ', ') as roles
FROM People p
LEFT JOIN PeopleRoles pr ON p.PersonID = pr.PersonID
LEFT JOIN Roles r ON pr.RoleID = r.RoleID
GROUP BY p.PersonID, p.Email, p.FirstName, p.LastName, p.Birthdate,
         p.PhoneNumber, p.City, p.Country, p.State, p.Zip
ORDER BY p.PersonID DESC;

-- ============================================================================
-- 11. GET EVENT REGISTRATIONS WITH PEOPLE AND EVENT DETAILS (Manager View)
-- ============================================================================
-- CORRECTED:

SELECT 
    er.RegistrationID,
    er.RegistrationCreationAt as RegistrationDate,
    er.RegistrationStatus,
    er.RegistrationAttendedFlag,
    er.RegistrationCheckInTime,
    p.PersonID,
    p.FirstName,
    p.LastName,
    p.Email,
    eo.EventOccurrenceID,
    eo.EventName,
    eo.EventDateTimeStart,
    eo.EventDateTimeEnd,
    eo.EventLocation,
    et.EventType
FROM EventRegistrations er
INNER JOIN People p ON er.PersonID = p.PersonID
INNER JOIN EventOccurrences eo ON er.EventOccurrenceID = eo.EventOccurrenceID
INNER JOIN EventTemplate et ON eo.EventTemplateID = et.EventTemplateID
ORDER BY er.RegistrationCreationAt DESC;

-- ============================================================================
-- 12. GET ALL SURVEYS WITH EVENT AND PERSON INFO (Manager View)
-- ============================================================================
-- CORRECTED:

SELECT 
    s.SurveyID,
    s.SurveySatisfactionScore,
    s.SurveyUsefulnessScore,
    s.SurveyInstructorScore,
    s.SurveyRecommendationScore,
    s.SurveyOverallScore,
    s.SurveyNPSBucket,
    s.SurveyComments,
    s.SurveySubmissionDate,
    er.RegistrationID,
    p.PersonID,
    p.FirstName,
    p.LastName,
    eo.EventOccurrenceID,
    eo.EventName
FROM Surveys s
INNER JOIN EventRegistrations er ON s.RegistrationID = er.RegistrationID
INNER JOIN People p ON er.PersonID = p.PersonID
INNER JOIN EventOccurrences eo ON er.EventOccurrenceID = eo.EventOccurrenceID
ORDER BY s.SurveySubmissionDate DESC;

-- ============================================================================
-- 13. GET ALL VOLUNTEERS (Manager View)
-- ============================================================================
-- ERD shows: People -> VolunteerDetails (1:1 via PersonID)
-- CORRECTED:

SELECT 
    p.PersonID,
    p.Email,
    p.FirstName,
    p.LastName,
    p.PhoneNumber,
    p.City,
    p.State,
    vd.VolunteerRole
FROM People p
INNER JOIN VolunteerDetails vd ON p.PersonID = vd.PersonID
ORDER BY p.PersonID DESC;

-- ============================================================================
-- 14. GET ALL ADMINS (Manager View)
-- ============================================================================
-- ERD shows: People -> AdminDetails (1:1 via PersonID)
-- CORRECTED:

SELECT 
    p.PersonID,
    p.Email,
    p.FirstName,
    p.LastName,
    p.PhoneNumber,
    ad.AdminRole,
    ad.Salary
FROM People p
INNER JOIN AdminDetails ad ON p.PersonID = ad.PersonID
ORDER BY p.PersonID DESC;

-- ============================================================================
-- 15. GET EVENT OCCURRENCES BY TEMPLATE (For Program Pages)
-- ============================================================================
-- CORRECTED:

SELECT 
    eo.EventOccurrenceID,
    eo.EventName,
    eo.EventDateTimeStart,
    eo.EventDateTimeEnd,
    eo.EventLocation,
    eo.EventCapacity,
    eo.EventRegistrationDeadline,
    et.EventTemplateID,
    et.EventName as TemplateName,
    et.EventType,
    et.EventDescription,
    et.EventRecurrencePattern
FROM EventOccurrences eo
INNER JOIN EventTemplate et ON eo.EventTemplateID = et.EventTemplateID
WHERE et.EventTemplateID = :templateId
ORDER BY eo.EventDateTimeStart ASC;

-- ============================================================================
-- 16. GET REGISTRATION STATISTICS (Dashboard/Reports)
-- ============================================================================
-- CORRECTED:

SELECT 
    eo.EventOccurrenceID,
    eo.EventName,
    COUNT(er.RegistrationID) as total_registrations,
    COUNT(CASE WHEN er.RegistrationAttendedFlag = 1 THEN 1 END) as attended_count,
    COUNT(CASE WHEN er.RegistrationStatus = 'Confirmed' THEN 1 END) as confirmed_count
FROM EventOccurrences eo
LEFT JOIN EventRegistrations er ON eo.EventOccurrenceID = er.EventOccurrenceID
GROUP BY eo.EventOccurrenceID, eo.EventName
ORDER BY eo.EventDateTimeStart DESC;

-- ============================================================================
-- 17. GET SURVEY STATISTICS BY EVENT (Reports)
-- ============================================================================
-- CORRECTED:

SELECT 
    eo.EventOccurrenceID,
    eo.EventName,
    COUNT(s.SurveyID) as survey_count,
    AVG(s.SurveyOverallScore) as avg_overall_score,
    AVG(s.SurveySatisfactionScore) as avg_satisfaction,
    AVG(s.SurveyUsefulnessScore) as avg_usefulness,
    AVG(s.SurveyInstructorScore) as avg_instructor,
    AVG(s.SurveyRecommendationScore) as avg_recommendation
FROM EventOccurrences eo
LEFT JOIN EventRegistrations er ON eo.EventOccurrenceID = er.EventOccurrenceID
LEFT JOIN Surveys s ON er.RegistrationID = s.RegistrationID
GROUP BY eo.EventOccurrenceID, eo.EventName
ORDER BY eo.EventDateTimeStart DESC;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- ERD Structure Confirmed:
-- 1. People table is central with PersonID as PK
-- 2. PeopleRoles is junction table for many-to-many relationship with Roles
-- 3. ParticipantDetails, VolunteerDetails, AdminDetails are 1:1 with People (PersonID is PK/FK)
-- 4. EventTemplate -> EventOccurrences -> EventRegistrations (not direct Events table)
-- 5. EventRegistrations -> Surveys (1:1 relationship)
-- 6. People -> Milestones, Donations, EventRegistrations (1:many)
-- 7. All detail tables use PersonID as both PK and FK to People
-- 8. State is VARCHAR(2) in People table (not a separate State table)
-- 9. No Services, EventDocuments, Proposals, Ministers tables in this ERD
-- ============================================================================
