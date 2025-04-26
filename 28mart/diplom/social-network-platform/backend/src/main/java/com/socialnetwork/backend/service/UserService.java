package com.socialnetwork.backend.service;

import org.springframework.security.core.userdetails.UserDetailsService;

public interface UserService extends UserDetailsService {
    // Extending UserDetailsService provides loadUserByUsername method
}
