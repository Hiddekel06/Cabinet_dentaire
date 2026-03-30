# Cabinet Dentaire - Action Plan & Improvement Roadmap

**Last Updated:** March 20, 2026  
**Status:** Analysis Complete - Implementation Ready

---

## PHASE 1: STABILIZATION (Week 1) 🔴 CRITICAL

### Sprint 1.1: Error Handling System (2 days)

**Objective:** Replace all `alert()` and silent failures with professional error feedback

**Tasks:**
```
[ ] Create error handling hook
    File: src/hooks/useError.js
    Exports: useErrorHandler() hook returning {error, showError, clearError}
    
[ ] Create Toast notification component
    File: src/components/Toast.jsx
    Features: Success, error, warning, info types
    Auto-dismiss after 5 seconds
    
[ ] Create ErrorBoundary component
    File: src/components/ErrorBoundary.jsx
    Catches React errors, logs to console
    Shows fallback UI
    
[ ] Standardize backend error responses
    File: app/Exceptions/Handler.php
    Format: {status: "error|success", message: "...", errors: {}}
    Status codes: 400, 422, 403, 500
    
[ ] Replace all alert() in pages/
    Script: Run across all 18 pages
    Priority: PatientTreatments, StartTreatmentWorkspace, Factures
    
[ ] Create error context
    File: src/context/ErrorContext.jsx
    Provides global error management
```

**Acceptance Criteria:**
- ✅ No `alert()` calls in codebase
- ✅ All API errors caught and displayed as toasts
- ✅ Error format consistent across all endpoints
- ✅ Tests exist for ErrorBoundary

**Files Modified:** 18 pages, 3 controllers  
**Time Estimate:** 2 days (1 dev)

---

### Sprint 1.2: Form Validation (1 day)

**Objective:** Add client-side validation for better UX

**Tasks:**
```
[ ] Install dependencies
    npm install react-hook-form yup @hookform/resolvers
    
[ ] Create reusable form components
    src/components/form/TextInput.jsx      (with error display)
    src/components/form/Select.jsx
    src/components/form/Checkbox.jsx
    src/components/form/DateInput.jsx
    
[ ] Create validation schemas
    src/validation/patientSchema.js
    src/validation/appointmentSchema.js
    src/validation/treatmentSchema.js
    
[ ] Refactor PatientFormWorkspace
    Use useForm() from react-hook-form
    Use Yup schema for validation
    Show errors next to fields
    
[ ] Refactor StartTreatmentWorkspace
    Apply same pattern
```

**Acceptance Criteria:**
- ✅ All forms validate before submission
- ✅ Errors shown next to fields (not alert)
- ✅ No server 422 errors for valid forms
- ✅ Accessibility: error messages associated with inputs

**Time Estimate:** 1 day (1 dev)

---

### Sprint 1.3: Database Performance (4 hours)

**Objective:** Add critical indexes for query performance

**Tasks:**
```
[ ] Create migration for indexes
    File: database/migrations/2026_03_20_add_critical_indexes.php
    
    ADD INDEX appointments(status)
    ADD INDEX appointments(appointment_date)
    ADD INDEX appointments(patient_id, status)
    
    ADD INDEX patient_treatments(status)
    ADD INDEX patient_treatments(patient_id, status)
    
    ADD INDEX invoices(status)
    ADD INDEX invoices(patient_id, status)
    
    ADD INDEX medical_records(patient_treatment_id)
    ADD INDEX medical_records(appointment_id)
    
    ADD INDEX patient_treatment_acts(patient_treatment_id)
    ADD INDEX patient_treatment_acts(dental_act_id)
    
[ ] Run migration
    php artisan migrate
    
[ ] Verify with EXPLAIN ANALYZE
    SELECT * FROM appointments WHERE status = 'pending'
```

**Performance Impact:**
- Queries: 100-1000x faster for large datasets
- No code changes required

**Time Estimate:** 30 mins (1 dev)

---

### Sprint 1.4: Quick Wins (3 hours)

**Objective:** Fix low-hanging fruit, improve configuration

**Tasks:**
```
[ ] Add .env.example files
    
    Backend (.env.example):
    APP_NAME="Cabinet Dentaire"
    APP_ENV=local
    APP_DEBUG=true
    APP_KEY=base64:...
    APP_URL=http://localhost:8000
    DB_CONNECTION=mysql
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_DATABASE=cabinet_dentaire
    DB_USERNAME=root
    DB_PASSWORD=
    
    Frontend (.env.example):
    VITE_API_BASE_URL=http://localhost:8000
    
[ ] Create SETUP.md with instructions
    Prerequisites (Node 18+, PHP 8.2+, MySQL)
    Backend setup commands
    Frontend setup commands
    Database seeding
    Initial login credentials
    
[ ] Fix hardcoded API URL in frontend
    File: src/services/api.js
    Before: baseURL: 'http://localhost:8000'
    After:  baseURL: import.meta.env.VITE_API_BASE_URL
    
[ ] Add .env to backend .gitignore
    Verify not in repo
    
[ ] Create GitHub Actions CI workflow
    .github/workflows/tests.yml
    Runs: PHPUnit, ESLint
    On: push to main/develop
```

