package com.testshaper.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "ai_chat_messages", indexes = {
        @Index(name = "idx_chat_msg_session", columnList = "session_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatMessage extends BaseEntity {

    @Column(name = "session_id", nullable = false, columnDefinition = "CHAR(36)")
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID sessionId;

    @Column(name = "role", nullable = false)
    private String role; // "user" or "ai"

    @Column(name = "content", columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "actionable_data", columnDefinition = "LONGTEXT")
    private String actionableData; // JSON structure for 'Open in Nexus Editor' etc.
    
    @Column(name = "tokens_used")
    private Integer tokensUsed;
}
