package com.testshaper.repository;

import com.testshaper.entity.UserLoginHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserLoginHistoryRepository extends JpaRepository<UserLoginHistory, UUID> {
    Page<UserLoginHistory> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    // Monthly registration trend (reused for analytics)
    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count " +
                   "FROM user_login_history WHERE user_id = :userId " +
                   "GROUP BY month ORDER BY month DESC LIMIT 12", nativeQuery = true)
    List<Object[]> findMonthlyLoginCount(@Param("userId") UUID userId);
}
