package org.timothy.backend.controller;

import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.timothy.backend.service.RtspWebsocketProxyService;

import java.util.Objects;

@Controller
@RequiredArgsConstructor
public class RtspWebsocketProxyController {

    private final RtspWebsocketProxyService rtspWebsocketProxyService;


    @ResponseBody
    @RequestMapping("/av-codec-parameters")
    public String getAVCodecParameters(@RequestParam @NonNull String rtspUrl) {
        return rtspWebsocketProxyService.findAVCodecParameters(rtspUrl);
    }

    @MessageMapping("/rtsp-url")
    public void receiveRtspUrl(String rtspUrl, StompHeaderAccessor accessor) {
        if (Objects.nonNull(accessor) && StringUtils.hasLength(rtspUrl)) {
            String sessionId = accessor.getSessionId();
            rtspWebsocketProxyService.grab(sessionId, rtspUrl);
        }
    }

}
