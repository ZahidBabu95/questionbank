package com.testshaper.specification;

import com.testshaper.entity.Role;
import com.testshaper.entity.User;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class UserSpecification {

    public static Specification<User> filterUsers(
            String query,
            UUID instituteId,
            String role,
            Boolean active,
            Boolean accountLocked,
            Boolean includeDeleted,
            String currentEmail) {

        return (root, criteriaQuery, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Deleted filter
            if (includeDeleted == null || !includeDeleted) {
                predicates.add(cb.isFalse(root.get("deleted")));
            }

            // 2. Keyword Search (Name or Email)
            if (StringUtils.hasText(query)) {
                String searchPattern = "%" + query.toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), searchPattern);
                Predicate emailLike = cb.like(cb.lower(root.get("email")), searchPattern);
                predicates.add(cb.or(nameLike, emailLike));
            }

            // 3. Institute Filter
            if (instituteId != null) {
                predicates.add(cb.equal(root.get("institute").get("id"), instituteId));
            }

            // 4. Role Filter (Use EXISTS subquery to prevent Cartesian explosion and duplicate roots)
            if (StringUtils.hasText(role)) {
                Subquery<Long> roleSubquery = criteriaQuery.subquery(Long.class);
                jakarta.persistence.criteria.Root<User> subRoot = roleSubquery.correlate(root);
                Join<User, Role> roleJoin = subRoot.join("roles");
                roleSubquery.select(cb.literal(1L))
                        .where(cb.equal(roleJoin.get("name"), role));
                predicates.add(cb.exists(roleSubquery));
            }

            // 5. Active and Locked Filters
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (accountLocked != null) {
                predicates.add(cb.equal(root.get("accountLocked"), accountLocked));
            }

            // 6. Super Admin Masking:
            // currentEmail can see SUPER_ADMINs ONLY if they themselves are SUPER_ADMIN (or we just filter out SUPER_ADMINs for all except the exact current user).
            // Current rule: (u.email = :currentEmail OR NOT EXISTS (SELECT rs FROM u.roles rs WHERE rs.name = 'SUPER_ADMIN'))
            if (StringUtils.hasText(currentEmail)) {
                Predicate isCurrentUser = cb.equal(root.get("email"), currentEmail);

                Subquery<Long> superAdminSubquery = criteriaQuery.subquery(Long.class);
                jakarta.persistence.criteria.Root<User> subRootSA = superAdminSubquery.correlate(root);
                Join<User, Role> saJoin = subRootSA.join("roles");
                superAdminSubquery.select(cb.literal(1L))
                        .where(cb.equal(saJoin.get("name"), "SUPER_ADMIN"));
                
                Predicate isNotSuperAdmin = cb.not(cb.exists(superAdminSubquery));

                predicates.add(cb.or(isCurrentUser, isNotSuperAdmin));
            }

            // Optimization: Apply DISTNCT only when absolutely needed. It isn't strictly needed anymore since we use EXISTS subqueries!
            // However, JPA handles it safely. We omit criteriaQuery.distinct(true) for speed because we didn't JOIN collections on the root query!

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