**Time Estimate:** 3 hours (1 dev)

---

## PHASE 2: ARCHITECTURE (Week 2) 🟠 HIGH PRIORITY

### Sprint 2.1: Treatment State Machine (3 days)

**Objective:** Formalize treatment workflow with clear state transitions

**Current Problem:**
```
Treatment status = "planned" | "in_progress" | "completed"

But transitions not enforced:
- Can create multiple active treatments per patient ❌
- No validation on status values
- No clear rules for transitions
- Implicit state assumptions scattered everywhere
```

**Solution:**

```
[ ] Document state machine
    File: docs/treatment-state-machine.md
    
    States:
      PLANNED         - Just created, no sessions yet
      IN_PROGRESS     - At least 1 session done
      COMPLETED       - Finished, can't add more acts
      CANCELLED       - Never started
    
    Transitions:
      PLANNED → IN_PROGRESS    (when medical_record created)
      IN_PROGRESS → COMPLETED  (when end_date set + validation)
      * → CANCELLED            (explicit cancellation)
    
    Guards:
      Can't complete without ≥1 medical_record
      Can't add acts after completed
      Can't have 2 active treatments per patient
    
[ ] Create state machine implementation
    File: app/Models/PatientTreatment.php
    
    Add methods:
    - canTransitionTo($newStatus): bool
    - transitionTo($newStatus): bool
    - isActive(): bool
    - isCompleted(): bool
    - canAddActs(): bool
    - canComplete(): bool
    
    Add scopes:
    - active()
    - completed()
    - byCategoryAndStatus()
    
[ ] Update controller to use state machine
    File: app/Http/Controllers/PatientTreatmentController.php
    
    Replace: $treatment->update(['status' => 'completed'])
    With:    $treatment->transitionTo('completed')
    
    Fails if invalid transition
    
[ ] Add comprehensive tests
    tests/Feature/TreatmentStateTransitionsTest.php
    - Test each valid transition
    - Test each invalid transition
    - Test guards (completion, acts limit)
    - Test uniqueness constraint
    
[ ] Document in API reference
    Include state machine in API docs
```

**Acceptance Criteria:**
- ✅ Pattern documented in code
- ✅ Enforced at model level
- ✅ Tests cover all transitions
- ✅ No hardcoded status strings in app code

**Risk:** Medium (refactor), plan 1 day of testing  
**Time Estimate:** 3 days (1.5 devs)

---

### Sprint 2.2: Extract UI Component Library (4 days)

**Objective:** Create reusable UI components, reduce duplication

**Components to Extract:**

```
[ ] Button variants
    src/components/ui/Button.jsx
    Variants: primary, secondary, danger, outline
    Sizes: sm, md, lg
    States: loading, disabled, fullWidth
    
[ ] Modal/Dialog
    src/components/ui/Modal.jsx
    Props: isOpen, onClose, title, children, actions
    
[ ] Alert/Banner
    src/components/ui/Alert.jsx
    Types: success, error, warning, info
    
[ ] Table
    src/components/ui/Table.jsx
    Headers, rows, pagination, sorting
    
[ ] Badge/Status Tag
    src/components/ui/Badge.jsx
    Variants: success, pending, error, warning
    
[ ] Form Field Wrapper
    src/components/ui/FormField.jsx
    Label + input + error + help text
    
[ ] Pagination
    src/components/ui/Pagination.jsx
    Previous/next buttons, page numbers
    
[ ] Loading Skeleton
    src/components/ui/Skeleton.jsx
    Shimmer loading state
    
[ ] Dropdown Menu
    src/components/ui/Dropdown.jsx
    Multi-item dropdown with icons
```

**Tasks:**
```
[ ] Create component files
[ ] Implement prop interfaces
[ ] Create Storybook for each component
[ ] Refactor pages to use new components
[ ] Add component tests
```

**Effort Reduction:** 30-40% less code duplication  
**Time Estimate:** 4 days (2 devs parallel)

---

### Sprint 2.3: Add Testing Infrastructure (4 days)

**Objective:** Setup testing, create test suite for critical paths

**Backend Tests:**

