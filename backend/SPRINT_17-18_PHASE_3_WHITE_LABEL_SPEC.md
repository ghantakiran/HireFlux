# Sprint 17-18 Phase 3: White-Label & Branding Specification

**Status**: In Progress
**Priority**: P1 (Enterprise Feature)
**Effort Estimate**: ~800 LOC (Week 35-36)
**Date**: 2025-11-08

---

## Executive Summary

White-label support allows enterprise customers to fully brand the HireFlux platform with their own identity, creating a seamless hiring experience that feels native to their company.

**Key Features:**
1. Custom branding (logo, colors, fonts, favicon)
2. Custom domain support (careers.company.com)
3. Branded email templates
4. White-label career pages
5. Custom application portal
6. Branded candidate communications

**Business Value:**
- Enterprise tier differentiator ($Custom pricing)
- Increases brand trust for large employers
- Enables staffing agencies to white-label the platform
- Higher customer retention (brand lock-in)

---

## 1. Database Schema

### 1.1 White-Label Branding Configuration

```sql
CREATE TABLE white_label_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

    -- Feature enablement (requires Enterprise plan)
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP,

    -- Brand Identity
    company_display_name VARCHAR(255),          -- Custom display name (can differ from company.name)

    -- Logos (multiple sizes)
    logo_url VARCHAR(500),                       -- Primary logo (light background)
    logo_dark_url VARCHAR(500),                  -- Logo for dark backgrounds
    logo_icon_url VARCHAR(500),                  -- Icon/favicon (square, 512x512)
    logo_email_url VARCHAR(500),                 -- Email header logo (600x200)

    -- Color Scheme (hex colors)
    primary_color VARCHAR(7) DEFAULT '#3B82F6',  -- Primary brand color
    secondary_color VARCHAR(7) DEFAULT '#10B981',-- Secondary color
    accent_color VARCHAR(7) DEFAULT '#F59E0B',   -- Accent/CTA color
    text_color VARCHAR(7) DEFAULT '#1F2937',     -- Primary text color
    background_color VARCHAR(7) DEFAULT '#FFFFFF',-- Background color

    -- Typography
    font_family VARCHAR(100) DEFAULT 'Inter',    -- Google Font or system font
    heading_font_family VARCHAR(100),            -- Optional separate heading font

    -- Custom Domain
    custom_domain VARCHAR(255),                  -- e.g., careers.company.com
    custom_domain_verified BOOLEAN DEFAULT FALSE,
    custom_domain_verification_token VARCHAR(255),
    custom_domain_ssl_enabled BOOLEAN DEFAULT FALSE,

    -- Email Branding
    email_from_name VARCHAR(255),                -- "Acme Corp Careers" instead of "HireFlux"
    email_from_address VARCHAR(255),             -- careers@company.com
    email_reply_to VARCHAR(255),
    email_footer_text TEXT,                      -- Custom email footer
    email_header_html TEXT,                      -- Custom HTML header for emails

    -- Career Page Customization
    career_page_enabled BOOLEAN DEFAULT TRUE,
    career_page_slug VARCHAR(100),               -- /careers/company-slug
    career_page_title VARCHAR(255),              -- Browser tab title
    career_page_description TEXT,                -- Meta description for SEO
    career_page_header_html TEXT,                -- Custom HTML header
    career_page_footer_html TEXT,                -- Custom HTML footer

    -- Social Media Links
    social_links JSONB,                          -- {"linkedin": "url", "twitter": "url", ...}

    -- Custom CSS (for advanced customization)
    custom_css TEXT,                             -- CSS overrides

    -- Feature Flags
    hide_hireflux_branding BOOLEAN DEFAULT FALSE,-- Hide "Powered by HireFlux"
    use_custom_application_form BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes
    INDEX idx_white_label_company (company_id),
    INDEX idx_white_label_custom_domain (custom_domain),
    INDEX idx_white_label_enabled (is_enabled)
);

-- Custom Application Form Fields (optional extended fields)
CREATE TABLE white_label_application_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    field_name VARCHAR(100) NOT NULL,            -- e.g., "diversity_statement"
    field_label VARCHAR(255) NOT NULL,           -- "Diversity Statement"
    field_type VARCHAR(50) NOT NULL,             -- "text", "textarea", "select", "checkbox", "file"
    field_options JSONB,                         -- For select/radio: ["Option 1", "Option 2"]

    is_required BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,

    help_text TEXT,                              -- Instruction text for applicants

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_white_label_fields_company (company_id),
    INDEX idx_white_label_fields_active (is_active)
);

-- Domain Verification Records (for custom domain setup)
CREATE TABLE white_label_domain_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    domain VARCHAR(255) NOT NULL,
    verification_method VARCHAR(50),             -- "dns_txt", "dns_cname", "file_upload"
    verification_token VARCHAR(255) NOT NULL,

    status VARCHAR(50) DEFAULT 'pending',        -- "pending", "verified", "failed"
    verified_at TIMESTAMP,
    last_check_at TIMESTAMP,

    dns_records JSONB,                           -- Required DNS records to add
    error_message TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_white_label_domain_company (company_id),
    INDEX idx_white_label_domain_status (status)
);
```

