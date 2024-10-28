import React, { useCallback, useEffect, useState } from "react";
import { Cookie } from "tough-cookie";
import store from "../common/store";
import { cookieJar } from "../common/cookie";
import { MyIcon } from "./component/Icon";
import { profile } from "../common/core/profile";
import { config } from "./store/Config";

// 保证 cookie 已被同步过来
const AuthGate = props => {
  const [ready, setReady] = useState(false);
  const init = useCallback(async () => {
    try {
      const cookies = store.get("cookies", []);
      await Promise.all(
        cookies.map(({ name, expirationDate, ...cookie }) =>
          cookieJar.setCookie(
            Cookie.fromJSON({
              ...cookie,
              key: name,
              ...(expirationDate ? { expires: new Date(expirationDate * 1000) } : {}),
            }),
            (cookie.secure ? "https://" : "http://") + cookie.domain.replace(/^\./, "") + cookie.path,
            { ignoreError: true }
          )
        )
      );
      const info = await profile();
      config.update(info);
    } catch (e) {
      console.log("初始化失败", e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return ready ? props.children : <Loading />;
};

export default AuthGate;

function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "100vh",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <MyIcon iconName={"empty"} style={{ width: 100, height: 100 }} />
      <span>配置加载中...</span>
    </div>
  );
}
