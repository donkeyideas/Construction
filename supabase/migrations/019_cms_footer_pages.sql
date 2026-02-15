-- ============================================================
-- 019: Insert CMS pages for all footer links
-- Legal pages: privacy-policy, terms-of-service, cookie-policy, gdpr
-- Module pages: project-management, property-management,
--               financial-management, document-management
-- Company pages: about, contact
-- ============================================================

-- 1. Privacy Policy
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'privacy-policy',
  'Privacy Policy',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Privacy Policy",
        "subheadline": "How Buildwrk collects, uses, and protects your personal information."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Effective Date: January 1, 2025\n\nBuildwrk, Inc. (\"Buildwrk\", \"we\", \"us\", or \"our\") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our construction management and property management platform (the \"Service\"). By accessing or using the Service, you agree to the terms of this Privacy Policy."
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "1. Information We Collect\n\nWe collect information you provide directly to us, including:\n\n- Account Information: Name, email address, phone number, company name, job title, and password when you register for an account.\n- Project Data: Construction project details, schedules, budgets, documents, daily logs, RFIs, submittals, and other project-related information you enter into the platform.\n- Property Data: Lease agreements, tenant information, maintenance requests, unit details, and financial records related to property management.\n- Payment Information: Billing address and payment method details processed through our third-party payment processor (Stripe). We do not store full credit card numbers on our servers.\n- Communications: Messages, support tickets, and correspondence you send to us or through the platform.\n- Usage Data: Information about how you interact with the Service, including pages visited, features used, click patterns, and session duration."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "2. How We Use Your Information\n\nWe use the information we collect to:\n\n- Provide, maintain, and improve the Service, including construction project management, property management, and financial tracking features.\n- Process transactions and send related information such as invoices and receipts.\n- Send you technical notices, updates, security alerts, and administrative messages.\n- Respond to your comments, questions, and customer service requests.\n- Monitor and analyze trends, usage, and activities in connection with the Service.\n- Detect, investigate, and prevent fraudulent transactions and other illegal activities.\n- Personalize and improve your experience, including providing content and feature recommendations.\n- Comply with legal obligations, including construction industry regulations and tax reporting requirements."
      },
      "order": 3,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "3. Information Sharing and Disclosure\n\nWe do not sell your personal information. We may share your information in the following circumstances:\n\n- With Service Providers: We share information with third-party vendors who perform services on our behalf, such as cloud hosting (Vercel, Supabase), payment processing (Stripe), email delivery, and analytics.\n- With Your Consent: We may share information when you direct us to, such as when you invite team members to your company workspace or share project data with subcontractors.\n- For Legal Reasons: We may disclose information if required by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of Buildwrk, our users, or the public.\n- Business Transfers: In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction."
      },
      "order": 4,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "4. Data Security\n\nWe implement industry-standard security measures to protect your information, including:\n\n- Encryption of data in transit (TLS 1.2+) and at rest (AES-256).\n- Row-level security (RLS) policies ensuring multi-tenant data isolation.\n- Regular security audits and vulnerability assessments.\n- Access controls and authentication mechanisms including multi-factor authentication.\n\nWhile we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security."
      },
      "order": 5,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "5. Data Retention\n\nWe retain your personal information for as long as your account is active or as needed to provide the Service. Construction project data may be retained for a minimum of seven (7) years to comply with industry record-keeping requirements. You may request deletion of your account and personal data by contacting us at privacy@buildwrk.com. Upon deletion, we will remove or anonymize your data within 30 days, except where retention is required by law.\n\n6. Your Rights\n\nDepending on your jurisdiction, you may have the right to:\n\n- Access the personal information we hold about you.\n- Correct inaccurate or incomplete information.\n- Request deletion of your personal information.\n- Object to or restrict processing of your information.\n- Data portability: receive your data in a structured, machine-readable format.\n- Withdraw consent at any time where processing is based on consent.\n\nTo exercise these rights, contact us at privacy@buildwrk.com."
      },
      "order": 6,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "7. Contact Us\n\nIf you have questions or concerns about this Privacy Policy, please contact us at:\n\nBuildwrk, Inc.\nEmail: privacy@buildwrk.com\nSupport: support@buildwrk.com\n\nWe may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page and updating the effective date."
      },
      "order": 7,
      "visible": true
    }
  ]'::jsonb,
  'Privacy Policy | Buildwrk Construction Management',
  'Learn how Buildwrk collects, uses, and protects your data. Read our privacy policy covering construction project data, property management records, and user information security.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 2. Terms of Service
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'terms-of-service',
  'Terms of Service',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Terms of Service",
        "subheadline": "Please read these terms carefully before using the Buildwrk platform."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Effective Date: January 1, 2025\n\nThese Terms of Service (\"Terms\") govern your access to and use of the Buildwrk construction management and property management platform (the \"Service\") provided by Buildwrk, Inc. (\"Buildwrk\", \"we\", \"us\", or \"our\"). By creating an account or using the Service, you agree to be bound by these Terms."
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "1. Account Registration and Eligibility\n\nTo use the Service, you must:\n\n- Be at least 18 years of age.\n- Provide accurate, complete, and current registration information.\n- Maintain the security of your account credentials.\n- Notify us immediately of any unauthorized use of your account.\n\nYou are responsible for all activities that occur under your account. Buildwrk reserves the right to suspend or terminate accounts that violate these Terms.\n\n2. Subscription and Payment\n\n- The Service is offered on a subscription basis with various pricing tiers.\n- Fees are billed in advance on a monthly or annual basis depending on your selected plan.\n- All fees are non-refundable except as expressly stated in these Terms or required by law.\n- We reserve the right to change pricing with 30 days'' notice. Changes will take effect at the start of your next billing cycle.\n- Late payments may result in suspension of access to the Service."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "3. Acceptable Use\n\nYou agree not to:\n\n- Use the Service for any unlawful purpose or in violation of any applicable regulations.\n- Upload or transmit viruses, malware, or other harmful code.\n- Attempt to gain unauthorized access to other accounts, systems, or networks connected to the Service.\n- Reverse engineer, decompile, or disassemble any part of the Service.\n- Use the Service to store or transmit infringing, libelous, or otherwise unlawful material.\n- Interfere with or disrupt the integrity or performance of the Service.\n- Resell, sublicense, or redistribute access to the Service without written permission.\n\n4. Intellectual Property\n\nThe Service, including all software, design, text, graphics, and other content, is owned by Buildwrk and protected by intellectual property laws. Your subscription grants you a limited, non-exclusive, non-transferable license to use the Service for your internal business purposes. You retain ownership of all data and content you upload to the Service."
      },
      "order": 3,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "5. Data Ownership and Portability\n\nYou retain full ownership of all data you enter into the Service, including project information, financial records, documents, and property management data. You may export your data at any time using the built-in export features. Upon termination of your account, we will make your data available for export for a period of 30 days.\n\n6. Service Level and Availability\n\nBuildwrk targets 99.9% uptime for the Service. We will use commercially reasonable efforts to maintain availability but do not guarantee uninterrupted access. Scheduled maintenance windows will be communicated in advance. We are not liable for any downtime caused by factors beyond our reasonable control."
      },
      "order": 4,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "7. Limitation of Liability\n\nTO THE MAXIMUM EXTENT PERMITTED BY LAW, BUILDWRK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.\n\n8. Indemnification\n\nYou agree to indemnify and hold harmless Buildwrk and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.\n\n9. Termination\n\nEither party may terminate these Terms at any time. You may cancel your subscription through your account settings. Buildwrk may suspend or terminate your access for violation of these Terms with reasonable notice. Upon termination, your right to use the Service ceases immediately, but provisions that by their nature should survive termination will remain in effect."
      },
      "order": 5,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "10. Governing Law and Disputes\n\nThese Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.\n\n11. Changes to These Terms\n\nWe may update these Terms from time to time. We will notify you of material changes by email or through the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.\n\n12. Contact\n\nFor questions about these Terms, contact us at:\n\nBuildwrk, Inc.\nEmail: legal@buildwrk.com\nSupport: support@buildwrk.com"
      },
      "order": 6,
      "visible": true
    }
  ]'::jsonb,
  'Terms of Service | Buildwrk Platform',
  'Read the Buildwrk Terms of Service. Understand your rights and responsibilities when using our construction and property management platform, including data ownership and SLA.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 3. Cookie Policy
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'cookie-policy',
  'Cookie Policy',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Cookie Policy",
        "subheadline": "How Buildwrk uses cookies and similar tracking technologies."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Effective Date: January 1, 2025\n\nThis Cookie Policy explains how Buildwrk, Inc. (\"Buildwrk\", \"we\", \"us\", or \"our\") uses cookies and similar technologies when you visit our website or use our construction management platform. This policy should be read alongside our Privacy Policy."
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "1. What Are Cookies?\n\nCookies are small text files placed on your device when you visit a website. They are widely used to make websites work more efficiently and to provide reporting information. Cookies set by the website owner are called \"first-party cookies.\" Cookies set by parties other than the website owner are called \"third-party cookies.\"\n\n2. Types of Cookies We Use\n\nStrictly Necessary Cookies\nThese cookies are essential for the operation of the Service. They include session cookies for authentication, CSRF protection tokens, and security cookies that maintain your logged-in state. Without these cookies, the Service cannot function properly. These cookies do not require your consent.\n\n- sb-access-token: Supabase authentication session token\n- sb-refresh-token: Supabase session refresh token\n- csrf-token: Cross-site request forgery protection\n- cookie-consent: Stores your cookie preferences"
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Functional Cookies\nThese cookies enable enhanced functionality and personalization, such as remembering your preferred language, dashboard layout preferences, and recently accessed projects. If you do not allow these cookies, some features may not function properly.\n\n- user-preferences: Stores UI preferences (theme, sidebar state, default views)\n- recent-projects: Caches recently accessed project IDs for quick navigation\n- timezone: Stores your detected timezone for accurate schedule display\n\nAnalytics Cookies\nThese cookies help us understand how visitors interact with the Service by collecting and reporting information anonymously. We use this data to improve the platform experience.\n\n- _ga, _gid: Google Analytics cookies for tracking page views and user behavior\n- _vercel_insights: Vercel Web Analytics for performance monitoring\n\nMarketing Cookies\nThese cookies are used to track visitors across websites to display relevant advertisements. We currently use minimal marketing cookies.\n\n- _fbp: Facebook Pixel for measuring ad campaign effectiveness (marketing site only, not within the application)"
      },
      "order": 3,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "3. Managing Your Cookie Preferences\n\nYou can manage your cookie preferences at any time through:\n\n- Our cookie consent banner, which appears on your first visit.\n- Your browser settings, where you can block or delete cookies.\n- The cookie preferences link in the footer of every page.\n\nPlease note that blocking certain cookies may impact your ability to use the Service.\n\n4. Third-Party Cookies\n\nSome cookies are placed by third-party services that appear on our pages. We do not control these cookies. The third parties include:\n\n- Google Analytics (analytics)\n- Stripe (payment processing)\n- Vercel (hosting and analytics)\n- Supabase (authentication)\n\n5. Updates to This Policy\n\nWe may update this Cookie Policy from time to time to reflect changes in technology or legislation. The updated version will be indicated by the effective date at the top.\n\n6. Contact Us\n\nIf you have questions about our use of cookies, contact us at privacy@buildwrk.com."
      },
      "order": 4,
      "visible": true
    }
  ]'::jsonb,
  'Cookie Policy | Buildwrk',
  'Understand how Buildwrk uses cookies and tracking technologies. Learn about essential, functional, analytics, and marketing cookies on our construction management platform.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 4. GDPR Compliance
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'gdpr',
  'GDPR Compliance',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "GDPR Compliance",
        "subheadline": "How Buildwrk complies with the General Data Protection Regulation for users in the European Economic Area."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Effective Date: January 1, 2025\n\nBuildwrk, Inc. (\"Buildwrk\") is committed to protecting the personal data of all users, including those in the European Economic Area (EEA), the United Kingdom, and Switzerland. This page explains how we comply with the General Data Protection Regulation (EU) 2016/679 (\"GDPR\") and your rights under this regulation."
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "1. Data Controller\n\nBuildwrk, Inc. acts as the Data Controller for personal data collected through the Service. For data entered by our customers about their employees, subcontractors, and tenants, Buildwrk acts as a Data Processor on behalf of the customer (the Data Controller).\n\nData Protection Contact: privacy@buildwrk.com\n\n2. Lawful Basis for Processing\n\nWe process personal data under the following lawful bases as defined in Article 6 of the GDPR:\n\n- Contract Performance (Article 6(1)(b)): Processing necessary to provide the Service under your subscription agreement, including account management, project data processing, and property management functions.\n- Legitimate Interests (Article 6(1)(f)): Processing for fraud prevention, platform security, service improvement, and analytics, where our interests do not override your fundamental rights.\n- Consent (Article 6(1)(a)): Processing for marketing communications and non-essential cookies. You may withdraw consent at any time.\n- Legal Obligation (Article 6(1)(c)): Processing required by law, such as tax reporting and construction industry record-keeping requirements."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "3. Your Rights Under GDPR\n\nIf you are located in the EEA, UK, or Switzerland, you have the following rights:\n\n- Right of Access (Article 15): Request a copy of the personal data we hold about you.\n- Right to Rectification (Article 16): Request correction of inaccurate or incomplete personal data.\n- Right to Erasure (Article 17): Request deletion of your personal data, subject to legal retention requirements.\n- Right to Restriction (Article 18): Request that we limit processing of your personal data in certain circumstances.\n- Right to Data Portability (Article 20): Receive your personal data in a structured, commonly used, machine-readable format (JSON or CSV).\n- Right to Object (Article 21): Object to processing based on legitimate interests or for direct marketing purposes.\n- Right to Withdraw Consent (Article 7(3)): Withdraw consent at any time where processing is based on consent.\n- Right to Lodge a Complaint: File a complaint with your local supervisory authority.\n\nTo exercise any of these rights, email us at privacy@buildwrk.com. We will respond within 30 days as required by the GDPR."
      },
      "order": 3,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "4. International Data Transfers\n\nBuildwrk is based in the United States. When we transfer personal data from the EEA, UK, or Switzerland to the US, we rely on:\n\n- Standard Contractual Clauses (SCCs) approved by the European Commission.\n- Data Processing Agreements (DPAs) with all sub-processors.\n- Technical and organizational measures including encryption and access controls.\n\nOur primary sub-processors and their locations:\n- Supabase (Database hosting): United States, AWS us-east-1\n- Vercel (Application hosting): Global CDN with primary in United States\n- Stripe (Payment processing): United States, certified under EU-US Data Privacy Framework\n\n5. Data Processing Agreements\n\nEnterprise customers may request a Data Processing Agreement (DPA) that includes Standard Contractual Clauses. Contact legal@buildwrk.com to request a DPA.\n\n6. Data Protection Measures\n\nWe implement appropriate technical and organizational measures including encryption at rest and in transit, row-level security for multi-tenant data isolation, regular penetration testing, access logging and monitoring, and employee data protection training.\n\n7. Data Breach Notification\n\nIn the event of a personal data breach, we will notify the relevant supervisory authority within 72 hours as required by Article 33 of the GDPR. Affected individuals will be notified without undue delay when the breach poses a high risk to their rights and freedoms.\n\n8. Contact\n\nFor any GDPR-related inquiries:\nEmail: privacy@buildwrk.com"
      },
      "order": 4,
      "visible": true
    }
  ]'::jsonb,
  'GDPR Compliance | Buildwrk Data Protection',
  'Learn how Buildwrk complies with GDPR. Understand your data protection rights, our lawful basis for processing, international data transfers, and how to exercise your rights.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 5. Project Management Module
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'project-management',
  'Construction Project Management',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Construction Project Management",
        "subheadline": "Plan, track, and deliver construction projects on time and on budget with Gantt scheduling, daily logs, RFIs, submittals, and real-time collaboration."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "features",
      "content": {
        "items": [
          {
            "title": "Interactive Gantt Charts",
            "description": "Visualize project timelines with drag-and-drop Gantt charts. Set dependencies, track milestones, and identify critical path items to keep your schedule on track.",
            "icon": "gantt-chart"
          },
          {
            "title": "Task Tracking & Assignments",
            "description": "Create, assign, and track tasks across your entire team. Set priorities, due dates, and dependencies. Get real-time notifications when tasks are completed or overdue.",
            "icon": "tasks"
          },
          {
            "title": "Daily Logs & Reports",
            "description": "Capture daily field activity including weather conditions, labor hours, equipment usage, deliveries, and work completed. Generate professional daily reports for stakeholders.",
            "icon": "clipboard"
          },
          {
            "title": "RFI Management",
            "description": "Streamline Requests for Information with a centralized tracking system. Create, assign, and respond to RFIs with automatic numbering, due date tracking, and audit trails.",
            "icon": "help-circle"
          },
          {
            "title": "Submittal Tracking",
            "description": "Manage the entire submittal workflow from creation to approval. Track review cycles, required approvals, and maintain a complete history of all submittal activity.",
            "icon": "file-check"
          },
          {
            "title": "Real-Time Collaboration",
            "description": "Keep your entire project team aligned with real-time updates, @mentions, comment threads, and instant notifications. Collaborate with owners, architects, and subs in one place.",
            "icon": "users"
          }
        ]
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Built for General Contractors and Construction Managers\n\nBuildwrk''s project management module is designed specifically for the construction industry. Unlike generic project management tools, every feature is built around construction workflows, from preconstruction through closeout.\n\nManage multiple projects simultaneously with a unified dashboard that shows schedule status, budget health, and open action items across your entire portfolio. Drill into any project to see granular details including task progress, pending RFIs, and upcoming milestones.\n\nOur daily log system captures the information you need for dispute resolution and compliance, including weather data, workforce counts by trade, equipment on site, material deliveries, and safety incidents. All logs are timestamped and can be signed digitally.\n\nThe submittal and RFI modules include configurable approval workflows that match your actual review processes. Set up sequential or parallel review chains, automate reminders for overdue items, and maintain a complete audit trail for every action."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "cta",
      "content": {
        "headline": "Ready to streamline your construction projects?",
        "buttonText": "Start Free Trial",
        "buttonUrl": "/register"
      },
      "order": 3,
      "visible": true
    }
  ]'::jsonb,
  'Construction Project Management Software | Buildwrk',
  'Manage construction projects with Gantt charts, daily logs, RFIs, and submittals. Buildwrk helps general contractors deliver projects on time and on budget. Start free trial.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 6. Property Management Module
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'property-management',
  'Property Management',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Property Management",
        "subheadline": "Manage leases, tenants, maintenance requests, and units from one centralized platform built for construction developers and property managers."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "features",
      "content": {
        "items": [
          {
            "title": "Lease Tracking & Management",
            "description": "Track every lease from signing through renewal. Monitor rent escalations, lease expirations, security deposits, and payment history with automated alerts for key dates.",
            "icon": "file-text"
          },
          {
            "title": "Maintenance Request Portal",
            "description": "Tenants submit maintenance requests through a self-service portal. Automatically route requests to the right team, track resolution times, and maintain a complete service history.",
            "icon": "wrench"
          },
          {
            "title": "Unit & Property Management",
            "description": "Manage your entire portfolio with detailed unit-level tracking. Record floor plans, amenities, condition reports, and occupancy status across all your properties.",
            "icon": "building"
          },
          {
            "title": "Tenant Portal",
            "description": "Give tenants a branded self-service portal to pay rent, submit maintenance requests, view lease documents, and communicate with property management. Reduce phone calls and emails.",
            "icon": "user-circle"
          },
          {
            "title": "Vacancy & Turnover Tracking",
            "description": "Monitor vacancy rates across your portfolio. Track make-ready progress for vacant units, schedule showings, and streamline the leasing workflow from application to move-in.",
            "icon": "bar-chart"
          },
          {
            "title": "Financial Reporting",
            "description": "Generate rent rolls, income statements, and expense reports by property or portfolio. Track rent collection rates, operating expenses, and net operating income in real time.",
            "icon": "dollar-sign"
          }
        ]
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "From Construction to Operations in One Platform\n\nBuildwrk is the only platform that seamlessly connects construction project management with property management. When your development project reaches substantial completion, transition directly into operations without migrating data to a separate system.\n\nOur property management module supports residential, commercial, and mixed-use properties. Track lease terms, collect rent, manage maintenance, and report financials all within the same platform you used to build the property.\n\nThe tenant portal reduces administrative burden by enabling self-service for common requests. Tenants can pay rent online, submit and track maintenance requests, access lease documents, and receive community announcements. Every interaction is logged for your records.\n\nFor property managers handling multiple buildings, the portfolio dashboard provides a birds-eye view of occupancy rates, rent collection status, pending maintenance, and upcoming lease expirations across all properties."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "cta",
      "content": {
        "headline": "Simplify your property management workflow",
        "buttonText": "Start Free Trial",
        "buttonUrl": "/register"
      },
      "order": 3,
      "visible": true
    }
  ]'::jsonb,
  'Property Management Software | Buildwrk',
  'Manage leases, tenants, maintenance requests, and units with Buildwrk. Built for developers transitioning from construction to property operations. Try free for 14 days.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 7. Financial Management Module
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'financial-management',
  'Financial Management',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Construction Financial Management",
        "subheadline": "Take control of job costing, budgets, invoices, accounts payable, and lien waivers with financial tools built for the construction industry."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "features",
      "content": {
        "items": [
          {
            "title": "Job Costing",
            "description": "Track costs at the project, phase, and cost code level. Compare actual costs against budgets in real time. Identify overruns early with automated variance alerts and earned value analysis.",
            "icon": "calculator"
          },
          {
            "title": "Budget Management",
            "description": "Create detailed construction budgets with CSI cost codes. Manage original budgets, approved changes, revised budgets, and commitments. Track budget-to-actual across every line item.",
            "icon": "wallet"
          },
          {
            "title": "Invoicing & Billing",
            "description": "Generate AIA-style pay applications (G702/G703), progress invoices, and T&M billing. Track invoice approval workflows, retainage, and payment status from submission to collection.",
            "icon": "receipt"
          },
          {
            "title": "Accounts Payable",
            "description": "Process subcontractor and vendor invoices efficiently. Match invoices to purchase orders and contracts. Manage approval workflows, scheduled payments, and maintain a complete AP aging report.",
            "icon": "credit-card"
          },
          {
            "title": "Lien Waiver Tracking",
            "description": "Automate lien waiver collection from subcontractors and suppliers. Track conditional and unconditional waivers for progress and final payments. Never miss a waiver before releasing payment.",
            "icon": "shield"
          },
          {
            "title": "Change Order Management",
            "description": "Track change orders from request through approval with full cost impact analysis. Link change orders to budget revisions, subcontractor change orders, and owner billing automatically.",
            "icon": "edit"
          }
        ]
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Financial Visibility Across Every Project\n\nBuildwrk''s financial management module gives general contractors, developers, and construction managers complete visibility into project financials. Every dollar is tracked from budget through commitment, cost, and billing.\n\nOur job costing system integrates directly with your project schedule and daily logs. Labor hours logged in the field automatically flow into cost tracking, giving you real-time cost data without manual data entry. Material costs from purchase orders and vendor invoices are coded to the correct cost codes automatically.\n\nThe budget module supports the full lifecycle of construction budgets. Start with your estimate, create commitments through subcontracts and purchase orders, track costs as invoices are received, and bill the owner through progress applications. At every step, you can see exactly where you stand against budget.\n\nFor developers managing both construction and property operations, our financial module connects construction costs to property financials, giving you a complete picture from development through stabilization."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "cta",
      "content": {
        "headline": "Get real-time visibility into your project finances",
        "buttonText": "Start Free Trial",
        "buttonUrl": "/register"
      },
      "order": 3,
      "visible": true
    }
  ]'::jsonb,
  'Construction Financial Management Software | Buildwrk',
  'Manage job costing, budgets, invoicing, AP, and lien waivers with Buildwrk. Real-time financial visibility for general contractors and developers. Start your free trial.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 8. Document Management Module
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'document-management',
  'Document Management',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Construction Document Management",
        "subheadline": "Store, organize, and collaborate on construction documents with a plan room, version control, markup tools, and secure cloud storage."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "features",
      "content": {
        "items": [
          {
            "title": "Plan Room & Drawing Sets",
            "description": "Upload and organize drawing sets by discipline. Compare revisions side by side, overlay versions to spot changes, and ensure your team always works from the latest set.",
            "icon": "map"
          },
          {
            "title": "Version Control",
            "description": "Every document upload creates a new version with a complete audit trail. See who uploaded what and when. Roll back to previous versions at any time. Never lose track of document history.",
            "icon": "git-branch"
          },
          {
            "title": "Markup & Annotations",
            "description": "Add markups, annotations, and comments directly on drawings and documents. Use pins, arrows, text, and shapes. Link markups to RFIs, punch list items, or daily log entries.",
            "icon": "pen-tool"
          },
          {
            "title": "Secure Cloud Storage",
            "description": "All documents are stored in encrypted cloud storage with automatic backups. Set granular permissions to control who can view, download, or edit each folder and document.",
            "icon": "cloud"
          },
          {
            "title": "Smart Search & Tagging",
            "description": "Find any document instantly with full-text search across file names, tags, and metadata. Organize documents with custom tags, folders, and filters. Search across all projects at once.",
            "icon": "search"
          },
          {
            "title": "Mobile Access",
            "description": "Access drawings and documents from the field on any device. View plans offline, add markups on your tablet, and sync changes when you reconnect. Built for construction site conditions.",
            "icon": "smartphone"
          }
        ]
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Your Digital Plan Room and Document Hub\n\nBuildwrk''s document management module replaces file servers, shared drives, and paper plan rooms with a centralized, cloud-based system purpose-built for construction.\n\nThe plan room organizes drawings by discipline (architectural, structural, MEP, civil) and tracks revision history automatically. When a new drawing set is uploaded, team members are notified and the previous set is archived with full version history. Use the overlay comparison tool to quickly identify changes between revisions.\n\nOur markup tools let you annotate drawings and documents directly in the browser. Add measurement callouts, highlight areas of concern, drop pins linked to RFIs or punch list items, and share annotated views with your team. All markups are saved as layers that can be toggled on and off.\n\nDocument permissions are fully configurable. Set access at the folder or document level. Give owners read-only access to specific folders while granting your project team full editing rights. Control who can download, print, or share documents outside the platform.\n\nEvery document action is logged in an immutable audit trail, providing the documentation you need for dispute resolution, compliance, and quality management."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "cta",
      "content": {
        "headline": "Organize your construction documents in the cloud",
        "buttonText": "Start Free Trial",
        "buttonUrl": "/register"
      },
      "order": 3,
      "visible": true
    }
  ]'::jsonb,
  'Construction Document Management Software | Buildwrk',
  'Manage construction drawings and documents with Buildwrk. Plan room, version control, markups, and cloud storage built for contractors. Start your free trial today.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 9. About
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'about',
  'About Buildwrk',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "About Buildwrk",
        "subheadline": "We''re building the operating system for construction companies and property managers."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Our Mission\n\nBuildwrk exists to help construction companies and property managers work smarter, not harder. The construction industry is one of the least digitized sectors in the world, and we believe that modern, intuitive software can transform how projects are built and properties are managed.\n\nWe are building an all-in-one platform that eliminates the need for disconnected spreadsheets, paper-based processes, and fragmented software tools. From preconstruction estimating through project delivery and property operations, Buildwrk provides a single source of truth for your entire business."
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Why We Built Buildwrk\n\nThe construction industry loses an estimated $177 billion annually due to poor data management, miscommunication, and rework. Existing software solutions are often expensive, complex, and designed for enterprise firms, leaving small and mid-size contractors underserved.\n\nBuildwrk was founded to change that. We are building a platform that is powerful enough for large general contractors yet accessible enough for growing firms. Our pricing is transparent, our interface is modern, and our platform is designed to be adopted by your entire team, from the office to the field.\n\nWe combine construction project management with property management because we understand that many developers and GCs don''t just build properties, they operate them. Having both capabilities in one platform eliminates data migration, reduces software costs, and provides continuity from construction through operations."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Our Values\n\n- Simplicity First: Construction is complex enough. Our software should make things simpler, not add complexity. Every feature is designed to reduce friction and save time.\n\n- Built for the Field: Software that only works in the office is not useful. Every feature is designed to work on mobile devices in real construction site conditions.\n\n- Data Ownership: Your data belongs to you. We provide full export capabilities and never lock you in. We earn your business every month through the value we deliver.\n\n- Security & Privacy: Construction data includes sensitive financial information, contracts, and personal data. We treat security as a foundational requirement, not an afterthought.\n\n- Continuous Improvement: We ship updates weekly and listen closely to customer feedback. Our roadmap is shaped by the real needs of construction professionals."
      },
      "order": 3,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Get in Touch\n\nWe love hearing from construction professionals. Whether you have a question about the platform, want to request a feature, or are interested in partnering with us, we would love to hear from you.\n\nEmail: hello@buildwrk.com\nSupport: support@buildwrk.com\nSales: sales@buildwrk.com"
      },
      "order": 4,
      "visible": true
    },
    {
      "type": "cta",
      "content": {
        "headline": "Ready to build smarter?",
        "buttonText": "Start Free Trial",
        "buttonUrl": "/register"
      },
      "order": 5,
      "visible": true
    }
  ]'::jsonb,
  'About Buildwrk | Construction Management Platform',
  'Learn about Buildwrk, the all-in-one construction management and property management platform. Our mission is to help contractors and property managers work smarter.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;


