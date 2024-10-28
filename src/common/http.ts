import got from "got";
import { cookieJar, shareCookieJar } from "./cookie";
import store from "./store";
import { delay } from "./util";
import electronApi from "../renderer/electronApi";
import { message } from "antd";
import { config } from "../renderer/store/Config";

const base = got.extend({
  headers: {
    "accept-language": "zh-CN,zh;q=0.9,zh-TW;q=0.8",
    pragma: "no-cache",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    // referer: 'https://pc.woozooo.com/mydisk.php?item=files&action=index',
    // referer: 'https://pc.woozooo.com/mydisk.php?item=files&action=index&u=1702063',
    "user-agent": store.get("userAgent"),
  },
  hooks: {
    // beforeRequest: [
    //   options => {
    //     console.log(options.url.toString(), options)
    //   },
    // ],
    afterResponse: [
      async response => {
        // 返回值状态判断。 蓝奏云返回类型: text/json，github 返回类型: application/json
        if (response.headers["content-type"]?.includes("text/json")) {
          const body = JSON.parse(response.body as string);
          switch (body.zt) {
            // 1,2 成功
            case 1:
            case 2:
              return response;
            case 9:
              message.error("登录信息失效，请重新登录");
              await delay();
              await electronApi.logout();
              return response;
            default:
              throw new Error(typeof body.info === "string" ? body.info : body.text);
          }
        }
        return response;
      },
    ],
    beforeError: [
      error => {
        // todo: 记录
        console.error(error);
        if (!error.options?.context?.hideMessage) {
          message.error(error.message);
        }
        return error;
      },
    ],
  },
  https: { rejectUnauthorized: false },
  ...(store.get("isDev")
    ? {
        // // 开发用
        // agent: {
        //   https: new (require('hpagent').HttpsProxyAgent)({
        //     keepAlive: true,
        //     // keepAliveMsecs: 1000,
        //     // maxSockets: 256,
        //     // maxFreeSockets: 256,
        //     // scheduling: 'lifo',
        //     rejectUnauthorized: false,
        //     proxy: 'http://127.0.0.1:8888',
        //   }),
        // },
      }
    : {}),
});

export const request = got.extend(base, {
  cookieJar,
  prefixUrl: store.get("lanzouUrl"),
  hooks: {
    beforeRequest: [
      options => {
        if (config.referer && (!options.headers["referer"] || !options.headers["Referer"])) {
          const url = typeof options.url === "string" ? new URL(options.url) : options.url;
          if (url.origin === new URL(config.referer).origin) {
            options.headers["referer"] = config.referer;
          }
        }
      },
    ],
  },
});

export const share = got.extend(base, {
  cookieJar: shareCookieJar,
  ignoreInvalidCookies: true,
});
