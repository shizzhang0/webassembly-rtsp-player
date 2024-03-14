package org.timothy.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.timothy.backend.service.runnable.GrabTask;

import java.util.concurrent.ExecutorService;

@Slf4j
@Service
@RequiredArgsConstructor
public class RtspWebsocketProxyService {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final ExecutorService executorService;

    public void grab(String sessionId, String rtspUrl) {
        GrabTask grabTask = new GrabTask(sessionId, rtspUrl, simpMessagingTemplate);
        executorService.execute(grabTask);
    }

}
