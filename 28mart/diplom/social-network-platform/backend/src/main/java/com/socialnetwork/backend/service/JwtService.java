package com.socialnetwork.backend.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;

public interface JwtService {
    String extractUsername(String token);
    boolean isTokenValid(String token, UserDetails userDetails);
    Authentication getAuthenticationToken(String jwt, UserDetails userDetails);
}
