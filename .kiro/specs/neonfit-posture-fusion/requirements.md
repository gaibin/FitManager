# Requirements Document

## Introduction

NeonFit Posture Fusion is a unified fitness studio management platform that merges the NeonFit Studio Manager (React 19 + Vite + Tailwind CSS dashboard) with an AI-driven posture assessment system (MediaPipe Pose + rule-based analysis). The combined tool targets gym coaches and personal trainers (B2B SaaS), providing member management, workout logging, 3-photo posture assessment, AI-generated correction plans, and professional PDF report export. The platform is bilingual (English/Chinese), optimized for tablet and desktop, with a local-first data strategy and configurable AI providers.

## Glossary

- **Dashboard**: The main React web application providing the unified UI for all features
- **Coach**: A gym trainer or personal trainer who uses the platform to manage members and assessments (admin role)
- **Member**: A gym client whose training data and posture assessments are tracked
- **Posture_Assessment_Module**: The subsystem responsible for accepting 3 photos (front/side/back), running MediaPipe keypoint detection, and producing a structured posture report
- **Posture_Report**: A structured data object containing a score (0-100), confidence level, and a list of detected posture issues with severity ratings
- **Posture_Issue**: A single detected deviation (e.g., shoulder height imbalance, forward head posture) with value, unit, severity, and correction exercises
- **Correction_Plan**: A 4-week exercise program generated from detected posture issues, mapping each issue to week 1-2 and week 3-4 exercises
- **PDF_Report_Generator**: The subsystem that compiles training records, posture assessment results, and AI recommendations into a 3-4 page professional PDF document
- **AI_Provider**: An abstraction layer for text generation services (Gemini, DeepSeek, Kimi, etc.) that can be configured and swapped
- **MediaPipe_Backend**: The Python Flask server running MediaPipe Pose for keypoint detection on uploaded images
- **Local_Storage**: Browser-based persistent storage (IndexedDB/localStorage) used as the primary data store
- **Exercise_Library**: A predefined mapping of posture issues to corrective exercises with descriptions, sets, and reps

## Requirements

### Requirement 1: Posture Photo Upload

**User Story:** As a Coach, I want to upload 3 posture photos (front, side, back) for a member, so that the system can perform an AI-driven posture assessment.

#### Acceptance Criteria

1. WHEN the Coach selects a member and initiates a posture assessment, THE Dashboard SHALL display three distinct upload zones labeled for front view, side view, and back view
2. WHEN the Coach uploads an image to any upload zone, THE Dashboard SHALL accept JPEG and PNG formats with a minimum resolution of 640×480 pixels and a maximum file size of 10 MB per image
3. IF the Coach uploads a file that is not JPEG or PNG format, or exceeds 10 MB, or is below 640×480 pixels in resolution, THEN THE Dashboard SHALL reject the file, display an error message indicating the specific validation failure, and retain the upload zone in its previous state
4. WHEN the Coach has uploaded at least the front and side images, THE Dashboard SHALL enable the "Analyze" action (back image is optional but recommended)
5. IF an uploaded image does not contain a detectable full-body pose (pose detection confidence below 0.65 or fewer than 10 body keypoints detected), THEN THE Posture_Assessment_Module SHALL return an error message indicating which body regions are not visible and that the photo should be retaken
6. WHEN the Coach uploads an image to any upload zone, THE Dashboard SHALL display a preview thumbnail for the uploaded image within 2 seconds of file selection
7. WHEN the Coach uploads a new image to an upload zone that already contains an image, THE Dashboard SHALL replace the previous image with the new one and update the preview thumbnail

### Requirement 2: Posture Keypoint Detection

**User Story:** As a Coach, I want the system to detect body keypoints from uploaded photos using MediaPipe, so that posture deviations can be calculated accurately.

#### Acceptance Criteria

