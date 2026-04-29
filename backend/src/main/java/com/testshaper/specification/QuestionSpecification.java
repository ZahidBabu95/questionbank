package com.testshaper.specification;

import com.testshaper.entity.Question;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class QuestionSpecification {

    public static Specification<Question> filterQuestions(
            String tenantId,
            String filterStatus,
            String filterType,
            String searchQuery,
            String filterLanguage,
            String selectedLevelId,
            String selectedStreamId,
            String selectedClassId,
            String selectedSubjectId,
            String selectedChapterId,
            String selectedTopicId,
            String className,
            String subjectName,
            List<UUID> allowedSubjectIds,
            String globalTenantId) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // FGAC & Tenant filtering
            if (StringUtils.hasText(tenantId)) {
                Predicate tenantMatch = cb.equal(root.get("tenantId"), tenantId);
                
                // Allow global questions (tenantId is "DEFAULT", null, or the Default Institute's ID) IF they belong to allowed subjects
                if (allowedSubjectIds != null && !allowedSubjectIds.isEmpty()) {
                    Predicate isGlobalNull = cb.isNull(root.get("tenantId"));
                    Predicate isGlobalDefault = cb.equal(root.get("tenantId"), "DEFAULT");
                    Predicate isGlobalEmpty = cb.equal(root.get("tenantId"), "");
                    Predicate isGlobalInst = cb.or(); // dummy false
                    if (StringUtils.hasText(globalTenantId)) {
                        isGlobalInst = cb.equal(root.get("tenantId"), globalTenantId);
                    }
                    Predicate isGlobal = cb.or(isGlobalNull, isGlobalDefault, isGlobalEmpty, isGlobalInst);
                    
                    Predicate subjectInAllowed = root.get("classSubject").get("id").in(allowedSubjectIds);
                    Predicate globalAndAllowed = cb.and(isGlobal, subjectInAllowed);
                    
                    predicates.add(cb.or(tenantMatch, globalAndAllowed));
                } else {
                    // If no allowed subjects, only show their own tenant's questions
                    predicates.add(tenantMatch);
                }
            }

            // Exclude deleted ones
            predicates.add(cb.equal(root.get("deleted"), false));

            // Optional FETCH to avoid N+1 for academic hierarchy details normally needed in lists
            if (Long.class != query.getResultType()) { // don't fetch on count query
                jakarta.persistence.criteria.Fetch<Object, Object> csFetch = root.fetch("classSubject", JoinType.LEFT);
                csFetch.fetch("subject", JoinType.LEFT);
                
                jakarta.persistence.criteria.Fetch<Object, Object> acFetch = csFetch.fetch("academicClass", JoinType.LEFT);
                jakarta.persistence.criteria.Fetch<Object, Object> stFetch = acFetch.fetch("stream", JoinType.LEFT);
                stFetch.fetch("level", JoinType.LEFT);
                
                root.fetch("chapter", JoinType.LEFT);
                root.fetch("topic", JoinType.LEFT);
            }

            // Status filter
            if (StringUtils.hasText(filterStatus) && !"ALL".equalsIgnoreCase(filterStatus)) {
                try {
                    Question.QuestionStatus statusEnum = Question.QuestionStatus.valueOf(filterStatus.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), statusEnum));

                    // When filtering REVISED, show ONLY child revisions (parentQuestionId IS NOT NULL)
                    if (statusEnum == Question.QuestionStatus.REVISED) {
                        predicates.add(cb.isNotNull(root.get("parentQuestionId")));
                    }
                } catch (Exception e) {}
            } else {
                // Default listing: exclude child revisions so they don't pollute main list
                predicates.add(cb.isNull(root.get("parentQuestionId")));
            }

            // Type filter
            if (StringUtils.hasText(filterType) && !"ALL".equalsIgnoreCase(filterType)) {
                try {
                    predicates.add(cb.equal(root.get("type"), Question.QuestionType.valueOf(filterType.toUpperCase())));
                } catch (Exception e) {}
            }

            // Language filter
            if (StringUtils.hasText(filterLanguage) && !"ALL".equalsIgnoreCase(filterLanguage)) {
                predicates.add(cb.equal(root.get("language"), filterLanguage));
            }

            // Search query
            if (StringUtils.hasText(searchQuery)) {
                String likePattern = "%" + searchQuery.toLowerCase() + "%";
                var textMatch = cb.like(cb.lower(root.get("questionText")), likePattern);
                var stimulusMatch = cb.like(cb.lower(root.get("stimulus")), likePattern);
                predicates.add(cb.or(textMatch, stimulusMatch));
            }

            // Academic Filters
            if (StringUtils.hasText(selectedSubjectId)) {
                predicates.add(cb.equal(root.get("classSubject").get("id"), UUID.fromString(selectedSubjectId)));
            } else if (StringUtils.hasText(selectedClassId)) {
                predicates.add(cb.equal(root.get("classSubject").get("academicClass").get("id"), UUID.fromString(selectedClassId)));
            } else if (StringUtils.hasText(selectedStreamId)) {
                predicates.add(cb.equal(root.get("classSubject").get("academicClass").get("stream").get("id"), UUID.fromString(selectedStreamId)));
            } else if (StringUtils.hasText(selectedLevelId)) {
                predicates.add(cb.equal(root.get("classSubject").get("academicClass").get("stream").get("level").get("id"), UUID.fromString(selectedLevelId)));
            }
            
            if (StringUtils.hasText(selectedChapterId)) {
                predicates.add(cb.equal(root.get("chapter").get("id"), UUID.fromString(selectedChapterId)));
            }
            if (StringUtils.hasText(selectedTopicId)) {
                predicates.add(cb.equal(root.get("topic").get("id"), UUID.fromString(selectedTopicId)));
            }

            // Fallback to name-based filtering if IDs aren't present (useful for Editor integration)
            if (StringUtils.hasText(className)) {
                predicates.add(cb.equal(root.get("classSubject").get("academicClass").get("name"), className));
            }
            if (StringUtils.hasText(subjectName)) {
                predicates.add(cb.equal(root.get("classSubject").get("subject").get("name"), subjectName));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
