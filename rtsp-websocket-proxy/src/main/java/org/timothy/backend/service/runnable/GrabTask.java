package org.timothy.backend.service.runnable;

import com.github.benmanes.caffeine.cache.Cache;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bytedeco.ffmpeg.avcodec.AVCodecParameters;
import org.bytedeco.ffmpeg.avcodec.AVPacket;
import org.bytedeco.ffmpeg.avformat.AVFormatContext;
import org.bytedeco.ffmpeg.global.avcodec;
import org.bytedeco.ffmpeg.global.avutil;
import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.FFmpegLogCallback;
import org.bytedeco.javacv.FrameGrabber.Exception;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.timothy.backend.utils.JsonUtil;

import java.util.Arrays;

import static org.bytedeco.ffmpeg.global.avutil.AVMEDIA_TYPE_VIDEO;
import static org.timothy.backend.common.CacheConstant.AV_CODEC_PARAMETERS_PREFIX;
import static org.timothy.backend.common.CacheConstant.GRAB_TASK_RUNNING_PREFIX;


@NoArgsConstructor
@Slf4j
public class GrabTask implements Runnable {

    private String rtspUrl;
    private String sessionId;
    private SimpMessagingTemplate simpMessagingTemplate;
    private Cache<String, Object> caffeineCache;

    public GrabTask(String sessionId, String rtspUrl, SimpMessagingTemplate simpMessagingTemplate, Cache<String, Object> caffeineCache) {
        this.rtspUrl = rtspUrl;
        this.sessionId = sessionId;
        this.simpMessagingTemplate = simpMessagingTemplate;
        this.caffeineCache = caffeineCache;
    }

    @Override
    public void run() {
        log.info("start grab task sessionId:{}, steamUrl:{}", sessionId, rtspUrl);
        FFmpegFrameGrabber grabber = null;
        FFmpegLogCallback.set();
        avutil.av_log_set_level(avutil.AV_LOG_INFO);
        try {
            grabber = new FFmpegFrameGrabber(rtspUrl);
            grabber.setOption("rtsp_transport", "tcp");

            grabber.start(true);
            caffeineCache.put(GRAB_TASK_RUNNING_PREFIX + sessionId, true);

            AVFormatContext formatCtx = grabber.getFormatContext();

            int videoStreamIndex = -1;
            for (int i = 0; i < formatCtx.nb_streams(); i++) {
                if (formatCtx.streams(i).codecpar().codec_type() == AVMEDIA_TYPE_VIDEO) {
                    videoStreamIndex = i;
                    break;
                }
            }
            if (videoStreamIndex == -1) {
                log.error("Could not find a video stream.");
                return;
            }

            AVCodecParameters param = formatCtx.streams(videoStreamIndex).codecpar();
            caffeineCache.put(AV_CODEC_PARAMETERS_PREFIX + rtspUrl, JsonUtil.toAVCodecParametersJSON(param));

            AVPacket pkt;
            Boolean running = (Boolean) caffeineCache.getIfPresent(GRAB_TASK_RUNNING_PREFIX + sessionId);
            while (Boolean.TRUE.equals(running)) {
                pkt = grabber.grabPacket();
                // 过滤空包
                if (pkt == null || pkt.size() == 0 || pkt.data() == null) {
                    continue;
                }

                byte[] buffer = new byte[pkt.size()];
                BytePointer data = pkt.data();
                data.get(buffer);
//                log.info(Arrays.toString(buffer));
                simpMessagingTemplate.convertAndSendToUser(sessionId, "/topic/stream-data/real-time", Arrays.toString(buffer));

                avcodec.av_packet_unref(pkt);
                running = (Boolean) caffeineCache.getIfPresent(GRAB_TASK_RUNNING_PREFIX + sessionId);
            }
        } catch (Exception e) {
            caffeineCache.put(GRAB_TASK_RUNNING_PREFIX + sessionId, false);
            log.info(e.getMessage());
        } finally {
            try {
                if (grabber != null) {
                    grabber.close();
                    grabber.release();
                }
                log.info("stop grab task sessionId:{}, steamUrl:{}", sessionId, rtspUrl);
            } catch (Exception e) {
                log.info(e.getMessage());
            }
        }
    }
}
