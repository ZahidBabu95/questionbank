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

@Configuration
// @Profile({ "dev", "local", "test" }) // Run in all profiles for now to ensure
// data seeding
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final InstituteRepository instituteRepository;
    private final AcademicSessionRepository academicSessionRepository;
    private final SubjectRepository subjectRepository;
    private final AcademicClassRepository academicClassRepository;
    private final ClassSubjectRepository classSubjectRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            log.info("Starting Data Initialization...");

            // 1. Create Default Institute
            Institute institute = createInstituteIfNotFound("Default Institute", "DEFAULT-001",
                    "admin@questionshaper.com");

            // 2. Create Permissions
            Permission userRead = createPermissionIfNotFound("USER_READ", "Can read user details");
            Permission userWrite = createPermissionIfNotFound("USER_WRITE", "Can create/update users");

            // 3. Create Roles
            Role superAdminRole = createRoleIfNotFound("SUPER_ADMIN", Set.of(userRead, userWrite));
            Role instituteAdminRole = createRoleIfNotFound("INSTITUTE_ADMIN", Set.of(userRead, userWrite));
            Role teacherRole = createRoleIfNotFound("TEACHER", Set.of(userRead));
            Role studentRole = createRoleIfNotFound("STUDENT", Set.of(userRead));

            // 4. Create Users
            createUserIfNotFound("zahid@questionshaper.com", "Zahid", "Z@hid95", superAdminRole, institute);
            createUserIfNotFound("superadmin@questionshaper.com", "Super Admin", "Admin@123", superAdminRole,
                    institute);
            createUserIfNotFound("instituteadmin@test.com", "Institute Admin", "Admin@123", instituteAdminRole,
                    institute);
            createUserIfNotFound("teacher@test.com", "Teacher User", "Teacher@123", teacherRole, institute);
            createUserIfNotFound("student@test.com", "Student User", "Student@123", studentRole, institute);

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
        };
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

    private Role createRoleIfNotFound(String name, Set<Permission> permissions) {
        return roleRepository.findByName(name).orElseGet(() -> {
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
}
