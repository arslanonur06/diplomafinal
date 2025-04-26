package com.socialnetwork.backend.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;

public interface JwtService {
    boolean validateToken(String token);
    String getUsernameFromToken(String token);
}
