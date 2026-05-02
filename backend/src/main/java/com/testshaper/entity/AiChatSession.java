package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ai_chat_sessions", indexes = {
        @Index(name = "idx_chat_session_user", columnList = "user_id"),
        @Index(name = "idx_chat_session_tenant", columnList = "tenant_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatSession extends BaseTenantEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_email")
    private String userEmail;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "active_model")
    private String activeModel;

    @Column(name = "context_window")
    private Integer contextWindow;
}
