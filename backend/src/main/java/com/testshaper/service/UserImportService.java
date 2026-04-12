package com.testshaper.service;

import com.testshaper.dto.UserDTO;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

public interface UserImportService {
    /**
     * Parse CSV or Excel file and bulk-create users.
     * Returns a summary map: {created, skipped, errors}
     */
    Map<String, Object> importUsers(MultipartFile file, String defaultRole, String defaultInstituteId) throws Exception;

    byte[] generateCsvTemplate();
}
