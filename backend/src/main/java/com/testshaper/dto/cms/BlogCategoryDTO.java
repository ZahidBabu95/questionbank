package com.testshaper.dto.cms;

import lombok.Data;
import java.util.UUID;

@Data
public class BlogCategoryDTO {
    private UUID id;
    private String name;
    private String slug;
    private String description;
}
