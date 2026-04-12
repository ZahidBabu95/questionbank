package com.testshaper.dto.cms;

import lombok.Data;
import java.util.UUID;

@Data
public class BlogTagDTO {
    private UUID id;
    private String name;
    private String slug;
}