---

## 2. API Endpoints

### 2.1 White-Label Configuration Management

```typescript
// Get current white-label configuration
GET /api/v1/employer/white-label/config
  Response: WhiteLabelBranding

// Update white-label configuration
PUT /api/v1/employer/white-label/config
  Body: WhiteLabelBrandingUpdate
  Response: WhiteLabelBranding

// Enable/disable white-label features (requires Enterprise plan)
POST /api/v1/employer/white-label/enable
  Response: { enabled: boolean }

POST /api/v1/employer/white-label/disable
  Response: { enabled: boolean }
```

### 2.2 Logo & Asset Management

```typescript
// Upload logo assets
POST /api/v1/employer/white-label/logos/primary
  Body: FormData (image file)
  Response: { url: string }

POST /api/v1/employer/white-label/logos/dark
  Body: FormData (image file)
  Response: { url: string }

POST /api/v1/employer/white-label/logos/icon
  Body: FormData (image file)
  Response: { url: string }

POST /api/v1/employer/white-label/logos/email
  Body: FormData (image file)
  Response: { url: string }
```

### 2.3 Custom Domain Management

```typescript
// Set custom domain
POST /api/v1/employer/white-label/domain
  Body: { domain: string }
  Response: {
    domain: string,
    verification_token: string,
    dns_records: DNSRecord[],
    instructions: string
  }

// Verify custom domain
POST /api/v1/employer/white-label/domain/verify
  Response: {
    verified: boolean,
    ssl_enabled: boolean
  }

// Check domain verification status
GET /api/v1/employer/white-label/domain/status
  Response: {
    domain: string,
    verified: boolean,
    last_check: Date,
    dns_records_detected: boolean
  }
```

### 2.4 Custom Application Fields

```typescript
// List custom application fields
GET /api/v1/employer/white-label/application-fields
  Response: { fields: CustomApplicationField[] }

// Create custom application field
POST /api/v1/employer/white-label/application-fields
  Body: CustomApplicationFieldCreate
  Response: CustomApplicationField

// Update custom field
PUT /api/v1/employer/white-label/application-fields/{id}
  Body: CustomApplicationFieldUpdate
  Response: CustomApplicationField

// Delete custom field
DELETE /api/v1/employer/white-label/application-fields/{id}
  Response: { success: boolean }

// Reorder fields
POST /api/v1/employer/white-label/application-fields/reorder
  Body: { field_ids: UUID[] }
  Response: { success: boolean }
```

### 2.5 Preview & Testing

```typescript
// Preview career page with branding
GET /api/v1/employer/white-label/preview/career-page
  Response: HTML (server-rendered preview)

// Preview email template with branding
POST /api/v1/employer/white-label/preview/email
  Body: { template_type: string, sample_data: any }
  Response: HTML (email preview)

// Send test email with branding
POST /api/v1/employer/white-label/test-email
  Body: { recipient_email: string, template_type: string }
  Response: { sent: boolean }
```

---

## 3. Service Layer

### 3.1 WhiteLabelService

```python
class WhiteLabelService:
    """Service for managing white-label branding configuration"""

    def get_branding(self, company_id: UUID) -> WhiteLabelBranding:
        """Get white-label configuration for company"""

    def update_branding(
        self,
        company_id: UUID,
        update_data: WhiteLabelBrandingUpdate
    ) -> WhiteLabelBranding:
        """Update white-label configuration"""

    def enable_white_label(self, company_id: UUID) -> WhiteLabelBranding:
        """Enable white-label features (requires Enterprise plan)"""

    def disable_white_label(self, company_id: UUID) -> WhiteLabelBranding:
        """Disable white-label features"""

    def upload_logo(
        self,
        company_id: UUID,
        logo_type: str,
        file: UploadFile
    ) -> str:
        """Upload logo asset to S3 and return URL"""

    def validate_color_scheme(self, colors: dict) -> bool:
        """Validate hex color format and contrast ratios (WCAG AA)"""

    def set_custom_domain(
        self,
        company_id: UUID,
        domain: str
    ) -> DomainVerification:
        """Configure custom domain and generate verification token"""

    def verify_custom_domain(self, company_id: UUID) -> bool:
        """Verify DNS records and enable custom domain"""

    def check_domain_dns_records(self, domain: str) -> dict:
        """Check DNS records for domain verification"""

    def create_custom_field(
        self,
        company_id: UUID,
        field_data: CustomApplicationFieldCreate
    ) -> CustomApplicationField:
        """Create custom application form field"""

    def reorder_custom_fields(
        self,
        company_id: UUID,
        field_ids: List[UUID]
    ) -> bool:
        """Reorder custom application fields"""

    def render_branded_email(
        self,
        company_id: UUID,
        template_type: str,
        data: dict
    ) -> str:
        """Render email template with company branding"""

    def render_career_page(
        self,
        company_id: UUID,
        jobs: List[Job]
    ) -> str:
        """Render branded career page"""
```

