-- ============================================================================
-- CORRECTED SQL QUERIES BASED ON ERD
-- ============================================================================
-- This file contains corrected SQL queries matching the ERD structure
-- Review these queries before updating routes/index.js
-- ============================================================================

-- ============================================================================
-- 1. GET UPCOMING EVENTS (Homepage)
-- ============================================================================
-- ERD shows: Events table with EventID, EventName, EventType, EventDescription, 
--            EventDate, EventTime, EventLocation, EventCapacity
-- Current code uses: EventOccurrences + EventTemplate
-- CORRECTED:

SELECT 
    e.EventID as event_id,
    e.EventName as event_name,
    e.EventDate as event_date,
    e.EventTime as event_time,
    e.EventLocation as location,
    e.EventDescription as description,
    e.EventType as event_type,
    e.EventCapacity as capacity
FROM Events e
WHERE e.EventDate >= CURRENT_DATE
ORDER BY e.EventDate ASC, e.EventTime ASC
LIMIT 5;

-- ============================================================================
-- 2. GET USER REGISTRATIONS (Dashboard)
-- ============================================================================
-- ERD shows: EventRegistrations with EventID (not EventOccurrenceID)
--            EventEnrollment, RegistrationDate, RegistrationStatus, 
--            RegistrationAmountPaid, RegistrationAmountDue
-- CORRECTED:

SELECT 
    er.RegistrationID,
    er.RegistrationDate,
    er.RegistrationStatus,
    er.EventEnrollment,
    er.RegistrationAmountPaid,
    er.RegistrationAmountDue,
    e.EventName,
    e.EventType,
    e.EventDate,
    e.EventTime,
    e.EventLocation
FROM EventRegistrations er
INNER JOIN Events e ON er.EventID = e.EventID
WHERE er.PeopleID = :userId
ORDER BY er.RegistrationDate DESC;

-- ============================================================================
-- 3. GET USER SURVEYS (Dashboard)
-- ============================================================================
-- ERD shows: Surveys linked to RegistrationID
-- CORRECTED (assuming Surveys table exists with RegistrationID FK):

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
    e.EventName as eventName
FROM Surveys s
INNER JOIN EventRegistrations er ON s.RegistrationID = er.RegistrationID
INNER JOIN Events e ON er.EventID = e.EventID
WHERE er.PeopleID = :userId
ORDER BY s.SurveySubmissionDate DESC;

-- ============================================================================
-- 4. GET ALL PARTICIPANTS (Manager View)
-- ============================================================================
-- ERD shows: ParticipantDetails with ParticipantID (PK), 
--            ParticipantFirstName, ParticipantLastName, Password, MobileNo
--            Note: ERD shows ParticipantDetails as separate table, not linked to People
-- CORRECTED:

-- Option A: If ParticipantDetails is separate (as ERD shows):
SELECT 
    pd.ParticipantID,
    pd.ParticipantFirstName as FirstName,
    pd.ParticipantLastName as LastName,
    pd.MobileNo as PhoneNumber,
    pd.Password
FROM ParticipantDetails pd
ORDER BY pd.ParticipantID DESC;

-- Option B: If ParticipantDetails links to People (more likely):
SELECT 
    p.PeopleID,
    p.FirstName,
    p.LastName,
    p.Email,
    p.PhoneNumber,
    p.City,
    p.State,
    p.Zip,
    pd.ParticipantFirstName,
    pd.ParticipantLastName,
    pd.MobileNo,
    pd.Password
FROM People p
INNER JOIN ParticipantDetails pd ON p.PeopleID = pd.ParticipantID
ORDER BY p.PeopleID DESC;

-- ============================================================================
-- 5. GET ALL EVENTS (Manager View)
-- ============================================================================
-- ERD shows: Events table directly
-- CORRECTED:

SELECT 
    e.EventID,
    e.EventName,
    e.EventType,
    e.EventDescription,
    e.EventDate,
    e.EventTime,
    e.EventLocation,
    e.EventCapacity,
    COUNT(er.RegistrationID) as registered_count
FROM Events e
LEFT JOIN EventRegistrations er ON e.EventID = er.EventID
GROUP BY e.EventID, e.EventName, e.EventType, e.EventDescription, 
         e.EventDate, e.EventTime, e.EventLocation, e.EventCapacity
ORDER BY e.EventDate DESC;

-- ============================================================================
-- 6. GET ALL DONATIONS (Manager View)
-- ============================================================================
-- ERD shows: Donations with DonationID (PK), PeopleID (FK), DonationAmount
-- CORRECTED:

SELECT 
    d.DonationID,
    d.DonationAmount,
    d.DonationDate,
    p.PeopleID,
    p.FirstName,
    p.LastName,
    p.Email,
    p.PhoneNumber
FROM Donations d
INNER JOIN People p ON d.PeopleID = p.PeopleID
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
WHERE d.PeopleID = :userId
ORDER BY d.DonationDate DESC;

-- ============================================================================
-- 8. GET USER MILESTONES (User View)
-- ============================================================================
-- ERD doesn't show Milestones, but current schema has it
-- Assuming Milestones table exists with PeopleID FK:

SELECT 
    m.MilestoneID,
    m.MilestoneTitle,
    m.MilestoneDate
