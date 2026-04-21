package com.testshaper.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class AiQuestionGenConfigDto {
    private String sourceType;
    private String selectedSchema;
    private List<String> targetQuestionTypes;
    private List<UUID> targetPageIds;
    private List<UUID> targetIndexIds;
}
