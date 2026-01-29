package com.testshaper.config;

import com.testshaper.entity.User;
import com.testshaper.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByUsername("zahid").isEmpty()) {
            User admin = new User();
            admin.setUsername("zahid");
            admin.setPassword(passwordEncoder.encode("Z@hid95"));
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("Admin user 'zahid' created.");
        }
    }
}
