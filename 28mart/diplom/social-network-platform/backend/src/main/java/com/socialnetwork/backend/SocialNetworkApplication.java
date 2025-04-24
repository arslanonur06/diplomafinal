package com.socialnetwork.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import com.socialnetwork.backend.config.JwtConfig;
import com.socialnetwork.backend.config.CorsConfig;

@SpringBootApplication
@EnableConfigurationProperties({JwtConfig.class, CorsConfig.class})
public class SocialNetworkApplication {

    public static void main(String[] args) {
        SpringApplication.run(SocialNetworkApplication.class, args);
    }

}
