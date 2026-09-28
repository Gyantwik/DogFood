package com.dogfood.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private final String secret = "dGhpcy1pcy1hLXZlcnktc2VjdXJlLXRlc3Qta2V5LWZvci1kb2dmb29kLTIwMjY=";
    private final long expirationMs = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(secret, expirationMs);
    }

    @Test
    void testGenerateAndValidateToken() {
        String token = tokenProvider.generateToken(1L, "organizer@dogfood.local", "organizer");
        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals(1L, tokenProvider.getUserIdFromToken(token));
        assertEquals("organizer@dogfood.local", tokenProvider.getEmailFromToken(token));
    }

    @Test
    void testInvalidToken() {
        assertFalse(tokenProvider.validateToken("invalid.token.here"));
    }
}
