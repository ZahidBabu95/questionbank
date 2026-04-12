package com.testshaper.service.impl;

import com.testshaper.dto.CreateUserDTO;
import com.testshaper.entity.Institute;
import com.testshaper.entity.Role;
import com.testshaper.entity.User;
import com.testshaper.repository.InstituteRepository;
import com.testshaper.repository.RoleRepository;
import com.testshaper.repository.UserRepository;
import com.testshaper.service.UserImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserImportServiceImpl implements UserImportService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final InstituteRepository instituteRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_TEMP_PASSWORD = "Welcome@123";

    @Override
    public Map<String, Object> importUsers(MultipartFile file, String defaultRole, String defaultInstituteId) throws Exception {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        List<String[]> rows;

        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            rows = parseExcel(file);
        } else {
            rows = parseCsv(file);
        }

        int created = 0, skipped = 0;
        List<String> errors = new ArrayList<>();

        Role role = roleRepository.findByName(defaultRole != null ? defaultRole : "STUDENT")
                .orElseGet(() -> roleRepository.findByName("STUDENT").orElse(null));

        Institute institute = null;
        if (defaultInstituteId != null && !defaultInstituteId.isBlank()) {
            try { institute = instituteRepository.findById(UUID.fromString(defaultInstituteId)).orElse(null); }
            catch (Exception ignored) {}
        }

        for (int i = 0; i < rows.size(); i++) {
            String[] row = rows.get(i);
            if (row.length < 2) { errors.add("Row " + (i+1) + ": insufficient columns"); skipped++; continue; }

            String name  = clean(row[0]);
            String email = clean(row[1]);
            String phone = row.length > 2 ? clean(row[2]) : null;

            if (name.isEmpty() || email.isEmpty()) { errors.add("Row " + (i+1) + ": name/email required"); skipped++; continue; }
            if (userRepository.existsByEmail(email)) { errors.add("Row " + (i+1) + ": " + email + " already exists"); skipped++; continue; }

            try {
                User user = new User();
                user.setName(name);
                user.setEmail(email);
                user.setPhone(phone);
                user.setPassword(passwordEncoder.encode(DEFAULT_TEMP_PASSWORD));
                user.setActive(true);
                if (role != null) user.setRoles(new HashSet<>(Set.of(role)));
                if (institute != null) user.setInstitute(institute);
                userRepository.save(user);
                created++;
            } catch (Exception e) {
                errors.add("Row " + (i+1) + ": " + e.getMessage());
                skipped++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total",   rows.size());
        result.put("created", created);
        result.put("skipped", skipped);
        result.put("errors",  errors);
        result.put("defaultPassword", DEFAULT_TEMP_PASSWORD);
        return result;
    }

    @Override
    public byte[] generateCsvTemplate() {
        String csv = "Name,Email,Phone\n" +
                     "মোহাম্মদ রহিম,rahim@school.edu,01700000001\n" +
                     "ফাতেমা খানম,fatema@school.edu,01800000002\n";
        return csv.getBytes(StandardCharsets.UTF_8);
    }

    private List<String[]> parseCsv(MultipartFile file) throws Exception {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean header = true;
            while ((line = reader.readLine()) != null) {
                if (header) { header = false; continue; } // skip header
                if (line.isBlank()) continue;
                rows.add(line.split(",", -1));
            }
        }
        return rows;
    }

    private List<String[]> parseExcel(MultipartFile file) throws Exception {
        List<String[]> rows = new ArrayList<>();
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            boolean header = true;
            for (Row row : sheet) {
                if (header) { header = false; continue; }
                List<String> cells = new ArrayList<>();
                for (int c = 0; c < 3; c++) {
                    Cell cell = row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    cells.add(cell != null ? getCellValue(cell) : "");
                }
                rows.add(cells.toArray(new String[0]));
            }
        }
        return rows;
    }

    private String getCellValue(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield cell.getLocalDateTimeCellValue().toString();
                yield String.valueOf((long) cell.getNumericCellValue());
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default      -> "";
        };
    }

    private String clean(String s) {
        return s == null ? "" : s.trim().replaceAll("\"", "");
    }
}