1. WHEN the Coach submits photos for analysis, THE MediaPipe_Backend SHALL extract 33 pose landmarks from each uploaded image using MediaPipe Pose with model_complexity=2 and min_detection_confidence=0.65
2. WHEN keypoint detection succeeds, THE MediaPipe_Backend SHALL return normalized coordinates in the range 0.0 to 1.0 and visibility scores in the range 0.0 to 1.0 for each of the 33 landmarks within 10 seconds per image
3. WHEN the MediaPipe_Backend processes an image, THE MediaPipe_Backend SHALL apply CLAHE preprocessing and multi-inference fusion consisting of 3 augmented passes with per-landmark median aggregation of x, y, z, and visibility values
4. IF keypoint visibility falls below 0.30 for any critical landmark (left/right shoulders, left/right hips, left/right knees), THEN THE Posture_Assessment_Module SHALL assign a confidence weight of 0.0 to the affected assessment items and label their severity as "低置信度" in the response
5. WHEN a side-view image is processed and 3D world landmarks are available with non-zero z-depth, THE MediaPipe_Backend SHALL use 3D world landmarks instead of 2D image landmarks for forward-head and rounded-shoulder calculations
6. IF a side-view image is processed and 3D world landmarks are unavailable, THEN THE MediaPipe_Backend SHALL fall back to 2D image landmark coordinates for forward-head and rounded-shoulder calculations
7. IF MediaPipe Pose fails to detect any pose landmarks in a submitted image, THEN THE MediaPipe_Backend SHALL return an error response indicating that no human pose was detected in the image and reject the analysis for that image

### Requirement 3: Posture Analysis and Scoring

**User Story:** As a Coach, I want to receive a posture score and detailed issue breakdown for each member, so that I can identify areas needing correction.

#### Acceptance Criteria

1. WHEN keypoints are successfully extracted from front-view and side-view images, THE Posture_Assessment_Module SHALL calculate deviations for all applicable checks based on view availability: front-view checks (shoulder height, head tilt, pelvic level, knee alignment, standing center-of-gravity), side-view checks (forward head CVA, rounded shoulders, pelvic tilt trend), and back-view checks when a back-view image is provided (scoliosis trend, shoulder rotation trend, lower limb asymmetry)
2. THE Posture_Assessment_Module SHALL classify each detected issue into one of three severity levels: 正常 (normal), 中度 (moderate), or 严重 (severe) based on configurable per-check threshold pairs (moderate threshold and severe threshold), and SHALL classify an issue as 低置信度 (low confidence) when the keypoint visibility confidence for that check falls below 0.30
3. THE Posture_Assessment_Module SHALL compute a total posture score from 0 to 100, where 100 represents no detected deviations, by subtracting each issue's score deduction (maximum 22 points per issue, scaled by keypoint confidence) from 100, with the final score clamped to a minimum of 0
4. IF gender and height information are not provided, THEN THE Posture_Assessment_Module SHALL apply default thresholds assuming female gender and 170 cm height; WHEN gender and height information are provided, THE Posture_Assessment_Module SHALL apply adaptive thresholds using gender-specific multipliers (e.g., female pelvic tilt tolerance multiplied by 1.25) and height scaling proportional to the ratio of provided height to 170 cm for checks with base thresholds below 20 degrees
5. WHEN front-view and back-view results are both available, THE Posture_Assessment_Module SHALL cross-validate shoulder findings by reducing the front-view shoulder issue confidence by a factor of 0.65 when front-view detects an issue but back-view does not confirm it, and by increasing confidence by a factor of 1.15 (capped at 1.0) when both views agree on the presence of an issue
6. IF keypoint extraction fails for both required views (front and side), THEN THE Posture_Assessment_Module SHALL return an error indication stating that analysis cannot be completed due to insufficient keypoint data, without producing a partial score

### Requirement 4: Correction Exercise Plan Generation

**User Story:** As a Coach, I want the system to generate a 4-week correction exercise plan based on detected posture issues, so that I can prescribe targeted training for the member.

#### Acceptance Criteria

