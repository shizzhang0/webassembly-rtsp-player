#include <emscripten/emscripten.h>

#ifdef __cplusplus
extern "C" {
#endif

#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
#include <libswresample/swresample.h>
#include "cJSON.h"

uint8_t hex_to_uint8(const char *hex) {
    int high = hex[0] >= '0' && hex[0] <= '9' ? hex[0] - '0' : hex[0] - 'A' + 10;
    int low = hex[1] >= '0' && hex[1] <= '9' ? hex[1] - '0' : hex[1] - 'A' + 10;
    return (uint8_t)((high << 4) | low);
}

void av_rational_from_cjson(const cJSON *json, AVRational r) {
    r.num = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "num"));
    r.den = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "den"));
}

void av_codec_parameters_from_cjson(const cJSON *json, AVCodecParameters *param) {
    param->codec_type = AVMediaType(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "codec_type")));
    param->codec_id = AVCodecID(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "codec_id")));
    param->codec_tag = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "codec_tag"));
    param->bit_rate = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "bit_rate"));
    param->bits_per_coded_sample = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "bits_per_coded_sample"));
    param->bits_per_raw_sample = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "bits_per_raw_sample"));
    param->profile = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "profile"));
    param->level = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "level"));
    param->extradata_size = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "extradata_size"));
    if (param->extradata_size > 0) {
        char *extradata_hex = cJSON_GetStringValue(cJSON_GetObjectItem(json, "extradata"));
        uint8_t *bytes = (uint8_t *) malloc(param->extradata_size);
        for (int i = 0; i < param->extradata_size; ++i) {
            bytes[i] = hex_to_uint8(extradata_hex + i * 2);
        }
        param->extradata = (uint8_t *)av_mallocz(param->extradata_size + AV_INPUT_BUFFER_PADDING_SIZE);
        if (!param->extradata) {
            free(bytes);
        }
        memcpy(param->extradata, bytes, param->extradata_size);
        free(bytes);
    }
    switch (param->codec_type) {
        case AVMEDIA_TYPE_VIDEO:
            param->format = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "format"));
            param->width = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "width"));
            param->height = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "height"));
            param->field_order = AVFieldOrder(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "field_order")));
            param->color_range = AVColorRange(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "color_range")));
            param->color_primaries = AVColorPrimaries(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "color_primaries")));
            param->color_trc = AVColorTransferCharacteristic(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "color_trc")));
            param->color_space = AVColorSpace(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "color_space")));
            param->chroma_location = AVChromaLocation(cJSON_GetNumberValue(cJSON_GetObjectItem(json, "chroma_location")));
            av_rational_from_cjson(cJSON_GetObjectItem(json, "sample_aspect_ratio"), param->sample_aspect_ratio);
            param->video_delay = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "video_delay"));
            break;
        case AVMEDIA_TYPE_AUDIO:
            param->format = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "format"));
            param->channel_layout = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "channel_layout"));
            param->channels = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "channels"));
            param->sample_rate = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "sample_rate"));
            param->block_align = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "block_align"));
            param->frame_size = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "frame_size"));
            param->initial_padding = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "initial_padding"));
            param->trailing_padding = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "trailing_padding"));
            param->seek_preroll = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "seek_preroll"));
            break;
        case AVMEDIA_TYPE_SUBTITLE:
            param->width = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "width"));
            param->height = cJSON_GetNumberValue(cJSON_GetObjectItem(json, "height"));
            break;
        default:
            break;
    }
}

typedef struct {
    AVCodecContext *codec_ctx;             // 用于解码
    AVPacket *raw_pkt;       // 存储js传递进来的pkt.
    AVFrame *decode_frame;  // 存储解码成功后的YUV数据.
    struct SwsContext *sws_ctx;      // 格式转换,有些解码后的数据不一定是YUV格式的数据
    uint8_t *sws_data;
    AVFrame *yuv_frame;     // 存储解码成功后的YUV数据,ffmpeg解码成功后的数据不一定是 YUV420P
    uint8_t *js_buf;
    unsigned js_buf_len;
    uint8_t *yuv_buffer;

} JSDecodeHandle, *LPJSDecodeHandle;

