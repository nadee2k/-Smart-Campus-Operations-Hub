package com.smartcampus.config.security;

import com.smartcampus.auth.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Utility for extracting the authenticated user from the security context.
 */
public final class AuthUtil {

    private AuthUtil() {}

    public static User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User)) {
            throw new com.smartcampus.common.exception.AccessDeniedException("Not authenticated");
        }
        return (User) auth.getPrincipal();
    }

    public static Long getCurrentUserId() {
        return getCurrentUser().getId();
    }
}