-- 10. Contact
INSERT INTO cms_pages (page_slug, title, sections, meta_title, meta_description, status, published_at, version)
VALUES (
  'contact',
  'Contact Us',
  '[
    {
      "type": "hero",
      "content": {
        "headline": "Contact Us",
        "subheadline": "Have a question or need help? Our team is here for you."
      },
      "order": 0,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Get in Touch\n\nWe would love to hear from you. Whether you are evaluating Buildwrk for your company, need help with your account, or want to share feedback, our team is ready to assist.\n\nGeneral Support\nEmail: support@buildwrk.com\nResponse Time: Within 24 hours on business days\n\nFor urgent issues affecting your ability to use the platform, email support@buildwrk.com with \"URGENT\" in the subject line and we will prioritize your request.\n\nSales Inquiries\nEmail: sales@buildwrk.com\n\nInterested in Buildwrk for your construction company or property management firm? Our sales team can walk you through the platform, answer your questions, and help you find the right plan for your business. We offer personalized demos for teams of all sizes.\n\nPartnerships & Integrations\nEmail: partnerships@buildwrk.com\n\nWe are always looking to partner with companies that share our mission of modernizing the construction industry. If you are a software vendor, consultant, or industry organization interested in working together, reach out to our partnerships team."
      },
      "order": 1,
      "visible": true
    },
    {
      "type": "text",
      "content": {
        "body": "Help Center & Resources\n\nBefore reaching out, you may find your answer in our self-service resources:\n\n- Knowledge Base: Detailed guides and tutorials for every Buildwrk feature.\n- Video Tutorials: Step-by-step walkthroughs for common workflows.\n- API Documentation: Technical documentation for developers building integrations.\n- Community Forum: Connect with other Buildwrk users to share tips and best practices.\n\nBilling & Account Questions\nEmail: billing@buildwrk.com\n\nFor questions about your subscription, invoices, plan changes, or cancellations, contact our billing team. Include your company name and account email for the fastest response.\n\nPrivacy & Legal\nEmail: privacy@buildwrk.com\n\nFor data protection requests, GDPR inquiries, DPA requests, or legal matters, contact our privacy team. See our Privacy Policy and GDPR Compliance pages for more information."
      },
      "order": 2,
      "visible": true
    },
    {
      "type": "cta",
      "content": {
        "headline": "Not sure where to start? Try Buildwrk free for 14 days.",
        "buttonText": "Start Free Trial",
        "buttonUrl": "/register"
      },
      "order": 3,
      "visible": true
    }
  ]'::jsonb,
  'Contact Buildwrk | Support & Sales',
  'Contact the Buildwrk team for support, sales, or partnership inquiries. Email support@buildwrk.com for help with construction and property management software.',
  'published',
  now(),
  1
)
ON CONFLICT (page_slug) DO NOTHING;
