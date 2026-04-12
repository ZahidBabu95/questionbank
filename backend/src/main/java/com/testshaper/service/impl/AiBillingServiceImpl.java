package com.testshaper.service.impl;

import com.testshaper.entity.Institute;
import com.testshaper.entity.User;
import com.testshaper.exception.InsufficientQuotaException;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.repository.AiUsageLogRepository;
import com.testshaper.entity.AiUsageLog;
import com.testshaper.entity.GeneralSetting;
import com.testshaper.repository.GeneralSettingRepository;
import com.testshaper.service.AiBillingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiBillingServiceImpl implements AiBillingService {

    private final UserRepository userRepository;
    private final InstituteRepository instituteRepository;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final GeneralSettingRepository settingsRepo;

    private Institute getCurrentInstitute() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        String email = auth.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            return userOpt.get().getInstitute();
        }
        return null;
    }

    @Override
    public void checkAiQuota() {
        Institute institute = getCurrentInstitute();
        if (institute != null) {
            // Assume SUPER_ADMIN might be assigned to Default Institute
            // For simplicity, super admins can bypass or we can give default institute high limits.
            if (institute.getAiUsedCurrentMonth() >= institute.getAiLimitPerMonth()) {
                log.warn("AI Quota exceeded for institute: {}", institute.getName());
                throw new InsufficientQuotaException("আপনার এআই (AI) ক্রেডিট শেষ হয়ে গেছে। দয়া করে প্যাকেজ আপগ্রেড করুন।");
            }
        }
    }

    @Override
    public void checkQuestionQuota(int requestedCount) {
        Institute institute = getCurrentInstitute();
        if (institute != null) {
            if (institute.getQuestionsUsedCurrentMonth() + requestedCount > institute.getMaxQuestions()) {
                log.warn("Question limit exceeded for institute: {}", institute.getName());
                throw new InsufficientQuotaException("আপনার বর্তমান প্যাকেজের প্রশ্ন তৈরির লিমিট শেষ হয়ে গেছে।");
            }
        }
    }

    @Override
    @Transactional
    public void deductTokens(int tokensCost) {
        if (tokensCost <= 0) return;
        
        Institute institute = getCurrentInstitute();
        if (institute != null) {
            institute.setAiUsedCurrentMonth(institute.getAiUsedCurrentMonth() + tokensCost);
            instituteRepository.save(institute);
        }
    }

    @Override
    @Transactional
    public void deductQuestionQuota(int generatedQuestionsCount) {
        if (generatedQuestionsCount <= 0) return;
        
        Institute institute = getCurrentInstitute();
        if (institute != null) {
            institute.setQuestionsUsedCurrentMonth(institute.getQuestionsUsedCurrentMonth() + generatedQuestionsCount);
            instituteRepository.save(institute);
        }
    }

    @Override
    @Transactional
    public void recordSystemAiUsage(String module, String action, int inputTokens, int outputTokens, long processingTimeMs, boolean success, String errorMessage) {
        try {
            int totalTokens = Math.max(inputTokens + outputTokens, 500); // 500 default baseline
            double costUsd = totalTokens * 0.00025 / 1000.0;
            
            String model = settingsRepo.findByTenantIdIsNullAndKey("ai_model")
                    .map(GeneralSetting::getValue).orElse("gemini-2.5-flash");

            String email = "system";
            String name = "System";
            Long userId = 0L;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                email = auth.getName();
                Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent()) {
                    name = userOpt.get().getName();
                    userId = 1L; // Hardcoded fallback or use actual ID if available, but User id is UUID
                }
            }

            AiUsageLog logEntry = AiUsageLog.builder()
                    .action(action)
                    .questionType(module)
                    .fileName("System Call (" + module + ")") // Fallback
                    .userId(userId)
                    .userEmail(email)
                    .userName(name)
                    .modelUsed(model)
                    .questionsCount(1) // Generally 1 completion
                    .inputTokens(inputTokens)
                    .outputTokens(outputTokens)
                    .totalTokens(totalTokens)
                    .costUsd(costUsd)
                    .processingTimeMs(processingTimeMs)
                    .success(success)
                    .errorMessage(errorMessage)
                    .build();

            aiUsageLogRepository.save(logEntry);
            
            // Also deduct tokens for the current user to keep tracking total quota
            if (success) {
                deductTokens(totalTokens);
            }
        } catch (Exception e) {
            log.warn("Failed to record system AI usage log: {}", e.getMessage());
        }
    }
}