---

## 4. Frontend Components

### 4.1 White-Label Settings Page

**Route:** `/employer/settings/white-label`

**Components:**
- `<WhiteLabelSettingsPage>` - Main layout
- `<BrandIdentitySection>` - Logo uploads, company name
- `<ColorSchemeEditor>` - Color picker with live preview
- `<TypographySelector>` - Font selection
- `<CustomDomainSetup>` - Domain configuration and verification
- `<EmailBrandingSection>` - Email settings
- `<CareerPageCustomizer>` - Career page settings
- `<CustomFieldsManager>` - Application form fields
- `<BrandingPreview>` - Live preview of branding
- `<WhiteLabelEnabledBadge>` - Enterprise feature indicator

### 4.2 Key Features

**Logo Management:**
- Drag-and-drop file upload
- Image cropping tool
- Multiple size variants (primary, dark, icon, email)
- File size validation (max 2MB)
- Format validation (PNG, JPG, SVG)

**Color Scheme:**
- Color picker with hex input
- Contrast ratio checker (WCAG AA compliance)
- Live preview on mock UI elements
- Suggested color palettes
- Reset to default

**Custom Domain:**
- Domain input with validation
- DNS record instructions
- Copy-to-clipboard for DNS values
- Verification status indicator
- SSL certificate status

**Email Branding:**
- From name/address configuration
- Custom footer editor (rich text)
- Email template preview
- Test email sender

**Career Page:**
- Custom header/footer HTML editor
- SEO meta tags (title, description)
- Social media links
- "Powered by HireFlux" toggle

---

## 5. Security & Validation

### 5.1 Access Control

- **Plan Requirement:** White-label features require Enterprise plan
- **Permission:** Only company owners and admins can configure
- **Audit Logging:** All branding changes logged

### 5.2 Validation Rules

**Logos:**
- Max file size: 2MB
- Allowed formats: PNG, JPG, SVG
- Min dimensions: 200x200px
- Max dimensions: 2000x2000px

**Colors:**
- Must be valid hex format (#RRGGBB)
- Must meet WCAG AA contrast ratios for text
- Primary vs. background: minimum 4.5:1 ratio

**Custom Domain:**
- Must be valid domain format
- Cannot be a HireFlux subdomain
- Must verify DNS ownership
- SSL certificate auto-provisioned via Let's Encrypt

**Email Address:**
- Must be valid email format
- Must verify ownership (send verification email)

**Custom CSS:**
- Sanitize to prevent XSS
- Restrict dangerous selectors
- Max size: 50KB

### 5.3 Rate Limiting

- Logo uploads: 10 per hour
- Domain verification checks: 5 per hour
- Test emails: 3 per hour

---

## 6. Implementation Checklist

### Phase 3A: Backend Foundation (Days 1-3)
- [ ] Create database migration with 3 tables
- [ ] Implement WhiteLabelBranding model
- [ ] Create WhiteLabelBrandingUpdate schema
- [ ] Write 30+ unit tests for WhiteLabelService (TDD)
- [ ] Implement WhiteLabelService core methods

### Phase 3B: API Endpoints (Days 4-5)
- [ ] Create white_label.py endpoints file
- [ ] Implement 15+ REST API endpoints
- [ ] Add permission checks (Enterprise plan + owner/admin)
- [ ] Add request validation

### Phase 3C: Frontend UI (Days 6-8)
- [ ] Build white-label settings page
- [ ] Create logo upload components
- [ ] Implement color scheme editor
- [ ] Build custom domain setup wizard
- [ ] Create email branding section
- [ ] Add live preview panel

### Phase 3D: Testing & Documentation (Days 9-10)
- [ ] Write 20+ E2E test scenarios (Playwright)
- [ ] Create domain verification test mocks
- [ ] Test logo upload flow
- [ ] Test color scheme validation
- [ ] Update IMPLEMENTATION_PROGRESS.md
- [ ] Create Phase 3 completion summary

---

## 7. Success Metrics

**Adoption:**
- 50%+ of Enterprise customers enable white-label
- Average time to configure: <30 minutes

**Quality:**
- Custom domain verification success rate: >95%
- Logo upload success rate: >98%
- Email deliverability with custom domain: >99%

**Performance:**
- Career page load time: <2 seconds
- Logo upload processing: <5 seconds
- Domain verification check: <10 seconds

---

## 8. Future Enhancements (Post-Phase 3)

- **Custom Application Flow:** Completely custom multi-step application forms
- **White-Label Mobile App:** Branded iOS/Android apps
- **Custom Job Widgets:** Embeddable job boards for company website
- **Advanced Email Builder:** Drag-and-drop email template designer
- **Multi-Brand Support:** Multiple brands under one company (staffing agencies)
- **Custom Analytics Dashboard:** Branded analytics for client reporting

---

**Document Status:** Ready for Implementation
**Approval:** Pending
**Owner:** Sprint 17-18 Team