1. WHEN a posture assessment identifies issues with severity of 中度 or 严重, THE Posture_Assessment_Module SHALL generate a Correction_Plan by mapping each issue to at least 2 and no more than 5 exercises from the Exercise_Library per phase
2. THE Correction_Plan SHALL be divided into two phases: week 1-2 (mobility exercises and muscle activation drills) and week 3-4 (strengthening exercises and movement integration drills)
3. IF a detected issue of 中度 or 严重 severity has no matching exercises in the Exercise_Library, THEN THE Posture_Assessment_Module SHALL omit that issue from the Correction_Plan and indicate to the Coach that no corrective exercises are available for that issue
4. WHEN no issues of 中度 or 严重 severity are detected, THE Posture_Assessment_Module SHALL provide a default general conditioning plan containing at least 1 mobility exercise and 1 core stability exercise for week 1-2, and at least 1 compound strength exercise for week 3-4
5. THE Exercise_Library SHALL include exercise name (maximum 20 characters), description (maximum 50 characters), and sets/reps specification for each entry
6. WHEN multiple issues share the same corrective exercise, THE Correction_Plan SHALL deduplicate the exercise and list it once, retaining the sets/reps specification from the first occurrence
7. THE Correction_Plan SHALL contain no more than 10 total exercises per phase across all detected issues

### Requirement 5: AI-Generated Training Recommendations

**User Story:** As a Coach, I want AI-generated text recommendations that combine posture findings with training history, so that I can provide holistic guidance to members.

#### Acceptance Criteria

1. WHEN a posture assessment is completed for a member who has at least 1 workout record, THE AI_Provider SHALL generate a text recommendation that references both posture issues and recent workout patterns
2. THE AI_Provider SHALL receive the posture report data (issues list with severity and values, total score) and the member's last 10 workouts (date, exercise, weight, sets, reps) as context for generating recommendations
3. WHEN the configured language is Chinese, THE AI_Provider SHALL generate recommendations in Simplified Chinese; WHEN English, THE AI_Provider SHALL generate in English
4. IF the AI_Provider request fails or times out after 15 seconds, THEN THE Dashboard SHALL display the rule-based Correction_Plan as a fallback without blocking the user
5. THE AI_Provider SHALL generate recommendations containing between 200 and 800 characters of text within 15 seconds of request initiation

### Requirement 6: Configurable AI Provider Layer

**User Story:** As a Coach, I want to configure which AI service generates text recommendations, so that I can choose based on cost, quality, or availability.

#### Acceptance Criteria

1. THE Dashboard SHALL support configuration of AI provider settings including: provider type (Gemini, DeepSeek, Kimi/Moonshot, OpenAI-compatible), API key (maximum 256 characters), base URL (maximum 512 characters), and model name (maximum 128 characters)
2. WHEN a new AI provider is configured, THE AI_Provider SHALL validate the connection by sending a test request and SHALL display the validation result (success or failure with error indication) within 15 seconds
3. IF the AI provider validation request fails or times out, THEN THE Dashboard SHALL display an error message indicating the failure reason and SHALL NOT save the configuration
4. THE AI_Provider SHALL expose a unified interface providing a text generation method and an optional image interpretation method, so that switching providers does not require changes to calling code
5. WHERE the Gemini provider is selected, THE AI_Provider SHALL accept posture images as input alongside text prompts and return text-based interpretation results through the unified interface's image interpretation method
6. THE Dashboard SHALL persist AI provider configuration (provider type, API key, base URL, and model name) in Local_Storage

### Requirement 7: PDF Report Export

**User Story:** As a Coach, I want to export a professional 3-4 page PDF report for a member, so that I can share assessment results with the member or their referring practitioner.

#### Acceptance Criteria

1. WHEN the Coach triggers PDF export for a member, THE PDF_Report_Generator SHALL produce a document containing: cover page with member name, avatar, and join date; training statistics summary; posture assessment results with annotated photos (if available); and AI-generated recommendations
2. THE PDF_Report_Generator SHALL render the report in 3 to 4 pages using the NeonFit dark theme layout (Zinc-950 background, Lime-500 accents, zinc-100 text) with consistent section headings and spacing
3. WHEN posture assessment photos are available, THE PDF_Report_Generator SHALL include the uploaded images with overlay indicators showing detected issues and their severity levels
4. IF no posture assessment has been completed for the member, THEN THE PDF_Report_Generator SHALL omit the posture section and produce a 2-3 page report containing only the cover page, training statistics, and general AI recommendations
5. THE PDF_Report_Generator SHALL include training statistics: total workouts, monthly frequency, max weight PR (kg), total volume (kg), and a volume trend chart covering the most recent 6 months of data
6. WHEN the active language is Chinese, THE PDF_Report_Generator SHALL render all text labels and content in Simplified Chinese; WHEN English, in English
7. THE PDF_Report_Generator SHALL complete generation within 10 seconds for a member with up to 100 workout records and up to 3 posture assessment photos
8. IF AI-generated recommendations are unavailable due to provider failure, THEN THE PDF_Report_Generator SHALL include the rule-based Correction_Plan text as a fallback and still produce the PDF without error
9. WHEN PDF generation completes, THE PDF_Report_Generator SHALL trigger a browser file download with filename format "{MemberName}_Report_{YYYY-MM-DD}.pdf"

