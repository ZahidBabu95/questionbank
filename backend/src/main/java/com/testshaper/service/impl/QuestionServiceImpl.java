package com.testshaper.service.impl;

import com.testshaper.entity.Question;
import com.testshaper.entity.QuestionOption;
import com.testshaper.repository.QuestionOptionRepository;
import com.testshaper.repository.QuestionRepository;
import com.testshaper.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class QuestionServiceImpl implements QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;

    @Override
    @Transactional
    public Question createMCQ(Question question, List<QuestionOption> options) {
        // Validation
        if (options == null || options.size() < 2) {
            throw new IllegalArgumentException("MCQ must have at least 2 options.");
        }
        long correctCount = options.stream().filter(QuestionOption::isCorrect).count();
        if (correctCount != 1) { // Assuming single select for MVP
            throw new IllegalArgumentException("MCQ must have exactly one correct answer.");
        }

        // Save Question
        question.setType(Question.QuestionType.MCQ);
        question.setStatus(Question.QuestionStatus.PENDING); // Default status
        Question savedQuestion = questionRepository.save(question);

        // Save Options
        for (QuestionOption option : options) {
            option.setQuestion(savedQuestion);
            optionRepository.save(option);
        }

        return savedQuestion;
    }

    @Override
    @Transactional
    public Question createShortQuestion(Question question) {
        question.setType(Question.QuestionType.SHORT);
        question.setStatus(Question.QuestionStatus.PENDING);
        return questionRepository.save(question);
    }

    @Override
    @Transactional
    public Question createCQ(Question question) {
        question.setType(Question.QuestionType.CQ);
        question.setStatus(Question.QuestionStatus.PENDING);
        // Default marks for CQ is usually 10, but client can send it.
        // If questionText holds the formatted Stem+Questions, we just save it.
        return questionRepository.save(question);
    }

    @Override
    public Question getQuestion(UUID id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found"));
    }

    @Override
    public List<QuestionOption> getOptions(UUID questionId) {
        return optionRepository.findByQuestionId(questionId);
    }

    @Override
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }

    @Override
    @Transactional
    public void deleteQuestion(UUID id) {
        // Options cascade delete? Or manual?
        // For now, let's assume manual since we didn't set cascade in entity (kept
        // simple base entity)
        List<QuestionOption> options = optionRepository.findByQuestionId(id);
        optionRepository.deleteAll(options);
        questionRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Question approveQuestion(UUID id, String approverId) {
        Question question = getQuestion(id);
        question.setStatus(Question.QuestionStatus.APPROVED);
        question.setApprovedBy(approverId);
        question.setApprovedAt(LocalDateTime.now());
        return questionRepository.save(question);
    }

    @Override
    @Transactional
    public Question rejectQuestion(UUID id) {
        Question question = getQuestion(id);
        question.setStatus(Question.QuestionStatus.REJECTED);
        return questionRepository.save(question);
    }
}
