package com.testshaper.config;

import com.testshaper.entity.*;
import com.testshaper.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashSet;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final InstituteRepository instituteRepository;
    private final AcademicSessionRepository academicSessionRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicClassRepository academicClassRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final PasswordEncoder passwordEncoder;
    private final GeneralSettingRepository generalSettingRepository;
    private final BillingPackageRepository billingPackageRepository;
    private final JdbcTemplate jdbcTemplate;
    private final CmsSectionRepository cmsSectionRepository;
    private final QuestionRepository questionRepository;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting Data Initialization...");

        try {
            jdbcTemplate.execute("ALTER TABLE questions MODIFY COLUMN status VARCHAR(50)");
            log.info("Successfully altered 'questions.status' column to VARCHAR(50) to support new enum values.");
        } catch (Exception e) {
            log.warn("Failed to alter questions.status column, might already be correct or table doesn't exist yet: {}", e.getMessage());
        }

            // 1. Create Default Institute
            Institute institute = createInstituteIfNotFound("Default Institute", "DEFAULT-001",
                    "admin@questionshaper.com");

            // 2. Create Deep Matrix Permissions for Pro UI (View, Create, Edit, Delete) - 3 Level Depth
            Set<Permission> allPermissions = new HashSet<>();
            
            String[] modules = {
                // Dashboard
                "DASHBOARD",
                // User Management
                "USERS", "USERS_ALL", "USERS_TEACHERS", "USERS_STUDENTS", "USERS_PENDING", "USERS_ROLES", "USERS_BLOCKED",
                // Institute Management
                "INSTITUTES", "INSTITUTES_ALL", "INSTITUTES_ADD", "INSTITUTES_ADMINS", "INSTITUTES_SUBS",
                // Academic Structure
                "ACADEMIC", "ACADEMIC_HIERARCHY", "ACADEMIC_SESSIONS", "ACADEMIC_REPO",
                // Question Bank
                "QB", 
                "QB_REPO", "QB_REPO_ALL", "QB_REPO_PENDING", "QB_REPO_APPROVED", "QB_REPO_REJECTED",
                "QB_ADD", "QB_ADD_MCQ", "QB_ADD_CQ", "QB_ADD_SHORT",
                "QB_IMPORT", "QB_IMPORT_EXCEL", "QB_IMPORT_AI", "QB_IMPORT_COST", "QB_IMPORT_HIST",
                // Exam & Paper
                "EXAMS",
                "EXAMS_GEN", "EXAMS_GEN_AUTO", "EXAMS_GEN_SAVED", "EXAMS_GEN_EDITOR", "EXAMS_GEN_MANUAL",
                "EXAMS_DL", "EXAMS_DL_PDF", "EXAMS_DL_WORD",
                // Lectures
                "LECTURES", "LECTURES_CREATE", "LECTURES_ATTACH",
                // Reports
                "REPORTS", "REPORTS_USAGE", "REPORTS_PERF",
                // Billing
                "BILLING", "BILLING_PKG", "BILLING_INV",
                // CMS
                "CMS", "CMS_LANDING", "CMS_BLOG",
                // Settings
                "SETTINGS", "SETTINGS_SEC", "SETTINGS_GEN", "SETTINGS_BACKUP",
                // Support
                "SUPPORT", "SUPPORT_TICKETS"
            };
            
            String[] actions = {"VIEW", "CREATE", "EDIT", "DELETE"};
            
            for (String mod : modules) {
                for (String action : actions) {
                    allPermissions.add(createPermissionIfNotFound(mod + "_" + action, "Can " + action + " " + mod));
                }
            }

            // (Legacy permissions - kept for backward compatibility if any old code relies on it)
            Permission userRead = createPermissionIfNotFound("USER_READ", "Can read user details");
            Permission userWrite = createPermissionIfNotFound("USER_WRITE", "Can create/update users");
            allPermissions.add(userRead); 
            allPermissions.add(userWrite);

            // 3. Create Roles
            Role superAdminRole = createRoleIfNotFound("SUPER_ADMIN", allPermissions, true);
            Role instituteAdminRole = createRoleIfNotFound("INSTITUTE_ADMIN", Set.of(userRead, userWrite), false);
            Role teacherRole = createRoleIfNotFound("TEACHER", Set.of(userRead), false);
            Role studentRole = createRoleIfNotFound("STUDENT", Set.of(userRead), false);
            Role betaUserRole = createRoleIfNotFound("BETA USER", Set.of(userRead, userWrite), false);

            // 4. Create Users
            createUserIfNotFound("zahid@questionshaper.com", "Zahid", "Z@hid95", superAdminRole, institute);
            createUserIfNotFound("superadmin@questionshaper.com", "Super Admin", "Admin@123", superAdminRole, institute);
            createUserIfNotFound("instituteadmin@test.com", "Institute Admin", "Admin@123", instituteAdminRole, institute);
            createUserIfNotFound("teacher@test.com", "Teacher User", "Teacher@123", teacherRole, institute);
            createUserIfNotFound("student@test.com", "Student User", "Student@123", studentRole, institute);

            // 4.5 Create Default Settings
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.AI, "ai_queue_cleanup_days", "30");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.GENERAL, "landing_default_language", "en");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.GENERAL, "landing_enabled_languages", "en,bn");
            
            // Storage Settings (Cloudflare R2 defaults)
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.STORAGE, "storage_provider", "CLOUDFLARE_R2");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.STORAGE, "cloudflare_account_id", "86de2d4fc29cfc0d0f118f46e41085c2");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.STORAGE, "cloudflare_r2_bucket", "sl-checkout-invoice");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.STORAGE, "storage_access_key", "f7d7e1e49a4589d76adf43c1ca019550");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.STORAGE, "storage_secret_key", "5f1d415aa7aecc55bf90e7d290ed3f9e9ad69895a8e52d25f221dd65861e1b36");
            createGeneralSettingIfNotFound(GeneralSetting.SettingCategory.STORAGE, "cloudflare_public_url", "https://pub-877664dc8f4f473da7cdcb7fe3b32a76.r2.dev");

            // 4.6 Create Beta Package
            createBillingPackageIfNotFound("Beta Tester Package", "BETA-01", 
                    "Exclusive generous package for early beta testers.", 
                    new java.math.BigDecimal("0.00"));

            // 5. Create Academic Data (Session, Class, Subject)
            AcademicSession currentSession = createSessionIfNotFound("2024", true);

            // AcademicClass class9 = createClassIfNotFound("Class 9", 9);
            // AcademicClass class10 = createClassIfNotFound("Class 10", 10);

            // Subject math = createSubjectIfNotFound("Mathematics", "MATH", "General
            // Mathematics");
            // Subject physics = createSubjectIfNotFound("Physics", "PHYS", "Physics for
            // Science");

            // 6. Assign Subjects to Classes (Syllabus)
            // createClassSubjectIfNotFound(class9, math, currentSession);
            // createClassSubjectIfNotFound(class10, math, currentSession);
            // createClassSubjectIfNotFound(class10, physics, currentSession);

            seedCmsSectionsIfEmpty();
            log.info("Data Initialization Completed.");
    }

    private Institute createInstituteIfNotFound(String name, String code, String email) {
        return instituteRepository.findByCode(code).orElseGet(() -> {
            Institute institute = new Institute();
            institute.setName(name);
            institute.setCode(code);
            institute.setContactEmail(email);
            return instituteRepository.save(institute);
        });
    }

    private Permission createPermissionIfNotFound(String name, String description) {
        return permissionRepository.findByName(name).orElseGet(() -> {
            Permission permission = new Permission();
            permission.setName(name);
            permission.setDescription(description);
            return permissionRepository.save(permission);
        });
    }

    private Role createRoleIfNotFound(String name, Set<Permission> permissions, boolean forceUpdate) {
        return roleRepository.findByName(name).map(role -> {
            if (forceUpdate) {
                role.setPermissions(permissions);
                log.info("Aggressively updated permissions for role: {}", name);
                return roleRepository.save(role);
            }
            return role;
        }).orElseGet(() -> {
            Role role = new Role();
            role.setName(name);
            role.setPermissions(permissions);
            return roleRepository.save(role);
        });
    }

    private void createUserIfNotFound(String email, String name, String password, Role role, Institute institute) {
        if (!userRepository.existsByEmail(email)) {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setInstitute(institute);
            Set<Role> roles = new HashSet<>();
            roles.add(role);
            user.setRoles(roles);
            user.setActive(true);
            userRepository.save(user);
            log.info("Created user: {}", email);
        }
    }

    private AcademicSession createSessionIfNotFound(String name, boolean isActive) {
        return academicSessionRepository.findByName(name).orElseGet(() -> {
            AcademicSession session = new AcademicSession();
            session.setName(name);
            session.setActive(isActive);
            return academicSessionRepository.save(session);
        });
    }

    private AcademicClass createClassIfNotFound(String name, Integer order) {
        return academicClassRepository.findAll().stream()
                .filter(c -> c.getName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    AcademicClass academicClass = new AcademicClass();
                    academicClass.setName(name);
                    academicClass.setOrder(order);
                    return academicClassRepository.save(academicClass);
                });
    }

    private Subject createSubjectIfNotFound(String name, String code, String description) {
        return subjectRepository.findByCode(code).orElseGet(() -> {
            Subject subject = new Subject();
            subject.setName(name);
            subject.setCode(code);
            subject.setDescription(description);
            return subjectRepository.save(subject);
        });
    }

    private void createClassSubjectIfNotFound(AcademicClass academicClass, Subject subject, AcademicSession session) {
        if (classSubjectRepository.findByAcademicClassAndSubjectAndSession(academicClass, subject, session).isEmpty()) {
            ClassSubject classSubject = new ClassSubject();
            classSubject.setAcademicClass(academicClass);
            classSubject.setSubject(subject);
            classSubject.setSession(session);
            classSubjectRepository.save(classSubject);
        }
    }

    private void createGeneralSettingIfNotFound(GeneralSetting.SettingCategory category, String key, String value) {
        if (generalSettingRepository.findByTenantIdIsNullAndKey(key).isEmpty()) {
            GeneralSetting setting = new GeneralSetting();
            setting.setCategory(category);
            setting.setKey(key);
            setting.setValue(value);
            setting.setTenantId(null);
            setting.setEncrypted(false);
            generalSettingRepository.save(setting);
            log.info("Created default general setting: {} = {}", key, value);
        }
    }

    private void createBillingPackageIfNotFound(String name, String code, String description, java.math.BigDecimal price) {
        boolean exists = billingPackageRepository.findAll().stream().anyMatch(p -> p.getPackageCode().equals(code));
        if (!exists) {
            BillingPackage pkg = new BillingPackage();
            pkg.setName(name);
            pkg.setPackageCode(code);
            pkg.setDescription(description);
            pkg.setPrice(price);
            pkg.setCurrency("BDT");
            pkg.setBillingCycle(BillingPackage.BillingCycle.MONTHLY);
            pkg.setStatus(BillingPackage.PackageStatus.ACTIVE);
            
            pkg.setMaxTeachers(10);
            pkg.setMaxStudents(100);
            pkg.setMaxQuestions(5000);
            pkg.setMaxExamsPerMonth(100);
            pkg.setMaxLectures(50);
            pkg.setAiLimitPerMonth(500000);
            pkg.setStorageLimitMb(1024);
            
            pkg.setDisplayName("Beta User (Early Access)");
            pkg.setHighlightBadge("BETA TESTER");
            pkg.setSortOrder(1);
            pkg.setAssociatedRole("BETA USER");
            
            billingPackageRepository.save(pkg);
            log.info("Created Beta User Package: {}", code);
        }
    }

    private void seedCmsSectionsIfEmpty() {
        // 1. HERO_SECTION
        if (cmsSectionRepository.findBySectionKeyAndDeletedFalse("HERO_SECTION").isEmpty()) {
            log.info("Seeding default HERO_SECTION...");
            CmsSection hero = new CmsSection();
            hero.setSectionName("Hero Section");
            hero.setSectionKey("HERO_SECTION");
            hero.setStatus(CmsSection.SectionStatus.ACTIVE);
            hero.setSortOrder(1);

            CmsSectionContent heroBadge = new CmsSectionContent();
            heroBadge.setContentKey("BADGE_TEXT");
            heroBadge.setContentValue("নতুন সংস্করণ ২.০ রিলিজ হয়েছে");
            heroBadge.setContentType(CmsSectionContent.ContentType.TEXT);
            hero.addContent(heroBadge);

            CmsSectionContent heroTitle = new CmsSectionContent();
            heroTitle.setContentKey("TITLE");
            heroTitle.setContentValue("প্রশ্নপত্র তৈরি ও মূল্যায়ন করুন নিমিষেই");
            heroTitle.setContentType(CmsSectionContent.ContentType.TEXT);
            hero.addContent(heroTitle);

            CmsSectionContent heroDesc = new CmsSectionContent();
            heroDesc.setContentKey("DESCRIPTION");
            heroDesc.setContentValue("এআই চালিত প্রশ্ন জেনারেটর এবং পারফরম্যান্স অ্যানালিটিক্সের মাধ্যমে আপনার প্রতিষ্ঠানকে আধুনিক করে তুলুন।");
            heroDesc.setContentType(CmsSectionContent.ContentType.TEXT);
            hero.addContent(heroDesc);

            cmsSectionRepository.save(hero);
        }

        // 2. FEATURES_SECTION
        if (cmsSectionRepository.findBySectionKeyAndDeletedFalse("FEATURES_SECTION").isEmpty()) {
            log.info("Seeding default FEATURES_SECTION...");
            CmsSection features = new CmsSection();
            features.setSectionName("Features Section");
            features.setSectionKey("FEATURES_SECTION");
            features.setStatus(CmsSection.SectionStatus.ACTIVE);
            features.setSortOrder(2);

            CmsSectionContent featTitle = new CmsSectionContent();
            featTitle.setContentKey("SECTION_TITLE");
            featTitle.setContentValue("আমাদের মূল সেবাসমূহ");
            featTitle.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(featTitle);

            CmsSectionContent f1Title = new CmsSectionContent();
            f1Title.setContentKey("F1_TITLE");
            f1Title.setContentValue("সমৃদ্ধ প্রশ্ন ব্যাংক");
            f1Title.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(f1Title);

            CmsSectionContent f1Desc = new CmsSectionContent();
            f1Desc.setContentKey("F1_DESC");
            f1Desc.setContentValue("শ্রেণী, বিষয় এবং টপিক অনুসারে গোছানো হাজারো সৃজনশীল ও বহুনির্বাচনী প্রশ্ন।");
            f1Desc.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(f1Desc);

            CmsSectionContent f2Title = new CmsSectionContent();
            f2Title.setContentKey("F2_TITLE");
            f2Title.setContentValue("এআই অটো জেনারেটর");
            f2Title.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(f2Title);

            CmsSectionContent f2Desc = new CmsSectionContent();
            f2Desc.setContentKey("F2_DESC");
            f2Desc.setContentValue("কঠিনতা ও সিলেবাসের মান বজায় রেখে মাত্র কয়েক সেকেন্ডে ব্যালেন্সড প্রশ্নপত্র তৈরি করুন।");
            f2Desc.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(f2Desc);

            CmsSectionContent f3Title = new CmsSectionContent();
            f3Title.setContentKey("F3_TITLE");
            f3Title.setContentValue("মাল্টি-টেন্যান্ট সাপোর্ট");
            f3Title.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(f3Title);

            CmsSectionContent f3Desc = new CmsSectionContent();
            f3Desc.setContentKey("F3_DESC");
            f3Desc.setContentValue("কোচিং সেন্টার এবং স্কুল-কলেজ চেইনের জন্য একাধিক শাখা বা ইনস্টিটিউট ম্যানেজমেন্ট সুবিধা।");
            f3Desc.setContentType(CmsSectionContent.ContentType.TEXT);
            features.addContent(f3Desc);

            cmsSectionRepository.save(features);
        }

        // 3. CTA_SECTION
        if (cmsSectionRepository.findBySectionKeyAndDeletedFalse("CTA_SECTION").isEmpty()) {
            log.info("Seeding default CTA_SECTION...");
            CmsSection cta = new CmsSection();
            cta.setSectionName("CTA Section");
            cta.setSectionKey("CTA_SECTION");
            cta.setStatus(CmsSection.SectionStatus.ACTIVE);
            cta.setSortOrder(3);

            CmsSectionContent ctaTitle = new CmsSectionContent();
            ctaTitle.setContentKey("TITLE");
            ctaTitle.setContentValue("আপনার শিক্ষাপ্রতিষ্ঠানকে আধুনিক করতে প্রস্তুত তো?");
            ctaTitle.setContentType(CmsSectionContent.ContentType.TEXT);
            cta.addContent(ctaTitle);

            CmsSectionContent ctaBtn = new CmsSectionContent();
            ctaBtn.setContentKey("BTN_TEXT");
            ctaBtn.setContentValue("আজই বিনামূল্যে শুরু করুন");
            ctaBtn.setContentType(CmsSectionContent.ContentType.TEXT);
            cta.addContent(ctaBtn);

            cmsSectionRepository.save(cta);
        }

        // 4. TRUSTED_SECTION
        if (cmsSectionRepository.findBySectionKeyAndDeletedFalse("TRUSTED_SECTION").isEmpty()) {
            log.info("Seeding default TRUSTED_SECTION...");
            CmsSection trusted = new CmsSection();
            trusted.setSectionName("Trusted Institutions");
            trusted.setSectionKey("TRUSTED_SECTION");
            trusted.setStatus(CmsSection.SectionStatus.ACTIVE);
            trusted.setSortOrder(4);

            CmsSectionContent trustedHeading = new CmsSectionContent();
            trustedHeading.setContentKey("HEADING");
            trustedHeading.setContentValue("শীর্ষস্থানীয় শিক্ষাপ্রতিষ্ঠান দ্বারা বিশ্বস্ত");
            trustedHeading.setContentType(CmsSectionContent.ContentType.TEXT);
            trusted.addContent(trustedHeading);

            String[] defaultNames = {"NDCC", "DHAKA COLLEGE", "IDEAL SCHOOL", "VIQARUNNISA", "RAJUK COLLEGE"};
            for (int i = 1; i <= 5; i++) {
                CmsSectionContent nameContent = new CmsSectionContent();
                nameContent.setContentKey("PARTNER_" + i + "_NAME");
                nameContent.setContentValue(defaultNames[i - 1]);
                nameContent.setContentType(CmsSectionContent.ContentType.TEXT);
                trusted.addContent(nameContent);

                CmsSectionContent logoContent = new CmsSectionContent();
                logoContent.setContentKey("PARTNER_" + i + "_LOGO");
                logoContent.setContentValue(""); // Empty initially, can upload logo image url in CMS
                logoContent.setContentType(CmsSectionContent.ContentType.IMAGE);
                trusted.addContent(logoContent);
            }

            cmsSectionRepository.save(trusted);
        }
    }
}