### Requirement 8: Member Management

**User Story:** As a Coach, I want to manage gym members (add, view, delete) and associate posture assessments with their profiles, so that I can track each member's progress over time.

#### Acceptance Criteria

1. THE Dashboard SHALL display a member list in the sidebar showing each member's name and avatar, where selecting a member entry loads that member's training dashboard
2. WHEN the Coach submits a new member name, THE Dashboard SHALL validate that the name is between 1 and 50 characters after trimming whitespace and that no existing member shares the same name (case-insensitive), and then create a member record with the provided name, the current date as join date, an auto-generated avatar, and empty workout and assessment histories
3. IF the Coach submits a member name that is empty, exceeds 50 characters, or duplicates an existing member name (case-insensitive), THEN THE Dashboard SHALL display an inline error message indicating the specific validation failure and retain the entered input
4. WHEN the Coach selects a member, THE Dashboard SHALL display that member's training dashboard including monthly workout count, maximum weight lifted, total training volume, workout history list, and posture assessment history
5. THE Dashboard SHALL store each posture assessment result as a timestamped record linked to the member, containing the assessment date and assessment images, and display these records in reverse chronological order for historical comparison
6. WHEN the Coach deletes a member, THE Dashboard SHALL present a confirmation dialog before proceeding, and upon confirmation remove the member record and all associated workout and assessment data from storage
7. IF the Coach confirms member deletion and the deletion operation fails, THEN THE Dashboard SHALL display an error message indicating the failure and preserve the member record unchanged

### Requirement 9: Workout Logging and Statistics

**User Story:** As a Coach, I want to log workouts for members and view training statistics, so that I can track progress and inform training decisions.

#### Acceptance Criteria

1. WHEN the Coach logs a workout session, THE Dashboard SHALL record each exercise with: date (YYYY-MM-DD), exercise name (maximum 100 characters), weight in kg (0.00 to 999.99), sets (1 to 99), and reps (1 to 999)
2. IF the Coach attempts to save a session with zero exercises or with any required field (exercise name, weight, sets, reps) left empty, THEN THE Dashboard SHALL prevent the save and keep the form state intact
3. WHEN a member is selected and workout data exists, THE Dashboard SHALL compute and display: monthly workout count (number of distinct session dates in the selected month), maximum weight PR (highest single weight value recorded across all exercises for that member), and total training volume (sum of weight × sets × reps for each exercise entry in the selected month)
4. WHEN a member is selected and workout data exists, THE Dashboard SHALL render a training volume history chart using Recharts showing per-exercise data points plotted by date, with the ability to toggle between maximum weight and volume (weight × sets × reps) metrics
5. WHEN the Coach edits an existing workout session, THE Dashboard SHALL update the modified exercise records and recalculate the displayed statistics (monthly workout count, maximum weight PR, and total training volume) before returning the Coach to the history view
6. WHEN the Coach selects a month filter (YYYY-MM), THE Dashboard SHALL display only workout history entries and statistics for dates within that selected month

### Requirement 10: Local-First Data Storage

**User Story:** As a Coach, I want all data stored locally on my device by default, so that the system works without internet and my data remains private.

#### Acceptance Criteria