```
[ ] Setup PHPUnit properly
    phpunit.xml already exists
    Create tests/Feature/ tests:
    
    tests/Feature/TreatmentWorkflowTest.php
    - Create treatment
    - Add acts
    - Create medical records
    - Create invoice
    - Mark as paid
    - Complete treatment
    
    tests/Feature/AppointmentTest.php
    - Create appointment
    - Auto-create treatment
    - Reschedule
    - Mark absent
    
    tests/Feature/InvoiceTest.php
    - Create invoice
    - Prevent double invoicing
    - Lock when paid
    - Generate PDF
    
    tests/Feature/PatientTest.php
    - CRUD operations
    - Phone number validation
    - Duplicate checking
    
[ ] Run coverage report
    php artisan test --coverage
    Target: 60% for critical paths
```

**Frontend Tests:**

```
[ ] Setup Vitest
    npm install -D vitest @vitest/ui @testing-library/react
    
[ ] Create critical tests
    src/__tests__/pages/PatientFormWorkspace.test.jsx
    - Form submission
    - Validation errors
    - Loading states
    
    src/__tests__/hooks/useErrorHandler.test.js
    - Error handling
    - Clear errors
    
    src/__tests__/components/Toast.test.jsx
    - Display/hide
    - Auto-dismiss
    
[ ] Run coverage
    vitest --coverage
    Target: 40% for critical paths
```

**Time Estimate:** 4 days (2 devs)

---

## PHASE 3: SAFEGUARDS (Week 3) 🟠 MEDIUM PRIORITY

### Sprint 3.1: Authorization & Security (2 days)

**Objective:** Add role-based access control

**Current Gap:** Auth exists but no role checks

**Tasks:**

```
[ ] Create roles/permissions tables
    database/migrations/2026_03_21_create_roles_permissions.php
    
    Roles:
    - admin (all access)
    - dentist (patient care, but no admin)
    - receptionist (scheduling only)
    
    Permissions:
    - manage_patients
    - manage_treatments
    - manage_invoices
    - manage_users (admin only)
    
[ ] Add middleware
    app/Http/Middleware/HasRole.php
    Route::middleware(['auth:sanctum', 'role:admin', 'role:dentist'])
    
[ ] Create Policies
    app/Policies/PatientPolicy.php
    app/Policies/TreatmentPolicy.php
    app/Policies/InvoicePolicy.php
    
    Example:
    public function create(User $user) {
        return $user->hasRole('dentist|admin');
    }
    
[ ] Protect routes
    Route::middleware(['auth:sanctum', 'can:create,Patient'])
        ->post('/patients', [PatientController::class, 'store']);
    
[ ] Test
    tests/Feature/AuthorizationTest.php
```

**Acceptance:**
- ✅ Receptionist can't create treatments
- ✅ Regular user can't delete other patients
- ✅ Admin can do everything
- ✅ Tests verify all scenarios

**Time Estimate:** 2 days (1 dev)

---

### Sprint 3.2: Service Layer Extraction (3 days)

**Objective:** Move business logic out of controllers

**Services to Create:**

```
[ ] TreatmentService
    - createTreatment($data)
    - addActs($treatmentId, $acts)
    - completeTreatment($treatmentId)
    - calculateTotalCost($treatmentId)
    - validateStateTransition($from, $to)
    
[ ] InvoiceService
    - createInvoice($data)
    - generatePDF($invoiceId)
    - markAsPaid($invoiceId)
    - recalculateTotal($invoiceId)
    
[ ] AppointmentService
    - createAppointment($data)
    - rescheduleWithSync($appointmentId, $newDate)
    - markAbsentAndReschedule($appointmentId, $newDate)
    
[ ] PatientService
    - createPatient($data)
    - validatePhoneUniqueness($phone)
    - validateContactRules($data)
```

**Example Refactor:**

```php
// Before (in controller)
public function store(Request $request) {
    $validated = $request->validate([...]);
    
    if (PatientTreatment::where(...)->exists()) {
        return response()->json([...], 422);
    }
    
    $treatment = PatientTreatment::create($validated);
    // ... 30 more lines
}

// After (using service)
public function store(Request $request) {
    $validated = $request->validate([...]);
    $treatment = $this->treatmentService->create($validated);
    return response()->json($treatment, 201);
}
```

**Tests:**
```
tests/Unit/TreatmentServiceTest.php
tests/Unit/InvoiceServiceTest.php
// ... easier to test than controllers
```

**Time Estimate:** 3 days (1.5 devs)

---

## PHASE 4: DOCUMENTATION (Week 4) 🟡 MEDIUM PRIORITY

### Sprint 4.1: API Documentation

**Objective:** Create OpenAPI/Swagger documentation

**Tasks:**
```
[ ] Install Laravel sanctum auto-docs package
    composer require knuckleswtf/scribe
    
[ ] Generate API endpoints list
    php artisan scribe:generate
    
[ ] Document each endpoint
    - URL, method
    - Auth required
    - Request parameters
    - Response format
    - Error codes
    
[ ] Generate HTML/Swagger
    Publish at docs/api.html

[ ] Document data models
    Treatment states
    Invoice workflow
    Appointment linking rules
```

