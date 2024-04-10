package org.timothy.backend.service;

import com.github.benmanes.caffeine.cache.Cache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.timothy.backend.service.runnable.GrabTask;

import java.util.concurrent.ExecutorService;

import static org.timothy.backend.common.CacheConstant.AV_CODEC_PARAMETERS_PREFIX;
import static org.timothy.backend.common.CacheConstant.GRAB_TASK_RUNNING_PREFIX;

@Slf4j
@Service
@RequiredArgsConstructor
public class RtspWebsocketProxyService {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final ExecutorService executorService;
    private final Cache<String, Object> caffeineCache;

    public void startGrab(String sessionId, String rtspUrl) {
        GrabTask grabTask = new GrabTask(sessionId, rtspUrl, simpMessagingTemplate, caffeineCache);
        executorService.execute(grabTask);
    }

    public void stopGrab(String sessionId) {
        caffeineCache.put(GRAB_TASK_RUNNING_PREFIX + sessionId, false);
    }

    public String findAVCodecParameters(String rtspUrl) {
        Object obj = caffeineCache.getIfPresent(AV_CODEC_PARAMETERS_PREFIX + rtspUrl);
        if (obj != null) {
            return String.valueOf(obj);
        }

        return null;
    }

}