FROM Milestones m
WHERE m.PeopleID = :userId
ORDER BY m.MilestoneDate DESC;

-- ============================================================================
-- 9. LOGIN QUERY (Authentication)
-- ============================================================================
-- ERD shows: AdminDetails with AdminID (PK), Password, MobileNo
--            CoordinatorDetails with CoordinatorID (PK), Password, MobileNo
--            ParticipantDetails with ParticipantID (PK), Password, MobileNo
--            Note: These appear separate from People table in ERD
-- CORRECTED:

-- For Admin login:
SELECT 
    ad.AdminID,
    ad.Password,
    ad.MobileNo
FROM AdminDetails ad
WHERE ad.AdminID = :adminId AND ad.Password = :password;

-- For Coordinator/Volunteer login:
SELECT 
    cd.CoordinatorID,
    cd.Password,
    cd.MobileNo
FROM CoordinatorDetails cd
WHERE cd.CoordinatorID = :coordinatorId AND cd.Password = :password;

-- For Participant login (if allowed):
SELECT 
    pd.ParticipantID,
    pd.Password,
    pd.MobileNo
FROM ParticipantDetails pd
WHERE pd.ParticipantID = :participantId AND pd.Password = :password;

-- ============================================================================
-- 10. GET PEOPLE WITH STATE (If State table exists)
-- ============================================================================
-- ERD shows: People with StateID FK referencing State table
-- CORRECTED:

SELECT 
    p.PeopleID,
    p.Email,
    p.FirstName,
    p.LastName,
    p.Address,
    p.PhoneNumber,
    p.City,
    p.Zip,
    s.StateID,
    s.StateName
FROM People p
LEFT JOIN State s ON p.StateID = s.StateID
ORDER BY p.PeopleID DESC;

-- ============================================================================
-- 11. GET EVENT REGISTRATIONS WITH PEOPLE AND EVENTS
-- ============================================================================
-- CORRECTED:

SELECT 
    er.RegistrationID,
    er.RegistrationDate,
    er.RegistrationStatus,
    er.EventEnrollment,
    er.RegistrationAmountPaid,
    er.RegistrationAmountDue,
    p.PeopleID,
    p.FirstName,
    p.LastName,
    p.Email,
    e.EventID,
    e.EventName,
    e.EventType,
    e.EventDate,
    e.EventTime
FROM EventRegistrations er
INNER JOIN People p ON er.PeopleID = p.PeopleID
INNER JOIN Events e ON er.EventID = e.EventID
ORDER BY er.RegistrationDate DESC;

-- ============================================================================
-- 12. GET EVENT DOCUMENTS (If EventDocuments table exists)
-- ============================================================================
-- ERD shows: EventDocuments with EventDocumentID (PK), EventID (FK)
-- CORRECTED:

SELECT 
    ed.EventDocumentID,
    ed.EventFileName,
    ed.EventFileType,
    ed.EventFileSize,
    ed.EventFilePath,
    ed.EventUploadDate,
    ed.EventDescription,
    e.EventID,
    e.EventName
FROM EventDocuments ed
INNER JOIN Events e ON ed.EventID = e.EventID
WHERE e.EventID = :eventId
ORDER BY ed.EventUploadDate DESC;

-- ============================================================================
-- 13. GET SERVICES (If Services table exists)
-- ============================================================================
-- ERD shows: Services with ServiceID (PK), PeopleID (FK), 
--            ServiceCoordinatorID (FK), ServiceAdminID (FK)
-- CORRECTED:

SELECT 
    s.ServiceID,
    s.ServiceName,
    s.ServiceDate,
    s.ServiceStartTime,
    s.ServiceEndTime,
    s.ServiceLocation,
    s.ServiceDescription,
    s.ServiceStatus,
    p.PeopleID,
    p.FirstName as ParticipantFirstName,
    p.LastName as ParticipantLastName,
    cd.CoordinatorID,
    ad.AdminID
FROM Services s
INNER JOIN People p ON s.PeopleID = p.PeopleID
LEFT JOIN CoordinatorDetails cd ON s.ServiceCoordinatorID = cd.CoordinatorID
LEFT JOIN AdminDetails ad ON s.ServiceAdminID = ad.AdminID
ORDER BY s.ServiceDate DESC;

-- ============================================================================
-- NOTES FOR REVIEW:
-- ============================================================================
-- 1. ERD shows Events table (not EventTemplate/EventOccurrences)
-- 2. ERD shows EventRegistrations.EventID (not EventOccurrenceID)
-- 3. ERD shows People.StateID FK (not State VARCHAR(2))
-- 4. ERD shows ParticipantDetails, CoordinatorDetails, AdminDetails as 
--    separate tables (may not link to People via FK)
-- 5. ERD shows Services table (not in current schema)
-- 6. ERD shows EventDocuments table (not in current schema)
-- 7. ERD shows State lookup table (not in current schema)
-- 8. ERD shows Proposals and Ministers tables (not in current schema)
-- 
-- DECISION NEEDED: Which schema should we use?
-- - Current schema (EventTemplate/EventOccurrences, PeopleRoles junction)
-- - ERD schema (Events, separate detail tables)
-- - Hybrid approach
-- ============================================================================