**Output:**
- Interactive Swagger UI
- Downloadable OpenAPI spec
- Markdown docs for GitHub

---

### Sprint 4.2: Architecture & Setup Guide

**Objective:** Onboard new developers quickly

**Files to Create:**

```
[ ] ARCHITECTURE.md
    Frontend structure
    Backend structure
    Data flow diagrams
    Database schema diagram
    
[ ] SETUP.md
    Prerequisites
    Environment setup
    Database migrations
    Seed data
    Running locally
    Common issues
    
[ ] DEVELOPMENT.md
    Workflow (Git, branches, PR)
    Code style
    Testing
    Deployment
    
[ ] CONTRIBUTING.md
    How to report bugs
    How to submit features
    Code review process
    
[ ] FAQ.md
    Common issues
    Performance tips
    Security considerations
```

**Time Estimate:** 2 days (1 dev)

---

## PHASE 5: PERFORMANCE (Week 4+) 🟢 NICE-TO-HAVE

### Optional Sprint 5.1: Async Task Queue

**Objective:** Non-blocking PDF/Word generation

```
[ ] Setup Laravel queues (Redis or database driver)
[ ] Create GenerateInvoicePdf job
[ ] Create GenerateMedicalCertificate job
[ ] Create ImportDentalActs job (already needed)
[ ] Frontend polls for completion
[ ] Cache generated files for 24 hours
```

---

## Implementation Timeline

```
WEEK 1 (CRITICAL):
  Mon-Tue:  Sprint 1.1 - Error handling
  Wed:      Sprint 1.2 - Form validation
  Wed-Thu:  Sprint 1.3 - Database indexes
  Thu-Fri:  Sprint 1.4 - Quick wins

WEEK 2 (HIGH PRIORITY):
  Mon-Wed:  Sprint 2.1 - State machine
  Thu-Fri:  Sprint 2.2 - UI components (1/2 done)

WEEK 3 (MEDIUM PRIORITY):
  Mon:      Sprint 2.2 - UI components (2/2 done)
  Tue-Wed:  Sprint 2.3 - Testing setup
  Thu-Fri:  Sprint 3.1 - Authorization

WEEK 4 (MEDIUM/NICE):
  Mon-Tue:  Sprint 3.2 - Service layer
  Wed-Thu:  Sprint 4.1 - API docs
  Thu-Fri:  Sprint 4.2 - Setup guides
```

---

## Success Metrics

At end of Phase 1 (Week 1):
- ✅ 0 `alert()` calls in codebase
- ✅ All forms validate before submit
- ✅ Database queries 100x faster for large datasets
- ✅ Project setup documented

At end of Phase 2 (Week 2):
- ✅ 60% backend test coverage
- ✅ State machine formalized
- ✅ UI components library complete
- ✅ Code duplication reduced 30%

At end of Phase 3 (Week 3):
- ✅ Authorization enforced
- ✅ Business logic in services
- ✅ Controllers < 150 LOC each
- ✅ Testable architecture

At end of Phase 4 (Week 4):
- ✅ API fully documented
- ✅ New devs can setup in 30 minutes
- ✅ Architecture decisions recorded

---

## Risk Mitigation

**Risk 1: Phase 1 takes longer than 1 week**
- Mitigation: Assign 2 devs, focus on 1.1 -> 1.2 -> quick wins
- Fallback: Defer 1.4 quick wins to week 2

**Risk 2: State machine reveals breaking changes**
- Mitigation: Define machine before coding
- Fallback: Feature flag to enable gradually

**Risk 3: Tests find lots of bugs**
- Mitigation: Expected and good!
- Track in issues, prioritize by impact

**Risk 4: UI refactor takes longer**
- Mitigation: Do in parallel with testing
- Fallback: Phase to phases (week 2, then week 3)

---

## Resource Requirements

**Team Allocation:**
- Lead Dev (1 FTE):  Phases 1-2 architecture decisions
- Dev 1 (1 FTE):     Phase 1 error handling + testing
- Dev 2 (0.5 FTE):   Phase 2-3, documentation
- QA (0.5 FTE):      Manual testing during Phase 1-2

**Tools Needed:**
- GitHub (for CI/CD) ✅ Already used
- MySQL client (for index verification)
- Postman/Insomnia (for API testing)
- Database diagramming tool (draw.io)

---

## Approval & Sign-Off

- [ ] CTO approved timeline
- [ ] Team capacity confirmed
- [ ] Budget allocated
- [ ] Stakeholder expectations set

---

**Document Status:** READY FOR IMPLEMENTATION  
**Last Updated:** March 20, 2026  
**Next Review:** After Week 1
