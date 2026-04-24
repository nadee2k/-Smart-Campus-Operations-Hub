package com.smartcampus.notification.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MailConfigurationLogger {

    private static final Logger log = LoggerFactory.getLogger(MailConfigurationLogger.class);

    @Bean
    ApplicationRunner logMailConfiguration(
            @Value("${spring.mail.host}") String host,
            @Value("${spring.mail.port}") int port,
            @Value("${spring.mail.username}") String username,
            @Value("${spring.mail.properties.mail.smtp.auth:false}") boolean auth,
            @Value("${spring.mail.properties.mail.smtp.starttls.enable:false}") boolean starttls,
            @Value("${spring.mail.password:}") String password
    ) {
        return args -> log.info(
                "Mail config loaded. host={}, port={}, username={}, auth={}, starttls={}, passwordConfigured={}",
                host,
                port,
                mask(username),
                auth,
                starttls,
                !password.isBlank()
        );
    }

    private String mask(String value) {
        if (value == null || value.isBlank()) {
            return "<empty>";
        }
        int atIndex = value.indexOf('@');
        if (atIndex <= 1) {
            return "***";
        }
        return value.charAt(0) + "***" + value.substring(atIndex);
    }
}
