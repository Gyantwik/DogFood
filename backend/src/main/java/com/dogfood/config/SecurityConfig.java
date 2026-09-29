package com.dogfood.config;

import com.dogfood.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, CorsConfigurationSource corsConfigurationSource) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Authentication required\"}");
                }))
                .authorizeHttpRequests(auth -> auth
                        // Public auth & health endpoints
                        .requestMatchers("/api/health/**", "/api/auth/signup", "/api/auth/login", "/api/auth/register").permitAll()
                        // Public verification & certificates
                        .requestMatchers("/api/certificates/**", "/api/verify/**").permitAll()
                        // Public webhook receiver & test sink endpoints
                        .requestMatchers("/api/webhooks/**").permitAll()
                        // Public voting & comments POST endpoints
                        .requestMatchers(HttpMethod.POST, "/api/events/*/vote", "/api/events/*/voting/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/events/*/submissions/*/comments").permitAll()
                        // Sensitive event GET subpaths requiring authentication before broad permitAll
                        .requestMatchers(HttpMethod.GET, "/api/events/*/score-distribution").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/export/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/dashboard").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/assignments/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/judges/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/judging/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/scores/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/submissions/mine").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/submissions/draft").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/draft").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/audit-logs").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/webhooks/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/*/pairwise/**").authenticated()
                        // Public GET endpoints for visitor: gallery, public event details, public team info, voting, comments, certificates
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/teams/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/submissions/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        // Protected endpoints
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/events/*/webhooks/**").authenticated()
                        .requestMatchers("/api/events/*/import").authenticated()
                        .requestMatchers("/api/events/*/certificates/generate").authenticated()
                        .requestMatchers("/api/judges/**", "/api/judge/**").authenticated()
                        .requestMatchers("/api/judging/**").authenticated()
                        .requestMatchers("/api/scores/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
