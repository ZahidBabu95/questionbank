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

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting Data Initialization...");

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
}
