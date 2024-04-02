package org.timothy.backend.utils;

import com.alibaba.fastjson2.JSONObject;
import org.bytedeco.ffmpeg.avcodec.AVCodecParameters;
import org.bytedeco.ffmpeg.avutil.AVRational;

import static org.bytedeco.ffmpeg.global.avutil.AVMEDIA_TYPE_AUDIO;
import static org.bytedeco.ffmpeg.global.avutil.AVMEDIA_TYPE_SUBTITLE;
import static org.bytedeco.ffmpeg.global.avutil.AVMEDIA_TYPE_VIDEO;

public class JSONUtil {

    public static String toAVRationalJSON(AVRational r) {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("num", r.num());
        jsonObject.put("den", r.den());
        return jsonObject.toString();
    }

    public static String toAVCodecParametersJSON(AVCodecParameters param) {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("codec_type", param.codec_type());
        jsonObject.put("codec_id", param.codec_id());
        jsonObject.put("codec_tag", param.codec_tag());
        jsonObject.put("bit_rate", param.bit_rate());
        jsonObject.put("bits_per_coded_sample", param.bits_per_coded_sample());
        jsonObject.put("bits_per_raw_sample", param.bits_per_raw_sample());
        jsonObject.put("profile", param.profile());
        jsonObject.put("level", param.level());

        if (param.extradata_size() > 0) {
            byte[] buffer = new byte[param.extradata_size()];
            param.extradata().get(buffer);
            StringBuilder hexStr = new StringBuilder();
            for (byte b : buffer) {
                hexStr.append(String.format("%02X", b));
            }
            jsonObject.put("extradata", hexStr.toString());
            jsonObject.put("extradata_size", param.extradata_size());
        } else {
            jsonObject.put("extradata", null);
            jsonObject.put("extradata_size", 0);
        }

        switch (param.codec_type()) {
            case AVMEDIA_TYPE_VIDEO:
                jsonObject.put("format", param.format());
                jsonObject.put("width", param.width());
                jsonObject.put("height", param.height());
                jsonObject.put("field_order", param.field_order());
                jsonObject.put("color_range", param.color_range());
                jsonObject.put("color_primaries", param.color_primaries());
                jsonObject.put("color_trc", param.color_trc());
                jsonObject.put("color_space", param.color_space());
                jsonObject.put("chroma_location", param.chroma_location());
                jsonObject.put("sample_aspect_ratio", toAVRationalJSON(param.sample_aspect_ratio()));
                jsonObject.put("video_delay", param.video_delay());
                break;
            case AVMEDIA_TYPE_AUDIO:
                jsonObject.put("format", param.format());
                jsonObject.put("channel_layout", param.channel_layout());
                jsonObject.put("channels", param.channels());
                jsonObject.put("sample_rate", param.sample_rate());
                jsonObject.put("block_align", param.block_align());
                jsonObject.put("frame_size", param.frame_size());
                jsonObject.put("initial_padding", param.initial_padding());
                jsonObject.put("trailing_padding", param.trailing_padding());
                jsonObject.put("seek_preroll", param.seek_preroll());
            case AVMEDIA_TYPE_SUBTITLE:
                jsonObject.put("width", param.width());
                jsonObject.put("height", param.height());
        }

        return jsonObject.toString();
    }
}
