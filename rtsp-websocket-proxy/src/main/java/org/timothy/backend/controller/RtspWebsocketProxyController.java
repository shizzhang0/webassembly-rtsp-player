package org.timothy.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.timothy.backend.service.RtspWebsocketProxyService;

import java.util.Objects;

@Controller
@RequiredArgsConstructor
public class RtspWebsocketProxyController {

    private final RtspWebsocketProxyService rtspWebsocketProxyService;

    @MessageMapping("/rtsp-url")
    public void receiveRtspUrl(String rtspUrl, StompHeaderAccessor accessor) {
        if (Objects.nonNull(accessor)) {
            String sessionId = accessor.getSessionId();
        }
    }

}