LPJSDecodeHandle EMSCRIPTEN_KEEPALIVE initDecoder(char* json_str) {
    auto handle = (LPJSDecodeHandle) malloc(sizeof(JSDecodeHandle));
    memset(handle, 0, sizeof(JSDecodeHandle));

    handle->raw_pkt = av_packet_alloc();

    handle->decode_frame = av_frame_alloc();

    AVCodecParameters *param = avcodec_parameters_alloc();

    cJSON *cjson = cJSON_Parse(json_str);
    av_codec_parameters_from_cjson(cjson, param);
    cJSON_Delete(cjson);

    const AVCodec *codec = avcodec_find_decoder(param->codec_id);
    if (!codec) {
        fprintf(stderr, "Codec not found\n");
    }
    handle->codec_ctx = avcodec_alloc_context3(codec);
    if (!handle->codec_ctx) {
        fprintf(stderr, "Could not allocate video codec context\n");
    }

    if (avcodec_parameters_to_context(handle->codec_ctx, param) < 0) {
        fprintf(stderr, "Could not copy codec parameters\n");
    }

    //handle->c->thread_count = 5;
    if (avcodec_open2(handle->codec_ctx, codec, nullptr) < 0) {
        fprintf(stderr, "Could not open codec\n");
    }

    // 我们最大支持到1920 * 1080,保存解码后的YUV数据，然后返回给前端!
    int max_width = 1920;
    int max_height = 1080;
    handle->yuv_buffer = static_cast<uint8_t *>(malloc(max_width * max_height * 3 / 2));

    fprintf(stdout, "Web decoder init success.\n");
    return handle;
}

uint8_t *EMSCRIPTEN_KEEPALIVE GetBuffer(LPJSDecodeHandle handle, int len) {
    if (handle->js_buf_len < len) {
        if (handle->js_buf) free(handle->js_buf);
        handle->js_buf = static_cast<uint8_t *>(malloc(len * 2));
        memset(handle->js_buf, 0, len * 2); // 这句很重要!
        handle->js_buf_len = len * 2;
    }
    return handle->js_buf;
}

int EMSCRIPTEN_KEEPALIVE Decode(LPJSDecodeHandle handle, int len) {
    handle->raw_pkt->data = handle->js_buf;
    handle->raw_pkt->size = len;

    int ret = avcodec_send_packet(handle->codec_ctx, handle->raw_pkt);
    if (ret < 0) {
        fprintf(stderr, "Error sending a packet for decoding\n"); // 0x00 00 00 01
        return -1;
    }

    ret = avcodec_receive_frame(handle->codec_ctx, handle->decode_frame); // 这句话不是每次都成功的.
    if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) {
        fprintf(stderr, "EAGAIN -- ret:%d -%d -%d -%s\n", ret, AVERROR(EAGAIN), AVERROR_EOF, av_err2str(ret));
        return -1;
    } else if (ret < 0) {
        fprintf(stderr, "Error during decoding\n");
        return -1;
    }

    return ret;
}

int EMSCRIPTEN_KEEPALIVE GetWidth(LPJSDecodeHandle handle) {
    return handle->decode_frame->width;
}

int EMSCRIPTEN_KEEPALIVE GetHeight(LPJSDecodeHandle handle) {
    return handle->decode_frame->height;
}

uint8_t *EMSCRIPTEN_KEEPALIVE GetRenderData(LPJSDecodeHandle handle) {
    int width = handle->decode_frame->width;
    int height = handle->decode_frame->height;

    bool sws_trans = false; // 我们确保得到的数据格式是YUV.
    if (handle->decode_frame->format != AV_PIX_FMT_YUV420P) {
        sws_trans = true;
        fprintf(stderr, "Need transfer :%d\n", handle->decode_frame->format);
    }

    AVFrame *new_frame = handle->decode_frame;
    if (sws_trans) {
        if (handle->sws_ctx == nullptr) {
            handle->sws_ctx = sws_getContext(width, height, (enum AVPixelFormat) handle->decode_frame->format, // in
                                            width, height, AV_PIX_FMT_YUV420P, // out
                                            SWS_BICUBIC, nullptr, nullptr, nullptr);

            handle->yuv_frame = av_frame_alloc();
            handle->yuv_frame->width = width;
            handle->yuv_frame->height = height;
            handle->yuv_frame->format = AV_PIX_FMT_YUV420P;

            int numbytes = av_image_get_buffer_size(AV_PIX_FMT_YUV420P, width, height, 1);
            handle->sws_data = (uint8_t *) av_malloc(numbytes * sizeof(uint8_t));
            av_image_fill_arrays(handle->yuv_frame->data, handle->yuv_frame->linesize, handle->sws_data,
                                 AV_PIX_FMT_YUV420P,
                                 width, height, 1);
        }

        if (sws_scale(handle->sws_ctx,
                      handle->decode_frame->data, handle->decode_frame->linesize, 0, height,    // in
                      handle->yuv_frame->data, handle->yuv_frame->linesize // out
        ) == 0) {
            fprintf(stderr, "Error in SWS Scale to YUV420P.");
            return nullptr;
        }
        new_frame = handle->yuv_frame;
    }

    // copy Y data
    memcpy(handle->yuv_buffer, new_frame->data[0], width * height);

    // U
    memcpy(handle->yuv_buffer + width * height, new_frame->data[1], width * height / 4);

    // V
    memcpy(handle->yuv_buffer + width * height + width * height / 4, new_frame->data[2], width * height / 4);

    return handle->yuv_buffer;
}

#ifdef __cplusplus
}
#endif
