package org.timothy.backend.service.runnable;

import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bytedeco.ffmpeg.avcodec.AVPacket;
import org.bytedeco.ffmpeg.global.avcodec;
import org.bytedeco.ffmpeg.global.avutil;
import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.FFmpegLogCallback;
import org.bytedeco.javacv.FrameGrabber.Exception;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Arrays;


@NoArgsConstructor
@Slf4j
public class GrabTask implements Runnable {

    private String rtspUrl;
    private String sessionId;
    private SimpMessagingTemplate simpMessagingTemplate;

    public GrabTask(String sessionId, String rtspUrl, SimpMessagingTemplate simpMessagingTemplate) {
        this.rtspUrl = rtspUrl;
        this.sessionId = sessionId;
        this.simpMessagingTemplate = simpMessagingTemplate;
    }

    boolean running = false;

    @Override
    public void run() {
        log.info("start grab task sessionId:{}, steamUrl:{}", sessionId, rtspUrl);
        FFmpegFrameGrabber grabber = null;
        FFmpegLogCallback.set();
        avutil.av_log_set_level(avutil.AV_LOG_INFO);
        try {
            grabber = new FFmpegFrameGrabber(rtspUrl);
            grabber.setOption("rtsp_transport", "tcp");

            grabber.start();
            running = true;

            AVPacket pkt;
            while (running) {
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
            }
        } catch (Exception e) {
            running = false;
            log.info(e.getMessage());
        } finally {
            try {
                if (grabber != null) {
                    grabber.close();
                    grabber.release();
                }
            } catch (Exception e) {
                log.info(e.getMessage());
            }
        }
    }
}
