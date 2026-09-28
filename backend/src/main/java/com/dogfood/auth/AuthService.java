package com.dogfood.auth;

import com.dogfood.auth.dto.AuthResponse;
import com.dogfood.auth.dto.LoginRequest;
import com.dogfood.auth.dto.SignupRequest;
import com.dogfood.auth.dto.UserProfileResponse;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.security.JwtTokenProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final EventRoleRepository eventRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;

    public AuthService(
            UserRepository userRepository,
            EventRoleRepository eventRoleRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.eventRoleRepository = eventRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken: " + request.getUsername());
        }

        User user = new User(
                request.getUsername().trim(),
                request.getEmail().trim().toLowerCase(),
                passwordEncoder.encode(request.getPassword())
        );
        user = userRepository.save(user);

        auditLogService.logAction(null, null, "USER_SIGNUP", "User registered: " + user.getUsername() + " (id=" + user.getId() + ")");

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getUsername());
        Map<Long, String> rolesByEvent = getRolesByEvent(user.getId());

        return new AuthResponse(
                token,
                new AuthResponse.UserDto(user.getId(), user.getUsername(), user.getEmail()),
                rolesByEvent
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        auditLogService.logAction(user.getId(), null, "USER_LOGIN", "User logged in: " + user.getUsername());

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getUsername());
        Map<Long, String> rolesByEvent = getRolesByEvent(user.getId());

        return new AuthResponse(
                token,
                new AuthResponse.UserDto(user.getId(), user.getUsername(), user.getEmail()),
                rolesByEvent
        );
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        Map<Long, String> rolesByEvent = getRolesByEvent(user.getId());

        return new UserProfileResponse(
                new AuthResponse.UserDto(user.getId(), user.getUsername(), user.getEmail()),
                rolesByEvent
        );
    }

    @Transactional(readOnly = true)
    public Map<Long, String> getRolesByEvent(Long userId) {
        List<EventRole> eventRoles = eventRoleRepository.findByUserId(userId);
        Map<Long, String> map = new HashMap<>();
        for (EventRole er : eventRoles) {
            String roleName = er.getRole().name();
            String existing = map.get(er.getEventId());
            if (existing == null || roleRank(roleName) > roleRank(existing)) {
                map.put(er.getEventId(), roleName);
            }
        }
        return map;
    }

    private int roleRank(String role) {
        if ("ADMIN".equalsIgnoreCase(role)) return 4;
        if ("ORGANIZER".equalsIgnoreCase(role)) return 3;
        if ("JUDGE".equalsIgnoreCase(role)) return 2;
        if ("PARTICIPANT".equalsIgnoreCase(role)) return 1;
        return 0;
    }
}