1. THE Dashboard SHALL persist all member data, workout records, posture assessments, and configuration in browser-based Local_Storage (IndexedDB) within 2 seconds of each create, update, or delete operation
2. WHEN the browser is closed and reopened, THE Dashboard SHALL restore all previously saved data from IndexedDB and display it within 3 seconds without requiring network access
3. WHILE no active internet connection is available, THE Dashboard SHALL allow the Coach to view members, log workouts, edit workout records, delete records, upload progress photos to local storage, and view training history
4. IF an operation requires internet access (AI text generation via Gemini API), THEN THE Dashboard SHALL display a notification indicating the feature is unavailable offline and preserve any user input entered before the attempt
5. WHERE cloud sync is enabled in the future, THE Dashboard SHALL export all local records to Supabase such that the count of member records and workout records in the remote database matches the local count, and all field values are identical
6. IF Local_Storage usage exceeds 80% of the browser-allocated IndexedDB quota, THEN THE Dashboard SHALL display a persistent warning to the Coach indicating current usage percentage and provide an option to export data as an xlsx file

### Requirement 11: Bilingual Support

**User Story:** As a Coach, I want to switch the interface between English and Chinese, so that I can use the tool in my preferred language.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a language toggle that switches all UI labels, buttons, and static text between English and Simplified Chinese, defaulting to English when no stored preference exists
2. WHEN the language is switched, THE Dashboard SHALL update all visible text within 1 second without triggering a full page reload, and SHALL preserve any unsaved form input
3. WHEN the language preference is changed, THE Dashboard SHALL persist the selected language in Local_Storage and SHALL restore that preference on subsequent page loads
4. WHILE the active language is set to Chinese, THE Dashboard SHALL display posture issue names and descriptions using their Chinese equivalents (e.g., 高低肩), and WHILE set to English, SHALL display the corresponding English translations for every issue that has a Chinese name defined
5. WHEN a report is generated, THE PDF_Report_Generator SHALL render all report headings, field labels, and static descriptive text in the active language setting, while preserving member names and numeric data unchanged regardless of language

### Requirement 12: Responsive Layout for Tablet and Desktop

**User Story:** As a Coach, I want the interface optimized for tablet and desktop screens, so that I can use it comfortably during training sessions.

#### Acceptance Criteria

1. WHILE the viewport width is 768px or wider, THE Dashboard SHALL display a fixed sidebar navigation on the left side, visible at all times without requiring user interaction to reveal it
2. THE Dashboard SHALL maintain the NeonFit dark theme: Zinc-950 background, Zinc-800/900 cards, Lime-500/400 accent colors, and zinc-100 text across all supported viewport widths
3. WHEN accessed on a viewport narrower than 768px, THE Dashboard SHALL collapse the sidebar into a toggleable overlay menu activated by a hamburger icon, and display essential coach actions (view member list, trigger assessment, view reports) accessible within one tap from the main view
4. THE Dashboard SHALL ensure all interactive elements (buttons, upload zones, form inputs) have minimum touch targets of 44x44 pixels on viewports 768px and wider
5. WHILE the viewport width is 768px or wider, THE Dashboard SHALL render posture assessment photos in a horizontal grid layout displaying all three photos (front, side, back) side-by-side in a single row
6. WHEN the viewport width is narrower than 768px, THE Dashboard SHALL stack posture assessment photos vertically in a single column, displaying one photo per row

### Requirement 13: Authentication and Role-Based Access

**User Story:** As a Coach, I want to log in securely and have admin privileges, so that only authorized users can manage member data and assessments.

#### Acceptance Criteria

1. WHEN a user accesses the Dashboard without an active session, THE Dashboard SHALL display a login form requiring username and password before displaying any member data or controls
2. IF a user submits invalid credentials, THEN THE Dashboard SHALL display an error message indicating the credentials are incorrect without specifying whether the username or password was wrong, and SHALL not grant access
3. THE Dashboard SHALL support two roles: admin (Coach) with management access, and member with read-only access restricted to their own data
4. WHEN an admin user is authenticated, THE Dashboard SHALL enable all management actions: add members, delete members, log workouts, upload progress photos, and export reports
5. WHEN a member user is authenticated, THE Dashboard SHALL display only that member's own training data and posture assessment results, and SHALL hide all management controls including add member, delete member, log workout, and upload photo actions
6. THE Dashboard SHALL store authentication state in local storage and maintain the session across page refreshes until the user explicitly triggers logout
7. WHEN a user triggers logout, THE Dashboard SHALL clear the stored authentication state and return to the login form
