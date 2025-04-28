package com.socialnetwork.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "application.cors")
public class CorsConfig {
    private String[] allowedOrigins;
    private String[] allowedMethods;
    private String[] allowedHeaders;
    private boolean allowCredentials;
}
